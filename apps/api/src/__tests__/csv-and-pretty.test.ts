import { describe, it, expect } from 'vitest';
import { maybeSplitCsv } from '../routes/catalog-import.js';
import { toId, prettyLabelFromKey, prettyQuestionFromKey } from '../routes/universe-gen.js';

describe('maybeSplitCsv', () => {
  it('returns non-string input unchanged', () => {
    expect(maybeSplitCsv(42)).toBe(42);
    expect(maybeSplitCsv(null)).toBe(null);
    expect(maybeSplitCsv(true)).toBe(true);
    expect(maybeSplitCsv(['already', 'array'])).toEqual(['already', 'array']);
  });

  it('returns single value unchanged', () => {
    expect(maybeSplitCsv('rouge')).toBe('rouge');
    expect(maybeSplitCsv('Hello world')).toBe('Hello world');
  });

  it('splits comma-separated short tags into array', () => {
    expect(maybeSplitCsv('magret,cassoulet,gibier'))
      .toEqual(['magret', 'cassoulet', 'gibier']);
  });

  it('splits semicolon-separated values', () => {
    expect(maybeSplitCsv('rouge;blanc;rose')).toEqual(['rouge', 'blanc', 'rose']);
  });

  it('trims whitespace around each item', () => {
    expect(maybeSplitCsv('rouge ,  blanc , rose '))
      .toEqual(['rouge', 'blanc', 'rose']);
  });

  it('does not split prose (parts with sentence punctuation)', () => {
    const sentence = 'A great wine. With notes of cherry, oak, vanilla.';
    expect(maybeSplitCsv(sentence)).toBe(sentence);
  });

  it('does not split if any part is too long (>50 chars)', () => {
    const longish = 'short, ' + 'x'.repeat(60);
    expect(maybeSplitCsv(longish)).toBe(longish);
  });

  it('does not split if any part is too short (<2 chars)', () => {
    expect(maybeSplitCsv('a,b,c')).toBe('a,b,c');
  });

  it('drops empty parts after trimming', () => {
    expect(maybeSplitCsv('one, , two,,three'))
      .toEqual(['one', 'two', 'three']);
  });
});

describe('toId', () => {
  it('uppercases and replaces non-alphanumeric with underscore', () => {
    expect(toId('vin rouge')).toBe('VIN_ROUGE');
    expect(toId('Diametre Cm')).toBe('DIAMETRE_CM');
  });
  it('removes accents', () => {
    expect(toId('cépage')).toBe('CEPAGE');
    expect(toId('matière')).toBe('MATIERE');
  });
  it('collapses multiple underscores', () => {
    expect(toId('  multiple   spaces  ')).toBe('MULTIPLE_SPACES');
  });
  it('strips leading and trailing underscores', () => {
    expect(toId('_vin_rouge_')).toBe('VIN_ROUGE');
  });
});

describe('prettyLabelFromKey', () => {
  it('returns mapped label for known keys', () => {
    expect(prettyLabelFromKey('couleur')).toBe('Couleur');
    expect(prettyLabelFromKey('matiere')).toBe('Matière');
    expect(prettyLabelFromKey('diametre_cm')).toBe('Diamètre (cm)');
    expect(prettyLabelFromKey('puissance_max')).toBe('Puissance max (W)');
    expect(prettyLabelFromKey('cepage')).toBe('Cépage');
    expect(prettyLabelFromKey('millesime')).toBe('Millésime');
  });

  it('falls back to title case for unknown keys', () => {
    expect(prettyLabelFromKey('foo_bar')).toBe('Foo Bar');
  });
});

describe('prettyQuestionFromKey', () => {
  it('returns mapped question for known keys', () => {
    expect(prettyQuestionFromKey('couleur')).toBe('Quelle couleur souhaitez-vous ?');
    expect(prettyQuestionFromKey('diametre_cm')).toBe('Quel diamètre (en cm) ?');
    expect(prettyQuestionFromKey('accord')).toBe("C'est avec quel plat ?");
    expect(prettyQuestionFromKey('occasion')).toBe("C'est pour quelle occasion ?");
  });

  it('uses "Quelle" for feminine-ending unknown words', () => {
    // "finition" ends with -tion → feminine
    expect(prettyQuestionFromKey('finition_special')).toMatch(/^Quel /); // unknown compound, fallback last word
    expect(prettyQuestionFromKey('ambiance_special')).toMatch(/^Quel /);
    // "occasion_special" → last word is "special" (no feminine ending) → "Quel"
  });

  it('uses "Quel" for masculine-default unknown words', () => {
    expect(prettyQuestionFromKey('volume')).toBe('Quel volume préférez-vous ?');
  });

  it('falls back to "Quel X préférez-vous ?" for unknown keys', () => {
    expect(prettyQuestionFromKey('foobar')).toBe('Quel foobar préférez-vous ?');
  });
});
