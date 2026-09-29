/**
 * Suivi de commande dans le chat SAV : la partie pure (aucun accès base).
 *
 * Le code décide, pas le LLM. Le statut d'une commande, le transporteur et le
 * lien de suivi sont rédigés ici à partir des données, jamais générés : un
 * petit modèle local invente volontiers une date de livraison ou un numéro.
 *
 * Deux façons de savoir de quelle commande on parle :
 *   - client connecté à la boutique : email signé par le thème (voir
 *     apps/api/src/lib/customer-identity.ts), on lit ses commandes ;
 *   - sinon : numéro de commande + email de la commande, les deux doivent
 *     correspondre à la même commande (comme la page "statut de commande" de
 *     Shopify). Nombre d'essais limité par session et par email.
 */

import { createHash } from 'node:crypto';

export interface TrackedShipment {
  carrier: string;
  trackingNumber: string;
  trackingUrl?: string | null;
  status: string;
  shippedAt?: Date | null;
  estimatedDelivery?: Date | null;
  deliveredAt?: Date | null;
}

export interface TrackedOrder {
  orderNumber: string;
  status: string;
  orderedAt: Date;
  deliveredAt?: Date | null;
  shipments: TrackedShipment[];
}

export interface TrackingLink {
  carrier: string;
  trackingNumber: string;
  url: string | null;
}

export interface OrderStatusReply {
  text: string;
  tracking: TrackingLink[];
}

export type OrderReplyKind = 'order_status' | 'order_ask' | 'order_not_found' | 'order_locked';

/** Forme minimale d'un message de session, telle que stockée dans chat_sessions.messages. */
export interface FlowMessage {
  role: 'user' | 'assistant';
  content: string;
  kind?: string;
}

/** Au-delà, la session ne vérifie plus aucun couple numéro + email. */
export const MAX_FAILED_VERIFICATIONS = 3;

const ORDER_ASK_KINDS = new Set(['order_ask', 'order_not_found']);
const TZ = 'Europe/Paris';

// ─── Détection ────────────────────────────────────────────────────────────────

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

/**
 * Vrai si le visiteur demande où en est sa commande. Volontairement étroit :
 * "je veux commander", "délais de livraison ?" ou "ma commande est arrivée
 * cassée" ne déclenchent pas le suivi (ce sont des questions pour le LLM).
 * Miroir côté navigateur : sdk/src/order-intent.ts (test de synchro).
 */
export function detectOrderTrackingIntent(message: string): boolean {
  const m = fold(message);
  if (!m.trim()) return false;
  if (EXPLICIT_PATTERNS.some(re => re.test(m))) return true;
  return DET_NOUN.test(m) && TRACKING_VERB.test(m);
}

// ─── Extraction numéro + email ────────────────────────────────────────────────

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
const EMAIL_RE_G = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;

export function extractEmail(message: string): string | null {
  const m = message.match(EMAIL_RE);
  return m ? m[0].toLowerCase() : null;
}

const NUMBER_PATTERNS = [
  /\bwc-(\d{3,10})\b/,
  /#\s?(\d{3,10})\b/,
  /\b(?:commande|cde|cmd|order|numero|n°|no)\s*(?:n°|no\.?|numero|#|:)?\s*(\d{3,10})\b/,
];
const BARE_NUMBER = /(?<![\w@.#-])(\d{3,10})(?![\w@-]|[.,]\d)(?!\s*(?:€|euros?\b|eur\b))/;

/** Numéro de commande cité (chiffres seuls), ou null. `allowBare` : un nombre
 *  seul compte aussi, utile quand on vient de demander le numéro. */
export function extractOrderNumber(message: string, opts: { allowBare?: boolean } = {}): string | null {
  const m = fold(message.replace(EMAIL_RE_G, ' '));
  for (const re of NUMBER_PATTERNS) {
    const hit = m.match(re);
    if (hit) return hit[1];
  }
  if (opts.allowBare) {
    const hit = m.match(BARE_NUMBER);
    if (hit) return hit[1];
  }
  return null;
}

/** Formats de stockage connus : Shopify "#1042", brut "1042", WooCommerce "WC-1042". */
export function orderNumberCandidates(digits: string): string[] {
  return [`#${digits}`, digits, `WC-${digits}`];
}

export function sameOrderNumber(stored: string, digits: string): boolean {
  return orderNumberCandidates(digits).includes(stored.trim());
}

// ─── État de la conversation ──────────────────────────────────────────────────

function lastAssistant(history: FlowMessage[]): FlowMessage | undefined {
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].role === 'assistant') return history[i];
  }
  return undefined;
}

