'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type Vertical = 'wines' | 'lighting' | 'fashion' | 'cosmetic' | 'hifi' | 'bricolage' | 'other';
type Platform = 'shopify' | 'woocommerce' | 'prestashop' | 'custom' | 'unknown';

const VERTICALS: { key: Vertical; label: string }[] = [
  { key: 'wines', label: 'Cave à vins' },
  { key: 'lighting', label: 'Luminaires' },
  { key: 'fashion', label: 'Mode' },
  { key: 'cosmetic', label: 'Cosmétique' },
  { key: 'hifi', label: 'Hi-fi audio' },
  { key: 'bricolage', label: 'Bricolage' },
  { key: 'other', label: 'Autre' },
];

const PLATFORMS: { key: Platform; label: string; nextStep: string }[] = [
  { key: 'shopify', label: 'Shopify', nextStep: 'Coller 3 webhooks dans votre admin Shopify.' },
  { key: 'woocommerce', label: 'WooCommerce', nextStep: 'Installer notre plugin WooCommerce (1 zip à uploader).' },
  { key: 'prestashop', label: 'Prestashop', nextStep: 'Coller 3 hooks dans votre module Prestashop.' },
  { key: 'custom', label: 'Solution maison', nextStep: 'Appeler nos endpoints depuis votre back-office (4 lignes).' },
  { key: 'unknown', label: 'Je ne sais pas', nextStep: 'On vous accompagne pour identifier votre stack.' },
];

interface CreatedStore {
  id: number;
  name: string;
  apiKey: string;
}

