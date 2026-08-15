// Pricing reframé. Le forfait fixe couvre TOUTE la suite (les 9 modules
// branchés). La part variable est le bonus de preuve sur la partie mesurable
// par holdout (le vendeur conversationnel). Pas d'animations Framer ici, c'est
// une grille de 3 cartes lisible immédiatement, mobile-friendly.

export function DarkPricing() {
  return (
    <section
      id="pricing"
      className="relative w-full border-t border-paper/10 bg-ink py-24 md:py-36"
    >
      <div className="relative z-10 mx-auto max-w-[1480px] px-6 md:px-12">
        <div className="mb-12 flex items-baseline gap-6">
          <span className="font-mono text-[11px] uppercase tracking-[0.24em] text-acid">
            Tarif
          </span>
          <span className="h-px flex-1 bg-paper/10" />
        </div>

        <h2 className="max-w-[26ch] font-display text-balance text-[clamp(36px,5.5vw,88px)] font-normal leading-[0.95] tracking-tightest text-paper">
          Un forfait pour{' '}
          <span className="italic text-acid">toute la suite</span>.
          <br />
          Une variable, seulement sur la preuve.
        </h2>
        <p className="mt-6 max-w-[60ch] text-pretty text-base leading-relaxed text-paper/70 md:text-lg">
          Le forfait couvre les neuf modules branchés. Vendeur, ventes additionnelles, paniers, SAV,
          avis, suivi, campagnes, mesure. La part variable se déclenche uniquement sur la partie
          mesurable (le vendeur conversationnel), et seulement quand l'effet est statistiquement net.
        </p>

        <div className="mt-12 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <article className="rounded-2xl border border-paper/10 bg-paper/[0.02] p-7">
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-paper/50">
              Forfait, toute la suite
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="font-display text-[80px] leading-none text-paper">89</span>
              <span className="font-mono text-sm text-paper/60">€/mois</span>
            </div>
            <p className="mt-5 text-sm leading-relaxed text-paper/70">
              Les neuf modules connectés, en service dès le passage en ligne.
            </p>
            <ul className="mt-5 space-y-2 text-sm text-paper/65">
              <li>Vendeur, ventes additionnelles</li>
              <li>SAV, suivi, relance panier</li>
              <li>Avis, campagnes pub, newsletters</li>
              <li>Dashboard et KPIs par service</li>
            </ul>
          </article>

          <article className="rounded-2xl border border-acid/40 bg-acid/[0.04] p-7">
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-acid">
              Variable, seulement si prouvée
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="font-display text-[80px] leading-none text-paper">5</span>
              <span className="font-mono text-sm text-paper/70">% de l'incrémental prouvé</span>
            </div>
            <p className="mt-5 text-sm leading-relaxed text-paper/80">
              Plafonnée à <span className="text-acid">267 €/mois</span>, facturée le mois suivant.
              Inactive tant que la preuve statistique n'est pas faite.
            </p>
            <ul className="mt-5 space-y-2 text-sm text-paper/75">
              <li>Mesurée par holdout 10 % visiteurs</li>
              <li>Plafond connu à la signature</li>
              <li>Aucune mesure nette, aucune variable</li>
            </ul>
          </article>

          <article className="rounded-2xl border border-paper/10 bg-paper/[0.02] p-7">
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-paper/50">
              À comparer
            </div>
            <div className="mt-4 font-display text-3xl leading-tight text-paper/85">
              200 à 500 €/mois
            </div>
            <p className="mt-5 text-sm leading-relaxed text-paper/60">
              Ce qu'un marchand paie pour cumuler chat, emailing, avis, SAV, suivi, relance, campagnes
              chez 8 SaaS séparés. Aucun ne prouve son incrémental.
            </p>
          </article>
        </div>

        <div className="mt-12 max-w-[68ch] rounded-2xl border border-paper/10 bg-paper/[0.02] p-6 md:p-8">
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-paper/50">
            Comment lire ce tarif
          </div>
          <p className="mt-3 text-sm leading-relaxed text-paper/75">
            Le forfait paie la suite complète. Le SAV, les avis, les campagnes pub ne sont pas mesurables
            par holdout (leur effet se diffuse sur tous les visiteurs), donc inclus dans le forfait. Le
            vendeur, lui, est mesurable. C'est sur cette mesure, et seulement quand elle est nette, que
            la variable se déclenche.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-paper">
            Si la preuve ne tombe jamais, vous payez 89 €. Si elle tombe, vous payez 5 % d'un chiffre
            réel, plafonné. Pas de pourcentage du CA total. Pas de prélèvement à l'aveugle.
          </p>
        </div>
      </div>
    </section>
  );
}
