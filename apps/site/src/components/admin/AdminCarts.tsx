'use client';

import { humanize } from './labels';
import { useEffect, useState } from 'react';
import { api, type AbandonedCart } from './api';
import { SectionHeader, SourceBadge, Loading, ErrorBlock, Stat } from './AdminOverview';

const STATUS_TINT: Record<string, string> = {
 pending: 'border-amber-500/40 bg-amber-500/10 text-amber-600',
 reminded_once: 'border-emerald-200 bg-emerald-100 text-emerald-600',
 reminded_twice: 'border-toxic-500/40 bg-emerald-500/10 text-emerald-600',
 recovered: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
 lost: 'border-neutral-200 bg-white text-neutral-400',
};

export function AdminCarts() {
 const [carts, setCarts] = useState<AbandonedCart[]>([]);
 const [stats, setStats] = useState<Awaited<ReturnType<typeof api.carts.stats>> | null>(null);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);
 const [busy, setBusy] = useState<number | null>(null);
 const [reminderPreview, setReminderPreview] = useState<{ id: number; subject: string; body: string; step: number } | null>(null);

 async function load() {
 setLoading(true);
 try {
 const [list, s] = await Promise.all([api.carts.list(), api.carts.stats()]);
 setCarts(list.carts);
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

 async function reminder(id: number) {
 setBusy(id);
 try {
 const r = await api.carts.sendReminder(id);
 setReminderPreview({ id, subject: r.reminder.subject, body: r.reminder.body, step: r.reminder.step });
 await load();
 } catch (e) {
 setError((e as Error).message);
 } finally {
 setBusy(null);
 }
 }
 async function recover(id: number) {
 setBusy(id);
 try {
 await api.carts.recover(id);
 await load();
 } catch (e) {
 setError((e as Error).message);
 } finally {
 setBusy(null);
 }
 }

 if (loading) return <Loading />;
 return (
 <div>
 <SectionHeader eyebrow="Relance panier" title="Paniers" accent="à rattraper" badge={<SourceBadge label="Natif Shopify" native />} />
 {error && <div className="mt-4"><ErrorBlock message={error} /></div>}

 <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
 <Stat label="Total ce mois" value={`${stats?.total ?? 0}`} />
 <Stat label="Récupérés" value={`${stats?.recovered ?? 0}`} accent delta={`${stats?.recoveryRate ?? 0}% de récup'`} />
 <Stat label="Abandonné" value={`${stats?.totalAbandonedEUR ?? 0}€`} />
 <Stat label="Sauvé" value={`${stats?.totalRecoveredEUR ?? 0}€`} accent />
 </div>

 {reminderPreview && (
 <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
 <div className="text-xs text-emerald-600">
 Mail envoyé · panier #{reminderPreview.id} · relance #{reminderPreview.step}
 </div>
 <div className="mt-2 text-lg tracking-editorial text-neutral-900">{reminderPreview.subject}</div>
 <div className="mt-2 text-sm italic text-neutral-700">"{reminderPreview.body}"</div>
 <button onClick={() => setReminderPreview(null)} className="mt-3 text-xs text-neutral-500 hover:text-neutral-900">
 fermer
 </button>
 </div>
 )}

 <div className="mt-6 overflow-hidden rounded-2xl border border-neutral-200 bg-white">
 <div className="border-b border-neutral-200 bg-white px-5 py-3 text-xs text-neutral-500">
 Liste · {carts.length} paniers
 </div>
 <div className="divide-y divide-neutral-100">
 {carts.length === 0 && (
 <div className="px-5 py-12 text-center text-xs text-neutral-500">Aucun panier abandonné pour l'instant.</div>
 )}
 {carts.map(c => {
 const items = c.items as Array<{ name: string; price: number; quantity?: number }>;
 return (
 <div key={c.id} className="grid grid-cols-1 gap-4 px-5 py-4 md:grid-cols-[1fr_auto]">
 <div>
 <div className="flex items-center gap-2">
 <span className="text-xs text-neutral-500">#{c.id}</span>
 <span className={`rounded border px-1.5 py-0.5 text-xs ${STATUS_TINT[c.status] ?? 'border-neutral-200 text-neutral-500'}`}>
 {humanize(c.status)}
 </span>
 <span className="ml-2 text-lg text-neutral-900">{Number(c.totalAmount).toFixed(2)}€</span>
 {c.promoCode && <span className="text-xs text-emerald-600">code {c.promoCode}</span>}
 </div>
 <div className="mt-1 text-xs text-neutral-500">
 {c.customerEmail ?? `Client #${c.customerId ?? '?'}`} · abandonné le {new Date(c.abandonedAt).toLocaleDateString('fr-FR')}
 </div>
 <div className="mt-2 text-sm text-neutral-600">
 {items.map(i => i.name).join(', ')}
 </div>
 <div className="mt-1 text-xs text-neutral-400">
 {c.reminder1At && `relance 1 le ${new Date(c.reminder1At).toLocaleDateString('fr-FR')}`}
 {c.reminder2At && ` · relance 2 le ${new Date(c.reminder2At).toLocaleDateString('fr-FR')}`}
 {c.recoveredAt && ` · récupéré le ${new Date(c.recoveredAt).toLocaleDateString('fr-FR')} (${c.recoveredAmount}€)`}
 </div>
 </div>
 <div className="flex flex-wrap items-center gap-2 self-center">
 {!c.recoveredAt && c.status !== 'reminded_twice' && (
 <button onClick={() => reminder(c.id)} disabled={busy === c.id} className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs text-white transition hover:bg-emerald-700 disabled:opacity-40">
 {busy === c.id ? '...' : c.reminder1At ? 'Relance #2' : 'Relance #1'}
 </button>
 )}
 {!c.recoveredAt && (
 <button onClick={() => recover(c.id)} disabled={busy === c.id} className="rounded-full border border-emerald-500/40 bg-emerald-500/5 px-3 py-1.5 text-xs text-emerald-300 transition hover:bg-emerald-500/10 disabled:opacity-40">
 Marquer récupéré
 </button>
 )}
 </div>
 </div>
 );
 })}
 </div>
 </div>
 </div>
 );
}
