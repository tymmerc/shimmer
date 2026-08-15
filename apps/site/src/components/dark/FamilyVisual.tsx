// Mini-mockups statiques par famille de capacités. Volontairement légers :
// du DOM simple, zéro animation autonome, le mouvement vient du deck pinné.

const frame = 'rounded-2xl border border-paper/10 bg-black/40 p-5 xl:p-6';
const chipMono = 'font-mono text-[10px] uppercase tracking-[0.18em]';

export function FamilyVisual({ k }: { k: string }) {
  switch (k) {
    case 'vendre':
      return (
        <div className={frame} aria-hidden>
          <div className="flex items-center gap-2 rounded-full border border-paper/15 bg-paper/[0.05] px-4 py-2.5">
            <span className="text-paper/40">⌕</span>
            <span className="text-sm text-paper/85">vin pour un repas de dimanche</span>
            <span className="ml-auto h-4 w-px animate-pulse bg-acid" />
          </div>
          <div className="mt-4 rounded-xl border border-acid/25 bg-acid/[0.05] p-4">
            <div className={`${chipMono} text-acid`}>Le vendeur</div>
            <p className="mt-2 text-sm leading-relaxed text-paper/85">
              Viande ou poisson ? Pour un rôti, je vous propose ce Châteauneuf-du-Pape 2019, et le
              Maroilles fermier qui va avec.
            </p>
          </div>
          <div className="mt-3 flex gap-2">
            <span className="rounded-lg border border-paper/15 bg-paper/[0.04] px-3 py-1.5 text-xs text-paper/80">Châteauneuf 2019 · 24 €</span>
            <span className="rounded-lg border border-paper/15 bg-paper/[0.04] px-3 py-1.5 text-xs text-paper/80">Maroilles · 8 €</span>
          </div>
        </div>
      );
    case 'recuperer':
      return (
        <div className={frame} aria-hidden>
          <div className="flex items-center justify-between">
            <div className={`${chipMono} text-paper/45`}>Email · J+1</div>
            <span className="rounded-full border border-acid/30 bg-acid/10 px-2.5 py-0.5 font-mono text-[10px] text-acid">auto</span>
          </div>
          <div className="mt-3 rounded-xl border border-paper/15 bg-paper/[0.04] p-4">
            <div className="text-sm font-medium text-paper">Votre panier vous attend</div>
            <p className="mt-1.5 text-sm leading-relaxed text-paper/65">
              Bonjour Léa, vos 2 articles sont toujours réservés. Un doute sur la taille ? Répondez à ce mail.
            </p>
          </div>
          <div className="mt-3 flex items-center justify-between rounded-xl border border-paper/15 bg-paper/[0.04] p-4">
            <span className="text-sm text-paper/65">Relance 2 · J+2</span>
            <span className="rounded-md bg-acid px-2 py-0.5 font-mono text-[11px] font-medium text-ink">-10 %</span>
          </div>
        </div>
      );
    case 'servir':
      return (
        <div className={frame} aria-hidden>
          <div className={`${chipMono} text-paper/45`}>Boîte de réception · triée</div>
          <div className="mt-3 space-y-2">
            {[
              { s: 'Colis pas reçu, ça urge', tag: 'SAV · urgent', hot: true },
              { s: 'Ça se garde combien de temps ?', tag: 'Question', hot: false },
              { s: 'Super produit, merci !', tag: 'Avis', hot: false },
            ].map((m) => (
              <div key={m.s} className="flex items-center gap-3 rounded-xl border border-paper/15 bg-paper/[0.04] px-4 py-3">
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${m.hot ? 'bg-rose-400' : 'bg-acid/70'}`} />
                <span className="truncate text-sm text-paper/85">{m.s}</span>
                <span className={`${chipMono} ml-auto shrink-0 ${m.hot ? 'text-rose-300' : 'text-paper/45'}`}>{m.tag}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 rounded-xl border border-acid/25 bg-acid/[0.05] px-4 py-3 text-sm text-paper/80">
            Brouillon de réponse prêt. Rien ne part sans vous.
          </div>
        </div>
      );
    case 'fideliser':
      return (
        <div className={frame} aria-hidden>
          <div className={`${chipMono} text-paper/45`}>48 h après livraison</div>
          <div className="mt-3 rounded-xl border border-paper/15 bg-paper/[0.04] p-4">
            <div className="text-lg tracking-[0.2em] text-acid">★★★★★</div>
            <p className="mt-1.5 text-sm leading-relaxed text-paper/75">« Conseil parfait, livré en 2 jours. » → publié sur la fiche produit</p>
          </div>
          <div className="mt-3 rounded-xl border border-rose-400/25 bg-rose-400/[0.05] p-4">
            <div className="text-lg tracking-[0.2em] text-rose-300">★★<span className="text-paper/25">★★★</span></div>
            <p className="mt-1.5 text-sm leading-relaxed text-paper/75">Avis négatif intercepté → l'équipe est alertée avant qu'il parte ailleurs.</p>
          </div>
        </div>
      );
    case 'diffuser':
      return (
        <div className={frame} aria-hidden>
          <div className="rounded-full border border-paper/15 bg-paper/[0.05] px-4 py-2.5 text-sm text-paper/80">
            « 5 visuels pour mes nouveautés »
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {['Nouveautés', 'Top vente', 'Saison', 'Relance'].map((t, i) => (
              <div
                key={t}
                className={`rounded-xl border p-3 ${i === 0 ? 'border-acid/40 bg-acid/[0.07]' : 'border-paper/15 bg-paper/[0.04]'}`}
              >
                <div className="h-8 rounded-md bg-gradient-to-br from-paper/15 to-paper/[0.03]" />
                <div className={`${chipMono} mt-2 ${i === 0 ? 'text-acid' : 'text-paper/45'}`}>{t}</div>
              </div>
            ))}
          </div>
          <div className={`${chipMono} mt-3 text-paper/45`}>Générés dans votre identité · à valider avant envoi</div>
        </div>
      );
    case 'mesurer':
      return (
        <div className={frame} aria-hidden>
          <div className="flex items-baseline justify-between">
            <div className={`${chipMono} text-paper/45`}>CA du mois</div>
            <span className="font-mono text-[11px] text-acid">+14 % vs mois dernier</span>
          </div>
          <div className="mt-1 font-display text-3xl tracking-editorial text-paper">48 212 €</div>
          <div className="mt-4 flex h-20 items-end gap-1.5">
            {[38, 52, 44, 60, 55, 72, 64, 84, 78, 92, 88, 100].map((h, i) => (
              <div
                key={i}
                style={{ height: `${h}%` }}
                className={`flex-1 rounded-t-sm ${i >= 9 ? 'bg-acid/80' : 'bg-paper/20'}`}
              />
            ))}
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            {[
              ['Paniers récupérés', '1 840 €'],
              ['Note moyenne', '4,6 / 5'],
              ['Tickets résolus', '96 %'],
            ].map(([l, v]) => (
              <div key={l} className="rounded-lg border border-paper/10 bg-paper/[0.04] px-2 py-2">
                <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-paper/45">{l}</div>
                <div className="mt-0.5 text-sm text-paper">{v}</div>
              </div>
            ))}
          </div>
        </div>
      );
    default:
      return null;
  }
}
