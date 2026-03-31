/**
 * Search type detection — routes queries to exact, functional, similarity, or hybrid.
 * Fuzzy matching: levenshtein × 0.4 + jaro-winkler × 0.3 + phonetic × 0.2 + ngram × 0.1
 */

import { distance as levenshtein } from 'fastest-levenshtein';
import { doubleMetaphone } from 'double-metaphone';

type SearchType = 'EXACT' | 'FUNCTIONAL' | 'SIMILARITY' | 'HYBRID';

// Patterns that signal functional/need-based queries
const FUNCTIONAL_PATTERNS = [
  /pour\s+(le|la|les|un|une|mon|ma|mes|du|des)?\s*\w+/i,
  /besoin\s+d[e']/i,
  /cherche\s+(un|une|quelque)/i,
  /j'ai\s+besoin/i,
  /qui\s+(peut|permet|fait|sert)/i,
  /capable\s+de/i,
  /adapt[ée]\s+(à|au|pour)/i,
  /id[ée]al\s+pour/i,
  /efficace\s+(pour|contre|sur)/i,
];

// Patterns that signal similarity queries
const SIMILARITY_PATTERNS = [
  /comme\s+(le|la|les|un|une|ce|cette)/i,
  /similaire\s+[àa]/i,
  /ressemble\s+[àa]/i,
  /m[êe]me\s+(genre|type|style)/i,
  /alternative\s+[àa]/i,
  /[àa]\s+la\s+place\s+de/i,
  /moins\s+cher\s+que/i,
  /équivalent/i,
  /rempla[çc]er/i,
];

// Patterns that signal hybrid (brand + need)
const HYBRID_PATTERNS = [
  /(\w+)\s+(pour|qui|adapt|efficace)/i, // brand + functional keyword
];

/**
 * Detect the most appropriate search type for a query.
 */
export function detectSearchType(query: string): SearchType {
  const q = query.trim().toLowerCase();

  // Check similarity patterns first (most specific)
  if (SIMILARITY_PATTERNS.some((p) => p.test(q))) {
    return 'SIMILARITY';
  }

  // Check functional patterns
  const hasFunctional = FUNCTIONAL_PATTERNS.some((p) => p.test(q));

  // Check hybrid — if query has a known brand/product name + functional keyword
  if (hasFunctional && HYBRID_PATTERNS.some((p) => p.test(q))) {
    return 'HYBRID';
  }

  if (hasFunctional) {
    return 'FUNCTIONAL';
  }

  // Default to exact for short/specific queries
  return 'EXACT';
}

/**
 * Fuzzy match score between two strings.
 * Combined: levenshtein × 0.4 + jaro-winkler × 0.3 + phonetic × 0.2 + ngram × 0.1
 */
export function fuzzyScore(a: string, b: string): number {
  const na = normalize(a);
  const nb = normalize(b);

  const levScore = 1 - levenshtein(na, nb) / Math.max(na.length, nb.length, 1);
  const jaroScore = jaroWinkler(na, nb);
  const phoneticScore = phoneticMatch(na, nb);
  const ngramScore = ngramSimilarity(na, nb, 2);

  return levScore * 0.4 + jaroScore * 0.3 + phoneticScore * 0.2 + ngramScore * 0.1;
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Jaro-Winkler similarity.
 */
function jaroWinkler(s1: string, s2: string): number {
  if (s1 === s2) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;

  const matchWindow = Math.floor(Math.max(s1.length, s2.length) / 2) - 1;
  const s1Matches = new Array(s1.length).fill(false);
  const s2Matches = new Array(s2.length).fill(false);

  let matches = 0;
  let transpositions = 0;

  for (let i = 0; i < s1.length; i++) {
    const start = Math.max(0, i - matchWindow);
    const end = Math.min(i + matchWindow + 1, s2.length);
    for (let j = start; j < end; j++) {
      if (s2Matches[j] || s1[i] !== s2[j]) continue;
      s1Matches[i] = true;
      s2Matches[j] = true;
      matches++;
      break;
    }
  }

  if (matches === 0) return 0;

  let k = 0;
  for (let i = 0; i < s1.length; i++) {
    if (!s1Matches[i]) continue;
    while (!s2Matches[k]) k++;
    if (s1[i] !== s2[k]) transpositions++;
    k++;
  }

  const jaro =
    (matches / s1.length + matches / s2.length + (matches - transpositions / 2) / matches) / 3;

  // Winkler bonus for common prefix (up to 4 chars)
  let prefix = 0;
  for (let i = 0; i < Math.min(4, s1.length, s2.length); i++) {
    if (s1[i] === s2[i]) prefix++;
    else break;
  }

  return jaro + prefix * 0.1 * (1 - jaro);
}

/**
 * Phonetic similarity using double metaphone.
 */
function phoneticMatch(a: string, b: string): number {
  const [a1, a2] = doubleMetaphone(a);
  const [b1, b2] = doubleMetaphone(b);
  if (a1 === b1) return 1;
  if (a1 === b2 || a2 === b1) return 0.8;
  if (a2 && b2 && a2 === b2) return 0.6;
  return 0;
}

/**
 * N-gram (character) similarity.
 */
function ngramSimilarity(a: string, b: string, n: number): number {
  if (a.length < n || b.length < n) return 0;

  const ngramsA = new Set<string>();
  const ngramsB = new Set<string>();
  for (let i = 0; i <= a.length - n; i++) ngramsA.add(a.slice(i, i + n));
  for (let i = 0; i <= b.length - n; i++) ngramsB.add(b.slice(i, i + n));

  let intersection = 0;
  for (const ng of ngramsA) {
    if (ngramsB.has(ng)) intersection++;
  }

  return (2 * intersection) / (ngramsA.size + ngramsB.size);
}
