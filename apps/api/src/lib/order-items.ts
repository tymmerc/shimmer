/**
 * Lignes de commande. Les webhooks Shopify et WooCommerce créaient la
 * commande sans ses lignes : la page d'avis (qui liste les produits à noter)
 * était vide pour toute vraie commande. On relie chaque ligne au produit du
 * catalogue par son id plateforme ; une ligne sans produit connu est ignorée.
 */

import { getPrisma, logger } from '@shimmer/core';

export interface PlatformLineItem {
  platformProductId: string | null;
  quantity: number;
  unitPrice: number;
}

export async function linkOrderItems(storeId: number, orderId: number, items: PlatformLineItem[]): Promise<number> {
  const prisma = getPrisma();
  const ids = [...new Set(items.map((i) => i.platformProductId).filter((x): x is string => !!x))];
  if (ids.length === 0) return 0;
  // Déjà fait (webhook renvoyé) : on ne double pas les lignes.
  if ((await prisma.orderItem.count({ where: { orderId } })) > 0) return 0;
  const products = await prisma.product.findMany({
    where: { storeId, platformProductId: { in: ids } },
    select: { id: true, platformProductId: true },
  });
  const byPlatform = new Map(products.map((p) => [p.platformProductId!, p.id]));
  const rows = items
    .filter((i) => i.platformProductId && byPlatform.has(i.platformProductId))
    .map((i) => {
      const quantity = Math.max(1, Math.round(i.quantity || 1));
      const unitPrice = Number.isFinite(i.unitPrice) ? i.unitPrice : 0;
      return { orderId, productId: byPlatform.get(i.platformProductId!)!, quantity, unitPrice, totalPrice: unitPrice * quantity };
    });
  if (rows.length === 0) return 0;
  await prisma.orderItem.createMany({ data: rows });
  logger.info({ storeId, orderId, items: rows.length }, 'order.items.linked');
  return rows.length;
}
