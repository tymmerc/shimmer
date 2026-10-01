/**
 * Paniers abandonnés venus des plateformes : UN panier par checkout.
 *
 * Shopify envoie checkouts/update à chaque modification du checkout (adresse,
 * quantité, e-mail…). Avant le 01/10, chaque envoi créait un nouveau panier,
 * donc plusieurs relances au même client. Désormais le panier est retrouvé
 * par sa référence plateforme (« shopify:<token> », « woo:<id> ») et mis à
 * jour sur place.
 *
 * Mesure des relances (holdout par panier) : abandoned_at fixe la fenêtre où
 * le panier est compté. Il suit la dernière activité tant que le panier est
 * « pending » sans relance, puis se fige dès le premier passage du job ou du
 * balayage, de la même façon pour les deux groupes (témoin ou relancé).
 *
 * Écritures en SQL brut : les colonnes platform_ref, marketing_consent et
 * checkout_url viennent de sql/2026-10-01-cart-reminders.sql. Tant que ce
 * SQL n'est pas passé, on crée les paniers comme avant (reminder-schema.ts).
 */

import { getPrisma, getRedis, logger } from '@shimmer/core';
import { reminderSchemaReady } from './reminder-schema.js';

export interface CartItem {
  name: string;
  price: number;
  quantity: number;
  productId: number | null;
}

export interface CartUpsert {
  storeId: number;
  /** null : panier sans référence (saisi par l'API), toujours créé. */
  platformRef: string | null;
  email: string | null;
  customerId?: number | null;
  items: CartItem[];
  total: number;
  /** Dernière activité du client sur ce checkout. */
  lastActivityAt: Date;
  /** true/false si la plateforme le dit, null sinon (traité comme « non »). */
  marketingConsent: boolean | null;
  checkoutUrl: string | null;
}

export type CartUpsertResult =
  | { action: 'created'; cartId: number }
  | { action: 'updated'; cartId: number }
  | { action: 'ignored'; reason: 'no-email' | 'already-recovered' | 'already-completed' };

const cleanEmail = (e: string | null | undefined): string | null => {
  const v = (e ?? '').trim().toLowerCase();
  return v.includes('@') && v.length <= 255 ? v : null;
};

/** Lien Shopify « reprendre ma commande » : https seulement, borné. */
export function safeCheckoutUrl(url: unknown): string | null {
  if (typeof url !== 'string' || url.length > 1000) return null;
  try {
    const u = new URL(url);
    return u.protocol === 'https:' ? u.toString() : null;
  } catch {
    return null;
  }
}

interface ShopifyMarketingFields {
  buyer_accepts_marketing?: boolean | null;
  customer?: {
    accepts_marketing?: boolean | null;
    email_marketing_consent?: { state?: string | null } | null;
  } | null;
}

/**
 * Accord marketing d'un checkout Shopify : buyer_accepts_marketing (case
 * cochée au checkout), sinon l'état du client. null quand rien n'est dit.
 */
export function shopifyMarketingConsent(p: ShopifyMarketingFields): boolean | null {
  if (typeof p.buyer_accepts_marketing === 'boolean' && p.buyer_accepts_marketing) return true;
  const state = p.customer?.email_marketing_consent?.state;
  if (state === 'subscribed') return true;
  if (typeof p.customer?.accepts_marketing === 'boolean' && p.customer.accepts_marketing) return true;
  if (typeof p.buyer_accepts_marketing === 'boolean') return false;
  if (state === 'not_subscribed' || state === 'unsubscribed' || state === 'redacted' || state === 'invalid') return false;
  if (typeof p.customer?.accepts_marketing === 'boolean') return false;
  return null;
}

/** Refus explicite côté Shopify (désinscrit), à distinguer d'une case non cochée. */
export function shopifyExplicitOptOut(p: ShopifyMarketingFields): boolean {
  const state = p.customer?.email_marketing_consent?.state;
  return state === 'unsubscribed' || state === 'redacted';
}

// Checkout terminé avant que son panier existe (webhooks dans le désordre) :
// trace courte dans Redis pour ne pas créer ensuite un panier « pending ».
const DONE_TTL_S = 7 * 24 * 3600;
const doneKey = (storeId: number, ref: string) => `shimmer:checkout-done:${storeId}:${ref}`;

async function wasCompleted(storeId: number, ref: string): Promise<boolean> {
  try {
    return (await getRedis().exists(doneKey(storeId, ref))) === 1;
  } catch (err) {
    logger.warn({ err }, 'cart.checkout-done.read-failed');
    return false;
  }
}

/**
 * Crée le panier, ou met à jour celui du même checkout. Un panier déjà
 * récupéré n'est plus touché ; sans e-mail, on ne crée rien (aucune relance
 * possible), mais on met à jour un panier existant.
 */
