/**
 * Plafond de dépense IA par boutique.
 *
 * Le modèle économique dit : "l'IA premium est incluse (option IA+) ou sur la
 * clé du client, et dans tous les cas la perte max de Shimmer par boutique est
 * PLAFONNÉE PAR CONSTRUCTION". Ce module est cette construction :
 *
 *   - chaque appel à une API payante enregistre son coût estimé (Redis,
 *     compteur mensuel par boutique, en micro-euros entiers pour éviter la
 *     dérive des flottants) ;
 *   - avant tout appel payant, on vérifie le plafond (défaut 10 €/mois,
 *     surchargeable par `store.config.llm.budgetEURMonthly`) ;
 *   - au-delà : bascule silencieuse sur l'IA locale. Le vendeur ne s'éteint
 *     JAMAIS, il redevient sobre.
 *
 * Tout est fail-open : si Redis ou la base toussent, on laisse passer et on
 * log. On préfère risquer quelques centimes que bloquer une vente.
 *
 * Prix : ordres de grandeur en €/Mtoken, à raffiner quand un provider payant
 * est réellement branché. Un modèle inconnu est facturé au tarif conservateur
 * (le plus cher du barème) : dans le doute, le plafond mord plus tôt.
 */

import { getRedis } from './redis.js';
import { getPrisma } from './db.js';
import { logger } from './logger.js';

export const DEFAULT_LLM_BUDGET_EUR = 10;

/** €/Mtoken (entrée, sortie). Ordres de grandeur, pas des prix contractuels. */
const PRICE_TABLE: Array<{ match: RegExp; inEUR: number; outEUR: number }> = [
  { match: /qwen|llama|gemma|phi[0-9-]|:\d+b/i, inEUR: 0, outEUR: 0 }, // local (Ollama)
  { match: /mistral-small|ministral|open-mistral/i, inEUR: 0.09, outEUR: 0.28 },
  { match: /mistral-large|mistral-medium/i, inEUR: 1.8, outEUR: 5.5 },
  { match: /haiku/i, inEUR: 0.9, outEUR: 4.6 },
  { match: /sonnet/i, inEUR: 2.8, outEUR: 14 },
  { match: /opus/i, inEUR: 14, outEUR: 70 },
];
const CONSERVATIVE = { inEUR: 14, outEUR: 70 };

export function estimateLlmCostEUR(model: string, inputTokens: number, outputTokens: number): number {
  const row = PRICE_TABLE.find(r => r.match.test(model)) ?? CONSERVATIVE;
  return (inputTokens * row.inEUR + outputTokens * row.outEUR) / 1_000_000;
}

export function currentMonthKey(now: Date = new Date()): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function spendKey(storeId: number, now: Date = new Date()): string {
  return `llmspend:${storeId}:${currentMonthKey(now)}`;
}

/** true si la dépense atteint ou dépasse le plafond. cap null/undefined = défaut. */
export function isOverBudget(spentEUR: number, capEUR: number | null | undefined): boolean {
  const cap = capEUR ?? DEFAULT_LLM_BUDGET_EUR;
  return spentEUR >= cap;
}

// ── Couche stockage (interface injectable pour les tests) ─────────

export interface SpendKV {
  incrBy(key: string, n: number): Promise<number>;
  get(key: string): Promise<string | null>;
  expire(key: string, seconds: number): Promise<unknown>;
}

const SPEND_TTL_SECONDS = 45 * 24 * 3600; // le mois + marge, puis auto-nettoyage
const MICRO = 1_000_000; // compteur en micro-euros entiers

export async function recordSpendIn(kv: SpendKV, storeId: number, costEUR: number, now: Date = new Date()): Promise<void> {
  if (!(costEUR > 0)) return;
  const key = spendKey(storeId, now);
  await kv.incrBy(key, Math.round(costEUR * MICRO));
  await kv.expire(key, SPEND_TTL_SECONDS);
}

export async function getSpentEURFrom(kv: SpendKV, storeId: number, now: Date = new Date()): Promise<number> {
  const raw = await kv.get(spendKey(storeId, now));
  return raw ? Number(raw) / MICRO : 0;
}

// ── Couche haut niveau (Redis + config du store) ──────────────────

function redisKV(): SpendKV {
  const r = getRedis();
  return {
    incrBy: (k, n) => r.incrby(k, n),
    get: (k) => r.get(k),
    expire: (k, s) => r.expire(k, s),
  };
}

/** Cache mémoire du plafond par boutique (la config bouge rarement). */
const capCache = new Map<number, { capEUR: number; at: number }>();
const CAP_CACHE_MS = 60_000;

async function getBudgetCapEUR(storeId: number): Promise<number> {
  const hit = capCache.get(storeId);
  if (hit && Date.now() - hit.at < CAP_CACHE_MS) return hit.capEUR;
  try {
    const store = await getPrisma().store.findUnique({ where: { id: storeId }, select: { config: true } });
    const cfg = (store?.config ?? {}) as { llm?: { budgetEURMonthly?: number } };
    const cap = typeof cfg.llm?.budgetEURMonthly === 'number' ? cfg.llm.budgetEURMonthly : DEFAULT_LLM_BUDGET_EUR;
    capCache.set(storeId, { capEUR: cap, at: Date.now() });
    return cap;
  } catch (err) {
    logger.warn({ err, storeId }, 'llm.budget.cap-read-failed (fail-open, defaut)');
    return DEFAULT_LLM_BUDGET_EUR;
  }
}

/** Enregistre le coût d'un appel payant. Fire-and-forget côté appelant. */
export async function recordLlmSpend(storeId: number, costEUR: number): Promise<void> {
  try {
    await recordSpendIn(redisKV(), storeId, costEUR);
  } catch (err) {
    logger.warn({ err, storeId }, 'llm.budget.record-failed (fail-open)');
  }
}

export interface LlmBudgetStatus {
  capEUR: number;
  spentEUR: number;
  overBudget: boolean;
}

export async function getLlmBudgetStatus(storeId: number): Promise<LlmBudgetStatus> {
  const capEUR = await getBudgetCapEUR(storeId);
  let spentEUR = 0;
  try {
    spentEUR = await getSpentEURFrom(redisKV(), storeId);
  } catch (err) {
    logger.warn({ err, storeId }, 'llm.budget.read-failed (fail-open)');
  }
  return { capEUR, spentEUR: Math.round(spentEUR * 100) / 100, overBudget: isOverBudget(spentEUR, capEUR) };
}

/** Le garde appelé avant tout appel payant. Fail-open. */
export async function isOverLlmBudget(storeId: number): Promise<boolean> {
  try {
    const s = await getLlmBudgetStatus(storeId);
    if (s.overBudget) {
      logger.warn({ storeId, spentEUR: s.spentEUR, capEUR: s.capEUR }, 'llm.budget.exceeded → bascule IA locale');
    }
    return s.overBudget;
  } catch {
    return false;
  }
}
