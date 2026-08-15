'use client';

// Scène pinnée du holdout : split-screen, le scroll raconte la mesure en
// 4 temps (visiteurs → témoin 10 % → comparaison → écart facturé).
// Tout est scrubé sur scrollYProgress : réversible, aucune animation au
// trigger. Desktop uniquement (lg+), le mobile a une version à plat.

import { motion, useScroll, useTransform, useMotionValueEvent, type MotionValue } from 'framer-motion';
import { useRef, useState } from 'react';

const steps = [
  {
    k: '01',
    title: '100 % de vos visiteurs entrent dans la mesure.',
    body: 'Chaque visiteur reçoit un identifiant anonyme dès son arrivée. Pas d\'estimation, pas d\'échantillon choisi à la main.',
  },
  {
    k: '02',
    title: '10 % ne voient jamais Shimmer.',
    body: 'Tirés au sort. Pas de vendeur, pas de relance, rien. C\'est le groupe témoin : votre boutique telle qu\'elle serait sans nous.',
  },
  {
    k: '03',
    title: 'On compare les deux groupes, semaine après semaine.',
    body: 'Revenu par visiteur des exposés contre celui du témoin. Même trafic, même saison, même catalogue : la seule différence, c\'est Shimmer.',
  },
  {
    k: '04',
    title: 'Vous ne payez que sur l\'écart prouvé.',
    body: 'Tant que l\'effet n\'est pas statistiquement net, la part variable ne se déclenche pas. Et tous les chiffres sont auditables dans votre dashboard.',
  },
];

const NS = steps.length;
const DOTS = 50;
const TEMOIN = new Set([7, 13, 26, 34, 48]);

