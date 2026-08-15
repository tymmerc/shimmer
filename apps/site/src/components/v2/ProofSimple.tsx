'use client';

import { motion } from 'framer-motion';

const ease = [0.22, 1, 0.36, 1] as const;

// Champ de visiteurs : 40 points, 4 en témoin (10%), répartis.
const DOTS = 40;
const CONTROL = new Set([7, 16, 25, 34]);

// Échelle partagée des deux jauges. Témoin = 3,20 €, exposé = 3,78 €.
// La jauge va jusqu'à 4,00 € = 100%. Témoin 80%, exposé 94,5%.
const REF_PCT = 80; // niveau témoin (ligne de référence)
const ACID_PCT = 14.5; // dépassement mesuré (l'écart)

/**
 * La preuve, refaite : on montre le holdout, pas un graphique abstrait.
 * Un champ de visiteurs dont 10% sont tirés en témoin, puis une jauge où le
 * groupe exposé dépasse la ligne « sans Shimmer » ; ce dépassement, en acide,
 * est l'écart mesuré. Chiffres d'exemple, animation à l'apparition.
 * La part facturée AU RÉSULTAT (distincte de l'abonnement) ne porte que sur
 * cet écart prouvé.
 */
export function ProofSimple() {
  return (
    <section id="preuve" className="relative z-10 w-full scroll-mt-16 px-6 py-28 md:px-12 md:py-40">
      <div className="mx-auto max-w-[1400px]">
        <div className="mb-14 flex items-baseline gap-6">
          <span className="font-mono text-[11px] uppercase tracking-[0.24em] text-acid">La preuve</span>
          <span className="h-px flex-1 bg-paper/10" />
        </div>

        <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2 lg:gap-24">
          {/* Texte (inchangé, honnête) */}
          <div>
            <h2 className="max-w-[18ch] font-display text-[clamp(34px,5vw,72px)] font-normal leading-[0.95] tracking-tightest text-paper">
              On prouve, à l&apos;euro, ce que ça vous <span className="italic text-acid">rapporte</span>.
            </h2>
            <p className="mt-8 max-w-[46ch] text-pretty text-lg leading-relaxed text-paper/70 md:text-xl">
              10 % de vos visiteurs ne voient jamais Shimmer. On compare ce qu&apos;ils dépensent à ceux
              qui l&apos;ont vu. La différence, c&apos;est notre effet réel, mesuré sur vos commandes.
              Pas une estimation.
            </p>
            <div className="mt-8 inline-flex flex-col gap-2">
              <span className="inline-flex w-fit items-center gap-2 rounded-full border border-acid/40 bg-acid/10 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-acid">
                <span className="h-1.5 w-1.5 rounded-full bg-acid" />
                Ce surplus est à vous
              </span>
              <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-paper/50">
                La part qu&apos;on facture au résultat ne porte que sur cet écart prouvé.
              </span>
            </div>
          </div>

          {/* Visuel holdout */}
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.4 }}
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.012 } } }}
            className="rounded-2xl border border-paper/12 bg-paper/[0.03] p-7 md:p-9"
          >
            <div className="mb-7 font-mono text-[10px] uppercase tracking-[0.2em] text-paper/40">
              Exemple · boutique de démonstration
            </div>

            {/* Champ de visiteurs, 10% en témoin */}
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
            <div className="mt-4 flex items-center gap-4 font-mono text-[10px] uppercase tracking-[0.16em] text-paper/45">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full border-[1.5px] border-amber-300/80" /> 4 témoins · 10 %
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-toxic-300/70" /> exposés
              </span>
            </div>

            {/* Jauges : ce que chaque groupe a acheté sur la période */}
            <div className="mt-9 space-y-6">
              <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-paper/40">
                Ce qu&apos;ils ont acheté sur le mois
              </div>
              {/* Groupe témoin */}
              <div>
                <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-paper/55">
                  Groupe témoin · sans Shimmer
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-paper/10">
                  <motion.div
                    variants={{ hidden: { width: 0 }, show: { width: `${REF_PCT}%` } }}
                    transition={{ duration: 0.9, ease }}
                    className="h-full rounded-full bg-paper/35"
                  />
                </div>
              </div>

              {/* Groupe Shimmer */}
              <div>
                <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-paper/55">
                  Groupe Shimmer
                </div>
                <div className="relative h-3 rounded-full bg-paper/10">
                  {/* base grise jusqu'au niveau témoin */}
                  <motion.div
                    variants={{ hidden: { width: 0 }, show: { width: `${REF_PCT}%` } }}
                    transition={{ duration: 0.9, ease }}
                    className="absolute inset-y-0 left-0 rounded-l-full bg-paper/35"
                  />
                  {/* dépassement acide = l'écart mesuré */}
                  <motion.div
                    variants={{ hidden: { width: 0 }, show: { width: `${ACID_PCT}%` } }}
                    transition={{ duration: 0.7, ease, delay: 0.9 }}
                    style={{ left: `${REF_PCT}%` }}
                    className="absolute inset-y-0 rounded-r-full bg-acid shadow-[0_0_22px_rgba(212,255,58,0.5)]"
                  />
                  {/* ligne de référence : niveau « sans Shimmer » */}
                  <div
                    style={{ left: `${REF_PCT}%` }}
                    className="absolute -top-1.5 bottom-[-6px] w-px bg-paper/40"
                  />
                </div>
              </div>
            </div>

            {/* L'écart, nommé, en langage marchand */}
            <motion.div
              variants={{ hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0 } }}
              transition={{ duration: 0.5, delay: 1.5 }}
              className="mt-8 border-t border-paper/10 pt-6"
            >
              <div className="flex items-baseline gap-3">
                <span className="font-display text-4xl text-acid md:text-5xl">+18 %</span>
                <span className="font-display text-xl text-paper md:text-2xl">de chiffre d&apos;affaires</span>
              </div>
              <p className="mt-3 text-pretty text-sm leading-snug text-paper/60">
                mesuré contre le groupe témoin. Sur cette boutique de démo, ça fait{' '}
                <span className="text-paper/85">+ 2 400 € sur le mois</span> que vous n&apos;auriez pas eus.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
