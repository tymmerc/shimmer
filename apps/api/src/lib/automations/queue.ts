/**
 * BullMQ-backed automation queue.
 *
 * The queue holds *delayed* jobs that fire at the exact moment they're due
 * (cart abandoned + 1h, order delivered + 48h, etc.). Redis stores the
 * schedule across API restarts. No polling.
 *
 * Job names + payloads:
 *   - 'cart-reminder'        → { cartId: number, step: 1 | 2 }
 *   - 'review-request'       → { reviewRequestId: number }
 *   - 'sav-escalation-check' → { ticketId: number }
 *   - 'outbound-publish'     → { campaignId: number }
 *   - 'mail-to-sav'          → { mailId: number }
 *
 * Each job is idempotent on its own conditions (e.g. cart-reminder only sends
 * if reminder[step]At is still null and cart not recovered) so duplicate
 * enqueues are safe.
 */

import { Queue, Worker, type ConnectionOptions } from 'bullmq';
import { logger } from '@shimmer/core';
import { processCartReminderJob } from './cart-reminders.js';
import { processReviewRequestJob } from './review-requests.js';
import { processSavEscalationJob } from './sav-escalation.js';
import { processOutboundPublishJob } from './outbound-publish.js';
import { processMailToSavJob } from './mail-to-sav.js';

export const AUTOMATIONS_QUEUE = 'shimmer-automations';

export type AutomationJob =
  | { name: 'cart-reminder'; data: { cartId: number; step: 1 | 2 } }
  | { name: 'review-request'; data: { reviewRequestId: number } }
  | { name: 'sav-escalation-check'; data: { ticketId: number } }
  | { name: 'outbound-publish'; data: { campaignId: number } }
  | { name: 'mail-to-sav'; data: { mailId: number } };

let queue: Queue | null = null;

export function openAutomationsQueue(connection: ConnectionOptions): Queue {
  if (queue) return queue;
  queue = new Queue(AUTOMATIONS_QUEUE, { connection });
  logger.info({ queue: AUTOMATIONS_QUEUE }, 'automations.queue.opened');
  return queue;
}

export async function closeAutomationsQueue(): Promise<void> {
  if (queue) {
    await queue.close();
    queue = null;
  }
}

export function getAutomationsQueue(): Queue {
  if (!queue) {
    throw new Error('Automations queue not opened. Call openAutomationsQueue() first.');
  }
  return queue;
}

// ─────────────────────────────────────────────────────────────
// Public enqueue helpers (used by route handlers on real events)
// ─────────────────────────────────────────────────────────────

const ONE_HOUR_MS = 60 * 60 * 1000;
const ONE_DAY_MS = 24 * ONE_HOUR_MS;

// Failed jobs are kept for 7 days (and up to 1000) instead of rolling off at
// 50. This is the dead-letter window: an operator can inspect why a cart
// reminder or review request never went out, and replay it, for a full week.
const KEEP_FAILED = { age: 7 * 24 * 60 * 60, count: 1000 } as const;
// Completed jobs: keep a small recent trail for debugging rather than dropping
// instantly, but don't let them accumulate.
const KEEP_COMPLETED = { age: 24 * 60 * 60, count: 200 } as const;

export async function enqueueCartReminders(cartId: number): Promise<void> {
  const q = getAutomationsQueue();
  await q.add('cart-reminder', { cartId, step: 1 }, {
    delay: ONE_HOUR_MS,
    jobId: `cart-reminder-${cartId}-1`,
    removeOnComplete: KEEP_COMPLETED,
    removeOnFail: KEEP_FAILED,
    attempts: 3,
    backoff: { type: 'exponential', delay: 60_000 },
  });
  await q.add('cart-reminder', { cartId, step: 2 }, {
    delay: ONE_DAY_MS,
    jobId: `cart-reminder-${cartId}-2`,
    removeOnComplete: KEEP_COMPLETED,
    removeOnFail: KEEP_FAILED,
    attempts: 3,
    backoff: { type: 'exponential', delay: 60_000 },
  });
}

