'use client';

import { motion, useInView } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

const tiles = [
  { label: 'ca_attribué (30d)', value: 28640, suffix: '€', delta: '+18.4%', tone: 'violet' },
  { label: 'impressions', value: 28480, suffix: '', delta: '+9.1%', tone: 'mute' },
  { label: 'clicks', value: 4392, suffix: '', delta: '+12.6%', tone: 'mute' },
  { label: 'view_through', value: 2870, suffix: '', delta: '+6.2%', tone: 'mute' },
  { label: 'cart_adds', value: 1124, suffix: '', delta: '+18.0%', tone: 'mute' },
  { label: 'purchases', value: 612, suffix: '', delta: '+22.5%', tone: 'acid' },
];

export function MonoMetrics() {
  return (
    <section id="metrics" className="relative w-full border-t border-white/5 bg-[#0a0a0a] py-24 md:py-32">
      <div className="mx-auto max-w-[1280px] px-6 md:px-12">
        <div className="mb-12 flex items-baseline justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-[0.22em] text-zinc-500"># metrics</div>
            <h2 className="mt-3 text-3xl tracking-tight text-zinc-100 md:text-4xl">
              Live · last 30 days
            </h2>
          </div>
          <span className="hidden items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-emerald-400 md:inline-flex">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            streaming
          </span>
        </div>

        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-white/10 bg-white/10 md:grid-cols-3">
          {tiles.map(t => (
            <Tile key={t.label} {...t} />
          ))}
        </div>

        <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2">
          <Block label="funnel · last 30d" rows={[
            ['IMPRESSION', '28 480', '100%'],
            ['CLICK', '4 392', '15.4%'],
            ['VIEW_TARGET', '2 870', '10.1%'],
            ['CART_ADD', '1 124', '3.9%'],
            ['PURCHASE', '612', '2.15%'],
          ]} />
          <Block label="top picks · last 30d" rows={[
            ['Filtre HEPA · COMPLEMENT', '628', '156€/d'],
            ['Brosse tapis · ACCESSOIRE', '412', '98€/d'],
            ['Silenz Pro Max · PREMIUM', '184', '214€/d'],
            ['Compact Mini · ALTERNATIVE', '301', '124€/d'],
            ['Pack 3 sacs · COMPLEMENT', '254', '47€/d'],
          ]} />
        </div>
      </div>
    </section>
  );
}

function Tile({ label, value, suffix, delta, tone }: { label: string; value: number; suffix?: string; delta?: string; tone?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-50px' });
  const [val, setVal] = useState(value);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (!inView || started) return;
    setStarted(true);
    setVal(0);
    const duration = 1300;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setVal(Math.round(value * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value, started]);

  const tint = tone === 'violet' ? 'text-toxic-300' : tone === 'acid' ? 'text-acid' : 'text-zinc-100';

  return (
    <div ref={ref} className="bg-[#0a0a0a] p-6 md:p-8">
      <div className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">{label}</div>
      <div className={`mt-3 text-3xl tracking-tight md:text-4xl ${tint}`}>
        {val.toLocaleString('fr-FR')}{suffix}
      </div>
      {delta && <div className="mt-2 text-xs text-emerald-400">{delta} vs prev</div>}
    </div>
  );
}

function Block({ label, rows }: { label: string; rows: string[][] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-white/10">
      <div className="border-b border-white/10 bg-white/[0.02] px-5 py-3 text-[10px] uppercase tracking-[0.22em] text-zinc-500">
        {label}
      </div>
      <div className="divide-y divide-white/5">
        {rows.map((r, i) => (
          <div key={i} className="grid grid-cols-[1fr_auto_auto] items-center gap-4 px-5 py-3 text-sm">
            <div className="truncate text-zinc-200">{r[0]}</div>
            <div className="text-zinc-100">{r[1]}</div>
            <div className="w-20 text-right text-xs text-zinc-500">{r[2]}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
