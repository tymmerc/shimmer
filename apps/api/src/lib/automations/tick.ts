/**
 * Automation tick orchestrator.
 *
 * Runs all sweeps in sequence. Each sweep is isolated: an error in one does
 * not abort the others. Returns a single combined report.
 *
 * Called periodically (setInterval from workers/index.ts) and on demand
 * (POST /api/automations/run for ops).
 */

import { logger } from '@shimmer/core';
import { sweepCartReminders } from './cart-reminders.js';
import { sweepReviewRequests } from './review-requests.js';
import { sweepSavEscalation } from './sav-escalation.js';
import { sweepOutboundPublish } from './outbound-publish.js';
import { sweepMailToSav } from './mail-to-sav.js';

export interface TickReport {
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  cartReminders: Awaited<ReturnType<typeof sweepCartReminders>> | { error: string };
  reviewRequests: Awaited<ReturnType<typeof sweepReviewRequests>> | { error: string };
  savEscalation: Awaited<ReturnType<typeof sweepSavEscalation>> | { error: string };
  outboundPublish: Awaited<ReturnType<typeof sweepOutboundPublish>> | { error: string };
  mailToSav: Awaited<ReturnType<typeof sweepMailToSav>> | { error: string };
}

async function safeRun<T>(name: string, fn: () => Promise<T>): Promise<T | { error: string }> {
  try {
    return await fn();
  } catch (err) {
    const message = (err as Error).message ?? String(err);
    logger.warn({ err, sweep: name }, 'automation.sweep.failed');
    return { error: message };
  }
}

export async function runAutomationTick(now: Date = new Date()): Promise<TickReport> {
  const startedAt = now;
  logger.info('automation.tick.started');

  const cartReminders = await safeRun('cart-reminders', () => sweepCartReminders(now));
  const reviewRequests = await safeRun('review-requests', () => sweepReviewRequests(now));
  const savEscalation = await safeRun('sav-escalation', () => sweepSavEscalation(now));
  const outboundPublish = await safeRun('outbound-publish', () => sweepOutboundPublish(now));
  const mailToSav = await safeRun('mail-to-sav', () => sweepMailToSav(now));

  const finishedAt = new Date();
  const report: TickReport = {
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    durationMs: finishedAt.getTime() - startedAt.getTime(),
    cartReminders,
    reviewRequests,
    savEscalation,
    outboundPublish,
    mailToSav,
  };

  logger.info({ durationMs: report.durationMs }, 'automation.tick.finished');
  return report;
}

// runAutomationTick is kept as a manual backfill tool, invoked via
// POST /api/automations/run. There is no background timer — the per-entity
// jobs are scheduled at the actual event (cart created, order delivered, etc.)
// through the BullMQ queue defined in queue.ts.

let lastReport: TickReport | null = null;

export function setLastReport(r: TickReport): void {
  lastReport = r;
}

export function getLastReport(): TickReport | null {
  return lastReport;
}
