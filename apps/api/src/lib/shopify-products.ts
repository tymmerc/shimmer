/**
 * Catalogue tenu à jour par les webhooks produits de Shopify.
 *
 * Avant le 30/09, le catalogue ne bougeait qu'à l'import (CSV ou JSON) : figé
 * depuis mai sur la boutique de démo, et un pilote aurait vu le vendeur
 * recommander des prix et des produits d'hier. products/create et
 * products/update mettent désormais la fiche à jour (ou la créent),
 * products/delete la retire.
 *
 * Le premier chargement reste l'import de l'export CSV Shopify (déjà lu par
 * catalog-import) ; une fiche importée est reliée à Shopify au premier webhook
 * (même SKU, sinon même nom).
 */

import { getPrisma, logger } from '@shimmer/core';

export interface ShopifyCatalogVariant {
  id?: number;
  sku?: string | null;
  price?: string | number | null;
  compare_at_price?: string | number | null;
  inventory_quantity?: number | null;
  inventory_management?: string | null;
  inventory_policy?: string | null;
}

export interface ShopifyCatalogProduct {
  id?: number;
  title?: string | null;
  body_html?: string | null;
  vendor?: string | null;
  product_type?: string | null;
  status?: string | null;
  published_at?: string | null;
  image?: { src?: string | null } | null;
  images?: Array<{ src?: string | null }>;
  variants?: ShopifyCatalogVariant[];
}

/**
 * Stock d'un produit dont Shopify ne suit pas l'inventaire (ou qui se vend
 * même à 0). Shopify envoie alors 0, et 0 veut dire « épuisé » pour le
 * vendeur (isSoldOut) : on pose une valeur haute à la place.
 */
export const UNTRACKED_STOCK = 999;

export interface CatalogFields {
  platformProductId: string;
  sku: string;
  name: string;
  description: string | null;
  brand: string | null;
  category: string | null;
  price: number | null;
  compareAtPrice: number | null;
  /** null : Shopify n'a rien dit du stock, la fiche garde le sien. */
  stock: number | null;
  stockStatus: 'in_stock' | 'out_of_stock' | null;
  imageUrl: string | null;
  isActive: boolean;
}

const num = (v: unknown): number | null => {
  const n = Number(v);
  return v === null || v === undefined || v === '' || !Number.isFinite(n) ? null : n;
};

export function stripHtml(html: string | null | undefined): string | null {
  if (!html) return null;
  // Tronqué avant les expressions : un body_html de plusieurs Mo ne les fait pas s'emballer.
  const text = html.slice(0, 100_000)
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<br\s*\/?>|<\/p>|<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    // En dernier : « &amp;lt; » doit donner « &lt; », pas « < ».
    .replace(/&amp;/g, '&')
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .trim();
  return text ? text.slice(0, 5000) : null;
}

