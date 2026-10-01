/**
 * Cart recovery routes — track abandoned carts, schedule reminders,
 * mark recoveries when the customer comes back.
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { getPrisma, logger, ShimmerError } from '@shimmer/core';
import { enqueueCartReminders } from '../lib/automations/queue.js';
import { sendCartReminder, type ReminderSkipReason } from '../lib/automations/cart-reminders.js';
import { upsertCart } from '../lib/abandoned-carts.js';
import { isControlCart, resolveHoldoutConfig } from '../lib/holdout/bucket.js';
import { assertCustomerInStore } from '../lib/tenant.js';

export const cartRecoveryRouter = Router();

const abandonSchema = z.object({
  customerId: z.number().int().positive().optional(),
  customerEmail: z.string().email().max(255).optional(),
  items: z.array(z.object({
    productId: z.number().int().positive().optional(),
    name: z.string().max(500),
    price: z.number().min(0),
    quantity: z.number().int().min(1).default(1),
  })).min(1),
  totalAmount: z.number().min(0).max(100000),
  /** Le client a accepté les e-mails marketing (sinon pas de relance, sauf audience « all »). */
  marketingConsent: z.boolean().optional(),
});

const recoverSchema = z.object({
  recoveredAmount: z.number().min(0).optional(),
  orderId: z.number().int().positive().optional(),
});

// Pourquoi une relance manuelle n'est pas partie (message pour le marchand).
const SKIP_MESSAGES: Record<ReminderSkipReason, string> = {
  paused: 'Les relances sont en pause le temps d\'une mise à jour de la base. Réessayez plus tard.',
  duplicate: 'Ce client a un panier plus récent, ou a déjà reçu une relance dans les 20 dernières heures.',
  'no-recipient': "Ce panier n'a pas d'adresse e-mail.",
  unsubscribed: "Ce client s'est désinscrit des e-mails de la boutique.",
  'no-consent': "Ce client n'a pas accepté les e-mails marketing : pas de relance (réglage : relances aux abonnés seulement).",
  ordered: 'Ce client a passé une commande payée depuis : pas de relance.',
  'already-sent': 'Cette relance est déjà partie.',
};

