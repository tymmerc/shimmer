/**
 * WooCommerce webhooks. We accept the standard payloads and translate them
 * into Shimmer entities.
 *
 * Store routing: `?store=<id>` query or `X-WC-Webhook-Source` header that
 * matches `store.config.woocommerce.siteUrl`.
 *
 * Security: HMAC-SHA256 of the body, base64, in `X-WC-Webhook-Signature`,
 * keyed with `store.config.woocommerce.webhookSecret`. Skipped if no secret
 * is configured (demo mode).
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import express from 'express';
import crypto from 'crypto';
import { getPrisma, logger, ShimmerError } from '@shimmer/core';
import { enqueueCartReminders } from '../lib/automations/queue.js';
import { attributeOrderToChat } from '../lib/attribution.js';

export const webhooksWooCommerceRouter = Router();

const rawJson = express.json({
  limit: '2mb',
  verify: (req: Request & { rawBody?: Buffer }, _res, buf) => {
    req.rawBody = Buffer.from(buf);
  },
});

interface WCBilling {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
}

interface WCLineItem {
  product_id?: number;
  name?: string;
  price?: number | string;
  quantity?: number;
}

interface WCOrder {
  id?: number;
  number?: string;
  status?: string;
  total?: string;
  shipping_total?: string;
  billing?: WCBilling;
  customer_id?: number;
  line_items?: WCLineItem[];
  date_created?: string;
  date_completed?: string | null;
}

interface WCAbandonedCart {
  cart_id?: number;
  customer_email?: string;
  customer?: WCBilling;
  total?: string;
  items?: WCLineItem[];
  abandoned_at?: string;
}

async function resolveStore(req: Request): Promise<{ id: number; wcConfig: { webhookSecret?: string } | null }> {
  const prisma = getPrisma();

  if (typeof req.query.store === 'string') {
    const id = Number(req.query.store);
    if (Number.isInteger(id) && id > 0) {
      const s = await prisma.store.findUnique({ where: { id } });
      if (s) {
        const cfg = (s.config ?? {}) as { woocommerce?: { webhookSecret?: string } };
        return { id, wcConfig: cfg.woocommerce ?? null };
      }
    }
  }
  const source = req.headers['x-wc-webhook-source'];
  if (typeof source === 'string') {
    const stores = await prisma.store.findMany({ select: { id: true, config: true } });
    for (const s of stores) {
      const cfg = (s.config ?? {}) as { woocommerce?: { siteUrl?: string; webhookSecret?: string } };
      if (cfg.woocommerce?.siteUrl && source.includes(cfg.woocommerce.siteUrl)) {
        return { id: s.id, wcConfig: cfg.woocommerce };
      }
    }
  }
  throw new ShimmerError('Store not found for this WooCommerce webhook', 'STORE_NOT_FOUND', 404);
}

function verifyHmac(req: Request & { rawBody?: Buffer }, secret: string | undefined): boolean {
  if (!secret) {
    // Same policy as the Shopify webhook: unsigned payloads are refused
    // unless local development explicitly opts in.
    if (process.env.ALLOW_UNSIGNED_WEBHOOKS === 'true') {
      logger.warn('woo.webhook.unsigned-accepted (ALLOW_UNSIGNED_WEBHOOKS=true)');
      return true;
    }
    logger.warn('woo.webhook.rejected: store has no webhookSecret configured');
    return false;
  }
  const header = req.headers['x-wc-webhook-signature'];
  if (typeof header !== 'string' || !req.rawBody) return false;
  const computed = crypto.createHmac('sha256', secret).update(req.rawBody).digest('base64');
  try {
    return crypto.timingSafeEqual(Buffer.from(header), Buffer.from(computed));
  } catch {
    return false;
  }
}

// Map WooCommerce status to Shimmer order status
function mapStatus(wc: string | undefined): string {
  switch (wc) {
    case 'pending': return 'pending';
    case 'processing': return 'confirmed';
    case 'on-hold': return 'pending';
    case 'completed': return 'delivered';
    case 'cancelled': return 'cancelled';
    case 'refunded': return 'returned';
    case 'failed': return 'cancelled';
    case 'shipped': return 'shipped';
    default: return 'pending';
  }
}

// ─────────────────────────────────────────────────────────────
// POST /api/webhooks/woocommerce/order_created
// POST /api/webhooks/woocommerce/order_updated
// ─────────────────────────────────────────────────────────────
async function handleOrder(req: Request, res: Response): Promise<void> {
  const { id: storeId, wcConfig } = await resolveStore(req);
  if (!verifyHmac(req as Request & { rawBody?: Buffer }, wcConfig?.webhookSecret)) {
    throw new ShimmerError('Invalid HMAC', 'INVALID_SIGNATURE', 401);
  }
  const payload = req.body as WCOrder;
  const email = payload.billing?.email;
  if (!email) throw new ShimmerError('Missing billing.email', 'BAD_REQUEST', 400);

  const prisma = getPrisma();
  let customer = await prisma.customer.findFirst({ where: { storeId, email } });
  if (!customer) {
    customer = await prisma.customer.create({
      data: {
        storeId,
        email,
        firstName: payload.billing?.first_name ?? 'Client',
        lastName: payload.billing?.last_name ?? 'WooCommerce',
        phone: payload.billing?.phone ?? null,
      },
    });
  }

  const orderNumber = payload.number ? `WC-${payload.number}` : `WC-${payload.id ?? Date.now()}`;
  const status = mapStatus(payload.status);

  const existing = await prisma.order.findFirst({ where: { storeId, orderNumber } });
  if (existing) {
    await prisma.order.update({
      where: { id: existing.id },
      data: {
        status,
        ...(status === 'delivered' ? { deliveredAt: new Date() } : {}),
      },
    });
    logger.info({ storeId, orderId: existing.id, source: 'woocommerce' }, 'woo.order.updated');
    res.json({ accepted: true, orderId: existing.id, action: 'updated' });
    return;
  }

  const order = await prisma.order.create({
    data: {
      storeId,
      customerId: customer.id,
      orderNumber,
      status,
      totalAmount: Number(payload.total ?? 0),
      shippingCost: Number(payload.shipping_total ?? 0),
      orderedAt: payload.date_created ? new Date(payload.date_created) : new Date(),
      ...(status === 'delivered' && payload.date_completed
        ? { deliveredAt: new Date(payload.date_completed) }
        : {}),
    },
  });

  // Mark matching abandoned cart as recovered
  await prisma.abandonedCart.updateMany({
    where: { storeId, customerEmail: email, recoveredAt: null },
    data: { status: 'recovered', recoveredAt: new Date(), recoveredAmount: Number(payload.total ?? 0) },
  });

  try {
    await attributeOrderToChat(storeId, order.id, email);
  } catch (err) {
    logger.warn({ err, orderId: order.id }, 'woo.order.attribution-failed');
  }

  logger.info({ storeId, orderId: order.id, source: 'woocommerce' }, 'woo.order.created');
  res.json({ accepted: true, orderId: order.id, customerId: customer.id, action: 'created' });
}

webhooksWooCommerceRouter.post(
  '/order_created',
  rawJson,
  async (req, res, next) => {
    try { await handleOrder(req, res); } catch (err) { next(err); }
  },
);

webhooksWooCommerceRouter.post(
  '/order_updated',
  rawJson,
  async (req, res, next) => {
    try { await handleOrder(req, res); } catch (err) { next(err); }
  },
);

// ─────────────────────────────────────────────────────────────
// POST /api/webhooks/woocommerce/cart_abandoned
// (needs a WooCommerce plugin like CartFlows or our own)
// ─────────────────────────────────────────────────────────────
webhooksWooCommerceRouter.post(
  '/cart_abandoned',
  rawJson,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id: storeId, wcConfig } = await resolveStore(req);
      if (!verifyHmac(req as Request & { rawBody?: Buffer }, wcConfig?.webhookSecret)) {
        throw new ShimmerError('Invalid HMAC', 'INVALID_SIGNATURE', 401);
      }
      const payload = req.body as WCAbandonedCart;
      const email = payload.customer_email ?? payload.customer?.email;
      if (!email) throw new ShimmerError('Missing customer_email', 'BAD_REQUEST', 400);

      const prisma = getPrisma();
      const cart = await prisma.abandonedCart.create({
        data: {
          storeId,
          customerEmail: email,
          items: (payload.items ?? []).map(li => ({
            name: li.name ?? 'Produit',
            price: Number(li.price ?? 0),
            quantity: li.quantity ?? 1,
            productId: li.product_id ?? null,
          })) as unknown as Parameters<typeof prisma.abandonedCart.create>[0]['data']['items'],
          totalAmount: Number(payload.total ?? 0),
          status: 'pending',
          abandonedAt: payload.abandoned_at ? new Date(payload.abandoned_at) : new Date(),
        },
      });

      try {
        await enqueueCartReminders(cart.id);
      } catch (err) {
        logger.warn({ err, cartId: cart.id }, 'woo.cart.abandoned.enqueue-failed');
      }
      logger.info({ storeId, cartId: cart.id, source: 'woocommerce' }, 'woo.cart.abandoned');
      res.json({ accepted: true, cartId: cart.id });
    } catch (err) {
      next(err);
    }
  },
);
