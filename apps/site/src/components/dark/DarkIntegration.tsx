'use client';

import { motion } from 'framer-motion';

const lines = [
  { line: '<script src="https://tymmerc.eu/shimmer/sdk/shimmer.js"></script>', comment: '1 · Le SDK' },
  { line: '<script>Shimmer.init({ apiKey: \'sk_…\', storeId: 482 })</script>', comment: '2 · Init' },
  { line: '<!-- Tout le reste (cookie, holdout, cart attribution) est auto -->', comment: '3 · Plus rien à toucher' },
];

const promises = [
  { label: 'Pas de migration', value: 'Vous gardez votre boutique. On se branche par-dessus.' },
  { label: 'Pas de dev senior', value: 'Un copier-coller dans le footer de votre thème.' },
  { label: 'Pas de risque', value: 'Si le SDK plante, votre site continue normalement. Le vendeur est en façade.' },
  { label: 'Webhooks', value: '3 à activer en clic dans l\'admin Shopify, on fait la liste avec vous.' },
];

export function DarkIntegration() {
  return (
    <section id="brancher" className="relative w-full border-t border-paper/10 bg-ink py-32 md:py-48">
      <div className="mx-auto max-w-[1480px] px-6 md:px-12">
        <div className="mb-16 flex items-baseline gap-6">
          <span className="font-mono text-[11px] uppercase tracking-[0.24em] text-acid">
            Brancher sur votre boutique
          </span>
          <span className="h-px flex-1 bg-paper/10" />
        </div>

        <div className="grid grid-cols-12 gap-x-6 gap-y-16">
          <div className="col-span-12 lg:col-span-5">
            <h2 className="font-display text-balance text-[clamp(40px,6vw,88px)] font-normal leading-[0.95] tracking-editorial text-paper">
              Un snippet,{' '}
              <span className="italic text-acid">trente minutes</span>,
              on est branchés.
            </h2>
            <p className="mt-8 max-w-[46ch] text-pretty text-lg leading-relaxed text-paper/70">
              Trois lignes à coller dans le footer de votre thème. Le SDK pose un cookie visiteur, gère
              le holdout, injecte l'ID dans le panier Shopify pour que les commandes soient correctement
              attribuées. <span className="text-paper">Côté technique, c'est tout.</span>
            </p>
            <p className="mt-4 max-w-[46ch] text-pretty text-sm leading-relaxed text-paper/55">
              Reste à configurer trois webhooks dans votre admin Shopify (orders/paid, orders/fulfilled,
              checkouts/update). C'est du clic, on fait la liste avec vous en visio, 5 minutes. Une app
              Shopify "1 clic" est sur la roadmap pour zapper même cette étape.
            </p>

            <dl className="mt-10 space-y-5">
              {promises.map(p => (
                <div key={p.label} className="grid grid-cols-[160px_1fr] gap-4 border-t border-paper/15 pt-4">
                  <dt className="font-mono text-[11px] uppercase tracking-[0.22em] text-acid">{p.label}</dt>
                  <dd className="text-sm leading-relaxed text-paper">{p.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="col-span-12 lg:col-span-7">
            <div className="relative">
              <div className="absolute -inset-4 rounded-3xl bg-acid/[0.04] blur-2xl" />
              <div className="relative overflow-hidden rounded-2xl border border-paper/10 bg-black shadow-[0_30px_60px_-25px_rgba(0,0,0,0.6)]">
                <div className="flex items-center gap-2 border-b border-paper/10 bg-paper/[0.04] px-5 py-3 font-mono text-[10px] uppercase tracking-[0.22em] text-paper/50">
                  <span className="h-2 w-2 rounded-full bg-rose-400/80" />
                  <span className="h-2 w-2 rounded-full bg-amber-400/80" />
                  <span className="h-2 w-2 rounded-full bg-acid" />
                  <span className="ml-3">votre-fiche-produit.html · 3 lignes à coller</span>
                </div>
                <pre className="p-6 font-mono text-[13px] leading-loose text-paper/90 md:p-8">
                  {lines.map((l, i) => (
                    <motion.span
                      key={i}
                      initial={{ opacity: 1, x: -4 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true, amount: 0.3 }}
                      transition={{ delay: i * 0.18, duration: 0.5 }}
                      className="block"
                    >
                      <span className="mr-4 select-none font-mono text-[11px] text-paper/30">{String(i + 1).padStart(2, '0')}</span>
                      <span className="text-paper">{l.line}</span>
                      <span className="ml-3 text-paper/35">{`// ${l.comment}`}</span>
                    </motion.span>
                  ))}
                </pre>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-4">
              <Mini label="Code à coller" value="2 lignes" />
              <Mini label="Mise en place" value="~30 min" />
              <Mini label="Première donnée" value="Phase 1, J+1" />
            </div>
          </div>
        </div>

        {/* Souveraineté / RGPD */}
        <div className="mt-24 grid grid-cols-1 gap-4 border-t border-paper/10 pt-12 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-acid">Souveraineté · RGPD natif</div>
            <h3 className="mt-4 font-display text-3xl leading-tight tracking-editorial text-paper md:text-4xl">
              Vos données <span className="italic text-acid">restent en France</span>, point.
            </h3>
            <p className="mt-5 max-w-[52ch] text-base leading-relaxed text-paper/65">
              Pas de transfert vers les US par défaut. Le LLM tourne en local sur notre VPS. Les avis et
              tickets SAV sont PII-scrubbés avant indexation. Le droit à l'effacement est un endpoint, pas
              une promesse. Le DPA est signable dès le premier jour.
            </p>
          </div>
          <Pill label="LLM" value="Local · qwen2.5" />
          <Pill label="Serveurs" value="France · UE" />
          <Pill label="Article 17" value="Endpoint dédié" />
          <Pill label="Sous-traitants" value="Liste publique" />
          <Pill label="PII" value="Scrubbés avant indexation" />
          <Pill label="DPA" value="Signable à J+0" />
        </div>
      </div>
    </section>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-paper/10 bg-paper/[0.03] p-4">
      <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-paper/45">{label}</div>
      <div className="mt-1 font-display text-xl tracking-editorial text-paper">{value}</div>
    </div>
  );
}

function Pill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-paper/10 bg-paper/[0.02] p-4">
      <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-paper/45">{label}</div>
      <div className="mt-1.5 text-sm text-paper">{value}</div>
    </div>
  );
}
