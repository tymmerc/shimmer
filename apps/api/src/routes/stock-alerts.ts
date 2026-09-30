/**
 * Retour de stock — routes.
 *
 *   POST /api/stock-alerts            (widgetAuth : clé pk_ ou sk_) — un visiteur
 *        demande à être prévenu quand une variante épuisée revient. Appelé par
 *        le SDK depuis la conversation du vendeur. Idempotent.
 *
 *   GET  /api/stock-alerts/demand     (auth secrète) — ce que le marchand doit
 *        réassortir : demandes en attente par variante, les plus voulues d'abord.
 *   GET  /api/stock-alerts/summary    (auth secrète) — compteurs prévenus /
 *        commandés / euros, un par un.
 *
 * Sécurité : capture d'email publique = cible de spam. Limiter dédié strict
 * par IP, en plus du limiter global. Email validé, longueurs bornées.
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { createHash } from 'node:crypto';
import { getPrisma, getRedis } from '@shimmer/core';
import { widgetAuth, authMiddleware } from '../middleware/auth.js';
import { createScopedRateLimiter } from '../middleware/rate-limiter.js';
import { isEmailConfigured, sendEmail } from '@shimmer/email-connector';
import { publicApiBase } from '../lib/public-url.js';
import {
  subscribeStockAlert,
  aggregateRestockDemand,
  restockProof,
  type StockAlertRow,
  dropPendingStockAlert,
} from '../lib/stock-alerts.js';

export const stockAlertsRouter = Router();

// 10 inscriptions / minute / IP : largement assez pour un humain, bloquant pour un script.
const subscribeLimiter = createScopedRateLimiter('stock-alerts', 60_000, 10);

const subscribeSchema = z.object({
  store: z.coerce.number().int().positive().optional(),
  email: z.string().trim().toLowerCase().email().max(255),
  platformVariantId: z.string().trim().min(1).max(200),
  productId: z.number().int().positive().optional(),
  variantLabel: z.string().trim().max(200).optional(),
  // null quand le visiteur n'a pas (encore) de cookie : mode session, refus, strict.
  visitorId: z.string().trim().min(4).max(80).nullish(),
});

/**
 * Le produit visé doit exister dans le catalogue de la boutique : sinon la
 * route servait à écrire à n'importe qui avec un libellé libre. Renvoie le
 * produit local (son nom sert dans l'e-mail, jamais le texte du navigateur).
 */
async function resolveAlertProduct(storeId: number, anchor: string, productId?: number): Promise<{ id: number | null; name: string | null } | null> {
  const prisma = getPrisma();
  if (productId) {
    const p = await prisma.product.findFirst({ where: { id: productId, storeId }, select: { id: true, name: true } });
    if (p) return p;
  }
  const byPlatform = anchor.match(/^p:(.{1,190})$/);
  if (byPlatform) {
    const p = await prisma.product.findFirst({ where: { storeId, platformProductId: byPlatform[1] }, select: { id: true, name: true } });
    return p ?? null;
  }
  const local = anchor.match(/^local:(\d{1,10})$/);
  if (local) {
    const p = await prisma.product.findFirst({ where: { storeId, id: Number(local[1]) }, select: { id: true, name: true } });
    return p ?? null;
  }
  const variant = await prisma.platformVariantStock.findUnique({
    where: { storeId_platformVariantId: { storeId, platformVariantId: anchor } },
    select: { label: true, platformProductId: true },
  });
  if (!variant) return null;
  const parent = variant.platformProductId
    ? await prisma.product.findFirst({ where: { storeId, platformProductId: variant.platformProductId }, select: { id: true, name: true } })
    : null;
  return { id: parent?.id ?? null, name: parent?.name ?? null };
}

/**
 * Plafond de confirmations par adresse (clé : empreinte de l'adresse, jamais
 * l'adresse) : 1 par boutique et par 24 h, 3 par 24 h toutes boutiques.
 * Au-delà, rien n'est envoyé ni créé (la réponse reste la même).
 */
