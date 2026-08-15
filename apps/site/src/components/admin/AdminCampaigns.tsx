'use client';

import { useEffect, useState } from 'react';
import { api, type OutboundCampaign } from './api';
import { SectionHeader, Loading, ErrorBlock, Stat } from './AdminOverview';

const STATUS_TINT: Record<string, string> = {
 draft: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
 approved: 'border-acid/40 bg-acid/10 text-acid',
 scheduled: 'border-toxic-500/40 bg-toxic-500/10 text-toxic-300',
 published: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
 archived: 'border-paper/20 bg-paper/[0.04] text-paper/50',
};

export function AdminCampaigns() {
 const [items, setItems] = useState<OutboundCampaign[]>([]);
 const [stats, setStats] = useState<Awaited<ReturnType<typeof api.outbound.stats>> | null>(null);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);
 const [prompt, setPrompt] = useState('');
 const [generating, setGenerating] = useState(false);

 async function load() {
 setLoading(true);
 try {
 const [list, s] = await Promise.all([api.outbound.list(), api.outbound.stats()]);
 setItems(list.campaigns);
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

 async function generate() {
 if (!prompt.trim()) return;
 setGenerating(true);
 try {
 await api.outbound.generate(prompt);
 setPrompt('');
 await load();
 } catch (e) {
 setError((e as Error).message);
 } finally {
 setGenerating(false);
 }
 }

 async function changeStatus(id: number, status: string) {
 try {
 await api.outbound.patch(id, { status });
 await load();
 } catch (e) {
 setError((e as Error).message);
 }
 }

 if (loading) return <Loading />;
 return (
 <div>
 <SectionHeader eyebrow="Campagnes & Ads" title="Pubs et" accent="newsletters" />
 {error && <div className="mt-4"><ErrorBlock message={error} /></div>}

 <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
 <Stat label="Total" value={`${stats?.total ?? 0}`} />
 <Stat label="Brouillons" value={`${stats?.byStatus?.draft ?? 0}`} />
 <Stat label="Publiées" value={`${stats?.byStatus?.published ?? 0}`} accent />
 <Stat label="Programmées" value={`${stats?.byStatus?.scheduled ?? 0}`} />
 </div>

 <div className="mt-6 rounded-2xl border border-paper/10 bg-paper/[0.03] p-5 backdrop-blur-sm md:p-6">
 <div className="text-xs text-paper/55">Demander une nouvelle campagne</div>
 <div className="mt-3 flex items-start gap-3 rounded-xl border border-acid/30 bg-black/40 p-3">
 <span className="mt-1 text-sm text-acid">$</span>
 <textarea
 value={prompt}
 onChange={e => setPrompt(e.target.value)}
 rows={2}
 placeholder="ex: « 5 ads pour mes vins de garde » · « newsletter rentrée pour mes clients fidèles »"
 className="min-h-[40px] flex-1 resize-none bg-transparent text-sm text-paper outline-none placeholder-paper/35"
 />
 <button
 onClick={generate}
 disabled={generating || !prompt.trim()}
 className="self-stretch rounded-lg bg-acid px-4 text-xs text-ink transition hover:bg-acid-deep disabled:opacity-30"
 >
 {generating ? 'écrit…' : 'Générer'}
 </button>
 </div>
 {generating && (
 <div className="mt-3 text-xs text-paper/55">
 Le vendeur lit votre catalogue et écrit la campagne. Ça prend 15-30 secondes.
 </div>
 )}
 </div>

 <div className="mt-6 overflow-hidden rounded-2xl border border-paper/10 bg-paper/[0.03]">
 <div className="border-b border-paper/10 bg-paper/[0.04] px-5 py-3 text-xs text-paper/55">
 Liste · {items.length}
 </div>
 <div className="divide-y divide-neutral-100">
 {items.length === 0 && (
 <div className="px-5 py-12 text-center text-xs text-paper/55">Pas encore de campagnes.</div>
 )}
 {items.map(c => (
 <div key={c.id} className="px-5 py-4">
 <div className="flex flex-wrap items-center gap-2">
 <span className="rounded border border-paper/15 bg-paper/[0.04] px-1.5 py-0.5 text-xs text-paper/70">{c.format}</span>
 <span className={`rounded border px-1.5 py-0.5 text-xs ${STATUS_TINT[c.status] ?? 'border-paper/20 text-paper/55'}`}>
 {c.status}
 </span>
 <span className="ml-auto text-xs text-paper/40">{new Date(c.createdAt).toLocaleDateString('fr-FR')}</span>
 </div>
 <div className="mt-2 text-sm italic text-paper/85">"{c.prompt}"</div>
 <CampaignPreview content={c.content} />
 <div className="mt-3 flex flex-wrap gap-2">
 {c.status === 'draft' && (
 <button onClick={() => changeStatus(c.id, 'approved')} className="rounded-full bg-acid px-3 py-1.5 text-xs text-ink transition hover:bg-acid-deep">
 Valider
 </button>
 )}
 {c.status === 'approved' && (
 <button onClick={() => changeStatus(c.id, 'published')} className="rounded-full bg-emerald-500 px-3 py-1.5 text-xs text-ink transition hover:bg-emerald-400">
 Publier
 </button>
 )}
 {(c.status === 'draft' || c.status === 'approved') && (
 <button onClick={() => changeStatus(c.id, 'archived')} className="rounded-full border border-paper/15 px-3 py-1.5 text-xs text-paper/70 transition hover:bg-paper/5">
 Archiver
 </button>
 )}
 </div>
 </div>
 ))}
 </div>
 </div>
 </div>
 );
}

function CampaignPreview({ content }: { content: unknown }) {
 if (!content || typeof content !== 'object') return null;
 const c = content as { format?: string; subject?: string; intro?: string; items?: Array<{ headline?: string; caption?: string; platform?: string }>; picks?: Array<{ name?: string }> };
 if (c.format === 'newsletter' && c.subject) {
 return (
 <div className="mt-3 rounded-lg border border-paper/10 bg-paper/[0.02] p-3 text-sm">
 <div className="text-xs text-paper/45">Aperçu</div>
 <div className="mt-1 font-display text-base text-paper">{c.subject}</div>
 {c.intro && <div className="mt-1 text-xs text-paper/65">{c.intro.slice(0, 200)}…</div>}
 </div>
 );
 }
 if (c.format === 'ads' && Array.isArray(c.items)) {
 return (
 <div className="mt-3 flex flex-wrap gap-2 text-xs">
 {c.items.slice(0, 4).map((it, i) => (
 <span key={i} className="rounded-full border border-paper/15 bg-paper/[0.04] px-2 py-1 text-paper/75">
 {it.headline ?? '—'}
 </span>
 ))}
 </div>
 );
 }
 if (c.format === 'social' && Array.isArray(c.items)) {
 return (
 <div className="mt-3 flex flex-wrap gap-2 text-xs">
 {c.items.map((it, i) => (
 <span key={i} className="rounded-full border border-acid/30 bg-acid/[0.04] px-2 py-1 text-xs text-acid">
 {it.platform ?? 'post'}
 </span>
 ))}
 </div>
 );
 }
 return null;
}
