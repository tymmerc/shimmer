import { describe, it, expect } from 'vitest';
import { stripPrivateProductFields } from '../middleware/public-fields.js';

// La clé publique est lisible dans la vitrine : la recherche ne doit plus
// livrer le stock exact, les identifiants internes ni les scores d'usage.
describe('stripPrivateProductFields', () => {
  it('ne garde que les champs publics d\'un produit, à toute profondeur', () => {
    const body = {
      products: [{
        product: { id: 1, name: 'Brouilly', sku: 'B', price: '15', imageUrl: 'https://x/y.jpg', stockStatus: 'in_stock', storeId: 4, stock: 37, lowStockThreshold: 5, platformId: 2, usages: [{ score: 80 }], specs: { cepage: 'Gamay' }, createdAt: 'x', isActive: true },
        score: 0.9, matchType: 'HYBRID', usageScores: { grillades: 80 },
      }],
      sessionToken: 't',
    };
    const out = stripPrivateProductFields(body) as typeof body;
    expect(out.products[0]!.product).toEqual({ id: 1, name: 'Brouilly', sku: 'B', price: '15', imageUrl: 'https://x/y.jpg', stockStatus: 'in_stock' });
    expect(out.products[0]).not.toHaveProperty('usageScores');
    expect(out.products[0]!.score).toBe(0.9);
    expect(out.sessionToken).toBe('t');
  });
  it('ne touche pas aux objets qui ne sont pas des produits', () => {
    const body = { session: { createdAt: '2026-09-30', stock: 3 }, message: 'ok' };
    expect(stripPrivateProductFields(body)).toEqual(body);
  });
});
