'use client';

import { motion } from 'framer-motion';

const session = [
  { kind: 'cmd', text: 'curl -X POST https://shimmer.eu/api/cross-sell/PRD-883 \\' },
  { kind: 'cmd', text: '     -H "Authorization: Bearer sk_live_…"' },
  { kind: 'out', text: '{' },
  { kind: 'out', text: '  "picks": [' },
  { kind: 'out', text: '    { "role": "COMPLEMENT",  "product_id": "PRD-901", "reason": "pour garder l\'aspi performant 12 mois" },' },
  { kind: 'out', text: '    { "role": "ACCESSOIRE",  "product_id": "PRD-907", "reason": "utile dès que vous ajoutez un tapis" },' },
  { kind: 'out', text: '    { "role": "PREMIUM",     "product_id": "PRD-884", "reason": "+100€ pour gros animaux" },' },
  { kind: 'out', text: '    { "role": "ALTERNATIVE", "product_id": "PRD-622", "reason": "sans fil, mieux pour étages" }' },
  { kind: 'out', text: '  ],' },
  { kind: 'out', text: '  "source": "precompute+rules"' },
  { kind: 'out', text: '}' },
];

export function MonoTerminal() {
  return (
    <section id="install" className="relative w-full border-t border-white/5 bg-[#0a0a0a] py-24 md:py-32">
      <div className="mx-auto max-w-[1280px] px-6 md:px-12">
        <div className="mb-12">
          <div className="text-[11px] uppercase tracking-[0.22em] text-zinc-500"># install</div>
          <h2 className="mt-3 text-3xl tracking-tight text-zinc-100 md:text-4xl">
            One bearer key, one render call.
          </h2>
        </div>

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 lg:col-span-7">
            <div className="overflow-hidden rounded-lg border border-white/10 bg-black">
              <div className="flex items-center justify-between border-b border-white/5 px-4 py-2 text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                <span>~ tym@laptop → bash</span>
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-400/80" />
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400/80" />
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/80" />
                </span>
              </div>
              <pre className="p-5 text-[12px] leading-relaxed">
                {session.map((l, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 1, x: -4 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, amount: 0.1 }}
                    transition={{ delay: i * 0.06, duration: 0.35 }}
                    className={l.kind === 'cmd' ? 'text-zinc-100' : 'text-zinc-400'}
                  >
                    <span className="mr-3 select-none text-zinc-600">{l.kind === 'cmd' ? '$' : ' '}</span>
                    {l.text}
                  </motion.div>
                ))}
              </pre>
            </div>
          </div>

          <div className="col-span-12 lg:col-span-5">
            <h3 className="text-lg text-zinc-100">SDK · 3 lignes</h3>
            <pre className="mt-3 overflow-hidden rounded-lg border border-white/10 bg-white/[0.03] p-5 text-[12px] leading-loose text-zinc-200">
{`<script src=".../shimmer.min.js"></script>
<script>
  Shimmer.init({ apiKey, storeId });
  Shimmer.crossSell.renderInto(
    '#xsell',
    { productId }
  );
</script>`}
            </pre>

            <h3 className="mt-8 text-lg text-zinc-100">Run · 4 lignes</h3>
            <pre className="mt-3 overflow-hidden rounded-lg border border-white/10 bg-white/[0.03] p-5 text-[12px] leading-loose text-zinc-200">
{`pnpm i shimmer
shimmer init --store=482
shimmer catalog import ./products.csv
shimmer cross-sell precompute`}
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
}
