import { describe, it, expect, vi, beforeEach } from 'vitest';

// Le catalogue ne bougeait qu'à l'import : il suit maintenant les webhooks
// produits de Shopify (création, mise à jour, suppression).
const rows: Array<Record<string, unknown>> = [];
const updates: Array<{ id: number; data: Record<string, unknown> }> = [];
const creates: Array<Record<string, unknown>> = [];
const matches = (r: Record<string, unknown>, where: Record<string, unknown>) => Object.entries(where).every(([k, v]) => {
  if (v && typeof v === 'object' && 'equals' in (v as object)) return String(r[k]).toLowerCase() === String((v as { equals: string }).equals).toLowerCase();
  return (r[k] ?? null) === v;
});
const variantRows: Array<{ storeId: number; platformProductId: string; available: number | null }> = [];
vi.mock('@shimmer/core', () => ({
  getPrisma: () => ({
    $queryRaw: vi.fn(async (_s: TemplateStringsArray, storeId: number, name: string) =>
      rows.filter((r) => r.storeId === storeId && (r.platformProductId ?? null) === null && String(r.name).toLowerCase() === name.toLowerCase()).slice(0, 2).map((r) => ({ id: r.id }))),
    platformVariantStock: {
      findMany: vi.fn(async ({ where }: { where: { storeId: number; platformProductId: string } }) => variantRows.filter((v) => v.storeId === where.storeId && v.platformProductId === where.platformProductId)),
    },
    product: {
      findFirst: vi.fn(async ({ where }: { where: Record<string, unknown> }) => rows.find((r) => matches(r, where)) ?? null),
      update: vi.fn(async ({ where, data }: { where: { id: number }; data: Record<string, unknown> }) => { updates.push({ id: where.id, data }); return {}; }),
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => { creates.push(data); return data; }),
      updateMany: vi.fn(async ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
        const { OR: _or, ...plain } = where as Record<string, unknown> & { OR?: unknown };
        const hit = rows.filter((r) => matches(r, plain));
        for (const r of hit) Object.assign(r, data);
        return { count: hit.length };
      }),
    },
  }),
  logger: { info: vi.fn(), warn: vi.fn() },
}));
const { catalogFieldsFromShopify, syncCatalogProduct, deactivateCatalogProduct, refreshProductStock, stripHtml, UNTRACKED_STOCK } = await import('../lib/shopify-products.js');

const product = (over: Record<string, unknown> = {}) => ({
  id: 111, title: 'Brouilly 2022', body_html: '<p>Fruité &amp; <b>gourmand</b></p>', vendor: 'Château Thivin', product_type: 'Vin rouge', status: 'active',
  image: { src: 'https://cdn.shopify.com/brouilly.jpg' },
  variants: [
    { id: 1, sku: 'BRO-75', price: '15.00', compare_at_price: '18.00', inventory_quantity: 4, inventory_management: 'shopify', inventory_policy: 'deny' },
    { id: 2, sku: 'BRO-150', price: '32.00', inventory_quantity: 1, inventory_management: 'shopify', inventory_policy: 'deny' },
  ],
  ...over,
});

beforeEach(() => { rows.length = 0; updates.length = 0; creates.length = 0; variantRows.length = 0; });

describe('catalogFieldsFromShopify', () => {
  it('prix le plus bas, stock cumulé, texte sans HTML', () => {
    const f = catalogFieldsFromShopify(product())!;
    expect(f).toMatchObject({ platformProductId: '111', sku: 'BRO-75', name: 'Brouilly 2022', price: 15, compareAtPrice: 18, stock: 5, stockStatus: 'in_stock', brand: 'Château Thivin', category: 'Vin rouge', isActive: true });
    expect(f.description).toBe('Fruité & gourmand');
  });
  it('épuisé quand toutes les variantes suivies sont à 0', () => {
    const f = catalogFieldsFromShopify(product({ variants: [{ id: 1, price: '15', inventory_quantity: 0, inventory_management: 'shopify', inventory_policy: 'deny' }] }))!;
    expect(f.stock).toBe(0);
    expect(f.stockStatus).toBe('out_of_stock');
  });
  it('stock non suivi ou vente à découvert : disponible', () => {
    expect(catalogFieldsFromShopify(product({ variants: [{ id: 1, price: '15', inventory_quantity: 0, inventory_management: null }] }))!.stock).toBe(UNTRACKED_STOCK);
    expect(catalogFieldsFromShopify(product({ variants: [{ id: 1, price: '15', inventory_quantity: 0, inventory_management: 'shopify', inventory_policy: 'continue' }] }))!.stockStatus).toBe('in_stock');
  });
  it('champ absent : stock inconnu, pas « disponible » par défaut', () => {
    const f = catalogFieldsFromShopify(product({ variants: [{ id: 1, price: '15' }] }))!;
    expect(f.stock).toBeNull();
    expect(f.stockStatus).toBeNull();
  });
  it('brouillon ou archivé : inactif ; sans id ou titre : ignoré ; image http refusée', () => {
    expect(catalogFieldsFromShopify(product({ status: 'draft' }))!.isActive).toBe(false);
    expect(catalogFieldsFromShopify(product({ id: undefined }))).toBeNull();
    expect(catalogFieldsFromShopify(product({ title: ' ' }))).toBeNull();
    expect(catalogFieldsFromShopify(product({ image: { src: 'http://x/y.jpg' } }))!.imageUrl).toBeNull();
  });
  it('stripHtml retire scripts et balises, décode &amp; en dernier', () => {
    expect(stripHtml('<script>alert(1)</script><p>Un&nbsp;vin</p><p>rouge</p>')).toBe('Un vin\nrouge');
    expect(stripHtml('<p>&amp;lt;b&amp;gt;</p>')).toBe('&lt;b&gt;');
  });
  it('actif mais non publié en ligne : retiré du vendeur', () => {
    expect(catalogFieldsFromShopify(product({ published_at: null }))!.isActive).toBe(false);
    expect(catalogFieldsFromShopify(product({ published_at: '2026-09-01T00:00:00Z' }))!.isActive).toBe(true);
  });
});

