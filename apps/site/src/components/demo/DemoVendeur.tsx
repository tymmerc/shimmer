'use client';

// Démo vendeur. Réponses 100% pré-rédigées sur les 5 suggestions (les produits
// existent vraiment dans le catalogue Caves Forty-Two, store_id=4). Pas
// d'appel LLM en ligne pour les testeurs : le modèle local sature et le
// modèle distant coûte à chaque clic. Si le visiteur tape autre chose, on
// l'invite poliment à choisir une suggestion.

import { useEffect, useRef, useState } from 'react';

/** En-tête partagé entre toutes les démos (réutilisé par les autres modules
 *  qui n'ont pas encore été refondus). On l'expose depuis ici pour ne pas
 *  casser leurs imports existants. */
export function DemoHeader({
  eyebrow,
  title,
  accent,
  intro,
}: {
  eyebrow: string;
  title: string;
  accent?: string;
  intro?: string;
}) {
  return (
    <header className="mb-6">
      <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-acid">{eyebrow}</div>
      <h2 className="mt-3 font-display text-[clamp(28px,3.4vw,44px)] font-normal leading-[0.95] tracking-tightest text-paper">
        {title}{accent ? <> <span className="italic text-acid">{accent}</span></> : null}.
      </h2>
      {intro && <p className="mt-3 max-w-[60ch] text-sm leading-relaxed text-paper/65 md:text-base">{intro}</p>}
    </header>
  );
}

interface Product {
  id: number;
  name: string;
  price: string;
  category: string | null;
  brand: string | null;
  sku: string;
  imageUrl: string | null;
  why: string;
}

interface Message {
  id: number;
  role: 'user' | 'vendeur';
  text: string;
  products?: Product[];
}

interface ScriptedResponse {
  message: string;
  products: Product[];
}

const SCRIPTED: Record<string, ScriptedResponse> = {
  'blanc huîtres': {
    message:
      "Sur des huîtres je pars sur un blanc sec et iodé. Le Muscadet sur Lie du Domaine de la Pépière est le classique imparable, salin, tendu, parfait. Si vous voulez un peu plus de gras et une note d'agrumes, le Picpoul de Pinet de Félines Jourdan marche très bien aussi.",
    products: [
      { id: 2089, name: 'Muscadet Sèvre-et-Maine sur Lie 2022', price: '12', category: 'Vin blanc', brand: 'Domaine de la Pépière', sku: 'C42-B009', imageUrl: null, why: '' },
      { id: 2092, name: 'Picpoul de Pinet 2022',                price: '11', category: 'Vin blanc', brand: 'Domaine Félines Jourdan',     sku: 'C42-B012', imageUrl: null, why: '' },
    ],
  },
  'rouge barbecue': {
    message:
      "Pour un barbecue, un rouge fruité et juteux qui tient face aux grillades. Le Brouilly de Château Thivin coche tout, c'est gourmand et frais. Pour quelque chose de plus structuré, le Corbières de Château Maris donne du soleil et du caractère.",
    products: [
      { id: 2055, name: 'Brouilly 2022',     price: '15',    category: 'Vin rouge', brand: 'Château Thivin', sku: 'C42-R021', imageUrl: null, why: '' },
      { id: 2054, name: 'Corbières 2022',    price: '12.50', category: 'Vin rouge', brand: 'Château Maris',  sku: 'C42-R020', imageUrl: null, why: '' },
    ],
  },
  'cadeau 40 euros': {
    message:
      "À 40 euros vous tapez dans le sérieux. Trois directions selon le profil de la personne. Un Champagne Larmandier-Bernier pour faire élégant. Un Saint-Émilion Grand Cru pour les amateurs de Bordeaux. Un Châteauneuf-du-Pape du Vieux Télégraphe pour ceux qui aiment les rouges du Sud.",
    products: [
      { id: 2103, name: 'Champagne Brut Tradition',     price: '42', category: 'Champagne', brand: 'Champagne Larmandier-Bernier',    sku: 'C42-C003', imageUrl: null, why: '' },
      { id: 2039, name: 'Saint-Émilion Grand Cru 2019', price: '42', category: 'Vin rouge', brand: 'Château Faugères',                sku: 'C42-R005', imageUrl: null, why: '' },
      { id: 2042, name: 'Châteauneuf-du-Pape 2019',     price: '38', category: 'Vin rouge', brand: 'Domaine du Vieux Télégraphe',     sku: 'C42-R008', imageUrl: null, why: '' },
    ],
  },
  'vin fromage': {
    message:
      "Le réflexe rouge avec le fromage n'est pas toujours le bon, le blanc marche souvent mieux. Sur des chèvres, le Sancerre Blanc de Vacheron est une évidence. Sur des pâtes pressées type comté, un Chablis de William Fèvre. Et si vous tenez à un rouge, le Beaujolais Villages de Lapierre, léger et frais.",
    products: [
      { id: 2075, name: 'Sancerre Blanc 2022',        price: '21',    category: 'Vin blanc', brand: 'Domaine Vacheron',       sku: 'C42-B005', imageUrl: null, why: '' },
      { id: 2077, name: 'Chablis 2022',               price: '24',    category: 'Vin blanc', brand: 'Domaine William Fèvre',  sku: 'C42-B007', imageUrl: null, why: '' },
      { id: 2037, name: 'Beaujolais Villages 2022',   price: '13.90', category: 'Vin rouge', brand: 'Domaine Lapierre',       sku: 'C42-R003', imageUrl: null, why: '' },
    ],
  },
  'vin garde 10 ans': {
    message:
      "Pour garder dix ans, il faut une structure tannique et une matière qui supporte le temps. Trois valeurs sûres au catalogue. Un Barolo de Vietti, c'est le piémontais classique fait pour vieillir. Un Brunello di Montalcino d'Argiano sur le même registre côté italien. Et un Gevrey-Chambertin de Trapet pour rester en France, plus fin mais qui se bonifie.",
    products: [
      { id: 2059, name: 'Barolo 2018',                 price: '58', category: 'Vin rouge', brand: 'Vietti',         sku: 'C42-R025', imageUrl: null, why: '' },
      { id: 2060, name: 'Brunello di Montalcino 2017', price: '62', category: 'Vin rouge', brand: 'Argiano',        sku: 'C42-R026', imageUrl: null, why: '' },
      { id: 2036, name: 'Gevrey-Chambertin 2020',      price: '48', category: 'Vin rouge', brand: 'Domaine Trapet', sku: 'C42-R002', imageUrl: null, why: '' },
    ],
  },
};

