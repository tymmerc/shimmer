'use client';

import { useEffect, useState } from 'react';
import { SectionHeader, SourceBadge, Stat, BigStat, Loading, ErrorBlock, Panel } from './AdminOverview';

interface Lift {
 controlVisitors: number;
 treatmentVisitors: number;
 controlMeanEUR: number;
 treatmentMeanEUR: number;
 absoluteLiftEUR: number;
 absoluteLiftCI: [number, number];
 relativeLiftPct: number;
 relativeLiftCI: [number, number];
 pUpliftAboveThreshold: number;
 effectThresholdPct: number;
 incrementalRevenueEUR: number;
 significant: boolean;
}

interface ProofData {
 period: { from: string | null; to: string | null };
 holdout: { enabled: boolean; pct: number; effectThresholdPct: number };
 modules: {
 vendeur: { enrolledControl: number; enrolledTreated: number; lift: Lift };
 relances: {
 controlCarts: number; treatedCarts: number;
 controlRecovered: number; treatedRecovered: number;
 controlRecoveryRatePct: number; treatedRecoveryRatePct: number;
 recoveredAfterReminder: number; recoveredAfterReminderEUR: number;
 lift: Lift;
 };
 sav: { tickets: number; resolus: number; tauxResolutionPct: number };
 avis: { collectes: number; negatifsInterceptes: number };
 retourStock?: { waiting: number; notified: number; converted: number; conversionRatePct: number; convertedEUR: number };
 };
 billing: {
 floorEUR: number; ratePct: number; capEUR: number | null;
 provenIncrementalEUR: number; variableFeeEUR: number; monthlyTotalEUR: number;
 modulesProven: string[];
 };
}

/** Honest state chip: proven / accumulating, never a vague "estimated". */
function ProofState({ lift }: { lift: Lift }) {
 if (lift.significant) {
 return (
 <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs text-emerald-600">
 Effet prouvé · P {Math.round(lift.pUpliftAboveThreshold * 100)}%
 </span>
 );
 }
 return (
 <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs text-neutral-500">
 Mesure en cours · P {Math.round(lift.pUpliftAboveThreshold * 100)}%
 </span>
 );
}

