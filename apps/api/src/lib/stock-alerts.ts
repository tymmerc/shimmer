/**
 * Retour de stock ("back in stock") — le module qui transforme une rupture en
 * donnée au lieu d'une perte.
 *
 * Un visiteur demande à être prévenu quand une variante épuisée revient. À la
 * remise en stock (webhook inventaire de la plateforme), on l'écrit ; s'il
 * commande ensuite, on le compte. Preuve DIRECTE, un par un, comptable dès la
 * première semaine (comme un panier récupéré), qui entre dans le CA prouvé.
 *
 * Structure : logique pure sur des rows simples en haut (testable sans base),
 * couche Prisma en bas. Même pattern que lib/holdout/proof.ts.
 */

import { getPrisma, logger } from '@shimmer/core';
import { sendEmail } from '@shimmer/email-connector';

// ─────────────────────────────────────────────────────────────
// Logique pure
// ─────────────────────────────────────────────────────────────

/** Fenêtre pendant laquelle une commande est attribuée à une notification. */
export const CONVERSION_WINDOW_DAYS = 7;
const CONVERSION_WINDOW_MS = CONVERSION_WINDOW_DAYS * 24 * 60 * 60 * 1000;

export type StockAlertStatus = 'waiting' | 'notified' | 'converted' | 'expired';

export interface StockAlertRow {
  id: number;
  storeId: number;
  productId: number | null;
  platformVariantId: string;
  variantLabel: string | null;
  email: string;
  visitorId: string | null;
  status: string;
  createdAt: Date;
  notifiedAt: Date | null;
  convertedAt: Date | null;
  orderId: number | null;
  convertedAmount: number | { toString(): string } | null;
}

/** Vrai uniquement sur la transition 0 → >0. Un réassort d'une variante déjà dispo ne notifie personne. */
export function detectRestock(previous: number | null, current: number): boolean {
  return (previous ?? 0) <= 0 && current > 0;
}

export interface PaidOrderFacts {
  email: string;
  orderedAt: Date;
  /** Ids de variantes plateforme présentes dans la commande. Vide = inconnu → match sur l'email seul. */
  variantIds: string[];
}

/**
 * Parmi des alertes, celles qu'une commande payée convertit : même email
 * (insensible à la casse), notifiée AVANT la commande, dans la fenêtre, et si
 * on connaît les variantes commandées, la variante attendue en fait partie.
 */
export function matchConversion(alerts: StockAlertRow[], order: PaidOrderFacts): StockAlertRow[] {
  const email = order.email.trim().toLowerCase();
  const t = order.orderedAt.getTime();
  return alerts.filter(a => {
    if (a.status !== 'notified' || !a.notifiedAt) return false;
    if (a.email.trim().toLowerCase() !== email) return false;
    const n = a.notifiedAt.getTime();
    if (t < n || t - n > CONVERSION_WINDOW_MS) return false;
    if (order.variantIds.length > 0 && !order.variantIds.includes(a.platformVariantId)) return false;
    return true;
  });
}

export interface RestockDemand {
  platformVariantId: string;
  variantLabel: string | null;
  productId: number | null;
  waiting: number;
}

/** Ce que le marchand doit réassortir en priorité : demandes en attente par variante, les plus voulues d'abord. */
export function aggregateRestockDemand(alerts: StockAlertRow[]): RestockDemand[] {
  const byVariant = new Map<string, RestockDemand>();
  for (const a of alerts) {
    if (a.status !== 'waiting') continue;
    const cur = byVariant.get(a.platformVariantId);
    if (cur) {
      byVariant.set(a.platformVariantId, { ...cur, waiting: cur.waiting + 1 });
    } else {
      byVariant.set(a.platformVariantId, {
        platformVariantId: a.platformVariantId,
        variantLabel: a.variantLabel,
        productId: a.productId,
        waiting: 1,
      });
    }
  }
  return [...byVariant.values()].sort((x, y) => y.waiting - x.waiting);
}

export interface RestockEmailInput {
  storeName: string;
  variantLabel: string;
  available: number | null;
  productUrl: string;
  visitorId: string | null;
}

/** L'email "il est de retour". Court, un lien, le compte restant si on le connaît. */
export function buildRestockEmail(i: RestockEmailInput): { subject: string; bodyText: string } {
  const url = i.visitorId
    ? `${i.productUrl}${i.productUrl.includes('?') ? '&' : '?'}shimmer_vid=${encodeURIComponent(i.visitorId)}`
    : i.productUrl;
  const left = i.available !== null && i.available > 0
    ? ` Il en reste ${i.available}, premier arrivé premier servi.`
    : '';
  return {
    subject: `${i.variantLabel} est de retour`,
    bodyText:
      `Bonjour,\n\n` +
      `Vous nous aviez demandé de vous prévenir : ${i.variantLabel} est de nouveau disponible.${left}\n\n` +
      `${url}\n\n` +
      `L'équipe ${i.storeName}.`,
  };
}

export interface RestockProof {
  waiting: number;
  notified: number;
  converted: number;
  conversionRatePct: number;
  convertedEUR: number;
}