describe('syncCatalogProduct', () => {
  it('fiche importée (même SKU) : reliée et mise à jour, catégorie et description gardées', async () => {
    rows.push({ id: 5, storeId: 4, sku: 'BRO-75', name: 'Brouilly 2022', platformProductId: null, description: 'Texte enrichi', category: 'Vin rouge' });
    expect(await syncCatalogProduct(4, product({ product_type: 'Rouges' }))).toBe('updated');
    expect(updates[0]!.id).toBe(5);
    expect(updates[0]!.data).toMatchObject({ platformProductId: '111', price: 15, stock: 5, isActive: true });
    expect(updates[0]!.data).not.toHaveProperty('category');
    expect(updates[0]!.data).not.toHaveProperty('description');
  });
  it('stock inconnu : la fiche garde le sien', async () => {
    rows.push({ id: 5, storeId: 4, sku: 'BRO-75', name: 'Brouilly 2022', platformProductId: '111' });
    await syncCatalogProduct(4, product({ variants: [{ id: 1, sku: 'BRO-75', price: '16' }] }));
    expect(updates[0]!.data).not.toHaveProperty('stock');
    expect(updates[0]!.data).toMatchObject({ price: 16 });
  });
  it('nouveau produit : créé ; une autre boutique n\'est jamais touchée', async () => {
    rows.push({ id: 9, storeId: 5, sku: 'BRO-75', name: 'Brouilly 2022', platformProductId: '111' });
    expect(await syncCatalogProduct(4, product())).toBe('created');
    expect(creates[0]).toMatchObject({ storeId: 4, sku: 'BRO-75', platformProductId: '111', category: 'Vin rouge' });
    expect(updates).toHaveLength(0);
  });
  it('SKU déjà relié à un autre produit Shopify : jamais repris, nouvelle fiche', async () => {
    rows.push({ id: 5, storeId: 4, sku: 'BRO-75', name: 'Brouilly 2022', platformProductId: '999' });
    expect(await syncCatalogProduct(4, product())).toBe('created');
    expect(updates).toHaveLength(0);
  });
  it('nom ambigu (deux fiches) : pas de rattachement au hasard', async () => {
    rows.push({ id: 5, storeId: 4, sku: 'A', name: 'Brouilly 2022', platformProductId: null }, { id: 6, storeId: 4, sku: 'B', name: 'BROUILLY 2022', platformProductId: null });
    expect(await syncCatalogProduct(4, product({ variants: [{ id: 1, sku: 'X', price: '15', inventory_quantity: 3, inventory_management: 'shopify' }] }))).toBe('created');
  });
  it('rien n\'a changé : aucune écriture', async () => {
    rows.push({ id: 5, storeId: 4, sku: 'BRO-75', name: 'Brouilly 2022', platformProductId: '111', price: '15.00', compareAtPrice: '18.00', stock: 5, stockStatus: 'in_stock', isActive: true, imageUrl: 'https://cdn.shopify.com/brouilly.jpg', brand: 'Château Thivin', description: 'x' });
    expect(await syncCatalogProduct(4, product())).toBe('unchanged');
    expect(updates).toHaveLength(0);
  });
  it('niveau de stock : la fiche suit la somme des variantes, inconnu = rien', async () => {
    rows.push({ id: 5, storeId: 4, platformProductId: '111', stock: 5, stockStatus: 'in_stock' });
    variantRows.push({ storeId: 4, platformProductId: '111', available: 0 }, { storeId: 4, platformProductId: '111', available: 0 });
    expect(await refreshProductStock(4, '111')).toBe(true);
    expect(rows[0]).toMatchObject({ stock: 0, stockStatus: 'out_of_stock' });
    variantRows.push({ storeId: 4, platformProductId: '111', available: null });
    expect(await refreshProductStock(4, '111')).toBe(false);
  });
  it('suppression : désactive par id Shopify dans la boutique', async () => {
    rows.push({ id: 5, storeId: 4, platformProductId: '111' }, { id: 9, storeId: 5, platformProductId: '111' });
    expect(await deactivateCatalogProduct(4, '111')).toBe(1);
  });
});
