/**
 * Proof-by-module: per-module incremental evidence, computed on plain rows so
 * everything here is unit-testable without a database.
 *
 * Two kinds of evidence, complementary:
 *   - Causal lift (holdout comparison) — the billing-grade proof. Slow to
 *     reach significance on low traffic, but unarguable.
 *   - Direct attribution counters (cart recovered after a reminder, ticket
 *     resolved without a human) — countable from week one, feed the merchant
 *     narrative while the holdout accumulates.
 */

import { estimateLift, type LiftResult } from './lift.js';
import { isControlCart, type HoldoutConfig } from './bucket.js';

export interface ProofCartRow {
  id: number;
  storeId: number;
  totalAmount: number | { toString(): string };
  recoveredAmount: number | { toString(): string } | null;
  recoveredAt: Date | null;
  reminder1At: Date | null;
  abandonedAt: Date;
}

export interface CartRecoveryProof {
  controlCarts: number;
  treatedCarts: number;
  controlRecovered: number;
  treatedRecovered: number;
  controlRecoveryRatePct: number;
  treatedRecoveryRatePct: number;
  /** Recoveries where the order came in after reminder 1 went out. */
  recoveredAfterReminder: number;
  recoveredAfterReminderEUR: number;
  lift: LiftResult;
}

export function cartRecoveryProof(carts: ProofCartRow[], cfg: HoldoutConfig): CartRecoveryProof {
  const controlAmounts: number[] = [];
  const treatedAmounts: number[] = [];
  let controlRecovered = 0;
  let treatedRecovered = 0;
  let recoveredAfterReminder = 0;
  let recoveredAfterReminderEUR = 0;

  for (const c of carts) {
    const recoveredEUR = c.recoveredAt ? Number(c.recoveredAmount ?? 0) : 0;
    if (isControlCart(c.id, c.storeId, cfg)) {
      controlAmounts.push(recoveredEUR);
      if (c.recoveredAt) controlRecovered += 1;
    } else {
      treatedAmounts.push(recoveredEUR);
      if (c.recoveredAt) treatedRecovered += 1;
    }
    if (c.recoveredAt && c.reminder1At && c.recoveredAt > c.reminder1At) {
      recoveredAfterReminder += 1;
      recoveredAfterReminderEUR += recoveredEUR;
    }
  }

  return {
    controlCarts: controlAmounts.length,
    treatedCarts: treatedAmounts.length,
    controlRecovered,
    treatedRecovered,
    controlRecoveryRatePct: ratePct(controlRecovered, controlAmounts.length),
    treatedRecoveryRatePct: ratePct(treatedRecovered, treatedAmounts.length),
    recoveredAfterReminder,
    recoveredAfterReminderEUR: round2(recoveredAfterReminderEUR),
    lift: estimateLift(controlAmounts, treatedAmounts, cfg.effectThresholdPct),
  };
}

export interface ProofVisitorRow {
  isControl: boolean;
  revenue: number | { toString(): string };
}

export interface VendorProof {
  enrolledControl: number;
  enrolledTreated: number;
  lift: LiftResult;
}

/**
 * Vendor lift over ENROLLED visitors only (both groups enrolled on the same
 * trigger: they used the search bar). Excluding never-triggered visitors
 * removes the zero-inflation that drowns the sitewide comparison.
 */
export function vendorProof(enrolledVisitors: ProofVisitorRow[], cfg: HoldoutConfig): VendorProof {
  const control: number[] = [];
  const treated: number[] = [];
  for (const v of enrolledVisitors) {
    (v.isControl ? control : treated).push(Number(v.revenue));
  }
  return {
    enrolledControl: control.length,
    enrolledTreated: treated.length,
    lift: estimateLift(control, treated, cfg.effectThresholdPct),
  };
}

export interface BillingInput {
  vendorLift: LiftResult;
  cartLift: LiftResult;
  floorEUR: number;
  ratePct: number;
  /** null = uncapped (beta offer). */
  capEUR: number | null;
  /**
   * Retour de stock : euros des commandes passées par des inscrits prévenus
   * (preuve directe, comptée une par une, pas de groupe témoin). Entre dans le
   * CA prouvé, étiquetée `retourStock` pour que le marchand voie d'où vient
   * chaque euro.
   */
  restockConvertedEUR?: number;
}

export interface BillingSummary {
  floorEUR: number;
  ratePct: number;
  capEUR: number | null;
  provenIncrementalEUR: number;
  variableFeeEUR: number;
  monthlyTotalEUR: number;
  modulesProven: string[];
}

/** Variable fee sits on the SUM of module-level proven incrementals. */
export function billingSummary(input: BillingInput): BillingSummary {
  const modulesProven: string[] = [];
  let proven = 0;
  if (input.vendorLift.significant) {
    proven += input.vendorLift.incrementalRevenueEUR;
    modulesProven.push('vendeur');
  }
  if (input.cartLift.significant) {
    proven += input.cartLift.incrementalRevenueEUR;
    modulesProven.push('relances');
  }
  if ((input.restockConvertedEUR ?? 0) > 0) {
    proven += input.restockConvertedEUR!;
    modulesProven.push('retourStock');
  }
  const rawFee = proven * (input.ratePct / 100);
  const variableFee = input.capEUR === null ? rawFee : Math.min(Math.max(0, input.capEUR - input.floorEUR), rawFee);
  return {
    floorEUR: input.floorEUR,
    ratePct: input.ratePct,
    capEUR: input.capEUR,
    provenIncrementalEUR: round2(proven),
    variableFeeEUR: round2(variableFee),
    monthlyTotalEUR: round2(input.floorEUR + variableFee),
    modulesProven,
  };
}

function ratePct(num: number, den: number): number {
  return den > 0 ? Math.round((num / den) * 1000) / 10 : 0;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
