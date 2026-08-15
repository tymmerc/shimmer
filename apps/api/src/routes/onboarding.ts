/**
 * Onboarding journey — 4 phases per store.
 *
 *   ingesting   → Phase 1: read catalogue + reviews + SAV, build the per-store
 *                 knowledge base (handled by /api/knowledge/ingest)
 *   observing   → Phase 2: SDK active but widget HIDDEN. Visitor queries are
 *                 logged silently. After ~7 days we generate a readiness
 *                 report from the corpus (vocabulary, intents, gaps).
 *   validating  → Phase 3: vendeur drafts are generated from the observed
 *                 queries. The merchant approves / corrects / rejects each
 *                 one. Corrections feed store.config back.
 *   live        → Phase 4: widget visible, holdout active, billing logic.
 *
 *   GET  /api/onboarding/status           — current phase, progress signal
 *   POST /api/onboarding/advance          — move forward (validates gates)
 *
 *   POST /api/observation/log             — SDK, no auth (rate-limited)
 *   GET  /api/observation/report          — merchant report J+7
 *
 *   POST /api/preview/generate            — produce N drafts from observed queries
 *   GET  /api/preview                     — list pending previews
 *   POST /api/preview/:id/decide          — approve | correct | reject
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { getPrisma, getClaude, logger, ShimmerError } from '@shimmer/core';
import { handleSalesMessage } from '@shimmer/chatbot';
import { scrubPII } from '../lib/scrub-pii.js';
import { authMiddleware } from '../middleware/auth.js';
import { createScopedRateLimiter } from '../middleware/rate-limiter.js';

export const onboardingRouter = Router();
export const observationRouter = Router();
export const previewRouter = Router();

type Phase = 'ingesting' | 'observing' | 'validating' | 'live';
const PHASES: readonly Phase[] = ['ingesting', 'observing', 'validating', 'live'] as const;

async function currentPhase(storeId: number): Promise<Phase> {
  const prisma = getPrisma();
  const store = await prisma.store.findUnique({ where: { id: storeId } });
  const cfg = (store?.config ?? {}) as { shimmer_phase?: Phase };
  // Defaults to 'ingesting'. A store goes to 'live' only after the four
  // onboarding gates are explicitly cleared. Existing stores were backfilled
  // with shimmer_phase='live' so they keep behaving as before.
  return cfg.shimmer_phase ?? 'ingesting';
}

async function setPhase(storeId: number, phase: Phase): Promise<void> {
  const prisma = getPrisma();
  const store = await prisma.store.findUnique({ where: { id: storeId } });
  const cfg = (store?.config ?? {}) as Record<string, unknown>;
  await prisma.store.update({
    where: { id: storeId },
    data: {
      config: { ...cfg, shimmer_phase: phase, shimmer_phase_changed_at: new Date().toISOString() } as unknown as Parameters<typeof prisma.store.update>[0]['data']['config'],
    },
  });
}

// ─────────────────────────────────────────────────────────────
// Onboarding control
// ─────────────────────────────────────────────────────────────

onboardingRouter.get('/status', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const storeId = req.storeId!;
    const prisma = getPrisma();
    const phase = await currentPhase(storeId);

    const [chunks, observed, previewCounts] = await Promise.all([
      prisma.knowledgeChunk.count({ where: { storeId } }),
      prisma.observedQuery.count({ where: { storeId } }),
      prisma.vendeurPreview.groupBy({
        by: ['status'],
        where: { storeId },
        _count: { _all: true },
      }),
    ]);
    const previewByStatus = Object.fromEntries(previewCounts.map(p => [p.status, p._count._all]));

    res.json({
      phase,
      phases: PHASES,
      gates: {
        ingestingComplete: chunks > 0,
        observingHasSignal: observed >= 50,
        validatingDone:
          (previewByStatus.approved ?? 0) >= 10 &&
          (previewByStatus.approved ?? 0) / Math.max(1, (previewByStatus.approved ?? 0) + (previewByStatus.rejected ?? 0)) >= 0.8,
      },
      counts: {
        knowledgeChunks: chunks,
        observedQueries: observed,
        previews: previewByStatus,
      },
    });
  } catch (err) {
    next(err);
  }
});

const advanceSchema = z.object({ to: z.enum(['observing', 'validating', 'live']).optional() });

onboardingRouter.post('/advance', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const storeId = req.storeId!;
    const body = advanceSchema.parse(req.body);
    const phase = await currentPhase(storeId);
    const prisma = getPrisma();

    const target: Phase = body.to ?? nextPhase(phase);
    if (PHASES.indexOf(target) <= PHASES.indexOf(phase)) {
      throw new ShimmerError(`Cannot move from ${phase} to ${target}`, 'BAD_REQUEST', 400);
    }

    // Gate checks.
    if (target === 'observing') {
      const chunks = await prisma.knowledgeChunk.count({ where: { storeId } });
      if (chunks === 0) throw new ShimmerError('Phase 1 incomplete: run /api/knowledge/ingest first', 'GATE_FAILED', 400);
    }
    if (target === 'validating') {
      const observed = await prisma.observedQuery.count({ where: { storeId } });
      if (observed < 20) throw new ShimmerError(`Phase 2 needs at least 20 observed queries (have ${observed})`, 'GATE_FAILED', 400);
    }
    if (target === 'live') {
      const counts = await prisma.vendeurPreview.groupBy({
        by: ['status'],
        where: { storeId },
        _count: { _all: true },
      });
      const m = Object.fromEntries(counts.map(c => [c.status, c._count._all]));
      const approved = m.approved ?? 0;
      const total = approved + (m.rejected ?? 0);
      if (approved < 10 || (total > 0 && approved / total < 0.8)) {
        throw new ShimmerError(
          `Phase 3 needs >=10 approved previews and >=80% approval rate (have ${approved} approved, ${m.rejected ?? 0} rejected)`,
          'GATE_FAILED',
          400,
        );
      }
    }

    await setPhase(storeId, target);
    logger.info({ storeId, from: phase, to: target }, 'onboarding.advance');
    res.json({ ok: true, from: phase, to: target });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    next(err);
  }
});

function nextPhase(p: Phase): Phase {
  const i = PHASES.indexOf(p);
  return PHASES[Math.min(PHASES.length - 1, i + 1)]!;
}

// ─────────────────────────────────────────────────────────────
// Phase 2 — observation
// ─────────────────────────────────────────────────────────────

const logQuerySchema = z.object({
  store: z.coerce.number().int().positive(),
  visitorId: z.string().min(4).max(80).optional(),
  query: z.string().min(2).max(500),
});

// Unauthenticated SDK endpoint: per-IP cap keeps a hostile client from
// flooding observed_queries for arbitrary stores.
const observationLimiter = createScopedRateLimiter('observation-log', 60_000, 30);

observationRouter.post('/log', observationLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = logQuerySchema.parse({ ...req.body, store: req.body.store });
    const prisma = getPrisma();
    // Refuse logs for stores that don't exist (otherwise anyone can grow the
    // table with arbitrary storeIds).
    const exists = await prisma.store.count({ where: { id: body.store } });
    if (exists === 0) {
      res.status(404).json({ error: 'Unknown store' });
      return;
    }
    // Pre-scrub everything that enters the log. We don't know the store roster
    // here cheaply, but emails/phones/IBAN/dates are domain-independent.
    const scrubbed = scrubPII(body.query);
    await prisma.observedQuery.create({
      data: {
        storeId: body.store,
        visitorId: body.visitorId ?? null,
        rawText: scrubbed.text,
      },
    });
    res.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    next(err);
  }
});

observationRouter.get('/report', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const storeId = req.storeId!;
    const prisma = getPrisma();
    const queries = await prisma.observedQuery.findMany({
      where: { storeId },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });

    if (queries.length < 5) {
      res.json({
        sample: queries.length,
        status: 'too_few',
        message: `Pas assez de données pour un rapport fiable (${queries.length} requêtes). Continue à observer.`,
      });
      return;
    }

    // Cluster the corpus into intents + extract vocabulary + identify gaps.
    const corpus = queries.map(q => `- ${q.rawText.slice(0, 200)}`).join('\n').slice(0, 8000);
    const claude = getClaude();
    const prompt =
      `Voici une liste de requêtes anonymisées tapées par les visiteurs d'une boutique en ligne.\n\n` +
      `Tu vas produire un RAPPORT DE PRÉPARATION pour le marchand au format JSON pur (pas de markdown) :\n\n` +
      `{\n` +
      `  "topIntents": [{"label": "...", "count": <int>, "examples": ["q1","q2"]}],\n` +
      `  "vocabularyDiscovered": ["mot1 (sens)", ...],\n` +
      `  "catalogueGaps": ["..."],\n` +
      `  "verdict": "phrase courte pour le marchand"\n` +
      `}\n\n` +
      `Au moins 4 intents, au moins 8 mots de vocabulaire. Reste anonyme.\n\n` +
      `Requêtes :\n${corpus}`;
    let analysis: Record<string, unknown> = {};
    try {
      const raw = await claude.complete([{ role: 'user', content: prompt }], { temperature: 0.2, maxTokens: 900 });
      const m = raw.match(/\{[\s\S]*\}/);
      if (m) analysis = JSON.parse(m[0]);
    } catch (err) {
      logger.warn({ err }, 'observation.report.llm-failed');
    }

    res.json({
      sample: queries.length,
      windowStart: queries[queries.length - 1]?.createdAt,
      windowEnd: queries[0]?.createdAt,
      analysis,
      ready: queries.length >= 50,
    });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────
// Phase 3 — preview generation + merchant validation
// ─────────────────────────────────────────────────────────────

const generateSchema = z.object({ count: z.number().int().min(1).max(30).optional() });

previewRouter.post('/generate', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const storeId = req.storeId!;
    const body = generateSchema.parse(req.body ?? {});
    const want = body.count ?? 12;

    const prisma = getPrisma();
    const queries = await prisma.observedQuery.findMany({
      where: { storeId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    if (queries.length === 0) {
      throw new ShimmerError('No observed queries yet', 'NO_DATA', 400);
    }
    // De-duplicate by normalized text, pick a diverse sample.
    const seen = new Set<string>();
    const picked: string[] = [];
    for (const q of queries) {
      const k = q.rawText.toLowerCase().replace(/\s+/g, ' ').trim();
      if (seen.has(k)) continue;
      seen.add(k);
      picked.push(q.rawText);
      if (picked.length >= want) break;
    }

    const created: number[] = [];
    for (const queryText of picked) {
      const result = await handleSalesMessage(storeId, queryText);
      const row = await prisma.vendeurPreview.create({
        data: {
          storeId,
          sourceQuery: queryText,
          draftResponse: result.message,
          recommendedIds: result.recommendedProducts.map(p => p.id) as unknown as Parameters<typeof prisma.vendeurPreview.create>[0]['data']['recommendedIds'],
        },
      });
      created.push(row.id);
    }
    res.json({ ok: true, generated: created.length });
  } catch (err) {
    next(err);
  }
});

previewRouter.get('/', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const storeId = req.storeId!;
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const prisma = getPrisma();
    const previews = await prisma.vendeurPreview.findMany({
      where: { storeId, ...(status ? { status } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json({ previews });
  } catch (err) {
    next(err);
  }
});

const decideSchema = z.object({
  decision: z.enum(['approved', 'corrected', 'rejected']),
  correctedText: z.string().max(2000).optional(),
  merchantNote: z.string().max(1000).optional(),
});

previewRouter.post('/:id/decide', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const storeId = req.storeId!;
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) throw new ShimmerError('Invalid id', 'BAD_REQUEST', 400);
    const body = decideSchema.parse(req.body);
    if (body.decision === 'corrected' && !body.correctedText) {
      throw new ShimmerError('correctedText required when correcting', 'BAD_REQUEST', 400);
    }
    const prisma = getPrisma();
    const existing = await prisma.vendeurPreview.findFirst({ where: { id, storeId } });
    if (!existing) throw new ShimmerError('Preview not found', 'NOT_FOUND', 404);

    await prisma.vendeurPreview.update({
      where: { id },
      data: {
        status: body.decision,
        correctedText: body.correctedText ?? null,
        merchantNote: body.merchantNote ?? null,
        decidedAt: new Date(),
      },
    });
    res.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────
// Exposed helper: refuse the vendeur to non-live stores
// ─────────────────────────────────────────────────────────────

export async function isLive(storeId: number): Promise<boolean> {
  return (await currentPhase(storeId)) === 'live';
}
