/**
 * Cross-sell — LLM-powered complementary product recommendations.
 *
 * Architecture (3 layers from POST-FIX-P2 plan):
 *   1. Precompute (offline, per-store): LLM analyzes each product against a
 *      sampled catalog and proposes 4 complementary picks with role + reason.
 *   2. Lookup (live, <20ms): join product_cross_sells + products → JSON.
 *   3. Merchant overrides: stores.config.cross_sell_rules can force/exclude
 *      pairs or rewrite reasons.
 *
 * Endpoints:
 *   POST /api/catalog/cross-sell/generate   — kick off precompute for current store
 *   GET  /api/catalog/products/:id/cross-sell?limit=N — live lookup with merchant overrides
 *   DELETE /api/catalog/cross-sell          — wipe and regenerate clean
 */

import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { getPrisma, ClaudeClient, logger } from '@shimmer/core';

export const crossSellRouter = Router();

// LLM-augmented reasons are gated behind CROSS_SELL_USE_LLM=true. By default we
// skip the LLM entirely and use the algorithmic engine, which is fast (no
// per-product API call) and never hallucinates. Enable when a working Claude
// or OpenAI key is configured — the path is wired up and tested.
const USE_LLM = process.env.CROSS_SELL_USE_LLM === 'true';
const client = new ClaudeClient();

// ─────────────────────────────────────────────────────────────
// Event tracking schemas
// ─────────────────────────────────────────────────────────────

const VALID_EVENT_TYPES = ['impression', 'click', 'add', 'view_target', 'purchase'] as const;
type CrossSellEventType = typeof VALID_EVENT_TYPES[number];

const eventSchema = z.object({
  product_id: z.number().int().positive(),
  target_id: z.number().int().positive(),
  role: z.string().min(1).max(40),
  event_type: z.enum(VALID_EVENT_TYPES),
  session_id: z.string().min(8).max(64),
  position: z.number().int().min(0).max(20).optional(),
  metadata: z.record(z.unknown()).optional(),
});

const batchEventsSchema = z.object({
  events: z.array(eventSchema).min(1).max(50),
});

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export type CrossSellRole = 'apero' | 'repas' | 'dessert' | 'decouverte' | 'cadeau' | 'accessoire' | 'complement';

const VALID_ROLES: ReadonlySet<CrossSellRole> = new Set([
  'apero', 'repas', 'dessert', 'decouverte', 'cadeau', 'accessoire', 'complement',
]);

export interface CrossSellSuggestion {
  target_id: number;
  role: CrossSellRole;
  reason: string;
  score: number;
}

export interface CrossSellRuleSet {
  force?: { from_sku?: string; from_category?: string; to_sku?: string; to_category?: string; role?: CrossSellRole; reason?: string }[];
  exclude?: { from_sku?: string; to_sku?: string }[];
  reason_overrides?: Record<string, string>; // key: "fromSku→toSku"
}

// ─────────────────────────────────────────────────────────────
// Pure helpers (exported for tests)
// ─────────────────────────────────────────────────────────────

/** Compact product representation passed to the LLM. */
export function compactProduct(p: {
  id: number; sku: string; name: string; brand: string | null; category: string | null;
  price: unknown; specs?: unknown;
}): string {
  const specs = (p.specs as Record<string, unknown>) || {};
  const tags: string[] = [];
  for (const [k, v] of Object.entries(specs)) {
    if (['accord', 'occasion', 'profil', 'style', 'piece', 'ambiance', 'usage', 'genre'].includes(k)) {
      const flat = Array.isArray(v) ? v.join('/') : String(v);
      tags.push(`${k}=${flat}`);
    }
  }
  const tagsStr = tags.length ? ` [${tags.join('; ')}]` : '';
  return `#${p.id} ${p.name} (${p.brand || '-'}) ${p.category || '-'} ${p.price}€${tagsStr}`;
}

/** Build the prompt for one product. */
export function buildPrompt(
  reference: { id: number; name: string; category: string | null },
  refCompact: string,
  candidatesByCategory: Map<string, string[]>,
  storeContext: { name: string; voice?: string },
): string {
  const blocks = [...candidatesByCategory.entries()]
    .map(([cat, lines]) => `## ${cat}\n${lines.join('\n')}`)
    .join('\n\n');

  const voiceLine = storeContext.voice ? `\nTon de la boutique : ${storeContext.voice}` : '';

  return `Tu aides la boutique « ${storeContext.name} » à proposer des produits complémentaires sur la fiche d'un produit.${voiceLine}

PRODUIT EN RÉFÉRENCE (sur lequel le client vient de cliquer) :
${refCompact}

CATALOGUE DISPONIBLE (par catégorie) :
${blocks}

TÂCHE :
Choisis 4 produits du catalogue qui complètent vraiment ce produit pour augmenter le panier. Ce ne sont PAS des substituts (pas des produits similaires), ce sont des produits qui vont AVEC.

Pour chaque pick, attribue :
- role : "apero" | "repas" | "dessert" | "decouverte" | "cadeau" | "accessoire" | "complement"
- reason : une phrase courte (max 15 mots), naturelle, qui parle au client final. Pas "ce produit est similaire", plutôt "Pour ouvrir le repas en fraîcheur", "À offrir avec une carte", "Pour finir sur une note sucrée".
- score : 0.5 à 1.0 selon ta confiance.

CONTRAINTES STRICTES :
- N'invente AUCUN produit. N'utilise QUE les IDs présents dans le catalogue ci-dessus.
- Pas plus de 2 produits de la même catégorie.
- Pas le produit en référence lui-même.
- Varie les rôles si possible.

Réponds UNIQUEMENT en JSON, format :
{"picks": [{"target_id": 123, "role": "apero", "reason": "...", "score": 0.9}, ...]}`;
}

