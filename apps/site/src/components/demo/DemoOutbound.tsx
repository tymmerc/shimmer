'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DemoHeader } from './DemoVendeur';

type Format = 'ads' | 'newsletter' | 'social';

interface AdMock {
  format: 'square' | 'story' | 'banner';
  headline: string;
  body: string;
  cta: string;
  tint: string;
}

interface NewsletterMock {
  subject: string;
  preheader: string;
  intro: string;
  picks: { name: string; price: string; reason: string }[];
  cta: string;
}

interface SocialMock {
  platform: 'Instagram' | 'Facebook' | 'LinkedIn';
  caption: string;
  hashtags: string[];
}

type PromptGroup = 'saisonnier' | 'segments' | 'lancement' | 'urgence';

const prompts: { id: string; label: string; format: Format; group: PromptGroup }[] = [
  { id: 'wines-garde', label: '5 ads pour mes vins de garde', format: 'ads', group: 'saisonnier' },
  { id: 'newsletter-rentree', label: 'Newsletter rentrée œnologie', format: 'newsletter', group: 'saisonnier' },
  { id: 'ads-blackfriday', label: '5 ads Black Friday · primeurs', format: 'ads', group: 'urgence' },
  { id: 'newsletter-dormant', label: 'Email réactivation clients dormants', format: 'newsletter', group: 'segments' },
  { id: 'social-launch', label: '3 posts pour le nouveau Châteauneuf', format: 'social', group: 'lancement' },
  { id: 'newsletter-fideles', label: 'Email cadeau pour mes top clients', format: 'newsletter', group: 'segments' },
  { id: 'social-fete-meres', label: 'Posts fête des mères · vins en duo', format: 'social', group: 'saisonnier' },
  { id: 'ads-rupture', label: '3 ads "dernières bouteilles" · urgence stock', format: 'ads', group: 'urgence' },
];

// Match a free-text query to a prompt id by keyword
function matchPrompt(query: string): { id: string; matched: boolean } {
  const q = query.toLowerCase();
  const rules: { keys: string[]; id: string }[] = [
    { keys: ['black friday', 'soldes', 'promo', 'remise'], id: 'ads-blackfriday' },
    { keys: ['fête des mères', 'fete des meres', 'maman', 'mère'], id: 'social-fete-meres' },
    { keys: ['rupture', 'dernières', 'stock', 'épuisé', 'limit'], id: 'ads-rupture' },
    { keys: ['fidèles', 'fideles', 'top client', 'meilleurs clients', 'cadeau'], id: 'newsletter-fideles' },
    { keys: ['dormant', 'inactif', 'réactivation', 'reactivation', 'absent'], id: 'newsletter-dormant' },
    { keys: ['rentrée', 'rentree', 'automne', 'septembre'], id: 'newsletter-rentree' },
    { keys: ['garde', 'cave', 'millésime', 'vieilliss'], id: 'wines-garde' },
    { keys: ['insta', 'instagram', 'facebook', 'linkedin', 'post', 'social', 'lancement', 'nouveau'], id: 'social-launch' },
    { keys: ['newsletter', 'email', 'mail', 'campagne email'], id: 'newsletter-rentree' },
    { keys: ['ads', 'pub', 'publicité', 'visuel', 'banner', 'meta'], id: 'wines-garde' },
  ];
  for (const r of rules) {
    if (r.keys.some(k => q.includes(k))) return { id: r.id, matched: true };
  }
  return { id: 'wines-garde', matched: false };
}

