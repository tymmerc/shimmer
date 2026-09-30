import { describe, it, expect, vi, beforeEach } from 'vitest';

// Avant le 30/09, aucune demande d'avis ne partait d'elle-même : seule une
// route manuelle en créait. La livraison Shopify la programme désormais.
const created: Array<Record<string, unknown>> = [];
let order: Record<string, unknown> | null = null;
let existing: { id: number } | null = null;
const enqueue = vi.fn(async () => undefined);

vi.mock('@shimmer/core', () => ({
  getPrisma: () => ({
    order: { findFirst: vi.fn(async ({ where }: { where: { id: number; storeId: number } }) => (order && order.id === where.id && order.storeId === where.storeId ? order : null)) },
    reviewRequest: {
      findFirst: vi.fn(async () => existing),
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => { created.push(data); return { id: 90, ...data }; }),
    },
  }),
  logger: { info: vi.fn(), warn: vi.fn() },
}));
vi.mock('../lib/automations/queue.js', () => ({ enqueueReviewRequest: enqueue }));

const { scheduleReviewOnDelivery, autoReviewEnabled, REVIEW_DELAY_MS } = await import('../lib/review-on-delivery.js');

beforeEach(() => {
  created.length = 0;
  existing = null;
  enqueue.mockClear();
  order = { id: 400, storeId: 4, customerId: 40, status: 'delivered', store: { config: {} } };
});

describe('scheduleReviewOnDelivery', () => {
  it('commande livrée : une demande 48 h après, jeton fort, mise en file', async () => {
    const now = new Date('2026-10-01T10:00:00Z');
    expect(await scheduleReviewOnDelivery(4, 400, now)).toBe(90);
    expect(created[0]).toMatchObject({ storeId: 4, orderId: 400, customerId: 40 });
    expect(String(created[0]!.token)).toMatch(/^[0-9a-f-]{36}$/);
    expect((created[0]!.scheduledAt as Date).getTime()).toBe(now.getTime() + REVIEW_DELAY_MS);
    expect(enqueue).toHaveBeenCalledWith(90, created[0]!.scheduledAt);
  });
  it('rien si pas livrée, déjà demandée, autre boutique ou coupé par la boutique', async () => {
    order = { ...order!, status: 'shipped' };
    expect(await scheduleReviewOnDelivery(4, 400)).toBeNull();
    order = { ...order!, status: 'delivered' };
    existing = { id: 1 };
    expect(await scheduleReviewOnDelivery(4, 400)).toBeNull();
    existing = null;
    expect(await scheduleReviewOnDelivery(5, 400)).toBeNull();
    order = { ...order!, store: { config: { reviews: { autoRequest: false } } } };
    expect(await scheduleReviewOnDelivery(4, 400)).toBeNull();
    expect(created).toHaveLength(0);
  });
});

describe('autoReviewEnabled', () => {
  it('actif par défaut, coupé seulement par un false explicite', () => {
    expect(autoReviewEnabled({})).toBe(true);
    expect(autoReviewEnabled(null)).toBe(true);
    expect(autoReviewEnabled({ reviews: { autoRequest: false } })).toBe(false);
  });
});
