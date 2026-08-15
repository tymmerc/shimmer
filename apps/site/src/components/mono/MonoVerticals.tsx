'use client';

import { motion } from 'framer-motion';

const verticals = [
  { name: 'caves-vins', stat: '4 200', unit: 'picks/mois', icon: '◉' },
  { name: 'luminaires', stat: '2 850', unit: 'picks/mois', icon: '◐' },
  { name: 'mode', stat: '6 100', unit: 'picks/mois', icon: '◑' },
  { name: 'cosmetique', stat: '5 320', unit: 'picks/mois', icon: '◒' },
  { name: 'hi-fi', stat: '1 780', unit: 'picks/mois', icon: '◓' },
  { name: 'bricolage', stat: '3 940', unit: 'picks/mois', icon: '◍' },
];

export function MonoVerticals() {
  return (
    <section className="relative w-full border-t border-white/5 bg-[#0a0a0a] py-24 md:py-32">
      <div className="mx-auto max-w-[1280px] px-6 md:px-12">
        <div className="mb-12">
          <div className="text-[11px] uppercase tracking-[0.22em] text-zinc-500"># verticals</div>
          <h2 className="mt-3 text-3xl tracking-tight text-zinc-100 md:text-4xl">
            Tested across six verticals.
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-white/10 bg-white/10 md:grid-cols-3">
          {verticals.map((v, i) => (
            <motion.div
              key={v.name}
              initial={{ opacity: 1, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.1 }}
              transition={{ delay: i * 0.06, duration: 0.4 }}
              className="bg-[#0a0a0a] p-6 transition hover:bg-white/[0.02]"
            >
              <div className="flex items-center justify-between">
                <span className="text-2xl text-toxic-300">{v.icon}</span>
                <span className="rounded border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-zinc-400">live</span>
              </div>
              <div className="mt-4 text-sm text-zinc-300">{v.name}</div>
              <div className="mt-2 text-2xl text-zinc-100">{v.stat}</div>
              <div className="mt-1 text-xs text-zinc-500">{v.unit}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
