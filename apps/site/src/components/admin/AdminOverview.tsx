'use client';

import { useEffect, useState } from 'react';

interface Summary {
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
 carts: {
 total30d: number; totalDeltaPct: number;
 recovered: number; recoveredDeltaPct: number;
 recoveryRatePct: number;
 abandonedEUR: number;
 recoveredEUR: number; recoveredEURDeltaPct: number;
 };
 sav: { total30d: number; totalDeltaPct: number; open: number; resolved: number; resolvedDeltaPct: number; avgResolutionHours: number; byType: Record<string, number> };
 reviews: { total30d: number; totalDeltaPct: number; avgRating: number; lowRatings: number };
 outbound: { total30d: number; byFormat: Record<string, number>; byStatus: Record<string, number> };
 emails: { total30d: number; sent: number; failed: number; byTag: Record<string, number> };
 series: { days: string[]; orders: number[]; revenue: number[]; emails: number[]; impressions: number[] };
}

interface HoldoutReport {
 holdout: { enabled: boolean; pct: number; effectThresholdPct: number };
 lift: {
 controlVisitors: number; treatmentVisitors: number;
 controlMeanEUR: number; treatmentMeanEUR: number;
 absoluteLiftEUR: number; absoluteLiftCI: [number, number];
 relativeLiftPct: number; relativeLiftCI: [number, number];
 pUpliftAboveThreshold: number; effectThresholdPct: number;
 incrementalRevenueEUR: number; significant: boolean;
 };
 billing: {
 floorEUR: number; capEUR: number | null; ratePct: number;
 variableActive: boolean; variableFeeEUR: number; monthlyTotalEUR: number;
 status: string;
 };
}

export function AdminOverview() {
 const [s, setS] = useState<Summary | null>(null);
 const [h, setH] = useState<HoldoutReport | null>(null);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);

 useEffect(() => {
 (async () => {
 try {
 const key = window.localStorage.getItem('shimmer.admin.key') ?? '';
 const headers = { Authorization: `Bearer ${key}` };
 const [sRes, pRes] = await Promise.all([
 fetch('/shimmer/api/admin-stats/summary', { headers }),
 // Même source que la page Preuve : la facture et le "prouvé" ne
 // divergent jamais entre les deux pages.
 fetch('/shimmer/api/holdout/proof', { headers }),
 ]);
 if (!sRes.ok) throw new Error(`HTTP ${sRes.status}`);
 setS((await sRes.json()) as Summary);
 if (pRes.ok) {
 const p = (await pRes.json()) as {
 holdout: HoldoutReport['holdout'];
 modules: { vendeur: { enrolledControl: number; enrolledTreated: number; lift: HoldoutReport['lift'] } };
 billing: { floorEUR: number; ratePct: number; capEUR: number | null; provenIncrementalEUR: number; variableFeeEUR: number; monthlyTotalEUR: number; modulesProven: string[] };
 };
 const vl = p.modules.vendeur.lift;
 setH({
 holdout: p.holdout,
 lift: {
 ...vl,
 // Le gros chiffre = total prouvé tous modules (source de la facture)
 significant: p.billing.modulesProven.length > 0,
 incrementalRevenueEUR: p.billing.provenIncrementalEUR,
 },
 billing: {
 floorEUR: p.billing.floorEUR,
 capEUR: p.billing.capEUR,
 ratePct: p.billing.ratePct,
 variableActive: p.billing.variableFeeEUR > 0,
 variableFeeEUR: p.billing.variableFeeEUR,
 monthlyTotalEUR: p.billing.monthlyTotalEUR,
 status: '',
 },
 });
 }
 } catch (e) {
 setError((e as Error).message);
 } finally {
 setLoading(false);
 }
 })();
 }, []);

 if (loading) return <Loading />;
 if (error) return <ErrorBlock message={error} />;
 if (!s) return null;

 const periodLabel = `${new Date(s.period.from).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} → ${new Date(s.period.to).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`;

 return (
 <div className="space-y-5">
 <div className="flex flex-wrap items-end justify-between gap-2">
 <h1 className="text-xl font-semibold tracking-tight text-neutral-900">Vue d&apos;ensemble</h1>
 <span className="text-sm tabular-nums text-neutral-400">{periodLabel} · vs 30 j préc.</span>
 </div>

 <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-400">
 <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Natif Shopify</span>
 <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-amber-400" />Nécessite un widget Shimmer</span>
 </div>

 {/* L'ARGENT GAGNÉ — la star */}
 <MoneyHero holdout={h} summary={s} />

 {/* Les vitaux */}
 <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
 <Stat label="Chiffre d'affaires" value={`${s.revenue.total30d.toLocaleString('fr-FR')} €`} sub={`${s.orders.total30d} commandes · panier ${s.revenue.avgOrder} €`} deltaPct={s.revenue.deltaPct} source={<SourceDot native title="Donnée native Shopify · commandes payées" />} />
 <Stat label="Paniers récupérés" value={`${s.carts.recoveredEUR.toLocaleString('fr-FR')} €`} sub={`${s.carts.recovered} sur ${s.carts.total30d} abandonnés`} deltaPct={s.carts.recoveredEURDeltaPct} accent source={<SourceDot native title="Paniers natifs Shopify · l'envoi des relances demande un canal email/SMS" />} />
 <Stat label="Avis clients" value={`${s.reviews.avgRating}/5`} sub={`${s.reviews.total30d} collectés · ${s.reviews.lowRatings} négatifs interceptés`} deltaPct={s.reviews.totalDeltaPct} source={<SourceDot title="Nécessite la collecte d'avis Shimmer (email post-livraison)" />} />
 <Stat label="SAV" value={`${s.sav.open} à traiter`} sub={`${s.sav.resolved} résolus · ${s.sav.avgResolutionHours}h en moyenne`} source={<SourceDot title="Nécessite le widget SAV Shimmer" />} />
 </div>

 {/* Tendance + à traiter */}
 <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
 <div className="lg:col-span-2">
 <RevenueChart values={s.series.revenue} />
 </div>
 <ToDoPanel s={s} />
 </div>

 {/* Automatisations */}
 <ModulesStrip s={s} />
 </div>
 );
}

