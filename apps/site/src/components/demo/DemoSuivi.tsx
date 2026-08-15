'use client';

import { motion } from 'framer-motion';
import { DemoHeader } from './DemoVendeur';

const events = [
  { time: 'J+0 · 14:32', label: 'Commande passée', body: 'Confirmation envoyée. Merci de votre achat.', channel: 'EMAIL', done: true },
  { time: 'J+1 · 09:18', label: 'Préparée', body: 'Votre commande est emballée et part au transporteur.', channel: 'EMAIL', done: true },
  { time: 'J+1 · 17:42', label: 'Expédiée', body: 'En route. Suivi : LP824… arrivée prévue J+3.', channel: 'SMS', done: true },
  { time: 'J+2 · 11:05', label: 'En transit', body: 'Passée au centre de tri Paris-Sud.', channel: 'SMS', done: true },
  { time: 'J+3 · 10:14', label: 'Livrée', body: 'Bonne réception ? On vous écrit dans 48h pour votre avis.', channel: 'SMS', done: true, current: true },
  { time: 'J+5 · 10:00', label: 'Demande d\'avis', body: 'Comment s\'est passée l\'utilisation ? Une étoile, deux mots, c\'est tout.', channel: 'EMAIL', done: false },
];

export function DemoSuivi() {
  return (
    <div>
      <DemoHeader
        eyebrow="Démo · Suivi de commande"
        title="Le client informé,"
        accent="le SAV soulagé"
        intro="Chaque étape de la commande déclenche un message automatique. Le client sait toujours où il en est sans avoir à relancer."
      />

      <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-[1.4fr_1fr]">
        {/* Timeline */}
        <div className="rounded-2xl border border-paper/10 bg-paper/[0.03] p-6 backdrop-blur-sm md:p-8">
          <div className="mb-6 flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.22em] text-paper/55">
            <span>Commande #C-4821 · Marie Renaud</span>
            <span className="rounded-full bg-acid px-2 py-0.5 text-[10px] text-ink">en cours</span>
          </div>

          <div className="relative space-y-6 pl-8">
            <div className="absolute bottom-2 left-3 top-2 w-px bg-paper/15" />
            {events.map((e, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08, duration: 0.4 }}
                className="relative"
              >
                <span
                  className={`absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 ${
                    e.current
                      ? 'border-acid bg-acid shadow-[0_0_12px_rgba(212,255,58,0.6)]'
                      : e.done
                        ? 'border-paper/50 bg-paper/30'
                        : 'border-paper/20 bg-ink'
                  }`}
                />
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-paper/45">{e.time}</span>
                  <span className="rounded border border-paper/15 bg-paper/[0.04] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.22em] text-paper/65">
                    {e.channel}
                  </span>
                </div>
                <div className={`mt-1 font-display text-lg tracking-editorial ${e.done ? 'text-paper' : 'text-paper/50'}`}>
                  {e.label}
                </div>
                <div className={`mt-1 text-sm leading-relaxed ${e.done ? 'text-paper/70' : 'text-paper/40'}`}>
                  "{e.body}"
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Side info */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-paper/10 bg-paper/[0.03] p-5">
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-paper/50">
              Sur 100 commandes
            </div>
            <div className="mt-4 space-y-3">
              <StatRow label="SMS et emails envoyés" value="500+" />
              <StatRow label={'Demandes "où est ma commande ?"'} value="−84 %" tone="acid" />
              <StatRow label="Avis collectés post-livraison" value="42 %" tone="acid" />
            </div>
          </div>

          <div className="rounded-2xl border border-acid/25 bg-acid/5 p-5">
            <div className="font-display text-base tracking-editorial text-paper">
              Branché sur votre transporteur.
            </div>
            <p className="mt-2 text-xs leading-relaxed text-paper/70">
              Colissimo, Chronopost, Mondial Relay, DPD, UPS. On lit le statut, on traduit en message
              clair pour votre client.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatRow({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-t border-paper/10 pt-3 first:border-0 first:pt-0">
      <span className="text-sm text-paper/70">{label}</span>
      <span className={`font-display text-xl ${tone === 'acid' ? 'text-acid' : 'text-paper'}`}>{value}</span>
    </div>
  );
}
