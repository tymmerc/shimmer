'use client';

// Repères de navigation par section (retour testeur : "scrollbar custom avec
// points de repère"). Rail fixe à droite, un point par section, label au
// survol, la section active est suivie par IntersectionObserver. Desktop
// uniquement : sur mobile ça mangerait de la largeur utile.

import { useEffect, useState } from 'react';

const sections = [
  { id: 'probleme', label: 'Le problème' },
  { id: 'capacites', label: 'Les capacités' },
  { id: 'connecte', label: 'Tout connecté' },
  { id: 'mesure', label: 'Mesurer' },
  { id: 'preuve', label: 'La preuve' },
  { id: 'audit', label: 'Audit gratuit' },
  { id: 'parcours', label: 'Le parcours' },
  { id: 'boutiques', label: 'Boutiques' },
  { id: 'brancher', label: 'Brancher' },
];

export function SectionDots() {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        // La section la plus visible autour du centre de l'écran gagne.
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) setActive(visible[0].target.id);
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: 0 },
    );
    const els = sections
      .map((s) => document.getElementById(s.id))
      .filter((el): el is HTMLElement => el !== null);
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const jump = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <nav
      aria-label="Sections de la page"
      className="fixed right-5 top-1/2 z-50 hidden -translate-y-1/2 flex-col items-end gap-3 xl:flex"
    >
      {sections.map((s) => {
        const isActive = s.id === active;
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => jump(s.id)}
            aria-label={s.label}
            aria-current={isActive ? 'true' : undefined}
            className="group flex items-center gap-3 py-0.5"
          >
            {/* Label au survol uniquement : affiché en permanence il chevauche
                les cartes pleine largeur sur écran moyen. */}
            <span
              className={`whitespace-nowrap rounded-md bg-ink/85 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.2em] opacity-0 backdrop-blur-sm transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100 ${
                isActive ? 'translate-x-2 text-acid' : 'translate-x-2 text-paper/70'
              }`}
            >
              {s.label}
            </span>
            <span
              className={`rounded-full transition-all duration-300 ${
                isActive
                  ? 'h-2.5 w-2.5 bg-acid shadow-[0_0_12px_rgba(212,255,58,0.8)]'
                  : 'h-1.5 w-1.5 bg-paper/30 group-hover:bg-paper/70'
              }`}
            />
          </button>
        );
      })}
    </nav>
  );
}
