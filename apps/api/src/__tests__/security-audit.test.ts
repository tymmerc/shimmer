import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'node:crypto';

// Correctifs de l'audit de sécurité du 30/09 : injection SQL par les ids de
// critères, IPv6 qui contournaient les limites, e-mails entrants sans
// signature, secret pk_ de repli en prod, routes d'exploitation ouvertes.

const queryRawUnsafe = vi.fn(async (..._args: unknown[]) => [] as unknown[]);
vi.mock('@shimmer/core', async (importOriginal) => {
  const real = await importOriginal<typeof import('@shimmer/core')>();
  return { ...real, getPrisma: () => ({ $queryRawUnsafe: queryRawUnsafe }) };
});

const { fetchMatchingProducts, applyStoreOverrides } = await import('../routes/search-assist.js');
const { isSafeCriterionId } = await import('../lib/criterion-id.js');
const { clientKey } = await import('../middleware/rate-limiter.js');
const { verifyMailgunSignature, verifyInboundSecret } = await import('../lib/inbound-auth.js');
const { isOperator, operatorStoreIds } = await import('../middleware/operator.js');

const INJECT = "x' = '' OR 1=1) UNION SELECT api_key FROM stores --";

function universe(criteria: Array<{ id: string; type?: 'closed' | 'open' | 'deduced' }>, label = "Vin d'Alsace") {
  return {
    id: 'VIN', label, keywords: [], scoreProfile: { usage: 50, criteria: 40, history: 10 }, deductions: [],
    criteria: criteria.map((c) => ({ id: c.id, label: c.id, weight: 10, required: false, type: c.type ?? 'closed', question: '?', fallback: '' })),
  };
}

describe('fetchMatchingProducts : aucune valeur dans le texte SQL', () => {
  beforeEach(() => queryRawUnsafe.mockClear());

  it('catégorie, critère et réponse du client passent en paramètres', async () => {
    await fetchMatchingProducts({ REGION: "Côte d'Or", GENRE: 'rouge_%', _BRAND: "O'Neil" }, universe([{ id: 'REGION' }]) as never, 4, 'vin rouge');
    const [sql, ...params] = queryRawUnsafe.mock.calls[0] as [string, ...unknown[]];
    for (const v of ["Vin d'Alsace", "Côte d'Or", 'rouge_', "o'neil"]) expect(sql).not.toContain(v);
    expect(params.slice(0, 3)).toEqual([4, expect.any(String), 'vin']);
    expect(params).toContain("Vin d'Alsace");
    expect(params).toContain("Côte d'Or");
    expect(params).toContain('region');
    // Les jokers ILIKE d'une valeur client sont neutralisés.
    expect(params).toContain('%rouge\\_\\%%');
    // Chaque $n du texte a sa valeur.
    const max = Math.max(...[...sql.matchAll(/\$(\d+)/g)].map((m) => Number(m[1])));
    expect(max).toBe(params.length);
  });

  it('un id de critère piégé est ignoré, jamais concaténé', async () => {
    await fetchMatchingProducts({ [INJECT]: 'oui' }, universe([{ id: INJECT }]) as never, 4);
    const [sql, ...params] = queryRawUnsafe.mock.calls[0] as [string, ...unknown[]];
    expect(sql).not.toContain('UNION');
    expect(params.join(' ')).not.toContain('UNION');
  });
});

describe('ids de critères', () => {
  it('lettres, chiffres, soulignés seulement', () => {
    // Ids générés par universe-gen : peuvent commencer par un chiffre (4K, 12V).
    for (const ok of ['BUDGET', 'SANS_FIL', 'PIECE', 'region2', '4K', '2_EN_1']) expect(isSafeCriterionId(ok)).toBe(true);
    for (const bad of [INJECT, "A'B", 'a b', '', 'x'.repeat(65), 'é', 42, null]) expect(isSafeCriterionId(bad)).toBe(false);
  });
  it('applyStoreOverrides écarte les critères et déductions aux ids piégés', () => {
    const [u] = applyStoreOverrides([universe([{ id: 'BUDGET' }]) as never], {
      universe_overrides: { VIN: {
        criteria_add: [{ id: INJECT, label: 'x', weight: 1, required: false, type: 'closed', question: '?', fallback: '' }, { id: 'REGION', label: 'Région', weight: 1, required: false, type: 'closed', question: '?', fallback: '' }],
        deductions_add: [{ patterns: ['alsace'], criterion: INJECT, value: 'x' }, { patterns: ['alsace'], criterion: 'REGION', value: 'Alsace' }],
      } },
    });
    expect(u.criteria.map((c) => c.id)).toEqual(['BUDGET', 'REGION']);
    expect(u.deductions.map((d) => d.criterion)).toEqual(['REGION']);
  });
});

