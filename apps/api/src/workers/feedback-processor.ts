/**
 * Feedback processor worker — processes clicks, purchases, returns, validations.
 * Updates learning_feedback, search_sessions, product_usages scores/confidence.
 */

import { Worker, type Job } from 'bullmq';
import { getPrisma, logger } from '@shimmer/core';

export interface FeedbackJob {
  searchSessionId: number;
  type: 'click' | 'purchase' | 'return' | 'validation';
  productId?: number;
  usageCode?: string;
  validated?: boolean;
  correction?: string;
}

export function createFeedbackWorker(connection: { host: string; port: number }) {
  return new Worker<FeedbackJob>(
    'feedback',
    async (job: Job<FeedbackJob>) => {
      const { searchSessionId, type, productId, usageCode, validated, correction } = job.data;
      const prisma = getPrisma();

      // Load the search session
      const session = await prisma.searchSession.findUnique({
        where: { id: searchSessionId },
      });

      if (!session) {
        logger.warn({ searchSessionId }, 'feedback.session_not_found');
        return;
      }

      // Create learning feedback entry
      await prisma.learningFeedback.create({
        data: {
          searchSessionId,
          query: session.query,
          stageUsed: session.stageUsed,
          mappedUsage: usageCode,
          clientValidated: validated ?? (type === 'purchase'),
          clientCorrection: correction,
          converted: type === 'purchase',
          returned: type === 'return',
        },
      });

      // -------------------------------------------------------
      // Type-specific processing
      // -------------------------------------------------------

      switch (type) {
        case 'click':
          await handleClick(session, productId);
          break;
        case 'purchase':
          await handlePurchase(session, productId, usageCode);
          break;
        case 'return':
          await handleReturn(session, productId, usageCode);
          break;
        case 'validation':
          await handleValidation(session, productId, usageCode, validated, correction);
          break;
      }

      // Track analytics event
      await prisma.analyticsEvent.create({
        data: {
          storeId: session.storeId,
          eventType: `feedback.${type}`,
          payload: job.data as any,
        },
      });

      logger.info({
        type,
        searchSessionId,
        productId,
        usageCode,
      }, 'feedback.processed');
    },
    {
      connection,
      concurrency: 5,
    },
  );
}

// ---------------------------------------------------------------
// Click — increment click_count in session results JSON
// ---------------------------------------------------------------

async function handleClick(
  session: { id: number; results: any },
  productId?: number,
) {
  if (!productId) return;
  const prisma = getPrisma();

  // Session results is a JSON array of scored products.
  // We increment click_count for the matching product.
  const results = (session.results as any[]) || [];
  let updated = false;

  for (const entry of results) {
    const entryProductId = entry.product?.id ?? entry.productId;
    if (entryProductId === productId) {
      entry.click_count = (entry.click_count || 0) + 1;
      updated = true;
      break;
    }
  }

  if (updated) {
    await prisma.searchSession.update({
      where: { id: session.id },
      data: { results: results as any },
    });
  }
}

// ---------------------------------------------------------------
// Purchase — mark converted + boost product-usage scores
// ---------------------------------------------------------------

async function handlePurchase(
  session: { id: number; storeId: number; mappedUsages: string[] },
  productId?: number,
  usageCode?: string,
) {
  const prisma = getPrisma();

  // Mark session as converted + record selected product
  await prisma.searchSession.update({
    where: { id: session.id },
    data: {
      converted: true,
      ...(productId ? { selectedProductId: productId } : {}),
    },
  });

  if (!productId) return;

  // Boost product-usage scores for mapped usages
  const usageCodes = usageCode
    ? [usageCode]
    : (session.mappedUsages || []);

  if (usageCodes.length === 0) return;

  const taxonomyEntries = await prisma.usageTaxonomy.findMany({
    where: { code: { in: usageCodes } },
  });

  for (const taxonomy of taxonomyEntries) {
    await prisma.productUsage.upsert({
      where: {
        productId_usageId: {
          productId,
          usageId: taxonomy.id,
        },
      },
      create: {
        productId,
        usageId: taxonomy.id,
        score: 70, // initial score from purchase signal
        confidence: 'high',
        source: 'purchase_feedback',
        sourcesCount: 1,
      },
      update: {
        // Boost score by 5, capped at 100
        score: { increment: 5 },
        confidence: 'high',
        sourcesCount: { increment: 1 },
      },
    });
  }

  // Clamp score to max 100 (Prisma increment can overshoot)
  await prisma.$executeRawUnsafe(
    `UPDATE product_usages SET score = 100 WHERE product_id = $1 AND score > 100`,
    productId,
  );
}

