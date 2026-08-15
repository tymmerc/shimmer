/**
 * Cart recovery routes — track abandoned carts, schedule reminders,
 * mark recoveries when the customer comes back.
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { getPrisma, logger, ShimmerError } from '@shimmer/core';
import { sendEmail } from '@shimmer/email-connector';
import { enqueueCartReminders } from '../lib/automations/queue.js';
import { isControlCart, resolveHoldoutConfig } from '../lib/holdout/bucket.js';

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
});

const recoverSchema = z.object({
  recoveredAmount: z.number().min(0).optional(),
  orderId: z.number().int().positive().optional(),
});

// Reminder copy generator
function buildReminder(step: 1 | 2, items: Array<{ name: string }>, total: number, promoCode?: string): { subject: string; body: string } {
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
    const cart = await prisma.abandonedCart.create({
      data: {
        storeId,
        customerId: body.customerId ?? null,
        customerEmail: body.customerEmail ?? null,
        items: body.items as unknown as Parameters<typeof prisma.abandonedCart.create>[0]['data']['items'],
        totalAmount: body.totalAmount,
        status: 'pending',
      },
    });
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
    let promoCode: string | undefined;
    if (step === 2) {
      promoCode = `SHIMMER10-${cart.id}`;
    }
    const items = (cart.items as unknown as Array<{ name: string; price: number; quantity: number }>) ?? [];
    const reminder = buildReminder(step, items, Number(cart.totalAmount), promoCode);

    const updated = await prisma.abandonedCart.update({
      where: { id },
      data: {
        ...(step === 1 ? { reminder1At: new Date() } : { reminder2At: new Date(), promoCode }),
        status: step === 1 ? 'reminded_once' : 'reminded_twice',
      },
    });

    // Resolve recipient email
    let recipient: string | null = cart.customerEmail;
    if (!recipient && cart.customerId) {
      const customer = await prisma.customer.findUnique({ where: { id: cart.customerId } });
      recipient = customer?.email ?? null;
    }
    let emailResult: { id: number; status: string } | null = null;
    if (recipient) {
      const r = await sendEmail({
        storeId,
        to: recipient,
        subject: reminder.subject,
        bodyText: reminder.body,
        tag: `cart-recovery-step-${step}`,
        relatedEntity: 'cart',
        relatedId: id,
      });
      emailResult = { id: r.id, status: r.status };
    }

    logger.info({ storeId, cartId: id, step, emailId: emailResult?.id }, 'cart.reminder.sent');
    res.json({
      cart: updated,
      reminder: { step, channel: 'EMAIL', ...reminder, promoCode },
      email: emailResult,
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
