/**
 * Context builder — constructs Claude system prompt context from customer, orders, policies, store config.
 */

import { getPrisma, logger } from '@shimmer/core';

export interface ChatContext {
  customer?: CustomerContext;
  recentOrders: OrderContext[];
  activeSavRequests: SavContext[];
  faq: FaqEntry[];
  storeConfig: Record<string, unknown>;
}

interface CustomerContext {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
}

interface OrderContext {
  orderNumber: string;
  status: string;
  totalAmount: number;
  orderedAt: Date;
  deliveredAt?: Date;
  items: { productName: string; quantity: number; unitPrice: number }[];
  shipments: { carrier: string; trackingNumber: string; status: string; lastLocation?: string }[];
}

interface SavContext {
  requestNumber: string;
  type: string;
  status: string;
  description?: string;
  resolution?: string;
  orderNumber: string;
}

interface FaqEntry {
  question: string;
  answer: string;
  category: string;
}

/**
 * Build full context for the chatbot from DB data.
 */
export async function buildChatContext(
  storeId: number,
  customerEmail?: string,
): Promise<ChatContext> {
  const prisma = getPrisma();

  // Load store config
  const store = await prisma.store.findUnique({
    where: { id: storeId },
    select: { config: true },
  });

  const context: ChatContext = {
    recentOrders: [],
    activeSavRequests: [],
    faq: [],
    storeConfig: (store?.config as Record<string, unknown>) || {},
  };

  // Load FAQ
  const faqEntries = await prisma.faq.findMany({
    where: { storeId },
    orderBy: { sortOrder: 'asc' },
    take: 30,
  });
  context.faq = faqEntries.map((f) => ({
    question: f.question,
    answer: f.answer,
    category: f.category,
  }));

  // If we have a customer email, load their data
  if (customerEmail) {
    const customer = await prisma.customer.findFirst({
      where: { storeId, email: customerEmail },
    });

    if (customer) {
      context.customer = {
        id: customer.id,
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        phone: customer.phone || undefined,
      };

      // Recent orders (last 10)
      const orders = await prisma.order.findMany({
        where: { customerId: customer.id, storeId },
        include: {
          items: { include: { product: { select: { name: true } } } },
          shipments: true,
        },
        orderBy: { orderedAt: 'desc' },
        take: 10,
      });

      context.recentOrders = orders.map((o) => ({
        orderNumber: o.orderNumber,
        status: o.status,
        totalAmount: Number(o.totalAmount),
        orderedAt: o.orderedAt,
        deliveredAt: o.deliveredAt || undefined,
        items: o.items.map((item) => ({
          productName: item.product.name,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
        })),
        shipments: o.shipments.map((s) => ({
          carrier: s.carrier,
          trackingNumber: s.trackingNumber,
          status: s.status,
          lastLocation: s.lastLocation || undefined,
        })),
      }));

      // Active SAV requests
      const savRequests = await prisma.savRequest.findMany({
        where: {
          customerId: customer.id,
          storeId,
          status: { in: ['open', 'in_progress'] },
        },
        include: { order: { select: { orderNumber: true } } },
      });

      context.activeSavRequests = savRequests.map((s) => ({
        requestNumber: s.requestNumber,
        type: s.type,
        status: s.status,
        description: s.description || undefined,
        resolution: s.resolution || undefined,
        orderNumber: s.order.orderNumber,
      }));
    }
  }

  logger.debug({
    hasCustomer: !!context.customer,
    orders: context.recentOrders.length,
    sav: context.activeSavRequests.length,
    faq: context.faq.length,
  }, 'chatbot.context.built');

  return context;
}

/**
 * Format context into a system prompt section.
 */
export function formatContextForPrompt(ctx: ChatContext): string {
  const parts: string[] = [];

  if (ctx.customer) {
    parts.push(`## Client
- Nom: ${ctx.customer.firstName} ${ctx.customer.lastName}
- Email: ${ctx.customer.email}
${ctx.customer.phone ? `- Téléphone: ${ctx.customer.phone}` : ''}`);
  }

  if (ctx.recentOrders.length > 0) {
    parts.push(`## Commandes récentes
${ctx.recentOrders.map((o) => {
  const items = o.items.map((i) => `  - ${i.quantity}x ${i.productName} (${i.unitPrice}€)`).join('\n');
  const shipping = o.shipments.length > 0
    ? o.shipments.map((s) => `  📦 ${s.carrier} ${s.trackingNumber}: ${s.status}${s.lastLocation ? ` (${s.lastLocation})` : ''}`).join('\n')
    : '  Pas encore expédié';
  return `### ${o.orderNumber} — ${o.status} (${o.orderedAt.toLocaleDateString('fr-FR')})
  Total: ${o.totalAmount}€
${items}
${shipping}`;
}).join('\n\n')}`);
  }

  if (ctx.activeSavRequests.length > 0) {
    parts.push(`## Demandes SAV en cours
${ctx.activeSavRequests.map((s) =>
  `- ${s.requestNumber} (${s.type}): ${s.status} — Commande ${s.orderNumber}${s.description ? `\n  ${s.description}` : ''}`
).join('\n')}`);
  }

  if (ctx.faq.length > 0) {
    parts.push(`## FAQ
${ctx.faq.map((f) => `Q: ${f.question}\nR: ${f.answer}`).join('\n\n')}`);
  }

  return parts.join('\n\n');
}
