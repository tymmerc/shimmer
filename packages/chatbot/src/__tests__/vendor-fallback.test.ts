import { describe, it, expect } from 'vitest';
import { fallbackReply, VENDOR_LLM_DEADLINE_MS } from '../sales-assistant.js';

// Le vendeur attendait le modèle jusqu'à 120 s, 3 fois. Désormais, passé
// l'échéance, le code répond seul avec les meilleurs produits en stock.
const p = (name: string, price: number, stock = 5) => ({ product: { name, price, stock, stockStatus: stock > 0 ? 'in_stock' : 'out_of_stock' } });

describe('fallbackReply', () => {
  it('nomme les deux meilleurs produits en stock avec leur prix', () => {
    const r = fallbackReply([p('Gevrey-Chambertin 2020', 48, 0), p('Brouilly 2022', 15), p('Corbières 2022', 12.5), p('Médoc 2020', 17)], 'tu');
    expect(r).toBe("Je te propose Brouilly 2022 (15 €) ou Corbières 2022 (12,50 €). Dis-m'en un peu plus (occasion, budget) et j'affine.");
  });
  it('vouvoie quand la boutique vouvoie', () => {
    expect(fallbackReply([p('Brouilly 2022', 15)], 'vous')).toMatch(/^Je vous propose Brouilly 2022 \(15 €\)\. Dites-m'en/);
  });
  it('rien en stock : demande une précision au lieu d\'un « réessayez »', () => {
    expect(fallbackReply([p('Gevrey-Chambertin 2020', 48, 0)], 'tu')).toMatch(/Dis-m'en un peu plus/);
    expect(fallbackReply([], 'vous')).not.toMatch(/Réessayez/);
  });
  it('échéance courte par défaut', () => {
    expect(VENDOR_LLM_DEADLINE_MS).toBeLessThanOrEqual(20_000);
  });
});
