'use client';

import { AUDIT_MAILTO } from '@/lib/audit';

/**
 * Nav minimale, partagée. Trois ancres, et l'audit en simple lien texte : le
 * vrai bouton est dans le hero, juste en dessous. Sur téléphone, seul le logo
 * reste (les CTA du hero suffisent, pas de bouton jaune collé en haut à droite).
 */
export function SiteNav() {
  return (
    <header className="absolute left-0 right-0 top-0 z-40 px-6 py-5 md:px-10">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between">
        <a href="#top" className="font-display text-xl font-medium tracking-tight text-paper">
          Shimmer<span className="text-acid">.</span>
        </a>
        <nav className="hidden items-center gap-8 md:flex">
          <a href="#automatisations" className="font-mono text-[11px] uppercase tracking-[0.2em] text-paper/55 transition hover:text-paper">
            Ce que ça fait
          </a>
          <a href="#preuve" className="font-mono text-[11px] uppercase tracking-[0.2em] text-paper/55 transition hover:text-paper">
            La preuve
          </a>
          <a href="/shimmer/demo/" className="font-mono text-[11px] uppercase tracking-[0.2em] text-paper/55 transition hover:text-paper">
            Démos
          </a>
          <a
            href={AUDIT_MAILTO}
            className="ml-2 border-b border-paper/30 pb-px font-mono text-[11px] uppercase tracking-[0.2em] text-paper/85 transition hover:border-paper hover:text-paper"
          >
            Demander un audit
          </a>
        </nav>
      </div>
    </header>
  );
}
