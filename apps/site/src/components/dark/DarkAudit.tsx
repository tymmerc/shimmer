'use client';

// Bandeau audit gratuit : le moment dédié à l'accroche commerciale n°1.
// Placé juste après la preuve (holdout) : on vient de montrer qu'on mesure,
// ici on propose de chiffrer CE QUE la boutique du visiteur laisse filer.
// Volontairement compact : une carte, pas une scène de plus.

import { motion } from 'framer-motion';
import { AUDIT_MAILTO } from '@/lib/audit';

const leaks = [
  {
    num: '01',
    title: 'Les recherches qui ne trouvent rien',
    detail:
      // Espaces insécables : « 0 résultat » ne doit jamais se couper en fin de ligne.
      'Des visiteurs prêts à acheter tapent leur besoin, la boutique répond « 0 résultat », ils repartent.',
  },
  {
    num: '02',
    title: 'Les paniers qui partent sans relance',
    detail:
      'Du chiffre déjà dans le panier, jamais réclamé. Personne ne recontacte ces clients.',
  },
  {
    num: '03',
    title: 'Les avis jamais demandés',
    detail:
      'Des clients contents qui ne le disent nulle part. La preuve sociale manque à vos fiches.',
  },
];

const badges = ['Gratuit', 'Sans engagement', '30 min de restitution'];

export function DarkAudit() {
  return (
    <section
      id="audit"
      className="relative w-full scroll-mt-16 border-t border-paper/10 bg-ink py-24 md:py-36"
    >
      <div className="pointer-events-none absolute -left-40 top-1/3 h-[420px] w-[420px] rounded-full bg-toxic-600/15 blur-[120px]" />

      <div className="relative z-10 mx-auto max-w-[1480px] px-6 md:px-12">
        <motion.div
          initial={{ opacity: 1, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="relative overflow-hidden rounded-3xl border border-acid/25 bg-paper/[0.03] p-8 backdrop-blur-sm md:p-14"
        >
          <div className="pointer-events-none absolute -right-24 -top-24 h-[320px] w-[320px] rounded-full bg-acid/10 blur-[100px]" />

          {/* gap-x seulement à partir de lg : sur mobile la grille est une
              colonne, et 11 gouttières de 40px forceraient 440px de large. */}
          <div className="relative grid grid-cols-12 gap-y-12 lg:gap-x-10">
            <div className="col-span-12 lg:col-span-5">
              <span className="font-mono text-[11px] uppercase tracking-[0.24em] text-acid">
                La première étape · offerte
              </span>
              <h2 className="mt-5 max-w-[16ch] font-display text-balance text-[clamp(36px,4.8vw,72px)] font-normal leading-[0.95] tracking-tightest text-paper">
                Un audit gratuit qui montre{' '}
                <span className="italic text-acid">ce qui fuit</span>.
              </h2>
              <p className="copy mt-6 max-w-[46ch] text-pretty text-lg leading-relaxed text-paper/70 md:text-xl">
                On analyse votre boutique et on revient avec du chiffré : ce que vous laissez
                filer chaque mois, et ce que ça représente en euros. Vous repartez avec les
                chiffres, que vous branchiez Shimmer ou non.
              </p>

              <div className="mt-8 flex flex-wrap gap-2">
                {badges.map((b) => (
                  <span
                    key={b}
                    className="rounded-full border border-paper/15 bg-paper/[0.04] px-4 py-2 font-mono text-[11px] uppercase tracking-[0.2em] text-paper/75"
                  >
                    {b}
                  </span>
                ))}
              </div>

              <div className="mt-10 flex flex-wrap items-center gap-5">
                <a
                  href={AUDIT_MAILTO}
                  className="btn btn-acid group inline-flex items-center gap-2 rounded-full bg-acid px-7 py-4 font-sans text-sm uppercase tracking-[0.18em] text-ink"
                >
                  Obtenir mon audit gratuit
                  <span className="transition-transform duration-300 group-hover:translate-x-1.5">→</span>
                </a>
                <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-paper/45">
                  Réponse sous 24 h
                </span>
              </div>
            </div>

            <div className="col-span-12 lg:col-span-7">
              <div className="mb-6 flex items-baseline gap-6">
                <span className="font-mono text-[11px] uppercase tracking-[0.24em] text-paper/50">
                  Ce qu'on chiffre chez vous
                </span>
                <span className="h-px flex-1 bg-paper/10" />
              </div>
              <div className="space-y-0">
                {leaks.map((l) => (
                  <div
                    key={l.num}
                    className="grid grid-cols-12 gap-y-2 border-t border-paper/10 py-6 first:border-t-0 md:gap-x-4 md:py-7"
                  >
                    <div className="col-span-12 font-mono text-[11px] uppercase tracking-[0.24em] text-acid md:col-span-1 md:pt-2">
                      {l.num}
                    </div>
                    <div className="col-span-12 md:col-span-11">
                      <h3 className="font-display text-2xl leading-tight tracking-editorial text-paper md:text-3xl">
                        {l.title}
                      </h3>
                      <p className="mt-2 max-w-[52ch] text-base leading-relaxed text-paper/60 md:text-lg">
                        {l.detail}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
