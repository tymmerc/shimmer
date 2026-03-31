/**
 * Hybrid Search Orchestrator — 3-stage pipeline with RRF merge.
 *
 * Stage 1: BM25 keyword search (<10ms)
 * Stage 2: Semantic embedding search (<100ms)
 * Stage 3: Claude reformulation (when stages 1+2 insufficient)
 *
 * Target: <500ms total for full pipeline.
 */

import { getPrisma, ClaudeClient, logger } from '@shimmer/core';
import type {
  SearchQuery,
  SearchResult,
  ScoredProduct,
  Product,
  ConversationContext,
  UniverseConfig,
} from '@shimmer/core';
import { BM25Index } from './bm25.js';
import { embed } from './embeddings.js';
import { VectorIndex, computeChecksum } from './vector-index.js';
import { detectSearchType, fuzzyScore } from './search-types.js';
import { matchUsages } from './taxonomy.js';
import { detectBudget } from './budget.js';
import { scoreProducts } from './scoring.js';
import { applyDeductions } from './qualification.js';
import { findSimilar } from './similarity.js';
import { ConversationStateMachine, detectSignal } from './state-machine.js';
import { randomUUID } from 'node:crypto';

// Minimum score thresholds to proceed to next stage
const STAGE1_MIN_SCORE = 3.0;  // BM25 score threshold
const STAGE1_MIN_RESULTS = 3;
const STAGE2_MIN_RESULTS = 3;
const RRF_K = 60; // RRF constant

let bm25Index: BM25Index | null = null;
let vectorIndex: VectorIndex | null = null;
let indexReady = false;

/**
 * Initialize indexes — called at API startup.
 */
export async function initializeIndexes(): Promise<void> {
  const prisma = getPrisma();
  const products = await prisma.product.findMany({
    where: { isActive: true },
    select: { id: true, name: true, description: true, category: true, brand: true, updatedAt: true },
  });

  if (products.length === 0) {
    logger.warn('No active products found — indexes empty');
    indexReady = true;
    return;
  }

  const checksum = computeChecksum(products.map((p) => ({ id: p.id, updatedAt: p.updatedAt })));

  // Try loading from disk
  vectorIndex = new VectorIndex();
  const vectorLoaded = vectorIndex.load(checksum);

  bm25Index = new BM25Index();
  // BM25 always rebuilds (fast enough)
  bm25Index.build(
    products.map((p) => ({
      id: p.id,
      text: `${p.name} ${p.description || ''} ${p.category || ''} ${p.brand || ''}`,
    })),
  );
  logger.info({ count: bm25Index.size }, 'bm25.index.built');

  if (!vectorLoaded) {
    // Build vector index
    logger.info('Building vector index from embeddings...');
    const texts = products.map(
      (p) => `${p.name} ${p.description || ''} ${p.category || ''} ${p.brand || ''}`,
    );

    try {
      const embeddings = await embed(texts, 'passage: ');
      const items = products.map((p, i) => ({
        id: p.id,
        embedding: embeddings[i]!,
      }));
      vectorIndex.build(items);
      vectorIndex.save(checksum);
    } catch (err) {
      logger.error({ err }, 'vector.index.build.failed — will use BM25 only');
    }
  }

  indexReady = true;
  logger.info('Indexes ready');
}

/**
 * Main search entry point.
 */
export async function search(query: SearchQuery): Promise<SearchResult> {
  const startMs = Date.now();

  if (!indexReady) {
    throw new Error('Search indexes not yet initialized');
  }

  const prisma = getPrisma();
  const sessionToken = query.sessionToken || randomUUID();

  // Detect search type if not specified
  const searchType = query.searchType || detectSearchType(query.query);

  // Detect budget
  const budget = detectBudget(query.query);

  // Detect usages
  const usageMatches = await matchUsages(query.query);
  const detectedUsages = usageMatches.map((m) => m.entry.code);

  // Build conversation context
  const context: ConversationContext = {
    searchType,
    detectedUsages,
    budget,
    criteria: {},
    recommendedProducts: [],
    previousStates: [],
    turnCount: 0,
  };

  // Apply deduction rules
  const deductions = applyDeductions(query.query, context);
  context.criteria = deductions;

  // Handle similarity search separately
  if (searchType === 'SIMILARITY') {
    return handleSimilaritySearch(query, context, sessionToken, startMs);
  }

  // === 3-Stage Pipeline ===
  let results: ScoredProduct[] = [];
  let stageUsed: 1 | 2 | 3 = 1;

  // Stage 1: BM25
  const bm25Results = stage1BM25(query.query);

  if (bm25Results.length >= STAGE1_MIN_RESULTS && bm25Results[0]!.score >= STAGE1_MIN_SCORE) {
    // Good BM25 results — fetch full products and score
    results = await fetchAndScore(bm25Results.map((r) => r.id), context, query);
    stageUsed = 1;
  } else {
    // Stage 2: Semantic search
    const vectorResults = await stage2Vector(query.query);

    if (vectorResults.length >= STAGE2_MIN_RESULTS) {
      // Merge BM25 + vector with RRF
      const merged = rrfMerge(bm25Results, vectorResults);
      results = await fetchAndScore(merged, context, query);
      stageUsed = 2;
    } else {
      // Stage 3: Claude reformulation
      const reformulated = await stage3Claude(query.query, detectedUsages);
      if (reformulated) {
        const bm25Retry = stage1BM25(reformulated);
        const vectorRetry = await stage2Vector(reformulated);
        const merged = rrfMerge(bm25Retry, vectorRetry);
        results = await fetchAndScore(merged, context, query);
      }
      stageUsed = 3;
    }
  }

  // Apply filters
  if (query.filters) {
    results = applyFilters(results, query.filters);
  }

  const totalMs = Date.now() - startMs;

  // Persist search session
  const session = await prisma.searchSession.create({
    data: {
      storeId: query.storeId,
      sessionToken,
      query: query.query,
      searchType,
      stageUsed,
      mappedUsages: detectedUsages,
      results: results.slice(0, 10) as any,
      messages: [],
    },
  });

  logger.info({
    sessionToken,
    searchType,
    stageUsed,
    resultCount: results.length,
    totalMs,
  }, 'search.complete');

  return {
    products: results.slice(0, 20),
    searchType,
    stageUsed,
    sessionToken,
    totalMs,
  };
}

