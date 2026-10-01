import { describe, it, expect, vi, beforeEach } from 'vitest';

// Relances de panier remises d'aplomb (01/10) : un panier par checkout, pas de
// faux code promo, accord marketing, désinscription, pas de relance après une
// commande. La base est simulée ; les requêtes SQL brutes sont reconnues à
// leur texte.
process.env.SHIMMER_PK_SECRET = 'test-secret-for-unsubscribe-tokens';

type Cart = Record<string, unknown> & { id: number };
const state = {
  carts: [] as Cart[],
  suppressed: new Set<string>(),
  orders: [] as Array<{ storeId: number; email: string; at: Date; total: number; status: string }>,
  storeConfig: {} as Record<string, unknown>,
  existingRef: null as null | { id: number; recovered: boolean },
  upsertReturn: [] as Array<{ id: number; inserted: boolean }>,
  sqlLog: [] as string[],
  schemaMissing: false,
  redis: new Map<string, string>(),
};

const sqlText = (strings: TemplateStringsArray) => strings.join('?').replace(/\s+/g, ' ').trim();

const queryRaw = vi.fn(async (strings: TemplateStringsArray, ...values: unknown[]) => {
  const sql = sqlText(strings);
  state.sqlLog.push(sql);
  if (sql.includes('information_schema.columns')) return [{ cols: state.schemaMissing ? 0 : 3, tbl: !state.schemaMissing }];
  if (sql.includes('FROM email_suppressions') && sql.includes('LIMIT 1')) {
    return state.suppressed.has(`${values[0]}:${values[1]}`) ? [{ one: 1 }] : [];
  }
  if (sql.startsWith('SELECT marketing_consent, checkout_url')) {
    const c = state.carts.find((x) => x.id === values[0]);
    return c ? [{ marketing_consent: c.marketingConsent ?? null, checkout_url: c.checkoutUrl ?? null }] : [];
  }
  if (sql.includes('FROM orders o JOIN customers c')) {
    const [storeId, email, since] = values as [number, string, Date];
    const o = state.orders.find((x) => x.storeId === storeId && x.email.toLowerCase() === email && x.at >= since
      && !['pending', 'cancelled', 'returned'].includes(x.status));
    return o ? [{ one: 1 }] : [];
  }
  if (sql.startsWith('SELECT 1 AS one FROM abandoned_carts')) {
    const [storeId, id, email, abandonedAt, since] = values as [number, number, string, Date, Date];
    const other = state.carts.find((x) => x.storeId === storeId && x.id !== id && String(x.customerEmail ?? '').toLowerCase() === email && (
      (!x.recoveredAt && ['pending', 'abandoned', 'reminded_once'].includes(x.status as string) && (x.abandonedAt as Date) > abandonedAt)
      || (x.reminder1At && (x.reminder1At as Date) > since) || (x.reminder2At && (x.reminder2At as Date) > since)));
    return other ? [{ one: 1 }] : [];
  }
  if (sql.startsWith('SELECT id, recovered_at IS NOT NULL AS recovered')) {
    return state.existingRef ? [state.existingRef] : [];
  }
  if (sql.startsWith('INSERT INTO abandoned_carts')) {
    if (sql.includes('ON CONFLICT')) return state.upsertReturn;
    return [{ id: 501 }];
  }
  throw new Error(`requête inattendue : ${sql}`);
});
const executeRaw = vi.fn(async (strings: TemplateStringsArray, ...values: unknown[]) => {
  const sql = sqlText(strings);
  state.sqlLog.push(sql);
  if (sql.startsWith('INSERT INTO email_suppressions')) { state.suppressed.add(`${values[0]}:${values[1]}`); return 1; }
  if (sql.startsWith('UPDATE abandoned_carts SET status = \'recovered\'')) return 1;
  throw new Error(`requête inattendue : ${sql}`);
});

const updateMany = vi.fn(async ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
  const c = state.carts.find((x) => x.id === where.id);
  if (!c) return { count: 0 };
  if ('recoveredAt' in where && c.recoveredAt) return { count: 0 };
  if (where.reminder1At === null && c.reminder1At) return { count: 0 };
  if ('reminder2At' in where && c.reminder2At) return { count: 0 };
  Object.assign(c, data);
  return { count: 1 };
});

