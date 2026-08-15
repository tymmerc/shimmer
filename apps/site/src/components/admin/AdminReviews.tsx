'use client';

import { humanize } from './labels';
import { useEffect, useState } from 'react';
import { SectionHeader, SourceBadge, Loading, ErrorBlock, Stat } from './AdminOverview';

interface Review {
 id: number;
 overallRating: number;
 comment: string | null;
 status: string;
 wouldRecommend: boolean | null;
 aiSentiment: string | null;
 savTriggered: boolean;
 createdAt: string;
 customer?: { firstName: string | null; lastName: string | null; email: string };
 product?: { id: number; name: string; category: string | null };
 order?: { orderNumber: string };
}

interface Stats {
 total: number;
 averageRating: number;
 distribution?: Record<string, number>;
 recentTrend?: string;
}

const STATUS_TINT: Record<string, string> = {
 PENDING_MODERATION: 'border-amber-500/40 bg-amber-500/10 text-amber-600',
 PUBLISHED: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
 REJECTED: 'border-red-500/40 bg-red-500/10 text-red-600',
 HIDDEN: 'border-neutral-200 bg-white text-neutral-400',
};

export function AdminReviews() {
 const [reviews, setReviews] = useState<Review[]>([]);
 const [stats, setStats] = useState<Stats | null>(null);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);
 const [busyId, setBusyId] = useState<number | null>(null);

 async function load() {
 setLoading(true);
 try {
 const key = window.localStorage.getItem('shimmer.admin.key') ?? '';
 const headers = { Authorization: `Bearer ${key}` };
 const [pendingRes, statsRes] = await Promise.all([
 fetch('/shimmer/api/reviews/pending?limit=100', { headers }),
 fetch('/shimmer/api/reviews/stats', { headers }),
 ]);
 if (pendingRes.ok) {
 const data = (await pendingRes.json()) as { reviews: Review[] };
 setReviews(data.reviews);
 }
 if (statsRes.ok) setStats((await statsRes.json()) as Stats);
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

 async function moderate(id: number, action: 'approve' | 'reject') {
 setBusyId(id);
 try {
 const key = window.localStorage.getItem('shimmer.admin.key') ?? '';
 const res = await fetch(`/shimmer/api/reviews/${id}/moderate`, {
 method: 'POST',
 headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
 body: JSON.stringify({ action }),
 });
 if (!res.ok) throw new Error(`HTTP ${res.status}`);
 await load();
 } catch (e) {
 setError((e as Error).message);
 } finally {
 setBusyId(null);
 }
 }

 if (loading) return <Loading />;

 return (
 <div>
 <SectionHeader eyebrow="Modération avis" title="Avis," accent="à publier ou désamorcer" badge={<SourceBadge label="Widget avis" />} />
 {error && <div className="mt-4"><ErrorBlock message={error} /></div>}

 <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
 <Stat label="Total avis" value={`${stats?.total ?? 0}`} />
 <Stat label="Note moyenne" value={`${(stats?.averageRating ?? 0).toFixed(1)} / 5`} accent />
 <Stat label="À modérer" value={`${reviews.length}`} delta="en file" />
 <Stat label="Trend" value={stats?.recentTrend ?? 'stable'} />
 </div>

 <div className="mt-6 rounded-2xl border border-neutral-200 bg-white p-5">
 <div className="text-xs text-neutral-500">Comment ça marche</div>
 <ul className="mt-3 space-y-2 text-sm text-neutral-600">
 <li className="flex gap-2"><span className="text-emerald-600">·</span> 48h après livraison, demande d'avis envoyée auto.</li>
 <li className="flex gap-2"><span className="text-emerald-600">·</span> <span className="text-emerald-300">4-5★</span> publiés direct sur la fiche.</li>
 <li className="flex gap-2"><span className="text-emerald-600">·</span> <span className="text-amber-600">3★</span> en modération humaine.</li>
 <li className="flex gap-2"><span className="text-emerald-600">·</span> <span className="text-red-600">1-2★</span> déclenchent un ticket SAV avant Google.</li>
 </ul>
 </div>

 <div className="mt-6 overflow-hidden rounded-2xl border border-neutral-200 bg-white">
 <div className="border-b border-neutral-200 bg-white px-5 py-3 text-xs text-neutral-500">
 En attente · {reviews.length}
 </div>
 {reviews.length === 0 ? (
 <div className="px-5 py-12 text-center text-xs text-neutral-500">
 Pas d'avis en attente. Tout est traité automatiquement.
 </div>
 ) : (
 <div className="divide-y divide-neutral-100">
 {reviews.map(r => (
 <div key={r.id} className="px-5 py-4">
 <div className="flex flex-wrap items-center gap-2">
 <Stars n={r.overallRating} />
 <span className={`rounded border px-1.5 py-0.5 text-xs ${STATUS_TINT[r.status] ?? 'border-neutral-200 text-neutral-500'}`}>{humanize(r.status)}</span>
 {r.aiSentiment && (
 <span className="rounded border border-neutral-200 bg-white px-1.5 py-0.5 text-xs text-neutral-500">{r.aiSentiment}</span>
 )}
 {r.savTriggered && (
 <span className="rounded border border-red-500/40 bg-red-500/15 px-1.5 py-0.5 text-xs text-red-600">SAV déclenché</span>
 )}
 <span className="ml-auto text-xs text-neutral-400">{new Date(r.createdAt).toLocaleDateString('fr-FR')}</span>
 </div>
 {r.comment && <p className="mt-2 text-sm italic text-neutral-700">"{r.comment}"</p>}
 <div className="mt-2 text-xs text-neutral-400">
 {r.customer?.firstName} {r.customer?.lastName} · {r.order?.orderNumber}
 {r.product?.name && ` · ${r.product.name}`}
 </div>
 <div className="mt-3 flex flex-wrap gap-2">
 <button
 onClick={() => moderate(r.id, 'approve')}
 disabled={busyId === r.id}
 className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs text-white transition hover:bg-emerald-700 disabled:opacity-40"
 >
 {busyId === r.id ? '...' : 'Publier'}
 </button>
 <button
 onClick={() => moderate(r.id, 'reject')}
 disabled={busyId === r.id}
 className="rounded-full border border-red-500/40 bg-red-500/5 px-3 py-1.5 text-xs text-red-600 transition hover:bg-red-500/10 disabled:opacity-40"
 >
 Rejeter
 </button>
 </div>
 </div>
 ))}
 </div>
 )}
 </div>
 </div>
 );
}

function Stars({ n }: { n: number }) {
 return (
 <div className="flex gap-0.5">
 {Array.from({ length: 5 }).map((_, i) => (
 <svg key={i} width="14" height="14" viewBox="0 0 24 24" fill={i < n ? '#d4ff3a' : 'rgba(255,255,255,0.15)'}>
 <path d="M12 2 L14.85 8.46 L22 9.27 L16.5 13.97 L18.18 21 L12 17.27 L5.82 21 L7.5 13.97 L2 9.27 L9.15 8.46 Z" />
 </svg>
 ))}
 </div>
 );
}
