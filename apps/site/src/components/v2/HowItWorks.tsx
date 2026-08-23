'use client';

import { motion } from 'framer-motion';

const ease = [0.22, 1, 0.36, 1] as const;

const STEPS = [
  {
    n: '01', title: 'Audit gratuit',
    text: 'On regarde votre boutique et on chiffre ce qui fuit : recherches sans résultat, paniers sans relance, avis jamais demandés. Sans engagement.',
  },
  {
    n: '02', title: 'On branche',
    text: 'Une ligne de code, votre catalogue, votre voix de marque. 30 minutes, et rien à installer de votre côté.',
  },
  {
    n: '03', title: 'Une semaine d\'observation',
    text: 'Le vendeur lit vos vraies recherches sans répondre à personne. Vous relisez ses réponses et donnez le feu vert avant la mise en live.',
  },
  {
    n: '04', title: 'En live, mesuré',
    text: 'Tout tourne. Le tableau de bord compare les visiteurs qui voient Shimmer à ceux qui ne le voient pas, et prouve à l\'euro ce que ça rapporte.',
  },
];

export function HowItWorks() {
  return (
    <section id="process" className="relative z-10 w-full scroll-mt-16 px-6 py-16 md:px-12 md:py-40">
      <div className="mx-auto max-w-[1400px]">
        <div className="mb-8 flex items-baseline gap-6 md:mb-14">
          <span className="font-mono text-[11px] uppercase tracking-[0.24em] text-acid">Comment ça se passe</span>
          <span className="h-px flex-1 bg-paper/10" />
        </div>

        <h2 className="mb-10 max-w-[22ch] font-display text-[clamp(34px,5vw,72px)] font-normal leading-[0.95] tracking-tightest text-paper md:mb-16">
          Branché en 30 minutes. <span className="italic text-acid">Prouvé</span> sur vos propres chiffres.
        </h2>

        <div className="grid grid-cols-1 gap-x-10 gap-y-8 sm:grid-cols-2 md:gap-y-12 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <motion.div
              key={s.n}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.6, ease, delay: i * 0.1 }}
              className="border-t border-paper/15 pt-6"
            >
              <div className="font-mono text-sm text-acid">{s.n}</div>
              <h3 className="mt-3 font-display text-2xl leading-tight text-paper md:mt-4 md:text-[28px]">{s.title}</h3>
              <p className="mt-3 text-pretty text-base leading-relaxed text-paper/65 md:mt-4 md:text-lg">{s.text}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
