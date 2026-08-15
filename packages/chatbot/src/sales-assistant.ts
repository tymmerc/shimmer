/**
 * Sales Assistant — pre-sale chat grounded on the store's catalog.
 *
 * Pipeline per message:
 *   1. Search the catalog for top-K products matching the user's intent
 *      (smart-search hybrid: BM25 + embeddings + qualification).
 *   2. Build a system prompt with store voice config + the catalog excerpt.
 *   3. Call the LLM (Claude in prod, Ollama in dev via ClaudeClient).
 *   4. Persist the session token + recommended product IDs for attribution.
 *
 * The pitch on the site says "vendeur IA branché sur votre catalogue" — this
 * is the implementation of that pitch. It actually returns the merchant's
 * real bottles/garments/skis/etc, not generic LLM advice.
 */

import { getPrisma, ClaudeClient, logger, getRedis } from '@shimmer/core';
import type { ClaudeMessage, ScoredProduct } from '@shimmer/core';
import { search } from '@shimmer/smart-search';
import { randomUUID } from 'node:crypto';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface SalesChatResponse {
  message: string;
  sessionToken: string;
  recommendedProducts: Array<{
    id: number;
    name: string;
    price: string;
    category: string | null;
    brand: string | null;
    sku: string;
    imageUrl: string | null;
    why: string;
  }>;
  mode: 'sales';
  status: 'ACTIVE';
  /** Produits ÉPUISÉS que le visiteur a demandés nommément : le SDK affiche
   *  "je peux vous prévenir dès qu'il revient" avec un vrai bouton. */
  outOfStock?: Array<{ id: number; name: string; platformProductId: string | null }>;
}

interface VoiceConfig {
  signature?: string;
  intro_phrases?: string[];
  vocabulary?: Record<string, string>;
}

interface StoreConfig {
  tone?: 'tu' | 'vous' | 'neutre';
  voice?: VoiceConfig;
  displayName?: string;
  /** Per-store pairing/usage hints, generated at onboarding from the catalog.
   *  Keeps vertical knowledge as DATA (wine pairings for a caviste, fit advice
   *  for fashion, etc.) instead of hardcoding it in the prompt. */
  pairing_hints?: string[];
  /** Anonymised SAV objections extracted at ingestion. The vendeur uses them to
   *  preempt the questions that come up most often. */
  common_objections?: string[];
}

// Candidates passed to the LLM as context. We give it a broad pool so it can
// pick well even when the keyword search ranks poorly (e.g. "vin barbecue"
// where no catalog term matches). Only the products the LLM actually names in
// its reply are shown as cards — see pickCitedProducts.
const CANDIDATE_POOL = 12;
const FALLBACK_CARDS = 3;

/** Lowercase, strip accents, collapse whitespace for fuzzy text matching. */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Return the subset of candidates the assistant actually referenced in its
 * reply, preserving the order they appear in the text. This keeps the product
 * cards coherent with what the vendeur recommended, instead of dumping the raw
 * top-N search results (which pad with irrelevant items on weak queries).
 */
function pickCitedProducts(reply: string, candidates: ScoredProduct[]): ScoredProduct[] {
  const normReply = normalize(reply);
  const cited: { product: ScoredProduct; at: number }[] = [];

  for (const c of candidates) {
    const fullName = normalize(c.product.name);
    // Also try the name without a trailing vintage year and color word, so
    // "pessac-leognan rouge 2019" still matches "le pessac-leognan".
    const core = fullName.replace(/\b(19|20)\d{2}\b/g, '').replace(/\b(rouge|blanc|rose)\b/g, '').trim();
    let idx = normReply.indexOf(fullName);
    if (idx === -1 && core.length >= 8) idx = normReply.indexOf(core);
    if (idx !== -1) cited.push({ product: c, at: idx });
  }

  cited.sort((a, b) => a.at - b.at);
  return cited.map(c => c.product);
}

