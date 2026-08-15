import { describe, it, expect } from 'vitest';
import { cartBucketFor, isControlCart, resolveHoldoutConfig } from '../lib/holdout/bucket.js';
import { cartRecoveryProof, type ProofCartRow } from '../lib/holdout/proof.js';

const cfg = resolveHoldoutConfig({ pct: 10 });

function cart(overrides: Partial<ProofCartRow> & { id: number }): ProofCartRow {
  return {
    storeId: 4,
    totalAmount: 60,
    recoveredAmount: null,
    recoveredAt: null,
    reminder1At: null,
    abandonedAt: new Date('2026-07-01T10:00:00Z'),
    ...overrides,
  };
}

describe('cart-level holdout bucketing', () => {
  it('is deterministic for the same cart + store', () => {
    expect(cartBucketFor(123, 4)).toBe(cartBucketFor(123, 4));
  });

  it('does not collide with the visitor bucket space semantics', () => {
    // Same numeric id as a visitor string should not be forced to the same bucket.
    const b = cartBucketFor(42, 4);
    expect(b).toBeGreaterThanOrEqual(0);
    expect(b).toBeLessThan(100);
  });

  it('holds out roughly pct of carts', () => {
    let control = 0;
    for (let i = 0; i < 10000; i++) if (isControlCart(i, 4, cfg)) control++;
    const share = control / 10000;
    expect(share).toBeGreaterThan(0.08);
    expect(share).toBeLessThan(0.12);
  });

  it('disabled config never holds a cart out', () => {
    const off = resolveHoldoutConfig({ enabled: false, pct: 10 });
    let control = 0;
    for (let i = 0; i < 1000; i++) if (isControlCart(i, 4, off)) control++;
    expect(control).toBe(0);
  });
});

describe('cart recovery proof', () => {
  it('splits carts by their deterministic bucket and counts recoveries per group', () => {
    // Build a synthetic population where treated carts recover 3x more often.
    const carts: ProofCartRow[] = [];
    for (let i = 0; i < 4000; i++) {
      const isCtl = isControlCart(i, 4, cfg);
      const recovered = isCtl ? i % 20 === 0 : i % 20 < 3; // ~5% vs ~15%
      carts.push(cart({
        id: i,
        recoveredAmount: recovered ? 60 : null,
        recoveredAt: recovered ? new Date('2026-07-01T14:00:00Z') : null,
        reminder1At: isCtl ? null : new Date('2026-07-01T11:00:00Z'),
      }));
    }
    const proof = cartRecoveryProof(carts, cfg);
    expect(proof.controlCarts + proof.treatedCarts).toBe(4000);
    expect(proof.controlCarts).toBeGreaterThan(300);
    expect(proof.treatedRecoveryRatePct).toBeGreaterThan(proof.controlRecoveryRatePct);
    expect(proof.lift.significant).toBe(true);
    expect(proof.lift.incrementalRevenueEUR).toBeGreaterThan(0);
  });

  it('does not declare significance on a handful of carts', () => {
    const carts: ProofCartRow[] = [];
    for (let i = 0; i < 30; i++) {
      const isCtl = isControlCart(i, 4, cfg);
      carts.push(cart({
        id: i,
        recoveredAmount: !isCtl && i % 5 === 0 ? 60 : null,
        recoveredAt: !isCtl && i % 5 === 0 ? new Date() : null,
      }));
    }
    const proof = cartRecoveryProof(carts, cfg);
    expect(proof.lift.significant).toBe(false);
  });

  it('counts recoveries that happened after a reminder as directly attributed', () => {
    const carts: ProofCartRow[] = [
      cart({ id: 1, reminder1At: new Date('2026-07-01T11:00:00Z'), recoveredAt: new Date('2026-07-01T12:00:00Z'), recoveredAmount: 80 }),
      cart({ id: 2, reminder1At: new Date('2026-07-01T11:00:00Z'), recoveredAt: new Date('2026-07-01T10:30:00Z'), recoveredAmount: 40 }), // recovered BEFORE reminder
      cart({ id: 3, reminder1At: null, recoveredAt: new Date('2026-07-01T12:00:00Z'), recoveredAmount: 50 }), // no reminder at all
    ];
    const proof = cartRecoveryProof(carts, cfg);
    expect(proof.recoveredAfterReminder).toBe(1);
    expect(proof.recoveredAfterReminderEUR).toBe(80);
  });

  it('handles an empty cart list without blowing up', () => {
    const proof = cartRecoveryProof([], cfg);
    expect(proof.controlCarts).toBe(0);
    expect(proof.treatedCarts).toBe(0);
    expect(proof.lift.significant).toBe(false);
  });
});

// ── Facturation : le retour de stock entre dans le CA prouvé, étiqueté ──
import { billingSummary } from '../lib/holdout/proof.js';
import type { LiftResult } from '../lib/holdout/lift.js';

const noLift: LiftResult = {
  controlVisitors: 0, treatmentVisitors: 0, controlMeanEUR: 0, treatmentMeanEUR: 0,
  absoluteLiftEUR: 0, absoluteLiftCI: [0, 0], relativeLiftPct: 0, relativeLiftCI: [0, 0],
  pUpliftAboveThreshold: 0, effectThresholdPct: 5, incrementalRevenueEUR: 0, significant: false,
};

describe('billingSummary with restock proof', () => {
  it('adds converted restock euros to the proven total, labelled retourStock', () => {
    const b = billingSummary({ vendorLift: noLift, cartLift: noLift, floorEUR: 89, ratePct: 5, capEUR: null, restockConvertedEUR: 110.5 });
    expect(b.provenIncrementalEUR).toBe(110.5);
    expect(b.modulesProven).toEqual(['retourStock']);
    expect(b.variableFeeEUR).toBe(5.53);
    expect(b.monthlyTotalEUR).toBe(94.53);
  });
  it('does not label the module when nothing converted', () => {
    const b = billingSummary({ vendorLift: noLift, cartLift: noLift, floorEUR: 89, ratePct: 5, capEUR: null, restockConvertedEUR: 0 });
    expect(b.modulesProven).toEqual([]);
    expect(b.provenIncrementalEUR).toBe(0);
  });
  it('stays backward compatible when the field is omitted', () => {
    const b = billingSummary({ vendorLift: noLift, cartLift: noLift, floorEUR: 89, ratePct: 5, capEUR: 267 });
    expect(b.provenIncrementalEUR).toBe(0);
  });
});
