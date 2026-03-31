/**
 * Chat analytics routes — GET /api/analytics/chat
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import { getPrisma } from '@shimmer/core';

export const chatAnalyticsRouter = Router();

// GET /api/analytics/chat
chatAnalyticsRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const prisma = getPrisma();
    const storeId = req.storeId!;
    const days = Number(req.query.days) || 7;

    const since = new Date();
    since.setDate(since.getDate() - days);

    const [totalSessions, byStatus, escalatedCount, resolvedCount, avgMessages] = await Promise.all([
      prisma.chatSession.count({
        where: { storeId, createdAt: { gte: since } },
      }),

      prisma.chatSession.groupBy({
        by: ['status'],
        where: { storeId, createdAt: { gte: since } },
        _count: true,
      }),

      prisma.chatSession.count({
        where: { storeId, createdAt: { gte: since }, escalated: true },
      }),

      prisma.chatSession.count({
        where: { storeId, createdAt: { gte: since }, status: 'RESOLVED' },
      }),

      // Average messages per session (approximation via raw query)
      prisma.chatSession.findMany({
        where: { storeId, createdAt: { gte: since } },
        select: { messages: true },
        take: 100,
      }),
    ]);

    const msgCounts = avgMessages.map((s) => {
      const msgs = s.messages as unknown[];
      return Array.isArray(msgs) ? msgs.length : 0;
    });
    const avgMsgCount = msgCounts.length > 0
      ? msgCounts.reduce((a, b) => a + b, 0) / msgCounts.length
      : 0;

    res.json({
      period: { days, since: since.toISOString() },
      totalSessions,
      escalationRate: totalSessions > 0 ? escalatedCount / totalSessions : 0,
      resolutionRate: totalSessions > 0 ? resolvedCount / totalSessions : 0,
      averageMessagesPerSession: Math.round(avgMsgCount * 10) / 10,
      byStatus: byStatus.map((s) => ({ status: s.status, count: s._count })),
    });
  } catch (err) {
    next(err);
  }
});
