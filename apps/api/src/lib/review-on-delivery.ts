/**
 * Demande d'avis à la livraison. Avant le 30/09, seule la route manuelle
 * PATCH /api/orders/:id/status en créait : aucun webhook ne le faisait, donc
 * aucune demande n'est jamais partie d'elle-même. Désormais, la livraison
 * annoncée par Shopify (fulfillments/update « delivered ») la programme.
 *
 * Une demande par commande, 48 h après la livraison, valable 30 jours.
 * Une boutique peut couper l'envoi automatique : config.reviews.autoRequest = false.
 */

import { randomUUID } from 'node:crypto';
import { getPrisma, logger } from '@shimmer/core';
import { enqueueReviewRequest } from './automations/queue.js';

export const REVIEW_DELAY_MS = 48 * 3600 * 1000;
export const REVIEW_VALID_MS = 30 * 86400 * 1000;

export function autoReviewEnabled(config: unknown): boolean {
  const reviews = (config as { reviews?: { autoRequest?: unknown } } | null)?.reviews;
  return reviews?.autoRequest !== false;
}

/**
 * WooCommerce ne sait rien de la livraison : « terminée » veut dire expédiée.
 * La demande part alors quelques jours après (config.reviews.daysAfterShipped,
 * 4 par défaut : 2 à 3 jours de transport, plus une journée pour goûter).
 */
export function daysAfterShipped(config: unknown): number {
  const n = Number((config as { reviews?: { daysAfterShipped?: unknown } } | null)?.reviews?.daysAfterShipped);
  return Number.isFinite(n) && n >= 1 && n <= 30 ? n : 4;
}

/** Renvoie l'id de la demande créée, ou null (déjà faite, pas de client, coupé). */
export async function scheduleReviewOnDelivery(storeId: number, orderId: number, now: Date = new Date()): Promise<number | null> {
  return scheduleReview(storeId, orderId, now, 'delivered');
}

/** WooCommerce : commande terminée (expédiée). */
export async function scheduleReviewAfterShipping(storeId: number, orderId: number, now: Date = new Date()): Promise<number | null> {
  return scheduleReview(storeId, orderId, now, 'shipped');
}

async function scheduleReview(storeId: number, orderId: number, now: Date, trigger: 'delivered' | 'shipped'): Promise<number | null> {
  const prisma = getPrisma();
  const order = await prisma.order.findFirst({
    where: { id: orderId, storeId },
    select: { id: true, customerId: true, status: true, store: { select: { config: true } } },
  });
  const statusOk = trigger === 'delivered' ? order?.status === 'delivered' : order?.status === 'shipped' || order?.status === 'delivered';
  if (!order || !statusOk || !order.customerId) return null;
  if (!autoReviewEnabled(order.store?.config)) return null;
  const existing = await prisma.reviewRequest.findFirst({ where: { storeId, orderId }, select: { id: true } });
  if (existing) return null;

  const delay = trigger === 'delivered' ? REVIEW_DELAY_MS : daysAfterShipped(order.store?.config) * 86_400_000;
  const scheduledAt = new Date(now.getTime() + delay);
  // Deux webhooks « livrée » simultanés : l'index unique sur order_id en
  // laisse passer un seul (P2002 pour l'autre).
  const rr = await prisma.reviewRequest.create({
    data: {
      storeId,
      orderId,
      customerId: order.customerId,
      // Le jeton est la seule protection de la page d'avis publique : aléatoire fort.
      token: randomUUID(),
      scheduledAt,
      expiresAt: new Date(scheduledAt.getTime() + REVIEW_VALID_MS),
    },
  }).catch((err: { code?: string }) => {
    if (err.code === 'P2002') return null;
    throw err;
  });
  if (!rr) return null;
  try {
    await enqueueReviewRequest(rr.id, scheduledAt);
  } catch (err) {
    // Le filet de rattrapage (automation-sweep) la reprendra à l'échéance.
    logger.warn({ err, reviewRequestId: rr.id }, 'review-request.enqueue-failed');
  }
  logger.info({ storeId, orderId, reviewRequestId: rr.id, trigger }, 'review-request.scheduled');
  return rr.id;
}
