'use client';

import { motion } from 'framer-motion';

const mails = [
  { from: 'Léa M.', subject: 'Commande pas reçue', tags: ['SAV', 'URGENT'], sentiment: 'négatif', tint: 'bg-rose-500/15 text-rose-700 border-rose-500/30' },
  { from: 'Karim B.', subject: 'Mode d\'emploi de l\'aspi ?', tags: ['QUESTION'], sentiment: 'neutre', tint: 'bg-toxic-500/10 text-toxic-700 border-toxic-500/25' },
  { from: 'Anna T.', subject: 'Top, je recommande', tags: ['AVIS'], sentiment: 'positif', tint: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30' },
  { from: 'Jean P.', subject: 'Souci avec le filtre', tags: ['SAV'], sentiment: 'mitigé', tint: 'bg-amber-500/10 text-amber-700 border-amber-500/30' },
];

const reviews = [
  { stars: 5, text: 'Silencieux comme promis, mon chat dort à côté.', published: true },
  { stars: 4, text: 'Bon produit, batterie un peu juste sur grandes surfaces.', published: true },
  { stars: 2, text: 'Reçu cassé.', published: false, alert: 'Ticket SAV créé' },
  { stars: 5, text: 'Parfait pour les poils longs.', published: true },
];

export function SectionMailReviews() {
  return (
    <section className="relative w-full bg-paper py-32 md:py-48">
      <div className="mx-auto max-w-[1440px] px-6 md:px-12">
        <div className="mb-16 flex items-baseline gap-6">
          <span className="font-mono text-[11px] uppercase tracking-[0.24em] text-toxic-600">
            04 — Mail · Reviews
          </span>
          <span className="h-px flex-1 bg-ink/15" />
        </div>

        <div className="grid grid-cols-12 gap-x-6 gap-y-20">
          <div className="col-span-12 lg:col-span-6">
            <span className="inline-block rounded-full border border-ink/15 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-mute">
              Triage mail
            </span>
            <h3 className="mt-6 font-display text-balance text-[clamp(32px,4.5vw,56px)] font-normal leading-[1.0] tracking-editorial">
              Chaque mail{' '}
              <span className="italic text-toxic-600">classé</span>,{' '}
              <span className="italic">priorisé</span>, brouillon prêt.
            </h3>
            <p className="mt-6 max-w-[44ch] text-pretty text-base leading-relaxed text-ink-soft">
              Catégorie, urgence, sentiment. Les réclamations créent un ticket SAV automatiquement.
              Aucun mail ne part sans validation humaine.
            </p>

            <div className="mt-10 space-y-3">
              {mails.map((m, i) => (
                <motion.div
                  key={m.from}
                  initial={{ opacity: 1, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-50px' }}
                  transition={{ delay: i * 0.08, duration: 0.5 }}
                  className="grid grid-cols-[140px_1fr_auto] items-center gap-4 rounded-xl border border-ink/10 bg-paper-warm px-4 py-3"
                >
                  <span className="truncate font-mono text-xs text-ink-soft">{m.from}</span>
                  <span className="truncate text-sm">{m.subject}</span>
                  <div className="flex gap-2">
                    {m.tags.map(t => (
                      <span key={t} className={`rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${m.tint}`}>
                        {t}
                      </span>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="col-span-12 lg:col-span-6">
            <span className="inline-block rounded-full border border-ink/15 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-mute">
              Collecte d'avis
            </span>
            <h3 className="mt-6 font-display text-balance text-[clamp(32px,4.5vw,56px)] font-normal leading-[1.0] tracking-editorial">
              Les bons{' '}
              <span className="italic text-toxic-600">publiés</span>.
              <br />
              Les mauvais ?{' '}
              <span className="italic">Ticket SAV</span>.
            </h3>
            <p className="mt-6 max-w-[44ch] text-pretty text-base leading-relaxed text-ink-soft">
              Après chaque livraison, demande d'avis automatique. L'IA publie les 4 et 5 étoiles, modère
              les 3, et alerte le SAV sur les 1 et 2 avant qu'ils n'arrivent sur Google.
            </p>

            <div className="mt-10 space-y-3">
              {reviews.map((r, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 1, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-50px' }}
                  transition={{ delay: i * 0.08, duration: 0.5 }}
                  className="rounded-xl border border-ink/10 bg-paper-warm p-4"
                >
                  <div className="flex items-center gap-3">
                    <Stars n={r.stars} />
                    {r.published ? (
                      <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-emerald-700">publié</span>
                    ) : (
                      <span className="rounded-full bg-rose-500/15 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-rose-700">{r.alert}</span>
                    )}
                  </div>
                  <div className="mt-2 text-sm italic text-ink-soft">"{r.text}"</div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Stars({ n }: { n: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} width="14" height="14" viewBox="0 0 24 24" fill={i < n ? '#6a2bf5' : 'rgba(13,11,20,0.15)'}>
          <path d="M12 2 L14.85 8.46 L22 9.27 L16.5 13.97 L18.18 21 L12 17.27 L5.82 21 L7.5 13.97 L2 9.27 L9.15 8.46 Z" />
        </svg>
      ))}
    </div>
  );
}
