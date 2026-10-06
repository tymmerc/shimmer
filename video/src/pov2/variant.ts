import { createContext, useContext } from "react";
import type { Art } from "./Art";

/**
 * Une variante du film = une boutique fictive d'un métier (cave, épicerie,
 * mode…). La ligne de temps, la caméra, la bande et la musique sont les mêmes
 * pour toutes : seuls les textes, la boutique et les produits changent. Les
 * chaînes du SDK (dock, encart épuisé) restent celles du code, octet pour
 * octet ; les réponses du vendeur suivent les règles du prompt réel
 * (vouvoiement, pas de markdown, prix cités, 3 phrases max).
 */

export interface Product {
  id: string;
  /** nom exact du catalogue (repris tel quel par le gabarit « épuisé ») */
  name: string;
  /** ligne grise du dock = catégorie (le SDK n'a pas de marque ici) */
  desc: string;
  price: number;
  art: Art;
  soldOut?: boolean;
}

export interface ShopTheme {
  bg: string;
  ink: string;
  mute: string;
  line: string;
  /** couleur principale du site, reprise par le dock (thème du widget) */
  primary: string;
  /** texte du bandeau sur `primary` */
  onPrimary: string;
  /** surtitre du hero */
  accent: string;
  /** fond des vignettes produit */
  tile: string;
  heroFrom: string;
  heroTo: string;
  shelf: string;
  /** texte du placeholder de la barre native */
  placeholder: string;
  /** bouton du hero (fond, texte) */
  cta: [string, string];
}

export interface ShopFonts {
  /** police de titrage de la boutique (jamais celles de Shimmer) */
  title: string;
  /** police de texte de la boutique, reprise par le dock */
  text: string;
  titleWeight: number;
  logoWeight: number;
  /** false : la police n'a pas d'italique, la partie accentuée passe en couleur */
  italic: boolean;
}

export interface HeroItem {
  p: Product;
  /** hauteur du dessin en px CSS */
  h: number;
}

export interface Shop {
  name: string;
  tagline: string;
  banner: string;
  nav: string[];
  placeholder: string;
  hero: {
    kicker: string;
    title: string;
    em: string;
    sub: string;
    cta: string;
    /** corps du titre en px (64 par défaut) : le titre doit tenir sur 2 lignes */
    size?: number;
    /** étagère (posés) ou tringle (suspendus) */
    layout: "shelf" | "rail";
    gap: number;
    items: HeroItem[];
  };
  section: { title: string; items: Product[] };
  theme: ShopTheme;
  fonts: ShopFonts;
  /** hauteur des dessins dans les vignettes (246 px) */
  tileArt: number;
}

export interface S08Item {
  p: Product;
  x: number;
  h: number;
  /** retard d'entrée (frames) */
  d: number;
  /** luminosité (plans du fond plus sombres) */
  dim?: number;
}

export interface Variant {
  id: string;
  /** libellé humain (fichiers, page de visionnage) */
  label: string;
  shop: Shop;
  chat: {
    from: string;
    time: string;
    ydayDay: string;
    ydayTime: string;
    out0: string;
    day: string;
    dayTime: string;
    in1: string;
    out1: string;
    /** le texto qui lance l'histoire (une phrase par ligne, coupé après « . ») */
    msg: string;
    reply: string;
    delivered: string;
  };
  /** « Je n'y connais rien. » en mots (italique sur *mot*) + ligne de bande */
  thought: { words: string[]; line: string };
  typed: { q1: string; q2: string; q3: string; email: string };
  typing: { q1: number[]; q2: number[]; q3: number[] };
  guided: {
    /** question d'affinage telle que le SDK l'affiche */
    question: (q: string) => string;
    chips: string[];
    /** index de la puce cliquée */
    pick: number;
  };
  replies: {
    r1: string;
    rows1: [Product, Product];
    r2: string;
    rows2: [Product, Product];
    /** produit épuisé demandé à la question 3 */
    soldOut: Product;
    /** redirection même catégorie (code, pas le LLM) */
    alt: Product;
    rows3: [Product, Product];
  };
  captions: Array<[string, number, number]>;
  s08: { label: string; items: S08Item[] };
  s09: { label: string; time: string };
  disclosure: string;
}

/** « #7a1f2b » + alpha → « rgba(122,31,43,a) » */
export function rgba(hex: string, a: number): string {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.replace(/./g, "$&$&") : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/**
 * Frappe humaine déterministe : `text.length` instants entre `start` et `end`,
 * un peu de jitter, une pause après les virgules. Strictement croissante.
 */
export function typeFrames(text: string, start: number, end: number): number[] {
  const n = text.length;
  if (n <= 1) return [start];
  const w: number[] = [];
  for (let i = 1; i < n; i++) {
    const prev = text[i - 1];
    let k = 1 + 0.32 * Math.sin(i * 2.399 + n);
    if (prev === ",") k += 1.4;
    else if (prev === " ") k += 0.35;
    w.push(k);
  }
  const total = w.reduce((a, b) => a + b, 0);
  const out = [start];
  let acc = 0;
  for (const k of w) {
    acc += k;
    out.push(Math.round(start + ((end - start) * acc) / total));
  }
  for (let i = 1; i < out.length; i++)
    if (out[i] <= out[i - 1]) out[i] = out[i - 1] + 1;
  return out;
}

/** Frappe de la requête 1 : ~3 images par lettre, finie avant la touche Entrée (286). */
export const typeQ1 = (q: string) =>
  typeFrames(q, 256, Math.min(282, 256 + Math.round(3.2 * (q.length - 1))));
export const typeQ2 = (q: string) => typeFrames(q, 586, 628);
export const typeQ3 = (q: string) => typeFrames(q, 856, 890);

/**
 * Question d'affinage du SDK (sdk/src/shimmer.ts, askToRefine) : espaces
 * insécables autour de la requête et avant « ? », comme dans le code.
 */
export const refineQuestion =
  (what: string) =>
  (q: string): string =>
    `Avec plaisir. Pour bien vous orienter sur « ${q} », c'est pour ${what} ?`;

/** Gabarit déterministe « épuisé » (packages/chatbot/src/sales-assistant.ts). */
export function soldOutReply(soldOut: Product, alt: Product): string {
  return `${soldOut.name} est épuisé pour le moment. Je peux vous prévenir dès qu'il revient. En attendant, regardez ${alt.name} (${alt.price} €), c'est ce qui s'en rapproche le plus en ${soldOut.desc.toLowerCase()}.`;
}

/** Email de retour de stock (apps/api/src/lib/stock-alerts.ts). */
export const restockMail = (p: Product) => ({
  subject: `${p.name} est de retour`,
  preview: `Vous nous aviez demandé de vous prévenir : ${p.name} est de nouveau disponible.`,
});

// Le contexte est rempli par ShimmerPOV ; la valeur par défaut est posée par
// variants/index.ts (la cave), pour les compositions qui n'en passent pas.
export const VariantContext = createContext<Variant | null>(null);

let fallback: Variant | null = null;
export const setDefaultVariant = (v: Variant) => {
  fallback = v;
};

export function useVariant(): Variant {
  const v = useContext(VariantContext) ?? fallback;
  if (!v) throw new Error("variante absente");
  return v;
}
