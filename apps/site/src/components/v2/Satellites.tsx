'use client';

import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

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

// Positions sur l'orbite (rayon en %, centre 50/50), départ en haut.
const R = 40;
const COORDS = SATS.map((_, i) => {
  const a = (-90 + i * (360 / SATS.length)) * (Math.PI / 180);
  return { x: 50 + R * Math.cos(a), y: 50 + R * Math.sin(a) };
});

/**
 * L'orbite : les quatre automatisations tournent autour du cœur (vendeur +
 * SAV). Deux mouvements superposés : une rotation lente continue (CSS,
 * .wheel-ring / .wheel-counter, coupée par prefers-reduced-motion) et une
 * rotation pilotée par le scroll (le visiteur fait tourner l'orbite en
 * descendant). Les icônes contre-tournent pour rester droites. Une comète
 * acide court sur l'anneau.
 */
function Orbit({ sectionRef }: { sectionRef: React.RefObject<HTMLElement> }) {
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start end', 'end start'] });
  const rotate = useTransform(scrollYProgress, [0, 1], [-70, 70]);
  const counter = useTransform(rotate, (v) => -v);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.9, ease }}
      className="relative mx-auto aspect-square w-full max-w-[300px] md:max-w-[420px]"
      aria-hidden
    >
      {/* Halo de fond, immobile */}
      <div
        className="absolute inset-[12%] rounded-full opacity-70"
        style={{ background: 'radial-gradient(circle, rgba(139,77,255,0.22), rgba(139,77,255,0) 68%)' }}
      />

      {/* Couche scroll : tourne avec le défilement */}
      <motion.div style={{ rotate }} className="absolute inset-0">
        {/* Couche CSS : tourne toute seule, lentement */}
        <div className="wheel-ring absolute inset-0">
          <svg viewBox="0 0 100 100" className="pointer-events-none absolute inset-0 h-full w-full">
            {/* Anneau */}
            <circle cx="50" cy="50" r={R} fill="none" stroke="rgba(251,249,244,0.12)" strokeWidth="0.35" />
            {/* Rayons */}
            {COORDS.map((c, i) => (
              <line key={i} x1="50" y1="50" x2={c.x} y2={c.y} stroke="rgba(251,249,244,0.08)" strokeWidth="0.3" />
            ))}
            {/* Comète acide : un court arc sur l'anneau, il tourne avec lui */}
            <circle
              cx="50"
              cy="50"
              r={R}
              fill="none"
              stroke="rgba(212,255,58,0.9)"
              strokeWidth="0.6"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * R * 0.09} ${2 * Math.PI * R}`}
              transform="rotate(-135 50 50)"
              style={{ filter: 'drop-shadow(0 0 2px rgba(212,255,58,0.8))' }}
            />
          </svg>

          {SATS.map((s, i) => (
            <div
              key={s.name}
              className="absolute flex h-[17%] w-[17%] -translate-x-1/2 -translate-y-1/2 items-center justify-center"
              style={{ left: `${COORDS[i].x}%`, top: `${COORDS[i].y}%` }}
            >
              {/* contre-rotation CSS puis contre-rotation scroll : l'icône reste droite */}
              <span className="wheel-counter flex h-full w-full items-center justify-center">
                <motion.span
                  style={{ rotate: counter }}
                  className="flex h-full w-full items-center justify-center rounded-2xl border border-acid/30 bg-ink/85 text-acid shadow-[0_0_24px_rgba(212,255,58,0.12)]"
                >
                  {s.icon}
                </motion.span>
              </span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Le cœur, fixe : vendeur + SAV */}
      <div className="absolute left-1/2 top-1/2 flex h-[30%] w-[30%] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border border-acid/35 bg-ink/90 shadow-[0_0_40px_rgba(212,255,58,0.10)]">
        <span className="font-display text-3xl text-paper md:text-4xl">
          S<span className="text-acid">.</span>
        </span>
        <span className="mt-1 text-center font-mono text-[8px] uppercase leading-tight tracking-[0.16em] text-paper/50 md:text-[9px]">
          vendeur<br />+ SAV
        </span>
      </div>
    </motion.div>
  );
}

export function Satellites() {
  const ref = useRef<HTMLElement>(null);
  return (
    <section ref={ref} className="relative z-10 w-full px-6 py-16 md:px-12 md:py-40">
      <div className="mx-auto max-w-[1400px]">
        <div className="mb-8 flex items-baseline gap-6 md:mb-12">
          <span className="font-mono text-[11px] uppercase tracking-[0.24em] text-acid">Et tout autour</span>
          <span className="h-px flex-1 bg-paper/10" />
        </div>

        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <h2 className="max-w-[22ch] font-display text-[clamp(27px,4.5vw,64px)] font-normal leading-[1.02] tracking-tightest text-paper">
            Quatre automatisations qui <span className="italic text-acid">récupèrent chaque client</span>.
          </h2>
          <Orbit sectionRef={ref} />
        </div>

        <div className="mt-12 grid grid-cols-1 gap-x-10 gap-y-8 sm:grid-cols-2 md:mt-20 md:gap-y-12 lg:grid-cols-4">
          {SATS.map((s, i) => (
            <motion.div
              key={s.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.55, ease, delay: i * 0.08 }}
              className="border-t border-paper/15 pt-6 md:pt-7"
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-acid/25 bg-acid/[0.06] text-acid md:mb-6 md:h-12 md:w-12">
                {s.icon}
              </div>
              <h3 className="font-display text-[22px] leading-tight text-paper md:text-[26px]">{s.name}</h3>
              <p className="mt-3 text-pretty text-[15px] leading-relaxed text-paper/60 md:mt-4">{s.does}</p>
              <p className="mt-2.5 text-pretty text-[15px] leading-snug text-acid/90 md:mt-3">{s.benefit}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
