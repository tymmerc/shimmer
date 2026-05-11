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

// Uses whatever LLM is configured globally (Claude in prod with key,
// Ollama in dev). If LLM fails or is misconfigured, the algo fallback
// ensures we never deliver an empty result to the merchant.
const client = new ClaudeClient();

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

function reasonForSharedKey(vertical: StoreVertical, sharedKeys: string[], refOccasion: string): RoleReason {
  if (sharedKeys.includes('occasion')) {
    if (refOccasion.includes('apero') || refOccasion.includes('apéro')) {
      if (vertical === 'drinks') return { role: 'apero', reason: "Pour l'apéro, ils vont bien ensemble" };
    }
    if (refOccasion.includes('cadeau')) return { role: 'cadeau', reason: 'À offrir en duo' };
    if (refOccasion.includes('dessert') && vertical === 'drinks') return { role: 'dessert', reason: 'Pour finir le repas' };
    return { role: 'complement', reason: 'Pour la même occasion' };
  }
  if (sharedKeys.includes('accord') && vertical === 'drinks') return { role: 'repas', reason: 'Va aussi très bien avec ce plat' };
  if (sharedKeys.includes('piece')) return { role: 'complement', reason: 'Pour la même pièce' };
  if (sharedKeys.includes('style')) return { role: 'decouverte', reason: 'Même style, autre catégorie' };
  return { role: 'complement', reason: 'Complète bien ce produit' };
}

function reasonForPriceLadder(vertical: StoreVertical, candPrice: number, refPrice: number): RoleReason {
  if (candPrice > refPrice * 1.8) return { role: 'cadeau', reason: 'Pour les grandes occasions' };
  if (candPrice < refPrice * 0.6) return { role: 'decouverte', reason: 'Plus accessible, pour découvrir' };
  if (vertical === 'drinks') return { role: 'complement', reason: 'Va bien avec celui-ci' };
  if (vertical === 'lighting') return { role: 'complement', reason: 'Une autre pièce assortie' };
  if (vertical === 'fashion') return { role: 'complement', reason: 'Pour compléter la tenue' };
  return { role: 'complement', reason: 'Un complément possible' };
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
    const { role, reason } = cand.sharedKeys.length > 0
      ? reasonForSharedKey(vertical, cand.sharedKeys, refOccasion)
      : reasonForPriceLadder(vertical, candPrice, refPrice);

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
  // Build compact catalog (skip the reference category if dominant, sample 4-6 per category)
  const compactByCat = new Map<string, string[]>();
  const validIds = new Set<number>();
  for (const [cat, prods] of candidatesByCategory) {
    const sample = prods.filter(p => p.id !== reference.id).slice(0, 8);
    if (sample.length === 0) continue;
    compactByCat.set(cat, sample.map(p => compactProduct(p)));
    for (const p of sample) validIds.add(p.id);
  }
  if (validIds.size === 0) return [];

  const refCompact = compactProduct(reference);
  const prompt = buildPrompt(reference, refCompact, compactByCat, storeContext);

  // Try the LLM first
  try {
    const response = await client.complete(
      [{ role: 'user', content: prompt }],
      { maxTokens: 700, temperature: 0.3, timeout: 45_000, maxRetries: 1 },
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
  // Build catalog & validate
  const validIds = new Set<number>();
  const compactByCat = new Map<string, string[]>();
  for (const [cat, prods] of candidatesByCategory) {
    const sample = prods.filter(p => p.id !== reference.id).slice(0, 8);
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
      { maxTokens: 700, temperature: 0.3, timeout: 45_000, maxRetries: 1 },
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
      storeId, id, limit,
    );

    res.json({
      reference: {
        id: reference.id, sku: reference.sku, name: reference.name,
        brand: reference.brand, category: reference.category, price: reference.price,
      },
      items: rows.map(r => ({
        product: {
          id: r.target_id, sku: r.sku, name: r.name, brand: r.brand,
          category: r.category, price: r.price, imageUrl: r.image_url,
          description: r.description, specs: r.specs,
        },
        role: r.role,
        reason: r.reason,
        score: Number(r.score),
      })),
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});
