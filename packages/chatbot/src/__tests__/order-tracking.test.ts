import { describe, it, expect } from 'vitest';
import {
  detectOrderTrackingIntent,
  extractEmail,
  extractOrderNumber,
  orderNumberCandidates,
  sameOrderNumber,
  composeOrderStatusReply,
  pickOrdersToReport,
  isAwaitingOrderRef,
  countFailedVerifications,
  collectOrderRef,
  VerificationThrottle,
  redactEmails,
  type TrackedOrder,
  type FlowMessage,
} from '../order-tracking.js';

// Lundi 28 septembre 2026, 10 h à Paris.
const NOW = new Date('2026-09-28T08:00:00Z');

function order(over: Partial<TrackedOrder> = {}): TrackedOrder {
  return {
    orderNumber: '#1042',
    status: 'confirmed',
    orderedAt: new Date('2026-09-25T09:00:00Z'),
    deliveredAt: null,
    shipments: [],
    ...over,
  };
}

describe('detectOrderTrackingIntent', () => {
  it.each([
    'Où est ma commande ?',
    'ou est ma commande',
    'Où en est mon colis ?',
    'suivi de commande',
    'je voudrais suivre ma commande',
    'numéro de suivi svp',
    "Je n'ai toujours pas reçu ma commande",
    "mon colis n'est pas arrivé",
    'quand vais-je recevoir ma commande ?',
    'elle arrive quand ma commande ?',
    'ma commande est-elle partie ?',
    'statut de ma commande #1042',
    'where is my order?',
    'track my order',
    'où se trouve ma commande ?',
    'ma commande est en retard',
    'mon colis est bloqué',
    'quand est-ce que ma commande sera livrée ?',
    'has my order shipped?',
    "my package hasn't arrived",
  ])('detects "%s"', (msg) => {
    expect(detectOrderTrackingIntent(msg)).toBe(true);
  });

  it.each([
    'je veux commander du vin',
    'vin pour un retour de chasse',
    'comment retourner un produit ?',
    'la livraison est offerte à partir de combien ?',
    'quels sont vos délais de livraison ?',
    'est-ce en stock ?',
    'je veux annuler ma commande',
    'ma commande est arrivée cassée',
    "j'ai reçu ma commande mais il manque un article",
    'quand est-ce que la livraison est offerte ?',
    "j'ai un souci quand je valide ma commande",
    '',
  ])('ignores "%s"', (msg) => {
    expect(detectOrderTrackingIntent(msg)).toBe(false);
  });
});

describe('extractEmail', () => {
  it('finds an email inside a sentence and lowercases it', () => {
    expect(extractEmail('c\'est Jean.Dupont@Mail.fr merci')).toBe('jean.dupont@mail.fr');
  });
  it('returns null without an email', () => {
    expect(extractEmail('commande 1042')).toBeNull();
  });
});

describe('extractOrderNumber', () => {
  it.each([
    ['#1042', '1042'],
    ['commande #1042', '1042'],
    ['ma commande n°1042', '1042'],
    ['commande n° 1042 svp', '1042'],
    ['numéro 1042', '1042'],
    ['commande 1042', '1042'],
    ['WC-1042', '1042'],
    ['order #1042', '1042'],
  ])('reads "%s"', (msg, expected) => {
    expect(extractOrderNumber(msg)).toBe(expected);
  });

  it('ignores a bare number unless we are waiting for one', () => {
    expect(extractOrderNumber('1042 jean@mail.fr')).toBeNull();
    expect(extractOrderNumber('1042 jean@mail.fr', { allowBare: true })).toBe('1042');
  });

  it('never reads digits that belong to the email', () => {
    expect(extractOrderNumber('jean1990@mail.fr', { allowBare: true })).toBeNull();
  });

  it('reads a bare number followed by a full stop, not a decimal', () => {
    expect(extractOrderNumber("c'est la 1042.", { allowBare: true })).toBe('1042');
    expect(extractOrderNumber('1042.5', { allowBare: true })).toBeNull();
  });

  it('ignores numbers that are too short to be an order number', () => {
    expect(extractOrderNumber('depuis 10 jours', { allowBare: true })).toBeNull();
  });
});

