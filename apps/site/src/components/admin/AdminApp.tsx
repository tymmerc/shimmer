'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api, clearStoredKey, getStoredKey, setStoredKey } from './api';
import { AdminInbox } from './AdminInbox';
import { AdminSAV } from './AdminSAV';
import { AdminCarts } from './AdminCarts';
import { AdminReviews } from './AdminReviews';
import { AdminCampaigns } from './AdminCampaigns';
import { AdminOrders } from './AdminOrders';
import { AdminEmails } from './AdminEmails';
import { AdminOverview } from './AdminOverview';
import { AdminSettings } from './AdminSettings';
import { AdminIntegration } from './AdminIntegration';
import { AdminCatalog } from './AdminCatalog';
import { AdminOnboarding } from './AdminOnboarding';
import { AdminVentes } from './AdminVentes';
import { AdminRelationClient } from './AdminRelationClient';
import { AdminMarketing } from './AdminMarketing';
import { AdminPreuve } from './AdminPreuve';
import { AdminRestock } from './AdminRestock';

type Section =
 | 'overview' | 'onboarding' | 'preuve'
 | 'ventes' | 'relation' | 'marketing'
 | 'inbox' | 'sav' | 'reviews' | 'orders' | 'carts' | 'campaigns' | 'emails'
 | 'catalog' | 'settings' | 'integration' | 'restock';

type Role = 'admin' | 'direction' | 'commercial' | 'sav' | 'marketing' | 'logistique';

/**
 * Role-to-section access map. The "admin" role sees everything. The other
 * roles see a focused subset, so a SAV employee logging in doesn't get
 * drowned in marketing KPIs that aren't their job.
 *
 * Tweakable per-store later by adding store.config.roles[]. For now the role
 * is read from localStorage and defaults to 'admin'.
 */
const ROLE_ACCESS: Record<Role, Section[] | 'all'> = {
 admin: 'all',
 direction: ['overview', 'onboarding', 'preuve', 'ventes', 'relation', 'marketing', 'catalog', 'settings', 'integration', 'restock'],
 commercial: ['overview', 'ventes', 'orders', 'catalog', 'reviews', 'restock'],
 sav: ['relation', 'sav', 'inbox', 'reviews', 'orders'],
 marketing: ['marketing', 'campaigns', 'carts', 'emails', 'reviews', 'restock'],
 logistique: ['orders', 'carts', 'emails', 'restock'],
};

interface SectionDef { key: Section; label: string; group: string; }

// Dashboard SIMPLIFIÉ : un petit commerçant n'a pas besoin de 16 vues.
// L'essentiel seulement, à plat. Les autres composants existent toujours dans
// le code (on peut en rebrancher un si besoin), ils ne sont juste plus dans la
// nav.
const ALL_SECTIONS: SectionDef[] = [
 { key: 'overview', label: 'Accueil', group: '' },
 { key: 'preuve', label: 'Preuve', group: '' },
 { key: 'sav', label: 'SAV', group: '' },
 { key: 'reviews', label: 'Avis', group: '' },
 { key: 'carts', label: 'Paniers', group: '' },
 { key: 'restock', label: 'Réassort', group: '' },
 { key: 'settings', label: 'Réglages', group: '' },
 { key: 'integration', label: 'Intégration', group: '' },
];

function readRole(): Role {
 if (typeof window === 'undefined') return 'admin';
 const r = window.localStorage.getItem('shimmer.admin.role');
 if (r && ['admin','direction','commercial','sav','marketing','logistique'].includes(r)) return r as Role;
 return 'admin';
}

function sectionsForRole(role: Role): SectionDef[] {
 const allowed = ROLE_ACCESS[role];
 if (allowed === 'all') return ALL_SECTIONS;
 const allow = new Set(allowed);
 return ALL_SECTIONS.filter(s => allow.has(s.key));
}

