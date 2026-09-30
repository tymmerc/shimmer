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
 *
 * Depuis le 30/09 : une personne sans fiche client (inscrite au retour de
 * stock, qui a seulement écrit) s'efface aussi par son e-mail ; les alertes
 * de retour de stock et les SMS sont effacés ; les e-mails se comparent sans
 * tenir compte de la casse.
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { getPrisma, logger, ShimmerError } from '@shimmer/core';
import { patchStoreConfig } from '../lib/knowledge-ingest.js';

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

    if (!customer && !body.email) {
      throw new ShimmerError('Customer not found', 'NOT_FOUND', 404);
    }
    const email = (customer?.email ?? body.email ?? '').trim().toLowerCase();
    const sameEmail = { equals: email, mode: 'insensitive' as const };

    const counts = {
      stockAlerts: 0,
      sentSms: 0,
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

    // 1. Chat sessions (by email — we don't store customerId there). The SAV
    // order tracking keeps the email only inside the messages while a check
    // is pending, so also delete sessions whose transcript contains it
    // (position(), not LIKE: no wildcard in an email can widen the match).
    if (email) {
      const r = await prisma.chatSession.deleteMany({
        where: { storeId, customerEmail: sameEmail },
      });
      const inTranscript = await prisma.$executeRaw`
        DELETE FROM chat_sessions
        WHERE store_id = ${storeId}
          AND position(${email} in lower(messages::text)) > 0`;
      counts.chatSessions = r.count + inTranscript;

      // Inscriptions au retour de stock (souvent sans fiche client).
      const alerts = await prisma.stockAlert.deleteMany({ where: { storeId, email: sameEmail } });
      counts.stockAlerts = alerts.count;
    }

    if (!customer) {
      // Pas de fiche : on efface ce qui tient à l'e-mail seul.
      const carts = await prisma.abandonedCart.deleteMany({ where: { storeId, customerEmail: sameEmail } });
      counts.abandonedCarts = carts.count;
      const sent = await prisma.sentEmail.deleteMany({ where: { storeId, toAddr: sameEmail } });
      counts.sentEmails = sent.count;
      const mails = await prisma.mailQueue.deleteMany({
        where: { storeId, OR: [{ fromAddr: sameEmail }, { fromAddr: { endsWith: `<${email}>`, mode: 'insensitive' } }] },
      });
      counts.mailQueue = mails.count;
      logger.info({ storeId, customerId: null, counts }, 'rgpd.erasure.complete');
      res.json({ ok: true, customerId: null, email, deleted: counts });
      return;
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

    // Le vendeur cite des questions tirées des tickets et des avis (relecture de
    // nuit, lib/knowledge-ingest.ts) : on force leur reconstruction sans ce client.
    if (counts.savRequests > 0 || counts.reviews > 0) {
      // Retrait immédiat des questions tirées du SAV (le vendeur ne les cite
      // plus dès maintenant) ; la relecture de nuit les reconstruit sans ce client.
      await prisma.knowledgeChunk.deleteMany({ where: { storeId, sourceType: 'sav_objection' } });
      await patchStoreConfig(prisma, storeId, {}, ['common_objections', 'knowledge_attempted_at', 'knowledge_ingested_at']);
    }

    // 5. Abandoned carts
    const r5 = await prisma.abandonedCart.deleteMany({
      where: {
        storeId,
        OR: [
          { customerId: customer.id },
          ...(email ? [{ customerEmail: sameEmail }] : []),
        ],
      },
    });
    counts.abandonedCarts = r5.count;

    // 6. Sent emails to this customer
    if (email) {
      const r = await prisma.sentEmail.deleteMany({
        where: { storeId, toAddr: sameEmail },
      });
      counts.sentEmails = r.count;
    }
    if (customer.phone) {
      const r = await prisma.sentSms.deleteMany({ where: { storeId, toNumber: customer.phone } });
      counts.sentSms = r.count;
    }

    // 7. Inbound mails from this customer
    if (email) {
      // L'expéditeur est parfois au format « Nom <adresse> ».
      const r = await prisma.mailQueue.deleteMany({
        where: { storeId, OR: [{ fromAddr: sameEmail }, { fromAddr: { endsWith: `<${email}>`, mode: 'insensitive' } }] },
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
