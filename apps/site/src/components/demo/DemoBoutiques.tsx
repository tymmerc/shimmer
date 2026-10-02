'use client';

// Démo « trois boutiques » : la même ligne de script, le même vendeur, posés
// dans trois boutiques qui ne se ressemblent pas. Les boutiques sont de vraies
// pages HTML (public/demo-boutiques/), chargées en iframe de même origine : les
// suggestions tapent directement dans leur barre de recherche, comme le ferait
// un visiteur. Les iframes restent montées (masquées, pas retirées) pour que
// le SDK garde sa mise en page et que la conversation survive au changement
// d'onglet.

import { useCallback, useEffect, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';

type ShopKey = 'caves' | 'atelier' | 'refonte';
type FrameStatus = 'idle' | 'loading' | 'ready' | 'error';

interface Shop {
  key: ShopKey;
  name: string;
  tag: string;
  file: string;
  storeId: number;
  frameTitle: string;
  queries: readonly [string, string];
  reads: string;
}

const BASE = '/shimmer/demo-boutiques/';
const SDK_URL = 'https://tymmerc.eu/shimmer/sdk/shimmer.iife.js';
const POLL_MS = 250;
const POLL_MAX = 40;

const SHOPS: readonly Shop[] = [
  {
    key: 'caves',
    name: 'Caves Forty-Two',
    tag: 'Cave de quartier',
    file: 'caves.html',
    storeId: 4,
    frameTitle: 'Boutique de démonstration Caves Forty-Two, fiche Saint-Émilion Grand Cru 2019',
    queries: ['rouge', 'un cadeau'],
    reads: 'fond crème, texte brun, police à empattements, bouton bordeaux aux coins de 4 px',
  },
  {
    key: 'atelier',
    name: "L'Atelier Lumière",
    tag: 'Galerie design',
    file: 'atelier.html',
    storeId: 5,
    frameTitle: "Boutique de démonstration L'Atelier Lumière, fiche Lampe Bourgie",
    queries: ['lampe', 'suspension'],
    reads: 'fond presque noir, texte ivoire, Helvetica fine, bouton ambre, angles droits',
  },
  {
    key: 'refonte',
    name: 'Caves Forty-Two',
    tag: 'Après refonte',
    file: 'caves-refonte.html',
    storeId: 4,
    frameTitle: 'Boutique de démonstration Caves Forty-Two après refonte, fiche Champagne Rosé de Saignée',
    queries: ['bulles', 'un blanc'],
    reads: 'fond blanc cassé, texte noir, police système, bouton tomate en pilule',
  },
];

const INITIAL_STATUS: Record<ShopKey, FrameStatus> = { caves: 'idle', atelier: 'idle', refonte: 'idle' };

const STATUS_LABEL: Record<FrameStatus, string> = {
  idle: 'Chargement de la boutique…',
  loading: 'Chargement de la boutique…',
  ready: 'Widget chargé',
  error: 'Le widget ne répond pas, rechargez la page',
};

type ShimmerWindow = Window & typeof globalThis & { Shimmer?: unknown };

function frameWindow(frame: HTMLIFrameElement | null | undefined): ShimmerWindow | null {
  try {
    return (frame?.contentWindow as ShimmerWindow | null) ?? null;
  } catch {
    return null;
  }
}

export function DemoBoutiques() {
  const [active, setActive] = useState<ShopKey>('caves');
  const [mounted, setMounted] = useState<readonly ShopKey[]>([]);
  const [status, setStatus] = useState<Record<ShopKey, FrameStatus>>(INITIAL_STATUS);
  const [host, setHost] = useState('');

  const frames = useRef<Partial<Record<ShopKey, HTMLIFrameElement | null>>>({});
  const tabs = useRef<Partial<Record<ShopKey, HTMLButtonElement | null>>>({});
  const timers = useRef<Partial<Record<ShopKey, number>>>({});

  const shop = SHOPS.find(s => s.key === active) ?? SHOPS[0];

  const updateStatus = useCallback((key: ShopKey, next: FrameStatus) => {
    setStatus(prev => (prev[key] === next ? prev : { ...prev, [key]: next }));
  }, []);

  // Le SDK est prêt quand window.Shimmer existe dans la boutique : il a alors
  // déjà accroché la barre de recherche (démarrage synchrone en mode session).
  const watch = useCallback((key: ShopKey) => {
    const previous = timers.current[key];
    if (previous !== undefined) window.clearTimeout(previous);
    updateStatus(key, 'loading');
    let tries = 0;
    const tick = () => {
      const win = frameWindow(frames.current[key]);
      const doc = win?.document;
      if (win?.Shimmer && doc && doc.readyState !== 'loading') {
        timers.current = { ...timers.current, [key]: undefined };
        updateStatus(key, 'ready');
        return;
      }
      tries += 1;
      if (tries >= POLL_MAX) {
        updateStatus(key, 'error');
        return;
      }
      timers.current = { ...timers.current, [key]: window.setTimeout(tick, POLL_MS) };
    };
    tick();
  }, [updateStatus]);

  // Montage côté client seulement : l'événement load de l'iframe ne doit pas
  // partir avant que React l'écoute.
  useEffect(() => {
    setHost(window.location.host);
    setMounted(['caves']);
    const pending = timers;
    return () => {
      Object.values(pending.current).forEach(t => {
        if (t !== undefined) window.clearTimeout(t);
      });
    };
  }, []);

  // Dès qu'une boutique tourne, on prépare les deux autres en arrière-plan :
  // en rendez-vous, le changement d'onglet est alors instantané.
  const anyReady = Object.values(status).some(s => s === 'ready');
  useEffect(() => {
    if (!anyReady) return;
    const t = window.setTimeout(() => {
      setMounted(prev => (prev.length === SHOPS.length ? prev : SHOPS.map(s => s.key)));
    }, 600);
    return () => window.clearTimeout(t);
  }, [anyReady]);

  function select(key: ShopKey): void {
    setActive(key);
    setMounted(prev => (prev.includes(key) ? prev : [...prev, key]));
  }

  function onTabKeyDown(e: ReactKeyboardEvent<HTMLDivElement>): void {
    const index = SHOPS.findIndex(s => s.key === active);
    const last = SHOPS.length - 1;
    let next: number;
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        next = index === last ? 0 : index + 1;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        next = index === 0 ? last : index - 1;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = last;
        break;
      default:
        return;
    }
    e.preventDefault();
    const target = SHOPS[next];
    select(target.key);
    tabs.current[target.key]?.focus();
  }

  // Tape la question dans la barre de la boutique puis valide, exactement
  // comme un visiteur : le SDK écoute Entrée sur le champ.
  function ask(target: Shop, query: string): void {
    const win = frameWindow(frames.current[target.key]);
    const input = win?.document.querySelector<HTMLInputElement>('input[type="search"]');
    if (!win || !input) {
      updateStatus(target.key, 'error');
      return;
    }
    try {
      win.scrollTo(0, 0);
      // Sur un portable, la boutique commence sous la ligne de flottaison :
      // on l'amène en haut de l'écran pour que la réponse soit visible.
      const frame = frames.current[target.key];
      if (frame) {
        const top = frame.getBoundingClientRect().top + window.scrollY - 64;
        const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        window.scrollTo({ top: Math.max(0, top), behavior: smooth ? 'smooth' : 'auto' });
      }
      input.value = query;
      input.dispatchEvent(new win.Event('input', { bubbles: true }));
      // Sur mobile, pas de focus : le clavier masquerait la réponse.
      if (window.matchMedia('(pointer: fine)').matches) input.focus({ preventScroll: true });
      input.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true, cancelable: true }));
    } catch (err) {
      console.warn('[demo-boutiques] question non transmise', err);
      updateStatus(target.key, 'error');
    }
  }

  const ready = status[active] === 'ready';
  const pageUrl = `${BASE}${shop.file}`;

  return (
    <div className="relative">
      <Header />

      <div className="relative z-10 mx-auto max-w-[1480px] px-4 pb-24 pt-10 sm:px-6 md:px-12">
        <div className="mb-10 max-w-[62ch]">
          <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-acid">
            Un widget · trois boutiques
          </div>
          <h1 className="mt-3 font-display text-[clamp(30px,4vw,52px)] font-normal leading-[1.04] tracking-tightest text-paper">
            Le même vendeur, chez trois marchands qui ne se{' '}
            <span className="italic text-acid">ressemblent</span> pas.
          </h1>
          <p className="mt-5 text-base leading-relaxed text-paper/70">
            Chaque page charge la même ligne de script, et le widget lit les couleurs, la police et
            les arrondis de la boutique pour s'habiller comme elle.
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Boutiques de démonstration"
          onKeyDown={onTabKeyDown}
          className="grid grid-cols-1 gap-2 sm:grid-cols-3"
        >
          {SHOPS.map(s => {
            const selected = s.key === active;
            return (
              <button
                key={s.key}
                ref={el => {
                  tabs.current[s.key] = el;
                }}
                id={`tab-${s.key}`}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls={`panel-${s.key}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => select(s.key)}
                className={`flex items-baseline justify-between gap-3 rounded-xl border px-4 py-3 text-left transition sm:flex-col sm:items-start sm:gap-1 ${
                  selected
                    ? 'border-acid bg-acid/10 text-paper'
                    : 'border-paper/10 bg-paper/[0.02] text-paper/70 hover:border-paper/25 hover:bg-paper/[0.04]'
                }`}
              >
                <span className="font-display text-base text-paper">{s.name}</span>
                <span
                  className={`font-mono text-[10px] uppercase tracking-[0.2em] ${selected ? 'text-acid' : 'text-paper/45'}`}
                >
                  {s.tag}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-2">
          <span className="mr-1 font-mono text-[10px] uppercase tracking-[0.22em] text-paper/45">
            À taper dans la recherche
          </span>
          {shop.queries.map(q => (
            <button
              key={q}
              type="button"
              disabled={!ready}
              onClick={() => ask(shop, q)}
              className="rounded-full border border-paper/20 px-4 py-2 text-left text-sm text-paper transition hover:border-acid hover:text-acid disabled:cursor-wait disabled:opacity-40 disabled:hover:border-paper/20 disabled:hover:text-paper"
            >
              « {q} »
            </button>
          ))}
        </div>
        <p className="mt-2 text-[13px] text-paper/50">
          Le vendeur réfléchit quelques secondes avant de répondre.
        </p>

        <div className="mt-5 overflow-hidden rounded-2xl border border-paper/15 bg-[#15121d]">
          <div className="flex items-center gap-3 border-b border-paper/10 px-3 py-2.5 sm:px-4">
            <span className="hidden shrink-0 gap-1.5 sm:flex" aria-hidden="true">
              <span className="h-2.5 w-2.5 rounded-full bg-paper/15" />
              <span className="h-2.5 w-2.5 rounded-full bg-paper/15" />
              <span className="h-2.5 w-2.5 rounded-full bg-paper/15" />
            </span>
            <span className="min-w-0 flex-1 truncate rounded-md bg-paper/[0.06] px-3 py-1.5 font-mono text-[11px] text-paper/60">
              {host}
              {pageUrl}
            </span>
            <a
              href={pageUrl}
              target="_blank"
              rel="noopener"
              className="shrink-0 font-mono text-[11px] uppercase tracking-[0.18em] text-paper/70 transition hover:text-acid"
            >
              Plein écran ↗
            </a>
          </div>

          <div className="relative h-[640px] md:h-[720px]">
            {SHOPS.map(s => {
              const selected = s.key === active;
              return (
                <div
                  key={s.key}
                  id={`panel-${s.key}`}
                  role="tabpanel"
                  aria-labelledby={`tab-${s.key}`}
                  className={`absolute inset-0 transition-opacity duration-200 motion-reduce:transition-none ${
                    selected ? 'visible opacity-100' : 'pointer-events-none invisible opacity-0'
                  }`}
                >
                  <div className="absolute inset-0 grid place-items-center font-mono text-[11px] uppercase tracking-[0.2em] text-paper/35">
                    Chargement de la boutique…
                  </div>
                  {mounted.includes(s.key) && (
                    <iframe
                      ref={el => {
                        frames.current[s.key] = el;
                      }}
                      src={`${BASE}${s.file}`}
                      title={s.frameTitle}
                      onLoad={() => watch(s.key)}
                      className="relative block h-full w-full border-0"
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 font-mono text-[11px] text-paper/50">
          <span>Repris de la page : {shop.reads}</span>
          <span aria-live="polite" className={status[active] === 'error' ? 'text-acid' : undefined}>
            {STATUS_LABEL[status[active]]}
          </span>
        </div>

        <Install shop={shop} />
      </div>
    </div>
  );
}

const INSTALL_POINTS: readonly { title: string; text: string }[] = [
  {
    title: 'Une ligne avant </body>',
    text: "Ou l'extension WooCommerce, qui la pose pour vous.",
  },
  {
    title: 'Il se branche sur la recherche existante',
    text: 'Le client tape dans le champ habituel, le vendeur répond juste en dessous.',
  },
  {
    title: 'Il reprend le style de la boutique',
    text: "Fond, texte, police, arrondis, couleur du bouton. Et si besoin, tout se règle dans l'admin.",
  },
];

function Install({ shop }: { shop: Shop }) {

  return (
    <section aria-labelledby="install-title" className="mt-16 border-t border-paper/10 pt-10">
      <h2 id="install-title" className="font-display text-[clamp(24px,2.6vw,34px)] font-normal tracking-tightest text-paper">
        Comment ça s'installe
      </h2>

      <pre className="mt-5 whitespace-pre-wrap rounded-xl border border-paper/10 bg-paper/[0.04] p-4 font-mono text-[12px] leading-relaxed text-paper [overflow-wrap:anywhere] sm:text-[13px]">
        <code>
          <span className="text-paper/45">&lt;</span>
          <span className="text-toxic-200">script</span>{' '}
          <Attr name="src" value={SDK_URL} />{' '}
          <span className="text-acid">data-shimmer</span>{' '}
          <Attr name="data-store" value={String(shop.storeId)} />{' '}
          <Attr name="data-key" value="pk_…" />{' '}
          <span className="text-acid">defer</span>
          <span className="text-paper/45">&gt;&lt;/</span>
          <span className="text-toxic-200">script</span>
          <span className="text-paper/45">&gt;</span>
        </code>
      </pre>
      <p className="mt-2 font-mono text-[11px] text-paper/45">
        {shop.key === 'refonte'
          ? "Même ligne qu'avant la refonte : rien n'a été retouché côté Shimmer."
          : `Ligne de ${shop.name}, clé publique raccourcie.`}
      </p>

      <ol className="mt-8 grid gap-6 md:grid-cols-3 md:gap-8">
        {INSTALL_POINTS.map((p, i) => (
          <li key={p.title} className="border-t border-paper/15 pt-4">
            <span className="font-mono text-[11px] tracking-[0.2em] text-acid">0{i + 1}</span>
            <p className="mt-2 font-display text-lg leading-snug text-paper">{p.title}</p>
            <p className="mt-1.5 text-sm leading-relaxed text-paper/65">{p.text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Attr({ name, value }: { name: string; value: string }) {
  return (
    <>
      <span className="text-acid">{name}</span>
      <span className="text-paper/45">=&quot;</span>
      <span className="text-paper">{value}</span>
      <span className="text-paper/45">&quot;</span>
    </>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-paper/10 bg-ink/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1480px] items-center justify-between gap-4 px-4 py-4 sm:px-6 md:px-12">
        <div className="flex items-center gap-4">
          <a href="/shimmer/" className="font-display text-xl font-medium tracking-tight text-paper">
            Shimmer<span className="text-acid">.</span>
          </a>
          <span className="hidden font-mono text-[11px] uppercase tracking-[0.22em] text-paper/45 md:inline">
            / démos / boutiques
          </span>
        </div>
        <a
          href="/shimmer/demo/"
          className="inline-flex items-center gap-2 rounded-full border border-paper/20 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-paper transition hover:bg-paper/10"
        >
          ← Toutes les démos
        </a>
      </div>
    </header>
  );
}
