import { describe, it, expect, beforeEach } from 'vitest';
import {
  compactProduct,
  validateLLMResponse,
  applyRules,
  type CrossSellSuggestion,
  type CrossSellRuleSet,
} from '../routes/cross-sell.js';

describe('compactProduct', () => {
  it('includes name, brand, category, price', () => {
    const out = compactProduct({
      id: 42, sku: 'X', name: 'Chablis 2022', brand: 'Fèvre',
      category: 'Vin blanc', price: 24, specs: {},
    });
    expect(out).toContain('#42');
    expect(out).toContain('Chablis 2022');
    expect(out).toContain('Fèvre');
    expect(out).toContain('Vin blanc');
    expect(out).toContain('24€');
  });

  it('appends only relevant spec tags', () => {
    const out = compactProduct({
      id: 1, sku: 'X', name: 'X', brand: null, category: null, price: 10,
      specs: {
        accord: ['huitres', 'fruits de mer'],
        occasion: 'apero',
        garde: '10 ans', // not in whitelist → ignored
        couleur: 'blanc', // not in whitelist → ignored
      },
    });
    expect(out).toContain('accord=huitres/fruits de mer');
    expect(out).toContain('occasion=apero');
    expect(out).not.toContain('garde=');
    expect(out).not.toContain('couleur=');
  });

  it('handles null brand/category gracefully', () => {
    const out = compactProduct({
      id: 1, sku: 'X', name: 'X', brand: null, category: null, price: 5, specs: {},
    });
    expect(out).toContain('(-)');
  });

  it('flattens array specs with slash', () => {
    const out = compactProduct({
      id: 1, sku: 'X', name: 'X', brand: null, category: null, price: 5,
      specs: { style: ['scandinave', 'minimaliste'] },
    });
    expect(out).toContain('style=scandinave/minimaliste');
  });
});

describe('validateLLMResponse', () => {
  const makeIds = () => new Set([10, 20, 30, 40, 50]);
  let validIds = makeIds();
  beforeEach(() => { validIds = makeIds(); });

  it('parses well-formed JSON', () => {
    const raw = '{"picks":[{"target_id":20,"role":"apero","reason":"Pour ouvrir","score":0.9}]}';
    const out = validateLLMResponse(raw, 1, validIds);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ target_id: 20, role: 'apero', reason: 'Pour ouvrir', score: 0.9 });
  });

  it('handles LLM output with surrounding text', () => {
    const raw = 'Voici ma réponse :\n{"picks":[{"target_id":20,"role":"repas","reason":"Pour le plat","score":0.85}]}\nFin.';
    const out = validateLLMResponse(raw, 1, validIds);
    expect(out).toHaveLength(1);
  });

  it('drops invalid target_id (not in catalog)', () => {
    const raw = '{"picks":[{"target_id":999,"role":"apero","reason":"...","score":0.9}]}';
    expect(validateLLMResponse(raw, 1, validIds)).toEqual([]);
  });

  it('drops self-reference', () => {
    const raw = '{"picks":[{"target_id":20,"role":"apero","reason":"...","score":0.9}]}';
    expect(validateLLMResponse(raw, 20, validIds)).toEqual([]);
  });

  it('drops invalid role', () => {
    const raw = '{"picks":[{"target_id":20,"role":"foobar","reason":"...","score":0.9}]}';
    expect(validateLLMResponse(raw, 1, validIds)).toEqual([]);
  });

  it('drops empty/too-short reason', () => {
    const raw = '{"picks":[{"target_id":20,"role":"apero","reason":"","score":0.9}]}';
    expect(validateLLMResponse(raw, 1, validIds)).toEqual([]);
  });

  it('clamps score to 0..1', () => {
    const raw = '{"picks":[{"target_id":20,"role":"apero","reason":"...","score":99}]}';
    const out = validateLLMResponse(raw, 1, validIds);
    expect(out[0]?.score).toBe(1);
  });

  it('defaults missing score to 0.7', () => {
    const raw = '{"picks":[{"target_id":20,"role":"apero","reason":"..."}]}';
    const out = validateLLMResponse(raw, 1, validIds);
    expect(out[0]?.score).toBe(0.7);
  });

  it('truncates reason to 280 chars', () => {
    const long = 'x'.repeat(500);
    const raw = `{"picks":[{"target_id":20,"role":"apero","reason":"${long}","score":0.9}]}`;
    const out = validateLLMResponse(raw, 1, validIds);
    expect(out[0]?.reason.length).toBe(280);
  });

  it('deduplicates same target_id across picks', () => {
    const raw = '{"picks":[{"target_id":20,"role":"apero","reason":"Ouvre","score":0.9},{"target_id":20,"role":"repas","reason":"Second","score":0.7}]}';
    const out = validateLLMResponse(raw, 1, validIds);
    expect(out).toHaveLength(1);
    expect(out[0]?.reason).toBe('Ouvre');
  });

  it('caps at 6 picks', () => {
    const localIds = new Set<number>();
    for (let i = 100; i <= 110; i++) localIds.add(i);
    const picks = Array.from({ length: 10 }, (_, i) => ({ target_id: 100 + i, role: 'apero', reason: `R${i}`, score: 0.8 }));
    const out = validateLLMResponse(JSON.stringify({ picks }), 1, localIds);
    expect(out.length).toBeLessThanOrEqual(6);
  });

  it('returns empty on malformed JSON', () => {
    expect(validateLLMResponse('not json at all', 1, validIds)).toEqual([]);
    expect(validateLLMResponse('{"picks":[broken', 1, validIds)).toEqual([]);
    expect(validateLLMResponse('', 1, validIds)).toEqual([]);
  });

  it('returns empty when picks is not an array', () => {
    expect(validateLLMResponse('{"picks":"hello"}', 1, validIds)).toEqual([]);
    expect(validateLLMResponse('{"foo":"bar"}', 1, validIds)).toEqual([]);
  });

  it('tolerates trailing commas', () => {
    const raw = '{"picks":[{"target_id":20,"role":"apero","reason":"Test","score":0.9,},],}';
    const out = validateLLMResponse(raw, 1, validIds);
    expect(out).toHaveLength(1);
  });
});

