'use client';

import { motion, useInView } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';
import { DemoHeader } from './DemoVendeur';

const funnel = [
  { stage: 'Suggestion vue', value: 28480, pct: 100 },
  { stage: 'Le client clique', value: 4392, pct: 15.4 },
  { stage: 'Il va sur la fiche', value: 2870, pct: 10.1 },
  { stage: 'Ajout au panier', value: 1124, pct: 3.9 },
  { stage: 'Il achète', value: 612, pct: 2.15 },
];

const topPicks = [
  { role: 'COMPLEMENT', label: 'Filtre HEPA → après Silenz Pro', vues: 628, ca: '4 680 €' },
  { role: 'ACCESSOIRE', label: 'Brosse tapis → après aspi', vues: 412, ca: '2 940 €' },
  { role: 'PREMIUM', label: 'Silenz Pro Max → upgrade Silenz Pro', vues: 184, ca: '6 420 €' },
  { role: 'ALTERNATIVE', label: 'Compact Mini → si "trop cher"', vues: 301, ca: '3 720 €' },
];

export function DemoAttribution() {
  return (
    <div>
      <DemoHeader
        eyebrow="Démo · Chiffre mesuré"
        title="Le CA additionnel,"
        accent="à l'euro près"
        intro="Pas une estimation. Quand un client achète après une suggestion du vendeur, on le sait, et on le compte. Voici ce que ça donne sur 30 jours. Chiffres illustratifs, boutique de démonstration."
      />

      <div className="mt-10 space-y-6">
        {/* Big number */}
        <div className="rounded-2xl border border-paper/10 bg-paper/[0.03] p-8 text-center backdrop-blur-sm md:p-12">
          <div className="flex flex-wrap items-center justify-center gap-2 font-mono text-[10px] uppercase tracking-[0.24em] text-paper/55">
            <span>Ventes additionnelles · 30 derniers jours</span>
            <span className="rounded-full border border-paper/15 bg-paper/[0.03] px-2 py-0.5 text-paper/55">
              démo
            </span>
          </div>
          <div className="mt-4">
            <CountUp to={28640} suffix="€" className="font-display text-[clamp(72px,14vw,200px)] font-normal leading-none tracking-tightest text-paper" />
          </div>
          <div className="mt-5 inline-flex items-center gap-3 rounded-full border border-acid/30 bg-acid/5 px-4 py-2 font-mono text-xs text-acid">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-acid" />
            +18,4 % par rapport au mois d'avant
          </div>
        </div>

        {/* Funnel */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-[1.2fr_1fr]">
          <div className="rounded-2xl border border-paper/10 bg-paper/[0.03] p-6 backdrop-blur-sm md:p-8">
            <div className="mb-5 flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.22em] text-paper/55">
              <span>De la suggestion à l'achat</span>
              <span className="rounded-full bg-acid px-2 py-0.5 text-[10px] text-ink">en direct</span>
            </div>
            <FunnelChart />
          </div>

          <div className="rounded-2xl border border-paper/10 bg-paper/[0.03] p-6 backdrop-blur-sm md:p-8">
            <div className="mb-5 font-mono text-[11px] uppercase tracking-[0.22em] text-paper/55">
              Les picks qui rapportent
            </div>
            <div className="space-y-3">
              {topPicks.map((p, i) => (
                <motion.div
                  key={p.label}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06, duration: 0.4 }}
                  className="rounded-xl border border-paper/10 bg-paper/[0.02] p-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="rounded border border-acid/30 bg-acid/5 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.22em] text-acid">
                      {p.role}
                    </span>
                    <span className="font-mono text-xs text-paper/55">{p.vues} ventes</span>
                  </div>
                  <div className="mt-2 text-sm text-paper/85">{p.label}</div>
                  <div className="mt-1 font-display text-lg text-acid">{p.ca}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FunnelChart() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: false, margin: '0px' });

  return (
    <div ref={ref} className="space-y-3">
      {funnel.map((row, i) => (
        <motion.div
          key={row.stage}
          initial={{ opacity: 0, x: -4 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.08, duration: 0.4 }}
          className="grid grid-cols-[160px_1fr_auto] items-center gap-4"
        >
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-paper/55">
            {row.stage}
          </div>
          <div className="relative h-9 overflow-hidden rounded-lg bg-paper/[0.06]">
            <motion.div
              initial={{ width: 0 }}
              animate={inView ? { width: `${row.pct}%` } : {}}
              transition={{ delay: i * 0.08 + 0.2, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-y-0 left-0 rounded-lg bg-gradient-to-r from-toxic-600 via-toxic-400 to-acid"
            />
          </div>
          <div className="text-right">
            <div className="font-mono text-sm text-paper">{row.value.toLocaleString('fr-FR')}</div>
            <div className="font-mono text-[10px] text-paper/40">{row.pct}%</div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function CountUp({ to, suffix = '', className }: { to: number; suffix?: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-50px' });
  const [val, setVal] = useState(to);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (!inView || started) return;
    setStarted(true);
    setVal(0);
    const start = performance.now();
    const dur = 1400;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      setVal(Math.round(to * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    // Guarantee final value even if RAF is paused (background tab / iframe).
    const safety = setTimeout(() => setVal(to), dur + 250);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(safety);
    };
  }, [inView, to, started]);

  return <span ref={ref} className={className}>{val.toLocaleString('fr-FR')}{suffix}</span>;
}
