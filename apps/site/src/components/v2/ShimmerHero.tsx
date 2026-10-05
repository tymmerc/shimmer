'use client';

import { motion } from 'framer-motion';
import { AUDIT_ANCHOR } from '@/lib/audit';
import { SiteNav } from './SiteNav';
import { HeroTeaser } from './HeroTeaser';

const ease = [0.22, 1, 0.36, 1] as const;

/**
 * Hero épuré. Le shader toxique plein (toujours affiché), une accroche, une
 * sous-ligne courte qui glisse déjà le différenciateur, deux CTA. Rien d'autre.
 */
export function ShimmerHero() {
  return (
    <section id="top" className="relative min-h-[100svh] w-full overflow-hidden md:min-h-screen">
      {/* La toxine est dessinée par ToxicField (fond de page, hero compris).
          Sans WebGL matériel, ToxicField pose html[data-toxine='css'] et cette
          nappe CSS prend le relais dans le hero. */}
      <div className="toxic-fallback toxic-static pointer-events-none absolute inset-0 z-0" aria-hidden>
        <div className="toxic-fluid-drift" />
      </div>

      {/* Fondus ink : lisibilité du texte à gauche (estompé vers le bas du
          hero, sinon il laisse une couture là où la toxine continue).
          En portrait mobile le fondu latéral n'a pas de sens (le texte occupe
          toute la largeur) : on le remplace par un voile vertical léger. */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-[3] hidden w-[58%] bg-gradient-to-r from-ink/85 via-ink/45 to-transparent [mask-image:linear-gradient(to_bottom,#000_50%,transparent)] md:block" />
      {/* Sans WebGL (nappe CSS), la toxine s'arrête net au bas du hero : on
          rétablit le fondu bas dans ce cas seulement. */}
      <div className="toxic-fallback pointer-events-none absolute inset-x-0 bottom-0 z-[3] h-40 bg-gradient-to-t from-ink to-transparent" />
      <div className="pointer-events-none absolute inset-0 z-[3] bg-gradient-to-b from-ink/35 via-ink/10 to-transparent md:hidden" />

      <SiteNav />

      {/* Téléphone : hero = un écran (svh, barre d'adresse comprise), le
          texte centré dans l'espace restant, l'aperçu produit calé en bas.
          Desktop : inchangé, texte centré verticalement, toxine à droite. */}
      <div className="relative z-10 mx-auto flex min-h-[100svh] max-w-[1400px] flex-col px-6 pb-5 pt-20 md:min-h-screen md:justify-center md:px-12 md:pb-28 md:pt-28">
      <div className="my-auto md:my-0">
        {/* Pas de pastille « badge » au-dessus du titre (le point vert qui
            pulse dans une capsule, c'est le tic des sites générés). On entre
            directement par l'accroche. */}
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease, delay: 0.1 }}
          className="max-w-[18ch] font-display text-balance text-[clamp(34px,8.5vw,128px)] font-normal leading-[1.02] tracking-tightest text-paper"
        >
          Votre boutique{' '}
          <span className="italic text-acid">vend, répond et relance</span>{' '}
          toute seule.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease, delay: 0.25 }}
          className="mt-4 max-w-[46ch] text-pretty text-[15px] leading-relaxed text-paper/80 md:mt-8 md:text-2xl"
        >
          Un vendeur en ligne et un SAV qui répondent à votre place, entourés de tout ce qui récupère vos clients.{' '}
          <span className="text-paper">Vous gagnez du temps. Et des ventes.</span>
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease, delay: 0.4 }}
          className="mt-6 flex flex-col items-stretch gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4 md:mt-12"
        >
          <a
            href={AUDIT_ANCHOR}
            className="group inline-flex items-center justify-center gap-3 whitespace-nowrap rounded-full bg-paper px-7 py-3.5 font-sans text-[15px] font-medium text-ink transition-colors duration-300 hover:bg-toxic-500 hover:text-paper sm:py-4"
          >
            Demander un audit
            <span className="text-ink/50 transition-[transform,color] duration-300 group-hover:translate-x-1 group-hover:text-paper/80">→</span>
          </a>
          <a
            href="/shimmer/demo/"
            className="inline-flex items-center justify-center whitespace-nowrap rounded-full border border-paper/25 px-7 py-3.5 font-sans text-[15px] text-paper transition-colors duration-300 hover:border-paper/60 sm:py-4"
          >
            Voir les démos
          </a>
        </motion.div>
      </div>

        <HeroTeaser className="mt-5 md:hidden" />
      </div>

      <a
        href="#automatisations"
        className="absolute bottom-8 left-1/2 z-30 hidden -translate-x-1/2 flex-col items-center gap-3 font-mono text-[11px] uppercase tracking-[0.18em] text-paper/60 transition hover:text-paper/80 md:flex"
      >
        <span>Découvrir</span>
        <motion.span
          animate={{ scaleY: [1, 0.4, 1], opacity: [0.3, 0.9, 0.3] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          className="block h-10 w-px origin-top bg-paper/40"
        />
      </a>
    </section>
  );
}
