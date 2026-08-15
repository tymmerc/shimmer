'use client';

import { motion } from 'framer-motion';
import { DemoHeader } from './DemoVendeur';

const sequence = [
  {
    time: 'H+0',
    label: 'Panier abandonné',
    badge: 'DÉTECTÉ',
    body: 'Marie a quitté avec Silenz Pro + Filtre HEPA dans le panier. Total : 278€.',
    tone: 'border-paper/15 text-paper/65',
    body_tone: 'text-paper/85',
  },
  {
    time: 'J+1 · 09:00',
    label: 'Email 1 · douceur',
    badge: 'ENVOYÉ',
    body: 'Bonjour Marie, votre Silenz Pro vous attend toujours dans le panier. Une question ? Le vendeur est dispo : [lien]',
    tone: 'border-acid/30 bg-acid/5 text-acid',
    body_tone: 'text-paper italic',
  },
  {
    time: 'J+3 · 10:00',
    label: 'Email 2 · incitatif',
    badge: 'ENVOYÉ',
    body: 'Allez, on vous offre 10% si vous finalisez aujourd\'hui. Code SHIMMER10, valable 48h. Tym',
    tone: 'border-acid/30 bg-acid/5 text-acid',
    body_tone: 'text-paper italic',
  },
  {
    time: 'J+3 · 18:42',
    label: 'Panier récupéré',
    badge: 'CONVERTI',
    body: 'Marie a payé. 250€ après la promo. Le code -10% sert aussi à recoller la confiance.',
    tone: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
    body_tone: 'text-paper',
  },
];

const stats = [
  { label: 'Paniers abandonnés / mois', value: '420' },
  { label: 'Récupérés', value: '32 %', tone: 'acid' },
  { label: 'Email 1 (sans promo)', value: '18 %' },
  { label: 'Email 2 (avec -10%)', value: '+14 pts' },
];

export function DemoRelance() {
  return (
    <div>
      <DemoHeader
        eyebrow="Démo · Relance panier"
        title="Les paniers abandonnés,"
        accent="rattrapés"
        intro="Quand un client part sans payer, on attend 24h, on envoie un mail doux. 48h plus tard, un mail avec -10%. On récupère 32 % des paniers cette façon."
      />

      <div className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map(s => (
          <div key={s.label} className="rounded-xl border border-paper/10 bg-paper/[0.03] p-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-paper/45">{s.label}</div>
            <div className={`mt-2 font-display text-2xl tracking-editorial ${s.tone === 'acid' ? 'text-acid' : 'text-paper'}`}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-paper/10 bg-paper/[0.03] p-6 backdrop-blur-sm md:p-8">
        <div className="mb-6 flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.22em] text-paper/55">
          <span>Séquence type · panier 278 €</span>
          <span className="rounded-full bg-acid px-2 py-0.5 text-[10px] text-ink">scénario auto</span>
        </div>

        <div className="space-y-4">
          {sequence.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.45 }}
              className="grid grid-cols-1 gap-4 md:grid-cols-[160px_1fr]"
            >
              <div>
                <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-paper/50">{step.time}</div>
                <div className="mt-2 font-display text-lg tracking-editorial text-paper">{step.label}</div>
                <span className={`mt-2 inline-block rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.22em] ${step.tone}`}>
                  {step.badge}
                </span>
              </div>
              <div className="rounded-xl border border-paper/10 bg-paper/[0.02] p-4">
                <div className={`text-sm leading-relaxed ${step.body_tone}`}>
                  {step.body.startsWith('Bonjour') || step.body.startsWith('Allez') ? `"${step.body}"` : step.body}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-acid/25 bg-acid/5 p-6">
        <div className="font-display text-2xl tracking-editorial text-paper">
          1 panier sur 3 récupéré, c'est <span className="italic text-acid">5 400 €/mois</span> en moyenne.
        </div>
        <p className="mt-3 max-w-[60ch] text-sm leading-relaxed text-paper/70">
          Sur une boutique qui faisait 420 paniers abandonnés par mois (paniers moyens 50€). Et personne
          n'a eu à écrire un mail.
        </p>
      </div>
    </div>
  );
}
