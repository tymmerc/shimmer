'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';

export function BrutHero() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const rotate = useTransform(scrollYProgress, [0, 1], [0, -8]);
  const titleY = useTransform(scrollYProgress, [0, 1], [0, -180]);

  return (
    <section ref={ref} className="relative min-h-screen w-full overflow-hidden bg-acid">
      {/* Header */}
      <header className="relative z-30 flex items-center justify-between border-b-[3px] border-ink bg-acid px-6 py-4 md:px-12">
        <a href="#" className="text-2xl font-black uppercase tracking-tighter text-ink">SHIMMER</a>
        <div className="flex items-center gap-2">
          <a href="/shimmer/" className="rounded-none border-2 border-ink bg-paper px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-ink transition hover:bg-ink hover:text-acid">LIGHT</a>
          <a href="/shimmer/dark/" className="rounded-none border-2 border-ink bg-paper px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-ink transition hover:bg-ink hover:text-acid">DARK</a>
          <a href="/shimmer/mono/" className="rounded-none border-2 border-ink bg-paper px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-ink transition hover:bg-ink hover:text-acid">MONO</a>
          <span className="rounded-none border-2 border-ink bg-ink px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-acid">BRUT</span>
        </div>
      </header>

      <motion.div
        style={{ y: titleY }}
        className="relative z-10 mx-auto max-w-[1480px] px-6 pt-20 pb-32 md:px-12 md:pt-32"
      >
        <h1 className="font-sans text-[clamp(80px,16vw,260px)] font-black uppercase leading-[0.85] tracking-[-0.045em] text-ink">
          VENDEUR.
          <br />
          CROSS-SELL.
          <br />
          <span className="bg-ink px-3 py-1 text-acid">ATTRIBUÉ.</span>
        </h1>

        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="border-[3px] border-ink bg-paper p-6">
            <div className="text-xs font-bold uppercase tracking-widest text-ink">01</div>
            <div className="mt-2 text-2xl font-bold uppercase leading-tight">Il comprend</div>
            <div className="mt-2 text-sm">le client tape flou, on cerne en une question.</div>
          </div>
          <div className="border-[3px] border-ink bg-ink p-6 text-acid">
            <div className="text-xs font-bold uppercase tracking-widest">02</div>
            <div className="mt-2 text-2xl font-bold uppercase leading-tight">Il propose</div>
            <div className="mt-2 text-sm opacity-90">le bon produit + 6 picks justifiés.</div>
          </div>
          <div className="border-[3px] border-ink bg-paper p-6">
            <div className="text-xs font-bold uppercase tracking-widest text-ink">03</div>
            <div className="mt-2 text-2xl font-bold uppercase leading-tight">Il compte</div>
            <div className="mt-2 text-sm">chaque euro rattaché au pick qui l'a déclenché.</div>
          </div>
        </div>

        <motion.div
          style={{ rotate }}
          className="mt-16 inline-block bg-ink px-8 py-3 font-black uppercase tracking-[0.15em] text-acid"
        >
          ★ 30 MIN POUR BRANCHER ★ 1 VUE POUR MESURER ★ 28 KB ★
        </motion.div>
      </motion.div>

      <div className="absolute bottom-0 left-0 right-0 z-20 border-t-[3px] border-ink bg-paper px-6 py-3 font-mono text-xs uppercase tracking-widest md:px-12">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <span>SHIMMER · VENDEUR IA · V0.4.0 · LIVE</span>
          <span className="hidden md:block">2026 · TYM MERCIER</span>
        </div>
      </div>
    </section>
  );
}
