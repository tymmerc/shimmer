/**
 * "Où est ma commande ?" côté navigateur : décide si la bulle de chat envoie
 * le message au SAV (suivi de commande) plutôt qu'au vendeur.
 *
 * Copie de detectOrderTrackingIntent (packages/chatbot/src/order-tracking.ts),
 * le SDK ne pouvant pas importer le paquet serveur. Un test vérifie que les
 * deux répondent pareil : packages/chatbot/src/__tests__/order-intent-sync.test.ts.
 */

function fold(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’`]/g, "'")
    .toLowerCase();
}

const NOUN = '(?:commande|colis|paquet|livraison|achat|envoi)s?';
const EXPLICIT_PATTERNS = [
  new RegExp(`\\bou\\s+(?:est|en\\s+est|sont|en\\s+sont|se\\s+trouve(?:nt)?)\\b[^?.!]{0,25}\\b${NOUN}\\b`),
  new RegExp(`\\bsuiv(?:i|re)\\b[^?.!]{0,15}\\b${NOUN}\\b`),
  new RegExp(`\\bstatut\\b[^?.!]{0,20}\\b${NOUN}\\b`),
  new RegExp(`\\betat\\s+de\\s+(?:ma|mon|mes|la|le|cette)\\s+${NOUN}\\b`),
  /\b(?:numero|lien|code)\s+de\s+suivi\b/,
  /\btracking\b/,
  /\bwhere(?:'s|\s+is)\s+my\s+(?:order|package|parcel)\b/,
  /\btrack\s+(?:my\s+)?(?:order|package|parcel)\b/,
  /\border\s+status\b/,
  /\bhas\s+my\s+(?:order|package|parcel)\s+(?:shipped|arrived|been\s+shipped)\b/,
  /\bmy\s+(?:order|package|parcel)\s+(?:hasn'?t|has\s+not|didn'?t|did\s+not|never)\b/,
];
// "ma commande", "mon colis" ; avec un article, seulement les objets suivis
// ("la commande", "le colis"), jamais "la livraison" (question générale).
const DET_NOUN = new RegExp(`\\b(?:(?:ma|mon|mes|notre|nos)\\s+${NOUN}|(?:la|le|cette)\\s+(?:commande|colis|paquet)s?)\\b`);
const MOVE = '(?:arriv|recev|recoi|recu|livr|expedi|part)';
const TRACKING_VERB = new RegExp([
  `\\bquand\\b[^?.!]{0,40}${MOVE}`,
  `${MOVE}\\w*[^?.!]{0,20}\\bquand\\b`,
  '\\bpas\\s+(?:encore\\s+)?(?:recu|arrive|livre)',
  '\\btoujours\\s+pas\\b',
  '\\bjamais\\s+(?:recu|arrive)',
  '\\brecevoir\\b',
  '\\bexpedie',
  '\\bpartie?s?\\b',
  '\\ben\\s+route\\b',
  '\\ben\\s+cours\\s+de\\s+livraison\\b',
  '\\ben\\s+retard\\b',
  '\\bbloquee?s?\\b',
].join('|'));

export function looksLikeOrderTracking(message: string): boolean {
  const m = fold(message);
  if (!m.trim()) return false;
  if (EXPLICIT_PATTERNS.some(re => re.test(m))) return true;
  return DET_NOUN.test(m) && TRACKING_VERB.test(m);
}
