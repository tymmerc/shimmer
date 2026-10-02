'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { AUDIT_EMAIL, AUDIT_MAILTO } from '@/lib/audit';
import { AuditForm, useLeadFormAvailable } from './AuditForm';
import { CopyEmail } from './CopyEmail';

/** Le moment CTA : l'audit gratuit, l'accroche commerciale n°1. */
export function AuditCTA() {
  // Formulaire seulement si l'API a la route (ping) ; sinon, et en attendant,
  // l'adresse en grand comme avant.
  const formReady = useLeadFormAvailable();
  const reduceMotion = useReducedMotion();
  return (
    <section id="audit" className="relative z-10 w-full scroll-mt-16 px-6 py-16 md:px-12 md:py-40">
      <div className="mx-auto max-w-[1400px]">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="overflow-hidden rounded-3xl border border-acid/30 bg-acid/[0.04] p-6 sm:p-8 md:p-14"
        >
          <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-acid">
            La première étape · offerte
          </div>
          <h2 className="mt-5 max-w-[20ch] font-display text-[clamp(30px,5.5vw,84px)] font-normal leading-[1.02] tracking-tightest text-paper md:mt-6">
            Un audit gratuit qui montre <span className="italic text-acid">ce qui fuit</span>.
          </h2>

          <div className="mt-8 border-t border-paper/15 pt-7 md:mt-12 md:pt-9">
            {formReady ? (
              <motion.div
                initial={reduceMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              >
                <AuditForm />
                <WriteInstead />
              </motion.div>
            ) : (
              <EmailBlock />
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/**
 * L'adresse en clair, cliquable ET copiable : sur un ordinateur sans logiciel
 * de messagerie, un mailto seul n'ouvre rien (01/10). Affichée seule tant que
 * le formulaire n'est pas disponible.
 */
function EmailBlock() {
  return (
    <>
      <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-paper/50">
        Écrivez-moi, réponse sous 24 h
      </div>
      <div className="mt-4 flex flex-col items-start gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:gap-6">
        <a
          href={AUDIT_MAILTO}
          className="break-words font-display text-[clamp(26px,4.4vw,60px)] leading-[1.05] tracking-tightest text-paper underline decoration-acid/50 decoration-1 underline-offset-[0.22em] transition-colors hover:decoration-acid"
        >
          {AUDIT_EMAIL}
        </a>
        <CopyEmail />
      </div>
      <p className="mt-5 max-w-[56ch] text-pretty text-[15px] leading-relaxed text-paper/60 md:text-base">
        Donnez l&apos;adresse de votre boutique et sa plateforme (Shopify, WooCommerce…).
        Gratuit, sans engagement, 30 minutes de restitution.
      </p>
    </>
  );
}

/** Sous le formulaire : l'e-mail direct, en plus discret. */
function WriteInstead() {
  return (
    <div className="mt-10 flex flex-wrap items-center gap-x-4 gap-y-3 border-t border-paper/10 pt-6 md:mt-12">
      <span className="text-[15px] text-paper/60">Vous préférez écrire ?</span>
      <a
        href={AUDIT_MAILTO}
        className="break-all font-display text-[19px] leading-tight text-paper underline decoration-acid/50 decoration-1 underline-offset-[0.2em] transition-colors hover:decoration-acid md:text-[22px]"
      >
        {AUDIT_EMAIL}
      </a>
      <CopyEmail />
    </div>
  );
}