function MoneyHero({ holdout, summary }: { holdout: HoldoutReport | null; summary: Summary }) {
 if (summary.orders.total30d === 0 && summary.revenue.total30d === 0) {
 return (
 <Card className="p-6">
 <div className="text-sm font-medium text-emerald-600">Shimmer observe votre boutique</div>
 <h2 className="mt-1.5 text-2xl font-semibold text-neutral-900">Les premiers chiffres arrivent bientôt.</h2>
 <p className="mt-2 max-w-[64ch] text-sm leading-relaxed text-neutral-500">
 Le vendeur apprend votre catalogue et vos clients. Dès qu&apos;assez de visiteurs seront passés, on
 compare ceux qui voient Shimmer à un groupe témoin et on vous montre, à l&apos;euro, ce que ça vous
 rapporte.
 </p>
 </Card>
 );
 }

 const l = holdout?.lift;
 const b = holdout?.billing;
 const proven = !!(l && l.significant);
 const confidencePct = l ? Math.round(l.pUpliftAboveThreshold * 100) : 0;
 const bigValue = proven ? l!.incrementalRevenueEUR : summary.revenue.total30d;

 return (
 <Card className="p-6">
 <div className="flex flex-wrap items-start justify-between gap-3">
 <div>
 <div className="text-sm font-medium text-neutral-600">
 {proven ? 'Ce que Shimmer vous a rapporté' : 'Votre chiffre d\'affaires'}
 </div>
 <div className="mt-0.5 text-xs text-neutral-400">
 30 derniers jours{proven ? ' · mesuré par groupe témoin' : ` · ${summary.orders.total30d} commandes`}
 </div>
 </div>
 {holdout && (
 <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
 proven ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'
 }`}>
 <span className={`h-1.5 w-1.5 rounded-full ${proven ? 'bg-emerald-500' : 'bg-amber-500'}`} />
 {proven ? 'Vérifié et prouvé' : `${confidencePct} % de certitude`}
 </span>
 )}
 </div>

 <div className="mt-4 flex flex-wrap items-end gap-x-4 gap-y-1">
 <span className="text-[clamp(40px,5vw,56px)] font-semibold leading-none tabular-nums tracking-tight text-neutral-900">
 {bigValue.toLocaleString('fr-FR')} €
 </span>
 {proven ? (
 l!.absoluteLiftEUR > 0 && (
 <span className="pb-1.5 text-sm font-medium text-emerald-600">+{l!.absoluteLiftEUR.toFixed(2)} € par visiteur exposé</span>
 )
 ) : (
 <span className={`pb-1.5 text-sm font-medium ${summary.revenue.deltaPct >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
 {summary.revenue.deltaPct > 0 ? '+' : ''}{summary.revenue.deltaPct}% vs 30 j
 </span>
 )}
 </div>

 <p className="mt-3 max-w-[72ch] text-sm leading-relaxed text-neutral-500">
 {proven
 ? 'Les visiteurs qui ont vu Shimmer ont dépensé plus que le groupe témoin qu\'on a mis de côté. Ces euros, vous ne les auriez pas eus.'
 : `On a besoin d'un peu plus de trafic pour prouver l'effet à 95 % (${confidencePct} % aujourd'hui). En attendant, vous payez uniquement le forfait.`}
 </p>

 {b && (
 <>
 <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-1 border-t border-neutral-100 pt-4">
 <div className="text-sm">
 <span className="text-neutral-500">Facture ce mois</span>{' '}
 <span className="ml-0.5 font-semibold tabular-nums text-neutral-900">{b.monthlyTotalEUR} €</span>
 </div>
 <div className="text-sm text-neutral-400">
 {b.variableActive
 ? `${b.floorEUR} € forfait + ${b.variableFeeEUR} € sur les ventes prouvées`
 : `${b.floorEUR} € forfait · pas de variable tant que non prouvé`}
 </div>
 </div>
 {l && (
 <details className="mt-3 text-sm">
 <summary className="cursor-pointer list-none text-neutral-400 hover:text-neutral-700">Comment on calcule ?</summary>
 <div className="mt-3 rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-xs leading-relaxed text-neutral-500">
 On cache Shimmer à 10 % des visiteurs (groupe témoin). On compare leur dépense moyenne aux 90 % qui voient le vendeur. La différence × visiteurs exposés = les ventes apportées.
 <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-neutral-400">
 <span>Exposés : {l.treatmentVisitors.toLocaleString('fr-FR')}</span>
 <span>Témoins : {l.controlVisitors.toLocaleString('fr-FR')}</span>
 <span>Certitude : {confidencePct} %</span>
 </div>
 </div>
 </details>
 )}
 </>
 )}
 </Card>
 );
}

