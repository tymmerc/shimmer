/**
 * Reindex worker — enrichissement des mots-clés de la taxonomie à partir des
 * recherches qui ont mené à un achat. BullMQ repeatable job (toutes les heures).
 *
 * Historique (30/09/2026) :
 * - le job plantait à chaque passage (groupBy Prisma avec un _sum vide) ;
 * - sa partie « recalcul des scores » a été retirée : feedback-processor.ts
 *   ajuste déjà le score du bon produit en temps réel, et le recalcul appliquait
 *   en plus un bonus à TOUS les produits de l'usage, toutes boutiques confondues ;
 * - la taxonomie est commune à toutes les boutiques : on n'y ajoute qu'une
 *   tournure courte, sans chiffre ni donnée personnelle, vue dans au moins
 *   MIN_SESSIONS recherches converties venues d'au moins MIN_STORES boutiques,
 *   et au plus MAX_NEW_KEYWORDS par passage.
 *   Les journaux ne contiennent que des nombres, jamais les requêtes.
 */

import { Worker, type Job } from 'bullmq';
import { getPrisma, logger } from '@shimmer/core';
import { scrubPII } from '../lib/scrub-pii.js';

export interface ReindexJob {
  trigger: 'scheduled' | 'manual';
}

export const MIN_SESSIONS = 3;
/** La taxonomie est commune : une tournure doit venir d'au moins deux boutiques. */
export const MIN_STORES = 2;
export const MAX_NEW_KEYWORDS = 20;
const LOOKBACK_DAYS = 30;

export function createReindexWorker(connection: { host: string; port: number }) {
  return new Worker<ReindexJob>(
    'learning-reindex',
    async (job: Job<ReindexJob>) => {
      const startMs = Date.now();
      logger.info({ trigger: job.data.trigger }, 'reindex.start');
      const prisma = getPrisma();

      const enriched = await enrichTaxonomyKeywords(prisma);
      const durationMs = Date.now() - startMs;

      const store = await prisma.store.findFirst({ select: { id: true } });
      if (store) {
        await prisma.analyticsEvent.create({
          data: {
            storeId: store.id,
            eventType: 'learning.reindex',
            payload: { trigger: job.data.trigger, durationMs, keywordsEnriched: enriched } as never,
          },
        });
      }
      logger.info({ trigger: job.data.trigger, durationMs, keywordsEnriched: enriched }, 'reindex.complete');
    },
    { connection, concurrency: 1 },
  );
}

/** Tournure acceptable dans la taxonomie commune : courte, lettres seulement, aucune donnée personnelle. */
export function isSafeKeyword(q: string): boolean {
  if (q.length < 3 || q.length > 40) return false;
  if (q.split(/\s+/).length > 3) return false;
  if (!/^[\p{L}' -]+$/u.test(q)) return false;
  return scrubPII(q).hits.length === 0;
}

/**
 * Nouvelles tournures par usage : vues dans au moins MIN_SESSIONS recherches
 * converties, pas déjà connues, au plus MAX_NEW_KEYWORDS au total.
 */
export function selectEnrichmentKeywords(
  sessions: Array<{ query: string | null; mappedUsages: string[]; storeId: number }>,
  existing: Map<string, Set<string>>,
): Map<string, string[]> {
  const counts = new Map<string, Map<string, number>>();
  const stores = new Map<string, Set<number>>();
  for (const s of sessions) {
    const q = (s.query ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
    if (!isSafeKeyword(q)) continue;
    for (const code of s.mappedUsages) {
      const perCode = counts.get(code) ?? new Map<string, number>();
      perCode.set(q, (perCode.get(q) ?? 0) + 1);
      counts.set(code, perCode);
      const key = `${code}\u0000${q}`;
      stores.set(key, (stores.get(key) ?? new Set<number>()).add(s.storeId));
    }
  }
  const out = new Map<string, string[]>();
  let added = 0;
  for (const [code, perCode] of counts) {
    const known = existing.get(code) ?? new Set<string>();
    const fresh = [...perCode.entries()]
      .filter(([q, n]) => n >= MIN_SESSIONS && (stores.get(`${code}\u0000${q}`)?.size ?? 0) >= MIN_STORES && !known.has(q))
      .sort((a, b) => b[1] - a[1])
      .map(([q]) => q);
    const room = MAX_NEW_KEYWORDS - added;
    if (room <= 0) break;
    const take = fresh.slice(0, room);
    if (take.length > 0) {
      out.set(code, take);
      added += take.length;
    }
  }
  return out;
}

async function enrichTaxonomyKeywords(prisma: ReturnType<typeof getPrisma>): Promise<number> {
  const sessions = await prisma.searchSession.findMany({
    where: {
      converted: true,
      query: { not: null },
      mappedUsages: { isEmpty: false },
      createdAt: { gte: new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000) },
    },
    select: { query: true, mappedUsages: true, storeId: true },
  });
  if (sessions.length === 0) return 0;

  const codes = [...new Set(sessions.flatMap((s) => s.mappedUsages))];
  const taxonomy = await prisma.usageTaxonomy.findMany({ where: { code: { in: codes } }, select: { code: true, keywords: true } });
  const existing = new Map(taxonomy.map((t) => [t.code, new Set(t.keywords.map((k) => k.toLowerCase()))]));

  let enriched = 0;
  for (const [code, fresh] of selectEnrichmentKeywords(sessions, existing)) {
    const entry = taxonomy.find((t) => t.code === code);
    if (!entry) continue;
    await prisma.usageTaxonomy.update({ where: { code }, data: { keywords: [...entry.keywords, ...fresh] } });
    enriched += fresh.length;
    logger.debug({ usageCode: code, added: fresh.length }, 'reindex.keywords_enriched');
  }
  return enriched;
}
