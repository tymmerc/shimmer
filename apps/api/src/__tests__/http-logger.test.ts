import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { describe, it, expect, vi } from 'vitest';
import { createLogger } from '@shimmer/core';
import { createHttpLogger } from '../lib/http-logger.js';

// Fake credentials: each one must be absent from every log line.
const SECRET_KEY = 'sk_test_4f9c2a7e1b8d3c6f0a5e9b2d7c4a1f8e';
const PUBLISHABLE_KEY = 'pk_test_0b1c2d3e4f5a6b7c8d9e';
const COOKIE = 'session=cookie_value_should_not_leak';
const SHOPIFY_HMAC = 'shopify_hmac_should_not_leak==';
const WC_SIGNATURE = 'wc_signature_should_not_leak==';

function captureLogger() {
  const lines: string[] = [];
  const log = createLogger({ write: (chunk: string) => { lines.push(chunk); } });
  return { log, lines };
}

/** Send one request through createHttpLogger and return what the route saw. */
async function sendThroughHttpLogger(
  log: ReturnType<typeof createLogger>,
  headers: Record<string, string>,
): Promise<{ authSeenByRoute: string | undefined }> {
  const middleware = createHttpLogger(log);
  const server = http.createServer((req, res) => {
    middleware(req, res, () => {
      req.log.info('route.handled');
      res.setHeader('set-cookie', COOKIE);
      res.end(JSON.stringify({ authSeenByRoute: req.headers.authorization }));
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const { port } = server.address() as AddressInfo;
    const res = await fetch(`http://127.0.0.1:${port}/api/integration/status`, { headers });
    return (await res.json()) as { authSeenByRoute: string | undefined };
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

describe('HTTP request logging (secret redaction)', () => {
  it('never writes the Bearer key, cookies or webhook signatures to the log', async () => {
    const { log, lines } = captureLogger();

    const { authSeenByRoute } = await sendThroughHttpLogger(log, {
      authorization: `Bearer ${SECRET_KEY}`,
      cookie: COOKIE,
      'x-shopify-hmac-sha256': SHOPIFY_HMAC,
      'x-wc-webhook-signature': WC_SIGNATURE,
      'x-shopify-shop-domain': 'demo.myshopify.com',
    });

    await vi.waitFor(() => {
      expect(lines.some((l) => l.includes('request completed'))).toBe(true);
    });
    const output = lines.join('');
    expect(output).not.toContain('Bearer');
    expect(output).not.toContain(SECRET_KEY);
    expect(output).not.toContain(COOKIE);
    expect(output).not.toContain(SHOPIFY_HMAC);
    expect(output).not.toContain(WC_SIGNATURE);

    const completed = JSON.parse(lines.find((l) => l.includes('request completed'))!);
    expect(completed.req.headers.authorization).toBe('[redacted]');
    expect(completed.req.headers.cookie).toBe('[redacted]');
    expect(completed.req.headers['x-shopify-hmac-sha256']).toBe('[redacted]');
    expect(completed.req.headers['x-wc-webhook-signature']).toBe('[redacted]');
    expect(completed.res.headers['set-cookie']).toBe('[redacted]');
    // Non-sensitive headers stay useful for debugging.
    expect(completed.req.headers['x-shopify-shop-domain']).toBe('demo.myshopify.com');

    // req.log (used inside routes) carries the same redacted req binding.
    const routeLine = JSON.parse(lines.find((l) => l.includes('route.handled'))!);
    expect(routeLine.req.headers.authorization).toBe('[redacted]');

    // Redaction only touches the log copy: auth middleware still sees the key.
    expect(authSeenByRoute).toBe(`Bearer ${SECRET_KEY}`);
  });

  it('redacts publishable keys too', async () => {
    const { log, lines } = captureLogger();

    await sendThroughHttpLogger(log, { authorization: `Bearer ${PUBLISHABLE_KEY}` });

    await vi.waitFor(() => {
      expect(lines.some((l) => l.includes('request completed'))).toBe(true);
    });
    expect(lines.join('')).not.toContain(PUBLISHABLE_KEY);
  });

  it('applies to direct logger calls that include a req object', () => {
    const { log, lines } = captureLogger();

    log.warn({ req: { headers: { authorization: `Bearer ${SECRET_KEY}` } } }, 'manual');

    expect(lines.join('')).not.toContain(SECRET_KEY);
    expect(JSON.parse(lines[0]).req.headers.authorization).toBe('[redacted]');
  });
});
