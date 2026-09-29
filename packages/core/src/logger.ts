import pino, { type DestinationStream } from 'pino';

const level = process.env.NODE_ENV === 'production' ? 'info' : 'debug';

/**
 * Credentials that must never reach the logs. pino-http serializes every
 * request header, so without this each request logged the store's full
 * `Bearer sk_...` key. Child loggers (pino-http's included) inherit this list
 * unless they pass their own `redact`, which would replace it.
 */
export const LOG_REDACT_PATHS: readonly string[] = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["x-shopify-hmac-sha256"]',
  'req.headers["x-wc-webhook-signature"]',
  'res.headers["set-cookie"]',
];

const redact = { paths: [...LOG_REDACT_PATHS], censor: '[redacted]' };

/**
 * Build a logger. With a destination (tests capturing output) it writes raw
 * JSON there; otherwise stdout, pretty-printed outside production.
 */
export function createLogger(destination?: DestinationStream) {
  if (destination) return pino({ level, redact }, destination);
  return pino({
    level,
    redact,
    transport: process.env.NODE_ENV !== 'production'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
  });
}

export const logger = createLogger();
