import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import express from 'express';
import crypto from 'crypto';
import type { AddressInfo } from 'net';
import type { Server } from 'http';

// Accord marketing relevé sur les commandes (01/10) : orders_paid Shopify et
// commandes WooCommerce, de bout en bout par la route signée. La base est
// simulée ; les requêtes SQL brutes sont reconnues à leur texte.
process.env.SHIMMER_PK_SECRET = 'test-secret-consent-webhooks';
delete process.env.ALLOW_UNSIGNED_WEBHOOKS;

const SHOPIFY_SECRET = 'shpss_test_consent';
const WOO_SECRET = 'woo_test_consent';
type Customer = { id: number; storeId: number; email: string; consent: boolean | null };
const state = {
  customers: [] as Customer[],
  orders: [] as Array<{ id: number; orderNumber: string; status: string }>,
  suppressed: [] as Array<{ storeId: number; email: string; reason: string }>,
  consentMissing: false,
  remindersMissing: false,
};

const sqlText = (strings: TemplateStringsArray) => strings.join('?').replace(/\s+/g, ' ').trim();

const queryRaw = vi.fn(async (strings: TemplateStringsArray) => {
  const sql = sqlText(strings);
  if (sql.includes('AS consent_col')) return [{ consent_col: !state.consentMissing }];
  if (sql.includes('information_schema.columns')) return [{ cols: state.remindersMissing ? 0 : 3, tbl: !state.remindersMissing }];
  throw new Error(`requête inattendue : ${sql}`);
});
const executeRaw = vi.fn(async (strings: TemplateStringsArray, ...values: unknown[]) => {
  const sql = sqlText(strings);
  if (sql.startsWith('UPDATE customers SET marketing_consent')) {
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
  if (sql.startsWith('UPDATE abandoned_carts')) return 0;
  throw new Error(`requête inattendue : ${sql}`);
});
const consentWrites = () => executeRaw.mock.calls.filter((c) => sqlText(c[0]).startsWith('UPDATE customers'));

vi.mock('@shimmer/core', async (importOriginal) => {
  const real = await importOriginal<typeof import('@shimmer/core')>();
  return {
    ...real,
    getPrisma: () => ({
      $queryRaw: queryRaw,
      $executeRaw: executeRaw,
      store: {
        findUnique: vi.fn(async ({ where }: { where: { id: number } }) => (where.id === 4
          ? { id: 4, config: { shopify: { webhookSecret: SHOPIFY_SECRET }, woocommerce: { webhookSecret: WOO_SECRET } } }
          : null)),
      },
      customer: {
        findFirst: vi.fn(async ({ where }: { where: { storeId: number; email: string } }) =>
          state.customers.find((c) => c.storeId === where.storeId && c.email === where.email) ?? null),
        create: vi.fn(async ({ data }: { data: { storeId: number; email: string } }) => {
          const c = { id: 100 + state.customers.length, storeId: data.storeId, email: data.email, consent: null };
          state.customers.push(c);
          return c;
        }),
      },
      order: {
        findFirst: vi.fn(async ({ where }: { where: { orderNumber: string } }) => state.orders.find((o) => o.orderNumber === where.orderNumber) ?? null),
        create: vi.fn(async ({ data }: { data: { orderNumber: string; status: string } }) => {
          const o = { id: 500 + state.orders.length, orderNumber: data.orderNumber, status: data.status, orderedAt: new Date() };
          state.orders.push(o);
          return o;
        }),
        update: vi.fn(async ({ where, data }: { where: { id: number }; data: { status: string } }) => Object.assign(state.orders.find((o) => o.id === where.id)!, data)),
      },
    }),
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  };
});
vi.mock('../lib/automations/queue.js', () => ({ enqueueCartReminders: vi.fn(), enqueueReviewRequest: vi.fn() }));
vi.mock('../lib/attribution.js', () => ({ attributeOrderToChat: vi.fn(async () => undefined) }));
vi.mock('../routes/holdout.js', () => ({ recordOrderForVisitor: vi.fn(async () => undefined) }));
vi.mock('../lib/stock-alerts.js', () => ({ detectRestock: vi.fn(), notifyRestock: vi.fn(), recordStockAlertConversions: vi.fn(async () => undefined) }));
vi.mock('../lib/review-on-delivery.js', () => ({ scheduleReviewOnDelivery: vi.fn(), scheduleReviewAfterShipping: vi.fn(async () => undefined) }));
vi.mock('../lib/order-items.js', () => ({ linkOrderItems: vi.fn(async () => undefined) }));
vi.mock('../lib/order-reversal.js', () => ({ reverseOrderEffects: vi.fn(async () => undefined) }));
vi.mock('../lib/shopify-products.js', () => ({
  syncCatalogProduct: vi.fn(), syncCatalogFields: vi.fn(), deactivateCatalogProduct: vi.fn(), refreshProductStock: vi.fn(),
}));

const { webhooksShopifyRouter } = await import('../routes/webhooks-shopify.js');
const { webhooksWooCommerceRouter } = await import('../routes/webhooks-woocommerce.js');
const { errorHandler } = await import('../middleware/error-handler.js');
const { resetConsentSchemaCache } = await import('../lib/consent-schema.js');
const { resetReminderSchemaCache } = await import('../lib/reminder-schema.js');

let server: Server;
let base: string;
beforeAll(async () => {
  const app = express();
  app.use('/api/webhooks/shopify', webhooksShopifyRouter);
  app.use('/api/webhooks/woocommerce', webhooksWooCommerceRouter);
  app.use(errorHandler);
  server = app.listen(0);
  await new Promise<void>((resolve) => server.once('listening', () => resolve()));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/webhooks`;
});
afterAll(() => server?.close());
beforeEach(() => {
  state.customers.length = 0;
  state.orders.length = 0;
  state.suppressed.length = 0;
  state.consentMissing = false;
  state.remindersMissing = false;
  resetConsentSchemaCache();
  resetReminderSchemaCache();
  executeRaw.mockClear();
});

const sign = (secret: string, body: string) => crypto.createHmac('sha256', secret).update(body).digest('base64');

async function shopifyPaid(payload: Record<string, unknown>) {
  const body = JSON.stringify({ id: 9001, name: '#1001', total_price: '42.00', line_items: [], ...payload });
  const res = await fetch(`${base}/shopify/orders_paid?store=4`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Hmac-Sha256': sign(SHOPIFY_SECRET, body) },
    body,
  });
  return { status: res.status, json: await res.json() as Record<string, unknown> };
}

async function wooOrder(payload: Record<string, unknown>) {
  const body = JSON.stringify({ id: 77, number: '77', status: 'processing', total: '30.00', billing: { email: 'marie@mail.fr', first_name: 'Marie' }, line_items: [], ...payload });
  const res = await fetch(`${base}/woocommerce/order_created?store=4`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-WC-Webhook-Signature': sign(WOO_SECRET, body) },
    body,
  });
  return { status: res.status, json: await res.json() as Record<string, unknown> };
}

describe('Shopify orders_paid : accord du client', () => {
  it('« subscribed » : nouveau client enregistré avec accord', async () => {
    const r = await shopifyPaid({ email: 'chloe@mail.fr', customer: { first_name: 'Chloé', email_marketing_consent: { state: 'subscribed' } } });
    expect(r.status).toBe(200);
    expect(r.json.accepted).toBe(true);
    expect(state.customers).toEqual([expect.objectContaining({ storeId: 4, email: 'chloe@mail.fr', consent: true })]);
    expect(consentWrites()[0]!.slice(1)).toEqual([true, r.json.customerId, 4, true]);
  });
  it('désinscrit côté Shopify : accord retiré et adresse dans les désinscrits', async () => {
    state.customers.push({ id: 7, storeId: 4, email: 'chloe@mail.fr', consent: true });
    const r = await shopifyPaid({ email: 'chloe@mail.fr', customer: { email_marketing_consent: { state: 'unsubscribed' } } });
    expect(r.status).toBe(200);
    expect(state.customers[0]!.consent).toBe(false);
    expect(state.suppressed).toEqual([{ storeId: 4, email: 'chloe@mail.fr', reason: 'platform_unsubscribed' }]);
  });
  it('case du checkout non cochée : non, mais pas de désinscription', async () => {
    const r = await shopifyPaid({ email: 'paul@mail.fr', buyer_accepts_marketing: false });
    expect(r.status).toBe(200);
    expect(state.customers[0]!.consent).toBe(false);
    expect(state.suppressed).toEqual([]);
  });
  it('rien dans le payload : l\'accord connu reste', async () => {
    state.customers.push({ id: 7, storeId: 4, email: 'chloe@mail.fr', consent: true });
    const r = await shopifyPaid({ email: 'chloe@mail.fr', customer: { first_name: 'Chloé' } });
    expect(r.status).toBe(200);
    expect(state.customers[0]!.consent).toBe(true);
    expect(consentWrites()).toEqual([]);
  });
  it('SQL pas encore passé : la commande est enregistrée quand même, rien sur l\'accord', async () => {
    state.consentMissing = true;
    state.remindersMissing = true;
    const r = await shopifyPaid({ email: 'chloe@mail.fr', customer: { email_marketing_consent: { state: 'unsubscribed' } } });
    expect(r.status).toBe(200);
    expect(r.json.accepted).toBe(true);
    expect(state.orders).toHaveLength(1);
    expect(consentWrites()).toEqual([]);
    expect(state.suppressed).toEqual([]);
  });
  it('désinscription impossible (table absente) : l\'accord passe quand même à non', async () => {
    state.remindersMissing = true;
    state.customers.push({ id: 7, storeId: 4, email: 'chloe@mail.fr', consent: true });
    const r = await shopifyPaid({ email: 'chloe@mail.fr', customer: { email_marketing_consent: { state: 'unsubscribed' } } });
    expect(r.status).toBe(200);
    expect(state.customers[0]!.consent).toBe(false);
    expect(state.suppressed).toEqual([]);
    expect(state.orders).toHaveLength(1);
  });
  it('client effacé côté Shopify (« redacted ») : non, et désinscrit', async () => {
    const r = await shopifyPaid({ email: 'efface@mail.fr', customer: { email_marketing_consent: { state: 'redacted' } } });
    expect(r.status).toBe(200);
    expect(state.customers[0]!.consent).toBe(false);
    expect(state.suppressed).toEqual([{ storeId: 4, email: 'efface@mail.fr', reason: 'platform_unsubscribed' }]);
  });
  it('signature fausse : refusée avant tout', async () => {
    const res = await fetch(`${base}/shopify/orders_paid?store=4`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Shopify-Hmac-Sha256': 'faux' },
      body: JSON.stringify({ email: 'x@mail.fr', customer: { email_marketing_consent: { state: 'subscribed' } } }),
    });
    expect(res.status).toBe(401);
    expect(executeRaw).not.toHaveBeenCalled();
  });
});

describe('WooCommerce : accord posé par Mailchimp for WooCommerce', () => {
  it('méta à « 1 » : accord enregistré', async () => {
    const r = await wooOrder({ meta_data: [{ key: 'mailchimp_woocommerce_is_subscribed', value: '1' }] });
    expect(r.status).toBe(200);
    expect(state.customers[0]).toMatchObject({ email: 'marie@mail.fr', consent: true });
  });
  it('« » (case non cochée) : non, sans désinscription', async () => {
    const r = await wooOrder({ meta_data: [{ key: 'mailchimp_woocommerce_is_subscribed', value: '' }] });
    expect(r.status).toBe(200);
    expect(state.customers[0]!.consent).toBe(false);
    expect(state.suppressed).toEqual([]);
  });
  it('SQL pas encore passé : commande traitée, rien sur l\'accord', async () => {
    state.consentMissing = true;
    const r = await wooOrder({ meta_data: [{ key: 'mailchimp_woocommerce_is_subscribed', value: '1' }] });
    expect(r.status).toBe(200);
    expect(r.json.accepted).toBe(true);
    expect(state.orders).toHaveLength(1);
    expect(consentWrites()).toEqual([]);
  });
  it('sans méta (Woo de base) : rien d\'écrit, l\'accord connu reste', async () => {
    state.customers.push({ id: 8, storeId: 4, email: 'marie@mail.fr', consent: true });
    const r = await wooOrder({ meta_data: [{ key: 'shimmer_vid', value: 'abcd1234' }] });
    expect(r.status).toBe(200);
    expect(state.customers[0]!.consent).toBe(true);
    expect(consentWrites()).toEqual([]);
    expect(state.suppressed).toEqual([]);
  });
});
