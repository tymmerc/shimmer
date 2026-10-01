import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import express from 'express';
import type { AddressInfo } from 'net';
import type { Server } from 'http';

// Formulaire d'audit de la landing (01/10) : POST /api/public/leads garde la
// demande (table leads, si elle existe) puis prévient le fondateur par Resend.
// La base est simulée (requêtes reconnues à leur texte), Redis aussi (les
// limiteurs tournent pour de vrai), et l'API Resend est interceptée.

const h = vi.hoisted(() => ({
  counters: new Map<string, number>(),
  state: {
    tableExists: true,
    insertFails: false,
    inserts: [] as unknown[][],
    notifiedIds: [] as unknown[],
    rows: [] as Array<Record<string, unknown>>,
  },
}));
const { counters, state } = h;

const sqlText = (strings: TemplateStringsArray) => strings.join('?').replace(/\s+/g, ' ').trim();

const queryRaw = vi.fn(async (strings: TemplateStringsArray, ...values: unknown[]) => {
  const sql = sqlText(strings);
  if (sql.includes('to_regclass')) return [{ tbl: values[0] === 'public.leads' && state.tableExists }];
  if (sql.startsWith('INSERT INTO leads')) {
    if (state.insertFails) throw new Error('connexion perdue');
    state.inserts.push(values);
    return [{ id: 41 }];
  }
  if (sql.includes('FROM leads') && sql.includes('ORDER BY created_at DESC')) return state.rows;
  throw new Error(`requête inattendue : ${sql}`);
});
const executeRaw = vi.fn(async (strings: TemplateStringsArray, ...values: unknown[]) => {
  const sql = sqlText(strings);
  if (sql.startsWith('UPDATE leads SET notified_at = now()')) { state.notifiedIds.push(values[0]); return 1; }
  throw new Error(`requête inattendue : ${sql}`);
});
const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };

vi.mock('@shimmer/core', async (importOriginal) => {
  const real = await importOriginal<typeof import('@shimmer/core')>();
  return {
    ...real,
    getPrisma: () => ({
      $queryRaw: queryRaw,
      $executeRaw: executeRaw,
      store: {
        findUnique: vi.fn(async ({ where }: { where: { apiKey?: string } }) => {
          if (where.apiKey === 'sk_operator') return { id: 1, name: 'Shimmer', config: {} };
          if (where.apiKey === 'sk_merchant') return { id: 7, name: 'Caves Forty-Two', config: {} };
          return null;
        }),
      },
    }),
    // Les deux scripts Lua de rate-limit-redis, en mémoire (comme rate-limiter.test.ts).
    getRedis: () => ({
      call: async (command: string, ...args: string[]) => {
        if (command === 'SCRIPT') return args[1]!.includes('INCR') ? 'increment' : 'get';
        if (command === 'EVALSHA') {
          const [sha, , key] = args as [string, string, string];
          if (sha === 'increment') h.counters.set(key, (h.counters.get(key) ?? 0) + 1);
          return [h.counters.get(key) ?? 0, 600_000];
        }
        if (command === 'DECR') { h.counters.set(args[0]!, (h.counters.get(args[0]!) ?? 0) - 1); return 0; }
        if (command === 'DEL') { h.counters.delete(args[0]!); return 1; }
        throw new Error(`commande redis inattendue : ${command}`);
      },
    }),
    logger,
  };
});

