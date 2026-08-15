'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';

export function MonoHero() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const titleY = useTransform(scrollYProgress, [0, 1], [0, -160]);
  const gridOpacity = useTransform(scrollYProgress, [0, 1], [1, 0.2]);

  return (
    <section ref={ref} className="relative min-h-screen w-full overflow-hidden">
      <motion.div
        style={{ opacity: gridOpacity }}
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:48px_48px]"
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(106,43,245,0.25),transparent_60%),radial-gradient(ellipse_at_70%_80%,rgba(106,43,245,0.18),transparent_55%)]" />

      <header className="relative z-20 flex items-center justify-between border-b border-white/5 px-6 py-4 md:px-12">
        <div className="flex items-center gap-3">
          <span className="text-base font-medium tracking-tight text-zinc-100">~/shimmer</span>
          <span className="rounded border border-white/10 px-1.5 py-0.5 text-[10px] text-zinc-500">v0.4.0</span>
        </div>
        <nav className="hidden gap-6 text-xs uppercase tracking-[0.18em] text-zinc-500 md:flex">
          <a href="#modules" className="hover:text-zinc-100">modules</a>
          <a href="#metrics" className="hover:text-zinc-100">metrics</a>
          <a href="#install" className="hover:text-zinc-100">install</a>
        </nav>
        <div className="flex items-center gap-2">
          <a href="/shimmer/" className="hidden rounded border border-white/10 px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-zinc-300 transition hover:border-white/30 md:inline-flex">Light</a>
          <a href="/shimmer/dark/" className="hidden rounded border border-white/10 px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-zinc-300 transition hover:border-white/30 md:inline-flex">Dark</a>
          <a href="/shimmer/brut/" className="hidden rounded border border-white/10 px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-zinc-300 transition hover:border-white/30 md:inline-flex">Brut</a>
          <a href="/shimmer/docs.html" className="rounded border border-white/10 px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-zinc-300 transition hover:border-white/30">API</a>
        </div>
      </header>

      <motion.div
        style={{ y: titleY }}
        className="relative z-10 mx-auto flex min-h-[calc(100vh-65px)] max-w-[1280px] flex-col justify-center px-6 py-16 md:px-12"
      >
        <div className="mb-8 inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-zinc-400 backdrop-blur-sm">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
          status · operational
        </div>

        <h1 className="max-w-[24ch] text-[clamp(40px,7vw,108px)] font-medium leading-[1.0] tracking-tight text-zinc-100">
          A conversational sales agent
          <span className="text-zinc-500"> with measurable attribution.</span>
        </h1>

        <p className="mt-8 max-w-[58ch] text-base leading-relaxed text-zinc-400 md:text-lg">
          Shimmer parses intent, qualifies in one question, recommends, narrates cross-sell, and rattaches
          every euro back to the pick that triggered it. <span className="text-zinc-200">Drop-in SDK, 28kb gzip.</span>
        </p>

        <div className="mt-10 flex flex-wrap items-center gap-3">
          <a
            href="/shimmer/cross-sell-demo.html"
            className="group inline-flex items-center gap-2 rounded-md bg-zinc-100 px-5 py-3 text-xs uppercase tracking-[0.18em] text-zinc-900 transition hover:bg-white"
          >
            Voir la démo
            <span className="transition group-hover:translate-x-1">→</span>
          </a>
          <a
            href="#install"
            className="inline-flex items-center gap-2 rounded-md border border-white/15 px-5 py-3 text-xs uppercase tracking-[0.18em] text-zinc-200 transition hover:bg-white/5"
          >
            $ install
          </a>
        </div>

        <div className="mt-16 grid grid-cols-2 gap-x-8 gap-y-6 border-t border-white/5 pt-8 md:grid-cols-4">
          <Stat k="ca attribué (30d)" v="28 640€" tone="violet" />
          <Stat k="take-rate" v="15,4%" />
          <Stat k="picks / produit" v="6" />
          <Stat k="sdk" v="28 KB" />
        </div>
      </motion.div>
    </section>
  );
}

function Stat({ k, v, tone }: { k: string; v: string; tone?: 'violet' }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">{k}</div>
      <div className={`mt-1 text-2xl tracking-tight ${tone === 'violet' ? 'text-toxic-300' : 'text-zinc-100'}`}>{v}</div>
    </div>
  );
}
