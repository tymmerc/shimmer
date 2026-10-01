/**
 * Cart recovery sweep.
 *
 * Rules (kept conservative on purpose — better to under-send than spam):
 *   - Reminder 1: cart abandoned >= 1h AND no reminder1At AND not recovered.
 *   - Reminder 2: cart abandoned >= 24h AND reminder1 sent >= 20h ago AND no reminder2At AND not recovered.
 *   - Each reminder is claimed in the database BEFORE the email goes out: the
 *     per-cart job and the 15-min sweep can never both send it.
 *   - After reminder 2, we stop. No 3rd reminder.
 *
 * Avant chaque envoi (01/10), dans l'ordre :
 *   - une adresse (celle du panier, sinon celle du client) ;
 *   - pas désinscrite des e-mails de la boutique (lien en pied de chaque relance) ;
 *   - accord marketing donné, sauf si la boutique a choisi l'audience « all »
 *     (config.cart_reminders.audience ; par défaut « subscribers ») ;
 *   - pas de commande payée du même client depuis l'abandon (casse ignorée) ;
 *   - pas d'autre panier ouvert plus récent du même client, ni de relance
 *     envoyée à cette adresse dans les 20 dernières heures (un seul fil).
 * Chaque refus pose un statut final (no_email, unsubscribed, no_consent,
 * ordered, duplicate) : le balayage ne repasse plus dessus. Aucun de ces
 * refus ne touche recovered_at : seuls les webhooks de commande récupèrent un
 * panier, pareil pour le groupe témoin et le groupe relancé (sinon la preuve
 * des relances, facturée, serait gonflée).
 * Tant que sql/2026-10-01-cart-reminders.sql n'est pas passé, rien ne part.
 *
 * La relance n°2 ne parle d'un code promo que si la boutique en a créé un et
 * l'a déclaré (config.cart_reminders.discount_code + discount_percent) : avant
 * le 01/10 elle annonçait un code SHIMMER10-<id> qui n'existait pas.
 */

import { getPrisma, logger } from '@shimmer/core';
import { sendEmail } from '@shimmer/email-connector';
import { isControlCart, resolveHoldoutConfig, type HoldoutConfig } from '../holdout/bucket.js';
import { isSuppressed, unsubscribeLink } from '../unsubscribe.js';
import { reminderSchemaReady } from '../reminder-schema.js';

interface CartRow {
  id: number;
  storeId: number;
  customerId: number | null;
  customerEmail: string | null;
  items: unknown;
  totalAmount: { toString(): string } | number | string;
  abandonedAt: Date;
  reminder1At: Date | null;
  reminder2At: Date | null;
  recoveredAt: Date | null;
  status: string;
}

interface SweepResult {
  scannedStep1: number;
  scannedStep2: number;
  sent: number;
  skipped: number;
  /** Carts held out of the reminder sequence (control group of the relance experiment). */
  heldOut: number;
  errors: number;
}

export interface ReminderSettings {
  /** 'subscribers' : seulement les clients qui ont accepté le marketing. */
  audience: 'subscribers' | 'all';
  discountCode: string | null;
  discountPercent: number | null;
}

interface StoreContext {
  name: string;
  holdout: HoldoutConfig;
  reminders: ReminderSettings;
}

export type ReminderSkipReason =
  | 'paused' | 'no-recipient' | 'unsubscribed' | 'no-consent' | 'ordered' | 'duplicate' | 'already-sent';

export type ReminderOutcome =
  | { status: 'sent'; step: 1 | 2; subject: string; body: string; promoCode: string | null; emailId: number; emailStatus: string }
  | { status: 'skipped'; reason: ReminderSkipReason }
  | { status: 'failed'; error: string };

const DISCOUNT_CODE_RE = /^[A-Za-z0-9_-]{3,40}$/;

/** Réglages des relances de la boutique, lus prudemment (config jsonb libre). */
export function reminderSettings(config: unknown): ReminderSettings {
  const raw = (config && typeof config === 'object' ? (config as Record<string, unknown>).cart_reminders : null) as
    Record<string, unknown> | null | undefined;
  const audience = raw?.audience === 'all' ? 'all' : 'subscribers';
  const code = typeof raw?.discount_code === 'string' && DISCOUNT_CODE_RE.test(raw.discount_code) ? raw.discount_code : null;
  const pct = typeof raw?.discount_percent === 'number' && Number.isInteger(raw.discount_percent)
    && raw.discount_percent >= 1 && raw.discount_percent <= 90 ? raw.discount_percent : null;
  return { audience, discountCode: code && pct ? code : null, discountPercent: code && pct ? pct : null };
}

