'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import { ToxicCanvas } from './ToxicCanvas';

export function Epilogue() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end end'] });
  const orbScale = useTransform(scrollYProgress, [0, 1], [0.6, 1.3]);
  const orbOpacity = useTransform(scrollYProgress, [0, 0.7], [0, 0.45]);

  return (
    <section ref={ref} className="relative w-full overflow-hidden bg-paper py-32 md:py-48">
      <motion.div
        style={{ scale: orbScale, opacity: orbOpacity }}
        className="pointer-events-none absolute inset-0 -z-0 flex items-center justify-center"
      >
        <div className="aspect-square h-[120vmin] rounded-full">
          <ToxicCanvas className="h-full w-full rounded-full opacity-90" />
        </div>
      </motion.div>

      <div className="relative z-10 mx-auto max-w-[1440px] px-6 text-center md:px-12">
        <span className="inline-block font-mono text-[11px] uppercase tracking-[0.24em] text-toxic-600">
          Prêt à intégrer
        </span>
        <h2 className="mx-auto mt-8 max-w-[22ch] font-display text-balance text-[clamp(56px,9vw,160px)] font-normal leading-[0.9] tracking-tightest">
          30 minutes pour brancher.
          <br />
          <span className="italic text-toxic-600">Quelques jours</span> pour mesurer.
        </h2>
        <p className="mx-auto mt-10 max-w-[58ch] text-pretty text-lg leading-relaxed text-ink-soft">
          Un script à coller, une clé API, votre catalogue importé. L'attribution démarre à la première vue.
          Vous savez quel pick rapporte, quel rôle convertit, quel vertical performe.
        </p>

        <div className="mt-14 flex flex-wrap items-center justify-center gap-4">
          <a
            href="/shimmer/cross-sell-demo.html"
            className="group inline-flex items-center gap-2 rounded-full bg-ink px-8 py-5 font-sans text-sm uppercase tracking-[0.18em] text-paper transition hover:bg-toxic-600"
          >
            Voir la démo
            <span className="transition group-hover:translate-x-1">→</span>
          </a>
          <a
            href="/shimmer/cross-sell-dashboard.html"
            className="inline-flex items-center gap-2 rounded-full border border-ink px-8 py-5 font-sans text-sm uppercase tracking-[0.18em] text-ink transition hover:bg-ink hover:text-paper"
          >
            Le dashboard
          </a>
          <a
            href="/shimmer/docs.html"
            className="inline-flex items-center gap-2 rounded-full border border-ink/20 px-8 py-5 font-sans text-sm uppercase tracking-[0.18em] text-ink transition hover:border-ink"
          >
            API
          </a>
        </div>
      </div>

      <Footer />
    </section>
  );
}

function Footer() {
  return (
    <footer className="relative z-10 mt-32 border-t border-ink/15 px-6 pt-8 md:px-12">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-4 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-mute">
        <div>Shimmer · vendeur IA · v0.4 · 2026</div>
        <div className="flex flex-wrap gap-6">
          <a href="/shimmer/dark/" className="hover:text-ink">Variante dark</a>
          <a href="/shimmer/docs.html" className="hover:text-ink">API</a>
          <a href="/shimmer/cross-sell-admin.html" className="hover:text-ink">Admin</a>
          <a href="mailto:tym.mercier@gmail.com" className="hover:text-ink">Contact</a>
        </div>
      </div>
    </footer>
  );
}
