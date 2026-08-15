'use client';

import { useEffect, useRef, useState } from 'react';

interface Link { to: string; text: string; }
interface Node { key: string; label: string; line: string; links: Link[]; }

const NODES: Node[] = [
  {
    key: 'vendeur', label: 'Vendeur',
    line: 'Conseille vos visiteurs dans la barre de recherche, comme en magasin.',
    links: [
      { to: 'avis', text: 's\'appuie sur vos avis pour recommander' },
      { to: 'mesure', text: 'chaque vente affine le cross-sell' },
    ],
  },
  {
    key: 'mesure', label: 'Mesure',
    line: 'Prouve votre CA en plus par groupe témoin, à l\'euro et sur vos commandes.',
    links: [
      { to: 'vendeur', text: 'mesure l\'effet du vendeur' },
      { to: 'paniers', text: 'prouve les paniers récupérés' },
    ],
  },
  {
    key: 'campagnes', label: 'Campagnes',
    line: 'Génère pubs et newsletters à partir de votre catalogue.',
    links: [
      { to: 'vendeur', text: 'vos top-sellers nourrissent les pubs' },
      { to: 'mesure', text: 'leur effet est mesuré, pas supposé' },
    ],
  },
  {
    key: 'paniers', label: 'Paniers',
    line: 'Relance les paniers abandonnés, dans le ton de votre marque.',
    links: [
      { to: 'mesure', text: 'chaque relance qui marche est prouvée' },
      { to: 'vendeur', text: 'récupère ce que le vendeur a mis au panier' },
    ],
  },
  {
    key: 'sav', label: 'SAV',
    line: 'Trie les mails, prépare les réponses, suit les tickets tout seul.',
    links: [
      { to: 'avis', text: 'un mauvais avis devient un ticket' },
      { to: 'vendeur', text: 'les questions récurrentes enrichissent le vendeur' },
    ],
  },
  {
    key: 'avis', label: 'Avis',
    line: 'Collecte les bons avis, intercepte les mauvais avant Google.',
    links: [
      { to: 'vendeur', text: 'vos bons avis arment le vendeur' },
      { to: 'sav', text: 'les mauvais partent en SAV, réglés en privé' },
    ],
  },
];

const KEY_INDEX: Record<string, number> = Object.fromEntries(NODES.map((n, i) => [n.key, i]));
const TAU = Math.PI * 2;

