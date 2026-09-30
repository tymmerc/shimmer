import { describe, it, expect, vi, beforeEach } from 'vitest';

// WooCommerce au niveau de Shopify (30/09) : catalogue suivi, identifiant
// visiteur du plugin, commande comptée une seule fois dans la preuve, lignes
// de commande, avis quelques jours après l'expédition.
const state = {
  holdoutOrders: [] as Array<Record<string, unknown>>,
  visitorUpserts: 0,
  orderItems: [] as Array<Record<string, unknown>>,
  itemCount: 0,
  products: [{ id: 10, storeId: 4, platformProductId: '501' }],
  attributedSession: null as { id: number } | null,
  order: { id: 400, customerId: 40, status: 'shipped', store: { config: { reviews: { daysAfterShipped: 5 } } } } as Record<string, unknown>,
  reviewCreates: [] as Array<Record<string, unknown>>,
};
const reversal = { alerts: [] as unknown[], holdoutDeleted: [] as unknown[], visitorUpdates: [] as unknown[], chats: [] as unknown[] };
vi.mock('@shimmer/core', () => {
  const client: Record<string, unknown> = {
    $queryRaw: vi.fn(async () => [{ count: 1 }]),
    stockAlert: { updateMany: vi.fn(async (a: unknown) => { reversal.alerts.push(a); return { count: 1 }; }) },
    $transaction: vi.fn(async (arg: unknown) => (typeof arg === 'function' ? (arg as (tx: unknown) => unknown)(client) : Promise.all(arg as unknown[]))),
    store: { findUnique: vi.fn(async () => ({ id: 4, config: {} })) },
    holdoutOrder: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        if (state.holdoutOrders.some((o) => o.orderRef === data.orderRef)) throw Object.assign(new Error('dup'), { code: 'P2002' });
        state.holdoutOrders.push(data); return data;
      }),
      findFirst: vi.fn(async ({ where }: { where: { orderRef: string } }) => {
        const i = state.holdoutOrders.findIndex((o) => o.orderRef === where.orderRef);
        return i >= 0 ? { id: i + 1, ...state.holdoutOrders[i] } : null;
      }),
      delete: vi.fn(async (a: unknown) => { reversal.holdoutDeleted.push(a); return {}; }),
    },
    holdoutVisitor: {
      upsert: vi.fn(async () => { state.visitorUpserts += 1; return {}; }),
      updateMany: vi.fn(async (a: unknown) => { reversal.visitorUpdates.push(a); return { count: 1 }; }),
    },
    orderItem: {
      count: vi.fn(async () => state.itemCount),
      createMany: vi.fn(async ({ data }: { data: Array<Record<string, unknown>> }) => { state.orderItems.push(...data); state.itemCount += data.length; return { count: data.length }; }),
    },
    product: { findMany: vi.fn(async ({ where }: { where: { storeId: number; platformProductId: { in: string[] } } }) => state.products.filter((p) => p.storeId === where.storeId && where.platformProductId.in.includes(p.platformProductId))) },
    chatSession: {
      findFirst: vi.fn(async () => state.attributedSession),
      update: vi.fn(),
      updateMany: vi.fn(async (a: unknown) => { reversal.chats.push(a); return { count: 1 }; }),
    },
    searchSession: { updateMany: vi.fn() },
    order: { findFirst: vi.fn(async () => state.order) },
    reviewRequest: {
      findFirst: vi.fn(async () => null),
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => { state.reviewCreates.push(data); return { id: 91, ...data }; }),
    },
  };
  return { getPrisma: () => client, logger: { info: vi.fn(), warn: vi.fn(), debug: vi.fn() } };
});
vi.mock('../lib/automations/queue.js', () => ({ enqueueReviewRequest: vi.fn(async () => undefined), enqueueCartReminders: vi.fn(async () => undefined) }));
vi.mock('../middleware/rate-limiter.js', () => ({
  createScopedRateLimiter: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}));

const { catalogFieldsFromWoo } = await import('../lib/woo-products.js');
const { wooVisitorId, nextOrderStatus, wooOrderedAt } = await import('../routes/webhooks-woocommerce.js');
const { reverseOrderEffects } = await import('../lib/order-reversal.js');
const { recordOrderForVisitor } = await import('../routes/holdout.js');
const { linkOrderItems } = await import('../lib/order-items.js');
const { attributeOrderToChat } = await import('../lib/attribution.js');
const { scheduleReviewAfterShipping } = await import('../lib/review-on-delivery.js');
const { UNTRACKED_STOCK } = await import('../lib/shopify-products.js');

beforeEach(() => {
  state.holdoutOrders.length = 0; state.visitorUpserts = 0; state.orderItems.length = 0; state.itemCount = 0;
  state.attributedSession = null; state.reviewCreates.length = 0;
});

