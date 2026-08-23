'use client';

import { AUDIT_MAILTO } from '@/lib/audit';

/** Nav minimale, partagée. Quatre ancres, un CTA audit. */
export function SiteNav() {
  return (
    <header className="absolute left-0 right-0 top-0 z-40 px-6 py-5 md:px-10">
      <div className="mx-auto flex max-w-[1200px] items-center justify-between">
        <a href="#top" className="font-display text-xl font-medium tracking-tight text-paper">
          Shimmer<span className="text-acid">.</span>
        </a>
        <nav className="hidden gap-7 md:flex">
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
        </nav>
        <a
          href={AUDIT_MAILTO}
          className="btn btn-acid whitespace-nowrap rounded-full bg-acid px-5 py-2.5 font-sans text-[13px] font-medium text-ink"
        >
          Audit gratuit
        </a>
      </div>
    </header>
  );
}
