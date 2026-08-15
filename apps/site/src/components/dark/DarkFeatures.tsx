'use client';

// Les capacités : section pinnée. UNE famille à la fois, en grand, le scroll
// pilote le passage d'une carte à l'autre (scrub temps réel, pas de trigger).
// Sur mobile (< lg) : liste à plat, pas de pinning, rien de coupé.

import { motion, useScroll, useTransform, useMotionValueEvent, type MotionValue } from 'framer-motion';
import { useRef, useState } from 'react';
import { families, type Family } from './featuresData';
import { FamilyVisual } from './FamilyVisual';

const N = families.length;

export function DarkFeatures() {
  return (
    <section id="capacites" className="relative w-full scroll-mt-16 border-t border-paper/10 bg-ink">
      <div className="mx-auto max-w-[1480px] px-6 pt-24 md:px-12 md:pt-36">
        <div className="mb-12 flex items-baseline gap-6">
          <span className="font-mono text-[11px] uppercase tracking-[0.24em] text-acid">
            Les capacités
          </span>
          <span className="h-px flex-1 bg-paper/10" />
        </div>

        <h2 className="mb-8 max-w-[26ch] font-display text-balance text-[clamp(36px,5.5vw,88px)] font-normal leading-[0.95] tracking-tightest text-paper">
          Six familles de capacités,{' '}
          <span className="italic text-acid">un seul cerveau</span>.
        </h2>
        <p className="copy max-w-[52ch] text-pretty text-lg leading-relaxed text-paper/70 md:text-xl">
          Vendre, récupérer, servir, fidéliser, diffuser, mesurer.
          Six rôles qui partagent les mêmes données. Faites défiler, on les passe en revue une par une.
        </p>
      </div>

      <PinnedDeck />
      <FlatList />
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Desktop : deck pinné, le scroll fait avancer les cartes.            */
/* ------------------------------------------------------------------ */

function PinnedDeck() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const [active, setActive] = useState(0);

  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    const idx = Math.min(N - 1, Math.max(0, Math.floor(v * N)));
    if (idx !== active) setActive(idx);
  });

  const jumpTo = (i: number) => {
    const el = ref.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    const scrollable = el.offsetHeight - window.innerHeight;
    window.scrollTo({ top: top + ((i + 0.5) / N) * scrollable, behavior: 'smooth' });
  };

  // data-scrub-pin : navigation par pas gérée par SmoothScroll (un geste de
  // scroll = une carte, jamais d'arrêt entre deux cartes).
  return (
    <div
      ref={ref}
      data-scrub-pin
      data-scrub-segments={N}
      className="relative hidden lg:block"
      style={{ height: `${N * 100}vh` }}
    >
      <div className="sticky top-0 flex h-screen items-center overflow-hidden">
        <div className="mx-auto grid w-full max-w-[1480px] grid-cols-12 gap-x-10 px-6 md:px-12">
          {/* Rail gauche : où on en est, où on va */}
          <div className="col-span-3 flex flex-col justify-center">
            {/* Compteur + progression sur la même ligne (plus de segment
                vertical orphelin sous la nav). La barre reflète l'index
                discret de la carte, animée à chaque pas. */}
            <div className="flex items-center gap-4">
              <div className="shrink-0 font-mono text-[11px] uppercase tracking-[0.24em] text-paper/45">
                <span className="text-acid">{String(active + 1).padStart(2, '0')}</span> / {String(N).padStart(2, '0')}
              </div>
              <div className="h-[2px] flex-1 overflow-hidden rounded-full bg-paper/10">
                <div
                  style={{ transform: `scaleX(${(active + 1) / N})`, transformOrigin: 'left' }}
                  className="h-full w-full bg-acid transition-transform duration-500 ease-out"
                />
              </div>
            </div>
            <nav className="mt-8 space-y-1" aria-label="Familles de capacités">
              {families.map((f, i) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => jumpTo(i)}
                  className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors duration-200 ${
                    i === active ? 'bg-paper/[0.05]' : 'hover:bg-paper/[0.03]'
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 shrink-0 rounded-full transition-all duration-200 ${
                      i === active ? 'scale-125 bg-acid shadow-[0_0_10px_rgba(212,255,58,0.8)]' : 'bg-paper/25'
                    }`}
                  />
                  <span
                    className={`font-display text-xl tracking-editorial transition-colors duration-200 ${
                      i === active ? 'text-paper' : 'text-paper/40 group-hover:text-paper/70'
                    }`}
                  >
                    {f.label}
                  </span>
                </button>
              ))}
            </nav>
          </div>

          {/* Cartes empilées, une seule lisible à la fois */}
          <div className="relative col-span-9 flex h-[76vh] items-center">
            {families.map((f, i) => (
              <DeckCard key={f.key} family={f} i={i} progress={scrollYProgress} isActive={i === active} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function DeckCard({
  family,
  i,
  progress,
  isActive,
}: {
  family: Family;
  i: number;
  progress: MotionValue<number>;
  isActive: boolean;
}) {
  const seg = 1 / N;
  const start = i * seg;
  const end = (i + 1) * seg;
  // Crossfade chevauchant, court et raide, centré sur chaque frontière : la
  // carte sortante descend à 0.7 pile à la frontière pendant que l'entrante y
  // arrive déjà à 0.7. À TOUTE position de scroll, max(opacités) >= 0.7 :
  // impossible de s'arrêter devant un écran quasi vide.
  const w = seg * 0.09; // demi-fenêtre du crossfade (zone totale : 0.18 segment)

  const range =
    i === 0 ? [start, end - w, end, end + w]
    : i === N - 1 ? [start - w, start, start + w, end]
    : [start - w, start, start + w, end - w, end, end + w];

  const opacity = useTransform(
    progress,
    range,
    i === 0 ? [1, 1, 0.7, 0] : i === N - 1 ? [0, 0.7, 1, 1] : [0, 0.7, 1, 1, 0.7, 0],
  );
  const y = useTransform(
    progress,
    range,
    i === 0 ? [0, 0, -21, -70] : i === N - 1 ? [70, 21, 0, 0] : [70, 21, 0, 0, -21, -70],
  );
  const scale = useTransform(
    progress,
    range,
    i === 0 ? [1, 1, 0.991, 0.97] : i === N - 1 ? [0.97, 0.991, 1, 1] : [0.97, 0.991, 1, 1, 0.991, 0.97],
  );

  return (
    <motion.article
      style={{ opacity, y, scale }}
      aria-hidden={!isActive}
      className={`absolute inset-0 flex items-center ${isActive ? '' : 'pointer-events-none'}`}
    >
      {/* hshort:* : sur les écrans peu hauts, la carte se compacte. Elle est
          pinnée : scroller change de carte au lieu de révéler la suite, donc
          tout son contenu doit tenir dans le viewport. */}
      <div className="grid w-full grid-cols-12 items-center gap-x-10 rounded-3xl border border-paper/10 bg-paper/[0.03] p-10 hshort:p-6 xl:p-14">
        <div className="col-span-7">
          <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-acid">{family.label}</div>
          <h3 className="mt-4 font-display text-balance text-[clamp(28px,3.4vw,52px)] font-normal leading-[1.02] tracking-editorial text-paper hshort:mt-2 hshort:text-[clamp(22px,2.5vw,34px)]">
            {family.headline}
          </h3>
          <div className="mt-8 space-y-6 hshort:mt-4 hshort:space-y-3">
            {family.capabilities.map((c) => (
              <div key={c.title} className="border-t border-paper/10 pt-5 hshort:pt-3">
                <div className="font-display text-xl text-paper hshort:text-base xl:text-2xl">{c.title}</div>
                <p className="copy mt-2 max-w-[52ch] text-base leading-relaxed text-paper/70 hshort:mt-1 hshort:text-sm hshort:leading-snug xl:text-lg">
                  {c.detail}
                </p>
              </div>
            ))}
          </div>
        </div>
        <div className="col-span-5">
          <FamilyVisual k={family.key} />
        </div>
      </div>
    </motion.article>
  );
}

/* ------------------------------------------------------------------ */
/* Mobile / tablette : à plat, gros texte, rien de pinné ni coupé.     */
/* ------------------------------------------------------------------ */

function FlatList() {
  return (
    <div className="mx-auto max-w-[1480px] space-y-14 px-6 pb-24 pt-14 lg:hidden">
      {families.map((f, i) => (
        <article key={f.key} className="rounded-3xl border border-paper/10 bg-paper/[0.03] p-6 sm:p-8">
          <div className="flex items-baseline justify-between">
            <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-acid">{f.label}</div>
            <div className="font-mono text-[11px] text-paper/40">
              {String(i + 1).padStart(2, '0')} / {String(N).padStart(2, '0')}
            </div>
          </div>
          <h3 className="mt-4 font-display text-balance text-3xl leading-tight tracking-editorial text-paper">
            {f.headline}
          </h3>
          <div className="mt-6">
            <FamilyVisual k={f.key} />
          </div>
          <div className="mt-6 space-y-5">
            {f.capabilities.map((c) => (
              <div key={c.title} className="border-t border-paper/10 pt-4">
                <div className="font-display text-lg text-paper">{c.title}</div>
                <p className="copy mt-2 text-base leading-relaxed text-paper/70">{c.detail}</p>
              </div>
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}
