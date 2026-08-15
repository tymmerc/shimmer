'use client';

import { motion } from 'framer-motion';

const variants = [
  {
    slug: 'light',
    href: '/shimmer/',
    name: 'Light',
    tagline: 'Éditorial papier',
    mood: 'Calme. Serif énorme. Orb toxique en sphère sur fond crème. Le plus complet en sections.',
    palette: ['#fbf9f4', '#0d0b14', '#6a2bf5'],
    accent: 'bg-toxic-500',
    preview: (
      <div className="relative h-full w-full overflow-hidden bg-paper">
        <div className="absolute -right-12 top-4 h-44 w-44 rounded-full bg-toxic-600 shadow-[0_20px_60px_-20px_rgba(106,43,245,0.6)]" />
        <div className="absolute left-6 top-12 w-3/4 font-display text-[44px] leading-[0.92] tracking-tightest text-ink">
          Un vendeur qui <span className="italic text-toxic-600">parle</span>.
        </div>
        <div className="absolute bottom-6 left-6 right-6 flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.18em] text-ink-mute">
          <span className="h-1.5 w-1.5 rounded-full bg-toxic-500" />
          v0.4 · Cross-sell narratif
        </div>
      </div>
    ),
  },
  {
    slug: 'dark',
    href: '/shimmer/dark/',
    name: 'Dark',
    tagline: 'Acid sombre',
    mood: 'Noir profond. Vert acide. Canvas toxique en background full. Plus tech, plus serré.',
    palette: ['#0d0b14', '#d4ff3a', '#6a2bf5'],
    accent: 'bg-acid',
    preview: (
      <div className="relative h-full w-full overflow-hidden bg-ink">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_60%_40%,rgba(106,43,245,0.55),transparent_60%)]" />
        <div className="absolute left-6 top-12 w-4/5 font-display text-[42px] leading-[0.92] tracking-tightest text-paper">
          Le vendeur <span className="italic text-acid">qui parle</span>.
        </div>
        <div className="absolute bottom-6 left-6 inline-flex items-center gap-2 rounded-full border border-paper/15 bg-paper/5 px-3 py-1 font-mono text-[9px] uppercase tracking-[0.18em] text-paper/70">
          <span className="h-1.5 w-1.5 rounded-full bg-acid" />
          Mode opérationnel
        </div>
      </div>
    ),
  },
  {
    slug: 'mono',
    href: '/shimmer/mono/',
    name: 'Mono',
    tagline: 'Tech / Linear',
    mood: 'Mono partout. Grille subtile. Tables, badges, terminal. Style "dev tool" pour CTO.',
    palette: ['#0a0a0a', '#e4e4e7', '#a778ff'],
    accent: 'bg-emerald-400',
    preview: (
      <div className="relative h-full w-full overflow-hidden bg-[#0a0a0a] font-mono">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:24px_24px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_30%,rgba(106,43,245,0.18),transparent_60%)]" />
        <div className="absolute left-6 right-6 top-6 flex items-center justify-between text-zinc-300">
          <span className="text-xs font-medium">~/shimmer</span>
          <span className="rounded border border-white/10 px-1.5 py-0.5 text-[8px] text-zinc-400">v0.4</span>
        </div>
        <div className="absolute left-6 right-6 top-16 text-[26px] font-medium leading-tight tracking-tight text-zinc-100">
          A conversational sales agent <span className="text-zinc-500">with measurable attribution.</span>
        </div>
        <div className="absolute bottom-6 left-6 inline-flex items-center gap-2 text-[9px] uppercase tracking-[0.18em] text-zinc-400">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
          status · operational
        </div>
      </div>
    ),
  },
  {
    slug: 'brut',
    href: '/shimmer/brut/',
    name: 'Brut',
    tagline: 'Brutalist',
    mood: 'Acid green plein écran. Sans-serif noir ultra-bold. Blocs cassés. Le plus radical.',
    palette: ['#d4ff3a', '#0d0b14', '#0d0b14'],
    accent: 'bg-ink',
    preview: (
      <div className="relative h-full w-full overflow-hidden bg-acid font-sans">
        <div className="absolute left-4 top-6 text-[52px] font-black uppercase leading-[0.85] tracking-tighter text-ink">
          VENDEUR.<br/>CROSS-<br/>SELL.<br/><span className="bg-ink px-1 text-acid">ATTRIBUÉ.</span>
        </div>
      </div>
    ),
  },
];

export function ShowcaseGallery() {
  return (
    <div className="mx-auto max-w-[1480px] px-6 py-16 md:px-12 md:py-24">
      <header className="mb-16">
        <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-toxic-600">
          Shimmer · 4 directions
        </div>
        <h1 className="mt-6 max-w-[24ch] font-display text-balance text-[clamp(48px,7vw,120px)] font-normal leading-[0.92] tracking-tightest">
          Quatre directions,{' '}
          <span className="italic text-toxic-600">une intention</span>.
        </h1>
        <p className="mt-6 max-w-[60ch] text-pretty text-lg leading-relaxed text-ink-soft">
          Chaque variante porte la même promesse (vendeur IA + cross-sell + attribution €)
          dans une grammaire visuelle différente. Choisis celle qui parle le mieux à ton marché.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        {variants.map((v, i) => (
          <motion.a
            key={v.slug}
            href={v.href}
            initial={{ opacity: 1, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.1 }}
            transition={{ delay: i * 0.08, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ y: -6 }}
            className="group block overflow-hidden rounded-3xl border border-ink/10 bg-paper-warm shadow-[0_30px_60px_-30px_rgba(13,11,20,0.18)] transition hover:border-ink/30"
          >
            <div className="relative aspect-[16/10] w-full overflow-hidden border-b border-ink/10">
              {v.preview}
              <div className="absolute right-4 top-4 inline-flex items-center gap-2 rounded-full bg-paper/90 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-ink backdrop-blur-sm">
                <span className={`h-1.5 w-1.5 rounded-full ${v.accent}`} />
                {v.tagline}
              </div>
            </div>

            <div className="p-7">
              <div className="flex items-baseline justify-between">
                <h2 className="font-display text-3xl tracking-editorial text-ink">{v.name}</h2>
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
                  0{i + 1} / 04
                </span>
              </div>
              <p className="mt-3 text-base leading-relaxed text-ink-soft">{v.mood}</p>

              <div className="mt-5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {v.palette.map(c => (
                    <span key={c} className="h-4 w-4 rounded-full border border-ink/15" style={{ background: c }} />
                  ))}
                </div>
                <span className="inline-flex items-center gap-1 font-mono text-xs uppercase tracking-[0.18em] text-ink transition group-hover:translate-x-1">
                  Voir →
                </span>
              </div>
            </div>
          </motion.a>
        ))}
      </div>

      <footer className="mt-24 border-t border-ink/10 pt-8 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-mute">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <span>Shimmer · vendeur IA · v0.4 · 2026</span>
          <div className="flex gap-6">
            <a href="/shimmer/docs.html" className="hover:text-ink">API</a>
            <a href="/shimmer/cross-sell-demo.html" className="hover:text-ink">Démo</a>
            <a href="/shimmer/cross-sell-dashboard.html" className="hover:text-ink">Dashboard</a>
            <a href="mailto:tym.mercier@gmail.com" className="hover:text-ink">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
