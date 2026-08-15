'use client';

import { useEffect, useState } from 'react';
import { SectionHeader, Loading, ErrorBlock, Panel } from './AdminOverview';

interface IntegrationStatus {
 store: { id: number; name: string };
 publishableKey: string;
 base: string;
 email: { provider: string; configured: boolean };
 sms: { provider: string; configured: boolean };
 llm: { provider: string; configured: boolean };
 shopify: { configured: boolean; secretSet: boolean };
 woocommerce: { configured: boolean; siteUrl: string | null; secretSet: boolean };
}

export function AdminIntegration() {
 const [data, setData] = useState<IntegrationStatus | null>(null);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);

 useEffect(() => {
 void load();
 }, []);

 async function load() {
 setLoading(true);
 try {
 const key = window.localStorage.getItem('shimmer.admin.key') ?? '';
 const res = await fetch('/shimmer/api/integration/status', { headers: { Authorization: `Bearer ${key}` } });
 if (!res.ok) throw new Error(`HTTP ${res.status}`);
 const d = (await res.json()) as IntegrationStatus;
 setData(d);
 setError(null);
 } catch (e) {
 setError((e as Error).message);
 } finally {
 setLoading(false);
 }
 }

 if (loading) return <Loading />;
 if (error) return <ErrorBlock message={error} />;
 if (!data) return <ErrorBlock message="Aucune donnée" />;

 const shopifyUrls = [
 { event: 'Panier abandonné', topic: 'checkouts/update', path: `${data.base}/api/webhooks/shopify/abandoned_checkout?store=${data.store.id}` },
 { event: 'Commande payée', topic: 'orders/paid', path: `${data.base}/api/webhooks/shopify/orders_paid?store=${data.store.id}` },
 { event: 'Commande expédiée', topic: 'orders/fulfilled', path: `${data.base}/api/webhooks/shopify/orders_fulfilled?store=${data.store.id}` },
 { event: 'Produit mis à jour (retour de stock)', topic: 'products/update', path: `${data.base}/api/webhooks/shopify/products_update?store=${data.store.id}` },
 { event: 'Niveau de stock (optionnel, plus précis)', topic: 'inventory_levels/update', path: `${data.base}/api/webhooks/shopify/inventory_levels_update?store=${data.store.id}` },
 ];

 const wooUrls = [
 { event: 'Nouvelle commande', topic: 'order.created', path: `${data.base}/api/webhooks/woocommerce/order_created?store=${data.store.id}` },
 { event: 'Commande mise à jour', topic: 'order.updated', path: `${data.base}/api/webhooks/woocommerce/order_updated?store=${data.store.id}` },
 { event: 'Panier abandonné', topic: 'cart.abandoned', path: `${data.base}/api/webhooks/woocommerce/cart_abandoned?store=${data.store.id}` },
 ];

 return (
 <div>
 <SectionHeader eyebrow="Intégration" title="Branchez votre" accent="boutique" />

 <div className="mt-6 space-y-6">
 <Panel title="Services connectés">
 <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
 <ServiceCard label="Emails sortants" provider={data.email.provider} configured={data.email.configured} />
 <ServiceCard label="SMS sortants" provider={data.sms.provider} configured={data.sms.configured} />
 <ServiceCard label="Vendeur IA" provider={data.llm.provider} configured={data.llm.configured} />
 </div>
 {(!data.email.configured || !data.sms.configured) && (
 <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-xs text-amber-200">
 <strong>Mode démo :</strong> les canaux non configurés sont en mode simulation. Les envois sont
 loggés mais pas réellement transmis. Configurez Mailgun et Twilio dans le .env pour activer la production.
 </div>
 )}
 </Panel>

 <Panel title="Shopify">
 <div className="mb-3 flex items-center gap-3">
 <StatusDot ok={data.shopify.configured && data.shopify.secretSet} />
 <span className="text-sm text-neutral-600">
 {data.shopify.configured
 ? data.shopify.secretSet
 ? 'HMAC configuré, webhooks sécurisés'
 : 'Configuré sans HMAC (mode démo)'
 : 'Non configuré'}
 </span>
 </div>
 <p className="mb-4 text-xs text-neutral-500">
 Dans Shopify Admin → Settings → Notifications → Webhooks, créez ces webhooks au format JSON (les 4 premiers suffisent, le 5e affine le retour de stock) :
 </p>
 <div className="space-y-2">
 {shopifyUrls.map(w => (
 <WebhookRow key={w.topic} event={w.event} topic={w.topic} url={w.path} />
 ))}
 </div>
 </Panel>

 <Panel title="WooCommerce">
 <div className="mb-3 flex items-center gap-3">
 <StatusDot ok={data.woocommerce.configured && data.woocommerce.secretSet} />
 <span className="text-sm text-neutral-600">
 {data.woocommerce.configured
 ? data.woocommerce.secretSet
 ? `HMAC configuré · ${data.woocommerce.siteUrl ?? 'site non renseigné'}`
 : `Configuré sans HMAC (mode démo) · ${data.woocommerce.siteUrl ?? 'site non renseigné'}`
 : 'Non configuré'}
 </span>
 </div>
 <p className="mb-4 text-xs text-neutral-500">
 Dans WooCommerce → Settings → Advanced → Webhooks, créez ces webhooks. La signature secrète doit
 correspondre à <code className="rounded bg-white px-1.5 py-0.5">config.woocommerce.webhookSecret</code> de votre store.
 </p>
 <div className="space-y-2">
 {wooUrls.map(w => (
 <WebhookRow key={w.topic} event={w.event} topic={w.topic} url={w.path} />
 ))}
 </div>
 </Panel>

 <Panel title="Clé API">
 <p className="mb-3 text-xs text-neutral-500">
 Pour intégrer le widget vendeur dans votre boutique, copiez votre clé API. Elle est utilisée par
 le SDK JavaScript et les appels serveur.
 </p>
 <CopyBox value={window.localStorage.getItem('shimmer.admin.key') ?? ''} />
 <p className="mt-3 text-xs text-neutral-400">
 Ne partagez jamais cette clé publiquement. Pour le widget client, utilisez la clé publique fournie sur demande.
 </p>
 </Panel>

 <Panel title="SDK Widget">
 <p className="mb-3 text-xs text-neutral-500">
 Ajoutez ce snippet juste avant la balise &lt;/body&gt; de votre boutique pour activer le widget vendeur.
 La clé ci-dessous est <strong>publique</strong> : elle ne donne accès qu'au widget, jamais à votre catalogue ou vos données. Vous pouvez la laisser visible dans la page.
 </p>
 <CopyBox
 value={`<script src="${data.base}/shimmer/sdk/shimmer.iife.js" data-shimmer data-store="${data.store.id}" data-key="${data.publishableKey}" defer></script>`}
 multiline
 />
 </Panel>

 <details className="text-xs text-neutral-400">
 <summary className="cursor-pointer select-none text-neutral-500 hover:text-neutral-700">Comment ça marche ?</summary>
 <p className="mt-2 max-w-2xl leading-relaxed">
 Connectez votre plateforme e-commerce (Shopify, WooCommerce) et vos canaux d&apos;envoi (email, SMS).
 Les webhooks alimentent Shimmer en temps réel sur vos commandes, paniers et clients.
 </p>
 </details>
 </div>
 </div>
 );
}

