import { describe, it, expect } from 'vitest';
import {
  detectUniversalSignals,
  stripIntentPrefix,
} from '../routes/search-assist.js';

describe('detectUniversalSignals', () => {
  it('returns empty for neutral query', () => {
    expect(detectUniversalSignals('Je cherche un vin rouge')).toEqual({});
  });

  it('detects premium budget keyword', () => {
    expect(detectUniversalSignals('Un vin haut de gamme')).toMatchObject({ budget: 'premium' });
    expect(detectUniversalSignals('Le meilleur de votre cave')).toMatchObject({ budget: 'premium' });
  });

  it('detects mid budget keyword', () => {
    expect(detectUniversalSignals('Un vin du milieu de gamme')).toMatchObject({ budget: 'mid' });
    expect(detectUniversalSignals('Un bon rapport qualité-prix')).toMatchObject({ budget: 'mid' });
  });

  it('detects cheap budget keyword', () => {
    expect(detectUniversalSignals('Un vin pas trop cher')).toMatchObject({ budget: 'cheap' });
    expect(detectUniversalSignals('Du premier prix')).toMatchObject({ budget: 'cheap' });
    expect(detectUniversalSignals('Petit budget pour un rouge')).toMatchObject({ budget: 'cheap' });
  });

  it('detects cadeau occasion + auto-premium', () => {
    const out = detectUniversalSignals('Je dois offrir une bouteille à mon patron');
    expect(out.occasion).toBe('cadeau');
    expect(out.budget).toBe('premium'); // cadeau implies premium
  });

  it('detects fête occasion + auto-mid', () => {
    const out = detectUniversalSignals('Pour un réveillon de Noël');
    expect(out.occasion).toBe('fete');
    expect(out.budget).toBe('mid');
  });

  it('detects amis occasion without budget bump', () => {
    const out = detectUniversalSignals('Un vin entre amis');
    expect(out.occasion).toBe('amis');
    expect(out.budget).toBeUndefined();
  });

  it('detects quotidien occasion', () => {
    expect(detectUniversalSignals('Un vin pour le quotidien')).toMatchObject({ occasion: 'quotidien' });
    expect(detectUniversalSignals('À boire tous les jours')).toMatchObject({ occasion: 'quotidien' });
  });

  it('preserves explicit budget over auto-inferred from occasion', () => {
    // Even with "cadeau", an explicit "pas cher" should be respected if matched first
    // Currently UNIVERSAL_BUDGET_PATTERNS runs first, so explicit signals win.
    const out = detectUniversalSignals('Un cadeau pas trop cher');
    expect(out.budget).toBe('cheap');
    expect(out.occasion).toBe('cadeau');
  });
});

describe('stripIntentPrefix', () => {
  it('strips "je veux"', () => {
    expect(stripIntentPrefix('Je veux le Chablis')).toBe('chablis');
  });

  it('strips "je cherche"', () => {
    expect(stripIntentPrefix('Je cherche une suspension')).toBe('suspension');
  });

  it('strips "tu as" / "vous avez"', () => {
    expect(stripIntentPrefix("Tu as du Chablis ?")).toBe('chablis ?');
    expect(stripIntentPrefix('Vous avez du Chablis ?')).toBe('chablis ?');
  });

  it('strips determinants after intent', () => {
    expect(stripIntentPrefix('Je veux le Chablis')).toBe('chablis');
    expect(stripIntentPrefix("Je voudrais un rouge")).toBe('rouge');
  });

  it('strips il me faut', () => {
    expect(stripIntentPrefix('Il me faut une bonne bouteille'))
      .toBe('bonne bouteille');
  });

  it('returns query as-is when no intent pattern', () => {
    expect(stripIntentPrefix('Chablis 2022')).toBe('chablis 2022');
  });

  it('lowercases the output', () => {
    expect(stripIntentPrefix('JE VEUX LE CHABLIS')).toBe('chablis');
  });

  it('trims surrounding whitespace', () => {
    expect(stripIntentPrefix('   Je veux du vin   ')).toBe('vin');
  });
});