export function AdminApp() {
 const [keyInput, setKeyInput] = useState('');
 const [authed, setAuthed] = useState(false);
 const [storeName, setStoreName] = useState<string>('');
 const [storeId, setStoreId] = useState<number>(0);
 const [section, setSection] = useState<Section>('overview');
 const [error, setError] = useState<string | null>(null);
 const [checking, setChecking] = useState(true);
 const [role, setRole] = useState<Role>(readRole());

 const visibleSections = sectionsForRole(role);

 useEffect(() => {
 const k = getStoredKey();
 if (!k) {
 setChecking(false);
 return;
 }
 setKeyInput(k);
 void verify();
 }, []);

 // Allow the Overview QuickLinks (and any other component) to navigate by
 // dispatching a `shimmer:goto` event. Keeps Overview decoupled from this.
 useEffect(() => {
 const handler = (e: Event) => {
 const target = (e as CustomEvent<string>).detail;
 if (visibleSections.some(s => s.key === target)) {
 setSection(target as Section);
 }
 };
 window.addEventListener('shimmer:goto', handler);
 return () => window.removeEventListener('shimmer:goto', handler);
 }, [visibleSections]);

 async function verify() {
 setError(null);
 setChecking(true);
 try {
 const me = await api.me();
 setStoreId(me.id);
 const cfg = me.config as { displayName?: string };
 setStoreName(cfg.displayName ?? (me.name || `Boutique #${me.id}`));
 setAuthed(true);
 } catch (e) {
 setAuthed(false);
 setError((e as Error).message);
 } finally {
 setChecking(false);
 }
 }

 function login() {
 setStoredKey(keyInput.trim());
 void verify();
 }

 function logout() {
 clearStoredKey();
 setAuthed(false);
 setKeyInput('');
 setStoreName('');
 setStoreId(0);
 }

 if (!authed) {
 return (
 <LoginScreen
 keyInput={keyInput}
 setKeyInput={setKeyInput}
 onSubmit={login}
 error={error}
 checking={checking}
 />
 );
 }

 return (
 <div className="relative">
 <Header storeName={storeName} storeId={storeId} onLogout={logout} role={role} setRole={r => { setRole(r); window.localStorage.setItem('shimmer.admin.role', r); }} />

 <div className="mx-auto max-w-[1400px] px-4 py-6 md:px-8">
 <div className="grid grid-cols-12 gap-x-8">
 <aside className="col-span-12 lg:col-span-3 xl:col-span-2">
 <div className="lg:sticky lg:top-24">
 <Sidebar current={section} setCurrent={setSection} sections={visibleSections} role={role} />
 </div>
 </aside>

 <section className="col-span-12 mt-8 lg:col-span-9 lg:mt-0 xl:col-span-10">
 <AnimatePresence mode="wait">
 <motion.div
 key={section}
 initial={{ opacity: 0, y: 8 }}
 animate={{ opacity: 1, y: 0 }}
 exit={{ opacity: 0, y: -8 }}
 transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
 >
 {section === 'overview' && <AdminOverview />}
 {section === 'onboarding' && <AdminOnboarding />}
 {section === 'preuve' && <AdminPreuve />}
 {section === 'restock' && <AdminRestock />}
 {section === 'ventes' && <AdminVentes />}
 {section === 'relation' && <AdminRelationClient />}
 {section === 'marketing' && <AdminMarketing />}
 {section === 'inbox' && <AdminInbox />}
 {section === 'sav' && <AdminSAV />}
 {section === 'carts' && <AdminCarts />}
 {section === 'reviews' && <AdminReviews />}
 {section === 'campaigns' && <AdminCampaigns />}
 {section === 'orders' && <AdminOrders />}
 {section === 'emails' && <AdminEmails />}
 {section === 'catalog' && <AdminCatalog />}
 {section === 'settings' && <AdminSettings />}
 {section === 'integration' && <AdminIntegration />}
 </motion.div>
 </AnimatePresence>
 </section>
 </div>
 </div>
 </div>
 );
}

