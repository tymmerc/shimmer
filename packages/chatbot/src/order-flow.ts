/**
 * Suivi de commande : l'enchaînement des décisions (demander, vérifier,
 * répondre, bloquer). Les accès base sont injectés, pour tester sans base.
 */

import {
  detectOrderTrackingIntent,
  extractEmail,
  extractOrderNumber,
  isAwaitingOrderRef,
  collectOrderRef,
  countFailedVerifications,
  isSessionLocked,
  sameOrderNumber,
  composeOrderStatusReply,
  composeOrdersStatusReply,
  pickOrdersToReport,
  throttleKey,
  MAX_FAILED_VERIFICATIONS,
  ORDER_TEXTS,
  type FlowMessage,
  type OrderReplyKind,
  type TrackedOrder,
  type TrackingLink,
} from './order-tracking.js';

export interface OrderFlowDeps {
  /** La commande dont le numéro ET l'email correspondent, sinon null. */
  findByRef(orderDigits: string, email: string): Promise<TrackedOrder | null>;
  /** Commandes récentes d'un client identifié (email signé). */
  findRecentForEmail(email: string): Promise<TrackedOrder[]>;
  throttle: { tryAcquire(keys: string[]): boolean; release(keys: string[]): void };
}

export interface OrderFlowInput {
  message: string;
  /** Messages de la session AVANT le message courant. */
  history: FlowMessage[];
  /** Email du client connecté, déjà vérifié (signature). Jamais un email saisi. */
  trustedEmail?: string | null;
  /** Espace du throttle (l'id boutique). */
  throttleScope?: string;
  now?: Date;
}

export interface OrderFlowResult {
  kind: OrderReplyKind;
  text: string;
  tracking: TrackingLink[];
  /** Vrai si la prochaine réponse du visiteur doit revenir au SAV (numéro / email attendus). */
  awaitingOrderRef: boolean;
  /** Commande annoncée (une seule), pour l'historique de session. */
  orderNumber?: string;
}

function ask(text: string): OrderFlowResult {
  return { kind: 'order_ask', text, tracking: [], awaitingOrderRef: true };
}

function locked(): OrderFlowResult {
  return { kind: 'order_locked', text: ORDER_TEXTS.locked, tracking: [], awaitingOrderRef: false };
}

function status(orders: TrackedOrder[], now: Date): OrderFlowResult {
  const reply = orders.length === 1
    ? composeOrderStatusReply(orders[0], now)
    : composeOrdersStatusReply(orders, now);
  return {
    kind: 'order_status',
    text: reply.text,
    tracking: reply.tracking,
    awaitingOrderRef: false,
    ...(orders.length === 1 ? { orderNumber: orders[0].orderNumber } : {}),
  };
}

/**
 * Renvoie la réponse du suivi de commande, ou null si le message ne concerne
 * pas le suivi (le LLM prend alors la main).
 */
export async function runOrderFlow(input: OrderFlowInput, deps: OrderFlowDeps): Promise<OrderFlowResult | null> {
  const { message, history, trustedEmail } = input;
  const now = input.now ?? new Date();
  const awaiting = isAwaitingOrderRef(history);

  const intent = detectOrderTrackingIntent(message);
  const givesRef = !!(extractOrderNumber(message, { allowBare: awaiting }) || extractEmail(message));
  if (!intent && !(awaiting && givesRef)) return null;

  const ref = collectOrderRef(message, history);

  // Client connecté : ses commandes, sans rien lui demander.
  if (trustedEmail) {
    const mine = await deps.findRecentForEmail(trustedEmail);
    if (ref.orderNumber) {
      // Commande plus ancienne que les dernières lues : on la cherche directement.
      const hit = mine.find(o => sameOrderNumber(o.orderNumber, ref.orderNumber!))
        ?? await deps.findByRef(ref.orderNumber, trustedEmail);
      if (hit) return status([hit], now);
      if (!ref.email) return ask(ORDER_TEXTS.citedNotOnAccount(`#${ref.orderNumber}`));
    } else if (!ref.email) {
      const toReport = pickOrdersToReport(mine);
      return toReport.length ? status(toReport, now) : ask(ORDER_TEXTS.noOrderOnAccount);
    }
  }

  // Visiteur non identifié (ou commande passée avec une autre adresse).
  if (isSessionLocked(history)) return locked();
  const failures = countFailedVerifications(history);

  if (!ref.orderNumber && !ref.email) return ask(ORDER_TEXTS.askBoth);
  if (!ref.email) return ask(ORDER_TEXTS.askEmail);
  if (!ref.orderNumber) return ask(ORDER_TEXTS.askNumber);

  // Limite par email ET par numéro de commande, toutes sessions confondues :
  // ouvrir une nouvelle session ne redonne pas d'essais.
  const scope = input.throttleScope ?? '-';
  const keys = [throttleKey(`${scope}:email`, ref.email), `${scope}:order:${ref.orderNumber}`];
  if (!deps.throttle.tryAcquire(keys)) return locked();

  const order = await deps.findByRef(ref.orderNumber, ref.email);
  if (order) {
    deps.throttle.release(keys);
    return status([order], now);
  }
  if (failures + 1 >= MAX_FAILED_VERIFICATIONS) return locked();
  return { kind: 'order_not_found', text: ORDER_TEXTS.notFound, tracking: [], awaitingOrderRef: true };
}
