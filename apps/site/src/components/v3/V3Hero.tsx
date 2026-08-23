'use client';

import { motion } from 'framer-motion';
import { ToxicCanvas } from '../ToxicCanvas';
import { AUDIT_MAILTO } from '@/lib/audit';
import { SiteNav } from '../v2/SiteNav';

const ease = [0.25, 0.4, 0.25, 1] as const;

/**
 * Hero v3 — la toxine reste (c'est l'identité), mais le contenu passe en
 * centré, sobre, concret : on doit comprendre en une lecture ce que Shimmer
 * fait, pour qui, et combien de temps ça prend à installer.
 */
export function V3Hero() {
  return (
    <section id="top" className="relative flex min-h-screen w-full flex-col overflow-hidden">
      <div className="pointer-events-none absolute inset-0 z-0">
        <ToxicCanvas className="h-full w-full" />
      </div>

      {/* Voiles ink : le texte est centré, la lisibilité vient d'un voile
          radial au centre + raccords haut/bas. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[3]"
        style={{
          background:
            'radial-gradient(58% 52% at 50% 46%, rgba(13,11,20,0.86), rgba(13,11,20,0.42) 62%, rgba(13,11,20,0) 100%)',
        }}
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[3] h-28 bg-gradient-to-b from-ink/80 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[3] h-40 bg-gradient-to-t from-ink to-transparent" />

      <SiteNav />

      <div className="relative z-10 mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-6 pb-24 pt-28 text-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease }}
          className="mb-7 inline-flex items-center gap-2.5 rounded-full border border-paper/15 bg-ink/40 px-4 py-2 text-[13px] text-paper/75"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-acid shadow-[0_0_12px_rgba(212,255,58,0.9)]" />
          Pour les boutiques Shopify &amp; WooCommerce
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1, ease }}
          className="text-balance font-sans text-4xl font-semibold leading-[1.08] tracking-tight text-paper sm:text-5xl md:text-6xl lg:text-7xl"
        >
          Votre boutique vend, répond et relance.
          <br />
          <span className="text-paper/50">Toute seule.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.25, ease }}
          className="mt-6 max-w-2xl text-pretty text-[17px] leading-relaxed text-paper/70 md:mt-8 md:text-xl"
        >
          Shimmer met un <span className="text-paper">vendeur IA dans votre barre de recherche</span>,
          répond au SAV à votre place et relance les paniers abandonnés.
          Installé en 30 minutes. Prouvé à l&apos;euro près.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4, ease }}
          className="mt-9 flex w-full flex-col items-stretch justify-center gap-3 sm:w-auto sm:flex-row sm:items-center md:mt-11"
        >
          <a
            href={AUDIT_MAILTO}
            className="btn btn-acid group inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full bg-acid px-8 py-4 font-sans text-[15px] font-medium text-ink"
          >
            Obtenir mon audit gratuit
            <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
          </a>
          <a
            href="/shimmer/demo/"
            className="btn btn-ghost inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full border border-paper/25 px-8 py-4 font-sans text-[15px] font-medium text-paper"
          >
            Voir les démos
          </a>
        </motion.div>
      </div>

      {/* Indicateur de scroll, façon souris */}
      <motion.a
        href="#modules"
        aria-label="Découvrir"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.5 }}
        className="absolute bottom-7 left-1/2 z-10 hidden -translate-x-1/2 md:block"
      >
        <motion.span
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          className="flex h-10 w-6 items-start justify-center rounded-full border-2 border-paper/25 p-1.5"
        >
          <span className="h-2 w-1 rounded-full bg-paper/50" />
        </motion.span>
      </motion.a>
    </section>
  );
}
