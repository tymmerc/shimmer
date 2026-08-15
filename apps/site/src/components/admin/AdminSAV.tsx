'use client';

import { humanize } from './labels';
import { useEffect, useState } from 'react';
import { api, type SAVTicket } from './api';
import { SectionHeader, SourceBadge, Loading, ErrorBlock, Stat } from './AdminOverview';

const PRIORITY_TINT: Record<string, string> = {
 delivery: 'border-red-500/40 bg-red-500/10 text-red-600',
 product_defect: 'border-amber-500/40 bg-amber-500/10 text-amber-600',
 refund: 'border-red-500/40 bg-red-500/10 text-red-600',
 return: 'border-amber-500/40 bg-amber-500/10 text-amber-600',
 question: 'border-emerald-200 bg-emerald-100 text-emerald-600',
 other: 'border-neutral-200 bg-white text-neutral-500',
};

const STATUS_TINT: Record<string, string> = {
 open: 'border-red-500/40 bg-red-500/10 text-red-600',
 in_progress: 'border-amber-500/40 bg-amber-500/10 text-amber-600',
 awaiting_customer: 'border-neutral-200 bg-white text-neutral-500',
 escalated: 'border-red-500/40 bg-red-500/10 text-red-600',
 resolved: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
 closed: 'border-neutral-200 bg-white text-neutral-400',
};

