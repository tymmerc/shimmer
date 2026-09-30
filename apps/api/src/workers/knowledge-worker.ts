/**
 * Relecture de nuit : le SAV et les avis nourrissent le vendeur.
 *
 * Chaque nuit (planifiée dans workers/index.ts, process de l'API qui a la
 * configuration de l'IA locale), chaque boutique qui a un ticket résolu ou un
 * avis publié depuis sa dernière relecture passe par ingestStoreKnowledge :
 * les objections récurrentes du SAV rejoignent le prompt du vendeur.
 */
import { Worker, type Job } from 'bullmq';
import { getPrisma, getClaude, logger } from '@shimmer/core';
import { ingestStoreKnowledge, latestKnowledgeSignals, needsReingest, type IngestSummary, type Llm } from '../lib/knowledge-ingest.js';

export interface KnowledgeJob {
  trigger: 'scheduled' | 'manual';
  /** Une seule boutique (relance manuelle) ; toutes sinon. */
  storeId?: number;
}

type Prisma = ReturnType<typeof getPrisma>;

function parseDate(raw: unknown): Date | null {
  if (typeof raw !== 'string') return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function runKnowledgeIngest(
  prisma: Prisma,
  llm: Llm,
  now: Date,
  onlyStoreId?: number,
): Promise<{ checked: number; ingested: Array<{ storeId: number } & IngestSummary> }> {
  const stores = await prisma.store.findMany({
    where: onlyStoreId ? { id: onlyStoreId } : undefined,
    select: { id: true, config: true },
  });
  const ingested: Array<{ storeId: number } & IngestSummary> = [];
  for (const s of stores) {
    const cfg = (s.config ?? {}) as Record<string, unknown>;
    const signals = await latestKnowledgeSignals(prisma, s.id);
    const lastAttemptAt = parseDate(cfg.knowledge_attempted_at) ?? parseDate(cfg.knowledge_ingested_at);
    // Sans date (effacement RGPD) mais avec des questions en place : on relit
    // quand même, pour les retirer s'il ne reste plus rien à citer.
    const hasQuestions = Array.isArray(cfg.common_objections) && cfg.common_objections.length > 0;
    const due = onlyStoreId !== undefined || needsReingest({ lastAttemptAt, ...signals }) || (lastAttemptAt === null && hasQuestions);
    if (!due) continue;
    try {
      ingested.push({ storeId: s.id, ...(await ingestStoreKnowledge(prisma, llm, s.id, now)) });
    } catch (err) {
      logger.error({ err, storeId: s.id }, 'knowledge.auto.store_failed');
    }
  }
  return { checked: stores.length, ingested };
}

export function createKnowledgeWorker(connection: { host: string; port: number }) {
  return new Worker<KnowledgeJob>(
    'knowledge-ingest',
    async (job: Job<KnowledgeJob>) => {
      logger.info({ trigger: job.data.trigger, storeId: job.data.storeId }, 'knowledge.auto.start');
      const out = await runKnowledgeIngest(getPrisma(), getClaude(), new Date(), job.data.storeId);
      logger.info(
        { trigger: job.data.trigger, checked: out.checked, ingested: out.ingested.map((r) => ({ storeId: r.storeId, objections: r.savObjectionsExtracted })) },
        'knowledge.auto.complete',
      );
    },
    // Une boutique à la fois : l'IA locale est partagée avec le vendeur.
    { connection, concurrency: 1 },
  );
}