/** Vrai si notre dernière réponse demandait le numéro ou l'email. */
export function isAwaitingOrderRef(history: FlowMessage[]): boolean {
  const last = lastAssistant(history);
  return !!last?.kind && ORDER_ASK_KINDS.has(last.kind);
}

/** Échecs de vérification de la session. Un blocage compte comme un échec, et
 *  le dernier échec autorisé produit un blocage, pas un "introuvable". */
export function countFailedVerifications(history: FlowMessage[]): number {
  return history.filter(m => m.role === 'assistant' && (m.kind === 'order_not_found' || m.kind === 'order_locked')).length;
}

/** Une session bloquée le reste : plus aucune vérification numéro + email. */
export function isSessionLocked(history: FlowMessage[]): boolean {
  return history.some(m => m.role === 'assistant' && m.kind === 'order_locked')
    || countFailedVerifications(history) >= MAX_FAILED_VERIFICATIONS;
}

/**
 * Numéro + email pour la vérification. Le message courant d'abord ; si on
 * attendait ces infos, on complète avec les messages du visiteur depuis le
 * début de l'échange sur la commande (jamais avant).
 */
export function collectOrderRef(message: string, history: FlowMessage[]): { orderNumber: string | null; email: string | null } {
  const awaiting = isAwaitingOrderRef(history);
  let orderNumber = extractOrderNumber(message, { allowBare: awaiting });
  let email = extractEmail(message);
  if (!awaiting) return { orderNumber, email };

  for (let i = history.length - 1; i >= 0 && !(orderNumber && email); i--) {
    const m = history[i];
    if (m.role === 'assistant') {
      if (m.kind && ORDER_ASK_KINDS.has(m.kind)) continue;
      break;
    }
    orderNumber ??= extractOrderNumber(m.content, { allowBare: true });
    email ??= extractEmail(m.content);
  }
  return { orderNumber, email };
}

// ─── Anti force brute ─────────────────────────────────────────────────────────

/** Compte les échecs par clé sur une fenêtre glissante (mémoire du process). */
export class VerificationThrottle {
  private failures = new Map<string, number[]>();

  constructor(
    private readonly max: number,
    private readonly windowMs: number,
    private readonly now: () => number = Date.now,
  ) {}

  private recent(key: string): number[] {
    const since = this.now() - this.windowMs;
    const kept = (this.failures.get(key) ?? []).filter(t => t > since);
    if (kept.length) this.failures.set(key, kept);
    else this.failures.delete(key);
    return kept;
  }

  isBlocked(key: string): boolean {
    return this.recent(key).length >= this.max;
  }

  /**
   * Réserve un essai sur toutes les clés, ou aucune si l'une est bloquée.
   * Vérification et enregistrement sans await entre les deux : deux requêtes
   * simultanées ne peuvent pas passer toutes les deux sur le dernier essai.
   */
  tryAcquire(keys: string[]): boolean {
    if (keys.some(k => this.isBlocked(k))) return false;
    for (const k of keys) this.recordFailure(k);
    return true;
  }

  /** Essai réussi : il ne compte pas comme un échec. */
  release(keys: string[]): void {
    for (const k of keys) {
      const kept = this.recent(k);
      kept.pop();
      if (kept.length) this.failures.set(k, kept);
      else this.failures.delete(k);
    }
  }

  recordFailure(key: string): void {
    if (this.failures.size > 10_000) this.prune();
    this.failures.set(key, [...this.recent(key), this.now()]);
  }

  /** Oublie les clés dont tous les échecs sont sortis de la fenêtre. */
  private prune(): void {
    for (const key of [...this.failures.keys()]) this.recent(key);
  }
}

/** Masque les emails d'un message avant de le garder en session. */
export function redactEmails(text: string): string {
  return text.replace(EMAIL_RE_G, '[email masqué]');
}

/** Clé de throttle : on ne garde jamais l'email en clair en mémoire. */
export function throttleKey(scope: string, email: string): string {
  return `${scope}:${createHash('sha256').update(email.trim().toLowerCase()).digest('hex')}`;
}

