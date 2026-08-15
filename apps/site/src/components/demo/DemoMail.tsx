'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DemoHeader } from './DemoVendeur';

const mails = [
  {
    from: 'Léa Mercier',
    subject: 'Commande pas reçue depuis 8 jours',
    preview: 'Bonjour, j\'ai commandé le 4 mai et je n\'ai toujours rien reçu...',
    category: 'SAV',
    urgency: 'URGENT',
    sentiment: 'négatif',
    draft: 'Bonjour Léa, désolé du retard. Votre commande est en cours de relivraison après un retour transporteur. Je vous envoie un code -15% pour la prochaine. Estimation : 48h. Tym',
    action: 'Ticket SAV créé · priorité haute',
    tint: 'border-rose-500/40 bg-rose-500/10 text-rose-300',
  },
  {
    from: 'Karim Belkacem',
    subject: 'Mode d\'emploi pour le Silenz Pro ?',
    preview: 'Je viens de recevoir l\'aspi mais je trouve pas le manuel...',
    category: 'QUESTION',
    urgency: 'normal',
    sentiment: 'neutre',
    draft: 'Bonjour Karim, le manuel est en PDF sur la page produit, onglet "Documents". Sinon, vidéo de prise en main : [lien]. Bonne utilisation.',
    action: 'Réponse auto suggérée',
    tint: 'border-acid/40 bg-acid/10 text-acid',
  },
  {
    from: 'Anna Tournier',
    subject: 'Top, je recommande !',
    preview: 'Juste pour vous dire que j\'adore le produit. Service au top...',
    category: 'AVIS',
    urgency: 'low',
    sentiment: 'positif',
    draft: 'Merci Anna ! Si vous avez 30 secondes, votre avis Google nous aide beaucoup : [lien]. Bonne soirée.',
    action: 'Demande d\'avis Google déclenchée',
    tint: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
  },
  {
    from: 'Jean Pradel',
    subject: 'Souci avec le filtre HEPA',
    preview: 'Le filtre que j\'ai reçu ne rentre pas dans mon aspi 240...',
    category: 'SAV',
    urgency: 'normal',
    sentiment: 'mitigé',
    draft: 'Bonjour Jean, il y a deux modèles de filtre selon le n° de série. Pouvez-vous m\'envoyer une photo du n° gravé sous l\'aspi ? Je vous renvoie le bon, à mes frais.',
    action: 'Ticket SAV créé',
    tint: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
  },
];

export function DemoMail() {
  const [selected, setSelected] = useState(0);
  const m = mails[selected];

  return (
    <div>
      <DemoHeader
        eyebrow="Démo · Triage mail"
        title="Chaque mail trié,"
        accent="brouillon prêt"
        intro="Réclamation, question, avis spontané : chaque mail entrant est classé. Un brouillon de réponse est rédigé, mais c'est vous qui validez avant l'envoi."
      />

      <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-[1fr_1.2fr]">
        {/* Inbox */}
        <div className="rounded-2xl border border-paper/10 bg-paper/[0.03] backdrop-blur-sm">
          <div className="flex items-center justify-between border-b border-paper/10 bg-paper/[0.04] px-5 py-3 font-mono text-[10px] uppercase tracking-[0.22em] text-paper/55">
            <span>Boîte de réception · 4 mails</span>
            <span className="rounded-full bg-acid px-2 py-0.5 text-[10px] text-ink">tri auto</span>
          </div>
          <div className="divide-y divide-paper/5">
            {mails.map((mail, i) => (
              <button
                key={mail.subject}
                onClick={() => setSelected(i)}
                className={`block w-full px-5 py-4 text-left transition ${selected === i ? 'bg-paper/[0.06]' : 'hover:bg-paper/[0.03]'}`}
              >
                <div className="flex items-center gap-2">
                  <span className={`rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.22em] ${mail.tint}`}>
                    {mail.category}
                  </span>
                  {mail.urgency === 'URGENT' && (
                    <span className="rounded border border-rose-500/40 bg-rose-500/15 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.22em] text-rose-300">
                      URGENT
                    </span>
                  )}
                  <span className="ml-auto font-mono text-[10px] text-paper/40">il y a 5 min</span>
                </div>
                <div className="mt-2 font-mono text-xs text-paper/70">{mail.from}</div>
                <div className="mt-1 truncate text-sm text-paper">{mail.subject}</div>
                <div className="mt-1 truncate text-xs text-paper/55">{mail.preview}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Detail */}
        <AnimatePresence mode="wait">
          <motion.div
            key={selected}
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.3 }}
            className="rounded-2xl border border-paper/10 bg-paper/[0.03] p-6 backdrop-blur-sm md:p-8"
          >
            <div className="flex items-baseline justify-between">
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-paper/55">mail · classé auto</span>
              <span className={`rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.22em] ${m.tint}`}>
                {m.category} · {m.sentiment}
              </span>
            </div>

            <h3 className="mt-4 font-display text-2xl tracking-editorial text-paper">{m.subject}</h3>
            <div className="mt-1 font-mono text-xs text-paper/60">De · {m.from}</div>
            <p className="mt-4 text-sm leading-relaxed text-paper/75">{m.preview}</p>

            <div className="mt-6 rounded-xl border border-acid/30 bg-acid/[0.04] p-4">
              <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-acid">
                <span className="h-1.5 w-1.5 rounded-full bg-acid" />
                Brouillon prêt · à valider avant envoi
              </div>
              <p className="mt-3 text-sm leading-relaxed text-paper italic">"{m.draft}"</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button className="rounded-full bg-acid px-4 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-ink transition hover:bg-acid-deep">
                  Envoyer
                </button>
                <button className="rounded-full border border-paper/20 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-paper transition hover:bg-paper/10">
                  Modifier
                </button>
                <button className="rounded-full border border-paper/10 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-paper/55 transition hover:text-paper">
                  Reporter à plus tard
                </button>
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-paper/10 bg-paper/[0.02] p-4">
              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-paper/50">Action auto</div>
              <div className="mt-2 text-sm text-paper/85">→ {m.action}</div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
