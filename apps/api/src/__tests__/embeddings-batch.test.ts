import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchEmbeddings, SIDECAR_MAX_BATCH } from '@shimmer/smart-search';

// Le sidecar ONNX refuse plus de 64 textes par requête (« Max batch size is
// 64 ») : l'index vectoriel du catalogue (80 produits) ne se construisait
// plus au démarrage et la recherche retombait en BM25 seul.
describe('fetchEmbeddings (lots bornés pour le sidecar)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('splits a large list into batches of at most 64, in order', async () => {
    const sizes: number[] = [];
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init: { body: string }) => {
      const { texts } = JSON.parse(init.body) as { texts: string[] };
      sizes.push(texts.length);
      return new Response(JSON.stringify({ embeddings: texts.map((t) => [Number(t)]), model: 'm', dimensions: 1 }), { status: 200 });
    }));
    const texts = Array.from({ length: 150 }, (_, i) => String(i));
    const res = await fetchEmbeddings(texts, 'passage: ');
    expect(SIDECAR_MAX_BATCH).toBe(64);
    expect(sizes).toEqual([64, 64, 22]);
    expect(res.embeddings.map((e) => e[0])).toEqual(texts.map(Number));
  });

  it('keeps a single request for a small list', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ embeddings: [[1], [2]], model: 'm', dimensions: 1 }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const res = await fetchEmbeddings(['a', 'b'], 'query: ');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(res.embeddings).toEqual([[1], [2]]);
  });
});
