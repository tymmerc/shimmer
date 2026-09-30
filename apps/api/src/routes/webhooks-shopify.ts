/**
 * Shopify webhooks — accept the standard Shopify event payloads and translate
 * them into Shimmer entities (orders, abandoned carts, status updates).
 *
 * Routing: the store is identified via the `X-Shopify-Shop-Domain` header or
 * a fallback `?store=<id>` query parameter (set when configuring the webhook).
 *
 * Security: in prod we validate `X-Shopify-Hmac-Sha256` against the shared
 * secret stored in `store.config.shopify.webhookSecret`. In demo mode we skip
 * validation but log a warning.
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import crypto from 'crypto';
import express from 'express';
import { getPrisma, logger, ShimmerError } from '@shimmer/core';
import { enqueueCartReminders } from '../lib/automations/queue.js';
import { attributeOrderToChat } from '../lib/attribution.js';
import { recordOrderForVisitor } from './holdout.js';
import { detectRestock, notifyRestock, recordStockAlertConversions } from '../lib/stock-alerts.js';
import { scheduleReviewOnDelivery } from '../lib/review-on-delivery.js';
import { linkOrderItems } from '../lib/order-items.js';
import { syncCatalogProduct, deactivateCatalogProduct, refreshProductStock, type CatalogSyncResult, type ShopifyCatalogProduct } from '../lib/shopify-products.js';
import {
  shipmentsFromFulfillment,
  orderNameFromFulfillment,
  orderStatusFromShipments,
  fulfillmentKey,
  planFulfillmentSync,
  type ShopifyFulfillment,
} from '../lib/shopify-fulfillments.js';

export const webhooksShopifyRouter = Router();

// Shopify webhooks come as JSON, but we need the raw body for the HMAC check.
// We mount a custom JSON parser that keeps the raw buffer.
const rawJson = express.json({
  limit: '2mb',
  verify: (req: Request & { rawBody?: Buffer }, _res, buf) => {
    req.rawBody = Buffer.from(buf);
  },
});

interface ShopifyAddress {
  first_name?: string;
  last_name?: string;
  email?: string;
}

interface ShopifyLineItem {
  product_id?: number;
  variant_id?: number;
  title?: string;
  price?: string;
  quantity?: number;
}

interface ShopifyProductVariant {
  id?: number;
  title?: string;
  inventory_item_id?: number;
  inventory_quantity?: number;
}

interface ShopifyProduct {
  id?: number;
  title?: string;
  handle?: string;
  variants?: ShopifyProductVariant[];
}

interface ShopifyInventoryLevel {
  inventory_item_id?: number;
  available?: number | null;
}

interface ShopifyAbandonedCheckout {
  id?: number;
  email?: string;
  total_price?: string;
  line_items?: ShopifyLineItem[];
  customer?: ShopifyAddress;
  abandoned_checkout_url?: string;
  created_at?: string;
}

interface ShopifyOrder {
  id?: number;
  order_number?: number;
  name?: string;
  email?: string;
  total_price?: string;
  financial_status?: string;
  fulfillment_status?: string | null;
  customer?: ShopifyAddress;
  line_items?: ShopifyLineItem[];
  created_at?: string;
  // Shimmer visitor id carried through checkout as a note/cart attribute.
  note_attributes?: Array<{ name?: string; value?: string }>;
  fulfillments?: ShopifyFulfillment[];
}

/** Extract the Shimmer visitor id from Shopify note/cart attributes. */
function shimmerVisitorId(payload: { note_attributes?: Array<{ name?: string; value?: string }> }): string | null {
  const attr = (payload.note_attributes ?? []).find(
    a => a.name === 'shimmer_vid' || a.name === 'shimmer_visitor_id',
  );
  return attr?.value && attr.value.length >= 4 ? attr.value : null;
}

