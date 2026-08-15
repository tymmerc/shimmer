import { describe, it, expect } from 'vitest';
import crypto from 'crypto';

// Mirror of the HMAC verify in webhooks-shopify.ts
function verifyHmac(secret: string | undefined, signature: string | undefined, body: Buffer): boolean {
  if (!secret) return true;
  if (!signature || !body) return false;
  const computed = crypto.createHmac('sha256', secret).update(body).digest('base64');
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(computed));
  } catch {
    return false;
  }
}

describe('Shopify HMAC verification', () => {
  const secret = 'test-shared-secret';
  const body = Buffer.from(JSON.stringify({ id: 1, email: 'foo@bar.com' }));

  it('accepts a correct signature', () => {
    const sig = crypto.createHmac('sha256', secret).update(body).digest('base64');
    expect(verifyHmac(secret, sig, body)).toBe(true);
  });

  it('rejects a tampered body', () => {
    const sig = crypto.createHmac('sha256', secret).update(body).digest('base64');
    const tampered = Buffer.from(JSON.stringify({ id: 999 }));
    expect(verifyHmac(secret, sig, tampered)).toBe(false);
  });

  it('rejects an empty signature', () => {
    expect(verifyHmac(secret, undefined, body)).toBe(false);
  });

  it('skips verification in demo mode (no secret configured)', () => {
    expect(verifyHmac(undefined, undefined, body)).toBe(true);
  });
});
