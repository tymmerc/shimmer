/**
 * Reindex worker — periodic recalculation of product_usages scores
 * based on accumulated feedback, and taxonomy keyword enrichment
 * from successful search queries.
 *
 * Runs as a BullMQ repeatable job (every hour).
 */

import { Worker, type Job } from 'bullmq';
import { getPrisma, logger } from '@shimmer/core';

export interface ReindexJob {
  trigger: 'scheduled' | 'manual';
}

export function createReindexWorker(connection: { host: string; port: number }) {
  return new Worker<ReindexJob>(
    'learning-reindex',
    async (job: Job<ReindexJob>) => {
      const startMs = Date.now();
      logger.info({ trigger: job.data.trigger }, 'reindex.start');

      const prisma = getPrisma();

      // ----------------------------------------------------------
      // 1. Recalculate product_usages scores from feedback signals
      // ----------------------------------------------------------
      const recalculated = await recalculateScores(prisma);

      // ----------------------------------------------------------
      // 2. Enrich taxonomy keywords from successful search queries
      // ----------------------------------------------------------
      const enriched = await enrichTaxonomyKeywords(prisma);

      // ----------------------------------------------------------
      // 3. Log results to analytics_events
      // ----------------------------------------------------------
      const durationMs = Date.now() - startMs;

      // Find any store to log the event (use first store or store 1)
      const store = await prisma.store.findFirst();
      if (store) {
        await prisma.analyticsEvent.create({
          data: {
            storeId: store.id,
            eventType: 'learning.reindex',
            payload: {
              trigger: job.data.trigger,
              durationMs,
              usagesRecalculated: recalculated,
              keywordsEnriched: enriched,
            } as any,
          },
        });
      }

      logger.info({
        trigger: job.data.trigger,
        durationMs,
        usagesRecalculated: recalculated,
        keywordsEnriched: enriched,
      }, 'reindex.complete');
    },
    {
      connection,
      concurrency: 1, // only one reindex at a time
    },
  );
}

// ---------------------------------------------------------------
// Score recalculation based on accumulated learning_feedback
// ---------------------------------------------------------------

async function recalculateScores(prisma: ReturnType<typeof getPrisma>): Promise<number> {
  // Get all product_usages that have feedback signals
  // We aggregate learning_feedback per (productId, usageCode) pair
  // to compute adjusted scores.

  // Step 1: Gather feedback stats grouped by usage code
  const feedbackStats = await prisma.learningFeedback.groupBy({
    by: ['mappedUsage'],
    _count: { id: true },
    _sum: {
      converted: false as any, // we'll count manually
    },
    where: {
      mappedUsage: { not: null },
      createdAt: {
        // Only consider feedback from the last 30 days
        gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      },
    },
  });

  let updatedCount = 0;

  for (const stat of feedbackStats) {
    if (!stat.mappedUsage) continue;

    // Get detailed feedback for this usage code
    const feedbackEntries = await prisma.learningFeedback.findMany({
      where: {
        mappedUsage: stat.mappedUsage,
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
      include: {
        searchSession: {
          select: { selectedProductId: true, results: true },
        },
      },
    });

    // Count signal types
    let purchases = 0;
    let returns = 0;
    let validations = 0;
    let rejections = 0;

    for (const fb of feedbackEntries) {
      if (fb.converted) purchases++;
      if (fb.returned) returns++;
      if (fb.clientValidated === true) validations++;
      if (fb.clientValidated === false) rejections++;
    }

    const total = feedbackEntries.length;
    if (total === 0) continue;

    // Calculate a feedback-based score modifier
    // Positive signals: purchases (+3), validations (+2)
    // Negative signals: returns (-5), rejections (-3)
    const positiveSignal = (purchases * 3 + validations * 2);
    const negativeSignal = (returns * 5 + rejections * 3);
    const netSignal = positiveSignal - negativeSignal;

    // Normalize to a -20..+20 range based on volume
    const modifier = Math.max(-20, Math.min(20, Math.round(netSignal / Math.max(1, total) * 10)));

    // Find the taxonomy entry
    const taxonomy = await prisma.usageTaxonomy.findUnique({
      where: { code: stat.mappedUsage },
    });

    if (!taxonomy) continue;

    // Apply modifier to all product_usages for this usage
    const productUsages = await prisma.productUsage.findMany({
      where: { usageId: taxonomy.id },
    });

    for (const pu of productUsages) {
      const newScore = Math.max(0, Math.min(100, pu.score + modifier));
      const newConfidence = determineConfidence(total, purchases, returns, validations);

      if (newScore !== pu.score || newConfidence !== pu.confidence) {
        await prisma.productUsage.update({
          where: { id: pu.id },
          data: {
            score: newScore,
            confidence: newConfidence,
          },
        });
        updatedCount++;
      }
    }
  }

  return updatedCount;
}

// ---------------------------------------------------------------
// Enrich taxonomy keywords from successful (converted) queries
// ---------------------------------------------------------------

async function enrichTaxonomyKeywords(prisma: ReturnType<typeof getPrisma>): Promise<number> {
  // Find converted sessions with queries and mapped usages
  const convertedSessions = await prisma.searchSession.findMany({
    where: {
      converted: true,
      query: { not: null },
      mappedUsages: { isEmpty: false },
      createdAt: {
        // Only look at recent conversions not yet processed
        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      },
    },
    select: {
      query: true,
      mappedUsages: true,
    },
  });

  let enrichedCount = 0;

  // Build a map of usageCode -> set of queries
  const usageQueries = new Map<string, Set<string>>();

  for (const session of convertedSessions) {
    if (!session.query) continue;
    const normalized = session.query.toLowerCase().trim();
    // Skip very short or very long queries
    if (normalized.length < 3 || normalized.length > 100) continue;

    for (const code of session.mappedUsages) {
      if (!usageQueries.has(code)) {
        usageQueries.set(code, new Set());
      }
      usageQueries.get(code)!.add(normalized);
    }
  }

  // Update taxonomy keywords
  for (const [code, queries] of usageQueries) {
    const taxonomy = await prisma.usageTaxonomy.findUnique({
      where: { code },
    });

    if (!taxonomy) continue;

    const existingKeywords = new Set(taxonomy.keywords.map((k) => k.toLowerCase()));
    const newKeywords: string[] = [];

    for (const query of queries) {
      if (!existingKeywords.has(query)) {
        newKeywords.push(query);
      }
    }

    if (newKeywords.length > 0) {
      await prisma.usageTaxonomy.update({
        where: { code },
        data: {
          keywords: [...taxonomy.keywords, ...newKeywords],
        },
      });
      enrichedCount += newKeywords.length;

      logger.debug({
        usageCode: code,
        newKeywords,
      }, 'reindex.keywords_enriched');
    }
  }

  return enrichedCount;
}

// ---------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------

function determineConfidence(
  totalFeedback: number,
  purchases: number,
  returns: number,
  validations: number,
): string {
  const positiveRatio = (purchases + validations) / Math.max(1, totalFeedback);
  const returnRatio = returns / Math.max(1, totalFeedback);

  if (totalFeedback >= 10 && positiveRatio >= 0.7 && returnRatio < 0.1) return 'high';
  if (totalFeedback >= 5 && positiveRatio >= 0.5 && returnRatio < 0.2) return 'medium';
  return 'low';
}