function dedupeById(list: ScoredProduct[]): ScoredProduct[] {
  const seen = new Set<number>();
  return list.filter(c => (seen.has(c.product.id) ? false : (seen.add(c.product.id), true)));
}

/**
 * Produits du catalogue dont le nom (ou le cœur du nom, sans millésime) est
 * écrit dans le message du visiteur. Cheap : un findMany sur les noms actifs.
 */
async function namedProducts(storeId: number, message: string): Promise<ScoredProduct[]> {
  if (message.trim().length < 4) return [];
  const prisma = getPrisma();
  const all = await prisma.product.findMany({ where: { storeId, isActive: true }, take: 5000 });
  const asScored = all.map(p => ({ product: p, score: 1, matchType: 'exact' as const, explanation: 'nommé par le visiteur', confidence: 'very_high' as const })) as unknown as ScoredProduct[];
  return pickCitedProducts(message, asScored);
}

/**
 * Intention de catégorie dans une question générique. Mots-clés → catégories
 * (insensible aux accents), en stock d'abord, mélangés pour la diversité.
 * Retourne [] si aucune catégorie n'est visée (on laisse la recherche faire).
 */
async function categoryProducts(storeId: number, message: string): Promise<ScoredProduct[]> {
  const m = normalize(message);
  const prisma = getPrisma();
  const cats = await prisma.product.findMany({ where: { storeId, isActive: true }, select: { category: true }, distinct: ['category'] });
  const catNames = cats.map(c => c.category).filter((c): c is string => !!c);
  // Une catégorie est visée si un de ses mots (≥4 lettres, ex. "rouge", "blanc",
  // "champagne", "rosé") apparaît dans le message. "vin" seul = toutes les catégories vin.
  const hit = catNames.filter(cat => {
    const words = normalize(cat).split(/[\s/-]+/).filter(w => w.length >= 4 && w !== 'vin');
    return words.some(w => new RegExp(`\\b${w}s?\\b`).test(m));
  });
  const wantsAnyWine = hit.length === 0 && /\bvins?\b/.test(m);
  const target = hit.length > 0 ? hit : (wantsAnyWine ? catNames.filter(c => /vin/i.test(c)) : []);
  if (target.length === 0) return [];
  const products = await prisma.product.findMany({
    where: { storeId, isActive: true, category: { in: target } },
    orderBy: [{ stock: 'desc' }, { id: 'asc' }],
    take: 40,
  });
  const inStock = products.filter(p => !isSoldOut(p));
  const soldOut = products.filter(p => isSoldOut(p));
  // En stock d'abord (spread par sous-catégorie pour varier), puis 2 épuisés max
  // pour que le vendeur puisse dire "celui-là est épuisé" s'il est demandé.
  const picked = [...inStock.slice(0, CANDIDATE_POOL - 2), ...soldOut.slice(0, 2)];
  return picked.map(p => ({ product: p, score: 0.5, matchType: 'usage' as const, explanation: 'catégorie demandée', confidence: 'medium' as const })) as unknown as ScoredProduct[];
}

/** Stock réel du catalogue local. `stockStatus` fait foi, `stock` en secours. */
export function isSoldOut(p: { stock?: number | null; stockStatus?: string | null }): boolean {
  if (p.stockStatus && /out_of_stock|sold_out|epuise|épuisé/i.test(p.stockStatus)) return true;
  if (typeof p.stock === 'number' && p.stock <= 0 && (!p.stockStatus || p.stockStatus === 'in_stock')) {
    // Un stock à 0 avec un statut par défaut : on considère épuisé (le statut
    // n'est pas toujours mis à jour par les imports).
    return true;
  }
  return false;
}