describe('order number matching', () => {
  it('covers Shopify and WooCommerce storage formats', () => {
    expect(orderNumberCandidates('1042')).toEqual(['#1042', '1042', 'WC-1042']);
  });
  it('matches whatever the stored format', () => {
    expect(sameOrderNumber('#1042', '1042')).toBe(true);
    expect(sameOrderNumber('WC-1042', '1042')).toBe(true);
    expect(sameOrderNumber('#10421', '1042')).toBe(false);
  });
});

describe('composeOrderStatusReply', () => {
  it('says a confirmed order has not left yet', () => {
    const r = composeOrderStatusReply(order(), NOW);
    expect(r.text).toContain('#1042');
    expect(r.text).toContain("pas encore partie");
    expect(r.tracking).toEqual([]);
  });

  it('gives carrier, day and tracking link for a shipped order', () => {
    const r = composeOrderStatusReply(order({
      status: 'shipped',
      shipments: [{
        carrier: 'Colissimo',
        trackingNumber: '6A123',
        trackingUrl: 'https://www.laposte.fr/outils/suivre-vos-envois?code=6A123',
        status: 'in_transit',
        shippedAt: new Date('2026-09-27T14:00:00Z'),
      }],
    }), NOW);
    expect(r.text).toBe('Votre commande #1042 est en route avec Colissimo, elle est partie hier. Voici votre suivi.');
    expect(r.tracking).toEqual([{
      carrier: 'Colissimo',
      trackingNumber: '6A123',
      url: 'https://www.laposte.fr/outils/suivre-vos-envois?code=6A123',
    }]);
  });

  it('mentions the expected delivery day only when the carrier gave one', () => {
    const r = composeOrderStatusReply(order({
      status: 'shipped',
      shipments: [{
        carrier: 'Chronopost', trackingNumber: 'XY1', trackingUrl: null, status: 'shipped',
        shippedAt: new Date('2026-09-28T07:00:00Z'), estimatedDelivery: new Date('2026-09-29T10:00:00Z'),
      }],
    }), NOW);
    expect(r.text).toContain('partie aujourd\'hui avec Chronopost');
    expect(r.text).toContain('Livraison prévue demain.');
    expect(r.text).toContain('Numéro de suivi Chronopost : XY1.');
    expect(r.tracking[0].url).toBeNull();
  });

  it('does not announce an expected day that has already passed', () => {
    const r = composeOrderStatusReply(order({
      status: 'shipped',
      shipments: [{ carrier: 'DPD', trackingNumber: 'D1', status: 'in_transit', estimatedDelivery: new Date('2026-09-27T10:00:00Z') }],
    }), NOW);
    expect(r.text).not.toMatch(/prévue/);
  });

  it('never invents a delivery date', () => {
    const r = composeOrderStatusReply(order({
      status: 'shipped',
      shipments: [{ carrier: 'DPD', trackingNumber: 'D1', status: 'shipped', shippedAt: new Date('2026-09-27T10:00:00Z') }],
    }), NOW);
    expect(r.text).not.toMatch(/prévue|demain|jours/);
  });

  it('reports a delivered order with its date', () => {
    const r = composeOrderStatusReply(order({
      status: 'delivered',
      deliveredAt: new Date('2026-09-26T12:00:00Z'),
      shipments: [{ carrier: 'Colissimo', trackingNumber: '6A1', status: 'delivered', deliveredAt: new Date('2026-09-26T12:00:00Z') }],
    }), NOW);
    expect(r.text).toContain('a été livrée le samedi 26 septembre');
  });

  it('treats a delivered shipment as delivered even if the order row lags', () => {
    const r = composeOrderStatusReply(order({
      status: 'shipped',
      shipments: [{ carrier: 'UPS', trackingNumber: '1Z', status: 'delivered', deliveredAt: new Date('2026-09-28T07:30:00Z') }],
    }), NOW);
    expect(r.text).toContain("a été livrée aujourd'hui");
  });

  it('handles out for delivery, pickup point, failed attempt and cancellation', () => {
    const ship = (status: string) => order({ status: 'shipped', shipments: [{ carrier: 'Colissimo', trackingNumber: 'A', status }] });
    expect(composeOrderStatusReply(ship('out_for_delivery'), NOW).text).toContain('en cours de livraison');
    expect(composeOrderStatusReply(ship('ready_for_pickup'), NOW).text).toContain('point de retrait');
    expect(composeOrderStatusReply(ship('attempted_delivery'), NOW).text).toContain('a tenté de livrer');
    expect(composeOrderStatusReply(order({ status: 'cancelled' }), NOW).text).toContain('annulée');
  });

  it('falls back to a neutral carrier name and drops unsafe links', () => {
    const r = composeOrderStatusReply(order({
      status: 'shipped',
      shipments: [{ carrier: '', trackingNumber: 'T1', trackingUrl: 'javascript:alert(1)', status: 'shipped' }],
    }), NOW);
    expect(r.text).toContain('avec le transporteur');
    expect(r.tracking[0].url).toBeNull();
  });

  it('uses the most recent shipment when there are several', () => {
    const r = composeOrderStatusReply(order({
      status: 'shipped',
      shipments: [
        { carrier: 'Colissimo', trackingNumber: 'OLD', status: 'delivered', shippedAt: new Date('2026-09-20T10:00:00Z'), deliveredAt: new Date('2026-09-22T10:00:00Z') },
        { carrier: 'Colissimo', trackingNumber: 'NEW', status: 'in_transit', shippedAt: new Date('2026-09-27T10:00:00Z') },
      ],
    }), NOW);
    expect(r.text).toContain('en route');
    expect(r.tracking.map(t => t.trackingNumber)).toEqual(['NEW']);
  });
});

