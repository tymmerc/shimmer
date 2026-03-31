/**
 * Universe Auto-Generation — Analyzes a store's product catalog
 * and generates qualification universes, criteria, and deduction rules.
 *
 * POST /api/universe/generate — Trigger auto-generation for current store
 * GET  /api/universe          — List active universes for current store
 */

import { Router, type Request, type Response } from 'express';
import { getPrisma, ClaudeClient, logger } from '@shimmer/core';

export const universeGenRouter = Router();
const client = new ClaudeClient();

// ── Types ────────────────────────────────────────────────────

interface GeneratedUniverse {
  universe_id: string;
  label: string;
  keywords: string[];
  criteria: {
    criterion_id: string;
    label: string;
    weight: number;
    required: boolean;
    type: 'closed' | 'open' | 'deduced';
    values?: string[];
    question?: string;
    fallback?: string;
  }[];
  deductions: {
    patterns: string[];
    criterion_id: string;
    value: string;
  }[];
}

// ── Step 1: Analyze catalog ────────────────────────────────

async function analyzeCatalog(storeId: number) {
  const prisma = getPrisma();

  const products = await prisma.product.findMany({
    where: { storeId, isActive: true },
    select: {
      id: true,
      name: true,
      category: true,
      brand: true,
      price: true,
      description: true,
      specs: true,
    },
  });

  if (products.length === 0) {
    throw new Error('No active products found for this store');
  }

  // Group by category
  const categories = new Map<string, typeof products>();
  for (const p of products) {
    const cat = p.category || 'Autre';
    const existing = categories.get(cat) || [];
    existing.push(p);
    categories.set(cat, existing);
  }

  // For each category, find the varying spec keys
  const categoryAnalysis: {
    category: string;
    count: number;
    brands: string[];
    priceRange: { min: number; max: number };
    specKeys: { key: string; values: string[]; variance: number }[];
    sampleProducts: string[];
  }[] = [];

  for (const [cat, prods] of categories) {
    const brands = [...new Set(prods.map(p => p.brand).filter(Boolean))] as string[];
    const prices = prods.map(p => Number(p.price));

    // Analyze specs variance
    const specMap = new Map<string, Set<string>>();
    for (const p of prods) {
      const specs = p.specs as Record<string, unknown> | null;
      if (!specs) continue;
      for (const [k, v] of Object.entries(specs)) {
        if (!specMap.has(k)) specMap.set(k, new Set());
        specMap.get(k)!.add(String(v));
      }
    }

    const specKeys = [...specMap.entries()]
      .map(([key, values]) => ({
        key,
        values: [...values].slice(0, 8),
        variance: values.size / prods.length, // 0-1, higher = more differentiating
      }))
      .filter(s => s.variance > 0.1 && s.values.length > 1) // Skip uniform specs
      .sort((a, b) => b.variance - a.variance)
      .slice(0, 10);

    categoryAnalysis.push({
      category: cat,
      count: prods.length,
      brands,
      priceRange: { min: Math.min(...prices), max: Math.max(...prices) },
      specKeys,
      sampleProducts: prods.slice(0, 5).map(p => `${p.name} (${p.brand}) ${p.price}€`),
      allProductNames: prods.map(p => p.name),
    });
  }

  return { products, categoryAnalysis, totalProducts: products.length };
}

// ── Step 2: Build universes programmatically + LLM for questions ────

