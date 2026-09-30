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
import { linkOrderItems } from '../lib/order-items.js';
import { scheduleReviewAfterShipping } from '../lib/review-on-delivery.js';
import { recordOrderForVisitor } from './holdout.js';
import { recordStockAlertConversions, detectRestock, notifyRestock } from '../lib/stock-alerts.js';
import { syncCatalogFields, deactivateCatalogProduct } from '../lib/shopify-products.js';
import { catalogFieldsFromWoo, type WooCatalogProduct } from '../lib/woo-products.js';

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
  variation_id?: number;
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
  /** Le plugin Shimmer y pose shimmer_vid (cookie du visiteur) au paiement. */
  meta_data?: Array<{ key?: string; value?: unknown }>;
}

/** Statuts WooCommerce d'une commande payée. */
const PAID_STATUSES = new Set(['processing', 'completed']);

/** Identifiant visiteur posé par le plugin Shimmer (voir integrations/woocommerce). */
export function wooVisitorId(order: { meta_data?: Array<{ key?: string; value?: unknown }> }): string | null {
  const v = order.meta_data?.find((m) => m.key === 'shimmer_vid')?.value;
  return typeof v === 'string' && /^[A-Za-z0-9_-]{4,80}$/.test(v) ? v : null;
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
    // "completed" = traitée par le marchand (en pratique expédiée), pas livrée :
    // Woo ne sait rien de la livraison. Le chat SAV ne doit pas dire "livrée".
    case 'completed': return 'shipped';
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
  const total = Number(payload.total ?? 0);

  const existing = await prisma.order.findFirst({ where: { storeId, orderNumber } });
  const order = existing
    ? await prisma.order.update({
        where: { id: existing.id },
        data: { status, ...(status === 'delivered' ? { deliveredAt: new Date() } : {}) },
      })
    : await prisma.order.create({
        data: {
          storeId,
          customerId: customer.id,
          orderNumber,
          status,
          totalAmount: total,
          shippingCost: Number(payload.shipping_total ?? 0),
          orderedAt: payload.date_created ? new Date(payload.date_created) : new Date(),
          ...(status === 'delivered' && payload.date_completed
            ? { deliveredAt: new Date(payload.date_completed) }
            : {}),
        },
      });

  // Lignes de commande (une seule fois : linkOrderItems ne double pas).
  await linkOrderItems(storeId, order.id, (payload.line_items ?? []).map((li) => ({
    platformProductId: typeof li.product_id === 'number' ? String(li.product_id) : null,
    quantity: li.quantity ?? 1,
    unitPrice: Number(li.price ?? 0),
  }))).catch((err) => logger.warn({ err, orderId: order.id }, 'woo.order.items-failed'));

  // Payée (processing ou completed) : ce qui compte une vente. Woo renvoie un
  // webhook à chaque changement de statut ; chaque étape ci-dessous est
  // idempotente (référence de commande unique, rattachement unique).
  if (payload.status && PAID_STATUSES.has(payload.status)) {
    await afterPaid(storeId, order.id, order.orderedAt ?? new Date(), email, total, payload);
  }

  // Terminée = expédiée : la demande d'avis part quelques jours après.
  if (status === 'shipped') {
    await scheduleReviewAfterShipping(storeId, order.id)
      .catch((err) => logger.warn({ err, orderId: order.id }, 'woo.order.review-schedule-failed'));
  }

  logger.info({ storeId, orderId: order.id, status, source: 'woocommerce' }, existing ? 'woo.order.updated' : 'woo.order.created');
  res.json({ accepted: true, orderId: order.id, customerId: customer.id, action: existing ? 'updated' : 'created' });
}

async function afterPaid(storeId: number, orderId: number, orderedAt: Date, email: string, total: number, payload: WCOrder): Promise<void> {
  const prisma = getPrisma();
  // Panier abandonné du même client : récupéré.
  await prisma.abandonedCart.updateMany({
    where: { storeId, customerEmail: email, recoveredAt: null },
    data: { status: 'recovered', recoveredAt: new Date(), recoveredAmount: total },
  });

  const vid = wooVisitorId(payload);
  try {
    await attributeOrderToChat(storeId, orderId, email, vid);
  } catch (err) {
    logger.warn({ err, orderId }, 'woo.order.attribution-failed');
  }
  if (vid) {
    try {
      await recordOrderForVisitor(storeId, vid, total, `woo:${payload.id ?? orderId}`);
    } catch (err) {
      logger.warn({ err, orderId }, 'woo.order.holdout-link-failed');
    }
  }
  try {
    await recordStockAlertConversions({
      storeId,
      orderId,
      email,
      orderedAt,
      totalAmount: total,
      variantIds: [
        ...(payload.line_items ?? []).map((li) => li.variation_id).filter((v): v is number => typeof v === 'number' && v > 0).map(String),
        ...(payload.line_items ?? []).map((li) => li.product_id).filter((v): v is number => typeof v === 'number').map((id) => `p:${id}`),
      ],
    });
  } catch (err) {
    logger.warn({ err, orderId }, 'woo.order.stock-alert-conversion-failed');
  }
}

// ─────────────────────────────────────────────────────────────
// POST /api/webhooks/woocommerce/product_updated (aussi product.created)
// POST /api/webhooks/woocommerce/product_deleted
// Le catalogue suit Woo ; un retour en stock prévient les inscrits.
// ─────────────────────────────────────────────────────────────
async function handleProduct(req: Request, res: Response): Promise<void> {
  const { id: storeId, wcConfig } = await resolveStore(req);
  if (!verifyHmac(req as Request & { rawBody?: Buffer }, wcConfig?.webhookSecret)) {
    throw new ShimmerError('Invalid HMAC', 'INVALID_SIGNATURE', 401);
  }
  const p = req.body as WooCatalogProduct;
  const fields = catalogFieldsFromWoo(p);
  if (!fields) {
    res.json({ accepted: true, catalog: 'skipped' });
    return;
  }
  const { result, previousStock } = await syncCatalogFields(storeId, fields);
  let notified = 0;
  if (fields.stock !== null && previousStock !== null && detectRestock(previousStock, fields.stock)) {
    const r = await notifyRestock({
      storeId,
      platformVariantId: `p:${fields.platformProductId}`,
      available: fields.stock,
      productUrl: p.permalink ?? null,
      platformProductId: fields.platformProductId,
    });
    notified = r.notified;
  }
  logger.info({ storeId, productId: p.id, catalog: result, notified, source: 'woocommerce' }, 'woo.product.update');
  res.json({ accepted: true, catalog: result, notified });
}

webhooksWooCommerceRouter.post('/product_updated', rawJson, async (req, res, next) => {
  try { await handleProduct(req, res); } catch (err) { next(err); }
});
webhooksWooCommerceRouter.post('/product_created', rawJson, async (req, res, next) => {
  try { await handleProduct(req, res); } catch (err) { next(err); }
});
webhooksWooCommerceRouter.post('/product_deleted', rawJson, async (req, res, next) => {
  try {
    const { id: storeId, wcConfig } = await resolveStore(req);
    if (!verifyHmac(req as Request & { rawBody?: Buffer }, wcConfig?.webhookSecret)) {
      throw new ShimmerError('Invalid HMAC', 'INVALID_SIGNATURE', 401);
    }
    const id = (req.body as { id?: number }).id;
    const deactivated = id ? await deactivateCatalogProduct(storeId, String(id)) : 0;
    logger.info({ storeId, productId: id, deactivated, source: 'woocommerce' }, 'woo.product.delete');
    res.json({ accepted: true, deactivated });
  } catch (err) { next(err); }
});

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