function ServiceCard({ label, provider, configured }: { label: string; provider: string; configured: boolean }) {
 return (
 <div className="rounded-xl border border-neutral-200 bg-white p-4">
 <div className="flex items-start justify-between">
 <div className="text-xs text-neutral-400">{label}</div>
 <StatusDot ok={configured} />
 </div>
 <div className="mt-2 text-lg tracking-editorial text-neutral-900">{provider}</div>
 <div className="mt-1 text-xs text-neutral-400">
 {configured ? 'Production' : 'Mode démo'}
 </div>
 </div>
 );
}

function StatusDot({ ok }: { ok: boolean }) {
 return (
 <span
 className={`inline-block h-2 w-2 rounded-full ${ok ? 'bg-emerald-600 shadow-[0_0_8px_rgba(155,255,0,0.6)]' : 'bg-amber-400/70'}`}
 aria-label={ok ? 'configuré' : 'mode démo'}
 />
 );
}

function WebhookRow({ event, topic, url }: { event: string; topic: string; url: string }) {
 return (
 <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
 <div className="flex items-baseline justify-between gap-3">
 <div className="text-sm text-neutral-900">{event}</div>
 <code className="text-xs text-neutral-400">{topic}</code>
 </div>
 <CopyBox value={url} />
 </div>
 );
}

function CopyBox({ value, multiline }: { value: string; multiline?: boolean }) {
 const [copied, setCopied] = useState(false);

 function copy() {
 navigator.clipboard.writeText(value).then(() => {
 setCopied(true);
 setTimeout(() => setCopied(false), 1600);
 });
 }

 return (
 <div className="mt-2 flex items-stretch gap-2">
 {multiline ? (
 <textarea
 value={value}
 readOnly
 rows={2}
 className="flex-1 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-700 outline-none"
 />
 ) : (
 <input
 type="text"
 value={value}
 readOnly
 className="flex-1 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-700 outline-none"
 />
 )}
 <button
 onClick={copy}
 className="shrink-0 rounded-lg border border-emerald-200 bg-emerald-100 px-3 py-2 text-xs text-emerald-600 transition hover:bg-emerald-100"
 >
 {copied ? '✓ copié' : 'copier'}
 </button>
 </div>
 );
}
