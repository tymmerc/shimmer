/**
 * Catalogue suivi par les webhooks produits de WooCommerce (product.created,
 * product.updated, product.deleted), comme pour Shopify
 * (voir shopify-products.ts, dont on réutilise la synchronisation).
 */

import { stripHtml, UNTRACKED_STOCK, type CatalogFields } from './shopify-products.js';

export interface WooCatalogProduct {
  id?: number;
  /** simple, variable, grouped, external, ou variation (payload d'une variante). */
  type?: string | null;
  parent_id?: number | null;
  name?: string | null;
  status?: string | null;
  catalog_visibility?: string | null;
  description?: string | null;
  short_description?: string | null;
  sku?: string | null;
  price?: string | number | null;
  regular_price?: string | number | null;
  sale_price?: string | number | null;
  manage_stock?: boolean | null;
  stock_quantity?: number | null;
  stock_status?: string | null;
  backorders?: string | null;
  categories?: Array<{ name?: string | null }>;
  images?: Array<{ src?: string | null }>;
  brands?: Array<{ name?: string | null }>;
  permalink?: string | null;
}

const num = (v: unknown): number | null => {
  const n = Number(v);
  return v === null || v === undefined || v === '' || !Number.isFinite(n) ? null : n;
};

/** Fiche catalogue d'après le produit WooCommerce ; null si inutilisable. */
export function catalogFieldsFromWoo(p: WooCatalogProduct): CatalogFields | null {
  const name = (p.name ?? '').trim();
  if (!p.id || !name) return null;

  const price = num(p.price) ?? num(p.regular_price);
  const regular = num(p.regular_price);
  const compareAtPrice = price !== null && regular !== null && regular > price ? regular : null;

  // Stock : suivi → la quantité ; commande en rupture autorisée ou non suivi
  // → disponible tant que Woo dit « instock » / « onbackorder ».
  let stock: number | null;
  if (p.manage_stock === true && typeof p.stock_quantity === 'number') {
    const allowBackorders = p.backorders === 'yes' || p.backorders === 'notify';
    stock = allowBackorders ? Math.max(p.stock_quantity, UNTRACKED_STOCK) : Math.max(0, p.stock_quantity);
  } else if (p.stock_status === 'outofstock') {
    stock = 0;
  } else if (p.stock_status === 'instock' || p.stock_status === 'onbackorder') {
    stock = UNTRACKED_STOCK;
  } else {
    stock = null;
  }

  const image = p.images?.find((i) => i.src)?.src ?? null;
  return {
    platformProductId: String(p.id),
    sku: ((p.sku ?? '').trim() || `woo-${p.id}`).slice(0, 100),
    name: name.slice(0, 500),
    description: stripHtml(p.description) ?? stripHtml(p.short_description),
    brand: p.brands?.find((b) => b.name)?.name?.trim().slice(0, 200) || null,
    category: p.categories?.find((c) => c.name)?.name?.trim().slice(0, 200) || null,
    price,
    compareAtPrice,
    stock,
    stockStatus: stock === null ? null : stock > 0 ? 'in_stock' : 'out_of_stock',
    imageUrl: image && /^https:\/\//i.test(image) ? image.slice(0, 1000) : null,
    // Publié et visible en boutique seulement.
    isActive: (!p.status || p.status === 'publish') && p.catalog_visibility !== 'hidden',
  };
}
