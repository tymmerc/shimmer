/**
 * Filet de rattrapage des automatisations, toutes les 15 min.
 *
 * Les relances, demandes d'avis, escalades SAV et publications sont des jobs
 * posés au moment de l'événement (queue.ts). Un job perdu (redémarrage, Redis
 * vidé, données importées sans événement) ne repartait jamais : le 30/09,
 * 10 actions étaient dues sans job. Ce passage reprend tout ce qui est dû.
 * runAutomationTick est idempotent (chaque balayage ne prend que ce qui est
 * dû et non fait).
 */

import { Worker } from 'bullmq';
import { logger } from '@shimmer/core';
import { runAutomationTick, setLastReport } from '../lib/automations/tick.js';

export const AUTOMATION_SWEEP_QUEUE = 'automation-sweep';
export const AUTOMATION_SWEEP_EVERY_MS = 15 * 60_000;

export function createAutomationSweepWorker(connection: { host: string; port: number }): Worker {
  return new Worker(
    AUTOMATION_SWEEP_QUEUE,
    async () => {
      const report = await runAutomationTick();
      setLastReport(report);
      logger.info({ durationMs: report.durationMs }, 'automation.sweep.done');
    },
    { connection, concurrency: 1 },
  );
}
