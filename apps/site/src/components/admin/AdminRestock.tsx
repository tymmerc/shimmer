'use client';

import { useEffect, useState } from 'react';
import { SectionHeader, SourceBadge, Stat, Panel, Loading, ErrorBlock } from './AdminOverview';

interface Demand {
 platformVariantId: string;
 variantLabel: string | null;
 productId: number | null;
 productName: string | null;
 waiting: number;
}

interface Summary {
 waiting: number;
 notified: number;
 converted: number;
 conversionRatePct: number;
 convertedEUR: number;
}

/**
 * Réassort : ce que les clients attendent (quoi refaire, en quelle taille) et
 * ce que ça a rapporté quand c'est revenu. Preuve directe, comptée un par un.
 */
export function AdminRestock() {
 const [demand, setDemand] = useState<Demand[]>([]);
 const [summary, setSummary] = useState<Summary | null>(null);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);

 useEffect(() => {
 (async () => {
 try {
 const key = window.localStorage.getItem('shimmer.admin.key') ?? '';
 const headers = { Authorization: `Bearer ${key}` };
 const [d, s] = await Promise.all([
 fetch('/shimmer/api/stock-alerts/demand', { headers }),
 fetch('/shimmer/api/stock-alerts/summary', { headers }),
 ]);
 if (!d.ok) throw new Error(`HTTP ${d.status}`);
 if (!s.ok) throw new Error(`HTTP ${s.status}`);
 const dj = (await d.json()) as { demand: Demand[] };
 setDemand(dj.demand);
 setSummary((await s.json()) as Summary);
 } catch (e) {
 setError((e as Error).message);
 } finally {
 setLoading(false);
 }
 })();
 }, []);

 if (loading) return <Loading />;
 if (error) return <ErrorBlock message={error} />;
 if (!summary) return null;

 const max = Math.max(1, ...demand.map(d => d.waiting));

 return (
 <div className="space-y-6">
 <SectionHeader eyebrow="Retour de stock" title="Réassort" badge={<SourceBadge label="Widget vendeur" />} />

 <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
 <Stat label="Clients en attente" value={`${summary.waiting}`} sub="ont demandé à être prévenus" accent={summary.waiting > 0} />
 <Stat label="Prévenus" value={`${summary.notified}`} sub="email envoyé au retour du produit" />
 <Stat label="Ont commandé" value={`${summary.converted}`} sub={summary.notified ? `${summary.conversionRatePct}% des prévenus` : 'après avoir été prévenus'} />
 <Stat label="Ventes récupérées" value={`${summary.convertedEUR.toLocaleString('fr-FR')} €`} sub="comptées commande par commande" accent={summary.convertedEUR > 0} />
 </div>

 <Panel title="Quoi réassortir en priorité">
 {demand.length === 0 ? (
 <p className="text-sm text-neutral-500">
 Personne n&apos;attend de produit pour l&apos;instant. Dès qu&apos;un visiteur demandera un article épuisé au vendeur,
 sa demande apparaîtra ici, par produit et par taille.
 </p>
 ) : (
 <>
 <p className="mb-4 text-sm text-neutral-500">
 Les clients ont demandé ces produits pendant qu&apos;ils étaient épuisés. Chaque ligne, c&apos;est une vente qui attend.
 </p>
 <ul className="space-y-2">
 {demand.map(d => (
 <li key={d.platformVariantId} className="grid grid-cols-[1fr_auto] items-center gap-3">
 <div className="relative h-8 overflow-hidden rounded bg-neutral-100">
 <div className="absolute inset-y-0 left-0 rounded bg-emerald-500/25" style={{ width: `${(d.waiting / max) * 100}%` }} />
 <div className="absolute inset-y-0 left-3 flex items-center text-sm text-neutral-800">
 {d.variantLabel ?? d.productName ?? `Variante ${d.platformVariantId}`}
 </div>
 </div>
 <span className="text-sm font-semibold tabular-nums text-neutral-900">
 {d.waiting} <span className="font-normal text-neutral-400">{d.waiting > 1 ? 'clients' : 'client'}</span>
 </span>
 </li>
 ))}
 </ul>
 </>
 )}
 </Panel>

 <details className="text-xs text-neutral-400">
 <summary className="cursor-pointer select-none text-neutral-500 hover:text-neutral-700">Comment ça marche ?</summary>
 <p className="mt-2 max-w-2xl leading-relaxed">
 Quand un visiteur demande au vendeur un produit épuisé, le vendeur lui propose de le prévenir. Dès que le produit
 revient en stock (on le sait par votre plateforme), un email part automatiquement. Si le client commande dans les
 7 jours, la vente est comptée ici, une par une, et entre dans le chiffre d&apos;affaires prouvé.
 </p>
 </details>
 </div>
 );
}