const realFetch = globalThis.fetch;
let resendMode: 'ok' | 'fail' | 'throw' = 'ok';
const resendCalls: Array<{ url: string; init: RequestInit }> = [];
vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
  const url = input instanceof Request ? input.url : String(input);
  if (url.startsWith('https://api.resend.com/')) {
    resendCalls.push({ url, init: init ?? {} });
    if (resendMode === 'throw') throw new TypeError('fetch failed');
    if (resendMode === 'fail') return new Response('{"message":"domain not verified"}', { status: 403 });
    return new Response(JSON.stringify({ id: 'msg_1' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
  return realFetch(input, init);
}));

process.env.SHIMMER_OPERATOR_STORES = '1';

const { publicLeadsRouter } = await import('../routes/public-leads.js');
const { leadsRouter } = await import('../routes/leads.js');
const { authMiddleware } = await import('../middleware/auth.js');
const { operatorOnly } = await import('../middleware/operator.js');
const { errorHandler } = await import('../middleware/error-handler.js');
const { leadsTable } = await import('../lib/leads.js');
const { normalizeShopUrl, parseLead } = await import('../lib/lead-input.js');
const { buildLeadEmail, notifyLead, leadMailConfig } = await import('../lib/lead-notify.js');
const { createTableGuard } = await import('../lib/table-guard.js');

let server: Server;
let base: string;
beforeAll(async () => {
  const app = express();
  app.use(express.json({ limit: '16kb' }));
  app.use('/api/public/leads', publicLeadsRouter);
  app.use('/api/leads', authMiddleware, operatorOnly, leadsRouter);
  app.use(errorHandler);
  server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', () => resolve()));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => {
  server?.close();
  vi.unstubAllGlobals();
});

const ENV_KEYS = ['LEAD_NOTIFY_RESEND_API_KEY', 'LEAD_NOTIFY_FROM', 'LEAD_NOTIFY_TO'] as const;
beforeEach(() => {
  counters.clear();
  state.tableExists = true;
  state.insertFails = false;
  state.inserts.length = 0;
  state.notifiedIds.length = 0;
  state.rows = [];
  resendMode = 'ok';
  resendCalls.length = 0;
  queryRaw.mockClear();
  executeRaw.mockClear();
  for (const fn of Object.values(logger)) fn.mockClear();
  leadsTable.reset();
  for (const k of ENV_KEYS) delete process.env[k];
  process.env.LEAD_NOTIFY_RESEND_API_KEY = 're_test_key';
  process.env.LEAD_NOTIFY_FROM = 'Shimmer formulaire <alertes@exemple.fr>';
});

const good = {
  shopUrl: 'https://www.Cave-Forty-Two.fr/collections/vins?ref=1#top',
  email: 'chloe@mail.fr',
  platform: 'shopify',
  message: 'Bonjour,\nje vends du vin.',
  website: '',
  elapsedMs: 14_000,
};

function post(body: unknown, headers: Record<string, string> = {}) {
  return realFetch(`${base}/api/public/leads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0 test', Referer: 'https://tymmerc.eu/shimmer/', ...headers },
    body: JSON.stringify(body),
  });
}
const sentPayload = (i = 0) => JSON.parse(String(resendCalls[i]!.init.body)) as Record<string, unknown>;

describe('adresse de boutique', () => {
  it.each([
    ['boutique.fr', 'https://boutique.fr'],
    ['  Boutique.FR  ', 'https://boutique.fr'],
    ['www.boutique.fr/', 'https://www.boutique.fr'],
    ['https://Boutique.fr/Produits?x=1#haut', 'https://boutique.fr/Produits?x=1'],
    ['http://boutique.fr', 'http://boutique.fr'],
    ['//boutique.fr/a', 'https://boutique.fr/a'],
    ['boutique.fr:8080/shop', 'https://boutique.fr:8080/shop'],
    ['ma-cave.myshopify.com', 'https://ma-cave.myshopify.com'],
    ['café.fr', 'https://xn--caf-dma.fr'],
  ])('%s → %s', (raw, expected) => {
    expect(normalizeShopUrl(raw)).toBe(expected);
  });

  it.each([
    'javascript:alert(1)',
    'JavaScript://boutique.fr/%0aalert(1)',
    'data:text/html,<b>x</b>',
    'mailto:a@b.fr',
    'ftp://boutique.fr',
    'http:boutique.fr',
    'https://user:pass@boutique.fr',
    'localhost',
    'http://localhost:3003',
    '127.0.0.1',
    'https://[::1]/',
    'boutique',
    'bou tique.fr',
    'https://boutique.fr/<script>',
    'a.b',
    `https://boutique.fr/${'a'.repeat(300)}`,
  ])('refuse %s', (raw) => {
    expect(normalizeShopUrl(raw)).toBeNull();
  });
});

