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
import { getPrisma } from '@shimmer/core';
import { widgetAuth, authMiddleware } from '../middleware/auth.js';
import { createScopedRateLimiter } from '../middleware/rate-limiter.js';
import {
  subscribeStockAlert,
  aggregateRestockDemand,
  restockProof,
  type StockAlertRow,
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
  visitorId: z.string().trim().min(4).max(80).optional(),
});

stockAlertsRouter.post('/', subscribeLimiter, widgetAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = subscribeSchema.parse(req.body);
    const storeId = req.storeId!;

    // Si un productId est fourni, il doit appartenir à ce store (pas de fuite inter-store).
    let productId: number | null = null;
    if (body.productId) {
      const p = await getPrisma().product.findFirst({ where: { id: body.productId, storeId }, select: { id: true } });
      productId = p?.id ?? null;
    }

    const r = await subscribeStockAlert({
      storeId,
      platformVariantId: body.platformVariantId,
      email: body.email,
      productId,
      variantLabel: body.variantLabel ?? null,
      visitorId: body.visitorId ?? null,
    });
    res.status(r.created ? 201 : 200).json({ ok: true, id: r.id, created: r.created });
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