describe('catalogFieldsFromWoo', () => {
  const base = { id: 501, name: 'Brouilly 2022', status: 'publish', sku: 'BRO', price: '13.50', regular_price: '15', manage_stock: true, stock_quantity: 4, stock_status: 'instock', categories: [{ name: 'Vin rouge' }], images: [{ src: 'https://shop.fr/b.jpg' }], description: '<p>Fruité</p>' };
  it('prix soldé, stock suivi, catégorie, image, texte', () => {
    expect(catalogFieldsFromWoo(base)).toMatchObject({ platformProductId: '501', sku: 'BRO', price: 13.5, compareAtPrice: 15, stock: 4, stockStatus: 'in_stock', category: 'Vin rouge', imageUrl: 'https://shop.fr/b.jpg', description: 'Fruité', isActive: true });
  });
  it('épuisé, rupture autorisée, stock non suivi', () => {
    expect(catalogFieldsFromWoo({ ...base, stock_quantity: 0 })!.stockStatus).toBe('out_of_stock');
    expect(catalogFieldsFromWoo({ ...base, stock_quantity: 0, backorders: 'yes' })!.stock).toBe(UNTRACKED_STOCK);
    expect(catalogFieldsFromWoo({ ...base, manage_stock: false, stock_quantity: null, stock_status: 'outofstock' })!.stock).toBe(0);
    expect(catalogFieldsFromWoo({ ...base, manage_stock: false, stock_quantity: null, stock_status: 'instock' })!.stock).toBe(UNTRACKED_STOCK);
  });
  it('brouillon ou caché : inactif ; sans nom : ignoré', () => {
    expect(catalogFieldsFromWoo({ ...base, status: 'draft' })!.isActive).toBe(false);
    expect(catalogFieldsFromWoo({ ...base, catalog_visibility: 'hidden' })!.isActive).toBe(false);
    expect(catalogFieldsFromWoo({ ...base, name: '' })).toBeNull();
  });
});

describe('wooVisitorId', () => {
  it('lit shimmer_vid posé par le plugin, refuse une valeur douteuse', () => {
    expect(wooVisitorId({ meta_data: [{ key: 'shimmer_vid', value: 'vid_abc123' }] })).toBe('vid_abc123');
    expect(wooVisitorId({ meta_data: [{ key: 'shimmer_vid', value: '<script>' }] })).toBeNull();
    expect(wooVisitorId({})).toBeNull();
  });
});

describe('preuve : une commande comptée une seule fois', () => {
  it('le même webhook deux fois n\'ajoute le montant qu\'une fois', async () => {
    expect(await recordOrderForVisitor(4, 'vid_abc123', 42, 'woo:77')).toBe(true);
    expect(await recordOrderForVisitor(4, 'vid_abc123', 42, 'woo:77')).toBe(false);
    expect(state.holdoutOrders).toHaveLength(1);
    expect(state.visitorUpserts).toBe(1);
  });
});

describe('lignes de commande', () => {
  it('reliées au catalogue par id plateforme, jamais doublées', async () => {
    expect(await linkOrderItems(4, 400, [{ platformProductId: '501', quantity: 2, unitPrice: 13.5 }, { platformProductId: '999', quantity: 1, unitPrice: 5 }])).toBe(1);
    expect(state.orderItems[0]).toMatchObject({ orderId: 400, productId: 10, quantity: 2, totalPrice: 27 });
    expect(await linkOrderItems(4, 400, [{ platformProductId: '501', quantity: 2, unitPrice: 13.5 }])).toBe(0);
  });
});

describe('rattachement commande → conversation', () => {
  it('une commande déjà rattachée ne l\'est pas une seconde fois', async () => {
    state.attributedSession = { id: 7 };
    expect(await attributeOrderToChat(4, 400, 'a@b.fr', 'vid_abc123')).toEqual({ attributed: true, sessionId: 7 });
  });
});

describe('avis après expédition (Woo)', () => {
  it('programmé au délai de la boutique après « terminée »', async () => {
    const now = new Date('2026-10-01T10:00:00Z');
    expect(await scheduleReviewAfterShipping(4, 400, now)).toBe(91);
    expect((state.reviewCreates[0]!.scheduledAt as Date).getTime()).toBe(now.getTime() + 5 * 86_400_000);
  });
});

describe('statut d\'une commande Woo', () => {
  it('n\'avance que vers l\'avant, sauf annulation', () => {
    expect(nextOrderStatus('shipped', 'pending')).toBe('shipped');
    expect(nextOrderStatus('confirmed', 'shipped')).toBe('shipped');
    expect(nextOrderStatus('shipped', 'cancelled')).toBe('cancelled');
    expect(nextOrderStatus('returned', 'confirmed')).toBe('confirmed');
  });
  it('heure UTC : date_created_gmt, pas l\'heure du site', () => {
    expect(wooOrderedAt({ date_created: '2026-09-30T18:43:04', date_created_gmt: '2026-09-30T16:43:04' }).toISOString()).toBe('2026-09-30T16:43:04.000Z');
  });
});

describe('commande annulée après paiement', () => {
  it('défait preuve, conversion retour de stock et rattachement', async () => {
    await recordOrderForVisitor(4, 'vid_abc123', 42, 'woo:88');
    await reverseOrderEffects(4, 400, 'woo:88');
    expect(reversal.alerts[0]).toMatchObject({ where: { storeId: 4, orderId: 400, status: 'converted' }, data: { status: 'notified' } });
    expect(reversal.holdoutDeleted).toHaveLength(1);
    expect(reversal.visitorUpdates[0]).toMatchObject({ data: { orderCount: { decrement: 1 }, revenue: { decrement: 42 } } });
    expect(reversal.chats[0]).toMatchObject({ where: { storeId: 4, attributedOrderId: 400 }, data: { attributedOrderId: null } });
  });
});
