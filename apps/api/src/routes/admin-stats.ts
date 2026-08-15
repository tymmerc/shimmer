/**
 * Admin stats — heavy aggregated metrics for the merchant dashboard.
 * One endpoint returns ALL the numbers needed to fill the overview screen.
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import { getPrisma } from '@shimmer/core';
import { getQueueHealth } from '../lib/automations/queue.js';
import { buildReadinessReport } from '../lib/config-check.js';

export const adminStatsRouter = Router();

interface DailyPoint {
  date: string;
  count: number;
  revenueEUR?: number;
}

function lastNDays(n: number): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    d.setUTCDate(d.getUTCDate() - i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

// ─────────────────────────────────────────────────────────────
// GET /api/admin-stats/summary — full snapshot for dashboard
// ─────────────────────────────────────────────────────────────
adminStatsRouter.get('/summary', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const storeId = req.storeId!;
    const prisma = getPrisma();
    const now = new Date();
    const m30 = new Date(now.getTime() - 30 * 86400 * 1000);
    const m7 = new Date(now.getTime() - 7 * 86400 * 1000);
    const m1 = new Date(now.getTime() - 86400 * 1000);
    const prevPeriodStart = new Date(now.getTime() - 60 * 86400 * 1000);
    const prevPeriodEnd = m30;

    // Customers
    const totalCustomers = await prisma.customer.count({ where: { storeId } });
    const newCustomers30d = await prisma.customer.count({
      where: { storeId, createdAt: { gte: m30 } },
    });

    // Orders — current 30d
    const ordersCurrent = await prisma.order.findMany({
      where: { storeId, orderedAt: { gte: m30 } },
      select: { id: true, totalAmount: true, status: true, orderedAt: true, deliveredAt: true },
    });
    const ordersPrev = await prisma.order.findMany({
      where: { storeId, orderedAt: { gte: prevPeriodStart, lt: prevPeriodEnd } },
      select: { totalAmount: true },
    });
    const totalRevenueCurrent = ordersCurrent.reduce((s, o) => s + Number(o.totalAmount), 0);
    const totalRevenuePrev = ordersPrev.reduce((s, o) => s + Number(o.totalAmount), 0);
    const avgOrderCurrent = ordersCurrent.length ? totalRevenueCurrent / ordersCurrent.length : 0;
    const avgOrderPrev = ordersPrev.length ? totalRevenuePrev / ordersPrev.length : 0;
    const deliveredCount = ordersCurrent.filter(o => o.status === 'delivered').length;
    const inTransitCount = ordersCurrent.filter(o => o.status === 'shipped' || o.status === 'in_transit').length;
    const pendingCount = ordersCurrent.filter(o => o.status === 'pending' || o.status === 'confirmed' || o.status === 'prepared').length;
    const cancelledCount = ordersCurrent.filter(o => o.status === 'cancelled').length;

    // Cross-sell events / attribution (current 30d AND previous 30d for deltas)
    const [xsImpressions, xsClicks, xsAdds, xsImpressionsPrev, xsClicksPrev, xsAddsPrev] = await Promise.all([
      prisma.crossSellEvent.count({ where: { storeId, eventType: 'impression', createdAt: { gte: m30 } } }),
      prisma.crossSellEvent.count({ where: { storeId, eventType: 'click', createdAt: { gte: m30 } } }),
      prisma.crossSellEvent.count({ where: { storeId, eventType: 'add', createdAt: { gte: m30 } } }),
      prisma.crossSellEvent.count({ where: { storeId, eventType: 'impression', createdAt: { gte: prevPeriodStart, lt: prevPeriodEnd } } }),
      prisma.crossSellEvent.count({ where: { storeId, eventType: 'click', createdAt: { gte: prevPeriodStart, lt: prevPeriodEnd } } }),
      prisma.crossSellEvent.count({ where: { storeId, eventType: 'add', createdAt: { gte: prevPeriodStart, lt: prevPeriodEnd } } }),
    ]);
    const xsTakeRate = xsImpressions > 0 ? (xsClicks / xsImpressions) * 100 : 0;
    const xsTakeRatePrev = xsImpressionsPrev > 0 ? (xsClicksPrev / xsImpressionsPrev) * 100 : 0;

    // Carts (current + previous)
    const cartsAll = await prisma.abandonedCart.findMany({
      where: { storeId, abandonedAt: { gte: m30 } },
      select: { status: true, totalAmount: true, recoveredAmount: true, recoveredAt: true, reminder1At: true, reminder2At: true },
    });
    const cartsPrev = await prisma.abandonedCart.findMany({
      where: { storeId, abandonedAt: { gte: prevPeriodStart, lt: prevPeriodEnd } },
      select: { recoveredAt: true, recoveredAmount: true, totalAmount: true },
    });
    const recoveredCount = cartsAll.filter(c => c.recoveredAt).length;
    const recoveredCountPrev = cartsPrev.filter(c => c.recoveredAt).length;
    const recoveredAmount = cartsAll.reduce((s, c) => s + Number(c.recoveredAmount ?? 0), 0);
    const recoveredAmountPrev = cartsPrev.reduce((s, c) => s + Number(c.recoveredAmount ?? 0), 0);
    const totalAbandoned = cartsAll.reduce((s, c) => s + Number(c.totalAmount), 0);
    const cartRecoveryRate = cartsAll.length ? (recoveredCount / cartsAll.length) * 100 : 0;

    // SAV (current + previous)
    const savAll = await prisma.savRequest.findMany({
      where: { storeId, createdAt: { gte: m30 } },
      select: { status: true, createdAt: true, resolvedAt: true, type: true },
    });
    const savPrevCount = await prisma.savRequest.count({
      where: { storeId, createdAt: { gte: prevPeriodStart, lt: prevPeriodEnd } },
    });
    const savResolvedPrev = await prisma.savRequest.count({
      where: { storeId, status: 'resolved', createdAt: { gte: prevPeriodStart, lt: prevPeriodEnd } },
    });
    const savOpen = savAll.filter(t => ['open', 'in_progress', 'awaiting_customer', 'escalated'].includes(t.status)).length;
    const savResolved = savAll.filter(t => t.status === 'resolved').length;
    const savAvgHours = (() => {
      const closed = savAll.filter(t => t.resolvedAt);
      if (closed.length === 0) return 0;
      const sum = closed.reduce((s, t) => s + (t.resolvedAt!.getTime() - t.createdAt.getTime()), 0);
      return Math.round(sum / closed.length / 3600000);
    })();
    const savByType: Record<string, number> = {};
    for (const t of savAll) savByType[t.type] = (savByType[t.type] ?? 0) + 1;

    // Reviews — current + previous
    const [reviewsCount, reviewsCountPrev, reviewsAvg, lowRatingCount] = await Promise.all([
      prisma.review.count({ where: { storeId, createdAt: { gte: m30 } } }),
      prisma.review.count({ where: { storeId, createdAt: { gte: prevPeriodStart, lt: prevPeriodEnd } } }),
      prisma.review.aggregate({ where: { storeId, createdAt: { gte: m30 } }, _avg: { overallRating: true } }),
      prisma.review.count({ where: { storeId, overallRating: { lte: 2 }, createdAt: { gte: m30 } } }),
    ]);

    // Outbound
    const obAll = await prisma.outboundCampaign.findMany({
      where: { storeId, createdAt: { gte: m30 } },
      select: { format: true, status: true },
    });
    const obByFormat: Record<string, number> = {};
    const obByStatus: Record<string, number> = {};
    for (const c of obAll) {
      obByFormat[c.format] = (obByFormat[c.format] ?? 0) + 1;
      obByStatus[c.status] = (obByStatus[c.status] ?? 0) + 1;
    }

    // Emails (current + previous)
    const emailsAll = await prisma.sentEmail.findMany({
      where: { storeId, createdAt: { gte: m30 } },
      select: { status: true, tag: true, provider: true, createdAt: true },
    });
    const emailsSentPrev = await prisma.sentEmail.count({
      where: { storeId, status: 'sent', createdAt: { gte: prevPeriodStart, lt: prevPeriodEnd } },
    });
    const emailsSent = emailsAll.filter(e => e.status === 'sent').length;
    const emailsFailed = emailsAll.filter(e => e.status === 'failed').length;

    // Customers (previous-period new count for delta)
    const newCustomersPrev = await prisma.customer.count({
      where: { storeId, createdAt: { gte: prevPeriodStart, lt: prevPeriodEnd } },
    });

    // Orders previous
    const ordersPrevCount = ordersPrev.length;

    // Delta helper
    const pctDelta = (curr: number, prev: number): number => {
      if (prev === 0) return curr > 0 ? 100 : 0;
      return Math.round(((curr - prev) / prev) * 1000) / 10;
    };
    const emailsByTag: Record<string, number> = {};
    for (const e of emailsAll) {
      const t = e.tag ?? 'autres';
      emailsByTag[t] = (emailsByTag[t] ?? 0) + 1;
    }

    // Daily series — orders/revenue for last 14 days
    const days = lastNDays(14);
    const dailyOrders: DailyPoint[] = days.map(d => ({ date: d, count: 0, revenueEUR: 0 }));
    for (const o of ordersCurrent) {
      const k = o.orderedAt.toISOString().slice(0, 10);
      const point = dailyOrders.find(p => p.date === k);
      if (point) {
        point.count += 1;
        point.revenueEUR = (point.revenueEUR ?? 0) + Number(o.totalAmount);
      }
    }

    // Daily series — emails for last 14 days
    const dailyEmails: DailyPoint[] = days.map(d => ({ date: d, count: 0 }));
    for (const e of emailsAll) {
      const k = e.createdAt.toISOString().slice(0, 10);
      const point = dailyEmails.find(p => p.date === k);
      if (point) point.count += 1;
    }

    // Daily series — cross-sell impressions
    const xsByDay = await prisma.$queryRaw<Array<{ d: string; n: bigint }>>`
      SELECT date_trunc('day', created_at)::date::text AS d, COUNT(*)::bigint AS n
      FROM cross_sell_events
      WHERE store_id = ${storeId} AND created_at >= ${m30}
      GROUP BY 1
      ORDER BY 1`;
    const dailyImpressions = days.map(d => ({
      date: d,
      count: Number(xsByDay.find(x => x.d === d)?.n ?? 0),
    }));

    // ROI computed estimates (mocked but coherent): 8% of cross-sell adds become orders, AOV 30€
    const estimatedXSRevenue = Math.round(xsAdds * 0.08 * 30);

    res.json({
      period: { from: m30.toISOString(), to: now.toISOString() },
      revenue: {
        total30d: Math.round(totalRevenueCurrent),
        previous30d: Math.round(totalRevenuePrev),
        delta: Math.round(totalRevenueCurrent - totalRevenuePrev),
        deltaPct: totalRevenuePrev ? Math.round(((totalRevenueCurrent - totalRevenuePrev) / totalRevenuePrev) * 1000) / 10 : 0,
        avgOrder: Math.round(avgOrderCurrent * 100) / 100,
        avgOrderPrev: Math.round(avgOrderPrev * 100) / 100,
      },
      customers: {
        total: totalCustomers,
        new30d: newCustomers30d,
        newDeltaPct: pctDelta(newCustomers30d, newCustomersPrev),
      },
      orders: {
        total30d: ordersCurrent.length,
        delivered: deliveredCount,
        inTransit: inTransitCount,
        pending: pendingCount,
        cancelled: cancelledCount,
        deltaPct: pctDelta(ordersCurrent.length, ordersPrevCount),
      },
      crossSell: {
        impressions30d: xsImpressions,
        impressionsDeltaPct: pctDelta(xsImpressions, xsImpressionsPrev),
        clicks30d: xsClicks,
        clicksDeltaPct: pctDelta(xsClicks, xsClicksPrev),
        adds30d: xsAdds,
        addsDeltaPct: pctDelta(xsAdds, xsAddsPrev),
        takeRatePct: Math.round(xsTakeRate * 10) / 10,
        takeRateDeltaPct: Math.round((xsTakeRate - xsTakeRatePrev) * 10) / 10,
        estimatedRevenueEUR: estimatedXSRevenue,
      },
      carts: {
        total30d: cartsAll.length,
        totalDeltaPct: pctDelta(cartsAll.length, cartsPrev.length),
        recovered: recoveredCount,
        recoveredDeltaPct: pctDelta(recoveredCount, recoveredCountPrev),
        recoveryRatePct: Math.round(cartRecoveryRate * 10) / 10,
        abandonedEUR: Math.round(totalAbandoned),
        recoveredEUR: Math.round(recoveredAmount),
        recoveredEURDeltaPct: pctDelta(recoveredAmount, recoveredAmountPrev),
      },
      sav: {
        total30d: savAll.length,
        totalDeltaPct: pctDelta(savAll.length, savPrevCount),
        open: savOpen,
        resolved: savResolved,
        resolvedDeltaPct: pctDelta(savResolved, savResolvedPrev),
        avgResolutionHours: savAvgHours,
        byType: savByType,
      },
      reviews: {
        total30d: reviewsCount,
        totalDeltaPct: pctDelta(reviewsCount, reviewsCountPrev),
        avgRating: Math.round(((reviewsAvg._avg?.overallRating ?? 0) as number) * 10) / 10,
        lowRatings: lowRatingCount,
      },
      outbound: {
        total30d: obAll.length,
        byFormat: obByFormat,
        byStatus: obByStatus,
      },
      emails: {
        total30d: emailsAll.length,
        sent: emailsSent,
        failed: emailsFailed,
        byTag: emailsByTag,
      },
      series: {
        days,
        orders: dailyOrders.map(p => p.count),
        revenue: dailyOrders.map(p => Math.round(p.revenueEUR ?? 0)),
        emails: dailyEmails.map(p => p.count),
        impressions: dailyImpressions.map(p => p.count),
      },
    });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/admin-stats/queues — automation queue health + recent failures
// Lets the operator answer "did the cart reminders / review requests actually
// run, and if not, why?". Failed jobs are retained for 7 days (dead-letter).
// ─────────────────────────────────────────────────────────────
adminStatsRouter.get('/queues', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const health = await getQueueHealth(25);
    res.json(health);
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/admin-stats/readiness — which integrations are real vs mock
// ─────────────────────────────────────────────────────────────
adminStatsRouter.get('/readiness', (_req: Request, res: Response) => {
  res.json(buildReadinessReport());
});
