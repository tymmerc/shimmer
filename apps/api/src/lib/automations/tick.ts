/**
 * Automation tick orchestrator.
 *
 * Runs all sweeps in sequence. Each sweep is isolated: an error in one does
 * not abort the others. Returns a single combined report.
 *
 * Called every 15 min by the automation-sweep scheduler (workers/index.ts,
 * safety net for lost per-entity jobs) and on demand (POST /api/automations/run).
 */

import { getRedis, logger } from '@shimmer/core';
import { sweepCartReminders } from './cart-reminders.js';
import { sweepReviewRequests } from './review-requests.js';
import { sweepSavEscalation } from './sav-escalation.js';
import { sweepOutboundPublish } from './outbound-publish.js';
import { purgeUnconfirmedStockAlerts } from '../stock-alerts.js';

export interface TickReport {
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  cartReminders: Awaited<ReturnType<typeof sweepCartReminders>> | { error: string };
  reviewRequests: Awaited<ReturnType<typeof sweepReviewRequests>> | { error: string };
  savEscalation: Awaited<ReturnType<typeof sweepSavEscalation>> | { error: string };
  outboundPublish: Awaited<ReturnType<typeof sweepOutboundPublish>> | { error: string };
  unconfirmedStockAlertsPurged: number | { error: string };
  /** Un autre passage tenait le verrou : rien n'a tourné. */
  skipped?: boolean;
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

// Un seul passage à la fois (balayage planifié et POST /api/automations/run).
const LOCK_KEY = 'automation:tick:lock';
const LOCK_TTL_S = 15 * 60;

export async function runAutomationTick(now: Date = new Date()): Promise<TickReport> {
  const startedAt = now;
  let locked = false;
  try {
    locked = (await getRedis().set(LOCK_KEY, String(process.pid), 'EX', LOCK_TTL_S, 'NX')) === 'OK';
  } catch (err) {
    // Redis indisponible : les réservations en base empêchent déjà les doubles envois.
    logger.warn({ err }, 'automation.tick.lock-unavailable');
    locked = true;
  }
  if (!locked) {
    logger.info('automation.tick.skipped-locked');
    const t = now.toISOString();
    return { startedAt: t, finishedAt: t, durationMs: 0, skipped: true } as TickReport;
  }
  try {
    return await runSweeps(startedAt);
  } finally {
    await getRedis().del(LOCK_KEY).catch(() => undefined);
  }
}

async function runSweeps(now: Date): Promise<TickReport> {
  const startedAt = now;
  logger.info('automation.tick.started');

  const cartReminders = await safeRun('cart-reminders', () => sweepCartReminders(now));
  const reviewRequests = await safeRun('review-requests', () => sweepReviewRequests(now));
  const savEscalation = await safeRun('sav-escalation', () => sweepSavEscalation(now));
  const outboundPublish = await safeRun('outbound-publish', () => sweepOutboundPublish(now));
  const unconfirmedStockAlertsPurged = await safeRun('stock-alerts-purge', () => purgeUnconfirmedStockAlerts(now));
  // Pas de relecture des mails SAV ici : elle ne sait pas qu'un mail a déjà
  // donné un ticket et en recréait un par jour pendant 7 jours. Le job posé à
  // la réception du mail (queue.ts) suffit.

  const finishedAt = new Date();
  const report: TickReport = {
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    durationMs: finishedAt.getTime() - startedAt.getTime(),
    cartReminders,
    reviewRequests,
    savEscalation,
    outboundPublish,
    unconfirmedStockAlertsPurged,
  };

  logger.info({ durationMs: report.durationMs }, 'automation.tick.finished');
  return report;
}

// The per-entity jobs are scheduled at the actual event (cart created, order
// delivered, etc.) through the BullMQ queue defined in queue.ts; this tick is
// the safety net that catches anything those jobs missed.

let lastReport: TickReport | null = null;

export function setLastReport(r: TickReport): void {
  lastReport = r;
}

export function getLastReport(): TickReport | null {
  return lastReport;
}
