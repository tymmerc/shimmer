/**
 * Inbound webhooks — Mailgun and a generic JSON variant.
 * Routes incoming mail to the right store, runs classification, queues a draft response.
 *
 * Routing rule: storeId is derived from the recipient address. We expect
 * `store-<id>@<domain>` (or a configured alias mapped via store.config.inboundAlias).
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import express from 'express';
import { z } from 'zod';
import { getPrisma, getRedis, logger, ShimmerError } from '@shimmer/core';
import { processEmail } from '@shimmer/mail-engine';
import { enqueueMailToSav } from '../lib/automations/queue.js';
import { verifyInboundSecret, verifyMailgunSignature, MAILGUN_MAX_SKEW_S } from '../lib/inbound-auth.js';
import { createScopedRateLimiter } from '../middleware/rate-limiter.js';

export const webhooksInboundRouter = Router();

// Chaque e-mail fait tourner l'IA (classement + brouillon) : plafond par IP.
const inboundLimiter = createScopedRateLimiter('inbound-mail', 60_000, 60);

// Mailgun sends form-encoded data; mount with the form parser as fallback to JSON.
const formParser = express.urlencoded({ extended: true, limit: '5mb' });

const genericSchema = z.object({
  from: z.string().min(3).max(255),
  to: z.string().min(3).max(255),
  subject: z.string().min(1).max(500),
  body: z.string().min(1).max(50000),
  messageId: z.string().max(200).optional(),
});

async function resolveStoreFromRecipient(recipient: string): Promise<number | null> {
  const prisma = getPrisma();
  // Try store-<id>@domain
  const match = recipient.match(/store-(\d+)@/i);
  if (match) {
    const id = Number(match[1]);
    const store = await prisma.store.findUnique({ where: { id } });
    if (store) return id;
  }
  // Try alias from store.config.inboundAlias
  const lower = recipient.toLowerCase();
  const stores = await prisma.store.findMany({ select: { id: true, config: true } });
  for (const s of stores) {
    const cfg = (s.config ?? {}) as { inboundAlias?: string };
    if (cfg.inboundAlias && lower.includes(cfg.inboundAlias.toLowerCase())) return s.id;
  }
  return null;
}

async function handleIncoming(
  from: string,
  to: string,
  subject: string,
  body: string,
  messageId: string | undefined,
  res: Response,
): Promise<void> {
  const storeId = await resolveStoreFromRecipient(to);
  if (!storeId) {
    logger.warn({ to }, 'inbound.webhook.unknown_recipient');
    res.status(200).json({ accepted: false, reason: 'unknown_recipient' });
    return;
  }

  try {
    const result = await processEmail(storeId, from, subject, body, messageId);
    if (result.id) {
      try {
        await enqueueMailToSav(result.id);
      } catch (err) {
        logger.warn({ err, mailId: result.id }, 'inbound.webhook.sav-enqueue-failed');
      }
    }
    logger.info({ storeId, mailId: result.id, category: result.category }, 'inbound.webhook.processed');
    res.json({ accepted: true });
  } catch (err) {
    logger.warn({ err, storeId }, 'inbound.webhook.processing_failed');
    res.status(500).json({ accepted: false });
  }
}

// ─────────────────────────────────────────────────────────────
// POST /api/webhooks/inbound — generic JSON ingest (testable from curl)
// ─────────────────────────────────────────────────────────────
webhooksInboundRouter.post('/inbound', inboundLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!verifyInboundSecret(process.env.INBOUND_WEBHOOK_SECRET, req.headers['x-shimmer-inbound-secret'])) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    const body = genericSchema.parse(req.body);
    await handleIncoming(body.from, body.to, body.subject, body.body, body.messageId, res);
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/webhooks/mailgun/inbound — Mailgun forward route
// ─────────────────────────────────────────────────────────────
webhooksInboundRouter.post(
  '/mailgun/inbound',
  inboundLimiter,
  formParser,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!verifyMailgunSignature(process.env.MAILGUN_WEBHOOK_SIGNING_KEY, req.body ?? {})) {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }
      const from = (req.body.sender ?? req.body.From ?? req.body.from) as string | undefined;
      const to = (req.body.recipient ?? req.body.To ?? req.body.to) as string | undefined;
      const subject = (req.body.subject ?? req.body.Subject) as string | undefined;
      const body =
        (req.body['body-plain'] as string | undefined) ??
        (req.body['stripped-text'] as string | undefined) ??
        (req.body['body-html'] as string | undefined);
      const messageId = req.body['Message-Id'] as string | undefined;

      if (!from || !to || !subject || !body) {
        throw new ShimmerError('Missing mailgun fields', 'BAD_REQUEST', 400);
      }
      // Jeton à usage unique : une requête signée rejouée est refusée.
      const fresh = await getRedis().set(`mailgun:token:${String(req.body.token)}`, '1', 'EX', MAILGUN_MAX_SKEW_S * 2, 'NX');
      if (fresh !== 'OK') {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }
      await handleIncoming(from, to, subject, body, messageId, res);
    } catch (err) {
      next(err);
    }
  },
);
