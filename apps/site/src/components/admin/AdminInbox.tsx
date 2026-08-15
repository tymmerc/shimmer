'use client';

import { useEffect, useState } from 'react';
import { api, type MailRecord } from './api';
import { SectionHeader, Loading, ErrorBlock } from './AdminOverview';

const CATEGORY_TINT: Record<string, string> = {
 DELIVERY_ISSUE: 'border-rose-500/40 bg-rose-500/10 text-rose-300',
 COMPLAINT: 'border-rose-500/40 bg-rose-500/10 text-rose-300',
 PRODUCT_QUESTION: 'border-acid/40 bg-acid/10 text-acid',
 ORDER_STATUS: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
 REFUND_REQUEST: 'border-rose-500/40 bg-rose-500/10 text-rose-300',
 POSITIVE_FEEDBACK: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
 OTHER: 'border-paper/20 bg-paper/[0.04] text-paper/55',
};

export function AdminInbox() {
 const [mails, setMails] = useState<MailRecord[]>([]);
 const [selected, setSelected] = useState<MailRecord | null>(null);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);
 const [testInput, setTestInput] = useState({ from: '', subject: '', body: '' });
 const [posting, setPosting] = useState(false);

 async function load() {
 setLoading(true);
 try {
 const r = await api.mail.list();
 setMails(r.mails);
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

 async function classifyTest() {
 if (!testInput.from || !testInput.subject || !testInput.body) return;
 setPosting(true);
 try {
 const r = await api.mail.classify({ fromAddr: testInput.from, subject: testInput.subject, body: testInput.body });
 setSelected(r);
 setTestInput({ from: '', subject: '', body: '' });
 await load();
 } catch (e) {
 setError((e as Error).message);
 } finally {
 setPosting(false);
 }
 }

 if (loading) return <Loading />;

 return (
 <div>
 <SectionHeader eyebrow="Inbox" title="Vos mails," accent="triés à l'arrivée" />
 {error && <div className="mt-4"><ErrorBlock message={error} /></div>}

 <div className="mt-6 rounded-2xl border border-paper/10 bg-paper/[0.03] p-5">
 <div className="text-xs text-paper/55">
 Simuler la réception d'un mail (raccourci démo)
 </div>
 <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
 <input
 value={testInput.from}
 onChange={e => setTestInput(s => ({ ...s, from: e.target.value }))}
 placeholder="from@example.com"
 className="rounded border border-paper/15 bg-black/40 px-3 py-2 text-sm text-paper outline-none focus:border-acid"
 />
 <input
 value={testInput.subject}
 onChange={e => setTestInput(s => ({ ...s, subject: e.target.value }))}
 placeholder="Objet"
 className="rounded border border-paper/15 bg-black/40 px-3 py-2 text-sm text-paper outline-none focus:border-acid"
 />
 <button
 onClick={classifyTest}
 disabled={posting || !testInput.from || !testInput.subject || !testInput.body}
 className="rounded bg-acid px-3 py-2 text-xs text-ink transition hover:bg-acid-deep disabled:opacity-40"
 >
 {posting ? 'classifie…' : 'Classifier'}
 </button>
 </div>
 <textarea
 value={testInput.body}
 onChange={e => setTestInput(s => ({ ...s, body: e.target.value }))}
 rows={3}
 placeholder="Corps du mail…"
 className="mt-2 w-full rounded border border-paper/15 bg-black/40 px-3 py-2 text-sm text-paper outline-none focus:border-acid"
 />
 </div>

 <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.1fr]">
 <div className="overflow-hidden rounded-2xl border border-paper/10 bg-paper/[0.03]">
 <div className="border-b border-paper/10 bg-paper/[0.04] px-5 py-3 text-xs text-paper/55">
 Boîte de réception · {mails.length}
 </div>
 <div className="max-h-[600px] divide-y divide-neutral-100 overflow-y-auto">
 {mails.length === 0 && (
 <div className="px-5 py-12 text-center text-xs text-paper/55">
 Aucun mail pour l'instant. Simulez-en un ci-dessus.
 </div>
 )}
 {mails.map(m => (
 <button
 key={m.id}
 onClick={() => setSelected(m)}
 className={`block w-full px-5 py-4 text-left transition hover:bg-paper/[0.04] ${selected?.id === m.id ? 'bg-paper/[0.06]' : ''}`}
 >
 <div className="flex items-center gap-2">
 <span className={`rounded border px-1.5 py-0.5 text-xs ${CATEGORY_TINT[m.category] ?? 'border-paper/20 text-paper/55'}`}>
 {m.category}
 </span>
 {m.urgency === 'high' && (
 <span className="rounded border border-rose-500/40 bg-rose-500/15 px-1.5 py-0.5 text-xs text-rose-300">URGENT</span>
 )}
 <span className="ml-auto text-xs text-paper/40">{new Date(m.createdAt).toLocaleDateString('fr-FR')}</span>
 </div>
 <div className="mt-2 text-xs text-paper/65">{m.fromAddr}</div>
 <div className="mt-1 truncate text-sm text-paper">{m.subject}</div>
 </button>
 ))}
 </div>
 </div>

 {selected && (
 <div className="rounded-2xl border border-paper/10 bg-paper/[0.03] p-5 md:p-6">
 <div className="flex items-baseline justify-between">
 <span className={`rounded border px-1.5 py-0.5 text-xs ${CATEGORY_TINT[selected.category] ?? 'border-paper/20 text-paper/55'}`}>
 {selected.category} · {selected.sentiment}
 </span>
 <span className="text-xs text-paper/45">
 confiance {Math.round(((selected as unknown as { confidence?: number }).confidence ?? 0) * 100)}%
 </span>
 </div>
 <h3 className="mt-4 font-display text-xl tracking-editorial text-paper">{selected.subject}</h3>
 <div className="mt-1 text-xs text-paper/55">De · {selected.fromAddr}</div>
 <p className="mt-4 text-sm leading-relaxed text-paper/75 whitespace-pre-line">{selected.body}</p>

 {selected.draftResponse && (
 <div className="mt-5 rounded-xl border border-acid/30 bg-acid/[0.04] p-4">
 <div className="text-xs text-acid">Brouillon de réponse · à valider</div>
 <p className="mt-2 whitespace-pre-line text-sm italic text-paper/85">"{selected.draftResponse}"</p>
 <div className="mt-3 flex flex-wrap gap-2">
 <button className="rounded-full bg-acid px-3 py-1.5 text-xs text-ink transition hover:bg-acid-deep">Envoyer</button>
 <button className="rounded-full border border-paper/15 px-3 py-1.5 text-xs text-paper/70 transition hover:bg-paper/5">Modifier</button>
 </div>
 </div>
 )}

 {selected.extractedData && Object.keys(selected.extractedData).length > 0 && (
 <div className="mt-4 rounded-xl border border-paper/10 bg-paper/[0.02] p-3 text-xs text-paper/70">
 <div className="mb-1 text-paper/45">Données extraites</div>
 {Object.entries(selected.extractedData).map(([k, v]) => (
 v ? <div key={k}><span className="text-paper/55">{k}:</span> {String(v)}</div> : null
 ))}
 </div>
 )}
 </div>
 )}
 </div>
 </div>
 );
}
