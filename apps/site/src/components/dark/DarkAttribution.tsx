'use client';

// Section "la preuve" : le cœur du positionnement. On ne facture que l'effet
// prouvé par groupe témoin, vérifiable, là où les concurrents facturent du
// "CA influencé" invérifiable. Scène pinnée (HoldoutScene) + comparaison.

import { HoldoutScene, HoldoutFlat } from './HoldoutScene';
import { ScrubIn } from './ScrubIn';

export function DarkAttribution() {
  return (
    <section id="preuve" className="relative w-full scroll-mt-16 border-t border-paper/10 bg-ink">
      <div className="mx-auto max-w-[1480px] px-6 pt-24 md:px-12 md:pt-36">
        <div className="mb-12 flex items-baseline gap-6">
          <span className="font-mono text-[11px] uppercase tracking-[0.24em] text-acid">
            La preuve
          </span>
          <span className="h-px flex-1 bg-paper/10" />
        </div>

        <h2 className="max-w-[26ch] font-display text-balance text-[clamp(36px,5.5vw,84px)] font-normal leading-[0.95] tracking-tightest text-paper">
          On est les seuls à prouver{' '}
          <span className="italic text-acid">ce qu'on rapporte</span>.
        </h2>
        <p className="copy mt-8 max-w-[54ch] text-pretty text-lg leading-relaxed text-paper/75 md:text-xl">
          Les autres outils s'attribuent toute vente qui suit une conversation, même celles qui
          auraient eu lieu sans eux. Du "CA influencé", invérifiable. Nous, on se mesure contre
          un groupe témoin. Voilà comment, en quatre temps.
        </p>
      </div>

      {/* Desktop : scène pinnée. Mobile : les 4 temps à plat. */}
      <HoldoutScene />
      <div className="mx-auto max-w-[1480px] px-6 pt-14 md:px-12 lg:hidden">
        <HoldoutFlat />
      </div>

      <div className="mx-auto max-w-[1480px] px-6 pb-24 md:px-12 md:pb-36">
        {/* Eux / nous, en clair */}
        <div className="mt-16 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ScrubIn>
            <article className="h-full rounded-2xl border border-paper/10 bg-paper/[0.02] p-7 md:p-9">
              <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-paper/45">
                Méthode habituelle
              </div>
              <div className="mt-4 font-display text-2xl leading-tight text-paper/85 md:text-3xl">
                Attribution gonflée, fenêtre arbitraire
              </div>
              <ul className="copy mt-6 space-y-3 text-base text-paper/65 md:text-lg">
                <li>Toute vente après une conversation est créditée au chat.</li>
                <li>Y compris celles qui seraient arrivées sans rien.</li>
                <li>Pas de comparaison, pas de témoin, juste une estimation.</li>
              </ul>
            </article>
          </ScrubIn>
          <ScrubIn>
            <article className="h-full rounded-2xl border border-acid/40 bg-acid/[0.04] p-7 md:p-9">
              <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-acid">
                Shimmer
              </div>
              <div className="mt-4 font-display text-2xl leading-tight text-paper md:text-3xl">
                Holdout, mesuré sur vos données
              </div>
              <ul className="copy mt-6 space-y-3 text-base text-paper/80 md:text-lg">
                <li>10 % de vos visiteurs en groupe témoin, tirés au sort.</li>
                <li>Comparaison du revenu par visiteur, exposés vs témoin.</li>
                <li>Tant que l'effet n'est pas net, on ne s'attribue rien.</li>
              </ul>
            </article>
          </ScrubIn>
        </div>

        <details className="mt-12 max-w-[70ch] rounded-2xl border border-paper/10 bg-paper/[0.02] p-6">
          <summary className="cursor-pointer font-mono text-[11px] uppercase tracking-[0.22em] text-paper/55 transition-colors hover:text-paper/85">
            Méthode statistique, pour qui veut creuser
          </summary>
          <div className="copy mt-5 space-y-4 text-base leading-relaxed text-paper/65">
            <p>
              Bootstrap bayésien (Rubin, 1981) sur la moyenne de revenu par visiteur, par groupe. Posterior
              non paramétrique, robuste à la nature zero-inflated des paniers e-commerce. On en tire un
              intervalle de crédibilité et la probabilité P(uplift &gt; seuil minimum).
            </p>
            <p>
              Le seuil minimum (effet économiquement utile, défaut 5 %) est paramétrable par boutique. La
              part variable ne se déclenche que lorsque P(uplift &gt; seuil) ≥ 95 %, et tant que l'effet
              point estime reste positif. Tous les chiffres sont auditables côté client.
            </p>
          </div>
        </details>
      </div>
    </section>
  );
}

