/**
 * HTTP request logging middleware (pino-http).
 *
 * Credential headers (Authorization, cookies, webhook signatures) are redacted
 * by the core logger config, which pino-http's child logger inherits. Don't
 * pass a `redact` option here: it would replace that list, not extend it.
 */

import { pinoHttp } from 'pino-http';
import { logger } from '@shimmer/core';

export function createHttpLogger(baseLogger: typeof logger = logger) {
  return pinoHttp({ logger: baseLogger });
}
