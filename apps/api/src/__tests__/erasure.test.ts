import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import express from 'express';
import type { AddressInfo } from 'net';
import type { Server } from 'http';

// RGPD (30/09) : e-mail comparé sans casse ni joker, personne sans fiche
// effacée par son e-mail, alertes de retour de stock, SMS et conversations
// rattachées aux commandes effacés aussi.
type Sql = { text: string; values: unknown[] };
const raw: Sql[] = [];
const sqlOf = (strings: TemplateStringsArray, values: unknown[]): Sql => ({ text: strings.join('$'), values });
const calls: Record<string, unknown[]> = {};
const del = (name: string, count = 1) => vi.fn(async (args: unknown) => { (calls[name] ??= []).push(args); return { count }; });
let customerRow: Record<string, unknown> | null = null;
let customerIdByEmail: number | null = null;
let sessions: Array<{ id: number; session_token: string }> = [];
const fakePrisma = {
  customer: { findFirst: vi.fn(async () => customerRow), delete: vi.fn(async () => ({})) },
  order: { findMany: vi.fn(async () => [{ id: 400 }]), deleteMany: del('order') },
  chatSession: { deleteMany: del('chatSession') },
  searchSession: { deleteMany: del('searchSession', 3) },
  review: { findMany: vi.fn(async () => []), deleteMany: del('review', 0) },
  reviewRequest: { deleteMany: del('reviewRequest', 0) },
  savRequest: { deleteMany: del('savRequest', 0) },
  knowledgeChunk: { deleteMany: del('knowledgeChunk', 0) },
  $queryRaw: vi.fn(async (strings: TemplateStringsArray, ...values: unknown[]) => {
    const q = sqlOf(strings, values);
    raw.push(q);
    if (q.text.includes('FROM customers')) return customerIdByEmail ? [{ id: customerIdByEmail }] : [];
    if (q.text.includes('FROM chat_sessions')) return sessions;
    return [];
  }),
  $executeRaw: vi.fn(async (strings: TemplateStringsArray, ...values: unknown[]) => { raw.push(sqlOf(strings, values)); return 2; }),
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
beforeEach(() => {
  raw.length = 0; sessions = []; customerRow = null; customerIdByEmail = null;
  for (const k of Object.keys(calls)) delete calls[k];
});
const erase = async (body: unknown) => {
  const res = await fetch(`${base}/api/erasure`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return { status: res.status, body: (await res.json()) as Record<string, any> };
};
const deletes = (table: string) => raw.filter((q) => q.text.includes(`DELETE FROM ${table}`));

describe('POST /api/erasure', () => {
  it('sans fiche : efface par l\'e-mail en minuscules, en égalité exacte (jamais ILIKE)', async () => {
    const r = await erase({ email: 'John_Doe@Mail.fr' });
    expect(r.status).toBe(200);
    expect(r.body.partial).toBe(true);
    for (const t of ['stock_alerts', 'sent_emails', 'mail_queue', 'abandoned_carts']) {
      expect(deletes(t)).toHaveLength(1);
      expect(deletes(t)[0]!.values).toContain('john_doe@mail.fr');
    }
    expect(raw.some((q) => /ILIKE|LIKE/i.test(q.text))).toBe(false);
    expect(calls.order).toBeUndefined();
  });
  it('fiche retrouvée malgré la casse : effacement complet, pas un faux succès partiel', async () => {
    customerIdByEmail = 40;
    customerRow = { id: 40, email: 'jean@ex.com', phone: '+33 6 12 34 56 78' };
    const r = await erase({ email: 'JEAN@EX.COM' });
    expect(r.body.partial).toBeUndefined();
    expect(r.body.customerId).toBe(40);
    expect(calls.order).toHaveLength(1);
    expect(deletes('sent_sms')[0]!.values).toContain('612345678');
  });
  it('conversations rattachées aux commandes du client et leurs recherches effacées', async () => {
    customerRow = { id: 40, email: 'jean@ex.com', phone: null };
    sessions = [{ id: 7, session_token: 'tok-7' }];
    const r = await erase({ customerId: 40 });
    const chatQuery = raw.find((q) => q.text.includes('FROM chat_sessions'))!;
    expect(chatQuery.text).toContain('attributed_order_id = ANY');
    expect(chatQuery.values).toContainEqual([400]);
    expect(calls.searchSession![0]).toEqual({ where: { storeId: 4, sessionToken: { in: ['tok-7'] } } });
    expect(r.body.deleted.searchSessions).toBe(3);
  });
  it('id inconnu sans e-mail : 404', async () => {
    expect((await erase({ customerId: 999 })).status).toBe(404);
  });
});
