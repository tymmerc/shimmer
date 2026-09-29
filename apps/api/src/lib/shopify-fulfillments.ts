/**
 * Colis Shopify → lignes `shipments`.
 *
 * Sur Shopify, "fulfilled" veut dire expédié, pas livré. La livraison n'est
 * connue que par `shipment_status` (suivi transporteur calculé par Shopify),
 * reçu via les webhooks fulfillments/create et fulfillments/update.
 *
 * Un colis Shopify (fulfillment) est identifié par son id : c'est la clé de
 * mise à jour. Le numéro de suivi peut arriver après coup, changer, ou être
 * multiple ; le colis peut être annulé. À chaque webhook on remet donc les
 * lignes de CE colis à l'image de ce que Shopify envoie.
 */

export interface ShopifyFulfillment {
  id?: number;
  order_id?: number;
  name?: string;
  status?: string | null;
  shipment_status?: string | null;
  tracking_company?: string | null;
  tracking_number?: string | null;
  tracking_numbers?: string[] | null;
  tracking_url?: string | null;
  tracking_urls?: string[] | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface ShipmentUpsert {
  platformFulfillmentId: string;
  carrier: string;
  trackingNumber: string;
  trackingUrl: string | null;
  status: string;
  shippedAt: Date | null;
  deliveredAt: Date | null;
}

export interface ExistingShipment {
  id: number;
  carrier: string;
  trackingNumber: string;
  trackingUrl: string | null;
  status: string;
  shippedAt: Date | null;
  deliveredAt: Date | null;
}

// Tailles des colonnes (schema.prisma, model Shipment).
const MAX_CARRIER = 50;
const MAX_TRACKING_NUMBER = 100;
const MAX_TRACKING_URL = 500;
const MAX_FULFILLMENT_ID = 64;

const KNOWN_STATUSES = new Set([
  'in_transit', 'out_for_delivery', 'attempted_delivery', 'ready_for_pickup', 'delivered', 'failure',
]);

/** shipment_status Shopify → statut Shimmer. Sans info transporteur : expédié. */
export function mapShipmentStatus(s: string | null | undefined): string {
  return s && KNOWN_STATUSES.has(s) ? s : 'shipped';
}

/** "#1042.1" → "#1042" (le nom d'un colis = nom de commande + index). */
export function orderNameFromFulfillment(name: string | null | undefined): string | null {
  if (!name) return null;
  return name.replace(/\.\d+$/, '');
}

/** Clé du colis : son id Shopify, à défaut son nom ("#1042.1"). */
export function fulfillmentKey(f: ShopifyFulfillment): string | null {
  const key = f.id != null ? String(f.id) : f.name ?? null;
  return key ? key.slice(0, MAX_FULFILLMENT_ID) : null;
}

/** Lien montré au client dans le chat : https seulement, sans identifiants. */
export function safeTrackingUrl(url: string | null | undefined): string | null {
  if (!url || url.length > MAX_TRACKING_URL) return null;
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && !u.username && !u.password ? url : null;
  } catch {
    return null;
  }
}

function date(s: string | null | undefined): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Lignes voulues pour ce colis : une par numéro de suivi, aucune s'il est annulé. */
export function shipmentsFromFulfillment(f: ShopifyFulfillment): ShipmentUpsert[] {
  if (f.status === 'cancelled' || f.status === 'error' || f.status === 'failure') return [];
  const platformFulfillmentId = fulfillmentKey(f);
  if (!platformFulfillmentId) return [];

  const status = mapShipmentStatus(f.shipment_status);
  const carrier = (f.tracking_company ?? '').trim().slice(0, MAX_CARRIER);
  const shippedAt = date(f.created_at);
  const deliveredAt = status === 'delivered' ? (date(f.updated_at) ?? new Date()) : null;

  const numbers = f.tracking_numbers?.length ? f.tracking_numbers : [f.tracking_number ?? ''];
  const urls = f.tracking_urls?.length ? f.tracking_urls : [f.tracking_url ?? null];

  return numbers.map((n, i) => ({
    platformFulfillmentId,
    carrier,
    trackingNumber: (n ?? '').trim().slice(0, MAX_TRACKING_NUMBER),
    trackingUrl: safeTrackingUrl(urls[i] ?? (numbers.length === 1 ? urls[0] : null)),
    status,
    shippedAt,
    deliveredAt,
  }));
}

/**
 * Statut d'une ligne après un webhook :
 *   - une livraison ne se défait pas (un webhook en retard ne la ramène pas "en transit") ;
 *   - "shipped" (pas d'info transporteur) n'efface pas un statut plus précis.
 */
export function mergeShipmentStatus(existing: string | null | undefined, incoming: string): string {
  if (!existing) return incoming;
  if (existing === 'delivered' && incoming !== 'delivered') return existing;
  if (incoming === 'shipped' && existing !== 'preparing') return existing;
  return incoming;
}

export interface FulfillmentSyncPlan {
  create: ShipmentUpsert[];
  update: { id: number; data: Omit<ShipmentUpsert, 'platformFulfillmentId'> }[];
  remove: number[];
}

/**
 * Remet les lignes d'un colis à l'image du webhook : même numéro de suivi =
 * mise à jour, nouveau numéro = création, ligne absente du webhook (numéro
 * vide remplacé, colis annulé, doublon) = suppression.
 */
export function planFulfillmentSync(existing: ExistingShipment[], incoming: ShipmentUpsert[]): FulfillmentSyncPlan {
  const plan: FulfillmentSyncPlan = { create: [], update: [], remove: [] };
  const used = new Set<number>();

  for (const s of incoming) {
    const match = existing.find(e => !used.has(e.id) && e.trackingNumber === s.trackingNumber);
    if (!match) {
      plan.create.push(s);
      continue;
    }
    used.add(match.id);
    plan.update.push({
      id: match.id,
      data: {
        carrier: s.carrier || match.carrier,
        trackingNumber: s.trackingNumber,
        trackingUrl: s.trackingUrl ?? match.trackingUrl,
        status: mergeShipmentStatus(match.status, s.status),
        shippedAt: match.shippedAt ?? s.shippedAt,
        deliveredAt: s.deliveredAt ?? match.deliveredAt,
      },
    });
  }
  plan.remove = existing.filter(e => !used.has(e.id)).map(e => e.id);
  return plan;
}

/**
 * Statut de la commande d'après ses colis : livrée seulement si tout est livré.
 * Sans aucun colis : `whenEmpty` (expédiée pour orders/fulfilled, confirmée
 * quand le seul colis vient d'être annulé).
 */
export function orderStatusFromShipments(
  statuses: string[],
  whenEmpty: 'shipped' | 'confirmed' = 'shipped',
): 'delivered' | 'shipped' | 'confirmed' {
  if (!statuses.length) return whenEmpty;
  return statuses.every(s => s === 'delivered') ? 'delivered' : 'shipped';
}
