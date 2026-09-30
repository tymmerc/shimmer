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
  const text = html
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<br\s*\/?>|<\/p>|<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
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
    // Brouillon ou archivé côté Shopify : le vendeur ne le propose plus.
    isActive: !p.status || p.status === 'active',
  };
}

export type CatalogSyncResult = 'created' | 'updated' | 'skipped';

/** Crée ou met à jour la fiche. Ne touche ni à la catégorie (liée aux univers du vendeur) ni à une description déjà présente (souvent enrichie). */
export async function syncCatalogProduct(storeId: number, p: ShopifyCatalogProduct): Promise<CatalogSyncResult> {
  const f = catalogFieldsFromShopify(p);
  if (!f) return 'skipped';
  const prisma = getPrisma();
  const existing =
    (await prisma.product.findFirst({ where: { storeId, platformProductId: f.platformProductId } })) ??
    (await prisma.product.findFirst({ where: { storeId, sku: f.sku } })) ??
    (await prisma.product.findFirst({ where: { storeId, platformProductId: null, name: { equals: f.name, mode: 'insensitive' } } }));

  const now = new Date();
  if (existing) {
    await prisma.product.update({
      where: { id: existing.id },
      data: {
        platformProductId: f.platformProductId,
        name: f.name,
        ...(f.price !== null ? { price: f.price } : {}),
        compareAtPrice: f.compareAtPrice,
        ...(f.stock !== null && f.stockStatus ? { stock: f.stock, stockStatus: f.stockStatus } : {}),
        isActive: f.isActive,
        ...(f.imageUrl ? { imageUrl: f.imageUrl } : {}),
        ...(f.brand ? { brand: f.brand } : {}),
        ...(!existing.description && f.description ? { description: f.description } : {}),
        lastSync: now,
      },
    });
    return 'updated';
  }
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
      lastSync: now,
    },
  });
  logger.info({ storeId, platformProductId: f.platformProductId }, 'catalog.shopify.created');
  return 'created';
}

/** products/delete : la fiche reste (historique des commandes), mais sort du vendeur. */
export async function deactivateCatalogProduct(storeId: number, platformProductId: string): Promise<number> {
  const r = await getPrisma().product.updateMany({
    where: { storeId, platformProductId },
    data: { isActive: false, lastSync: new Date() },
  });
  return r.count;
}
