export { ClaudeClient, ShimmerError, hasClaudeFallback, resolveClaudeApiKey } from './claude-client.js';
export { getPrisma, closePrisma } from './db.js';
export { getRedis, closeRedis } from './redis.js';
export { logger } from './logger.js';
export * from './types.js';

import { ClaudeClient } from './claude-client.js';

let claudeSingleton: ClaudeClient | undefined;

/** Return a shared ClaudeClient instance configured from env. */
export function getClaude(): ClaudeClient {
  if (!claudeSingleton) {
    claudeSingleton = new ClaudeClient({});
  }
  return claudeSingleton;
}