/** Parse + validate LLM output against the actual catalog. */
export function validateLLMResponse(
  raw: string,
  referenceId: number,
  validIds: Set<number>,
): CrossSellSuggestion[] {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(match[0].replace(/,\s*}/g, '}').replace(/,\s*]/g, ']'));
  } catch {
    return [];
  }
  if (!parsed || typeof parsed !== 'object') return [];
  const picks = (parsed as Record<string, unknown>)['picks'];
  if (!Array.isArray(picks)) return [];

  const seen = new Set<number>();
  const out: CrossSellSuggestion[] = [];
  for (const p of picks) {
    if (!p || typeof p !== 'object') continue;
    const obj = p as Record<string, unknown>;
    const tid = Number(obj.target_id);
    if (!Number.isFinite(tid) || tid === referenceId || seen.has(tid) || !validIds.has(tid)) continue;
    const role = String(obj.role || '').toLowerCase() as CrossSellRole;
    if (!VALID_ROLES.has(role)) continue;
    const reason = String(obj.reason || '').trim().slice(0, 280);
    if (reason.length < 3) continue;
    const score = Math.max(0, Math.min(1, Number(obj.score) || 0.7));
    seen.add(tid);
    out.push({ target_id: tid, role, reason, score });
  }
  return out.slice(0, 6);
}

/** Apply merchant rules (force / exclude / reason_overrides) on top of LLM picks. */
export function applyRules(
  picks: CrossSellSuggestion[],
  refSku: string,
  refCategory: string | null,
  rules: CrossSellRuleSet | undefined,
  candidatesByCategory: Map<string, { id: number; sku: string }[]>,
): CrossSellSuggestion[] {
  if (!rules) return picks;
  let result = [...picks];

  // Exclude
  if (Array.isArray(rules.exclude)) {
    const excludedTargets = new Set<string>();
    for (const r of rules.exclude) {
      if (r.from_sku === refSku && r.to_sku) excludedTargets.add(r.to_sku);
    }
    if (excludedTargets.size > 0) {
      // We need to map sku → id to filter. The caller already passes id-keyed picks.
      // We resolve via the candidates map.
      const skuToId = new Map<string, number>();
      for (const list of candidatesByCategory.values()) {
        for (const c of list) skuToId.set(c.sku, c.id);
      }
      const excludedIds = new Set([...excludedTargets].map(s => skuToId.get(s)).filter((n): n is number => typeof n === 'number'));
      result = result.filter(p => !excludedIds.has(p.target_id));
    }
  }

  // Force injections
  if (Array.isArray(rules.force)) {
    for (const r of rules.force) {
      const matchesFrom =
        (r.from_sku && r.from_sku === refSku) ||
        (r.from_category && r.from_category === refCategory);
      if (!matchesFrom) continue;
      // Find a candidate to inject
      const skuToId = new Map<string, number>();
      const catCandidates: { id: number; sku: string }[] = [];
      for (const [cat, list] of candidatesByCategory) {
        for (const c of list) skuToId.set(c.sku, c.id);
        if (r.to_category && cat === r.to_category) catCandidates.push(...list);
      }
      let targetId: number | undefined;
      if (r.to_sku) targetId = skuToId.get(r.to_sku);
      else if (catCandidates.length > 0) targetId = catCandidates[0]!.id;
      if (typeof targetId === 'number' && !result.some(p => p.target_id === targetId)) {
        result.unshift({
          target_id: targetId,
          role: r.role || 'complement',
          reason: r.reason || 'Recommandé par la boutique',
          score: 0.95,
        });
      }
    }
  }

  // Reason overrides
  if (rules.reason_overrides && typeof rules.reason_overrides === 'object') {
    const idToSku = new Map<number, string>();
    for (const list of candidatesByCategory.values()) {
      for (const c of list) idToSku.set(c.id, c.sku);
    }
    result = result.map(p => {
      const targetSku = idToSku.get(p.target_id);
      if (!targetSku) return p;
      const key = `${refSku}→${targetSku}`;
      const override = rules.reason_overrides![key];
      return override ? { ...p, reason: override } : p;
    });
  }

  return result.slice(0, 6);
}

// ─────────────────────────────────────────────────────────────
// LLM generation
// ─────────────────────────────────────────────────────────────

interface CatalogProduct {
  id: number; sku: string; name: string; brand: string | null;
  category: string | null; price: unknown; specs: unknown;
}

/** Sniff the store vertical from category names. Picks the role vocabulary
 *  that makes sense for the merchant (a caviste shouldn't talk about "pièces",
 *  a lighting shop shouldn't talk about "apéro"). */