export function AdminSAV() {
 const [tickets, setTickets] = useState<SAVTicket[]>([]);
 const [byStatus, setByStatus] = useState<Record<string, number>>({});
 const [stats, setStats] = useState<Awaited<ReturnType<typeof api.sav.stats>> | null>(null);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);
 const [selected, setSelected] = useState<SAVTicket | null>(null);

 async function load() {
 setLoading(true);
 try {
 const [list, s] = await Promise.all([api.sav.list(), api.sav.stats()]);
 setTickets(list.tickets);
 setByStatus(list.byStatus);
 setStats(s);
 setError(null);
 } catch (e) {
 setError((e as Error).message);
 } finally {
 setLoading(false);
 }
 }

 useEffect(() => {
 void load();
 }, []);

 async function patchTicket(id: number, body: { status?: string; resolution?: string }) {
 try {
 await api.sav.patch(id, body);
 await load();
 if (selected && selected.id === id) {
 const updated = tickets.find(t => t.id === id);
 if (updated) setSelected({ ...updated, ...body });
 }
 } catch (e) {
 setError((e as Error).message);
 }
 }

 if (loading) return <Loading />;

 return (
 <div>
 <SectionHeader eyebrow="Service après-vente" title="Tickets et" accent="réclamations" badge={<SourceBadge label="Widget SAV" />} />
 {error && <div className="mt-4"><ErrorBlock message={error} /></div>}

 <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
 <Stat label="Tickets ouverts" value={`${stats?.open ?? 0}`} delta={stats?.urgent ? `${stats.urgent} urgent` : null} accent />
 <Stat label="Résolus ce mois" value={`${stats?.resolvedThisMonth ?? 0}`} />
 <Stat label="Temps moyen" value={`${stats?.avgResolutionHours ?? 0}h`} />
 <Stat label="Total créés" value={`${stats?.total ?? 0}`} />
 </div>

 <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_1fr]">
 <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
 <div className="flex items-center justify-between border-b border-neutral-200 bg-white px-5 py-3 text-xs text-neutral-500">
 <span>Liste des tickets · {tickets.length}</span>
 <span className="flex gap-2">
 {Object.entries(byStatus).map(([s, n]) => (
 <span key={s} className={`rounded border px-1.5 py-0.5 text-xs ${STATUS_TINT[s] ?? 'border-neutral-200 text-neutral-500'}`}>
 {humanize(s)} · {n}
 </span>
 ))}
 </span>
 </div>
 <div className="max-h-[600px] overflow-y-auto divide-y divide-neutral-100">
 {tickets.length === 0 && (
 <div className="px-5 py-12 text-center text-xs text-neutral-500">
 Aucun ticket pour l'instant.
 </div>
 )}
 {tickets.map(t => (
 <button
 key={t.id}
 onClick={() => setSelected(t)}
 className={`block w-full px-5 py-4 text-left transition hover:bg-white ${selected?.id === t.id ? 'bg-neutral-100' : ''}`}
 >
 <div className="flex items-center gap-2">
 <span className="text-xs text-neutral-500">{t.requestNumber}</span>
 <span className={`rounded border px-1.5 py-0.5 text-xs ${PRIORITY_TINT[t.type] ?? 'border-neutral-200 text-neutral-500'}`}>{humanize(t.type)}</span>
 <span className={`rounded border px-1.5 py-0.5 text-xs ${STATUS_TINT[t.status] ?? 'border-neutral-200 text-neutral-500'}`}>{humanize(t.status)}</span>
 <span className="ml-auto text-xs text-neutral-400">{new Date(t.createdAt).toLocaleDateString('fr-FR')}</span>
 </div>
 <div className="mt-2 text-sm text-neutral-900 line-clamp-2">{t.description}</div>
 {t.customer && (
 <div className="mt-1 text-xs text-neutral-400">
 {t.customer.firstName} {t.customer.lastName} · {t.customer.email}
 </div>
 )}
 </button>
 ))}
 </div>
 </div>

 {selected && (
 <div className="rounded-2xl border border-neutral-200 bg-white p-5 backdrop-blur-sm md:p-6">
 <div className="flex items-center justify-between">
 <span className="text-xs text-neutral-500">{selected.requestNumber}</span>
 <span className={`rounded border px-1.5 py-0.5 text-xs ${STATUS_TINT[selected.status] ?? 'border-neutral-200 text-neutral-500'}`}>{humanize(selected.status)}</span>
 </div>
 <h3 className="mt-3 text-xl tracking-editorial text-neutral-900">{humanize(selected.type)}</h3>
 <p className="mt-3 text-sm leading-relaxed text-neutral-600">{selected.description}</p>
 {selected.resolution && (
 <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
 <div className="text-xs text-emerald-600">Résolution</div>
 <div className="mt-1 text-sm text-neutral-700">{selected.resolution}</div>
 </div>
 )}
 <div className="mt-5 grid grid-cols-2 gap-2">
 {(['in_progress', 'awaiting_customer', 'escalated', 'resolved'] as const).map(s => (
 <button
 key={s}
 onClick={() => patchTicket(selected.id, { status: s })}
 className={`rounded-full border px-3 py-2 text-xs transition ${
 selected.status === s
 ? 'border-emerald-500 bg-emerald-100 text-neutral-900'
 : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-200'
 }`}
 >
 {s}
 </button>
 ))}
 </div>
 <ResolutionEditor
 onSubmit={(text) => patchTicket(selected.id, { resolution: text, status: 'resolved' })}
 />
 </div>
 )}
 </div>
 </div>
 );
}

function ResolutionEditor({ onSubmit }: { onSubmit: (s: string) => void }) {
 const [text, setText] = useState('');
 return (
 <div className="mt-5">
 <label className="text-xs text-neutral-400">Ajouter une résolution</label>
 <textarea
 value={text}
 onChange={e => setText(e.target.value)}
 rows={3}
 placeholder="Remboursement initié, nouvel article expédié…"
 className="mt-2 w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-900 outline-none placeholder-paper/35 focus:border-emerald-500"
 />
 <button
 onClick={() => {
 if (text.trim()) {
 onSubmit(text);
 setText('');
 }
 }}
 disabled={!text.trim()}
 className="mt-2 rounded-full bg-emerald-600 px-4 py-2 text-xs text-white transition hover:bg-emerald-700 disabled:opacity-40"
 >
 Résoudre
 </button>
 </div>
 );
}