async function storeContextFor(storeId: number, cache: Map<number, StoreContext>): Promise<StoreContext> {
  const cached = cache.get(storeId);
  if (cached) return cached;
  const store = await getPrisma().store.findUnique({ where: { id: storeId } });
  const config = (store?.config ?? {}) as Record<string, unknown>;
  const ctx: StoreContext = {
    name: store?.name ?? 'la boutique',
    holdout: resolveHoldoutConfig(config.holdout),
    reminders: reminderSettings(config),
  };
  cache.set(storeId, ctx);
  return ctx;
}

/**
 * A control cart is never reminded, so the natural-return rate stays
 * observable. We mark it once (status 'holdout_control') so the sweep stops
 * re-scanning it; order webhooks still mark it recovered independently of
 * status, which is what keeps the outcome measurement unbiased.
 */
async function holdOutIfControl(cart: CartRow, cache: Map<number, StoreContext>, result: SweepResult): Promise<boolean> {
  const { holdout } = await storeContextFor(cart.storeId, cache);
  if (!isControlCart(cart.id, cart.storeId, holdout)) return false;
  if (cart.status !== 'holdout_control') {
    await getPrisma().abandonedCart.update({
      where: { id: cart.id },
      data: { status: 'holdout_control' },
    });
  }
  result.heldOut += 1;
  return true;
}

const euros = (n: number) => `${(Number.isFinite(n) ? n : 0).toFixed(2).replace('.', ',')} €`;

/** Texte des relances (sans le pied de désinscription, ajouté à l'envoi). */
export function buildReminder(
  step: 1 | 2,
  opts: {
    storeName: string;
    items: Array<{ name: string }>;
    total: number;
    checkoutUrl?: string | null;
    discount?: { code: string; percent: number } | null;
  },
): { subject: string; body: string } {
  const names = opts.items.map((i) => i?.name).filter((n): n is string => typeof n === 'string' && n.length > 0);
  const listed = names.slice(0, 3).join(', ');
  const more = names.length > 3 ? ` et ${names.length - 3} autre${names.length - 3 > 1 ? 's' : ''}` : '';
  const what = listed ? `${listed}${more} (${euros(opts.total)})` : euros(opts.total);
  const link = opts.checkoutUrl ? `\n\nReprendre ma commande : ${opts.checkoutUrl}` : '';
  const sign = `\n\nÀ bientôt,\n${opts.storeName}`;

  if (step === 1) {
    return {
      subject: `Votre panier chez ${opts.storeName} vous attend`,
      body: `Bonjour,\n\nVotre panier est toujours là : ${what}.${link}${sign}`,
    };
  }
  if (opts.discount) {
    return {
      subject: `Un petit geste pour votre panier chez ${opts.storeName}`,
      body: `Bonjour,\n\nVotre panier est encore disponible : ${what}.\n\n`
        + `Avec le code ${opts.discount.code}, vous avez -${opts.discount.percent} % sur cette commande. `
        + `C'est notre dernier rappel.${link}${sign}`,
    };
  }
  return {
    subject: `Dernier rappel pour votre panier chez ${opts.storeName}`,
    body: `Bonjour,\n\nVotre panier est encore disponible : ${what}.\n\nC'est notre dernier rappel.${link}${sign}`,
  };
}

/** Écart minimal entre les deux relances : jamais la n°2 juste après la n°1. */
export const MIN_GAP_BETWEEN_REMINDERS_MS = 20 * 60 * 60 * 1000;
const ONE_HOUR_MS = 60 * 60 * 1000;
const ONE_DAY_MS = 24 * ONE_HOUR_MS;

export async function sweepCartReminders(now: Date = new Date()): Promise<SweepResult> {
  const prisma = getPrisma();
  const oneHourAgo = new Date(now.getTime() - ONE_HOUR_MS);
  const oneDayAgo = new Date(now.getTime() - ONE_DAY_MS);
  const gapAgo = new Date(now.getTime() - MIN_GAP_BETWEEN_REMINDERS_MS);

  const step1Carts = await prisma.abandonedCart.findMany({
    where: {
      reminder1At: null,
      recoveredAt: null,
      abandonedAt: { lte: oneHourAgo },
      status: { in: ['pending', 'abandoned'] },
    },
    orderBy: { abandonedAt: 'asc' },
    take: 200,
  });

  const step2Carts = await prisma.abandonedCart.findMany({
    where: {
      reminder1At: { lte: gapAgo },
      reminder2At: null,
      recoveredAt: null,
      abandonedAt: { lte: oneDayAgo },
      status: { in: ['pending', 'abandoned', 'reminded_once'] },
    },
    orderBy: { abandonedAt: 'asc' },
    take: 200,
  });

  const result: SweepResult = {
    scannedStep1: step1Carts.length,
    scannedStep2: step2Carts.length,
    sent: 0,
    skipped: 0,
    heldOut: 0,
    errors: 0,
  };

  const cache = new Map<number, StoreContext>();
  for (const cart of step1Carts) {
    if (await holdOutIfControl(cart, cache, result)) continue;
    tally(result, await sendCartReminder(cart, 1, cache));
  }
  for (const cart of step2Carts) {
    if (await holdOutIfControl(cart, cache, result)) continue;
    tally(result, await sendCartReminder(cart, 2, cache));
  }

  logger.info({ ...result }, 'automation.cart-reminders.swept');
  return result;
}

