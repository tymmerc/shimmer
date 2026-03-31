/**
 * Shimmer API — Express server entry point.
 */

import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import cors from 'cors';
import pinoHttp from 'pino-http';
import { logger, closePrisma, closeRedis } from '@shimmer/core';
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

// Health check (no auth)
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
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