export function AutomationsConstellation() {
  const [active, setActive] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodeRefs = useRef<(HTMLAnchorElement | null)[]>([]);

  // État mutable partagé avec la boucle rAF (pas de re-render par frame).
  const activeRef = useRef<number | null>(null);
  const pausedRef = useRef(false);
  const pointer = useRef({ tx: 0, ty: 0, x: 0, y: 0 }); // parallax cible / courant

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let size = 0, cx = 0, cy = 0, radius = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);

    const resize = () => {
      const rect = container.getBoundingClientRect();
      size = rect.width;
      cx = size / 2; cy = size / 2; radius = size * 0.37;
      canvas.width = Math.round(size * dpr);
      canvas.height = Math.round(size * dpr);
      canvas.style.width = `${size}px`;
      canvas.style.height = `${size}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    // Positions angulaires de base, réparties, départ en haut.
    const baseAngle = (i: number) => -Math.PI / 2 + (i / NODES.length) * TAU;

    // Particules ambiantes : le long de chaque rayon, la donnée remonte vers
    // le cerveau. Phases décalées pour un flux continu et organique.
    const AMB = NODES.map((_, i) =>
      [0, 1, 2].map((k) => ({ p: (k / 3 + i * 0.13) % 1, s: 0.12 + (i % 3) * 0.03 })),
    );
    // Particules de connexion (cerveau -> modules liés) quand un module est actif.
    const flow = [0, 1, 2, 3].map((k) => k / 4);

    let rot = 0;
    let raf = 0;
    let last = performance.now();
    let t = 0;

    const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

    const nodePos = (i: number, cam: { x: number; y: number }, depth: number) => {
      const a = baseAngle(i) + rot;
      return {
        x: cx + Math.cos(a) * radius + cam.x * depth,
        y: cy + Math.sin(a) * radius + cam.y * depth,
      };
    };

    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      // Rien à faire si onglet masqué ou conteneur non affiché (display:none en
      // mobile où la constellation est remplacée par une liste). offsetParent
      // null = pas rendu : on économise tout le CPU du canvas.
      if (document.hidden || !container.offsetParent) { last = now; return; }
      if (!size) resize();
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      t += dt;
      if (!pausedRef.current && !reduce) rot += dt * 0.075;

      // Parallax : la constellation s'incline vers le curseur (profondeur).
      pointer.current.x = lerp(pointer.current.x, pointer.current.tx, 0.08);
      pointer.current.y = lerp(pointer.current.y, pointer.current.ty, 0.08);
      const cam = { x: pointer.current.x, y: pointer.current.y };

      const act = activeRef.current;
      const pos = NODES.map((_, i) => nodePos(i, cam, 1));
      const core = { x: cx + cam.x * 0.35, y: cy + cam.y * 0.35 };

      ctx.clearRect(0, 0, size, size);

      // Ensemble des cibles liées au module actif (pour dimmer le reste).
      const linked = act !== null ? NODES[act].links.map((l) => KEY_INDEX[l.to]) : [];
      const isLit = (i: number) => act === null || i === act || linked.includes(i);

      // ── Rayons cerveau <-> modules
      for (let i = 0; i < NODES.length; i++) {
        const p = pos[i];
        const lit = isLit(i);
        ctx.beginPath();
        ctx.moveTo(core.x, core.y);
        ctx.lineTo(p.x, p.y);
        ctx.strokeStyle = lit ? 'rgba(139,77,255,0.22)' : 'rgba(255,255,255,0.04)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // ── Particules ambiantes (donnée qui remonte vers le cerveau)
      for (let i = 0; i < NODES.length; i++) {
        const p = pos[i];
        const lit = isLit(i);
        for (const part of AMB[i]) {
          if (!reduce) part.p = (part.p + dt * part.s) % 1;
          const tt = part.p;
          const x = lerp(p.x, core.x, tt);
          const y = lerp(p.y, core.y, tt);
          const a = Math.sin(tt * Math.PI) * (lit ? 0.9 : 0.18);
          ctx.beginPath();
          ctx.arc(x, y, 1.6, 0, TAU);
          ctx.fillStyle = `rgba(167,120,255,${a})`;
          ctx.fill();
        }
      }

      // ── Connexions du module actif : arcs cerveau-relayés + flux acide
      if (act !== null) {
        for (const l of NODES[act].links) {
          const j = KEY_INDEX[l.to];
          const a = pos[act], b = pos[j];
          // arc légèrement bombé vers le cerveau
          const mx = (a.x + b.x) / 2 + (core.x - (a.x + b.x) / 2) * 0.35;
          const my = (a.y + b.y) / 2 + (core.y - (a.y + b.y) / 2) * 0.35;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.quadraticCurveTo(mx, my, b.x, b.y);
          ctx.strokeStyle = 'rgba(212,255,58,0.5)';
          ctx.lineWidth = 1.4;
          ctx.stroke();
          // particules acides le long de l'arc
          for (const f0 of flow) {
            const tt = (f0 + t * 0.4) % 1;
            const q = 1 - tt;
            const x = q * q * a.x + 2 * q * tt * mx + tt * tt * b.x;
            const y = q * q * a.y + 2 * q * tt * my + tt * tt * b.y;
            ctx.beginPath();
            ctx.arc(x, y, 2, 0, TAU);
            ctx.fillStyle = `rgba(212,255,58,${Math.sin(tt * Math.PI) * 0.9})`;
            ctx.fill();
          }
        }
      }

      // ── Le cerveau : halo pulsant, plus vif si un module est actif
      const pulse = 0.5 + Math.sin(t * 1.6) * 0.5;
      const coreR = size * (0.05 + pulse * 0.012) * (act !== null ? 1.15 : 1);
      const g = ctx.createRadialGradient(core.x, core.y, 0, core.x, core.y, coreR * 3.4);
      g.addColorStop(0, `rgba(139,77,255,${0.35 + pulse * 0.15})`);
      g.addColorStop(0.4, 'rgba(106,43,245,0.16)');
      g.addColorStop(1, 'rgba(106,43,245,0)');
      ctx.beginPath();
      ctx.arc(core.x, core.y, coreR * 3.4, 0, TAU);
      ctx.fillStyle = g;
      ctx.fill();

      // ── Sync position des noeuds DOM (labels nets, toujours droits)
      for (let i = 0; i < NODES.length; i++) {
        const el = nodeRefs.current[i];
        if (!el) continue;
        el.style.transform = `translate(-50%, -50%) translate(${pos[i].x}px, ${pos[i].y}px)`;
        el.style.opacity = isLit(i) ? '1' : '0.28';
      }

      return;
    };
    raf = requestAnimationFrame(draw);

    const onMove = (e: PointerEvent) => {
      const r = container.getBoundingClientRect();
      const nx = ((e.clientX - r.left) / r.width - 0.5) * 2;
      const ny = ((e.clientY - r.top) / r.height - 0.5) * 2;
      pointer.current.tx = nx * 16;
      pointer.current.ty = ny * 16;
    };
    const onLeave = () => { pointer.current.tx = 0; pointer.current.ty = 0; };
    container.addEventListener('pointermove', onMove);
    container.addEventListener('pointerleave', onLeave);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      container.removeEventListener('pointermove', onMove);
      container.removeEventListener('pointerleave', onLeave);
    };
  }, []);

  const setActiveBoth = (i: number | null) => { activeRef.current = i; setActive(i); };
  const current = active !== null ? NODES[active] : null;

  return (
    <section id="automatisations" className="relative z-10 w-full scroll-mt-16 px-6 py-28 md:px-12 md:py-40">
      <div className="mx-auto max-w-[1400px]">
        <div className="mb-14 flex items-baseline gap-6">
          <span className="font-mono text-[11px] uppercase tracking-[0.24em] text-acid">Ce que ça fait</span>
          <span className="h-px flex-1 bg-paper/10" />
        </div>

        <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2 lg:gap-8">
          {/* Texte + détail vivant */}
          <div className="order-2 lg:order-1">
            <h2 className="max-w-[15ch] font-display text-[clamp(34px,5vw,72px)] font-normal leading-[0.95] tracking-tightest text-paper">
              Six automatisations, <span className="italic text-acid">un seul cerveau</span>.
            </h2>
            <p className="mt-8 max-w-[42ch] text-pretty text-lg leading-relaxed text-paper/70 md:text-xl">
              Ce qu&apos;un client cherche, achète ou dit circule entre toutes les briques. Survolez un
              module pour voir ce qu&apos;il nourrit.
            </p>

            <div className="mt-10 min-h-[176px] rounded-2xl border border-paper/12 bg-ink/40 p-6">
              {current ? (
                <div key={current.key} className="animate-[fadeUp_.35s_ease]">
                  <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-acid">{current.label}</div>
                  <p className="mt-3 text-pretty text-lg leading-snug text-paper md:text-xl">{current.line}</p>
                  <ul className="mt-4 space-y-1.5">
                    {current.links.map((l) => (
                      <li key={l.to} className="flex gap-2 text-sm text-paper/60">
                        <span className="text-acid">→</span>
                        <span><span className="text-paper/80">{NODES[KEY_INDEX[l.to]].label}</span> · {l.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div>
                  <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-paper/45">Un seul cerveau</div>
                  <p className="mt-3 text-pretty text-lg leading-snug text-paper/60 md:text-xl">
                    Chaque brique partage les mêmes données. Aucune ne travaille dans son coin.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* La constellation (md+) */}
          <div className="order-1 flex items-center justify-center lg:order-2">
            <div
              ref={containerRef}
              className="relative hidden aspect-square w-full max-w-[520px] shrink-0 md:block"
            >
              <canvas ref={canvasRef} className="absolute inset-0" />

              {/* Cerveau central (net, fixe au centre) */}
              <div className="pointer-events-none absolute left-1/2 top-1/2 flex h-[24%] w-[24%] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border border-acid/25 bg-ink/70">
                <span className="font-display text-2xl text-paper md:text-3xl">S<span className="text-acid">.</span></span>
                <span className="mt-0.5 font-mono text-[8px] uppercase tracking-[0.16em] text-paper/45 md:text-[9px]">un seul cerveau</span>
              </div>

              {/* Noeuds : positionnés par la boucle rAF (transform). */}
              {NODES.map((n, i) => (
                <a
                  key={n.key}
                  ref={(el) => { nodeRefs.current[i] = el; }}
                  href="/shimmer/demo/"
                  aria-label={`${n.label} — voir la démo`}
                  onMouseEnter={() => { pausedRef.current = true; setActiveBoth(i); }}
                  onFocus={() => { pausedRef.current = true; setActiveBoth(i); }}
                  onMouseLeave={() => { setActiveBoth(null); pausedRef.current = false; }}
                  onBlur={() => { setActiveBoth(null); pausedRef.current = false; }}
                  className="absolute left-0 top-0 flex h-[19%] w-[19%] items-center justify-center rounded-full text-center font-mono text-[10px] uppercase tracking-[0.12em] md:text-[11px]"
                  style={{ willChange: 'transform' }}
                  data-node
                >
                  <span className={`node-face pointer-events-none flex h-full w-full items-center justify-center rounded-full ${active === i ? 'is-active' : ''}`}>
                    {n.label}
                  </span>
                </a>
              ))}
            </div>

            {/* Fallback mobile : liste simple. */}
            <ul className="w-full space-y-3 md:hidden">
              {NODES.map((n) => (
                <li key={n.key} className="rounded-xl border border-paper/12 bg-ink/40 p-4">
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
