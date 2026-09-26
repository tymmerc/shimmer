import type { ReactNode } from 'react';

/**
 * Le « en savoir plus » d'une section : le titre suffit à lire la page,
 * l'explication est là pour qui la veut, repliée. Natif (<details>), zéro JS,
 * même pattern que dans l'admin. Retour Tym : les paragraphes d'intro sous
 * les titres « surchargent, c'est pas nécessaire ».
 */
export function SectionMore({
  label = 'En savoir plus',
  children,
  className = '',
}: {
  label?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <details className={`group mt-5 max-w-[60ch] md:mt-7 ${className}`}>
      <summary className="flex w-fit cursor-pointer select-none list-none items-center gap-2.5 font-mono text-[11px] uppercase tracking-[0.18em] text-paper/50 transition hover:text-paper [&::-webkit-details-marker]:hidden">
        <span className="inline-block w-3 text-center text-acid transition-transform duration-300 group-open:rotate-45">+</span>
        {label}
      </summary>
      <p className="mt-3 text-pretty text-[15px] leading-relaxed text-paper/65 md:text-lg">{children}</p>
    </details>
  );
}
