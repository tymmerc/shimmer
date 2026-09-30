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
  visitorId?: string | null,
): Promise<{ attributed: boolean; sessionId?: number }> {
  // Avant le 30/09, seul l'e-mail reliait une commande au vendeur : il n'est
  // connu que d'un client connecté, donc presque jamais. L'identifiant du
  // panier (shimmer_vid, posé par le widget avec consentement) couvre les
  // visiteurs anonymes.
  const match = [
    ...(customerEmail ? [{ customerEmail }] : []),
    ...(visitorId ? [{ visitorId }] : []),
  ];
  if (match.length === 0) return { attributed: false };
  const prisma = getPrisma();
  const since = new Date(Date.now() - ATTRIBUTION_WINDOW_DAYS * 24 * 3600 * 1000);

  const session = await prisma.chatSession.findFirst({
    where: {
      storeId,
      OR: match,
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
  // Les recherches faites pendant cette conversation ont mené à un achat :
  // c'est le signal que lit le réindexage (tournures qui vendent).
  const searches = await prisma.searchSession.updateMany({
    where: { storeId, sessionToken: session.sessionToken, converted: false },
    data: { converted: true },
  });

  logger.info({
    storeId,
    orderId,
    chatSessionId: session.id,
    by: session.visitorId && visitorId && session.visitorId === visitorId ? 'visitor' : 'email',
    searchesConverted: searches.count,
  }, 'attribution.chat.matched');

  return { attributed: true, sessionId: session.id };
}
