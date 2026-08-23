'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';

const ease = [0.22, 1, 0.36, 1] as const;

/* ── Démo vendeur : la requête se tape, la réponse et les produits arrivent ── */
function VendeurDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });
  const QUERY = 'un vin pour un barbecue';
  const [typed, setTyped] = useState('');
  const [phase, setPhase] = useState(0); // 0 frappe · 1 réponse · 2 produits

  useEffect(() => {
    if (!inView) return;
    let i = 0;
    const iv = setInterval(() => {
      i += 1;
      setTyped(QUERY.slice(0, i));
      if (i >= QUERY.length) {
        clearInterval(iv);
        setTimeout(() => setPhase(1), 450);
        setTimeout(() => setPhase(2), 1150);
      }
    }, 52);
    return () => clearInterval(iv);
  }, [inView]);

  return (
    <div ref={ref} className="rounded-2xl border border-paper/10 bg-ink/50 p-4">
      <div className="flex items-center gap-3 rounded-full border border-paper/15 bg-ink/60 px-4 py-3">
        <span className="text-paper/40">⌕</span>
        <span className="text-sm text-paper/85">
          {typed}
          {phase === 0 && <span className="ml-0.5 inline-block w-px animate-pulse text-acid">|</span>}
        </span>
      </div>

      <motion.div
        initial={false}
        animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
        transition={{ duration: 0.4, ease }}
        className="mt-3 rounded-xl border border-acid/25 bg-acid/[0.07] p-3.5"
      >
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-acid">Le vendeur</div>
        <p className="mt-1.5 text-sm leading-snug text-paper/90">
          Un Côtes-du-Rhône bien charpenté, parfait sur les grillades. Je vous en montre trois ?
        </p>
      </motion.div>

      <div className="mt-3 flex flex-wrap gap-2">
        {['Côtes-du-Rhône · 14 €', 'Gigondas · 22 €', 'Chinon · 12 €'].map((p, i) => (
          <motion.span
            key={p}
            initial={false}
            animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 6 }}
            transition={{ duration: 0.35, ease, delay: phase >= 2 ? i * 0.08 : 0 }}
            className="rounded-lg border border-paper/12 bg-ink/60 px-2.5 py-1.5 font-mono text-[11px] text-paper/75"
          >
            {p}
          </motion.span>
        ))}
      </div>
    </div>
  );
}

/* ── Démo SAV : la conversation se joue message par message ── */
function SavDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });
  const [step, setStep] = useState(0); // 1 question · 2 en train d'écrire · 3 réponse

  useEffect(() => {
    if (!inView) return;
    const t = [
      setTimeout(() => setStep(1), 250),
      setTimeout(() => setStep(2), 1000),
      setTimeout(() => setStep(3), 2100),
    ];
    return () => t.forEach(clearTimeout);
  }, [inView]);

  return (
    <div ref={ref} className="min-h-[168px] space-y-2 rounded-2xl border border-paper/10 bg-ink/50 p-4">
      <motion.div
        initial={false}
        animate={step >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
        transition={{ duration: 0.35, ease }}
        className="ml-auto w-fit max-w-[80%] rounded-2xl rounded-br-sm bg-paper/10 px-3.5 py-2 text-sm text-paper/85"
      >
        Où est ma commande&nbsp;?
      </motion.div>

      {step === 2 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex w-fit gap-1 rounded-2xl rounded-bl-sm border border-paper/12 bg-ink/60 px-3.5 py-3"
        >
          {[0, 1, 2].map((i) => (
            <span key={i} className="typing-dot h-1.5 w-1.5 rounded-full bg-paper/50" style={{ animationDelay: `${i * 0.18}s` }} />
          ))}
        </motion.div>
      )}

      <motion.div
        initial={false}
        animate={step >= 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
        transition={{ duration: 0.4, ease }}
        className="w-fit max-w-[88%] space-y-2 rounded-2xl rounded-bl-sm border border-acid/25 bg-acid/[0.07] px-3.5 py-2.5"
      >
        <p className="text-sm leading-snug text-paper/90">
          Elle est expédiée, livraison prévue demain. Voici votre suivi.
        </p>
        <span className="inline-flex items-center gap-1.5 rounded-md bg-ink/50 px-2 py-1 font-mono text-[10px] text-acid">
          ↗ suivre mon colis
        </span>
      </motion.div>
    </div>
  );
}