// ─────────────────────────────────────────────────────────────
// POST /api/cart-recovery/abandon — record an abandoned cart
// ─────────────────────────────────────────────────────────────
cartRecoveryRouter.post('/abandon', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = abandonSchema.parse(req.body);
    const storeId = req.storeId!;
    if (!body.customerId && !body.customerEmail) {
      throw new ShimmerError('customerId or customerEmail is required', 'BAD_REQUEST', 400);
    }
    const prisma = getPrisma();
    if (body.customerId) await assertCustomerInStore(prisma, storeId, body.customerId);
    const created = await upsertCart({
      storeId,
      platformRef: null,
      customerId: body.customerId ?? null,
      email: body.customerEmail ?? null,
      items: body.items.map((i) => ({ name: i.name, price: i.price, quantity: i.quantity, productId: i.productId ?? null })),
      total: body.totalAmount,
      lastActivityAt: new Date(),
      marketingConsent: body.marketingConsent ?? null,
      checkoutUrl: null,
    });
    if (created.action !== 'created') {
      throw new ShimmerError('customerId or customerEmail is required', 'BAD_REQUEST', 400);
    }
    const cart = await prisma.abandonedCart.findUnique({ where: { id: created.cartId } });
    if (!cart) throw new ShimmerError('Cart not found', 'NOT_FOUND', 404);
    try {
      await enqueueCartReminders(cart.id);
    } catch (err) {
      logger.warn({ err, cartId: cart.id }, 'cart.abandoned.enqueue-failed');
    }
    logger.info({ storeId, cartId: cart.id, total: body.totalAmount }, 'cart.abandoned');
    res.json({ cart });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/cart-recovery/carts — list abandoned carts
// ─────────────────────────────────────────────────────────────
cartRecoveryRouter.get('/carts', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const storeId = req.storeId!;
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const prisma = getPrisma();
    const carts = await prisma.abandonedCart.findMany({
      where: { storeId, ...(status ? { status } : {}) },
      orderBy: { abandonedAt: 'desc' },
      take: 100,
    });
    res.json({ carts });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/cart-recovery/:id/send-reminder — schedule/send a reminder
// ─────────────────────────────────────────────────────────────
cartRecoveryRouter.post('/:id/send-reminder', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const storeId = req.storeId!;
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new ShimmerError('Invalid id', 'BAD_REQUEST', 400);
    }
    const prisma = getPrisma();
    const cart = await prisma.abandonedCart.findFirst({ where: { id, storeId } });
    if (!cart) throw new ShimmerError('Cart not found', 'NOT_FOUND', 404);
    if (cart.recoveredAt) throw new ShimmerError('Cart already recovered', 'ALREADY_RECOVERED', 400);

    // Control cart of the relance experiment: reminding it manually would
    // contaminate the measured natural-return rate, so we refuse loudly.
    const store = await prisma.store.findUnique({ where: { id: storeId } });
    const holdoutCfg = resolveHoldoutConfig(((store?.config ?? {}) as Record<string, unknown>).holdout);
    if (isControlCart(cart.id, storeId, holdoutCfg)) {
      throw new ShimmerError(
        'Ce panier fait partie du groupe témoin de la mesure : il ne reçoit pas de relance, c\'est lui qui prouve ce que les relances rapportent.',
        'HOLDOUT_CONTROL',
        409,
      );
    }

    const step: 1 | 2 = cart.reminder1At ? 2 : 1;
    if (step === 2 && cart.reminder2At) {
      throw new ShimmerError(SKIP_MESSAGES['already-sent'], 'ALREADY_SENT', 409);
    }

    // Mêmes règles que les relances automatiques : désinscription, accord
    // marketing, commande passée depuis.
    const outcome = await sendCartReminder(cart, step);
    if (outcome.status === 'skipped') {
      throw new ShimmerError(SKIP_MESSAGES[outcome.reason], `REMINDER_${outcome.reason.toUpperCase().replace(/-/g, '_')}`, 409);
    }
    if (outcome.status === 'failed') {
      throw new ShimmerError("L'e-mail a été refusé par le fournisseur d'envoi.", 'SEND_FAILED', 502);
    }
    const updated = await prisma.abandonedCart.findUnique({ where: { id } });

    logger.info({ storeId, cartId: id, step, emailId: outcome.emailId }, 'cart.reminder.sent');
    res.json({
      cart: updated,
      reminder: { step, channel: 'EMAIL', subject: outcome.subject, body: outcome.body, promoCode: outcome.promoCode },
      email: { id: outcome.emailId, status: outcome.emailStatus },
    });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/cart-recovery/:id/recover — mark cart as recovered
// ─────────────────────────────────────────────────────────────
cartRecoveryRouter.post('/:id/recover', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const storeId = req.storeId!;
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new ShimmerError('Invalid id', 'BAD_REQUEST', 400);
    }
    const body = recoverSchema.parse(req.body);
    const prisma = getPrisma();
    const cart = await prisma.abandonedCart.findFirst({ where: { id, storeId } });
    if (!cart) throw new ShimmerError('Cart not found', 'NOT_FOUND', 404);

    const updated = await prisma.abandonedCart.update({
      where: { id },
      data: {
        recoveredAt: new Date(),
        recoveredAmount: body.recoveredAmount ?? cart.totalAmount,
        status: 'recovered',
      },
    });
    logger.info({ storeId, cartId: id, amount: updated.recoveredAmount }, 'cart.recovered');
    res.json({ cart: updated });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/cart-recovery/stats — dashboard stats
// ─────────────────────────────────────────────────────────────
cartRecoveryRouter.get('/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const storeId = req.storeId!;
    const prisma = getPrisma();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400 * 1000);

    const all = await prisma.abandonedCart.findMany({
      where: { storeId, abandonedAt: { gte: thirtyDaysAgo } },
      select: {
        status: true,
        totalAmount: true,
        recoveredAmount: true,
        reminder1At: true,
        reminder2At: true,
        recoveredAt: true,
      },
    });
    const total = all.length;
    const recovered = all.filter(c => c.recoveredAt).length;
    const recoveredAfter1 = all.filter(c => c.recoveredAt && c.reminder1At && !c.reminder2At).length;
    const recoveredAfter2 = all.filter(c => c.recoveredAt && c.reminder2At).length;
    const totalAbandoned = all.reduce((s, c) => s + Number(c.totalAmount), 0);
    const totalRecovered = all.reduce((s, c) => s + Number(c.recoveredAmount ?? 0), 0);

    res.json({
      total,
      recovered,
      recoveryRate: total ? Math.round((recovered / total) * 1000) / 10 : 0,
      recoveredAfterEmail1: recoveredAfter1,
      recoveredAfterEmail2: recoveredAfter2,
      totalAbandonedEUR: Math.round(totalAbandoned),
      totalRecoveredEUR: Math.round(totalRecovered),
    });
  } catch (err) {
    next(err);
  }
});
