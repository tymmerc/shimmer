import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import express from 'express';
import type { AddressInfo } from 'net';
import type { Server } from 'http';

// Page de désinscription (01/10) : un GET n'inscrit rien (les antivirus de
// messagerie ouvrent les liens), le POST désinscrit ; jeton chiffré obligatoire.
process.env.SHIMMER_PK_SECRET = 'test-secret-unsub-route';

const executeRaw = vi.fn(async (..._args: unknown[]) => 1);
let schemaReady = true;
const queryRaw = vi.fn(async () => [{ cols: schemaReady ? 3 : 0, tbl: schemaReady }]);
vi.mock('@shimmer/core', async (importOriginal) => {
  const real = await importOriginal<typeof import('@shimmer/core')>();
  return {
    ...real,
    getPrisma: () => ({
      $executeRaw: executeRaw,
      $queryRaw: queryRaw,
      store: { findUnique: vi.fn(async () => ({ name: 'Caves <Forty-Two>' })) },
    }),
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  };
});
vi.mock('../middleware/rate-limiter.js', () => ({
  createScopedRateLimiter: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}));

const { publicUnsubscribeRouter } = await import('../routes/public-unsubscribe.js');
const { unsubscribeToken } = await import('../lib/unsubscribe.js');
const { errorHandler } = await import('../middleware/error-handler.js');
const { resetReminderSchemaCache } = await import('../lib/reminder-schema.js');

let server: Server;
let base: string;
beforeAll(async () => {
  const app = express();
  app.use('/api/public/unsubscribe', publicUnsubscribeRouter);
  app.use(errorHandler);
  server = app.listen(0);
  await new Promise<void>((resolve) => server.once('listening', () => resolve()));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/public/unsubscribe`;
});
afterAll(() => server?.close());
beforeEach(() => { executeRaw.mockClear(); schemaReady = true; resetReminderSchemaCache(); });

describe('page de désinscription', () => {
  it('GET : un bouton, rien n\'est écrit, nom de boutique échappé', async () => {
    const t = unsubscribeToken(4, 'chloe@mail.fr');
    const r = await fetch(`${base}?t=${t}`);
    expect(r.status).toBe(200);
    const html = await r.text();
    expect(html).toContain('Me désinscrire');
    expect(html).toContain('Caves &lt;Forty-Two&gt;');
    expect(html).not.toContain('chloe@mail.fr');
    expect(r.headers.get('cache-control')).toBe('no-store');
    expect(executeRaw).not.toHaveBeenCalled();
  });
  it('POST du formulaire : désinscrit la bonne adresse', async () => {
    const t = unsubscribeToken(4, 'Chloe@Mail.fr');
    const r = await fetch(base, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: `t=${t}` });
    expect(r.status).toBe(200);
    expect(await r.text()).toContain('C’est fait');
    expect(executeRaw).toHaveBeenCalledTimes(1);
    expect(executeRaw.mock.calls[0]!.slice(1, 3)).toEqual([4, 'chloe@mail.fr']);
  });
  it('POST en un clic (RFC 8058, jeton dans l\'URL)', async () => {
    const t = unsubscribeToken(5, 'a@b.fr');
    const r = await fetch(`${base}?t=${t}`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'List-Unsubscribe=One-Click' });
    expect(r.status).toBe(200);
    expect(executeRaw.mock.calls[0]!.slice(1, 3)).toEqual([5, 'a@b.fr']);
  });
  it('SQL du 01/10 pas encore passé : 503 lisible, rien n\'est écrit', async () => {
    schemaReady = false;
    const t = unsubscribeToken(4, 'a@b.fr');
    const r = await fetch(base, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: `t=${t}` });
    expect(r.status).toBe(503);
    expect(await r.text()).toContain('Réessayez dans quelques minutes');
    expect(executeRaw).not.toHaveBeenCalled();
  });
  it('jeton invalide : 400, rien n\'est écrit', async () => {
    for (const q of ['', '?t=abc', `?t=${'A'.repeat(60)}`]) {
      expect((await fetch(`${base}${q}`)).status).toBe(400);
    }
    const r = await fetch(base, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 't=nope' });
    expect(r.status).toBe(400);
    expect(executeRaw).not.toHaveBeenCalled();
  });
});
