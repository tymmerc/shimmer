'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

const ease = [0.25, 0.4, 0.25, 1] as const;

const iconProps = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

const AuditIcon = () => (
  <svg {...iconProps}>
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-3.5-3.5" />
  </svg>
);
const PlugIcon = () => (
  <svg {...iconProps}>
    <path d="M9 7V3M15 7V3" />
    <path d="M6 7h12v4a6 6 0 0 1-12 0V7z" />
    <path d="M12 17v4" />
  </svg>
);
const EyeIcon = () => (
  <svg {...iconProps}>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
const ChartIcon = () => (
  <svg {...iconProps}>
    <path d="M4 20V11M10 20V4M16 20v-6M3 20h18" />
  </svg>
);

const STEPS = [
  {
    icon: <AuditIcon />,
    n: '01',
    title: 'Audit gratuit',
    text: 'On regarde votre boutique et on chiffre ce qui fuit : recherches sans résultat, paniers sans relance, avis jamais demandés. Sans engagement.',
  },
  {
    icon: <PlugIcon />,
    n: '02',
    title: 'On branche',
    text: 'Une ligne de code, votre catalogue, votre voix de marque. 30 minutes, rien à installer de votre côté.',
  },
  {
    icon: <EyeIcon />,
    n: '03',
    title: 'Une semaine d’observation',
    text: 'Le vendeur lit vos vraies recherches sans répondre à personne. Vous relisez ses réponses et donnez le feu vert.',
  },
  {
    icon: <ChartIcon />,
    n: '04',
    title: 'En live, mesuré',
    text: 'Tout tourne. Le tableau de bord compare les visiteurs qui voient Shimmer à ceux qui ne le voient pas, et prouve à l’euro ce que ça rapporte.',
  },
];

function TimelineLine() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });
  return (
    <div ref={ref} className="absolute left-6 top-0 h-full w-px -translate-x-1/2 overflow-hidden md:left-1/2">
      <motion.div
        initial={{ scaleY: 0 }}
        animate={inView ? { scaleY: 1 } : { scaleY: 0 }}
        transition={{ duration: 1.4, ease }}
        className="h-full w-full origin-top bg-gradient-to-b from-acid/50 via-acid/15 to-transparent"
      />
    </div>
  );
}

/** Timeline verticale alternée, façon Clearpath : sobre, centrée, lisible. */
export function V3HowItWorks() {
  return (
    <section id="process" className="relative z-10 w-full scroll-mt-16 px-6 py-24 md:py-32">
      <div className="mx-auto max-w-4xl">
        <div className="mx-auto mb-14 max-w-2xl text-center md:mb-20">
          <h2 className="text-balance font-sans text-3xl font-semibold tracking-tight text-paper md:text-5xl">
            Branché en 30 minutes.
          </h2>
          <p className="mt-4 text-pretty text-base text-paper/60 md:text-lg">
            Aucun développement de votre côté. Réversible en une ligne de code.
          </p>
        </div>

        <div className="relative">
          <TimelineLine />
          <div className="space-y-12 md:space-y-16">
            {STEPS.map((s, i) => (
              <motion.div
                key={s.n}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.55, ease, delay: i * 0.08 }}
                className="relative"
              >
                <div className="grid grid-cols-1 items-center gap-6 md:grid-cols-2 md:gap-12">
                  <div className={`${i % 2 === 1 ? 'md:order-2' : ''} pl-16 md:pl-0`}>
                    <div className={i % 2 === 1 ? 'md:pl-12 md:text-left' : 'md:pr-12 md:text-right'}>
                      <span className="mb-1.5 block text-sm font-medium text-acid">{s.n}</span>
                      <h3 className="mb-2 font-sans text-xl font-semibold tracking-tight text-paper md:text-2xl">
                        {s.title}
                      </h3>
                      <p className="text-pretty text-[15px] leading-relaxed text-paper/60">{s.text}</p>
                    </div>
                  </div>

                  <div className="absolute left-0 top-0 md:left-1/2 md:-translate-x-1/2">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-acid/50 bg-ink text-acid shadow-lg shadow-acid/10">
                      {s.icon}
                    </div>
                  </div>

                  <div className={`hidden md:block ${i % 2 === 1 ? 'md:order-1' : ''}`} />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