export async function handleSalesMessage(
  storeId: number,
  message: string,
  sessionToken?: string,
  customerEmail?: string,
): Promise<SalesChatResponse> {
  const prisma = getPrisma();
  const token = sessionToken || randomUUID();

  const store = await prisma.store.findUnique({ where: { id: storeId } });
  const config = (store?.config ?? {}) as StoreConfig;

  // ── Réponse en cache (protège les coûts API) ──────────────────────────────
  // Beaucoup de visiteurs tapent les mêmes besoins (« rouge barbecue »…). On ne
  // met en cache QUE le premier tour d'une conversation neuve (pas de
  // sessionToken entrant), keyé par boutique + requête normalisée. Un hit
  // renvoie la réponse sans toucher au LLM. Tout est fail-open : si Redis
  // tombe, on continue normalement vers le LLM.
  const cacheable = !sessionToken;
  const cacheKey = `vendeur:v1:${storeId}:${message.toLowerCase().replace(/\s+/g, ' ').trim()}`;
  if (cacheable) {
    try {
      const hit = await getRedis().get(cacheKey);
      if (hit) {
        const data = JSON.parse(hit) as { message: string; recommendedProducts: SalesChatResponse['recommendedProducts']; outOfStock?: SalesChatResponse['outOfStock'] };
        const now = new Date().toISOString();
        const msgs: ChatMessage[] = [
          { role: 'user', content: message, timestamp: now },
          { role: 'assistant', content: data.message, timestamp: now },
        ];
        await prisma.chatSession.create({
          data: {
            storeId,
            sessionToken: token,
            messages: msgs as unknown as Parameters<typeof prisma.chatSession.create>[0]['data']['messages'],
            recommendedProductIds: data.recommendedProducts.map(p => p.id) as unknown as Parameters<typeof prisma.chatSession.create>[0]['data']['recommendedProductIds'],
            customerEmail: customerEmail ?? null,
            mode: 'sales',
            status: 'ACTIVE',
          },
        }).catch(() => undefined);
        logger.info({ storeId, cacheHit: true }, 'sales.message.cache-hit');
        return { message: data.message, sessionToken: token, recommendedProducts: data.recommendedProducts, mode: 'sales', status: 'ACTIVE', outOfStock: data.outOfStock ?? [] };
      }
    } catch (err) {
      logger.warn({ err }, 'sales.message.cache-read-failed (fail-open)');
    }
  }

  // Build a candidate pool for the LLM. If the keyword search returns a real
  // signal, use its ranking. If it's all noise (e.g. "vin barbecue" where no
  // catalog term matches), fall back to a category-diverse sample so the LLM
  // sees options across the whole catalog and can pick the right type itself.
  const candidates = await buildCandidatePool(storeId, message, token);

  // Load conversation history if session exists
  let session = await prisma.chatSession.findFirst({
    where: { sessionToken: token, storeId },
  });
  const history: ChatMessage[] = session
    ? (session.messages as unknown as ChatMessage[])
    : [];
  history.push({ role: 'user', content: message, timestamp: new Date().toISOString() });

  // Fetch the customer-quote snippets attached to candidate products. These
  // chunks were PII-scrubbed at ingestion, so they can flow into the LLM
  // context without RGPD exposure. We cap per-product and total length.
  const candidateProductIds = candidates.map(c => c.product.id);
  const reviewChunks = candidateProductIds.length > 0
    ? await prisma.knowledgeChunk.findMany({
        where: { storeId, sourceType: 'review', productId: { in: candidateProductIds } },
        orderBy: { id: 'desc' },
        take: 12,
        select: { productId: true, text: true, metadata: true },
      })
    : [];
  const reviewsByProduct = new Map<number, string[]>();
  for (const rc of reviewChunks) {
    if (!rc.productId) continue;
    const arr = reviewsByProduct.get(rc.productId) ?? [];
    if (arr.length < 1) arr.push(rc.text.slice(0, 120));
    reviewsByProduct.set(rc.productId, arr);
  }

  // Build system prompt with voice + candidate pool + knowledge from the store
  const systemPrompt = buildSalesPrompt(store?.name ?? 'la boutique', config, candidates, reviewsByProduct);

  const claudeMessages: ClaudeMessage[] = history.map(m => ({
    role: m.role,
    content: m.content,
  }));

  const claude = new ClaudeClient();

  // Graceful degradation: the search already produced relevant candidates
  // without the LLM. If the LLM is fully unavailable (Ollama down AND no Claude
  // fallback), we must NOT leak a raw error to the visitor — we still return
  // the best products with a plain intro so the conversation stays usable.
  let assistantReply: string;
  let llmDegraded = false;
  try {
    assistantReply = await claude.complete(claudeMessages, {
      systemPrompt,
      temperature: 0.5,
      maxTokens: 700,
    });
  } catch (err) {
    llmDegraded = true;
    logger.warn({ storeId, error: (err as Error).message }, 'sales.message.llm-unavailable → degraded reply');
    assistantReply = candidates.length > 0
      ? "Voici les références qui correspondent le mieux à votre demande. Je peux préciser si vous m'en dites un peu plus."
      : "Je n'arrive pas à répondre à l'instant. Réessayez dans un moment, ou parcourez la boutique en attendant.";
  }

  // Épuisé DEMANDÉ : le code décide, pas le LLM. Un produit épuisé dont le nom
  // apparaît dans le message du visiteur (ou que le vendeur a cité) déclenche
  // l'accroche "préviens-moi", même si le petit modèle a ignoré la consigne.
  const citedRaw = llmDegraded ? [] : pickCitedProducts(assistantReply, candidates);
  const askedByVisitor = pickCitedProducts(message, candidates).filter(c => isSoldOut(c.product));
  const soldOutCited = dedupeById([...askedByVisitor, ...citedRaw.filter(c => isSoldOut(c.product))]);

  // Garde-fou : si un épuisé a été demandé et que le LLM ne l'a PAS dit, on le
  // dit nous-mêmes en tête. Le visiteur ne doit jamais croire qu'un produit
  // épuisé est disponible. Fait AVANT la persistance pour que l'historique, le
  // cache et la réponse portent tous la version corrigée.
  // Le garde-fou ne réécrit la réponse QUE si le visiteur a lui-même nommé
  // l'épuisé. Un épuisé simplement évoqué par le LLM est retiré des cartes,
  // sans toucher au texte (sinon on amplifie une digression du modèle).
  // Un épuisé NOMMÉ par le visiteur : la réponse est déterministe, point.
  // Le LLM (même le 7b) redirige n'importe comment (un Saint-Émilion → un rosé)
  // ou se contredit ("épuisé... toujours disponible"). Ici on ne joue pas :
  // épuisé + on prévient + redirection MÊME CATÉGORIE en stock, calculée par
  // le code. On garde la phrase d'ouverture du LLM si elle est saine et courte.
  let forcedAlt: ScoredProduct | null = null;
  if (askedByVisitor.length > 0) {
    const names = askedByVisitor.map(o => o.product.name).join(', ');
    const wantedCat = askedByVisitor[0]!.product.category;
    const isOk = (c: ScoredProduct) => !isSoldOut(c.product) && !soldOutCited.some(o => o.product.id === c.product.id);
    forcedAlt = candidates.find(c => isOk(c) && c.product.category === wantedCat)
      ?? candidates.find(isOk)
      ?? null;
    const vouvoie = config.tone !== 'tu';
    const prevenir = vouvoie ? 'je peux vous prévenir dès qu\'il revient' : 'je peux te prévenir dès qu\'il revient';
    const redirect = forcedAlt
      ? ` En attendant, ${vouvoie ? 'regardez' : 'regarde'} ${forcedAlt.product.name} (${forcedAlt.product.price} €), c'est ce qui s'en rapproche le plus${wantedCat ? ` en ${String(wantedCat).toLowerCase()}` : ''}.`
      : '';
    // Ouverture du LLM : on ne garde que sa 1re phrase si elle parle bien d'épuisé, sinon on écrit la nôtre.
    const first = assistantReply.split(/(?<=[.!?])\s+/)[0] ?? '';
    const saneOpening = /épuisé|epuise|rupture|plus disponible|indisponible/i.test(first) && !/disponible(?! pour le moment)|en stock|il en reste|nous avons/i.test(first) && first.length <= 160;
    const opening = saneOpening ? first : `${names} est épuisé pour le moment.`;
    assistantReply = `${opening} ${prevenir[0]!.toUpperCase()}${prevenir.slice(1)}.${redirect}`;
  }

  history.push({
    role: 'assistant',
    content: assistantReply,
    timestamp: new Date().toISOString(),
  });

  // Show as cards only what the vendeur actually cited. Fall back to the
  // strongest candidates if the reply named nothing parseable (e.g. it asked a
  // clarifying question instead of recommending), or if the LLM was degraded.
  const cited = citedRaw;
  const availableCited = cited.filter(c => !isSoldOut(c.product));
  const availableCandidates = candidates.filter(c => !isSoldOut(c.product));
  let products = availableCited.length > 0 ? availableCited : availableCandidates.slice(0, FALLBACK_CARDS);
  // Épuisé demandé : la carte n°1 est la redirection calculée (même catégorie), pas ce que le LLM a cité.
  if (forcedAlt) products = dedupeById([forcedAlt, ...products.filter(p => p.product.category === forcedAlt!.product.category)]).slice(0, FALLBACK_CARDS);

  const recommendedProductIds = products.map(p => p.product.id);
  const accumulatedIds = session
    ? Array.from(new Set([...(session.recommendedProductIds as unknown as number[] ?? []), ...recommendedProductIds]))
    : recommendedProductIds;

  if (session) {
    await prisma.chatSession.update({
      where: { id: session.id },
      data: {
        messages: history as unknown as Parameters<typeof prisma.chatSession.update>[0]['data']['messages'],
        recommendedProductIds: accumulatedIds as unknown as Parameters<typeof prisma.chatSession.update>[0]['data']['recommendedProductIds'],
        customerEmail: customerEmail ?? session.customerEmail,
        mode: 'sales',
      },
    });
  } else {
    session = await prisma.chatSession.create({
      data: {
        storeId,
        sessionToken: token,
        messages: history as unknown as Parameters<typeof prisma.chatSession.create>[0]['data']['messages'],
        recommendedProductIds: accumulatedIds as unknown as Parameters<typeof prisma.chatSession.create>[0]['data']['recommendedProductIds'],
        customerEmail: customerEmail ?? null,
        mode: 'sales',
        status: 'ACTIVE',
      },
    });
  }

  logger.info({
    sessionToken: token,
    storeId,
    productsRecommended: products.length,
    messageCount: history.length,
  }, 'sales.message.handled');

  const recommendedProducts = products.map(p => ({
    id: p.product.id,
    name: p.product.name,
    price: (p.product.price ?? 0).toString(),
    category: p.product.category,
    brand: p.product.brand,
    sku: p.product.sku,
    imageUrl: p.product.imageUrl,
    why: p.explanation,
  }));

  const outOfStock = askedByVisitor.map(p => ({
    id: p.product.id,
    name: p.product.name,
    platformProductId: p.product.platformProductId ?? null,
  }));


  // Mise en cache du premier tour (12h). Pas de cache si l'IA a dégradé (réponse
  // générique) ni si rien n'a été recommandé. Fail-open. Le stock bouge : on ne
  // met PAS en cache une réponse qui parle d'un épuisé (elle serait fausse au
  // réassort).
  if (cacheable && !llmDegraded && recommendedProducts.length > 0 && outOfStock.length === 0) {
    try {
      await getRedis().set(cacheKey, JSON.stringify({ message: assistantReply, recommendedProducts, outOfStock }), 'EX', 60 * 60 * 12);
    } catch (err) {
      logger.warn({ err }, 'sales.message.cache-write-failed (fail-open)');
    }
  }

  return {
    message: assistantReply,
    sessionToken: token,
    recommendedProducts,
    mode: 'sales',
    status: 'ACTIVE',
    outOfStock,
  };
}

