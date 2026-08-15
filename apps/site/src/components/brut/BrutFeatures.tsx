'use client';

import { motion } from 'framer-motion';

const tiles = [
  {
    no: '01',
    title: 'VENDEUR',
    body: 'Il comprend l\'intention. Pas juste les mots. Trois niveaux de recherche, une seule question utile.',
    metric: '3 NIVEAUX',
    invert: false,
  },
  {
    no: '02',
    title: 'CROSS-SELL',
    body: 'Six picks par produit. Quatre rôles. Chacun avec sa raison écrite. Pas de grid "vous aimerez aussi".',
    metric: '6 PICKS',
    invert: true,
  },
  {
    no: '03',
    title: 'ATTRIBUTION',
    body: 'Impression, clic, vue cible, ajout, achat. Une session. Le CA rattaché au pick qui l\'a déclenché.',
    metric: '€ MESURÉ',
    invert: false,
  },
  {
    no: '04',
    title: 'TRIAGE MAIL',
    body: 'Catégorie, urgence, sentiment. Ticket SAV auto sur les réclamations. Brouillon prêt à valider.',
    metric: 'AUTO TRIAGE',
    invert: true,
  },
  {
    no: '05',
    title: 'AVIS',
    body: 'Demande post-livraison. 4-5★ publiés. 1-2★ alertent le SAV avant Google.',
    metric: 'MODÉRÉ',
    invert: false,
  },
  {
    no: '06',
    title: 'SDK',
    body: 'Un script, une clé, un appel. Vanilla JS, framework-agnostic. 28KB gzip. sendBeacon.',
    metric: '28 KB',
    invert: true,
  },
];

export function BrutFeatures() {
  return (
    <section className="w-full bg-acid">
      <div className="grid grid-cols-1 border-t-[3px] border-ink md:grid-cols-2">
        {tiles.map((t, i) => (
          <motion.article
            key={t.no}
            initial={{ opacity: 1, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.1 }}
            transition={{ delay: i * 0.04, duration: 0.4 }}
            className={`relative border-b-[3px] border-ink p-8 transition md:p-12 ${
              t.invert ? 'bg-ink text-acid' : 'bg-acid text-ink'
            } ${i % 2 === 0 ? 'md:border-r-[3px]' : ''}`}
          >
            <div className="flex items-start justify-between">
              <div className="font-mono text-sm font-bold uppercase tracking-widest opacity-70">
                {t.no} / 06
              </div>
              <div className="rounded-none border-2 border-current px-3 py-1 text-xs font-bold uppercase tracking-widest">
                {t.metric}
              </div>
            </div>
            <h3 className="mt-6 text-5xl font-black uppercase leading-[0.95] tracking-tighter md:text-6xl">
              {t.title}
            </h3>
            <p className="mt-6 max-w-[44ch] text-base font-medium leading-snug">
              {t.body}
            </p>
          </motion.article>
        ))}
      </div>
    </section>
  );
}
