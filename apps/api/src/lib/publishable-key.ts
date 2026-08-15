/**
 * Publishable keys.
 *
 * The store's real API key (`sk_…`) is secret: it grants full access (catalog
 * import, config, analytics…) and must never appear in a storefront's page
 * source. The widget, however, runs in the visitor's browser and needs to call
 * a few endpoints (vendeur, recherche). For that we expose a *publishable* key
 * (`pk_…`) that:
 *   - is safe to embed in the page,
 *   - only unlocks the widget-facing routes (see widgetAuth),
 *   - is scoped to a single store,
 *   - cannot be reversed into the secret key.
 *
 * It is DERIVED from the store id via HMAC with a server secret, so there is no
 * DB column and no per-request table scan: the middleware recomputes the
 * expected value from the store id and compares in constant time.
 */

import crypto from 'crypto';

function pkSecret(): string {
  // Dev fallback keeps things working locally; prod must set SHIMMER_PK_SECRET.
  return process.env.SHIMMER_PK_SECRET || 'shimmer-dev-publishable-secret';
}

/** The publishable key for a store. Stable as long as SHIMMER_PK_SECRET is stable. */
export function derivePublishableKey(storeId: number): string {
  const h = crypto.createHmac('sha256', pkSecret()).update(`store:${storeId}`).digest('base64url');
  return `pk_${h.slice(0, 40)}`;
}

/** Constant-time check that `pk` is the valid publishable key for `storeId`. */
export function verifyPublishableKey(storeId: number, pk: string): boolean {
  if (!pk || !pk.startsWith('pk_')) return false;
  const expected = derivePublishableKey(storeId);
  const a = Buffer.from(pk);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
