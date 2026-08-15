'use client';

import { useEffect, useState } from 'react';
import { SectionHeader, Loading, ErrorBlock, Panel } from './AdminOverview';

type Phase = 'ingesting' | 'observing' | 'validating' | 'live';

interface OnboardingStatus {
 phase: Phase;
 phases: Phase[];
 gates: { ingestingComplete: boolean; observingHasSignal: boolean; validatingDone: boolean };
 counts: { knowledgeChunks: number; observedQueries: number; previews: Record<string, number> };
}

interface KnowledgeSummary {
 counts: { source: string; count: number }[];
 samples: { sourceType: string; text: string; productId: number | null }[];
}

interface ObservationReport {
 sample: number;
 windowStart?: string;
 windowEnd?: string;
 analysis?: {
 topIntents?: { label: string; count: number; examples: string[] }[];
 vocabularyDiscovered?: string[];
 catalogueGaps?: string[];
 verdict?: string;
 };
 ready?: boolean;
 message?: string;
}

interface Preview {
 id: number;
 sourceQuery: string;
 draftResponse: string;
 status: string;
 recommendedIds: number[];
 merchantNote: string | null;
 correctedText: string | null;
}

const PHASE_META: Record<Phase, { num: string; label: string; subtitle: string }> = {
 ingesting: { num: '01', label: 'Ingestion', subtitle: 'On lit ton business' },
 observing: { num: '02', label: 'Observation', subtitle: 'On regarde tes vrais clients' },
 validating: { num: '03', label: 'Validation', subtitle: 'Tu valides chaque réponse-type' },
 live: { num: '04', label: 'En ligne', subtitle: 'Le vendeur travaille, le holdout prouve' },
};

function bearer(): string {
 return typeof window === 'undefined' ? '' : window.localStorage.getItem('shimmer.admin.key') ?? '';
}