function tally(result: SweepResult, outcome: ReminderOutcome): void {
  if (outcome.status === 'sent') result.sent += 1;
  else if (outcome.status === 'skipped') result.skipped += 1;
  else result.errors += 1;
}

/**
 * Per-cart processor invoked by the BullMQ delayed job. Idempotent: only
 * sends if the reminder hasn't already been sent and the cart isn't
 * recovered. Safe to enqueue duplicates. La tâche est planifiée à la création
 * du panier ; si le client est revenu sur son checkout depuis, le panier est
 * trop récent et c'est le balayage qui s'en chargera.
 */
export async function processCartReminderJob(
  { cartId, step }: { cartId: number; step: 1 | 2 },
  now: Date = new Date(),
): Promise<{ sent: boolean; reason?: string }> {
  const prisma = getPrisma();
  const cart = await prisma.abandonedCart.findUnique({ where: { id: cartId } });
  if (!cart) return { sent: false, reason: 'cart-not-found' };
  if (cart.recoveredAt) return { sent: false, reason: 'already-recovered' };

  // Relance experiment: control carts are never reminded (see holdout/proof.ts).
  const cache = new Map<number, StoreContext>();
  const { holdout } = await storeContextFor(cart.storeId, cache);
  if (isControlCart(cart.id, cart.storeId, holdout)) {
    if (cart.status !== 'holdout_control') {
      await prisma.abandonedCart.update({ where: { id: cart.id }, data: { status: 'holdout_control' } });
    }
    return { sent: false, reason: 'holdout-control' };
  }
  if (step === 1 && cart.reminder1At) return { sent: false, reason: 'reminder1-already-sent' };
  if (step === 2 && cart.reminder2At) return { sent: false, reason: 'reminder2-already-sent' };
  if (step === 2 && !cart.reminder1At) return { sent: false, reason: 'reminder1-missing' };
  const age = now.getTime() - cart.abandonedAt.getTime();
  if (age < (step === 1 ? ONE_HOUR_MS : ONE_DAY_MS)) return { sent: false, reason: 'cart-too-recent' };
  // Relance n°1 partie en retard (rattrapage) : la n°2 attendra le balayage.
  if (step === 2 && cart.reminder1At && now.getTime() - cart.reminder1At.getTime() < MIN_GAP_BETWEEN_REMINDERS_MS) {
    return { sent: false, reason: 'reminder2-too-soon' };
  }
  if (!['pending', 'abandoned', 'reminded_once'].includes(cart.status)) return { sent: false, reason: `status-${cart.status}` };

  const outcome = await sendCartReminder(cart, step, cache);
  if (outcome.status === 'sent') return { sent: true };
  return { sent: false, reason: outcome.status === 'skipped' ? outcome.reason : 'send-failed' };
}

/** Pose un statut final sur un panier encore ouvert (le balayage l'oublie). */
async function closeCart(cartId: number, status: string): Promise<void> {
  await getPrisma().abandonedCart.updateMany({
    where: { id: cartId, recoveredAt: null },
    data: { status },
  });
}

/** Commande payée du même client (casse ignorée) depuis l'abandon. */
async function orderedSince(storeId: number, email: string, since: Date): Promise<boolean> {
  // 'pending' : commande Woo pas encore payée (en attente, virement) ;
  // 'cancelled' et 'returned' : défaites.
  const rows = await getPrisma().$queryRaw<Array<{ one: number }>>`
    SELECT 1 AS one
    FROM orders o JOIN customers c ON c.id = o.customer_id
    WHERE o.store_id = ${storeId} AND lower(c.email) = ${email.trim().toLowerCase()}
      AND o.ordered_at >= ${since} AND o.status NOT IN ('pending', 'cancelled', 'returned')
    LIMIT 1`;
  return rows.length > 0;
}

/** Un autre fil de relance existe déjà pour cette adresse. */
async function otherThread(cart: CartRow, email: string, now: Date): Promise<boolean> {
  const since = new Date(now.getTime() - MIN_GAP_BETWEEN_REMINDERS_MS);
  const rows = await getPrisma().$queryRaw<Array<{ one: number }>>`
    SELECT 1 AS one FROM abandoned_carts
    WHERE store_id = ${cart.storeId} AND id <> ${cart.id} AND lower(customer_email) = ${email.trim().toLowerCase()}
      AND (
        (recovered_at IS NULL AND status IN ('pending', 'abandoned', 'reminded_once') AND abandoned_at > ${cart.abandonedAt})
        OR reminder1_at > ${since} OR reminder2_at > ${since}
      )
    LIMIT 1`;
  return rows.length > 0;
}

