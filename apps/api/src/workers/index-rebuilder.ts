/**
 * Index rebuilder worker — periodic reindexation (every 6h).
 * Rebuilds BM25 + vector indexes, persists to disk.
 */

import { Worker, type Job } from 'bullmq';
import { logger } from '@shimmer/core';
import { initializeIndexes } from '@shimmer/smart-search';

export interface IndexRebuildJob {
  trigger: 'scheduled' | 'manual' | 'product_update';
}

export function createIndexRebuilderWorker(connection: { host: string; port: number }) {
  return new Worker<IndexRebuildJob>(
    'index-rebuild',
    async (job: Job<IndexRebuildJob>) => {
      const startMs = Date.now();
      logger.info({ trigger: job.data.trigger }, 'index.rebuild.start');

      await initializeIndexes();

      const durationMs = Date.now() - startMs;
      logger.info({ trigger: job.data.trigger, durationMs }, 'index.rebuild.complete');
    },
    {
      connection,
      concurrency: 1, // only one rebuild at a time
    },
  );
}