describe('POST /api/public/leads : validation', () => {
  it('demande correcte : gardée avec l\'adresse normalisée, 200 { ok: true }', async () => {
    const r = await post(good);
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ ok: true });
    expect(r.headers.get('cache-control')).toBe('no-store');
    expect(state.inserts).toHaveLength(1);
    expect(state.inserts[0]).toEqual([
      'https://www.cave-forty-two.fr/collections/vins?ref=1', 'chloe@mail.fr', 'shopify',
      'Bonjour,\nje vends du vin.', 'landing-audit', 'Mozilla/5.0 test', 'https://tymmerc.eu/shimmer/',
    ]);
  });

  it('domaine nu, plateforme et message vides : acceptés', async () => {
    const r = await post({ shopUrl: 'Boutique.FR', email: ' a@b.fr ', platform: '', message: '  ', website: '', elapsedMs: 9000 });
    expect(r.status).toBe(200);
    expect(state.inserts[0]!.slice(0, 4)).toEqual(['https://boutique.fr', 'a@b.fr', null, null]);
  });

  it('champs manquants : 400 avec la liste des champs, rien n\'est gardé ni envoyé', async () => {
    const r = await post({ website: '' });
    expect(r.status).toBe(400);
    const body = await r.json() as { ok: boolean; error: string; fields: string[] };
    expect(body.ok).toBe(false);
    expect(body.error).toBe('invalid');
    expect(body.fields.sort()).toEqual(['elapsedMs', 'email', 'shopUrl']);
    expect(state.inserts).toHaveLength(0);
    expect(resendCalls).toHaveLength(0);
  });

  it('e-mail invalide : 400 sur email seulement', async () => {
    const r = await post({ ...good, email: 'chloe@' });
    expect(r.status).toBe(400);
    expect((await r.json() as { fields: string[] }).fields).toEqual(['email']);
  });

  it('URL javascript: : 400 sur shopUrl, rien n\'est gardé', async () => {
    const r = await post({ ...good, shopUrl: 'javascript:alert(document.cookie)' });
    expect(r.status).toBe(400);
    expect((await r.json() as { fields: string[] }).fields).toEqual(['shopUrl']);
    expect(state.inserts).toHaveLength(0);
    expect(resendCalls).toHaveLength(0);
  });

  it('plateforme inconnue, message trop long : 400', async () => {
    const r = await post({ ...good, platform: 'wix', message: 'x'.repeat(2001) });
    expect(r.status).toBe(400);
    expect((await r.json() as { fields: string[] }).fields.sort()).toEqual(['message', 'platform']);
  });

  it('corps qui n\'est pas un objet : 400', async () => {
    const r = await post(['shopUrl']);
    expect(r.status).toBe(400);
    expect(await r.json()).toEqual({ ok: false, error: 'invalid', fields: [] });
  });
});

describe('POST /api/public/leads : robots', () => {
  it('case piège remplie : 200 sans rien garder ni envoyer, même avec un corps faux', async () => {
    const r = await post({ shopUrl: 'javascript:x', email: 'nope', website: 'http://spam.example', elapsedMs: 30_000 });
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ ok: true });
    expect(state.inserts).toHaveLength(0);
    expect(resendCalls).toHaveLength(0);
    expect(logger.info).toHaveBeenCalledWith(expect.objectContaining({ reason: 'honeypot' }), 'leads.dropped');
  });

  it('envoi en moins de 2,5 s : 200 sans rien garder ni envoyer', async () => {
    const r = await post({ ...good, elapsedMs: 800 });
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ ok: true });
    expect(state.inserts).toHaveLength(0);
    expect(resendCalls).toHaveLength(0);
    expect(logger.info).toHaveBeenCalledWith(expect.objectContaining({ reason: 'too-fast', email: 'chloe@mail.fr' }), 'leads.dropped');
  });

  it('les robots ne mangent pas le quota du jour', async () => {
    await post({ ...good, website: 'x' });
    await post({ ...good, elapsedMs: 100 });
    expect(counters.get('rl:leads-all:all') ?? 0).toBe(0);
    await post(good);
    expect(counters.get('rl:leads-all:all')).toBe(1);
  });
});

