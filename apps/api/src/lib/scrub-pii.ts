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
 *   - The actual customer first/last names of THIS store (passed in)
 *
 * What we don't try to do:
 *   - Detect arbitrary first names by ML (too brittle, language-dependent,
 *     would scrub product names like "Henri Maire"). The merchant's own
 *     customer roster is the reliable signal.
 */

const EMAIL_RE = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
const PHONE_FR_RE = /(?:\+33[\s.-]?|\b0)[1-9](?:[\s.-]?\d{2}){4}\b/g;
const POSTAL_FR_RE = /\b\d{5}\b/g;
const DATE_RE = /\b\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4}\b/g;
const IBAN_RE = /\b[A-Z]{2}\d{2}[A-Z0-9]{10,30}\b/g;

export interface ScrubOptions {
  /** Known names from the store's customer roster (first + last). Case-insensitive. */
  customerNames?: string[];
}

export interface ScrubResult {
  text: string;
  hits: { kind: 'email' | 'phone' | 'postal' | 'date' | 'iban' | 'name'; count: number }[];
}

export function scrubPII(input: string, opts: ScrubOptions = {}): ScrubResult {
  let text = input;
  const counters: Record<string, number> = {};

  const replace = (re: RegExp, kind: string, replacement: string): void => {
    text = text.replace(re, (m) => {
      counters[kind] = (counters[kind] ?? 0) + 1;
      // Keep some context for readability of the scrubbed text
      return replacement;
    });
    // Reset lastIndex for safety on global re (replace already handles it).
  };

  replace(EMAIL_RE, 'email', '[email]');
  replace(PHONE_FR_RE, 'phone', '[tel]');
  replace(IBAN_RE, 'iban', '[iban]');
  replace(DATE_RE, 'date', '[date]');
  replace(POSTAL_FR_RE, 'postal', '[cp]');

  if (opts.customerNames && opts.customerNames.length > 0) {
    // Build a single alternation regex, longest-first to match full names before parts.
    const tokens = Array.from(
      new Set(
        opts.customerNames
          .flatMap(n => n.split(/\s+/))
          .map(t => t.trim())
          .filter(t => t.length >= 3),
      ),
    ).sort((a, b) => b.length - a.length);
    if (tokens.length > 0) {
      const escaped = tokens.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
      const re = new RegExp(`\\b(?:${escaped.join('|')})\\b`, 'gi');
      const before = text;
      text = text.replace(re, '[prenom]');
      const removed = (before.match(re) ?? []).length;
      if (removed > 0) counters.name = (counters.name ?? 0) + removed;
    }
  }

  const hits = Object.entries(counters).map(([kind, count]) => ({
    kind: kind as ScrubResult['hits'][number]['kind'],
    count,
  }));

  return { text, hits };
}

/** Quick boolean: does the input still contain anything that looks like PII? */
export function hasResidualPII(text: string): boolean {
  return EMAIL_RE.test(text) || PHONE_FR_RE.test(text) || IBAN_RE.test(text);
}
