import { describe, it, expect } from 'vitest';
import { isTaxonomyCacheFresh, TAXONOMY_TTL_MS } from '@shimmer/smart-search';

// Le cache de la taxonomie ne se rechargeait jamais : les mots-clés appris par
// le réindexage (autre process) n'arrivaient pas au vendeur avant un redémarrage.
describe('isTaxonomyCacheFresh', () => {
  const now = 1_000_000_000;
  it('jamais chargé : pas frais', () => {
    expect(isTaxonomyCacheFresh(0, now)).toBe(false);
  });
  it('frais avant la durée de vie, périmé après', () => {
    expect(isTaxonomyCacheFresh(now - 1000, now)).toBe(true);
    expect(isTaxonomyCacheFresh(now - TAXONOMY_TTL_MS - 1, now)).toBe(false);
  });
  it('dure 10 minutes', () => {
    expect(TAXONOMY_TTL_MS).toBe(10 * 60 * 1000);
  });
});
