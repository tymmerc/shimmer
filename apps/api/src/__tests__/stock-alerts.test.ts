import { describe, it, expect } from 'vitest';
import {
  detectRestock,
  matchConversion,
  aggregateRestockDemand,
  buildRestockEmail,
  restockProof,
  CONVERSION_WINDOW_DAYS,
  type StockAlertRow,
} from '../lib/stock-alerts.js';

const d = (iso: string): Date => new Date(iso);

function alert(over: Partial<StockAlertRow> = {}): StockAlertRow {
  return {
    id: 1,
    storeId: 4,
    productId: 10,
    platformVariantId: 'v-1',
    variantLabel: 'Short Bordeaux · M',
    email: 'lea@example.com',
    visitorId: 'vis-1',
    status: 'waiting',
    createdAt: d('2026-08-01T10:00:00Z'),
    notifiedAt: null,
    convertedAt: null,
    orderId: null,
    convertedAmount: null,
    ...over,
  };
}

describe('detectRestock', () => {
  it('fires only on a 0 → >0 transition', () => {
    expect(detectRestock(0, 5)).toBe(true);
    expect(detectRestock(0, 1)).toBe(true);
  });
  it('does not fire on a top-up of an already available variant', () => {
    expect(detectRestock(3, 8)).toBe(false);
  });
  it('does not fire on a sell-out or on staying at zero', () => {
    expect(detectRestock(5, 0)).toBe(false);
    expect(detectRestock(0, 0)).toBe(false);
  });
  it('treats unknown previous stock as zero (first sync)', () => {
    expect(detectRestock(null, 4)).toBe(true);
    expect(detectRestock(null, 0)).toBe(false);
  });
});

describe('matchConversion', () => {
  const notified = alert({ status: 'notified', notifiedAt: d('2026-08-10T09:00:00Z') });

  it('matches a paid order on the same email within the window and after notification', () => {
    const r = matchConversion([notified], {
      email: 'LEA@example.com',
      orderedAt: d('2026-08-12T15:00:00Z'),
      variantIds: ['v-1'],
    });
    expect(r.map(a => a.id)).toEqual([1]);
  });

  it('ignores an order placed before the notification', () => {
    const r = matchConversion([notified], {
      email: 'lea@example.com',
      orderedAt: d('2026-08-09T15:00:00Z'),
      variantIds: ['v-1'],
    });
    expect(r).toEqual([]);
  });

  it(`ignores an order after ${CONVERSION_WINDOW_DAYS} days`, () => {
    const r = matchConversion([notified], {
      email: 'lea@example.com',
      orderedAt: d('2026-08-20T09:00:01Z'),
      variantIds: ['v-1'],
    });
    expect(r).toEqual([]);
  });

  it('requires the notified variant to be in the order when variant ids are known', () => {
    const r = matchConversion([notified], {
      email: 'lea@example.com',
      orderedAt: d('2026-08-11T09:00:00Z'),
      variantIds: ['v-other'],
    });
    expect(r).toEqual([]);
  });

  it('falls back to email-only matching when the order carries no variant ids', () => {
    const r = matchConversion([notified], {
      email: 'lea@example.com',
      orderedAt: d('2026-08-11T09:00:00Z'),
      variantIds: [],
    });
    expect(r.map(a => a.id)).toEqual([1]);
  });

  it('never matches waiting (not yet notified) or already converted alerts', () => {
    const waiting = alert({ id: 2, status: 'waiting' });
    const converted = alert({ id: 3, status: 'converted', notifiedAt: d('2026-08-10T09:00:00Z') });
    const r = matchConversion([waiting, converted], {
      email: 'lea@example.com',
      orderedAt: d('2026-08-11T09:00:00Z'),
      variantIds: ['v-1'],
    });
    expect(r).toEqual([]);
  });
});