vi.mock('@shimmer/core', () => ({
  getPrisma: () => ({
    $queryRaw: queryRaw,
    $executeRaw: executeRaw,
    store: { findUnique: vi.fn(async () => ({ id: 4, name: 'Caves Forty-Two', config: state.storeConfig })) },
    abandonedCartCreate: null,
    customer: { findFirst: vi.fn(async () => null) },
    abandonedCart: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: 900, ...data })),
      updateMany,
      update: vi.fn(async ({ where, data }: { where: { id: number }; data: Record<string, unknown> }) => Object.assign(state.carts.find((x) => x.id === where.id)!, data)),
      findUnique: vi.fn(async ({ where }: { where: { id: number } }) => state.carts.find((x) => x.id === where.id) ?? null),
    },
  }),
  getRedis: () => ({
    exists: vi.fn(async (k: string) => (state.redis.has(k) ? 1 : 0)),
    set: vi.fn(async (k: string, v: string) => { state.redis.set(k, v); return 'OK'; }),
  }),
  logger: { info: vi.fn(), warn: vi.fn() },
}));
const sendEmail = vi.fn(async (_input: Record<string, unknown>) => ({ id: 77, status: 'mock', provider: 'mock' }));
vi.mock('@shimmer/email-connector', () => ({ sendEmail: (i: Record<string, unknown>) => sendEmail(i) }));
// Aucun panier de ces tests n'est dans le groupe témoin.
vi.mock('../lib/holdout/bucket.js', () => ({ isControlCart: () => false, resolveHoldoutConfig: () => ({}) }));

const { buildReminder, reminderSettings, sendCartReminder, processCartReminderJob } = await import('../lib/automations/cart-reminders.js');
const { shopifyMarketingConsent, shopifyExplicitOptOut, safeCheckoutUrl, upsertCart, completeCart, recoverCartsForOrder } = await import('../lib/abandoned-carts.js');
const { resetReminderSchemaCache } = await import('../lib/reminder-schema.js');
const { unsubscribeToken, readUnsubscribeToken, unsubscribeUrl, suppressEmail } = await import('../lib/unsubscribe.js');

const HOUR = 3600_000;
function cart(over: Partial<Cart> = {}): Cart {
  const c: Cart = {
    id: 10, storeId: 4, customerId: null, customerEmail: 'Chloe@Mail.fr',
    items: [{ name: 'Brouilly 2022', price: 15, quantity: 2 }], totalAmount: '30.00',
    abandonedAt: new Date(Date.now() - 2 * HOUR), reminder1At: null, reminder2At: null, recoveredAt: null,
    status: 'pending', marketingConsent: true, checkoutUrl: 'https://cave.myshopify.com/recover/abc',
    ...over,
  };
  state.carts.push(c);
  return c;
}

beforeEach(() => {
  state.carts.length = 0;
  state.suppressed.clear();
  state.orders.length = 0;
  state.storeConfig = {};
  state.existingRef = null;
  state.upsertReturn = [];
  state.sqlLog.length = 0;
  state.schemaMissing = false;
  state.redis.clear();
  resetReminderSchemaCache();
  sendEmail.mockClear();
});

describe('texte des relances', () => {
  const base = { storeName: 'Caves Forty-Two', items: [{ name: 'A' }, { name: 'B' }, { name: 'C' }, { name: 'D' }], total: 38 };
  it('n°1 : produits, total à la française, lien pour reprendre la commande', () => {
    const r = buildReminder(1, { ...base, checkoutUrl: 'https://x.myshopify.com/recover/1' });
    expect(r.subject).toBe('Votre panier chez Caves Forty-Two vous attend');
    expect(r.body).toContain('A, B, C et 1 autre (38,00 €)');
    expect(r.body).toContain('Reprendre ma commande : https://x.myshopify.com/recover/1');
  });
  it('n°2 sans code déclaré : aucun code promo inventé', () => {
    const r = buildReminder(2, base);
    expect(r.subject + r.body).not.toMatch(/SHIMMER10|code|%/i);
    expect(r.body).toContain('dernier rappel');
  });
  it('n°2 avec le code de la boutique', () => {
    const r = buildReminder(2, { ...base, discount: { code: 'MERCI10', percent: 10 } });
    expect(r.body).toContain('Avec le code MERCI10, vous avez -10 % sur cette commande.');
  });
  it('sans tiret cadratin', () => {
    for (const step of [1, 2] as const) expect(JSON.stringify(buildReminder(step, base))).not.toContain('\u2014');
  });
});

describe('réglages des relances', () => {
  it('par défaut : abonnés seulement, pas de code', () => {
    expect(reminderSettings({})).toEqual({ audience: 'subscribers', discountCode: null, discountPercent: null });
  });
  it('code sans pourcentage, ou code invalide : ignoré', () => {
    expect(reminderSettings({ cart_reminders: { discount_code: 'MERCI10' } }).discountCode).toBeNull();
    expect(reminderSettings({ cart_reminders: { discount_code: 'a b;', discount_percent: 10 } }).discountCode).toBeNull();
    expect(reminderSettings({ cart_reminders: { audience: 'all', discount_code: 'MERCI10', discount_percent: 10 } }))
      .toEqual({ audience: 'all', discountCode: 'MERCI10', discountPercent: 10 });
  });
});

