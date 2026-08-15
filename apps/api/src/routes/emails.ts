/**
 * Emails routes — read-only view on what Shimmer has sent (or mocked) for the store.
 * Useful for the merchant dashboard and the public demo "Boîte d'envoi".
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import { getPrisma, ShimmerError } from '@shimmer/core';

export const emailsRouter = Router();

emailsRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const storeId = req.storeId!;
    const tag = typeof req.query.tag === 'string' ? req.query.tag : undefined;
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const prisma = getPrisma();
    const emails = await prisma.sentEmail.findMany({
      where: { storeId, ...(tag ? { tag } : {}) },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    res.json({ emails });
  } catch (err) {
    next(err);
  }
});

emailsRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const storeId = req.storeId!;
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new ShimmerError('Invalid id', 'BAD_REQUEST', 400);
    }
    const prisma = getPrisma();
    const email = await prisma.sentEmail.findFirst({ where: { id, storeId } });
    if (!email) throw new ShimmerError('Email not found', 'NOT_FOUND', 404);
    res.json({ email });
  } catch (err) {
    next(err);
  }
});

emailsRouter.get('/stats/summary', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const storeId = req.storeId!;
    const prisma = getPrisma();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400 * 1000);
    const [total, mockSent, realSent, failed, byTag] = await Promise.all([
      prisma.sentEmail.count({ where: { storeId, createdAt: { gte: thirtyDaysAgo } } }),
      prisma.sentEmail.count({ where: { storeId, provider: 'mock', createdAt: { gte: thirtyDaysAgo } } }),
      prisma.sentEmail.count({ where: { storeId, provider: 'mailgun', status: 'sent', createdAt: { gte: thirtyDaysAgo } } }),
      prisma.sentEmail.count({ where: { storeId, status: 'failed', createdAt: { gte: thirtyDaysAgo } } }),
      prisma.sentEmail.groupBy({
        by: ['tag'],
        where: { storeId, createdAt: { gte: thirtyDaysAgo } },
        _count: { _all: true },
      }),
    ]);
    res.json({
      total,
      mockSent,
      realSent,
      failed,
      byTag: Object.fromEntries(byTag.map(b => [b.tag ?? 'untagged', b._count._all])),
    });
  } catch (err) {
    next(err);
  }
});
