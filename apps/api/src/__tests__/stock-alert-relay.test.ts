/**
 * La double confirmation ne doit pas servir de relais d'e-mails : produit du
 * catalogue obligatoire, texte du visiteur jamais repris, plafond par adresse,
 * jeton jamais gardé en base.
 */
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import express from 'express';
import type { AddressInfo } from 'net';
import type { Server } from 'http';

const sent: Array<Record<string, unknown>> = [];
const redisKeys = new Map<string, number>();
const alerts: Array<Record<string, unknown>> = [];
vi.mock('@shimmer/core', async (orig) => ({
  ...(await orig<typeof import('@shimmer/core')>()),
  getPrisma: () => ({
    store: { findUnique: vi.fn(async () => ({ id: 4, name: 'Caves Forty-Two', config: {} })) },
    product: {
      findFirst: vi.fn(async ({ where }: { where: Record<string, unknown> }) =>
        where.platformProductId === '111' ? { id: 5, name: 'Brouilly 2022' } : null),
    },
    platformVariantStock: { findUnique: vi.fn(async () => null) },
    stockAlert: {
      findFirst: vi.fn(async () => null),
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => { alerts.push(data); return { id: alerts.length }; }),
      deleteMany: vi.fn(async () => ({ count: 1 })),
    },
  }),
  getRedis: () => ({
    set: vi.fn(async (k: string) => { if (redisKeys.has(k)) return null; redisKeys.set(k, 1); return 'OK'; }),
    incr: vi.fn(async (k: string) => { const n = (redisKeys.get(k) ?? 0) + 1; redisKeys.set(k, n); return n; }),
    expire: vi.fn(async () => 1),
  }),
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));
vi.mock('@shimmer/email-connector', () => ({
  isEmailConfigured: () => true,
  sendEmail: vi.fn(async (input: Record<string, unknown>) => { sent.push(input); return { id: 1, status: 'sent' }; }),
}));
vi.mock('../middleware/rate-limiter.js', () => ({
  createScopedRateLimiter: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}));
process.env.SHIMMER_PK_SECRET = 'test-pk-secret';

const { stockAlertsRouter } = await import('../routes/stock-alerts.js');
const { derivePublishableKey } = await import('../lib/publishable-key.js');
let server: Server;
let base: string;
beforeAll(() => {
  const app = express();
  app.use(express.json());
  app.use('/api/stock-alerts', stockAlertsRouter);
  server = app.listen(0);
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => server.close());
beforeEach(() => { sent.length = 0; alerts.length = 0; redisKeys.clear(); });

const subscribe = (body: Record<string, unknown>) => fetch(`${base}/api/stock-alerts`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${derivePublishableKey(4)}`, 'X-Shimmer-Store': '4' },
  body: JSON.stringify({ email: 'victime@mail.fr', ...body }),
});

describe('POST /api/stock-alerts (double confirmation)', () => {
  it('produit inconnu du catalogue : refusé, aucun e-mail', async () => {
    const r = await subscribe({ platformVariantId: 'p:999', variantLabel: 'Votre compte est bloqué, cliquez http://x' });
    expect(r.status).toBe(400);
    expect(sent).toHaveLength(0);
  });
  it('produit connu : e-mail au nom du catalogue, jamais le libellé du visiteur ni le jeton en base', async () => {
    const r = await subscribe({ platformVariantId: 'p:111', variantLabel: 'Votre compte est bloqué, cliquez http://x' });
    expect(await r.json()).toEqual({ ok: true, confirm: true });
    expect(sent).toHaveLength(1);
    expect(String(sent[0]!.bodyText)).toContain('Brouilly 2022');
    expect(String(sent[0]!.bodyText)).not.toContain('bloqué');
    expect(String(sent[0]!.bodyText)).toMatch(/token=[A-Za-z0-9_-]{32}/);
    expect(String(sent[0]!.storedBodyText)).not.toMatch(/token=/);
  });
  it('une confirmation par adresse et par jour : la seconde demande n\'envoie rien, même réponse', async () => {
    await subscribe({ platformVariantId: 'p:111' });
    const r = await subscribe({ platformVariantId: 'p:111' });
    expect(await r.json()).toEqual({ ok: true, confirm: true });
    expect(sent).toHaveLength(1);
  });
});
