import { describe, it, expect } from 'vitest';
import { isBlockedRecipient, maskEmail } from '../index.js';

// Les données de démo (example.com, test.com) ne doivent jamais recevoir de
// vrai e-mail le jour où un fournisseur est branché.
describe('isBlockedRecipient', () => {
  it('bloque les domaines d\'exemple et de test', () => {
    for (const a of ['a@example.com', 'b@cave.example.com', 'c@example.org', 'd@test.com', 'e@shop.test', 'f@x.invalid', ' g@EXAMPLE.COM ']) expect(isBlockedRecipient(a)).toBe(true);
  });
  it('bloque les formats détournés', () => {
    for (const a of ['Jean <a@test.com>', 'a@test.com.', 'a@test.com, b@gmail.com', 'a@localhost', 'a@test']) expect(isBlockedRecipient(a)).toBe(true);
  });
  it('laisse passer les vraies adresses', () => {
    for (const a of ['tym@gmail.com', 'contact@brouillon.store', 'x@latest.com', 'y@contest.fr', 'z@example.fr']) expect(isBlockedRecipient(a)).toBe(false);
  });
});

describe('maskEmail', () => {
  it('garde la première lettre et le domaine', () => {
    expect(maskEmail('visiteur6@example.com')).toBe('v***@example.com');
    expect(maskEmail('pas-une-adresse')).toBe('***');
  });
});
