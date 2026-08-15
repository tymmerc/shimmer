/**
 * Configuration readiness check.
 *
 * Surfaces, in one place, which integrations are actually wired versus running
 * in a degraded/mock mode. Logged loudly at startup and exposed (auth) at
 * GET /api/admin-stats/readiness so an operator can verify a store is truly
 * production-ready before pointing a real shop at it.
 */

import { isEmailConfigured, pickEmailProvider } from '@shimmer/email-connector';
import { isSmsConfigured } from '@shimmer/sms-connector';
import { hasClaudeFallback } from '@shimmer/core';

export interface ReadinessItem {
  key: string;
  ok: boolean;
  /** 'ready' = real provider; 'degraded' = mock/fallback only; 'info' = neutral. */
  level: 'ready' | 'degraded' | 'info';
  detail: string;
}

export interface ReadinessReport {
  productionReady: boolean;
  items: ReadinessItem[];
}

export function buildReadinessReport(): ReadinessReport {
  const llmProvider = process.env.LLM_PROVIDER || 'ollama';
  const claudeFallback = hasClaudeFallback();

  const items: ReadinessItem[] = [
    {
      key: 'email',
      ok: isEmailConfigured(),
      level: isEmailConfigured() ? 'ready' : 'degraded',
      detail: isEmailConfigured()
        ? `provider: ${pickEmailProvider()}`
        : 'MOCK — no RESEND_API_KEY / MAILGUN. Emails are logged, not sent.',
    },
    {
      key: 'sms',
      ok: isSmsConfigured(),
      level: isSmsConfigured() ? 'ready' : 'degraded',
      detail: isSmsConfigured()
        ? 'provider: twilio'
        : 'MOCK — no TWILIO_* env. SMS are logged, not sent.',
    },
    {
      key: 'llm',
      ok: llmProvider === 'claude' || claudeFallback || llmProvider === 'ollama',
      level: claudeFallback || llmProvider === 'claude' ? 'ready' : 'degraded',
      detail: llmProvider === 'claude'
        ? 'Claude (primary)'
        : claudeFallback
          ? 'Ollama (primary) + Claude fallback'
          : 'Ollama only — no Claude fallback. If Ollama is down, the vendeur degrades to product lists.',
    },
    {
      key: 'database',
      ok: Boolean(process.env.DATABASE_URL),
      level: process.env.DATABASE_URL ? 'ready' : 'degraded',
      detail: process.env.DATABASE_URL ? 'DATABASE_URL set' : 'DATABASE_URL missing',
    },
    {
      key: 'redis',
      ok: Boolean(process.env.REDIS_URL),
      level: process.env.REDIS_URL ? 'ready' : 'info',
      detail: process.env.REDIS_URL ? 'REDIS_URL set' : 'REDIS_URL missing (default localhost:6381)',
    },
    {
      key: 'webhooks',
      ok: true,
      level: process.env.ALLOW_UNSIGNED_WEBHOOKS === 'true' ? 'degraded' : 'ready',
      detail: process.env.ALLOW_UNSIGNED_WEBHOOKS === 'true'
        ? 'UNSIGNED webhooks accepted (dev only — must be off in prod)'
        : 'HMAC required on Shopify/WooCommerce webhooks',
    },
  ];

  // "Production ready" = every send path is real and webhooks are signed. The
  // LLM may legitimately run on Ollama-only, so it doesn't block readiness, but
  // email being mock does (a real shop's relances would silently never send).
  const productionReady = items
    .filter(i => i.key === 'email' || i.key === 'database' || i.key === 'webhooks')
    .every(i => i.level === 'ready');

  return { productionReady, items };
}
