'use client';

import { motion } from 'framer-motion';

const phases = [
  {
    id: '01',
    num: 'J+0',
    title: 'Ingestion.',
    accent: 'On lit votre business.',
    body: 'Catalogue, avis clients, historique SAV, retours. Le tout PII-scrubbé avant indexation. À J+1 vous recevez un résumé : voilà ce que j\'ai trouvé, le vocabulaire de votre boutique, les objections récurrentes.',
    answers: 'est-ce que tu connais mon business ?',
  },
  {
    id: '02',
    num: 'J+1 → J+7',
    title: 'Observation.',
    accent: 'On regarde vos vrais clients.',
    body: 'Le widget est caché. Chaque recherche, chaque intent visiteur est silencieusement loggué. À J+7 vous recevez le rapport : les intents qui reviennent, le vocabulaire réel des clients, les trous dans votre catalogue, une projection de date de significativité.',
    answers: 'est-ce que tu comprends mes clients ?',
  },
  {
    id: '03',
    num: 'J+7 → J+10',
    title: 'Validation.',
    accent: 'Vous validez ce que je dirais.',
    body: 'Je génère une douzaine de réponses-types à partir des vraies requêtes observées. Vous passez en revue : approuvé, corrigé, rejeté. Vos corrections nourrissent ma config. Tant que vous n\'avez pas dit "go", le widget reste invisible.',
    answers: 'est-ce que je peux te faire confiance ?',
  },
  {
    id: '04',
    num: 'J+10+',
    title: 'En ligne, prouvé.',
    accent: 'Le holdout démarre.',
    body: '10 % de vos visiteurs ne voient jamais Shimmer (le groupe témoin). On compare semaine après semaine. La part variable de votre facture ne se déclenche qu\'une fois l\'effet statistiquement net. Avant : forfait fixe seul.',
    answers: 'est-ce que ça me rapporte vraiment ?',
  },
];

export function DarkJourney() {
  return (
    <section id="parcours" className="relative w-full overflow-hidden border-t border-paper/10 bg-ink py-32 md:py-48">
      <div className="pointer-events-none absolute -right-32 top-1/4 h-[460px] w-[460px] rounded-full bg-toxic-600/20 blur-[120px]" />

      <div className="relative z-10 mx-auto max-w-[1480px] px-6 md:px-12">
        <div className="mb-16 flex items-baseline gap-6">
          <span className="font-mono text-[11px] uppercase tracking-[0.24em] text-acid">
            Le parcours · 4 phases
          </span>
          <span className="h-px flex-1 bg-paper/10" />
        </div>

        <h2 className="mb-8 max-w-[24ch] font-display text-balance text-[clamp(40px,6vw,88px)] font-normal leading-[0.95] tracking-editorial">
          On ne s'allume pas{' '}
          <span className="italic text-acid">le premier jour</span>.
        </h2>
        <p className="mb-24 max-w-[64ch] text-pretty text-lg leading-relaxed text-paper/65">
          Avant que le vendeur parle à un seul de vos clients, on lit votre boutique, on observe vos
          vrais visiteurs, et vous validez chaque réponse-type. Le holdout ne démarre qu'après. Chaque
          phase est un livrable : vous avez quelque chose à regarder, pas une promesse.
        </p>

        <div className="space-y-20">
          {phases.map((p, i) => {
            const isOdd = i % 2 === 1;
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 1, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="grid grid-cols-12 items-start gap-x-6 gap-y-6"
              >
                <div className={isOdd ? 'col-span-12 md:order-2 md:col-span-7' : 'col-span-12 md:col-span-7'}>
                  <div className="flex items-baseline gap-3 font-mono text-[11px] uppercase tracking-[0.24em] text-paper/50">
                    <span>{p.id} / 04</span>
                    <span className="text-acid">{p.num}</span>
                  </div>
                  <h3 className="mt-3 font-display text-balance text-[clamp(36px,5vw,80px)] font-normal leading-[0.96] tracking-tightest">
                    {p.title}
                    <br />
                    <span className="italic text-acid">{p.accent}</span>
                  </h3>
                  <p className="mt-5 max-w-[52ch] text-base leading-relaxed text-paper/65">
                    {p.body}
                  </p>
                </div>
                <div className={isOdd ? 'col-span-12 md:order-1 md:col-span-5' : 'col-span-12 md:col-span-5'}>
                  <div className={isOdd ? 'flex justify-start' : 'flex justify-end'}>
                    <div className="max-w-[420px] rounded-3xl border border-paper/15 bg-paper/[0.04] px-6 py-6 text-paper backdrop-blur-sm">
                      <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-paper/50">
                        Question du marchand
                      </div>
                      <div className="mt-3 font-display text-xl leading-snug tracking-editorial md:text-2xl">
                        « {p.answers} »
                      </div>
                      <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-acid/30 bg-acid/5 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-acid">
                        <span className="h-1 w-1 rounded-full bg-acid" />
                        Phase {p.id} répond
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