function toId(str: string): string {
  return str.toUpperCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

function generateKeywords(
  category: string,
  brands: string[],
  specKeys: string[],
  productNames: string[],
): string[] {
  const kw = new Set<string>();
  const stopWords = new Set(['pour', 'avec', 'sans', 'plus', 'dans', 'chez', 'très', 'tout', 'bien']);

  // Category name + common variations
  const cat = category.toLowerCase();
  kw.add(cat);
  cat.split(/[\s-]+/).forEach(w => { if (w.length > 2) kw.add(w); });

  // Brands
  brands.forEach(b => kw.add(b.toLowerCase()));

  // Product name words — THE KEY for matching "aspirateur", "perceuse", etc.
  for (const name of productNames) {
    const words = name.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .split(/[\s\-\/|,()]+/);
    for (const w of words) {
      if (w.length > 3 && !stopWords.has(w) && !/^\d+$/.test(w)) {
        kw.add(w);
      }
    }
  }

  // Spec keys as keywords
  specKeys.forEach(k => {
    const clean = k.toLowerCase().replace(/_/g, ' ');
    kw.add(clean);
    clean.split(/\s+/).forEach(w => { if (w.length > 3) kw.add(w); });
  });

  return [...kw];
}

function buildCriteriaFromSpecs(
  specKeys: { key: string; values: string[]; variance: number }[],
): GeneratedUniverse['criteria'] {
  const criteria: GeneratedUniverse['criteria'] = [];
  let weightLeft = 85; // Reserve 15 for budget

  // Sort by variance (most differentiating first)
  const sorted = [...specKeys].sort((a, b) => b.variance - a.variance).slice(0, 5);

  for (let i = 0; i < sorted.length; i++) {
    const s = sorted[i]!;
    const weight = i === 0 ? Math.min(30, weightLeft) : Math.min(20, Math.floor(weightLeft / (sorted.length - i)));
    weightLeft -= weight;

    const id = toId(s.key);
    criteria.push({
      criterion_id: id,
      label: s.key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      weight,
      required: i === 0,
      type: s.values.length <= 8 ? 'closed' : 'open',
      values: s.values.length <= 8 ? s.values : undefined,
      question: `Quel ${s.key.replace(/_/g, ' ')} vous intéresse ?`,
      fallback: s.values[0] || '',
    });
  }

  // Always add budget
  criteria.push({
    criterion_id: 'BUDGET',
    label: 'Budget',
    weight: 15,
    required: false,
    type: 'open',
    question: 'Vous avez un budget en tête ?',
    fallback: 'flexible',
  });

  return criteria;
}

function buildDeductionsFromSpecs(
  specKeys: { key: string; values: string[] }[],
): GeneratedUniverse['deductions'] {
  const deductions: GeneratedUniverse['deductions'] = [];

  for (const s of specKeys.slice(0, 5)) {
    for (const val of s.values.slice(0, 4)) {
      const patterns = [val.toLowerCase()];
      // Add common abbreviations/synonyms
      if (val.toLowerCase().includes('sans fil')) patterns.push('batterie', 'portable', 'cordless');
      if (val.toLowerCase().includes('filaire')) patterns.push('secteur', 'cable');

      deductions.push({
        patterns,
        criterion_id: toId(s.key),
        value: val,
      });
    }
  }

  return deductions;
}

async function enrichWithLLM(
  universe: GeneratedUniverse,
  category: string,
  brands: string[],
): Promise<GeneratedUniverse> {
  // Ask LLM to generate better keywords and deductions
  const prompt = `Pour un vendeur IA dans la catégorie "${category}" (marques: ${brands.slice(0, 4).join(', ')}), donne-moi en JSON:
{"extra_keywords":["15 mots-clés du quotidien que les clients utilisent, synonymes, argot, fautes courantes"],"extra_deductions":[{"patterns":["mot client"],"criterion":"${universe.criteria[0]?.criterion_id || 'USAGE'}","value":"valeur déduite"}]}
Réponds UNIQUEMENT en JSON.`;

  try {
    const response = await client.complete(
      [{ role: 'user', content: prompt }],
      { maxTokens: 800, temperature: 0.3, timeout: 120_000, maxRetries: 1 },
    );

    const match = response.match(/\{[\s\S]*\}/);
    if (match) {
      const enrichment = JSON.parse(match[0].replace(/,\s*}/g, '}').replace(/,\s*]/g, ']'));

      if (Array.isArray(enrichment.extra_keywords)) {
        const allKw = [...universe.keywords, ...enrichment.extra_keywords.map((k: string) => k.toLowerCase())];
        // Also add individual words from multi-word keywords (e.g. "aspirateur robotique" → "aspirateur")
        const extraWords: string[] = [];
        for (const kw of allKw) {
          if (kw.includes(' ')) {
            for (const w of kw.split(/\s+/)) {
              if (w.length > 3) extraWords.push(w);
            }
          }
        }
        universe.keywords = [...new Set([...allKw, ...extraWords])];
      }
      if (Array.isArray(enrichment.extra_deductions)) {
        for (const d of enrichment.extra_deductions) {
          if (d.patterns && d.criterion && d.value) {
            universe.deductions.push({
              patterns: d.patterns,
              criterion_id: d.criterion,
              value: d.value,
            });
          }
        }
      }
      logger.info({ category, extraKw: enrichment.extra_keywords?.length, extraDed: enrichment.extra_deductions?.length }, 'universe.gen.enriched');
    }
  } catch (err) {
    logger.warn({ category, err: (err as Error).message }, 'universe.gen.enrich.failed');
    // Non-critical — universe works without enrichment
  }

  return universe;
}