/** Fiche catalogue d'après le produit Shopify ; null si inutilisable (sans id ni titre). */
export function catalogFieldsFromShopify(p: ShopifyCatalogProduct): CatalogFields | null {
  const name = (p.title ?? '').trim();
  if (!p.id || !name) return null;
  const variants = p.variants ?? [];
  const priced = variants
    .map((v) => ({ v, price: num(v.price) }))
    .filter((x): x is { v: ShopifyCatalogVariant; price: number } => x.price !== null && x.price >= 0)
    .sort((a, b) => a.price - b.price);
  const cheapest = priced[0];
  const compare = cheapest ? num(cheapest.v.compare_at_price) : null;

  // Stock : somme des variantes suivies. Une variante que Shopify dit non
  // suivie (inventory_management à null, champ présent) ou vendue même à 0
  // (inventory_policy « continue ») rend le produit disponible. Un champ
  // absent ne vaut pas « non suivi » : sinon un épuisé redeviendrait
  // disponible le jour où Shopify retire le champ de ses webhooks.
  const alwaysAvailable = variants.some((v) =>
    v.inventory_policy === 'continue' || ('inventory_management' in v && v.inventory_management === null));
  const counted = variants.map((v) => num(v.inventory_quantity)).filter((q): q is number => q !== null);
  const tracked = counted.reduce((sum, q) => sum + Math.max(0, q), 0);
  const stock = alwaysAvailable ? Math.max(tracked, UNTRACKED_STOCK) : counted.length > 0 ? tracked : null;

  const firstSku = variants.map((v) => (v.sku ?? '').trim()).find(Boolean);
  const image = p.image?.src ?? p.images?.find((i) => i.src)?.src ?? null;

  return {
    platformProductId: String(p.id),
    sku: (firstSku ?? `shopify-${p.id}`).slice(0, 100),
    name: name.slice(0, 500),
    description: stripHtml(p.body_html),
    brand: p.vendor?.trim().slice(0, 200) || null,
    category: p.product_type?.trim().slice(0, 200) || null,
    price: cheapest?.price ?? null,
    compareAtPrice: compare !== null && cheapest && compare > cheapest.price ? compare : null,
    stock,
    stockStatus: stock === null ? null : stock > 0 ? 'in_stock' : 'out_of_stock',
    imageUrl: image && /^https:\/\//i.test(image) ? image.slice(0, 1000) : null,
    // Brouillon, archivé ou non publié en ligne : le vendeur ne le propose plus.
    isActive: (!p.status || p.status === 'active') && !('published_at' in p && p.published_at === null),
  };
}

export type CatalogSyncResult = 'created' | 'updated' | 'unchanged' | 'skipped';

type ExistingProduct = {
  id: number;
  platformProductId: string | null;
  name: string;
  price: unknown;
  compareAtPrice: unknown;
  stock: number;
  stockStatus: string;
  isActive: boolean;
  imageUrl: string | null;
  brand: string | null;
  description: string | null;
};

const sameNum = (a: unknown, b: number | null) => (a === null || a === undefined ? b === null : b !== null && Number(a) === b);

/** Champs à écrire : seulement ce qui change (un webhook sans changement n'écrit rien). */
export function catalogChanges(existing: ExistingProduct, f: CatalogFields): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  if (existing.platformProductId !== f.platformProductId) data.platformProductId = f.platformProductId;
  if (existing.name !== f.name) data.name = f.name;
  if (f.price !== null && !sameNum(existing.price, f.price)) data.price = f.price;
  if (!sameNum(existing.compareAtPrice, f.compareAtPrice)) data.compareAtPrice = f.compareAtPrice;
  if (f.stock !== null && f.stockStatus && (existing.stock !== f.stock || existing.stockStatus !== f.stockStatus)) {
    data.stock = f.stock;
    data.stockStatus = f.stockStatus;
  }
  if (existing.isActive !== f.isActive) data.isActive = f.isActive;
  if (f.imageUrl && existing.imageUrl !== f.imageUrl) data.imageUrl = f.imageUrl;
  if (f.brand && existing.brand !== f.brand) data.brand = f.brand;
  if (!existing.description && f.description) data.description = f.description;
  return data;
}

async function findExisting(storeId: number, f: CatalogFields): Promise<ExistingProduct | null> {
  const prisma = getPrisma();
  const linked = await prisma.product.findFirst({ where: { storeId, platformProductId: f.platformProductId } });
  if (linked) return linked as ExistingProduct;
  // Fiche importée pas encore reliée : même SKU, sinon même nom (candidat
  // unique). Jamais une fiche déjà reliée à un autre produit Shopify.
  const bySku = await prisma.product.findFirst({ where: { storeId, sku: f.sku, platformProductId: null } });
  if (bySku) return bySku as ExistingProduct;
  const byName = await prisma.$queryRaw<Array<{ id: number }>>`
    SELECT id FROM products
    WHERE store_id = ${storeId} AND platform_product_id IS NULL AND lower(name) = lower(${f.name})
    LIMIT 2`;
  if (byName.length !== 1) return null;
  return (await prisma.product.findFirst({ where: { id: byName[0]!.id, storeId } })) as ExistingProduct | null;
}

