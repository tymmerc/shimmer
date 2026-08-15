'use client';

// CTA final + footer. Allégé (retour testeur : footer disproportionné) :
// titre moins massif, respirations réduites, footer sur une ligne compacte.
// Le CTA principal porte l'audit gratuit (accroche commerciale n°1) ; le
// signup reste accessible en CTA secondaire "Brancher ma boutique".

import { AUDIT_MAILTO } from '@/lib/audit';

export function DarkEpilogue() {
  return (
    <section className="relative w-full overflow-hidden bg-ink pt-24 md:pt-32">
      <div className="pointer-events-none absolute -inset-x-32 bottom-0 h-[45vh] bg-gradient-to-t from-toxic-700/25 to-transparent blur-[60px]" />

      <div className="relative z-10 mx-auto max-w-[1480px] px-6 text-center md:px-12">
        <span className="inline-block font-mono text-[11px] uppercase tracking-[0.24em] text-acid">
          On commence par un audit gratuit
        </span>
        <h2 className="mx-auto mt-6 max-w-[24ch] font-display text-balance text-[clamp(40px,6.5vw,110px)] font-normal leading-[0.92] tracking-tightest text-paper">
          Votre boutique laisse filer du chiffre.
          <br />
          On vous montre <span className="italic text-acid">combien, gratuitement</span>.
        </h2>
        <p className="copy mx-auto mt-8 max-w-[56ch] text-pretty text-lg leading-relaxed text-paper/70 md:text-xl">
          On analyse votre boutique et on vous montre, chiffré, ce qui fuit : les recherches sans
          résultat, les paniers jamais relancés, les avis jamais demandés. Si on ne voit rien à
          récupérer, on vous le dit franchement.
        </p>

        <div className="mt-12 flex flex-wrap items-center justify-center gap-4">
          <a
            href={AUDIT_MAILTO}
            className="btn btn-acid group inline-flex items-center gap-2 rounded-full bg-acid px-8 py-5 font-sans text-sm uppercase tracking-[0.18em] text-ink"
          >
            Obtenir mon audit gratuit
            <span className="transition-transform duration-300 group-hover:translate-x-1.5">→</span>
          </a>
          <a
            href="/shimmer/demo/"
            className="btn btn-ghost inline-flex items-center gap-2 rounded-full border border-paper/25 px-8 py-5 font-sans text-sm uppercase tracking-[0.18em] text-paper"
          >
            Tester les démos
          </a>
          <a
            href="/shimmer/signup/"
            className="btn btn-ghost inline-flex items-center gap-2 rounded-full border border-paper/15 px-8 py-5 font-sans text-sm uppercase tracking-[0.18em] text-paper/70"
          >
            Brancher ma boutique
          </a>
        </div>

        <p className="mx-auto mt-8 max-w-[54ch] font-mono text-[11px] uppercase tracking-[0.22em] text-paper/45">
          Gratuit · Sans engagement · 30 min de restitution · Réponse sous 24 h
        </p>
      </div>

      <footer className="relative z-10 mt-16 border-t border-paper/10 px-6 py-6 md:px-12">
        <div className="mx-auto flex max-w-[1480px] flex-wrap items-center justify-between gap-3 font-mono text-[11px] uppercase tracking-[0.18em] text-paper/45">
          <div>Shimmer · le vendeur en ligne · 2026</div>
          <div className="flex gap-6">
            <a href="/shimmer/demo/" className="transition-colors hover:text-paper">Démos</a>
            <a href="/shimmer/signup/" className="transition-colors hover:text-paper">Signup</a>
            <a href="/shimmer/admin/" className="transition-colors hover:text-paper">Admin</a>
            <a href="mailto:tym.mercier@gmail.com" className="transition-colors hover:text-paper">Contact</a>
          </div>
        </div>
      </footer>
    </section>
  );
}
