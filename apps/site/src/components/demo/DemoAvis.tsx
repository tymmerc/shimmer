'use client';

import { motion } from 'framer-motion';
import { DemoHeader } from './DemoVendeur';

const avis = [
  {
    stars: 5,
    text: 'Silencieux comme promis, mon chat dort à côté sans broncher. Brosse anti-poils parfaite.',
    author: 'Anna T.',
    age: 'il y a 2 h',
    status: 'PUBLIÉ',
    action: 'Publié sur la fiche · merci envoyé',
    tone: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
  },
  {
    stars: 4,
    text: 'Bon produit, batterie un peu juste sur grandes surfaces (90 m²).',
    author: 'Karim B.',
    age: 'il y a 4 h',
    status: 'PUBLIÉ',
    action: 'Publié · feedback transmis au produit',
    tone: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
  },
  {
    stars: 3,
    text: 'Ça fait le boulot mais la brosse principale s\'emmêle vite.',
    author: 'Sophie M.',
    age: 'il y a 6 h',
    status: 'À MODÉRER',
    action: 'Mis en attente · vérification équipe',
    tone: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
  },
  {
    stars: 2,
    text: 'Reçu cassé. Marche pas du tout.',
    author: 'Léa M.',
    age: 'il y a 12 min',
    status: 'TICKET SAV',
    action: 'Avis bloqué · ticket SAV créé · client recontacté',
    tone: 'border-rose-500/40 bg-rose-500/10 text-rose-300',
  },
  {
    stars: 5,
    text: 'Parfait pour les poils longs, mon allergie n\'a plus à craindre la maison.',
    author: 'Théo R.',
    age: 'il y a 1 j',
    status: 'PUBLIÉ',
    action: 'Publié · proposé en témoignage homepage',
    tone: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
  },
];

const distribution = [
  { stars: 5, count: 62, pct: 60 },
  { stars: 4, count: 23, pct: 22 },
  { stars: 3, count: 9, pct: 9 },
  { stars: 2, count: 5, pct: 5 },
  { stars: 1, count: 4, pct: 4 },
];

export function DemoAvis() {
  return (
    <div>
      <DemoHeader
        eyebrow="Démo · Collecte d'avis"
        title="Les bons publiés,"
        accent="les mauvais désamorcés"
        intro="Demande d'avis automatique après chaque livraison. Les 4-5 ★ partent sur la fiche. Les 1-2 ★ déclenchent un ticket SAV avant d'apparaître sur Google."
      />

      <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-[1.5fr_1fr]">
        {/* Stream */}
        <div className="rounded-2xl border border-paper/10 bg-paper/[0.03] backdrop-blur-sm">
          <div className="flex items-center justify-between border-b border-paper/10 bg-paper/[0.04] px-5 py-3 font-mono text-[10px] uppercase tracking-[0.22em] text-paper/55">
            <span>Flux d'avis · 24 dernières heures</span>
            <span className="rounded-full bg-acid px-2 py-0.5 text-[10px] text-ink">5 avis</span>
          </div>
          <div className="divide-y divide-paper/5">
            {avis.map((a, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06, duration: 0.4 }}
                className="px-5 py-4"
              >
                <div className="flex items-center gap-3">
                  <Stars n={a.stars} />
                  <span className={`rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.22em] ${a.tone}`}>
                    {a.status}
                  </span>
                  <span className="ml-auto font-mono text-[10px] text-paper/40">{a.age}</span>
                </div>
                <div className="mt-2 text-sm italic leading-relaxed text-paper/85">"{a.text}"</div>
                <div className="mt-2 font-mono text-xs text-paper/55">· {a.author}</div>
                <div className="mt-3 inline-flex items-start gap-2 text-xs">
                  <span className="text-acid">→</span>
                  <span className="text-paper/70">{a.action}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-paper/10 bg-paper/[0.03] p-5 backdrop-blur-sm">
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-paper/50">
              Note moyenne · 30 jours
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="font-display text-5xl tracking-tightest text-paper">4,3</span>
              <span className="font-mono text-sm text-paper/55">/ 5</span>
            </div>
            <Stars n={4} />
            <div className="mt-3 font-mono text-xs text-paper/55">103 avis collectés</div>
          </div>

          <div className="rounded-2xl border border-paper/10 bg-paper/[0.03] p-5 backdrop-blur-sm">
            <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.22em] text-paper/50">
              Distribution
            </div>
            <div className="space-y-2">
              {distribution.map(d => (
                <div key={d.stars} className="grid grid-cols-[40px_1fr_40px] items-center gap-2">
                  <div className="font-mono text-xs text-paper/70">{d.stars}★</div>
                  <div className="relative h-2 overflow-hidden rounded-full bg-paper/[0.06]">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${d.pct}%` }}
                      transition={{ delay: 0.2, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                      className={`h-full rounded-full ${d.stars >= 4 ? 'bg-acid' : d.stars >= 3 ? 'bg-amber-400' : 'bg-rose-400'}`}
                    />
                  </div>
                  <div className="text-right font-mono text-xs text-paper/55">{d.count}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-acid/25 bg-acid/5 p-5">
            <div className="font-display text-base tracking-editorial text-paper">
              23 avis 1-2★ interceptés ce mois.
            </div>
            <p className="mt-2 text-xs leading-relaxed text-paper/70">
              Autant de Google Reviews négatifs qui auraient atterri en public si rien ne les avait
              désamorcés en amont.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stars({ n }: { n: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} width="14" height="14" viewBox="0 0 24 24" fill={i < n ? '#d4ff3a' : 'rgba(255,255,255,0.15)'}>
          <path d="M12 2 L14.85 8.46 L22 9.27 L16.5 13.97 L18.18 21 L12 17.27 L5.82 21 L7.5 13.97 L2 9.27 L9.15 8.46 Z" />
        </svg>
      ))}
    </div>
  );
}