// ---------------------------------------------------------------
// Return — flag product-usage for review, decrease confidence
// ---------------------------------------------------------------

async function handleReturn(
  session: { id: number; mappedUsages: string[] },
  productId?: number,
  usageCode?: string,
) {
  if (!productId) return;
  const prisma = getPrisma();

  const usageCodes = usageCode
    ? [usageCode]
    : (session.mappedUsages || []);

  if (usageCodes.length === 0) return;

  const taxonomyEntries = await prisma.usageTaxonomy.findMany({
    where: { code: { in: usageCodes } },
  });

  for (const taxonomy of taxonomyEntries) {
    const existing = await prisma.productUsage.findUnique({
      where: {
        productId_usageId: {
          productId,
          usageId: taxonomy.id,
        },
      },
    });

    if (!existing) continue;

    // Decrease score by 10 (min 0) and downgrade confidence
    const newScore = Math.max(0, existing.score - 10);
    const newConfidence = existing.confidence === 'high'
      ? 'medium'
      : existing.confidence === 'medium'
        ? 'low'
        : 'low';

    await prisma.productUsage.update({
      where: {
        productId_usageId: {
          productId,
          usageId: taxonomy.id,
        },
      },
      data: {
        score: newScore,
        confidence: newConfidence,
        source: `${existing.source}+return_flag`,
      },
    });
  }
}

// ---------------------------------------------------------------
// Validation — adjust scores based on client validation
// ---------------------------------------------------------------

async function handleValidation(
  session: { id: number; storeId: number },
  productId?: number,
  usageCode?: string,
  validated?: boolean,
  correction?: string,
) {
  const prisma = getPrisma();

  if (validated && usageCode && productId) {
    // Client confirmed the mapping is correct — increase score
    const taxonomy = await prisma.usageTaxonomy.findUnique({
      where: { code: usageCode },
    });

    if (taxonomy) {
      await prisma.productUsage.upsert({
        where: {
          productId_usageId: {
            productId,
            usageId: taxonomy.id,
          },
        },
        create: {
          productId,
          usageId: taxonomy.id,
          score: 75,
          confidence: 'high',
          source: 'client_validation',
          sourcesCount: 1,
        },
        update: {
          score: { increment: 3 },
          confidence: 'high',
          sourcesCount: { increment: 1 },
        },
      });

      // Clamp to 100
      await prisma.$executeRawUnsafe(
        `UPDATE product_usages SET score = 100 WHERE product_id = $1 AND usage_id = $2 AND score > 100`,
        productId,
        taxonomy.id,
      );
    }
  }

  if (correction && productId) {
    // Client provided a correction — create/update with the correct usage code
    const correctionTaxonomy = await prisma.usageTaxonomy.findUnique({
      where: { code: correction },
    });

    if (correctionTaxonomy) {
      await prisma.productUsage.upsert({
        where: {
          productId_usageId: {
            productId,
            usageId: correctionTaxonomy.id,
          },
        },
        create: {
          productId,
          usageId: correctionTaxonomy.id,
          score: 70,
          confidence: 'medium',
          source: 'client_correction',
          sourcesCount: 1,
        },
        update: {
          score: { increment: 5 },
          confidence: 'medium',
          sourcesCount: { increment: 1 },
        },
      });

      // Clamp to 100
      await prisma.$executeRawUnsafe(
        `UPDATE product_usages SET score = 100 WHERE product_id = $1 AND usage_id = $2 AND score > 100`,
        productId,
        correctionTaxonomy.id,
      );
    }

    // If there was an original usageCode that was wrong, decrease its score
    if (usageCode && usageCode !== correction) {
      const wrongTaxonomy = await prisma.usageTaxonomy.findUnique({
        where: { code: usageCode },
      });

      if (wrongTaxonomy) {
        const existing = await prisma.productUsage.findUnique({
          where: {
            productId_usageId: {
              productId,
              usageId: wrongTaxonomy.id,
            },
          },
        });

        if (existing) {
          await prisma.productUsage.update({
            where: {
              productId_usageId: {
                productId,
                usageId: wrongTaxonomy.id,
              },
            },
            data: {
              score: Math.max(0, existing.score - 15),
              confidence: 'low',
            },
          });
        }
      }
    }
  }
}
