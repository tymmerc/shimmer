import { describe, it, expect } from 'vitest';
import { formatPrice } from '../../../../sdk/src/price.js';

// Le dock affichait le Decimal brut de la base : « 13.9 € » au lieu de « 13,90 € ».
describe('formatPrice (prix du dock, format français)', () => {
  it('shows two decimals with a comma for non-integer prices', () => {
    expect(formatPrice('13.9')).toBe('13,90 €');
    expect(formatPrice('12.5')).toBe('12,50 €');
    expect(formatPrice(18.45)).toBe('18,45 €');
  });
  it('keeps whole prices without decimals', () => {
    expect(formatPrice('21')).toBe('21 €');
    expect(formatPrice(9)).toBe('9 €');
  });
  it('never throws on odd input', () => {
    expect(formatPrice('sur devis')).toBe('sur devis €');
    expect(formatPrice(undefined)).toBe('');
    expect(formatPrice('')).toBe('');
  });
});