/** Compteurs directs pour la page Preuve. "notified" inclut les convertis (ils ont bien été prévenus). */
export function restockProof(alerts: StockAlertRow[]): RestockProof {
  const waiting = alerts.filter(a => a.status === 'waiting').length;
  const notified = alerts.filter(a => a.status === 'notified' || a.status === 'converted').length;
  const convertedRows = alerts.filter(a => a.status === 'converted');
  const converted = convertedRows.length;
  const convertedEUR = round2(convertedRows.reduce((s, a) => s + Number(a.convertedAmount ?? 0), 0));
  return {
    waiting,
    notified,
    converted,
    conversionRatePct: notified ? round1((converted / notified) * 100) : 0,
    convertedEUR,
  };
}

// ─────────────────────────────────────────────────────────────
// Couche Prisma
// ─────────────────────────────────────────────────────────────

export interface SubscribeInput {
  storeId: number;
  platformVariantId: string;
  email: string;
  productId?: number | null;
  variantLabel?: string | null;
  visitorId?: string | null;
}

/**
 * Inscription idempotente : une seule alerte active par (store, variante,
 * email). Ré-inscrire renvoie l'existante sans erreur.
 */
export async function subscribeStockAlert(input: SubscribeInput): Promise<{ id: number; created: boolean }> {
  const prisma = getPrisma();
  const email = input.email.trim().toLowerCase();
  const existing = await prisma.stockAlert.findFirst({
    where: { storeId: input.storeId, platformVariantId: input.platformVariantId, email, status: { in: ['waiting', 'notified'] } },
    select: { id: true },
  });
  if (existing) return { id: existing.id, created: false };
  const created = await prisma.stockAlert.create({
    data: {
      storeId: input.storeId,
      platformVariantId: input.platformVariantId,
      email,
      productId: input.productId ?? null,
      variantLabel: input.variantLabel ?? null,
      visitorId: input.visitorId ?? null,
      status: 'waiting',
    },
    select: { id: true },
  });
  logger.info({ storeId: input.storeId, variant: input.platformVariantId }, 'stock-alert.subscribed');
  return { id: created.id, created: true };
}

export interface NotifyInput {
  storeId: number;
  platformVariantId: string;
  available: number | null;
  /** URL produit publique ; si absente on retombe sur la fiche produit locale si connue. */
  productUrl?: string | null;
  /**
   * Id produit plateforme de la variante revenue. Les inscriptions faites depuis
   * le vendeur ne connaissent souvent que le produit (pas la taille) : elles
   * sont ancrées `p:<platformProductId>` et se déclenchent au retour de
   * n'importe quelle variante du produit.
   */
  platformProductId?: string | null;
}

/**
 * Notifie tous les inscrits en attente sur une variante revenue en stock.
 * Idempotent : ceux déjà `notified` ne sont pas re-prévenus.
 */
export async function notifyRestock(input: NotifyInput): Promise<{ notified: number }> {
  const prisma = getPrisma();
  const anchors = [input.platformVariantId];
  if (input.platformProductId) anchors.push(`p:${input.platformProductId}`);
  const waiting = await prisma.stockAlert.findMany({
    where: { storeId: input.storeId, platformVariantId: { in: anchors }, status: 'waiting' },
    include: {
      store: { select: { name: true } },
      product: { select: { name: true, platformProductId: true } },
    },
  });
  if (waiting.length === 0) return { notified: 0 };

  let notified = 0;
  for (const a of waiting) {
    const label = a.variantLabel ?? a.product?.name ?? 'Votre article';
    const productUrl = input.productUrl ?? '';
    const mail = buildRestockEmail({
      storeName: a.store.name,
      variantLabel: label,
      available: input.available,
      productUrl,
      visitorId: a.visitorId,
    });
    try {
      await sendEmail({
        storeId: a.storeId,
        to: a.email,
        subject: mail.subject,
        bodyText: mail.bodyText,
        tag: 'stock-alert',
        relatedEntity: 'stock_alert',
        relatedId: a.id,
      });
      await prisma.stockAlert.update({ where: { id: a.id }, data: { status: 'notified', notifiedAt: new Date() } });
      notified += 1;
    } catch (err) {
      logger.warn({ err, alertId: a.id }, 'stock-alert.notify-failed');
    }
  }
  logger.info({ storeId: input.storeId, variant: input.platformVariantId, notified }, 'stock-alert.notified');
  return { notified };
}

/**
 * À une commande payée : marque convertis les inscrits prévenus qui ont acheté
 * dans la fenêtre. Montant attribué = total commande (comme un panier récupéré).
 */
export async function recordStockAlertConversions(input: {
  storeId: number;
  orderId: number;
  email: string;
  orderedAt: Date;
  totalAmount: number;
  variantIds: string[];
}): Promise<{ converted: number }> {
  const prisma = getPrisma();
  const candidates = await prisma.stockAlert.findMany({
    where: { storeId: input.storeId, status: 'notified', email: input.email.trim().toLowerCase() },
  });
  const matched = matchConversion(candidates as StockAlertRow[], {
    email: input.email,
    orderedAt: input.orderedAt,
    variantIds: input.variantIds,
  });
  if (matched.length === 0) return { converted: 0 };
  await prisma.stockAlert.updateMany({
    where: { id: { in: matched.map(m => m.id) } },
    data: { status: 'converted', convertedAt: new Date(), orderId: input.orderId, convertedAmount: input.totalAmount },
  });
  logger.info({ storeId: input.storeId, orderId: input.orderId, converted: matched.length }, 'stock-alert.converted');
  return { converted: matched.length };
}

function round1(n: number): number { return Math.round(n * 10) / 10; }
function round2(n: number): number { return Math.round(n * 100) / 100; }
