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
 *
 * Pas de pastille « badge » au-dessus du titre (le point vert qui pulse dans
 * une capsule, c'est le tic de tous les sites générés) : la cible est dite
 * en une ligne simple sous les boutons.
 */
export function V3Hero() {
  return (
    <section id="top" className="relative flex min-h-screen w-full flex-col overflow-hidden">
      <div className="pointer-events-none absolute inset-0 z-0">
        <ToxicCanvas className="h-full w-full" />
      </div>

      {/* Voiles ink : le texte est centré, la lisibilité vient d'un voile
          radial au centre + raccords haut/bas. Sur téléphone la toxine est
          déjà une nappe CSS plus douce : le voile est allégé, sinon la page
          est noire. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[3] hidden md:block"
        style={{
          background:
            'radial-gradient(58% 52% at 50% 46%, rgba(13,11,20,0.86), rgba(13,11,20,0.42) 62%, rgba(13,11,20,0) 100%)',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[3] md:hidden"
        style={{
          background:
            'radial-gradient(70% 46% at 50% 50%, rgba(13,11,20,0.5), rgba(13,11,20,0.18) 65%, rgba(13,11,20,0) 100%)',
        }}
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[3] h-28 bg-gradient-to-b from-ink/80 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[3] h-40 bg-gradient-to-t from-ink to-transparent" />

      <SiteNav />

      <div className="relative z-10 mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-6 pb-20 pt-24 text-center md:pb-24 md:pt-28">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1, ease }}
          className="text-balance font-sans text-[30px] font-semibold leading-[1.1] tracking-tight text-paper sm:text-5xl md:text-6xl lg:text-7xl"
        >
          Votre boutique vend, répond et relance.
          <br />
          <span className="text-paper/50">Toute seule.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.25, ease }}
          className="mt-5 max-w-2xl text-pretty text-[15px] leading-relaxed text-paper/70 md:mt-8 md:text-xl"
        >
          Shimmer met un <span className="text-paper">vendeur IA dans votre barre de recherche</span>,
          répond au SAV à votre place et relance les paniers abandonnés.
          Installé en 30 minutes. Prouvé à l&apos;euro près.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4, ease }}
          className="mt-8 flex w-full flex-col items-stretch justify-center gap-3 sm:w-auto sm:flex-row sm:items-center md:mt-11"
        >
          <a
            href={AUDIT_MAILTO}
            className="btn btn-acid inline-flex items-center justify-center whitespace-nowrap rounded-full bg-acid px-7 py-3.5 font-sans text-[14px] font-medium text-ink md:px-8 md:py-4 md:text-[15px]"
          >
            Obtenir mon audit gratuit
          </a>
          <a
            href="/shimmer/demo/"
            className="btn btn-ghost inline-flex items-center justify-center whitespace-nowrap rounded-full border border-paper/25 px-7 py-3.5 font-sans text-[14px] font-medium text-paper md:px-8 md:py-4 md:text-[15px]"
          >
            Voir les démos
          </a>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.55, ease }}
          className="mt-6 text-[13px] text-paper/45 md:mt-7 md:text-[14px]"
        >
          Shopify et WooCommerce. Hébergé en France.
        </motion.p>
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