const ads: Record<string, AdMock[]> = {
  'wines-garde': [
    {
      format: 'square',
      headline: 'Du vin qui attend.',
      body: '5 ans de garde, 3 minutes pour choisir. Notre sélection 2019 à découvrir.',
      cta: 'Voir la sélection',
      tint: 'from-toxic-700 via-toxic-500 to-acid',
    },
    {
      format: 'story',
      headline: 'Châteauneuf 2019',
      body: 'Sur galets roulés. Pour les dimanches qui comptent.',
      cta: 'Ajouter à la cave',
      tint: 'from-rose-700 via-toxic-500 to-toxic-300',
    },
    {
      format: 'banner',
      headline: '3 vins de garde sélectionnés par votre caviste',
      body: 'Châteauneuf · Vacqueyras · Gigondas. Livrés en 48h.',
      cta: 'Voir les 3',
      tint: 'from-toxic-800 via-toxic-600 to-toxic-400',
    },
    {
      format: 'square',
      headline: 'Pour les patients.',
      body: 'Mis en cave aujourd\'hui, ouvert en 2029. La meilleure version, c\'est demain.',
      cta: 'Commencer la cave',
      tint: 'from-emerald-700 via-toxic-600 to-toxic-400',
    },
    {
      format: 'story',
      headline: '−10 % sur les vins de garde',
      body: 'Jusqu\'à dimanche. Code GARDE2026. Sélection caviste.',
      cta: 'Profiter du code',
      tint: 'from-acid via-toxic-400 to-toxic-700',
    },
  ],
  'ads-rupture': [
    {
      format: 'square',
      headline: '12 bouteilles. Pas une de plus.',
      body: 'Châteauneuf 2019 du Vieux Télégraphe. On en a 12. Quand c\'est fini, c\'est fini.',
      cta: 'En réserver',
      tint: 'from-rose-800 via-rose-500 to-toxic-400',
    },
    {
      format: 'square',
      headline: 'Dernières heures.',
      body: 'Sancerre rouge 2021 · 4 bouteilles restantes. La cave ne le ré-importera pas.',
      cta: 'Vite, ma bouteille',
      tint: 'from-toxic-700 via-rose-600 to-rose-300',
    },
    {
      format: 'banner',
      headline: '3 vins en rupture imminente · réservez ce soir',
      body: 'Notre caviste recommande de prendre les dernières bouteilles. Stock vérifié à la minute.',
      cta: 'Voir les 3',
      tint: 'from-rose-900 via-toxic-600 to-acid',
    },
  ],
  'ads-blackfriday': [
    {
      format: 'banner',
      headline: 'Black Friday · vos primeurs −15 %',
      body: 'Les 2023 en avant-première. Sélection caviste, livré en 48h.',
      cta: 'Voir les primeurs',
      tint: 'from-rose-800 via-toxic-600 to-toxic-400',
    },
    {
      format: 'square',
      headline: 'Achetez maintenant.',
      body: 'Buvez plus tard. −15 % sur tous les primeurs jusqu\'à lundi.',
      cta: 'Profiter',
      tint: 'from-toxic-800 via-rose-500 to-acid',
    },
    {
      format: 'story',
      headline: 'Vendredi.',
      body: 'Vos vins. Moins chers. Plus rien à dire.',
      cta: 'En profiter',
      tint: 'from-ink via-toxic-700 to-acid',
    },
    {
      format: 'square',
      headline: '−15 % avant tout le monde',
      body: 'Accès anticipé pour nos clients fidèles. Jusqu\'à dimanche.',
      cta: 'Mes primeurs',
      tint: 'from-toxic-600 via-toxic-400 to-rose-300',
    },
    {
      format: 'banner',
      headline: '24 h pour faire le plein',
      body: 'Black Friday · sélection vins de garde et primeurs · −15 %',
      cta: 'Acheter',
      tint: 'from-rose-700 via-toxic-500 to-acid',
    },
  ],
};

