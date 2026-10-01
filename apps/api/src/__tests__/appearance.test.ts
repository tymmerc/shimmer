/**
 * Apparence du widget (DA de la boutique) : schéma strict, enregistrement par
 * PATCH /api/stores/me/config, lecture publique par GET /api/public/appearance.
 * La route publique ne lit que la clé `appearance` et la revalide : le config
 * contient aussi des secrets (Shopify, Woo, facturation) qui ne doivent jamais
 * sortir.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import express from 'express';
import type { AddressInfo } from 'net';
import type { Server } from 'http';

const SECRET_KEY = 'sk_store4_appearance';

// Config de la boutique 4 : de la DA valide, des champs pourris et des secrets.
const store4Config = {
  ownerEmail: 'patron@caves.example',
  billing: { floorEUR: 89, ratePct: 5 },
  shopify: { shopDomain: 'caves.myshopify.com', webhookSecret: 'whsec_never_leak' },
  woocommerce: { consumerKey: 'ck_never_leak', consumerSecret: 'cs_never_leak' },
  appearance: {
    accent: '#7A1F2B',
    font: '"Playfair Display", Georgia, serif',
    radius: 30,
    theme: 'sepia',
    auto: 'yes',
    css: 'body{display:none}',
    ownerEmail: 'glisse@example.com',
  },
};

const findUnique = vi.fn(async ({ where }: { where: { apiKey?: string; id?: number }; select?: Record<string, boolean> }) => {
  if (where.apiKey === SECRET_KEY || where.id === 4) return { id: 4, name: 'Caves Forty-Two', config: store4Config, updatedAt: new Date('2026-10-01T00:00:00Z') };
  if (where.id === 5) return { id: 5, name: 'Sans DA', config: { billing: { floorEUR: 89 } }, updatedAt: new Date() };
  if (where.id === 6) return { id: 6, name: 'Config vide', config: null, updatedAt: new Date() };
  return null;
});

vi.mock('@shimmer/core', async (importOriginal) => {
  const real = await importOriginal<typeof import('@shimmer/core')>();
  return {
    ...real,
    getPrisma: () => ({ store: { findUnique } }),
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  };
});
vi.mock('../middleware/rate-limiter.js', () => ({
  createScopedRateLimiter: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}));
const patchStoreConfig = vi.fn(async (..._args: unknown[]) => undefined);
vi.mock('../lib/knowledge-ingest.js', () => ({ patchStoreConfig }));

process.env.SHIMMER_PK_SECRET = 'test-pk-secret';

const { appearanceSchema, publicAppearance } = await import('../lib/appearance.js');
const { storesRouter } = await import('../routes/stores.js');
const { publicAppearanceRouter, parseStoreParam } = await import('../routes/public-appearance.js');
const { errorHandler } = await import('../middleware/error-handler.js');

let server: Server;
let base: string;

beforeAll(async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/public/appearance', publicAppearanceRouter);
  app.use('/api/stores', storesRouter);
  app.use(errorHandler);
  server = app.listen(0);
  await new Promise<void>((resolve) => server.once('listening', () => resolve()));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => server?.close());
beforeEach(() => {
  patchStoreConfig.mockClear();
  findUnique.mockClear();
});

const ok = (v: unknown) => appearanceSchema.safeParse(v).success;

describe('appearanceSchema', () => {
  it('accepte une DA complète, et {} (tout automatique)', () => {
    expect(ok({ accent: '#1a2B3c', font: '"Playfair Display", Georgia, serif', radius: 0, theme: 'dark', auto: false })).toBe(true);
    expect(ok({ radius: 24, theme: 'auto', auto: true })).toBe(true);
    expect(ok({ font: "Avenir Next, 'Helvetica Neue', sans-serif" })).toBe(true);
    expect(ok({ font: 'Économica-2_Pro' })).toBe(true);
    expect(ok({})).toBe(true);
  });
  it('accent : #rrggbb seulement (ni nom de couleur, ni #fff)', () => {
    for (const accent of ['red', '#fff', '#FFFF', '#12345g', '#1234567', '123456', 'rgb(1,2,3)', 'var(--x)', 123456]) {
      expect(ok({ accent })).toBe(false);
    }
  });
  it('font : même règle que le SDK (guillemets fermés, pas de mot-clé global)', () => {
    for (const font of ['"Playfair Display, serif', "L'Oréal Sans", 'inherit', 'Arial, initial', '"Arial"x, serif', 'Arial,,serif']) {
      expect(ok({ font })).toBe(false);
    }
    expect(ok({ font: '"L\'Oréal Sans", serif' })).toBe(true);
  });

  it('font : rien qui sorte de la déclaration CSS', () => {
    for (const font of ['Arial; background:url(x)', 'Arial{', 'Arial}', '<script>', 'a>b', 'a\\62', 'url(x)', 'Arial:hover', '', '   ', 'x'.repeat(121), 42]) {
      expect(ok({ font })).toBe(false);
    }
  });
  it('radius : entier de 0 à 24', () => {
    for (const radius of [25, -1, 3.5, '8', '8px', Number.NaN]) expect(ok({ radius })).toBe(false);
  });
  it('theme et auto : valeurs du contrat seulement', () => {
    expect(ok({ theme: 'sepia' })).toBe(false);
    expect(ok({ auto: 'true' })).toBe(false);
  });
  it('clés inconnues refusées', () => {
    expect(ok({ accent: '#000000', css: 'body{}' })).toBe(false);
    expect(ok({ logo: 'x' })).toBe(false);
  });
});

describe('publicAppearance', () => {
  it('ne garde que les champs valides du contrat, sans lever', () => {
    expect(publicAppearance(store4Config)).toEqual({ accent: '#7A1F2B', font: '"Playfair Display", Georgia, serif' });
  });
  it('config ou appearance inexploitable : {}', () => {
    for (const config of [null, undefined, 'x', 42, [], { appearance: null }, { appearance: 'dark' }, { appearance: ['#000000'] }, {}]) {
      expect(publicAppearance(config)).toEqual({});
    }
  });
  it('ignore les propriétés héritées', () => {
    const appearance = Object.create({ accent: '#000000' }) as Record<string, unknown>;
    appearance.radius = 8;
    expect(publicAppearance({ appearance })).toEqual({ radius: 8 });
  });
});

async function patch(body: unknown, key = SECRET_KEY) {
  const res = await fetch(`${base}/api/stores/me/config`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify(body),
  });
  return { status: res.status, json: await res.json().catch(() => null) as Record<string, unknown> | null };
}

describe('PATCH /api/stores/me/config { appearance }', () => {
  it('enregistre l\'objet entier', async () => {
    const appearance = { accent: '#112233', font: 'Inter, sans-serif', radius: 12, theme: 'light', auto: false };
    const r = await patch({ appearance });
    expect(r.status).toBe(200);
    expect(patchStoreConfig).toHaveBeenCalledTimes(1);
    const [, storeId, set, unset] = patchStoreConfig.mock.calls[0]!;
    expect(storeId).toBe(4);
    expect(set).toEqual({ appearance });
    expect(unset).toEqual([]);
  });
  it('{} est accepté et stocké tel quel (tout automatique)', async () => {
    const r = await patch({ appearance: {} });
    expect(r.status).toBe(200);
    expect(patchStoreConfig.mock.calls[0]!.slice(2)).toEqual([{ appearance: {} }, []]);
  });
  it('null retire la clé', async () => {
    const r = await patch({ appearance: null });
    expect(r.status).toBe(200);
    expect(patchStoreConfig.mock.calls[0]!.slice(2)).toEqual([{}, ['appearance']]);
  });
  it('se combine avec les autres clés', async () => {
    await patch({ tone: 'vous', appearance: { radius: 4 } });
    expect(patchStoreConfig.mock.calls[0]![2]).toEqual({ tone: 'vous', appearance: { radius: 4 } });
  });
  it('accepte les trois tons proposés par la page Réglages (neutre compris)', async () => {
    for (const tone of ['tu', 'vous', 'neutre']) {
      const r = await patch({ tone });
      expect(r.status).toBe(200);
    }
    expect(patchStoreConfig.mock.calls.map((c) => c[2])).toEqual([{ tone: 'tu' }, { tone: 'vous' }, { tone: 'neutre' }]);
    expect((await patch({ tone: 'familier' })).status).toBe(400);
  });
  it('valeur invalide : 400, rien n\'est écrit', async () => {
    for (const appearance of [{ accent: 'red' }, { font: 'Arial;}' }, { radius: 25 }, { evil: 1 }, 'dark']) {
      const r = await patch({ appearance });
      expect(r.status).toBe(400);
    }
    expect(patchStoreConfig).not.toHaveBeenCalled();
  });
  it('sans clé secrète : 401', async () => {
    const r = await patch({ appearance: {} }, 'sk_inconnue');
    expect(r.status).toBe(401);
    expect(patchStoreConfig).not.toHaveBeenCalled();
  });
});

async function getAppearance(query: string) {
  const res = await fetch(`${base}/api/public/appearance${query}`);
  return { status: res.status, cache: res.headers.get('cache-control'), text: await res.text() };
}

describe('GET /api/public/appearance', () => {
  it('renvoie seulement les champs valides, aucun secret du config', async () => {
    const r = await getAppearance('?store=4');
    expect(r.status).toBe(200);
    expect(JSON.parse(r.text)).toEqual({ appearance: { accent: '#7A1F2B', font: '"Playfair Display", Georgia, serif' } });
    for (const leak of ['never_leak', 'webhookSecret', 'consumer', 'billing', 'ownerEmail', 'patron@', 'glisse@', 'css', 'display:none', 'sepia']) {
      expect(r.text).not.toContain(leak);
    }
  });
  it('lit seulement la colonne config de la bonne boutique', async () => {
    await getAppearance('?store=4');
    expect(findUnique).toHaveBeenCalledWith({ where: { id: 4 }, select: { config: true } });
  });
  it('Cache-Control public, 1 min puis revalidation', async () => {
    expect((await getAppearance('?store=4')).cache).toBe('public, max-age=60, stale-while-revalidate=600');
    expect((await getAppearance('?store=999')).cache).toBe('public, max-age=60, stale-while-revalidate=600');
  });
  it('boutique inconnue, sans DA ou config vide : 200 { appearance: {} }', async () => {
    for (const id of [999, 5, 6, 2147483647]) {
      const r = await getAppearance(`?store=${id}`);
      expect(r.status).toBe(200);
      expect(JSON.parse(r.text)).toEqual({ appearance: {} });
    }
  });
  it('store absent ou invalide : 400 sans requête en base', async () => {
    for (const q of ['', '?store=', '?store=abc', '?store=0', '?store=-4', '?store=4.5', '?store=4abc', '?store=2147483648', '?store=1e3', '?store=4&store=5', '?store[a]=4']) {
      const r = await getAppearance(q);
      expect(r.status, q).toBe(400);
      expect(JSON.parse(r.text)).toHaveProperty('error');
      expect(r.cache).not.toBe('public, max-age=60, stale-while-revalidate=600');
    }
    expect(findUnique).not.toHaveBeenCalled();
  });
  it('erreur de base : 500 générique, pas de cache public', async () => {
    findUnique.mockRejectedValueOnce(new Error('connection refused to db.internal:5432 password=hunter2'));
    const r = await getAppearance('?store=4');
    expect(r.status).toBe(500);
    expect(r.text).not.toContain('hunter2');
    expect(r.cache).not.toBe('public, max-age=60, stale-while-revalidate=600');
  });
});

describe('parseStoreParam', () => {
  it('entier positif en chiffres, borné à int4', () => {
    expect(parseStoreParam('4')).toBe(4);
    expect(parseStoreParam('2147483647')).toBe(2147483647);
    for (const bad of [undefined, null, 4, ['4'], '', '0', '-1', ' 4', '4 ', '0x10', '2147483648', '99999999999']) {
      expect(parseStoreParam(bad)).toBeNull();
    }
  });
});
