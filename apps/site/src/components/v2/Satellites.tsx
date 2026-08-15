'use client';

import { motion } from 'framer-motion';

const ease = [0.22, 1, 0.36, 1] as const;

const iconProps = {
  width: 22,
  height: 22,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

// Panier qui revient (relances)
const CartIcon = () => (
  <svg {...iconProps}>
    <path d="M3 4h2l2.2 10.5a1 1 0 0 0 1 .8h7.6a1 1 0 0 0 1-.8L19 7H6" />
    <circle cx="9" cy="20" r="1.2" />
    <circle cx="17" cy="20" r="1.2" />
    <path d="M14 3.5l-2 1.8 2 1.8" />
  </svg>
);
// Étoile (avis)
const StarIcon = () => (
  <svg {...iconProps}>
    <path d="M12 3.5l2.5 5.2 5.7.7-4.2 3.9 1.1 5.6L12 16.9 6.9 19l1.1-5.6-4.2-3.9 5.7-.7z" />
  </svg>
);
// Mégaphone (campagnes)
const MegaphoneIcon = () => (
  <svg {...iconProps}>
    <path d="M4 10v4l11 4.5V5.5L4 10z" />
    <path d="M4 10H3.2a1.2 1.2 0 0 0-1.2 1.2v1.6A1.2 1.2 0 0 0 3.2 14H4" />
    <path d="M18.5 9a3.5 3.5 0 0 1 0 6" />
    <path d="M7 15v3a1.5 1.5 0 0 0 3 0v-1" />
  </svg>
);
// Graphique (mesure)
const ChartIcon = () => (
  <svg {...iconProps}>
    <path d="M4 20V11" />
    <path d="M10 20V4" />
    <path d="M16 20v-6" />
    <path d="M3 20h18" />
  </svg>
);

const SATS = [
  {
    icon: <CartIcon />,
    name: 'Relances paniers',
    does: 'Les paniers abandonnés repartent avec un message dans votre ton.',
    benefit: 'Vos clients hésitants reviennent et achètent.',
  },
  {
    icon: <StarIcon />,
    name: 'Avis',
    does: 'Collecte les bons avis, intercepte les mauvais avant qu\'ils arrivent sur Google.',
    benefit: 'Votre réputation travaille pour vous.',
  },
  {
    icon: <MegaphoneIcon />,
    name: 'Campagnes',
    does: 'Pubs et newsletters générées avec votre catalogue, dans votre voix.',
    benefit: 'Le marketing sans y passer vos soirées.',
  },
  {
    icon: <ChartIcon />,
    name: 'Mesure',
    does: 'Compare les clients qui voient Shimmer à ceux qui ne le voient pas.',
    benefit: 'Vous savez, à l\'euro, ce que ça vous rapporte.',
  },
];

export function Satellites() {
  return (
    <section className="relative z-10 w-full px-6 py-28 md:px-12 md:py-40">
      <div className="mx-auto max-w-[1400px]">
        <div className="mb-12 flex items-baseline gap-6">
          <span className="font-mono text-[11px] uppercase tracking-[0.24em] text-acid">Et tout autour</span>
          <span className="h-px flex-1 bg-paper/10" />
        </div>

        <h2 className="max-w-[22ch] font-display text-[clamp(30px,4.5vw,64px)] font-normal leading-[0.98] tracking-tightest text-paper">
          Quatre automatisations qui <span className="italic text-acid">récupèrent chaque client</span>.
        </h2>

        <div className="mt-16 grid grid-cols-1 gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
          {SATS.map((s, i) => (
            <motion.div
              key={s.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.55, ease, delay: i * 0.08 }}
              className="border-t border-paper/15 pt-7"
            >
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl border border-acid/25 bg-acid/[0.06] text-acid">
                {s.icon}
              </div>
              <h3 className="font-display text-2xl leading-tight text-paper md:text-[26px]">{s.name}</h3>
              <p className="mt-4 text-pretty text-base leading-relaxed text-paper/60">{s.does}</p>
              <p className="mt-3 text-pretty text-base leading-snug text-acid/90">{s.benefit}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
