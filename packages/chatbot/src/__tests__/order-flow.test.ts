import { describe, it, expect, vi } from 'vitest';
import { runOrderFlow, type OrderFlowDeps } from '../order-flow.js';
import { VerificationThrottle, MAX_FAILED_VERIFICATIONS, type TrackedOrder, type FlowMessage } from '../order-tracking.js';

const NOW = new Date('2026-09-28T08:00:00Z');

const shipped: TrackedOrder = {
  orderNumber: '#1042',
  status: 'shipped',
  orderedAt: new Date('2026-09-25T09:00:00Z'),
  shipments: [{
    carrier: 'Colissimo', trackingNumber: '6A1', status: 'in_transit',
    trackingUrl: 'https://www.laposte.fr/outils/suivre-vos-envois?code=6A1',
    shippedAt: new Date('2026-09-27T14:00:00Z'),
  }],
};

function deps(over: Partial<OrderFlowDeps> = {}): OrderFlowDeps {
  return {
    findByRef: vi.fn(async (digits: string, email: string) =>
      digits === '1042' && email === 'jean@mail.fr' ? shipped : null),
    findRecentForEmail: vi.fn(async () => []),
    throttle: new VerificationThrottle(10, 3_600_000),
    ...over,
  };
}

const ask: FlowMessage = { role: 'assistant', content: '?', kind: 'order_ask' };

