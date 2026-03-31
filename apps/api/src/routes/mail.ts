/**
 * Mail routes — classify, draft, queue management with human validation.
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { getPrisma, logger } from '@shimmer/core';
import { classifyEmail, generateDraft, processEmail } from '@shimmer/mail-engine';

const classifySchema = z.object({
  fromAddr: z.string().email().max(255),
  subject: z.string().min(1).max(500),
  body: z.string().min(1).max(10000),
  externalId: z.string().max(200).optional(),
});

const draftSchema = z.object({
  mailId: z.number().int().positive(),
});

export const mailRouter = Router();

// POST /api/mail/classify — Full pipeline: classify + draft + queue
mailRouter.post('/classify', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = classifySchema.parse(req.body);
    const result = await processEmail(
      req.storeId!,
      body.fromAddr,
      body.subject,
      body.body,
      body.externalId,
    );
    res.json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    next(err);
  }
});

// POST /api/mail/draft — Regenerate draft for an existing mail
mailRouter.post('/draft', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { mailId } = draftSchema.parse(req.body);
    const prisma = getPrisma();

    const mail = await prisma.mailQueue.findFirst({
      where: { id: mailId, storeId: req.storeId! },
    });

    if (!mail) {
      res.status(404).json({ error: 'Mail not found' });
      return;
    }

    const classification = await classifyEmail(mail.fromAddr, mail.subject, mail.body);
    const draft = await generateDraft(mail.fromAddr, mail.subject, mail.body, classification);

    await prisma.mailQueue.update({
      where: { id: mailId },
      data: { draftResponse: draft.draft },
    });

    res.json({ mailId, draft: draft.draft, tone: draft.tone, suggestedActions: draft.suggestedActions });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    next(err);
  }
});

// GET /api/mail/queue — List pending mails
mailRouter.get('/queue', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const prisma = getPrisma();
    const status = (req.query.status as string)?.toUpperCase() || undefined;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    const where: Record<string, unknown> = { storeId: req.storeId! };
    if (status && ['PENDING', 'APPROVED', 'REJECTED', 'SENT'].includes(status)) {
      where.status = status;
    }

    const [mails, total] = await Promise.all([
      prisma.mailQueue.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        select: {
          id: true,
          fromAddr: true,
          subject: true,
          category: true,
          urgency: true,
          sentiment: true,
          confidence: true,
          status: true,
          extractedData: true,
          draftResponse: true,
          processedAt: true,
          createdAt: true,
        },
      }),
      prisma.mailQueue.count({ where }),
    ]);

    res.json({ mails, total, limit, offset });
  } catch (err) {
    next(err);
  }
});

// POST /api/mail/approve/:id — Approve a mail draft
mailRouter.post('/approve/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }

    const prisma = getPrisma();
    const mail = await prisma.mailQueue.findFirst({
      where: { id, storeId: req.storeId!, status: 'PENDING' },
    });

    if (!mail) {
      res.status(404).json({ error: 'Mail not found or already processed' });
      return;
    }

    const updated = await prisma.mailQueue.update({
      where: { id },
      data: { status: 'APPROVED' },
    });

    logger.info({ mailId: id, storeId: req.storeId }, 'mail.approved');
    res.json({ id: updated.id, status: updated.status });
  } catch (err) {
    next(err);
  }
});

// POST /api/mail/reject/:id — Reject a mail draft
mailRouter.post('/reject/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }

    const prisma = getPrisma();
    const mail = await prisma.mailQueue.findFirst({
      where: { id, storeId: req.storeId!, status: 'PENDING' },
    });

    if (!mail) {
      res.status(404).json({ error: 'Mail not found or already processed' });
      return;
    }

    const updated = await prisma.mailQueue.update({
      where: { id },
      data: { status: 'REJECTED' },
    });

    logger.info({ mailId: id, storeId: req.storeId }, 'mail.rejected');
    res.json({ id: updated.id, status: updated.status });
  } catch (err) {
    next(err);
  }
});

// GET /api/mail/:id — Get a single mail detail
mailRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }

    const prisma = getPrisma();
    const mail = await prisma.mailQueue.findFirst({
      where: { id, storeId: req.storeId! },
    });

    if (!mail) {
      res.status(404).json({ error: 'Mail not found' });
      return;
    }

    res.json(mail);
  } catch (err) {
    next(err);
  }
});
