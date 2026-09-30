/**
 * Mistral (La Plateforme, hébergée en Europe) pour le vendeur.
 *
 * Mesuré le 30/09 sur ce VPS sans GPU, sur 5 vrais prompts du vendeur :
 * qwen2.5:3b local = 18 s en médiane (40 s à froid), et aucun modèle local
 * plus petit n'est juste (Beaujolais avec des huîtres, épuisé présenté comme
 * disponible). Un modèle hébergé répond en 1 à 2 s pour ~0,03 centime.
 *
 * Activé seulement si MISTRAL_API_KEY est posé ; sinon rien ne change.
 */

import type { ClaudeMessage } from './types.js';

const MISTRAL_URL = process.env.MISTRAL_URL || 'https://api.mistral.ai/v1';
export const MISTRAL_MODEL = process.env.MISTRAL_MODEL || 'mistral-small-latest';

/** Clé Mistral utilisable, ou undefined (absente, factice). */
export function resolveMistralApiKey(explicit?: string): string | undefined {
  const key = explicit ?? process.env.MISTRAL_API_KEY;
  if (!key || key.includes('placeholder') || key.length < 20) return undefined;
  return key;
}

export function hasMistral(): boolean {
  return resolveMistralApiKey() !== undefined;
}

/**
 * Fournisseur des échanges en direct avec un visiteur (le vendeur) : Mistral
 * si une clé est posée, sinon celui de LLM_PROVIDER (l'IA locale).
 */
export function interactiveProvider(): 'mistral' | undefined {
  return hasMistral() ? 'mistral' : undefined;
}

export interface MistralRequest {
  apiKey: string;
  messages: ClaudeMessage[];
  systemPrompt?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
  maxRetries?: number;
  fetchImpl?: typeof fetch;
}

export interface MistralResult {
  text: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
}

const RETRYABLE = new Set([408, 429, 500, 502, 503, 504]);

export async function mistralChat(req: MistralRequest): Promise<MistralResult> {
  const {
    apiKey, messages, systemPrompt, model = MISTRAL_MODEL, temperature = 0.3,
    maxTokens = 1024, timeout = 20_000, maxRetries = 2, fetchImpl = fetch,
  } = req;
  const body = {
    model,
    temperature,
    max_tokens: maxTokens,
    messages: [
      ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ],
  };
  // Une seule échéance pour tous les essais : l'appelant a un délai à tenir.
  const deadline = Date.now() + timeout;
  let lastError: Error = new Error('mistral: no attempt');
  for (let attempt = 0; attempt < Math.max(1, maxRetries); attempt++) {
    const left = deadline - Date.now();
    if (left <= 0) break;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), left);
    try {
      const res = await fetchImpl(`${MISTRAL_URL}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (!res.ok) {
        // Le corps d'erreur peut citer la requête : on ne garde que le code.
        lastError = new Error(`mistral: HTTP ${res.status}`);
        if (!RETRYABLE.has(res.status)) throw lastError;
        // Petite pause avant de réessayer (limite de débit), dans l'échéance.
        await new Promise((r) => setTimeout(r, Math.min(400 * (attempt + 1), Math.max(0, deadline - Date.now() - 50))));
        continue;
      }
      const data = (await res.json()) as {
        model?: string;
        choices?: Array<{ message?: { content?: string | Array<{ type?: string; text?: string }> } }>;
        usage?: { prompt_tokens?: number; completion_tokens?: number };
      };
      const content = data.choices?.[0]?.message?.content;
      // Certains modèles renvoient des blocs (texte, raisonnement) : on garde le texte.
      const text = typeof content === 'string'
        ? content
        : Array.isArray(content) ? content.filter((b) => b.type === 'text' && typeof b.text === 'string').map((b) => b.text).join('') : undefined;
      if (!text) throw new Error('mistral: empty response');
      return {
        text,
        model: data.model ?? model,
        inputTokens: data.usage?.prompt_tokens ?? 0,
        outputTokens: data.usage?.completion_tokens ?? 0,
      };
    } catch (err) {
      lastError = (err as Error).name === 'AbortError' ? new Error('mistral: timeout') : (err as Error);
      if (!/HTTP (408|429|5\d\d)|timeout|fetch failed/.test(lastError.message)) throw lastError;
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError;
}