export type StoreVertical = 'drinks' | 'lighting' | 'fashion' | 'generic';

export function detectVertical(categories: Iterable<string>): StoreVertical {
  const cats = [...categories].map(c => c.toLowerCase());
  if (cats.some(c => /\b(vin|champagne|cr[ée]mant|prosecco|bi[èe]re|whisky|spiritueux|alcool|liqueur)\b/.test(c))) return 'drinks';
  if (cats.some(c => /\b(suspension|lampe|lampadaire|applique|luminaire|spot|plafonnier)\b/.test(c))) return 'lighting';
  if (cats.some(c => /\b(robe|jean|chemise|veste|manteau|pantalon|chaussur|sneaker|accessoire mode)/.test(c))) return 'fashion';
  return 'generic';
}

interface RoleReason { role: CrossSellRole; reason: string; }

// Category hints drive role assignment without any LLM. They encode merchant
// intuition: in a wine shop, a Champagne is naturally an apéritif suggestion,
// a vin doux is for dessert, etc. Override-safe (merchant rules win at lookup).
const CATEGORY_ROLE_HINTS: Record<string, CrossSellRole | undefined> = {
  champagne: 'apero',
  crémant: 'apero',
  cremant: 'apero',
  prosecco: 'apero',
  effervescent: 'apero',
  'vin doux': 'dessert',
  liquoreux: 'dessert',
  digestif: 'dessert',
  applique: 'complement',
  lampadaire: 'complement',
  'lampe table': 'complement',
  'lampe bureau': 'complement',
  suspension: 'complement',
};

// Pools of phrasings per role, varied to avoid repetition. Picked deterministically
// based on a stable hash of the (refId, candId) pair so the same lookup is consistent
// across calls.
const PHRASES_BY_ROLE: Record<CrossSellRole, { drinks: string[]; lighting: string[]; fashion: string[]; generic: string[] }> = {
  apero: {
    drinks: ["Pour ouvrir le repas", "Idéal en apéritif avant", "Pour démarrer en fraîcheur", "À servir en début de repas", "Pour l'apéritif maison"],
    lighting: ["Pour démarrer la pièce", "Une première touche d'ambiance", "Pour ouvrir l'espace"],
    fashion: ["Pour démarrer le look"],
    generic: ["Pour ouvrir"],
  },
  repas: {
    drinks: ["Pour le plat principal", "Sur la table aussi", "Pour accompagner le repas", "Aussi sur ce plat", "Pour le service à table"],
    lighting: ["Pour la zone repas", "Sur la table à manger"],
    fashion: ["Pour la même occasion"],
    generic: ["Pour la même occasion"],
  },
  dessert: {
    drinks: ["Pour finir le repas en douceur", "À servir avec le dessert", "Pour clore en sucré", "En fin de repas", "Pour le dessert"],
    lighting: ["Pour l'ambiance fin de soirée"],
    fashion: ["Pour terminer la tenue"],
    generic: ["Pour finir"],
  },
  decouverte: {
    drinks: ["À découvrir, autre style", "Pour élargir le palais", "Autre profil à essayer", "Un changement de cépage", "Pour la curiosité"],
    lighting: ["Même esprit, autre forme", "Autre style à découvrir", "Une variante stylée"],
    fashion: ["Pour varier le look"],
    generic: ["Pour découvrir"],
  },
  cadeau: {
    drinks: ["À offrir avec une carte", "Pour faire plaisir", "Idéal en cadeau", "Pour une grande occasion"],
    lighting: ["Pour offrir un set complet", "À offrir en duo", "Une belle pièce à offrir"],
    fashion: ["À offrir avec celui-ci"],
    generic: ["À offrir"],
  },
  accessoire: {
    drinks: ["L'accessoire qui va avec"],
    lighting: ["L'accessoire assorti"],
    fashion: ["L'accessoire qui complète"],
    generic: ["L'accessoire associé"],
  },
  complement: {
    drinks: ["Va bien avec celui-ci", "Un complément possible", "Aussi à considérer"],
    lighting: ["Pour la même pièce", "Une autre pièce assortie", "À assortir avec celui-ci"],
    fashion: ["Pour compléter la tenue", "Avec, dans le même style"],
    generic: ["Complète bien", "À associer", "Un complément possible"],
  },
};

function pickPhrase(role: CrossSellRole, vertical: StoreVertical, seed: number): string {
  const pool = PHRASES_BY_ROLE[role][vertical] || PHRASES_BY_ROLE[role].generic;
  if (pool.length === 0) return 'Complète bien ce produit';
  return pool[seed % pool.length]!;
}

function categoryHint(category: string | null | undefined): CrossSellRole | undefined {
  if (!category) return undefined;
  const c = category.toLowerCase();
  for (const [key, role] of Object.entries(CATEGORY_ROLE_HINTS)) {
    if (c.includes(key)) return role;
  }
  return undefined;
}