export function AdminOnboarding() {
 const [status, setStatus] = useState<OnboardingStatus | null>(null);
 const [error, setError] = useState<string | null>(null);
 const [knowledge, setKnowledge] = useState<KnowledgeSummary | null>(null);
 const [report, setReport] = useState<ObservationReport | null>(null);
 const [reportLoading, setReportLoading] = useState(false);
 const [previews, setPreviews] = useState<Preview[]>([]);
 const [advancing, setAdvancing] = useState(false);
 const [generating, setGenerating] = useState(false);

 useEffect(() => {
 void refresh();
 }, []);

 async function refresh(): Promise<void> {
 try {
 const headers = { Authorization: `Bearer ${bearer()}` };
 const [s, k, p] = await Promise.all([
 fetch('/shimmer/api/onboarding/status', { headers }).then(r => r.json()),
 fetch('/shimmer/api/knowledge/summary', { headers }).then(r => r.json()),
 fetch('/shimmer/api/preview', { headers }).then(r => r.json()),
 ]);
 setStatus(s);
 setKnowledge(k);
 setPreviews(p.previews ?? []);
 setError(null);
 } catch (e) {
 setError((e as Error).message);
 }
 }

 async function loadReport(): Promise<void> {
 setReportLoading(true);
 try {
 const r = await fetch('/shimmer/api/observation/report', { headers: { Authorization: `Bearer ${bearer()}` } });
 setReport(await r.json());
 } catch (e) {
 setError((e as Error).message);
 } finally {
 setReportLoading(false);
 }
 }

 async function advance(): Promise<void> {
 setAdvancing(true);
 try {
 const r = await fetch('/shimmer/api/onboarding/advance', {
 method: 'POST',
 headers: { Authorization: `Bearer ${bearer()}`, 'Content-Type': 'application/json' },
 body: '{}',
 });
 const data = await r.json();
 if (!r.ok) throw new Error(data.error ?? `HTTP ${r.status}`);
 await refresh();
 } catch (e) {
 setError((e as Error).message);
 } finally {
 setAdvancing(false);
 }
 }

 async function generatePreviews(): Promise<void> {
 setGenerating(true);
 try {
 const r = await fetch('/shimmer/api/preview/generate', {
 method: 'POST',
 headers: { Authorization: `Bearer ${bearer()}`, 'Content-Type': 'application/json' },
 body: JSON.stringify({ count: 6 }),
 });
 if (!r.ok) throw new Error(`HTTP ${r.status}`);
 await refresh();
 } catch (e) {
 setError((e as Error).message);
 } finally {
 setGenerating(false);
 }
 }

 async function decide(id: number, decision: 'approved' | 'rejected'): Promise<void> {
 try {
 await fetch(`/shimmer/api/preview/${id}/decide`, {
 method: 'POST',
 headers: { Authorization: `Bearer ${bearer()}`, 'Content-Type': 'application/json' },
 body: JSON.stringify({ decision }),
 });
 await refresh();
 } catch (e) {
 setError((e as Error).message);
 }
 }

 if (!status) return error ? <ErrorBlock message={error} /> : <Loading />;

 const phaseIndex = status.phases.indexOf(status.phase);
 const objections = (knowledge?.samples ?? []).filter(s => s.sourceType === 'sav_objection');
 const reviewSamples = (knowledge?.samples ?? []).filter(s => s.sourceType === 'review').slice(0, 3);
 const pending = previews.filter(p => p.status === 'pending');
 const approved = previews.filter(p => p.status === 'approved').length;
 const rejected = previews.filter(p => p.status === 'rejected').length;

 return (
 <div>
 <SectionHeader eyebrow="Parcours" title="Le déploiement, " accent="étape par étape" />
 {error && <div className="mt-4"><ErrorBlock message={error} /></div>}

 <p className="mt-4 max-w-[60ch] text-sm leading-relaxed text-paper/65">
 Shimmer ne s'allume pas le premier jour. On lit votre business, on observe vos vrais clients,
 vous validez ce que je dirais avant que je parle, et seulement après le holdout démarre.
 </p>

 {/* Timeline */}
 <div className="mt-8 grid grid-cols-1 gap-2 md:grid-cols-4">
 {status.phases.map((p, i) => {
 const isCurrent = p === status.phase;
 const isDone = i < phaseIndex;
 const m = PHASE_META[p];
 return (
 <div
 key={p}
 className={`rounded-xl border p-4 ${
 isCurrent ? 'border-acid bg-acid/5' : isDone ? 'border-paper/15 bg-paper/[0.02]' : 'border-paper/10 bg-paper/[0.01] opacity-60'
 }`}
 >
 <div className={`text-xs ${isCurrent ? 'text-acid' : 'text-paper/45'}`}>
 {m.num} {isCurrent ? '· en cours' : isDone ? '· fait' : ''}
 </div>
 <div className={`mt-2 font-display text-xl tracking-editorial ${isCurrent ? 'text-acid' : 'text-paper'}`}>
 {m.label}
 </div>
 <div className="mt-1 text-xs text-paper/45">{m.subtitle}</div>
 </div>
 );
 })}
 </div>

 {/* Phase 1 — Ingestion */}
 <div className="mt-8 space-y-6">
 <Panel title="Phase 01 · Ce que j'ai lu chez vous">
 <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
 <MiniBox label="Chunks ingérés" value={String(status.counts.knowledgeChunks)} />
 <MiniBox label="Avis indexés" value={String(knowledge?.counts.find(c => c.source === 'review')?.count ?? 0)} />
 <MiniBox label="Objections SAV" value={String(knowledge?.counts.find(c => c.source === 'sav_objection')?.count ?? 0)} />
 <MiniBox label="Queries vues" value={String(status.counts.observedQueries)} />
 </div>
 {objections.length > 0 && (
 <div className="mt-5">
 <div className="text-xs text-paper/45">Objections récurrentes (anonymisées)</div>
 <ul className="mt-2 space-y-1.5">
 {objections.slice(0, 6).map((o, i) => (
 <li key={i} className="text-sm text-paper/85">· {o.text}</li>
 ))}
 </ul>
 </div>
 )}
 {reviewSamples.length > 0 && (
 <div className="mt-5">
 <div className="text-xs text-paper/45">Échantillon d'avis ingérés (PII scrubbés)</div>
 <ul className="mt-2 space-y-2">
 {reviewSamples.map((r, i) => (
 <li key={i} className="rounded-lg border border-paper/10 bg-paper/[0.02] px-3 py-2 text-xs italic text-paper/70">
 « {r.text.slice(0, 180)}{r.text.length > 180 ? '…' : ''} »
 </li>
 ))}
 </ul>
 </div>
 )}
 </Panel>

 {/* Phase 2 — Observation report */}
 <Panel title="Phase 02 · Ce que vos clients cherchent vraiment">
 {!report ? (
 <button
 onClick={() => void loadReport()}
 disabled={reportLoading || status.counts.observedQueries < 5}
 className="rounded-full bg-acid px-5 py-2.5 text-xs text-ink transition hover:bg-acid-deep disabled:opacity-40"
 >
 {reportLoading ? 'Analyse en cours (LLM)…' : `Générer le rapport (${status.counts.observedQueries} queries)`}
 </button>
 ) : report.message ? (
 <div className="text-sm text-paper/65">{report.message}</div>
 ) : (
 <div className="space-y-5">
 {report.analysis?.verdict && (
 <div className="rounded-xl border border-acid/40 bg-acid/[0.08] px-4 py-3 text-sm text-paper">
 <span className="text-xs text-acid">Verdict</span>
 <div className="mt-1">{report.analysis.verdict}</div>
 </div>
 )}
 {report.analysis?.topIntents && (
 <div>
 <div className="text-xs text-paper/45">Intents principaux</div>
 <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
 {report.analysis.topIntents.map((it, i) => (
 <div key={i} className="rounded-lg border border-paper/10 bg-paper/[0.02] px-3 py-2">
 <div className="flex items-baseline justify-between">
 <div className="text-sm text-paper">{it.label}</div>
 <div className="text-xs text-acid">{it.count}</div>
 </div>
 <div className="mt-1 text-xs text-paper/55">{(it.examples ?? []).slice(0, 3).join(' · ')}</div>
 </div>
 ))}
 </div>
 </div>
 )}
 <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
 {report.analysis?.vocabularyDiscovered && (
 <div>
 <div className="text-xs text-paper/45">Vocabulaire découvert</div>
 <div className="mt-2 flex flex-wrap gap-2">
 {report.analysis.vocabularyDiscovered.map((v, i) => (
 <span key={i} className="rounded-full border border-paper/15 bg-paper/[0.02] px-3 py-1 text-xs text-paper/80">{v}</span>
 ))}
 </div>
 </div>
 )}
 {report.analysis?.catalogueGaps && (
 <div>
 <div className="text-xs text-paper/45">Manques catalogue</div>
 <ul className="mt-2 space-y-1 text-sm text-paper/80">
 {report.analysis.catalogueGaps.map((g, i) => <li key={i}>· {g}</li>)}
 </ul>
 </div>
 )}
 </div>
 </div>
 )}
 </Panel>

 {/* Phase 3 — Preview validation */}
 <Panel title="Phase 03 · Validez chaque réponse avant que je parle">
 <div className="mb-4 flex items-center gap-3">
 <button
 onClick={() => void generatePreviews()}
 disabled={generating || status.counts.observedQueries < 5}
 className="rounded-full border border-paper/20 px-4 py-2 text-xs text-paper transition hover:border-acid hover:text-acid disabled:opacity-40"
 >
 {generating ? 'Génération… (~1 min / preview)' : 'Générer 6 previews'}
 </button>
 <div className="text-xs text-paper/55">
 {approved} approuvés · {rejected} rejetés · {pending.length} en attente
 </div>
 </div>
 {pending.length === 0 ? (
 <div className="rounded-xl border border-paper/10 bg-paper/[0.02] px-4 py-6 text-center text-sm text-paper/60">
 Rien à valider. Générez des previews pour commencer.
 </div>
 ) : (
 <div className="space-y-3">
 {pending.map(p => (
 <div key={p.id} className="rounded-xl border border-paper/10 bg-paper/[0.02] p-4">
 <div className="text-xs text-paper/45">Requête client</div>
 <div className="mt-1 text-sm text-paper">« {p.sourceQuery} »</div>
 <div className="mt-3 text-xs text-acid">Réponse proposée</div>
 <div className="mt-1 whitespace-pre-wrap text-sm text-paper/85">{p.draftResponse}</div>
 <div className="mt-4 flex gap-2">
 <button
 onClick={() => void decide(p.id, 'approved')}
 className="rounded-full border border-acid bg-acid/15 px-4 py-1.5 text-xs text-acid"
 >
 Approuver
 </button>
 <button
 onClick={() => void decide(p.id, 'rejected')}
 className="rounded-full border border-rose-400/40 px-4 py-1.5 text-xs text-rose-300"
 >
 Rejeter
 </button>
 </div>
 </div>
 ))}
 </div>
 )}
 </Panel>

 {/* Advance control */}
 <Panel title="Passer à la phase suivante">
 <div className="text-sm text-paper/75">
 Phase actuelle : <span className="font-display text-acid">{PHASE_META[status.phase].label}</span>
 </div>
 <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-paper/65 md:grid-cols-3">
 <GateLine label="Phase 1 finie" ok={status.gates.ingestingComplete} />
 <GateLine label="Phase 2 a du signal (≥20)" ok={status.gates.observingHasSignal} />
 <GateLine label="Phase 3 validée (≥10 / ≥80%)" ok={status.gates.validatingDone} />
 </div>
 <button
 onClick={() => void advance()}
 disabled={advancing || status.phase === 'live'}
 className="mt-5 rounded-full bg-acid px-6 py-3 text-xs text-ink transition hover:bg-acid-deep disabled:opacity-40"
 >
 {advancing ? 'Avance…' : status.phase === 'live' ? 'Déjà en ligne' : 'Avancer à la phase suivante'}
 </button>
 </Panel>
 </div>
 </div>
 );
}

function MiniBox({ label, value }: { label: string; value: string }) {
 return (
 <div className="rounded-lg border border-paper/10 bg-paper/[0.02] p-3">
 <div className="text-xs text-paper/45">{label}</div>
 <div className="mt-1 font-display text-2xl text-paper">{value}</div>
 </div>
 );
}

function GateLine({ label, ok }: { label: string; ok: boolean }) {
 return (
 <div className="flex items-center gap-2">
 <span className={`inline-block h-2 w-2 rounded-full ${ok ? 'bg-acid shadow-[0_0_8px_rgba(212,255,58,0.7)]' : 'bg-amber-400/70'}`} />
 <span className={ok ? 'text-paper' : 'text-paper/55'}>{label}</span>
 </div>
 );
}