async function resolveStore(
  req: Request,
): Promise<{ id: number; shopifyConfig: { webhookSecret?: string } | null }> {
  const prisma = getPrisma();

  // 1. Query string override (typical for demo: ?store=4)
  if (typeof req.query.store === 'string') {
    const id = Number(req.query.store);
    if (Number.isInteger(id) && id > 0) {
      const s = await prisma.store.findUnique({ where: { id } });
      if (s) {
        const cfg = (s.config ?? {}) as { shopify?: { webhookSecret?: string } };
        return { id, shopifyConfig: cfg.shopify ?? null };
      }
    }
  }

  // 2. Shop domain header → match against store.config.shopify.shopDomain
  const shopDomain = req.headers['x-shopify-shop-domain'];
  if (typeof shopDomain === 'string') {
    const stores = await prisma.store.findMany({ select: { id: true, config: true } });
    for (const s of stores) {
      const cfg = (s.config ?? {}) as { shopify?: { shopDomain?: string; webhookSecret?: string } };
      if (cfg.shopify?.shopDomain === shopDomain) {
        return { id: s.id, shopifyConfig: cfg.shopify };
      }
    }
  }

  throw new ShimmerError('Store not found for this Shopify webhook', 'STORE_NOT_FOUND', 404);
}

function verifyHmac(req: Request & { rawBody?: Buffer }, secret: string | undefined): boolean {
  if (!secret) {
    // No secret configured: only acceptable in local development with an
    // explicit opt-in. In any other context an unsigned webhook could inject
    // fake paid orders or trigger cart reminders for arbitrary stores.
    if (process.env.ALLOW_UNSIGNED_WEBHOOKS === 'true') {
      logger.warn('shopify.webhook.unsigned-accepted (ALLOW_UNSIGNED_WEBHOOKS=true)');
      return true;
    }
    logger.warn('shopify.webhook.rejected: store has no webhookSecret configured');
    return false;
  }
  const header = req.headers['x-shopify-hmac-sha256'];
  if (typeof header !== 'string' || !req.rawBody) return false;
  const computed = crypto.createHmac('sha256', secret).update(req.rawBody).digest('base64');
  try {
    return crypto.timingSafeEqual(Buffer.from(header), Buffer.from(computed));
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────────────────────
// POST /api/webhooks/shopify/abandoned_checkout
// ─────────────────────────────────────────────────────────────
webhooksShopifyRouter.post(
  '/abandoned_checkout',
  rawJson,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id: storeId, shopifyConfig } = await resolveStore(req);
      if (!verifyHmac(req as Request & { rawBody?: Buffer }, shopifyConfig?.webhookSecret)) {
        throw new ShimmerError('Invalid HMAC', 'INVALID_SIGNATURE', 401);
      }
      const payload = req.body as ShopifyAbandonedCheckout;

      const prisma = getPrisma();
      const cart = await prisma.abandonedCart.create({
        data: {
          storeId,
          customerEmail: payload.email ?? payload.customer?.email ?? null,
          items: (payload.line_items ?? []).map(li => ({
            name: li.title ?? 'Produit',
            price: Number(li.price ?? 0),
            quantity: li.quantity ?? 1,
            productId: li.product_id ?? null,
          })) as unknown as Parameters<typeof prisma.abandonedCart.create>[0]['data']['items'],
          totalAmount: Number(payload.total_price ?? 0),
          status: 'pending',
          abandonedAt: payload.created_at ? new Date(payload.created_at) : new Date(),
        },
      });

      try {
        await enqueueCartReminders(cart.id);
      } catch (err) {
        logger.warn({ err, cartId: cart.id }, 'shopify.cart.abandoned.enqueue-failed');
      }
      logger.info({ storeId, cartId: cart.id, source: 'shopify' }, 'shopify.cart.abandoned');
      res.json({ accepted: true, cartId: cart.id });
    } catch (err) {
      next(err);
    }
  },
);

