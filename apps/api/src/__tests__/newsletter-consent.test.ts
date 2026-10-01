import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import express from 'express';
import type { AddressInfo } from 'net';
import type { Server } from 'http';

// Newsletter et accord marketing (01/10) : avant, elle partait à tous les
// clients de la boutique. Désormais seulement à ceux qui ont accepté (sauf
// audience « all » choisie par la boutique), jamais aux désinscrits, et en
// pause tant que le SQL manque. La base est simulée ; les requêtes SQL brutes
// sont reconnues à leur texte (le SQL lui-même a été passé sur une base
// jetable, voir le message de commit).
process.env.SHIMMER_PK_SECRET = 'test-secret-newsletter-consent';

const SECRET_KEY = 'sk_store4_newsletter';
type Customer = { id: number; storeId: number; email: string; firstName: string; consent: boolean | null };
type Campaign = { id: number; storeId: number; format: string; status: string; content: unknown; audience: string | null; scheduledAt: Date; metrics?: unknown };
const state = {
  customers: [] as Customer[],
  orders: [] as Array<{ customerId: number; at: Date }>,
  suppressed: [] as Array<{ storeId: number; email: string; reason: string }>,
  campaigns: [] as Campaign[],
  storeConfig: {} as Record<string, unknown>,
  consentMissing: false,
  remindersMissing: false,
  failUpdate: false,
  sqlLog: [] as string[],
};

const sqlText = (strings: TemplateStringsArray) => strings.join('?').replace(/\s+/g, ' ').trim();

const queryRaw = vi.fn(async (strings: TemplateStringsArray, ...values: unknown[]) => {
  const sql = sqlText(strings);
  state.sqlLog.push(sql);
  if (sql.includes('AS consent_col')) return [{ consent_col: !state.consentMissing }];
  if (sql.includes('information_schema.columns')) return [{ cols: state.remindersMissing ? 0 : 3, tbl: !state.remindersMissing }];
  if (sql.includes('FROM customers c')) {
    const [storeId, everyone, dormantSince, , limit] = values as [number, boolean, Date | null, Date | null, number];
    // trim() de Postgres : les espaces seulement.
    const pgTrim = (e: string) => e.replace(/^ +| +$/g, '').toLowerCase();
    return state.customers
      .filter((c) => c.storeId === storeId && (everyone || c.consent === true))
      .filter((c) => !dormantSince || !state.orders.some((o) => o.customerId === c.id && o.at >= dormantSince))
      .filter((c) => !state.suppressed.some((s) => s.storeId === storeId && s.email === pgTrim(c.email)))
      .slice(0, limit)
      .map((c) => ({ id: c.id, email: c.email, first_name: c.firstName }));
  }
  if (sql.startsWith('SELECT lower(email) AS email FROM email_suppressions')) {
    const [storeId, list] = values as [number, string[]];
    return state.suppressed.filter((s) => s.storeId === storeId && list.includes(s.email)).map((s) => ({ email: s.email }));
  }
  throw new Error(`requête inattendue : ${sql}`);
});
const executeRaw = vi.fn(async (strings: TemplateStringsArray, ...values: unknown[]) => {
  const sql = sqlText(strings);
  state.sqlLog.push(sql);
  if (sql.startsWith('UPDATE customers SET marketing_consent')) {
    if (state.failUpdate) throw new Error('db down');
    const [consent, id, storeId] = values as [boolean, number, number];
    const c = state.customers.find((x) => x.id === id && x.storeId === storeId && x.consent !== consent);
    if (c) c.consent = consent;
    return c ? 1 : 0;
  }
  if (sql.startsWith('INSERT INTO email_suppressions')) {
    const [storeId, email, reason] = values as [number, string, string];
    state.suppressed.push({ storeId, email, reason });
    return 1;
  }
  throw new Error(`requête inattendue : ${sql}`);
});

const campaignUpdateMany = vi.fn(async ({ where, data }: { where: { id: number; status: string }; data: { status: string } }) => {
  const c = state.campaigns.find((x) => x.id === where.id && x.status === where.status);
  if (c) c.status = data.status;
  return { count: c ? 1 : 0 };
});
const storeFindUnique = vi.fn(async ({ where }: { where: { id?: number; apiKey?: string } }) => {
  if (where.apiKey === SECRET_KEY || where.id === 4) return { id: 4, name: 'Caves Forty-Two', apiKey: SECRET_KEY, config: state.storeConfig, updatedAt: new Date() };
  return null;
});