async function reserveConfirmation(storeId: number, email: string): Promise<boolean> {
  const h = createHash('sha256').update(email).digest('hex').slice(0, 32);
  try {
    const redis = getRedis();
    const perStore = await redis.set(`sa-confirm:${storeId}:${h}`, '1', 'EX', 86_400, 'NX');
    if (perStore !== 'OK') return false;
    const total = await redis.incr(`sa-confirm:all:${h}`);
    if (total === 1) await redis.expire(`sa-confirm:all:${h}`, 86_400);
    return total <= 3;
  } catch {
    // Redis indisponible : on n'envoie pas (mieux vaut rater une alerte que relayer du courrier).
    return false;
  }
}

stockAlertsRouter.post('/', subscribeLimiter, widgetAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = subscribeSchema.parse(req.body);
    const storeId = req.storeId!;

    const product = await resolveAlertProduct(storeId, body.platformVariantId, body.productId);
    if (!product) {
      res.status(400).json({ error: 'Unknown product' });
      return;
    }

    // Double opt-in dès que de vrais e-mails partent : sans lui, n'importe qui
    // inscrit l'adresse d'un tiers. En mode simulé (démo), l'alerte est active
    // tout de suite, sinon personne ne recevrait jamais la confirmation.
    const confirmRequired = isEmailConfigured();
    if (confirmRequired && !(await reserveConfirmation(storeId, body.email))) {
      // Même réponse qu'un envoi : pas d'oracle, pas de relais.
      res.status(200).json({ ok: true, confirm: true });
      return;
    }
    const r = await subscribeStockAlert({
      storeId,
      platformVariantId: body.platformVariantId,
      email: body.email,
      productId: product.id,
      variantLabel: body.variantLabel ?? null,
      visitorId: body.visitorId ?? null,
      confirmRequired,
    });
    if (r.confirmToken) {
      const link = `${publicApiBase()}/api/public/stock-alerts/confirm?token=${r.confirmToken}`;
      const what = product.name ? `« ${product.name} »` : 'ce produit';
      const text = (url: string) =>
        `Bonjour,\n\nVous avez demandé à être prévenu du retour de ${what} chez ${req.store?.name ?? 'la boutique'}.\n` +
        `Pour confirmer, cliquez ici : ${url}\n\n` +
        `Si ce n'est pas vous, ignorez ce message : sans confirmation, l'adresse est effacée sous 7 jours.`;
      const sent = await sendEmail({
        storeId,
        to: body.email,
        subject: `Confirmez votre alerte de retour de stock`,
        bodyText: text(link),
        // En base, jamais le jeton : qui lit la liste des e-mails ne peut pas confirmer à la place du client.
        storedBodyText: text('[lien de confirmation]'),
        tag: 'stock-alert-confirm',
        relatedEntity: 'stock_alert',
        relatedId: r.id,
      });
      if (sent.status === 'failed') {
        await dropPendingStockAlert(r.id);
        res.status(503).json({ error: 'Confirmation email could not be sent' });
        return;
      }
    }
    // Même réponse qu'une adresse soit déjà inscrite ou non : pas d'oracle.
    res.status(200).json({ ok: true, confirm: confirmRequired });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    next(err);
  }
});

stockAlertsRouter.get('/demand', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rows = await getPrisma().stockAlert.findMany({
      where: { storeId: req.storeId!, status: 'waiting' },
      include: { product: { select: { name: true } } },
    });
    const demand = aggregateRestockDemand(rows as unknown as StockAlertRow[]);
    // Enrichit avec le nom produit local quand on l'a.
    const names = new Map(rows.filter(r => r.productId && r.product).map(r => [r.productId!, r.product!.name]));
    res.json({
      demand: demand.map(d => ({ ...d, productName: d.productId ? names.get(d.productId) ?? null : null })),
      totalWaiting: demand.reduce((s, d) => s + d.waiting, 0),
    });
  } catch (err) {
    next(err);
  }
});

stockAlertsRouter.get('/summary', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rows = await getPrisma().stockAlert.findMany({ where: { storeId: req.storeId! } });
    res.json(restockProof(rows as unknown as StockAlertRow[]));
  } catch (err) {
    next(err);
  }
});
