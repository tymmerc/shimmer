'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import { ToxicCanvas } from '../ToxicCanvas';
import { AUDIT_MAILTO } from '@/lib/audit';

export function DarkHero() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });

  const canvasOpacity = useTransform(scrollYProgress, [0, 0.7, 1], [0.85, 0.3, 0]);
  const canvasScale = useTransform(scrollYProgress, [0, 1], [1.05, 1.25]);
  const titleY = useTransform(scrollYProgress, [0, 1], [0, -180]);
  const titleOpacity = useTransform(scrollYProgress, [0, 0.85], [1, 0]);
  const statsY = useTransform(scrollYProgress, [0, 1], [0, 60]);

  return (
    <section ref={ref} className="relative min-h-screen w-full overflow-hidden bg-ink">
      {/* Shimmer toxique en PLEINE largeur. Le canvas couvre tout le hero : il
          n'a donc aucun bord au milieu de l'écran (c'était ça le "split en 2",
          le bord gauche d'un canvas qui n'occupait que la moitié droite). */}
      <motion.div
        style={{ opacity: canvasOpacity, scale: canvasScale }}
        className="pointer-events-none absolute inset-0 z-0"
      >
        <ToxicCanvas className="h-full w-full" />
      </motion.div>

      {/* Fade ink vers la gauche pour garder le texte lisible par-dessus la
          toxine, qui reste plus dense à droite grâce au shader lui-même. */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-[3] w-[60%] bg-gradient-to-r from-ink via-ink/85 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[3] h-32 bg-gradient-to-b from-ink to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[3] h-48 bg-gradient-to-t from-ink to-transparent" />
      <div className="pointer-events-none absolute inset-0 z-[4] opacity-[0.08] mix-blend-overlay grain" />

      <Nav />

      <motion.div
        style={{ y: titleY, opacity: titleOpacity }}
        className="relative z-10 mx-auto flex min-h-screen max-w-[1480px] flex-col justify-center px-6 pb-24 pt-24 md:px-12 md:pb-32 md:pt-36"
      >
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="mb-8 inline-flex w-fit items-center gap-3 rounded-full border border-paper/15 bg-paper/5 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.22em] text-paper/70 backdrop-blur-sm md:mb-10"
        >
          <motion.span
            animate={{ opacity: [0.6, 1, 0.6], scale: [1, 1.2, 1] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
            className="h-1.5 w-1.5 rounded-full bg-acid shadow-[0_0_14px_rgba(212,255,58,0.9)]"
          />
          Shimmer · la plateforme IA pour votre boutique
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
          className="max-w-[20ch] font-display text-balance text-[clamp(38px,8.8vw,156px)] font-normal leading-[0.92] tracking-tightest text-paper"
        >
          Votre boutique{' '}
          <span className="italic text-acid">vend, répond et relance</span>{' '}
          toute seule.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.25 }}
          className="copy mt-8 max-w-[56ch] text-pretty font-sans text-lg leading-relaxed text-paper/75 md:mt-10 md:text-xl"
        >
          Un vendeur IA conseille vos visiteurs, votre SAV est trié et pré-rédigé, vos paniers abandonnés reviennent, vos avis remontent.{' '}
          <span className="text-paper">Vous, vous gérez votre commerce au lieu de courir après dix tâches.</span>
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.4 }}
          className="mt-10 flex flex-wrap items-center gap-4 md:mt-12"
        >
          <a
            href="/shimmer/demo/"
            className="btn btn-acid group inline-flex items-center gap-2 rounded-full bg-acid px-7 py-4 font-sans text-sm uppercase tracking-[0.18em] text-ink"
          >
            Voir les démos
            <span className="transition-transform duration-300 group-hover:translate-x-1.5">→</span>
          </a>
          <a
            href={AUDIT_MAILTO}
            className="btn btn-ghost inline-flex items-center gap-2 rounded-full border border-acid/40 px-7 py-4 font-sans text-sm uppercase tracking-[0.18em] text-acid"
          >
            Obtenir mon audit gratuit
          </a>
        </motion.div>

        <motion.div
          style={{ y: statsY }}
          className="mt-14 grid grid-cols-2 gap-x-8 gap-y-6 md:mt-20 md:grid-cols-4"
        >
          <Stat k="Modules" v="9 connectés" accent />
          <Stat k="Couverture" v="Vendeur, SAV, marketing, mesure" />
          <Stat k="Installation" v="3 lignes, 30 min" />
          <Stat k="Souveraineté" v="Données en France" />
        </motion.div>
      </motion.div>

      <div className="absolute bottom-8 left-1/2 z-30 hidden -translate-x-1/2 flex-col items-center gap-3 font-mono text-[10px] uppercase tracking-[0.24em] text-paper/45 md:flex">
        <span>Scroll</span>
        <span className="block h-10 w-px bg-paper/30" />
      </div>
    </section>
  );
}

function Stat({ k, v, accent }: { k: string; v: string; accent?: boolean }) {
  return (
    <div className="border-t border-paper/15 pt-4">
      <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-paper/45">{k}</div>
      <div className={`mt-2 font-display text-xl tracking-editorial md:text-2xl ${accent ? 'text-acid' : 'text-paper'}`}>
        {v}
      </div>
    </div>
  );
}

function Nav() {
  return (
    <header className="absolute left-0 right-0 top-0 z-40 px-6 py-6 md:px-12">
      <div className="mx-auto flex max-w-[1480px] items-center justify-between">
        <a href="#" className="font-display text-xl font-medium tracking-tight text-paper">
          Shimmer<span className="text-acid">.</span>
        </a>
        <nav className="hidden gap-8 md:flex">
          <a href="#parcours" className="font-mono text-[11px] uppercase tracking-[0.2em] text-paper/55 transition hover:text-paper">Comment ça marche</a>
          <a href="#boutiques" className="font-mono text-[11px] uppercase tracking-[0.2em] text-paper/55 transition hover:text-paper">Boutiques</a>
          <a href="#resultats" className="font-mono text-[11px] uppercase tracking-[0.2em] text-paper/55 transition hover:text-paper">Résultats</a>
          <a href="#brancher" className="font-mono text-[11px] uppercase tracking-[0.2em] text-paper/55 transition hover:text-paper">Brancher</a>
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          <a
            href="/shimmer/demo/"
            className="btn btn-ghost rounded-full border border-paper/20 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-paper"
          >
            Démos
          </a>
          <a
            href={AUDIT_MAILTO}
            className="btn btn-acid rounded-full bg-acid px-4 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-ink"
          >
            Audit gratuit
          </a>
        </div>
      </div>
    </header>
  );
}