describe('POST /api/public/leads : garder et prévenir', () => {
  it('gardée puis envoyée : notified_at posé sur la bonne ligne', async () => {
    const r = await post(good);
    expect(r.status).toBe(200);
    expect(resendCalls).toHaveLength(1);
    expect(resendCalls[0]!.url).toBe('https://api.resend.com/emails');
    expect(sentPayload().reply_to).toBe('chloe@mail.fr');
    expect(String(sentPayload().text)).toContain('Demande n° 41');
    expect(state.notifiedIds).toEqual([41]);
    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({ lead: expect.objectContaining({ shopUrl: 'https://www.cave-forty-two.fr/collections/vins?ref=1', email: 'chloe@mail.fr' }) }),
      'leads.received',
    );
  });

  it('gardée, e-mail pas configuré : 200 quand même, notified_at reste vide', async () => {
    delete process.env.LEAD_NOTIFY_RESEND_API_KEY;
    const r = await post(good);
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ ok: true });
    expect(state.inserts).toHaveLength(1);
    expect(resendCalls).toHaveLength(0);
    expect(state.notifiedIds).toEqual([]);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('leads.notify-not-configured'));
  });

  it('gardée, Resend refuse : 200 quand même, notified_at reste vide', async () => {
    resendMode = 'fail';
    const r = await post(good);
    expect(r.status).toBe(200);
    expect(state.inserts).toHaveLength(1);
    expect(state.notifiedIds).toEqual([]);
  });

  it('table absente, e-mail parti : 200, l\'e-mail dit que la demande n\'est pas en base', async () => {
    state.tableExists = false;
    const r = await post(good);
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ ok: true });
    expect(state.inserts).toHaveLength(0);
    expect(resendCalls).toHaveLength(1);
    expect(String(sentPayload().text)).toContain('PAS gardée en base');
    expect(executeRaw).not.toHaveBeenCalled();
  });

  it('insertion en erreur, e-mail parti : 200', async () => {
    state.insertFails = true;
    const r = await post(good);
    expect(r.status).toBe(200);
    expect(resendCalls).toHaveLength(1);
    expect(logger.error).toHaveBeenCalledWith(expect.anything(), 'leads.store-failed');
  });

  it('table absente et e-mail en échec : 503, la demande reste dans les logs', async () => {
    state.tableExists = false;
    resendMode = 'throw';
    const r = await post(good);
    expect(r.status).toBe(503);
    expect(await r.json()).toEqual({ ok: false, error: 'unavailable' });
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ lead: expect.objectContaining({ email: 'chloe@mail.fr' }), notify: 'network-error' }),
      'leads.not-saved',
    );
  });

  it('table absente et e-mail pas configuré : 503', async () => {
    state.tableExists = false;
    delete process.env.LEAD_NOTIFY_FROM;
    const r = await post(good);
    expect(r.status).toBe(503);
  });
});

describe('limites de débit', () => {
  it('5 envois par client et par 10 min, le 6e reçoit 429', async () => {
    for (let i = 0; i < 5; i++) expect((await post(good)).status).toBe(200);
    expect((await post(good)).status).toBe(429);
    expect(state.inserts).toHaveLength(5);
  });

  it('une demande refusée (400) ne compte pas', async () => {
    for (let i = 0; i < 6; i++) expect((await post({ ...good, email: 'faux' })).status).toBe(400);
    expect((await post(good)).status).toBe(200);
  });

  it('plafond du jour pour tout le formulaire : 200, 429 au-delà', async () => {
    counters.set('rl:leads-all:all', 200);
    expect((await post(good)).status).toBe(429);
    expect(state.inserts).toHaveLength(0);
  });
});

describe('GET /api/public/leads/ping', () => {
  it('répond 200 { ok: true }', async () => {
    const r = await realFetch(`${base}/api/public/leads/ping`);
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ ok: true });
  });
});

describe('GET /api/leads (opérateur)', () => {
  const get = (key?: string) => realFetch(`${base}/api/leads`, { headers: key ? { Authorization: `Bearer ${key}` } : {} });

  it('sans clé : 401 ; clé d\'une boutique cliente : 403, rien n\'est lu', async () => {
    expect((await get()).status).toBe(401);
    expect((await get('sk_merchant')).status).toBe(403);
    expect(queryRaw.mock.calls.some((c) => sqlText(c[0]).includes('FROM leads'))).toBe(false);
  });

  it('opérateur : les dernières demandes', async () => {
    state.rows = [{ id: 2, shopUrl: 'https://b.fr', email: 'b@b.fr' }, { id: 1, shopUrl: 'https://a.fr', email: 'a@a.fr' }];
    const r = await get('sk_operator');
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ leads: state.rows, schemaReady: true });
    const sql = sqlText(queryRaw.mock.calls.find((c) => sqlText(c[0]).includes('FROM leads'))![0]);
    expect(sql).toContain('LIMIT');
  });

  it('opérateur, table absente : liste vide', async () => {
    state.tableExists = false;
    const r = await get('sk_operator');
    expect(await r.json()).toEqual({ leads: [], schemaReady: false });
  });
});

