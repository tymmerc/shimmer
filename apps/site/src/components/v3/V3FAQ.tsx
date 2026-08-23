'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const FAQS = [
  {
    q: 'C’est un chatbot de plus ?',
    a: 'Non. Le vendeur vit dans votre barre de recherche, là où vos visiteurs cherchent déjà — pas dans une bulle en coin de page. Il comprend « un vin pour un barbecue », pose la bonne question comme en magasin, et recommande vos produits. Le chatbot SAV, lui, est un module séparé.',
  },
  {
    q: 'Ça marche avec ma boutique ?',
    a: 'Shopify et WooCommerce aujourd’hui. L’installation, c’est une ligne de code posée par nous : rien à développer de votre côté, et votre site n’est pas modifié.',
  },
  {
    q: 'Où vont mes données ?',
    a: 'IA locale et données hébergées en France par défaut, RGPD aligné. Si vous voulez le meilleur modèle du marché (Claude), c’est en option, avec votre propre clé.',
  },
  {
    q: 'Et si ça ne rapporte rien ?',
    a: '10 % de vos visiteurs ne voient jamais Shimmer : c’est le groupe témoin. La part au résultat ne porte que sur l’écart prouvé entre les deux groupes, mesuré sur vos vraies commandes. Pas d’écart, pas de part.',
  },
  {
    q: 'Je peux arrêter quand ?',
    a: 'Quand vous voulez. Sans engagement : on retire la ligne de code, votre boutique redevient exactement comme avant.',
  },
];

function Item({ q, a, open, onToggle }: { q: string; a: string; open: boolean; onToggle: () => void }) {
  return (
    <div className="rounded-2xl border border-paper/10 bg-paper/[0.03] transition-colors duration-300 hover:border-paper/20">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left md:px-6 md:py-5"
      >
        <span className="font-sans text-[15px] font-semibold tracking-tight text-paper md:text-base">{q}</span>
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-paper/20 text-paper/60 transition-transform duration-300 ${
            open ? 'rotate-45 border-acid/40 text-acid' : ''
          }`}
        >
          +
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.25, 0.4, 0.25, 1] }}
            className="overflow-hidden"
          >
            <p className="px-5 pb-5 text-pretty text-[15px] leading-relaxed text-paper/65 md:px-6">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** FAQ accordéon — les vraies objections, répondues sans détour. */
export function V3FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="relative z-10 w-full scroll-mt-16 px-6 py-24 md:py-32">
      <div className="mx-auto max-w-2xl">
        <div className="mb-10 text-center md:mb-14">
          <h2 className="text-balance font-sans text-3xl font-semibold tracking-tight text-paper md:text-5xl">
            Les questions qu&apos;on nous pose.
          </h2>
        </div>
        <div className="space-y-3">
          {FAQS.map((f, i) => (
            <Item
              key={f.q}
              q={f.q}
              a={f.a}
              open={open === i}
              onToggle={() => setOpen(open === i ? null : i)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
