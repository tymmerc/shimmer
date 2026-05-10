/**
 * Search Assist — Vendeur IA conversationnel.
 * Implémente les 3 types de recherche :
 *   TYPE 1 : Recherche produit exact ("Dyson V15")
 *   TYPE 2 : Recherche par besoin fonctionnel ("aspirateur poils de chat")
 *   HYBRIDE : Marque + besoin ("Dyson pour poils de chat")
 * + Gestion des objections et retours en arrière (Annexe B)
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { ClaudeClient, getPrisma, logger } from '@shimmer/core';
import type { ClaudeMessage, ScoredProduct } from '@shimmer/core';
import { search, applyDeductions, detectBudget } from '@shimmer/smart-search';
import { loadStoreUniverses } from './universe-gen.js';

// ── Per-store tone ─────────────────────────────────

export type StoreTone = 'tu' | 'vous';

export function getStoreTone(store: { config?: unknown } | undefined): StoreTone {
  const cfg = store?.config;
  if (cfg && typeof cfg === 'object' && cfg !== null) {
    const tone = (cfg as Record<string, unknown>)['tone'];
    if (typeof tone === 'string') {
      const t = tone.toLowerCase().trim();
      if (t === 'vous' || t === 'tu') return t;
    }
  }
  return 'tu';
}

// Re-cases the replacement to match the original token's first-letter case.
export function preserveCase(orig: string, replacement: string): string {
  if (!orig.length || !replacement.length) return replacement;
  if (orig[0] === orig[0]!.toUpperCase()) {
    return replacement[0]!.toUpperCase() + replacement.slice(1);
  }
  return replacement;
}

// ── Brand voice (per-store intro phrases, vocabulary substitutions, signature) ──

export interface BrandVoice {
  intro_phrases?: string[];
  vocabulary?: Record<string, string>;
  signature?: string;
}

export function getStoreVoice(store: { config?: unknown } | undefined): BrandVoice | null {
  const cfg = store?.config;
  if (!cfg || typeof cfg !== 'object') return null;
  const v = (cfg as Record<string, unknown>)['voice'];
  if (!v || typeof v !== 'object') return null;
  return v as BrandVoice;
}

const STANDARD_ACK_RE = /^(Très bien|Compris|Parfait|OK|Super|Noté|D'accord)\s*!\s*/i;

