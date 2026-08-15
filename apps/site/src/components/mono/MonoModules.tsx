'use client';

import { motion } from 'framer-motion';

const modules = [
  {
    id: '00',
    name: 'sales-agent',
    title: 'Conversational sales agent',
    desc: 'Three-tier search (exact, qualifying, similarity). One useful question, never two. Justified recommendation in 5 seconds.',
    api: 'POST /api/search/assist',
    badges: ['llm', 'embeddings', 'fsm'],
  },
  {
    id: '01',
    name: 'cross-sell',
    title: 'Narrative cross-sell',
    desc: 'Precomputed picks with role (complement, alt, premium, accessory) and a written reason. Algo + optional LLM rewrite, never LLM-only.',
    api: 'GET /api/cross-sell/:productId',
    badges: ['precompute', 'rules', 'overrides'],
  },
  {
    id: '02',
    name: 'attribution',
    title: 'Revenue attribution',
    desc: 'Impression, click, target view, cart add, purchase. Session-scoped intents (30 min TTL), revenue tied back to the originating pick.',
    api: 'POST /api/cross-sell/events',
    badges: ['session', 'no-cookies-3p', 'funnel'],
  },
  {
    id: '03',
    name: 'mail-triage',
    title: 'Email triage',
    desc: 'Category, urgency, sentiment. Auto-creates SAV tickets on complaints. Draft reply staged, never sent without human approval.',
    api: 'POST /api/mail/classify',
    badges: ['classify', 'draft', 'ticket'],
  },
  {
    id: '04',
    name: 'reviews',
    title: 'Review collection',
    desc: 'Post-delivery request, auto-publish 4 and 5 stars, moderate 3s, alert SAV on 1 and 2 before they reach Google.',
    api: 'POST /api/reviews/submit',
    badges: ['publish', 'moderate', 'alert'],
  },
];

export function MonoModules() {
  return (
    <section id="modules" className="relative w-full border-t border-white/5 bg-[#0a0a0a] py-24 md:py-32">
      <div className="mx-auto max-w-[1280px] px-6 md:px-12">
        <div className="mb-12 flex items-baseline justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-[0.22em] text-zinc-500"># modules</div>
            <h2 className="mt-3 text-3xl tracking-tight text-zinc-100 md:text-4xl">
              Five surfaces, one Bearer key.
            </h2>
          </div>
          <a href="/shimmer/docs.html" className="hidden text-[11px] uppercase tracking-[0.18em] text-zinc-400 transition hover:text-zinc-100 md:inline-flex">
            Full reference →
          </a>
        </div>

        <div className="overflow-hidden rounded-lg border border-white/10">
          <div className="hidden grid-cols-[60px_180px_1fr_240px] gap-4 border-b border-white/10 bg-white/[0.02] px-5 py-3 text-[10px] uppercase tracking-[0.22em] text-zinc-500 md:grid">
            <div>id</div>
            <div>module</div>
            <div>summary</div>
            <div>endpoint</div>
          </div>
          {modules.map((m, i) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 1, x: -8 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ delay: i * 0.05, duration: 0.4 }}
              className="flex flex-col items-start gap-3 border-b border-white/5 px-5 py-6 transition last:border-b-0 hover:bg-white/[0.02] md:grid md:grid-cols-[60px_180px_1fr_240px] md:gap-4"
            >
              <div className="flex w-full items-center justify-between md:block">
                <span className="text-xs text-zinc-500">{m.id}</span>
                <code className="rounded bg-white/5 px-2 py-1 text-[10px] text-zinc-300 md:hidden">{m.api}</code>
              </div>
              <div>
                <div className="text-sm text-toxic-300">{m.name}</div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {m.badges.map(b => (
                    <span key={b} className="rounded border border-white/10 px-1.5 py-0.5 text-[9px] text-zinc-400">
                      {b}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-sm text-zinc-100">{m.title}</div>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">{m.desc}</p>
              </div>
              <div className="hidden text-xs text-zinc-300 md:block">
                <code className="rounded bg-white/5 px-2 py-1">{m.api}</code>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
