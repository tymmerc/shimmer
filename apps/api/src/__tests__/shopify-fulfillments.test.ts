import { describe, it, expect } from 'vitest';
import {
  mapShipmentStatus,
  shipmentsFromFulfillment,
  orderNameFromFulfillment,
  orderStatusFromShipments,
  mergeShipmentStatus,
  planFulfillmentSync,
  safeTrackingUrl,
  fulfillmentKey,
  type ExistingShipment,
  type ShipmentUpsert,
} from '../lib/shopify-fulfillments.js';

describe('mapShipmentStatus', () => {
  it.each([
    [null, 'shipped'],
    [undefined, 'shipped'],
    ['label_printed', 'shipped'],
    ['label_purchased', 'shipped'],
    ['confirmed', 'shipped'],
    ['in_transit', 'in_transit'],
    ['out_for_delivery', 'out_for_delivery'],
    ['attempted_delivery', 'attempted_delivery'],
    ['ready_for_pickup', 'ready_for_pickup'],
    ['delivered', 'delivered'],
    ['failure', 'failure'],
    ['something_new', 'shipped'],
  ])('%s → %s', (input, expected) => {
    expect(mapShipmentStatus(input as string | null | undefined)).toBe(expected);
  });
});

describe('orderNameFromFulfillment', () => {
  it('strips the fulfillment index', () => {
    expect(orderNameFromFulfillment('#1042.1')).toBe('#1042');
    expect(orderNameFromFulfillment('#1042.12')).toBe('#1042');
    expect(orderNameFromFulfillment('#1042')).toBe('#1042');
    expect(orderNameFromFulfillment(undefined)).toBeNull();
  });
});

describe('shipmentsFromFulfillment', () => {
  const base = {
    id: 1,
    name: '#1042.1',
    status: 'success',
    tracking_company: 'Colissimo',
    created_at: '2026-09-27T14:00:00Z',
    updated_at: '2026-09-27T16:00:00Z',
  };

  it('reads the single tracking fields', () => {
    const s = shipmentsFromFulfillment({
      ...base,
      shipment_status: 'in_transit',
      tracking_number: '6A1',
      tracking_url: 'https://www.laposte.fr/outils/suivre-vos-envois?code=6A1',
    });
    expect(s).toEqual([{
      platformFulfillmentId: '1',
      carrier: 'Colissimo',
      trackingNumber: '6A1',
      trackingUrl: 'https://www.laposte.fr/outils/suivre-vos-envois?code=6A1',
      status: 'in_transit',
      shippedAt: new Date('2026-09-27T14:00:00Z'),
      deliveredAt: null,
    }]);
  });

  it('creates one shipment per tracking number, pairing urls by position', () => {
    const s = shipmentsFromFulfillment({
      ...base,
      tracking_numbers: ['A', 'B'],
      tracking_urls: ['https://t.example/A', 'https://t.example/B'],
    });
    expect(s.map(x => [x.trackingNumber, x.trackingUrl])).toEqual([
      ['A', 'https://t.example/A'],
      ['B', 'https://t.example/B'],
    ]);
  });

  it('keeps a shipment without tracking number (merchant did not enter one)', () => {
    const s = shipmentsFromFulfillment({ ...base, tracking_company: null });
    expect(s).toHaveLength(1);
    expect(s[0]).toMatchObject({ carrier: '', trackingNumber: '', trackingUrl: null, status: 'shipped' });
  });

  it('dates the delivery when Shopify says delivered', () => {
    const s = shipmentsFromFulfillment({ ...base, shipment_status: 'delivered', tracking_number: 'X' });
    expect(s[0].deliveredAt).toEqual(new Date('2026-09-27T16:00:00Z'));
  });

  it('ignores cancelled or failed fulfillments', () => {
    expect(shipmentsFromFulfillment({ ...base, status: 'cancelled', tracking_number: 'X' })).toEqual([]);
    expect(shipmentsFromFulfillment({ ...base, status: 'error', tracking_number: 'X' })).toEqual([]);
  });

  it('keys shipments by fulfillment id, falling back to its name', () => {
    expect(fulfillmentKey({ id: 55, name: '#1042.1' })).toBe('55');
    expect(fulfillmentKey({ name: '#1042.1' })).toBe('#1042.1');
    expect(fulfillmentKey({})).toBeNull();
    expect(shipmentsFromFulfillment({ status: 'success', tracking_number: 'X' })).toEqual([]);
  });

  it('drops non-http tracking urls and trims oversized values', () => {
    const s = shipmentsFromFulfillment({
      ...base,
      tracking_number: 'N'.repeat(300),
      tracking_url: 'javascript:alert(1)',
      tracking_company: 'C'.repeat(300),
    });
    expect(s[0].trackingUrl).toBeNull();
    expect(s[0].trackingNumber).toHaveLength(100);
    expect(s[0].carrier).toHaveLength(50);
  });
});