const PRESETS = Object.keys(SCRIPTED);

export function DemoVendeur() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const threadRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(0);

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  async function send(text: string): Promise<void> {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setDraft('');

    const userMsg: Message = { id: nextId.current++, role: 'user', text: trimmed };
    setMessages(prev => [...prev, userMsg]);
    setBusy(true);

    const scripted = SCRIPTED[trimmed.toLowerCase()];
    await new Promise(r => setTimeout(r, 700));

    if (scripted) {
      setMessages(prev => [...prev, {
        id: nextId.current++,
        role: 'vendeur',
        text: scripted.message,
        products: scripted.products,
      }]);
    } else {
      setMessages(prev => [...prev, {
        id: nextId.current++,
        role: 'vendeur',
        text:
          "Sur cette page de démo, je ne réponds qu'aux cinq suggestions au-dessus. Cliquez l'une d'elles pour voir une vraie réponse, avec les bouteilles du catalogue. Sur votre boutique branchée, je réponds à tout, en direct.",
      }]);
    }
    setBusy(false);
  }

  return (
    <article className="rounded-3xl border border-paper/10 bg-paper/[0.02] p-6 md:p-8">
      <header className="flex items-baseline justify-between gap-3">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-acid">
            Le vendeur en ligne
          </div>
          <h3 className="mt-2 font-display text-2xl tracking-editorial text-paper md:text-3xl">
            Tapez ce que vous cherchez.
          </h3>
        </div>
        <span className="hidden rounded-full border border-paper/15 bg-paper/[0.04] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-paper/55 md:inline-flex">
          Démo live · Caves Forty-Two
        </span>
      </header>

      <p className="mt-2 text-sm text-paper/65">
        Catalogue réel de 80 bouteilles. Cliquez l'une des cinq suggestions pour voir le vendeur
        proposer ses bouteilles. Démo statique : sur votre boutique branchée, il répond à tout, en direct.
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        {PRESETS.map(p => (
          <button
            key={p}
            type="button"
            disabled={busy}
            onClick={() => { setDraft(p); void send(p); }}
            className="rounded-full border border-paper/15 bg-paper/[0.02] px-3 py-1.5 text-xs text-paper/75 transition hover:border-acid hover:text-acid disabled:opacity-50"
          >
            {p}
          </button>
        ))}
      </div>

      <div
        ref={threadRef}
        className="mt-5 flex max-h-[480px] flex-col gap-3 overflow-y-auto rounded-xl border border-paper/10 bg-black/30 p-4"
      >
        {messages.length === 0 && (
          <div className="text-sm italic text-paper/40">
            Posez une question pour voir le vendeur travailler. Les suggestions ci-dessus sont des exemples, vous pouvez taper la vôtre.
          </div>
        )}
        {messages.map(m => (
          <div key={m.id} className={`flex flex-col gap-2 ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm ${
              m.role === 'user'
                ? 'bg-acid text-ink'
                : 'border border-paper/10 bg-paper/[0.04] text-paper'
            }`}>
              {m.text}
            </div>
            {m.products && m.products.length > 0 && (
              <div className="grid w-full gap-2 md:grid-cols-2">
                {m.products.map(p => (
                  <div key={p.id} className="rounded-lg border border-paper/10 bg-paper/[0.02] p-3">
                    <div className="flex items-baseline justify-between gap-3">
                      <div className="font-display text-sm text-paper">{p.name}</div>
                      <div className="font-mono text-xs text-acid">{p.price} €</div>
                    </div>
                    {p.brand && (
                      <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-paper/45">
                        {p.brand}{p.category ? ' · ' + p.category : ''}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        {busy && (
          <div className="text-xs italic text-paper/50">
            Le vendeur lit votre demande dans son catalogue...
          </div>
        )}
      </div>

      <form
        className="mt-4 flex gap-2"
        onSubmit={e => { e.preventDefault(); void send(draft); }}
      >
        <input
          type="text"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          placeholder="cliquez une suggestion ci-dessus"
          className="flex-1 rounded-full border border-paper/15 bg-black/40 px-5 py-3 text-sm text-paper outline-none placeholder-paper/35 focus:border-acid"
          disabled={busy}
        />
        <button
          type="submit"
          disabled={busy || !draft.trim()}
          className="rounded-full bg-acid px-6 py-3 font-mono text-xs uppercase tracking-[0.18em] text-ink transition hover:bg-acid-deep disabled:opacity-40"
        >
          Demander
        </button>
      </form>
    </article>
  );
}
