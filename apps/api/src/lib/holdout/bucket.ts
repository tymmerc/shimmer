/**
 * Deterministic holdout bucketing.
 *
 * A visitor is assigned a stable bucket 0-99 from a hash of (visitorId,
 * storeId). The assignment never changes for the same visitor, survives
 * restarts, and needs no storage to recompute. The control group is the first
 * `holdoutPct` percent of buckets.
 *
 * The holdout percentage is locked to a minimum so a merchant can't quietly
 * set it to 0 and game the "proven incremental" billing. Default 10%.
 */

import crypto from 'node:crypto';

export const MIN_HOLDOUT_PCT = 5;
export const MAX_HOLDOUT_PCT = 20;
export const DEFAULT_HOLDOUT_PCT = 10;
export const DEFAULT_EFFECT_THRESHOLD_PCT = 5;

export interface HoldoutConfig {
  enabled: boolean;
  /** Percent of visitors held out as control (clamped to [MIN, MAX]). */
  pct: number;
  /** Minimum uplift % we require before the variable fee can trigger. */
  effectThresholdPct: number;
}

export function resolveHoldoutConfig(raw: unknown): HoldoutConfig {
  const cfg = (raw ?? {}) as Partial<HoldoutConfig>;
  const pct = clamp(typeof cfg.pct === 'number' ? cfg.pct : DEFAULT_HOLDOUT_PCT, MIN_HOLDOUT_PCT, MAX_HOLDOUT_PCT);
  return {
    enabled: cfg.enabled !== false,
    pct,
    effectThresholdPct:
      typeof cfg.effectThresholdPct === 'number' ? cfg.effectThresholdPct : DEFAULT_EFFECT_THRESHOLD_PCT,
  };
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

/** Stable bucket 0-99 for a visitor in a store. */
export function bucketFor(visitorId: string, storeId: number): number {
  const h = crypto.createHash('sha256').update(`${storeId}:${visitorId}`).digest();
  // First 4 bytes as unsigned int, mod 100.
  const n = h.readUInt32BE(0);
  return n % 100;
}

/** True if this visitor is in the control group (sees no Shimmer). */
export function isControl(visitorId: string, storeId: number, cfg: HoldoutConfig): boolean {
  if (!cfg.enabled) return false;
  return bucketFor(visitorId, storeId) < cfg.pct;
}

/**
 * Stable bucket 0-99 for an abandoned cart. The experiment unit for the
 * relance module is the CART, not the visitor: recovery is rare and the
 * reminder effect is large, so cart-level comparison reaches significance
 * with far fewer observations than the sitewide visitor holdout.
 * Prefixed so a cart never shares a hash input with a visitor id.
 */
export function cartBucketFor(cartId: number, storeId: number): number {
  return bucketFor(`cart:${cartId}`, storeId);
}

/** True if this abandoned cart is held out of the reminder sequence. */
export function isControlCart(cartId: number, storeId: number, cfg: HoldoutConfig): boolean {
  if (!cfg.enabled) return false;
  return cartBucketFor(cartId, storeId) < cfg.pct;
}
