import { describe, it, expect } from 'vitest';
import { feedbackAllowed } from '../workers/feedback-processor.js';

// POST /api/feedback ne vérifiait pas que la recherche appartient à la boutique
// qui envoie le retour : une boutique pouvait fausser les scores d'une autre.
describe('feedbackAllowed', () => {
  it('accepte seulement un retour de la boutique propriétaire de la recherche', () => {
    expect(feedbackAllowed(4, 4)).toBe(true);
    expect(feedbackAllowed(5, 4)).toBe(false);
    expect(feedbackAllowed(undefined, 4)).toBe(false);
  });
  it('refuse un produit d\'une autre boutique', () => {
    expect(feedbackAllowed(4, 4, 4)).toBe(true);
    expect(feedbackAllowed(4, 4, 5)).toBe(false);
    expect(feedbackAllowed(4, 4, null)).toBe(false);
  });
});
