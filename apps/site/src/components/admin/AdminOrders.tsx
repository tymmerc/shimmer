'use client';

import { useEffect, useState } from 'react';
import { api } from './api';
import { SectionHeader, Loading, ErrorBlock, Stat } from './AdminOverview';

interface OrderSummary {
 id: number;
 orderNumber: string;
 status: string;
 totalAmount: string;
 orderedAt: string;
 deliveredAt: string | null;
 customer?: { firstName: string | null; lastName: string | null; email: string };
}

interface Timeline {
 order: OrderSummary & { shipments: unknown[] };
 events: Array<{ at: string; label: string; status: string; channel?: string; message: string }>;
}

const STATUS_TINT: Record<string, string> = {
 pending: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
 confirmed: 'border-acid/40 bg-acid/10 text-acid',
 prepared: 'border-acid/40 bg-acid/10 text-acid',
 shipped: 'border-toxic-500/40 bg-toxic-500/10 text-toxic-300',
 in_transit: 'border-toxic-500/40 bg-toxic-500/10 text-toxic-300',
 delivered: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
 cancelled: 'border-rose-500/40 bg-rose-500/10 text-rose-300',
 returned: 'border-rose-500/40 bg-rose-500/10 text-rose-300',
};

export function AdminOrders() {
 const [stats, setStats] = useState<{ total: number; byStatus: Record<string, number> } | null>(null);
 const [orders, setOrders] = useState<OrderSummary[]>([]);
 const [selected, setSelected] = useState<Timeline | null>(null);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);
 const [busy, setBusy] = useState(false);

 async function load() {
 setLoading(true);
 try {
 const s = await api.orders.stats();
 setStats(s);
 // Fetch first 20 orders via raw API (no orders list endpoint, we go via Prisma raw query)
 const key = window.localStorage.getItem('shimmer.admin.key') ?? '';
 const res = await fetch('/shimmer/api/orders?limit=20', { headers: { Authorization: `Bearer ${key}` } });
 if (res.ok) {
 const data = (await res.json()) as { orders?: OrderSummary[] };
 setOrders(data.orders ?? []);
 } else {
 // fallback: pas d'endpoint, on liste juste rien
 setOrders([]);
 }
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

 async function pickOrder(id: number) {
 try {
 const t = await api.orders.timeline(id);
 setSelected(t);
 } catch (e) {
 setError((e as Error).message);
 }
 }

 async function changeStatus(status: string, carrier?: string) {
 if (!selected) return;
 setBusy(true);
 try {
 await api.orders.patchStatus(selected.order.id, { status, carrier });
 await pickOrder(selected.order.id);
 await load();
 } catch (e) {
 setError((e as Error).message);
 } finally {
 setBusy(false);
 }
 }

 if (loading) return <Loading />;
 return (
 <div>
 <SectionHeader eyebrow="Commandes" title="Suivi" accent="et notifications client" />
 {error && <div className="mt-4"><ErrorBlock message={error} /></div>}

 <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
 <Stat label="Total" value={`${stats?.total ?? 0}`} />
 <Stat label="En transit" value={`${(stats?.byStatus?.shipped ?? 0) + (stats?.byStatus?.in_transit ?? 0)}`} />
 <Stat label="Livrées" value={`${stats?.byStatus?.delivered ?? 0}`} accent />
 <Stat label="Annulées" value={`${stats?.byStatus?.cancelled ?? 0}`} />
 </div>

 <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.2fr]">
 <div className="overflow-hidden rounded-2xl border border-paper/10 bg-paper/[0.03]">
 <div className="border-b border-paper/10 bg-paper/[0.04] px-5 py-3 text-xs text-paper/55">
 Liste · {orders.length}
 </div>
 <div className="max-h-[600px] divide-y divide-neutral-100 overflow-y-auto">
 {orders.length === 0 && (
 <div className="px-5 py-12 text-center text-xs text-paper/55">
 Pas de commandes (ou endpoint de liste pas branché ici).
 </div>
 )}
 {orders.map(o => (
 <button
 key={o.id}
 onClick={() => pickOrder(o.id)}
 className={`block w-full px-5 py-3 text-left transition hover:bg-paper/[0.04] ${selected?.order.id === o.id ? 'bg-paper/[0.06]' : ''}`}
 >
 <div className="flex items-center gap-2">
 <span className="text-xs text-paper/55">{o.orderNumber}</span>
 <span className={`rounded border px-1.5 py-0.5 text-xs ${STATUS_TINT[o.status] ?? 'border-paper/20 text-paper/55'}`}>{o.status}</span>
 <span className="ml-auto font-display text-base text-paper">{Number(o.totalAmount).toFixed(2)}€</span>
 </div>
 {o.customer && (
 <div className="mt-1 text-xs text-paper/55">
 {o.customer.firstName} {o.customer.lastName} · {o.customer.email}
 </div>
 )}
 </button>
 ))}
 </div>
 </div>

 {selected && (
 <div className="rounded-2xl border border-paper/10 bg-paper/[0.03] p-5 md:p-6">
 <div className="flex items-center justify-between">
 <span className="text-xs text-paper/55">{selected.order.orderNumber}</span>
 <span className={`rounded border px-1.5 py-0.5 text-xs ${STATUS_TINT[selected.order.status] ?? 'border-paper/20 text-paper/55'}`}>{selected.order.status}</span>
 </div>

 <div className="mt-3 mb-5 font-display text-2xl text-paper">{Number(selected.order.totalAmount).toFixed(2)}€</div>

 <div className="mb-4 text-xs text-paper/45">Timeline</div>
 <ul className="relative space-y-3 border-l border-paper/15 pl-5">
 {selected.events.map((e, i) => (
 <li key={i} className="relative">
 <span className="absolute -left-[27px] top-1 h-2.5 w-2.5 rounded-full bg-acid/60" />
 <div className="flex items-center gap-2 text-xs text-paper/55">
 <span>{new Date(e.at).toLocaleString('fr-FR')}</span>
 {e.channel && <span className="rounded border border-paper/15 px-1 py-0.5">{e.channel}</span>}
 </div>
 <div className="text-sm text-paper">{e.label}</div>
 <div className="text-xs italic text-paper/65">"{e.message}"</div>
 </li>
 ))}
 </ul>

 <div className="mt-6 grid grid-cols-2 gap-2 md:grid-cols-3">
 {(['confirmed', 'prepared', 'shipped', 'in_transit', 'delivered', 'cancelled'] as const).map(s => (
 <button
 key={s}
 onClick={() => changeStatus(s)}
 disabled={busy}
 className={`rounded-full border px-3 py-2 text-xs transition disabled:opacity-40 ${
 selected.order.status === s ? 'border-acid bg-acid/10 text-paper' : 'border-paper/15 bg-paper/[0.02] text-paper/70 hover:border-paper/30'
 }`}
 >
 → {s}
 </button>
 ))}
 </div>
 </div>
 )}
 </div>
 </div>
 );
}