function LoginScreen({
 keyInput,
 setKeyInput,
 onSubmit,
 error,
 checking,
}: {
 keyInput: string;
 setKeyInput: (s: string) => void;
 onSubmit: () => void;
 error: string | null;
 checking: boolean;
}) {
 return (
 <div className="flex min-h-screen items-center justify-center bg-[#f6f5f2] px-6">
 <div className="w-full max-w-sm rounded-2xl border border-black/[0.07] bg-white p-8 shadow-[0_4px_28px_rgba(0,0,0,0.06)]">
 <div className="mb-4 text-lg font-semibold tracking-tight text-neutral-900">
 Shimmer<span className="text-emerald-600">.</span>
 </div>
 <h1 className="text-xl font-semibold text-neutral-900">Connectez votre boutique</h1>
 <p className="mt-2 text-sm leading-relaxed text-neutral-500">
 Entrez votre clé API. Vous la trouvez dans votre espace Shimmer ou auprès de votre équipe d&apos;intégration.
 </p>

 <div className="mt-6">
 <label className="block text-xs font-medium text-neutral-600">Clé API</label>
 <input
 type="text"
 value={keyInput}
 onChange={e => setKeyInput(e.target.value)}
 onKeyDown={e => e.key === 'Enter' && onSubmit()}
 placeholder="sk_…"
 autoComplete="off"
 className="mt-1.5 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none placeholder-neutral-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15"
 />
 </div>

 <button
 onClick={onSubmit}
 disabled={!keyInput.trim() || checking}
 className="mt-4 w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-40"
 >
 {checking ? 'Vérification…' : 'Entrer'}
 </button>

 {error && (
 <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
 {error}
 </div>
 )}

 <div className="mt-5 border-t border-neutral-100 pt-4 text-xs leading-relaxed text-neutral-500">
 <strong className="font-medium text-neutral-700">Démo :</strong> utilisez{' '}
 <code className="rounded bg-neutral-100 px-1.5 py-0.5 text-xs text-neutral-700">test-api-key</code>{' '}
 ou la clé de Caves Forty-Two.
 </div>
 </div>
 </div>
 );
}

function Header({
 storeName,
 storeId,
 onLogout,
 role,
 setRole,
}: {
 storeName: string;
 storeId: number;
 onLogout: () => void;
 role: Role;
 setRole: (r: Role) => void;
}) {
 return (
 <header className="sticky top-0 z-40 border-b border-black/[0.07] bg-white/90 backdrop-blur-md">
 <div className="mx-auto flex max-w-[1400px] items-center justify-between px-4 py-3 md:px-8">
 <div className="flex items-center gap-3">
 <a href="/shimmer/" className="text-lg font-semibold tracking-tight text-neutral-900">
 Shimmer<span className="text-emerald-600">.</span>
 </a>
 {storeName && (
 <span className="hidden items-center gap-1.5 rounded-lg bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-600 md:inline-flex">
 {storeName || `Boutique #${storeId}`}
 </span>
 )}
 </div>
 <div className="flex items-center gap-2">
 <select
 value={role}
 onChange={e => setRole(e.target.value as Role)}
 className="hidden rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-700 outline-none focus:border-emerald-500 md:block"
 >
 <option value="admin">Admin (tout)</option>
 <option value="direction">Direction</option>
 <option value="commercial">Commercial</option>
 <option value="sav">SAV</option>
 <option value="marketing">Marketing</option>
 <option value="logistique">Logistique</option>
 </select>
 <button
 onClick={onLogout}
 className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-600 transition hover:bg-neutral-50"
 >
 Déconnexion
 </button>
 </div>
 </div>
 </header>
 );
}

function Sidebar({
 current,
 setCurrent,
 sections,
}: {
 current: Section;
 setCurrent: (s: Section) => void;
 sections: SectionDef[];
 role: Role;
}) {
 return (
 <nav className="space-y-1">
 {sections.map(s => {
 const active = current === s.key;
 return (
 <button
 key={s.key}
 onClick={() => setCurrent(s.key)}
 className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition ${
 active
 ? 'bg-white font-medium text-neutral-900 shadow-[0_1px_2px_rgba(0,0,0,0.05)] ring-1 ring-black/[0.06]'
 : 'text-neutral-500 hover:bg-black/[0.04] hover:text-neutral-800'
 }`}
 >
 <span className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-emerald-500' : 'bg-transparent'}`} />
 {s.label}
 </button>
 );
 })}
 </nav>
 );
}
