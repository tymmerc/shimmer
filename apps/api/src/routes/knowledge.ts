/**
 * Per-store knowledge base — ingestion + retrieval.
 *
 *   POST /api/knowledge/ingest  — rebuild this store's knowledge from approved
 *                                 reviews and resolved SAV tickets. Every text
 *                                 is PII-scrubbed before insertion. SAV is
 *                                 aggregated by LLM into anonymous objections
 *                                 (the raw ticket text never enters the chunk).
 *   GET  /api/knowledge/summary — counts + sample chunks for the dashboard.
 *
 * RGPD note: the chunks table contains NO raw personal data. Customer names
 * are stripped against the merchant's own roster; emails/phones/addresses
 * via regex. SAV is not stored verbatim, only objections.
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import { getPrisma, getClaude, logger } from '@shimmer/core';
import { scrubPII } from '../lib/scrub-pii.js';

export const knowledgeRouter = Router();

interface IngestSummary {
  reviewsScanned: number;
  reviewChunksWritten: number;
  reviewPIIRedactions: number;
  savTicketsScanned: number;
  savObjectionsExtracted: number;
}

knowledgeRouter.post('/ingest', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const storeId = req.storeId!;
    const prisma = getPrisma();

    // Roster of names from this store's customer base. Used by the PII scrubber
    // so a review that mentions "Pierre était content" gets the name stripped.
    const customers = await prisma.customer.findMany({
      where: { storeId },
      select: { firstName: true, lastName: true },
    });
    const customerNames = customers.flatMap(c => [c.firstName, c.lastName].filter((s): s is string => !!s));

    // Wipe and rebuild this store's chunks. Idempotent.
    await prisma.knowledgeChunk.deleteMany({ where: { storeId } });

    const summary: IngestSummary = {
      reviewsScanned: 0,
      reviewChunksWritten: 0,
      reviewPIIRedactions: 0,
      savTicketsScanned: 0,
      savObjectionsExtracted: 0,
    };

    // ── Reviews ──────────────────────────────────────────────
    const reviews = await prisma.review.findMany({
      where: { storeId, status: { in: ['APPROVED', 'PUBLISHED'] }, comment: { not: null } },
      select: {
        id: true, productId: true, overallRating: true, comment: true, title: true,
        pros: true, cons: true, wouldRecommend: true,
      },
    });
    summary.reviewsScanned = reviews.length;

    for (const r of reviews) {
      const rawParts = [r.title, r.comment, r.pros ? `+ ${r.pros}` : null, r.cons ? `- ${r.cons}` : null].filter(Boolean);
      const raw = rawParts.join(' · ');
      if (!raw.trim()) continue;
      const scrubbed = scrubPII(raw, { customerNames });
      summary.reviewPIIRedactions += scrubbed.hits.reduce((a, h) => a + h.count, 0);

      await prisma.knowledgeChunk.create({
        data: {
          storeId,
          sourceType: 'review',
          sourceId: r.id,
          productId: r.productId,
          text: scrubbed.text,
          metadata: {
            rating: r.overallRating,
            wouldRecommend: r.wouldRecommend,
            redactions: scrubbed.hits,
          } as unknown as Parameters<typeof prisma.knowledgeChunk.create>[0]['data']['metadata'],
        },
      });
      summary.reviewChunksWritten += 1;
    }

    // ── SAV: aggregate objections only (never raw ticket text) ─
    const tickets = await prisma.savRequest.findMany({
      where: { storeId, status: { in: ['resolved', 'closed'] }, description: { not: null } },
      select: { id: true, type: true, description: true, resolution: true },
      take: 200,
    });
    summary.savTicketsScanned = tickets.length;

    if (tickets.length > 0) {
      // Pre-scrub each ticket before sending to the LLM (defense in depth).
      const scrubbedTickets = tickets.map(t => {
        const s = scrubPII(`${t.description ?? ''} || ${t.resolution ?? ''}`, { customerNames });
        return { type: t.type, text: s.text };
      });
      // Ask the LLM to extract a compact list of anonymous recurring objections.
      const claude = getClaude();
      const corpus = scrubbedTickets.map((t, i) => `[${i + 1}] (${t.type}) ${t.text}`).join('\n').slice(0, 8000);
      const prompt =
        `Voici des tickets SAV anonymisés.\n\nExtrais entre 4 et 10 OBJECTIONS ou QUESTIONS RÉCURRENTES, formulées de façon générique et anonyme (pas de nom, pas de détail personnel, juste le pattern). Format JSON pur : {"objections": ["...", "..."]}. Pas de markdown.\n\n${corpus}`;
      let objections: string[] = [];
      try {
        const raw = await claude.complete([{ role: 'user', content: prompt }], { temperature: 0.2, maxTokens: 600 });
        const m = raw.match(/\{[\s\S]*\}/);
        if (m) {
          const parsed = JSON.parse(m[0]) as { objections?: unknown };
          if (Array.isArray(parsed.objections)) {
            objections = parsed.objections.filter((o): o is string => typeof o === 'string' && o.length >= 5 && o.length < 240).slice(0, 10);
          }
        }
      } catch (err) {
        logger.warn({ err }, 'knowledge.sav.llm-extract-failed');
      }

      for (const objection of objections) {
        // Belt and suspenders: scrub the LLM output too.
        const final = scrubPII(objection, { customerNames }).text;
        await prisma.knowledgeChunk.create({
          data: {
            storeId,
            sourceType: 'sav_objection',
            text: final,
            metadata: {} as unknown as Parameters<typeof prisma.knowledgeChunk.create>[0]['data']['metadata'],
          },
        });
        summary.savObjectionsExtracted += 1;
      }

      // Also persist the objections list into store.config so the sales prompt
      // can use them as "anticipations" without needing a chunk lookup.
      if (objections.length > 0) {
        const store = await prisma.store.findUnique({ where: { id: storeId } });
        const cfg = (store?.config ?? {}) as Record<string, unknown>;
        await prisma.store.update({
          where: { id: storeId },
          data: {
            config: { ...cfg, common_objections: objections } as unknown as Parameters<typeof prisma.store.update>[0]['data']['config'],
          },
        });
      }
    }

    logger.info({ storeId, ...summary }, 'knowledge.ingest.complete');
    res.json({ ok: true, summary });
  } catch (err) {
    next(err);
  }
});

knowledgeRouter.get('/summary', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const storeId = req.storeId!;
    const prisma = getPrisma();
    const counts = await prisma.knowledgeChunk.groupBy({
      by: ['sourceType'],
      where: { storeId },
      _count: { _all: true },
    });
    const samples = await prisma.knowledgeChunk.findMany({
      where: { storeId },
      orderBy: { id: 'desc' },
      take: 6,
      select: { sourceType: true, text: true, productId: true, metadata: true },
    });
    res.json({ counts: counts.map(c => ({ source: c.sourceType, count: c._count._all })), samples });
  } catch (err) {
    next(err);
  }
});
