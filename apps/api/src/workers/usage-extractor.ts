/**
 * Usage extractor worker — AI extraction of usages for new/updated products.
 */

import { Worker, type Job } from 'bullmq';
import { getPrisma, ClaudeClient, logger } from '@shimmer/core';

export interface UsageExtractionJob {
  productId: number;
}

export function createUsageExtractorWorker(connection: { host: string; port: number }) {
  return new Worker<UsageExtractionJob>(
    'usage-extraction',
    async (job: Job<UsageExtractionJob>) => {
      const { productId } = job.data;
      const prisma = getPrisma();

      const product = await prisma.product.findUnique({
        where: { id: productId },
        include: { usages: true },
      });

      if (!product) {
        logger.warn({ productId }, 'usage_extractor.product_not_found');
        return;
      }

      // Skip if product already has enough usages
      if (product.usages.length >= 3) {
        logger.debug({ productId, existingUsages: product.usages.length }, 'usage_extractor.skipped');
        return;
      }

      // Load taxonomy codes
      const taxonomy = await prisma.usageTaxonomy.findMany();
      const taxonomyCodes = taxonomy.map((t) => `${t.code}: ${t.label} (${t.category})`).join('\n');

      // Ask Claude to extract usages
      const claude = new ClaudeClient();
      const result = await claude.completeJson<{
        usages: { code: string; score: number; reason: string }[];
      }>(
        [
          {
            role: 'user',
            content: `Analyse ce produit et détermine ses usages pertinents parmi la taxonomie ci-dessous.

## Produit
Nom: ${product.name}
Description: ${product.description || 'N/A'}
Catégorie: ${product.category}
Marque: ${product.brand}
Specs: ${JSON.stringify(product.specs)}

## Taxonomie disponible
${taxonomyCodes}

Retourne un JSON avec un array "usages" contenant {code, score (0-100), reason}.
Score: 90+ = usage principal, 60-89 = usage secondaire, 30-59 = usage marginal.
Ne retourne que les usages pertinents (score >= 30).`,
          },
        ],
        { temperature: 0.2 },
      );

      // Upsert usage links
      for (const usage of result.usages) {
        const taxonomyEntry = taxonomy.find((t) => t.code === usage.code);
        if (!taxonomyEntry) continue;

        await prisma.productUsage.upsert({
          where: {
            productId_usageId: {
              productId: product.id,
              usageId: taxonomyEntry.id,
            },
          },
          create: {
            productId: product.id,
            usageId: taxonomyEntry.id,
            score: Math.min(100, Math.max(0, usage.score)),
            confidence: usage.score >= 80 ? 'high' : usage.score >= 50 ? 'medium' : 'low',
            source: 'ai_extraction',
          },
          update: {
            score: Math.min(100, Math.max(0, usage.score)),
            confidence: usage.score >= 80 ? 'high' : usage.score >= 50 ? 'medium' : 'low',
            source: 'ai_extraction',
            sourcesCount: { increment: 1 },
          },
        });
      }

      logger.info({
        productId,
        usagesExtracted: result.usages.length,
      }, 'usage_extractor.complete');
    },
    {
      connection,
      concurrency: 2,
    },
  );
}
