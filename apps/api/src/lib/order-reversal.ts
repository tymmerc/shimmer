/**
 * Commande annulée, remboursée ou échouée APRÈS avoir été payée : ce qu'elle
 * avait compté est défait. Sans ça, son montant restait dans la preuve (et
 * dans la part variable facturée) et dans le chiffre du retour de stock.
 */

import { getPrisma, logger } from '@shimmer/core';

export async function reverseOrderEffects(storeId: number, orderId: number, orderRef: string): Promise<void> {
  const prisma = getPrisma();

  // Retour de stock : l'inscrit redevient « prévenu », la vente ne compte plus.
  const alerts = await prisma.stockAlert.updateMany({
    where: { storeId, orderId, status: 'converted' },
    data: { status: 'notified', convertedAt: null, orderId: null, convertedAmount: null },
  });

  // Preuve : la ligne de la commande et sa part dans le visiteur.
  let holdout = false;
  const ho = await prisma.holdoutOrder.findFirst({ where: { storeId, orderRef } });
  if (ho) {
    await prisma.$transaction([
      prisma.holdoutOrder.delete({ where: { id: ho.id } }),
      prisma.holdoutVisitor.updateMany({
        where: { storeId, visitorId: ho.visitorId },
        data: { orderCount: { decrement: 1 }, revenue: { decrement: ho.amount } },
      }),
    ]);
    holdout = true;
  }

  // Attribution : la conversation redevient libre.
  const chats = await prisma.chatSession.updateMany({
    where: { storeId, attributedOrderId: orderId },
    data: { attributedOrderId: null },
  });

  logger.info({ storeId, orderId, stockAlerts: alerts.count, holdout, chats: chats.count }, 'order.reversed');
}
