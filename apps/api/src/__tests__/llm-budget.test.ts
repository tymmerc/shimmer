import { describe, it, expect } from 'vitest';
import {
  estimateLlmCostEUR,
  currentMonthKey,
  spendKey,
  recordSpendIn,
  getSpentEURFrom,
  isOverBudget,
  DEFAULT_LLM_BUDGET_EUR,
  type SpendKV,
} from '@shimmer/core';

function fakeKV(): SpendKV & { data: Map<string, number>; ttls: Map<string, number> } {
  const data = new Map<string, number>();
  const ttls = new Map<string, number>();
  return {
    data,
    ttls,
    async incrBy(key, n) { data.set(key, (data.get(key) ?? 0) + n); return data.get(key)!; },
    async get(key) { return data.has(key) ? String(data.get(key)) : null; },
    async expire(key, s) { ttls.set(key, s); },
  };
}

describe('estimateLlmCostEUR', () => {
  it('prices a typical vendeur reply on haiku under half a centime', () => {
    const c = estimateLlmCostEUR('claude-haiku-4-5', 1500, 200);
    expect(c).toBeGreaterThan(0);
    expect(c).toBeLessThan(0.005);
  });
  it('sonnet costs more than haiku, mistral-small less', () => {
    const haiku = estimateLlmCostEUR('claude-haiku-4-5', 1500, 200);
    const sonnet = estimateLlmCostEUR('claude-sonnet-4-20250514', 1500, 200);
    const mistral = estimateLlmCostEUR('mistral-small-latest', 1500, 200);
    expect(sonnet).toBeGreaterThan(haiku);
    expect(mistral).toBeLessThan(haiku);
  });
  it('local models cost zero', () => {
    expect(estimateLlmCostEUR('qwen2.5:3b', 1500, 200)).toBe(0);
    expect(estimateLlmCostEUR('qwen2.5:7b', 99999, 9999)).toBe(0);
  });
  it('unknown models fall back to a conservative (expensive) rate', () => {
    const unknown = estimateLlmCostEUR('gpt-9-mega', 1500, 200);
    const haiku = estimateLlmCostEUR('claude-haiku-4-5', 1500, 200);
    expect(unknown).toBeGreaterThanOrEqual(haiku);
  });
});

describe('month bucketing', () => {
  it('keys spend by store and calendar month', () => {
    const d = new Date('2026-09-15T16:00:00Z');
    expect(currentMonthKey(d)).toBe('2026-09');
    expect(spendKey(4, d)).toBe('llmspend:4:2026-09');
  });
  it('a new month starts a fresh counter', async () => {
    const kv = fakeKV();
    await recordSpendIn(kv, 4, 5, new Date('2026-09-15T00:00:00Z'));
    await recordSpendIn(kv, 4, 3, new Date('2026-10-01T00:00:00Z'));
    expect(await getSpentEURFrom(kv, 4, new Date('2026-09-20T00:00:00Z'))).toBeCloseTo(5, 6);
    expect(await getSpentEURFrom(kv, 4, new Date('2026-10-02T00:00:00Z'))).toBeCloseTo(3, 6);
  });
});

describe('spend accumulation', () => {
  it('accumulates sub-centime costs without float drift', async () => {
    const kv = fakeKV();
    const now = new Date('2026-09-15T00:00:00Z');
    for (let i = 0; i < 1000; i++) await recordSpendIn(kv, 4, 0.0025, now);
    expect(await getSpentEURFrom(kv, 4, now)).toBeCloseTo(2.5, 4);
  });
  it('sets a TTL so old months clean themselves up', async () => {
    const kv = fakeKV();
    const now = new Date('2026-09-15T00:00:00Z');
    await recordSpendIn(kv, 4, 1, now);
    expect(kv.ttls.get(spendKey(4, now))).toBeGreaterThan(30 * 24 * 3600);
  });
  it('isolates stores from each other', async () => {
    const kv = fakeKV();
    const now = new Date('2026-09-15T00:00:00Z');
    await recordSpendIn(kv, 4, 9, now);
    expect(await getSpentEURFrom(kv, 5, now)).toBe(0);
  });
});

describe('isOverBudget', () => {
  it('default cap is 10 EUR', () => {
    expect(DEFAULT_LLM_BUDGET_EUR).toBe(10);
  });
  it('is false below the cap, true at or above it', () => {
    expect(isOverBudget(9.99, 10)).toBe(false);
    expect(isOverBudget(10, 10)).toBe(true);
    expect(isOverBudget(10.01, 10)).toBe(true);
  });
  it('a cap of zero disables premium entirely; null/undefined means default', () => {
    expect(isOverBudget(0.001, 0)).toBe(true);
    expect(isOverBudget(9.99, undefined)).toBe(false);
    expect(isOverBudget(10.01, undefined)).toBe(true);
  });
});
