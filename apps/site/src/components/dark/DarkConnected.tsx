'use client';

// Le vrai différenciateur : les modules se nourrissent mutuellement.
// Split-screen : le titre reste pinné à gauche (sticky), les flux défilent à
// droite, chacun scrubé par sa propre position de scroll (réversible, pas de
// fade-in au trigger). Sur mobile, tout lit à plat.

import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';

interface Flow {
  from: string;
  to: string;
  what: string;
}

const flows: Flow[] = [
  { from: 'Avis clients', to: 'Vendeur', what: 'Le vendeur cite "offert, carton assuré" quand un visiteur cherche un cadeau.' },
  { from: 'SAV', to: 'Vendeur', what: 'Les objections récurrentes ("ça se garde combien ?") sont anticipées dans la réponse.' },
  { from: 'Catalogue', to: 'Newsletter', what: 'Les top-sellers du mois deviennent automatiquement la sélection envoyée.' },
  { from: 'Top-sellers', to: 'Ads', what: 'Les visuels pub sont générés sur les produits qui se vendent vraiment.' },
  { from: 'Conversations', to: 'FAQ / SAV', what: 'Ce que les gens demandent au vendeur enrichit la base SAV.' },
  { from: 'Paniers récupérés', to: 'Vendeur', what: 'Les motifs d\'abandon orientent les recommandations futures.' },
];

export function DarkConnected() {
  return (
    <section
      id="connecte"
      className="relative w-full scroll-mt-16 border-t border-paper/10 bg-ink py-24 md:py-36"
    >
      <div className="mx-auto max-w-[1480px] px-6 md:px-12">
        <div className="mb-12 flex items-baseline gap-6">
          <span className="font-mono text-[11px] uppercase tracking-[0.24em] text-acid">
            Tout connecté
          </span>
          <span className="h-px flex-1 bg-paper/10" />
        </div>

        <div className="grid grid-cols-1 gap-x-16 gap-y-12 lg:grid-cols-2">
          {/* Colonne pinnée : le message reste, les preuves défilent en face */}
          <div className="lg:sticky lg:top-28 lg:self-start">
            <h2 className="max-w-[16ch] font-display text-balance text-[clamp(36px,4.6vw,76px)] font-normal leading-[0.98] tracking-tightest text-paper">
              Chaque module rend{' '}
              <span className="italic text-acid">les autres meilleurs</span>.
            </h2>
            <p className="copy mt-8 max-w-[46ch] text-pretty text-lg leading-relaxed text-paper/70 md:text-xl">
              Ce qu'un client tape, achète, renvoie ou dit en avis alimente tous les autres modules.
              Le vendeur sait ce que le SAV a vu. Les pubs savent ce qui se vend.
            </p>
            <p className="copy mt-5 max-w-[46ch] text-pretty text-base leading-relaxed text-paper/55 md:text-lg">
              C'est ce qu'aucune suite cousue de huit outils tiers ne peut faire.
              Plus vous utilisez Shimmer, plus chaque module performe.
            </p>
          </div>

          {/* Flux : chaque carte est scrubée par sa position dans le viewport */}
          <div className="space-y-5">
            {flows.map((f, i) => (
              <FlowCard key={i} flow={f} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function FlowCard({ flow }: { flow: Flow }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start 95%', 'start 55%'],
  });
  const opacity = useTransform(scrollYProgress, [0, 1], [0.15, 1]);
  const y = useTransform(scrollYProgress, [0, 1], [48, 0]);
  const lineScale = useTransform(scrollYProgress, [0.2, 1], [0, 1]);

  return (
    <motion.article
      ref={ref}
      style={{ opacity, y }}
      className="rounded-2xl border border-paper/10 bg-paper/[0.03] p-6 md:p-8"
    >
      <div className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.2em]">
        <span className="text-paper">{flow.from}</span>
        <span className="relative h-px w-10 overflow-hidden bg-paper/15">
          <motion.span
            style={{ scaleX: lineScale, transformOrigin: 'left' }}
            className="absolute inset-0 bg-acid"
          />
        </span>
        <span className="text-acid">{flow.to}</span>
      </div>
      <p className="copy mt-4 text-pretty text-base leading-relaxed text-paper/80 md:text-lg">
        {flow.what}
      </p>
    </motion.article>
  );
}
