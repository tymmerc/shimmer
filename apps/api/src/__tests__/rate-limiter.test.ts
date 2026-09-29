import { once } from 'node:events';
import { readFileSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
import express from 'express';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// In-memory stand-in for the two Lua scripts rate-limit-redis runs, so the
// test sees exactly which Redis keys each visitor is counted against.
const counters = vi.hoisted(() => new Map<string, number>());

vi.mock('@shimmer/core', () => ({
  getRedis: () => ({
    call: async (command: string, ...args: string[]) => {
      if (command === 'SCRIPT') return args[1].includes('INCR') ? 'increment' : 'get';
      if (command === 'EVALSHA') {
        const [sha, , key] = args;
        if (sha === 'increment') counters.set(key, (counters.get(key) ?? 0) + 1);
        return [counters.get(key) ?? false, 60_000];
      }
      throw new Error(`unexpected redis command: ${command}`);
    },
  }),
}));

import { createRateLimiter, trustProxy } from '../middleware/rate-limiter.js';

/**
 * Start the global limiter on 127.0.0.1, so every request reaches it from a
 * loopback socket exactly like nginx does in production. The caller passes the
 * X-Forwarded-For value nginx would build ($proxy_add_x_forwarded_for).
 */
async function startApi(trust: typeof trustProxy | false) {
  const app = express();
  app.set('trust proxy', trust);
  app.use(createRateLimiter());
  app.get('/ping', (_req, res) => { res.sendStatus(204); });

  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const { port } = server.address() as AddressInfo;

  return {
    hit: async (forwardedFor: string) => {
      const res = await fetch(`http://127.0.0.1:${port}/ping`, {
        headers: { 'x-forwarded-for': forwardedFor },
      });
      return res.status;
    },
    close: () => new Promise<void>((resolve) => {
      server.closeAllConnections();
      server.close(() => resolve());
    }),
  };
}

describe('global rate limiter behind nginx', () => {
  beforeEach(() => {
    counters.clear();
    vi.stubEnv('RATE_LIMIT_MAX', '3');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('counts each visitor under their own address, not the proxy one', async () => {
    const api = await startApi(trustProxy);
    try {
      await api.hit('203.0.113.10');
      await api.hit('203.0.113.10');
      await api.hit('198.51.100.20');
    } finally {
      await api.close();
    }

    expect(Object.fromEntries(counters)).toEqual({
      'rl:203.0.113.10': 2,
      'rl:198.51.100.20': 1,
    });
  });

  it('one visitor spending the whole quota does not block the others', async () => {
    const api = await startApi(trustProxy);
    try {
      const burst = [];
      for (let i = 0; i < 4; i++) burst.push(await api.hit('203.0.113.10'));
      expect(burst).toEqual([204, 204, 204, 429]);

      expect(await api.hit('198.51.100.20')).toBe(204);
    } finally {
      await api.close();
    }
  });

  it('ignores addresses a client prepends to X-Forwarded-For', async () => {
    const api = await startApi(trustProxy);
    try {
      // nginx appends the real address after whatever the client sent, so
      // rotating the forged part must not buy a fresh counter.
      const statuses = [];
      for (const forged of ['1.1.1.1', '2.2.2.2', '3.3.3.3', '4.4.4.4']) {
        statuses.push(await api.hit(`${forged}, 203.0.113.10`));
      }
      expect(statuses).toEqual([204, 204, 204, 429]);
    } finally {
      await api.close();
    }

    expect([...counters.keys()]).toEqual(['rl:203.0.113.10']);
  });

  it('falls back to the shared counter if nginx loses the real address', async () => {
    // Without the real_ip lines of nginx.conf (e.g. a rollback to sslh), nginx
    // appends 127.0.0.1. Trusting that hop too would hand the key to the
    // forged entry; we only trust the socket peer, so nobody gets a free pass.
    const api = await startApi(trustProxy);
    try {
      for (const forged of ['1.1.1.1', '2.2.2.2', '3.3.3.3']) {
        await api.hit(`${forged}, 127.0.0.1`);
      }
    } finally {
      await api.close();
    }

    expect(Object.fromEntries(counters)).toEqual({ 'rl:127.0.0.1': 3 });
  });

  it('is wired into the API entry point', () => {
    // index.ts starts the server on import, so check the wiring in its source.
    const source = readFileSync(new URL('../index.ts', import.meta.url), 'utf8');
    expect(source).toContain("app.set('trust proxy', trustProxy);");
  });

  it('without trust proxy every visitor shares the proxy counter (the bug)', async () => {
    // express-rate-limit logs ERR_ERL_UNEXPECTED_X_FORWARDED_FOR here.
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const api = await startApi(false);
    try {
      for (let i = 0; i < 3; i++) await api.hit('203.0.113.10');
      expect(await api.hit('198.51.100.20')).toBe(429);
    } finally {
      await api.close();
    }

    expect([...counters.keys()]).toEqual(['rl:127.0.0.1']);
  });
});
