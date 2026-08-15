/**
 * Shimmer API — Express server entry point.
 */

import express, { type Request } from 'express';
import helmet from 'helmet';
import compression from 'compression';
import cors from 'cors';
import pinoHttp from 'pino-http';
import { logger, closePrisma, closeRedis, getPrisma, getRedis } from '@shimmer/core';
import { initializeIndexes } from '@shimmer/smart-search';
import { authMiddleware, widgetAuth } from './middleware/auth.js';
import { errorHandler } from './middleware/error-handler.js';
import { createRateLimiter } from './middleware/rate-limiter.js';
import { searchRouter } from './routes/search.js';
import { taxonomyRouter } from './routes/taxonomy.js';
import { pipelineRouter } from './routes/pipeline.js';
import { analyticsRouter } from './routes/analytics.js';
import { storesRouter } from './routes/stores.js';
import { chatRouter } from './routes/chat.js';
import { stockAlertsRouter } from './routes/stock-alerts.js';
import { chatAnalyticsRouter } from './routes/analytics-chat.js';
import { startWorkers, stopWorkers } from './workers/index.js';
import { feedbackRouter } from './routes/feedback.js';
import { mailRouter } from './routes/mail.js';
import { reviewsRouter } from './routes/reviews.js';
import { searchAssistRouter } from './routes/search-assist.js';
import { universeGenRouter } from './routes/universe-gen.js';
import { catalogImportRouter } from './routes/catalog-import.js';
import { crossSellRouter } from './routes/cross-sell.js';
import { outboundRouter } from './routes/outbound.js';
import { savRouter } from './routes/sav.js';
import { ordersTrackingRouter } from './routes/orders-tracking.js';
import { cartRecoveryRouter } from './routes/cart-recovery.js';
import { publicOutboundRouter } from './routes/public-outbound.js';
import { emailsRouter } from './routes/emails.js';
import { webhooksInboundRouter } from './routes/webhooks-inbound.js';
import { adminStatsRouter } from './routes/admin-stats.js';
import { webhooksShopifyRouter } from './routes/webhooks-shopify.js';
import { webhooksWooCommerceRouter } from './routes/webhooks-woocommerce.js';
import { integrationRouter } from './routes/integration.js';
import { automationsRouter } from './routes/automations.js';
import { publicReviewsRouter } from './routes/public-reviews.js';
import { reviewToolRouter } from './routes/review-tool.js';
import { holdoutRouter } from './routes/holdout.js';
import { knowledgeRouter } from './routes/knowledge.js';
import { erasureRouter } from './routes/erasure.js';
import { onboardingRouter, observationRouter, previewRouter } from './routes/onboarding.js';
import { buildReadinessReport } from './lib/config-check.js';

const PORT = Number(process.env.API_PORT) || 3003;
const HOST = process.env.API_HOST || '0.0.0.0';

const app = express();

// Global middleware
app.use(helmet());
app.use(compression());
// Wildcard origin is intentional: merchant storefronts embed the SDK from
// arbitrary domains, so the public endpoints must be callable cross-origin.
// Safety relies on (a) credentials never being reflected, and (b) abuse-prone
// endpoints having their own scoped rate limiters. Auth uses Bearer tokens
// which browsers never attach automatically.
app.use(cors({ origin: '*', credentials: false }));
// We capture rawBody so downstream HMAC checks (Shopify, WooCommerce, etc.)
// can verify signatures against the exact bytes Shopify sent. Without this,
// JSON.parse/re-stringify would invalidate the HMAC.
app.use(express.json({
  limit: '50mb',
  verify: (req: Request & { rawBody?: Buffer }, _res, buf) => {
    req.rawBody = Buffer.from(buf);
  },
}));
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

// Public demo endpoint (no auth, rate-limited)
app.use('/api/public/outbound', publicOutboundRouter);
app.use('/api/public/reviews', publicReviewsRouter);
app.use('/api/review-tool', reviewToolRouter);
app.use('/api/holdout', holdoutRouter);
app.use('/api/knowledge', authMiddleware, knowledgeRouter);
app.use('/api/erasure', authMiddleware, erasureRouter);
app.use('/api/onboarding', onboardingRouter);
app.use('/api/observation', observationRouter);
app.use('/api/preview', previewRouter);

// Store creation (no auth — admin endpoint)
app.use('/api/stores', storesRouter);

// Widget-facing routes: accept the publishable key (pk_) OR the secret key.
// Safe to call from a storefront. See widgetAuth.
app.use('/api/search', widgetAuth, searchRouter);
app.use('/api/search/assist', widgetAuth, searchAssistRouter);
app.use('/api/chat', widgetAuth, chatRouter);
// Retour de stock : POST public (widgetAuth dans le router), GET admin (auth secrète dans le router).
app.use('/api/stock-alerts', stockAlertsRouter);

// Authenticated routes (secret key only)
app.use('/api/taxonomy', authMiddleware, taxonomyRouter);
app.use('/api/pipeline', authMiddleware, pipelineRouter);
app.use('/api/analytics', authMiddleware, analyticsRouter);
app.use('/api/analytics/chat', authMiddleware, chatAnalyticsRouter);
app.use('/api/feedback', authMiddleware, feedbackRouter);
app.use('/api/mail', authMiddleware, mailRouter);
app.use('/api/reviews', authMiddleware, reviewsRouter);
app.use('/api/universe', authMiddleware, universeGenRouter);
app.use('/api/catalog', authMiddleware, catalogImportRouter);
app.use('/api/catalog/cross-sell', authMiddleware, crossSellRouter);
app.use('/api/outbound', authMiddleware, outboundRouter);
app.use('/api/sav', authMiddleware, savRouter);
app.use('/api/orders', authMiddleware, ordersTrackingRouter);
app.use('/api/cart-recovery', authMiddleware, cartRecoveryRouter);
app.use('/api/emails', authMiddleware, emailsRouter);
app.use('/api/webhooks', webhooksInboundRouter);
app.use('/api/admin-stats', authMiddleware, adminStatsRouter);
app.use('/api/webhooks/shopify', webhooksShopifyRouter);
app.use('/api/webhooks/woocommerce', webhooksWooCommerceRouter);
app.use('/api/integration', authMiddleware, integrationRouter);
app.use('/api/automations', authMiddleware, automationsRouter);

// Error handler
app.use(errorHandler);

// Startup
async function start() {
  // Configuration readiness: log loudly which integrations are real vs mock so
  // an operator never assumes a degraded build is production-ready.
  const readiness = buildReadinessReport();
  for (const item of readiness.items) {
    const line = `config.${item.key}: ${item.detail}`;
    if (item.level === 'degraded') logger.warn(line);
    else logger.info(line);
  }
  if (!readiness.productionReady) {
    logger.warn('config: NOT production-ready (a required integration is in mock/degraded mode — see warnings above)');
  } else {
    logger.info('config: production-ready');
  }

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