describe('applyRules', () => {
  const picks: CrossSellSuggestion[] = [
    { target_id: 10, role: 'apero', reason: 'A', score: 0.9 },
    { target_id: 20, role: 'repas', reason: 'B', score: 0.85 },
    { target_id: 30, role: 'dessert', reason: 'C', score: 0.75 },
  ];
  const candidates = new Map([
    ['Vin blanc', [{ id: 10, sku: 'B-10' }, { id: 40, sku: 'B-40' }]],
    ['Vin rouge', [{ id: 20, sku: 'R-20' }]],
    ['Vin doux', [{ id: 30, sku: 'D-30' }]],
    ['Champagne', [{ id: 50, sku: 'C-50' }, { id: 60, sku: 'C-60' }]],
  ]);

  it('returns picks unchanged when no rules', () => {
    expect(applyRules(picks, 'ANY', null, undefined, candidates)).toEqual(picks);
  });

  it('excludes pairs matching from_sku + to_sku', () => {
    const rules: CrossSellRuleSet = { exclude: [{ from_sku: 'REF-1', to_sku: 'B-10' }] };
    const out = applyRules(picks, 'REF-1', 'Vin rouge', rules, candidates);
    expect(out.find(p => p.target_id === 10)).toBeUndefined();
    expect(out).toHaveLength(2);
  });

  it('force-injects a sku-targeted product not yet in picks', () => {
    const rules: CrossSellRuleSet = {
      force: [{ from_sku: 'REF-1', to_sku: 'C-50', role: 'apero', reason: 'Le maison' }],
    };
    const out = applyRules(picks, 'REF-1', 'Vin rouge', rules, candidates);
    expect(out[0]).toMatchObject({ target_id: 50, role: 'apero', reason: 'Le maison' });
    expect(out.length).toBeLessThanOrEqual(6);
  });

  it('force-injects by from_category and to_category', () => {
    const rules: CrossSellRuleSet = {
      force: [{ from_category: 'Vin rouge', to_category: 'Champagne', role: 'apero', reason: 'Pour ouvrir le repas' }],
    };
    const out = applyRules(picks, 'REF-1', 'Vin rouge', rules, candidates);
    expect(out.some(p => [50, 60].includes(p.target_id))).toBe(true);
  });

  it('does not inject if from_category does not match', () => {
    const rules: CrossSellRuleSet = {
      force: [{ from_category: 'Vin blanc', to_category: 'Champagne', role: 'apero' }],
    };
    const out = applyRules(picks, 'REF-1', 'Vin rouge', rules, candidates);
    expect(out.some(p => [50, 60].includes(p.target_id))).toBe(false);
  });

  it('does not duplicate force-injection of an existing target', () => {
    const rules: CrossSellRuleSet = {
      force: [{ from_sku: 'REF-1', to_sku: 'B-10', role: 'apero', reason: 'X' }],
    };
    const out = applyRules(picks, 'REF-1', 'Vin rouge', rules, candidates);
    expect(out.filter(p => p.target_id === 10)).toHaveLength(1);
  });

  it('overrides reason via reason_overrides', () => {
    const rules: CrossSellRuleSet = {
      reason_overrides: { 'REF-1→R-20': 'Custom reason set by merchant' },
    };
    const out = applyRules(picks, 'REF-1', 'Vin rouge', rules, candidates);
    const pick20 = out.find(p => p.target_id === 20);
    expect(pick20?.reason).toBe('Custom reason set by merchant');
  });

  it('combines exclude + force + override', () => {
    const rules: CrossSellRuleSet = {
      exclude: [{ from_sku: 'REF-1', to_sku: 'D-30' }],
      force: [{ from_sku: 'REF-1', to_sku: 'C-50', role: 'apero', reason: 'Pour ouvrir' }],
      reason_overrides: { 'REF-1→R-20': 'Le grand cru du restaurant' },
    };
    const out = applyRules(picks, 'REF-1', 'Vin rouge', rules, candidates);
    expect(out.find(p => p.target_id === 30)).toBeUndefined(); // excluded
    expect(out.find(p => p.target_id === 50)).toBeDefined(); // forced
    expect(out.find(p => p.target_id === 20)?.reason).toBe('Le grand cru du restaurant');
  });

  it('caps the final output at 6 once rules are applied', () => {
    const manyPicks: CrossSellSuggestion[] = [
      { target_id: 1, role: 'apero', reason: 'A', score: 0.9 },
      { target_id: 2, role: 'apero', reason: 'B', score: 0.85 },
      { target_id: 3, role: 'apero', reason: 'C', score: 0.8 },
      { target_id: 4, role: 'apero', reason: 'D', score: 0.75 },
      { target_id: 5, role: 'apero', reason: 'E', score: 0.7 },
      { target_id: 6, role: 'apero', reason: 'F', score: 0.65 },
      { target_id: 7, role: 'apero', reason: 'G', score: 0.6 },
    ];
    // With a no-op rule, the function does apply its slice(0, 6) cap
    const out = applyRules(manyPicks, 'X', null, { exclude: [] }, candidates);
    expect(out.length).toBeLessThanOrEqual(6);
  });
});
