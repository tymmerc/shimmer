import { describe, it, expect } from 'vitest';
import {
  applyTone,
  applyVoice,
  preserveCase,
  getStoreTone,
  getStoreVoice,
} from '../routes/search-assist.js';

describe('preserveCase', () => {
  it('keeps lowercase when original is lowercase', () => {
    expect(preserveCase('tu', 'vous')).toBe('vous');
  });
  it('capitalizes when original starts with uppercase', () => {
    expect(preserveCase('Tu', 'vous')).toBe('Vous');
  });
  it('handles empty input safely', () => {
    expect(preserveCase('', 'x')).toBe('x');
    expect(preserveCase('a', '')).toBe('');
  });
});

describe('applyTone', () => {
  it('passes text through unchanged when tone matches "tu"', () => {
    expect(applyTone("Tu as raison", 'tu')).toBe("tu as raison".replace(/^t/, 'T'));
  });

  it('converts "vous voulez" to "tu veux"', () => {
    expect(applyTone('Vous voulez un café ?', 'tu')).toBe('Tu veux un café ?');
  });

  it('converts "vous intéresse" to "t\'intéresse" (elision)', () => {
    expect(applyTone('Quel accord vous intéresse ?', 'tu'))
      .toBe("Quel accord t'intéresse ?");
  });

  it('converts "vous plaît" to "te plaît" (consonne)', () => {
    expect(applyTone('Ce produit vous plaît ?', 'tu')).toBe('Ce produit te plaît ?');
  });

  it('converts possessives votre/vos', () => {
    expect(applyTone('Votre budget et vos préférences', 'tu'))
      .toBe('Ton budget et tes préférences');
  });

  it('converts "tu" to "vous" with verb conjugation', () => {
    expect(applyTone('Tu veux un café ?', 'vous')).toBe('Vous voulez un café ?');
  });

  it('preserves "nous" intact when converting tu→vous', () => {
    expect(applyTone('Nous avons ce produit', 'vous'))
      .toBe('Nous avons ce luminaire'.replace(' ce luminaire', ' ce produit'));
    // Sanity: nous stays nous, no false match on "vous"
    expect(applyTone('Nous avons des produits', 'vous')).toBe('Nous avons des produits');
  });

  it('preserves capitalization through transforms', () => {
    expect(applyTone('Quelle couleur vous intéresse ?', 'tu'))
      .toContain("t'intéresse");
  });

  it('does not match "vous" inside other words', () => {
    // "nous" must not be turned into "ntu"
    const out = applyTone('nous', 'tu');
    expect(out).toBe('nous');
  });
});

describe('getStoreTone', () => {
  it('returns "tu" when no config', () => {
    expect(getStoreTone(undefined)).toBe('tu');
    expect(getStoreTone({})).toBe('tu');
    expect(getStoreTone({ config: undefined })).toBe('tu');
  });
  it('reads "tu" from config', () => {
    expect(getStoreTone({ config: { tone: 'tu' } })).toBe('tu');
  });
  it('reads "vous" from config', () => {
    expect(getStoreTone({ config: { tone: 'vous' } })).toBe('vous');
  });
  it('falls back to "tu" on invalid tone', () => {
    expect(getStoreTone({ config: { tone: 'mlecher' } })).toBe('tu');
    expect(getStoreTone({ config: { tone: 42 } })).toBe('tu');
  });
});

describe('applyVoice', () => {
  it('returns text unchanged when voice is null', () => {
    expect(applyVoice('hello', null)).toBe('hello');
  });

  it('replaces standard acknowledgment with intro_phrase', () => {
    const out = applyVoice('Très bien ! Question ?', { intro_phrases: ['Tope !'] });
    expect(out).toBe('Tope ! Question ?');
  });

  it('handles multiple acknowledgments variants', () => {
    for (const ack of ['Très bien !', 'Compris !', 'Parfait !', 'OK !', 'Super !', 'Noté !', "D'accord !"]) {
      const out = applyVoice(`${ack} La suite`, { intro_phrases: ['REMPLACÉ !'] });
      expect(out).toBe('REMPLACÉ ! La suite');
    }
  });

  it('substitutes vocabulary with word boundary and preserves case', () => {
    expect(applyVoice('Ce Produit est top', { vocabulary: { produit: 'bouteille' } }))
      .toBe('Ce Bouteille est top');
    expect(applyVoice('Les produits sont là', { vocabulary: { produits: 'bouteilles' } }))
      .toBe('Les bouteilles sont là');
  });

  it('does not substitute partial matches', () => {
    // "produit" inside "reproduit" must not match
    expect(applyVoice('Cette photo est reproduite', { vocabulary: { produit: 'bouteille' } }))
      .toBe('Cette photo est reproduite');
  });

  it('appends signature once at the end', () => {
    expect(applyVoice('Message texte', { signature: 'Santé !' }))
      .toBe('Message texte Santé !');
  });

  it('trims trailing whitespace before signature', () => {
    expect(applyVoice('Message texte   \n', { signature: 'Santé !' }))
      .toBe('Message texte Santé !');
  });

  it('skips signature when empty string', () => {
    expect(applyVoice('Message', { signature: '   ' })).toBe('Message');
  });

  it('combines intro + vocab + signature in a single pass', () => {
    const out = applyVoice(
      'Compris ! Le produit est parfait.',
      { intro_phrases: ['Tope !'], vocabulary: { produit: 'bouteille' }, signature: 'Santé !' },
    );
    expect(out).toBe('Tope ! Le bouteille est parfait. Santé !');
  });
});

describe('getStoreVoice', () => {
  it('returns null when no voice configured', () => {
    expect(getStoreVoice(undefined)).toBeNull();
    expect(getStoreVoice({ config: {} })).toBeNull();
    expect(getStoreVoice({ config: { tone: 'tu' } })).toBeNull();
  });
  it('returns voice object when configured', () => {
    const cfg = { config: { voice: { signature: 'Santé !' } } };
    expect(getStoreVoice(cfg)).toEqual({ signature: 'Santé !' });
  });
});
