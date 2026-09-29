/**
 * Suivi de commande : lectures en base, branchées sur runOrderFlow.
 * Aucune donnée client (nom, adresse, téléphone) ne sort d'ici : seulement le
 * statut, les dates et le suivi transporteur.
 */

import { getPrisma } from '@shimmer/core';
import { orderNumberCandidates, VerificationThrottle, type TrackedOrder } from './order-tracking.js';
import type { OrderFlowDeps } from './order-flow.js';

const shipmentSelect = {
  carrier: true,
  trackingNumber: true,
  trackingUrl: true,
  status: true,
  shippedAt: true,
  estimatedDelivery: true,
  deliveredAt: true,
} as const;

const orderSelect = {
  orderNumber: true,
  status: true,
  orderedAt: true,
  deliveredAt: true,
  shipments: { select: shipmentSelect, orderBy: { id: 'asc' as const } },
} as const;

/** Commande de cette boutique dont le numéro ET l'email du client correspondent. */
export async function findOrderByRef(storeId: number, orderDigits: string, email: string): Promise<TrackedOrder | null> {
  const prisma = getPrisma();
  const wanted = email.trim().toLowerCase();
  const orders = await prisma.order.findMany({
    where: { storeId, orderNumber: { in: orderNumberCandidates(orderDigits) } },
    select: { ...orderSelect, customer: { select: { email: true } } },
    take: 5,
  });
  const match = orders.find(o => o.customer.email.trim().toLowerCase() === wanted);
  if (!match) return null;
  const { customer: _customer, ...order } = match;
  return order;
}

/**
 * Client de la boutique dont l'email est exactement celui-ci, casse ignorée.
 * Surtout pas `mode: 'insensitive'` de Prisma : il produit un ILIKE non
 * échappé où `_` est un joker (jane_smith@ retrouverait jane.smith@).
 */
export async function findCustomerIdByEmail(storeId: number, email: string): Promise<number | null> {
  const prisma = getPrisma();
  const wanted = email.trim().toLowerCase();
  const rows = await prisma.$queryRaw<{ id: number }[]>`
    SELECT id FROM customers
    WHERE store_id = ${storeId} AND lower(trim(email)) = ${wanted}
    ORDER BY id
    LIMIT 1`;
  return rows[0]?.id ?? null;
}

/** Dernières commandes d'un client identifié. */
export async function findRecentOrdersForEmail(storeId: number, email: string): Promise<TrackedOrder[]> {
  const prisma = getPrisma();
  const customerId = await findCustomerIdByEmail(storeId, email);
  if (!customerId) return [];
  return prisma.order.findMany({
    where: { storeId, customerId },
    select: orderSelect,
    orderBy: { orderedAt: 'desc' },
    take: 5,
  });
}

// 10 échecs par heure par email, et 10 par numéro de commande, toutes sessions
// confondues (en plus des 3 essais par session). Mémoire du process : remis à
// zéro au redémarrage de l'API.
const throttle = new VerificationThrottle(10, 60 * 60 * 1000);

export function orderFlowDeps(storeId: number): OrderFlowDeps {
  return {
    findByRef: (digits, email) => findOrderByRef(storeId, digits, email),
    findRecentForEmail: email => findRecentOrdersForEmail(storeId, email),
    throttle,
  };
}