describe('aggregateRestockDemand', () => {
  it('counts waiting requests per variant, most wanted first', () => {
    const rows = [
      alert({ id: 1, platformVariantId: 'v-1', variantLabel: 'Short · M', email: 'a@x.fr' }),
      alert({ id: 2, platformVariantId: 'v-1', variantLabel: 'Short · M', email: 'b@x.fr' }),
      alert({ id: 3, platformVariantId: 'v-2', variantLabel: 'Short · L', email: 'c@x.fr' }),
      alert({ id: 4, platformVariantId: 'v-1', variantLabel: 'Short · M', email: 'd@x.fr', status: 'notified' }),
    ];
    const agg = aggregateRestockDemand(rows);
    expect(agg).toEqual([
      { platformVariantId: 'v-1', variantLabel: 'Short · M', productId: 10, waiting: 2 },
      { platformVariantId: 'v-2', variantLabel: 'Short · L', productId: 10, waiting: 1 },
    ]);
  });
  it('returns an empty list when nobody is waiting', () => {
    expect(aggregateRestockDemand([alert({ status: 'converted' })])).toEqual([]);
  });
});

describe('buildRestockEmail', () => {
  it('names the variant, says how many are left, and links with the visitor id', () => {
    const m = buildRestockEmail({
      storeName: 'Brouillon',
      variantLabel: 'Short Bordeaux · M',
      available: 3,
      productUrl: 'https://brouillon.store/products/short-bordeaux',
      visitorId: 'vis-1',
    });
    expect(m.subject).toContain('Short Bordeaux · M');
    expect(m.subject).toContain('de retour');
    expect(m.bodyText).toContain('3');
    expect(m.bodyText).toContain('shimmer_vid=vis-1');
    expect(m.bodyText).toContain('Brouillon');
  });
  it('drops the count when unknown and still links without visitor id', () => {
    const m = buildRestockEmail({
      storeName: 'Brouillon',
      variantLabel: 'Hoodie',
      available: null,
      productUrl: 'https://brouillon.store/products/hoodie',
      visitorId: null,
    });
    expect(m.bodyText).not.toContain('il en reste');
    expect(m.bodyText).toContain('https://brouillon.store/products/hoodie');
    expect(m.bodyText).not.toContain('shimmer_vid');
  });
});

describe('restockProof', () => {
  it('counts one by one: waiting, notified, converted, and euros', () => {
    const rows = [
      alert({ id: 1, status: 'waiting' }),
      alert({ id: 2, status: 'notified', notifiedAt: d('2026-08-10T00:00:00Z') }),
      alert({ id: 3, status: 'converted', notifiedAt: d('2026-08-10T00:00:00Z'), convertedAt: d('2026-08-11T00:00:00Z'), convertedAmount: 65 }),
      alert({ id: 4, status: 'converted', notifiedAt: d('2026-08-10T00:00:00Z'), convertedAt: d('2026-08-12T00:00:00Z'), convertedAmount: 45.5 }),
    ];
    expect(restockProof(rows)).toEqual({
      waiting: 1,
      notified: 3,
      converted: 2,
      conversionRatePct: 66.7,
      convertedEUR: 110.5,
    });
  });
  it('is all zeros on an empty store, never NaN', () => {
    expect(restockProof([])).toEqual({ waiting: 0, notified: 0, converted: 0, conversionRatePct: 0, convertedEUR: 0 });
  });
});

// ── Le vendeur ne recommande jamais un épuisé : la décision est ici ──
import { isSoldOut } from '@shimmer/chatbot';

describe('isSoldOut (vendeur conscient du stock)', () => {
  it('reads the explicit status first', () => {
    expect(isSoldOut({ stock: 10, stockStatus: 'out_of_stock' })).toBe(true);
    expect(isSoldOut({ stock: 0, stockStatus: 'sold_out' })).toBe(true);
  });
  it('treats stock 0 with a default status as sold out (imports rarely update the status)', () => {
    expect(isSoldOut({ stock: 0, stockStatus: 'in_stock' })).toBe(true);
    expect(isSoldOut({ stock: 0, stockStatus: null })).toBe(true);
  });
  it('keeps a positive stock available whatever the label', () => {
    expect(isSoldOut({ stock: 3, stockStatus: 'in_stock' })).toBe(false);
    expect(isSoldOut({ stock: 1, stockStatus: 'low_stock' })).toBe(false);
  });
  it('trusts a non-default status over a zero stock (pre-order, backorder)', () => {
    expect(isSoldOut({ stock: 0, stockStatus: 'preorder' })).toBe(false);
  });
});