// ── Stage 1: BM25 ──────────────────────────────────────────────

function stage1BM25(query: string): { id: number; score: number }[] {
  if (!bm25Index) return [];

  // Also try fuzzy matching on individual terms
  const hits = bm25Index.search(query, 30);
  return hits;
}

// ── Stage 2: Vector Search ──────────────────────────────────────

async function stage2Vector(query: string): Promise<{ id: number; distance: number }[]> {
  if (!vectorIndex || vectorIndex.size === 0) return [];

  try {
    const [embedding] = await embed([query], 'query: ');
    if (!embedding) return [];
    return vectorIndex.search(embedding, 30);
  } catch {
    return [];
  }
}

// ── Stage 3: Claude Reformulation ──────────────────────────────

async function stage3Claude(
  query: string,
  detectedUsages: string[],
): Promise<string | null> {
  try {
    const claude = new ClaudeClient();
    const response = await claude.complete(
      [
        {
          role: 'user',
          content: `Reformule cette requête de recherche produit pour trouver des résultats pertinents.
Requête originale: "${query}"
Usages détectés: ${detectedUsages.join(', ') || 'aucun'}

Retourne UNIQUEMENT la requête reformulée, sans explication. Ajoute des synonymes et termes techniques pertinents.`,
        },
      ],
      {
        maxTokens: 200,
        temperature: 0.5,
        timeout: 10_000,
      },
    );
    return response.trim();
  } catch (err) {
    logger.warn({ err }, 'stage3.claude.reformulation.failed');
    return null;
  }
}

// ── RRF Merge ──────────────────────────────────────────────────

function rrfMerge(
  bm25: { id: number; score: number }[],
  vector: { id: number; distance: number }[],
): number[] {
  const scores = new Map<number, number>();

  // BM25 contribution
  bm25.forEach((hit, rank) => {
    const s = scores.get(hit.id) || 0;
    scores.set(hit.id, s + 1 / (RRF_K + rank + 1));
  });

  // Vector contribution (lower distance = better)
  vector.forEach((hit, rank) => {
    const s = scores.get(hit.id) || 0;
    scores.set(hit.id, s + 1 / (RRF_K + rank + 1));
  });

  return Array.from(scores.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id);
}

// ── Helpers ────────────────────────────────────────────────────

async function fetchAndScore(
  productIds: number[],
  context: ConversationContext,
  query: SearchQuery,
): Promise<ScoredProduct[]> {
  if (productIds.length === 0) return [];

  const prisma = getPrisma();

  const products = await prisma.product.findMany({
    where: {
      id: { in: productIds },
      storeId: query.storeId,
      isActive: true,
    },
    include: {
      usages: {
        include: { usage: true },
      },
    },
  });

  // Build usage scores map
  const productsWithUsages = products.map((p) => {
    const usageScores: Record<string, number> = {};
    for (const pu of p.usages) {
      usageScores[pu.usage.code] = pu.score;
    }
    return { product: p, usageScores };
  });

  return scoreProducts(productsWithUsages, context);
}

async function handleSimilaritySearch(
  query: SearchQuery,
  context: ConversationContext,
  sessionToken: string,
  startMs: number,
): Promise<SearchResult> {
  const prisma = getPrisma();

  // Fetch all active products for similarity comparison
  const products = await prisma.product.findMany({
    where: { storeId: query.storeId, isActive: true },
  });

  const results = await findSimilar(
    {
      referenceText: query.query,
      subCase: 'like',
    },
    products,
    [], // attribute weights from universe config
  );

  const totalMs = Date.now() - startMs;

  return {
    products: results,
    searchType: 'SIMILARITY',
    stageUsed: 2,
    sessionToken,
    totalMs,
  };
}

function applyFilters(
  products: ScoredProduct[],
  filters: SearchQuery['filters'],
): ScoredProduct[] {
  if (!filters) return products;

  return products.filter((p) => {
    if (filters.category && p.product.category !== filters.category) return false;
    if (filters.brand && p.product.brand !== filters.brand) return false;
    if (filters.minPrice && Number(p.product.price) < filters.minPrice) return false;
    if (filters.maxPrice && Number(p.product.price) > filters.maxPrice) return false;
    if (filters.inStock && p.product.stockStatus !== 'IN_STOCK') return false;
    return true;
  });
}

export function isIndexReady(): boolean {
  return indexReady;
}
