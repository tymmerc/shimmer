'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

const ease = [0.22, 1, 0.36, 1] as const;

const STEPS = [
  {
    n: '01',
    when: 'Jour 0 · 30 min',
    title: 'Audit gratuit',
    text: 'On regarde votre boutique et on chiffre ce qui fuit : recherches sans résultat, paniers sans relance, avis jamais demandés. Sans engagement.',
    final: false,
  },
  {
    n: '02',
    when: 'Jour 1 · 30 min',
    title: 'On branche',
    text: 'Une ligne de code, votre catalogue, votre voix de marque. 30 minutes, et rien à installer de votre côté.',
    final: false,
  },
  {
    n: '03',
    when: 'Du jour 2 au jour 7',
    title: 'Une semaine d\'observation',
    text: 'Le vendeur lit vos vraies recherches sans répondre à personne. Vous relisez ses réponses et donnez le feu vert avant la mise en live.',
    final: false,
  },
  {
    n: '04',
    when: 'Dès le jour 8, en continu',
    title: 'En live, mesuré',
    text: 'Tout tourne. Le tableau de bord compare les visiteurs qui voient Shimmer à ceux qui ne le voient pas, et prouve à l\'euro ce que ça rapporte.',
    final: true,
  },
];

/**
 * Le parcours, en frise : une piste avec quatre jalons (horizontale sur
 * desktop, verticale à gauche sur mobile), une durée par étape, et la
 * dernière étape en acide parce que c'est l'aboutissement. Avant, c'était
 * quatre colonnes identiques, la même grille que la section du dessus :
 * rien ne disait que c'est une séquence dans le temps.
 */
export function HowItWorks() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section id="process" className="relative z-10 w-full scroll-mt-16 px-6 py-16 md:px-12 md:py-40">
      <div className="mx-auto max-w-[1400px]">
        <div className="mb-8 flex items-baseline gap-6 md:mb-14">
          <span className="font-mono text-[11px] uppercase tracking-[0.24em] text-acid">Comment ça se passe</span>
          <span className="h-px flex-1 bg-paper/10" />
        </div>

        <h2 className="mb-10 max-w-[22ch] font-display text-[clamp(30px,5vw,72px)] font-normal leading-[1.02] tracking-tightest text-paper md:mb-16">
          Branché en 30 minutes. <span className="italic text-acid">Prouvé</span> sur vos propres chiffres.
        </h2>

        <div ref={ref} className="relative">
          {/* Piste verticale (mobile, tablette) : le long des jalons, à gauche. */}
          <div className="absolute bottom-4 left-[5px] top-1 w-px overflow-hidden bg-paper/10 lg:hidden">
            <motion.div
              initial={{ scaleY: 0 }}
              animate={inView ? { scaleY: 1 } : { scaleY: 0 }}
              transition={{ duration: 1.4, ease }}
              className="h-full w-full origin-top bg-gradient-to-b from-acid/70 via-acid/35 to-acid"
            />
          </div>
          {/* Piste horizontale (desktop) : en tête des quatre colonnes. */}
          <div className="absolute left-0 right-0 top-0 hidden h-px overflow-hidden bg-paper/10 lg:block">
            <motion.div
              initial={{ scaleX: 0 }}
              animate={inView ? { scaleX: 1 } : { scaleX: 0 }}
              transition={{ duration: 1.4, ease }}
              className="h-full w-full origin-left bg-gradient-to-r from-acid/70 via-acid/35 to-acid"
            />
          </div>

          <div className="grid grid-cols-1 gap-y-10 lg:grid-cols-4 lg:gap-x-10 lg:gap-y-0">
            {STEPS.map((s, i) => (
              <motion.div
                key={s.n}
                initial={{ opacity: 0, y: 16 }}
                animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
                transition={{ duration: 0.6, ease, delay: 0.25 + i * 0.22 }}
                className="relative pl-8 lg:pl-0 lg:pt-9"
              >
                {/* Jalon : creux pour les étapes, plein et lumineux pour l'arrivée. */}
                <span
                  aria-hidden
                  className={`absolute left-0 top-[3px] h-[11px] w-[11px] rounded-full border lg:-top-[5px] ${
                    s.final
                      ? 'border-acid bg-acid shadow-[0_0_18px_rgba(212,255,58,0.65)]'
                      : 'border-acid/70 bg-ink'
                  }`}
                />

                <div className="flex items-baseline gap-3 font-mono text-[11px] uppercase tracking-[0.18em]">
                  <span className="text-acid">{s.n}</span>
                  <span className={s.final ? 'text-acid' : 'text-paper/45'}>{s.when}</span>
                </div>
                <h3 className={`mt-3 font-display text-[22px] leading-tight md:mt-4 md:text-[28px] ${s.final ? 'text-acid' : 'text-paper'}`}>
                  {s.title}
                </h3>
                <p className={`mt-3 text-pretty text-[15px] leading-relaxed md:mt-4 md:text-lg ${s.final ? 'text-paper/80' : 'text-paper/65'}`}>
                  {s.text}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