export function AdminPreuve() {
 const [p, setP] = useState<ProofData | null>(null);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);

 useEffect(() => {
 (async () => {
 try {
 const key = window.localStorage.getItem('shimmer.admin.key') ?? '';
 const res = await fetch('/shimmer/api/holdout/proof', { headers: { Authorization: `Bearer ${key}` } });
 if (!res.ok) throw new Error(`HTTP ${res.status}`);
 setP((await res.json()) as ProofData);
 } catch (e) { setError((e as Error).message); }
 finally { setLoading(false); }
 })();
 }, []);

 if (loading) return <Loading />;
 if (error) return <ErrorBlock message={error} />;
 if (!p) return null;

 const { vendeur, relances, sav, avis, retourStock } = p.modules;

 return (
 <div className="space-y-10">
 <SectionHeader eyebrow="Preuve · module par module" title="Ce que Shimmer rapporte" />

 {/* ── Relances paniers : la preuve la plus rapide ─────────────── */}
 <Panel title="Relances paniers · preuve par panier" badge={<SourceBadge label="Natif Shopify" native />}>
 <div className="mb-4 flex items-center justify-between">
 <p className="text-sm text-neutral-600">
 Sur 100 paniers abandonnés, {p.holdout.pct} ne sont jamais relancés. L&apos;écart de retour entre les deux groupes est l&apos;effet réel des relances.
 </p>
 <ProofState lift={relances.lift} />
 </div>
 <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
 <Stat label="Paniers relancés" value={`${relances.treatedCarts}`} sub={`${relances.treatedRecovered} revenus · ${relances.treatedRecoveryRatePct}%`} accent />
 <Stat label="Paniers témoins" value={`${relances.controlCarts}`} sub={`${relances.controlRecovered} revenus · ${relances.controlRecoveryRatePct}%`} />
 <Stat label="Récupérés après relance" value={`${relances.recoveredAfterReminder}`} sub="commande arrivée après l'email" />
 <Stat label="Euros récupérés" value={`${relances.recoveredAfterReminderEUR.toLocaleString('fr-FR')} €`} sub="paniers revenus après relance" accent />
 </div>
 {relances.lift.significant && (
 <p className="mt-4 text-sm text-neutral-600">
 Effet causal prouvé : <span className="text-emerald-600">{relances.lift.incrementalRevenueEUR.toLocaleString('fr-FR')} €</span> de CA
 additionnel attribuable aux relances (IC 95% : {relances.lift.absoluteLiftCI[0]} à {relances.lift.absoluteLiftCI[1]} € par panier).
 </p>
 )}
 </Panel>

 {/* ── Vendeur : lift sur les visiteurs qui cherchent ──────────── */}
 <Panel title="Vendeur · visiteurs qui utilisent la recherche" badge={<SourceBadge label="Widget vendeur" />}>
 <div className="mb-4 flex items-center justify-between">
 <p className="text-sm text-neutral-600">
 On ne compare que les visiteurs qui ont cherché : ceux chez qui le vendeur a une chance d&apos;agir.
 Les témoins gardent la recherche classique.
 </p>
 <ProofState lift={vendeur.lift} />
 </div>
 <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
 <Stat label="Chercheurs avec vendeur" value={`${vendeur.enrolledTreated}`} sub={`${vendeur.lift.treatmentMeanEUR} € dépensés / visiteur`} accent />
 <Stat label="Chercheurs témoins" value={`${vendeur.enrolledControl}`} sub={`${vendeur.lift.controlMeanEUR} € dépensés / visiteur`} />
 <Stat label="Écart mesuré" value={`${vendeur.lift.absoluteLiftEUR > 0 ? '+' : ''}${vendeur.lift.absoluteLiftEUR} €`} sub="par visiteur chercheur" />
 <Stat label="CA additionnel" value={`${vendeur.lift.incrementalRevenueEUR.toLocaleString('fr-FR')} €`} sub={vendeur.lift.significant ? 'prouvé à 95%' : 'en cours de mesure'} accent={vendeur.lift.significant} />
 </div>
 </Panel>

 {/* ── Compteurs directs : comptables un par un, dès la semaine 1 ─ */}
 <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
 <Panel title="SAV · compté ticket par ticket" badge={<SourceBadge label="Widget SAV" />}>
 <div className="grid grid-cols-2 gap-3">
 <Stat label="Tickets ouverts" value={`${sav.tickets}`} sub="pris en main par Shimmer" />
 <Stat label="Résolus" value={`${sav.resolus}`} sub={`${sav.tauxResolutionPct}% de résolution`} accent />
 </div>
 </Panel>
 <Panel title="Avis · compté avis par avis" badge={<SourceBadge label="Widget avis" />}>
 <div className="grid grid-cols-2 gap-3">
 <Stat label="Avis collectés" value={`${avis.collectes}`} sub="demandes post-livraison" accent />
 <Stat label="Négatifs interceptés" value={`${avis.negatifsInterceptes}`} sub="traités en SAV avant publication" />
 </div>
 </Panel>
 </div>

 {retourStock && (
 <Panel title="Retour de stock · compté commande par commande" badge={<SourceBadge label="Widget vendeur" />}>
 <div className="mb-4 flex items-center justify-between gap-3">
 <p className="text-sm text-neutral-600">
 Un client demande un produit épuisé, on le prévient au retour, il commande : la vente est comptée ici. Le client a demandé lui-même à être rappelé, il ne serait pas revenu tout seul.
 </p>
 </div>
 <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
 <Stat label="En attente" value={`${retourStock.waiting}`} sub="clients à prévenir" />
 <Stat label="Prévenus" value={`${retourStock.notified}`} sub="email envoyé au retour" />
 <Stat label="Ont commandé" value={`${retourStock.converted}`} sub={`${retourStock.conversionRatePct}% des prévenus`} accent={retourStock.converted > 0} />
 <Stat label="Ventes récupérées" value={`${retourStock.convertedEUR.toLocaleString('fr-FR')} €`} sub="entre dans le CA prouvé" accent={retourStock.convertedEUR > 0} />
 </div>
 </Panel>
 )}

 {/* ── Facturation ─────────────────────────────────────────────── */}
 <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
 <BigStat
 label="CA additionnel prouvé"
 value={`${p.billing.provenIncrementalEUR.toLocaleString('fr-FR')} €`}
 delta={p.billing.modulesProven.length ? `modules : ${p.billing.modulesProven.join(' + ')}` : 'aucun module encore significatif'}
 accent
 sub="seul l'écart prouvé entre traités et témoins compte"
 />
 <BigStat
 label="Part variable"
 value={`${p.billing.variableFeeEUR.toLocaleString('fr-FR')} €`}
 delta={`${p.billing.ratePct}% du prouvé${p.billing.capEUR === null ? ' · sans plafond' : ` · plafond ${p.billing.capEUR}€`}`}
 sub="0 € tant que rien n'est prouvé"
 />
 <BigStat
 label="Total mensuel"
 value={`${p.billing.monthlyTotalEUR.toLocaleString('fr-FR')} €`}
 delta={`plancher ${p.billing.floorEUR}€`}
 sub="abonnement + part variable prouvée"
 />
 </div>

 <details className="text-xs text-neutral-400">
 <summary className="cursor-pointer select-none text-neutral-500 hover:text-neutral-700">Comment on mesure ?</summary>
 <p className="mt-2 max-w-2xl leading-relaxed">
 {p.holdout.pct}% des visiteurs (et des paniers) ne voient jamais Shimmer. On compare ce groupe témoin au reste, et seul l&apos;écart prouvé entre les deux est facturé au résultat.
 </p>
 </details>
 </div>
 );
}