export function SignupFlow() {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [vertical, setVertical] = useState<Vertical | null>(null);
  const [platform, setPlatform] = useState<Platform | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedStore | null>(null);
  const [copied, setCopied] = useState(false);

  async function submit() {
    if (!name || !email || !vertical || !platform) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/shimmer/api/stores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          config: {
            ownerEmail: email,
            vertical,
            platform,
            createdVia: 'signup-v4',
          },
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Erreur ${res.status} : ${text.slice(0, 100)}`);
      }
      const data = (await res.json()) as CreatedStore;
      setCreated(data);
      setStep(5);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative">
      <div className="pointer-events-none fixed -left-32 top-1/3 z-0 h-[520px] w-[520px] rounded-full bg-toxic-600/12 blur-[140px]" />
      <div className="pointer-events-none fixed -right-32 bottom-0 z-0 h-[420px] w-[420px] rounded-full bg-acid/8 blur-[120px]" />

      <header className="sticky top-0 z-40 border-b border-paper/10 bg-ink/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1120px] items-center justify-between px-6 py-4 md:px-10">
          <a href="/shimmer/dark/" className="font-display text-xl font-medium tracking-tight text-paper">
            Shimmer<span className="text-acid">.</span>
          </a>
          <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.22em] text-paper/55">
            <span>étape {Math.min(step, 4)} / 4</span>
            <div className="hidden gap-1 md:flex">
              {[1, 2, 3, 4].map(n => (
                <span key={n} className={`h-1.5 w-8 rounded-full ${step >= n ? 'bg-acid' : 'bg-paper/15'}`} />
              ))}
            </div>
          </div>
          <a href="/shimmer/demo/" className="font-mono text-[10px] uppercase tracking-[0.22em] text-paper/55 hover:text-paper">
            Voir d'abord les démos
          </a>
        </div>
      </header>

      <div className="relative z-10 mx-auto max-w-[860px] px-6 py-12 md:px-10 md:py-16">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <Step key="1" onNext={() => setStep(2)} canNext={!!name.trim()}>
              <StepHeader eyebrow="01 · Votre boutique" title="Comment s'appelle votre boutique ?" />
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ex : Caves Forty-Two"
                className="mt-6 w-full rounded-xl border border-paper/15 bg-black/40 px-4 py-3 font-display text-2xl text-paper outline-none focus:border-acid"
                autoFocus
              />
              <p className="mt-3 text-sm text-paper/65">
                Le nom que vos clients verront dans les emails automatiques.
              </p>
            </Step>
          )}

          {step === 2 && (
            <Step key="2" onNext={() => setStep(3)} onPrev={() => setStep(1)} canNext={!!email && /@/.test(email)}>
              <StepHeader eyebrow="02 · Contact" title="Votre email professionnel ?" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="tym@caves-forty-two.com"
                className="mt-6 w-full rounded-xl border border-paper/15 bg-black/40 px-4 py-3 font-display text-2xl text-paper outline-none focus:border-acid"
                autoFocus
              />
              <p className="mt-3 text-sm text-paper/65">
                On ne spam jamais. Sert uniquement pour vous joindre en cas de souci d'intégration.
              </p>
            </Step>
          )}

          {step === 3 && (
            <Step key="3" onNext={() => setStep(4)} onPrev={() => setStep(2)} canNext={!!vertical}>
              <StepHeader eyebrow="03 · Vertical" title="Qu'est-ce que vous vendez ?" />
              <p className="mt-3 text-sm text-paper/65">Sert à adapter le ton du vendeur et les suggestions cross-sell.</p>
              <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3">
                {VERTICALS.map(v => (
                  <button
                    key={v.key}
                    onClick={() => setVertical(v.key)}
                    className={`rounded-xl border px-4 py-4 text-left transition ${
                      vertical === v.key
                        ? 'border-acid bg-acid/10 text-paper'
                        : 'border-paper/15 bg-paper/[0.02] text-paper/70 hover:border-paper/30'
                    }`}
                  >
                    <div className="font-display text-lg tracking-editorial">{v.label}</div>
                  </button>
                ))}
              </div>
            </Step>
          )}

          {step === 4 && (
            <Step key="4" onNext={submit} onPrev={() => setStep(3)} canNext={!!platform && !submitting} nextLabel={submitting ? 'Création…' : 'Créer mon Shimmer'}>
              <StepHeader eyebrow="04 · Plateforme" title="Sur quelle techno tourne votre boutique ?" />
              <p className="mt-3 text-sm text-paper/65">
                Pour vous dire exactement comment brancher Shimmer ensuite.
              </p>
              <div className="mt-6 space-y-2">
                {PLATFORMS.map(p => (
                  <button
                    key={p.key}
                    onClick={() => setPlatform(p.key)}
                    className={`block w-full rounded-xl border px-4 py-3 text-left transition ${
                      platform === p.key
                        ? 'border-acid bg-acid/10 text-paper'
                        : 'border-paper/15 bg-paper/[0.02] text-paper/70 hover:border-paper/30'
                    }`}
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <div className="font-display text-lg tracking-editorial">{p.label}</div>
                      <div className="font-mono text-[10px] text-paper/45">{p.nextStep}</div>
                    </div>
                  </button>
                ))}
              </div>
              {error && (
                <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 font-mono text-xs text-rose-300">
                  ⚠ {error}
                </div>
              )}
            </Step>
          )}

          {step === 5 && created && (
            <motion.div key="5" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl border border-paper/10 bg-paper/[0.03] p-8 md:p-12">
              <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-acid">
                Votre boutique est créée
              </div>
              <h2 className="mt-4 font-display text-[clamp(36px,5vw,64px)] font-normal leading-[0.95] tracking-tightest text-paper">
                Bienvenue chez{' '}
                <span className="italic text-acid">Shimmer</span>,
                <br />
                {created.name}.
              </h2>
              <p className="mt-6 max-w-[58ch] text-base leading-relaxed text-paper/70">
                Voici votre clé API. Notez-la, vous en aurez besoin pour brancher Shimmer sur votre site
                et accéder à l'admin.
              </p>

              <div className="mt-8 rounded-2xl border border-acid/30 bg-black/40 p-5">
                <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-acid">Clé API</div>
                <div className="mt-2 flex items-center gap-3 font-mono text-base text-paper md:text-lg">
                  <code className="flex-1 break-all">{created.apiKey}</code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(created.apiKey);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="rounded-full bg-acid px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-ink transition hover:bg-acid-deep"
                  >
                    {copied ? 'copié !' : 'copier'}
                  </button>
                </div>
              </div>

              <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
                <NextCard
                  num="1"
                  title="Importer votre catalogue"
                  desc="CSV ou JSON. On extrait univers, mots-clés et questions du vendeur IA automatiquement."
                  cta="Voir la doc"
                  href="/shimmer/docs.html"
                />
                <NextCard
                  num="2"
                  title="Brancher 3 lignes sur la fiche produit"
                  desc="Le SDK est en JS pur, drop-in sur n'importe quel CMS."
                  cta="Voir le code"
                  href="/shimmer/dark/#brancher"
                />
                <NextCard
                  num="3"
                  title="Ouvrir votre admin"
                  desc="Voir vos commandes, paniers, SAV, campagnes, tout en un."
                  cta="Aller à l'admin →"
                  href="/shimmer/admin/"
                  accent
                />
              </div>

              <div className="mt-10 flex flex-wrap items-center gap-4 border-t border-paper/10 pt-6 font-mono text-xs text-paper/55">
                <span>Store #{created.id}</span>
                <span>·</span>
                <span>v0.4</span>
                <a href={`mailto:tym.mercier@gmail.com?subject=Shimmer · ${created.name}`} className="ml-auto rounded-full border border-paper/20 px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-paper/70 hover:text-paper">
                  Besoin d'aide pour brancher ?
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function Step({
  children,
  onNext,
  onPrev,
  canNext,
  nextLabel,
}: {
  children: React.ReactNode;
  onNext: () => void;
  onPrev?: () => void;
  canNext: boolean;
  nextLabel?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.3 }}
      className="rounded-3xl border border-paper/10 bg-paper/[0.03] p-8 md:p-12"
    >
      {children}
      <div className="mt-10 flex items-center justify-between">
        {onPrev ? (
          <button onClick={onPrev} className="font-mono text-xs uppercase tracking-[0.18em] text-paper/65 hover:text-paper">
            ← retour
          </button>
        ) : (
          <span />
        )}
        <button
          onClick={onNext}
          disabled={!canNext}
          className="rounded-full bg-acid px-7 py-3 font-mono text-[11px] uppercase tracking-[0.18em] text-ink transition hover:bg-acid-deep disabled:opacity-30"
        >
          {nextLabel ?? 'Continuer →'}
        </button>
      </div>
    </motion.div>
  );
}

function StepHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div>
      <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-acid">{eyebrow}</div>
      <h1 className="mt-3 font-display text-[clamp(28px,4vw,48px)] font-normal leading-[0.95] tracking-tightest text-paper">
        {title}
      </h1>
    </div>
  );
}

function NextCard({ num, title, desc, cta, href, accent }: { num: string; title: string; desc: string; cta: string; href: string; accent?: boolean }) {
  return (
    <a
      href={href}
      className={`block rounded-2xl border p-5 transition ${
        accent
          ? 'border-acid/40 bg-acid/5 hover:bg-acid/10'
          : 'border-paper/10 bg-paper/[0.02] hover:bg-paper/[0.05]'
      }`}
    >
      <div className={`font-mono text-[10px] uppercase tracking-[0.22em] ${accent ? 'text-acid' : 'text-paper/55'}`}>{num}</div>
      <div className="mt-2 font-display text-lg leading-tight tracking-editorial text-paper">{title}</div>
      <p className="mt-2 text-sm leading-relaxed text-paper/65">{desc}</p>
      <div className={`mt-4 font-mono text-[11px] uppercase tracking-[0.18em] ${accent ? 'text-acid' : 'text-paper/65'}`}>{cta}</div>
    </a>
  );
}
