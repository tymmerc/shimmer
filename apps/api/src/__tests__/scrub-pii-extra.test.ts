import { describe, it, expect } from 'vitest';
import { scrubPII } from '../lib/scrub-pii.js';

// Trous trouvés à la relecture du 30/09 (le SAV part maintenant vers l'IA
// chaque nuit) : accents, noms composés, commandes, suivis, adresses, téléphones étrangers.
describe('scrubPII, cas renforcés', () => {
  it('retire les noms accentués en début ou fin de mot', () => {
    const r = scrubPII('Merci José, et bonjour Éric Durand', { customerNames: ['José', 'Éric Durand'] });
    expect(r.text).not.toMatch(/José|Éric|Durand/);
  });
  it('retire un prénom composé écrit sans trait d\'union', () => {
    const r = scrubPII('Signé Jean Pierre', { customerNames: ['Jean-Pierre Martin'] });
    expect(r.text).not.toMatch(/Jean|Pierre/);
  });
  it('retire les numéros de commande de la boutique', () => {
    const r = scrubPII('Ma commande A12-3456 est en retard', { orderNumbers: ['A12-3456'] });
    expect(r.text).toBe('Ma commande [commande] est en retard');
  });
  it('retire les numéros de suivi', () => {
    expect(scrubPII('Suivi 6A12345678901 bloqué').text).not.toContain('6A12345678901');
    expect(scrubPII('Colis RB123456789FR').text).not.toContain('RB123456789FR');
  });
  it('retire les téléphones étrangers et au format 00', () => {
    expect(scrubPII('Appelez le +41 79 123 45 67').text).not.toMatch(/79 123/);
    expect(scrubPII('ou le 0033612345678').text).not.toContain('0033612345678');
  });
  it('retire la rue', () => {
    const r = scrubPII('Livré au 12 rue des Lilas, Lyon');
    expect(r.text).not.toMatch(/Lilas/);
  });
  it('laisse un texte sans donnée personnelle intact', () => {
    const t = 'Le vin est-il bio ? Livraison en combien de temps ?';
    expect(scrubPII(t, { customerNames: ['Pierre'], orderNumbers: ['A12-3456'] }).text).toBe(t);
  });
});

import { makeScrubber } from '../lib/scrub-pii.js';

describe('scrubPII, formats français et performance', () => {
  it('retire RIB espacé, carte bancaire et téléphone +33 (0)', () => {
    expect(scrubPII('IBAN FR76 3000 6000 0112 3456 7890 189').text).not.toMatch(/3000 6000/);
    expect(scrubPII('Carte 4970 1012 3456 7890').text).not.toMatch(/4970/);
    expect(scrubPII('Tél. +33 (0)6 12 34 56 78').text).not.toMatch(/12 34 56/);
  });
  it('un scrubber compilé une fois sert des milliers de textes rapidement', () => {
    const names = Array.from({ length: 3000 }, (_, i) => `Client${i}nom`);
    const orders = Array.from({ length: 5000 }, (_, i) => `A${String(i).padStart(2, '0')}-${String(i).padStart(4, '0')}`);
    const scrub = makeScrubber({ customerNames: names, orderNumbers: orders });
    const t0 = Date.now();
    for (let i = 0; i < 500; i++) scrub(`Bonjour, Client${i}nom, commande A${String(i).padStart(2, '0')}-${String(i).padStart(4, '0')} en retard`);
    expect(Date.now() - t0).toBeLessThan(1500);
    expect(scrub('Bonjour Client42nom').text).toBe('Bonjour [prenom]');
  });
});
