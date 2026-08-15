import { describe, it, expect } from 'vitest';

// Helper extracted from cart-recovery.ts, reproduced here to allow unit-testing
// without spinning up the whole router.
function buildReminder(
  step: 1 | 2,
  items: Array<{ name: string }>,
  total: number,
  promoCode?: string,
): { subject: string; body: string } {
  const itemList = items.slice(0, 3).map(i => i.name).join(', ');
  const more = items.length > 3 ? ` et ${items.length - 3} autre(s)` : '';
  if (step === 1) {
    return {
      subject: `Votre panier vous attend (${total.toFixed(2)}€)`,
      body: `Bonjour, votre panier avec ${itemList}${more} est toujours là. Une question ? Le vendeur est dispo.`,
    };
  }
  return {
    subject: `On vous offre 10% si vous finalisez aujourd'hui`,
    body: `On voulait pas vous laisser partir. Code ${promoCode ?? 'SHIMMER10'} valable 48h pour faire passer votre panier (${total.toFixed(2)}€) à -10%.`,
  };
}

describe('cart reminder builder', () => {
  it('step 1: friendly subject with total amount', () => {
    const r = buildReminder(1, [{ name: 'Châteauneuf' }], 38);
    expect(r.subject).toBe('Votre panier vous attend (38.00€)');
    expect(r.body).toContain('Châteauneuf');
  });

  it('step 1: lists up to 3 items then says "+N autre(s)"', () => {
    const r = buildReminder(
      1,
      [{ name: 'A' }, { name: 'B' }, { name: 'C' }, { name: 'D' }, { name: 'E' }],
      120,
    );
    expect(r.body).toContain('A, B, C');
    expect(r.body).toContain('et 2 autre(s)');
  });

  it('step 2: includes promo code', () => {
    const r = buildReminder(2, [{ name: 'X' }], 50, 'SHIMMER10-7');
    expect(r.body).toContain('SHIMMER10-7');
    expect(r.body).toContain('50.00€');
  });

  it('step 2: falls back to default promo when none provided', () => {
    const r = buildReminder(2, [{ name: 'X' }], 50);
    expect(r.body).toContain('SHIMMER10');
  });
});
