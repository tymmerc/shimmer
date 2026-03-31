/**
 * Redis-backed rate limiter.
 */

import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { getRedis } from '@shimmer/core';

export function createRateLimiter() {
  const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS) || 60_000;
  const max = Number(process.env.RATE_LIMIT_MAX) || 100;

  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore({
      sendCommand: (...args: string[]) => getRedis().call(...args) as any,
    }),
    message: { error: 'Too many requests', code: 'RATE_LIMIT' },
  });
}
