'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';

const picks = [
  { role: 'COMPLEMENT', name: 'Filtre HEPA de rechange', price: '29€', reason: 'pour garder l\'aspi performant 12 mois.', tint: 'from-toxic-300 to-toxic-500' },
  { role: 'ACCESSOIRE', name: 'Brosse spéciale tapis', price: '19€', reason: 'utile dès que vous ajoutez un tapis.', tint: 'from-amber-300 to-orange-500' },
  { role: 'PREMIUM', name: 'Silenz Pro Max · 16 kPa', price: '349€', reason: 'l\'option +100€ qui gère gros animaux.', tint: 'from-pink-300 to-rose-500' },
  { role: 'ALTERNATIVE', name: 'Compact Mini · sans fil', price: '199€', reason: 'si vous préférez sans fil pour étages.', tint: 'from-cyan-300 to-teal-500' },
];

export function SectionCrossSell() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const headlineY = useTransform(scrollYProgress, [0, 1], [60, -60]);

  return (
    <section
      id="crosssell"
      ref={ref}
      className="relative w-full overflow-hidden bg-bone py-32 md:py-48"
    >
      <BackgroundGradient />

      <div className="relative mx-auto max-w-[1440px] px-6 md:px-12">
        <div className="mb-16 flex items-baseline gap-6">
          <span className="font-mono text-[11px] uppercase tracking-[0.24em] text-toxic-600">
            02 — Cross-sell narratif
          </span>
          <span className="h-px flex-1 bg-ink/15" />
        </div>

        <motion.h2
          style={{ y: headlineY }}
          className="max-w-[16ch] font-display text-balance text-[clamp(40px,6vw,88px)] font-normal leading-[0.95] tracking-editorial"
        >
          Chaque pick a un{' '}
          <span className="italic text-toxic-600">rôle</span> et une{' '}
          <span className="italic text-toxic-600">raison</span>.
        </motion.h2>

        <div className="mt-16 grid grid-cols-12 gap-x-6 gap-y-16">
          <div className="col-span-12 lg:col-span-4">
            <p className="text-pretty text-lg leading-relaxed text-ink-soft">
              On a tué le grid de cards "vous aimerez aussi". À la place, 4 à 6 picks typés,
              chacun avec une justification rédigée.
            </p>
            <p className="mt-6 text-pretty text-lg leading-relaxed text-ink-soft">
              <span className="text-ink">Algo + LLM, pas LLM-only.</span>{' '}
              Précompute déterministe par store, réécriture LLM optionnelle. Pas d'inférence par requête.
            </p>

            <div className="mt-10 grid grid-cols-2 gap-4">
              <RoleBadge label="Complément" tint="bg-toxic-500/10 text-toxic-700" />
              <RoleBadge label="Accessoire" tint="bg-amber-500/10 text-amber-700" />
              <RoleBadge label="Premium" tint="bg-rose-500/10 text-rose-700" />
              <RoleBadge label="Alternative" tint="bg-teal-500/10 text-teal-700" />
            </div>
          </div>

          <div className="col-span-12 lg:col-span-8">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {picks.map((p, i) => (
                <motion.article
                  key={p.name}
                  initial={{ opacity: 1, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-80px' }}
                  transition={{ delay: i * 0.08, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  className="group relative overflow-hidden rounded-2xl border border-ink/10 bg-paper p-6 transition hover:border-ink/30"
                >
                  <div className={`mb-5 h-28 w-full rounded-xl bg-gradient-to-br ${p.tint} opacity-90 transition group-hover:opacity-100`} />
                  <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">{p.role}</div>
                  <div className="mt-1 font-display text-xl leading-tight">{p.name}</div>
                  <div className="mt-1 font-mono text-sm text-ink-soft">{p.price}</div>
                  <div className="mt-4 border-t border-ink/10 pt-4 text-[15px] italic leading-relaxed text-ink-soft">
                    {p.reason}
                  </div>
                </motion.article>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function RoleBadge({ label, tint }: { label: string; tint: string }) {
  return (
    <div className={`flex items-center justify-center rounded-full px-4 py-2 font-mono text-[10px] uppercase tracking-[0.2em] ${tint}`}>
      {label}
    </div>
  );
}

function BackgroundGradient() {
  return (
    <div className="pointer-events-none absolute inset-0">
      <div className="absolute -left-32 top-1/4 h-[480px] w-[480px] rounded-full bg-toxic-500/[0.06] blur-[80px]" />
      <div className="absolute right-0 bottom-0 h-[600px] w-[600px] rounded-full bg-toxic-300/[0.05] blur-[100px]" />
    </div>
  );
}