describe('accord marketing et lien Shopify', () => {
  it('lit la case du checkout puis l\'état du client', () => {
    expect(shopifyMarketingConsent({ buyer_accepts_marketing: true })).toBe(true);
    expect(shopifyMarketingConsent({ buyer_accepts_marketing: false })).toBe(false);
    expect(shopifyMarketingConsent({ customer: { email_marketing_consent: { state: 'subscribed' } } })).toBe(true);
    expect(shopifyMarketingConsent({ buyer_accepts_marketing: false, customer: { email_marketing_consent: { state: 'subscribed' } } })).toBe(true);
    expect(shopifyMarketingConsent({ customer: { email_marketing_consent: { state: 'not_subscribed' } } })).toBe(false);
    expect(shopifyMarketingConsent({})).toBeNull();
  });
  it('lien de reprise : https seulement', () => {
    expect(safeCheckoutUrl('https://cave.myshopify.com/recover/1')).toBe('https://cave.myshopify.com/recover/1');
    expect(safeCheckoutUrl('javascript:alert(1)')).toBeNull();
    expect(safeCheckoutUrl('http://x.fr')).toBeNull();
    expect(safeCheckoutUrl('x'.repeat(2000))).toBeNull();
  });
});

describe('un panier par checkout', () => {
  const input = {
    storeId: 4, platformRef: 'shopify:tok123', email: 'Chloe@Mail.fr',
    items: [{ name: 'Brouilly', price: 15, quantity: 1, productId: 1 }], total: 15,
    lastActivityAt: new Date(), marketingConsent: true, checkoutUrl: null,
  };
  it('nouveau checkout sans e-mail : rien n\'est créé', async () => {
    expect(await upsertCart({ ...input, email: null })).toEqual({ action: 'ignored', reason: 'no-email' });
    expect(state.sqlLog.some((s) => s.startsWith('INSERT'))).toBe(false);
  });
  it('checkout déjà récupéré : plus touché', async () => {
    state.existingRef = { id: 3, recovered: true };
    expect(await upsertCart(input)).toEqual({ action: 'ignored', reason: 'already-recovered' });
  });
  it('création puis mise à jour du même checkout (ON CONFLICT, adresse en minuscules)', async () => {
    state.upsertReturn = [{ id: 9, inserted: true }];
    expect(await upsertCart(input)).toEqual({ action: 'created', cartId: 9 });
    const insertArgs = queryRaw.mock.calls.at(-1)!;
    expect(insertArgs).toContain('chloe@mail.fr');
    expect(insertArgs).toContain('shopify:tok123');
    state.existingRef = { id: 9, recovered: false };
    state.upsertReturn = [{ id: 9, inserted: false }];
    expect(await upsertCart(input)).toEqual({ action: 'updated', cartId: 9 });
  });
});

describe('cas limites des paniers', () => {
  const input = {
    storeId: 4, platformRef: 'shopify:tokX', email: 'x@y.fr',
    items: [{ name: 'Brouilly', price: 15, quantity: 1, productId: 1 }], total: 15,
    lastActivityAt: new Date(), marketingConsent: true, checkoutUrl: null,
  };
  it('checkout terminé AVANT que son panier existe : le panier n\'est jamais créé ensuite', async () => {
    expect(await completeCart(4, 'shopify:tokX', 15)).toBe(1);
    expect(await upsertCart(input)).toEqual({ action: 'ignored', reason: 'already-completed' });
    expect(state.sqlLog.some((s) => s.startsWith('INSERT INTO abandoned_carts'))).toBe(false);
  });
  it('SQL pas encore passé : panier créé comme avant (Prisma), sans les nouvelles colonnes', async () => {
    state.schemaMissing = true;
    expect(await upsertCart(input)).toEqual({ action: 'created', cartId: 900 });
    expect(state.sqlLog.filter((s) => !s.includes('information_schema')).some((s) => s.includes('platform_ref'))).toBe(false);
  });
  it('mise à jour : l\'horloge ne bouge que pour un panier encore « pending » sans relance, et un « no_consent » rouvre si l\'accord arrive', async () => {
    state.existingRef = { id: 9, recovered: false };
    state.upsertReturn = [{ id: 9, inserted: false }];
    await upsertCart(input);
    const sql = state.sqlLog.find((x) => x.includes('ON CONFLICT'))!;
    expect(sql).toContain("WHEN abandoned_carts.status = 'pending' AND abandoned_carts.reminder1_at IS NULL THEN GREATEST");
    expect(sql).toContain("WHEN abandoned_carts.status = 'no_consent' AND abandoned_carts.reminder1_at IS NULL AND EXCLUDED.marketing_consent IS TRUE THEN 'pending'");
  });
  it('récupération à la commande : égalité exacte (casse ignorée), jamais ILIKE', async () => {
    await recoverCartsForOrder(4, 'Lea_Mercier@Example.com', new Date(), 42);
    const sql = state.sqlLog.at(-1)!;
    expect(sql).toContain('lower(customer_email) = ?');
    expect(sql).not.toMatch(/ILIKE/i);
    expect(executeRaw.mock.calls.at(-1)!).toContain('lea_mercier@example.com');
  });
  it('refus explicite côté Shopify reconnu', () => {
    expect(shopifyExplicitOptOut({ customer: { email_marketing_consent: { state: 'unsubscribed' } } })).toBe(true);
    expect(shopifyExplicitOptOut({ buyer_accepts_marketing: false })).toBe(false);
  });
});