// ── Épuisé nommé : bon produit reconnu, redirection sensée ──
import { mentionsName, pickSoldOutRedirect } from '@shimmer/chatbot';

describe('mentionsName (produit cité par le visiteur)', () => {
  it('finds a product named without its vintage', () => {
    expect(mentionsName('et le crozes-hermitage ?', 'Crozes-Hermitage 2021')).toBeGreaterThanOrEqual(0);
  });
  it('does not match a name that is only part of a longer compound name', () => {
    // « hermitage » est dans « crozes-hermitage » : ce n'est PAS l'Hermitage.
    expect(mentionsName('et le crozes-hermitage ?', 'Hermitage Rouge 2018')).toBe(-1);
    expect(mentionsName('et le crozes-hermitage ?', 'Hermitage Blanc 2020')).toBe(-1);
  });
  it('still matches the real Hermitage when named on its own, accents and case ignored', () => {
    expect(mentionsName("Vous avez de l'Hermitage ?", 'Hermitage Rouge 2018')).toBeGreaterThanOrEqual(0);
    expect(mentionsName('un côtes-du-rhône villages', 'Côtes-du-Rhône Villages 2021')).toBeGreaterThanOrEqual(0);
  });
});

describe('pickSoldOutRedirect (alternative à un épuisé)', () => {
  const c = (id: number, category: string, price: number, soldOut = false) => ({ id, product: { id, category, price, soldOut } });
  const ok = (x: { product: { soldOut: boolean } }) => !x.product.soldOut;
  it('prefers the in-stock wine of the same category closest in price', () => {
    const asked = c(1, 'Vin rouge', 21, true);
    const pool = [c(2, 'Vin rouge', 98), c(3, 'Vin blanc', 20), c(4, 'Vin rouge', 26), c(5, 'Vin rouge', 19)];
    expect(pickSoldOutRedirect(asked, pool, ok)?.product.id).toBe(5);
  });
  it('keeps the pool order to break a price tie', () => {
    const asked = c(1, 'Vin rouge', 21, true);
    const pool = [c(6, 'Vin rouge', 23), c(7, 'Vin rouge', 19)];
    expect(pickSoldOutRedirect(asked, pool, ok)?.product.id).toBe(6);
  });
  it('falls back to any in-stock product, then to null', () => {
    const asked = c(1, 'Vin rouge', 21, true);
    expect(pickSoldOutRedirect(asked, [c(8, 'Vin blanc', 30)], ok)?.product.id).toBe(8);
    expect(pickSoldOutRedirect(asked, [c(9, 'Vin rouge', 20, true)], ok)).toBeNull();
  });
});

// ── Le petit modèle recopie parfois le format du contexte catalogue ──
import { stripCatalogEcho } from '@shimmer/chatbot';

describe('stripCatalogEcho (réponse du vendeur montrée au client)', () => {
  it('drops a raw catalogue line echoed by the model and keeps the sentence', () => {
    const raw = "Brouilly 2022 | 15€ | Vin rouge | Château Thivin | charcuterie, quotidien, apero, Gamay, fruite\n\nC'est un vin idéal pour accompagner vos grillades entre amis. Santé !";
    expect(stripCatalogEcho(raw)).toBe("C'est un vin idéal pour accompagner vos grillades entre amis. Santé !");
  });
  it('leaves a normal reply untouched', () => {
    const ok = 'Pour des grillades, prenez le Vacqueyras 2021 à 21 €. Il est fruité et épicé.';
    expect(stripCatalogEcho(ok)).toBe(ok);
  });
  it('returns an empty string when the reply was only catalogue lines', () => {
    expect(stripCatalogEcho('A | 1€ | Vin rouge\nB | 2€ | Vin blanc')).toBe('');
  });
});