function ToDoPanel({ s }: { s: Summary }) {
 const items = [
 { count: s.sav.open, label: 'tickets SAV à traiter', to: 'sav' },
 { count: s.reviews.lowRatings, label: 'avis négatifs à régler', to: 'reviews' },
 { count: Math.max(0, s.carts.total30d - s.carts.recovered), label: 'paniers en relance auto', to: 'carts' },
 ].filter((i) => i.count > 0);

 return (
 <Card className="flex h-full flex-col p-5">
 <div className="text-sm font-medium text-neutral-700">À traiter</div>
 {items.length === 0 ? (
 <div className="mt-4 flex flex-1 items-center gap-2 text-sm text-neutral-500">
 <span className="h-2 w-2 rounded-full bg-emerald-500" />
 Tout est à jour.
 </div>
 ) : (
 <div className="mt-2 flex flex-col divide-y divide-neutral-100">
 {items.map((i) => (
 <button
 key={i.to}
 onClick={() => window.dispatchEvent(new CustomEvent('shimmer:goto', { detail: i.to }))}
 className="group flex items-center gap-3 py-3 text-left first:pt-1"
 >
 <span className="text-xl font-semibold tabular-nums text-neutral-900">{i.count}</span>
 <span className="flex-1 text-sm text-neutral-600">{i.label}</span>
 <span className="text-neutral-400 transition group-hover:translate-x-0.5 group-hover:text-emerald-600">→</span>
 </button>
 ))}
 </div>
 )}
 </Card>
 );
}