describe('avant chaque envoi', () => {
  it('accord donné : envoi avec lien de désinscription, lien masqué en base', async () => {
    const c = cart();
    const r = await sendCartReminder(c as never, 1);
    expect(r.status).toBe('sent');
    const mail = sendEmail.mock.calls[0]![0] as { bodyText: string; storedBodyText: string; to: string };
    expect(mail.to).toBe('Chloe@Mail.fr');
    expect(mail.bodyText).toMatch(/\/api\/public\/unsubscribe\?t=[A-Za-z0-9_-]{40,}/);
    expect(mail.bodyText).toContain('Reprendre ma commande : https://cave.myshopify.com/recover/abc');
    expect(mail.storedBodyText).not.toContain('unsubscribe?t=');
    expect((mail as unknown as { unsubscribeUrl: string }).unsubscribeUrl).toMatch(/^https:\/\/.+\/api\/public\/unsubscribe\?t=/);
    expect(c).toMatchObject({ status: 'reminded_once' });
  });
  it('accord inconnu et audience par défaut : pas d\'envoi, panier clos', async () => {
    const c = cart({ marketingConsent: null });
    expect(await sendCartReminder(c as never, 1)).toEqual({ status: 'skipped', reason: 'no-consent' });
    expect(sendEmail).not.toHaveBeenCalled();
    expect(c.status).toBe('no_consent');
  });
  it('audience « all » choisie par la boutique : envoi même sans accord connu', async () => {
    state.storeConfig = { cart_reminders: { audience: 'all' } };
    const c = cart({ marketingConsent: null });
    expect((await sendCartReminder(c as never, 1)).status).toBe('sent');
  });
  it('adresse désinscrite (casse ignorée) : pas d\'envoi', async () => {
    state.suppressed.add('4:chloe@mail.fr');
    const c = cart();
    expect(await sendCartReminder(c as never, 1)).toEqual({ status: 'skipped', reason: 'unsubscribed' });
    expect(c.status).toBe('unsubscribed');
    expect(sendEmail).not.toHaveBeenCalled();
  });
  it('commande payée depuis l\'abandon : pas de relance, et le panier n\'est PAS compté récupéré ici', async () => {
    // Seuls les webhooks de commande récupèrent un panier, pareil pour le
    // groupe témoin : sinon la preuve des relances serait gonflée.
    const c = cart();
    state.orders.push({ storeId: 4, email: 'CHLOE@mail.fr', at: new Date(), total: 30, status: 'confirmed' });
    expect(await sendCartReminder(c as never, 1)).toEqual({ status: 'skipped', reason: 'ordered' });
    expect(c.status).toBe('ordered');
    expect(c.recoveredAt).toBeNull();
    expect(c.recoveredAmount).toBeUndefined();
    expect(sendEmail).not.toHaveBeenCalled();
  });
  it('commande Woo pas encore payée (pending) : ne compte pas comme achat', async () => {
    const c = cart();
    state.orders.push({ storeId: 4, email: 'chloe@mail.fr', at: new Date(), total: 30, status: 'pending' });
    expect((await sendCartReminder(c as never, 1)).status).toBe('sent');
  });
  it('panier plus récent du même client : l\'ancien fil s\'arrête', async () => {
    const old = cart({ id: 20, abandonedAt: new Date(Date.now() - 3 * HOUR) });
    const fresh = cart({ id: 21, abandonedAt: new Date(Date.now() - 2 * HOUR) });
    expect(await sendCartReminder(old as never, 1)).toEqual({ status: 'skipped', reason: 'duplicate' });
    expect(old.status).toBe('duplicate');
    expect((await sendCartReminder(fresh as never, 1)).status).toBe('sent');
    expect(sendEmail).toHaveBeenCalledTimes(1);
  });
  it('relance déjà envoyée à cette adresse dans les 20 h : pas de seconde', async () => {
    cart({ id: 30, status: 'reminded_once', reminder1At: new Date(Date.now() - HOUR), abandonedAt: new Date(Date.now() - 5 * HOUR) });
    const other = cart({ id: 31, abandonedAt: new Date(Date.now() - 6 * HOUR) });
    expect(await sendCartReminder(other as never, 1)).toEqual({ status: 'skipped', reason: 'duplicate' });
  });
  it('SQL du 01/10 pas encore passé : rien ne part, rien n\'est écrit', async () => {
    state.schemaMissing = true;
    const c = cart();
    expect(await sendCartReminder(c as never, 1)).toEqual({ status: 'skipped', reason: 'paused' });
    expect(c.status).toBe('pending');
    expect(sendEmail).not.toHaveBeenCalled();
  });
  it('commande annulée : la relance part quand même', async () => {
    const c = cart();
    state.orders.push({ storeId: 4, email: 'chloe@mail.fr', at: new Date(), total: 30, status: 'cancelled' });
    expect((await sendCartReminder(c as never, 1)).status).toBe('sent');
  });
  it('n°2 avec le code déclaré par la boutique, enregistré sur le panier', async () => {
    state.storeConfig = { cart_reminders: { discount_code: 'MERCI10', discount_percent: 10 } };
    const c = cart({ reminder1At: new Date(Date.now() - 30 * HOUR), status: 'reminded_once', abandonedAt: new Date(Date.now() - 31 * HOUR) });
    const r = await sendCartReminder(c as never, 2);
    expect(r).toMatchObject({ status: 'sent', promoCode: 'MERCI10' });
    expect(c).toMatchObject({ promoCode: 'MERCI10', status: 'reminded_twice' });
  });
  it('relance déjà partie (course entre deux passages) : rien n\'est renvoyé', async () => {
    const c = cart({ reminder1At: new Date() });
    expect(await sendCartReminder(c as never, 1)).toEqual({ status: 'skipped', reason: 'already-sent' });
    expect(sendEmail).not.toHaveBeenCalled();
  });
});

