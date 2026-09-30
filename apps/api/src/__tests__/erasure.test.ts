import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import express from 'express';
import type { AddressInfo } from 'net';
import type { Server } from 'http';

// RGPD (30/09) : une personne sans fiche client s'efface par son e-mail, et
// les alertes de retour de stock et les SMS partent aussi.
const calls: Record<string, unknown[]> = {};
const del = (name: string, count = 1) => vi.fn(async (args: unknown) => { (calls[name] ??= []).push(args); return { count }; });
let customer: Record<string, unknown> | null = null;
const fakePrisma = {
  customer: { findFirst: vi.fn(async () => customer), delete: vi.fn(async () => ({})) },
  chatSession: { deleteMany: del('chatSession') },
  stockAlert: { deleteMany: del('stockAlert', 2) },
  abandonedCart: { deleteMany: del('abandonedCart') },
  sentEmail: { deleteMany: del('sentEmail') },
  sentSms: { deleteMany: del('sentSms') },
  mailQueue: { deleteMany: del('mailQueue') },
  review: { findMany: vi.fn(async () => []), deleteMany: del('review', 0) },
  reviewRequest: { deleteMany: del('reviewRequest', 0) },
  savRequest: { deleteMany: del('savRequest', 0) },
  knowledgeChunk: { deleteMany: del('knowledgeChunk', 0) },
  order: { deleteMany: del('order') },
  $executeRaw: vi.fn(async () => 0),
};
vi.mock('@shimmer/core', async (orig) => ({ ...(await orig<typeof import('@shimmer/core')>()), getPrisma: () => fakePrisma, logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

const { erasureRouter } = await import('../routes/erasure.js');
const { errorHandler } = await import('../middleware/error-handler.js');
let server: Server;
let base: string;
beforeAll(() => {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => { (req as { storeId?: number }).storeId = 4; next(); });
  app.use('/api/erasure', erasureRouter);
  app.use(errorHandler);
  server = app.listen(0);
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => server.close());
beforeEach(() => { for (const k of Object.keys(calls)) delete calls[k]; });
const erase = (body: unknown) => fetch(`${base}/api/erasure`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

describe('POST /api/erasure', () => {
  it('sans fiche client : efface par l\'e-mail (alertes, paniers, e-mails), sans casse', async () => {
    customer = null;
    const res = await erase({ email: 'Chloe@Mail.fr' });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.deleted.stockAlerts).toBe(2);
    expect(calls.stockAlert![0]).toEqual({ where: { storeId: 4, email: { equals: 'chloe@mail.fr', mode: 'insensitive' } } });
    expect(calls.abandonedCart).toHaveLength(1);
    expect(calls.sentEmail).toHaveLength(1);
    expect(calls.order).toBeUndefined();
  });
  it('avec fiche : SMS au numéro du client effacés aussi', async () => {
    customer = { id: 40, email: 'pierre@mail.fr', phone: '+33612345678' };
    const res = await erase({ customerId: 40 });
    expect(res.status).toBe(200);
    expect(calls.sentSms![0]).toEqual({ where: { storeId: 4, toNumber: '+33612345678' } });
    expect(calls.stockAlert).toHaveLength(1);
    expect(calls.order).toHaveLength(1);
  });
  it('id inconnu sans e-mail : 404', async () => {
    customer = null;
    expect((await erase({ customerId: 999 })).status).toBe(404);
  });
});
