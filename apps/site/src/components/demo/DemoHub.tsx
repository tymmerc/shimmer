'use client';

// Hub des démos, refondu. Deux colonnes : côté client (ce que le visiteur de
// votre boutique voit), côté marchand (ce que vous voyez en back-office). Six
// démos focalisées, pas neuf. Le vendeur est un vrai vendeur, pas un script.

import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DemoVendeur } from './DemoVendeur';
import { DemoCrossSell } from './DemoCrossSell';
import { DemoAvis } from './DemoAvis';
import { DemoMail } from './DemoMail';
import { DemoSAV } from './DemoSAV';
import { DemoAttribution } from './DemoAttribution';

type DemoKey = 'vendeur' | 'cross-sell' | 'avis' | 'mail' | 'sav' | 'mesure';

interface DemoDef {
  key: DemoKey;
  side: 'client' | 'merchant';
  label: string;
  teaser: string;
}

const demos: DemoDef[] = [
  { key: 'vendeur',    side: 'client',   label: 'Le vendeur en ligne',     teaser: 'Tapez ce que vous cherchez, il fouille le catalogue et propose le bon produit.' },
  { key: 'cross-sell', side: 'client',   label: 'Les ventes additionnelles', teaser: 'Sur chaque fiche, trois suggestions sorties de votre stock, jamais au hasard.' },
  { key: 'avis',       side: 'client',   label: 'La page d\'avis',         teaser: 'Le client laisse son avis, vous gardez la main dessus.' },
  { key: 'mail',       side: 'merchant', label: 'L\'inbox triée',          teaser: 'Chaque mail classé, brouillon prêt, validé d\'un clic.' },
  { key: 'sav',        side: 'merchant', label: 'Le SAV automatisé',       teaser: 'Tickets ouverts sur les réclamations, alertes sur les cas urgents.' },
  { key: 'mesure',     side: 'merchant', label: 'La mesure',               teaser: 'Le CA additionnel à l\'euro, sans gonfler les chiffres.' },
];

export function DemoHub() {
  const [active, setActive] = useState<DemoKey>('vendeur');
  const demoRef = useRef<HTMLElement>(null);

  function onSelect(key: DemoKey): void {
    setActive(key);
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setTimeout(() => demoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    }
  }

  const clientDemos = demos.filter(d => d.side === 'client');
  const merchantDemos = demos.filter(d => d.side === 'merchant');

  return (
    <div className="relative">
      <Header />

      <div className="relative z-10 mx-auto max-w-[1480px] px-6 pb-24 pt-10 md:px-12">
        <div className="mb-12 max-w-[60ch]">
          <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-acid">
            Six démos · zéro montage
          </div>
          <h1 className="mt-3 font-display text-[clamp(32px,4vw,56px)] font-normal leading-[0.95] tracking-tightest text-paper">
            Promenez-vous d'un côté à l'autre du{' '}
            <span className="italic text-acid">comptoir</span>.
          </h1>
          <p className="mt-5 text-base leading-relaxed text-paper/70">
            À gauche, ce que vivent vos clients. À droite, ce que vous voyez en back-office. Les
            modules partagent leurs données, donc une seule démo entraîne l'autre.
          </p>
        </div>

        <div className="grid grid-cols-12 gap-x-8 gap-y-8">
          <aside className="col-span-12 lg:col-span-4 xl:col-span-3">
            <div className="lg:sticky lg:top-24 space-y-7">
              <SideColumn
                title="Côté client"
                subtitle="Sur votre boutique"
                demos={clientDemos}
                active={active}
                onSelect={onSelect}
              />
              <SideColumn
                title="Côté marchand"
                subtitle="Dans votre admin"
                demos={merchantDemos}
                active={active}
                onSelect={onSelect}
              />
            </div>
          </aside>

          <section ref={demoRef} className="col-span-12 lg:col-span-8 xl:col-span-9">
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              >
                {active === 'vendeur' && <DemoVendeur />}
                {active === 'cross-sell' && <DemoCrossSell />}
                {active === 'avis' && <DemoAvis />}
                {active === 'mail' && <DemoMail />}
                {active === 'sav' && <DemoSAV />}
                {active === 'mesure' && <DemoAttribution />}
              </motion.div>
            </AnimatePresence>
          </section>
        </div>
      </div>
    </div>
  );
}

function SideColumn({
  title,
  subtitle,
  demos,
  active,
  onSelect,
}: {
  title: string;
  subtitle: string;
  demos: DemoDef[];
  active: DemoKey;
  onSelect: (k: DemoKey) => void;
}) {
  return (
    <div>
      <div className="mb-3 flex items-baseline gap-3">
        <span className="font-mono text-[11px] uppercase tracking-[0.24em] text-acid">{title}</span>
        <span className="font-mono text-[10px] uppercase tracking-[0.20em] text-paper/40">{subtitle}</span>
      </div>
      <nav className="space-y-1.5">
        {demos.map(d => (
          <button
            key={d.key}
            type="button"
            onClick={() => onSelect(d.key)}
            className={`block w-full rounded-xl border px-4 py-3 text-left transition ${
              active === d.key
                ? 'border-acid bg-acid/10 text-paper'
                : 'border-paper/10 bg-paper/[0.02] text-paper/70 hover:border-paper/25 hover:bg-paper/[0.04]'
            }`}
          >
            <div className="font-display text-base text-paper">{d.label}</div>
            <div className="mt-0.5 text-[12px] leading-snug text-paper/55">{d.teaser}</div>
          </button>
        ))}
      </nav>
    </div>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-paper/10 bg-ink/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1480px] items-center justify-between px-6 py-4 md:px-12">
        <div className="flex items-center gap-4">
          <a href="/shimmer/" className="font-display text-xl font-medium tracking-tight text-paper">
            Shimmer<span className="text-acid">.</span>
          </a>
          <span className="hidden font-mono text-[11px] uppercase tracking-[0.22em] text-paper/45 md:inline">
            / démos
          </span>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/shimmer/"
            className="inline-flex items-center gap-2 rounded-full border border-paper/20 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-paper transition hover:bg-paper/10"
          >
            ← Retour au site
          </a>
          <a
            href="/shimmer/signup/"
            className="hidden rounded-full bg-acid px-4 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-ink transition hover:bg-acid-deep md:inline-flex"
          >
            Brancher chez moi
          </a>
        </div>
      </div>
    </header>
  );
}
