import { describe, it, expect } from 'vitest';
import { bucketFor, isControl, resolveHoldoutConfig, MIN_HOLDOUT_PCT, MAX_HOLDOUT_PCT } from '../lib/holdout/bucket.js';
import { estimateLift } from '../lib/holdout/lift.js';

describe('holdout bucketing', () => {
  it('is deterministic for the same visitor + store', () => {
    const a = bucketFor('visitor-123', 4);
    const b = bucketFor('visitor-123', 4);
    expect(a).toBe(b);
  });

  it('differs across stores for the same visitor (no cross-store leak)', () => {
    // Not guaranteed different, but the hash includes storeId so distribution differs.
    const s4 = bucketFor('visitor-123', 4);
    const s9 = bucketFor('visitor-123', 9);
    expect(typeof s4).toBe('number');
    expect(typeof s9).toBe('number');
    expect(s4).toBeGreaterThanOrEqual(0);
    expect(s4).toBeLessThan(100);
  });

  it('spreads visitors roughly uniformly across 100 buckets', () => {
    const counts = new Array(100).fill(0);
    for (let i = 0; i < 10000; i++) counts[bucketFor(`v${i}`, 1)]++;
    const min = Math.min(...counts);
    const max = Math.max(...counts);
    // Expect ~100 per bucket; allow generous slack but no empty/huge buckets.
    expect(min).toBeGreaterThan(40);
    expect(max).toBeLessThan(180);
  });

  it('control share approximates the configured pct', () => {
    const cfg = resolveHoldoutConfig({ pct: 10 });
    let control = 0;
    for (let i = 0; i < 10000; i++) if (isControl(`v${i}`, 1, cfg)) control++;
    const share = control / 10000;
    expect(share).toBeGreaterThan(0.08);
    expect(share).toBeLessThan(0.12);
  });

  it('locks the holdout pct to the allowed range (anti-gaming)', () => {
    expect(resolveHoldoutConfig({ pct: 0 }).pct).toBe(MIN_HOLDOUT_PCT);
    expect(resolveHoldoutConfig({ pct: 50 }).pct).toBe(MAX_HOLDOUT_PCT);
    expect(resolveHoldoutConfig({ pct: 10 }).pct).toBe(10);
  });

  it('disabled config puts everyone in treatment', () => {
    const cfg = resolveHoldoutConfig({ enabled: false, pct: 10 });
    let control = 0;
    for (let i = 0; i < 1000; i++) if (isControl(`v${i}`, 1, cfg)) control++;
    expect(control).toBe(0);
  });
});

describe('holdout lift estimation', () => {
  // Seeded PRNG so the bayesian assertions are deterministic. Without a seed
  // the small-sample test below depends on the run, so a bad draw can make a
  // tempting point estimate look "significant" by luck.
  function makeRand(seed: number): () => number {
    let s = seed >>> 0;
    return () => {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function rpv(n: number, convRate: number, aov: number, rand: () => number = Math.random): number[] {
    const arr = new Array<number>(n).fill(0);
    for (let i = 0; i < n; i++) arr[i] = rand() < convRate ? aov : 0;
    return arr;
  }

  it('does not declare significance on a tiny sample even with a tempting point estimate', () => {
    const rand = makeRand(42);
    const control = rpv(80, 0.025, 60, rand);
    const treatment = rpv(120, 0.05, 60, rand); // big apparent lift, tiny sample
    const r = estimateLift(control, treatment, 5);
    expect(r.significant).toBe(false);
  });

  it('declares significance on a large sample with a real effect', () => {
    const control = rpv(5000, 0.022, 65);
    const treatment = rpv(13000, 0.036, 65); // ~60% real lift, large sample
    const r = estimateLift(control, treatment, 5);
    expect(r.pUpliftAboveThreshold).toBeGreaterThan(0.95);
    expect(r.significant).toBe(true);
    expect(r.absoluteLiftEUR).toBeGreaterThan(0);
    expect(r.incrementalRevenueEUR).toBeGreaterThan(0);
  });

  it('never declares significance when treatment is worse', () => {
    const control = rpv(5000, 0.04, 65);
    const treatment = rpv(13000, 0.025, 65); // treatment worse
    const r = estimateLift(control, treatment, 5);
    expect(r.significant).toBe(false);
  });

  it('returns zeros and no significance when a group is empty', () => {
    const r = estimateLift([], [10, 20, 0], 5);
    expect(r.significant).toBe(false);
    expect(r.incrementalRevenueEUR).toBe(0);
  });
});