function reasonForSharedKey(
  vertical: StoreVertical,
  sharedKeys: string[],
  refOccasion: string,
  candCategory: string | null,
  seed: number,
): RoleReason {
  // Category hint from candidate beats shared-key heuristics
  const catRole = candCategory ? categoryHint(candCategory) : undefined;
  if (catRole) return { role: catRole, reason: pickPhrase(catRole, vertical, seed) };

  if (sharedKeys.includes('occasion')) {
    if (refOccasion.includes('apero') || refOccasion.includes('apéro')) {
      if (vertical === 'drinks') return { role: 'apero', reason: pickPhrase('apero', vertical, seed) };
    }
    if (refOccasion.includes('cadeau')) return { role: 'cadeau', reason: pickPhrase('cadeau', vertical, seed) };
    if (refOccasion.includes('dessert') && vertical === 'drinks') return { role: 'dessert', reason: pickPhrase('dessert', vertical, seed) };
    return { role: 'complement', reason: pickPhrase('complement', vertical, seed) };
  }
  if (sharedKeys.includes('accord') && vertical === 'drinks') return { role: 'repas', reason: pickPhrase('repas', vertical, seed) };
  if (sharedKeys.includes('piece')) return { role: 'complement', reason: pickPhrase('complement', vertical, seed) };
  if (sharedKeys.includes('style')) return { role: 'decouverte', reason: pickPhrase('decouverte', vertical, seed) };
  return { role: 'complement', reason: pickPhrase('complement', vertical, seed) };
}

function reasonForPriceLadder(
  vertical: StoreVertical,
  candPrice: number,
  refPrice: number,
  candCategory: string | null,
  seed: number,
): RoleReason {
  // Category hint wins
  const catRole = candCategory ? categoryHint(candCategory) : undefined;
  if (catRole) return { role: catRole, reason: pickPhrase(catRole, vertical, seed) };

  if (candPrice > refPrice * 1.8) return { role: 'cadeau', reason: pickPhrase('cadeau', vertical, seed) };
  if (candPrice < refPrice * 0.6) return { role: 'decouverte', reason: pickPhrase('decouverte', vertical, seed) };
  return { role: 'complement', reason: pickPhrase('complement', vertical, seed) };
}

/**
 * Algorithmic fallback when the LLM is unavailable, slow, or returns nothing valid.
 * Guarantees up to 4 picks even when no specs overlap, by falling back to
 * "one representative product per other category" with price-stratified roles.
 */
export function algorithmicFallback(
  reference: CatalogProduct,
  candidatesByCategory: Map<string, CatalogProduct[]>,
): CrossSellSuggestion[] {
  const vertical = detectVertical(candidatesByCategory.keys());
  const refSpecs = (reference.specs as Record<string, unknown>) || {};
  const refCategory = reference.category;
  const refPrice = Number(reference.price) || 0;
  const SHARED_KEYS = ['accord', 'occasion', 'usage', 'piece', 'style', 'profil'];
  const refValues = new Map<string, string[]>();
  for (const k of SHARED_KEYS) {
    const v = refSpecs[k];
    if (Array.isArray(v)) refValues.set(k, v.map(String).map(s => s.toLowerCase()));
    else if (typeof v === 'string') {
      refValues.set(k, v.toLowerCase().split(/[,;]/).map(s => s.trim()).filter(Boolean));
    }
  }

  // Score candidates: shared signals weighted strongly, then "price ladder" diversity
  const pool: { product: CatalogProduct; sharedCount: number; sharedKeys: string[] }[] = [];
  for (const [cat, prods] of candidatesByCategory) {
    if (cat === refCategory) continue;
    for (const p of prods) {
      if (p.id === reference.id) continue;
      const pSpecs = (p.specs as Record<string, unknown>) || {};
      let shared = 0;
      const sharedKeys: string[] = [];
      for (const [k, refList] of refValues) {
        const pv = pSpecs[k];
        const pList = Array.isArray(pv)
          ? pv.map(String).map(s => s.toLowerCase())
          : typeof pv === 'string' ? pv.toLowerCase().split(/[,;]/).map(s => s.trim()).filter(Boolean) : [];
        const inter = refList.filter(x => pList.includes(x)).length;
        if (inter > 0) { shared += inter; sharedKeys.push(k); }
      }
      pool.push({ product: p, sharedCount: shared, sharedKeys });
    }
  }

  // Sort: shared signals first, then by closeness to reference price (gentle ladder)
  pool.sort((a, b) => {
    if (b.sharedCount !== a.sharedCount) return b.sharedCount - a.sharedCount;
    const dA = Math.abs(Number(a.product.price) - refPrice);
    const dB = Math.abs(Number(b.product.price) - refPrice);
    return dA - dB;
  });

  // One pick per category for diversity.
  const seenCategories = new Set<string>();
  const picks: CrossSellSuggestion[] = [];
  const refOccasion = refValues.get('occasion')?.[0] || '';

  for (const cand of pool) {
    const cat = cand.product.category || 'Autre';
    if (seenCategories.has(cat)) continue;
    seenCategories.add(cat);

    const candPrice = Number(cand.product.price) || 0;
    // Seed for phrase variation: stable across calls but varies per pair
    const seed = (reference.id * 31 + cand.product.id * 17) % 7919;
    const { role, reason } = cand.sharedKeys.length > 0
      ? reasonForSharedKey(vertical, cand.sharedKeys, refOccasion, cand.product.category, seed)
      : reasonForPriceLadder(vertical, candPrice, refPrice, cand.product.category, seed);

    const score = Math.min(0.9, 0.5 + cand.sharedCount * 0.1);
    picks.push({ target_id: cand.product.id, role, reason, score });
    if (picks.length >= 4) break;
  }

  return picks;
}

