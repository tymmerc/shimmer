/**
 * Shimmer API — Express server entry point.
 */

import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import cors from 'cors';
import pinoHttp from 'pino-http';
import { logger, closePrisma, closeRedis, getPrisma, getRedis } from '@shimmer/core';
import { initializeIndexes } from '@shimmer/smart-search';
import { authMiddleware } from './middleware/auth.js';
import { errorHandler } from './middleware/error-handler.js';
import { createRateLimiter } from './middleware/rate-limiter.js';
import { searchRouter } from './routes/search.js';
import { taxonomyRouter } from './routes/taxonomy.js';
import { pipelineRouter } from './routes/pipeline.js';
import { analyticsRouter } from './routes/analytics.js';
import { storesRouter } from './routes/stores.js';
import { chatRouter } from './routes/chat.js';
import { chatAnalyticsRouter } from './routes/analytics-chat.js';
import { startWorkers, stopWorkers } from './workers/index.js';
import { feedbackRouter } from './routes/feedback.js';
import { mailRouter } from './routes/mail.js';
import { reviewsRouter } from './routes/reviews.js';
import { searchAssistRouter } from './routes/search-assist.js';
import { universeGenRouter } from './routes/universe-gen.js';
import { catalogImportRouter } from './routes/catalog-import.js';
import { crossSellRouter } from './routes/cross-sell.js';

const PORT = Number(process.env.API_PORT) || 3003;
const HOST = process.env.API_HOST || '0.0.0.0';

const app = express();

// Global middleware
app.use(helmet());
app.use(compression());
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.text({ limit: '50mb', type: 'text/csv' }));
app.use(pinoHttp({ logger }));
app.use(createRateLimiter());

// Health check (no auth) — fast liveness probe + deeper readiness
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Readiness probe — checks DB, Redis, embedding sidecar. Returns 200 on success,
// 503 if any dependency is unhealthy. Detail is always exposed so operators can
// see which dependency is failing.
app.get('/health/ready', async (_req, res) => {
  const started = Date.now();
  const embedUrl = process.env.EMBEDDING_URL || 'http://localhost:8100';

  const checks = await Promise.all([
    (async () => {
      const t = Date.now();
      try {
        await getPrisma().$queryRawUnsafe('SELECT 1');
        return { name: 'database', ok: true, ms: Date.now() - t };
      } catch (err) {
        return { name: 'database', ok: false, ms: Date.now() - t, error: (err as Error).message };
      }
    })(),
    (async () => {
      const t = Date.now();
      try {
        const pong = await getRedis().ping();
        return { name: 'redis', ok: pong === 'PONG', ms: Date.now() - t };
      } catch (err) {
        return { name: 'redis', ok: false, ms: Date.now() - t, error: (err as Error).message };
      }
    })(),
    (async () => {
      const t = Date.now();
      try {
        const ctl = new AbortController();
        const timer = setTimeout(() => ctl.abort(), 2000);
        const r = await fetch(`${embedUrl}/health`, { signal: ctl.signal });
        clearTimeout(timer);
        return { name: 'embedding', ok: r.ok, ms: Date.now() - t, status: r.status };
      } catch (err) {
        return { name: 'embedding', ok: false, ms: Date.now() - t, error: (err as Error).message };
      }
    })(),
  ]);

  const allOk = checks.every(c => c.ok);
  res.status(allOk ? 200 : 503).json({
    status: allOk ? 'ready' : 'degraded',
    totalMs: Date.now() - started,
    checks,
    timestamp: new Date().toISOString(),
  });
});

// Store creation (no auth — admin endpoint)
app.use('/api/stores', storesRouter);

// Authenticated routes
app.use('/api/search', authMiddleware, searchRouter);
app.use('/api/taxonomy', authMiddleware, taxonomyRouter);
app.use('/api/pipeline', authMiddleware, pipelineRouter);
app.use('/api/analytics', authMiddleware, analyticsRouter);
app.use('/api/analytics/chat', authMiddleware, chatAnalyticsRouter);
app.use('/api/chat', authMiddleware, chatRouter);
app.use('/api/feedback', authMiddleware, feedbackRouter);
app.use('/api/mail', authMiddleware, mailRouter);
app.use('/api/reviews', authMiddleware, reviewsRouter);
app.use('/api/search/assist', authMiddleware, searchAssistRouter);
app.use('/api/universe', authMiddleware, universeGenRouter);
app.use('/api/catalog', authMiddleware, catalogImportRouter);
app.use('/api/catalog/cross-sell', authMiddleware, crossSellRouter);

// Error handler
app.use(errorHandler);

// Startup
async function start() {
  logger.info('Initializing search indexes...');
  try {
    await initializeIndexes();
  } catch (err) {
    logger.warn({ err }, 'Index initialization failed — search will be limited');
  }

  // Start BullMQ workers
  try {
    await startWorkers();
  } catch (err) {
    logger.warn({ err }, 'Worker initialization failed');
  }

  app.listen(PORT, HOST, () => {
    logger.info({ port: PORT, host: HOST }, 'Shimmer API running');
  });
}

// Graceful shutdown
async function shutdown() {
  logger.info('Shutting down...');
  await stopWorkers();
  await closePrisma();
  await closeRedis();
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

start().catch((err) => {
  logger.fatal({ err }, 'Failed to start');
  process.exit(1);
});
