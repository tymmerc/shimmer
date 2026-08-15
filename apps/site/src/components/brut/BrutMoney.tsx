'use client';

import { motion, useInView } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

export function BrutMoney() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });
  const [val, setVal] = useState(28640);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (!inView || started) return;
    setStarted(true);
    setVal(0);
    const duration = 1600;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setVal(Math.round(28640 * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, started]);

  return (
    <section ref={ref} className="w-full bg-ink py-24 text-acid md:py-32">
      <div className="mx-auto max-w-[1480px] px-6 md:px-12">
        <div className="mb-8 flex items-center gap-3 font-mono text-xs font-bold uppercase tracking-widest">
          <span className="h-3 w-3 bg-acid" />
          CA ATTRIBUÉ · DERNIERS 30 JOURS
        </div>

        <div className="text-[clamp(120px,24vw,420px)] font-black leading-[0.85] tracking-[-0.05em]">
          {val.toLocaleString('fr-FR')}€
        </div>

        <div className="mt-12 grid grid-cols-2 gap-px bg-acid md:grid-cols-4">
          {[
            { k: 'TAKE-RATE', v: '15,4%' },
            { k: 'VIEW-THROUGH', v: '6,2%' },
            { k: 'AOV ATTRIBUÉ', v: '46,80€' },
            { k: 'DELTA', v: '+18,4%' },
          ].map(s => (
            <div key={s.k} className="bg-ink p-6">
              <div className="text-xs font-bold uppercase tracking-widest text-acid/60">{s.k}</div>
              <div className="mt-2 text-3xl font-black tracking-tight md:text-4xl">{s.v}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