const newsletters: Record<string, NewsletterMock> = {
  'newsletter-rentree': {
    subject: 'Rentrée œnologique · 3 vins pour vos repas d\'automne',
    preheader: 'Le caviste a sélectionné pour vous. Livré sous 48 h.',
    intro: 'Le mois de septembre, c\'est le moment de remettre la cave en route. Voici 3 bouteilles à mettre sur la table cette semaine, choisies pour les premières fraîches de l\'année.',
    picks: [
      { name: 'Châteauneuf-du-Pape 2019', price: '38 €', reason: 'Pour le retour des repas qui s\'éternisent. Tannins ronds, charpenté, garrigue.' },
      { name: 'Vacqueyras 2020', price: '24 €', reason: 'L\'alternative rhodanienne à prix doux. Friand, pour le mardi soir avec une côte de bœuf.' },
      { name: 'Sancerre rouge 2021', price: '32 €', reason: 'Léger, pinot noir, parfait avec une volaille rôtie. Servir 15°C.' },
    ],
    cta: 'Voir la sélection rentrée',
  },
  'newsletter-fideles': {
    subject: 'Pierre, vous êtes parmi nos 50 meilleurs clients · un petit cadeau',
    preheader: 'Une bouteille offerte sur votre prochaine commande.',
    intro: 'Pierre, depuis 2 ans vous avez fait confiance à la cave pour 14 commandes. C\'est énorme. On voulait vous remercier autrement qu\'avec une promo générique : voici une bouteille offerte (au choix) sur votre prochaine commande de 80 € ou plus, valable jusqu\'au 30 juin.',
    picks: [
      { name: 'Bourgogne Aligoté · Domaine Lafarge', price: 'offerte', reason: 'Idéale pour l\'apéritif d\'été. Une bouteille qu\'on aime offrir.' },
      { name: 'Vacqueyras 2020 · Domaine du Sang', price: 'offerte', reason: 'Profil rhodanien dans votre style. Si vous ne connaissez pas, essayez.' },
      { name: 'Sancerre rouge 2021 · Vacheron', price: 'offerte', reason: 'Léger, pinot noir, parfait pour les soirées qui arrivent.' },
    ],
    cta: 'Choisir ma bouteille offerte',
  },
  'newsletter-dormant': {
    subject: 'Marie, ça fait 4 mois qu\'on s\'est pas vu',
    preheader: 'Voici 3 nouveautés qui pourraient vous parler.',
    intro: 'Marie, votre dernière commande date du 14 mai (un Vacqueyras 2020, on s\'en souvient). On a depuis rentré 3 vins qui pourraient vous plaire, basés sur ce que vous aviez aimé.',
    picks: [
      { name: 'Châteauneuf 2018 · Domaine Saint-Préfert', price: '46 €', reason: 'Profil similaire à votre Vacqueyras mais avec plus de garde. Vous deviez aimer.' },
      { name: 'Côte-Rôtie 2019 · Patrick & Christophe', price: '52 €', reason: 'Si vous voulez monter d\'un cran sur le rhodanien rouge.' },
      { name: 'Lirac 2020 · Mont-Redon', price: '22 €', reason: 'Le prix doux du week-end, dans le même registre que ce que vous aimez.' },
    ],
    cta: 'Reprendre où on en était',
  },
};

const socials: Record<string, SocialMock[]> = {
  'social-fete-meres': [
    {
      platform: 'Instagram',
      caption: 'Cette année, on a sélectionné 5 duos vin + chocolat pour la fête des mères. À retirer en boutique ou en livraison express dès vendredi. Sélection caviste, emballage soigné. Lien en bio.',
      hashtags: ['fetedesmeres', 'vinetchocolat', 'cadeauxmaman', 'cavisteindépendant', 'paris'],
    },
    {
      platform: 'Facebook',
      caption: 'Maman aime le rouge corsé ? Le blanc minéral ? Le rosé d\'apéritif ? On a préparé 5 duos vin + chocolat artisanal pour la fête des mères. Livraison express possible jusqu\'à mercredi soir. Toutes les sélections sont assemblées à la main par le caviste.',
      hashtags: ['vin', 'cadeau', 'fetedesmeres', 'caviste'],
    },
    {
      platform: 'LinkedIn',
      caption: 'Pour la fête des mères, la cave propose une sélection de 5 coffrets vin + chocolat, assemblés par notre caviste. Une approche alternative à la fleur traditionnelle, qui célèbre le partage à table. Disponible jusqu\'à la veille.',
      hashtags: ['vin', 'commerceindependant', 'fetedesmeres'],
    },
  ],
  'social-launch': [
    {
      platform: 'Instagram',
      caption: 'Nouvelle entrée à la cave : Châteauneuf-du-Pape 2019, Domaine du Vieux Télégraphe. Sur galets roulés, grenache dominant, structuré. À carafer 30 min. À boire ce soir ou à laisser dormir 8 ans.',
      hashtags: ['vin', 'cavisteindépendant', 'chateauneufdupape', 'vindeagarde', 'rhone'],
    },
    {
      platform: 'Facebook',
      caption: 'On vient de recevoir le Châteauneuf 2019 du Vieux Télégraphe. Pour celles et ceux qui suivent : c\'est un millésime de garde, on conseille de poser quelques bouteilles à la cave. Pour les autres, parfait sur un gigot dimanche midi. Dispo en boutique et en livraison 48h.',
      hashtags: ['vinrouge', 'rhone', 'cavedemontagne'],
    },
    {
      platform: 'LinkedIn',
      caption: 'Notre sélection d\'automne arrive : focus sur les rhodaniens 2019, un millésime généreux. 3 références ont rejoint la cave cette semaine, dont le Châteauneuf-du-Pape Domaine du Vieux Télégraphe que nous avons attendu de longs mois. Sélection caviste, conseils en direct.',
      hashtags: ['vin', 'commerce', 'sélectioncaviste'],
    },
  ],
};