export function HoldoutScene() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const [active, setActive] = useState(0);
  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    const idx = Math.min(NS - 1, Math.max(0, Math.floor(v * NS)));
    if (idx !== active) setActive(idx);
  });

  // Scrubs de la visualisation. La navigation est par pas : le repos est
  // toujours au centre d'un temps (p = 0.125, 0.375, 0.625, 0.875), donc
  // chaque état visuel se termine juste AVANT son centre pour être complet
  // au repos.
  const temoinT = useTransform(scrollYProgress, [0.25, 0.36], [0, 1]); // les 10 % se distinguent
  const barsT = useTransform(scrollYProgress, [0.5, 0.61], [0, 1]); // les 2 barres poussent ensemble
  // Temps 04, en séquence : le surplus acide pousse côté exposé (le GAIN),
  // puis les chiffres du gain, puis la pastille facturation (second niveau).
  const surplusT = useTransform(scrollYProgress, [0.75, 0.8], [0, 1]);
  const gainT = useTransform(scrollYProgress, [0.79, 0.84], [0, 1]);
  const factT = useTransform(scrollYProgress, [0.84, 0.87], [0, 1]);
  const baseDim = useTransform(surplusT, [0, 1], [1, 0.45]); // le reste s'efface

  // data-scrub-pin : navigation par pas gérée par SmoothScroll (un geste de
  // scroll = un temps, jamais d'arrêt entre deux temps).
  return (
    <div
      ref={ref}
      data-scrub-pin
      data-scrub-segments={NS}
      className="relative hidden lg:block"
      style={{ height: `${NS * 100}vh` }}
    >
      <div className="sticky top-0 flex h-screen items-center overflow-hidden">
        <div className="mx-auto grid w-full max-w-[1480px] grid-cols-2 items-center gap-x-20 px-6 md:px-12">
          {/* Gauche : une idée à la fois */}
          <div className="relative h-[380px] hshort:h-[320px]">
            {steps.map((s, i) => (
              <StepText key={s.k} step={s} i={i} progress={scrollYProgress} />
            ))}
            {/* Progression des 4 temps */}
            <div className="absolute bottom-0 left-0 flex items-center gap-3">
              {steps.map((s, i) => (
                <span
                  key={s.k}
                  className={`h-1 rounded-full transition-all duration-500 ${
                    i === active ? 'w-10 bg-acid' : 'w-4 bg-paper/20'
                  }`}
                />
              ))}
              <span className="ml-2 font-mono text-[11px] text-paper/45">
                {String(active + 1).padStart(2, '0')} / {String(NS).padStart(2, '0')}
              </span>
            </div>
          </div>

          {/* Droite : la visualisation témoin vs exposés. hshort:* compacte le
              panneau pour qu'il tienne entier dans les viewports peu hauts
              (il est pinné : rien ne doit dépasser). */}
          <div className="rounded-3xl border border-paper/10 bg-paper/[0.02] p-10 hshort:p-6">
            <motion.div style={{ opacity: baseDim }}>
              <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.22em] text-paper/45">
                <span>Vos visiteurs</span>
                <motion.span style={{ opacity: temoinT }} className="flex items-center gap-2 text-amber-300">
                  <span className="h-2 w-2 rounded-full border border-amber-300" />
                  témoin · 10 %
                </motion.span>
              </div>
              <div className="mt-5 grid grid-cols-10 gap-2.5 hshort:mt-3 hshort:gap-1.5">
                {Array.from({ length: DOTS }, (_, i) => (
                  <Dot key={i} isTemoin={TEMOIN.has(i)} t={temoinT} />
                ))}
              </div>
            </motion.div>

            {/* Les deux barres : même base grise (même boutique, mêmes
                produits), le surplus acide au-dessus des exposés = le gain
                généré, chiffré. */}
            <div className="mt-10 grid grid-cols-2 gap-8 hshort:mt-5">
              <Bar
                label="Groupe témoin"
                sub="sans Shimmer"
                value="3,20 € / visiteur"
                valueT={gainT}
                grow={barsT}
                dim={baseDim}
                base={62}
              />
              <div>
                <div className="flex h-44 items-end justify-center hshort:h-32">
                  <div className="relative flex w-24 flex-col justify-end" style={{ height: '100%' }}>
                    {/* Le gain, accroché au surplus acide */}
                    <motion.div
                      style={{ opacity: gainT }}
                      className="absolute bottom-[78%] left-1/2 w-max -translate-x-1/2 text-center"
                    >
                      <div className="font-display text-2xl leading-none text-acid hshort:text-xl">+18 %</div>
                      <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.18em] text-paper/60">
                        généré par Shimmer
                      </div>
                    </motion.div>
                    {/* Surplus prouvé : ~18 % de la base */}
                    <motion.div
                      style={{ scaleY: surplusT, opacity: surplusT, transformOrigin: 'bottom', height: '11%' }}
                      className="w-full rounded-t-lg bg-acid shadow-[0_0_28px_rgba(212,255,58,0.35)]"
                    />
                    <motion.div
                      style={{ scaleY: barsT, transformOrigin: 'bottom', height: '62%' }}
                      className="w-full bg-paper/35"
                    />
                  </div>
                </div>
                <div className="mt-3 text-center">
                  <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-paper/60">Groupe exposé</div>
                  <div className="text-xs text-paper/40">avec Shimmer</div>
                  <motion.div style={{ opacity: gainT }} className="mt-1 font-mono text-xs text-paper/75">
                    3,20 € <span className="text-acid">+ 0,58 €</span> / visiteur
                  </motion.div>
                </div>
              </div>
            </div>

            {/* Second niveau, après le gain : à qui va le surplus, sur quoi on se paie */}
            <motion.div style={{ opacity: factT }} className="mt-6 flex flex-col items-center gap-2 hshort:mt-4">
              <span className="inline-flex items-center gap-2 rounded-full border border-acid/40 bg-acid/10 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-acid">
                <span className="h-1.5 w-1.5 rounded-full bg-acid" />
                ce surplus est à vous
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-paper/55">
                notre part : un pourcentage de cet écart prouvé, rien d&apos;autre
              </span>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StepText({
  step,
  i,
  progress,
}: {
  step: (typeof steps)[number];
  i: number;
  progress: MotionValue<number>;
}) {
  const seg = 1 / NS;
  const start = i * seg;
  const end = (i + 1) * seg;
  // Crossfade chevauchant (même logique que le deck des capacités) : le temps
  // sortant est encore à 0.7 pile à la frontière quand l'entrant y est déjà à
  // 0.7. max(opacités) >= 0.7 à toute position de scroll : pas d'écran vide.
  const w = seg * 0.09;
  const range =
    i === 0 ? [start, end - w, end, end + w]
    : i === NS - 1 ? [start - w, start, start + w, end]
    : [start - w, start, start + w, end - w, end, end + w];

  const opacity = useTransform(
    progress, range,
    i === 0 ? [1, 1, 0.7, 0] : i === NS - 1 ? [0, 0.7, 1, 1] : [0, 0.7, 1, 1, 0.7, 0],
  );
  const y = useTransform(
    progress, range,
    i === 0 ? [0, 0, -15, -50] : i === NS - 1 ? [50, 15, 0, 0] : [50, 15, 0, 0, -15, -50],
  );

  return (
    <motion.div style={{ opacity, y }} className="absolute inset-x-0 top-0">
      <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-acid">
        Temps {step.k}
      </div>
      <h3 className="mt-4 max-w-[18ch] font-display text-balance text-[clamp(30px,3.2vw,52px)] font-normal leading-[1.02] tracking-editorial text-paper hshort:text-[clamp(24px,2.6vw,38px)]">
        {step.title}
      </h3>
      <p className="copy mt-6 max-w-[44ch] text-pretty text-lg leading-relaxed text-paper/70 hshort:mt-4 hshort:text-base xl:text-xl">
        {step.body}
      </p>
    </motion.div>
  );
}

