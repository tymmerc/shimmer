/**
 * Appartenance à la boutique. Les ids (client, commande) reçus dans une
 * requête marchand sont séquentiels : sans ce contrôle, une clé secrète
 * rattachait à sa boutique les clients et commandes d'une autre, puis lisait
 * leurs e-mails et leur écrivait (audit du 30/09).
 */

import { ShimmerError } from '@shimmer/core';

interface TenantPrisma {
  customer: { findFirst(args: { where: { id: number; storeId: number }; select: { id: true } }): Promise<{ id: number } | null> };
  order: { findFirst(args: { where: { id: number; storeId: number; customerId?: number }; select: { id: true } }): Promise<{ id: number } | null> };
}

export async function assertCustomerInStore(prisma: TenantPrisma, storeId: number, customerId: number): Promise<void> {
  const found = await prisma.customer.findFirst({ where: { id: customerId, storeId }, select: { id: true } });
  if (!found) throw new ShimmerError('Customer not found', 'NOT_FOUND', 404);
}

export async function assertOrderInStore(prisma: TenantPrisma, storeId: number, orderId: number, customerId?: number): Promise<void> {
  const found = await prisma.order.findFirst({
    where: { id: orderId, storeId, ...(customerId !== undefined ? { customerId } : {}) },
    select: { id: true },
  });
  if (!found) throw new ShimmerError('Order not found', 'NOT_FOUND', 404);
}