describe('runOrderFlow', () => {
  it('stays out of the way for anything that is not about an order', async () => {
    const d = deps();
    expect(await runOrderFlow({ message: 'un vin pour le poisson ?', history: [], now: NOW }, d)).toBeNull();
    expect(d.findByRef).not.toHaveBeenCalled();
  });

  it('asks for the order number and the email when it does not know the visitor', async () => {
    const r = await runOrderFlow({ message: 'Où est ma commande ?', history: [], now: NOW }, deps());
    expect(r?.kind).toBe('order_ask');
    expect(r?.awaitingOrderRef).toBe(true);
    expect(r?.text).toMatch(/numéro de commande/);
    expect(r?.text).toMatch(/email/);
  });

  it('asks only for what is missing', async () => {
    const r = await runOrderFlow({ message: '#1042', history: [{ role: 'user', content: 'où est ma commande' }, ask], now: NOW }, deps());
    expect(r?.kind).toBe('order_ask');
    expect(r?.text).toMatch(/email/);
    expect(r?.text).not.toMatch(/numéro de commande/);
  });

  it('answers once number and email match the same order', async () => {
    const d = deps();
    const r = await runOrderFlow({ message: 'jean@mail.fr', history: [{ role: 'user', content: 'où est ma commande #1042' }, ask], now: NOW }, d);
    expect(d.findByRef).toHaveBeenCalledWith('1042', 'jean@mail.fr');
    expect(r?.kind).toBe('order_status');
    expect(r?.awaitingOrderRef).toBe(false);
    expect(r?.text).toContain('#1042 est en route avec Colissimo');
    expect(r?.tracking[0].url).toContain('laposte.fr');
    expect(r?.orderNumber).toBe('#1042');
  });

  it('answers straight away when the first message carries both', async () => {
    const r = await runOrderFlow({ message: 'où est ma commande #1042 ? jean@mail.fr', history: [], now: NOW }, deps());
    expect(r?.kind).toBe('order_status');
  });

  it('says it cannot find the order without telling which part is wrong', async () => {
    const r = await runOrderFlow({ message: '#1042 pirate@mail.fr', history: [{ role: 'user', content: 'où est ma commande' }, ask], now: NOW }, deps());
    expect(r?.kind).toBe('order_not_found');
    expect(r?.awaitingOrderRef).toBe(true);
    expect(r?.text).not.toMatch(/email (est )?(faux|incorrect)|numéro (est )?(faux|incorrect)/);
  });

  it('stops verifying after too many misses in the session', async () => {
    const history: FlowMessage[] = [{ role: 'user', content: 'où est ma commande' }];
    for (let i = 0; i < MAX_FAILED_VERIFICATIONS; i++) {
      history.push({ role: 'user', content: `#${2000 + i} x@mail.fr` }, { role: 'assistant', content: 'non', kind: 'order_not_found' });
    }
    const d = deps();
    const r = await runOrderFlow({ message: '#1042 jean@mail.fr', history, now: NOW }, d);
    expect(r?.kind).toBe('order_locked');
    expect(r?.awaitingOrderRef).toBe(false);
    expect(d.findByRef).not.toHaveBeenCalled();
  });

  it('locks on the last allowed miss instead of inviting another try', async () => {
    const history: FlowMessage[] = [{ role: 'user', content: 'où est ma commande' }];
    for (let i = 0; i < MAX_FAILED_VERIFICATIONS - 1; i++) {
      history.push({ role: 'user', content: `#${2000 + i} x@mail.fr` }, { role: 'assistant', content: 'non', kind: 'order_not_found' });
    }
    const r = await runOrderFlow({ message: '#1999 x@mail.fr', history, now: NOW }, deps());
    expect(r?.kind).toBe('order_locked');
  });

  it('stays locked once locked, even with the right number and email', async () => {
    // Reproduit l'E2E : 2 "introuvable" puis le 3e échec donne "bloqué".
    const history: FlowMessage[] = [
      { role: 'user', content: 'où est ma commande #1043 ? pirate@mail.fr' },
      { role: 'assistant', content: 'non', kind: 'order_not_found' },
      { role: 'user', content: '#1044' },
      { role: 'assistant', content: 'non', kind: 'order_not_found' },
      { role: 'user', content: '#2001' },
      { role: 'assistant', content: 'bloqué', kind: 'order_locked' },
    ];
    const d = deps();
    const r = await runOrderFlow({ message: 'où est ma commande #1042 jean@mail.fr', history, now: NOW }, d);
    expect(r?.kind).toBe('order_locked');
    expect(d.findByRef).not.toHaveBeenCalled();
  });

  it('stops verifying an email that failed too often, across sessions', async () => {
    const throttle = new VerificationThrottle(2, 3_600_000);
    const d = deps({ throttle });
    await runOrderFlow({ message: 'où est ma commande #7001 jean@mail.fr', history: [], now: NOW }, d);
    await runOrderFlow({ message: 'où est ma commande #7002 jean@mail.fr', history: [], now: NOW }, d);
    const r = await runOrderFlow({ message: 'où est ma commande #1042 jean@mail.fr', history: [], now: NOW }, d);
    expect(r?.kind).toBe('order_locked');
  });

  it('limits guesses on one order number across emails and sessions', async () => {
    const throttle = new VerificationThrottle(2, 3_600_000);
    const d = deps({ throttle });
    await runOrderFlow({ message: 'où est ma commande #1042 a@mail.fr', history: [], now: NOW }, d);
    await runOrderFlow({ message: 'où est ma commande #1042 b@mail.fr', history: [], now: NOW }, d);
    const r = await runOrderFlow({ message: 'où est ma commande #1042 jean@mail.fr', history: [], now: NOW }, d);
    expect(r?.kind).toBe('order_locked');
  });

  it('does not count a successful check as a failure', async () => {
    const throttle = new VerificationThrottle(1, 3_600_000);
    const d = deps({ throttle });
    expect((await runOrderFlow({ message: 'où est ma commande #1042 jean@mail.fr', history: [], now: NOW }, d))?.kind).toBe('order_status');
    expect((await runOrderFlow({ message: 'où est ma commande #1042 jean@mail.fr', history: [], now: NOW }, d))?.kind).toBe('order_status');
  });

  it('lets only one of two simultaneous guesses through on the last try', async () => {
    const throttle = new VerificationThrottle(1, 3_600_000);
    let release!: () => void;
    const gate = new Promise<void>(r => { release = r; });
    const d = deps({ throttle, findByRef: vi.fn(async () => { await gate; return null; }) });
    const a = runOrderFlow({ message: 'où est ma commande #5001 x@mail.fr', history: [], now: NOW }, d);
    const b = runOrderFlow({ message: 'où est ma commande #5002 x@mail.fr', history: [], now: NOW }, d);
    release();
    const kinds = (await Promise.all([a, b])).map(r => r?.kind).sort();
    expect(kinds).toEqual(['order_locked', 'order_not_found']);
    expect(d.findByRef).toHaveBeenCalledTimes(1);
  });

  describe('with a signed-in customer', () => {
    it('answers from their orders without asking anything', async () => {
      const d = deps({ findRecentForEmail: vi.fn(async () => [shipped]) });
      const r = await runOrderFlow({ message: 'où est ma commande ?', history: [], trustedEmail: 'jean@mail.fr', now: NOW }, d);
      expect(d.findRecentForEmail).toHaveBeenCalledWith('jean@mail.fr');
      expect(r?.kind).toBe('order_status');
      expect(r?.text).toContain('#1042');
    });

    it('picks the order they cite', async () => {
      const other: TrackedOrder = { ...shipped, orderNumber: '#1050', status: 'confirmed', shipments: [], orderedAt: new Date('2026-09-27T09:00:00Z') };
      const d = deps({ findRecentForEmail: vi.fn(async () => [other, shipped]) });
      const r = await runOrderFlow({ message: 'où en est la commande #1042 ?', history: [], trustedEmail: 'jean@mail.fr', now: NOW }, d);
      expect(r?.text).toContain('#1042');
      expect(r?.text).not.toContain('#1050');
    });

    it('finds an older order that is not among the latest ones', async () => {
      const old: TrackedOrder = { ...shipped, orderNumber: '#900' };
      const d = deps({
        findRecentForEmail: vi.fn(async () => [shipped]),
        findByRef: vi.fn(async (digits: string, email: string) => (digits === '900' && email === 'jean@mail.fr' ? old : null)),
      });
      const r = await runOrderFlow({ message: 'où en est la commande #900 ?', history: [], trustedEmail: 'jean@mail.fr', now: NOW }, d);
      expect(r?.kind).toBe('order_status');
      expect(r?.text).toContain('#900');
    });

    it('asks for the email used when the cited order is not on their account', async () => {
      const d = deps({ findRecentForEmail: vi.fn(async () => [shipped]) });
      const r = await runOrderFlow({ message: 'où est ma commande #9999 ?', history: [], trustedEmail: 'jean@mail.fr', now: NOW }, d);
      expect(r?.kind).toBe('order_ask');
      expect(r?.text).toMatch(/email/);
    });

    it('offers the guest route when the account has no order', async () => {
      const r = await runOrderFlow({ message: 'où est ma commande ?', history: [], trustedEmail: 'jean@mail.fr', now: NOW }, deps());
      expect(r?.kind).toBe('order_ask');
      expect(r?.awaitingOrderRef).toBe(true);
    });
  });
});