// ─────────────────────────────────────────────────────────────
// POST /api/webhooks/shopify/orders_paid
// ─────────────────────────────────────────────────────────────
webhooksShopifyRouter.post(
  '/orders_paid',
  rawJson,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id: storeId, shopifyConfig } = await resolveStore(req);
      if (!verifyHmac(req as Request & { rawBody?: Buffer }, shopifyConfig?.webhookSecret)) {
        throw new ShimmerError('Invalid HMAC', 'INVALID_SIGNATURE', 401);
      }
      const payload = req.body as ShopifyOrder;
      const prisma = getPrisma();

      // Find or create the customer
      const email = payload.email ?? payload.customer?.email;
      if (!email) {
        throw new ShimmerError('Missing customer email', 'BAD_REQUEST', 400);
      }
      let customer = await prisma.customer.findFirst({ where: { storeId, email } });
      if (!customer) {
        customer = await prisma.customer.create({
          data: {
            storeId,
            email,
            firstName: payload.customer?.first_name ?? 'Client',
            lastName: payload.customer?.last_name ?? 'Shopify',
          },
        });
      }

      // Create the order. Shopify renvoie un webhook qui n'a pas eu sa réponse
      // à temps : une commande déjà connue n'est ni recréée ni recomptée.
      const orderNumber = payload.name ?? (payload.order_number ? `#${payload.order_number}` : `SH-${payload.id ?? Date.now()}`);
      // Déjà connue : on ne la recrée pas, mais on reprend la suite (chaque
      // étape est idempotente), au cas où le premier passage aurait planté.
      const known = await prisma.order.findFirst({ where: { storeId, orderNumber } });
      if (known) logger.info({ storeId, orderId: known.id, source: 'shopify' }, 'shopify.order.paid.replayed');
      const order = known ?? await prisma.order.create({
        data: {
          storeId,
          customerId: customer.id,
          orderNumber,
          status: 'confirmed',
          totalAmount: Number(payload.total_price ?? 0),
          orderedAt: payload.created_at ? new Date(payload.created_at) : new Date(),
        },
      });

      // Lignes de commande (la page d'avis liste les produits commandés).
      await linkOrderItems(storeId, order.id, (payload.line_items ?? []).map((li) => ({
        platformProductId: typeof li.product_id === 'number' ? String(li.product_id) : null,
        quantity: li.quantity ?? 1,
        unitPrice: Number(li.price ?? 0),
      }))).catch((err) => logger.warn({ err, orderId: order.id }, 'shopify.order.items-failed'));

      // Mark any matching abandoned cart as recovered (abandonné avant la commande)
      await prisma.abandonedCart.updateMany({
        where: { storeId, customerEmail: email, recoveredAt: null, abandonedAt: { lte: order.orderedAt ?? new Date() } },
        data: {
          status: 'recovered',
          recoveredAt: new Date(),
          recoveredAmount: Number(payload.total_price ?? 0),
        },
      });

      // Link the order to the holdout visitor (if the cart carried a shimmer id)
      const vid = shimmerVisitorId(payload);

      try {
        await attributeOrderToChat(storeId, order.id, email, vid, order.orderedAt ?? undefined);
      } catch (err) {
        logger.warn({ err, orderId: order.id }, 'shopify.order.attribution-failed');
      }

      if (vid) {
        try {
          await recordOrderForVisitor(storeId, vid, Number(payload.total_price ?? 0), `shopify:${payload.id ?? orderNumber}`);
        } catch (err) {
          logger.warn({ err, orderId: order.id }, 'shopify.order.holdout-link-failed');
        }
      }

      // Retour de stock : un inscrit prévenu qui achète dans la fenêtre = conversion comptée.
      try {
        await recordStockAlertConversions({
          storeId,
          orderId: order.id,
          email,
          orderedAt: order.orderedAt ?? new Date(),
          totalAmount: Number(payload.total_price ?? 0),
          variantIds: [
            ...(payload.line_items ?? []).map(li => li.variant_id).filter((v): v is number => typeof v === 'number').map(String),
            ...(payload.line_items ?? []).map(li => li.product_id).filter((v): v is number => typeof v === 'number').map(id => `p:${id}`),
          ],
        });
      } catch (err) {
        logger.warn({ err, orderId: order.id }, 'shopify.order.stock-alert-conversion-failed');
      }

      logger.info({ storeId, orderId: order.id, source: 'shopify' }, 'shopify.order.paid');
      res.json({ accepted: true, orderId: order.id, customerId: customer.id });
    } catch (err) {
      next(err);
    }
  },
);

