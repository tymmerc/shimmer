'use client';

import { AUDIT_MAILTO } from '@/lib/audit';

/**
 * Nav minimale, partagée. Quatre ancres, et l'audit en simple lien texte : le
 * vrai bouton est dans le hero, juste en dessous. Sur téléphone, seul le logo
 * reste (les CTA du hero suffisent, pas de bouton jaune collé en haut à droite).
 */
export function SiteNav() {
  return (
    <header className="absolute left-0 right-0 top-0 z-40 px-6 py-5 md:px-10">
      <div className="mx-auto flex max-w-[1200px] items-center justify-between">
        <a href="#top" className="font-display text-xl font-medium tracking-tight text-paper">
          Shimmer<span className="text-acid">.</span>
        </a>
        <nav className="hidden items-center gap-7 md:flex">
          <a href="#modules" className="text-[14px] text-paper/60 transition hover:text-paper">
            Ce que ça fait
          </a>
          <a href="#preuve" className="text-[14px] text-paper/60 transition hover:text-paper">
            La preuve
          </a>
          <a href="#offre" className="text-[14px] text-paper/60 transition hover:text-paper">
            L&apos;offre
          </a>
          <a href="/shimmer/demo/" className="text-[14px] text-paper/60 transition hover:text-paper">
            Démos
          </a>
          <a
            href={AUDIT_MAILTO}
            className="ml-3 border-b border-paper/30 pb-px text-[14px] text-paper/85 transition hover:border-paper hover:text-paper"
          >
            Demander un audit
          </a>
        </nav>
      </div>
    </header>
  );
}