function Pillar({
  n, tag, title, body, benefit, demo, delay,
}: {
  n: string; tag: string; title: string; body: string; benefit: string; demo: React.ReactNode; delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.6, ease, delay }}
      className="group relative flex flex-col overflow-hidden rounded-3xl border border-paper/12 bg-paper/[0.03] p-6 transition-[transform,border-color] duration-500 hover:-translate-y-1 hover:border-acid/25 sm:p-8 md:p-10"
    >
      {/* halo d'angle statique (profondeur, coût nul) */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full opacity-60"
        style={{ background: 'radial-gradient(circle, rgba(139,77,255,0.22), rgba(139,77,255,0) 70%)' }}
      />

      <div className="relative flex items-center justify-between">
        <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-acid">{tag}</span>
        <span className="font-display text-3xl text-paper/15">{n}</span>
      </div>

      <h3 className="relative mt-5 font-display text-[clamp(26px,3vw,42px)] font-normal leading-[1.02] tracking-tight text-paper md:mt-6">
        {title}
      </h3>
      <p className="relative mt-4 text-pretty text-base leading-relaxed text-paper/70 md:mt-5 md:text-lg">{body}</p>

      <div className="relative mt-6 md:mt-8">
        <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-paper/35">Démo</div>
        {demo}
      </div>

      <div className="relative mt-6 flex md:mt-8">
        <span className="inline-flex items-center gap-2 rounded-full bg-acid/12 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.16em] text-acid">
          <span className="h-1.5 w-1.5 rounded-full bg-acid" />
          {benefit}
        </span>
      </div>
    </motion.div>
  );
}

export function Pillars() {
  return (
    <section id="automatisations" className="relative z-10 w-full scroll-mt-16 px-6 py-16 md:px-12 md:py-40">
      <div className="mx-auto max-w-[1400px]">
        <div className="mb-8 flex items-baseline gap-6 md:mb-12">
          <span className="font-mono text-[11px] uppercase tracking-[0.24em] text-acid">Ce que Shimmer fait pour vous</span>
          <span className="h-px flex-1 bg-paper/10" />
        </div>

        <h2 className="max-w-[20ch] font-display text-[clamp(34px,5.5vw,80px)] font-normal leading-[0.95] tracking-tightest text-paper">
          Vous faire gagner du temps. Et <span className="italic text-acid">gagner des clients</span>.
        </h2>
        <p className="mt-5 max-w-[60ch] text-pretty text-base leading-relaxed text-paper/70 md:mt-8 md:text-xl">
          Deux automatisations au cœur, un vendeur en ligne et un SAV qui répond à votre place, et tout
          autour ce qui les rend meilleures.
        </p>

        <div className="mt-10 grid grid-cols-1 gap-6 md:mt-16 lg:grid-cols-2">
          <Pillar
            n="01"
            tag="Au cœur · vend à votre place"
            title="Il trouve le bon produit pour chaque client."
            body="Dans votre barre de recherche, il pose la bonne question et recommande, comme un vrai vendeur. Vos visiteurs trouvent, et achètent."
            benefit="Plus de ventes"
            demo={<VendeurDemo />}
            delay={0}
          />
          <Pillar
            n="02"
            tag="Au cœur · répond à votre place"
            title="Il absorbe les questions et le suivi de colis."
            body="Où est ma commande, comment retourner un produit, est-ce en stock... Le chatbot répond seul, 24h/24. Vous ne voyez que ce qui mérite vraiment votre attention."
            benefit="SAV allégé"
            demo={<SavDemo />}
            delay={0.1}
          />
        </div>
      </div>
    </section>
  );
}
