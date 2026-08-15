// Section "le problème" : la fragmentation, sans citer de concurrents ni de
// prix. Deux colonnes équilibrées (même taille, même opacité, retour testeur)
// avec un intitulé mono pour guider la lecture.

export function DarkProblem() {
  return (
    <section
      id="probleme"
      className="relative w-full scroll-mt-16 border-t border-paper/10 bg-ink py-24 md:py-36"
    >
      <div className="mx-auto max-w-[1480px] px-6 md:px-12">
        <div className="mb-12 flex items-baseline gap-6">
          <span className="font-mono text-[11px] uppercase tracking-[0.24em] text-paper/55">
            Le problème
          </span>
          <span className="h-px flex-1 bg-paper/10" />
        </div>

        <h2 className="max-w-[28ch] font-display text-balance text-[clamp(36px,5.5vw,80px)] font-normal leading-[0.95] tracking-tightest text-paper">
          Vos ventes vous filent entre les doigts pendant que{' '}
          <span className="italic text-acid">vous gérez le reste</span>.
        </h2>

        <div className="mt-12 grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-16">
          <div className="border-t border-paper/15 pt-6">
            <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-paper/45">
              Ce qui fuit, tous les jours
            </div>
            <ul className="mt-6 space-y-5">
              {[
                ['Une recherche sans résultat.', 'Le visiteur repart les mains vides.'],
                ['Un panier plein, abandonné.', 'Personne ne le relance.'],
                ['Les mails clients qui s’empilent.', 'Vous répondez le soir, épuisé.'],
                ['Un avis 2 étoiles sur Google.', 'Vu quand il est déjà public.'],
              ].map(([lead, tail]) => (
                <li key={lead} className="flex gap-4 text-pretty">
                  <span className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-acid/70" />
                  <span className="text-lg leading-snug md:text-xl">
                    <span className="font-medium text-paper">{lead}</span>{' '}
                    <span className="text-paper/55">{tail}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div className="border-t border-paper/15 pt-6">
            <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-paper/45">
              Pourquoi ça ne se règle pas
            </div>
            <p className="mt-6 text-pretty text-xl font-medium leading-snug text-paper md:text-2xl">
              Chaque fuite a son outil. Aucun ne parle aux autres.
            </p>
            <ul className="mt-6 space-y-4 text-lg leading-snug text-paper/60 md:text-xl">
              <li className="flex gap-4">
                <span className="font-mono text-sm text-paper/35">01</span>
                Des abonnements qui s&apos;empilent.
              </li>
              <li className="flex gap-4">
                <span className="font-mono text-sm text-paper/35">02</span>
                Du temps perdu à jongler d&apos;un outil à l&apos;autre.
              </li>
              <li className="flex gap-4">
                <span className="font-mono text-sm text-paper/35">03</span>
                Aucune vue d&apos;ensemble sur ce qui marche.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
