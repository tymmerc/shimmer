'use client';

import { motion } from 'framer-motion';

const lines = [
  { line: '<script src="https://shimmer.eu/sdk/shimmer.min.js"></script>', comment: '1 · Charger le SDK (28kb gzip)' },
  { line: 'Shimmer.init({ apiKey: \'sk_live_…\', storeId: 482 })', comment: '2 · Configurer avec votre clé' },
  { line: 'Shimmer.crossSell.renderInto(\'#xsell\', { productId })', comment: '3 · Render sur la fiche produit' },
];

const requirements = [
  { label: 'Aucune dépendance', value: 'Vanilla JS, n\'importe quel CMS' },
  { label: 'Aucune migration', value: 'Aucune ligne back-end à toucher' },
  { label: 'Aucun cookie tiers', value: 'sessionId en localStorage, TTL 30 min' },
  { label: 'Performance', value: 'sendBeacon, IntersectionObserver, async' },
];

export function SectionIntegration() {
  return (
    <section className="relative w-full bg-paper py-32 md:py-48">
      <div className="mx-auto max-w-[1480px] px-6 md:px-12">
        <div className="mb-16 flex items-baseline gap-6">
          <span className="font-mono text-[11px] uppercase tracking-[0.24em] text-toxic-600">
            06 · Intégration
          </span>
          <span className="h-px flex-1 bg-ink/15" />
        </div>

        <div className="grid grid-cols-12 gap-x-6 gap-y-16">
          <div className="col-span-12 lg:col-span-5">
            <h2 className="font-display text-balance text-[clamp(40px,6vw,88px)] font-normal leading-[0.95] tracking-editorial">
              Trois lignes,{' '}
              <span className="italic text-toxic-600">trente minutes</span>,
              vous mesurez.
            </h2>
            <p className="mt-8 max-w-[44ch] text-pretty text-lg leading-relaxed text-ink-soft">
              Aucune migration côté back-end. Aucun cookie tiers. Vous gardez votre stack,
              Shimmer s'ajoute par-dessus.
            </p>

            <dl className="mt-12 space-y-5">
              {requirements.map(r => (
                <div key={r.label} className="grid grid-cols-[140px_1fr] gap-4 border-t border-ink/10 pt-4">
                  <dt className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink-mute">{r.label}</dt>
                  <dd className="text-sm text-ink">{r.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="col-span-12 lg:col-span-7">
            <div className="relative">
              <div className="absolute -inset-3 rounded-3xl bg-toxic-500/[0.05] blur-2xl" />
              <div className="relative overflow-hidden rounded-2xl border border-ink/15 bg-ink shadow-[0_30px_60px_-25px_rgba(13,11,20,0.4)]">
                <div className="flex items-center gap-2 border-b border-paper/10 bg-paper/[0.04] px-5 py-3 font-mono text-[10px] uppercase tracking-[0.22em] text-paper/45">
                  <span className="h-2 w-2 rounded-full bg-rose-400/80" />
                  <span className="h-2 w-2 rounded-full bg-amber-400/80" />
                  <span className="h-2 w-2 rounded-full bg-acid/90" />
                  <span className="ml-3">index.html · 3 lignes ajoutées</span>
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
                      <span className="mr-4 select-none font-mono text-[11px] text-paper/35">{String(i + 1).padStart(2, '0')}</span>
                      <span className="text-paper">{l.line}</span>
                      <span className="ml-3 text-paper/35">{`// ${l.comment}`}</span>
                    </motion.span>
                  ))}
                </pre>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-4">
              <Mini label="SDK" value="28 KB" />
              <Mini label="Temps install" value="30 min" />
              <Mini label="Time to € attribué" value="1 vue" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-ink/10 bg-paper-warm p-4">
      <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">{label}</div>
      <div className="mt-1 font-display text-xl tracking-editorial">{value}</div>
    </div>
  );
}
