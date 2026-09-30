import { describe, it, expect } from 'vitest';
import { runKnowledgeIngest } from '../workers/knowledge-worker.js';

// Relecture de nuit : seules les boutiques qui ont un ticket résolu ou un avis
// publié depuis leur dernière relecture passent par l'IA.
describe('runKnowledgeIngest', () => {
  it('ne relit que les boutiques qui ont du nouveau', async () => {
    const ingested: number[] = [];
    const stores = [
      { id: 1, config: { knowledge_ingested_at: '2026-09-29T01:30:00.000Z' } }, // rien de neuf
      { id: 4, config: { knowledge_ingested_at: '2026-05-28T08:29:00.000Z' } }, // tickets depuis
      { id: 9, config: { common_objections: ['Question ?'] } }, // effacement RGPD : dates retirées, plus aucun ticket
    ];
    const prisma = {
      store: {
        findMany: async () => stores,
        findUnique: async ({ where }: { where: { id: number } }) => stores.find(s => s.id === where.id),
        update: async () => ({}),
      },
      savRequest: {
        aggregate: async ({ where }: { where: { storeId: number } }) =>
          ({ _max: { resolvedAt: where.storeId === 9 ? null : where.storeId === 4 ? new Date('2026-08-12T10:00:00Z') : new Date('2026-09-01T10:00:00Z'), createdAt: null } }),
        findMany: async ({ where }: { where: { storeId: number } }) => { ingested.push(where.storeId); return []; },
      },
      review: { aggregate: async () => ({ _max: { createdAt: null, moderatedAt: null } }), findMany: async () => [] },
      customer: { findMany: async () => [] },
      order: { findMany: async () => [] },
      knowledgeChunk: { deleteMany: async () => ({ count: 0 }), create: async () => ({}) },
      $transaction: async (ops: Array<Promise<unknown>>) => Promise.all(ops),
      $executeRaw: async () => 1,
    };
    const out = await runKnowledgeIngest(prisma as never, { complete: async () => '' }, new Date('2026-09-30T01:30:00Z'));
    expect(out.checked).toBe(3);
    expect(out.ingested.map(r => r.storeId)).toEqual([4, 9]);
    expect(ingested).toEqual([4, 9]);
  });
});
