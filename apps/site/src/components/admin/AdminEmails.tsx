'use client';

import { useEffect, useState } from 'react';
import { api, type SentEmail } from './api';
import { SectionHeader, Loading, ErrorBlock, Stat } from './AdminOverview';

const STATUS_TINT: Record<string, string> = {
 sent: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
 queued: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
 failed: 'border-rose-500/40 bg-rose-500/10 text-rose-300',
};

const PROVIDER_TINT: Record<string, string> = {
 mailgun: 'border-acid/40 bg-acid/10 text-acid',
 mock: 'border-paper/20 bg-paper/[0.04] text-paper/55',
};

export function AdminEmails() {
 const [emails, setEmails] = useState<SentEmail[]>([]);
 const [stats, setStats] = useState<Awaited<ReturnType<typeof api.emails.stats>> | null>(null);
 const [tag, setTag] = useState<string>('');
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);

 async function load(currentTag?: string) {
 setLoading(true);
 try {
 const [list, s] = await Promise.all([
 api.emails.list(currentTag || undefined),
 api.emails.stats(),
 ]);
 setEmails(list.emails);
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

 if (loading) return <Loading />;
 return (
 <div>
 <SectionHeader eyebrow="Emails" title="Tout ce que Shimmer" accent="a envoyé" />
 {error && <div className="mt-4"><ErrorBlock message={error} /></div>}

 <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
 <Stat label="Envoyés 30j" value={`${stats?.total ?? 0}`} accent />
 <Stat label="En mock" value={`${stats?.mockSent ?? 0}`} delta="dev" />
 <Stat label="Mailgun réel" value={`${stats?.realSent ?? 0}`} delta="prod" />
 <Stat label="Échecs" value={`${stats?.failed ?? 0}`} />
 </div>

 <div className="mt-6 rounded-2xl border border-paper/10 bg-paper/[0.03] p-5">
 <div className="text-xs text-paper/55">Filtrer par type</div>
 <div className="mt-3 flex flex-wrap gap-2">
 <button
 onClick={() => { setTag(''); void load(''); }}
 className={`rounded-full border px-3 py-1.5 text-xs transition ${tag === '' ? 'border-acid bg-acid/10 text-paper' : 'border-paper/15 bg-paper/[0.02] text-paper/65 hover:border-paper/30'}`}
 >
 tous · {stats?.total ?? 0}
 </button>
 {stats && Object.entries(stats.byTag).map(([t, n]) => (
 <button
 key={t}
 onClick={() => { setTag(t); void load(t); }}
 className={`rounded-full border px-3 py-1.5 text-xs transition ${tag === t ? 'border-acid bg-acid/10 text-paper' : 'border-paper/15 bg-paper/[0.02] text-paper/65 hover:border-paper/30'}`}
 >
 {t} · {n}
 </button>
 ))}
 </div>
 </div>

 <div className="mt-6 overflow-hidden rounded-2xl border border-paper/10 bg-paper/[0.03]">
 <div className="border-b border-paper/10 bg-paper/[0.04] px-5 py-3 text-xs text-paper/55">
 Journal · {emails.length}
 </div>
 <div className="divide-y divide-neutral-100">
 {emails.length === 0 && (
 <div className="px-5 py-12 text-center text-xs text-paper/55">Pas encore d'emails partis.</div>
 )}
 {emails.map(e => (
 <div key={e.id} className="px-5 py-4">
 <div className="flex flex-wrap items-center gap-2">
 <span className="text-xs text-paper/45">#{e.id}</span>
 <span className={`rounded border px-1.5 py-0.5 text-xs ${STATUS_TINT[e.status] ?? 'border-paper/20 text-paper/55'}`}>{e.status}</span>
 <span className={`rounded border px-1.5 py-0.5 text-xs ${PROVIDER_TINT[e.provider] ?? 'border-paper/20 text-paper/55'}`}>{e.provider}</span>
 {e.tag && <span className="rounded border border-paper/15 bg-paper/[0.04] px-1.5 py-0.5 text-xs text-paper/65">{e.tag}</span>}
 <span className="ml-auto text-xs text-paper/45">{new Date(e.createdAt).toLocaleString('fr-FR')}</span>
 </div>
 <div className="mt-2 text-xs text-paper/65">
 <span className="text-paper/45">À · </span>{e.toAddr}
 </div>
 <div className="mt-1 text-sm text-paper">{e.subject}</div>
 {e.bodyText && <div className="mt-1 text-xs italic text-paper/65 line-clamp-2">"{e.bodyText}"</div>}
 {e.error && <div className="mt-1 text-xs text-rose-300">⚠ {e.error}</div>}
 </div>
 ))}
 </div>
 </div>
 </div>
 );
}