interface LiveResult {
  format: Format;
  store: string;
  content: Record<string, unknown>;
  meta?: { durationMs?: number };
}

export function DemoOutbound() {
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState('');
  const [shownInput, setShownInput] = useState<string | null>(null);
  const [wasMatched, setWasMatched] = useState(true);
  const [storeKey, setStoreKey] = useState<'caves' | 'atelier'>('caves');
  const [live, setLive] = useState<LiveResult | null>(null);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [liveElapsed, setLiveElapsed] = useState(0);

  const handlePrompt = (id: string, displayLabel?: string) => {
    setLive(null);
    setLiveError(null);
    setLoading(true);
    setSelected(null);
    setShownInput(displayLabel ?? prompts.find(p => p.id === id)?.label ?? id);
    setTimeout(() => {
      setSelected(id);
      setLoading(false);
    }, 900);
  };

  const handleSubmit = async () => {
    if (!input.trim()) return;
    setLive(null);
    setLiveError(null);
    setSelected(null);
    setShownInput(input);
    setWasMatched(true);
    setLoading(true);
    setLiveElapsed(0);

    const start = Date.now();
    const elapsedTimer = window.setInterval(() => {
      setLiveElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 45_000);

    try {
      const res = await fetch('/shimmer/api/public/outbound/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: input, storeKey }),
        signal: controller.signal,
      });
      window.clearTimeout(timeoutId);
      window.clearInterval(elapsedTimer);

      if (!res.ok) {
        if (res.status === 429) {
          throw new Error('Trop de requêtes pour la démo. Réessayez dans 1 minute.');
        }
        throw new Error(`Le vendeur n'a pas pu répondre (${res.status})`);
      }
      const data = (await res.json()) as LiveResult;
      setLive(data);
      setLoading(false);
    } catch (err) {
      window.clearTimeout(timeoutId);
      window.clearInterval(elapsedTimer);
      const isAbort = err instanceof DOMException && err.name === 'AbortError';
      const { id, matched } = matchPrompt(input);
      setWasMatched(matched);
      setSelected(id);
      setLoading(false);
      setLiveError(isAbort ? 'Trop long, on bascule sur un exemple type.' : (err as Error).message);
    }
  };

  const reset = () => {
    setSelected(null);
    setLoading(false);
    setInput('');
    setShownInput(null);
    setWasMatched(true);
    setLive(null);
    setLiveError(null);
    setLiveElapsed(0);
  };

  return (
    <div>
      <DemoHeader
        eyebrow="Démo · Campagnes & Ads"
        title="Vos pubs et newsletters,"
        accent="générées avec votre catalogue"
        intro="Le vendeur connait votre identité, vos top-sellers, vos clients. Tapez un prompt, il sort la campagne. Vous validez et vous publiez."
      />

      {/* Prompt input area */}
      <div className="mt-10 rounded-2xl border border-paper/10 bg-paper/[0.03] p-6 backdrop-blur-sm md:p-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 font-mono text-[11px] uppercase tracking-[0.22em] text-paper/55">
          <div className="flex items-center gap-3">
            <span>Demandez une campagne pour</span>
            <div className="inline-flex rounded-full border border-paper/15 bg-black/40 p-0.5">
              <button
                onClick={() => setStoreKey('caves')}
                disabled={loading}
                className={`rounded-full px-3 py-1 transition ${
                  storeKey === 'caves' ? 'bg-acid text-ink' : 'text-paper/70 hover:text-paper'
                } disabled:opacity-40`}
              >
                Caves Forty-Two
              </button>
              <button
                onClick={() => setStoreKey('atelier')}
                disabled={loading}
                className={`rounded-full px-3 py-1 transition ${
                  storeKey === 'atelier' ? 'bg-acid text-ink' : 'text-paper/70 hover:text-paper'
                } disabled:opacity-40`}
              >
                L'Atelier Lumière
              </button>
            </div>
          </div>
          {(selected || shownInput || live) && (
            <button
              onClick={reset}
              className="rounded border border-paper/15 px-2 py-0.5 transition hover:border-paper/30 hover:text-paper"
            >
              recommencer
            </button>
          )}
        </div>

        {/* Real input */}
        <div className="rounded-xl border border-acid/30 bg-black/40 p-3 transition focus-within:border-acid">
          <div className="flex items-start gap-3">
            <span className="mt-1 font-mono text-sm text-acid">$</span>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              disabled={loading}
              rows={1}
              placeholder="Écrivez votre demande… ex: « 5 ads pour mes vins de garde » ou « relancer mes clients dormants »"
              className="min-h-[40px] flex-1 resize-none bg-transparent font-mono text-sm leading-relaxed text-paper placeholder-paper/35 outline-none disabled:opacity-50"
            />
            <button
              onClick={handleSubmit}
              disabled={loading || !input.trim()}
              className="self-stretch rounded-lg bg-acid px-4 font-mono text-[11px] uppercase tracking-[0.18em] text-ink transition hover:bg-acid-deep disabled:opacity-30"
            >
              Générer
            </button>
          </div>
          {shownInput && (
            <div className="mt-3 flex items-center gap-2 border-t border-paper/10 pt-2 font-mono text-[10px] text-paper/55">
              <span className="text-acid">→</span>
              <span>Compris :</span>
              <span className="italic text-paper">"{shownInput}"</span>
              {!wasMatched && !loading && (
                <span className="ml-auto text-paper/40">format par défaut · ads</span>
              )}
            </div>
          )}
        </div>

        {/* Suggested prompts grouped */}
        <div className="mt-5">
          <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-paper/45">
            Ou choisissez une suggestion
          </div>
          <div className="space-y-3">
            {(['saisonnier', 'segments', 'lancement', 'urgence'] as PromptGroup[]).map(group => {
              const items = prompts.filter(p => p.group === group);
              return (
                <div key={group}>
                  <div className="mb-1.5 font-mono text-[9px] uppercase tracking-[0.22em] text-paper/35">
                    {group}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {items.map(p => (
                      <button
                        key={p.id}
                        onClick={() => handlePrompt(p.id)}
                        disabled={loading}
                        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition disabled:opacity-40 ${
                          selected === p.id
                            ? 'border-acid bg-acid/10 text-paper'
                            : 'border-paper/15 bg-paper/[0.02] text-paper/75 hover:border-acid/40 hover:bg-acid/5'
                        }`}
                      >
                        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-acid">
                          {p.format === 'ads' ? 'ads' : p.format === 'newsletter' ? 'email' : 'social'}
                        </span>
                        <span>{p.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Output area */}
      <AnimatePresence mode="wait">
        {loading && <LoadingState elapsed={liveElapsed} />}
        {!loading && live && <LiveOutput key="live" live={live} />}
        {!loading && !live && selected && ads[selected] && (
          <AdsOutput key={`ads-${selected}`} ads={ads[selected]} />
        )}
        {!loading && !live && selected && newsletters[selected] && (
          <NewsletterOutput key={`nl-${selected}`} nl={newsletters[selected]} />
        )}
        {!loading && !live && selected && socials[selected] && (
          <SocialOutput key={`sc-${selected}`} posts={socials[selected]} />
        )}
      </AnimatePresence>

      {liveError && !loading && (
        <div className="mt-4 rounded-xl border border-amber-400/40 bg-amber-400/5 px-4 py-3 font-mono text-[11px] text-amber-200">
          ⚠ {liveError}
        </div>
      )}

      {/* Side info */}
      {!selected && !live && !loading && (
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <InfoCard
            title="Connait votre identité"
            body="Couleurs, typo, ton de marque, signature : Shimmer lit votre boutique avant de générer."
          />
          <InfoCard
            title="Connait vos chiffres"
            body="Top-sellers du mois, marges, stock, clients dormants : la campagne s'aligne sur ce qui marche."
          />
          <InfoCard
            title="Vous validez avant l'envoi"
            body="Chaque visuel, chaque email, chaque post : prêt à publier, mais jamais envoyé sans vous."
          />
        </div>
      )}
    </div>
  );
}

function LoadingState({ elapsed }: { elapsed?: number }) {
  const isLive = elapsed !== undefined && elapsed > 0;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="mt-6 rounded-2xl border border-paper/10 bg-paper/[0.03] p-12 text-center backdrop-blur-sm"
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }}
        className="mx-auto h-10 w-10 rounded-full border-2 border-paper/15 border-t-acid"
      />
      <div className="mt-5 font-display text-xl tracking-editorial text-paper">
        Le vendeur écrit la campagne…
      </div>
      <div className="mt-2 font-mono text-xs text-paper/55">
        Lecture catalogue · ton de marque · top-sellers · clients ciblés
      </div>
      {isLive && (
        <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-acid/30 bg-acid/5 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-acid">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-acid" />
          en direct · {elapsed}s
        </div>
      )}
    </motion.div>
  );
}

interface LiveAd { format?: string; headline?: string; body?: string; cta?: string; tone?: string }
interface LiveNL { subject?: string; preheader?: string; intro?: string; cta?: string; picks?: Array<{ name?: string; price?: string; reason?: string }> }
interface LivePost { platform?: string; caption?: string; hashtags?: string[] }

function LiveOutput({ live }: { live: LiveResult }) {
  const c = live.content;
  const seconds = live.meta?.durationMs ? Math.round(live.meta.durationMs / 1000) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.4 }}
      className="mt-6"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex items-center gap-2 rounded-full border border-acid/40 bg-acid/10 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.22em] text-acid">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-acid" />
          généré en direct · {live.store}
          {seconds !== null && <span className="text-acid/70">· {seconds}s</span>}
        </div>
      </div>

      {live.format === 'ads' && Array.isArray((c as { items?: LiveAd[] }).items) && (
        <LiveAdsCards items={(c as { items: LiveAd[] }).items} storeName={live.store} />
      )}
      {live.format === 'newsletter' && (
        <LiveNewsletterCard nl={c as LiveNL} storeName={live.store} />
      )}
      {live.format === 'social' && Array.isArray((c as { items?: LivePost[] }).items) && (
        <LiveSocialCards posts={(c as { items: LivePost[] }).items} />
      )}
    </motion.div>
  );
}

function LiveAdsCards({ items, storeName }: { items: LiveAd[]; storeName: string }) {
  const tints = [
    'from-toxic-700 via-toxic-500 to-acid',
    'from-rose-700 via-toxic-500 to-toxic-300',
    'from-toxic-800 via-toxic-600 to-toxic-400',
    'from-emerald-700 via-toxic-600 to-toxic-400',
    'from-acid via-toxic-400 to-toxic-700',
  ];
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((a, i) => {
        const format = a.format === 'story' || a.format === 'banner' ? a.format : 'square';
        const ratio = format === 'story' ? 'aspect-[9/16]' : format === 'banner' ? 'aspect-[16/9]' : 'aspect-square';
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, duration: 0.4 }}
            className="overflow-hidden rounded-2xl border border-paper/10 bg-paper/[0.03]"
          >
            <div className={`relative w-full bg-gradient-to-br ${tints[i % tints.length]} p-6 ${ratio}`}>
              <div className="absolute inset-x-6 top-6 font-mono text-[9px] uppercase tracking-[0.22em] text-ink/65">
                {storeName}
              </div>
              <div className="absolute inset-x-6 bottom-6">
                <div className="font-display text-2xl leading-[1.05] tracking-tightest text-ink md:text-3xl">
                  {a.headline ?? '·'}
                </div>
                {a.body && <div className="mt-2 text-xs leading-snug text-ink/80">{a.body}</div>}
                {a.cta && (
                  <button className="mt-3 inline-flex rounded-full bg-ink px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-paper">
                    {a.cta} →
                  </button>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-paper/10 px-4 py-3">
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-paper/55">
                {format} · {a.tone ?? '·'}
              </span>
              <div className="flex gap-1">
                <button className="rounded border border-paper/15 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-paper/70 hover:text-paper">
                  Édit
                </button>
                <button className="rounded border border-acid/30 bg-acid/5 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-acid">
                  ✓
                </button>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

function LiveNewsletterCard({ nl, storeName }: { nl: LiveNL; storeName: string }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-paper/10 bg-paper">
      <div className="border-b border-ink/10 bg-paper-warm px-6 py-4">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">objet</div>
        <div className="mt-1 font-display text-xl tracking-editorial text-ink">{nl.subject ?? '·'}</div>
        {nl.preheader && <div className="mt-2 font-mono text-[11px] text-ink-soft">{nl.preheader}</div>}
      </div>
      <div className="px-6 py-8 md:px-10 md:py-12 text-ink">
        <div className="font-display text-2xl italic tracking-editorial text-toxic-600">{storeName}</div>
        {nl.intro && <p className="mt-6 text-base leading-relaxed text-ink-soft">{nl.intro}</p>}
        {Array.isArray(nl.picks) && nl.picks.length > 0 && (
          <div className="mt-8 space-y-4">
            {nl.picks.map((p, i) => (
              <div key={i} className="flex items-start gap-4 rounded-xl border border-ink/10 bg-paper-warm p-4">
                <div className="h-16 w-16 shrink-0 rounded-lg bg-gradient-to-br from-toxic-700 to-toxic-400" />
                <div className="flex-1">
                  <div className="font-display text-lg leading-tight tracking-editorial">{p.name ?? '·'}</div>
                  {p.price && <div className="mt-0.5 font-mono text-sm text-toxic-600">{p.price}</div>}
                  {p.reason && <div className="mt-1 text-sm italic text-ink-soft">"{p.reason}"</div>}
                </div>
              </div>
            ))}
          </div>
        )}
        {nl.cta && (
          <button className="mt-8 inline-flex rounded-full bg-ink px-5 py-3 font-mono text-[11px] uppercase tracking-[0.18em] text-paper">
            {nl.cta} →
          </button>
        )}
      </div>
    </div>
  );
}

function LiveSocialCards({ posts }: { posts: LivePost[] }) {
  return (
    <div className="space-y-4">
      {posts.map((p, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.08, duration: 0.4 }}
          className="rounded-2xl border border-paper/10 bg-paper/[0.03] p-5 md:p-6"
        >
          <div className="flex items-center justify-between">
            <span className="rounded-full border border-acid/30 bg-acid/5 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-acid">
              {p.platform ?? '·'}
            </span>
            <div className="flex gap-1">
              <button className="rounded border border-paper/15 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-paper/70 hover:text-paper">
                Édit
              </button>
              <button className="rounded border border-acid/30 bg-acid/5 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-acid">
                Programmer
              </button>
            </div>
          </div>
          {p.caption && <p className="mt-4 text-sm leading-relaxed text-paper/85">{p.caption}</p>}
          {Array.isArray(p.hashtags) && p.hashtags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {p.hashtags.map(h => (
                <span key={h} className="font-mono text-xs text-acid">#{h.replace(/^#/, '')}</span>
              ))}
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
}

function AdsOutput({ ads }: { ads: AdMock[] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.4 }}
      className="mt-6"
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-paper/55">
          {ads.length} visuels générés · prêts à valider
        </div>
        <div className="flex gap-2">
          <button className="rounded-full border border-paper/15 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-paper transition hover:bg-paper/10">
            Régénérer
          </button>
          <button className="rounded-full bg-acid px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-ink transition hover:bg-acid-deep">
            Tout valider
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ads.map((a, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, duration: 0.4 }}
            className="overflow-hidden rounded-2xl border border-paper/10 bg-paper/[0.03]"
          >
            <div
              className={`relative aspect-square w-full bg-gradient-to-br ${a.tint} p-6 ${
                a.format === 'story' ? 'aspect-[9/16]' : a.format === 'banner' ? 'aspect-[16/9]' : ''
              }`}
            >
              <div className="absolute inset-x-6 top-6 font-mono text-[9px] uppercase tracking-[0.22em] text-ink/65">
                Caves Forty-Two
              </div>
              <div className="absolute inset-x-6 bottom-6">
                <div className="font-display text-2xl leading-[1.05] tracking-tightest text-ink md:text-3xl">
                  {a.headline}
                </div>
                <div className="mt-2 text-xs leading-snug text-ink/80">{a.body}</div>
                <button className="mt-3 inline-flex rounded-full bg-ink px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-paper">
                  {a.cta} →
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-paper/10 px-4 py-3">
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-paper/55">
                {a.format === 'square' ? '1080 × 1080 · Insta/FB feed' : a.format === 'story' ? '1080 × 1920 · Story' : '1200 × 628 · banner'}
              </span>
              <div className="flex gap-1">
                <button className="rounded border border-paper/15 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-paper/70 hover:text-paper">
                  Édit
                </button>
                <button className="rounded border border-acid/30 bg-acid/5 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-acid">
                  ✓
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

function NewsletterOutput({ nl }: { nl: NewsletterMock }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.4 }}
      className="mt-6"
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-paper/55">
          Email rédigé · prêt à valider
        </div>
        <div className="flex gap-2">
          <button className="rounded-full border border-paper/15 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-paper transition hover:bg-paper/10">
            Régénérer
          </button>
          <button className="rounded-full bg-acid px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-ink transition hover:bg-acid-deep">
            Programmer l'envoi
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-paper/10 bg-paper">
        {/* Email header */}
        <div className="border-b border-ink/10 bg-paper-warm px-6 py-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">objet</div>
          <div className="mt-1 font-display text-xl tracking-editorial text-ink">{nl.subject}</div>
          <div className="mt-2 font-mono text-[11px] text-ink-soft">{nl.preheader}</div>
        </div>

        {/* Email body */}
        <div className="px-6 py-8 md:px-10 md:py-12 text-ink">
          <div className="font-display text-2xl italic tracking-editorial text-toxic-600">
            Caves Forty-Two
          </div>
          <p className="mt-6 text-base leading-relaxed text-ink-soft">{nl.intro}</p>

          <div className="mt-8 space-y-4">
            {nl.picks.map((p, i) => (
              <div key={i} className="flex items-start gap-4 rounded-xl border border-ink/10 bg-paper-warm p-4">
                <div className="h-16 w-16 shrink-0 rounded-lg bg-gradient-to-br from-toxic-700 to-toxic-400" />
                <div className="flex-1">
                  <div className="font-display text-lg leading-tight tracking-editorial">{p.name}</div>
                  <div className="mt-0.5 font-mono text-sm text-toxic-600">{p.price}</div>
                  <div className="mt-1 text-sm italic text-ink-soft">"{p.reason}"</div>
                </div>
              </div>
            ))}
          </div>

          <button className="mt-8 inline-flex rounded-full bg-ink px-5 py-3 font-mono text-[11px] uppercase tracking-[0.18em] text-paper">
            {nl.cta} →
          </button>

          <div className="mt-10 border-t border-ink/10 pt-6 text-center text-xs text-ink-mute">
            Caves Forty-Two · 42 rue des Vignerons, Paris · se désinscrire
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Mini label="Destinataires" value="2 840" />
        <Mini label="Segment" value="Acheteurs Rhône" />
        <Mini label="Ouverture estimée" value="38 %" />
        <Mini label="CA estimé" value="3 200 €" />
      </div>
    </motion.div>
  );
}

function SocialOutput({ posts }: { posts: SocialMock[] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.4 }}
      className="mt-6"
    >
      <div className="mb-4 font-mono text-[11px] uppercase tracking-[0.22em] text-paper/55">
        {posts.length} posts générés · adaptés par plateforme
      </div>
      <div className="space-y-4">
        {posts.map((p, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08, duration: 0.4 }}
            className="rounded-2xl border border-paper/10 bg-paper/[0.03] p-5 md:p-6"
          >
            <div className="flex items-center justify-between">
              <span className="rounded-full border border-acid/30 bg-acid/5 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-acid">
                {p.platform}
              </span>
              <div className="flex gap-1">
                <button className="rounded border border-paper/15 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-paper/70 hover:text-paper">
                  Édit
                </button>
                <button className="rounded border border-acid/30 bg-acid/5 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-acid">
                  Programmer
                </button>
              </div>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-paper/85">{p.caption}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {p.hashtags.map(h => (
                <span key={h} className="font-mono text-xs text-acid">#{h}</span>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

function InfoCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-paper/10 bg-paper/[0.03] p-5">
      <div className="font-display text-base tracking-editorial text-paper">{title}</div>
      <p className="mt-2 text-sm leading-relaxed text-paper/70">{body}</p>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-paper/10 bg-paper/[0.03] p-3">
      <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-paper/45">{label}</div>
      <div className="mt-1 font-display text-lg tracking-editorial text-paper">{value}</div>
    </div>
  );
}
