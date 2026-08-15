import { describe, it, expect } from 'vitest';
import { scrubPII, hasResidualPII } from '../lib/scrub-pii.js';

describe('PII scrubber (RGPD-by-design)', () => {
  it('strips emails', () => {
    const r = scrubPII('Contact: alice@example.com pour info.');
    expect(r.text).not.toMatch(/alice@example/);
    expect(r.text).toContain('[email]');
    expect(r.hits.find(h => h.kind === 'email')?.count).toBe(1);
  });

  it('strips French phone numbers in common formats', () => {
    const r = scrubPII('Appelle 06 12 34 56 78 ou +33 6 12 34 56 78');
    expect(r.text).not.toMatch(/\d{2} \d{2} \d{2}/);
    expect(r.hits.find(h => h.kind === 'phone')?.count).toBeGreaterThanOrEqual(1);
  });

  it('strips known customer names against the merchant roster', () => {
    const r = scrubPII('Pierre Martin était content, Pierre a recommandé à Sophie.', {
      customerNames: ['Pierre Martin', 'Sophie Durand'],
    });
    expect(r.text).not.toMatch(/Pierre/i);
    expect(r.text).not.toMatch(/Sophie/i);
    expect(r.text).not.toMatch(/Martin/i);
  });

  it('does not strip an unknown name (we only know what the merchant knows)', () => {
    const r = scrubPII('Henri Maire est une marque.', { customerNames: ['Sophie'] });
    expect(r.text).toContain('Henri');
  });

  it('strips dates and postal codes', () => {
    const r = scrubPII('Livraison au 75011 pour le 12/04/2025.');
    expect(r.text).toContain('[cp]');
    expect(r.text).toContain('[date]');
  });

  it('hasResidualPII catches what slipped through', () => {
    expect(hasResidualPII('alice@bob.com')).toBe(true);
    expect(hasResidualPII('cette phrase est propre')).toBe(false);
  });

  it('idempotent on already-scrubbed text', () => {
    const once = scrubPII('Mail: x@y.com', { customerNames: [] });
    const twice = scrubPII(once.text, { customerNames: [] });
    expect(twice.hits.find(h => h.kind === 'email')?.count ?? 0).toBe(0);
  });
});
