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

    // Toutes les comparaisons d'e-mail : lower(x) = lower(y) en SQL, exactes.
    // Pas d'ILIKE : un « _ » dans l'adresse effaçait aussi john.doe@ en
    // effaçant john_doe@ (relecture du 30/09).
    const wanted = body.email?.trim().toLowerCase() ?? '';
    const found = body.customerId
      ? { id: body.customerId }
      : (await prisma.$queryRaw<Array<{ id: number }>>`
          SELECT id FROM customers WHERE store_id = ${storeId} AND lower(email) = ${wanted} ORDER BY id LIMIT 1`)[0];
    const fullCustomer = found ? await prisma.customer.findFirst({ where: { id: found.id, storeId } }) : null;

    if (!fullCustomer && !wanted) {
      throw new ShimmerError('Customer not found', 'NOT_FOUND', 404);
    }
    const email = (fullCustomer?.email ?? wanted).trim().toLowerCase();

    const counts = {
      chatSessions: 0,
      searchSessions: 0,
      stockAlerts: 0,
      sentSms: 0,
      knowledgeChunksFromReviews: 0,
      savRequests: 0,
      reviewRequests: 0,
      reviews: 0,
      orders: 0,
      abandonedCarts: 0,
      mailQueue: 0,
      sentEmails: 0,
    };

    // 1. Conversations : par e-mail, e-mail cité dans la transcription
    // (position(), pas de joker), ou rattachées à une commande du client
    // (attribution par identifiant visiteur). Leurs recherches partent avec.
    const orderIds = fullCustomer
      ? (await prisma.order.findMany({ where: { storeId, customerId: fullCustomer.id }, select: { id: true } })).map((o) => o.id)
      : [];
    const sessions = email
      ? await prisma.$queryRaw<Array<{ id: number; session_token: string }>>`
          SELECT id, session_token FROM chat_sessions
          WHERE store_id = ${storeId}
            AND (lower(customer_email) = ${email}
              OR position(${email} in lower(messages::text)) > 0
              OR attributed_order_id = ANY(${orderIds}::int[]))`
      : [];
    if (sessions.length > 0) {
      const searches = await prisma.searchSession.deleteMany({
        where: { storeId, sessionToken: { in: sessions.map((x) => x.session_token) } },
      });
      counts.searchSessions = searches.count;
      const chats = await prisma.chatSession.deleteMany({ where: { storeId, id: { in: sessions.map((x) => x.id) } } });
      counts.chatSessions = chats.count;
    }

    // 2. Ce qui tient à l'e-mail, avec ou sans fiche client.
    if (email) {
      counts.stockAlerts = await prisma.$executeRaw`
        DELETE FROM stock_alerts WHERE store_id = ${storeId} AND lower(email) = ${email}`;
      counts.sentEmails = await prisma.$executeRaw`
        DELETE FROM sent_emails WHERE store_id = ${storeId} AND lower(to_addr) = ${email}`;
      // L'expéditeur est parfois au format « Nom <adresse> ».
      counts.mailQueue = await prisma.$executeRaw`
        DELETE FROM mail_queue WHERE store_id = ${storeId}
          AND (lower(from_addr) = ${email} OR right(lower(from_addr), ${email.length + 2}) = ${`<${email}>`})`;
    }
    counts.abandonedCarts = await prisma.$executeRaw`
      DELETE FROM abandoned_carts WHERE store_id = ${storeId}
        AND (lower(customer_email) = ${email} OR customer_id = ${fullCustomer?.id ?? -1})`;

    if (!fullCustomer) {
      // Pas de fiche client : rien d'autre ne peut lui être rattaché.
      logger.info({ storeId, customerId: null, counts }, 'rgpd.erasure.complete');
      res.json({ ok: true, customerId: null, email, partial: true, deleted: counts,
        note: 'Aucune fiche client pour cet e-mail : seules les données liées à l\'adresse ont été effacées.' });
      return;
    }

    // 3. Extraits de connaissance tirés des avis du client.
    const customerReviewIds = (
      await prisma.review.findMany({ where: { storeId, customerId: fullCustomer.id }, select: { id: true } })
    ).map(r => r.id);
    if (customerReviewIds.length > 0) {
      const r = await prisma.knowledgeChunk.deleteMany({
        where: { storeId, sourceType: 'review', sourceId: { in: customerReviewIds } },
      });
      counts.knowledgeChunksFromReviews = r.count;
    }

    // 4. Avis, demandes d'avis, SAV.
    counts.reviews = (await prisma.review.deleteMany({ where: { storeId, customerId: fullCustomer.id } })).count;
    counts.reviewRequests = (await prisma.reviewRequest.deleteMany({ where: { storeId, customerId: fullCustomer.id } })).count;
    counts.savRequests = (await prisma.savRequest.deleteMany({ where: { storeId, customerId: fullCustomer.id } })).count;

    // Le vendeur cite des questions tirées des tickets et des avis (relecture de
    // nuit, lib/knowledge-ingest.ts) : retrait immédiat, reconstruites sans ce client.
    if (counts.savRequests > 0 || counts.reviews > 0) {
      await prisma.knowledgeChunk.deleteMany({ where: { storeId, sourceType: 'sav_objection' } });
      await patchStoreConfig(prisma, storeId, {}, ['common_objections', 'knowledge_attempted_at', 'knowledge_ingested_at']);
    }

    // 5. SMS : comparés sur les 9 derniers chiffres (+33 6…, 06…, espaces).
    const digits = (fullCustomer.phone ?? '').replace(/\D/g, '').slice(-9);
    if (digits.length === 9) {
      counts.sentSms = await prisma.$executeRaw`
        DELETE FROM sent_sms WHERE store_id = ${storeId}
          AND right(regexp_replace(to_number, '[^0-9]', '', 'g'), 9) = ${digits}`;
    }

    // 6. Commandes (lignes et colis suivent en cascade), puis la fiche client.
    counts.orders = (await prisma.order.deleteMany({ where: { storeId, customerId: fullCustomer.id } })).count;
    await prisma.customer.delete({ where: { id: fullCustomer.id } });

    logger.info({ storeId, customerId: fullCustomer.id, counts }, 'rgpd.erasure.complete');
    res.json({
      ok: true,
      customerId: fullCustomer.id,
      email,
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