vi.mock('@shimmer/core', async (importOriginal) => {
  const real = await importOriginal<typeof import('@shimmer/core')>();
  return {
    ...real,
    getPrisma: () => ({
      $queryRaw: queryRaw,
      $executeRaw: executeRaw,
      store: { findUnique: storeFindUnique },
      outboundCampaign: {
        findUnique: vi.fn(async ({ where }: { where: { id: number } }) => state.campaigns.find((c) => c.id === where.id) ?? null),
        findMany: vi.fn(async () => state.campaigns.filter((c) => c.status === 'scheduled')),
        updateMany: campaignUpdateMany,
        update: vi.fn(async ({ where, data }: { where: { id: number }; data: Partial<Campaign> }) => Object.assign(state.campaigns.find((c) => c.id === where.id)!, data)),
      },
    }),
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  };
});
const sendEmail = vi.fn(async (_input: Record<string, unknown>) => ({ id: 77, status: 'mock', provider: 'mock' }));
vi.mock('@shimmer/email-connector', () => ({ sendEmail: (i: Record<string, unknown>) => sendEmail(i) }));
vi.mock('../middleware/rate-limiter.js', () => ({
  createScopedRateLimiter: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}));
const patchStoreConfig = vi.fn(async (..._args: unknown[]) => undefined);
vi.mock('../lib/knowledge-ingest.js', () => ({ patchStoreConfig }));

const { shopifyCustomerConsent, wooMarketingConsent, recordPlatformConsent } = await import('../lib/marketing-consent.js');
const { consentSchemaReady, resetConsentSchemaCache } = await import('../lib/consent-schema.js');
const { resetReminderSchemaCache } = await import('../lib/reminder-schema.js');
const { newsletterSettings, processOutboundPublishJob, sweepOutboundPublish } = await import('../lib/automations/outbound-publish.js');
const { storesRouter } = await import('../routes/stores.js');
const { errorHandler } = await import('../middleware/error-handler.js');
const { logger } = await import('@shimmer/core');

function customers(): void {
  state.customers.push(
    { id: 1, storeId: 4, email: 'oui@mail.fr', firstName: 'Alice', consent: true },
    { id: 2, storeId: 4, email: 'non@mail.fr', firstName: 'Bruno', consent: false },
    { id: 3, storeId: 4, email: 'inconnu@mail.fr', firstName: 'Chloé', consent: null },
    { id: 4, storeId: 4, email: ' Desinscrit@Mail.fr', firstName: 'Dan', consent: true },
    { id: 5, storeId: 5, email: 'ailleurs@mail.fr', firstName: 'Eve', consent: true },
  );
  state.suppressed.push({ storeId: 4, email: 'desinscrit@mail.fr', reason: 'unsubscribe' });
}
function newsletter(over: Partial<Campaign> = {}): Campaign {
  const c: Campaign = {
    id: 30, storeId: 4, format: 'newsletter', status: 'scheduled', audience: 'all',
    content: { subject: 'Nos vins d’automne', intro: 'Trois bouteilles pour la saison.' },
    scheduledAt: new Date(Date.now() - 60_000), ...over,
  };
  state.campaigns.push(c);
  return c;
}
const recipients = () => sendEmail.mock.calls.map((call) => call[0]!.to);

let server: Server;
let base: string;
beforeAll(async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/stores', storesRouter);
  app.use(errorHandler);
  server = app.listen(0);
  await new Promise<void>((resolve) => server.once('listening', () => resolve()));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => server?.close());

beforeEach(() => {
  state.customers.length = 0;
  state.orders.length = 0;
  state.suppressed.length = 0;
  state.campaigns.length = 0;
  state.storeConfig = {};
  state.consentMissing = false;
  state.remindersMissing = false;
  state.failUpdate = false;
  state.sqlLog.length = 0;
  resetConsentSchemaCache();
  resetReminderSchemaCache();
  sendEmail.mockClear();
  campaignUpdateMany.mockClear();
  queryRaw.mockClear();
  executeRaw.mockClear();
  patchStoreConfig.mockClear();
  vi.mocked(logger.warn).mockClear();
});