/** Crée ou met à jour la fiche d'un produit Shopify. */
export async function syncCatalogProduct(storeId: number, p: ShopifyCatalogProduct): Promise<CatalogSyncResult> {
  const f = catalogFieldsFromShopify(p);
  if (!f) return 'skipped';
  return (await syncCatalogFields(storeId, f)).result;
}

/**
 * Crée ou met à jour la fiche, quelle que soit la plateforme (Shopify,
 * WooCommerce). Ne touche ni à la catégorie (liée aux univers du vendeur) ni
 * à une description déjà présente (souvent enrichie). Renvoie aussi le stock
 * d'avant, pour détecter un retour en stock.
 */
export async function syncCatalogFields(storeId: number, f: CatalogFields): Promise<{ result: CatalogSyncResult; previousStock: number | null }> {
  const prisma = getPrisma();

  const existing = await findExisting(storeId, f);
  if (existing) {
    const data = catalogChanges(existing, f);
    if (Object.keys(data).length === 0) return { result: 'unchanged', previousStock: existing.stock };
    await prisma.product.update({ where: { id: existing.id }, data: { ...data, lastSync: new Date() } });
    return { result: 'updated', previousStock: existing.stock };
  }
  try {
    await prisma.product.create({
      data: {
        storeId,
        sku: f.sku,
        platformProductId: f.platformProductId,
        name: f.name,
        description: f.description,
        brand: f.brand,
        category: f.category,
        price: f.price,
        compareAtPrice: f.compareAtPrice,
        // Nouveau produit sans info de stock : disponible (le marchand vient de le créer).
        stock: f.stock ?? UNTRACKED_STOCK,
        stockStatus: f.stockStatus ?? 'in_stock',
        imageUrl: f.imageUrl,
        isActive: f.isActive,
        lastSync: new Date(),
      },
    });
  } catch (err) {
    // products/create et products/update arrivent souvent ensemble : l'autre
    // a créé la fiche entre-temps (index unique sku + boutique), on la met à jour.
    if ((err as { code?: string }).code !== 'P2002') throw err;
    const again = await findExisting(storeId, f);
    if (!again) throw err;
    const data = catalogChanges(again, f);
    if (Object.keys(data).length > 0) await prisma.product.update({ where: { id: again.id }, data: { ...data, lastSync: new Date() } });
    return { result: 'updated', previousStock: again.stock };
  }
  logger.info({ storeId, platformProductId: f.platformProductId }, 'catalog.product.created');
  return { result: 'created', previousStock: null };
}

/**
 * inventory_levels/update ne porte qu'une variante : on recalcule le stock de
 * la fiche à partir des variantes connues (platform_variant_stock). Si une
 * variante a un stock inconnu, on ne touche à rien.
 */
export async function refreshProductStock(storeId: number, platformProductId: string): Promise<boolean> {
  const prisma = getPrisma();
  const variants = await prisma.platformVariantStock.findMany({
    where: { storeId, platformProductId },
    select: { available: true },
  });
  if (variants.length === 0 || variants.some((v) => v.available === null)) return false;
  const stock = variants.reduce((sum, v) => sum + Math.max(0, v.available ?? 0), 0);
  const stockStatus = stock > 0 ? 'in_stock' : 'out_of_stock';
  const r = await prisma.product.updateMany({
    where: { storeId, platformProductId, OR: [{ stock: { not: stock } }, { stockStatus: { not: stockStatus } }] },
    data: { stock, stockStatus, lastSync: new Date() },
  });
  return r.count > 0;
}

/** products/delete : la fiche reste (historique des commandes), mais sort du vendeur. */
export async function deactivateCatalogProduct(storeId: number, platformProductId: string): Promise<number> {
  const r = await getPrisma().product.updateMany({
    where: { storeId, platformProductId },
    data: { isActive: false, lastSync: new Date() },
  });
  return r.count;
}
