import { describe, it, expect, beforeEach } from 'vitest';
import {
  compactProduct,
  validateLLMResponse,
  applyRules,
  detectVertical,
  algorithmicFallback,
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

describe('detectVertical', () => {
  it('detects drinks vertical from wine categories', () => {
    expect(detectVertical(['Vin rouge', 'Vin blanc', 'Champagne'])).toBe('drinks');
    expect(detectVertical(['Crémant', 'Prosecco'])).toBe('drinks');
    expect(detectVertical(['Bière artisanale'])).toBe('drinks');
  });

  it('detects lighting vertical from lamp categories', () => {
    expect(detectVertical(['Suspension', 'Lampadaire'])).toBe('lighting');
    expect(detectVertical(['Applique', 'Lampe table'])).toBe('lighting');
  });

  it('detects fashion vertical', () => {
    expect(detectVertical(['Robes', 'Jeans'])).toBe('fashion');
  });

  it('falls back to generic for unknown categories', () => {
    expect(detectVertical(['Outils', 'Vis'])).toBe('generic');
    expect(detectVertical([])).toBe('generic');
  });
});

describe('algorithmicFallback', () => {
  const drinkCandidates = new Map([
    ['Vin blanc', [
      { id: 100, sku: 'B-100', name: 'Chablis', brand: 'X', category: 'Vin blanc', price: 24, specs: { accord: ['huitres', 'poisson'], occasion: 'apero' } },
    ]],
    ['Champagne', [
      { id: 200, sku: 'C-200', name: 'Brut', brand: 'Y', category: 'Champagne', price: 42, specs: { accord: ['apero', 'fete'], occasion: 'cadeau' } },
    ]],
    ['Vin rouge', [
      { id: 300, sku: 'R-300', name: 'Magret-ready', brand: 'Z', category: 'Vin rouge', price: 28, specs: { accord: ['magret', 'gibier'] } },
    ]],
  ]);

  it('picks from other categories only (never same category as reference)', () => {
    const ref = { id: 999, sku: 'X', name: 'Other red', brand: null, category: 'Vin rouge', price: 25, specs: { accord: ['magret'] } };
    const picks = algorithmicFallback(ref, drinkCandidates);
    expect(picks.every(p => p.target_id !== 300)).toBe(true); // same category excluded
  });

  it('returns at most 4 picks', () => {
    const ref = { id: 999, sku: 'X', name: 'X', brand: null, category: 'Autre', price: 30, specs: {} };
    const picks = algorithmicFallback(ref, drinkCandidates);
    expect(picks.length).toBeLessThanOrEqual(4);
  });

  it('one pick per distinct category', () => {
    const ref = { id: 999, sku: 'X', name: 'X', brand: null, category: 'Autre', price: 30, specs: {} };
    const picks = algorithmicFallback(ref, drinkCandidates);
    const cats = new Set(picks.map(p => {
      for (const [cat, prods] of drinkCandidates) {
        if (prods.some(prod => prod.id === p.target_id)) return cat;
      }
      return 'Autre';
    }));
    expect(cats.size).toBe(picks.length);
  });

  it('uses drinks vocabulary for drinks vertical', () => {
    const ref = { id: 999, sku: 'X', name: 'X', brand: null, category: 'Vin rosé', price: 22, specs: { accord: ['poisson'], occasion: 'apero' } };
    const picks = algorithmicFallback(ref, drinkCandidates);
    // Drinks vertical → no 'piece' wording in reasons
    expect(picks.every(p => !/pièce/i.test(p.reason))).toBe(true);
  });

  it('uses lighting vocabulary for lighting vertical', () => {
    const lightCandidates = new Map([
      ['Lampe table', [{ id: 100, sku: 'L-100', name: 'AJ', brand: 'P', category: 'Lampe table', price: 520, specs: { piece: ['salon', 'chambre'], style: ['scandinave'] } }]],
      ['Lampadaire', [{ id: 200, sku: 'L-200', name: 'Arco', brand: 'F', category: 'Lampadaire', price: 2980, specs: { piece: ['salon'], style: ['vintage'] } }]],
    ]);
    const ref = { id: 999, sku: 'X', name: 'PH5', brand: null, category: 'Suspension', price: 1290, specs: { piece: ['salon', 'salle a manger'], style: ['scandinave'] } };
    const picks = algorithmicFallback(ref, lightCandidates);
    // Lighting vertical → no apero/repas/dessert wording
    expect(picks.every(p => !/apéro|repas|dessert/i.test(p.reason))).toBe(true);
  });

  it('returns empty when no candidates in other categories', () => {
    const refOnlyCat = new Map([
      ['Vin rouge', [{ id: 100, sku: 'A', name: 'A', brand: null, category: 'Vin rouge', price: 20, specs: {} }]],
    ]);
    const ref = { id: 999, sku: 'X', name: 'X', brand: null, category: 'Vin rouge', price: 20, specs: {} };
    expect(algorithmicFallback(ref, refOnlyCat)).toEqual([]);
  });
});