/**
 * Envoie la relance `step` d'un panier si toutes les règles le permettent.
 * Utilisée par le balayage, la tâche différée et le bouton de l'admin.
 */
export async function sendCartReminder(
  cart: CartRow,
  step: 1 | 2,
  cache: Map<number, StoreContext> = new Map(),
  now: Date = new Date(),
): Promise<ReminderOutcome> {
  const prisma = getPrisma();
  if (!(await reminderSchemaReady())) return { status: 'skipped', reason: 'paused' };

  let recipient: string | null = cart.customerEmail;
  if (!recipient && cart.customerId) {
    const customer = await prisma.customer.findFirst({ where: { id: cart.customerId, storeId: cart.storeId } });
    recipient = customer?.email ?? null;
  }
  if (!recipient) {
    await closeCart(cart.id, 'no_email');
    return { status: 'skipped', reason: 'no-recipient' };
  }

  if (await isSuppressed(cart.storeId, recipient)) {
    await closeCart(cart.id, 'unsubscribed');
    return { status: 'skipped', reason: 'unsubscribed' };
  }

  const ctx = await storeContextFor(cart.storeId, cache);
  const extra = (await prisma.$queryRaw<Array<{ marketing_consent: boolean | null; checkout_url: string | null }>>`
    SELECT marketing_consent, checkout_url FROM abandoned_carts WHERE id = ${cart.id}`)[0];
  if (ctx.reminders.audience === 'subscribers' && extra?.marketing_consent !== true) {
    await closeCart(cart.id, 'no_consent');
    return { status: 'skipped', reason: 'no-consent' };
  }

  if (await orderedSince(cart.storeId, recipient, cart.abandonedAt)) {
    await closeCart(cart.id, 'ordered');
    return { status: 'skipped', reason: 'ordered' };
  }
  if (await otherThread(cart, recipient, now)) {
    await closeCart(cart.id, 'duplicate');
    return { status: 'skipped', reason: 'duplicate' };
  }

  const discount = step === 2 && ctx.reminders.discountCode && ctx.reminders.discountPercent
    ? { code: ctx.reminders.discountCode, percent: ctx.reminders.discountPercent }
    : null;
  const items = Array.isArray(cart.items) ? (cart.items as Array<{ name: string }>) : [];
  const reminder = buildReminder(step, {
    storeName: ctx.name,
    items,
    total: Number(cart.totalAmount),
    checkoutUrl: extra?.checkout_url ?? null,
    discount,
  });
  const promoCode = discount?.code ?? null;

  // Réservation atomique avant l'envoi : si un autre passage a déjà pris
  // cette relance, count vaut 0 et on n'envoie rien.
  const claim = await prisma.abandonedCart.updateMany({
    where: step === 1
      ? { id: cart.id, recoveredAt: null, reminder1At: null }
      : { id: cart.id, recoveredAt: null, reminder1At: { not: null }, reminder2At: null },
    data: step === 1
      ? { reminder1At: new Date(), status: 'reminded_once' }
      : { reminder2At: new Date(), promoCode, status: 'reminded_twice' },
  });
  if (claim.count === 0) return { status: 'skipped', reason: 'already-sent' };

  try {
    const unsub = unsubscribeLink(cart.storeId, recipient);
    const r = await sendEmail({
      storeId: cart.storeId,
      to: recipient,
      subject: reminder.subject,
      bodyText: reminder.body + unsub.footer,
      unsubscribeUrl: unsub.url,
      // Le lien de désinscription n'a rien à faire en clair dans la base.
      storedBodyText: `${reminder.body}\n\n--\n[lien de désinscription]`,
      tag: `cart-recovery-step-${step}`,
      relatedEntity: 'cart',
      relatedId: cart.id,
    });
    // Refusé par le fournisseur ou adresse de test : compté comme échec (la
    // ligne sent_emails le dit), jamais comme une relance réussie.
    if (r.status === 'failed') {
      logger.warn({ cartId: cart.id, step, error: r.error }, 'automation.cart-reminders.send-failed');
      return { status: 'failed', error: r.error ?? 'failed' };
    }
    return { status: 'sent', step, ...reminder, promoCode, emailId: r.id, emailStatus: r.status };
  } catch (err) {
    logger.warn({ err, cartId: cart.id, step }, 'automation.cart-reminders.send-failed');
    return { status: 'failed', error: 'send-error' };
  }
}