// ─────────────────────────────────────────────────────────────
// POST /api/webhooks/shopify/orders_fulfilled
// ─────────────────────────────────────────────────────────────
webhooksShopifyRouter.post(
  '/orders_fulfilled',
  rawJson,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id: storeId, shopifyConfig } = await resolveStore(req);
      if (!verifyHmac(req as Request & { rawBody?: Buffer }, shopifyConfig?.webhookSecret)) {
        throw new ShimmerError('Invalid HMAC', 'INVALID_SIGNATURE', 401);
      }
      const payload = req.body as ShopifyOrder;
      const prisma = getPrisma();

      const orderNumber = payload.name ?? (payload.order_number ? `#${payload.order_number}` : '');
      const order = await prisma.order.findFirst({ where: { storeId, orderNumber } });
      if (!order) {
        // 200, pas 404 : Shopify supprime un webhook qui échoue trop souvent.
        logger.warn({ storeId, source: 'shopify' }, 'shopify.order.fulfilled.unknown-order');
        res.json({ accepted: false, reason: 'unknown order' });
        return;
      }

      // "fulfilled" = expédiée. Livrée seulement quand le transporteur le dit.
      const newStatus = await applyFulfillments(order, payload.fulfillments ?? [], 'shipped');
      if (newStatus === 'delivered') await reviewOnDelivery(storeId, order.id);

      logger.info({ storeId, orderId: order.id, source: 'shopify', newStatus }, 'shopify.order.fulfilled');
      res.json({ accepted: true, orderId: order.id, status: newStatus });
    } catch (err) {
      next(err);
    }
  },
);

// ─────────────────────────────────────────────────────────────
// POST /api/webhooks/shopify/fulfillments_update
// Topics fulfillments/create + fulfillments/update : transporteur, numéro et
// lien de suivi, puis l'avancement (en transit, en livraison, livré).
// Le chat SAV s'en sert pour répondre à "où est ma commande ?".
// ─────────────────────────────────────────────────────────────
webhooksShopifyRouter.post(
  '/fulfillments_update',
  rawJson,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id: storeId, shopifyConfig } = await resolveStore(req);
      if (!verifyHmac(req as Request & { rawBody?: Buffer }, shopifyConfig?.webhookSecret)) {
        throw new ShimmerError('Invalid HMAC', 'INVALID_SIGNATURE', 401);
      }
      const payload = req.body as ShopifyFulfillment;
      const orderNumber = orderNameFromFulfillment(payload.name);
      if (!orderNumber) throw new ShimmerError('Missing fulfillment name', 'BAD_REQUEST', 400);

      const prisma = getPrisma();
      const order = await prisma.order.findFirst({ where: { storeId, orderNumber } });
      if (!order) {
        logger.warn({ storeId, source: 'shopify' }, 'shopify.fulfillment.unknown-order');
        res.json({ accepted: false, reason: 'unknown order' });
        return;
      }

      const newStatus = await applyFulfillments(order, [payload], 'confirmed');
      if (newStatus === 'delivered') await reviewOnDelivery(storeId, order.id);
      logger.info({ storeId, orderId: order.id, source: 'shopify', newStatus }, 'shopify.fulfillment.updated');
      res.json({ accepted: true, orderId: order.id, status: newStatus });
    } catch (err) {
      next(err);
    }
  },
);

/** Livrée : on programme la demande d'avis (48 h après). Jamais bloquant pour le webhook. */
async function reviewOnDelivery(storeId: number, orderId: number): Promise<void> {
  try {
    await scheduleReviewOnDelivery(storeId, orderId);
  } catch (err) {
    logger.warn({ err, storeId, orderId }, 'shopify.review-on-delivery.failed');
  }
}

// Espace de verrou Postgres pour les colis (pg_advisory_xact_lock(ns, orderId)).
const SHIPMENT_LOCK_NS = 7301;

/**
 * Enregistre les colis, puis recalcule le statut de la commande.
 * orders/fulfilled et fulfillments/create arrivent souvent en même temps : un
 * verrou par commande les fait passer l'un après l'autre (sinon doublons).
 */
async function applyFulfillments(
  order: { id: number; status: string; deliveredAt: Date | null },
  fulfillments: ShopifyFulfillment[],
  whenEmpty: 'shipped' | 'confirmed',
): Promise<string> {
  return getPrisma().$transaction(async (tx) => {
    await tx.$queryRaw`SELECT count(*) FROM (SELECT pg_advisory_xact_lock(${SHIPMENT_LOCK_NS}::int, ${order.id}::int)) AS l`;

    for (const f of fulfillments) {
      const key = fulfillmentKey(f);
      if (!key) continue;
      const existing = await tx.shipment.findMany({
        where: { orderId: order.id, platformFulfillmentId: key },
        orderBy: { id: 'asc' },
      });
      const plan = planFulfillmentSync(existing, shipmentsFromFulfillment(f));
      if (plan.remove.length) await tx.shipment.deleteMany({ where: { id: { in: plan.remove } } });
      for (const u of plan.update) await tx.shipment.update({ where: { id: u.id }, data: u.data });
      for (const c of plan.create) await tx.shipment.create({ data: { orderId: order.id, ...c } });
    }

    // Une commande annulée ou retournée ne repart pas en livraison.
    if (order.status === 'cancelled' || order.status === 'returned') return order.status;

    const shipments = await tx.shipment.findMany({
      where: { orderId: order.id },
      select: { status: true, deliveredAt: true },
    });
    const status = orderStatusFromShipments(shipments.map(s => s.status), whenEmpty);
    const lastDelivery = shipments.reduce<Date | null>(
      (acc, s) => (s.deliveredAt && (!acc || s.deliveredAt > acc) ? s.deliveredAt : acc),
      null,
    );
    await tx.order.update({
      where: { id: order.id },
      data: {
        status,
        deliveredAt: status === 'delivered' ? (order.deliveredAt ?? lastDelivery ?? new Date()) : null,
      },
    });
    return status;
  });
}