describe('accord Shopify du client', () => {
  it('« subscribed » vaut oui', () => {
    expect(shopifyCustomerConsent({ customer: { email_marketing_consent: { state: 'subscribed' } } })).toBe(true);
  });
  it('les autres états connus valent non, « pending » compris (double opt-in pas confirmé)', () => {
    for (const s of ['not_subscribed', 'unsubscribed', 'pending', 'redacted', 'invalid']) {
      expect(shopifyCustomerConsent({ customer: { email_marketing_consent: { state: s } } })).toBe(false);
    }
  });
  it('l\'état du client l\'emporte sur la case du checkout', () => {
    expect(shopifyCustomerConsent({ buyer_accepts_marketing: true, customer: { email_marketing_consent: { state: 'pending' } } })).toBe(false);
    expect(shopifyCustomerConsent({ buyer_accepts_marketing: false, customer: { email_marketing_consent: { state: 'subscribed' } } })).toBe(true);
  });
  it('sans état : accepts_marketing (ancien champ), puis buyer_accepts_marketing', () => {
    expect(shopifyCustomerConsent({ customer: { accepts_marketing: true } })).toBe(true);
    expect(shopifyCustomerConsent({ customer: { accepts_marketing: false }, buyer_accepts_marketing: true })).toBe(false);
    expect(shopifyCustomerConsent({ buyer_accepts_marketing: true })).toBe(true);
    expect(shopifyCustomerConsent({ buyer_accepts_marketing: false })).toBe(false);
    expect(shopifyCustomerConsent({ customer: { email_marketing_consent: { state: 'nouveau_etat' }, accepts_marketing: true } })).toBe(true);
  });
  it('rien dans le payload : null (on ne sait pas)', () => {
    expect(shopifyCustomerConsent({})).toBeNull();
    expect(shopifyCustomerConsent({ customer: null })).toBeNull();
    expect(shopifyCustomerConsent({ customer: { email_marketing_consent: null } })).toBeNull();
  });
});

describe('accord WooCommerce (Mailchimp for WooCommerce)', () => {
  const order = (value: unknown) => ({ meta_data: [{ key: 'shimmer_vid', value: 'abcd' }, { key: 'mailchimp_woocommerce_is_subscribed', value }] });
  it('« 1 » ou true : oui', () => {
    expect(wooMarketingConsent(order('1'))).toBe(true);
    expect(wooMarketingConsent(order(true))).toBe(true);
  });
  it('« » (case non cochée), « 0 » ou false : non', () => {
    for (const v of ['', '0', false, 0]) expect(wooMarketingConsent(order(v))).toBe(false);
  });
  it('pas de méta, méta illisible ou payload tordu : null', () => {
    expect(wooMarketingConsent({ meta_data: [{ key: 'shimmer_vid', value: 'abcd' }] })).toBeNull();
    expect(wooMarketingConsent({})).toBeNull();
    expect(wooMarketingConsent({ meta_data: 'x' })).toBeNull();
    expect(wooMarketingConsent({ meta_data: [null] })).toBeNull();
    expect(wooMarketingConsent(order('peut-être'))).toBeNull();
    expect(wooMarketingConsent(order({ v: 1 }))).toBeNull();
  });
});

describe('enregistrement de l\'accord', () => {
  const input = { storeId: 4, customerId: 3, email: 'inconnu@mail.fr', optedOut: false, source: 'shopify' as const };
  it('oui ou non : écrit sur le client de la boutique', async () => {
    customers();
    await recordPlatformConsent({ ...input, consent: true });
    expect(state.customers.find((c) => c.id === 3)!.consent).toBe(true);
    const call = executeRaw.mock.calls.find((c) => sqlText(c[0]).startsWith('UPDATE customers'))!;
    expect(call.slice(1)).toEqual([true, 3, 4, true]);
    expect(sqlText(call[0])).toContain('AND store_id = ?');
  });
  it('plateforme muette : un accord connu n\'est jamais effacé', async () => {
    customers();
    await recordPlatformConsent({ ...input, customerId: 1, email: 'oui@mail.fr', consent: null });
    expect(state.customers.find((c) => c.id === 1)!.consent).toBe(true);
    expect(executeRaw).not.toHaveBeenCalled();
  });
  it('désinscrit côté plateforme : accord à non ET adresse dans les désinscrits', async () => {
    customers();
    await recordPlatformConsent({ ...input, customerId: 1, email: 'Oui@Mail.fr', consent: false, optedOut: true });
    expect(state.customers.find((c) => c.id === 1)!.consent).toBe(false);
    expect(state.suppressed).toContainEqual({ storeId: 4, email: 'oui@mail.fr', reason: 'platform_unsubscribed' });
  });
  it('SQL pas encore passé : rien d\'écrit, rien ne casse', async () => {
    customers();
    state.consentMissing = true;
    state.remindersMissing = true;
    await expect(recordPlatformConsent({ ...input, consent: false, optedOut: true })).resolves.toBeUndefined();
    expect(executeRaw).not.toHaveBeenCalled();
    expect(state.customers.find((c) => c.id === 3)!.consent).toBeNull();
  });
  it('erreur de base : journalisée, jamais remontée au webhook', async () => {
    customers();
    state.failUpdate = true;
    await expect(recordPlatformConsent({ ...input, consent: true })).resolves.toBeUndefined();
    expect(logger.warn).toHaveBeenCalledWith(expect.objectContaining({ customerId: 3 }), 'consent.record-failed');
  });
});

