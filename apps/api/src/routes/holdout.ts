/**
 * Holdout experiment endpoints.
 *
 *  Public (SDK, no auth, store resolved by ?store= or public key):
 *    GET  /api/holdout/decision  — is this visitor control? + holdout pct
 *    POST /api/holdout/track     — record a visitor as seen / exposed
 *
 *  Auth (merchant dashboard + billing):
 *    GET  /api/holdout/report    — incremental lift, credible interval,
 *                                  significance, billable incremental, fee state
 *
 * Order outcomes are linked to visitors by recordOrderForVisitor(), called
 * from the order webhooks when the cart carried a shimmer visitor id.
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { getPrisma, logger } from '@shimmer/core';
import { authMiddleware } from '../middleware/auth.js';
import { bucketFor, isControl, resolveHoldoutConfig } from '../lib/holdout/bucket.js';
import { estimateLift } from '../lib/holdout/lift.js';
import { billingSummary, cartRecoveryProof, vendorProof, type ProofVisitorRow } from '../lib/holdout/proof.js';
import { restockProof, type StockAlertRow } from '../lib/stock-alerts.js';

export const holdoutRouter = Router();

async function getStoreConfig(storeId: number): Promise<Record<string, unknown>> {
  const prisma = getPrisma();
  const store = await prisma.store.findUnique({ where: { id: storeId } });
  return (store?.config ?? {}) as Record<string, unknown>;
}

// ── Public: decision ────────────────────────────────────────────
const decisionSchema = z.object({
  visitorId: z.string().min(4).max(80),
  store: z.coerce.number().int().positive(),
});

holdoutRouter.get('/decision', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { visitorId, store } = decisionSchema.parse({ visitorId: req.query.visitorId, store: req.query.store });
    const cfg = resolveHoldoutConfig((await getStoreConfig(store)).holdout);
    const control = isControl(visitorId, store, cfg);
    res.json({
      control,
      showShimmer: !control,
      bucket: bucketFor(visitorId, store),
      holdoutPct: cfg.pct,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    next(err);
  }
});

// ── Public: track a visitor (seen / exposed / enrolled) ─────────
const trackSchema = z.object({
  visitorId: z.string().min(4).max(80),
  store: z.coerce.number().int().positive(),
  exposed: z.boolean().optional(),
  // Enrollment trigger: the visitor met the vendeur surface (e.g. 'search').
  // Sent by the SDK for BOTH groups so the enrolled populations stay comparable.
  trigger: z.enum(['search']).optional(),
});

holdoutRouter.post('/track', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = trackSchema.parse({ ...req.body, store: req.body.store ?? req.query.store });
    const prisma = getPrisma();
    const cfg = resolveHoldoutConfig((await getStoreConfig(body.store)).holdout);
    const bucket = bucketFor(body.visitorId, body.store);
    const control = bucket < cfg.pct;

    await prisma.holdoutVisitor.upsert({
      where: { storeId_visitorId: { storeId: body.store, visitorId: body.visitorId } },
      create: {
        storeId: body.store,
        visitorId: body.visitorId,
        bucket,
        isControl: control,
        exposed: body.exposed ?? !control,
        ...(body.trigger ? { enrolledAt: new Date(), trigger: body.trigger } : {}),
      },
      update: {
        lastSeenAt: new Date(),
        ...(body.exposed ? { exposed: true } : {}),
      },
    });
    // Enrollment is first-trigger-wins: only set it if still null.
    if (body.trigger) {
      await prisma.holdoutVisitor.updateMany({
        where: { storeId: body.store, visitorId: body.visitorId, enrolledAt: null },
        data: { enrolledAt: new Date(), trigger: body.trigger },
      });
    }
    res.json({ ok: true, control });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    next(err);
  }
});

// ── Auth: lift report ────────────────────────────────────────────
holdoutRouter.get('/report', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const storeId = req.storeId!;
    const prisma = getPrisma();
    const storeConfig = await getStoreConfig(storeId);
    const cfg = resolveHoldoutConfig(storeConfig.holdout);

    const visitors = await prisma.holdoutVisitor.findMany({
      where: { storeId },
      select: { isControl: true, revenue: true },
    });

    const control = visitors.filter(v => v.isControl).map(v => Number(v.revenue));
    const treatment = visitors.filter(v => !v.isControl).map(v => Number(v.revenue));

    const lift = estimateLift(control, treatment, cfg.effectThresholdPct);

    // Billing: same per-store config as /proof (capEUR: null = sans plafond,
    // offre beta). A single source of truth so the two pages never disagree.
    const rawBilling = (storeConfig.billing ?? {}) as { floorEUR?: number; ratePct?: number; capEUR?: number | null };
    const FLOOR = rawBilling.floorEUR ?? 89;
    const CAP = rawBilling.capEUR === undefined ? 267 : rawBilling.capEUR;
    const RATE = (rawBilling.ratePct ?? 5) / 100;
    const rawFee = lift.significant ? lift.incrementalRevenueEUR * RATE : 0;
    const variableFee = CAP === null ? rawFee : Math.min(Math.max(0, CAP - FLOOR), rawFee);
    const monthlyTotal = FLOOR + variableFee;

    res.json({
      holdout: { enabled: cfg.enabled, pct: cfg.pct, effectThresholdPct: cfg.effectThresholdPct },
      lift,
      billing: {
        floorEUR: FLOOR,
        capEUR: CAP,
        ratePct: RATE * 100,
        variableActive: lift.significant,
        variableFeeEUR: round2(variableFee),
        monthlyTotalEUR: round2(monthlyTotal),
        status: lift.significant
          ? 'Effet prouvé, part variable active'
          : `Pas encore significatif (P=${(lift.pUpliftAboveThreshold * 100).toFixed(0)}% que l'uplift dépasse ${cfg.effectThresholdPct}%). Forfait fixe uniquement.`,
      },
    });
  } catch (err) {
    next(err);
  }
});

function round2(n: number): number { return Math.round(n * 100) / 100; }

// ── Auth: proof by module ────────────────────────────────────────
// GET /api/holdout/proof?from=2026-07-01&to=2026-08-01
// Per-module incremental evidence + billing over an optional period.
// Without a window: all-time (vendor revenue from the visitor aggregates).
// With a window: revenue re-summed from holdout_orders, so a monthly invoice
// never re-bills the incremental of a previous month.
const proofQuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

holdoutRouter.get('/proof', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const storeId = req.storeId!;
    const prisma = getPrisma();
    const { from, to } = proofQuerySchema.parse(req.query);
    const storeConfig = await getStoreConfig(storeId);
    const cfg = resolveHoldoutConfig(storeConfig.holdout);
    const range = from || to ? { ...(from ? { gte: from } : {}), ...(to ? { lt: to } : {}) } : undefined;

    // ── Vendeur : enrolled visitors only (both groups triggered by a search).
    const enrolled = await prisma.holdoutVisitor.findMany({
      where: { storeId, enrolledAt: range ? { ...range } : { not: null } },
      select: { visitorId: true, isControl: true, revenue: true },
    });
    let vendorRows: ProofVisitorRow[];
    if (range) {
      const orderSums = await prisma.holdoutOrder.groupBy({
        by: ['visitorId'],
        where: { storeId, createdAt: range },
        _sum: { amount: true },
      });
      const sums = new Map(orderSums.map(o => [o.visitorId, Number(o._sum.amount ?? 0)]));
      vendorRows = enrolled.map(v => ({ isControl: v.isControl, revenue: sums.get(v.visitorId) ?? 0 }));
    } else {
      vendorRows = enrolled.map(v => ({ isControl: v.isControl, revenue: Number(v.revenue) }));
    }
    const vendeur = vendorProof(vendorRows, cfg);

    // ── Relances : unit = abandoned cart, deterministic cart bucket.
    const carts = await prisma.abandonedCart.findMany({
      where: { storeId, ...(range ? { abandonedAt: range } : {}) },
      select: {
        id: true, storeId: true, totalAmount: true, recoveredAmount: true,
        recoveredAt: true, reminder1At: true, abandonedAt: true,
      },
    });
    const relances = cartRecoveryProof(carts, cfg);

    // ── Compteurs directs (pas d'expérience nécessaire, comptables un par un).
    const createdRange = range ? { createdAt: range } : {};
    const [savTotal, savResolved, reviewsCollected, reviewsIntercepted, stockAlerts] = await Promise.all([
      prisma.savRequest.count({ where: { storeId, ...createdRange } }),
      prisma.savRequest.count({ where: { storeId, ...createdRange, resolvedAt: { not: null } } }),
      prisma.review.count({ where: { storeId, ...createdRange } }),
      prisma.review.count({ where: { storeId, ...createdRange, savTriggered: true } }),
      // Retour de stock : fenêtré sur la date de conversion (c'est elle qui se facture).
      prisma.stockAlert.findMany({ where: { storeId, ...(range ? { OR: [{ convertedAt: range }, { convertedAt: null }] } : {}) } }),
    ]);
    const retourStock = restockProof(stockAlerts as unknown as StockAlertRow[]);

    // ── Facturation : config par store (capEUR: null = sans plafond, offre beta).
    const rawBilling = (storeConfig.billing ?? {}) as { floorEUR?: number; ratePct?: number; capEUR?: number | null };
    const billing = billingSummary({
      vendorLift: vendeur.lift,
      cartLift: relances.lift,
      floorEUR: rawBilling.floorEUR ?? 89,
      ratePct: rawBilling.ratePct ?? 5,
      capEUR: rawBilling.capEUR === undefined ? 267 : rawBilling.capEUR,
      restockConvertedEUR: retourStock.convertedEUR,
    });

    res.json({
      period: { from: from?.toISOString() ?? null, to: to?.toISOString() ?? null },
      holdout: { enabled: cfg.enabled, pct: cfg.pct, effectThresholdPct: cfg.effectThresholdPct },
      modules: {
        vendeur,
        relances,
        sav: { tickets: savTotal, resolus: savResolved, tauxResolutionPct: savTotal ? round2((savResolved / savTotal) * 100) : 0 },
        avis: { collectes: reviewsCollected, negatifsInterceptes: reviewsIntercepted },
        retourStock,
      },
      billing,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    next(err);
  }
});

// ── Helper used by order webhooks ────────────────────────────────
export async function recordOrderForVisitor(
  storeId: number,
  visitorId: string,
  orderTotal: number,
): Promise<void> {
  const prisma = getPrisma();
  const cfg = resolveHoldoutConfig((await getStoreConfig(storeId)).holdout);
  const bucket = bucketFor(visitorId, storeId);
  const control = bucket < cfg.pct;
  await prisma.holdoutVisitor.upsert({
    where: { storeId_visitorId: { storeId, visitorId } },
    create: {
      storeId,
      visitorId,
      bucket,
      isControl: control,
      exposed: !control,
      orderCount: 1,
      revenue: orderTotal,
    },
    update: {
      orderCount: { increment: 1 },
      revenue: { increment: orderTotal },
      lastSeenAt: new Date(),
    },
  });
  // Order-level log so /proof can window the lift on a billing period.
  await prisma.holdoutOrder.create({
    data: { storeId, visitorId, isControl: control, amount: orderTotal },
  });
  logger.info({ storeId, visitorId, orderTotal }, 'holdout.order.recorded');
}
