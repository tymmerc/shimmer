'use client';

import { motion } from 'framer-motion';

const ease = [0.25, 0.4, 0.25, 1] as const;

const iconProps = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

const SearchIcon = () => (
  <svg {...iconProps}>
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-3.5-3.5" />
  </svg>
);
const ChatIcon = () => (
  <svg {...iconProps}>
    <path d="M21 12a8 8 0 0 1-8 8H4l2.2-2.6A8 8 0 1 1 21 12z" />
  </svg>
);
const CartIcon = () => (
  <svg {...iconProps}>
    <path d="M3 4h2l2.2 10.5a1 1 0 0 0 1 .8h7.6a1 1 0 0 0 1-.8L19 7H6" />
    <circle cx="9" cy="20" r="1.2" />
    <circle cx="17" cy="20" r="1.2" />
  </svg>
);
const StarIcon = () => (
  <svg {...iconProps}>
    <path d="M12 3.5l2.5 5.2 5.7.7-4.2 3.9 1.1 5.6L12 16.9 6.9 19l1.1-5.6-4.2-3.9 5.7-.7z" />
  </svg>
);
const MegaphoneIcon = () => (
  <svg {...iconProps}>
    <path d="M4 10v4l11 4.5V5.5L4 10z" />
    <path d="M18.5 9a3.5 3.5 0 0 1 0 6" />
  </svg>
);

function Card({
  icon, tag, title, body, children, big = false, delay = 0,
}: {
  icon: React.ReactNode; tag?: string; title: string; body: string;
  children?: React.ReactNode; big?: boolean; delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.55, ease, delay }}
      className={`flex flex-col rounded-2xl border border-paper/10 bg-paper/[0.03] p-6 transition-colors duration-300 hover:border-acid/25 md:p-7 ${
        big ? 'md:col-span-3' : 'md:col-span-2'
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-acid/25 bg-acid/[0.07] text-acid">
          {icon}
        </span>
        {tag && <span className="text-[12px] font-medium text-acid">{tag}</span>}
      </div>
      <h3 className="mt-4 font-sans text-lg font-semibold tracking-tight text-paper md:text-xl">{title}</h3>
      <p className="mt-2 text-pretty text-[15px] leading-relaxed text-paper/60">{body}</p>
      {children}
    </motion.div>
  );
}

/**
 * Les 5 modules, en bento sobre : deux cartes larges (le cœur : vendeur et
 * SAV, avec un aperçu statique), trois cartes courtes. Une carte = une idée.
 */
export function V3Modules() {
  return (
    <section id="modules" className="relative z-10 w-full scroll-mt-16 px-6 py-24 md:py-32">
      <div className="mx-auto max-w-[1100px]">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance font-sans text-3xl font-semibold tracking-tight text-paper md:text-5xl">
            Cinq modules. Un seul outil.
          </h2>
          <p className="mt-4 text-pretty text-base text-paper/60 md:text-lg">
            Le cœur : un vendeur et un SAV qui répondent à votre place.
            Autour : tout ce qui récupère vos clients.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-4 md:mt-16 md:grid-cols-6">
          <Card
            icon={<SearchIcon />}
            tag="Le cœur"
            title="Un vendeur IA dans votre barre de recherche"
            body="Pas un chatbot en coin de page : il vit là où vos visiteurs cherchent déjà. Il comprend la demande, pose la bonne question comme en magasin, et recommande."
            big
          >
            <div className="mt-5 rounded-xl border border-paper/10 bg-ink/50 p-3">
              <div className="flex items-center gap-2.5 rounded-full border border-paper/15 bg-ink/60 px-3.5 py-2.5 text-left">
                <span className="text-paper/40">⌕</span>
                <span className="text-sm text-paper/85">un vin pour un barbecue</span>
              </div>
              <div className="mt-2.5 rounded-lg border border-acid/25 bg-acid/[0.07] px-3.5 py-2.5 text-left">
                <p className="text-sm leading-snug text-paper/90">
                  Un Côtes-du-Rhône charpenté, parfait sur les grillades. Je vous en montre trois ?
                </p>
              </div>
            </div>
          </Card>

          <Card
            icon={<ChatIcon />}
            tag="Le cœur"
            title="Un SAV qui répond seul, 24h/24"
            body="Où est ma commande, comment retourner un produit, est-ce en stock : le chatbot répond, suivi de colis inclus. Vous ne voyez que ce qui mérite votre attention."
            big
            delay={0.08}
          >
            <div className="mt-5 space-y-2 rounded-xl border border-paper/10 bg-ink/50 p-3 text-left">
              <div className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-sm bg-paper/10 px-3 py-1.5 text-sm text-paper/85">
                Où est ma commande&nbsp;?
              </div>
              <div className="w-fit max-w-[90%] rounded-2xl rounded-bl-sm border border-acid/25 bg-acid/[0.07] px-3 py-1.5 text-sm text-paper/90">
                Expédiée, livraison demain. Voici votre suivi&nbsp;↗
              </div>
            </div>
          </Card>

          <Card
            icon={<CartIcon />}
            title="Relances paniers"
            body="Les paniers abandonnés repartent avec un message dans votre ton."
            delay={0.05}
          />
          <Card
            icon={<StarIcon />}
            title="Avis clients"
            body="Collecte les bons avis, intercepte les mauvais avant qu'ils arrivent sur Google."
            delay={0.1}
          />
          <Card
            icon={<MegaphoneIcon />}
            title="Campagnes"
            body="Pubs et newsletters générées avec votre catalogue, dans votre voix."
            delay={0.15}
          />
        </div>
      </div>
    </section>
  );
}
