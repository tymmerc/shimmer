import { AUDIT_MAILTO } from '@/lib/audit';

/** Footer léger : une ligne, les liens essentiels, la souveraineté. */
export function SiteFooter() {
  return (
    <footer className="relative z-10 w-full border-t border-paper/10 px-6 py-10 md:px-12 md:py-14">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-8 md:flex-row md:items-end md:justify-between md:gap-10">
        <div>
          <a href="#top" className="font-display text-2xl font-medium tracking-tight text-paper">
            Shimmer<span className="text-acid">.</span>
          </a>
          <p className="mt-3 max-w-[34ch] text-pretty text-sm leading-relaxed text-paper/55">
            Le cerveau IA de votre boutique. Données et IA en France, RGPD aligné.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-x-8 gap-y-3 font-mono text-[11px] uppercase tracking-[0.18em] text-paper/55">
          <a href="#automatisations" className="transition hover:text-paper">Ce que ça fait</a>
          <a href="#preuve" className="transition hover:text-paper">La preuve</a>
          <a href="/shimmer/demo/" className="transition hover:text-paper">Démos</a>
          <a href={AUDIT_MAILTO} className="text-acid transition hover:text-acid-deep">Audit gratuit</a>
        </div>
      </div>

      <div className="mx-auto mt-8 max-w-[1400px] border-t border-paper/10 pt-6 font-mono text-[10px] uppercase tracking-[0.2em] text-paper/35 md:mt-10">
        © 2026 Shimmer · Tym Mercier
      </div>
    </footer>
  );
}
