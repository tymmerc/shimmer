'use client';

import { motion } from 'framer-motion';
import { AUDIT_MAILTO } from '@/lib/audit';

/** CTA final — l'audit gratuit, centré, une seule action. */
export function V3CTA() {
  return (
    <section id="audit" className="relative z-10 w-full scroll-mt-16 px-6 py-24 md:py-32">
      <div className="mx-auto max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, ease: [0.25, 0.4, 0.25, 1] }}
          className="rounded-3xl border border-acid/25 bg-acid/[0.04] px-6 py-12 text-center md:px-14 md:py-16"
        >
          <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-acid/30 bg-acid/10 px-4 py-1.5 text-[13px] font-medium text-acid">
            La première étape est offerte
          </div>
          <h2 className="text-balance font-sans text-3xl font-semibold tracking-tight text-paper md:text-5xl">
            Voyez ce qui fuit dans votre boutique.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-pretty text-base leading-relaxed text-paper/65 md:text-lg">
            On analyse votre boutique et on vous montre, chiffré, où part le chiffre
            d&apos;affaires. 30 minutes de restitution, sans engagement.
          </p>
          <div className="mt-8 flex flex-col items-center gap-4">
            <a
              href={AUDIT_MAILTO}
              className="btn btn-acid group inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full bg-acid px-8 py-4 font-sans text-[15px] font-medium text-ink"
            >
              Obtenir mon audit gratuit
              <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
            </a>
            <div className="flex flex-wrap justify-center gap-x-5 gap-y-1 text-[13px] text-paper/50">
              <span>Gratuit</span>
              <span>·</span>
              <span>Sans engagement</span>
              <span>·</span>
              <span>Réponse sous 24 h</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