async function generateUniverses(
  analysis: Awaited<ReturnType<typeof analyzeCatalog>>,
): Promise<GeneratedUniverse[]> {
  const results: GeneratedUniverse[] = [];

  for (const cat of analysis.categoryAnalysis) {
    logger.info({ category: cat.category }, 'universe.gen.category.start');

    try {
      // Step 2a: Build universe structure from specs (no LLM needed)
      const universeId = toId(cat.category);
      const keywords = generateKeywords(cat.category, cat.brands, cat.specKeys.map(s => s.key), cat.allProductNames);
      const criteria = buildCriteriaFromSpecs(cat.specKeys);
      const deductions = buildDeductionsFromSpecs(cat.specKeys);

      let universe: GeneratedUniverse = {
        universe_id: universeId,
        label: cat.category,
        keywords,
        criteria,
        deductions,
      };

      // Step 2b: Enrich with LLM (extra keywords + deductions)
      universe = await enrichWithLLM(universe, cat.category, cat.brands);

      results.push(universe);
      logger.info({
        category: cat.category,
        id: universe.universe_id,
        keywordsCount: universe.keywords.length,
        criteriaCount: universe.criteria.length,
        deductionCount: universe.deductions.length,
      }, 'universe.gen.category.done');
    } catch (err) {
      logger.error({ category: cat.category, err: (err as Error).message }, 'universe.gen.category.failed');
    }
  }

  if (results.length === 0) {
    throw new Error('Failed to generate any universe');
  }

  return results;
}

// ── Step 3: Save to DB ─────────────────────────────────────

async function saveUniverses(storeId: number, universes: GeneratedUniverse[]) {
  const prisma = getPrisma();
  const saved: { universe_id: string; criteria_count: number; deductions_count: number }[] = [];

  for (const u of universes) {
    // Upsert universe
    const [existing] = await prisma.$queryRawUnsafe<{ id: number }[]>(
      `SELECT id FROM store_universes WHERE store_id = $1 AND universe_id = $2`,
      storeId, u.universe_id,
    );

    let universeDbId: number;

    if (existing) {
      await prisma.$executeRawUnsafe(
        `UPDATE store_universes SET label = $1, keywords = $2, is_active = true, generated_by = 'auto', updated_at = NOW() WHERE id = $3`,
        u.label, u.keywords, existing.id,
      );
      universeDbId = existing.id;

      // Clear old criteria and deductions
      await prisma.$executeRawUnsafe(`DELETE FROM universe_deductions WHERE universe_id = $1`, universeDbId);
      await prisma.$executeRawUnsafe(`DELETE FROM universe_criteria WHERE universe_id = $1`, universeDbId);
    } else {
      const [inserted] = await prisma.$queryRawUnsafe<{ id: number }[]>(
        `INSERT INTO store_universes (store_id, universe_id, label, keywords, generated_by) VALUES ($1, $2, $3, $4, 'auto') RETURNING id`,
        storeId, u.universe_id, u.label, u.keywords,
      );
      universeDbId = inserted!.id;
    }

    // Insert criteria
    for (let i = 0; i < u.criteria.length; i++) {
      const c = u.criteria[i]!;
      await prisma.$executeRawUnsafe(
        `INSERT INTO universe_criteria (universe_id, criterion_id, label, weight, required, criterion_type, possible_values, question, fallback, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        universeDbId,
        c.criterion_id,
        c.label,
        c.weight,
        c.required || false,
        c.type || 'closed',
        c.values || null,
        c.question || null,
        c.fallback || null,
        i,
      );
    }

    // Insert deductions
    for (const d of u.deductions) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO universe_deductions (universe_id, patterns, criterion_id, deduced_value) VALUES ($1, $2, $3, $4)`,
        universeDbId, d.patterns, d.criterion_id, d.value,
      );
    }

    saved.push({
      universe_id: u.universe_id,
      criteria_count: u.criteria.length,
      deductions_count: u.deductions.length,
    });
  }

  return saved;
}