describe('orders split in several parcels', () => {
  it('reports the parcel still on its way and says the rest arrived', () => {
    const r = composeOrderStatusReply(order({
      status: 'shipped',
      shipments: [
        { carrier: 'Colissimo', trackingNumber: 'A', status: 'in_transit', shippedAt: new Date('2026-09-26T10:00:00Z') },
        { carrier: 'Colissimo', trackingNumber: 'B', status: 'delivered', shippedAt: new Date('2026-09-27T10:00:00Z'), deliveredAt: new Date('2026-09-28T07:00:00Z') },
      ],
    }), NOW);
    expect(r.text).toContain('en route');
    expect(r.text).toContain('déjà livrée');
    expect(r.tracking.map(t => t.trackingNumber)).toEqual(['A']);
  });

  it('gives every parcel still on its way', () => {
    const r = composeOrderStatusReply(order({
      status: 'shipped',
      shipments: [
        { carrier: 'Colissimo', trackingNumber: 'A', status: 'in_transit', shippedAt: new Date('2026-09-26T10:00:00Z') },
        { carrier: 'Chronopost', trackingNumber: 'B', status: 'shipped', shippedAt: new Date('2026-09-27T10:00:00Z') },
      ],
    }), NOW);
    expect(r.text).toContain('plusieurs colis');
    expect(r.tracking.map(t => t.trackingNumber).sort()).toEqual(['A', 'B']);
  });

  it('keeps a partly delivered order among the ones still on their way', () => {
    const partly = order({
      orderNumber: '#9',
      status: 'shipped',
      shipments: [
        { carrier: 'X', trackingNumber: 'A', status: 'in_transit' },
        { carrier: 'X', trackingNumber: 'B', status: 'delivered' },
      ],
    });
    expect(pickOrdersToReport([partly]).map(o => o.orderNumber)).toEqual(['#9']);
    expect(composeOrderStatusReply(partly, NOW).text).not.toContain('a été livrée');
  });
});

describe('redactEmails', () => {
  it('masks every email in a message', () => {
    expect(redactEmails('#1042 jean@mail.fr et Marie.C@x.io')).toBe('#1042 [email masqué] et [email masqué]');
  });
});

