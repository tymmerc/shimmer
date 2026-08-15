'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';

const layers = [
  {
    label: 'BOUTIQUE',
    title: 'SDK navigateur',
    detail: '<30kb gzip · IntersectionObserver · sendBeacon · Vanilla JS, framework-agnostic',
    code: 'Shimmer.crossSell.renderInto(\'#xsell\', { productId })',
  },
  {
    label: 'API',
    title: 'Express + TypeScript strict',
    detail: 'Multi-tenant par Bearer key · validation Zod · rate-limit par store · OpenAPI 3.0.3',
    code: 'POST /api/cross-sell/precompute',
  },
  {
    label: 'INTELLIGENCE',
    title: 'Claude / Ollama / Embeddings',
    detail: 'Claude API en prod, fallback Ollama qwen2.5, embeddings multilingual-e5 ONNX',
    code: 'callLLM(prompt, { model: \'claude-sonnet-4\' })',
  },
  {
    label: 'DATA',
    title: 'Postgres + Redis + BullMQ',
    detail: 'Prisma 6.4 · 20 tables multi-tenant · jobs précompute + reindex toutes les heures',
    code: 'await prisma.productCrossSell.findMany({ where: { storeId } })',
  },
];

export function SectionStack() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const lineProgress = useTransform(scrollYProgress, [0.1, 0.9], [0, 1]);

  return (
    <section
      id="stack"
      ref={ref}
      className="relative w-full bg-paper-warm py-32 md:py-48"
    >
      <div className="mx-auto max-w-[1440px] px-6 md:px-12">
        <div className="mb-16 flex items-baseline gap-6">
          <span className="font-mono text-[11px] uppercase tracking-[0.24em] text-toxic-600">
            05 — Stack
          </span>
          <span className="h-px flex-1 bg-ink/15" />
        </div>

        <h2 className="mb-20 max-w-[18ch] font-display text-balance text-[clamp(40px,6vw,88px)] font-normal leading-[0.95] tracking-editorial">
          Quatre couches.{' '}
          <span className="italic text-toxic-600">Une seule</span> intention.
        </h2>

        <div className="relative grid grid-cols-12 gap-x-6">
          <div className="hidden lg:block lg:col-span-1">
            <div className="sticky top-32 ml-4 h-[60vh] w-px bg-ink/10">
              <motion.div
                style={{ scaleY: lineProgress }}
                className="absolute left-0 right-0 top-0 origin-top bg-gradient-to-b from-toxic-600 to-toxic-300"
              />
            </div>
          </div>

          <div className="col-span-12 lg:col-span-11 space-y-20">
            {layers.map((l, i) => (
              <motion.div
                key={l.title}
                initial={{ opacity: 1, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-100px' }}
                transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                className="grid grid-cols-1 gap-8 md:grid-cols-[1fr_1.2fr]"
              >
                <div>
                  <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-toxic-600">{l.label}</div>
                  <h3 className="mt-3 font-display text-3xl leading-tight tracking-editorial md:text-4xl">{l.title}</h3>
                  <p className="mt-4 max-w-[40ch] text-base leading-relaxed text-ink-soft">{l.detail}</p>
                </div>
                <div className="rounded-2xl border border-ink/10 bg-ink p-6 text-paper">
                  <div className="mb-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-paper/45">
                    <span className="h-2 w-2 rounded-full bg-acid" />
                    sample
                  </div>
                  <code className="block font-mono text-sm text-paper/90">{l.code}</code>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
