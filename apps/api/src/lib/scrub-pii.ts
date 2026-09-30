/**
 * PII scrubber. Runs on EVERY text that enters the knowledge base or the query
 * log. Conservative by design: better a false positive ("[name]") than letting
 * a real name through.
 *
 * What we strip:
 *   - Emails
 *   - French phone numbers
 *   - 5-digit postal codes (FR)
 *   - DD/MM/YYYY-ish dates
 *   - IBAN-like patterns
 *   - The actual customer first/last names of THIS store (passed in), accents
 *     included, compound names split on spaces and hyphens
 *   - This store's order numbers (passed in), parcel tracking numbers,
 *     international phones, street addresses (renforcé le 30/09/2026 : le SAV
 *     part chaque nuit vers l'IA pour nourrir le vendeur)
 *
 * What we don't try to do:
 *   - Detect arbitrary first names by ML (too brittle, language-dependent,
 *     would scrub product names like "Henri Maire"). The merchant's own
 *     customer roster is the reliable signal.
 */

const EMAIL_RE = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
const PHONE_FR_RE = /(?:\+33[\s.-]?|\b0)[1-9](?:[\s.-]?\d{2}){4}\b/g;
const PHONE_FR_PAREN_RE = /\+33\s?\(0\)\s?[1-9](?:[\s.-]?\d{2}){4}\b/g;
const POSTAL_FR_RE = /\b\d{5}\b/g;
const DATE_RE = /\b\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4}\b/g;
const IBAN_RE = /\b[A-Z]{2}\d{2}[A-Z0-9]{10,30}\b/g;
// IBAN / RIB écrit par blocs de 4 (FR76 3000 6000 ...).
const IBAN_SPACED_RE = /\b[A-Z]{2}\d{2}(?: [A-Z0-9]{4}){3,7}(?: [A-Z0-9]{1,4})?\b/g;
// Carte bancaire en blocs (4970 1012 3456 7890).
const CARD_RE = /\b\d{4}(?:[ -]\d{4}){2,3}(?:[ -]\d{1,4})?\b/g;
const PHONE_INTL_RE = /(?:\+|\b00)\d{1,3}[\s.-]?\d{1,2}(?:[\s.-]?\d{2,3}){3,5}\b/g;
// Colissimo (6A + 11 chiffres), format postal international (RB123456789FR), longs numériques.
const TRACKING_RE = /\b\d[A-Z]\d{11}\b|\b[A-Z]{2}\d{9}[A-Z]{2}\b|\b\d{12,19}\b/g;
const STREET_RE = /\b\d{1,4}\s*(?:bis|ter)?,?\s+(?:rue|avenue|av\.|boulevard|bd|chemin|all[ée]e|impasse|place|route|quai|cours)\s+[^,\n]{2,40}/giu;
// Mots (lettres et chiffres, accents compris) ; variante avec traits d'union pour les numéros de commande.
const WORD_RE = /[\p{L}\p{N}]+/gu;
const HYPHEN_TOKEN_RE = /[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*/gu;

export interface ScrubOptions {
  /** Known names from the store's customer roster (first + last). Case-insensitive. */
  customerNames?: string[];
  /** This store's order / ticket numbers (A12-3456...). Case-insensitive. */
  orderNumbers?: string[];
}

export interface ScrubResult {
  text: string;
  hits: { kind: 'email' | 'phone' | 'postal' | 'date' | 'iban' | 'name' | 'order' | 'tracking' | 'address' | 'card'; count: number }[];
}

const lower = (t: string) => t.toLocaleLowerCase('fr');

/**
 * Prépare un nettoyeur pour une boutique : les noms et les numéros de commande
 * sont rangés dans des ensembles (recherche par mot), jamais dans une regex
 * géante recompilée à chaque texte. À utiliser pour nettoyer beaucoup de textes.
 */
export function makeScrubber(opts: ScrubOptions = {}): (input: string) => ScrubResult {
  const names = new Set(
    (opts.customerNames ?? [])
      .flatMap((n) => n.split(/[\s-]+/))
      .map((t) => t.trim())
      .filter((t) => t.length >= 3)
      .map(lower),
  );
  const orders = new Set(
    (opts.orderNumbers ?? [])
      .map((t) => t.trim().replace(/^#/, ''))
      .filter((t) => t.length >= 3)
      .map(lower),
  );

  return (input: string): ScrubResult => {
    let text = input;
    const counters: Record<string, number> = {};
    const replace = (re: RegExp, kind: string, replacement: string): void => {
      text = text.replace(re, () => {
        counters[kind] = (counters[kind] ?? 0) + 1;
        return replacement;
      });
    };

    replace(EMAIL_RE, 'email', '[email]');
    replace(IBAN_SPACED_RE, 'iban', '[iban]');
    replace(IBAN_RE, 'iban', '[iban]');
    replace(CARD_RE, 'card', '[carte]');
    replace(PHONE_INTL_RE, 'phone', '[tel]');
    replace(PHONE_FR_PAREN_RE, 'phone', '[tel]');
    replace(PHONE_FR_RE, 'phone', '[tel]');
    replace(TRACKING_RE, 'tracking', '[suivi]');
    replace(DATE_RE, 'date', '[date]');
    replace(STREET_RE, 'address', '[adresse]');
    replace(POSTAL_FR_RE, 'postal', '[cp]');

    if (orders.size > 0) {
      text = text.replace(HYPHEN_TOKEN_RE, (tok) => {
        if (!orders.has(lower(tok))) return tok;
        counters.order = (counters.order ?? 0) + 1;
        return '[commande]';
      });
    }
    if (names.size > 0) {
      // Recherche par mot, frontières Unicode : « José », « Éric » et les deux
      // moitiés de « Jean-Pierre » sont reconnus.
      text = text.replace(WORD_RE, (tok) => {
        if (!names.has(lower(tok))) return tok;
        counters.name = (counters.name ?? 0) + 1;
        return '[prenom]';
      });
    }

    const hits = Object.entries(counters).map(([kind, count]) => ({
      kind: kind as ScrubResult['hits'][number]['kind'],
      count,
    }));
    return { text, hits };
  };
}

export function scrubPII(input: string, opts: ScrubOptions = {}): ScrubResult {
  return makeScrubber(opts)(input);
}

/** Quick boolean: does the input still contain anything that looks like PII? */
export function hasResidualPII(text: string): boolean {
  return new RegExp(EMAIL_RE.source).test(text) || new RegExp(PHONE_FR_RE.source).test(text) || new RegExp(IBAN_RE.source).test(text);
}
