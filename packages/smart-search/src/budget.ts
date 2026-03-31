/**
 * Budget signal detection and range computation.
 * Asymmetric range: -20% / +10% from signal.
 */

import type { BudgetSignal } from '@shimmer/core';

const EXPLICIT_PATTERNS = [
  /(\d+)\s*(?:€|euros?)\s*(?:à|[-–])\s*(\d+)\s*(?:€|euros?)/i,
  /entre\s+(\d+)\s*(?:€|euros?)?\s*et\s+(\d+)\s*(?:€|euros?)/i,
  /budget\s*(?:de\s+)?(\d+)\s*(?:€|euros?)?(?:\s*(?:à|[-–])\s*(\d+)\s*(?:€|euros?)?)?/i,
  /moins\s+de\s+(\d+)\s*(?:€|euros?)/i,
  /max(?:imum)?\s+(\d+)\s*(?:€|euros?)/i,
  /(?:environ|autour\s+de|dans\s+les)\s+(\d+)\s*(?:€|euros?)/i,
];

const QUALITATIVE_MAP: Record<string, string> = {
  'pas cher': 'budget',
  'bon marché': 'budget',
  'économique': 'budget',
  'entrée de gamme': 'budget',
  'premier prix': 'budget',
  'milieu de gamme': 'mid',
  'moyen de gamme': 'mid',
  'rapport qualité prix': 'mid',
  'qualité prix': 'mid',
  'haut de gamme': 'premium',
  'premium': 'premium',
  'luxe': 'premium',
  'professionnel': 'premium',
  'pro': 'premium',
};

const ANCHOR_PATTERNS = [
  /moins\s+cher\s+que\s+(.*)/i,
  /plus\s+(?:abordable|accessible)\s+que\s+(.*)/i,
  /même\s+(?:gamme|prix)\s+que\s+(.*)/i,
];

/**
 * Detect budget signal from user query.
 */
export function detectBudget(query: string): BudgetSignal {
  const q = query.toLowerCase().trim();

  // Check explicit patterns
  for (const pattern of EXPLICIT_PATTERNS) {
    const match = q.match(pattern);
    if (match) {
      if (match[2]) {
        return { type: 'explicit', min: Number(match[1]), max: Number(match[2]) };
      }
      if (q.includes('moins de') || q.includes('max')) {
        return { type: 'explicit', max: Number(match[1]) };
      }
      // "environ X" → asymmetric range
      const anchor = Number(match[1]);
      return {
        type: 'explicit',
        min: Math.round(anchor * 0.8),
        max: Math.round(anchor * 1.1),
      };
    }
  }

  // Check qualitative
  for (const [phrase, label] of Object.entries(QUALITATIVE_MAP)) {
    if (q.includes(phrase)) {
      return { type: 'qualitative', label };
    }
  }

  // Check anchor (relative to another product)
  for (const pattern of ANCHOR_PATTERNS) {
    const match = q.match(pattern);
    if (match) {
      return { type: 'anchor', anchor: match[1]!.trim() };
    }
  }

  return { type: 'none' };
}

/**
 * Apply budget percentiles to convert qualitative → numeric range.
 */
export function resolveQualitativeBudget(
  label: string,
  percentiles: Record<string, number>,
): { min?: number; max?: number } {
  switch (label) {
    case 'budget':
      return { max: percentiles['p25'] || percentiles['p30'] };
    case 'mid':
      return {
        min: percentiles['p25'] || percentiles['p20'],
        max: percentiles['p75'] || percentiles['p80'],
      };
    case 'premium':
      return { min: percentiles['p75'] || percentiles['p70'] };
    default:
      return {};
  }
}

/**
 * Check if a product price falls within budget.
 */
export function isInBudget(
  price: number,
  budget: BudgetSignal,
  percentiles?: Record<string, number>,
): boolean {
  let min: number | undefined;
  let max: number | undefined;

  if (budget.type === 'explicit') {
    min = budget.min;
    max = budget.max;
  } else if (budget.type === 'qualitative' && budget.label && percentiles) {
    const resolved = resolveQualitativeBudget(budget.label, percentiles);
    min = resolved.min;
    max = resolved.max;
  } else {
    return true; // no budget constraint
  }

  if (min !== undefined && price < min) return false;
  if (max !== undefined && price > max) return false;
  return true;
}
