/**
 * Vector index — hnswlib-node wrapper with disk persistence.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createHash } from 'node:crypto';
import HnswLib from 'hnswlib-node';
import { logger } from '@shimmer/core';

const { HierarchicalNSW } = HnswLib;

const DATA_DIR = process.env.INDEX_DIR || join(process.cwd(), 'data', 'indexes');
const VECTOR_FILE = 'vectors.idx';
const META_FILE = 'vectors.meta.json';
const DIMENSION = 768; // multilingual-e5-base
const EF_CONSTRUCTION = 200;
const M = 16;

interface VectorMeta {
  checksum: string;
  count: number;
  dimension: number;
  idMap: Record<number, number>; // label -> productId
}

export class VectorIndex {
  private index: InstanceType<typeof HierarchicalNSW> | null = null;
  private meta: VectorMeta | null = null;
  private idMap = new Map<number, number>(); // label -> productId
  private reverseMap = new Map<number, number>(); // productId -> label

  /**
   * Build index from product embeddings.
   * @param items Array of { id: productId, embedding: float[] }
   */
  build(items: { id: number; embedding: number[] }[]): void {
    if (items.length === 0) return;

    const dim = items[0]!.embedding.length;
    this.index = new HierarchicalNSW('cosine', dim);
    this.index.initIndex(items.length, M, EF_CONSTRUCTION);

    this.idMap.clear();
    this.reverseMap.clear();

    for (let label = 0; label < items.length; label++) {
      const item = items[label]!;
      this.index.addPoint(item.embedding, label);
      this.idMap.set(label, item.id);
      this.reverseMap.set(item.id, label);
    }

    this.index.setEf(50); // search ef
    logger.info({ count: items.length, dim }, 'vector.index.built');
  }

  /**
   * Search for nearest neighbors.
   */
  search(embedding: number[], topK = 20): { id: number; distance: number }[] {
    if (!this.index || this.idMap.size === 0) return [];

    const k = Math.min(topK, this.idMap.size);
    const result = this.index.searchKnn(embedding, k);

    return result.neighbors.map((label: number, i: number) => ({
      id: this.idMap.get(label)!,
      distance: result.distances[i]!,
    }));
  }

  /**
   * Save index to disk.
   */
  save(checksum: string): void {
    if (!this.index) return;

    mkdirSync(DATA_DIR, { recursive: true });

    const indexPath = join(DATA_DIR, VECTOR_FILE);
    const metaPath = join(DATA_DIR, META_FILE);

    this.index.writeIndexSync(indexPath);

    const meta: VectorMeta = {
      checksum,
      count: this.idMap.size,
      dimension: DIMENSION,
      idMap: Object.fromEntries(this.idMap),
    };
    writeFileSync(metaPath, JSON.stringify(meta));
    logger.info({ path: indexPath, count: meta.count }, 'vector.index.saved');
  }

  /**
   * Load index from disk if checksum matches.
   * Returns true if loaded, false if rebuild needed.
   */
  load(currentChecksum: string): boolean {
    const indexPath = join(DATA_DIR, VECTOR_FILE);
    const metaPath = join(DATA_DIR, META_FILE);

    if (!existsSync(indexPath) || !existsSync(metaPath)) {
      return false;
    }

    try {
      const meta: VectorMeta = JSON.parse(readFileSync(metaPath, 'utf-8'));

      if (meta.checksum !== currentChecksum) {
        logger.info('vector.index.checksum_mismatch — rebuild needed');
        return false;
      }

      this.index = new HierarchicalNSW('cosine', meta.dimension);
      this.index.readIndexSync(indexPath);
      this.index.setEf(50);

      this.idMap.clear();
      this.reverseMap.clear();
      for (const [label, productId] of Object.entries(meta.idMap)) {
        const l = Number(label);
        const pid = Number(productId);
        this.idMap.set(l, pid);
        this.reverseMap.set(pid, l);
      }

      this.meta = meta;
      logger.info({ count: meta.count }, 'vector.index.loaded');
      return true;
    } catch (err) {
      logger.error({ err }, 'vector.index.load.error');
      return false;
    }
  }

  get size(): number {
    return this.idMap.size;
  }
}

/**
 * Compute a checksum over product IDs + update timestamps.
 */
export function computeChecksum(
  products: { id: number; updatedAt: Date }[],
): string {
  const data = products
    .map((p) => `${p.id}:${p.updatedAt.getTime()}`)
    .sort()
    .join('|');
  return createHash('md5').update(data).digest('hex');
}
