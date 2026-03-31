/**
 * Corpus enricher worker — adds validated queries to BM25 corpus + embedding cache.
 * Runs after feedback confirms a query→usage mapping was correct.
 */

import { Worker, type Job } from 'bullmq';
import { getPrisma, logger } from '@shimmer/core';

export interface CorpusEnrichJob {
  query: string;
  usageCode: string;
  productId: number;
  storeId: number;
}

export function createCorpusEnricherWorker(connection: { host: string; port: number }) {
  return new Worker<CorpusEnrichJob>(
    'corpus-enrich',
    async (job: Job<CorpusEnrichJob>) => {
      const { query, usageCode, storeId } = job.data;
      const prisma = getPrisma();

      // Add validated query as a keyword to the taxonomy entry
      const taxonomy = await prisma.usageTaxonomy.findUnique({
        where: { code: usageCode },
      });

      if (!taxonomy) {
        logger.warn({ usageCode }, 'corpus_enricher.taxonomy_not_found');
        return;
      }

      // Normalize query for keyword storage
      const normalizedQuery = query.toLowerCase().trim();

      // Only add if not already present
      if (!taxonomy.keywords.includes(normalizedQuery)) {
        await prisma.usageTaxonomy.update({
          where: { code: usageCode },
          data: {
            keywords: [...taxonomy.keywords, normalizedQuery],
          },
        });

        logger.info({
          usageCode,
          query: normalizedQuery,
          keywordsCount: taxonomy.keywords.length + 1,
        }, 'corpus_enricher.keyword_added');
      }

      // Track analytics event
      await prisma.analyticsEvent.create({
        data: {
          storeId,
          eventType: 'corpus.enriched',
          payload: {
            query: normalizedQuery,
            usageCode,
          } as any,
        },
      });
    },
    {
      connection,
      concurrency: 3,
    },
  );
}
