/**
 * Workers orchestrator — starts/stops all BullMQ workers + schedulers.
 */

import { Queue, type Worker } from 'bullmq';
import { logger } from '@shimmer/core';
import { createFeedbackWorker } from './feedback-processor.js';
import { createIndexRebuilderWorker } from './index-rebuilder.js';
import { createUsageExtractorWorker } from './usage-extractor.js';
import { createCorpusEnricherWorker } from './corpus-enricher.js';
import { createReindexWorker } from './reindex-worker.js';
import { createAutomationsWorker, openAutomationsQueue, closeAutomationsQueue } from '../lib/automations/queue.js';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6381';
const url = new URL(REDIS_URL);
const connection = {
  host: url.hostname,
  port: Number(url.port) || 6379,
};

const workers: Worker[] = [];
let indexRebuildQueue: Queue | null = null;
let learningReindexQueue: Queue | null = null;

// Export queues for use in API routes
export let feedbackQueue: Queue;
export let usageExtractionQueue: Queue;
export let corpusEnrichQueue: Queue;

export async function startWorkers(): Promise<void> {
  // Create queues
  feedbackQueue = new Queue('feedback', { connection });
  usageExtractionQueue = new Queue('usage-extraction', { connection });
  corpusEnrichQueue = new Queue('corpus-enrich', { connection });
  indexRebuildQueue = new Queue('index-rebuild', { connection });
  learningReindexQueue = new Queue('learning-reindex', { connection });

  // Create workers
  workers.push(
    createFeedbackWorker(connection),
    createIndexRebuilderWorker(connection),
    createUsageExtractorWorker(connection),
    createCorpusEnricherWorker(connection),
    createReindexWorker(connection),
  );

  // Schedule periodic index rebuild (every 6 hours)
  await indexRebuildQueue.upsertJobScheduler(
    'periodic-rebuild',
    { every: 6 * 60 * 60 * 1000 }, // 6h
    {
      name: 'scheduled-rebuild',
      data: { trigger: 'scheduled' },
    },
  );

  // Schedule learning reindex (every hour)
  await learningReindexQueue.upsertJobScheduler(
    'hourly-reindex',
    { every: 60 * 60 * 1000 }, // 1h
    {
      name: 'scheduled-reindex',
      data: { trigger: 'scheduled' },
    },
  );

  // Business-automation queue: per-entity delayed jobs (cart reminders at +1h
  // and +24h, review request at +48h, SAV escalation at +24h, outbound publish
  // at scheduledAt, mail → SAV immediate). No polling: jobs fire only when an
  // actual event scheduled them.
  openAutomationsQueue(connection);
  workers.push(createAutomationsWorker(connection));

  logger.info({
    workers: workers.length,
    queues: ['feedback', 'usage-extraction', 'corpus-enrich', 'index-rebuild', 'learning-reindex'],
  }, 'workers.started');
}

export async function stopWorkers(): Promise<void> {
  await closeAutomationsQueue();
  for (const worker of workers) {
    await worker.close();
  }

  if (indexRebuildQueue) await indexRebuildQueue.close();
  if (learningReindexQueue) await learningReindexQueue.close();
  if (feedbackQueue) await feedbackQueue.close();
  if (usageExtractionQueue) await usageExtractionQueue.close();
  if (corpusEnrichQueue) await corpusEnrichQueue.close();

  logger.info('workers.stopped');
}
