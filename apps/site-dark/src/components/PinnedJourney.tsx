'use client';

import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import { useRef } from 'react';

const acts = [
  {
    label: '01',
    title: 'Le client dit.',
    italic: 'Souvent flou.',
    quote: 'un truc pour les poils de mon chat, qui aspire bien',
    role: 'user' as const,
    hint: 'On comprend l\'intention, pas juste les mots.',
  },
  {
    label: '02',
    title: 'Le vendeur cerne.',
    italic: 'Une question utile.',
    quote: 'Poils courts ou longs ? Plutôt parquet, moquette ou carrelage ?',
    role: 'agent' as const,
    hint: 'Une seule question, ciblée.',
  },
  {
    label: '03',
    title: 'Il propose.',
    italic: 'Avec la raison écrite.',
    quote: 'Silenz Pro à 249€. Brosse anti-poils, mode parquet, 58 dB. 4,7★.',
    role: 'agent' as const,
    hint: 'Le bon produit, justifié, en 5 secondes.',
  },
];

export function PinnedJourney() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const smoothed = useSpring(scrollYProgress, { stiffness: 90, damping: 22, mass: 0.5 });

  return (
    <section ref={ref} className="relative w-full bg-paper-warm py-32 md:py-48">
      <div className="relative mx-auto max-w-[1480px] px-6 md:px-12">
        <div className="mb-20 flex items-baseline gap-6">
          <span className="font-mono text-[11px] uppercase tracking-[0.24em] text-toxic-600">
            Le parcours · 3 actes
          </span>
          <span className="h-px flex-1 bg-ink/15" />
        </div>

        <h2 className="mb-24 max-w-[18ch] font-display text-balance text-[clamp(40px,6vw,88px)] font-normal leading-[0.95] tracking-editorial">
          Une intention floue,{' '}
          <span className="italic text-toxic-600">trois battements</span>,
          un produit justifié.
        </h2>

        <div className="space-y-32">
          {acts.map((a, i) => (
            <Act key={a.label} act={a} index={i} progress={smoothed} />
          ))}
        </div>
      </div>
    </section>
  );
}

interface ActProps {
  act: typeof acts[number];
  index: number;
  progress: ReturnType<typeof useSpring>;
}

function Act({ act, index, progress }: ActProps) {
  const start = (index - 0.4) / acts.length;
  const end = (index + 1.4) / acts.length;
  const center = (start + end) / 2;
  const highlight = useTransform(progress, [start, center, end], [0.55, 1, 0.55]);

  const isOdd = index % 2 === 1;

  return (
    <motion.div
      style={{ opacity: highlight }}
      className="grid grid-cols-12 items-center gap-x-6 gap-y-8"
    >
      <div className={isOdd ? 'col-span-12 md:order-2 md:col-span-7' : 'col-span-12 md:col-span-7'}>
        <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-ink-mute">
          {act.label} / 03
        </div>
        <h3 className="mt-4 font-display text-balance text-[clamp(40px,6vw,96px)] font-normal leading-[0.94] tracking-tightest">
          {act.title}
          <br />
          <span className="italic text-toxic-600">{act.italic}</span>
        </h3>
        <p className="mt-6 max-w-[40ch] text-pretty text-base leading-relaxed text-ink-soft md:text-lg">
          {act.hint}
        </p>
      </div>

      <div className={isOdd ? 'col-span-12 md:order-1 md:col-span-5' : 'col-span-12 md:col-span-5'}>
        <Bubble role={act.role} text={act.quote} side={isOdd ? 'left' : 'right'} />
      </div>
    </motion.div>
  );
}

function Bubble({ role, text, side }: { role: 'user' | 'agent'; text: string; side: 'left' | 'right' }) {
  return (
    <div className={side === 'right' ? 'flex justify-end' : 'flex justify-start'}>
      <div
        className={
          role === 'user'
            ? 'max-w-[440px] rounded-3xl rounded-tr-md bg-ink px-6 py-5 text-paper shadow-[0_30px_60px_-20px_rgba(13,11,20,0.35)]'
            : 'max-w-[480px] rounded-3xl rounded-tl-md border border-ink/10 bg-paper px-6 py-5 text-ink shadow-[0_30px_60px_-20px_rgba(13,11,20,0.18)]'
        }
      >
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] opacity-60">
          {role === 'user' ? 'client' : 'vendeur'}
        </div>
        <div className="mt-2 font-display text-xl leading-snug tracking-editorial md:text-2xl">
          "{text}"
        </div>
      </div>
    </div>
  );
}