describe('pickOrdersToReport', () => {
  const delivered = order({ orderNumber: '#1', status: 'delivered', orderedAt: new Date('2026-09-01T10:00:00Z') });
  const inFlightA = order({ orderNumber: '#2', status: 'shipped', orderedAt: new Date('2026-09-20T10:00:00Z') });
  const inFlightB = order({ orderNumber: '#3', status: 'confirmed', orderedAt: new Date('2026-09-26T10:00:00Z') });
  const inFlightC = order({ orderNumber: '#4', status: 'confirmed', orderedAt: new Date('2026-09-10T10:00:00Z') });

  it('reports orders still on their way, newest first, at most two', () => {
    expect(pickOrdersToReport([delivered, inFlightA, inFlightB, inFlightC]).map(o => o.orderNumber)).toEqual(['#3', '#2']);
  });
  it('falls back to the latest order when everything has arrived', () => {
    const older = order({ orderNumber: '#0', status: 'delivered', orderedAt: new Date('2026-08-01T10:00:00Z') });
    expect(pickOrdersToReport([older, delivered]).map(o => o.orderNumber)).toEqual(['#1']);
  });
  it('returns nothing for nothing', () => {
    expect(pickOrdersToReport([])).toEqual([]);
  });
});

describe('conversation state', () => {
  const ask: FlowMessage = { role: 'assistant', content: 'numéro ?', kind: 'order_ask' };
  const miss: FlowMessage = { role: 'assistant', content: 'introuvable', kind: 'order_not_found' };
  const llm: FlowMessage = { role: 'assistant', content: 'Bonjour' };

  it('knows when the last assistant turn asked for the order reference', () => {
    expect(isAwaitingOrderRef([{ role: 'user', content: 'où est ma commande' }, ask])).toBe(true);
    expect(isAwaitingOrderRef([ask, { role: 'user', content: 'x' }, llm])).toBe(false);
    expect(isAwaitingOrderRef([])).toBe(false);
  });

  it('counts failed verifications in the session', () => {
    expect(countFailedVerifications([ask, miss, llm, miss])).toBe(2);
  });

  it('merges the number and the email given over several messages', () => {
    const history: FlowMessage[] = [
      llm,
      { role: 'user', content: 'où est ma commande #1042 ?' },
      ask,
    ];
    expect(collectOrderRef('jean@mail.fr', history)).toEqual({ orderNumber: '1042', email: 'jean@mail.fr' });
  });

  it('prefers what the visitor just typed over older messages', () => {
    const history: FlowMessage[] = [
      { role: 'user', content: 'où est ma commande ?' },
      ask,
      { role: 'user', content: '#1042 jean@mail.fr' },
      miss,
    ];
    expect(collectOrderRef('1043', history)).toEqual({ orderNumber: '1043', email: 'jean@mail.fr' });
  });

  it('does not reach back past the start of the order conversation', () => {
    const history: FlowMessage[] = [
      { role: 'user', content: 'mon email est old@mail.fr' },
      llm,
      { role: 'user', content: 'où est ma commande ?' },
      ask,
    ];
    expect(collectOrderRef('#1042', history)).toEqual({ orderNumber: '1042', email: null });
  });
});

describe('VerificationThrottle', () => {
  it('blocks a key after too many failures and forgets them after the window', () => {
    let t = 0;
    const th = new VerificationThrottle(3, 1000, () => t);
    expect(th.isBlocked('k')).toBe(false);
    th.recordFailure('k'); th.recordFailure('k');
    expect(th.isBlocked('k')).toBe(false);
    th.recordFailure('k');
    expect(th.isBlocked('k')).toBe(true);
    expect(th.isBlocked('other')).toBe(false);
    t = 1001;
    expect(th.isBlocked('k')).toBe(false);
  });

  it('reserves a try on all keys at once, or none', () => {
    const th = new VerificationThrottle(1, 1000, () => 0);
    expect(th.tryAcquire(['email', 'order'])).toBe(true);
    expect(th.tryAcquire(['email', 'other-order'])).toBe(false);
    expect(th.isBlocked('other-order')).toBe(false);
    th.release(['email', 'order']);
    expect(th.tryAcquire(['email', 'order'])).toBe(true);
  });
});