describe('e-mail au fondateur', () => {
  const notice = {
    id: 12,
    shopUrl: 'https://www.boutique.fr/x',
    email: 'chloe@mail.fr',
    platform: 'woocommerce' as const,
    message: 'Ligne 1\r\nLigne 2',
    receivedAt: new Date('2026-10-01T12:30:00Z'),
    userAgent: 'Mozilla/5.0',
    referer: 'https://tymmerc.eu/shimmer/',
  };

  it('payload Resend : sujet, destinataire par défaut, reply_to, heure de Paris, tous les champs', () => {
    const p = buildLeadEmail(notice, { from: 'Shimmer <a@exemple.fr>', to: 'tym.mercier@gmail.com' });
    expect(p.subject).toBe('Nouvelle demande d\'audit : boutique.fr');
    expect(p.to).toEqual(['tym.mercier@gmail.com']);
    expect(p.reply_to).toBe('chloe@mail.fr');
    expect(p.text).toContain('14:30');
    expect(p.text).toContain('(heure de Paris)');
    for (const part of ['https://www.boutique.fr/x', 'chloe@mail.fr', 'WooCommerce', 'Ligne 1', 'Ligne 2', 'Mozilla/5.0', 'https://tymmerc.eu/shimmer/', 'Demande n° 12']) {
      expect(p.text).toContain(part);
    }
  });

  it('aucun retour à la ligne dans les valeurs d\'en-tête', () => {
    const p = buildLeadEmail(
      { ...notice, email: 'chloe@mail.fr\r\nBcc: x@evil.fr', shopUrl: 'https://evil.fr/\r\nBcc: x@evil.fr' },
      { from: 'Shimmer <a@exemple.fr>', to: 't@exemple.fr' },
    );
    expect(p.subject).not.toMatch(/[\r\n]/);
    expect(p.reply_to).not.toMatch(/[\r\n]/);
  });

  it('réglages : from et to nettoyés, to par défaut, null s\'il manque la clé ou l\'expéditeur', () => {
    expect(leadMailConfig({ LEAD_NOTIFY_RESEND_API_KEY: 'k', LEAD_NOTIFY_FROM: 'A <a@x.fr>\r\nBcc: z@y.fr' })).toEqual({
      apiKey: 'k', from: 'A <a@x.fr> Bcc: z@y.fr', to: 'tym.mercier@gmail.com',
    });
    expect(leadMailConfig({ LEAD_NOTIFY_RESEND_API_KEY: 'k', LEAD_NOTIFY_FROM: 'a@x.fr', LEAD_NOTIFY_TO: 'b@y.fr' })?.to).toBe('b@y.fr');
    expect(leadMailConfig({ LEAD_NOTIFY_FROM: 'a@x.fr' })).toBeNull();
    expect(leadMailConfig({ LEAD_NOTIFY_RESEND_API_KEY: 'k' })).toBeNull();
  });

  it('appel HTTP : POST JSON avec la clé en Bearer, renvoie l\'id Resend', async () => {
    const r = await notifyLead(notice, { LEAD_NOTIFY_RESEND_API_KEY: 're_abc', LEAD_NOTIFY_FROM: 'Shimmer formulaire <alertes@exemple.fr>' });
    expect(r).toEqual({ sent: true, providerId: 'msg_1' });
    const call = resendCalls[0]!;
    expect(call.init.method).toBe('POST');
    expect((call.init.headers as Record<string, string>).Authorization).toBe('Bearer re_abc');
    expect(call.init.signal).toBeInstanceOf(AbortSignal);
    const p = sentPayload();
    expect(p.from).toBe('Shimmer formulaire <alertes@exemple.fr>');
    expect(p.reply_to).toBe('chloe@mail.fr');
    expect(p.subject).not.toMatch(/[\r\n]/);
  });

  it('ne lève jamais : réseau en panne → network-error, refus → http-error, pas configuré → not-configured', async () => {
    const env = { LEAD_NOTIFY_RESEND_API_KEY: 'k', LEAD_NOTIFY_FROM: 'a@x.fr' };
    resendMode = 'throw';
    await expect(notifyLead(notice, env)).resolves.toEqual({ sent: false, reason: 'network-error' });
    resendMode = 'fail';
    await expect(notifyLead(notice, env)).resolves.toEqual({ sent: false, reason: 'http-error' });
    await expect(notifyLead(notice, {})).resolves.toEqual({ sent: false, reason: 'not-configured' });
  });
});

describe('table absente puis créée', () => {
  it('« non » revérifié après une minute, « oui » gardé pour toujours', async () => {
    const guard = createTableGuard('leads', 'sql/x.sql');
    state.tableExists = false;
    expect(await guard.ready(1_000_000)).toBe(false);
    state.tableExists = true;
    expect(await guard.ready(1_030_000)).toBe(false);
    expect(await guard.ready(1_061_000)).toBe(true);
    state.tableExists = false;
    expect(await guard.ready(9_999_999)).toBe(true);
  });

  it('nom de table douteux refusé', () => {
    expect(() => createTableGuard('leads; DROP TABLE x', 'f')).toThrow();
  });
});

describe('parseLead', () => {
  it('elapsedMs absent : invalide (pas une demande silencieusement perdue)', () => {
    expect(parseLead({ shopUrl: 'a.fr', email: 'a@a.fr', website: '' })).toEqual({ kind: 'invalid', fields: ['elapsedMs'] });
  });
});
