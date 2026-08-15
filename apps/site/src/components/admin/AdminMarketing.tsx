'use client';

import { useEffect, useState } from 'react';
import { SectionHeader, Stat, BigStat, Loading, ErrorBlock, Panel, RowList } from './AdminOverview';

interface MarketingData {
 carts: {
 total30d: number; totalDeltaPct: number;
 recovered: number; recoveredDeltaPct: number;
 recoveryRatePct: number;
 abandonedEUR: number;
 recoveredEUR: number; recoveredEURDeltaPct: number;
 };
 outbound: { total30d: number; byFormat: Record<string, number>; byStatus: Record<string, number> };
 emails: { total30d: number; sent: number; failed: number; byTag: Record<string, number> };
}

export function AdminMarketing() {
 const [s, setS] = useState<MarketingData | null>(null);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);

 useEffect(() => {
 (async () => {
 try {
 const key = window.localStorage.getItem('shimmer.admin.key') ?? '';
 const res = await fetch('/shimmer/api/admin-stats/summary', { headers: { Authorization: `Bearer ${key}` } });
 if (!res.ok) throw new Error(`HTTP ${res.status}`);
 setS((await res.json()) as MarketingData);
 } catch (e) { setError((e as Error).message); }
 finally { setLoading(false); }
 })();
 }, []);

 if (loading) return <Loading />;
 if (error) return <ErrorBlock message={error} />;
 if (!s) return null;

 return (
 <div className="space-y-10">
 <SectionHeader eyebrow="Marketing · 30 derniers jours" title="Les paniers récupérés," accent="les campagnes envoyées" />
 <div className="-mt-4 text-xs text-paper/45">
 Indicateurs sur 30 jours · comparés aux 30 jours précédents
 </div>

 <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
 <BigStat
 label="CA récupéré sur paniers"
 value={`${s.carts.recoveredEUR.toLocaleString('fr-FR')} €`}
 delta={`${s.carts.recoveryRatePct}% des paniers abandonnés`}
 accent
 sub={`${s.carts.recovered} paniers sauvés sur ${s.carts.total30d}`}
 />
 <BigStat
 label="Campagnes générées"
 value={`${s.outbound.total30d}`}
 delta={`${s.outbound.byStatus.published ?? 0} publiées`}
 accent
 sub={`${s.outbound.byStatus.draft ?? 0} en brouillon · ${s.outbound.byStatus.scheduled ?? 0} planifiées`}
 />
 <BigStat
 label="Emails partis"
 value={`${s.emails.sent}`}
 delta={s.emails.failed ? `${s.emails.failed} échecs` : 'aucun échec'}
 sub="tous types confondus"
 />
 </div>

 <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
 <Stat label="Paniers abandonnés" value={`${s.carts.total30d}`} sub={`${s.carts.abandonedEUR}€ d'exposition`} deltaPct={s.carts.totalDeltaPct} invertDelta />
 <Stat label="Paniers récupérés" value={`${s.carts.recovered}`} sub={`${s.carts.recoveryRatePct}% de récupération`} deltaPct={s.carts.recoveredDeltaPct} accent />
 <Stat label="CA récupéré" value={`${s.carts.recoveredEUR}€`} sub="sur paniers sauvés" deltaPct={s.carts.recoveredEURDeltaPct} accent />
 <Stat label="Taux de récupération" value={`${s.carts.recoveryRatePct}%`} sub="paniers récupérés / abandonnés" />
 <Stat label="Campagnes en brouillon" value={`${s.outbound.byStatus.draft ?? 0}`} sub="prêtes à approuver" />
 <Stat label="Campagnes planifiées" value={`${s.outbound.byStatus.scheduled ?? 0}`} sub="envoi auto programmé" />
 <Stat label="Campagnes publiées" value={`${s.outbound.byStatus.published ?? 0}`} sub="parties ce mois" accent />
 <Stat label="Emails partis" value={`${s.emails.sent}`} sub={s.emails.failed ? `${s.emails.failed} échecs` : 'aucun échec'} />
 </div>

 <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
 <Panel title="Campagnes par format">
 <RowList rows={Object.entries(s.outbound.byFormat)} />
 </Panel>
 <Panel title="Emails par type">
 <RowList rows={Object.entries(s.emails.byTag).slice(0, 10)} />
 </Panel>
 </div>
 </div>
 );
}
