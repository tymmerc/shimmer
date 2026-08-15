'use client';

import { useEffect, useState } from 'react';
import { SectionHeader, Stat, BigStat, Loading, ErrorBlock, Panel, RowList } from './AdminOverview';

interface RelationData {
 sav: { total30d: number; totalDeltaPct: number; open: number; resolved: number; resolvedDeltaPct: number; avgResolutionHours: number; byType: Record<string, number> };
 reviews: { total30d: number; totalDeltaPct: number; avgRating: number; lowRatings: number };
 emails: { total30d: number; sent: number; failed: number; byTag: Record<string, number> };
}

export function AdminRelationClient() {
 const [s, setS] = useState<RelationData | null>(null);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);

 useEffect(() => {
 (async () => {
 try {
 const key = window.localStorage.getItem('shimmer.admin.key') ?? '';
 const res = await fetch('/shimmer/api/admin-stats/summary', { headers: { Authorization: `Bearer ${key}` } });
 if (!res.ok) throw new Error(`HTTP ${res.status}`);
 setS((await res.json()) as RelationData);
 } catch (e) { setError((e as Error).message); }
 finally { setLoading(false); }
 })();
 }, []);

 if (loading) return <Loading />;
 if (error) return <ErrorBlock message={error} />;
 if (!s) return null;

 return (
 <div className="space-y-10">
 <SectionHeader eyebrow="Relation client · 30 derniers jours" title="L'après-vente," accent="et la satisfaction" />
 <div className="-mt-4 text-xs text-paper/45">
 Indicateurs sur 30 jours · comparés aux 30 jours précédents
 </div>

 <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
 <BigStat
 label="Tickets SAV résolus"
 value={`${s.sav.resolved}`}
 delta={`sur ${s.sav.total30d} créés`}
 accent
 sub={`${s.sav.avgResolutionHours}h de délai moyen de résolution`}
 />
 <BigStat
 label="Note moyenne avis"
 value={`${s.reviews.avgRating} / 5`}
 delta={`${s.reviews.total30d} avis collectés`}
 accent
 sub={`${s.reviews.lowRatings} avis 1-2★ interceptés avant publication`}
 />
 <BigStat
 label="Tickets ouverts"
 value={`${s.sav.open}`}
 delta={`${s.sav.avgResolutionHours}h en moyenne pour résoudre`}
 sub="à traiter ou en cours"
 />
 </div>

 <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
 <Stat label="Nouveaux tickets" value={`${s.sav.total30d}`} sub="créés ce mois" deltaPct={s.sav.totalDeltaPct} invertDelta />
 <Stat label="Tickets résolus" value={`${s.sav.resolved}`} sub="passés en resolved" deltaPct={s.sav.resolvedDeltaPct} accent />
 <Stat label="Tickets ouverts" value={`${s.sav.open}`} sub="ouverts, en cours, escaladés" invertDelta />
 <Stat label="Délai moyen" value={`${s.sav.avgResolutionHours}h`} sub="entre création et résolution" />
 <Stat label="Avis collectés" value={`${s.reviews.total30d}`} sub={`note moyenne ${s.reviews.avgRating}/5`} deltaPct={s.reviews.totalDeltaPct} accent />
 <Stat label="Note moyenne" value={`${s.reviews.avgRating}/5`} sub="cumulée sur la période" />
 <Stat label="Avis 1-2★ interceptés" value={`${s.reviews.lowRatings}`} sub="avant publication" invertDelta />
 <Stat label="Emails partis" value={`${s.emails.sent}`} sub={s.emails.failed ? `${s.emails.failed} échecs` : 'aucun échec'} />
 </div>

 <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
 <Panel title="Tickets SAV par type">
 <RowList rows={Object.entries(s.sav.byType)} />
 </Panel>
 <Panel title="Emails par type">
 <RowList rows={Object.entries(s.emails.byTag).slice(0, 8)} />
 </Panel>
 </div>
 </div>
 );
}
