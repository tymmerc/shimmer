'use client';

// La mesure comme bénéfice marchand : "tout au même endroit". Les cartes se
// révèlent au scrub, le CTA vers le dashboard de démo est central et visible.

import { ScrubIn } from './ScrubIn';

const blocks = [
  {
    label: 'En haut',
    title: 'Ce que vous avez vendu, à l\'euro près',
    detail: 'CA total, panier moyen, commandes, écart vs mois précédent. Sans calcul, sans export Excel.',
  },
  {
    label: 'Une ligne sous',
    title: 'Quatre indicateurs qui comptent',
    detail: 'Paniers récupérés en euros, note moyenne des avis, tickets SAV résolus, take-rate cross-sell. Chacun avec sa variation.',
  },
  {
    label: 'Plus bas',
    title: 'La tendance, sur 14 jours',
    detail: 'Une seule courbe lisible. Vous voyez si ça monte ou si ça plafonne, sans plonger dans trois outils.',
  },
  {
    label: 'Par service',
    title: 'Une vue par équipe',
    detail: 'Le SAV voit ses tickets. Le marketing voit ses campagnes. Le commercial voit son CA. Personne ne se noie.',
  },
];

export function DarkDashboard() {
  return (
    <section
      id="mesure"
      className="relative w-full scroll-mt-16 border-t border-paper/10 bg-ink py-24 md:py-36"
    >
      <div className="mx-auto max-w-[1480px] px-6 md:px-12">
        <div className="mb-12 flex items-baseline gap-6">
          <span className="font-mono text-[11px] uppercase tracking-[0.24em] text-acid">
            Mesurer
          </span>
          <span className="h-px flex-1 bg-paper/10" />
        </div>

        <h2 className="mb-8 max-w-[24ch] font-display text-balance text-[clamp(36px,5.5vw,80px)] font-normal leading-[0.95] tracking-tightest text-paper">
          Tout votre chiffre,{' '}
          <span className="italic text-acid">au même endroit</span>.
        </h2>
        <p className="copy mb-14 max-w-[52ch] text-pretty text-lg leading-relaxed text-paper/70 md:text-xl">
          Un seul tableau de bord pour le CA, les commandes, le SAV, les avis, les campagnes,
          le suivi. Fini de jongler entre outils pour reconstituer la vérité.
        </p>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {blocks.map((b) => (
            <ScrubIn key={b.title}>
              <article className="h-full rounded-2xl border border-paper/10 bg-paper/[0.02] p-7 md:p-9">
                <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-paper/45">
                  {b.label}
                </div>
                <h3 className="mt-4 font-display text-2xl leading-tight tracking-editorial text-paper md:text-3xl">
                  {b.title}
                </h3>
                <p className="copy mt-4 text-base leading-relaxed text-paper/70 md:text-lg">{b.detail}</p>
              </article>
            </ScrubIn>
          ))}
        </div>

        {/* CTA centré et visible : c'est la porte d'entrée vers la démo */}
        <div className="mt-14 flex justify-center">
          <a
            href="/shimmer/admin/"
            className="btn btn-acid group inline-flex items-center gap-3 rounded-full bg-acid px-9 py-5 font-sans text-base uppercase tracking-[0.16em] text-ink"
          >
            Ouvrir le dashboard de démonstration
            <span className="transition-transform duration-300 group-hover:translate-x-1.5">→</span>
          </a>
        </div>
      </div>
    </section>
  );
}