/**
 * Build the candidate pool. Uses the search ranking when it has signal,
 * otherwise a category-diverse round-robin over the catalog so the LLM always
 * has varied options (vertical-agnostic: works for wine, fashion, hardware).
 */
async function buildCandidatePool(
  storeId: number,
  message: string,
  token: string,
): Promise<ScoredProduct[]> {
  let results: ScoredProduct[] = [];
  try {
    const result = await search({ query: message, storeId, sessionToken: token });
    results = result.products;
  } catch (err) {
    logger.warn({ err, storeId, message: message.slice(0, 80) }, 'sales.search-failed');
  }

  // Un produit NOMMÉ par le visiteur est toujours dans le pool, quel que soit
  // le score du moteur (index faible, requête exacte…). Sinon le vendeur ne
  // peut ni le recommander, ni dire qu'il est épuisé.
  const named = await namedProducts(storeId, message);

  // Question générique par catégorie ("du rouge", "un blanc", "du champagne",
  // "il reste quoi en vin ?") : le pool privilégie cette catégorie, EN STOCK.
  // C'est ce qu'un vendeur fait : "du rouge ? voilà nos rouges dispo".
  const byCat = await categoryProducts(storeId, message);
  if (byCat.length > 0) return dedupeById([...named, ...byCat, ...results]).slice(0, CANDIDATE_POOL);

  const hasSignal = results.some(r => r.confidence !== 'very_low');
  if (hasSignal) return dedupeById([...named, ...results]).slice(0, CANDIDATE_POOL);

  // No signal: round-robin across categories for a diverse pool.
  const prisma = getPrisma();
  const products = await prisma.product.findMany({
    where: { storeId, isActive: true },
    orderBy: { id: 'asc' },
  });
  const byCategory = new Map<string, typeof products>();
  for (const p of products) {
    const cat = p.category ?? 'autre';
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat)!.push(p);
  }
  const pool: typeof products = [];
  let added = true;
  let round = 0;
  while (pool.length < CANDIDATE_POOL && added) {
    added = false;
    for (const list of byCategory.values()) {
      if (list[round]) {
        pool.push(list[round]);
        added = true;
        if (pool.length >= CANDIDATE_POOL) break;
      }
    }
    round += 1;
  }
  const diverse = pool.map(p => ({
    product: p,
    score: 0,
    matchType: 'hybrid' as const,
    explanation: '',
    confidence: 'low' as const,
  })) as unknown as ScoredProduct[];
  return dedupeById([...named, ...diverse]).slice(0, CANDIDATE_POOL);
}

