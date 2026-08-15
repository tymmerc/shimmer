/**
 * RGPD article 17 — droit à l'effacement.
 *
 * The merchant (controller) calls this when a customer requests deletion.
 * Cascades across every Shimmer table that holds anything about that customer.
 *
 *   POST /api/erasure { customerId?: number, email?: string }
 *
 * Returns counts deleted per table so the merchant can record proof of
 * propagation for their own RGPD register.
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { getPrisma, logger, ShimmerError } from '@shimmer/core';

export const erasureRouter = Router();

const schema = z
  .object({
    customerId: z.number().int().positive().optional(),
    email: z.string().email().max(255).optional(),
  })
  .refine(b => b.customerId || b.email, { message: 'customerId or email required' });

erasureRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = schema.parse(req.body);
    const storeId = req.storeId!;
    const prisma = getPrisma();

    // Resolve the customer (so the cascade is reliable even if only email was given)
    const customer = body.customerId
      ? await prisma.customer.findFirst({ where: { id: body.customerId, storeId } })
      : await prisma.customer.findFirst({ where: { email: body.email!, storeId } });

    if (!customer) {
      throw new ShimmerError('Customer not found', 'NOT_FOUND', 404);
    }

    const counts = {
      chatSessions: 0,
      knowledgeChunksFromReviews: 0,
      savRequests: 0,
      reviewRequests: 0,
      reviews: 0,
      orders: 0,
      abandonedCarts: 0,
      mailQueue: 0,
      sentEmails: 0,
    };

    // 1. Chat sessions (by email — we don't store customerId there)
    if (customer.email) {
      const r = await prisma.chatSession.deleteMany({
        where: { storeId, customerEmail: customer.email },
      });
      counts.chatSessions = r.count;
    }

    // 2. Knowledge chunks generated from this customer's reviews
    const customerReviewIds = (
      await prisma.review.findMany({
        where: { storeId, customerId: customer.id },
        select: { id: true },
      })
    ).map(r => r.id);
    if (customerReviewIds.length > 0) {
      const r = await prisma.knowledgeChunk.deleteMany({
        where: { storeId, sourceType: 'review', sourceId: { in: customerReviewIds } },
      });
      counts.knowledgeChunksFromReviews = r.count;
    }

    // 3. Reviews and review requests
    const r3a = await prisma.review.deleteMany({ where: { storeId, customerId: customer.id } });
    counts.reviews = r3a.count;
    const r3b = await prisma.reviewRequest.deleteMany({ where: { storeId, customerId: customer.id } });
    counts.reviewRequests = r3b.count;

    // 4. SAV requests
    const r4 = await prisma.savRequest.deleteMany({ where: { storeId, customerId: customer.id } });
    counts.savRequests = r4.count;

    // 5. Abandoned carts
    const r5 = await prisma.abandonedCart.deleteMany({
      where: {
        storeId,
        OR: [
          { customerId: customer.id },
          ...(customer.email ? [{ customerEmail: customer.email }] : []),
        ],
      },
    });
    counts.abandonedCarts = r5.count;

    // 6. Sent emails to this customer
    if (customer.email) {
      const r = await prisma.sentEmail.deleteMany({
        where: { storeId, toAddr: customer.email },
      });
      counts.sentEmails = r.count;
    }

    // 7. Inbound mails from this customer
    if (customer.email) {
      const r = await prisma.mailQueue.deleteMany({
        where: { storeId, fromAddr: customer.email },
      });
      counts.mailQueue = r.count;
    }

    // 8. Orders — keep aggregated, but anonymize the customer link.
    // We keep order rows for accounting / aggregate stats; the FK to customer
    // becomes orphan after we delete the customer below. Prisma onDelete is
    // RESTRICT, so we explicitly nuke the linkage by deleting orders.
    const r8 = await prisma.order.deleteMany({ where: { storeId, customerId: customer.id } });
    counts.orders = r8.count;

    // 9. Finally the customer itself
    await prisma.customer.delete({ where: { id: customer.id } });

    logger.info({ storeId, customerId: customer.id, counts }, 'rgpd.erasure.complete');
    res.json({
      ok: true,
      customerId: customer.id,
      email: customer.email,
      deleted: counts,
      note: 'Holdout visitor cookies are pseudonymous (no email/customerId stored). If the visitor still has a Shimmer cookie, their future activity remains pseudonymous; the cookie expires per its TTL.',
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    next(err);
  }
});
