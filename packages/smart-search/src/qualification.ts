/**
 * Qualification engine — scoring multi-criteria, question selection (max 3),
 * deduction rules (appartement → petit, bureau → discret, etc.)
 */

import type {
  QualificationResult,
  QualificationQuestion,
  UniverseConfig,
  DeductionRule,
  ConversationContext,
} from '@shimmer/core';

/**
 * Default deduction rules applied across universes.
 */
const DEFAULT_DEDUCTIONS: DeductionRule[] = [
  {
    signal: 'appartement',
    patterns: ['appartement', 'appart', 'studio', 'f1', 'f2', 'f3', 'petit logement'],
    deduction: { key: 'taille_espace', value: 'petit' },
  },
  {
    signal: 'maison',
    patterns: ['maison', 'villa', 'pavillon', 'résidence'],
    deduction: { key: 'taille_espace', value: 'grand' },
  },
  {
    signal: 'bureau',
    patterns: ['bureau', 'open space', 'workspace', 'travail'],
    deduction: { key: 'bruit', value: 'discret' },
  },
  {
    signal: 'enfant',
    patterns: ['enfant', 'bébé', 'enfants', 'gamin', 'petits'],
    deduction: { key: 'securite', value: 'enfant' },
  },
  {
    signal: 'professionnel',
    patterns: ['pro', 'professionnel', 'métier', 'chantier', 'atelier'],
    deduction: { key: 'niveau', value: 'professionnel' },
  },
  {
    signal: 'débutant',
    patterns: ['débutant', 'novice', 'première fois', 'jamais utilisé', 'commencer'],
    deduction: { key: 'niveau', value: 'debutant' },
  },
  {
    signal: 'extérieur',
    patterns: ['extérieur', 'jardin', 'terrasse', 'balcon', 'dehors', 'outdoor'],
    deduction: { key: 'usage_lieu', value: 'exterieur' },
  },
  {
    signal: 'intérieur',
    patterns: ['intérieur', 'dedans', 'indoor', 'inside', 'chambre', 'salon', 'cuisine'],
    deduction: { key: 'usage_lieu', value: 'interieur' },
  },
];

/**
 * Apply deduction rules to extract implicit criteria from query/context.
 */
export function applyDeductions(
  query: string,
  context: ConversationContext,
  universeConfig?: UniverseConfig,
): Record<string, string> {
  const deductions: Record<string, string> = {};
  const text = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const rules = [
    ...DEFAULT_DEDUCTIONS,
    ...(universeConfig?.deductionRules || []),
  ];

  for (const rule of rules) {
    for (const pattern of rule.patterns) {
      const normalized = pattern.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (text.includes(normalized)) {
        deductions[rule.deduction.key] = rule.deduction.value;
        break;
      }
    }
  }

  return deductions;
}

/**
 * Determine which qualification questions to ask (max 3).
 * Only ask questions for missing mandatory criteria.
 */
export function selectQuestions(
  context: ConversationContext,
  universeConfig: UniverseConfig,
  availableQuestions: QualificationQuestion[],
): QualificationQuestion[] {
  const maxQ = universeConfig.maxQuestions || 3;
  const knownCriteria = new Set(Object.keys(context.criteria));
  const mandatoryCriteria = universeConfig.mandatoryCriteria || [];

  // Filter to questions for unknown mandatory criteria
  const needed = availableQuestions.filter(
    (q) =>
      mandatoryCriteria.includes(q.criterion) && !knownCriteria.has(q.criterion),
  );

  // Sort by priority (lower = more important)
  needed.sort((a, b) => a.priority - b.priority);

  return needed.slice(0, maxQ);
}

/**
 * Compute overall qualification score (0–100).
 * Score = (known mandatory criteria / total mandatory) × 100
 */
export function computeQualificationScore(
  context: ConversationContext,
  universeConfig: UniverseConfig,
): QualificationResult {
  const mandatoryCriteria = universeConfig.mandatoryCriteria || [];
  if (mandatoryCriteria.length === 0) {
    return { score: 100, deductions: context.criteria, missingCriteria: [] };
  }

  const knownCriteria = new Set(Object.keys(context.criteria));
  const missing = mandatoryCriteria.filter((c) => !knownCriteria.has(c));
  const known = mandatoryCriteria.length - missing.length;
  const score = Math.round((known / mandatoryCriteria.length) * 100);

  return {
    score,
    deductions: context.criteria,
    missingCriteria: missing,
  };
}
