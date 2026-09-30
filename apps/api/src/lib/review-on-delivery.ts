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

/** Renvoie l'id de la demande créée, ou null (déjà faite, pas de client, coupé). */
export async function scheduleReviewOnDelivery(storeId: number, orderId: number, now: Date = new Date()): Promise<number | null> {
  const prisma = getPrisma();
  const order = await prisma.order.findFirst({
    where: { id: orderId, storeId },
    select: { id: true, customerId: true, status: true, store: { select: { config: true } } },
  });
  if (!order || order.status !== 'delivered' || !order.customerId) return null;
  if (!autoReviewEnabled(order.store?.config)) return null;
  const existing = await prisma.reviewRequest.findFirst({ where: { storeId, orderId }, select: { id: true } });
  if (existing) return null;

  const scheduledAt = new Date(now.getTime() + REVIEW_DELAY_MS);
  const rr = await prisma.reviewRequest.create({
    data: {
      storeId,
      orderId,
      customerId: order.customerId,
      // Le jeton est la seule protection de la page d'avis publique : aléatoire fort.
      token: randomUUID(),
      scheduledAt,
      expiresAt: new Date(now.getTime() + REVIEW_VALID_MS),
    },
  });
  try {
    await enqueueReviewRequest(rr.id, scheduledAt);
  } catch (err) {
    // Le filet de rattrapage (automation-sweep) la reprendra à l'échéance.
    logger.warn({ err, reviewRequestId: rr.id }, 'review-request.enqueue-failed');
  }
  logger.info({ storeId, orderId, reviewRequestId: rr.id }, 'review-request.scheduled-on-delivery');
  return rr.id;
}