describe('safeTrackingUrl', () => {
  it('keeps plain https links only', () => {
    expect(safeTrackingUrl('https://www.laposte.fr/outils/suivre-vos-envois?code=1')).toBe('https://www.laposte.fr/outils/suivre-vos-envois?code=1');
    expect(safeTrackingUrl('http://tracking.example/1')).toBeNull();
    expect(safeTrackingUrl('https://user:pass@evil.example/')).toBeNull();
    expect(safeTrackingUrl('https://www.laposte.fr@evil.example/')).toBeNull();
    expect(safeTrackingUrl('not a url')).toBeNull();
  });
});

describe('planFulfillmentSync', () => {
  const row = (over: Partial<ExistingShipment>): ExistingShipment => ({
    id: 1, carrier: 'Colissimo', trackingNumber: 'A', trackingUrl: null, status: 'shipped', shippedAt: null, deliveredAt: null, ...over,
  });
  const incoming = (over: Partial<ShipmentUpsert>): ShipmentUpsert => ({
    platformFulfillmentId: '9', carrier: 'Colissimo', trackingNumber: 'A', trackingUrl: null, status: 'shipped', shippedAt: null, deliveredAt: null, ...over,
  });

  it('replaces the empty-number row when the tracking number arrives later', () => {
    const p = planFulfillmentSync([row({ id: 7, trackingNumber: '' })], [incoming({ trackingNumber: '6A1' })]);
    expect(p.create.map(c => c.trackingNumber)).toEqual(['6A1']);
    expect(p.remove).toEqual([7]);
    expect(p.update).toEqual([]);
  });

  it('updates the matching row and removes duplicates left by a race', () => {
    const p = planFulfillmentSync(
      [row({ id: 1, trackingNumber: 'A', status: 'in_transit' }), row({ id: 2, trackingNumber: 'A' })],
      [incoming({ trackingNumber: 'A', status: 'delivered', deliveredAt: new Date('2026-09-29T10:00:00Z') })],
    );
    expect(p.update).toHaveLength(1);
    expect(p.update[0]).toMatchObject({ id: 1, data: { status: 'delivered' } });
    expect(p.remove).toEqual([2]);
    expect(p.create).toEqual([]);
  });

  it('removes every row of a cancelled fulfillment', () => {
    const p = planFulfillmentSync([row({ id: 3 }), row({ id: 4, trackingNumber: 'B' })], []);
    expect(p.remove).toEqual([3, 4]);
  });

  it('keeps what the webhook does not say (url, first ship date)', () => {
    const shippedAt = new Date('2026-09-27T10:00:00Z');
    const p = planFulfillmentSync(
      [row({ id: 1, trackingUrl: 'https://t.example/A', shippedAt })],
      [incoming({ trackingUrl: null, shippedAt: new Date('2026-09-28T10:00:00Z') })],
    );
    expect(p.update[0].data).toMatchObject({ trackingUrl: 'https://t.example/A', shippedAt });
  });
});

describe('mergeShipmentStatus', () => {
  it('never undoes a delivery', () => {
    expect(mergeShipmentStatus('delivered', 'in_transit')).toBe('delivered');
    expect(mergeShipmentStatus('delivered', 'out_for_delivery')).toBe('delivered');
  });

  it('keeps a precise status when a later webhook carries no carrier info', () => {
    expect(mergeShipmentStatus('delivered', 'shipped')).toBe('delivered');
    expect(mergeShipmentStatus('in_transit', 'shipped')).toBe('in_transit');
  });
  it('takes any real carrier update', () => {
    expect(mergeShipmentStatus('in_transit', 'delivered')).toBe('delivered');
    expect(mergeShipmentStatus('preparing', 'shipped')).toBe('shipped');
    expect(mergeShipmentStatus(null, 'shipped')).toBe('shipped');
  });
});

describe('orderStatusFromShipments', () => {
  it('is delivered only when every shipment is delivered', () => {
    expect(orderStatusFromShipments(['delivered', 'delivered'])).toBe('delivered');
    expect(orderStatusFromShipments(['delivered', 'in_transit'])).toBe('shipped');
    expect(orderStatusFromShipments(['shipped'])).toBe('shipped');
  });
  it('fulfilled on Shopify means shipped, never delivered by itself', () => {
    expect(orderStatusFromShipments([])).toBe('shipped');
  });
  it('goes back to confirmed when the only parcel was cancelled', () => {
    expect(orderStatusFromShipments([], 'confirmed')).toBe('confirmed');
  });
});