describe('tâche différée', () => {
  it('client revenu sur son checkout depuis : trop récent, le balayage s\'en chargera', async () => {
    cart({ id: 11, abandonedAt: new Date(Date.now() - 10 * 60_000) });
    expect(await processCartReminderJob({ cartId: 11, step: 1 })).toEqual({ sent: false, reason: 'cart-too-recent' });
    expect(sendEmail).not.toHaveBeenCalled();
  });
  it('panier clos (sans accord) : la tâche n\'envoie rien', async () => {
    cart({ id: 12, status: 'no_consent' });
    expect(await processCartReminderJob({ cartId: 12, step: 1 })).toEqual({ sent: false, reason: 'status-no_consent' });
  });
});

describe('jeton de désinscription', () => {
  it('aller-retour, adresse en minuscules, rien de lisible dans le lien', () => {
    const t = unsubscribeToken(4, 'Chloe@Mail.fr');
    expect(readUnsubscribeToken(t)).toEqual({ storeId: 4, email: 'chloe@mail.fr' });
    expect(unsubscribeUrl(4, 'chloe@mail.fr')).not.toMatch(/chloe|mail\.fr/i);
  });
  it('jeton modifié, tronqué ou absent : refusé', () => {
    const t = unsubscribeToken(4, 'chloe@mail.fr');
    const flipped = t.slice(0, 20) + (t[20] === 'A' ? 'B' : 'A') + t.slice(21);
    expect(readUnsubscribeToken(flipped)).toBeNull();
    expect(readUnsubscribeToken(t.slice(0, 30))).toBeNull();
    expect(readUnsubscribeToken(undefined)).toBeNull();
    expect(readUnsubscribeToken('x'.repeat(50))).toBeNull();
  });
  it('désinscription idempotente (ON CONFLICT)', async () => {
    await suppressEmail(4, 'Chloe@Mail.fr');
    await suppressEmail(4, 'chloe@mail.fr');
    expect(state.suppressed.has('4:chloe@mail.fr')).toBe(true);
    expect(state.sqlLog.filter((s) => s.includes('ON CONFLICT (store_id, lower(email)) DO NOTHING'))).toHaveLength(2);
  });
});
