'use client';

import { motion } from 'framer-motion';

const ease = [0.25, 0.4, 0.25, 1] as const;

const STEPS = [
  {
    n: '01',
    name: 'Audit',
    price: 'Gratuit',
    detail: 'On montre ce qui fuit, chiffré, sans engagement.',
  },
  {
    n: '02',
    name: 'Mise en place',
    price: 'dès 490 €',
    detail: 'Une seule fois : branchement, catalogue, voix de marque, semaine d’observation.',
  },
  {
    n: '03',
    name: 'Abonnement',
    price: '149 €/mois',
    detail: 'Les 5 modules. Ou 39 €/mois par module, selon ce que l’audit a révélé.',
  },
  {
    n: '04',
    name: 'Au résultat',
    price: '10 %',
    detail: 'du CA additionnel prouvé contre le groupe témoin. Vous gardez 90 % d’un argent que vous n’auriez pas eu.',
  },
];

/** L'offre en 4 étapes — le visiteur sait ce que ça coûte avant de demander. */
export function V3Pricing() {
  return (
    <section id="offre" className="relative z-10 w-full scroll-mt-16 px-6 py-16 md:py-32">
      <div className="mx-auto max-w-[1100px]">
        <div className="mx-auto mb-9 max-w-2xl text-center md:mb-16">
          <h2 className="text-balance font-sans text-[26px] font-semibold tracking-tight text-paper md:text-5xl">
            Une offre simple, payée au résultat.
          </h2>
          <p className="mt-3 text-pretty text-[15px] text-paper/60 md:mt-4 md:text-lg">
            Tarif de lancement. Sans engagement, réversible en une ligne de code.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <motion.div
              key={s.n}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.55, ease, delay: i * 0.07 }}
              className={`flex flex-col rounded-2xl border p-6 transition-colors duration-300 md:p-7 ${
                i === 3
                  ? 'border-acid/35 bg-acid/[0.05] hover:border-acid/60'
                  : 'border-paper/10 bg-paper/[0.03] hover:border-acid/25'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-acid">{s.n}</span>
                <span className="text-[13px] text-paper/45">{s.name}</span>
              </div>
              <div className="mt-4 font-sans text-2xl font-semibold tracking-tight text-paper md:mt-5 md:text-3xl">
                {s.price}
              </div>
              <p className="mt-3 text-pretty text-[14px] leading-relaxed text-paper/60">{s.detail}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
