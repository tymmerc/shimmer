import { describe, it, expect, vi } from 'vitest';
import { mistralChat, resolveMistralApiKey } from '../mistral.js';

// Vendeur sur Mistral (30/09) : le modèle local mettait 18 s en médiane.
const KEY = 'mk_' + 'x'.repeat(30);
const ok = (content: string) => new Response(JSON.stringify({
  model: 'mistral-small-2603', choices: [{ message: { content } }], usage: { prompt_tokens: 1400, completion_tokens: 90 },
}), { status: 200 });

describe('resolveMistralApiKey', () => {
  it('ignore une clé absente, courte ou factice', () => {
    expect(resolveMistralApiKey('')).toBeUndefined();
    expect(resolveMistralApiKey('court')).toBeUndefined();
    expect(resolveMistralApiKey('placeholder-placeholder-123')).toBeUndefined();
    expect(resolveMistralApiKey(KEY)).toBe(KEY);
  });
});

describe('mistralChat', () => {
  it('envoie système + messages avec la clé, lit texte et tokens', async () => {
    const fetchImpl = vi.fn(async (_u: string, _init: RequestInit) => ok('Je te propose le Brouilly 2022.'));
    const r = await mistralChat({ apiKey: KEY, systemPrompt: 'Tu es vendeur.', messages: [{ role: 'user', content: 'un rouge' }], maxTokens: 300, fetchImpl: fetchImpl as unknown as typeof fetch });
    expect(r).toEqual({ text: 'Je te propose le Brouilly 2022.', model: 'mistral-small-2603', inputTokens: 1400, outputTokens: 90 });
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toMatch(/\/chat\/completions$/);
    expect((init.headers as Record<string, string>).Authorization).toBe(`Bearer ${KEY}`);
    const body = JSON.parse(init.body as string);
    expect(body.max_tokens).toBe(300);
    expect(body.messages).toEqual([{ role: 'system', content: 'Tu es vendeur.' }, { role: 'user', content: 'un rouge' }]);
  });
  it('réessaie sur 429, pas sur 401', async () => {
    const retry = vi.fn().mockResolvedValueOnce(new Response('{}', { status: 429 })).mockResolvedValueOnce(ok('ok'));
    expect((await mistralChat({ apiKey: KEY, messages: [], fetchImpl: retry as unknown as typeof fetch })).text).toBe('ok');
    const denied = vi.fn(async () => new Response('{"message":"Unauthorized"}', { status: 401 }));
    await expect(mistralChat({ apiKey: KEY, messages: [], fetchImpl: denied as unknown as typeof fetch })).rejects.toThrow('HTTP 401');
    expect(denied).toHaveBeenCalledTimes(1);
  });
  it('tient l\'échéance : coupe l\'appel au-delà du délai', async () => {
    const hang = vi.fn((_u: string, init: RequestInit) => new Promise<Response>((_, reject) => {
      init.signal?.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })));
    }));
    const t0 = Date.now();
    await expect(mistralChat({ apiKey: KEY, messages: [], timeout: 150, maxRetries: 3, fetchImpl: hang as unknown as typeof fetch })).rejects.toThrow('timeout');
    expect(Date.now() - t0).toBeLessThan(1000);
  });
});
