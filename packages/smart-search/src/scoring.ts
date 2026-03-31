/**
 * Scoring pipeline — usage × criteria × history weights, per-universe config.
 * Final score = usageW × usageScore + criteriaW × criteriaScore + historyW × historyScore
 */

import type {
  ScoredProduct,
  Product,
  ConversationContext,
  UniverseConfig,
  ConfidenceLevel,
  BudgetSignal,
} from '@shimmer/core';
import { isInBudget } from './budget.js';

interface ProductWithUsages {
  product: Product;
  usageScores: Record<string, number>; // usageCode → score (0–100)
}

const DEFAULT_WEIGHTS = {
  usageWeight: 0.5,
  criteriaWeight: 0.35,
  historyWeight: 0.15,
};

/**
 * Score products against the current conversation context.
 */
export function scoreProducts(
  products: ProductWithUsages[],
  context: ConversationContext,
  universeConfig?: UniverseConfig,
  budget?: BudgetSignal,
  budgetPercentiles?: Record<string, number>,
): ScoredProduct[] {
  const weights = universeConfig?.scoring || DEFAULT_WEIGHTS;

  const scored: ScoredProduct[] = products.map((item) => {
    const usageScore = computeUsageScore(item.usageScores, context.detectedUsages);
    const criteriaScore = computeCriteriaScore(item.product, context.criteria);
    const historyScore = 0; // Phase 2: learning loop

    const totalScore =
      weights.usageWeight * usageScore +
      weights.criteriaWeight * criteriaScore +
      weights.historyWeight * historyScore;

    // Budget penalty
    let budgetPenalty = 0;
    if (budget && budget.type !== 'none') {
      const price = Number(item.product.price);
      if (!isInBudget(price, budget, budgetPercentiles)) {
        budgetPenalty = 0.3; // 30% penalty for out-of-budget
      }
    }

    const finalScore = Math.max(0, totalScore - budgetPenalty);

    return {
      product: item.product,
      score: Math.round(finalScore * 100) / 100,
      matchType: determineMatchType(context),
      explanation: buildExplanation(usageScore, criteriaScore, context),
      usageScores: item.usageScores,
      confidence: scoreToConfidence(finalScore),
    };
  });

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);
  return scored;
}

/**
 * Usage score = average of matched usage scores for detected usages.
 */
function computeUsageScore(
  productUsages: Record<string, number>,
  detectedUsages: string[],
): number {
  if (detectedUsages.length === 0) return 0;

  let total = 0;
  let matched = 0;

  for (const usage of detectedUsages) {
    const score = productUsages[usage];
    if (score !== undefined) {
      total += score / 100; // normalize to 0–1
      matched++;
    }
  }

  if (matched === 0) return 0;

  // Bonus for matching multiple usages
  const multiUsageBonus = matched > 1 ? 0.1 * (matched - 1) : 0;

  return Math.min(1, total / detectedUsages.length + multiUsageBonus);
}

/**
 * Criteria score based on product attributes matching user criteria.
 */
function computeCriteriaScore(
  product: Product,
  criteria: Record<string, string>,
): number {
  const criteriaKeys = Object.keys(criteria);
  if (criteriaKeys.length === 0) return 0.5; // neutral when no criteria

  const specs = (product.specs as Record<string, unknown>) || {};
  let matched = 0;

  for (const [key, value] of Object.entries(criteria)) {
    const productValue = specs[key];
    if (productValue !== undefined) {
      const pv = String(productValue).toLowerCase();
      const cv = value.toLowerCase();
      if (pv === cv || pv.includes(cv) || cv.includes(pv)) {
        matched++;
      }
    }
  }

  return matched / criteriaKeys.length;
}

function determineMatchType(
  context: ConversationContext,
): 'exact' | 'usage' | 'similarity' | 'hybrid' {
  switch (context.searchType) {
    case 'EXACT': return 'exact';
    case 'FUNCTIONAL': return 'usage';
    case 'SIMILARITY': return 'similarity';
    case 'HYBRID': return 'hybrid';
    default: return 'exact';
  }
}

function buildExplanation(
  usageScore: number,
  criteriaScore: number,
  context: ConversationContext,
): string {
  const parts: string[] = [];

  if (context.detectedUsages.length > 0) {
    parts.push(
      `Usage match: ${Math.round(usageScore * 100)}% (${context.detectedUsages.join(', ')})`,
    );
  }

  if (Object.keys(context.criteria).length > 0) {
    parts.push(`Criteria match: ${Math.round(criteriaScore * 100)}%`);
  }

  return parts.join(' | ') || 'Direct match';
}

function scoreToConfidence(score: number): ConfidenceLevel {
  if (score >= 0.85) return 'very_high';
  if (score >= 0.7) return 'high';
  if (score >= 0.5) return 'medium';
  if (score >= 0.3) return 'low';
  return 'very_low';
}
