/**
 * Cloisonnement entre boutiques (audit du 30/09) : avec sa clé secrète, la
 * boutique 4 ne doit jamais toucher un client, une commande, un avis ou un
 * produit de la boutique 5. Et le témoin (holdout) exige la clé du widget.
 * L'app ci-dessous reproduit les montages de src/index.ts.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import express from 'express';
import type { AddressInfo } from 'net';
import type { Server } from 'http';

const KEYS: Record<string, number> = { sk_store4: 4, sk_store5: 5, sk_store1: 1 };
// Données : client 40 et commande 400 à la boutique 4 ; client 50, commande 500, avis 5000, produit 5001 à la boutique 5.
const customers = [{ id: 40, storeId: 4 }, { id: 50, storeId: 5 }];
const orders = [{ id: 400, storeId: 4, customerId: 40 }, { id: 500, storeId: 5, customerId: 50 }];
const reviews = [{ id: 5000, storeId: 5, status: 'APPROVED' }];
const products = [{ id: 5001, storeId: 5, name: 'Secret' }];
const created: Record<string, unknown[]> = { sav: [], carts: [], rr: [], holdout: [], stores: [] };
let configPatch: { set?: string; unset?: string[] } = {};

const match = (row: Record<string, unknown>, where: Record<string, unknown>) =>
  Object.entries(where).every(([k, v]) => (v && typeof v === 'object' && 'in' in (v as object) ? (v as { in: unknown[] }).in.includes(row[k]) : row[k] === v));

const fakePrisma = {
  store: {
    findUnique: vi.fn(async ({ where }: { where: { apiKey?: string; id?: number } }) => {
      const id = where.apiKey ? KEYS[where.apiKey] : where.id;
      return id ? { id, name: `Store ${id}`, config: { tone: 'vous' } } : null;
    }),
    create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
      created.stores.push(data);
      return { id: 9, name: data.name, apiKey: data.apiKey, config: data.config, createdAt: new Date() };
    }),
  },
  customer: { findFirst: vi.fn(async ({ where }: { where: Record<string, unknown> }) => customers.find((c) => match(c, where)) ?? null) },
  order: { findFirst: vi.fn(async ({ where }: { where: Record<string, unknown> }) => orders.find((o) => match(o, where)) ?? null) },
  savRequest: { create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => { created.sav.push(data); return { id: 1, ...data }; }) },
  abandonedCart: { create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => { created.carts.push(data); return { id: 1, ...data }; }) },
  reviewRequest: {
    findFirst: vi.fn(async () => null),
    create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => { created.rr.push(data); return { id: 77, ...data }; }),
    updateMany: vi.fn(async ({ where }: { where: { id: number; storeId: number } }) => ({ count: where.id === 77 && where.storeId === 4 ? 1 : 0 })),
  },
  review: { findFirst: vi.fn(async ({ where }: { where: Record<string, unknown> }) => reviews.find((r) => match(r, where)) ?? null) },
  reviewPublication: { findFirst: vi.fn(async () => null), create: vi.fn(async () => ({ id: 1 })), update: vi.fn(async () => ({ id: 1 })) },
  product: {
    findFirst: vi.fn(async ({ where }: { where: Record<string, unknown> }) => products.find((p) => match(p, where)) ?? null),
    findMany: vi.fn(async ({ where }: { where: Record<string, unknown> }) => products.filter((p) => match(p, where)).map((p) => ({ ...p, usages: [] }))),
  },
  holdoutVisitor: {
    upsert: vi.fn(async ({ create }: { create: Record<string, unknown> }) => { created.holdout.push(create); return create; }),
    updateMany: vi.fn(async () => ({ count: 0 })),
  },
  $executeRaw: vi.fn(async (_s: TemplateStringsArray, unset: string[], set: string) => { configPatch = { set, unset }; return 1; }),
};

vi.mock('@shimmer/core', async (importOriginal) => {
  const real = await importOriginal<typeof import('@shimmer/core')>();
  return {
    ...real,
    getPrisma: () => fakePrisma,
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), child: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }) },
  };
});
vi.mock('../middleware/rate-limiter.js', () => ({
  createScopedRateLimiter: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}));
vi.mock('../lib/automations/queue.js', () => ({
  enqueueSavEscalationCheck: vi.fn(async () => undefined),
  enqueueCartReminders: vi.fn(async () => undefined),
}));
vi.mock('../lib/automations/tick.js', () => ({
  runAutomationTick: vi.fn(async () => ({ ran: true })),
  getLastReport: () => ({ global: true }),
  setLastReport: () => undefined,
}));
vi.mock('@shimmer/email-connector', () => ({ sendEmail: vi.fn(async () => ({ id: 1, status: 'mock' })) }));

process.env.SHIMMER_PK_SECRET = 'test-pk-secret';

const { authMiddleware } = await import('../middleware/auth.js');
const { errorHandler } = await import('../middleware/error-handler.js');
const { storesRouter } = await import('../routes/stores.js');
const { savRouter } = await import('../routes/sav.js');
const { cartRecoveryRouter } = await import('../routes/cart-recovery.js');
const { reviewsRouter } = await import('../routes/reviews.js');
const { holdoutRouter } = await import('../routes/holdout.js');
const { pipelineRouter } = await import('../routes/pipeline.js');
const { automationsRouter } = await import('../routes/automations.js');
const { derivePublishableKey } = await import('../lib/publishable-key.js');

let server: Server;
let base: string;

beforeAll(async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/holdout', holdoutRouter);
  app.use('/api/stores', storesRouter);
  app.use('/api/pipeline', authMiddleware, pipelineRouter);
  app.use('/api/reviews', authMiddleware, reviewsRouter);
  app.use('/api/sav', authMiddleware, savRouter);
  app.use('/api/cart-recovery', authMiddleware, cartRecoveryRouter);
  app.use('/api/automations', authMiddleware, automationsRouter);
  app.use(errorHandler);
  server = app.listen(0);
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => server.close());

async function call(method: string, path: string, body?: unknown, key = 'sk_store4') {
  const res = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(key ? { Authorization: `Bearer ${key}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, json: await res.json().catch(() => null) as Record<string, unknown> | null };
}

describe('SAV', () => {
  it('refuse un client ou une commande d\'une autre boutique', async () => {
    expect((await call('POST', '/api/sav/tickets', { customerId: 50, type: 'question', description: 'Bonjour' })).status).toBe(404);
    expect((await call('POST', '/api/sav/tickets', { customerId: 40, orderId: 500, type: 'question', description: 'Bonjour' })).status).toBe(404);
    expect(created.sav).toHaveLength(0);
  });
  it('accepte son propre client et sa propre commande', async () => {
    expect((await call('POST', '/api/sav/tickets', { customerId: 40, orderId: 400, type: 'question', description: 'Bonjour' })).status).toBe(200);
    expect(created.sav).toHaveLength(1);
  });
});

describe('relances panier', () => {
  it('refuse le client d\'une autre boutique', async () => {
    const r = await call('POST', '/api/cart-recovery/abandon', { customerId: 50, items: [{ name: 'x', price: 1 }], totalAmount: 1 });
    expect(r.status).toBe(404);
    expect(created.carts).toHaveLength(0);
  });
});

describe('avis', () => {
  it('pas de demande sur la commande d\'une autre boutique', async () => {
    expect((await call('POST', '/api/reviews/request', { orderId: 500, customerId: 50 })).status).toBe(404);
    expect(created.rr).toHaveLength(0);
  });
  it('sa propre demande : créée, sans le jeton dans la réponse', async () => {
    const r = await call('POST', '/api/reviews/request', { orderId: 400, customerId: 40 });
    expect(r.status).toBe(200);
    expect(r.json).not.toHaveProperty('token');
    expect(created.rr[0]).toHaveProperty('token');
  });
  it('marquer envoyée ou publier chez une autre boutique : 404', async () => {
    expect((await call('POST', '/api/reviews/request/77/send', {}, 'sk_store5')).status).toBe(404);
    expect((await call('POST', '/api/reviews/5000/publish', { targets: ['PRODUCT_PAGE'] })).status).toBe(404);
  });
});

describe('pipeline', () => {
  it('ne lit ni n\'enrichit le produit d\'une autre boutique', async () => {
    expect((await call('POST', '/api/pipeline/enrich/5001', {})).status).toBe(404);
    const r = await call('POST', '/api/pipeline/score', { productIds: [5001], usageCodes: ['x'] });
    expect(r.json?.products).toEqual([]);
  });
});

describe('automatisations', () => {
  it('le balayage de toutes les boutiques est réservé à l\'opérateur', async () => {
    expect((await call('POST', '/api/automations/run', {})).status).toBe(403);
    expect((await call('POST', '/api/automations/run', {}, 'sk_store1')).status).toBe(200);
  });
});

describe('témoin (holdout)', () => {
  it('enrôlement sans clé : 401, rien n\'est écrit', async () => {
    expect((await call('POST', '/api/holdout/track', { visitorId: 'v_abcdef', store: 4, trigger: 'search' }, '')).status).toBe(401);
    expect(created.holdout).toHaveLength(0);
  });
  it('décision sans clé : publique (calcul pur, aucune écriture)', async () => {
    expect((await call('GET', '/api/holdout/decision?store=4&visitorId=v_abcdef', undefined, '')).status).toBe(200);
    expect(created.holdout).toHaveLength(0);
  });
  it('la pk_ d\'une boutique ne signe pas pour une autre', async () => {
    const r = await call('POST', '/api/holdout/track', { visitorId: 'v_abcdef', store: 5 }, derivePublishableKey(4));
    expect(r.status).toBe(401);
  });
  it('avec la pk_ de la boutique : décision et enrôlement', async () => {
    const pk = derivePublishableKey(4);
    expect((await call('GET', '/api/holdout/decision?store=4&visitorId=v_abcdef', undefined, pk)).status).toBe(200);
    expect((await call('POST', '/api/holdout/track', { visitorId: 'v_abcdef', store: 4, trigger: 'search' }, pk)).status).toBe(200);
    expect(created.holdout[0]).toMatchObject({ storeId: 4, visitorId: 'v_abcdef' });
  });
});

describe('inscription et config', () => {
  it('refuse un config libre (tarif, phase, témoin, critères)', async () => {
    for (const extra of [{ billing: { floorEUR: 0 } }, { shimmer_phase: 'live' }, { holdout: { enabled: false } }, { universe_overrides: {} }]) {
      const r = await call('POST', '/api/stores', { name: 'Test', config: { ownerEmail: 'a@b.fr', ...extra } }, '');
      expect(r.status).toBe(400);
    }
    expect(created.stores).toHaveLength(0);
  });
  it('inscription normale : phase forcée à ingesting, pas de config en retour', async () => {
    const r = await call('POST', '/api/stores', { name: 'Test', config: { ownerEmail: 'a@b.fr', vertical: 'wines', platform: 'shopify', createdVia: 'signup-v4' } }, '');
    expect(r.status).toBe(201);
    expect(r.json).toHaveProperty('apiKey');
    expect(r.json).not.toHaveProperty('config');
    expect((created.stores[0] as { config: Record<string, unknown> }).config.shimmer_phase).toBe('ingesting');
  });
  it('PATCH /me/config : id de critère piégé refusé, patch atomique sinon', async () => {
    const bad = await call('PATCH', '/api/stores/me/config', { universe_overrides: { VIN: { criteria_add: [{ id: "x' OR 1=1 --" }] } } });
    expect(bad.status).toBe(400);
    const ok = await call('PATCH', '/api/stores/me/config', { tone: 'tu', voice: null });
    expect(ok.status).toBe(200);
    expect(JSON.parse(configPatch.set!)).toEqual({ tone: 'tu' });
    expect(configPatch.unset).toEqual(['voice']);
  });
});