export async function upsertCart(input: CartUpsert): Promise<CartUpsertResult> {
  const prisma = getPrisma();
  const email = cleanEmail(input.email);
  const items = input.items.slice(0, 100);
  const total = Number.isFinite(input.total) && input.total >= 0 ? Math.min(input.total, 99_999_999) : 0;
  const at = Number.isFinite(input.lastActivityAt.getTime()) ? input.lastActivityAt : new Date();
  const checkoutUrl = safeCheckoutUrl(input.checkoutUrl);

  if (!email && !input.customerId && !input.platformRef) return { action: 'ignored', reason: 'no-email' };

  // Schéma du 01/10 pas encore en base : comme avant (un panier par envoi).
  if (!(await reminderSchemaReady())) {
    if (!email && !input.customerId) return { action: 'ignored', reason: 'no-email' };
    const cart = await prisma.abandonedCart.create({
      data: {
        storeId: input.storeId,
        customerId: input.customerId ?? null,
        customerEmail: email,
        items: items as unknown as Parameters<typeof prisma.abandonedCart.create>[0]['data']['items'],
        totalAmount: total,
        status: 'pending',
        abandonedAt: at,
      },
    });
    return { action: 'created', cartId: cart.id };
  }

  const itemsJson = JSON.stringify(items);
  if (!input.platformRef) {
    if (!email && !input.customerId) return { action: 'ignored', reason: 'no-email' };
    const rows = await prisma.$queryRaw<Array<{ id: number }>>`
      INSERT INTO abandoned_carts
        (store_id, customer_id, customer_email, items, total_amount, abandoned_at, status,
         marketing_consent, checkout_url, created_at, updated_at)
      VALUES
        (${input.storeId}, ${input.customerId ?? null}, ${email}, ${itemsJson}::jsonb, ${total}, ${at}, 'pending',
         ${input.marketingConsent}, ${checkoutUrl}, now(), now())
      RETURNING id`;
    return { action: 'created', cartId: rows[0]!.id };
  }

  const ref = input.platformRef.slice(0, 120);
  const existing = await prisma.$queryRaw<Array<{ id: number; recovered: boolean }>>`
    SELECT id, recovered_at IS NOT NULL AS recovered FROM abandoned_carts
    WHERE store_id = ${input.storeId} AND platform_ref = ${ref}
    LIMIT 1`;
  if (existing[0]?.recovered) return { action: 'ignored', reason: 'already-recovered' };
  if (!existing[0]) {
    if (!email) return { action: 'ignored', reason: 'no-email' };
    if (await wasCompleted(input.storeId, ref)) return { action: 'ignored', reason: 'already-completed' };
  }

  // ON CONFLICT : deux webhooks du même checkout arrivés ensemble ne créent
  // qu'un panier. abandoned_at ne bouge plus une fois le panier traité (voir
  // l'en-tête) ; un panier clos faute d'accord rouvre si l'accord arrive avant
  // toute relance.
  const rows = await prisma.$queryRaw<Array<{ id: number; inserted: boolean }>>`
    INSERT INTO abandoned_carts
      (store_id, customer_email, items, total_amount, abandoned_at, status,
       platform_ref, marketing_consent, checkout_url, created_at, updated_at)
    VALUES
      (${input.storeId}, ${email}, ${itemsJson}::jsonb, ${total}, ${at}, 'pending',
       ${ref}, ${input.marketingConsent}, ${checkoutUrl}, now(), now())
    ON CONFLICT (store_id, platform_ref) WHERE platform_ref IS NOT NULL DO UPDATE SET
      customer_email = COALESCE(EXCLUDED.customer_email, abandoned_carts.customer_email),
      items = EXCLUDED.items,
      total_amount = EXCLUDED.total_amount,
      marketing_consent = COALESCE(EXCLUDED.marketing_consent, abandoned_carts.marketing_consent),
      checkout_url = COALESCE(EXCLUDED.checkout_url, abandoned_carts.checkout_url),
      abandoned_at = CASE
        WHEN abandoned_carts.status = 'pending' AND abandoned_carts.reminder1_at IS NULL
          THEN GREATEST(abandoned_carts.abandoned_at, EXCLUDED.abandoned_at)
        ELSE abandoned_carts.abandoned_at END,
      status = CASE
        WHEN abandoned_carts.status = 'no_consent' AND abandoned_carts.reminder1_at IS NULL
          AND EXCLUDED.marketing_consent IS TRUE
          THEN 'pending'
        ELSE abandoned_carts.status END,
      updated_at = now()
    WHERE abandoned_carts.recovered_at IS NULL
    RETURNING id, (xmax = 0) AS inserted`;
  if (!rows[0]) return { action: 'ignored', reason: 'already-recovered' };
  return rows[0].inserted ? { action: 'created', cartId: rows[0].id } : { action: 'updated', cartId: rows[0].id };
}

/**
 * Checkout terminé (devenu commande) : son panier est récupéré, plus de
 * relance. S'il n'existe pas encore, une trace empêche de le créer ensuite.
 */
export async function completeCart(storeId: number, platformRef: string, amount: number): Promise<number> {
  if (!(await reminderSchemaReady())) return 0;
  const ref = platformRef.slice(0, 120);
  const n = await getPrisma().$executeRaw`
    UPDATE abandoned_carts
    SET status = 'recovered', recovered_at = now(), recovered_amount = ${Number.isFinite(amount) ? amount : 0},
        updated_at = now()
    WHERE store_id = ${storeId} AND platform_ref = ${ref} AND recovered_at IS NULL`;
  try {
    await getRedis().set(doneKey(storeId, ref), '1', 'EX', DONE_TTL_S);
  } catch (err) {
    logger.warn({ err }, 'cart.checkout-done.write-failed');
  }
  return n;
}

/**
 * Commande payée : les paniers ouverts du même client (adresse exacte, casse
 * ignorée, ou fiche client de cette adresse) abandonnés avant la commande
 * sont récupérés. Même règle pour les deux groupes de la mesure.
 */
export async function recoverCartsForOrder(storeId: number, email: string, orderedAt: Date, amount: number): Promise<number> {
  const e = email.trim().toLowerCase();
  return getPrisma().$executeRaw`
    UPDATE abandoned_carts
    SET status = 'recovered', recovered_at = now(), recovered_amount = ${Number.isFinite(amount) ? amount : 0},
        updated_at = now()
    WHERE store_id = ${storeId}
      AND recovered_at IS NULL
      AND abandoned_at <= ${orderedAt}
      AND (
        lower(customer_email) = ${e}
        OR (customer_email IS NULL AND customer_id IN (
          SELECT id FROM customers WHERE store_id = ${storeId} AND lower(email) = ${e}))
      )`;
}
