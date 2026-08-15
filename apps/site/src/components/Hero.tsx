'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import { ToxicCanvas } from './ToxicCanvas';

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });

  const orbScale = useTransform(scrollYProgress, [0, 1], [1, 1.18]);
  const orbY = useTransform(scrollYProgress, [0, 1], ['0%', '12%']);
  const orbOpacity = useTransform(scrollYProgress, [0, 0.85, 1], [1, 0.5, 0]);
  const titleY = useTransform(scrollYProgress, [0, 1], [0, -160]);
  const titleOpacity = useTransform(scrollYProgress, [0, 0.85], [1, 0]);
  const captionY = useTransform(scrollYProgress, [0, 1], [0, 100]);

  return (
    <section
      ref={ref}
      className="relative min-h-screen w-full overflow-hidden bg-paper text-ink"
    >
      <Nav />

      <motion.div
        style={{ scale: orbScale, y: orbY, opacity: orbOpacity }}
        className="pointer-events-none absolute -right-40 top-0 z-0 h-[95vmin] w-[95vmin] md:-right-24 md:-top-12"
      >
        <div className="relative h-full w-full">
          <div className="absolute inset-0 rounded-full bg-ink shadow-[0_60px_120px_-30px_rgba(106,43,245,0.4)]">
            <ToxicCanvas className="h-full w-full rounded-full" />
          </div>
          <div className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-inset ring-white/5" />
        </div>
      </motion.div>

      {/* Soft paper veil to keep title legible over orb edges */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-[5] w-[78%] bg-gradient-to-r from-paper via-paper/85 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[5] h-[40%] bg-gradient-to-t from-paper via-paper/70 to-transparent" />

      <div className="relative z-10 mx-auto grid min-h-screen max-w-[1480px] grid-cols-12 gap-x-6 px-6 pt-28 pb-16 md:px-12">
        <motion.div
          style={{ y: titleY, opacity: titleOpacity }}
          className="col-span-12 flex flex-col justify-center lg:col-span-8"
        >
          <div className="mb-10 inline-flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.24em] text-ink-mute">
            <motion.span
              animate={{ opacity: [0.6, 1, 0.6], scale: [1, 1.15, 1] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
              className="h-1.5 w-1.5 rounded-full bg-toxic-500 shadow-[0_0_12px_rgba(106,43,245,0.85)]"
            />
            Vendeur IA · v0.4 · Cross-sell narratif
          </div>

          <h1 className="font-display text-balance text-[clamp(56px,10vw,160px)] font-normal leading-[0.88] tracking-tightest">
            Un vendeur qui{' '}
            <span className="italic text-toxic-600">parle</span>,
            <br />
            pas un moteur qui{' '}
            <span className="italic text-toxic-600">devine</span>.
          </h1>

          <p className="mt-12 max-w-[52ch] text-pretty font-sans text-lg leading-relaxed text-ink-soft md:text-xl">
            Shimmer comprend l'intention, qualifie en une question, recommande le bon produit,
            puis enchaîne avec un cross-sell justifié.{' '}
            <span className="text-ink">Chaque euro est mesuré.</span>
          </p>

          <div className="mt-14 flex flex-wrap items-center gap-4">
            <a
              href="/shimmer/cross-sell-demo.html"
              className="group inline-flex items-center gap-2 rounded-full bg-ink px-7 py-4 font-sans text-sm uppercase tracking-[0.18em] text-paper transition hover:bg-toxic-600"
            >
              Voir la démo
              <span className="transition group-hover:translate-x-1">→</span>
            </a>
            <a
              href="/shimmer/cross-sell-dashboard.html"
              className="inline-flex items-center gap-2 rounded-full border border-ink/25 px-7 py-4 font-sans text-sm uppercase tracking-[0.18em] text-ink transition hover:border-ink"
            >
              Dashboard
            </a>
            <a
              href="#vendeur"
              className="ml-auto hidden font-mono text-[11px] uppercase tracking-[0.24em] text-ink-mute hover:text-ink md:inline-flex"
            >
              Découvrir ↓
            </a>
          </div>
        </motion.div>

        <motion.div
          style={{ y: captionY }}
          className="col-span-12 mt-20 grid grid-cols-2 gap-6 md:grid-cols-4 lg:mt-32"
        >
          <Stat label="Intention comprise" value="3 niveaux" />
          <Stat label="Cross-sell" value="6 picks / produit" />
          <Stat label="Attribution" value="€ mesuré" />
          <Stat label="Intégration" value="30 minutes" />
        </motion.div>
      </div>

      <ScrollCue />
    </section>
  );
}

function Nav() {
  return (
    <header className="absolute left-0 right-0 top-0 z-40 px-6 py-6 md:px-12">
      <div className="mx-auto flex max-w-[1480px] items-center justify-between">
        <a href="#" className="font-display text-xl font-medium tracking-tight">
          Shimmer<span className="text-toxic-600">.</span>
        </a>
        <nav className="hidden gap-8 md:flex">
          <a href="#vendeur" className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-mute transition hover:text-ink">Vendeur</a>
          <a href="#crosssell" className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-mute transition hover:text-ink">Cross-sell</a>
          <a href="#attribution" className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-mute transition hover:text-ink">Attribution</a>
          <a href="/shimmer/showcase/" className="font-mono text-[11px] uppercase tracking-[0.2em] text-toxic-600 transition hover:text-ink">Galerie</a>
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          <a
            href="/shimmer/dark/"
            className="inline-flex items-center gap-2 rounded-full border border-ink/25 px-3 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-ink transition hover:bg-ink hover:text-paper"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-toxic-500" />
            Dark
          </a>
          <a
            href="/shimmer/mono/"
            className="inline-flex items-center gap-2 rounded-full border border-ink/25 px-3 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-ink transition hover:bg-ink hover:text-paper"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Mono
          </a>
          <a
            href="/shimmer/brut/"
            className="inline-flex items-center gap-2 rounded-full border border-ink/25 px-3 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-ink transition hover:bg-ink hover:text-paper"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-acid" />
            Brut
          </a>
          <a
            href="/shimmer/docs.html"
            className="inline-flex rounded-full border border-ink/25 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.18em] transition hover:border-ink"
          >
            API
          </a>
        </div>
      </div>
    </header>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-t border-ink/15 pt-4">
      <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-ink-mute">{label}</div>
      <div className="mt-2 font-display text-xl tracking-editorial md:text-2xl">{value}</div>
    </div>
  );
}

function ScrollCue() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1, duration: 0.8 }}
      className="absolute bottom-8 left-1/2 z-30 hidden -translate-x-1/2 font-mono text-[10px] uppercase tracking-[0.24em] text-ink-mute md:block"
    >
      <div className="flex flex-col items-center gap-3">
        <span>Scroll</span>
        <motion.span
          className="block h-12 w-px origin-top bg-ink-mute"
          animate={{ scaleY: [0.2, 1, 0.2] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>
    </motion.div>
  );
}