// ─────────────────────────────────────────────────────────────
// Retour de stock — détection de la transition 0 → >0
//
// Deux webhooks acceptés, complémentaires :
//   - products/update  : payload complet (variants[].id, inventory_item_id,
//     inventory_quantity). Auto-apprend le mapping et détecte le retour sans
//     aucune config préalable. Le chemin "juste poser un webhook".
//   - inventory_levels/update : l'officiel (inventory_item_id + available).
//     Précis et léger, mais ne marche que si le mapping est connu (appris via
//     products/update, ou posé à l'import).
// ─────────────────────────────────────────────────────────────

async function upsertVariantStock(
  storeId: number,
  v: { platformVariantId: string; inventoryItemId?: string | null; platformProductId?: string | null; label?: string | null; productHandle?: string | null; available: number | null },
): Promise<{ previous: number | null }> {
  const prisma = getPrisma();
  const prev = await prisma.platformVariantStock.findUnique({
    where: { storeId_platformVariantId: { storeId, platformVariantId: v.platformVariantId } },
    select: { available: true, productId: true },
  });
  // Lie au produit local si on le connaît via platformProductId (best effort).
  let productId = prev?.productId ?? null;
  if (!productId && v.platformProductId) {
    const p = await prisma.product.findFirst({ where: { storeId, platformProductId: v.platformProductId }, select: { id: true } });
    productId = p?.id ?? null;
  }
  await prisma.platformVariantStock.upsert({
    where: { storeId_platformVariantId: { storeId, platformVariantId: v.platformVariantId } },
    create: {
      storeId,
      platformVariantId: v.platformVariantId,
      inventoryItemId: v.inventoryItemId ?? null,
      platformProductId: v.platformProductId ?? null,
      productId,
      label: v.label ?? null,
      productHandle: v.productHandle ?? null,
      available: v.available,
    },
    update: {
      ...(v.inventoryItemId ? { inventoryItemId: v.inventoryItemId } : {}),
      ...(v.platformProductId ? { platformProductId: v.platformProductId } : {}),
      ...(productId ? { productId } : {}),
      ...(v.label ? { label: v.label } : {}),
      ...(v.productHandle ? { productHandle: v.productHandle } : {}),
      available: v.available,
      updatedAt: new Date(),
    },
  });
  return { previous: prev ? prev.available : null };
}

function productUrlFor(shopDomain: string | undefined, handle: string | null | undefined): string | null {
  if (!shopDomain || !handle) return null;
  return `https://${shopDomain}/products/${handle}`;
}