function ModulesStrip({ s }: { s: Summary }) {
 const mods = [
 { name: 'Vendeur', active: s.crossSell.impressions30d > 0 },
 { name: 'Relances paniers', active: s.carts.total30d > 0 },
 { name: 'SAV', active: s.sav.total30d > 0 },
 { name: 'Avis', active: s.reviews.total30d > 0 },
 { name: 'Campagnes', active: s.outbound.total30d > 0 },
 ];
 return (
 <Card className="flex flex-wrap items-center gap-x-6 gap-y-3 px-5 py-4">
 <span className="text-sm font-medium text-neutral-700">Vos automatisations</span>
 {mods.map((m) => (
 <span key={m.name} className="inline-flex items-center gap-2 text-sm">
 <span className={`h-1.5 w-1.5 rounded-full ${m.active ? 'bg-emerald-500' : 'bg-neutral-300'}`} />
 <span className={m.active ? 'text-neutral-700' : 'text-neutral-400'}>{m.name}</span>
 </span>
 ))}
 </Card>
 );
}

// ─────────────────────────────────────────────────────────────
// Primitives partagées (clair) — réutilisées par toutes les sections
// ─────────────────────────────────────────────────────────────

export function Card({ className = '', children }: { className?: string; children: React.ReactNode }) {
 return (
 <div className={`rounded-xl border border-black/[0.07] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] ${className}`}>
 {children}
 </div>
 );
}

export function SectionHeader({ eyebrow, title, accent, badge }: { eyebrow: string; title: string; accent?: string; badge?: React.ReactNode }) {
 return (
 <div className="flex flex-wrap items-start justify-between gap-3">
 <div>
 <div className="text-xs font-medium tracking-wide text-emerald-600">{eyebrow}</div>
 <h2 className="mt-1 text-xl font-semibold tracking-tight text-neutral-900">
 {title}{accent ? <> <span className="text-emerald-600">{accent}</span></> : null}
 </h2>
 </div>
 {badge}
 </div>
 );
}

/**
 * Provenance d'une donnée. Vert = natif Shopify (tombe des webhooks dès qu'on
 * branche la boutique). Ambre = nécessite un widget Shimmer ou un canal en plus.
 */
export function SourceBadge({ label, native = false }: { label: string; native?: boolean }) {
 return (
 <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-xs text-neutral-500">
 <span className={`h-1.5 w-1.5 rounded-full ${native ? 'bg-emerald-500' : 'bg-amber-400'}`} />
 {label}
 </span>
 );
}

/** Version compacte (juste la pastille + tooltip) pour les tuiles KPI. */
export function SourceDot({ native = false, title }: { native?: boolean; title: string }) {
 return (
 <span
 title={title}
 aria-label={title}
 className={`mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full ${native ? 'bg-emerald-500' : 'bg-amber-400'}`}
 />
 );
}

export function Stat({
 label, value, sub, delta, deltaPct, accent, invertDelta, source,
}: {
 label: string; value: string; sub?: string | null; delta?: string | null; deltaPct?: number; accent?: boolean; invertDelta?: boolean; source?: React.ReactNode;
}) {
 const hasDelta = typeof deltaPct === 'number';
 const positive = hasDelta && (deltaPct as number) > 0;
 const negative = hasDelta && (deltaPct as number) < 0;
 const good = (positive && !invertDelta) || (negative && invertDelta);
 const bad = (negative && !invertDelta) || (positive && invertDelta);
 return (
 <div className="rounded-xl border border-black/[0.07] bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
 <div className="flex items-start justify-between gap-2">
 <div className="text-xs font-medium text-neutral-500">{label}</div>
 {source}
 </div>
 <div className={`mt-1.5 text-2xl font-semibold tabular-nums ${accent ? 'text-emerald-600' : 'text-neutral-900'}`}>{value}</div>
 {sub && <div className="mt-1 text-xs text-neutral-400">{sub}</div>}
 {!sub && delta && <div className="mt-1 text-xs text-neutral-400">{delta}</div>}
 {hasDelta && (
 <div className={`mt-2 inline-flex items-center gap-1 text-xs font-medium ${good ? 'text-emerald-600' : bad ? 'text-red-500' : 'text-neutral-400'}`}>
 <span>{positive ? '↑' : negative ? '↓' : '·'}</span>
 <span>{positive ? '+' : ''}{deltaPct}%</span>
 <span className="font-normal text-neutral-400">vs 30 j</span>
 </div>
 )}
 </div>
 );
}

export function BigStat({ label, value, delta, accent, sub }: { label: string; value: string; delta?: string; accent?: boolean; sub?: string }) {
 return (
 <div className="rounded-xl border border-black/[0.07] bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
 <div className="text-xs font-medium text-neutral-500">{label}</div>
 <div className={`mt-2 text-3xl font-semibold tabular-nums tracking-tight ${accent ? 'text-emerald-600' : 'text-neutral-900'}`}>{value}</div>
 {delta && (
 <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">{delta}</div>
 )}
 {sub && <div className="mt-2 text-xs text-neutral-400">{sub}</div>}
 </div>
 );
}

