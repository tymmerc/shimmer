'use client';

import { useEffect, useState } from 'react';
import { SectionHeader, Loading, ErrorBlock, Panel } from './AdminOverview';

interface StoreConfig {
 id: number;
 name: string;
 config: Record<string, unknown>;
 updatedAt: string;
}

const TONE_OPTIONS: { value: string; label: string; description: string }[] = [
 { value: 'tu', label: 'Tu (familier)', description: 'On tutoie le client. Plus proche, plus moderne.' },
 { value: 'vous', label: 'Vous (formel)', description: 'On vouvoie. Plus respectueux, plus classique.' },
 { value: 'neutre', label: 'Neutre', description: 'Phrasing sans pronom direct, ton équilibré.' },
];

export function AdminSettings() {
 const [data, setData] = useState<StoreConfig | null>(null);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);
 const [saving, setSaving] = useState(false);
 const [saved, setSaved] = useState(false);

 // Form state
 const [tone, setTone] = useState<string>('neutre');
 const [voiceSignature, setVoiceSignature] = useState('');
 const [voiceIntros, setVoiceIntros] = useState<string>('');
 const [vocabularyRaw, setVocabularyRaw] = useState<string>('');

 async function load() {
 setLoading(true);
 try {
 const key = window.localStorage.getItem('shimmer.admin.key') ?? '';
 const res = await fetch('/shimmer/api/stores/me/config', { headers: { Authorization: `Bearer ${key}` } });
 if (!res.ok) throw new Error(`HTTP ${res.status}`);
 const d = (await res.json()) as StoreConfig;
 setData(d);
 const cfg = d.config as { tone?: string; voice?: { signature?: string; intro_phrases?: string[]; vocabulary?: Record<string, string> } };
 setTone(cfg.tone ?? 'neutre');
 setVoiceSignature(cfg.voice?.signature ?? '');
 setVoiceIntros((cfg.voice?.intro_phrases ?? []).join('\n'));
 setVocabularyRaw(cfg.voice?.vocabulary ? JSON.stringify(cfg.voice.vocabulary, null, 2) : '');
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

 async function save() {
 setSaving(true);
 setSaved(false);
 setError(null);
 try {
 let vocabulary: Record<string, string> | undefined;
 if (vocabularyRaw.trim()) {
 try {
 vocabulary = JSON.parse(vocabularyRaw);
 } catch {
 throw new Error('JSON invalide dans le vocabulaire');
 }
 }

 const payload: Record<string, unknown> = { tone };
 const intros = voiceIntros.split('\n').map(s => s.trim()).filter(Boolean);
 const voice: Record<string, unknown> = {};
 if (voiceSignature.trim()) voice.signature = voiceSignature.trim();
 if (intros.length > 0) voice.intro_phrases = intros;
 if (vocabulary) voice.vocabulary = vocabulary;
 if (Object.keys(voice).length > 0) payload.voice = voice;

 const key = window.localStorage.getItem('shimmer.admin.key') ?? '';
 const res = await fetch('/shimmer/api/stores/me/config', {
 method: 'PATCH',
 headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
 body: JSON.stringify(payload),
 });
 if (!res.ok) throw new Error(`HTTP ${res.status}`);
 setSaved(true);
 await load();
 setTimeout(() => setSaved(false), 2500);
 } catch (e) {
 setError((e as Error).message);
 } finally {
 setSaving(false);
 }
 }

 if (loading) return <Loading />;
 if (!data) return <ErrorBlock message="Aucune config" />;

 return (
 <div>
 <SectionHeader eyebrow="Configuration" title="Le ton de votre" accent="vendeur" />
 {error && <div className="mt-4"><ErrorBlock message={error} /></div>}

 <p className="mt-4 max-w-[60ch] text-sm leading-relaxed text-neutral-500">
 Définissez comment Shimmer parle à vos clients. Ce ton est utilisé dans les recommandations
 produit, les justifications de cross-sell et les emails générés.
 </p>

 <div className="mt-8 space-y-6">
 <Panel title="Ton général">
 <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
 {TONE_OPTIONS.map(opt => (
 <button
 key={opt.value}
 onClick={() => setTone(opt.value)}
 className={`rounded-xl border px-4 py-4 text-left transition ${
 tone === opt.value
 ? 'border-emerald-500 bg-emerald-100 text-neutral-900'
 : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-200'
 }`}
 >
 <div className="text-lg tracking-editorial text-neutral-900">{opt.label}</div>
 <div className="mt-1 text-xs text-neutral-500">{opt.description}</div>
 </button>
 ))}
 </div>
 </Panel>

 <Panel title="Signature & phrases d'intro">
 <div>
 <label className="text-xs text-neutral-400">
 Signature de fin (ex: "À bientôt !", "Merci de votre confiance")
 </label>
 <input
 type="text"
 value={voiceSignature}
 onChange={e => setVoiceSignature(e.target.value)}
 placeholder="À bientôt !"
 className="mt-2 w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-emerald-500"
 />
 </div>
 <div className="mt-5">
 <label className="text-xs text-neutral-400">
 Phrases d'intro (une par ligne)
 </label>
 <textarea
 value={voiceIntros}
 onChange={e => setVoiceIntros(e.target.value)}
 rows={4}
 placeholder="Tope !&#10;Bonne idée !&#10;Pile poil pour ça !"
 className="mt-2 w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-emerald-500"
 />
 <div className="mt-2 text-xs text-neutral-400">
 Le vendeur ouvre ses recommandations avec une de ces phrases au hasard.
 </div>
 </div>
 </Panel>

 <Panel title="Vocabulaire (JSON)">
 <div className="mb-2 text-xs text-neutral-500">
 Remplacements de mots dans les réponses. Ex : <code className="rounded bg-white px-1.5 py-0.5">{`{"produit": "article"}`}</code>{' '}
 pour adapter le vocabulaire à votre univers (mode, sport, cuisine, etc).
 </div>
 <textarea
 value={vocabularyRaw}
 onChange={e => setVocabularyRaw(e.target.value)}
 rows={6}
 placeholder='{"produit": "article", "produits": "articles"}'
 className="mt-1 w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-900 outline-none focus:border-emerald-500"
 />
 </Panel>

 <Panel title="Informations boutique">
 <div className="grid grid-cols-2 gap-3">
 <Row label="Nom" value={data.name} />
 <Row label="Store ID" value={`#${data.id}`} />
 <Row label="Dernière mise à jour" value={new Date(data.updatedAt).toLocaleString('fr-FR')} />
 <Row label="Plateforme" value={(data.config as { platform?: string }).platform ?? '—'} />
 </div>
 </Panel>
 </div>

 <div className="mt-8 flex items-center gap-4">
 <button
 onClick={save}
 disabled={saving}
 className="rounded-full bg-emerald-600 px-6 py-3 text-xs text-white transition hover:bg-emerald-700 disabled:opacity-40"
 >
 {saving ? 'Enregistrement…' : 'Enregistrer la configuration'}
 </button>
 {saved && (
 <span className="text-xs text-emerald-600">✓ enregistré</span>
 )}
 </div>
 </div>
 );
}

function Row({ label, value }: { label: string; value: string }) {
 return (
 <div className="rounded-lg border border-neutral-200 bg-white p-3">
 <div className="text-xs text-neutral-400">{label}</div>
 <div className="mt-1 text-sm text-neutral-900">{value}</div>
 </div>
 );
}
