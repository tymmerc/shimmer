'use client';

import { useEffect, useState } from 'react';
import { SectionHeader, Loading, ErrorBlock, Panel } from './AdminOverview';

interface Product {
 id: number;
 sku: string | null;
 name: string;
 description: string | null;
 price: string;
 stock: number | null;
 category: string;
 brand: string | null;
 isActive: boolean;
}

interface CatalogStats {
 totalProducts: number;
 categories: Array<{ name: string; count: number }>;
 topBrands: Array<{ name: string; count: number }>;
}

export function AdminCatalog() {
 const [products, setProducts] = useState<Product[]>([]);
 const [stats, setStats] = useState<CatalogStats | null>(null);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);
 const [search, setSearch] = useState('');
 const [activeCategory, setActiveCategory] = useState<string | null>(null);

 useEffect(() => {
 void load();
 }, [activeCategory]);

 async function load() {
 setLoading(true);
 try {
 const key = window.localStorage.getItem('shimmer.admin.key') ?? '';
 const headers = { Authorization: `Bearer ${key}` };
 const q = new URLSearchParams();
 q.set('limit', '100');
 if (activeCategory) q.set('category', activeCategory);
 if (search.trim().length >= 2) q.set('q', search.trim());

 const [pRes, sRes] = await Promise.all([
 fetch(`/shimmer/api/catalog/products?${q.toString()}`, { headers }),
 fetch('/shimmer/api/catalog/stats', { headers }),
 ]);
 if (!pRes.ok) throw new Error(`HTTP ${pRes.status}`);
 if (!sRes.ok) throw new Error(`HTTP ${sRes.status}`);

 const pData = (await pRes.json()) as { items: Product[] };
 const sData = (await sRes.json()) as CatalogStats;
 setProducts(pData.items);
 setStats(sData);
 setError(null);
 } catch (e) {
 setError((e as Error).message);
 } finally {
 setLoading(false);
 }
 }

 function onSearch(e: React.FormEvent) {
 e.preventDefault();
 void load();
 }

 if (loading && !stats) return <Loading />;
 if (!stats) return <ErrorBlock message={error ?? 'Aucune donnée'} />;

 return (
 <div>
 <SectionHeader eyebrow="Catalogue" title="Votre" accent="boutique" />

 <div className="mt-4 flex flex-wrap items-baseline gap-x-6 gap-y-2 text-sm text-paper/65">
 <span>
 <strong className="font-display text-2xl text-paper">{stats.totalProducts}</strong>{' '}
 produits actifs
 </span>
 <span>
 dans <strong className="text-paper">{stats.categories.length}</strong> catégories
 </span>
 {stats.topBrands.length > 0 && (
 <span>
 · <strong className="text-paper">{stats.topBrands.length}</strong> marques
 </span>
 )}
 </div>

 {error && <div className="mt-4"><ErrorBlock message={error} /></div>}

 <div className="mt-8 space-y-6">
 <Panel title="Filtres">
 <form onSubmit={onSearch} className="flex flex-wrap items-center gap-3">
 <input
 type="text"
 value={search}
 onChange={e => setSearch(e.target.value)}
 placeholder="Rechercher un produit (nom, sku, description)…"
 className="flex-1 min-w-[260px] rounded-lg border border-paper/15 bg-black/40 px-4 py-2.5 text-sm text-paper outline-none placeholder-paper/35 focus:border-acid"
 />
 <button
 type="submit"
 className="rounded-full bg-acid px-5 py-2.5 text-xs text-ink transition hover:bg-acid-deep"
 >
 Rechercher
 </button>
 </form>
 {stats.categories.length > 0 && (
 <div className="mt-4 flex flex-wrap gap-2">
 <button
 onClick={() => setActiveCategory(null)}
 className={`rounded-full border px-3 py-1 text-xs transition ${
 activeCategory === null
 ? 'border-acid bg-acid/15 text-acid'
 : 'border-paper/15 bg-paper/[0.02] text-paper/65 hover:border-paper/30'
 }`}
 >
 Toutes ({stats.totalProducts})
 </button>
 {stats.categories.slice(0, 12).map(c => (
 <button
 key={c.name}
 onClick={() => setActiveCategory(c.name)}
 className={`rounded-full border px-3 py-1 text-xs transition ${
 activeCategory === c.name
 ? 'border-acid bg-acid/15 text-acid'
 : 'border-paper/15 bg-paper/[0.02] text-paper/65 hover:border-paper/30'
 }`}
 >
 {c.name} ({c.count})
 </button>
 ))}
 </div>
 )}
 </Panel>

 <Panel title={`Produits (${products.length} affichés)`}>
 {products.length === 0 ? (
 <div className="rounded-xl border border-paper/10 bg-paper/[0.02] px-4 py-8 text-center text-sm text-paper/60">
 Aucun produit trouvé avec ces filtres.
 </div>
 ) : (
 <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
 {products.map(p => (
 <ProductCard key={p.id} product={p} />
 ))}
 </div>
 )}
 </Panel>

 <Panel title="Importer un catalogue">
 <p className="text-xs text-paper/55">
 Vous pouvez importer un catalogue via l'API en POSTant un fichier CSV ou un tableau JSON
 sur <code className="rounded bg-paper/[0.04] px-1.5 py-0.5 text-xs">/shimmer/api/catalog/import</code>.
 Le SDK Shopify et WooCommerce sync automatiquement quand vous activez les webhooks dans la section Intégration.
 </p>
 <p className="mt-3 text-xs text-paper/55">
 <strong className="text-paper/85">Champs attendus :</strong> name, price, category, sku (optionnel), brand
 (optionnel), description (optionnel), stock (optionnel), specs (JSON optionnel).
 </p>
 </Panel>
 </div>
 </div>
 );
}

function ProductCard({ product }: { product: Product }) {
 return (
 <div className="rounded-xl border border-paper/10 bg-paper/[0.02] p-4 transition hover:border-paper/20">
 <div className="flex items-start justify-between gap-3">
 <div className="min-w-0 flex-1">
 <div className="flex items-baseline gap-2">
 <div className="font-display text-base tracking-editorial text-paper">{product.name}</div>
 {!product.isActive && (
 <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-xs text-rose-300">
 inactif
 </span>
 )}
 </div>
 <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-paper/45">
 <span>{product.category}</span>
 {product.brand && (<><span>·</span><span>{product.brand}</span></>)}
 {product.sku && (<><span>·</span><span>sku {product.sku}</span></>)}
 </div>
 {product.description && (
 <p className="mt-2 line-clamp-2 text-xs text-paper/60">{product.description}</p>
 )}
 </div>
 <div className="shrink-0 text-right">
 <div className="font-display text-xl text-paper">€{Number(product.price).toFixed(2)}</div>
 {product.stock !== null && (
 <div className="mt-1 text-xs text-paper/45">
 {product.stock > 0 ? `stock ${product.stock}` : 'rupture'}
 </div>
 )}
 </div>
 </div>
 </div>
 );
}