// ─── Rédaction ────────────────────────────────────────────────────────────────

const DAY_KEY = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });
const LONG_DAY = new Intl.DateTimeFormat('fr-FR', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long' });
const SHORT_DAY = new Intl.DateTimeFormat('fr-FR', { timeZone: TZ, day: 'numeric', month: 'long' });

function dayIndex(d: Date): number {
  const [y, m, day] = DAY_KEY.format(d).split('-').map(Number);
  return Date.UTC(y, m - 1, day) / 86_400_000;
}

/** "aujourd'hui", "hier", "demain" ou "le samedi 26 septembre" (heure de Paris). */
function relativeDay(d: Date, now: Date): string {
  const diff = dayIndex(d) - dayIndex(now);
  if (diff === 0) return "aujourd'hui";
  if (diff === -1) return 'hier';
  if (diff === 1) return 'demain';
  return `le ${LONG_DAY.format(d)}`;
}

function safeUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString() : null;
  } catch {
    return null;
  }
}

function time(d: Date | null | undefined): number {
  return d ? d.getTime() : 0;
}

function newest(shipments: TrackedShipment[]): TrackedShipment {
  return shipments.reduce((best, s) => (time(s.shippedAt) >= time(best.shippedAt) ? s : best));
}

/** Le colis qui dit où en est la commande : le plus récent encore en route,
 *  sinon le plus récent livré. */
function currentShipment(order: TrackedOrder): TrackedShipment | null {
  if (!order.shipments.length) return null;
  const pending = order.shipments.filter(s => s.status !== 'delivered');
  return newest(pending.length ? pending : order.shipments);
}

function isDelivered(order: TrackedOrder): boolean {
  return order.shipments.length
    ? order.shipments.every(s => s.status === 'delivered')
    : order.status === 'delivered';
}

function linkFor(s: TrackedShipment): TrackingLink | null {
  const url = safeUrl(s.trackingUrl);
  return s.trackingNumber || url ? { carrier: s.carrier, trackingNumber: s.trackingNumber, url } : null;
}

const DONE_STATUSES = new Set(['cancelled', 'returned']);

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function trackingSuffix(s: TrackedShipment, link: TrackingLink | null): string {
  if (link?.url) return ' Voici votre suivi.';
  if (s.trackingNumber) return ` Numéro de suivi${s.carrier ? ` ${s.carrier}` : ''} : ${s.trackingNumber}.`;
  return '';
}

function shipmentSentence(n: string, s: TrackedShipment, order: TrackedOrder, now: Date): string {
  const carrier = s.carrier || 'le transporteur';
  const shipped = s.shippedAt ? relativeDay(s.shippedAt, now) : null;
  switch (s.status) {
    case 'delivered': {
      const at = s.deliveredAt ?? order.deliveredAt;
      return `Votre commande ${n} a été livrée${at ? ` ${relativeDay(at, now)}` : ''}. Si vous ne l'avez pas reçue, répondez à l'email de confirmation de votre commande pour prévenir la boutique.`;
    }
    case 'out_for_delivery':
      return `Votre commande ${n} est en cours de livraison avec ${carrier}.`;
    case 'ready_for_pickup':
      return `Votre commande ${n} vous attend au point de retrait${s.carrier ? ` ${s.carrier}` : ''}.`;
    case 'attempted_delivery':
      return `${capitalize(carrier)} a tenté de livrer votre commande ${n} sans y parvenir. Le suivi vous dit où la récupérer ou comment reprogrammer la livraison.`;
    case 'failure':
      return `${capitalize(carrier)} signale un problème de livraison sur votre commande ${n}. Répondez à l'email de confirmation de votre commande pour que la boutique s'en occupe.`;
    case 'in_transit':
      return `Votre commande ${n} est en route avec ${carrier}${shipped ? `, elle est partie ${shipped}` : ''}.`;
    case 'preparing':
      return `Votre commande ${n} est en cours de préparation pour ${carrier}.`;
    default:
      return shipped
        ? `Votre commande ${n} est partie ${shipped} avec ${carrier}.`
        : `Votre commande ${n} est en route avec ${carrier}.`;
  }
}

