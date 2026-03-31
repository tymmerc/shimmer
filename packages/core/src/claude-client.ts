import Anthropic from '@anthropic-ai/sdk';
import type { ClaudeMessage, ClaudeOptions, ClaudeStreamChunk } from './types.js';
import { logger } from './logger.js';

const LLM_PROVIDER = process.env.LLM_PROVIDER || 'ollama'; // 'claude' | 'ollama'
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5:3b';

const DEFAULT_MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514';
const DEFAULT_MAX_TOKENS = 4096;
const DEFAULT_TIMEOUT = 30_000;
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000];

export class ClaudeClient {
  private client: Anthropic | null = null;
  private provider: string;

  constructor(apiKey?: string) {
    this.provider = LLM_PROVIDER;

    if (this.provider === 'claude') {
      this.client = new Anthropic({
        apiKey: apiKey || process.env.CLAUDE_API_KEY,
      });
    }
  }

  async complete(
    messages: ClaudeMessage[],
    options: ClaudeOptions = {},
  ): Promise<string> {
    if (this.provider === 'ollama') {
      return this.ollamaComplete(messages, options);
    }
    return this.claudeComplete(messages, options);
  }

  async *stream(
    messages: ClaudeMessage[],
    options: ClaudeOptions = {},
  ): AsyncGenerator<ClaudeStreamChunk> {
    if (this.provider === 'ollama') {
      yield* this.ollamaStream(messages, options);
      return;
    }
    yield* this.claudeStream(messages, options);
  }

