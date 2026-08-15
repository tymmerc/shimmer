'use client';

import { motion } from 'framer-motion';
import { DemoHeader } from './DemoVendeur';

const tickets = [
  {
    id: '#SAV-2841',
    title: 'Colis arrivé endommagé',
    customer: 'Léa Mercier',
    source: 'Mail · "Reçu cassé"',
    status: 'En cours',
    priority: 'HAUTE',
    age: 'il y a 12 min',
    auto: 'Bon de retour envoyé · remboursement pré-approuvé',
    tone: 'border-rose-500/40 bg-rose-500/10 text-rose-300',
  },
  {
    id: '#SAV-2840',
    title: 'Filtre non compatible',
    customer: 'Jean Pradel',
    source: 'Mail · "Le filtre que j\'ai reçu ne rentre pas"',
    status: 'En attente photo',
    priority: 'NORMALE',
    age: 'il y a 1 h',
    auto: 'Réponse envoyée · attente du N° série',
    tone: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
  },
  {
    id: '#SAV-2839',
    title: 'Aspi tombé en panne après 3 mois',
    customer: 'Sophie Albert',
    source: 'Avis 2★ · "Marche plus du tout"',
    status: 'Escaladé',
    priority: 'HAUTE',
    age: 'il y a 3 h',
    auto: 'Détecté depuis avis · ticket créé · équipe alertée',
    tone: 'border-rose-500/40 bg-rose-500/10 text-rose-300',
  },
  {
    id: '#SAV-2838',
    title: 'Demande de garantie',
    customer: 'Maxime Roy',
    source: 'Mail · "Comment fonctionne la garantie 2 ans ?"',
    status: 'Résolu',
    priority: 'BASSE',
    age: 'il y a 5 h',
    auto: 'Réponse auto envoyée · client satisfait',
    tone: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
  },
];

const stats = [
  { label: 'Tickets créés ce mois', value: '142' },
  { label: 'Délai 1ère réponse', value: '8 min' },
  { label: 'Résolus en moins de 24h', value: '87 %' },
  { label: 'Avis négatifs interceptés', value: '23' },
];

export function DemoSAV() {
  return (
    <div>
      <DemoHeader
        eyebrow="Démo · Service après-vente"
        title="Les soucis pris en main"
        accent="avant qu'ils ne dégénèrent"
        intro="Une réclamation par mail ? Un avis 1★ ? Un ticket est créé automatiquement, classé par priorité, et la première action est déjà proposée."
      />

      <div className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map(s => (
          <div key={s.label} className="rounded-xl border border-paper/10 bg-paper/[0.03] p-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-paper/45">{s.label}</div>
            <div className="mt-2 font-display text-2xl tracking-editorial text-paper">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-paper/10 bg-paper/[0.03] backdrop-blur-sm">
        <div className="flex items-center justify-between border-b border-paper/10 bg-paper/[0.04] px-5 py-3 font-mono text-[10px] uppercase tracking-[0.22em] text-paper/55">
          <span>Tickets ouverts · derniers 24 h</span>
          <span className="rounded-full bg-acid px-2 py-0.5 text-[10px] text-ink">{tickets.length} actifs</span>
        </div>
        <div className="divide-y divide-paper/5">
          {tickets.map((t, i) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, duration: 0.4 }}
              className="px-5 py-5 transition hover:bg-paper/[0.03]"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs text-paper/55">{t.id}</span>
                <span className={`rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.22em] ${t.tone}`}>
                  {t.priority}
                </span>
                <span className="rounded border border-paper/15 bg-paper/[0.04] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.22em] text-paper/65">
                  {t.status}
                </span>
                <span className="ml-auto font-mono text-[10px] text-paper/40">{t.age}</span>
              </div>
              <div className="mt-2 font-display text-lg leading-tight tracking-editorial text-paper">{t.title}</div>
              <div className="mt-1 font-mono text-xs text-paper/55">{t.customer} · {t.source}</div>
              <div className="mt-3 inline-flex items-start gap-2 rounded-lg border border-acid/30 bg-acid/[0.04] px-3 py-2 text-xs">
                <span className="text-acid">→</span>
                <span className="text-paper/80">{t.auto}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