async function generateForProduct(
  reference: CatalogProduct,
  candidatesByCategory: Map<string, CatalogProduct[]>,
  storeContext: { name: string; voice?: string },
): Promise<CrossSellSuggestion[]> {
  // Build compact catalog. Cap heavily: small local LLMs (Ollama 7b) take ~10s per 1k input tokens.
  // 4 candidates × N categories × ~25 tokens each + reference + prompt overhead ≈ 800-1500 tokens.
  const compactByCat = new Map<string, string[]>();
  const validIds = new Set<number>();
  for (const [cat, prods] of candidatesByCategory) {
    const sample = prods.filter(p => p.id !== reference.id).slice(0, 4);
    if (sample.length === 0) continue;
    compactByCat.set(cat, sample.map(p => compactProduct(p)));
    for (const p of sample) validIds.add(p.id);
  }
  if (validIds.size === 0) return [];

  const refCompact = compactProduct(reference);
  const prompt = buildPrompt(reference, refCompact, compactByCat, storeContext);

  // Try the LLM first. Generous timeout for local 7b models (~60s typical on a small VPS).
  try {
    const response = await client.complete(
      [{ role: 'user', content: prompt }],
      { maxTokens: 500, temperature: 0.3, timeout: 90_000, maxRetries: 1 },
    );
    const llmPicks = validateLLMResponse(response, reference.id, validIds);
    if (llmPicks.length > 0) return llmPicks;
    logger.warn({ productId: reference.id }, 'cross_sell.gen.llm.empty_fallback');
  } catch (err) {
    logger.warn({ productId: reference.id, err: (err as Error).message }, 'cross_sell.gen.llm.failed_fallback');
  }

  // Algorithmic fallback: never deliver an empty result
  const algoPicks = algorithmicFallback(reference, candidatesByCategory);
  if (algoPicks.length > 0) {
    logger.info({ productId: reference.id, picks: algoPicks.length }, 'cross_sell.gen.algo_used');
  }
  return algoPicks;
}

/** Same as generateForProduct but also reports which engine was used. */
async function generateForProductWithSource(
  reference: CatalogProduct,
  candidatesByCategory: Map<string, CatalogProduct[]>,
  storeContext: { name: string; voice?: string },
): Promise<{ picks: CrossSellSuggestion[]; source: 'llm' | 'rule' }> {
  // Algorithmic-only fast path (default)
  if (!USE_LLM) {
    return { picks: algorithmicFallback(reference, candidatesByCategory), source: 'rule' };
  }

  // LLM path (gated)
  const validIds = new Set<number>();
  const compactByCat = new Map<string, string[]>();
  for (const [cat, prods] of candidatesByCategory) {
    const sample = prods.filter(p => p.id !== reference.id).slice(0, 4);
    if (sample.length === 0) continue;
    compactByCat.set(cat, sample.map(p => compactProduct(p)));
    for (const p of sample) validIds.add(p.id);
  }
  if (validIds.size === 0) return { picks: [], source: 'rule' };

  const refCompact = compactProduct(reference);
  const prompt = buildPrompt(reference, refCompact, compactByCat, storeContext);

  try {
    const response = await client.complete(
      [{ role: 'user', content: prompt }],
      { maxTokens: 500, temperature: 0.3, timeout: 90_000, maxRetries: 1 },
    );
    const llmPicks = validateLLMResponse(response, reference.id, validIds);
    if (llmPicks.length > 0) return { picks: llmPicks, source: 'llm' };
  } catch {
    /* fall through */
  }

  const algoPicks = algorithmicFallback(reference, candidatesByCategory);
  return { picks: algoPicks, source: 'rule' };
}

