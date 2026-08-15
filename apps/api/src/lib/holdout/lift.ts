/**
 * Incremental lift estimation via Bayesian bootstrap (Rubin, 1981).
 *
 * We compare revenue-per-visitor between the treatment group (saw Shimmer) and
 * the control group (held out). Revenue-per-visitor is zero-inflated (most
 * visitors don't buy), so a parametric model is fragile. The Bayesian
 * bootstrap is non-parametric and gives a genuine posterior over each group's
 * mean: draw Dirichlet(1,...,1) weights over the observations, take the
 * weighted mean. Repeat to trace the posterior, then derive the posterior over
 * the uplift.
 *
 * Outputs:
 *   - absoluteLiftEUR: posterior median of (treatment mean - control mean), per visitor
 *   - relativeLiftPct: posterior median of (treatment/control - 1) * 100
 *   - credible interval (2.5/97.5) for both
 *   - pUpliftAboveThreshold: P(relative uplift > effectThresholdPct)
 *   - incrementalRevenueEUR: absolute lift × treatment visitor count (the € we can bill on)
 */

const DRAWS = 2000;
const EPSILON = 1e-6;

/**
 * Below this many observations per group we refuse to declare significance,
 * whatever the posterior says. With a handful of all-zero control points the
 * bootstrap ratio degenerates (treatment/0 → +Inf on every draw) and the
 * probability threshold passes vacuously. 25 is deliberately conservative.
 */
export const MIN_GROUP_N = 25;

export interface LiftResult {
  controlVisitors: number;
  treatmentVisitors: number;
  controlMeanEUR: number;
  treatmentMeanEUR: number;
  absoluteLiftEUR: number;
  absoluteLiftCI: [number, number];
  relativeLiftPct: number;
  relativeLiftCI: [number, number];
  pUpliftAboveThreshold: number;
  effectThresholdPct: number;
  incrementalRevenueEUR: number;
  /** Whether the variable fee may trigger: significant AND economically meaningful. */
  significant: boolean;
}

/**
 * Deterministic PRNG (mulberry32) seeded from the data itself: the same
 * observations always produce the same estimate. A merchant refreshing the
 * page must never see the "proven" number wiggle — it only moves when the
 * underlying data moves.
 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** FNV-1a over group sizes and revenues (rounded to the cent). */
function dataSeed(control: number[], treatment: number[]): number {
  let h = 2166136261 >>> 0;
  const mix = (x: number): void => {
    h ^= Math.round(x * 100) & 0xffff;
    h = Math.imul(h, 16777619) >>> 0;
  };
  mix(control.length);
  mix(treatment.length);
  for (const v of control) mix(v);
  for (const v of treatment) mix(v);
  return h;
}

/** One Dirichlet(1,...,1) weight vector over n points, as a weighted mean of values. */
function bootstrapMean(values: number[], rng: () => number): number {
  const n = values.length;
  if (n === 0) return 0;
  // Dirichlet(1..1) == normalized Exponential(1) == normalized (-ln U).
  let total = 0;
  const w = new Array<number>(n);
  for (let i = 0; i < n; i++) {
    const e = -Math.log(rng() + EPSILON);
    w[i] = e;
    total += e;
  }
  let mean = 0;
  for (let i = 0; i < n; i++) {
    mean += (w[i]! / total) * values[i]!;
  }
  return mean;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.round((p / 100) * (sorted.length - 1))));
  return sorted[idx]!;
}

export function estimateLift(
  controlRevenue: number[],
  treatmentRevenue: number[],
  effectThresholdPct: number,
): LiftResult {
  const rng = mulberry32(dataSeed(controlRevenue, treatmentRevenue));
  const cN = controlRevenue.length;
  const tN = treatmentRevenue.length;

  const cMean = cN ? controlRevenue.reduce((a, b) => a + b, 0) / cN : 0;
  const tMean = tN ? treatmentRevenue.reduce((a, b) => a + b, 0) / tN : 0;

  // Need both groups populated to say anything.
  if (cN < 1 || tN < 1) {
    return {
      controlVisitors: cN,
      treatmentVisitors: tN,
      controlMeanEUR: round2(cMean),
      treatmentMeanEUR: round2(tMean),
      absoluteLiftEUR: 0,
      absoluteLiftCI: [0, 0],
      relativeLiftPct: 0,
      relativeLiftCI: [0, 0],
      pUpliftAboveThreshold: 0,
      effectThresholdPct,
      incrementalRevenueEUR: 0,
      significant: false,
    };
  }

  const absDraws: number[] = [];
  const relDraws: number[] = [];
  let aboveThreshold = 0;
  const thresholdFrac = effectThresholdPct / 100;

  for (let d = 0; d < DRAWS; d++) {
    const cDraw = bootstrapMean(controlRevenue, rng);
    const tDraw = bootstrapMean(treatmentRevenue, rng);
    const abs = tDraw - cDraw;
    absDraws.push(abs);
    // Relative uplift only defined when control mean is meaningfully positive.
    const rel = cDraw > EPSILON ? tDraw / cDraw - 1 : (tDraw > 0 ? Infinity : 0);
    relDraws.push(Number.isFinite(rel) ? rel * 100 : 999);
    if (rel > thresholdFrac) aboveThreshold += 1;
  }

  absDraws.sort((a, b) => a - b);
  relDraws.sort((a, b) => a - b);

  const absoluteLiftEUR = percentile(absDraws, 50);
  const relativeLiftPct = percentile(relDraws, 50);
  const pAbove = aboveThreshold / DRAWS;

  // Variable fee may trigger only when we are 95% sure the uplift clears the
  // economic threshold. Probability alone is not enough: we also require a
  // positive point estimate and enough observations on BOTH sides for the
  // bootstrap to be meaningful (see MIN_GROUP_N).
  const significant = pAbove >= 0.95 && absoluteLiftEUR > 0 && cN >= MIN_GROUP_N && tN >= MIN_GROUP_N;

  return {
    controlVisitors: cN,
    treatmentVisitors: tN,
    controlMeanEUR: round2(cMean),
    treatmentMeanEUR: round2(tMean),
    absoluteLiftEUR: round2(absoluteLiftEUR),
    absoluteLiftCI: [round2(percentile(absDraws, 2.5)), round2(percentile(absDraws, 97.5))],
    relativeLiftPct: round1(relativeLiftPct),
    relativeLiftCI: [round1(percentile(relDraws, 2.5)), round1(percentile(relDraws, 97.5))],
    pUpliftAboveThreshold: round3(pAbove),
    effectThresholdPct,
    incrementalRevenueEUR: round2(Math.max(0, absoluteLiftEUR) * tN),
    significant,
  };
}

function round1(n: number): number { return Math.round(n * 10) / 10; }
function round2(n: number): number { return Math.round(n * 100) / 100; }
function round3(n: number): number { return Math.round(n * 1000) / 1000; }
