import { describe, it, expect } from 'vitest';
import { detectUniverse, applyStoreOverrides } from '../routes/search-assist.js';
import type { UniverseConfig, QualCriterion } from '../routes/search-assist.js';

function makeUniverse(id: string, label: string, keywords: string[], criteria: Partial<QualCriterion>[] = []): UniverseConfig {
  return {
    id,
    label,
    keywords,
    scoreProfile: { usage: 50, criteria: 40, history: 10 },
    criteria: criteria.map((c, i) => ({
      id: c.id || `C${i}`,
      label: c.label || `Critère ${i}`,
      weight: c.weight ?? 10,
      required: c.required ?? false,
      type: c.type ?? 'closed',
      values: c.values,
      question: c.question || `Q${i} ?`,
      fallback: c.fallback || '',
    })),
    deductions: [],
  };
}

describe('detectUniverse', () => {
  it('returns null when no keyword matches', () => {
    const universes = [makeUniverse('VIN_ROUGE', 'Vin rouge', ['rouge', 'tannique'])];
    expect(detectUniverse('Bonjour', universes)).toBeNull();
  });

  it('finds universe via keyword match', () => {
    const universes = [makeUniverse('VIN_ROUGE', 'Vin rouge', ['rouge', 'tannique'])];
    const u = detectUniverse('Un vin tannique pour le boeuf', universes);
    expect(u?.id).toBe('VIN_ROUGE');
  });

  it('boosts label match heavily', () => {
    const universes = [
      makeUniverse('VIN_ROUGE', 'Vin rouge', ['rouge']),
      makeUniverse('VIN_BLANC', 'Vin blanc', ['blanc', 'frais', 'huitres']),
    ];
    // "vin blanc" appears in the query as a phrase → big label boost wins over keyword bag
    const u = detectUniverse('Un vin blanc frais', universes);
    expect(u?.id).toBe('VIN_BLANC');
  });

  it('boosts universe_id segments', () => {
    const universes = [
      makeUniverse('VIN_ROUGE', 'Vin rouge', ['vin']),
      makeUniverse('VIN_BLANC', 'Vin blanc', ['vin']),
    ];
    // "rouge" matches segment "rouge" of VIN_ROUGE id → wins
    const u = detectUniverse('Un vin rouge', universes);
    expect(u?.id).toBe('VIN_ROUGE');
  });

  it('boosts criterion values matching the query', () => {
    const universes = [
      makeUniverse('VIN_ROUGE', 'Vin rouge', ['vin'], [
        { id: 'PROFIL', type: 'closed', values: ['puissant', 'tannique', 'leger'] },
      ]),
      makeUniverse('VIN_BLANC', 'Vin blanc', ['vin'], [
        { id: 'PROFIL', type: 'closed', values: ['frais', 'boise', 'doux'] },
      ]),
    ];
    // "tannique" only in VIN_ROUGE PROFIL values → VIN_ROUGE wins
    const u = detectUniverse('Un vin tannique', universes);
    expect(u?.id).toBe('VIN_ROUGE');
  });

  it('splits CSV-like values when matching', () => {
    const universes = [
      makeUniverse('VIN_ROUGE', 'Vin rouge', [], [
        { id: 'ACCORD', type: 'closed', values: ['magret,cassoulet,gibier'] },
      ]),
    ];
    // "cassoulet" should match the second CSV token
    const u = detectUniverse('Pour un cassoulet', universes);
    expect(u?.id).toBe('VIN_ROUGE');
  });

  it('handles accent normalization', () => {
    const universes = [makeUniverse('VIN_ROSE', 'Vin rosé', ['rosé', 'rose'])];
    expect(detectUniverse('Un vin rosé pour l\'été', universes)?.id).toBe('VIN_ROSE');
    expect(detectUniverse('Un vin rose pour l ete', universes)?.id).toBe('VIN_ROSE');
  });
});

