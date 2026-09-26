'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const ease = [0.22, 1, 0.36, 1] as const;

const QUERY = 'un blanc pour des huîtres';
const REPLY = 'Un Muscadet sur lie, vif et iodé, parfait avec les huîtres. Je vous en montre trois ?';
const PICKS = ['Muscadet · 9 €', 'Chablis · 19 €', 'Picpoul · 11 €'];

/**
 * Aperçu produit du hero, téléphone uniquement. Sur desktop la toxine occupe
 * la moitié droite ; sur un écran portrait elle est derrière le texte et le
 * bas du hero était vide. On y met le vendeur en action : la requête se
 * tape, la réponse arrive, les produits suivent. Léger, autonome, sans
 * dépendre du scroll.
 */
export function HeroTeaser({ className = '' }: { className?: string }) {
  const [typed, setTyped] = useState('');
  const [phase, setPhase] = useState(0); // 0 frappe · 1 réponse · 2 produits

  useEffect(() => {
    let i = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const start = setTimeout(() => {
      const iv = setInterval(() => {
        i += 1;
        setTyped(QUERY.slice(0, i));
        if (i >= QUERY.length) {
          clearInterval(iv);
          timers.push(setTimeout(() => setPhase(1), 450));
          timers.push(setTimeout(() => setPhase(2), 1100));
        }
      }, 55);
      timers.push(iv as unknown as ReturnType<typeof setTimeout>);
    }, 900);
    timers.push(start);
    return () => timers.forEach((t) => clearTimeout(t));
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease, delay: 0.55 }}
      className={`rounded-2xl border border-paper/12 bg-ink/55 p-3 backdrop-blur-md ${className}`}
    >
      <div className="mb-2.5 font-mono text-[10px] uppercase tracking-[0.18em] text-paper/45">
        Le vendeur IA <span className="text-acid">· en direct</span>
      </div>

      <div className="flex items-center gap-3 rounded-full border border-paper/15 bg-ink/60 px-4 py-2">
        <span className="text-paper/40">⌕</span>
        <span className="text-sm text-paper/85">
          {typed}
          {phase === 0 && <span className="ml-0.5 inline-block w-px animate-pulse text-acid">|</span>}
        </span>
      </div>

      <motion.div
        initial={false}
        animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
        transition={{ duration: 0.4, ease }}
        className="mt-2 rounded-xl border border-acid/25 bg-acid/[0.07] px-3.5 py-2"
      >
        <p className="text-[13px] leading-snug text-paper/90">{REPLY}</p>
      </motion.div>

      {/* Une seule ligne, défilement horizontal : la 3e puce dépasse un peu,
          c'est voulu, ça dit « il y en a d'autres ». */}
      <div className="-mx-3 mt-2 flex gap-2 overflow-x-auto px-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {PICKS.map((p, i) => (
          <motion.span
            key={p}
            initial={false}
            animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 6 }}
            transition={{ duration: 0.35, ease, delay: phase >= 2 ? i * 0.08 : 0 }}
            className="shrink-0 whitespace-nowrap rounded-lg border border-paper/12 bg-ink/60 px-2.5 py-1.5 font-mono text-[11px] text-paper/75"
          >
            {p}
          </motion.span>
        ))}
      </div>
    </motion.div>
  );
}
