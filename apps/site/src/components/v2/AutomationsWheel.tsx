'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

interface Node {
  key: string;
  label: string;
  line: string;
}

const NODES: Node[] = [
  { key: 'vendeur', label: 'Vendeur', line: 'Conseille vos visiteurs dans la barre de recherche, comme en magasin.' },
  { key: 'paniers', label: 'Paniers', line: 'Relance les paniers abandonnés, dans le ton de votre marque.' },
  { key: 'sav', label: 'SAV', line: 'Trie les mails, prépare les réponses, suit les tickets tout seul.' },
  { key: 'avis', label: 'Avis', line: 'Collecte les bons avis, intercepte les mauvais avant Google.' },
  { key: 'campagnes', label: 'Campagnes', line: 'Génère pubs et newsletters à partir de votre catalogue.' },
  { key: 'mesure', label: 'Mesure', line: 'Prouve le CA en plus par groupe témoin. On ne facture que l\'écart.' },
];

// Coordonnées sur le cercle (rayon en %, centre 50/50), départ en haut.
const R = 39;
const COORDS = NODES.map((_, i) => {
  const a = (-90 + i * (360 / NODES.length)) * (Math.PI / 180);
  return { x: 50 + R * Math.cos(a), y: 50 + R * Math.sin(a) };
});

export function AutomationsWheel() {
  const [active, setActive] = useState<number | null>(null);
  // La roue s'arrête dès que la souris entre dans la zone (pas seulement sur un
  // nœud) : sinon un nœud en rotation est impossible à attraper au survol.
  const [hovered, setHovered] = useState(false);
  const current = active !== null ? NODES[active] : null;

  return (
    <section
      id="automatisations"
      className="relative z-10 w-full scroll-mt-16 px-6 py-28 md:px-12 md:py-40"
    >
      <div className="mx-auto max-w-[1400px]">
        <div className="mb-14 flex items-baseline gap-6">
          <span className="font-mono text-[11px] uppercase tracking-[0.24em] text-acid">Ce que ça fait</span>
          <span className="h-px flex-1 bg-paper/10" />
        </div>

        <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2 lg:gap-8">
          {/* Colonne texte */}
          <div className="order-2 lg:order-1">
            <h2 className="max-w-[16ch] font-display text-[clamp(34px,5vw,72px)] font-normal leading-[0.95] tracking-tightest text-paper">
              Six automatisations, <span className="italic text-acid">un seul cerveau</span>.
            </h2>
            <p className="mt-8 max-w-[44ch] text-pretty text-lg leading-relaxed text-paper/70 md:text-xl">
              Chaque brique partage les mêmes données. Survolez la roue pour voir laquelle fait quoi,
              ou continuez à descendre.
            </p>

            {/* Détail du module survolé */}
            <div className="mt-10 min-h-[132px] rounded-2xl border border-paper/12 bg-paper/[0.03] p-6 md:min-h-[120px]">
              {current ? (
                <motion.div
                  key={current.key}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-acid">{current.label}</div>
                  <p className="mt-3 text-pretty text-lg leading-snug text-paper md:text-xl">{current.line}</p>
                </motion.div>
              ) : (
                <div>
                  <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-paper/45">Un seul cerveau</div>
                  <p className="mt-3 text-pretty text-lg leading-snug text-paper/60 md:text-xl">
                    Ce qu&apos;un client cherche, achète ou dit nourrit tous les autres modules.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* La roue (md+). items-center empêche le flex d'étirer la roue en
              hauteur (sinon aspect-square dérive la largeur de la hauteur et
              dépasse max-w). */}
          <div className="order-1 flex items-center justify-center lg:order-2">
            <div
              className={`wheel ${hovered ? 'wheel-paused' : ''} relative hidden aspect-square w-full max-w-[500px] shrink-0 overflow-hidden md:block`}
              onMouseEnter={() => setHovered(true)}
              onMouseLeave={() => { setHovered(false); setActive(null); }}
            >
              {/* Anneau + rayons + noeuds, en rotation ; le contenu contre-tourne. */}
              <div className="wheel-ring absolute inset-0">
                {/* Rayons */}
                <svg viewBox="0 0 100 100" className="pointer-events-none absolute inset-0 h-full w-full">
                  {COORDS.map((c, i) => (
                    <line
                      key={i}
                      x1="50"
                      y1="50"
                      x2={c.x}
                      y2={c.y}
                      stroke={active === i ? 'rgba(212,255,58,0.7)' : 'rgba(255,255,255,0.10)'}
                      strokeWidth={active === i ? 0.6 : 0.35}
                      className="transition-all duration-300"
                    />
                  ))}
                </svg>

                {/* Noeuds */}
                {NODES.map((n, i) => (
                  <a
                    key={n.key}
                    href="/shimmer/demo/"
                    aria-label={`${n.label} — voir la démo`}
                    onMouseEnter={() => setActive(i)}
                    onFocus={() => setActive(i)}
                    className="group absolute flex h-[22%] w-[22%] -translate-x-1/2 -translate-y-1/2 items-center justify-center"
                    style={{ left: `${COORDS[i].x}%`, top: `${COORDS[i].y}%` }}
                  >
                    <span
                      className={`wheel-counter flex h-full w-full items-center justify-center rounded-full border text-center font-mono text-[10px] uppercase tracking-[0.14em] transition-colors duration-300 md:text-[11px] ${
                        active === i
                          ? 'border-acid/70 bg-acid/15 text-acid shadow-[0_0_30px_rgba(212,255,58,0.25)]'
                          : 'border-paper/15 bg-ink/60 text-paper/70 group-hover:text-paper'
                      }`}
                    >
                      {n.label}
                    </span>
                  </a>
                ))}
              </div>

              {/* Centre fixe : le cerveau */}
              <div className="pointer-events-none absolute left-1/2 top-1/2 flex h-[26%] w-[26%] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border border-acid/30 bg-ink/80">
                <span className="font-display text-2xl text-paper md:text-3xl">
                  S<span className="text-acid">.</span>
                </span>
                <span className="mt-1 font-mono text-[8px] uppercase tracking-[0.18em] text-paper/45 md:text-[9px]">
                  un seul cerveau
                </span>
              </div>
            </div>

            {/* Fallback mobile : liste simple, pas de roue minuscule illisible. */}
            <ul className="w-full space-y-3 md:hidden">
              {NODES.map((n) => (
                <li key={n.key} className="rounded-xl border border-paper/12 bg-paper/[0.03] p-4">
                  <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-acid">{n.label}</div>
                  <p className="mt-2 text-pretty text-base leading-snug text-paper/75">{n.line}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
