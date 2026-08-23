'use client';

import { motion } from 'framer-motion';

const ease = [0.25, 0.4, 0.25, 1] as const;

// Champ de visiteurs : 40 points, 4 en témoin (10 %).
const DOTS = 40;
const CONTROL = new Set([7, 16, 25, 34]);
const REF_PCT = 80;
const ACID_PCT = 14.5;

/**
 * La preuve, v3 : header centré, une carte unique. Le holdout (visuel déjà
 * validé) reste, le texte se resserre sur l'essentiel : 10 % ne voient jamais
 * Shimmer, on ne facture au résultat que l'écart mesuré.
 */
export function V3Proof() {
  return (
    <section id="preuve" className="relative z-10 w-full scroll-mt-16 px-6 py-24 md:py-32">
      <div className="mx-auto max-w-4xl">
        <div className="mx-auto mb-12 max-w-2xl text-center md:mb-16">
          <h2 className="text-balance font-sans text-3xl font-semibold tracking-tight text-paper md:text-5xl">
            On prouve, à l&apos;euro, ce que ça rapporte.
          </h2>
          <p className="mt-4 text-pretty text-base text-paper/60 md:text-lg">
            10 % de vos visiteurs ne voient jamais Shimmer. On compare ce qu&apos;ils achètent
            aux autres : l&apos;écart, c&apos;est notre effet réel — mesuré sur vos commandes, pas estimé.
          </p>
        </div>

        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.3 }}
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.012 } } }}
          className="mx-auto max-w-2xl rounded-2xl border border-paper/10 bg-paper/[0.03] p-6 sm:p-8"
        >
          <div className="mb-6 text-[12px] font-medium uppercase tracking-[0.14em] text-paper/40">
            Exemple · boutique de démonstration
          </div>

          <div className="grid grid-cols-10 gap-2.5">
            {Array.from({ length: DOTS }).map((_, i) => {
              const control = CONTROL.has(i);
              return (
                <motion.span
                  key={i}
                  variants={{ hidden: { opacity: 0, scale: 0.3 }, show: { opacity: 1, scale: 1 } }}
                  transition={{ duration: 0.3, ease }}
                  className={
                    control
                      ? 'aspect-square rounded-full border-[1.5px] border-amber-300/80 bg-transparent'
                      : 'aspect-square rounded-full bg-toxic-300/70'
                  }
                />
              );
            })}
          </div>
          <div className="mt-4 flex items-center gap-5 text-[13px] text-paper/50">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full border-[1.5px] border-amber-300/80" /> 10 % en témoin
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-toxic-300/70" /> exposés à Shimmer
            </span>
          </div>

          <div className="mt-8 space-y-5">
            <div>
              <div className="mb-2 text-[13px] text-paper/55">Groupe témoin · sans Shimmer</div>
              <div className="h-3 overflow-hidden rounded-full bg-paper/10">
                <motion.div
                  variants={{ hidden: { width: 0 }, show: { width: `${REF_PCT}%` } }}
                  transition={{ duration: 0.9, ease }}
                  className="h-full rounded-full bg-paper/35"
                />
              </div>
            </div>
            <div>
              <div className="mb-2 text-[13px] text-paper/55">Groupe Shimmer</div>
              <div className="relative h-3 rounded-full bg-paper/10">
                <motion.div
                  variants={{ hidden: { width: 0 }, show: { width: `${REF_PCT}%` } }}
                  transition={{ duration: 0.9, ease }}
                  className="absolute inset-y-0 left-0 rounded-l-full bg-paper/35"
                />
                <motion.div
                  variants={{ hidden: { width: 0 }, show: { width: `${ACID_PCT}%` } }}
                  transition={{ duration: 0.7, ease, delay: 0.9 }}
                  style={{ left: `${REF_PCT}%` }}
                  className="absolute inset-y-0 rounded-r-full bg-acid shadow-[0_0_22px_rgba(212,255,58,0.5)]"
                />
                <div
                  style={{ left: `${REF_PCT}%` }}
                  className="absolute -top-1.5 bottom-[-6px] w-px bg-paper/40"
                />
              </div>
            </div>
          </div>

          <motion.div
            variants={{ hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0 } }}
            transition={{ duration: 0.5, delay: 0.7 }}
            className="mt-7 border-t border-paper/10 pt-6"
          >
            <div className="flex items-baseline gap-3">
              <span className="font-sans text-4xl font-semibold tracking-tight text-acid">+18 %</span>
              <span className="font-sans text-lg font-medium text-paper">de chiffre d&apos;affaires</span>
            </div>
            <p className="mt-2 text-pretty text-sm leading-relaxed text-paper/60">
              mesuré contre le groupe témoin. La part qu&apos;on facture au résultat ne porte que sur
              cet écart prouvé — pas d&apos;écart, pas de part.
            </p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
