/**
 * Accord marketing des clients (01/10/2026), lu sur les commandes des
 * plateformes et gardé dans customers.marketing_consent. La newsletter ne part
 * qu'aux clients qui ont dit oui, sauf choix contraire de la boutique (voir
 * outbound-publish.ts).
 *
 * Shopify : l'état du client (email_marketing_consent.state) fait foi quand il
 * est là ; sinon l'ancien accepts_marketing, sinon la case du checkout
 * (buyer_accepts_marketing). « pending » (double opt-in pas encore confirmé)
 * vaut non : la boutique a choisi d'attendre la confirmation.
 * WooCommerce : la commande de base ne dit rien. Seule l'extension Mailchimp
 * for WooCommerce y pose l'accord (méta mailchimp_woocommerce_is_subscribed :
 * '1' oui, '' ou '0' non, comme la lit Mailchimp).
 *
 * Une plateforme muette (null) n'efface jamais un accord connu. Un refus
 * explicite (désinscrit côté Shopify) va aussi dans email_suppressions : il
 * compte même si la boutique écrit à tous ses clients (audience « all »).
 */

import { getPrisma, logger } from '@shimmer/core';
import { consentSchemaReady } from './consent-schema.js';
import { suppressEmail } from './unsubscribe.js';

interface ShopifyConsentFields {
  buyer_accepts_marketing?: boolean | null;
  customer?: {
    accepts_marketing?: boolean | null;
    email_marketing_consent?: { state?: string | null } | null;
  } | null;
}

/** États Shopify qui ne valent pas accord. */
const SHOPIFY_NOT_CONSENTED = new Set(['not_subscribed', 'unsubscribed', 'pending', 'redacted', 'invalid']);

/** Accord du client d'une commande Shopify, null quand rien n'est dit. */
export function shopifyCustomerConsent(p: ShopifyConsentFields): boolean | null {
  const state = p.customer?.email_marketing_consent?.state;
  if (state === 'subscribed') return true;
  if (typeof state === 'string' && SHOPIFY_NOT_CONSENTED.has(state)) return false;
  if (typeof p.customer?.accepts_marketing === 'boolean') return p.customer.accepts_marketing;
  if (typeof p.buyer_accepts_marketing === 'boolean') return p.buyer_accepts_marketing;
  return null;
}

const MAILCHIMP_WOO_META = 'mailchimp_woocommerce_is_subscribed';

/** Accord posé sur une commande WooCommerce par Mailchimp for WooCommerce, null sinon. */
export function wooMarketingConsent(order: { meta_data?: unknown }): boolean | null {
  if (!Array.isArray(order.meta_data)) return null;
  const meta = (order.meta_data as Array<{ key?: unknown; value?: unknown } | null>)
    .find((m) => m?.key === MAILCHIMP_WOO_META);
  if (!meta) return null;
  const v = meta.value;
  if (v === true || v === 1 || v === '1') return true;
  if (v === false || v === 0 || v === '0' || v === '') return false;
  return null;
}

export interface PlatformConsent {
  storeId: number;
  customerId: number;
  email: string;
  consent: boolean | null;
  /** Désinscrit côté plateforme (pas une simple case non cochée). */
  optedOut: boolean;
  source: 'shopify' | 'woocommerce';
}

/**
 * Enregistre l'accord du client, et sa désinscription s'il y en a une.
 * Jamais bloquant pour le webhook : une erreur est journalisée, la commande
 * suit son cours.
 */
export async function recordPlatformConsent(input: PlatformConsent): Promise<void> {
  const { storeId, customerId, consent, source } = input;
  if (input.optedOut) {
    await suppressEmail(storeId, input.email, 'platform_unsubscribed')
      .catch((err) => logger.warn({ err, storeId, source }, 'consent.optout-failed'));
  }
  if (consent === null) return;
  try {
    if (!(await consentSchemaReady())) return;
    await getPrisma().$executeRaw`
      UPDATE customers SET marketing_consent = ${consent}
      WHERE id = ${customerId} AND store_id = ${storeId}
        AND marketing_consent IS DISTINCT FROM ${consent}`;
  } catch (err) {
    logger.warn({ err, storeId, customerId, source }, 'consent.record-failed');
  }
}