describe('applyStoreOverrides', () => {
  const baseUniverse: UniverseConfig = makeUniverse('VIN_ROUGE', 'Vin rouge', ['vin', 'rouge'], [
    { id: 'ACCORD', required: true, weight: 30 },
    { id: 'GARDE', weight: 10 },
    { id: 'BUDGET', type: 'open', weight: 15 },
  ]);

  it('returns universes unchanged when config has no overrides', () => {
    const out = applyStoreOverrides([baseUniverse], { tone: 'tu' });
    expect(out[0]?.criteria.length).toBe(3);
  });

  it('adds new criterion via criteria_add', () => {
    const out = applyStoreOverrides([baseUniverse], {
      universe_overrides: {
        VIN_ROUGE: { criteria_add: [{ id: 'OCCASION', label: 'Occasion', weight: 20, required: true, type: 'closed', question: 'C\'est pour quoi ?', fallback: '' }] },
      },
    });
    const ids = out[0]?.criteria.map(c => c.id);
    expect(ids).toContain('OCCASION');
    expect(ids).toContain('ACCORD'); // existing preserved
  });

  it('does not add a criterion that already exists', () => {
    const out = applyStoreOverrides([baseUniverse], {
      universe_overrides: {
        VIN_ROUGE: { criteria_add: [{ id: 'ACCORD', label: 'X', weight: 99, required: false, type: 'open', question: 'NEW', fallback: '' }] },
      },
    });
    const accord = out[0]?.criteria.find(c => c.id === 'ACCORD');
    expect(accord?.weight).toBe(30); // not overwritten
    expect(accord?.question).not.toBe('NEW');
  });

  it('replaces existing criterion via criteria_replace', () => {
    const out = applyStoreOverrides([baseUniverse], {
      universe_overrides: {
        VIN_ROUGE: { criteria_replace: [{ id: 'ACCORD', label: 'New label', weight: 25, required: false, type: 'open', question: 'NEW Q', fallback: 'flex' }] },
      },
    });
    const accord = out[0]?.criteria.find(c => c.id === 'ACCORD');
    expect(accord?.label).toBe('New label');
    expect(accord?.question).toBe('NEW Q');
    expect(accord?.required).toBe(false);
  });

  it('removes criteria via criteria_remove', () => {
    const out = applyStoreOverrides([baseUniverse], {
      universe_overrides: { VIN_ROUGE: { criteria_remove: ['GARDE'] } },
    });
    const ids = out[0]?.criteria.map(c => c.id);
    expect(ids).not.toContain('GARDE');
    expect(ids).toContain('ACCORD');
  });

  it('reorders criteria via criteria_priority', () => {
    const out = applyStoreOverrides([baseUniverse], {
      universe_overrides: { VIN_ROUGE: { criteria_priority: ['BUDGET', 'ACCORD', 'GARDE'] } },
    });
    const ids = out[0]?.criteria.map(c => c.id);
    expect(ids).toEqual(['BUDGET', 'ACCORD', 'GARDE']);
  });

  it('appends keywords (deduplicated, lowercased)', () => {
    const out = applyStoreOverrides([baseUniverse], {
      universe_overrides: { VIN_ROUGE: { keywords_add: ['Tannique', 'puissant', 'vin'] } },
    });
    const kw = out[0]?.keywords;
    expect(kw).toContain('tannique');
    expect(kw).toContain('puissant');
    // 'vin' should not be duplicated
    expect(kw?.filter(k => k === 'vin').length).toBe(1);
  });

  it('appends deductions', () => {
    const out = applyStoreOverrides([baseUniverse], {
      universe_overrides: { VIN_ROUGE: { deductions_add: [{ patterns: ['cassoulet'], criterion: 'ACCORD', value: 'cassoulet' }] } },
    });
    expect(out[0]?.deductions.length).toBe(1);
    expect(out[0]?.deductions[0]?.criterion).toBe('ACCORD');
  });

  it('is a no-op for unknown universe ids', () => {
    const out = applyStoreOverrides([baseUniverse], {
      universe_overrides: { UNKNOWN: { criteria_remove: ['ACCORD'] } },
    });
    expect(out[0]?.criteria.length).toBe(3); // unchanged
  });

  it('returns input unchanged when config is null/undefined', () => {
    expect(applyStoreOverrides([baseUniverse], undefined)[0]?.criteria.length).toBe(3);
    expect(applyStoreOverrides([baseUniverse], null)[0]?.criteria.length).toBe(3);
    expect(applyStoreOverrides([baseUniverse], 'invalid')[0]?.criteria.length).toBe(3);
  });
});