/** Réponse déterministe pour une commande : statut, transporteur, lien de suivi. */
export function composeOrderStatusReply(order: TrackedOrder, now: Date = new Date()): OrderStatusReply {
  const n = order.orderNumber;

  if (order.status === 'cancelled') return { text: `Votre commande ${n} a été annulée.`, tracking: [] };
  if (order.status === 'returned') return { text: `Votre commande ${n} est enregistrée comme retournée.`, tracking: [] };

  const s = currentShipment(order);
  if (!s) {
    if (order.status === 'delivered') {
      const at = order.deliveredAt ? ` ${relativeDay(order.deliveredAt, now)}` : '';
      return { text: `Votre commande ${n} a été livrée${at}.`, tracking: [] };
    }
    if (order.status === 'shipped' || order.status === 'in_transit') {
      return { text: `Votre commande ${n} a été expédiée.`, tracking: [] };
    }
    if (order.status === 'pending') {
      return { text: `Votre commande ${n} du ${SHORT_DAY.format(order.orderedAt)} est en attente de validation par la boutique.`, tracking: [] };
    }
    return {
      text: `Votre commande ${n} du ${SHORT_DAY.format(order.orderedAt)} est bien enregistrée, elle n'est pas encore partie. Dès son expédition, le suivi apparaîtra ici.`,
      tracking: [],
    };
  }

  const link = linkFor(s);
  let text = shipmentSentence(n, s, order, now);
  // Une date prévue déjà passée ne veut plus rien dire : on ne l'annonce pas.
  if (s.status !== 'delivered' && s.estimatedDelivery && dayIndex(s.estimatedDelivery) >= dayIndex(now)) {
    text += ` Livraison prévue ${relativeDay(s.estimatedDelivery, now)}.`;
  }
  text += trackingSuffix(s, link);

  // Commande en plusieurs colis : on le dit, et on donne le suivi de chacun
  // de ceux encore en route.
  const others = order.shipments.filter(o => o !== s);
  const othersPending = others.filter(o => o.status !== 'delivered');
  if (others.length && s.status !== 'delivered') {
    text += othersPending.length
      ? ' Elle est partie en plusieurs colis, voici le suivi de chacun.'
      : ' Une autre partie de la commande est déjà livrée.';
  }
  const links = [s, ...othersPending].map(linkFor).filter((l): l is TrackingLink => !!l);
  return { text, tracking: links };
}

/** Plusieurs commandes (client connecté) : une phrase par commande. */
export function composeOrdersStatusReply(orders: TrackedOrder[], now: Date = new Date()): OrderStatusReply {
  const parts = orders.map(o => composeOrderStatusReply(o, now));
  return { text: parts.map(p => p.text).join('\n'), tracking: parts.flatMap(p => p.tracking) };
}

/** Commandes à annoncer : celles pas encore arrivées (2 max, les plus récentes),
 *  sinon la dernière commande. */
export function pickOrdersToReport(orders: TrackedOrder[]): TrackedOrder[] {
  const sorted = [...orders].sort((a, b) => b.orderedAt.getTime() - a.orderedAt.getTime());
  const inFlight = sorted.filter(o => !DONE_STATUSES.has(o.status) && !isDelivered(o));
  if (inFlight.length) return inFlight.slice(0, 2);
  return sorted.slice(0, 1);
}

export const ORDER_TEXTS = {
  askBoth: "Je regarde ça pour vous. Pouvez-vous me donner votre numéro de commande (il figure dans l'email de confirmation, par exemple #1042) et l'adresse email utilisée pour la commande ?",
  askEmail: "Merci. Il me manque l'adresse email utilisée pour passer cette commande.",
  askNumber: "Merci. Il me manque le numéro de commande, il figure dans l'email de confirmation (par exemple #1042).",
  noOrderOnAccount: "Je ne vois pas de commande sur votre compte client. Si vous avez commandé sans être connecté, donnez-moi le numéro de commande et l'adresse email utilisée.",
  citedNotOnAccount: (n: string) => `Je ne vois pas la commande ${n} sur votre compte. Si vous l'avez passée avec une autre adresse, donnez-moi l'email utilisé pour cette commande.`,
  notFound: "Je ne retrouve aucune commande avec ce numéro et cette adresse email. Vérifiez-les dans l'email de confirmation de commande et renvoyez-les moi.",
  locked: "Je n'arrive pas à retrouver cette commande ici. Le plus simple est de répondre directement à l'email de confirmation de votre commande, la boutique saura tout de suite de laquelle il s'agit.",
} as const;