export function applyVoice(text: string, voice: BrandVoice | null): string {
  if (!voice) return text;

  // Replace standard acknowledgment at start with a per-store intro phrase
  if (Array.isArray(voice.intro_phrases) && voice.intro_phrases.length > 0 && STANDARD_ACK_RE.test(text)) {
    const intro = voice.intro_phrases[Math.floor(Math.random() * voice.intro_phrases.length)]!;
    text = text.replace(STANDARD_ACK_RE, `${intro} `);
  }

  // Vocabulary substitution (word-boundary, case-insensitive, preserve case)
  if (voice.vocabulary && typeof voice.vocabulary === 'object') {
    for (const [orig, replacement] of Object.entries(voice.vocabulary)) {
      if (typeof orig !== 'string' || typeof replacement !== 'string' || orig.length === 0) continue;
      const re = new RegExp(`\\b${orig.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      text = text.replace(re, (m) => preserveCase(m, replacement));
    }
  }

  // Append signature with proper spacing
  if (typeof voice.signature === 'string' && voice.signature.trim().length > 0) {
    text = text.replace(/\s*$/, '');
    text = `${text} ${voice.signature.trim()}`;
  }

  return text;
}

// Convert template messages between "tu" and "vous". Internal templates use "tu".
// DB-generated questions (universe-gen) use "vous" by default. This adapts both
// to whatever the store has configured.
export function applyTone(text: string, tone: StoreTone): string {
  const sub = (pattern: RegExp, repl: string) =>
    text = text.replace(pattern, (m) => preserveCase(m, repl));

  if (tone === 'tu') {
    // Subject pronoun + conjugated verb (changes both pronoun and verb)
    sub(/\bvous avez\b/gi, 'tu as');
    sub(/\bvous êtes\b/gi, 'tu es');
    sub(/\bvous voulez\b/gi, 'tu veux');
    sub(/\bvous cherchez\b/gi, 'tu cherches');
    sub(/\bvous préférez\b/gi, 'tu préfères');
    sub(/\bvous aimez\b/gi, 'tu aimes');
    sub(/\bvous prenez\b/gi, 'tu prends');
    // "vous" as object pronoun before a vowel/h verb → "t'" elision
    sub(/\bvous int[ée]resse\b/gi, "t'intéresse");
    sub(/\bvous int[ée]ressent\b/gi, "t'intéressent");
    sub(/\bvous accompagne\b/gi, "t'accompagne");
    // "vous" as object pronoun before a consonant verb → "te"
    sub(/\bvous pla[îi]t\b/gi, 'te plaît');
    sub(/\bvous convient\b/gi, 'te convient');
    sub(/\bvous tente\b/gi, 'te tente');
    sub(/\bvous va\b/gi, 'te va');
    // Possessives
    sub(/\bvotre\b/gi, 'ton');
    sub(/\bvos\b/gi, 'tes');
    // Orphan "vous" last (so it doesn't double-replace patterns above)
    sub(/\bvous\b/gi, 'tu');
    return text;
  }
  // tone === 'vous'
  sub(/\bt'as\b/gi, 'vous avez');
  sub(/\bt'es\b/gi, 'vous êtes');
  sub(/\bt'/gi, 'vous ');
  sub(/\btu as\b/gi, 'vous avez');
  sub(/\btu es\b/gi, 'vous êtes');
  sub(/\btu veux\b/gi, 'vous voulez');
  sub(/\btu cherches\b/gi, 'vous cherchez');
  sub(/\btu préfères\b/gi, 'vous préférez');
  sub(/\btu\b/gi, 'vous');
  sub(/\bte\b/gi, 'vous');
  sub(/\btoi\b/gi, 'vous');
  sub(/\b(ton|ta)\b/gi, 'votre');
  sub(/\btes\b/gi, 'vos');
  return text;
}

// ── Universal cross-universe signals (cadeau, premium, budget...) ──────────────

// Patterns that map a free-text signal to a normalized budget hint.
// Order matters: more specific patterns first.
const UNIVERSAL_BUDGET_PATTERNS: { test: RegExp; hint: 'cheap' | 'mid' | 'premium' }[] = [
  { test: /\b(haut de gamme|premium|le meilleur|le top|de luxe|grand cru)\b/i, hint: 'premium' },
  { test: /\b(milieu de gamme|rapport qualit[ée][- ]prix|raisonnable)\b/i, hint: 'mid' },
  { test: /\bpas (trop )?cher(\b|e)/i, hint: 'cheap' },
  { test: /\b(petit budget|[ée]conomique|premier prix|budget serr[ée]|entr[ée]e de gamme)\b/i, hint: 'cheap' },
];

// Patterns that map free-text to a normalized occasion. "cadeau" implicitly
// pushes the budget hint up to 'premium' downstream.
const UNIVERSAL_OCCASION_PATTERNS: { test: RegExp; occasion: 'cadeau' | 'amis' | 'quotidien' | 'fete' }[] = [
  { test: /\b(cadeau|offrir|pour mon (patron|chef|boss|directeur)|pour ma (m[èe]re|grand[- ]m[èe]re)|anniversaire de)\b/i, occasion: 'cadeau' },
  { test: /\b(no[ëe]l|r[ée]veillon|saint[- ]valentin|f[êe]te des m[èe]res|f[êe]te des p[èe]res)\b/i, occasion: 'fete' },
  { test: /\b(entre amis|repas amis|soir[ée]e|d[îi]ner amis)\b/i, occasion: 'amis' },
  { test: /\b(quotidien|tous les jours|le soir|chaque jour)\b/i, occasion: 'quotidien' },
];

export function detectUniversalSignals(query: string): { budget?: 'cheap' | 'mid' | 'premium'; occasion?: string } {
  const q = query.toLowerCase();
  const out: { budget?: 'cheap' | 'mid' | 'premium'; occasion?: string } = {};

  for (const rule of UNIVERSAL_BUDGET_PATTERNS) {
    if (rule.test.test(q)) { out.budget = rule.hint; break; }
  }
  for (const rule of UNIVERSAL_OCCASION_PATTERNS) {
    if (rule.test.test(q)) { out.occasion = rule.occasion; break; }
  }

  // "Cadeau" without an explicit budget signal implies premium.
  if (out.occasion === 'cadeau' && !out.budget) out.budget = 'premium';
  // "Fête" implies at least mid.
  if (out.occasion === 'fete' && !out.budget) out.budget = 'mid';

  return out;
}

// ── TYPE 1: Exact product matching ──────────────

interface ExactMatch {
  type: 'exact';
  product: any;
  confidence: number; // 0-1
}

// Strip intent phrases ("je veux", "je cherche"...) so a query like "Je veux le Chablis William Fèvre"
// becomes "chablis william fèvre" before product matching.
export function stripIntentPrefix(raw: string): string {
  let q = raw.toLowerCase().trim();
  const intentPatterns = [
    /^(je\s+(veux|voudrais|cherche|prends|prendrais|aimerais)|j'aimerais|j'voudrais|il\s+me\s+faut|il\s+m'en\s+faut|tu\s+(as|aurais|aurais\s+pas)|vous\s+(avez|auriez)|donne[sz]?[\s-]+moi|montre[sz]?[\s-]+moi|montrer|trouve[sz]?[\s-]+moi|peux[\s-]+tu|pouvez[\s-]+vous|c'est\s+quoi|qu'est[\s-]+ce\s+que)\s+/i,
  ];
  for (const p of intentPatterns) q = q.replace(p, '');
  // Strip leading determiners
  q = q.replace(/^(le|la|les|l'|un|une|du|de\s+la|de\s+l'|des|ce|cet|cette|ces)\s+/i, '');
  return q.trim();
}

async function detectExactProduct(query: string, storeId: number): Promise<ExactMatch | null> {
  const raw = query.toLowerCase().trim();
  if (raw.length < 3) return null;

  // Try both the raw query and the intent-stripped version. Stripped is preferred
  // (more selective), raw is fallback for "Chablis" alone-style queries.
  const stripped = stripIntentPrefix(raw);
  const candidates = stripped !== raw ? [stripped, raw] : [raw];

  const prisma = getPrisma();

  for (const q of candidates) {
    if (q.length < 3) continue;

  // 1. Try exact name match (case-insensitive)
  const exact = await prisma.$queryRawUnsafe<any[]>(
    `SELECT *, 1.0 as match_score FROM products
     WHERE store_id = $1 AND is_active = true
     AND (LOWER(name) = $2 OR LOWER(sku) = $2)
     LIMIT 1`,
    storeId, q,
  );
  if (exact.length > 0) return { type: 'exact', product: exact[0], confidence: 1.0 };

  // 2. Try fuzzy name match (product name contains query or query contains product name)
  const fuzzy = await prisma.$queryRawUnsafe<any[]>(
    `SELECT *,
       CASE
         WHEN LOWER(name) LIKE '%' || $2 || '%' THEN 0.9
         WHEN LOWER(brand) || ' ' || LOWER(name) LIKE '%' || $2 || '%' THEN 0.85
         ELSE 0.7
       END as match_score
     FROM products
     WHERE store_id = $1 AND is_active = true
     AND (
       LOWER(name) LIKE '%' || $2 || '%'
       OR LOWER(brand) || ' ' || LOWER(name) LIKE '%' || $2 || '%'
       OR $2 LIKE '%' || LOWER(name) || '%'
     )
     ORDER BY match_score DESC
     LIMIT 3`,
    storeId, q,
  );

  // Only return exact match if the query is specific enough (not a generic category term)
  // Generic terms like "eye-liner", "shampoing", "crème" should qualify, not exact-match
  const isGenericTerm = q.split(/\s+/).length <= 2 && fuzzy.length >= 1;
  const topScore = fuzzy.length > 0 ? Number(fuzzy[0].match_score) : 0;
  if (fuzzy.length === 1 && topScore >= 0.9 && !isGenericTerm) {
    return { type: 'exact', product: fuzzy[0], confidence: topScore };
  }
  // Exact name match only (score 1.0 from step 1) for very short/generic queries
  if (fuzzy.length === 1 && topScore >= 0.9 && isGenericTerm) {
    // Check if the match is on the FULL name (not just a substring)
    const productName = String(fuzzy[0].name).toLowerCase();
    if (productName === q || productName.startsWith(q + ' ')) {
      return { type: 'exact', product: fuzzy[0], confidence: topScore };
    }
    // Otherwise, let it go through qualification
    return null;
  }

  // 3. Brand + model. The brand may be stored with prefixes the client doesn't type
  //    (e.g. "Domaine William Fèvre" vs "William Fèvre"). We use a substring match
  //    in both directions instead of strict equality.
  const words = q.split(/\s+/).filter(w => w.length > 2);
  if (words.length >= 2) {
    const brandRows = await prisma.$queryRawUnsafe<{ brand: string }[]>(
      `SELECT DISTINCT LOWER(brand) AS brand FROM products
       WHERE store_id = $1 AND is_active = true AND brand IS NOT NULL`,
      storeId,
    );

    // Build a list of (storedBrand, matchedToken) pairs: a stored brand matches if
    // any of its significant tokens (>=4 chars) appears in the query, or the full
    // stored brand contains the query as substring.
    const STOP = new Set(['domaine', 'château', 'chateau', 'mas', 'clos', 'cave', 'caves', 'maison']);
    let detectedBrand: { stored: string; tokenInQuery: string } | null = null;
    let bestLen = 0;

    for (const { brand } of brandRows) {
      // Multi-word brand: try the full string first
      if (brand.length >= 4 && q.includes(brand)) {
        if (brand.length > bestLen) {
          detectedBrand = { stored: brand, tokenInQuery: brand };
          bestLen = brand.length;
        }
        continue;
      }
      // Token-level match: significant token in query and brand
      const brandTokens = brand.split(/\s+/).filter(t => t.length >= 4 && !STOP.has(t));
      for (const t of brandTokens) {
        if (q.includes(t) && t.length > bestLen) {
          detectedBrand = { stored: brand, tokenInQuery: t };
          bestLen = t.length;
        }
      }
    }

    if (detectedBrand) {
      // Remove every brand token from the query to get the model/name remainder.
      // "chablis william fèvre" with brand "domaine william fèvre" → remainder "chablis".
      let remainder = q;
      for (const t of detectedBrand.stored.split(/\s+/)) {
        if (t.length >= 3) remainder = remainder.replace(t, '');
      }
      remainder = remainder.replace(/\s+/g, ' ').trim();
      if (remainder.length >= 3) {
        const brandMatch = await prisma.$queryRawUnsafe<any[]>(
          `SELECT *, 0.9 as match_score FROM products
           WHERE store_id = $1 AND is_active = true
           AND LOWER(brand) = $2
           AND ($3 LIKE '%' || LOWER(name) || '%' OR LOWER(name) LIKE '%' || $3 || '%')
           ORDER BY price ASC LIMIT 3`,
          storeId, detectedBrand.stored, remainder,
        );
        if (brandMatch.length >= 1) {
          return { type: 'exact', product: brandMatch[0], confidence: brandMatch.length === 1 ? 0.95 : 0.85 };
        }
      }
    }
  }

  } // end candidates loop
  return null;
}

// ── TYPE 3: Similarity to a reference product ──────────────

type SimilaritySubCase = 'like' | 'budget_alt' | 'replacement' | 'competitor_equiv';

interface SimilarityIntent {
  reference: any;
  subCase: SimilaritySubCase;
}

const SIM_LIKE_PATTERNS = [
  /\b(comme|similaire|du m[êe]me style|m[êe]me genre|dans le genre|m[êe]me esprit|m[êe]me type|qui ressemble)\b/i,
  /\b(j'ai (ador[ée]|aim[ée]|d[ée]gust[ée]|essay[ée]|bu|gout[ée]|test[ée]))\b/i,
];
const SIM_CHEAPER_PATTERNS = [/\b(moins cher|plus abordable|moins on[ée]reux|petit prix|m[êe]me chose mais moins)\b/i];
const SIM_REPLACEMENT_PATTERNS = [/\b(remplacer|en remplacement|à la place de|le successeur)\b/i];
const SIM_COMPETITOR_PATTERNS = [/\b(autre marque|alternative|[ée]quivalent|concurrent)\b/i];

// Extract the reference product from a long natural sentence: take significant tokens
// (>=4 chars, not stop words), score each product by the total length of matched tokens
// in its name, and return the best hit. Used for TYPE 3 where the user's sentence is
// too long for the standard exact-match query.
async function findReferenceProductInPhrase(
  query: string,
  storeId: number,
): Promise<any | null> {
  const STOP = new Set([
    'comme', 'meme', 'meme', 'genre', 'style', 'esprit', 'type', 'avec',
    'sans', 'pour', 'autre', 'chose', 'quelque', 'similaire', 'remplacer',
    'alternative', 'equivalent', 'concurrent', 'aime', 'adore', 'goute',
    'teste', 'essaye', 'bu', 'mange', 'semaine', 'derniere', 'derniere',
    'hier', 'soir', 'depuis', 'avant', 'plutot', 'cher', 'cherche',
  ]);
  const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const tokens = norm(query)
    .split(/[^a-z\-]+/)
    .filter(t => t.length >= 4 && !STOP.has(t));
  if (tokens.length === 0) return null;

  // Load every active product (catalog size <50k assumed) and score in JS so we
  // don't have to deal with Postgres unaccent. For real Caves: ~80 products.
  const { getPrisma } = await import('@shimmer/core');
  const prisma = getPrisma();
  const all = await prisma.product.findMany({
    where: { storeId, isActive: true },
    take: 5000,
  });

  let best: any | null = null;
  let bestScore = 0;
  for (const p of all) {
    const name = norm(String(p.name));
    let score = 0;
    for (const t of tokens) {
      if (name.includes(t)) score += t.length;
    }
    if (score > bestScore) {
      best = p;
      bestScore = score;
    }
  }
  return bestScore >= 6 ? best : null;
}

async function detectSimilarityIntent(
  query: string,
  storeId: number,
): Promise<SimilarityIntent | null> {
  const q = query.toLowerCase();

  const isCheaper = SIM_CHEAPER_PATTERNS.some(p => p.test(q));
  const isReplacement = SIM_REPLACEMENT_PATTERNS.some(p => p.test(q));
  const isCompetitor = SIM_COMPETITOR_PATTERNS.some(p => p.test(q));
  const isLike = SIM_LIKE_PATTERNS.some(p => p.test(q));

  if (!isCheaper && !isReplacement && !isCompetitor && !isLike) return null;

  // Try the standard exact-match first (handles short queries like "comme le Chablis")
  let reference: any = null;
  const exact = await detectExactProduct(query, storeId);
  if (exact && exact.confidence >= 0.8) reference = exact.product;

  // Fall back to phrase-based extraction for long sentences
  if (!reference) {
    reference = await findReferenceProductInPhrase(query, storeId);
  }
  if (!reference) return null;

  let subCase: SimilaritySubCase = 'like';
  if (isCheaper) subCase = 'budget_alt';
  else if (isReplacement) subCase = 'replacement';
  else if (isCompetitor) subCase = 'competitor_equiv';

  return { reference, subCase };
}

interface SimilarHit {
  product: any;
  score: number; // 0..1
  sharedKeys: string[];
}

async function findSimilarProducts(
  reference: any,
  storeId: number,
  subCase: SimilaritySubCase,
): Promise<SimilarHit[]> {
  const { getPrisma } = await import('@shimmer/core');
  const prisma = getPrisma();

  const where: Record<string, unknown> = {
    storeId,
    isActive: true,
    id: { not: reference.id },
  };
  if (reference.category) where.category = reference.category;
  if (subCase === 'budget_alt') where.price = { lt: reference.price };
  if (subCase === 'competitor_equiv' && reference.brand) where.brand = { not: reference.brand };

  const candidates = await prisma.product.findMany({ where, take: 100 });

  const refSpecs = (reference.specs as Record<string, unknown>) || {};
  // Specs we don't compare on: vintage, garde, age — they vary by year and don't reflect style
  const SKIP = new Set(['millesime', 'garde', 'puissance_max', 'temperature_k']);

  const scored: SimilarHit[] = [];
  for (const c of candidates) {
    const cSpecs = (c.specs as Record<string, unknown>) || {};
    const sharedKeys: string[] = [];
    let shared = 0;
    let total = 0;

    for (const [k, refV] of Object.entries(refSpecs)) {
      if (SKIP.has(k)) continue;
      const candV = cSpecs[k];
      if (candV === undefined) continue;
      total += 1;

      // Both arrays → Jaccard
      if (Array.isArray(refV) && Array.isArray(candV)) {
        const a = new Set(refV.map(String));
        const b = new Set(candV.map(String));
        const inter = [...a].filter(x => b.has(x)).length;
        const union = new Set([...a, ...b]).size;
        if (inter > 0 && union > 0) {
          shared += inter / union;
          sharedKeys.push(k);
        }
        continue;
      }
      // One array, one string → membership / substring
      if (Array.isArray(refV) && typeof candV === 'string') {
        if (refV.map(String).some(item => candV.toLowerCase().includes(item.toLowerCase()))) {
          shared += 0.5;
          sharedKeys.push(k);
        }
        continue;
      }
      if (typeof refV === 'string' && Array.isArray(candV)) {
        if (candV.map(String).some(item => refV.toLowerCase().includes(item.toLowerCase()))) {
          shared += 0.5;
          sharedKeys.push(k);
        }
        continue;
      }
      // Both strings → equality or containment
      if (typeof refV === 'string' && typeof candV === 'string') {
        const a = refV.toLowerCase();
        const b = candV.toLowerCase();
        if (a === b) { shared += 1; sharedKeys.push(k); }
        else if (a.includes(b) || b.includes(a)) { shared += 0.5; sharedKeys.push(k); }
      }
    }

    const score = total > 0 ? shared / total : 0;
    if (score > 0.2 && sharedKeys.length >= 2) {
      scored.push({ product: c, score, sharedKeys });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 5);
}

// ── HYBRID: Detect brand + need pattern ──────────────

interface HybridMatch {
  type: 'hybrid';
  brand: string;
  needQuery: string; // The need part without brand
}

async function detectHybrid(query: string, storeId: number): Promise<HybridMatch | null> {
  const q = query.toLowerCase().trim();

  const prisma = getPrisma();
  // Get all active brands for this store
  const brands = await prisma.$queryRawUnsafe<{ brand: string }[]>(
    `SELECT DISTINCT LOWER(brand) as brand FROM products WHERE store_id = $1 AND is_active = true AND brand IS NOT NULL`,
    storeId,
  );

  // Sort brands longest first (avoid "opi" matching before "opium")
  const sortedBrands = brands.sort((a, b) => b.brand.length - a.brand.length);

  for (const { brand } of sortedBrands) {
    // Short brands (< 4 chars) must match as whole word to avoid "opi" in "copine"
    const isShort = brand.length < 4;
    const regex = isShort
      ? new RegExp(`\\b${brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
      : new RegExp(brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

    if (regex.test(q)) {
      const needPart = q.replace(regex, '').replace(/\s+/g, ' ').trim();
      if (needPart.length >= 3) {
        return { type: 'hybrid', brand, needQuery: needPart };
      }
    }
  }

  return null;
}

// ── Objection detection ──────────────

type Objection =
  | { type: 'price'; direction: 'cheaper' | 'pricier' }
  | { type: 'change_criteria'; criterion: string; newValue: string }
  | { type: 'backtrack'; signal: string }
  | null;

function detectObjection(message: string, known: Record<string, string>): Objection {
  const m = message.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // Price objections — cheaper
  if (/trop cher|trop couteux|moins cher|plus abordable|budget serre|hors budget|c.?est trop|cher|reduc|promo|moins de \d/.test(m)) {
    return { type: 'price', direction: 'cheaper' };
  }

  // Price objections — pricier
  if (/plus haut de gamme|meilleure qualite|plus performant|mets plus cher|si je mets plus|premium|haut de gamme|investir/.test(m)) {
    return { type: 'price', direction: 'pricier' };
  }

  // Rejection — client doesn't want this product
  if (/autre chose|pas celui|pas celui.?la|non merci|pas interesse|nul|bof|pas convaincu|un autre|t.?as pas (mieux|autre)/.test(m)) {
    return { type: 'backtrack', signal: 'rejected_product' };
  }

  // Backtracking: "en fait", "finalement", "plutôt", "j'ai changé d'avis"
  if (/en fait|finalement|j.?ai change|plutot|au lieu de|prefere/.test(m)) {
    if (/sans fil|batterie/.test(m) && known['SANS_FIL'] !== 'true') {
      return { type: 'change_criteria', criterion: 'SANS_FIL', newValue: 'true' };
    }
    if (/filaire|avec fil|secteur/.test(m) && known['SANS_FIL'] !== 'false') {
      return { type: 'change_criteria', criterion: 'SANS_FIL', newValue: 'false' };
    }
    if (/occasion|temps en temps/.test(m) && known['USAGE'] !== 'Occasionnel') {
      return { type: 'change_criteria', criterion: 'USAGE', newValue: 'Occasionnel' };
    }
    if (/regulier|souvent/.test(m) && known['USAGE'] !== 'Régulier') {
      return { type: 'change_criteria', criterion: 'USAGE', newValue: 'Régulier' };
    }
    return { type: 'backtrack', signal: m.slice(0, 50) };
  }

  // Positive close
  if (/merci|parfait|je prends|ok|c.?est bon|genial|super|top/.test(m)) {
    return null; // Not an objection, positive signal
  }

  return null;
}

// ── Qualification criteria per universe (Annexe C) ──────────────

export interface QualCriterion {
  id: string;
  label: string;
  weight: number;
  required: boolean;
  type: 'closed' | 'open' | 'deduced';
  values?: string[];
  question: string;
  fallback: string;
}

export interface UniverseConfig {
  id: string;
  label: string;
  keywords: string[];
  scoreProfile: { usage: number; criteria: number; history: number };
  criteria: QualCriterion[];
  deductions: { patterns: string[]; criterion: string; value: string }[];
}

const UNIVERSES: UniverseConfig[] = [
  {
    id: 'BRICOLAGE',
    label: 'Bricolage / Perceuse',
    keywords: ['perceuse', 'percer', 'visser', 'visseuse', 'drill', 'mur', 'beton', 'béton', 'brique', 'placo', 'cheville', 'étagère', 'etagere', 'fixer', 'accrocher', 'trou', 'bricolage', 'meuble', 'ikea', 'monter', 'assembler'],
    scoreProfile: { usage: 30, criteria: 55, history: 15 },
    criteria: [
      { id: 'PERC_MATERIAU', label: 'Matériau à percer', weight: 30, required: true, type: 'closed', values: ['Bois', 'Métal', 'Béton', 'Brique', 'Placo', 'Mixte'], question: 'Tu veux percer dans quoi ? Béton, brique, placo, bois ?', fallback: 'Mixte' },
      { id: 'PERC_FREQUENCE', label: 'Fréquence', weight: 20, required: false, type: 'closed', values: ['Occasionnel', 'Régulier', 'Intensif'], question: "C'est pour un usage occasionnel ou régulier ?", fallback: 'Occasionnel' },
      { id: 'PERC_ALIM', label: 'Alimentation', weight: 15, required: false, type: 'closed', values: ['Filaire', 'Batterie', 'Peu importe'], question: 'Filaire ou sans fil ?', fallback: 'Peu importe' },
      { id: 'PERC_VISS', label: 'Vissage aussi', weight: 10, required: false, type: 'deduced', question: '', fallback: 'Non' },
      { id: 'PERC_BUDGET', label: 'Budget', weight: 15, required: false, type: 'open', question: '', fallback: 'Milieu de gamme' },
      { id: 'PERC_NIVEAU', label: 'Niveau', weight: 10, required: false, type: 'deduced', question: '', fallback: 'Débutant' },
    ],
    deductions: [
      { patterns: ['béton', 'beton', 'mur porteur'], criterion: 'PERC_MATERIAU', value: 'Béton (percussion obligatoire)' },
      { patterns: ['placo', 'cloison', 'plaque'], criterion: 'PERC_MATERIAU', value: 'Placo (pas de percussion)' },
      { patterns: ['bois', 'planche', 'parquet'], criterion: 'PERC_MATERIAU', value: 'Bois' },
      { patterns: ['meuble', 'ikea', 'monter', 'assembler'], criterion: 'PERC_VISS', value: 'Oui' },
      { patterns: ['renovation', 'chantier', 'gros travaux'], criterion: 'PERC_FREQUENCE', value: 'Intensif' },
      { patterns: ['première', 'premier', 'debuter', 'débutant', 'jamais'], criterion: 'PERC_NIVEAU', value: 'Débutant' },
      { patterns: ['pro', 'professionnel', 'sds', 'mandrin'], criterion: 'PERC_NIVEAU', value: 'Expert' },
      { patterns: ['sans fil', 'batterie', 'cordless'], criterion: 'PERC_ALIM', value: 'Batterie' },
      { patterns: ['filaire', 'secteur'], criterion: 'PERC_ALIM', value: 'Filaire' },
      { patterns: ['étagère', 'etagere', 'fixer', 'accrocher', 'tableau'], criterion: 'PERC_FREQUENCE', value: 'Occasionnel' },
    ],
  },
  {
    id: 'ASPIRATEUR',
    label: 'Aspirateur',
    keywords: ['aspirateur', 'aspirer', 'poils', 'poussiere', 'poussière', 'nettoyer', 'sol', 'tapis', 'moquette', 'parquet', 'chat', 'chien', 'animal', 'robot', 'roomba', 'dyson'],
    scoreProfile: { usage: 60, criteria: 30, history: 10 },
    criteria: [
      { id: 'ASP_USAGE', label: 'Usage principal', weight: 25, required: false, type: 'deduced', question: '', fallback: 'Polyvalent' },
      { id: 'ASP_SOL', label: 'Type de sol', weight: 20, required: false, type: 'closed', values: ['Parquet', 'Carrelage', 'Tapis/moquette', 'Mixte'], question: 'Quel type de sol principalement ?', fallback: 'Tous sols' },
      { id: 'ASP_ANIMAUX', label: 'Animaux', weight: 15, required: false, type: 'closed', values: ['Oui (chat)', 'Oui (chien)', 'Oui (autre)', 'Non'], question: 'Tu as des animaux ?', fallback: 'Non' },
      { id: 'ASP_SURFACE', label: 'Surface', weight: 15, required: false, type: 'open', question: 'Pour quelle surface à peu près ?', fallback: 'Moyen (~60m²)' },
      { id: 'ASP_FIL', label: 'Avec/sans fil', weight: 10, required: false, type: 'closed', values: ['Filaire', 'Sans fil', 'Peu importe'], question: 'Avec ou sans fil ?', fallback: 'Sans fil' },
      { id: 'ASP_BUDGET', label: 'Budget', weight: 15, required: false, type: 'open', question: '', fallback: 'Milieu de gamme' },
    ],
    deductions: [
      { patterns: ['appartement', 'appart', 'studio', 'f1', 'f2', 'f3'], criterion: 'ASP_SURFACE', value: 'Petit (≤60m²)' },
      { patterns: ['maison', 'villa', 'pavillon'], criterion: 'ASP_SURFACE', value: 'Grand (>80m²)' },
      { patterns: ['chat', 'félin'], criterion: 'ASP_ANIMAUX', value: 'Oui (chat)' },
      { patterns: ['chien', 'labrador', 'golden', 'caniche', 'berger'], criterion: 'ASP_ANIMAUX', value: 'Oui (chien)' },
      { patterns: ['poils', 'poil', 'animal', 'animaux'], criterion: 'ASP_USAGE', value: 'Poils animaux' },
      { patterns: ['parquet', 'bois'], criterion: 'ASP_SOL', value: 'Parquet' },
      { patterns: ['carrelage', 'carreaux', 'dalle'], criterion: 'ASP_SOL', value: 'Carrelage' },
      { patterns: ['tapis', 'moquette'], criterion: 'ASP_SOL', value: 'Tapis/moquette' },
      { patterns: ['sans fil', 'batterie', 'cordless'], criterion: 'ASP_FIL', value: 'Sans fil' },
      { patterns: ['voiture', 'auto', 'véhicule'], criterion: 'ASP_USAGE', value: 'Voiture' },
      { patterns: ['allergi'], criterion: 'ASP_USAGE', value: 'Allergènes (HEPA)' },
    ],
  },
  {
    id: 'CUISINE',
    label: 'Cuisine / Electroménager',
    keywords: ['cuisine', 'cuire', 'mixer', 'blender', 'robot', 'four', 'casserole', 'poele', 'couteau', 'cuisson', 'patisserie', 'gateau', 'smoothie', 'jus', 'café', 'cafetière', 'bouilloire', 'grille-pain'],
    scoreProfile: { usage: 60, criteria: 30, history: 10 },
    criteria: [
      { id: 'CUI_USAGE', label: 'Ce que tu veux faire', weight: 30, required: false, type: 'deduced', question: '', fallback: 'Polyvalent' },
      { id: 'CUI_FREQUENCE', label: 'Fréquence', weight: 20, required: false, type: 'closed', values: ['Occasionnel', 'Quotidien', 'Intensif'], question: "C'est pour un usage quotidien ou occasionnel ?", fallback: 'Quotidien' },
      { id: 'CUI_NB', label: 'Nombre de personnes', weight: 15, required: false, type: 'open', question: 'Pour combien de personnes ?', fallback: '2-4 personnes' },
      { id: 'CUI_CONTRAINTE', label: 'Contraintes', weight: 15, required: false, type: 'open', question: '', fallback: 'Aucune' },
      { id: 'CUI_BUDGET', label: 'Budget', weight: 20, required: false, type: 'open', question: '', fallback: 'Milieu de gamme' },
    ],
    deductions: [
      { patterns: ['smoothie', 'jus', 'soupe'], criterion: 'CUI_USAGE', value: 'Mixer/blender' },
      { patterns: ['gâteau', 'gateau', 'pâtisserie', 'patisserie'], criterion: 'CUI_USAGE', value: 'Pâtisserie' },
      { patterns: ['café', 'espresso', 'cappuccino'], criterion: 'CUI_USAGE', value: 'Café' },
    ],
  },
  {
    id: 'JARDIN',
    label: 'Jardin / Extérieur',
    keywords: ['jardin', 'pelouse', 'tondre', 'tondeuse', 'tailler', 'taille-haie', 'arroser', 'arrosage', 'terrasse', 'exterieur', 'extérieur', 'plante', 'herbe', 'gazon'],
    scoreProfile: { usage: 55, criteria: 35, history: 10 },
    criteria: [
      { id: 'JAR_USAGE', label: 'Ce que tu veux faire', weight: 30, required: false, type: 'deduced', question: '', fallback: 'Entretien général' },
      { id: 'JAR_SURFACE', label: 'Surface', weight: 25, required: false, type: 'open', question: 'Quelle surface de jardin à peu près ?', fallback: 'Moyen' },
      { id: 'JAR_ALIM', label: 'Alimentation', weight: 15, required: false, type: 'closed', values: ['Électrique', 'Thermique', 'Batterie', 'Peu importe'], question: 'Électrique, thermique ou batterie ?', fallback: 'Peu importe' },
      { id: 'JAR_BUDGET', label: 'Budget', weight: 15, required: false, type: 'open', question: '', fallback: 'Milieu de gamme' },
      { id: 'JAR_NIVEAU', label: 'Niveau', weight: 15, required: false, type: 'deduced', question: '', fallback: 'Débutant' },
    ],
    deductions: [
      { patterns: ['tondre', 'pelouse', 'gazon'], criterion: 'JAR_USAGE', value: 'Tonte pelouse' },
      { patterns: ['tailler', 'haie', 'arbuste'], criterion: 'JAR_USAGE', value: 'Taille haie' },
      { patterns: ['petit jardin', 'terrasse'], criterion: 'JAR_SURFACE', value: 'Petit (<100m²)' },
      { patterns: ['grand jardin', 'terrain'], criterion: 'JAR_SURFACE', value: 'Grand (>500m²)' },
    ],
  },
];

// ── Load universes: DB first, fallback to hardcoded ──────────────

// Cache per store (5 min TTL)
const universeCache = new Map<number, { data: UniverseConfig[]; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000;

// Per-store overrides — applied on top of the DB-loaded universes at every request.
// Lets a merchant force a criterion the auto-config missed (e.g. OCCASION for a
// caviste), reorder questions, or drop noisy criteria like GARDE/MILLESIME.
interface UniverseOverride {
  criteria_replace?: QualCriterion[];
  criteria_add?: QualCriterion[];
  criteria_remove?: string[];
  criteria_priority?: string[];
  keywords_add?: string[];
  deductions_add?: { patterns: string[]; criterion: string; value: string }[];
}

export function applyStoreOverrides(
  universes: UniverseConfig[],
  storeConfig: unknown,
): UniverseConfig[] {
  if (!storeConfig || typeof storeConfig !== 'object') return universes;
  const overridesRoot = (storeConfig as Record<string, unknown>)['universe_overrides'];
  if (!overridesRoot || typeof overridesRoot !== 'object') return universes;
  const overrides = overridesRoot as Record<string, UniverseOverride>;

  return universes.map((u) => {
    const ov = overrides[u.id];
    if (!ov) return u;

    let criteria = [...u.criteria];

    if (Array.isArray(ov.criteria_replace)) {
      const replaceMap = new Map(ov.criteria_replace.map(c => [c.id, c]));
      criteria = criteria.map(c => replaceMap.get(c.id) || c);
    }
    if (Array.isArray(ov.criteria_add)) {
      const existingIds = new Set(criteria.map(c => c.id));
      for (const c of ov.criteria_add) {
        if (c?.id && !existingIds.has(c.id)) criteria.push(c);
      }
    }
    if (Array.isArray(ov.criteria_remove)) {
      const removeSet = new Set(ov.criteria_remove);
      criteria = criteria.filter(c => !removeSet.has(c.id));
    }
    if (Array.isArray(ov.criteria_priority)) {
      const order = new Map(ov.criteria_priority.map((id, i) => [id, i]));
      criteria = [...criteria].sort((a, b) => (order.get(a.id) ?? 999) - (order.get(b.id) ?? 999));
    }

    const keywords = Array.isArray(ov.keywords_add)
      ? [...new Set([...u.keywords, ...ov.keywords_add.map(k => String(k).toLowerCase())])]
      : u.keywords;

    const deductions = Array.isArray(ov.deductions_add)
      ? [...u.deductions, ...ov.deductions_add]
      : u.deductions;

    return { ...u, criteria, keywords, deductions };
  });
}

async function getUniverses(storeId: number): Promise<UniverseConfig[]> {
  const cached = universeCache.get(storeId);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data;

  try {
    const dbUniverses = await loadStoreUniverses(storeId);
    if (dbUniverses.length > 0) {
      // Map DB format to UniverseConfig
      const configs: UniverseConfig[] = dbUniverses.map(u => ({
        id: u.id,
        label: u.label,
        keywords: u.keywords,
        scoreProfile: u.scoreProfile,
        criteria: u.criteria.map(c => ({
          id: c.id,
          label: c.label,
          weight: c.weight,
          required: c.required,
          type: c.type,
          values: c.values,
          question: c.question,
          fallback: c.fallback,
        })),
        deductions: u.deductions.map(d => ({
          patterns: d.patterns,
          criterion: d.criterion,
          value: d.value,
        })),
      }));
      universeCache.set(storeId, { data: configs, ts: Date.now() });
      logger.info({ storeId, count: configs.length, source: 'db' }, 'universes.loaded');
      return configs;
    }
  } catch (err) {
    logger.warn({ err, storeId }, 'universes.db.load.failed');
  }

  // Fallback to hardcoded
  universeCache.set(storeId, { data: UNIVERSES, ts: Date.now() });
  return UNIVERSES;
}

// ── Detect universe from query ──────────────

export function detectUniverse(query: string, universes: UniverseConfig[]): UniverseConfig | null {
  const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const q = norm(query);
  const scores: { u: UniverseConfig; score: number; debug?: Record<string, number> }[] = [];

  for (const u of universes) {
    let score = 0;
    const dbg: Record<string, number> = {};

    // 1) Keyword matches (existing logic, smaller weight)
    const kwArr = Array.isArray(u.keywords) ? u.keywords : [];
    for (const kw of kwArr) {
      if (typeof kw !== 'string') continue;
      const nkw = norm(kw);
      if (nkw.length < 2) continue;
      if (q.includes(nkw)) {
        score += nkw.length >= 5 ? 2 : 1;
      }
    }
    dbg.kw = score;

    // 2) Label match (very strong: an explicit category mention wins)
    const label = norm(u.label || '');
    if (label && q.includes(label)) {
      score += 8;
      dbg.label = 8;
    } else if (label) {
      for (const w of label.split(/\s+/)) {
        if (w.length >= 4 && q.includes(w)) {
          score += 4;
          dbg.labelWord = (dbg.labelWord || 0) + 4;
        }
      }
    }

    // 3) Universe id segments (e.g. VIN_ROUGE \u2192 "rouge"; SUSPENSION \u2192 "suspension")
    //    These are the discriminators inside a same product family.
    const idParts = (u.id || '').toLowerCase().split('_').filter(p => p.length >= 3);
    for (const part of idParts) {
      if (q.includes(part)) {
        score += 5;
        dbg.idPart = (dbg.idPart || 0) + 5;
      }
    }

    // 4) Catalog-aware signal: criterion values that appear in the query.
    //    Lets "tannique" disambiguate VIN_ROUGE from VIN_BLANC, "scandinave" pull SUSPENSION over
    //    LAMPADAIRE if the criterion only exists for SUSPENSION, etc. Without any metier-specific code.
    let valueHits = 0;
    for (const c of u.criteria || []) {
      if (!c.values) continue;
      for (const v of c.values) {
        // Specs sometimes hold CSV concatenations ("poisson,fruits de mer,apero"). Split and test each.
        const parts = String(v).split(/[,;|]/).map(p => norm(p.trim())).filter(p => p.length >= 4);
        for (const part of parts) {
          if (q.includes(part)) {
            valueHits += 1;
          }
        }
      }
    }
    if (valueHits > 0) {
      const valueScore = Math.min(valueHits * 3, 12); // cap to avoid runaway
      score += valueScore;
      dbg.values = valueScore;
    }

    if (score > 0) scores.push({ u, score, debug: dbg });
  }

  if (scores.length === 0) return null;

  scores.sort((a, b) => b.score - a.score);
  logger.debug({ topScores: scores.slice(0, 3).map(s => ({ id: s.u.id, score: s.score, dbg: s.debug })) }, 'universe.detect');

  // If top 2 scores are tied or very close, the query is ambiguous (e.g. brand name "Dior")
  if (scores.length >= 2 && scores[1]!.score >= scores[0]!.score * 0.8) {
    const priority = ['PARFUM', 'PARFUMERIE', 'MAQUILLAGE', 'SOIN_VISAGE', 'ELECTROMENAGER', 'BRICOLAGE', 'JARDIN'];
    const tied = scores.filter(s => s.score >= scores[0]!.score * 0.8);
    for (const pref of priority) {
      const match = tied.find(s => s.u.id === pref);
      if (match) return match.u;
    }
  }

  return scores[0]!.u;
}

// ── Universal language patterns (work across all universes) ──────────────

const UNIVERSAL_PATTERNS: { patterns: string[]; criterion: string; value: string }[] = [
  // Usage frequency
  { patterns: ['occasionnel', 'temps en temps', 'rarement', 'une fois'], criterion: 'USAGE', value: 'Occasionnel' },
  { patterns: ['regulier', 'souvent', 'tous les jours', 'quotidien', 'frequent'], criterion: 'USAGE', value: 'Régulier' },
  { patterns: ['professionnel', 'chantier', 'metier', 'intensif', 'pro'], criterion: 'USAGE', value: 'Professionnel' },
  // Sans fil / filaire — "peu importe" skips the criterion (marks it as answered)
  { patterns: ['sans fil', 'batterie', 'cordless', 'portable', 'autonomie'], criterion: 'SANS_FIL', value: 'true' },
  { patterns: ['filaire', 'secteur', 'cable', 'branche'], criterion: 'SANS_FIL', value: 'false' },
  // "peu importe" is handled contextually above, not as a fixed pattern
  // Budget
  { patterns: ['pas cher', 'pas trop cher', 'economique', 'petit budget', 'entree de gamme', 'abordable', 'moins de 100', 'serr'], criterion: 'BUDGET', value: 'Entrée de gamme' },
  { patterns: ['milieu de gamme', 'correct', 'raisonnable', 'bon rapport', 'moyen', '200 euros', '300 euros'], criterion: 'BUDGET', value: 'Milieu de gamme' },
  { patterns: ['haut de gamme', 'premium', 'meilleur', 'top', 'qualite', 'prix pas un probleme', 'le mieux'], criterion: 'BUDGET', value: 'Haut de gamme' },
  // Occasion (beauty)
  { patterns: ['cadeau', 'offrir', 'anniversaire', 'noel', 'fete', 'saint valentin'], criterion: 'OCCASION', value: 'Cadeau' },
  { patterns: ['pour moi', 'moi-meme', 'personnel'], criterion: 'OCCASION', value: 'Pour moi' },
  // Genre
  { patterns: ['femme', 'feminine', 'pour elle', 'madame', 'copine', 'mere', 'maman', 'fille'], criterion: 'GENRE', value: 'Femme' },
  { patterns: ['homme', 'masculin', 'pour lui', 'monsieur', 'copain', 'pere', 'papa', 'mari'], criterion: 'GENRE', value: 'Homme' },
  // Surface/espace
  { patterns: ['salon', 'sejour', 'chambre', 'appartement', 'studio', 'interieur'], criterion: 'TYPE', value: 'Intérieur' },
  { patterns: ['jardin', 'terrasse', 'exterieur', 'balcon', 'dehors'], criterion: 'TYPE', value: 'Extérieur' },
  // Animaux
  { patterns: ['chat', 'chien', 'animal', 'animaux', 'poils', 'poil'], criterion: 'ANIMAUX', value: 'true' },
  // Matériaux (bricolage)
  { patterns: ['beton', 'parpaing', 'pierre', 'brique'], criterion: 'MATERIAUX', value: 'Béton/Pierre' },
  { patterns: ['bois', 'parquet', 'planche', 'meuble'], criterion: 'MATERIAUX', value: 'Bois' },
  { patterns: ['placo', 'platre', 'cloison', 'mur'], criterion: 'MATERIAUX', value: 'Plâtre/Cloison' },
  { patterns: ['metal', 'acier', 'fer', 'alu'], criterion: 'MATERIAUX', value: 'Métal' },
];

// ── Apply deductions from query text ──────────────

export function applyUniverseDeductions(query: string, universe: UniverseConfig): Record<string, string> {
  const q = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const deduced: Record<string, string> = {};

  // 1. Apply universal patterns first (always apply — enriches context even without matching criterion)
  const qWords = new Set(q.split(/\s+/));
  for (const d of UNIVERSAL_PATTERNS) {
    for (const p of d.patterns) {
      const np = p.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      // Short patterns (<=4 chars) match as whole word only, longer ones as substring
      const matched = np.length <= 4
        ? qWords.has(np)
        : q.includes(np);
      if (matched) {
        deduced[d.criterion] = d.value;
        break;
      }
    }
  }

  // 2. Apply universe-specific deductions (from DB)
  for (const d of universe.deductions) {
    if (deduced[d.criterion]) continue; // Universal already matched
    for (const p of d.patterns) {
      const np = p.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (q.includes(np)) {
        deduced[d.criterion] = d.value;
        break;
      }
    }
  }

  return deduced;
}

// ── Compute qualification score & find missing criteria ──────────────

function computeQualification(
  universe: UniverseConfig,
  known: Record<string, string>,
) {
  let totalWeight = 0;
  let filledWeight = 0;
  const missing: QualCriterion[] = [];

  for (const c of universe.criteria) {
    totalWeight += c.weight;
    if (known[c.id]) {
      filledWeight += c.weight;
    } else if (c.type !== 'deduced' || c.required) {
      missing.push(c);
    }
  }

  // Count all known criteria (both from universe and universal patterns, exclude internal keys)
  const realKnown = Object.keys(known).filter(k => !k.startsWith('_'));
  const totalKnown = realKnown.length;
  const definedIds = new Set(universe.criteria.map(c => c.id));
  const universalKnown = realKnown.filter(k => !definedIds.has(k)).length;

  // Score = percentage of defined criteria filled + bonus for universal knowledge
  // Each universal criterion adds 15 points to both filled and total
  const universalWeight = universalKnown * 15;
  const adjustedFilled = filledWeight + universalWeight;
  const adjustedTotal = totalWeight + universalWeight;
  let score = adjustedTotal > 0 ? Math.min(100, Math.round((adjustedFilled / adjustedTotal) * 100)) : 0;

  // Fast-track: 2 answered criteria = enough to recommend (3 tours max)
  if (totalKnown >= 2) {
    score = Math.max(score, 65);
  }

  // Sort missing: required first, then preserve the universe-declared order
  // (criteria_priority from store overrides drives the order via universe.criteria).
  // Falls back to weight desc when both are unranked.
  const declaredOrder = new Map(universe.criteria.map((c, i) => [c.id, i]));
  missing.sort((a, b) => {
    if (a.required && !b.required) return -1;
    if (!a.required && b.required) return 1;
    const ai = declaredOrder.get(a.id);
    const bi = declaredOrder.get(b.id);
    if (ai !== undefined && bi !== undefined) return ai - bi;
    return b.weight - a.weight;
  });

  // Only keep askable questions (not deduced-only, have a question text)
  const askable = missing.filter(c => c.question && c.type !== 'deduced');

  return { score, missing, askable, filledWeight, totalWeight };
}

// ── Build the system prompt with Tome 3 rules ──────────────

function buildSystemPrompt(
  universe: UniverseConfig | null,
  qualScore: number,
  known: Record<string, string>,
  questionsToAsk: QualCriterion[],
  objection: Objection,
  requiredMissing: boolean,
  productContext: string,
  suggestions: string[],
): string {
  // Build known criteria display with human-readable labels
  const knownLines = Object.entries(known).map(([k, v]) => {
    const criterion = universe?.criteria.find(c => c.id === k);
    return `- ${criterion?.label || k}: ${v}`;
  });

  let directive: string;
  let showProducts = false;

  if (objection?.type === 'price') {
    const dir = objection.direction === 'cheaper' ? 'moins cher' : 'plus haut de gamme';
    directive = `MISSION: Le client trouve le produit trop ${objection.direction === 'cheaper' ? 'cher' : 'basique'}. Propose une alternative ${dir} parmi les produits ci-dessous. Montre que tu comprends sa contrainte.
Exemple: "Je comprends, c'est un budget ! Regarde le **Modèle X** à XXX€, il fait très bien le job pour ton besoin."`;
    showProducts = true;
  } else if (objection?.type === 'change_criteria' || objection?.type === 'backtrack') {
    directive = `MISSION: Le client a changé d'avis sur un critère. Confirme le changement et propose un nouveau produit adapté.
Exemple: "Pas de souci, on passe en sans fil ! Dans ce cas, le **Modèle Y** serait top pour toi."`;
    showProducts = true;
  } else if (qualScore >= 65) {
    directive = `MISSION: Recommande un produit parmi ceux ci-dessous. Dis son nom exact en gras et UN argument concret.
Exemple: "Le **Perforateur Makita SDS-Plus 18V** serait parfait pour toi. Il a la puissance pour le béton et tu seras libre de tes mouvements en sans fil."`;
    showProducts = true;
  } else {
    const suggText = suggestions.filter(s => s !== 'Pas sûr').join(', ');
    directive = `MISSION: Reformule ce que le client cherche en 1 phrase, puis pose UNE question dont les réponses possibles sont: ${suggText}.
Ta question DOIT correspondre à ces choix. Si les choix sont "Occasionnel, Régulier, Pro" → demande la fréquence d'usage. Si c'est "Sans fil, Avec fil" → demande fil ou sans fil. Etc.
INTERDIT: Ne cite AUCUN nom de produit, AUCUNE marque, AUCUN prix. Tu poses juste la question.
Exemple pour "Occasionnel, Régulier, Pro": "Un aspirateur pour les poils de chat, top ! C'est pour un usage occasionnel ou plus régulier ?"
Exemple pour "Sans fil, Avec fil": "OK ! Tu préfères avec fil (plus puissant) ou sans fil (plus pratique) ?"
Exemple pour "Pas cher, Milieu de gamme, Haut de gamme": "Super ! Tu as un budget en tête ? Plutôt entrée de gamme ou tu veux investir ?"`;
  }

  const productsBlock = showProducts && productContext
    ? `\n## PRODUITS DISPONIBLES (utilise UNIQUEMENT ces données)\n${productContext}`
    : '';

  const knownStr = knownLines.length > 0 ? knownLines.join('. ') : 'Rien connu encore';

  return `Vendeur expert ${universe?.label || 'commerce'}. Tutoie le client. 2 phrases max.
CLIENT: ${knownStr}
${directive}
${productsBlock}`;
}

// ── Search query enrichment ──────────────

function buildSearchQuery(
  userMessage: string,
  known: Record<string, string>,
  universe: UniverseConfig | null,
): string {
  const parts = [userMessage];
  if (universe) parts.push(universe.label);

  // Add criteria-based terms for better product matching
  const mat = known['MATERIAUX'] || '';
  if (mat.includes('Béton') || mat.includes('Pierre')) parts.push('perforateur percussion béton');
  if (known['ANIMAUX'] === 'true') parts.push('poils animaux');
  if (known['SANS_FIL'] === 'true') parts.push('sans fil batterie');
  if (known['GENRE']) parts.push(known['GENRE']);

  return parts.join(' ');
}

// ── Product filtering by criteria ──────────────

function filterByKnownCriteria(
  products: ScoredProduct[],
  known: Record<string, string>,
  universe: UniverseConfig | null,
): ScoredProduct[] {
  if (!universe || products.length === 0) return products;

  const mat = known['PERC_MATERIAU'] || '';
  const needsPercussion = mat.includes('Béton') || mat.includes('percussion') || mat.includes('Brique');
  const wantsSansFil = known['PERC_ALIM'] === 'Batterie' || known['ASP_FIL'] === 'Sans fil';
  const wantsFilaire = known['PERC_ALIM'] === 'Filaire' || known['ASP_FIL'] === 'Filaire';

  return products.filter((sp) => {
    const specs = sp.product.specs as Record<string, unknown> | null;
    if (!specs) return true;

    // Filter out non-percussion products when béton is needed
    if (needsPercussion && specs['mode_percussion'] === false) return false;

    // Filter by wired/wireless preference
    if (wantsSansFil && specs['sans_fil'] === false) return false;
    if (wantsFilaire && specs['sans_fil'] === true) return false;

    return true;
  });
}

// ── Direct DB product fetch for recommendation ──────────────

async function fetchMatchingProducts(
  known: Record<string, string>,
  universe: UniverseConfig,
  storeId: number,
  originalQuery?: string,
): Promise<ScoredProduct[]> {
  const { getPrisma } = await import('@shimmer/core');
  const prisma = getPrisma();

  // Use universe label as DB category (matches exactly)
  const dbCategory = universe.label;

  const conditions: string[] = [
    `store_id = ${storeId}`,
    `is_active = true`,
    `category = '${dbCategory}'`,
  ];

  // Apply universal criteria as SOFT filters (only if the spec field exists in the catalog)
  // This prevents filtering on fields that don't exist for this store's products
  const mat = known['MATERIAUX'] || known['PERC_MATERIAU'] || '';
  if (mat.includes('Béton') || mat.includes('Pierre') || mat.includes('Brique')) {
    conditions.push(`(specs ? 'mode_percussion' AND (specs->>'mode_percussion')::boolean = true)`);
  }

  const sansFil = known['SANS_FIL'];
  if (sansFil === 'true') {
    conditions.push(`(NOT specs ? 'sans_fil' OR (specs->>'sans_fil')::boolean = true)`);
  } else if (sansFil === 'false') {
    conditions.push(`(NOT specs ? 'sans_fil' OR (specs->>'sans_fil')::boolean = false)`);
  }
  // 'indifferent' = no filter

  if (known['ANIMAUX'] === 'true') {
    conditions.push(`(NOT specs ? 'animaux' OR (specs->>'animaux')::boolean = true)`);
  }

  const budget = known['BUDGET'];
  // Normalize budget hint across legacy values and new universal hints
  const budgetLow = budget?.toLowerCase() || '';
  const isPremium = budgetLow === 'premium' || budgetLow.includes('haut de gamme') || budgetLow.includes('luxe') || budgetLow.includes('top') || budgetLow.includes('meilleur');
  const isCheap = budgetLow === 'cheap' || budgetLow.includes('pas cher') || budgetLow.includes('entrée de gamme') || budgetLow.includes('entree de gamme') || budgetLow.includes('petit budget') || budgetLow.includes('économique') || budgetLow.includes('economique');

  // Genre filter — soft (only if field exists)
  const genre = known['GENRE'];
  if (genre) {
    conditions.push(`(NOT specs ? 'genre' OR specs->>'genre' ILIKE '%${genre}%')`);
  }

  // Brand filter (from hybrid TYPE 1+2 detection)
  const brandFilter = known['_BRAND'];
  if (brandFilter) {
    conditions.push(`LOWER(brand) = '${brandFilter.toLowerCase()}'`);
  }

  // Universe-driven filters: for each closed criterion that has a known value,
  // turn it into a soft SQL filter (skip products that have the spec but don't match).
  // Keeps Loire/scandinave/style filters strict instead of being only a scoring boost.
  const sqlEsc = (s: string) => s.replace(/'/g, "''");
  const SKIP_FILTER_IDS = new Set(['BUDGET', 'OCCASION', 'GARDE', 'MILLESIME']);
  const ALREADY_HANDLED = new Set(['SANS_FIL', 'ANIMAUX', 'GENRE', 'MATERIAUX', 'PERC_MATERIAU', 'PERC_ALIM', 'ASP_FIL']);
  for (const c of universe.criteria) {
    if (SKIP_FILTER_IDS.has(c.id) || ALREADY_HANDLED.has(c.id)) continue;
    if (c.type === 'open' || c.type === 'deduced') continue;
    const val = known[c.id];
    if (!val) continue;
    const specKey = c.id.toLowerCase();
    const escVal = sqlEsc(val);
    // Match: (no spec at all) OR (spec equals val) OR (string spec contains val) OR (array spec contains val)
    conditions.push(
      `(NOT specs ? '${specKey}' OR ` +
      `specs->>'${specKey}' = '${escVal}' OR ` +
      `specs->>'${specKey}' ILIKE '%${escVal}%' OR ` +
      `(jsonb_typeof(specs->'${specKey}') = 'array' AND specs->'${specKey}' @> '["${escVal}"]'::jsonb))`
    );
  }

  try {
    // Score products by usage + name match (higher score = better fit for client's need)
    const userTerms = [originalQuery || '', ...Object.values(known).filter(v => !v.startsWith('_'))].join(' ').toLowerCase();

    const products = await prisma.$queryRawUnsafe<any[]>(
      `SELECT *,
        COALESCE((
          SELECT MAX((u->>'score')::int)
          FROM jsonb_array_elements(usages) u
          WHERE EXISTS (
            SELECT 1 FROM unnest(ARRAY(SELECT jsonb_array_elements_text(u->'keywords'))) kw
            WHERE $2 ILIKE '%' || kw || '%'
          )
        ), 50)
        + CASE WHEN LOWER(name) ILIKE '%' || $3 || '%' THEN 30 ELSE 0 END
        as usage_score
       FROM products
       WHERE ${conditions.join(' AND ')}
       ORDER BY usage_score DESC, ${isPremium ? 'price DESC' : isCheap ? 'price ASC' : 'price ASC'}
       LIMIT 5`,
      storeId, userTerms, (originalQuery || '').toLowerCase().split(/\s+/)[0] || '',
    );

    return products.map((p: any) => ({
      product: p,
      score: Number(p.usage_score) || 50,
      usageScores: {},
    }));
  } catch (err) {
    logger.warn({ err, conditions }, 'fetchMatchingProducts failed');
    return [];
  }
}

// ── Route ──────────────

const assistSchema = z.object({
  message: z.string().trim().min(1).max(1000),
  sessionToken: z.string().optional(),
  history: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })).optional(),
  knownCriteria: z.record(z.string()).optional(),
});

const client = new ClaudeClient();

// ── Instant qualification templates (no LLM, < 5ms) ──────────────

const ACKNOWLEDGMENTS = [
  'Très bien !', 'Compris !', 'Parfait !', 'OK !', 'Super !', 'Noté !', 'D\'accord !',
];

const QUESTION_TEMPLATES: Record<string, Record<string, string>> = {
  USAGE: {
    default: 'C\'est pour un usage occasionnel ou plus régulier ?',
    BRICOLAGE: 'Tu bricoles de temps en temps ou c\'est plus régulier ?',
    ELECTROMENAGER: 'C\'est pour un usage quotidien ou plutôt occasionnel ?',
    JARDIN: 'Tu jardines souvent ou juste de temps en temps ?',
  },
  OCCASION: {
    default: 'C\'est pour toi ou c\'est un cadeau ?',
    PARFUM: 'C\'est un parfum pour toi ou pour offrir ?',
    MAQUILLAGE: 'C\'est pour toi ou c\'est un cadeau ?',
    SOIN_VISAGE: 'C\'est pour toi ou pour offrir ?',
    CHEVEUX: 'C\'est pour tes cheveux ou c\'est un cadeau ?',
    CORPS_BAIN: 'C\'est pour toi ou pour offrir ?',
  },
  SANS_FIL: {
    default: 'Tu préfères avec fil (plus puissant) ou sans fil (plus libre) ?',
    BRICOLAGE: 'Avec fil pour la puissance ou sans fil pour la liberté de mouvement ?',
    ELECTROMENAGER: 'Un modèle filaire ou tu préfères sans fil, plus pratique ?',
  },
  BUDGET: {
    default: 'Tu as un budget en tête ? Entrée de gamme, milieu, ou haut de gamme ?',
    BRICOLAGE: 'Côté budget, tu cherches un bon rapport qualité-prix ou du haut de gamme pro ?',
    ELECTROMENAGER: 'Niveau budget, tu vises plutôt l\'essentiel ou du premium ?',
    PARFUM: 'Tu cherches plutôt un petit prix ou tu veux te faire plaisir ?',
    MAQUILLAGE: 'Budget serré ou tu veux de la qualité premium ?',
    SOIN_VISAGE: 'Un soin abordable ou tu investis dans du haut de gamme ?',
    CHEVEUX: 'Tu cherches l\'essentiel ou du soin premium ?',
    CORPS_BAIN: 'Petit plaisir ou produit de luxe ?',
  },
  ANIMAUX: {
    default: 'Tu as des animaux à la maison ? Ça change le modèle à choisir.',
  },
  GENRE: {
    default: 'C\'est pour une femme, un homme, ou mixte ?',
    PARFUM: 'Plutôt un parfum femme, homme, ou unisexe ?',
    MAQUILLAGE: 'C\'est pour une femme ou un homme ?',
    CORPS_BAIN: 'Pour femme, homme, ou mixte ?',
  },
  MATERIAUX: {
    default: 'Tu perces dans quoi ? Béton, bois, placo ?',
  },
  TYPE: {
    default: 'C\'est pour l\'extérieur, l\'intérieur, ou les deux ?',
  },
};

// Native universes that ship with hand-tuned QUESTION_TEMPLATES. For these we
// prefer the hardcoded copy over a DB-generated question to preserve the demo
// experience on legacy stores. New custom universes always use their own question.
const NATIVE_UNIVERSE_IDS = new Set([
  'BRICOLAGE', 'ASPIRATEUR', 'CUISINE', 'JARDIN',
  'ELECTROMENAGER', 'PARFUM', 'PARFUMERIE',
  'MAQUILLAGE', 'SOIN_VISAGE', 'CHEVEUX', 'CORPS_BAIN',
]);

function buildQualificationTemplate(
  userMessage: string,
  universe: UniverseConfig | null,
  known: Record<string, string>,
  suggestions: string[],
  nextCriterion?: QualCriterion | null,
): string {
  const ack = ACKNOWLEDGMENTS[Math.floor(Math.random() * ACKNOWLEDGMENTS.length)]!;
  const uid = universe?.id || 'default';
  const isNativeUniverse = universe ? NATIVE_UNIVERSE_IDS.has(universe.id) : false;

  // For native universes, keep the hand-tuned template path (preserves legacy demo).
  // For new auto-generated universes, use the criterion-driven question.
  let question: string;
  if (!isNativeUniverse && nextCriterion?.question && nextCriterion.question.trim().length > 0) {
    question = nextCriterion.question;
  } else {
    // Find which criterion maps to the current suggestions (legacy fallback)
    let questionKey = 'USAGE'; // default
    if (suggestions.includes('Pour moi') || suggestions.includes('Cadeau')) questionKey = 'OCCASION';
    else if (suggestions.includes('Sans fil') || suggestions.includes('Avec fil')) questionKey = 'SANS_FIL';
    else if (suggestions.includes('Pas cher') || suggestions.includes('Milieu de gamme')) questionKey = 'BUDGET';
    else if (suggestions.includes('Oui, animaux')) questionKey = 'ANIMAUX';
    else if (suggestions.includes('Femme') || suggestions.includes('Homme')) questionKey = 'GENRE';
    else if (suggestions.includes('Béton/Pierre') || suggestions.includes('Bois')) questionKey = 'MATERIAUX';
    else if (suggestions.includes('Extérieur') || suggestions.includes('Intérieur')) questionKey = 'TYPE';

    const templates = QUESTION_TEMPLATES[questionKey] || QUESTION_TEMPLATES['USAGE']!;
    question = templates[uid] || templates['default']!;
  }

  // For first message, rephrase what the client wants
  const knownKeys = Object.keys(known).filter(k => !k.startsWith('_'));
  if (knownKeys.length <= 1) {
    // First turn — acknowledge + question
    // Extract just the product noun (1-3 words), not the full sentence
    const query = userMessage.toLowerCase().trim();
    const isFullSentence = query.split(/\s+/).length > 4 || /^(je |j'|il |un |une |du |des |pour |faut |quelque|cadeau|le |la |les )/.test(query);
    let rephrase: string;
    if (isFullSentence) {
      rephrase = `${ack} `;
    } else {
      // Short query — just acknowledge naturally without Un/Une (avoids gender issues)
      rephrase = `${ack} `;
    }
    return `${rephrase}${question}`;
  }

  // Subsequent turns — acknowledge answer + next question
  return `${ack} ${question}`;
}

function buildRecommendationTemplate(
  products: ScoredProduct[],
  known: Record<string, string>,
  objection: Objection,
): string {
  if (products.length === 0) {
    return 'Hmm, je n\'ai pas trouvé de produit qui correspond exactement. Tu peux me donner plus de détails ?';
  }

  const top = products[0]!.product;
  const name = top.name;
  const brand = top.brand || '';
  const price = top.price;
  const specs = top.specs as Record<string, unknown> | null;

  // Build personalized highlights based on what the CLIENT asked for
  const reasons: string[] = [];
  if (specs) {
    if (known['SANS_FIL'] === 'true' && specs['sans_fil'] === true) {
      reasons.push(specs['autonomie'] ? `sans fil avec ${specs['autonomie']} d'autonomie` : 'sans fil');
    } else if (known['SANS_FIL'] === 'false' && specs['sans_fil'] === false) {
      reasons.push(specs['puissance'] ? `filaire ${specs['puissance']}` : 'filaire, puissance constante');
    }
    if (known['ANIMAUX'] === 'true' && specs['animaux'] === true) reasons.push('conçu pour les poils d\'animaux');
    if (known['MATERIAUX']?.includes('Béton') && specs['mode_percussion'] === true) reasons.push('mode percussion pour le béton');
    if (known['MATERIAUX']?.includes('Bois') && specs['mode_percussion'] !== true) reasons.push('idéal pour le bois');
    if (specs['poids'] && known['USAGE'] === 'Occasionnel') reasons.push(`seulement ${specs['poids']}`);
    if (specs['modes'] && Number(specs['modes']) > 1) reasons.push(`${specs['modes']} modes de vitesse`);
    if (specs['surface_cuisson']) reasons.push(`grande surface de cuisson (${specs['surface_cuisson']})`);
    if (specs['contenance'] && !reasons.length) reasons.push(`${specs['contenance']}`);
    if (specs['autonomie'] && !reasons.some(r => r.includes('autonomie'))) reasons.push(`autonomie ${specs['autonomie']}`);
  }

  const reasonStr = reasons.length > 0 ? reasons.slice(0, 2).join(' et ') : '';

  if (objection?.type === 'price' && objection.direction === 'cheaper') {
    return reasonStr
      ? `Plus abordable : le **${name}** (${brand}) à ${price}€. ${reasonStr.charAt(0).toUpperCase() + reasonStr.slice(1)}, et un super rapport qualité-prix.`
      : `Plus abordable : le **${name}** de ${brand} à ${price}€. Un excellent rapport qualité-prix !`;
  }

  if (objection?.type === 'price' && objection.direction === 'pricier') {
    return reasonStr
      ? `Montée en gamme : le **${name}** (${brand}) à ${price}€. ${reasonStr.charAt(0).toUpperCase() + reasonStr.slice(1)}.`
      : `En haut de gamme, le **${name}** de ${brand} à ${price}€ est une référence.`;
  }

  if (objection?.type === 'backtrack' && objection.signal === 'rejected_product') {
    // Client rejected previous product — show next one from the list
    return reasonStr
      ? `Pas de problème ! Regarde plutôt le **${name}** (${brand}) à ${price}€ : ${reasonStr}.`
      : `OK, essaie le **${name}** de ${brand} à ${price}€ alors.`;
  }

  if (objection?.type === 'change_criteria' || objection?.type === 'backtrack') {
    return reasonStr
      ? `J'ai ajusté ! Le **${name}** (${brand}) à ${price}€ : ${reasonStr}.`
      : `Pas de souci ! Le **${name}** de ${brand} à ${price}€ correspond mieux.`;
  }

  // Standard recommendation — personalized
  if (reasonStr) {
    const intros = [
      `Je te recommande le **${name}** (${brand}) à ${price}€. ${reasonStr.charAt(0).toUpperCase() + reasonStr.slice(1)}, pile ce qu'il te faut !`,
      `Le **${name}** de ${brand} à ${price}€ est parfait pour toi : ${reasonStr}.`,
      `Pour ton besoin, le **${name}** (${brand}) à ${price}€ est top. ${reasonStr.charAt(0).toUpperCase() + reasonStr.slice(1)}.`,
    ];
    return intros[Math.floor(Math.random() * intros.length)]!;
  }

  // Generic fallback
  const intros = [
    `Je te recommande le **${name}** de ${brand} à ${price}€. Il coche toutes tes cases !`,
    `Le **${name}** (${brand}) à ${price}€ serait parfait pour toi.`,
    `Pour ton besoin, le **${name}** de ${brand} à ${price}€ est un excellent choix.`,
  ];
  return intros[Math.floor(Math.random() * intros.length)]!;
}

export const searchAssistRouter = Router();

searchAssistRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = assistSchema.parse(req.body);
    const t0 = performance.now();

    // Detect "need_change" signals upfront: when the user says "finalement",
    // "en fait", "plutôt" + a new need, we reset the conversation context so the
    // new turn isn't polluted by the previous history.
    const NEED_CHANGE_RE = /\b(en fait|finalement|plut[ôo]t|j.?ai chang[ée]|au lieu de|change d.?avis|finalement non)\b/i;
    const isNeedChange = (body.history?.length || 0) > 0 && NEED_CHANGE_RE.test(body.message);

    // Combine only USER messages for deduction (avoid false positives from assistant suggestions)
    // On need_change, restart from the current message only — the previous goal is voided.
    const fullConversation = isNeedChange
      ? body.message
      : [
          ...(body.history || []).filter(h => h.role === 'user').map(h => h.content),
          body.message,
        ].join(' ');

    // ── TYPE 1: Check for exact product match first ──
    const tone = getStoreTone(req.store);
    const voice = getStoreVoice(req.store);
    const exactMatch = await detectExactProduct(body.message, req.storeId!);
    if (exactMatch && exactMatch.confidence >= 0.8 && !body.history?.length) {
      // Direct product match — skip qualification, respond immediately
      const p = exactMatch.product;
      const specs = p.specs as Record<string, string> | null;
      const totalMs = Math.round(performance.now() - t0);

      logger.info({ query: body.message, product: p.name, confidence: exactMatch.confidence }, 'search.type1.exact');

      res.json({
        message: applyVoice(applyTone(`Le **${p.name}** de ${p.brand} à ${p.price}€ — ${(p.description || '').slice(0, 150)}`, tone), voice),
        suggestedQuestions: ['Voir les détails', 'Similaire moins cher ?', 'Autre chose'],
        highlightedProducts: [{
          name: p.name,
          brand: p.brand || '',
          reason: (p.description || '').slice(0, 120),
          price: `${p.price}€`,
          sku: p.sku,
          specs: specs ? Object.fromEntries(Object.entries(specs).slice(0, 5)) : {},
        }],
        needsMoreInfo: false,
        qualificationStep: 'exact_match',
        sessionToken: null,
        knownCriteria: {},
        qualification: { universe: null, score: 100, type: 'TYPE_1' },
        searchMeta: { totalProducts: 1, stageUsed: 'exact', searchType: 'TYPE_1', totalMs },
      });
      return;
    }

    // ── TYPE 3: Similarity to a reference product ("comme le X que j'ai bu") ──
    if ((body.history?.length || 0) === 0) {
      const simIntent = await detectSimilarityIntent(body.message, req.storeId!);
      if (simIntent) {
        const similar = await findSimilarProducts(simIntent.reference, req.storeId!, simIntent.subCase);
        if (similar.length > 0) {
          const top = similar[0]!;
          const ref = simIntent.reference;
          const labelBySubCase: Record<SimilaritySubCase, string> = {
            like: `Tu as aimé le ${ref.name} ? Essaie le **${top.product.name}** de ${top.product.brand} à ${top.product.price}€, c'est dans le même esprit.`,
            budget_alt: `Plus abordable que le ${ref.name} : le **${top.product.name}** de ${top.product.brand} à ${top.product.price}€, dans le même style mais plus accessible.`,
            replacement: `Pour remplacer le ${ref.name} : le **${top.product.name}** de ${top.product.brand} à ${top.product.price}€, profil similaire.`,
            competitor_equiv: `Une alternative au ${ref.name} : le **${top.product.name}** de ${top.product.brand} à ${top.product.price}€.`,
          };
          const totalMs = Math.round(performance.now() - t0);
          logger.info({
            reference: ref.name,
            top: top.product.name,
            subCase: simIntent.subCase,
            sharedKeys: top.sharedKeys,
            score: top.score,
          }, 'search.type3.similarity');

          res.json({
            message: applyVoice(applyTone(labelBySubCase[simIntent.subCase], tone), voice),
            suggestedQuestions: ['Voir les détails', 'Encore plus similaire ?', 'Autre chose'],
            highlightedProducts: similar.slice(0, 3).map(s => ({
              name: s.product.name,
              brand: s.product.brand || '',
              reason: s.product.description?.slice(0, 120) || `Profil proche : ${s.sharedKeys.slice(0, 3).join(', ')}`,
              price: `${s.product.price}€`,
              sku: s.product.sku,
              specs: (s.product.specs as Record<string, unknown>) || {},
            })),
            needsMoreInfo: false,
            qualificationStep: 'similarity',
            sessionToken: null,
            knownCriteria: {},
            qualification: { universe: null, score: Math.round(top.score * 100), missingRequired: false, type: 'TYPE_3', objection: null },
            searchMeta: { totalProducts: similar.length, stageUsed: 'similarity', searchType: 'TYPE_3', totalMs },
          });
          return;
        }
      }
    }

    // ── HYBRID: Brand + need pattern ("Dyson pour poils de chat") ──
    const hybridMatch = await detectHybrid(body.message, req.storeId!);
    let brandFilter: string | null = null;
    let effectiveMessage = body.message;
    if (hybridMatch) {
      brandFilter = hybridMatch.brand;
      effectiveMessage = hybridMatch.needQuery; // Use only the need part for qualification
      logger.info({ brand: hybridMatch.brand, need: hybridMatch.needQuery }, 'search.hybrid');
    }

    // ── OBJECTION: Check if client is pushing back ──
    // On need_change, drop previously-known criteria so the new turn starts fresh.
    // Brand and internal flags stay.
    const known0 = isNeedChange
      ? Object.fromEntries(Object.entries(body.knownCriteria || {}).filter(([k]) => k.startsWith('_')))
      : { ...body.knownCriteria };
    const objection = (body.history?.length || 0) > 0 ? detectObjection(body.message, known0) : null;
    if (objection) {
      logger.info({ objection }, 'search.objection');
      if (objection.type === 'price' && objection.direction === 'cheaper') {
        known0['BUDGET'] = 'Entrée de gamme';
      } else if (objection.type === 'price' && objection.direction === 'pricier') {
        known0['BUDGET'] = 'Haut de gamme';
      } else if (objection.type === 'change_criteria') {
        known0[objection.criterion] = objection.newValue;
      }
    }

    // 1. Load universes (DB first, fallback hardcoded) + apply per-store overrides
    const universesRaw = await getUniverses(req.storeId!);
    const universes = applyStoreOverrides(universesRaw, req.store?.config);
    const universe = detectUniverse(fullConversation, universes);

    // 1b. Out-of-scope detection: no universe matched and the user is asking
    //     for a product. Reply politely instead of falling through to a generic
    //     qualification question.
    if (!universe && !exactMatch && !hybridMatch && (body.history?.length || 0) === 0) {
      const STOP = new Set([
        'veux', 'cherche', 'avez', 'voudrais', 'salut', 'bonjour', 'hello',
        'aide', 'recommande', 'autre', 'chose', 'bonne', 'merci', 'svp',
        'plait', 'plaît', 'pour', 'avec', 'dans', 'chez', 'tres', 'très',
        'tout', 'bien', 'aussi', 'donc', 'mais', 'alors', 'comment',
      ]);
      const noun = body.message
        .toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .split(/[^a-z]+/)
        .find(t => t.length >= 4 && !STOP.has(t));

      if (noun) {
        const storeName = req.store?.name || 'la boutique';
        const out = applyVoice(applyTone(
          `Désolé, on ne fait pas ça chez ${storeName}. Dis-moi ce qui t'intéresse vraiment et je te trouve quelque chose !`,
          tone,
        ), voice);
        const totalMs = Math.round(performance.now() - t0);
        logger.info({ query: body.message, noun }, 'search.out_of_scope');
        res.json({
          message: out,
          suggestedQuestions: [],
          highlightedProducts: [],
          needsMoreInfo: false,
          qualificationStep: 'out_of_scope',
          sessionToken: null,
          knownCriteria: {},
          qualification: { universe: null, score: 0, missingRequired: false, type: 'OUT_OF_SCOPE', objection: null },
          searchMeta: { totalProducts: 0, stageUsed: 'none', searchType: 'OUT_OF_SCOPE', totalMs },
        });
        return;
      }
    }

    // 2. Apply deductions from full conversation
    const deduced = universe ? applyUniverseDeductions(fullConversation, universe) : {};

    // 3. Merge with previously known criteria (objection-updated known0 + deduced)
    const known = { ...known0, ...deduced };

    // 3b. Universal cross-universe signals (cadeau, premium, pas cher...)
    //     Only fill when not already set by an objection or universe deduction.
    const universalSignals = detectUniversalSignals(fullConversation);
    if (universalSignals.budget && !known['BUDGET']) {
      known['BUDGET'] = universalSignals.budget;
    }
    if (universalSignals.occasion && !known['OCCASION']) {
      known['OCCASION'] = universalSignals.occasion;
    }

    // Add brand filter from hybrid detection
    if (brandFilter) known['_BRAND'] = brandFilter;

    // Handle "peu importe" / "indifférent" — fills the NEXT missing criterion
    const skipMsg = body.message.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const skipPatterns = /^(peu importe|pas de preference|indifferent|egal|les deux|n.?importe|je sais pas|aucune idee|pas sur|je ne sais pas|bof|osef|m.?en fiche|ca m.?est egal)$/i;
    if (skipPatterns.test(skipMsg)) {
      // Find which criteria we already have suggestions for (from previous turn)
      const suggestionCriteria: Record<string, string> = {
        'Sans fil': 'SANS_FIL', 'Avec fil': 'SANS_FIL', 'Peu importe': 'SANS_FIL',
        'Occasionnel': 'USAGE', 'Régulier': 'USAGE', 'Pro': 'USAGE',
        'Pas cher': 'BUDGET', 'Milieu de gamme': 'BUDGET', 'Haut de gamme': 'BUDGET',
        'Oui, animaux': 'ANIMAUX', 'Femme': 'GENRE', 'Homme': 'GENRE',
        'Béton/Pierre': 'MATERIAUX', 'Bois': 'MATERIAUX', 'Placo': 'MATERIAUX',
        'Extérieur': 'TYPE', 'Intérieur': 'TYPE',
      };
      // Determine which criterion is "current" based on universe type
      const uid = universe?.id || '';
      const isBeauty = ['PARFUM', 'MAQUILLAGE', 'SOIN_VISAGE', 'CHEVEUX', 'CORPS_BAIN', 'PARFUMERIE'].includes(uid);
      const priorityOrder = isBeauty
        ? ['OCCASION', 'GENRE', 'BUDGET']
        : ['USAGE', 'SANS_FIL', 'BUDGET', 'ANIMAUX', 'GENRE', 'MATERIAUX', 'TYPE'];
      for (const crit of priorityOrder) {
        if (!known[crit]) {
          known[crit] = 'indifferent';
          break;
        }
      }
    }

    // 4. Compute qualification
    const qual = universe
      ? computeQualification(universe, known)
      : { score: 0, missing: [], askable: [], filledWeight: 0, totalWeight: 0 };

    const requiredMissing = universe
      ? universe.criteria.some(c => c.required && !known[c.id])
      : false;

    // 5. Run search pipeline
    const searchQuery = buildSearchQuery(body.message, known, universe);
    const searchResult = await search({
      query: searchQuery,
      sessionToken: body.sessionToken,
      storeId: req.storeId!,
    });

    // 6. If recommending (score >= 65%), fetch products directly from DB with criteria filters
    //    This avoids search ranking issues where the wrong products appear first
    let topProducts: ScoredProduct[];
    if (qual.score >= 65 && universe) {
      const dbProducts = await fetchMatchingProducts(known, universe, req.storeId!, fullConversation);
      topProducts = dbProducts.length > 0 ? dbProducts : filterByKnownCriteria(searchResult.products, known, universe).slice(0, 5);
    } else {
      topProducts = filterByKnownCriteria(searchResult.products, known, universe).slice(0, 5);
    }

    // 7. Build product context — ULTRA compact for speed on local models
    // Send only top 2 to LLM prompt (faster, fewer tokens to parse)
    const productContext = topProducts.slice(0, 2).map((sp: ScoredProduct) => {
      const p = sp.product;
      const specs = p.specs as Record<string, unknown> | null;
      // Build a short spec summary — only the most relevant ones
      const specParts: string[] = [];
      if (specs) {
        if (specs.puissance) specParts.push(`${specs.puissance}`);
        if (specs.autonomie) specParts.push(`autonomie ${specs.autonomie}`);
        if (specs.poids) specParts.push(`${specs.poids}`);
        if (specs.sans_fil === true) specParts.push('sans fil');
        if (specs.sans_fil === false) specParts.push('filaire');
        if (specs.mode_percussion === true) specParts.push('percussion');
        if (specs.animaux === true) specParts.push('spécial animaux');
        if (specs.type) specParts.push(`${specs.type}`);
      }
      const specStr = specParts.length > 0 ? ` (${specParts.join(', ')})` : '';
      return `- ${p.name} (${p.brand}) ${p.price}€${specStr}`;
    }).join('\n');

    logger.info({
      searchQuery,
      totalResults: searchResult.products.length,
      matchedProducts: topProducts.length,
      productContext: productContext.slice(0, 300),
      qualScore: qual.score,
    }, 'search.assist.context');

    // 8. Pre-compute suggestions (needed for prompt alignment)
    const isRecommendingEarly = qual.score >= 65 || objection?.type === 'price' || objection?.type === 'change_criteria' || objection?.type === 'backtrack';
    let earlySuggestions: string[];
    let nextCriterion: QualCriterion | null = qual.askable[0] || null;

    const isNativeUniv = universe ? NATIVE_UNIVERSE_IDS.has(universe.id) : false;
    if (isRecommendingEarly) {
      earlySuggestions = ['Voir les détails', 'Moins cher ?', 'Autre chose'];
    } else if (!isNativeUniv && nextCriterion?.values && nextCriterion.values.length > 0) {
      // Custom universes: use the next missing criterion's own values as suggestions.
      // Native universes fall through to the hand-tuned suggestion lists below.
      earlySuggestions = nextCriterion.values.slice(0, 3);
    } else {
      // Legacy fallback for native universes that have criteria without explicit values
      const uid = universe?.id || '';
      const isBeauty = ['PARFUM', 'MAQUILLAGE', 'SOIN_VISAGE', 'CHEVEUX', 'CORPS_BAIN', 'PARFUMERIE'].includes(uid);
      const isHardware = ['BRICOLAGE', 'ELECTROMENAGER', 'JARDIN'].includes(uid);

      const missingSugg: string[][] = [];

      if (isBeauty) {
        if (!known['OCCASION']) missingSugg.push(['Pour moi', 'Cadeau', 'Peu importe']);
        if (!known['GENRE'] && uid !== 'CHEVEUX') missingSugg.push(['Femme', 'Homme', 'Mixte']);
        if (!known['BUDGET']) missingSugg.push(['Pas cher', 'Milieu de gamme', 'Haut de gamme']);
      } else if (isHardware) {
        if (!known['USAGE']) missingSugg.push(['Occasionnel', 'Régulier', 'Pro']);
        if (!known['SANS_FIL']) missingSugg.push(['Sans fil', 'Avec fil', 'Peu importe']);
        if (!known['BUDGET']) missingSugg.push(['Pas cher', 'Milieu de gamme', 'Haut de gamme']);
        if (!known['ANIMAUX'] && uid === 'ELECTROMENAGER') missingSugg.push(['Oui, animaux', 'Non', 'Pas sûr']);
        if (!known['MATERIAUX'] && uid === 'BRICOLAGE') missingSugg.push(['Béton/Pierre', 'Bois', 'Placo']);
      } else {
        if (!known['USAGE']) missingSugg.push(['Occasionnel', 'Régulier', 'Pro']);
        if (!known['BUDGET']) missingSugg.push(['Pas cher', 'Milieu de gamme', 'Haut de gamme']);
      }
      earlySuggestions = missingSugg[0] || ['Pas cher', 'Milieu de gamme', 'Haut de gamme'];
    }

    // 9. Build system prompt with qualification state + suggestions
    const systemPrompt = buildSystemPrompt(
      universe,
      qual.score,
      known,
      qual.askable,
      objection,
      requiredMissing,
      productContext,
      earlySuggestions,
    );

    // 8. Generate response — templates for qualifying, LLM only for recommending
    let cleanMessage: string;
    const needsLLM = isRecommendingEarly || objection?.type === 'price' || objection?.type === 'change_criteria';

    if (!needsLLM) {
      // ── INSTANT TEMPLATE (< 5ms) ── No LLM needed for qualification questions
      cleanMessage = buildQualificationTemplate(body.message, universe, known, earlySuggestions, nextCriterion);
    } else {
      // ── INSTANT TEMPLATE for recommendations too ── LLM is too slow on CPU
      cleanMessage = buildRecommendationTemplate(topProducts, known, objection);
    }

    // Apply per-store tone (tu/vous) to the final outgoing message.
    cleanMessage = applyVoice(applyTone(cleanMessage, tone), voice);

    const totalMs = Math.round(performance.now() - t0);

    logger.info({
      query: body.message,
      universe: universe?.id || 'unknown',
      qualScore: qual.score,
      productsMatched: topProducts.length,
      totalMs,
    }, 'search.assist');

    // Build highlighted products SERVER-SIDE (don't trust LLM for structured data)
    // Aligned with isRecommendingEarly so the message and the structured products stay consistent.
    const isRecommending = qual.score >= 65 || objection?.type === 'price' || objection?.type === 'change_criteria' || objection?.type === 'backtrack';

    // Choose which spec keys to surface to the client.
    // Priority: criteria_priority from override > universe criteria order > variance.
    // Caps at 5 keys so the highlighted card stays readable.
    const NOISY_SPEC_KEYS = new Set(['usage', 'materiaux', 'garde', 'millesime', 'puissance_max', 'temperature_k']);
    const priorityKeys = universe
      ? universe.criteria
          .filter(c => !['BUDGET', 'OCCASION'].includes(c.id))
          .map(c => c.id.toLowerCase())
          .slice(0, 5)
      : [];

    const filterAndOrderSpecs = (raw: Record<string, unknown> | null): Record<string, unknown> => {
      if (!raw) return {};
      const ordered: Record<string, unknown> = {};
      // Take priority keys first, in declared order
      for (const k of priorityKeys) {
        if (raw[k] !== undefined && !NOISY_SPEC_KEYS.has(k)) {
          ordered[k] = raw[k];
          if (Object.keys(ordered).length >= 5) return ordered;
        }
      }
      // Then any remaining non-noisy specs
      for (const [k, v] of Object.entries(raw)) {
        if (k in ordered) continue;
        if (NOISY_SPEC_KEYS.has(k)) continue;
        ordered[k] = v;
        if (Object.keys(ordered).length >= 5) break;
      }
      return ordered;
    };

    const serverProducts = isRecommending
      ? topProducts.slice(0, 3).map((sp) => {
          const p = sp.product;
          const specs = p.specs as Record<string, unknown> | null;
          return {
            name: p.name,
            brand: p.brand || '',
            reason: p.description?.slice(0, 120) || '',
            price: `${p.price}€`,
            sku: p.sku,
            specs: filterAndOrderSpecs(specs),
          };
        })
      : [];

    // Use pre-computed suggestions (aligned with prompt)
    const serverSuggestions = earlySuggestions;

    res.json({
      message: cleanMessage,
      suggestedQuestions: serverSuggestions,
      highlightedProducts: serverProducts,
      needsMoreInfo: !isRecommending,
      qualificationStep: objection ? 'objection' : isRecommending ? 'recommending' : 'qualifying',
      sessionToken: searchResult.sessionToken,
      knownCriteria: known,
      qualification: {
        universe: universe?.id || null,
        score: qual.score,
        missingRequired: requiredMissing,
        type: hybridMatch ? 'HYBRID' : 'TYPE_2',
        objection: objection?.type || null,
      },
      searchMeta: {
        totalProducts: searchResult.products.length,
        stageUsed: searchResult.stageUsed,
        searchType: searchResult.searchType,
        totalMs,
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    next(err);
  }
});

// ── SSE Streaming endpoint ──────────────────────────────────
// POST /api/search/assist/stream — same logic but streams the LLM response word by word

searchAssistRouter.post('/stream', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = assistSchema.parse(req.body);
    const t0 = performance.now();

    // SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // nginx: don't buffer SSE
    res.flushHeaders();

    // Same logic as non-streaming endpoint for context building
    const fullConversation = [
      ...(body.history || []).filter(h => h.role === 'user').map(h => h.content),
      body.message,
    ].join(' ');

    const universes = await getUniverses(req.storeId!);
    const universe = detectUniverse(fullConversation, universes);
    const deduced = universe ? applyUniverseDeductions(fullConversation, universe) : {};
    const known: Record<string, string> = { ...deduced, ...(body.knownCriteria || {}) };
    const objection = detectObjection(body.message, known);

    if (objection?.type === 'price') {
      if (objection.direction === 'cheaper') known['BUDGET'] = 'petit budget';
      else known['BUDGET'] = 'haut de gamme';
    }
    if (objection?.type === 'change_criteria' || objection?.type === 'backtrack') {
      if (objection.newValue) known[objection.criterion || 'UNKNOWN'] = objection.newValue;
    }

    const qual = universe
      ? computeQualification(universe, known)
      : { score: 0, missing: [] as QualCriterion[], askable: [] as QualCriterion[], filledWeight: 0, totalWeight: 0 };
    const requiredMissing = qual.missing.some(c => c.required);
    const hybridMatch = universe && body.message.match(/\b(pour|avec|qui|compatible)\b/i);
    const searchQuery = buildSearchQuery(body.message, known, universe);
    const searchResult = await search({
      query: searchQuery,
      sessionToken: body.sessionToken,
      storeId: req.storeId!,
    });

    let topProducts: ScoredProduct[];
    if (qual.score >= 65 && universe) {
      const dbProducts = await fetchMatchingProducts(known, universe, req.storeId!, fullConversation);
      topProducts = dbProducts.length > 0 ? dbProducts : filterByKnownCriteria(searchResult.products, known, universe).slice(0, 5);
    } else {
      topProducts = filterByKnownCriteria(searchResult.products, known, universe).slice(0, 5);
    }

    const productContext = topProducts.map((sp) => {
      const p = sp.product;
      const specs = p.specs as Record<string, unknown> | null;
      const specParts: string[] = [];
      if (specs) {
        if (specs.poids) specParts.push(`${specs.poids}`);
        if (specs.sans_fil === true) specParts.push('sans fil');
        if (specs.sans_fil === false) specParts.push('filaire');
        if (specs.mode_percussion === true) specParts.push('percussion');
        if (specs.animaux === true) specParts.push('spécial animaux');
        if (specs.type) specParts.push(`${specs.type}`);
      }
      const specStr = specParts.length > 0 ? ` (${specParts.join(', ')})` : '';
      return `- ${p.name} (${p.brand}) ${p.price}€${specStr}`;
    }).join('\n');

    // Pre-compute suggestions
    const isRecommending = qual.score >= 65 || objection?.type === 'price' || objection?.type === 'change_criteria';
    let earlySuggestions: string[];
    if (isRecommending) {
      earlySuggestions = ['Voir les détails', 'Moins cher ?', 'Autre chose'];
    } else {
      const missingSugg: string[][] = [];
      if (!known['USAGE']) missingSugg.push(['Occasionnel', 'Régulier', 'Pro']);
      if (!known['SANS_FIL']) missingSugg.push(['Sans fil', 'Avec fil', 'Peu importe']);
      if (!known['BUDGET']) missingSugg.push(['Pas cher', 'Milieu de gamme', 'Haut de gamme']);
      if (!known['ANIMAUX'] && universe?.id === 'ELECTROMENAGER') missingSugg.push(['Oui, animaux', 'Non', 'Pas sûr']);
      if (!known['GENRE'] && universe?.id === 'PARFUMERIE') missingSugg.push(['Femme', 'Homme', 'Mixte']);
      if (!known['MATERIAUX'] && universe?.id === 'BRICOLAGE') missingSugg.push(['Béton/Pierre', 'Bois', 'Placo']);
      if (!known['TYPE'] && universe?.id === 'JARDIN') missingSugg.push(['Extérieur', 'Intérieur', 'Les deux']);
      earlySuggestions = missingSugg[0] || ['Occasionnel', 'Régulier', 'Pro'];
    }

    const systemPrompt = buildSystemPrompt(universe, qual.score, known, qual.askable, objection, requiredMissing, productContext, earlySuggestions);

    // Send metadata first (products, suggestions, qualification)
    const serverProducts = isRecommending
      ? topProducts.slice(0, 3).map((sp) => {
          const p = sp.product;
          const specs = p.specs as Record<string, string> | null;
          return {
            name: p.name, brand: p.brand || '', reason: p.description?.slice(0, 120) || '',
            price: `${p.price}€`, sku: p.sku,
            specs: specs ? Object.fromEntries(Object.entries(specs).filter(([k]) => !['usage', 'materiaux'].includes(k)).slice(0, 5)) : {},
          };
        })
      : [];

    const metadata = {
      suggestedQuestions: earlySuggestions,
      highlightedProducts: serverProducts,
      needsMoreInfo: !isRecommending,
      qualificationStep: objection ? 'objection' : isRecommending ? 'recommending' : 'qualifying',
      knownCriteria: known,
      qualification: {
        universe: universe?.id || null, score: qual.score,
        missingRequired: requiredMissing, type: hybridMatch ? 'HYBRID' : 'TYPE_2',
        objection: objection?.type || null,
      },
    };

    res.write(`event: metadata\ndata: ${JSON.stringify(metadata)}\n\n`);

    // Stream LLM response
    const messages: ClaudeMessage[] = [];
    if (body.history?.length) {
      for (const h of body.history.slice(-4)) {
        messages.push({ role: h.role as 'user' | 'assistant', content: h.content });
      }
    }
    messages.push({ role: 'user', content: body.message });

    let fullText = '';
    for await (const chunk of client.stream(messages, {
      systemPrompt: systemPrompt + '\n\nRéponds en texte brut, 2-3 phrases max. Pas de JSON. Pas de liste.',
      temperature: 0.5,
      maxTokens: qual.score >= 65 ? 120 : 50,
    })) {
      if (chunk.text) {
        fullText += chunk.text;
        res.write(`event: token\ndata: ${JSON.stringify({ text: chunk.text })}\n\n`);
      }
    }

    const totalMs = Math.round(performance.now() - t0);
    res.write(`event: done\ndata: ${JSON.stringify({ totalMs, fullText })}\n\n`);
    res.end();

    logger.info({ query: body.message, universe: universe?.id, qualScore: qual.score, totalMs }, 'search.assist.stream');
  } catch (err) {
    if (!res.headersSent) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ error: 'Validation error', details: err.errors });
        return;
      }
      next(err);
    } else {
      res.write(`event: error\ndata: ${JSON.stringify({ error: (err as Error).message })}\n\n`);
      res.end();
    }
  }
});
