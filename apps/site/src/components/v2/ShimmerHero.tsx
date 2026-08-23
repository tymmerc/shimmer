'use client';

import { motion } from 'framer-motion';
import { ToxicCanvas } from '../ToxicCanvas';
import { AUDIT_MAILTO } from '@/lib/audit';
import { SiteNav } from './SiteNav';

const ease = [0.22, 1, 0.36, 1] as const;

/**
 * Hero épuré. Le shader toxique plein (toujours affiché), une accroche, une
 * sous-ligne courte qui glisse déjà le différenciateur, deux CTA. Rien d'autre.
 */
export function ShimmerHero() {
  return (
    <section id="top" className="relative min-h-screen w-full overflow-hidden">
      <div className="pointer-events-none absolute inset-0 z-0">
        <ToxicCanvas className="h-full w-full" />
      </div>

      {/* Fondus ink : lisibilité du texte à gauche, raccord haut/bas.
          En portrait mobile le fondu latéral n'a pas de sens (le texte occupe
          toute la largeur) : on le remplace par un voile vertical léger. */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-[3] hidden w-[62%] bg-gradient-to-r from-ink via-ink/80 to-transparent md:block" />
      <div className="pointer-events-none absolute inset-0 z-[3] bg-gradient-to-b from-ink/60 via-ink/20 to-transparent md:hidden" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[3] h-40 bg-gradient-to-t from-ink to-transparent" />

      <SiteNav />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-[1400px] flex-col justify-center px-6 pb-24 pt-24 md:px-12 md:pb-28 md:pt-28">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease }}
          className="mb-6 inline-flex w-fit items-center gap-2.5 rounded-full border border-paper/15 bg-paper/5 px-3.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-paper/70 md:mb-8 md:gap-3 md:px-4 md:py-2 md:text-[11px] md:tracking-[0.22em]"
        >
          <motion.span
            animate={{ opacity: [0.6, 1, 0.6], scale: [1, 1.25, 1] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
            className="h-1.5 w-1.5 rounded-full bg-acid shadow-[0_0_14px_rgba(212,255,58,0.9)]"
          />
          Le cerveau IA de votre boutique
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease, delay: 0.1 }}
          className="max-w-[18ch] font-display text-balance text-[clamp(42px,9vw,150px)] font-normal leading-[0.92] tracking-tightest text-paper"
        >
          Votre boutique{' '}
          <span className="italic text-acid">vend, répond et relance</span>{' '}
          toute seule.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease, delay: 0.25 }}
          className="mt-6 max-w-[46ch] text-pretty text-[17px] leading-relaxed text-paper/80 md:mt-8 md:text-2xl"
        >
          Un vendeur en ligne et un SAV qui répondent à votre place, entourés de tout ce qui récupère vos clients.{' '}
          <span className="text-paper">Vous gagnez du temps. Et des ventes.</span>
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease, delay: 0.4 }}
          className="mt-9 flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4 md:mt-12"
        >
          <a
            href={AUDIT_MAILTO}
            className="btn btn-acid group inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full bg-acid px-7 py-4 font-sans text-[13px] uppercase tracking-[0.14em] text-ink sm:px-8 sm:text-sm sm:tracking-[0.18em]"
          >
            Obtenir mon audit gratuit
            <span className="transition-transform duration-300 group-hover:translate-x-1.5">→</span>
          </a>
          <a
            href="/shimmer/demo/"
            className="btn btn-ghost inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full border border-paper/25 px-7 py-4 font-sans text-[13px] uppercase tracking-[0.14em] text-paper sm:px-8 sm:text-sm sm:tracking-[0.18em]"
          >
            Voir les démos
          </a>
        </motion.div>
      </div>

      <a
        href="#automatisations"
        className="absolute bottom-8 left-1/2 z-30 hidden -translate-x-1/2 flex-col items-center gap-3 font-mono text-[10px] uppercase tracking-[0.24em] text-paper/45 transition hover:text-paper/80 md:flex"
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