describe('schéma de l\'accord', () => {
  it('colonne absente : non, revérifié une minute plus tard, puis oui pour de bon', async () => {
    state.consentMissing = true;
    expect(await consentSchemaReady(1_000_000)).toBe(false);
    state.consentMissing = false;
    expect(await consentSchemaReady(1_030_000)).toBe(false);
    expect(await consentSchemaReady(1_061_000)).toBe(true);
    state.consentMissing = true;
    expect(await consentSchemaReady(1_200_000)).toBe(true);
  });
});

describe('réglages newsletter', () => {
  it('par défaut : seulement les abonnés', () => {
    for (const config of [null, undefined, {}, { newsletter: null }, { newsletter: {} }, { newsletter: { audience: 'tous' } }, 'x']) {
      expect(newsletterSettings(config)).toEqual({ audience: 'subscribers' });
    }
  });
  it('« all » seulement si la boutique l\'a choisi', () => {
    expect(newsletterSettings({ newsletter: { audience: 'all' } })).toEqual({ audience: 'all' });
    expect(newsletterSettings({ cart_reminders: { audience: 'all' } })).toEqual({ audience: 'subscribers' });
  });
});

describe('envoi de la newsletter', () => {
  it('par défaut : seulement les clients qui ont accepté, jamais les désinscrits ni une autre boutique', async () => {
    customers();
    newsletter();
    const r = await processOutboundPublishJob({ campaignId: 30 });
    expect(r).toEqual({ published: true, queued: 1 });
    expect(recipients()).toEqual(['oui@mail.fr']);
    expect(state.campaigns[0]!.status).toBe('published');
    expect(state.campaigns[0]!.metrics).toEqual({ audienceReached: 1, consentAudience: 'subscribers' });
    // Le SQL a été vérifié sur un vrai Postgres ; ici, on garde ses clauses telles quelles.
    const sql = state.sqlLog.find((s) => s.includes('FROM customers c'))!;
    expect(sql).toContain('WHERE c.store_id = ? AND (?::boolean OR c.marketing_consent IS TRUE) AND (');
    expect(sql).toContain('AND NOT EXISTS ( SELECT 1 FROM email_suppressions s WHERE s.store_id = c.store_id AND lower(s.email) = lower(trim(c.email))) ORDER BY c.id LIMIT ?');
    expect(sql).toContain('(?::timestamp IS NULL OR NOT EXISTS ( SELECT 1 FROM orders o WHERE o.customer_id = c.id AND o.ordered_at >= ?::timestamp))');
    expect(sendEmail.mock.calls[0]![0]).toMatchObject({ subject: 'Nos vins d’automne', tag: 'outbound-newsletter', relatedId: 30 });
    expect(String(sendEmail.mock.calls[0]![0].bodyText)).toContain('Bonjour Alice');
  });
  it('audience « all » choisie par la boutique : tous les clients, sauf les désinscrits', async () => {
    customers();
    state.storeConfig = { newsletter: { audience: 'all' } };
    newsletter();
    const r = await processOutboundPublishJob({ campaignId: 30 });
    expect(r.queued).toBe(3);
    expect(recipients()).toEqual(['oui@mail.fr', 'non@mail.fr', 'inconnu@mail.fr']);
    expect(state.campaigns[0]!.metrics).toEqual({ audienceReached: 3, consentAudience: 'all' });
  });
  it('campagne « dormants » : les abonnés sans commande depuis 60 jours', async () => {
    customers();
    state.customers.push({ id: 6, storeId: 4, email: 'fidele@mail.fr', firstName: 'Fred', consent: true });
    state.orders.push({ customerId: 6, at: new Date(Date.now() - 5 * 86_400_000) }, { customerId: 1, at: new Date(Date.now() - 200 * 86_400_000) });
    newsletter({ audience: 'dormant' });
    await processOutboundPublishJob({ campaignId: 30 });
    expect(recipients()).toEqual(['oui@mail.fr']);
    const call = queryRaw.mock.calls.find((c) => sqlText(c[0]).includes('FROM customers c'))!;
    const since = call[3] as Date;
    expect(Math.abs(Date.now() - 60 * 86_400_000 - since.getTime())).toBeLessThan(5_000);
  });
  it('désinscrit dont l\'adresse a une tabulation : écarté quand même (même normalisation qu\'à la désinscription)', async () => {
    state.customers.push(
      { id: 1, storeId: 4, email: 'oui@mail.fr', firstName: 'Alice', consent: true },
      { id: 9, storeId: 4, email: 'Tab@Mail.fr\t', firstName: 'Tom', consent: true },
    );
    state.suppressed.push({ storeId: 4, email: 'tab@mail.fr', reason: 'unsubscribe' });
    newsletter();
    await processOutboundPublishJob({ campaignId: 30 });
    expect(recipients()).toEqual(['oui@mail.fr']);
  });
  it('aucun client abonné : publiée, zéro envoi (jamais tout le monde par défaut)', async () => {
    state.customers.push({ id: 3, storeId: 4, email: 'inconnu@mail.fr', firstName: 'Chloé', consent: null });
    newsletter();
    expect(await processOutboundPublishJob({ campaignId: 30 })).toEqual({ published: true, queued: 0 });
    expect(sendEmail).not.toHaveBeenCalled();
  });
  it('colonne d\'accord absente : en pause, ni réservée ni envoyée, puis part quand le SQL est passé', async () => {
    customers();
    newsletter();
    state.consentMissing = true;
    expect(await processOutboundPublishJob({ campaignId: 30 })).toEqual({ published: false, queued: 0, reason: 'newsletter-paused' });
    const swept = await sweepOutboundPublish();
    expect(swept).toMatchObject({ scanned: 1, publishedWithFanout: 0, errors: 0 });
    expect(campaignUpdateMany).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
    expect(state.campaigns[0]!.status).toBe('scheduled');
    expect(state.sqlLog.some((s) => s.includes('FROM customers'))).toBe(false);

    state.consentMissing = false;
    resetConsentSchemaCache();
    const later = await sweepOutboundPublish();
    expect(later).toMatchObject({ publishedWithFanout: 1, totalEmailsQueued: 1 });
    expect(recipients()).toEqual(['oui@mail.fr']);
  });
  it('table des désinscrits absente : en pause aussi (le lien de désinscription ne marcherait pas)', async () => {
    customers();
    newsletter();
    state.remindersMissing = true;
    expect((await processOutboundPublishJob({ campaignId: 30 })).reason).toBe('newsletter-paused');
    expect(sendEmail).not.toHaveBeenCalled();
    expect(state.campaigns[0]!.status).toBe('scheduled');
  });
  it('les autres formats ne dépendent pas du SQL', async () => {
    state.consentMissing = true;
    newsletter({ format: 'ads' });
    expect(await processOutboundPublishJob({ campaignId: 30 })).toEqual({ published: true, queued: 0 });
    expect(state.campaigns[0]!.status).toBe('published');
  });
});

async function patch(body: unknown) {
  const res = await fetch(`${base}/api/stores/me/config`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SECRET_KEY}` },
    body: JSON.stringify(body),
  });
  return { status: res.status };
}

describe('PATCH /api/stores/me/config { newsletter }', () => {
  it('audience « all » ou « subscribers » enregistrée', async () => {
    expect((await patch({ newsletter: { audience: 'all' } })).status).toBe(200);
    expect(patchStoreConfig.mock.calls[0]!.slice(1)).toEqual([4, { newsletter: { audience: 'all' } }, []]);
    expect((await patch({ newsletter: { audience: 'subscribers' } })).status).toBe(200);
  });
  it('null : retour au défaut (abonnés)', async () => {
    expect((await patch({ newsletter: null })).status).toBe(200);
    expect(patchStoreConfig.mock.calls[0]!.slice(1)).toEqual([4, {}, ['newsletter']]);
  });
  it('valeur ou clé inconnue refusée', async () => {
    expect((await patch({ newsletter: { audience: 'everyone' } })).status).toBe(400);
    expect((await patch({ newsletter: { audience: 'all', segment: 'vip' } })).status).toBe(400);
    expect(patchStoreConfig).not.toHaveBeenCalled();
  });
});
