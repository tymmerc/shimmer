/**
 * Usage taxonomy management — loads from DB, matches queries to usages.
 */

import { getPrisma, logger } from '@shimmer/core';
import { BM25Index } from './bm25.js';

export interface TaxonomyEntry {
  id: number;
  code: string;
  label: string;
  category: string;
  keywords: string[];
  description: string | null;
  parentCode: string | null;
  sortOrder: number;
}

let taxonomyCache: TaxonomyEntry[] | null = null;
let taxonomyIndex: BM25Index | null = null;

/**
 * Load all taxonomy entries from DB. Cached in memory.
 */
export async function loadTaxonomy(): Promise<TaxonomyEntry[]> {
  if (taxonomyCache) return taxonomyCache;

  const prisma = getPrisma();
  const entries = await prisma.usageTaxonomy.findMany({
    orderBy: { sortOrder: 'asc' },
  });

  taxonomyCache = entries.map((e) => ({
    id: e.id,
    code: e.code,
    label: e.label,
    category: e.category,
    keywords: e.keywords,
    description: e.description,
    parentCode: e.parentCode,
    sortOrder: e.sortOrder,
  }));

  // Build BM25 index over taxonomy for fast matching
  taxonomyIndex = new BM25Index();
  taxonomyIndex.build(
    taxonomyCache.map((e) => ({
      id: e.id,
      text: `${e.label} ${e.keywords.join(' ')} ${e.description || ''}`,
    })),
  );

  logger.info({ count: taxonomyCache.length }, 'taxonomy.loaded');
  return taxonomyCache;
}

/**
 * Match a query to the most relevant usage codes.
 */
export async function matchUsages(
  query: string,
  topK = 5,
): Promise<{ entry: TaxonomyEntry; score: number }[]> {
  const entries = await loadTaxonomy();
  if (!taxonomyIndex) return [];

  const hits = taxonomyIndex.search(query, topK);
  return hits.map((h) => ({
    entry: entries.find((e) => e.id === h.id)!,
    score: h.score,
  }));
}

/**
 * Get taxonomy entry by code.
 */
export async function getByCode(code: string): Promise<TaxonomyEntry | undefined> {
  const entries = await loadTaxonomy();
  return entries.find((e) => e.code === code);
}

/**
 * Get children of a parent code.
 */
export async function getChildren(parentCode: string): Promise<TaxonomyEntry[]> {
  const entries = await loadTaxonomy();
  return entries.filter((e) => e.parentCode === parentCode);
}

/**
 * Invalidate cache — call after taxonomy updates.
 */
export function invalidateTaxonomyCache(): void {
  taxonomyCache = null;
  taxonomyIndex = null;
}
