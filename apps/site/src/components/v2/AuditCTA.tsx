'use client';

import { motion } from 'framer-motion';
import { AUDIT_MAILTO } from '@/lib/audit';

const LEAKS = [
  ['01', 'Les recherches qui ne trouvent rien.'],
  ['02', 'Les paniers qui partent sans relance.'],
  ['03', 'Les avis jamais demandés.'],
];

/** Le moment CTA : l'audit gratuit, l'accroche commerciale n°1. */
export function AuditCTA() {
  return (
    <section id="audit" className="relative z-10 w-full scroll-mt-16 px-6 py-28 md:px-12 md:py-40">
      <div className="mx-auto max-w-[1400px]">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="overflow-hidden rounded-3xl border border-acid/30 bg-acid/[0.04] p-8 md:p-14"
        >
          <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-acid">
            La première étape · offerte
          </div>
          <h2 className="mt-6 max-w-[20ch] font-display text-[clamp(34px,5.5vw,84px)] font-normal leading-[0.95] tracking-tightest text-paper">
            Un audit gratuit qui montre <span className="italic text-acid">ce qui fuit</span>.
          </h2>
          <p className="mt-8 max-w-[54ch] text-pretty text-lg leading-relaxed text-paper/75 md:text-xl">
            On analyse votre boutique et on vous montre, chiffré, où part le chiffre d&apos;affaires.
            Sans engagement, 30 minutes de restitution.
          </p>

          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {LEAKS.map(([n, txt]) => (
              <div key={n} className="flex gap-4 border-t border-paper/15 pt-5">
                <span className="font-mono text-sm text-acid">{n}</span>
                <span className="text-pretty text-lg leading-snug text-paper md:text-xl">{txt}</span>
              </div>
            ))}
          </div>

          <div className="mt-12 flex flex-wrap items-center gap-6">
            <a
              href={AUDIT_MAILTO}
              className="btn btn-acid group inline-flex items-center gap-2 rounded-full bg-acid px-8 py-4 font-sans text-sm uppercase tracking-[0.18em] text-ink"
            >
              Obtenir mon audit gratuit
              <span className="transition-transform duration-300 group-hover:translate-x-1.5">→</span>
            </a>
            <div className="flex flex-wrap gap-x-6 gap-y-2 font-mono text-[11px] uppercase tracking-[0.16em] text-paper/50">
              <span>Gratuit</span>
              <span>Sans engagement</span>
              <span>Réponse sous 24 h</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
