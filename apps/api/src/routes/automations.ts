/**
 * Automation control endpoints (merchant-facing).
 *
 *  GET  /api/automations/status — last tick report + counts to surface in dash.
 *  POST /api/automations/run    — trigger an immediate tick (admin only).
 *
 * The scheduler itself runs unconditionally from workers/index.ts; these
 * endpoints exist so merchants can prove automations fired and re-run on
 * demand if needed.
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import { getPrisma } from '@shimmer/core';
import { runAutomationTick, getLastReport, setLastReport } from '../lib/automations/tick.js';

export const automationsRouter = Router();

automationsRouter.get('/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const storeId = req.storeId!;
    const prisma = getPrisma();
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [pendingCarts1, pendingCarts2, dueReviews, openSav, scheduledOutbound] = await Promise.all([
      prisma.abandonedCart.count({
        where: {
          storeId,
          reminder1At: null,
          recoveredAt: null,
          abandonedAt: { lte: new Date(now.getTime() - 60 * 60 * 1000) },
          status: { in: ['pending', 'abandoned'] },
        },
      }),
      prisma.abandonedCart.count({
        where: {
          storeId,
          reminder1At: { not: null },
          reminder2At: null,
          recoveredAt: null,
          abandonedAt: { lte: oneDayAgo },
        },
      }),
      prisma.reviewRequest.count({
        where: { storeId, status: 'SCHEDULED', scheduledAt: { lte: now }, sentAt: null },
      }),
      prisma.savRequest.count({
        where: { storeId, status: 'open', createdAt: { lte: oneDayAgo } },
      }),
      prisma.outboundCampaign.count({
        where: { storeId, status: 'scheduled', scheduledAt: { lte: now } },
      }),
    ]);

    res.json({
      pending: {
        cartReminders1: pendingCarts1,
        cartReminders2: pendingCarts2,
        reviewRequests: dueReviews,
        savToEscalate: openSav,
        outboundToPublish: scheduledOutbound,
      },
      lastReport: getLastReport(),
    });
  } catch (err) {
    next(err);
  }
});

automationsRouter.post('/run', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const report = await runAutomationTick();
    setLastReport(report);
    res.json({ report });
  } catch (err) {
    next(err);
  }
});
