/**
 * Chat → order attribution.
 *
 * When an order is created (from a webhook), we look back at the customer's
 * recent sales-mode chat sessions. If the customer chatted with the vendeur IA
 * within the last 7 days, we attribute the order to that session — a
 * conservative last-touch attribution.
 *
 * The session's `recommendedProductIds` and `attributedOrderId` are stored on
 * the ChatSession row so a single GET on the dashboard can report attributed
 * revenue without joining at query time.
 */

import { getPrisma, logger } from '@shimmer/core';

const ATTRIBUTION_WINDOW_DAYS = 7;

export async function attributeOrderToChat(
  storeId: number,
  orderId: number,
  customerEmail: string,
): Promise<{ attributed: boolean; sessionId?: number }> {
  if (!customerEmail) return { attributed: false };
  const prisma = getPrisma();
  const since = new Date(Date.now() - ATTRIBUTION_WINDOW_DAYS * 24 * 3600 * 1000);

  const session = await prisma.chatSession.findFirst({
    where: {
      storeId,
      customerEmail,
      mode: 'sales',
      createdAt: { gte: since },
      attributedOrderId: null,
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!session) return { attributed: false };

  await prisma.chatSession.update({
    where: { id: session.id },
    data: { attributedOrderId: orderId },
  });

  logger.info({
    storeId,
    orderId,
    chatSessionId: session.id,
    sessionToken: session.sessionToken,
  }, 'attribution.chat.matched');

  return { attributed: true, sessionId: session.id };
}
