'use client';

import { AUDIT_MAILTO } from '@/lib/audit';

/** Nav minimale, partagée. Trois ancres, un CTA audit. */
export function SiteNav() {
  return (
    <header className="absolute left-0 right-0 top-0 z-40 px-6 py-6 md:px-12">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between">
        <a href="#top" className="font-display text-xl font-medium tracking-tight text-paper">
          Shimmer<span className="text-acid">.</span>
        </a>
        <nav className="hidden gap-8 md:flex">
          <a href="#automatisations" className="font-mono text-[11px] uppercase tracking-[0.2em] text-paper/55 transition hover:text-paper">
            Ce que ça fait
          </a>
          <a href="#preuve" className="font-mono text-[11px] uppercase tracking-[0.2em] text-paper/55 transition hover:text-paper">
            La preuve
          </a>
          <a href="/shimmer/demo/" className="font-mono text-[11px] uppercase tracking-[0.2em] text-paper/55 transition hover:text-paper">
            Démos
          </a>
        </nav>
        <a
          href={AUDIT_MAILTO}
          className="btn btn-acid rounded-full bg-acid px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.18em] text-ink"
        >
          Audit gratuit
        </a>
      </div>
    </header>
  );
}
