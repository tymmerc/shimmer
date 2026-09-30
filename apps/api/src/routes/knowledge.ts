/**
 * Per-store knowledge base — ingestion + retrieval.
 *
 *   POST /api/knowledge/ingest  — rebuild this store's knowledge from approved
 *                                 reviews and resolved SAV tickets (also run
 *                                 every night by workers/knowledge-worker.ts). Every text
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
import { getPrisma, getClaude } from '@shimmer/core';
import { ingestStoreKnowledge } from '../lib/knowledge-ingest.js';

export const knowledgeRouter = Router();

knowledgeRouter.post('/ingest', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Même relecture que celle de nuit (workers/knowledge-worker.ts).
    const summary = await ingestStoreKnowledge(getPrisma(), getClaude(), req.storeId!);
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
