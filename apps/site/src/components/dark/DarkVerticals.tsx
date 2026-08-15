'use client';

import { motion } from 'framer-motion';

const stores = [
  {
    name: 'Caves Forty-Two',
    type: 'Cave à vins',
    pitch: 'Le client cherche "vin pour repas dimanche". Le vendeur demande viande ou poisson, propose un Châteauneuf-du-Pape 2019, et suggère le Maroilles fermier qui va avec.',
    cta: 'Parler au vendeur →',
    href: '/shimmer/demo/',
    metrics: [
      { label: 'Ventes en plus / panier', value: '+18 €' },
      { label: 'Sur 10 paniers', value: '3 prennent la suggestion' },
    ],
  },
  {
    name: 'L\'Atelier Lumière',
    type: 'Luminaires design',
    pitch: 'Le client veut une "suspension pour mon salon". Le vendeur cerne l\'ambiance (cosy vs blanc-froid), propose la bonne suspension et ajoute l\'ampoule E27 2700K assortie.',
    cta: 'Voir le vendeur →',
    href: '/shimmer/demo/',
    metrics: [
      { label: 'Panier moyen', value: '+22 %' },
      { label: 'Sur 10 visites', value: '6 conversations' },
    ],
  },
];

const verticals = [
  { name: 'Cave à vins', sample: '"vin repas dimanche" → Châteauneuf + Maroilles' },
  { name: 'Luminaires', sample: '"suspension salon" → Pied + ampoule 2700K' },
  { name: 'Mode féminine', sample: '"robe soirée hiver" → Robe + sac assorti' },
  { name: 'Cosmétique', sample: '"sérum peau sèche" → Sérum + crème assortie' },
  { name: 'Hi-fi audio', sample: '"casque travail" → Casque + adaptateur USB-C' },
  { name: 'Bricolage', sample: '"perceuse murs" → Perceuse + mèches béton' },
];

export function DarkVerticals() {
  return (
    <section id="boutiques" className="relative w-full border-t border-paper/10 bg-ink py-32 md:py-48">
      <div className="mx-auto max-w-[1480px] px-6 md:px-12">
        <div className="mb-16 flex items-baseline gap-6">
          <span className="font-mono text-[11px] uppercase tracking-[0.24em] text-acid">
            Vu en vrai
          </span>
          <span className="h-px flex-1 bg-paper/10" />
        </div>

        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-paper/15 bg-paper/[0.04] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-paper/55">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
          Boutiques de démonstration · données illustratives
        </div>
        <h2 className="mb-8 max-w-[22ch] font-display text-balance text-[clamp(40px,6vw,88px)] font-normal leading-[0.95] tracking-editorial text-paper">
          Deux démos,{' '}
          <span className="italic text-acid">le vendeur en action</span>.
        </h2>
        <p className="mb-16 max-w-[58ch] text-pretty text-lg leading-relaxed text-paper/65">
          Pas une promesse. Deux boutiques fictives en ligne, le vendeur y travaille pour de vrai.
          Tapez une recherche, voyez la conversation, ajoutez au panier.
        </p>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {stores.map((s, i) => (
            <motion.a
              key={s.name}
              href={s.href}
              initial={{ opacity: 1, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ delay: i * 0.08, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ y: -4 }}
              className="group relative block overflow-hidden rounded-2xl border border-paper/10 bg-paper/[0.03] p-8 backdrop-blur-sm transition hover:border-acid/30 hover:bg-paper/[0.05] md:p-10"
            >
              <div className="flex items-baseline justify-between">
                <span className="rounded-full border border-acid/30 bg-acid/5 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-acid">
                  {s.type}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-paper/40">
                  démo live
                </span>
              </div>

              <h3 className="mt-6 font-display text-3xl tracking-editorial text-paper md:text-4xl">
                {s.name}
              </h3>
              <p className="mt-5 text-base leading-relaxed text-paper/70">
                {s.pitch}
              </p>

              <div className="mt-8 grid grid-cols-2 gap-4">
                {s.metrics.map(m => (
                  <div key={m.label} className="rounded-xl border border-paper/10 bg-black/30 p-4">
                    <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-paper/45">{m.label}</div>
                    <div className="mt-2 font-display text-2xl tracking-editorial text-acid">{m.value}</div>
                  </div>
                ))}
              </div>

              <div className="mt-8 inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.18em] text-paper transition group-hover:translate-x-1">
                {s.cta}
              </div>
            </motion.a>
          ))}
        </div>

        <div className="mt-20">
          <div className="mb-6 font-mono text-[11px] uppercase tracking-[0.22em] text-paper/50">
            Et ça marche aussi sur :
          </div>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
            {verticals.map(v => (
              <div key={v.name} className="rounded-xl border border-paper/10 bg-paper/[0.02] p-4">
                <div className="font-display text-base text-paper">{v.name}</div>
                <div className="mt-1 font-mono text-[11px] italic text-paper/55">{v.sample}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
