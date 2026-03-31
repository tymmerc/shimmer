/**
 * Embedding client — HTTP calls to the ONNX sidecar with Redis cache.
 */

import { getRedis, logger } from '@shimmer/core';
import type { EmbeddingResponse } from '@shimmer/core';

const SIDECAR_URL = process.env.EMBEDDING_URL || 'http://localhost:8100';
const CACHE_TTL = 3600; // 1 hour
const CACHE_PREFIX = 'emb:';

export async function embed(
  texts: string[],
  prefix = 'query: ',
): Promise<number[][]> {
  if (texts.length === 0) return [];

  const redis = getRedis();
  const results: (number[] | null)[] = new Array(texts.length).fill(null);
  const uncached: { index: number; text: string }[] = [];

  // Check cache
  const cacheKeys = texts.map((t) => `${CACHE_PREFIX}${hashText(prefix + t)}`);
  const cached = await redis.mget(...cacheKeys);

  for (let i = 0; i < texts.length; i++) {
    if (cached[i]) {
      results[i] = JSON.parse(cached[i]!);
    } else {
      uncached.push({ index: i, text: texts[i]! });
    }
  }

  // Fetch uncached from sidecar
  if (uncached.length > 0) {
    const response = await fetchEmbeddings(
      uncached.map((u) => u.text),
      prefix,
    );

    // Store in cache and results
    const pipeline = redis.pipeline();
    for (let i = 0; i < uncached.length; i++) {
      const embedding = response.embeddings[i]!;
      results[uncached[i]!.index] = embedding;
      pipeline.setex(
        cacheKeys[uncached[i]!.index]!,
        CACHE_TTL,
        JSON.stringify(embedding),
      );
    }
    await pipeline.exec();
  }

  return results as number[][];
}

async function fetchEmbeddings(
  texts: string[],
  prefix: string,
): Promise<EmbeddingResponse> {
  const res = await fetch(`${SIDECAR_URL}/embed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ texts, prefix }),
  });

  if (!res.ok) {
    const body = await res.text();
    logger.error({ status: res.status, body }, 'embedding.sidecar.error');
    throw new Error(`Embedding sidecar error: ${res.status}`);
  }

  return res.json() as Promise<EmbeddingResponse>;
}

function hashText(text: string): string {
  // Simple FNV-1a hash for cache keys
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  return hash.toString(36);
}

export async function healthCheck(): Promise<boolean> {
  try {
    const res = await fetch(`${SIDECAR_URL}/health`);
    const data = (await res.json()) as { status: string };
    return data.status === 'ok';
  } catch {
    return false;
  }
}
