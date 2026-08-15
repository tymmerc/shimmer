'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';

const messages = [
  { type: 'user', text: 'un truc pour les poils de mon chat, qui aspire bien' },
  { type: 'agent', text: 'Plutôt poils courts ou longs ? Et chez vous, c\'est plutôt parquet, moquette ou carrelage ?' },
  { type: 'user', text: 'poils longs, parquet, et j\'aimerais pas que ça réveille les voisins' },
  { type: 'agent', text: 'L\'aspirateur Silenz Pro 249€ coche tout : brosse anti-poils, mode parquet, 58 dB. Note 4,7★ avec 1820 avis.' },
];

const types = [
  { code: '01', label: 'EXACT', text: 'Référence connue.', hint: 'aspi 249 → Silenz Pro' },
  { code: '02', label: 'QUALIFICATION', text: 'Besoin à cerner.', hint: 'pose 1 ou 2 questions utiles' },
  { code: '03', label: 'SIMILARITÉ', text: 'Intention floue.', hint: 'embeddings + reranking sémantique' },
];

export function SectionVendeur() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });

  const labelX = useTransform(scrollYProgress, [0, 1], ['-2%', '2%']);

  return (
    <section
      id="vendeur"
      ref={ref}
      className="relative w-full bg-paper py-32 md:py-48"
    >
      <div className="mx-auto max-w-[1440px] px-6 md:px-12">
        <motion.div style={{ x: labelX }} className="mb-16 flex items-baseline gap-6">
          <span className="font-mono text-[11px] uppercase tracking-[0.24em] text-toxic-600">
            01 — Vendeur conversationnel
          </span>
          <span className="h-px flex-1 bg-ink/15" />
        </motion.div>

        <div className="grid grid-cols-12 gap-x-6 gap-y-16">
          <div className="col-span-12 lg:col-span-5">
            <h2 className="font-display text-balance text-[clamp(40px,6vw,88px)] font-normal leading-[0.95] tracking-editorial text-ink">
              Il comprend{' '}
              <span className="italic text-toxic-600">l'intention</span>,
              <br />
              pas juste les{' '}
              <span className="italic">mots</span>.
            </h2>
            <p className="mt-8 max-w-[48ch] text-pretty text-lg leading-relaxed text-ink-soft">
              Trois types de recherche sous le capot. Le client ne voit qu'une chose :{' '}
              <span className="text-ink">un vendeur qui pose la bonne question</span>{' '}
              et propose ce qu'il faut, justifié.
            </p>

            <div className="mt-12 space-y-6">
              {types.map((t, i) => (
                <motion.div
                  key={t.code}
                  initial={{ opacity: 1, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: '-100px' }}
                  transition={{ delay: i * 0.12, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  className="grid grid-cols-[auto_1fr] gap-x-6 border-l border-ink/15 pl-6"
                >
                  <span className="font-mono text-xs tracking-[0.18em] text-ink-mute">{t.code}</span>
                  <div>
                    <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-toxic-600">{t.label}</div>
                    <div className="mt-1 font-display text-2xl tracking-editorial">{t.text}</div>
                    <div className="mt-1 text-sm text-ink-mute">{t.hint}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="col-span-12 lg:col-span-7">
            <ChatMockup />
          </div>
        </div>
      </div>
    </section>
  );
}

function ChatMockup() {
  return (
    <div className="relative">
      <div className="absolute -inset-4 rounded-[28px] bg-toxic-500/[0.04] blur-2xl" />
      <div className="relative overflow-hidden rounded-[24px] border border-ink/10 bg-paper-warm shadow-[0_30px_60px_-30px_rgba(13,11,20,0.25)]">
        <div className="flex items-center justify-between border-b border-ink/10 bg-paper px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="h-2 w-2 rounded-full bg-toxic-500 shadow-[0_0_10px_rgba(106,43,245,0.85)]" />
            <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-mute">Vendeur · session #482</span>
          </div>
          <span className="font-mono text-[10px] text-ink-mute">live</span>
        </div>

        <div className="space-y-3 px-6 py-8 md:px-8">
          {messages.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 1, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ delay: i * 0.25, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className={m.type === 'user' ? 'flex justify-end' : 'flex justify-start'}
            >
              <div
                className={
                  m.type === 'user'
                    ? 'max-w-[80%] rounded-2xl rounded-tr-sm bg-ink px-5 py-3 text-paper'
                    : 'max-w-[80%] rounded-2xl rounded-tl-sm border border-ink/10 bg-paper px-5 py-3 text-ink'
                }
              >
                <span className="text-[15px] leading-relaxed">{m.text}</span>
              </div>
            </motion.div>
          ))}

          <motion.div
            initial={{ opacity: 1 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="mt-6 rounded-2xl border border-toxic-500/20 bg-toxic-500/[0.04] p-4"
          >
            <div className="flex items-start gap-4">
              <div className="h-14 w-14 shrink-0 rounded-xl bg-gradient-to-br from-toxic-300 to-toxic-600" />
              <div className="flex-1">
                <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-toxic-700">Recommandé</div>
                <div className="mt-0.5 font-display text-lg leading-tight">Silenz Pro · aspi anti-poils</div>
                <div className="mt-1 text-sm text-ink-soft">249€ · stock OK · 4,7★ (1820 avis)</div>
              </div>
              <a className="self-center rounded-full bg-ink px-4 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-paper">
                Voir
              </a>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
