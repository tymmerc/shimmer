import { describe, it, expect } from 'vitest';
import { detectOrderTrackingIntent } from '../order-tracking.js';
import { looksLikeOrderTracking } from '../../../../sdk/src/order-intent.js';

// Le SDK garde une copie de la détection : si elles divergent, la bulle
// enverrait au vendeur une question que le SAV sait traiter (ou l'inverse).
const SAMPLES = [
  'Où est ma commande ?', 'où en est mon colis', 'suivi de commande', 'numéro de suivi',
  "je n'ai toujours pas reçu ma commande", 'mon colis n’est pas arrivé', 'quand vais-je recevoir ma commande ?',
  'ma commande est-elle partie ?', 'statut de ma commande #1042', 'where is my order', 'track my parcel',
  'je veux commander du vin', 'vin pour un retour de chasse', 'délais de livraison ?', 'est-ce en stock ?',
  'je veux annuler ma commande', 'ma commande est arrivée cassée', 'la livraison est offerte à partir de combien ?',
  'Bonjour', '', 'LIVRAISON DE MA COMMANDE QUAND ???',
  'où se trouve ma commande', 'ma commande est en retard', 'mon colis est bloqué', 'has my order shipped',
  "my parcel hasn't arrived", 'quand est-ce que la livraison est offerte ?', "j'ai un souci quand je valide ma commande",
  'quand est-ce que ma commande sera livrée', 'le colis est parti ?', 'mes colis sont partis ?',
];

// Les deux copies doivent aussi avoir exactement les mêmes motifs.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
function patternsBlock(path: string): string {
  const src = readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8');
  return src.slice(src.indexOf('const NOUN'), src.indexOf('export function', src.indexOf('const TRACKING_VERB')));
}
describe('SDK order intent source', () => {
  it('has the same patterns as the server', () => {
    const server = patternsBlock('../order-tracking.ts');
    const sdk = patternsBlock('../../../../sdk/src/order-intent.ts');
    const strip = (x: string) => x.replace(/\/\*\*[\s\S]*?\*\/|\/\/.*$/gm, '').replace(/\s+/g, ' ').trim();
    expect(strip(sdk)).toBe(strip(server));
  });
});

describe('SDK order intent mirror', () => {
  it.each(SAMPLES)('agrees with the server on "%s"', (msg) => {
    expect(looksLikeOrderTracking(msg)).toBe(detectOrderTrackingIntent(msg));
  });
});