function Dot({ isTemoin, t }: { isTemoin: boolean; t: MotionValue<number> }) {
  const fill = useTransform(t, [0, 1], [1, isTemoin ? 0 : 1]);
  const ring = useTransform(t, [0, 1], [0, isTemoin ? 1 : 0]);
  return (
    <span className="relative flex h-3.5 w-3.5 items-center justify-center">
      <motion.span style={{ opacity: fill }} className="absolute inset-0 rounded-full bg-paper/70" />
      <motion.span
        style={{ opacity: ring }}
        className="absolute inset-0 rounded-full border-2 border-amber-300 bg-transparent"
      />
    </span>
  );
}

function Bar({
  label,
  sub,
  value,
  valueT,
  grow,
  dim,
  base,
}: {
  label: string;
  sub: string;
  value: string;
  valueT: MotionValue<number>;
  grow: MotionValue<number>;
  dim: MotionValue<number>;
  base: number;
}) {
  return (
    <motion.div style={{ opacity: dim }}>
      <div className="flex h-44 items-end justify-center hshort:h-32">
        <motion.div
          style={{ scaleY: grow, transformOrigin: 'bottom', height: `${base}%` }}
          className="w-24 rounded-t-lg bg-paper/35"
        />
      </div>
      <div className="mt-3 text-center">
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-paper/60">{label}</div>
        <div className="text-xs text-paper/40">{sub}</div>
        <motion.div style={{ opacity: valueT }} className="mt-1 font-mono text-xs text-paper/75">
          {value}
        </motion.div>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Version mobile : les 4 temps à plat, gros texte, visuel final.      */
/* ------------------------------------------------------------------ */

export function HoldoutFlat() {
  return (
    <div className="space-y-8 lg:hidden">
      {steps.map((s) => (
        <div key={s.k} className="rounded-2xl border border-paper/10 bg-paper/[0.02] p-6">
          <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-acid">Temps {s.k}</div>
          <h3 className="mt-3 font-display text-2xl leading-tight tracking-editorial text-paper">
            {s.title}
          </h3>
          <p className="copy mt-3 text-base leading-relaxed text-paper/70">{s.body}</p>
        </div>
      ))}
      {/* État final de la visualisation, statique : même base grise des deux
          côtés, le surplus acide = le gain généré, chiffré. */}
      <div className="rounded-2xl border border-paper/10 bg-paper/[0.02] p-6">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <div className="flex h-32 items-end justify-center">
              <div className="h-[79px] w-16 rounded-t-lg bg-paper/35" />
            </div>
            <div className="mt-2 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-paper/60">
              Témoin · sans Shimmer
            </div>
            <div className="mt-1 text-center font-mono text-xs text-paper/75">3,20 € / visiteur</div>
          </div>
          <div>
            <div className="flex h-32 items-end justify-center">
              <div className="flex w-16 flex-col">
                <div className="h-[14px] rounded-t-lg bg-acid" />
                <div className="h-[79px] bg-paper/35" />
              </div>
            </div>
            <div className="mt-2 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-paper/60">
              Exposés · avec Shimmer
            </div>
            <div className="mt-1 text-center font-mono text-xs text-paper/75">
              3,20 € <span className="text-acid">+ 0,58 €</span> / visiteur
            </div>
          </div>
        </div>
        <div className="mt-4 text-center font-display text-xl text-acid">+18 % généré par Shimmer</div>
        <div className="mt-2 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-paper/55">
          Ce surplus est à vous · notre part : un pourcentage de l&apos;écart prouvé, rien d&apos;autre
        </div>
      </div>
    </div>
  );
}
