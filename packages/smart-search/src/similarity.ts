/**
 * Similarity search — distance-weighted matching with categorical proximity matrices.
 * 5 sub-cases: like, budget_alt, replacement, discovery, competitor_equiv
 */

import type {
  Product,
  SimilarityRequest,
  AttributeWeight,
  ScoredProduct,
  ConfidenceLevel,
} from '@shimmer/core';
import { getPrisma } from '@shimmer/core';

/**
 * Compute weighted distance between two products.
 */
export function computeDistance(
  reference: Product,
  candidate: Product,
  weights: AttributeWeight[],
): number {
  const refSpecs = (reference.specs as Record<string, unknown>) || {};
  const candSpecs = (candidate.specs as Record<string, unknown>) || {};

  let totalWeight = 0;
  let weightedDistance = 0;

  for (const w of weights) {
    const refVal = refSpecs[w.name];
    const candVal = candSpecs[w.name];

    if (refVal === undefined || candVal === undefined) continue;

    totalWeight += w.weight;
    let d: number;

    switch (w.type) {
      case 'categorical_exact':
        d = String(refVal) === String(candVal) ? 0 : 1;
        break;

      case 'categorical_close':
        d = categoricalDistance(String(refVal), String(candVal), w.proximityMatrix);
        break;

      case 'numerical':
        d = numericalDistance(Number(refVal), Number(candVal), w.maxRange || 1);
        break;

      case 'list':
        d = listDistance(
          Array.isArray(refVal) ? refVal : [refVal],
          Array.isArray(candVal) ? candVal : [candVal],
        );
        break;

      case 'boolean':
        d = refVal === candVal ? 0 : 1;
        break;

      default:
        d = 1;
    }

    weightedDistance += w.weight * d;
  }

  return totalWeight > 0 ? weightedDistance / totalWeight : 1;
}

function categoricalDistance(
  a: string,
  b: string,
  matrix?: Record<string, Record<string, number>>,
): number {
  if (a === b) return 0;
  if (!matrix) return 1;
  return matrix[a]?.[b] ?? matrix[b]?.[a] ?? 1;
}

function numericalDistance(a: number, b: number, maxRange: number): number {
  return Math.min(1, Math.abs(a - b) / maxRange);
}

function listDistance(a: unknown[], b: unknown[]): number {
  const setA = new Set(a.map(String));
  const setB = new Set(b.map(String));
  let intersection = 0;
  for (const item of setA) {
    if (setB.has(item)) intersection++;
  }
  const union = new Set([...setA, ...setB]).size;
  return union > 0 ? 1 - intersection / union : 1;
}

/**
 * Find similar products based on the sub-case.
 */
export async function findSimilar(
  request: SimilarityRequest,
  products: Product[],
  weights: AttributeWeight[],
): Promise<ScoredProduct[]> {
  let reference: Product | undefined;

  if (request.referenceProductId) {
    const prisma = getPrisma();
    reference = await prisma.product.findUnique({
      where: { id: request.referenceProductId },
    }) ?? undefined;
  }

  if (!reference && request.referenceText) {
    // Use text to find closest match first (handled by hybrid search upstream)
    return [];
  }

  if (!reference) return [];

  const maxDist = request.maxDistance ?? getMaxDistance(request.subCase);

  const scored: ScoredProduct[] = [];

  for (const candidate of products) {
    if (candidate.id === reference.id) continue;

    // Sub-case specific filters
    if (!passesSubCaseFilter(request.subCase, reference, candidate)) continue;

    const distance = computeDistance(reference, candidate, weights);
    if (distance > maxDist) continue;

    const score = 1 - distance;

    scored.push({
      product: candidate,
      score: Math.round(score * 100) / 100,
      matchType: 'similarity',
      explanation: `${request.subCase}: distance=${distance.toFixed(3)} from ${reference.name}`,
      confidence: distanceToConfidence(distance),
    });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 20);
}

function getMaxDistance(subCase: string): number {
  switch (subCase) {
    case 'like': return 0.4;
    case 'budget_alt': return 0.6;
    case 'replacement': return 0.3;
    case 'discovery': return 0.7;
    case 'competitor_equiv': return 0.5;
    default: return 0.5;
  }
}

function passesSubCaseFilter(
  subCase: string,
  reference: Product,
  candidate: Product,
): boolean {
  switch (subCase) {
    case 'budget_alt':
      // Must be cheaper
      return Number(candidate.price) < Number(reference.price);

    case 'replacement':
      // Same category
      return candidate.category === reference.category;

    case 'competitor_equiv':
      // Different brand, same category
      return (
        candidate.brand !== reference.brand &&
        candidate.category === reference.category
      );

    case 'like':
    case 'discovery':
    default:
      return true;
  }
}

function distanceToConfidence(distance: number): ConfidenceLevel {
  if (distance <= 0.1) return 'very_high';
  if (distance <= 0.25) return 'high';
  if (distance <= 0.4) return 'medium';
  if (distance <= 0.6) return 'low';
  return 'very_low';
}