async function generateForStore(storeId: number): Promise<{ products: number; pairs: number; ms: number }> {
  const t0 = Date.now();
  const prisma = getPrisma();

  const products = await prisma.product.findMany({
    where: { storeId, isActive: true },
    select: { id: true, sku: true, name: true, brand: true, category: true, price: true, specs: true },
  });
  if (products.length === 0) throw new Error('No active products');

  const store = await prisma.store.findUnique({ where: { id: storeId }, select: { name: true, config: true } });
  const cfg = (store?.config as Record<string, unknown>) || {};
  const voiceCfg = cfg['voice'] as Record<string, unknown> | undefined;
  const storeContext = {
    name: store?.name || 'Boutique',
    voice: voiceCfg && typeof voiceCfg['signature'] === 'string' ? `signature : « ${voiceCfg['signature']} »` : undefined,
  };

  // Group by category
  const byCategory = new Map<string, CatalogProduct[]>();
  for (const p of products) {
    const cat = p.category || 'Autre';
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat)!.push(p);
  }

  logger.info({ storeId, productsCount: products.length, categories: byCategory.size }, 'cross_sell.gen.start');

  // Wipe existing
  await prisma.productCrossSell.deleteMany({ where: { storeId } });

  let pairCount = 0;
  let llmCount = 0;
  let algoCount = 0;
  let consecutiveLlmFailures = 0;
  let skipLlm = false; // becomes true after 3 consecutive failures
  let i = 0;
  for (const ref of products) {
    i += 1;
    const { picks, source } = skipLlm
      ? { picks: algorithmicFallback(ref, byCategory), source: 'rule' as const }
      : await generateForProductWithSource(ref, byCategory, storeContext);

    if (!skipLlm) {
      if (source === 'rule') consecutiveLlmFailures += 1;
      else consecutiveLlmFailures = 0;
      if (consecutiveLlmFailures >= 3) {
        skipLlm = true;
        logger.warn({ storeId, processed: i }, 'cross_sell.gen.llm_disabled_after_failures');
      }
    }
    if (picks.length === 0) continue;
    for (const pk of picks) {
      try {
        await prisma.productCrossSell.create({
          data: {
            storeId,
            productId: ref.id,
            targetId: pk.target_id,
            role: pk.role,
            reason: pk.reason,
            score: pk.score,
            source,
          },
        });
        pairCount += 1;
      } catch {
        // Duplicate (already covered by unique constraint); skip silently
      }
    }
    if (source === 'llm') llmCount += 1; else if (source === 'rule') algoCount += 1;
    if (i % 10 === 0) {
      logger.info({ storeId, processed: i, total: products.length, pairs: pairCount, llm: llmCount, algo: algoCount }, 'cross_sell.gen.progress');
    }
  }

  const ms = Date.now() - t0;
  logger.info({ storeId, products: products.length, pairs: pairCount, ms }, 'cross_sell.gen.done');
  return { products: products.length, pairs: pairCount, ms };
}

// ─────────────────────────────────────────────────────────────
// Routes
// ─────────────────────────────────────────────────────────────

const generateSchema = z.object({
  async: z.boolean().optional(), // when true, returns immediately and runs in background
}).strict().or(z.object({}).strict());

// POST /api/catalog/cross-sell/generate
crossSellRouter.post('/generate', async (req: Request, res: Response) => {
  try {
    const storeId = req.storeId!;
    const body = (Object.keys(req.body || {}).length ? generateSchema.parse(req.body) : {}) as { async?: boolean };

    if (body.async) {
      // Fire and forget; client polls /stats
      generateForStore(storeId).catch(err =>
        logger.error({ storeId, err: err.message }, 'cross_sell.gen.background.failed'),
      );
      res.status(202).json({ accepted: true, message: 'Generation running in background' });
      return;
    }

    const result = await generateForStore(storeId);
    res.json({ success: true, ...result });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    logger.error({ err }, 'cross_sell.gen.failed');
    res.status(500).json({ error: (err as Error).message });
  }
});

