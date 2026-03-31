/**
 * Worker runner — standalone entry point that starts all BullMQ workers.
 * Provides graceful shutdown (SIGTERM/SIGINT) and a health check endpoint on port 3005.
 *
 * Usage:  tsx apps/api/src/workers/worker-runner.ts
 */

import http from 'node:http';
import { Queue, Worker } from 'bullmq';
import { getPrisma, closePrisma, logger } from '@shimmer/core';
import { createFeedbackWorker } from './feedback-processor.js';
import { createIndexRebuilderWorker } from './index-rebuilder.js';
import { createUsageExtractorWorker } from './usage-extractor.js';
import { createCorpusEnricherWorker } from './corpus-enricher.js';
import { createReindexWorker } from './reindex-worker.js';

// ---------------------------------------------------------------
// Config
// ---------------------------------------------------------------

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const HEALTH_PORT = Number(process.env.WORKER_HEALTH_PORT) || 3005;

const url = new URL(REDIS_URL);
const connection = {
  host: url.hostname,
  port: Number(url.port) || 6379,
};

// ---------------------------------------------------------------
// State
// ---------------------------------------------------------------

const workers: Worker[] = [];
const queues: Queue[] = [];
let healthy = true;
let server: http.Server | null = null;

// ---------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------

async function start(): Promise<void> {
  logger.info({ redis: `${connection.host}:${connection.port}` }, 'worker-runner.starting');

  // Verify Prisma connectivity
  const prisma = getPrisma();
  await prisma.$connect();
  logger.info('worker-runner.db_connected');

  // Create queues
  const feedbackQueue = new Queue('feedback', { connection });
  const usageExtractionQueue = new Queue('usage-extraction', { connection });
  const corpusEnrichQueue = new Queue('corpus-enrich', { connection });
  const indexRebuildQueue = new Queue('index-rebuild', { connection });
  const learningReindexQueue = new Queue('learning-reindex', { connection });

  queues.push(feedbackQueue, usageExtractionQueue, corpusEnrichQueue, indexRebuildQueue, learningReindexQueue);

  // Create workers
  workers.push(
    createFeedbackWorker(connection),
    createIndexRebuilderWorker(connection),
    createUsageExtractorWorker(connection),
    createCorpusEnricherWorker(connection),
    createReindexWorker(connection),
  );

  // Attach error handlers
  for (const worker of workers) {
    worker.on('failed', (job, err) => {
      logger.error({ jobId: job?.id, jobName: job?.name, err: err.message }, 'worker.job_failed');
    });
    worker.on('error', (err) => {
      logger.error({ err: err.message }, 'worker.error');
    });
  }

  // Schedule periodic index rebuild (every 6 hours)
  await indexRebuildQueue.upsertJobScheduler(
    'periodic-rebuild',
    { every: 6 * 60 * 60 * 1000 },
    {
      name: 'scheduled-rebuild',
      data: { trigger: 'scheduled' },
    },
  );

  // Schedule learning reindex (every hour)
  await learningReindexQueue.upsertJobScheduler(
    'hourly-reindex',
    { every: 60 * 60 * 1000 }, // 1 hour
    {
      name: 'scheduled-reindex',
      data: { trigger: 'scheduled' },
    },
  );

  logger.info({
    workerCount: workers.length,
    queues: queues.map((q) => q.name),
  }, 'worker-runner.workers_started');

  // Start health check server
  startHealthServer();
}

// ---------------------------------------------------------------
// Health check HTTP server
// ---------------------------------------------------------------

function startHealthServer(): void {
  server = http.createServer(async (_req, res) => {
    if (!healthy) {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'shutting_down' }));
      return;
    }

    try {
      // Quick DB ping
      const prisma = getPrisma();
      await prisma.$queryRaw`SELECT 1`;

      const workerStates = workers.map((w) => ({
        name: w.name,
        running: w.isRunning(),
      }));

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'ok',
        uptime: process.uptime(),
        workers: workerStates,
      }));
    } catch (err: any) {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'error', error: err.message }));
    }
  });

  server.listen(HEALTH_PORT, () => {
    logger.info({ port: HEALTH_PORT }, 'worker-runner.health_server_listening');
  });
}

// ---------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------

async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, 'worker-runner.shutting_down');
  healthy = false;

  // Close health server
  if (server) {
    await new Promise<void>((resolve) => server!.close(() => resolve()));
  }

  // Close workers (waits for active jobs to finish with a timeout)
  const closePromises = workers.map((w) =>
    w.close().catch((err) => logger.error({ err: err.message, worker: w.name }, 'worker.close_error')),
  );
  await Promise.allSettled(closePromises);

  // Close queues
  for (const queue of queues) {
    await queue.close().catch(() => {});
  }

  // Close DB
  await closePrisma();

  logger.info('worker-runner.shutdown_complete');
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// ---------------------------------------------------------------
// Start
// ---------------------------------------------------------------

start().catch((err) => {
  logger.fatal({ err }, 'worker-runner.startup_failed');
  process.exit(1);
});
