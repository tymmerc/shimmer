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
import { getPrisma, logger, ShimmerError } from '@shimmer/core';
import { processEmail } from '@shimmer/mail-engine';
import { enqueueMailToSav } from '../lib/automations/queue.js';

export const webhooksInboundRouter = Router();

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
    res.json({ accepted: true, storeId, mail: result });
  } catch (err) {
    logger.warn({ err, storeId }, 'inbound.webhook.processing_failed');
    res.status(500).json({ accepted: false, error: (err as Error).message });
  }
}

// ─────────────────────────────────────────────────────────────
// POST /api/webhooks/inbound — generic JSON ingest (testable from curl)
// ─────────────────────────────────────────────────────────────
webhooksInboundRouter.post('/inbound', async (req: Request, res: Response, next: NextFunction) => {
  try {
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
  formParser,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
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
      await handleIncoming(from, to, subject, body, messageId, res);
    } catch (err) {
      next(err);
    }
  },
);
