/**
 * Cross-sell auth scopes: the two widget routes (product lookup, events) accept
 * a publishable key (pk_), everything else (generate, stats, analytics…) stays
 * secret-key only. The app below reproduces the mount order of src/index.ts,
 * where the widget router MUST come before `/api/catalog` + authMiddleware.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import express, { Router } from 'express';
import type { AddressInfo } from 'net';
import type { Server } from 'http';

const SECRET_KEY = 'sk_test_cross_sell_secret';
const STORE_ID = 4;

const createMany = vi.fn(async () => ({ count: 1 }));

const fakePrisma = {
  store: {
    findUnique: vi.fn(async ({ where }: { where: { apiKey?: string; id?: number } }) => {
      if (where.apiKey === SECRET_KEY || where.id === STORE_ID || where.id === 5) {
        const id = where.id ?? STORE_ID;
        return { id, name: `Store ${id}`, config: {} };
      }
      return null;
    }),
  },
  product: { findFirst: vi.fn(async () => null) },
  crossSellEvent: { createMany },
  productCrossSell: { count: vi.fn(async () => 0) },
  $queryRawUnsafe: vi.fn(async () => []),
};

vi.mock('@shimmer/core', () => ({
  getPrisma: () => fakePrisma,
  ClaudeClient: class {},
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

process.env.SHIMMER_PK_SECRET = 'test-pk-secret';

const { authMiddleware } = await import('../middleware/auth.js');
const { crossSellRouter, crossSellWidgetRouter } = await import('../routes/cross-sell.js');
const { derivePublishableKey } = await import('../lib/publishable-key.js');

let server: Server;
let base: string;

beforeAll(async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/catalog/cross-sell', crossSellWidgetRouter);
  app.use('/api/catalog', authMiddleware, Router());
  app.use('/api/catalog/cross-sell', authMiddleware, crossSellRouter);
  server = app.listen(0);
  await new Promise<void>((resolve) => server.once('listening', () => resolve()));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/catalog/cross-sell`;
});

afterAll(() => {
  server?.close();
});

beforeEach(() => {
  createMany.mockClear();
});

function pkHeaders(storeHeader: number = STORE_ID): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${derivePublishableKey(STORE_ID)}`,
    'X-Shimmer-Store': String(storeHeader),
  };
}

const oneEvent = {
  product_id: 1, target_id: 2, role: 'apero', event_type: 'impression', session_id: 'sess-0001',
};

describe('cross-sell widget routes with a publishable key', () => {
  it('lets GET /product/:id through (404 on an unknown product, not 401)', async () => {
    const res = await fetch(`${base}/product/1`, { headers: pkHeaders() });
    expect(res.status).toBe(404);
  });

  it('records POST /events for the store the key belongs to', async () => {
    const res = await fetch(`${base}/events`, {
      method: 'POST', headers: pkHeaders(), body: JSON.stringify({ events: [oneEvent] }),
    });
    expect(res.status).toBe(204);
    expect(createMany).toHaveBeenCalledTimes(1);
    const rows = (createMany.mock.calls[0] as unknown as [{ data: Array<{ storeId: number }> }])[0].data;
    expect(rows.every((r) => r.storeId === STORE_ID)).toBe(true);
  });

  it('rejects a pk_ used with another store id', async () => {
    const res = await fetch(`${base}/product/1`, { headers: pkHeaders(5) });
    expect(res.status).toBe(401);
  });

  it('rejects a request without any key', async () => {
    const res = await fetch(`${base}/product/1`);
    expect(res.status).toBe(401);
  });
});

describe('cross-sell admin routes stay secret-only', () => {
  it.each([
    ['GET', '/analytics'],
    ['GET', '/stats'],
    ['POST', '/generate'],
    ['DELETE', '/'],
  ])('%s %s refuses a publishable key', async (method, path) => {
    const res = await fetch(`${base}${path}`, { method, headers: pkHeaders() });
    expect(res.status).toBe(401);
  });

  it('still serves the admin routes with the secret key', async () => {
    const res = await fetch(`${base}/stats`, { headers: { Authorization: `Bearer ${SECRET_KEY}` } });
    expect(res.status).toBe(200);
  });

  it('still serves the widget routes with the secret key', async () => {
    const res = await fetch(`${base}/product/1`, { headers: { Authorization: `Bearer ${SECRET_KEY}` } });
    expect(res.status).toBe(404);
  });
});
