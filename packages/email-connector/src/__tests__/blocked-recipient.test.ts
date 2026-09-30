import { describe, it, expect } from 'vitest';
import { isBlockedRecipient } from '../index.js';

// Les données de démo (example.com, test.com) ne doivent jamais recevoir de
// vrai e-mail le jour où un fournisseur est branché.
describe('isBlockedRecipient', () => {
  it('bloque les domaines d\'exemple et de test', () => {
    for (const a of ['a@example.com', 'b@cave.example.com', 'c@example.org', 'd@test.com', 'e@shop.test', 'f@x.invalid', ' g@EXAMPLE.COM ']) expect(isBlockedRecipient(a)).toBe(true);
  });
  it('laisse passer les vraies adresses', () => {
    for (const a of ['tym@gmail.com', 'contact@brouillon.store', 'x@latest.com', 'y@contest.fr', 'z@example.fr']) expect(isBlockedRecipient(a)).toBe(false);
  });
});