// ── Step 4: Load universes from DB (used by search-assist) ──

export async function loadStoreUniverses(storeId: number) {
  const prisma = getPrisma();

  const universes = await prisma.$queryRawUnsafe<{
    id: number;
    universe_id: string;
    label: string;
    keywords: string[];
    score_profile: { usage: number; criteria: number; history: number };
  }[]>(
    `SELECT id, universe_id, label, keywords, score_profile FROM store_universes WHERE store_id = $1 AND is_active = true`,
    storeId,
  );

  const result = [];

  // Prisma $queryRawUnsafe may return text[] as string "{a,b,c}" — normalize
  function ensureArray(val: unknown): string[] {
    if (Array.isArray(val)) return val;
    if (typeof val === 'string' && val.startsWith('{')) {
      return val.slice(1, -1).split(',').map(s => s.replace(/^"|"$/g, '').trim()).filter(Boolean);
    }
    return [];
  }

  for (const u of universes) {
    const criteria = await prisma.$queryRawUnsafe<{
      criterion_id: string;
      label: string;
      weight: number;
      required: boolean;
      criterion_type: string;
      possible_values: string[] | null;
      question: string | null;
      fallback: string | null;
    }[]>(
      `SELECT criterion_id, label, weight, required, criterion_type, possible_values, question, fallback FROM universe_criteria WHERE universe_id = $1 ORDER BY sort_order`,
      u.id,
    );

    const deductions = await prisma.$queryRawUnsafe<{
      patterns: string[];
      criterion_id: string;
      deduced_value: string;
    }[]>(
      `SELECT patterns, criterion_id, deduced_value FROM universe_deductions WHERE universe_id = $1`,
      u.id,
    );

    result.push({
      id: u.universe_id,
      label: u.label,
      keywords: ensureArray(u.keywords),
      scoreProfile: u.score_profile,
      criteria: criteria.map(c => ({
        id: c.criterion_id,
        label: c.label,
        weight: c.weight,
        required: c.required,
        type: c.criterion_type as 'closed' | 'open' | 'deduced',
        values: c.possible_values ? ensureArray(c.possible_values) : undefined,
        question: c.question || '',
        fallback: c.fallback || '',
      })),
      deductions: deductions.map(d => ({
        patterns: ensureArray(d.patterns),
        criterion: d.criterion_id,
        value: d.deduced_value,
      })),
    });
  }

  return result;
}

// ── Routes ──────────────────────────────────────────────────

// POST /api/universe/generate — trigger auto-generation
universeGenRouter.post('/generate', async (req: Request, res: Response) => {
  try {
    const storeId = req.storeId!;
    const t0 = Date.now();

    logger.info({ storeId }, 'universe.gen.start');

    // Step 1: Analyze catalog
    const analysis = await analyzeCatalog(storeId);
    logger.info({
      storeId,
      totalProducts: analysis.totalProducts,
      categories: analysis.categoryAnalysis.map(c => c.category),
    }, 'universe.gen.analyzed');

    // Step 2: Generate via LLM
    const universes = await generateUniverses(analysis);
    logger.info({
      storeId,
      universesGenerated: universes.length,
      ids: universes.map(u => u.universe_id),
    }, 'universe.gen.llm_done');

    // Step 3: Save to DB
    const saved = await saveUniverses(storeId, universes);

    const totalMs = Date.now() - t0;
    logger.info({ storeId, totalMs, saved }, 'universe.gen.complete');

    res.json({
      success: true,
      universes: saved,
      analysis: {
        totalProducts: analysis.totalProducts,
        categories: analysis.categoryAnalysis.map(c => ({
          name: c.category,
          count: c.count,
          priceRange: c.priceRange,
          brands: c.brands,
          differentiatingSpecs: c.specKeys.map(s => s.key),
        })),
      },
      totalMs,
    });
  } catch (err) {
    logger.error({ err }, 'universe.gen.failed');
    res.status(500).json({ error: (err as Error).message });
  }
});

// GET /api/universe — list active universes
universeGenRouter.get('/', async (req: Request, res: Response) => {
  try {
    const universes = await loadStoreUniverses(req.storeId!);
    res.json({ universes });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});
