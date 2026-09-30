/**
 * Redis-backed rate limiter.
 */

import type { Request } from 'express';
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { getRedis } from '@shimmer/core';

/**
 * Express 'trust proxy' function. The limiters key on req.ip, and nginx
 * reaches the API from 127.0.0.1, so without this every visitor shares one
 * counter.
 *
 * nginx appends the real client address to X-Forwarded-For. It only knows that
 * address thanks to the real_ip lines of /etc/nginx/nginx.conf, which read the
 * PROXY header of the 443 stream. We trust exactly one hop, the socket peer,
 * and only when it is loopback (nginx). So req.ip is the last entry, entries a
 * client prepends are ignored, a non-loopback caller hitting the port directly
 * gets its socket address, and if nginx ever loses the real address (it then
 * appends 127.0.0.1) we fall back to one shared counter instead of letting the
 * forged entry pick the key. Local processes stay trusted, as they are anyway.
 */
export function trustProxy(addr: string, hop: number): boolean {
  return hop === 0 && (addr === '::1' || addr.startsWith('127.') || addr.startsWith('::ffff:127.'));
}

/**
 * Clé de comptage d'un client. Une IPv4 compte seule ; une IPv6 compte par
 * préfixe /64 : un seul abonné en reçoit des milliards, compter adresse par
 * adresse laissait contourner n'importe quelle limite (audit du 30/09).
 */
export function clientKey(ip: string | undefined): string {
  if (!ip) return 'unknown';
  const addr = ip.split('%')[0].toLowerCase();
  if (addr.startsWith('::ffff:') && addr.includes('.')) return addr.slice(7);
  if (!addr.includes(':')) return addr;
  const [head, tail] = addr.split('::');
  const h = head ? head.split(':') : [];
  const t = tail ? tail.split(':') : [];
  const groups = tail === undefined ? h : [...h, ...Array(Math.max(0, 8 - h.length - t.length)).fill('0'), ...t];
  return `${groups.slice(0, 4).map((g) => g.replace(/^0+(?=.)/, '') || '0').join(':')}::/64`;
}

const byClient = (req: Request) => clientKey(req.ip);

export function createRateLimiter() {
  const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS) || 60_000;
  const max = Number(process.env.RATE_LIMIT_MAX) || 100;

  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: byClient,
    store: new RedisStore({
      sendCommand: (...args: string[]) => getRedis().call(...args) as any,
    }),
    message: { error: 'Too many requests', code: 'RATE_LIMIT' },
  });
}

/**
 * Stricter limiter for abuse-prone public endpoints (signup, demo tools,
 * unauthenticated logging). Each call site picks its own window/max; the
 * prefix isolates the Redis counters from the global limiter and from each
 * other.
 */
export function createScopedRateLimiter(
  prefix: string,
  windowMs: number,
  max: number,
  keyGenerator: (req: Request) => string = byClient,
  options: { skipFailedRequests?: boolean } = {},
) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator,
    skipFailedRequests: options.skipFailedRequests ?? false,
    store: new RedisStore({
      prefix: `rl:${prefix}:`,
      sendCommand: (...args: string[]) => getRedis().call(...args) as any,
    }),
    message: { error: 'Too many requests', code: 'RATE_LIMIT' },
  });
}
