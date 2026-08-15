/**
 * Mail → SAV auto-routing.
 *
 * When an inbound mail is classified as COMPLAINT, DELIVERY_ISSUE,
 * RETURN_REQUEST, or PAYMENT_ISSUE, we open a SAV ticket automatically so
 * the merchant sees it in the SAV inbox, not buried in the mail queue.
 *
 * We deduplicate by (storeId, fromAddr, category) within 24h: a customer
 * pinging twice about the same issue shouldn't create two tickets.
 */

import { getPrisma, logger } from '@shimmer/core';

interface SweepResult {
  scanned: number;
  ticketsCreated: number;
  skipped: number;
  errors: number;
}

const SAV_CATEGORIES = ['COMPLAINT', 'DELIVERY_ISSUE', 'RETURN_REQUEST', 'PAYMENT_ISSUE'] as const;

const CATEGORY_TO_SAV_TYPE: Record<string, string> = {
  COMPLAINT: 'product_defect',
  DELIVERY_ISSUE: 'delivery',
  RETURN_REQUEST: 'return',
  PAYMENT_ISSUE: 'refund',
};

function ticketNumber(): string {
  const r = Math.floor(Math.random() * 9000) + 1000;
  return `SAV-${Date.now().toString(36).slice(-4).toUpperCase()}${r}`;
}

/**
 * Per-mail processor invoked synchronously after classification. Creates a
 * SAV ticket if the mail looks like one (and we have an order + no dup).
 */
export async function processMailToSavJob({ mailId }: { mailId: number }): Promise<{ ticketId: number | null; reason?: string }> {
  const prisma = getPrisma();
  const mail = await prisma.mailQueue.findUnique({ where: { id: mailId } });
  if (!mail) return { ticketId: null, reason: 'mail-not-found' };
  if (!mail.category || !SAV_CATEGORIES.includes(mail.category as typeof SAV_CATEGORIES[number])) {
    return { ticketId: null, reason: 'non-sav-category' };
  }

  const customer = await prisma.customer.findFirst({
    where: { storeId: mail.storeId, email: mail.fromAddr },
  });
  if (!customer) return { ticketId: null, reason: 'unknown-customer' };

  const recentOrder = await prisma.order.findFirst({
    where: { storeId: mail.storeId, customerId: customer.id },
    orderBy: { orderedAt: 'desc' },
  });
  if (!recentOrder) return { ticketId: null, reason: 'no-order' };

  const savType = CATEGORY_TO_SAV_TYPE[mail.category] ?? 'other';
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const existing = await prisma.savRequest.findFirst({
    where: {
      storeId: mail.storeId,
      customerId: customer.id,
      type: savType,
      createdAt: { gte: oneDayAgo },
    },
  });
  if (existing) return { ticketId: existing.id, reason: 'deduplicated' };

  const ticket = await prisma.savRequest.create({
    data: {
      storeId: mail.storeId,
      requestNumber: ticketNumber(),
      orderId: recentOrder.id,
      customerId: customer.id,
      type: savType,
      status: 'open',
      description: `[auto] Mail reçu : "${mail.subject}"\n\n${mail.body.slice(0, 1500)}`,
    },
  });
  return { ticketId: ticket.id };
}

export async function sweepMailToSav(now: Date = new Date()): Promise<SweepResult> {
  const prisma = getPrisma();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const candidates = await prisma.mailQueue.findMany({
    where: {
      category: { in: [...SAV_CATEGORIES] },
      createdAt: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
    },
    take: 200,
    orderBy: { createdAt: 'desc' },
  });

  const result: SweepResult = {
    scanned: candidates.length,
    ticketsCreated: 0,
    skipped: 0,
    errors: 0,
  };

  for (const mail of candidates) {
    if (!mail.category) {
      result.skipped += 1;
      continue;
    }
    try {
      const customer = await prisma.customer.findFirst({
        where: { storeId: mail.storeId, email: mail.fromAddr },
      });
      if (!customer) {
        result.skipped += 1;
        continue;
      }

      const recentOrder = await prisma.order.findFirst({
        where: { storeId: mail.storeId, customerId: customer.id },
        orderBy: { orderedAt: 'desc' },
      });

      const savType = CATEGORY_TO_SAV_TYPE[mail.category] ?? 'other';
      const existing = await prisma.savRequest.findFirst({
        where: {
          storeId: mail.storeId,
          customerId: customer.id,
          type: savType,
          createdAt: { gte: oneDayAgo },
        },
      });
      if (existing) {
        result.skipped += 1;
        continue;
      }

      if (!recentOrder) {
        result.skipped += 1;
        continue;
      }

      await prisma.savRequest.create({
        data: {
          storeId: mail.storeId,
          requestNumber: ticketNumber(),
          orderId: recentOrder.id,
          customerId: customer.id,
          type: savType,
          status: 'open',
          description: `[auto] Mail reçu : "${mail.subject}"\n\n${mail.body.slice(0, 1500)}`,
        },
      });
      result.ticketsCreated += 1;
    } catch (err) {
      logger.warn({ err, mailId: mail.id }, 'automation.mail-to-sav.create-failed');
      result.errors += 1;
    }
  }

  logger.info({ ...result }, 'automation.mail-to-sav.swept');
  return result;
}