function buildSalesPrompt(
  storeName: string,
  config: StoreConfig,
  products: ScoredProduct[],
  reviewsByProduct: Map<number, string[]> = new Map(),
): string {
  const tone = config.tone ?? 'neutre';
  const voice = config.voice ?? {};
  const toneInstruction =
    tone === 'tu'
      ? 'Tutoie le client. Ton chaleureux, direct.'
      : tone === 'vous'
        ? 'Vouvoie le client. Ton respectueux mais accessible.'
        : 'Ton neutre, professionnel et accessible. Évite les pronoms directs.';

  const signature = voice.signature ? `Termine ta réponse par "${voice.signature}".` : '';
  const intros =
    voice.intro_phrases && voice.intro_phrases.length > 0
      ? `Si tu commences par une accroche, utilise une de ces phrases au hasard : ${voice.intro_phrases.map(s => `"${s}"`).join(', ')}.`
      : '';
  const vocab =
    voice.vocabulary && Object.keys(voice.vocabulary).length > 0
      ? `Vocabulaire de la boutique — utilise systématiquement ces remplacements : ${Object.entries(voice.vocabulary)
          .map(([k, v]) => `"${k}" → "${v}"`)
          .join(', ')}.`
      : '';

  const productBlock =
    products.length === 0
      ? 'Aucun produit n\'a matché ce besoin pour le moment. Pose une question de précision (occasion, budget, goûts) pour mieux cibler.'
      : products
          .map((p) => {
            const specs = p.product.specs && typeof p.product.specs === 'object'
              ? Object.entries(p.product.specs as Record<string, unknown>)
                  .filter(([k]) => /accord|profil|region|cepage|usage|matiere|style|occasion/i.test(k))
                  .slice(0, 3)
                  .map(([, v]) => (Array.isArray(v) ? v.join(', ') : String(v)))
                  .join(', ')
              : '';
            const quotes = reviewsByProduct.get(p.product.id) ?? [];
            const quoteLine = quotes.length > 0
              ? `\n  Avis clients (scrubbés) : ${quotes.map(q => `« ${q.replace(/\s+/g, ' ').trim()} »`).join(' / ')}`
              : '';
            // Stock réel, jamais un texte de thème : un produit à 0 est ÉPUISÉ.
            const soldOut = isSoldOut(p.product);
            const stockTag = soldOut ? ' | ÉPUISÉ' : '';
            return `- ${p.product.name} | ${p.product.price}€ | ${p.product.category}${p.product.brand ? ' | ' + p.product.brand : ''}${specs ? ' | ' + specs : ''}${stockTag}${quoteLine}`;
          })
          .join('\n');


  const objectionsBlock =
    config.common_objections && config.common_objections.length > 0
      ? `\n## Questions / objections fréquentes des clients de cette boutique (anticipe si pertinent, ne force pas)\n${config.common_objections.slice(0, 6).map(o => `- ${o}`).join('\n')}\n`
      : '';

  // ORDRE VOULU : tout ce qui est STABLE par boutique d'abord (rôle, style,
  // règles, objections), la partie VARIABLE (candidats) EN DERNIER. Ollama met
  // en cache le préfixe du prompt : sur CPU, relire ~1000 tokens coûte 15-30 s
  // à chaque question ; avec un préfixe stable on ne repaie que les candidats.
  // La règle stock est toujours présente (stable) : elle ne coûte rien de plus.
  return `Tu es le vendeur en ligne de ${storeName}. Ton rôle : aider les visiteurs à trouver le bon produit dans le catalogue de la boutique, comme un vrai vendeur en magasin.

## Instructions de style
${toneInstruction}
${intros}
${vocab}
${signature}
${objectionsBlock}
## Règles de conversation
1. Réponds en français.
2. Si la demande est trop vague (un seul mot ou très générique, ex. « rouge », « du vin », « un cadeau »), NE recommande PAS encore : pose UNE seule question courte pour cerner le besoin (l'occasion, le budget, OU le goût — une seule à la fois). Dès que tu as un élément concret, recommande sans reposer la même question.
3. Recommande UNIQUEMENT des produits de la liste « Catalogue disponible » ci-dessous. Ne JAMAIS inventer de produit qui n'y est pas.
4. Choisis le produit VRAIMENT le plus adapté à l'usage ou l'occasion décrite, pas le premier de la liste. Le bon choix prime sur l'ordre.${
    config.pairing_hints && config.pairing_hints.length > 0
      ? '\n   Repères de cette boutique : ' + config.pairing_hints.join(' ; ') + '.'
      : ''
  }
5. Explique en 1 phrase pourquoi le produit colle au besoin (occasion, profil, accord).
6. Cite TOUJOURS le nom complet exact du produit tel qu'écrit dans la liste, et son prix. Pas l'ID.
7. Réponse courte : 3-5 phrases max. C'est une conversation, pas une fiche produit.
8. Si le client mentionne un problème de commande, de livraison ou de retour, dis-lui que tu vas chercher un conseiller (ne traite pas le SAV ici).
9. Un produit marqué ÉPUISÉ ne se recommande JAMAIS comme choix. Si le visiteur le demande nommément, dis-le franchement en une phrase, propose de le prévenir dès qu'il revient (dis exactement : « je peux vous prévenir dès qu'il revient »), puis oriente vers le produit disponible le plus proche DE LA MÊME CATÉGORIE dans la liste. Ne le cite pas parmi tes recommandations.

## Format
Texte libre conversationnel. Pas de listes à puces sauf si tu compares 2-3 produits côte à côte. Pas de markdown.

## Catalogue disponible
${productBlock}`;
}