  async completeJson<T>(
    messages: ClaudeMessage[],
    options: ClaudeOptions = {},
  ): Promise<T> {
    const text = await this.complete(messages, {
      ...options,
      systemPrompt: (options.systemPrompt || '') +
        '\n\nRespond with valid JSON only. No markdown, no explanation, just the JSON object.',
    });

    const jsonMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (!jsonMatch) {
      logger.warn({ rawResponse: text.slice(0, 500) }, 'LLM returned non-JSON, wrapping as message');
      // Wrap plain-text LLM responses as a message object (small models often skip JSON)
      return { message: text.trim() } as T;
    }

    try {
      return JSON.parse(jsonMatch[0]) as T;
    } catch (parseErr) {
      // Try to fix common JSON issues from LLMs (trailing commas, unescaped newlines)
      let fixed = jsonMatch[0]
        .replace(/,\s*}/g, '}')
        .replace(/,\s*]/g, ']')
        .replace(/[\x00-\x1f]/g, (ch) => ch === '\n' ? '\\n' : ch === '\t' ? '\\t' : '');
      try {
        return JSON.parse(fixed) as T;
      } catch {
        logger.warn({ rawJson: jsonMatch[0].slice(0, 500) }, 'LLM returned invalid JSON');
        throw new ShimmerError('LLM returned invalid JSON', 'LLM_INVALID_JSON', 500);
      }
    }
  }

  // ── Ollama ────────────────────────────────────────────────────

  private async ollamaComplete(
    messages: ClaudeMessage[],
    options: ClaudeOptions = {},
  ): Promise<string> {
    const {
      model = OLLAMA_MODEL,
      maxTokens = DEFAULT_MAX_TOKENS,
      temperature = 0.3,
      systemPrompt,
      timeout = 60_000, // Ollama can be slower
      maxRetries = MAX_RETRIES,
    } = options;

    const ollamaMessages = this.buildOllamaMessages(messages, systemPrompt);

    let lastError: Error | undefined;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeout);

        const res = await fetch(`${OLLAMA_URL}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model,
            messages: ollamaMessages,
            stream: false,
            options: {
              temperature,
              num_predict: maxTokens,
            },
          }),
          signal: controller.signal,
        });

        clearTimeout(timer);

        if (!res.ok) {
          const body = await res.text();
          throw new Error(`Ollama error ${res.status}: ${body}`);
        }

        const data = (await res.json()) as {
          message: { content: string };
          eval_count?: number;
          prompt_eval_count?: number;
        };

        logger.debug({
          model,
          provider: 'ollama',
          inputTokens: data.prompt_eval_count,
          outputTokens: data.eval_count,
          attempt,
        }, 'llm.complete');

        return data.message.content;
      } catch (error) {
        lastError = error as Error;
        logger.warn({
          attempt,
          error: (error as Error).message,
          provider: 'ollama',
        }, 'llm.complete.error');

        if (attempt === maxRetries - 1) {
          throw new ShimmerError(
            `Ollama error: ${(error as Error).message}`,
            'LLM_ERROR',
            500,
          );
        }

        await this.sleep(RETRY_DELAYS[attempt]!);
      }
    }

    throw lastError;
  }

  private async *ollamaStream(
    messages: ClaudeMessage[],
    options: ClaudeOptions = {},
  ): AsyncGenerator<ClaudeStreamChunk> {
    const {
      model = OLLAMA_MODEL,
      maxTokens = DEFAULT_MAX_TOKENS,
      temperature = 0.3,
      systemPrompt,
      timeout = 60_000,
    } = options;

    const ollamaMessages = this.buildOllamaMessages(messages, systemPrompt);

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);

      const res = await fetch(`${OLLAMA_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: ollamaMessages,
          stream: true,
          options: {
            temperature,
            num_predict: maxTokens,
          },
        }),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Ollama stream error ${res.status}: ${body}`);
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const data = JSON.parse(line) as { message?: { content: string }; done: boolean };
            if (data.message?.content) {
              yield { type: 'text', text: data.message.content };
            }
          } catch {
            // skip malformed lines
          }
        }
      }

      yield { type: 'done' };
    } catch (error) {
      yield { type: 'error', error: (error as Error).message };
      throw new ShimmerError(
        `Ollama stream error: ${(error as Error).message}`,
        'LLM_ERROR',
        500,
      );
    }
  }

  private buildOllamaMessages(
    messages: ClaudeMessage[],
    systemPrompt?: string,
  ): { role: string; content: string }[] {
    const result: { role: string; content: string }[] = [];

    if (systemPrompt) {
      result.push({ role: 'system', content: systemPrompt });
    }

    for (const m of messages) {
      result.push({ role: m.role, content: m.content });
    }

    return result;
  }

  // ── Claude ────────────────────────────────────────────────────

  private async claudeComplete(
    messages: ClaudeMessage[],
    options: ClaudeOptions = {},
  ): Promise<string> {
    const {
      model = DEFAULT_MODEL,
      maxTokens = DEFAULT_MAX_TOKENS,
      temperature = 0.3,
      systemPrompt,
      timeout = DEFAULT_TIMEOUT,
    } = options;

    let lastError: Error | undefined;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const response = await this.client!.messages.create({
          model,
          max_tokens: maxTokens,
          temperature,
          system: systemPrompt,
          messages: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }, {
          timeout,
        });

        const text = response.content
          .filter((block): block is Anthropic.TextBlock => block.type === 'text')
          .map((block) => block.text)
          .join('');

        logger.debug({
          model,
          provider: 'claude',
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
          attempt,
        }, 'llm.complete');

        return text;
      } catch (error) {
        lastError = error as Error;
        const isRetryable = this.isRetryableError(error);

        logger.warn({
          attempt,
          error: (error as Error).message,
          retryable: isRetryable,
          provider: 'claude',
        }, 'llm.complete.error');

        if (!isRetryable || attempt === MAX_RETRIES - 1) {
          throw this.mapError(error);
        }

        await this.sleep(RETRY_DELAYS[attempt]!);
      }
    }

    throw lastError;
  }

  private async *claudeStream(
    messages: ClaudeMessage[],
    options: ClaudeOptions = {},
  ): AsyncGenerator<ClaudeStreamChunk> {
    const {
      model = DEFAULT_MODEL,
      maxTokens = DEFAULT_MAX_TOKENS,
      temperature = 0.3,
      systemPrompt,
      timeout = DEFAULT_TIMEOUT,
    } = options;

    try {
      const stream = this.client!.messages.stream({
        model,
        max_tokens: maxTokens,
        temperature,
        system: systemPrompt,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      }, {
        timeout,
      });

      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          yield { type: 'text', text: event.delta.text };
        }
      }

      yield { type: 'done' };
    } catch (error) {
      yield { type: 'error', error: (error as Error).message };
      throw this.mapError(error);
    }
  }

  // ── Shared ────────────────────────────────────────────────────

  private isRetryableError(error: unknown): boolean {
    if (error instanceof Anthropic.RateLimitError) return true;
    if (error instanceof Anthropic.InternalServerError) return true;
    if (error instanceof Anthropic.APIConnectionError) return true;
    return false;
  }

  private mapError(error: unknown): ShimmerError {
    if (error instanceof Anthropic.RateLimitError) {
      return new ShimmerError('Claude API rate limit exceeded', 'CLAUDE_RATE_LIMIT', 429);
    }
    if (error instanceof Anthropic.AuthenticationError) {
      return new ShimmerError('Invalid Claude API key', 'CLAUDE_AUTH_ERROR', 401);
    }
    if (error instanceof Anthropic.BadRequestError) {
      return new ShimmerError(`Claude bad request: ${error.message}`, 'CLAUDE_BAD_REQUEST', 400);
    }
    return new ShimmerError(
      `Claude API error: ${(error as Error).message}`,
      'CLAUDE_ERROR',
      500,
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export class ShimmerError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'ShimmerError';
  }
}
