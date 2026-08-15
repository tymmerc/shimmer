'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { DemoHeader } from './DemoVendeur';

const products = [
  {
    id: 'wine',
    name: 'Châteauneuf-du-Pape 2019',
    brand: 'Domaine du Vieux Télégraphe',
    price: '38 €',
    desc: 'Sur galets roulés, grenache dominant. Puissant, épicé, garrigue.',
    picks: [
      { role: 'ACCORD', name: 'Maroilles fermier · AOP', price: '12 €', reason: 'L\'accord classique avec un Châteauneuf charpenté.' },
      { role: 'COMPLEMENT', name: 'Carafe à décanter cristal', price: '49 €', reason: 'Un vin de cette structure mérite 30 min d\'aération.' },
      { role: 'PREMIUM', name: 'Châteauneuf 2015 (millésime de garde)', price: '62 €', reason: '+24€ pour 4 ans de garde supplémentaires.' },
      { role: 'ALTERNATIVE', name: 'Vacqueyras 2020 · Domaine du Sang', price: '24 €', reason: 'Même profil rhodanien, 14€ de moins.' },
    ],
  },
  {
    id: 'lamp',
    name: 'Suspension Lin 1965',
    brand: 'L\'Atelier Lumière',
    price: '189 €',
    desc: 'Abat-jour lin écru, structure laiton brossé. Lumière cosy.',
    picks: [
      { role: 'ACCESSOIRE', name: 'Ampoule E27 2700K · dimmable', price: '12 €', reason: 'Pour le mode cosy promis sur la fiche.' },
      { role: 'COMPLEMENT', name: 'Variateur mural rotatif', price: '34 €', reason: 'Sans variateur, le 2700K reste plein éclat.' },
      { role: 'PREMIUM', name: 'Suspension Lin XL · diamètre 60', price: '249 €', reason: '+60€ pour une pièce qui devient le centre.' },
      { role: 'ALTERNATIVE', name: 'Suspension coton blanc · structure noire', price: '149 €', reason: 'Pour un blanc plus contrasté à -40€.' },
    ],
  },
];

const roleColors: Record<string, string> = {
  ACCORD: 'bg-toxic-500/15 border-toxic-500/40 text-toxic-200',
  COMPLEMENT: 'bg-acid/10 border-acid/40 text-acid',
  ACCESSOIRE: 'bg-acid/10 border-acid/40 text-acid',
  PREMIUM: 'bg-rose-500/12 border-rose-500/40 text-rose-300',
  ALTERNATIVE: 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300',
};

export function DemoCrossSell() {
  const [pid, setPid] = useState(products[0].id);
  const p = products.find(x => x.id === pid)!;

  return (
    <div>
      <DemoHeader
        eyebrow="Démo · Ventes additionnelles"
        title="Quatre picks par produit,"
        accent="chacun avec sa raison"
        intro="Le vendeur ne renvoie pas un grid de cards anonymes. Pour chaque produit, il propose 4 suggestions typées (accord, complément, premium, alternative), avec la raison écrite."
      />

      <div className="mt-8 flex flex-wrap gap-2">
        {products.map(prod => (
          <button
            key={prod.id}
            onClick={() => setPid(prod.id)}
            className={`rounded-full border px-4 py-2 font-mono text-[11px] uppercase tracking-[0.18em] transition ${
              pid === prod.id ? 'border-acid bg-acid/10 text-paper' : 'border-paper/15 bg-paper/[0.02] text-paper/65 hover:border-paper/30'
            }`}
          >
            {prod.brand}
          </button>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-[1fr_1.4fr]">
        {/* Product card */}
        <div className="rounded-2xl border border-paper/10 bg-paper/[0.03] p-6 backdrop-blur-sm">
          <div className="aspect-[4/3] w-full rounded-xl bg-gradient-to-br from-toxic-700 via-toxic-500 to-toxic-300" />
          <div className="mt-5 font-mono text-[10px] uppercase tracking-[0.22em] text-acid">{p.brand}</div>
          <h3 className="mt-2 font-display text-2xl leading-tight tracking-editorial text-paper md:text-3xl">
            {p.name}
          </h3>
          <p className="mt-3 text-sm leading-relaxed text-paper/65">{p.desc}</p>
          <div className="mt-5 flex items-baseline gap-3">
            <span className="font-display text-3xl text-paper">{p.price}</span>
            <span className="font-mono text-xs text-acid">en stock</span>
          </div>
          <button className="mt-6 w-full rounded-full bg-acid py-3 font-mono text-[11px] uppercase tracking-[0.18em] text-ink transition hover:bg-acid-deep">
            Ajouter au panier
          </button>
        </div>

        {/* Picks */}
        <div className="rounded-2xl border border-paper/10 bg-paper/[0.03] p-6 backdrop-blur-sm">
          <div className="mb-5 flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.22em] text-paper/50">
            <span>Le vendeur suggère</span>
            <span className="rounded-full bg-acid px-2 py-0.5 text-[10px] text-ink">4 picks</span>
          </div>
          <div className="space-y-3">
            {p.picks.map((pk, i) => (
              <motion.div
                key={pk.name}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08, duration: 0.4 }}
                className="group rounded-xl border border-paper/10 bg-paper/[0.02] p-4 transition hover:border-acid/30 hover:bg-paper/[0.05]"
              >
                <div className="flex items-start gap-4">
                  <div className="h-14 w-14 shrink-0 rounded-lg bg-gradient-to-br from-toxic-500 to-toxic-700" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.22em] ${roleColors[pk.role]}`}>
                        {pk.role}
                      </span>
                      <span className="font-mono text-xs text-paper/55">{pk.price}</span>
                    </div>
                    <div className="mt-1 font-display text-base leading-tight tracking-editorial text-paper">{pk.name}</div>
                    <div className="mt-1.5 text-sm italic leading-relaxed text-paper/65">"{pk.reason}"</div>
                  </div>
                  <button className="self-center rounded-full border border-paper/20 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-paper transition hover:border-acid hover:bg-acid/10">
                    + Ajouter
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
