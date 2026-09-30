import { describe, it, expect } from 'vitest';
import { isSafeKeyword, selectEnrichmentKeywords, MIN_SESSIONS, MIN_STORES, MAX_NEW_KEYWORDS } from '../workers/reindex-worker.js';

// Le réindexage plantait à chaque passage (groupBy avec un _sum vide). Relu le
// 30/09 : sa partie « scores » doublait le travail de feedback-processor (qui
// ajuste déjà le bon produit en temps réel) et touchait tous les produits d'un
// usage, toutes boutiques confondues ; elle est retirée. Reste l'enrichissement
// des mots-clés de la taxonomie (table commune à toutes les boutiques) : jamais
// une requête brute avec une donnée personnelle, seulement des tournures vues
// dans plusieurs recherches qui ont mené à un achat.

describe('isSafeKeyword', () => {
  it('accepte une tournure courte et générique', () => {
    expect(isSafeKeyword('vin rouge barbecue')).toBe(true);
    expect(isSafeKeyword("cadeau d'anniversaire")).toBe(true);
  });
  it('refuse chiffres, e-mails, longues phrases et données personnelles', () => {
    expect(isSafeKeyword('cadeau pour chloé 06 12 34 56 78')).toBe(false);
    expect(isSafeKeyword('vin pour 8 personnes')).toBe(false);
    expect(isSafeKeyword('contact@boutique.fr')).toBe(false);
    expect(isSafeKeyword('un vin rouge pas trop cher pour un barbecue')).toBe(false);
    expect(isSafeKeyword('ab')).toBe(false);
  });
});

describe('selectEnrichmentKeywords', () => {
  // Par défaut, les recherches viennent de boutiques différentes (id tournant).
  let n = 0;
  const s = (query: string, codes: string[], storeId?: number) => ({ query, mappedUsages: codes, storeId: storeId ?? (n++ % 3) + 1 });
  it('ne retient une tournure que si elle revient dans au moins MIN_SESSIONS recherches', () => {
    const sessions = [
      ...Array.from({ length: MIN_SESSIONS }, () => s('vin barbecue', ['grillades'])),
      s('rosé piscine', ['apero']),
    ];
    const out = selectEnrichmentKeywords(sessions, new Map());
    expect(out.get('grillades')).toEqual(['vin barbecue']);
    expect(out.has('apero')).toBe(false);
  });
  it('refuse une tournure qui ne vient que d\'une seule boutique', () => {
    const sessions = Array.from({ length: 10 }, () => s('vin barbecue', ['grillades'], 7));
    expect(MIN_STORES).toBe(2);
    expect(selectEnrichmentKeywords(sessions, new Map()).size).toBe(0);
  });
  it('ignore les mots-clés déjà connus et les requêtes non sûres', () => {
    const sessions = [
      ...Array.from({ length: 5 }, () => s('vin barbecue', ['grillades'])),
      ...Array.from({ length: 5 }, () => s('vin pour 8', ['grillades'])),
    ];
    const out = selectEnrichmentKeywords(sessions, new Map([['grillades', new Set(['vin barbecue'])]]));
    expect(out.size).toBe(0);
  });
  it('plafonne le nombre d\'ajouts par passage', () => {
    const letters = 'abcdefghijklmnopqrstuvwxyz';
    const sessions = Array.from({ length: MAX_NEW_KEYWORDS + 10 }, (_, i) =>
      Array.from({ length: MIN_SESSIONS }, () => s(`tournure ${letters[i % 26]}${letters[Math.floor(i / 26)]}`, ['usage'])),
    ).flat();
    const total = [...selectEnrichmentKeywords(sessions, new Map()).values()].reduce((n, l) => n + l.length, 0);
    expect(total).toBe(MAX_NEW_KEYWORDS);
  });
});