export async function enqueueReviewRequest(reviewRequestId: number, scheduledAt: Date): Promise<void> {
  const q = getAutomationsQueue();
  const delay = Math.max(0, scheduledAt.getTime() - Date.now());
  await q.add('review-request', { reviewRequestId }, {
    delay,
    jobId: `review-request-${reviewRequestId}`,
    removeOnComplete: KEEP_COMPLETED,
    removeOnFail: KEEP_FAILED,
    attempts: 3,
    backoff: { type: 'exponential', delay: 60_000 },
  });
}

export async function enqueueSavEscalationCheck(ticketId: number): Promise<void> {
  const q = getAutomationsQueue();
  await q.add('sav-escalation-check', { ticketId }, {
    delay: ONE_DAY_MS,
    jobId: `sav-escalation-${ticketId}`,
    removeOnComplete: KEEP_COMPLETED,
    removeOnFail: KEEP_FAILED,
    attempts: 2,
  });
}

export async function enqueueOutboundPublish(campaignId: number, scheduledAt: Date): Promise<void> {
  const q = getAutomationsQueue();
  const delay = Math.max(0, scheduledAt.getTime() - Date.now());
  await q.add('outbound-publish', { campaignId }, {
    delay,
    jobId: `outbound-publish-${campaignId}`,
    removeOnComplete: KEEP_COMPLETED,
    removeOnFail: KEEP_FAILED,
    attempts: 3,
    backoff: { type: 'exponential', delay: 5 * 60_000 },
  });
}

export async function enqueueMailToSav(mailId: number): Promise<void> {
  const q = getAutomationsQueue();
  await q.add('mail-to-sav', { mailId }, {
    jobId: `mail-to-sav-${mailId}`,
    removeOnComplete: KEEP_COMPLETED,
    removeOnFail: KEEP_FAILED,
    attempts: 2,
  });
}

// ─────────────────────────────────────────────────────────────
// Observability
// ─────────────────────────────────────────────────────────────

export interface QueueHealth {
  counts: { waiting: number; active: number; delayed: number; completed: number; failed: number };
  failures: Array<{ id?: string; name: string; data: unknown; failedReason?: string; attemptsMade: number; finishedOn?: number }>;
}

/** Snapshot of the automations queue: counts + the most recent failed jobs. */
export async function getQueueHealth(failedLimit = 25): Promise<QueueHealth> {
  const q = getAutomationsQueue();
  const counts = await q.getJobCounts('waiting', 'active', 'delayed', 'completed', 'failed');
  const failedJobs = await q.getJobs(['failed'], 0, failedLimit - 1, false);
  return {
    counts: {
      waiting: counts.waiting ?? 0,
      active: counts.active ?? 0,
      delayed: counts.delayed ?? 0,
      completed: counts.completed ?? 0,
      failed: counts.failed ?? 0,
    },
    failures: failedJobs.map(j => ({
      id: j.id,
      name: j.name,
      data: j.data,
      failedReason: j.failedReason,
      attemptsMade: j.attemptsMade,
      finishedOn: j.finishedOn,
    })),
  };
}

// ─────────────────────────────────────────────────────────────
// Worker
// ─────────────────────────────────────────────────────────────

export function createAutomationsWorker(connection: ConnectionOptions): Worker {
  const worker = new Worker(
    AUTOMATIONS_QUEUE,
    async (job) => {
      switch (job.name) {
        case 'cart-reminder':
          return processCartReminderJob(job.data as { cartId: number; step: 1 | 2 });
        case 'review-request':
          return processReviewRequestJob(job.data as { reviewRequestId: number });
        case 'sav-escalation-check':
          return processSavEscalationJob(job.data as { ticketId: number });
        case 'outbound-publish':
          return processOutboundPublishJob(job.data as { campaignId: number });
        case 'mail-to-sav':
          return processMailToSavJob(job.data as { mailId: number });
        default:
          throw new Error(`Unknown automation job: ${job.name}`);
      }
    },
    { connection, concurrency: 4 },
  );

  worker.on('failed', (job, err) => {
    logger.warn({ jobName: job?.name, jobId: job?.id, attempt: job?.attemptsMade, err: err.message }, 'automation.job.failed');
  });
  worker.on('completed', (job) => {
    logger.info({ jobName: job.name, jobId: job.id }, 'automation.job.completed');
  });

  return worker;
}