export function Mini({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
 return (
 <div className="rounded-lg bg-neutral-50 p-3">
 <div className="text-xs font-medium text-neutral-500">{label}</div>
 <div className={`mt-0.5 text-lg font-semibold tabular-nums ${accent ? 'text-emerald-600' : 'text-neutral-900'}`}>{value}</div>
 </div>
 );
}

export function Panel({ title, badge, children }: { title: string; badge?: React.ReactNode; children: React.ReactNode }) {
 return (
 <div className="rounded-xl border border-black/[0.07] bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
 <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
 <div className="text-sm font-medium text-neutral-700">{title}</div>
 {badge}
 </div>
 {children}
 </div>
 );
}

export function RowList({ rows }: { rows: Array<[string, number]> }) {
 if (rows.length === 0) return <div className="text-sm text-neutral-400">aucune donnée</div>;
 const max = Math.max(...rows.map(r => r[1]));
 return (
 <ul className="space-y-2">
 {rows.map(([k, n]) => (
 <li key={k} className="grid grid-cols-[1fr_auto] items-center gap-3">
 <div className="relative h-6 overflow-hidden rounded bg-neutral-100">
 <div className="absolute inset-y-0 left-0 rounded bg-emerald-500/25" style={{ width: max ? `${(n / max) * 100}%` : 0 }} />
 <div className="absolute inset-y-0 left-2 flex items-center text-xs text-neutral-700">{k}</div>
 </div>
 <span className="text-sm font-semibold tabular-nums text-neutral-900">{n}</span>
 </li>
 ))}
 </ul>
 );
}

export function RevenueChart({ values }: { values: number[] }) {
 const max = Math.max(...values, 1);
 const total = values.reduce((a, b) => a + b, 0);
 return (
 <div className="rounded-xl border border-black/[0.07] bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
 <div className="flex items-baseline justify-between">
 <div className="text-sm font-medium text-neutral-700">Revenu quotidien · 14 jours</div>
 <div className="text-lg font-semibold tabular-nums text-neutral-900">{total.toLocaleString('fr-FR')} €</div>
 </div>
 <div className="mt-5 flex h-28 items-end gap-1.5">
 {values.map((v, i) => (
 <div key={i} className="flex-1 rounded-t bg-emerald-500/80" style={{ height: `${(v / max) * 100}%`, minHeight: '2px' }} title={`${v} €`} />
 ))}
 </div>
 <div className="mt-2 flex justify-between text-xs text-neutral-400">
 <span>il y a 14 j</span>
 <span>aujourd&apos;hui</span>
 </div>
 </div>
 );
}

/** Alias conservé pour les sections qui importent encore Sparkline. */
export function Sparkline({ title, values, unit }: { title: string; values: number[]; unit?: string }) {
 const max = Math.max(...values, 1);
 const total = values.reduce((a, b) => a + b, 0);
 return (
 <div className="rounded-xl border border-black/[0.07] bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
 <div className="flex items-baseline justify-between">
 <div className="text-sm font-medium text-neutral-700">{title}</div>
 <div className="text-lg font-semibold tabular-nums text-neutral-900">{total.toLocaleString('fr-FR')}{unit ?? ''}</div>
 </div>
 <div className="mt-5 flex h-24 items-end gap-1">
 {values.map((v, i) => (
 <div key={i} className="flex-1 rounded-t bg-emerald-500/80" style={{ height: `${(v / max) * 100}%`, minHeight: '2px' }} title={`${v}${unit ?? ''}`} />
 ))}
 </div>
 </div>
 );
}

export function Loading() {
 return (
 <div className="flex h-64 items-center justify-center">
 <div className="flex flex-col items-center gap-3">
 <div className="h-7 w-7 animate-spin rounded-full border-2 border-neutral-200 border-t-emerald-500" />
 <div className="text-sm text-neutral-400">chargement…</div>
 </div>
 </div>
 );
}

export function ErrorBlock({ message }: { message: string }) {
 return (
 <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
 {message}
 </div>
 );
}
