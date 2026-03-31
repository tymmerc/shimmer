/**
 * Analytics routes — GET /api/analytics/search
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import { getPrisma } from '@shimmer/core';

export const analyticsRouter = Router();

// GET /api/analytics/search — search analytics for the store
analyticsRouter.get('/search', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const prisma = getPrisma();
    const storeId = req.storeId!;
    const days = Number(req.query.days) || 7;

    const since = new Date();
    since.setDate(since.getDate() - days);

    const [totalSearches, byType, byStage, topQueries, conversionRate] = await Promise.all([
      prisma.searchSession.count({
        where: { storeId, createdAt: { gte: since } },
      }),

      prisma.searchSession.groupBy({
        by: ['searchType'],
        where: { storeId, createdAt: { gte: since } },
        _count: true,
      }),

      prisma.searchSession.groupBy({
        by: ['stageUsed'],
        where: { storeId, createdAt: { gte: since } },
        _count: true,
      }),

      prisma.searchSession.groupBy({
        by: ['query'],
        where: { storeId, createdAt: { gte: since } },
        _count: true,
        orderBy: { _count: { query: 'desc' } },
        take: 20,
      }),

      prisma.searchSession.count({
        where: { storeId, createdAt: { gte: since }, converted: true },
      }),
    ]);

    res.json({
      period: { days, since: since.toISOString() },
      totalSearches,
      conversionRate: totalSearches > 0 ? conversionRate / totalSearches : 0,
      byType: byType.map((t) => ({ type: t.searchType, count: t._count })),
      byStage: byStage.map((s) => ({ stage: s.stageUsed, count: s._count })),
      topQueries: topQueries.map((q) => ({ query: q.query, count: q._count })),
    });
  } catch (err) {
    next(err);
  }
});