// POST /api/webhooks/shopify/products_delete — la fiche sort du vendeur.
webhooksShopifyRouter.post(
  '/products_delete',
  rawJson,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id: storeId, shopifyConfig } = await resolveStore(req);
      if (!verifyHmac(req as Request & { rawBody?: Buffer }, shopifyConfig?.webhookSecret)) {
        throw new ShimmerError('Invalid HMAC', 'INVALID_SIGNATURE', 401);
      }
      const id = (req.body as { id?: number }).id;
      const deactivated = id ? await deactivateCatalogProduct(storeId, String(id)) : 0;
      logger.info({ storeId, productId: id, deactivated, source: 'shopify' }, 'shopify.product.delete');
      res.json({ accepted: true, deactivated });
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/webhooks/shopify/products_update (aussi products/create : même URL)
webhooksShopifyRouter.post(
  '/products_update',
  rawJson,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id: storeId, shopifyConfig } = await resolveStore(req);
      if (!verifyHmac(req as Request & { rawBody?: Buffer }, shopifyConfig?.webhookSecret)) {
        throw new ShimmerError('Invalid HMAC', 'INVALID_SIGNATURE', 401);
      }
      const p = req.body as ShopifyProduct;
      const shopDomain = typeof req.headers['x-shopify-shop-domain'] === 'string' ? req.headers['x-shopify-shop-domain'] : undefined;
      let restocked = 0;
      let notified = 0;
      for (const v of p.variants ?? []) {
        if (typeof v.id !== 'number') continue;
        const available = typeof v.inventory_quantity === 'number' ? v.inventory_quantity : null;
        const label = v.title && v.title !== 'Default Title' ? `${p.title ?? ''} · ${v.title}`.trim() : (p.title ?? null);
        const { previous } = await upsertVariantStock(storeId, {
          platformVariantId: String(v.id),
          inventoryItemId: v.inventory_item_id ? String(v.inventory_item_id) : null,
          platformProductId: p.id ? String(p.id) : null,
          label,
          productHandle: p.handle ?? null,
          available,
        });
        if (available !== null && detectRestock(previous, available)) {
          restocked += 1;
          const r = await notifyRestock({ storeId, platformVariantId: String(v.id), available, productUrl: productUrlFor(shopDomain, p.handle), platformProductId: p.id ? String(p.id) : null });
          notified += r.notified;
        }
      }
      // La fiche du catalogue suit Shopify (prix, stock, statut, image). En
      // cas d'échec on répond 500 : Shopify renverra le webhook, et le retour
      // de stock ci-dessus ne se redéclenche pas (il compare au stock déjà enregistré).
      const catalog: CatalogSyncResult = await syncCatalogProduct(storeId, req.body as ShopifyCatalogProduct);
      logger.info({ storeId, productId: p.id, restocked, notified, catalog, source: 'shopify' }, 'shopify.product.update');
      res.json({ accepted: true, restocked, notified, catalog });
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/webhooks/shopify/inventory_levels_update
webhooksShopifyRouter.post(
  '/inventory_levels_update',
  rawJson,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id: storeId, shopifyConfig } = await resolveStore(req);
      if (!verifyHmac(req as Request & { rawBody?: Buffer }, shopifyConfig?.webhookSecret)) {
        throw new ShimmerError('Invalid HMAC', 'INVALID_SIGNATURE', 401);
      }
      const lvl = req.body as ShopifyInventoryLevel;
      if (typeof lvl.inventory_item_id !== 'number' || typeof lvl.available !== 'number') {
        res.json({ accepted: true, ignored: 'incomplete-payload' });
        return;
      }
      const prisma = getPrisma();
      const known = await prisma.platformVariantStock.findFirst({
        where: { storeId, inventoryItemId: String(lvl.inventory_item_id) },
        select: { platformVariantId: true, productHandle: true, platformProductId: true },
      });
      if (!known) {
        // Mapping inconnu : on ne peut pas dire quelle variante. On log, le
        // prochain products/update apprendra le mapping.
        logger.info({ storeId, inventoryItemId: lvl.inventory_item_id }, 'shopify.inventory.unmapped');
        res.json({ accepted: true, ignored: 'unmapped-inventory-item' });
        return;
      }
      const shopDomain = typeof req.headers['x-shopify-shop-domain'] === 'string' ? req.headers['x-shopify-shop-domain'] : undefined;
      const { previous } = await upsertVariantStock(storeId, { platformVariantId: known.platformVariantId, available: lvl.available });
      // La fiche du catalogue suit (épuisé / de retour) sans attendre un products/update.
      if (known.platformProductId) await refreshProductStock(storeId, known.platformProductId);
      let notified = 0;
      if (detectRestock(previous, lvl.available)) {
        const r = await notifyRestock({ storeId, platformVariantId: known.platformVariantId, available: lvl.available, productUrl: productUrlFor(shopDomain, known.productHandle), platformProductId: known.platformProductId });
        notified = r.notified;
      }
      logger.info({ storeId, variant: known.platformVariantId, available: lvl.available, notified, source: 'shopify' }, 'shopify.inventory.update');
      res.json({ accepted: true, notified });
    } catch (err) {
      next(err);
    }
  },
);
