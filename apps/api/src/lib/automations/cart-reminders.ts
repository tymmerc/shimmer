/**
 * Cart recovery sweep.
 *
 * Rules (kept conservative on purpose — better to under-send than spam):
 *   - Reminder 1: cart abandoned >= 1h AND no reminder1At AND not recovered.
 *   - Reminder 2: cart abandoned >= 24h AND reminder1At set AND no reminder2At AND not recovered.
 *   - After reminder 2, we stop. No 3rd reminder.
 *
 * Recipient resolution: customerEmail wins, then customer.email lookup.
 */

import { getPrisma, logger } from '@shimmer/core';
import { sendEmail } from '@shimmer/email-connector';
import { isControlCart, resolveHoldoutConfig, type HoldoutConfig } from '../holdout/bucket.js';

interface CartRow {
  id: number;
  storeId: number;
  customerId: number | null;
  customerEmail: string | null;
  items: unknown;
  totalAmount: { toString(): string } | number | string;
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

// Store holdout configs, cached per sweep so 200 carts don't mean 200 queries.
async function holdoutConfigFor(storeId: number, cache: Map<number, HoldoutConfig>): Promise<HoldoutConfig> {
  const cached = cache.get(storeId);
  if (cached) return cached;
  const prisma = getPrisma();
  const store = await prisma.store.findUnique({ where: { id: storeId } });
  const cfg = resolveHoldoutConfig(((store?.config ?? {}) as Record<string, unknown>).holdout);
  cache.set(storeId, cfg);
  return cfg;
}

/**
 * A control cart is never reminded, so the natural-return rate stays
 * observable. We mark it once (status 'holdout_control') so the sweep stops
 * re-scanning it; order webhooks still mark it recovered independently of
 * status, which is what keeps the outcome measurement unbiased.
 */
async function holdOutIfControl(cart: CartRow, cache: Map<number, HoldoutConfig>, result: SweepResult): Promise<boolean> {
  const cfg = await holdoutConfigFor(cart.storeId, cache);
  if (!isControlCart(cart.id, cart.storeId, cfg)) return false;
  if (cart.status !== 'holdout_control') {
    await getPrisma().abandonedCart.update({
      where: { id: cart.id },
      data: { status: 'holdout_control' },
    });
  }
  result.heldOut += 1;
  return true;
}

function buildReminder(
  step: 1 | 2,
  items: Array<{ name: string }>,
  total: number,
  promoCode?: string,
): { subject: string; body: string } {
  const itemList = items.slice(0, 3).map(i => i.name).join(', ');
  const more = items.length > 3 ? ` et ${items.length - 3} autre(s)` : '';
  if (step === 1) {
    return {
      subject: `Votre panier vous attend (${total.toFixed(2)}€)`,
      body: `Bonjour, votre panier avec ${itemList}${more} est toujours là. Une question ? Le vendeur est dispo.`,
    };
  }
  return {
    subject: `On vous offre 10% si vous finalisez aujourd'hui`,
    body: `On voulait pas vous laisser partir. Code ${promoCode ?? 'SHIMMER10'} valable 48h pour faire passer votre panier (${total.toFixed(2)}€) à -10%.`,
  };
}

export async function sweepCartReminders(now: Date = new Date()): Promise<SweepResult> {
  const prisma = getPrisma();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const step1Carts = await prisma.abandonedCart.findMany({
    where: {
      reminder1At: null,
      recoveredAt: null,
      abandonedAt: { lte: oneHourAgo },
      status: { in: ['pending', 'abandoned'] },
    },
    take: 200,
  });

  const step2Carts = await prisma.abandonedCart.findMany({
    where: {
      reminder1At: { not: null },
      reminder2At: null,
      recoveredAt: null,
      abandonedAt: { lte: oneDayAgo },
      status: { in: ['pending', 'abandoned', 'reminded_once'] },
    },
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

  const cfgCache = new Map<number, HoldoutConfig>();
  for (const cart of step1Carts) {
    if (await holdOutIfControl(cart, cfgCache, result)) continue;
    await sendOne(cart, 1, result);
  }
  for (const cart of step2Carts) {
    if (await holdOutIfControl(cart, cfgCache, result)) continue;
    await sendOne(cart, 2, result);
  }

  logger.info({ ...result }, 'automation.cart-reminders.swept');
  return result;
}

/**
 * Per-cart processor invoked by the BullMQ delayed job. Idempotent: only
 * sends if the reminder hasn't already been sent and the cart isn't
 * recovered. Safe to enqueue duplicates.
 */
export async function processCartReminderJob({ cartId, step }: { cartId: number; step: 1 | 2 }): Promise<{ sent: boolean; reason?: string }> {
  const prisma = getPrisma();
  const cart = await prisma.abandonedCart.findUnique({ where: { id: cartId } });
  if (!cart) return { sent: false, reason: 'cart-not-found' };
  if (cart.recoveredAt) return { sent: false, reason: 'already-recovered' };

  // Relance experiment: control carts are never reminded (see holdout/proof.ts).
  const cfg = await holdoutConfigFor(cart.storeId, new Map());
  if (isControlCart(cart.id, cart.storeId, cfg)) {
    if (cart.status !== 'holdout_control') {
      await prisma.abandonedCart.update({ where: { id: cart.id }, data: { status: 'holdout_control' } });
    }
    return { sent: false, reason: 'holdout-control' };
  }
  if (step === 1 && cart.reminder1At) return { sent: false, reason: 'reminder1-already-sent' };
  if (step === 2 && cart.reminder2At) return { sent: false, reason: 'reminder2-already-sent' };
  if (step === 2 && !cart.reminder1At) return { sent: false, reason: 'reminder1-missing' };

  const result: SweepResult = { scannedStep1: 0, scannedStep2: 0, sent: 0, skipped: 0, heldOut: 0, errors: 0 };
  await sendOne(cart, step, result);
  return { sent: result.sent > 0, reason: result.skipped > 0 ? 'no-recipient' : undefined };
}

async function sendOne(cart: CartRow, step: 1 | 2, result: SweepResult): Promise<void> {
  const prisma = getPrisma();

  let recipient: string | null = cart.customerEmail;
  if (!recipient && cart.customerId) {
    const customer = await prisma.customer.findUnique({ where: { id: cart.customerId } });
    recipient = customer?.email ?? null;
  }
  if (!recipient) {
    result.skipped += 1;
    return;
  }

  const items = (cart.items as unknown as Array<{ name: string; price: number; quantity: number }>) ?? [];
  const promoCode = step === 2 ? `SHIMMER10-${cart.id}` : undefined;
  const reminder = buildReminder(step, items, Number(cart.totalAmount), promoCode);

  try {
    await sendEmail({
      storeId: cart.storeId,
      to: recipient,
      subject: reminder.subject,
      bodyText: reminder.body,
      tag: `cart-recovery-step-${step}`,
      relatedEntity: 'cart',
      relatedId: cart.id,
    });
    await prisma.abandonedCart.update({
      where: { id: cart.id },
      data: {
        ...(step === 1
          ? { reminder1At: new Date(), status: 'reminded_once' }
          : { reminder2At: new Date(), promoCode, status: 'reminded_twice' }),
      },
    });
    result.sent += 1;
  } catch (err) {
    logger.warn({ err, cartId: cart.id, step }, 'automation.cart-reminders.send-failed');
    result.errors += 1;
  }
}