describe('clientKey : IPv6 comptée par /64', () => {
  it('regroupe un même /64, sépare deux /64', () => {
    expect(clientKey('2001:db8:1:2::1')).toBe('2001:db8:1:2::/64');
    expect(clientKey('2001:0db8:0001:0002:abcd:ef01:2345:6789')).toBe('2001:db8:1:2::/64');
    expect(clientKey('2001:db8:1:3::1')).not.toBe(clientKey('2001:db8:1:2::1'));
    expect(clientKey('2001:db8::5')).toBe('2001:db8:0:0::/64');
  });
  it('IPv4 et IPv4 mappée : l\'adresse seule', () => {
    expect(clientKey('203.0.113.9')).toBe('203.0.113.9');
    expect(clientKey('::ffff:203.0.113.9')).toBe('203.0.113.9');
    expect(clientKey(undefined)).toBe('unknown');
  });
});

describe('e-mails entrants', () => {
  const key = 'mg-signing-key';
  const now = 1_790_000_000;
  const sign = (timestamp: string, token: string) => crypto.createHmac('sha256', key).update(timestamp + token).digest('hex');

  it('Mailgun : signature valide et récente acceptée', () => {
    const f = { timestamp: String(now), token: 'tok', signature: sign(String(now), 'tok') };
    expect(verifyMailgunSignature(key, f, now + 10)).toBe(true);
  });
  it('Mailgun : mauvaise signature, trop vieille, champs manquants ou pas de clé : refus', () => {
    expect(verifyMailgunSignature(key, { timestamp: String(now), token: 'tok', signature: sign(String(now), 'autre') }, now)).toBe(false);
    expect(verifyMailgunSignature(key, { timestamp: String(now), token: 'tok', signature: sign(String(now), 'tok') }, now + 301)).toBe(false);
    expect(verifyMailgunSignature(key, { timestamp: String(now), token: 'tok' }, now)).toBe(false);
    expect(verifyMailgunSignature(undefined, { timestamp: String(now), token: 'tok', signature: sign(String(now), 'tok') }, now)).toBe(false);
  });
  it('route générique : secret exact obligatoire, fermée sans variable', () => {
    expect(verifyInboundSecret('s3cret', 's3cret')).toBe(true);
    expect(verifyInboundSecret('s3cret', 's3cre')).toBe(false);
    expect(verifyInboundSecret('s3cret', undefined)).toBe(false);
    expect(verifyInboundSecret(undefined, '')).toBe(false);
  });
});

describe('secret des clés publiques', () => {
  it('en prod, pas de repli sur le secret du code', async () => {
    const { derivePublishableKey } = await import('../lib/publishable-key.js');
    const saved = { env: process.env.NODE_ENV, secret: process.env.SHIMMER_PK_SECRET };
    delete process.env.SHIMMER_PK_SECRET;
    process.env.NODE_ENV = 'production';
    try {
      expect(() => derivePublishableKey(4)).toThrow(/SHIMMER_PK_SECRET/);
    } finally {
      process.env.NODE_ENV = saved.env;
      if (saved.secret !== undefined) process.env.SHIMMER_PK_SECRET = saved.secret;
    }
  });
});

describe('routes d\'exploitation', () => {
  it('boutique 1 par défaut, liste configurable', () => {
    expect(isOperator(1)).toBe(true);
    expect(isOperator(4)).toBe(false);
    expect(isOperator(undefined)).toBe(false);
    expect([...operatorStoreIds('1, 7,x')]).toEqual([1, 7]);
  });
});
