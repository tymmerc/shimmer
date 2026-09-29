import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import crypto from 'crypto';
import {
  deriveCustomerIdentitySecret,
  signCustomerIdentity,
  verifyCustomerSignature,
  resolveTrustedEmail,
  identityEpoch,
  IDENTITY_MAX_AGE_S,
} from '../lib/customer-identity.js';

const env = { ...process.env };
const NOW = 1_790_000_000; // secondes
const TS = String(NOW - 60);

beforeEach(() => {
  process.env.SHIMMER_PK_SECRET = 'test-master-secret';
  delete process.env.SHIMMER_ALLOW_DEV_IDENTITY_SECRET;
});
afterEach(() => {
  process.env = { ...env };
});

describe('customer identity secret', () => {
  it('is stable per store and different between stores', () => {
    const a = deriveCustomerIdentitySecret(4);
    expect(a).toMatch(/^sid_[A-Za-z0-9_-]{40}$/);
    expect(deriveCustomerIdentitySecret(4)).toBe(a);
    expect(deriveCustomerIdentitySecret(5)).not.toBe(a);
  });

  it('changes when the store rotates its epoch', () => {
    expect(deriveCustomerIdentitySecret(4, 1)).not.toBe(deriveCustomerIdentitySecret(4, 0));
  });

  it('is not the publishable key material', () => {
    const pkLike = crypto.createHmac('sha256', 'test-master-secret').update('store:4').digest('base64url').slice(0, 40);
    expect(deriveCustomerIdentitySecret(4)).not.toContain(pkLike);
  });

  it('fails closed without a master secret, whatever NODE_ENV says', () => {
    delete process.env.SHIMMER_PK_SECRET;
    process.env.NODE_ENV = 'development';
    expect(deriveCustomerIdentitySecret(4)).toBeNull();
    expect(verifyCustomerSignature({ storeId: 4, email: 'jean@mail.fr', ts: TS, signature: 'a'.repeat(64), nowS: NOW })).toBe(false);
  });

  it('only uses the dev secret on explicit opt-in', () => {
    delete process.env.SHIMMER_PK_SECRET;
    process.env.SHIMMER_ALLOW_DEV_IDENTITY_SECRET = 'true';
    expect(deriveCustomerIdentitySecret(4)).toMatch(/^sid_/);
  });
});

describe('signature, as Shopify Liquid computes it', () => {
  it('matches {{ "email|ts" | hmac_sha256: secret }} (lowercase hex)', () => {
    const secret = deriveCustomerIdentitySecret(4)!;
    const liquid = crypto.createHmac('sha256', secret).update(`Jean@Mail.fr|${TS}`).digest('hex');
    expect(signCustomerIdentity(4, 'Jean@Mail.fr', TS)).toBe(liquid);
    expect(verifyCustomerSignature({ storeId: 4, email: 'Jean@Mail.fr', ts: TS, signature: liquid, nowS: NOW })).toBe(true);
    expect(verifyCustomerSignature({ storeId: 4, email: 'Jean@Mail.fr', ts: TS, signature: liquid.toUpperCase(), nowS: NOW })).toBe(true);
  });

  it('expires after the allowed age and refuses far-future timestamps', () => {
    const old = String(NOW - IDENTITY_MAX_AGE_S - 1);
    expect(verifyCustomerSignature({ storeId: 4, email: 'jean@mail.fr', ts: old, signature: signCustomerIdentity(4, 'jean@mail.fr', old)!, nowS: NOW })).toBe(false);
    const future = String(NOW + 3600);
    expect(verifyCustomerSignature({ storeId: 4, email: 'jean@mail.fr', ts: future, signature: signCustomerIdentity(4, 'jean@mail.fr', future)!, nowS: NOW })).toBe(false);
  });

  it('rejects another email, another store, another timestamp, an old epoch, or garbage', () => {
    const sig = signCustomerIdentity(4, 'jean@mail.fr', TS)!;
    const base = { storeId: 4, email: 'jean@mail.fr', ts: TS, signature: sig, nowS: NOW };
    expect(verifyCustomerSignature({ ...base, email: 'paul@mail.fr' })).toBe(false);
    expect(verifyCustomerSignature({ ...base, storeId: 5 })).toBe(false);
    expect(verifyCustomerSignature({ ...base, ts: String(NOW - 30) })).toBe(false);
    expect(verifyCustomerSignature({ ...base, epoch: 1 })).toBe(false);
    expect(verifyCustomerSignature({ ...base, signature: 'zz' })).toBe(false);
    expect(verifyCustomerSignature({ ...base, ts: 'abc' })).toBe(false);
  });
});

describe('resolveTrustedEmail', () => {
  it('drops an unsigned email coming from the public key (the old hole)', () => {
    expect(resolveTrustedEmail({ scope: 'publishable', storeId: 4, email: 'victim@mail.fr' })).toBeNull();
    expect(resolveTrustedEmail({ scope: 'publishable', storeId: 4, email: 'victim@mail.fr', signature: 'f'.repeat(64), ts: TS, nowS: NOW })).toBeNull();
  });

  it('drops a signature without its timestamp', () => {
    const sig = signCustomerIdentity(4, 'jean@mail.fr', TS)!;
    expect(resolveTrustedEmail({ scope: 'publishable', storeId: 4, email: 'jean@mail.fr', signature: sig, nowS: NOW })).toBeNull();
  });

  it('keeps a correctly signed email from the public key, normalised for lookup', () => {
    const sig = signCustomerIdentity(4, ' Jean@Mail.fr ', TS)!;
    expect(resolveTrustedEmail({ scope: 'publishable', storeId: 4, email: ' Jean@Mail.fr ', signature: sig, ts: TS, nowS: NOW })).toBe('jean@mail.fr');
  });

  it('trusts server-side callers holding the secret key', () => {
    expect(resolveTrustedEmail({ scope: 'secret', storeId: 4, email: 'Jean@Mail.fr' })).toBe('jean@mail.fr');
  });

  it('treats an unknown scope as public', () => {
    expect(resolveTrustedEmail({ scope: undefined, storeId: 4, email: 'jean@mail.fr' })).toBeNull();
  });

  it('returns null without email', () => {
    expect(resolveTrustedEmail({ scope: 'secret', storeId: 4 })).toBeNull();
  });
});

describe('identityEpoch', () => {
  it('reads a non-negative integer and defaults to 0', () => {
    expect(identityEpoch({ identityEpoch: 2 })).toBe(2);
    expect(identityEpoch({})).toBe(0);
    expect(identityEpoch(null)).toBe(0);
    expect(identityEpoch({ identityEpoch: -1 })).toBe(0);
    expect(identityEpoch({ identityEpoch: '3' })).toBe(0);
  });
});
