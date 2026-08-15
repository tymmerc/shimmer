'use client';

import { motion, useInView, useScroll, useTransform } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

const funnel = [
  { stage: 'IMPRESSION', value: 28480, pct: 100, hint: 'pick affiché' },
  { stage: 'CLIC', value: 4392, pct: 15.4, hint: 'curiosité' },
  { stage: 'VUE CIBLE', value: 2870, pct: 10.1, hint: 'lit la fiche' },
  { stage: 'AJOUT PANIER', value: 1124, pct: 3.9, hint: 'intent fort' },
  { stage: 'ACHAT', value: 612, pct: 2.15, hint: 'attribué' },
];

export function SectionAttribution() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const numberScale = useTransform(scrollYProgress, [0, 0.5, 1], [0.95, 1, 1.05]);

  return (
    <section
      id="attribution"
      ref={ref}
      className="relative w-full overflow-hidden bg-ink py-32 text-paper md:py-48"
    >
      <div className="pointer-events-none absolute -left-20 top-1/3 h-[640px] w-[640px] rounded-full bg-toxic-700/30 blur-[120px]" />
      <div className="pointer-events-none absolute -right-32 bottom-0 h-[520px] w-[520px] rounded-full bg-toxic-500/20 blur-[100px]" />
      <div className="relative z-10 mx-auto max-w-[1440px] px-6 md:px-12">
        <div className="mb-16 flex items-baseline gap-6">
          <span className="font-mono text-[11px] uppercase tracking-[0.24em] text-toxic-300">
            03 — Attribution €
          </span>
          <span className="h-px flex-1 bg-paper/15" />
        </div>

        <div className="grid grid-cols-12 gap-x-6 gap-y-16">
          <div className="col-span-12 lg:col-span-6">
            <h2 className="font-display text-balance text-[clamp(40px,6vw,88px)] font-normal leading-[0.95] tracking-editorial">
              On suit chaque{' '}
              <span className="italic text-toxic-300">euro</span>{' '}
              jusqu'à la caisse.
            </h2>
            <p className="mt-8 max-w-[46ch] text-pretty text-lg leading-relaxed text-paper/70">
              Impression, clic, vue de la fiche cible, ajout au panier, achat. Une session, des intentions
              stockées 30 min, et on attribue le CA au pick qui l'a déclenché.
            </p>

            <motion.div style={{ scale: numberScale }} className="mt-12">
              <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-toxic-300">CA attribué · 30 derniers jours</div>
              <div className="mt-3 flex items-baseline gap-3">
                <CountUp from={0} to={28640} prefix="" suffix="€" className="font-display text-[clamp(72px,11vw,160px)] font-normal leading-none tracking-tightest" />
              </div>
              <div className="mt-4 flex items-center gap-3 font-mono text-xs text-paper/60">
                <span className="rounded-full bg-toxic-500/20 px-2 py-1 text-toxic-200">+18,4%</span>
                <span>vs mois précédent</span>
              </div>
            </motion.div>
          </div>

          <div className="col-span-12 lg:col-span-6">
            <FunnelMockup />
          </div>
        </div>
      </div>
    </section>
  );
}

function FunnelMockup() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <div ref={ref} className="relative">
      <div className="absolute -inset-px rounded-3xl bg-gradient-to-br from-toxic-300/30 via-transparent to-toxic-600/20 opacity-60 blur-md" />
      <div className="relative rounded-3xl border border-paper/10 bg-paper/[0.04] p-8 backdrop-blur-sm">
        <div className="mb-6 flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.2em] text-paper/50">
          <span>Funnel cross-sell · last 30d</span>
          <span className="rounded-full bg-acid px-2 py-1 text-[10px] text-ink">live</span>
        </div>

        <div className="space-y-4">
          {funnel.map((row, i) => (
            <motion.div
              key={row.stage}
              initial={{ opacity: 1, x: -20 }}
              animate={inView ? { opacity: 1, x: 0 } : {}}
              transition={{ delay: i * 0.1, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              className="grid grid-cols-[120px_1fr_auto] items-center gap-4"
            >
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-paper/55">
                {row.stage}
              </div>
              <div className="relative h-10 overflow-hidden rounded-lg bg-paper/[0.06]">
                <motion.div
                  initial={{ width: `${row.pct}%`, opacity: 0.85 }}
                  animate={inView ? { width: `${row.pct}%`, opacity: 1 } : {}}
                  transition={{ delay: i * 0.1 + 0.2, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute inset-y-0 left-0 rounded-lg bg-gradient-to-r from-toxic-500 to-toxic-300"
                />
                <div className="absolute inset-y-0 left-3 flex items-center text-xs text-paper/80">
                  {row.hint}
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono text-base">{row.value.toLocaleString('fr-FR')}</div>
                <div className="font-mono text-[10px] text-paper/40">{row.pct}%</div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-8 grid grid-cols-3 gap-4 border-t border-paper/10 pt-6">
          <MiniStat label="Take-rate" value="15,4 %" />
          <MiniStat label="View-through" value="6,2 %" />
          <MiniStat label="AOV attribué" value="46,80 €" />
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-paper/45">{label}</div>
      <div className="mt-1 font-display text-2xl tracking-editorial">{value}</div>
    </div>
  );
}

function CountUp({
  from,
  to,
  prefix = '',
  suffix = '',
  className,
}: { from: number; to: number; prefix?: string; suffix?: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });
  const [val, setVal] = useState(to);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (!inView || started) return;
    setStarted(true);
    setVal(from);
    const duration = 1400;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setVal(Math.round(from + (to - from) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, from, to, started]);

  return (
    <span ref={ref} className={className}>
      {prefix}{val.toLocaleString('fr-FR')}{suffix}
    </span>
  );
}