// DELETE /api/catalog/cross-sell — wipe all
crossSellRouter.delete('/', async (req: Request, res: Response) => {
  try {
    const storeId = req.storeId!;
    const prisma = getPrisma();
    const deleted = await prisma.productCrossSell.deleteMany({ where: { storeId } });
    res.json({ success: true, deleted: deleted.count });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// GET /api/catalog/cross-sell/stats
crossSellRouter.get('/stats', async (req: Request, res: Response) => {
  try {
    const storeId = req.storeId!;
    const prisma = getPrisma();
    const [total, byRole] = await Promise.all([
      prisma.productCrossSell.count({ where: { storeId } }),
      prisma.$queryRawUnsafe<{ role: string; count: bigint }[]>(
        `SELECT role, COUNT(*) AS count FROM product_cross_sells WHERE store_id = $1 GROUP BY role ORDER BY count DESC`,
        storeId,
      ),
    ]);
    res.json({
      total,
      byRole: byRole.map(r => ({ role: r.role, count: Number(r.count) })),
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// GET /api/catalog/products/:id/cross-sell?limit=4
// Mounted under /api/catalog so it sits next to /products/:id endpoints.
crossSellRouter.get('/product/:id', async (req: Request, res: Response) => {
  try {
    const storeId = req.storeId!;
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      res.status(400).json({ error: 'Invalid product id' });
      return;
    }
    const limit = Math.min(Math.max(Number(req.query.limit) || 4, 1), 12);
    const prisma = getPrisma();

    const reference = await prisma.product.findFirst({ where: { id, storeId } });
    if (!reference) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    // Load merchant rules from store config — applied at runtime, no precompute needed
    const storeRow = await prisma.store.findUnique({
      where: { id: storeId }, select: { config: true },
    });
    const rules = (storeRow?.config as Record<string, unknown> | null)?.cross_sell_rules as CrossSellRuleSet | undefined;

    // Fetch a larger window than `limit` so we have room after exclude/dedupe
    const rows = await prisma.$queryRawUnsafe<{
      target_id: number; role: string; reason: string; score: string;
      name: string; brand: string | null; category: string | null; sku: string; price: string;
      image_url: string | null; description: string | null; specs: unknown;
    }[]>(
      `SELECT cs.target_id, cs.role, cs.reason, cs.score::text AS score,
              p.name, p.brand, p.category, p.sku, p.price::text AS price, p.image_url, p.description, p.specs
       FROM product_cross_sells cs
       JOIN products p ON p.id = cs.target_id AND p.is_active = true
       WHERE cs.store_id = $1 AND cs.product_id = $2
       ORDER BY cs.score DESC
       LIMIT $3`,
      storeId, id, Math.max(limit * 2, 12),
    );

    // Apply merchant rules: exclude blocked pairs, rewrite reasons, force-inject
    const refSku = reference.sku;
    const refCategory = reference.category;
    let items = rows.map(r => ({
      target_id: r.target_id,
      target_sku: r.sku,
      target_category: r.category,
      role: r.role as CrossSellRole,
      reason: r.reason,
      score: Number(r.score),
      product: {
        id: r.target_id, sku: r.sku, name: r.name, brand: r.brand,
        category: r.category, price: r.price, imageUrl: r.image_url,
        description: r.description, specs: r.specs,
      },
    }));

    if (rules) {
      // Exclude
      if (Array.isArray(rules.exclude)) {
        const blockedTargetSkus = new Set(
          rules.exclude.filter(r => r.from_sku === refSku && r.to_sku).map(r => r.to_sku as string),
        );
        if (blockedTargetSkus.size > 0) {
          items = items.filter(i => !blockedTargetSkus.has(i.target_sku));
        }
      }
      // Reason overrides — keyed "refSku→targetSku"
      if (rules.reason_overrides && typeof rules.reason_overrides === 'object') {
        items = items.map(i => {
          const key = `${refSku}→${i.target_sku}`;
          const override = rules.reason_overrides![key];
          return override ? { ...i, reason: override } : i;
        });
      }
      // Force injections — prepend if not already in the list
      if (Array.isArray(rules.force)) {
        const existingTargetIds = new Set(items.map(i => i.target_id));
        for (const f of rules.force) {
          const matchesRef =
            (f.from_sku && f.from_sku === refSku) ||
            (f.from_category && f.from_category === refCategory);
          if (!matchesRef) continue;
          // Resolve target: prefer to_sku, then any product in to_category
          let target: typeof items[0] | null = null;
          if (f.to_sku) {
            const found = await prisma.product.findFirst({
              where: { storeId, sku: f.to_sku, isActive: true },
            });
            if (found && !existingTargetIds.has(found.id)) {
              target = {
                target_id: found.id, target_sku: found.sku,
                target_category: found.category,
                role: (f.role as CrossSellRole) || 'complement',
                reason: f.reason || 'Recommandé par la boutique',
                score: 0.95,
                product: {
                  id: found.id, sku: found.sku, name: found.name, brand: found.brand,
                  category: found.category, price: String(found.price),
                  imageUrl: found.imageUrl, description: found.description,
                  specs: found.specs,
                },
              };
            }
          }
          if (target) {
            items.unshift(target);
            existingTargetIds.add(target.target_id);
          }
        }
      }
    }

    res.json({
      reference: {
        id: reference.id, sku: reference.sku, name: reference.name,
        brand: reference.brand, category: reference.category, price: reference.price,
      },
      items: items.slice(0, limit).map(i => ({
        product: i.product,
        role: i.role,
        reason: i.reason,
        score: i.score,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ─────────────────────────────────────────────────────────────
// Analytics — event ingestion + aggregated metrics
// ─────────────────────────────────────────────────────────────

/** POST /api/catalog/cross-sell/events
 *  Ingests one or a batch of events from the SDK. Returns 204 on success.
 *  Accepts: { events: [{...}] } or { ...singleEvent } for backwards compat. */
crossSellRouter.post('/events', async (req: Request, res: Response) => {
  try {
    const storeId = req.storeId!;
    const body = Array.isArray(req.body?.events)
      ? batchEventsSchema.parse(req.body)
      : batchEventsSchema.parse({ events: [eventSchema.parse(req.body)] });

    const prisma = getPrisma();
    await prisma.crossSellEvent.createMany({
      data: body.events.map((e) => ({
        storeId,
        productId: e.product_id,
        targetId: e.target_id,
        role: e.role,
        eventType: e.event_type,
        sessionId: e.session_id,
        position: e.position ?? null,
        metadata: (e.metadata as object) ?? undefined,
      })),
      skipDuplicates: false,
    });

    res.status(204).end();
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    res.status(500).json({ error: (err as Error).message });
  }
});

/** GET /api/catalog/cross-sell/analytics
 *  Aggregated metrics over a time window (default 30 days).
 *  Returns: funnel (impressions → clicks → adds), top pairs by add-rate,
 *  role distribution, time-series. */
crossSellRouter.get('/analytics', async (req: Request, res: Response) => {
  try {
    const storeId = req.storeId!;
    const days = Math.min(Math.max(Number(req.query.days) || 30, 1), 365);
    const prisma = getPrisma();

    const since = new Date(Date.now() - days * 86_400_000);

    type Row = { event_type: string; count: bigint };
    type PairRow = {
      product_id: number; target_id: number; role: string;
      ref_name: string | null; target_name: string | null;
      impressions: bigint; clicks: bigint; adds: bigint;
    };
    type RoleRow = { role: string; impressions: bigint; clicks: bigint; adds: bigint };
    type DayRow = { day: string; impressions: bigint; clicks: bigint; adds: bigint };

    const [funnel, topPairs, byRole, byDay, attributedRevenue] = await Promise.all([
      prisma.$queryRawUnsafe<Row[]>(
        `SELECT event_type, COUNT(*) AS count FROM cross_sell_events
         WHERE store_id = $1 AND created_at >= $2 GROUP BY event_type`,
        storeId, since,
      ),
      prisma.$queryRawUnsafe<PairRow[]>(
        `SELECT e.product_id, e.target_id, e.role,
                pr.name AS ref_name, tg.name AS target_name,
                COUNT(*) FILTER (WHERE e.event_type = 'impression') AS impressions,
                COUNT(*) FILTER (WHERE e.event_type = 'click')      AS clicks,
                COUNT(*) FILTER (WHERE e.event_type = 'add')        AS adds
         FROM cross_sell_events e
         LEFT JOIN products pr ON pr.id = e.product_id
         LEFT JOIN products tg ON tg.id = e.target_id
         WHERE e.store_id = $1 AND e.created_at >= $2
         GROUP BY e.product_id, e.target_id, e.role, pr.name, tg.name
         HAVING COUNT(*) FILTER (WHERE e.event_type = 'impression') > 0
         ORDER BY (COUNT(*) FILTER (WHERE e.event_type = 'add'))::float
                  / NULLIF(COUNT(*) FILTER (WHERE e.event_type = 'impression'), 0) DESC NULLS LAST,
                  impressions DESC
         LIMIT 15`,
        storeId, since,
      ),
      prisma.$queryRawUnsafe<RoleRow[]>(
        `SELECT role,
                COUNT(*) FILTER (WHERE event_type = 'impression') AS impressions,
                COUNT(*) FILTER (WHERE event_type = 'click')      AS clicks,
                COUNT(*) FILTER (WHERE event_type = 'add')        AS adds
         FROM cross_sell_events
         WHERE store_id = $1 AND created_at >= $2
         GROUP BY role
         ORDER BY impressions DESC`,
        storeId, since,
      ),
      prisma.$queryRawUnsafe<DayRow[]>(
        `SELECT to_char(created_at, 'YYYY-MM-DD') AS day,
                COUNT(*) FILTER (WHERE event_type = 'impression') AS impressions,
                COUNT(*) FILTER (WHERE event_type = 'click')      AS clicks,
                COUNT(*) FILTER (WHERE event_type = 'add')        AS adds
         FROM cross_sell_events
         WHERE store_id = $1 AND created_at >= $2
         GROUP BY day ORDER BY day`,
        storeId, since,
      ),
      // Attributed revenue = sum of (target product price) for every 'purchase'
      // event in the window. The SDK only fires `purchase` for products that
      // originated from a cross-sell click within 30 minutes, so this is a
      // tight (under-counted, never inflated) view of incremental revenue.
      prisma.$queryRawUnsafe<{ revenue: string | null; events: bigint }[]>(
        `SELECT COALESCE(SUM(p.price), 0)::text AS revenue,
                COUNT(*) AS events
         FROM cross_sell_events e
         JOIN products p ON p.id = e.target_id
         WHERE e.store_id = $1 AND e.created_at >= $2 AND e.event_type = 'purchase'`,
        storeId, since,
      ),
    ]);

    const funnelMap = Object.fromEntries(funnel.map(f => [f.event_type, Number(f.count)]));
    const impressions = funnelMap.impression || 0;
    const clicks = funnelMap.click || 0;
    const adds = funnelMap.add || 0;
    const viewTargets = funnelMap.view_target || 0;
    const purchases = funnelMap.purchase || 0;
    const attributedRev = Number(attributedRevenue[0]?.revenue || 0);

    res.json({
      windowDays: days,
      since: since.toISOString(),
      funnel: {
        impressions,
        clicks,
        adds,
        viewTargets,
        purchases,
        clickRate: impressions > 0 ? Math.round((clicks / impressions) * 10000) / 100 : 0,
        addRate: impressions > 0 ? Math.round((adds / impressions) * 10000) / 100 : 0,
        viewThroughRate: clicks > 0 ? Math.round((viewTargets / clicks) * 10000) / 100 : 0,
        purchaseRate: clicks > 0 ? Math.round((purchases / clicks) * 10000) / 100 : 0,
      },
      attributedRevenue: {
        totalEur: Math.round(attributedRev * 100) / 100,
        events: Number(attributedRevenue[0]?.events || 0),
      },
      topPairs: topPairs.map(p => ({
        productId: p.product_id,
        targetId: p.target_id,
        refName: p.ref_name,
        targetName: p.target_name,
        role: p.role,
        impressions: Number(p.impressions),
        clicks: Number(p.clicks),
        adds: Number(p.adds),
        addRate: Number(p.impressions) > 0 ? Math.round((Number(p.adds) / Number(p.impressions)) * 10000) / 100 : 0,
      })),
      byRole: byRole.map(r => ({
        role: r.role,
        impressions: Number(r.impressions),
        clicks: Number(r.clicks),
        adds: Number(r.adds),
        addRate: Number(r.impressions) > 0 ? Math.round((Number(r.adds) / Number(r.impressions)) * 10000) / 100 : 0,
      })),
      byDay: byDay.map(d => ({
        day: d.day,
        impressions: Number(d.impressions),
        clicks: Number(d.clicks),
        adds: Number(d.adds),
      })),
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});
