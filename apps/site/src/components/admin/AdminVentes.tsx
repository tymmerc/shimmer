'use client';

import { useEffect, useState } from 'react';
import { SectionHeader, Stat, BigStat, Sparkline, Loading, ErrorBlock, Panel, RowList } from './AdminOverview';

interface VentesData {
 period: { from: string; to: string };
 revenue: { total30d: number; previous30d: number; delta: number; deltaPct: number; avgOrder: number; avgOrderPrev: number };
 customers: { total: number; new30d: number; newDeltaPct: number };
 orders: { total30d: number; delivered: number; inTransit: number; pending: number; cancelled: number; deltaPct: number };
 crossSell: {
 impressions30d: number; impressionsDeltaPct: number;
 clicks30d: number; clicksDeltaPct: number;
 adds30d: number; addsDeltaPct: number;
 takeRatePct: number; takeRateDeltaPct: number;
 estimatedRevenueEUR: number;
 };
 series: { revenue: number[]; impressions: number[] };
}

export function AdminVentes() {
 const [s, setS] = useState<VentesData | null>(null);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);

 useEffect(() => {
 (async () => {
 try {
 const key = window.localStorage.getItem('shimmer.admin.key') ?? '';
 const res = await fetch('/shimmer/api/admin-stats/summary', { headers: { Authorization: `Bearer ${key}` } });
 if (!res.ok) throw new Error(`HTTP ${res.status}`);
 setS((await res.json()) as VentesData);
 } catch (e) { setError((e as Error).message); }
 finally { setLoading(false); }
 })();
 }, []);

 if (loading) return <Loading />;
 if (error) return <ErrorBlock message={error} />;
 if (!s) return null;

 return (
 <div className="space-y-10">
 <SectionHeader eyebrow="Vente · 30 derniers jours" title="Le chiffre," accent="et ce qui le porte" />
 <div className="-mt-4 text-xs text-paper/45">
 Indicateurs sur 30 jours · comparés aux 30 jours précédents
 </div>

 <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
 <BigStat
 label="CA total · 30 jours"
 value={`${s.revenue.total30d.toLocaleString('fr-FR')} €`}
 delta={`${s.revenue.deltaPct > 0 ? '+' : ''}${s.revenue.deltaPct}% vs précédent`}
 accent
 sub={`${s.orders.total30d} commandes · panier moyen ${s.revenue.avgOrder}€`}
 />
 <BigStat
 label="CA Shimmer estimé"
 value={`${s.crossSell.estimatedRevenueEUR.toLocaleString('fr-FR')} €`}
 delta={`${s.crossSell.takeRatePct}% take-rate`}
 accent
 sub={`${s.crossSell.adds30d} ajouts panier via cross-sell`}
 />
 <BigStat
 label="Panier moyen"
 value={`${s.revenue.avgOrder} €`}
 delta={s.revenue.avgOrderPrev ? `vs ${s.revenue.avgOrderPrev}€` : 'pas d\'historique'}
 sub={`${s.customers.new30d} nouveaux clients ce mois`}
 />
 </div>

 <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
 <Sparkline title="Revenu quotidien · 14 derniers jours" values={s.series.revenue} unit="€" />
 <Sparkline title="Impressions cross-sell · 14 derniers jours" values={s.series.impressions} />
 </div>

 <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
 <Stat label="Commandes" value={`${s.orders.total30d}`} sub={`${s.orders.delivered} livrées · ${s.orders.inTransit} en route`} deltaPct={s.orders.deltaPct} />
 <Stat label="Nouveaux clients" value={`${s.customers.new30d}`} sub={`${s.customers.total} au total`} deltaPct={s.customers.newDeltaPct} />
 <Stat label="Impressions cross-sell" value={`${s.crossSell.impressions30d}`} sub="suggestions affichées" deltaPct={s.crossSell.impressionsDeltaPct} />
 <Stat label="Clics cross-sell" value={`${s.crossSell.clicks30d}`} sub={`sur ${s.crossSell.impressions30d} impressions`} deltaPct={s.crossSell.clicksDeltaPct} />
 <Stat label="Ajouts au panier" value={`${s.crossSell.adds30d}`} sub="via cross-sell" deltaPct={s.crossSell.addsDeltaPct} accent />
 <Stat label="Take-rate" value={`${s.crossSell.takeRatePct}%`} sub="part des clients qui cliquent" deltaPct={s.crossSell.takeRateDeltaPct} accent />
 <Stat label="Annulées" value={`${s.orders.cancelled}`} sub="commandes annulées" invertDelta />
 <Stat label="En attente" value={`${s.orders.pending}`} sub="à préparer / confirmer" />
 </div>

 <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
 <Panel title="Commandes par statut">
 <RowList rows={[
 ['livrées', s.orders.delivered],
 ['en transit', s.orders.inTransit],
 ['en attente', s.orders.pending],
 ['annulées', s.orders.cancelled],
 ]} />
 </Panel>
 <Panel title="À retenir">
 <ul className="space-y-2 text-sm text-paper/75">
 <li>· Le CA passe par {s.crossSell.takeRatePct}% de clics sur les recos. Au-dessus de 25%, ton catalogue est bien aligné.</li>
 <li>· {s.crossSell.adds30d} ajouts panier sont passés par le vendeur ce mois.</li>
 <li>· {s.orders.deltaPct >= 0 ? `+${s.orders.deltaPct}` : s.orders.deltaPct}% de commandes vs le mois d'avant.</li>
 </ul>
 </Panel>
 </div>
 </div>
 );
}
