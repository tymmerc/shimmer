import { FONT } from "../../pov/brand";
import { fr } from "../script";
import { TYPE_Q1, TYPE_Q2, TYPE_Q3 } from "../timeline";
import { refineQuestion, type Product, type Variant } from "../variant";
import { W, type FilmWine } from "../wines";

// Film 1, validé par Tym le 30/09 : Caves Forty-Two (boutique de démo, magasin 4).
// Textes et minutages repris à l'identique ; seules les couleurs Shimmer passent
// à l'accent « duo » du site.

const bottle = (w: FilmWine): Product => ({
  id: w.id,
  name: w.name,
  desc: w.desc,
  price: w.price,
  soldOut: w.soldOut,
  art: { kind: "bottle", c1: w.look.glass, look: w.look },
});

const P = Object.fromEntries(
  Object.entries(W).map(([k, w]) => [k, bottle(w)]),
) as Record<keyof typeof W, Product>;

export const CAVE: Variant = {
  id: "cave",
  label: "Cave à vins",
  shop: {
    name: "Caves Forty-Two",
    tagline: "caviste indépendant, depuis 2011",
    banner: "Livraison offerte dès 90 € · Expédié sous 48 h",
    nav: [
      "Rouges",
      "Blancs",
      "Bulles",
      "Rosés",
      "Coffrets",
      "Accords mets et vins",
      "Le caviste",
    ],
    placeholder: "Rechercher un vin, une appellation…",
    hero: {
      kicker: "Sélection d'automne",
      title: "Des vins de vignerons,",
      em: "choisis un par un.",
      sub: "Des vins de petits domaines, tous goûtés avant d’entrer en cave.",
      cta: "Découvrir la sélection",
      layout: "shelf",
      gap: 30,
      items: [
        { p: P.chinon, h: 226 },
        { p: P.madiran, h: 238 },
        { p: P.vacqueyras, h: 252 },
        { p: P.crozes, h: 236 },
        { p: P.chablis, h: 226 },
        { p: P.picpoul, h: 240 },
      ],
    },
    section: {
      title: "Nos rouges du moment",
      items: [P.beaujolais, P.corbieres, P.crozes, P.vacqueyras, P.brouilly],
    },
    theme: {
      bg: "#f7f3ec",
      ink: "#1f1a17",
      mute: "#7a716a",
      line: "#e6dfd4",
      primary: "#7a1f2b",
      onPrimary: "#f3ede2",
      accent: "#b08a4a",
      tile: "#efe8dc",
      heroFrom: "#ede4d6",
      heroTo: "#e4d8c6",
      shelf: "#cdbb9f",
      placeholder: "#a39a92",
      cta: ["#1f1a17", "#f7f3ec"],
    },
    fonts: {
      title: FONT.shopSerif,
      text: FONT.shopSans,
      titleWeight: 600,
      logoWeight: 700,
      italic: true,
    },
    tileArt: 190,
  },
  chat: {
    from: "Julien",
    time: "18:42",
    ydayDay: "Hier",
    ydayTime: "21:07",
    out0: fr("Tu me dis pour la date ?"),
    day: "Aujourd’hui",
    dayTime: "18:40",
    in1: fr("Ça y est, on a la date !"),
    out1: fr("Alors ?"),
    msg: fr("Barbecue samedi, on sera 8. Tu t'occupes du vin ?"),
    reply: fr("Je gère !"),
    delivered: "Distribué",
  },
  thought: {
    words: ["Je", fr("n'y"), "connais", "*rien.*"],
    line: fr("Je n'y connais rien."),
  },
  typed: {
    q1: "rouge",
    q2: "des grillades, on sera 8",
    q3: "et le crozes-hermitage ?",
    email: "camille@example.com",
  },
  typing: { q1: TYPE_Q1, q2: TYPE_Q2, q3: TYPE_Q3 },
  guided: {
    question: refineQuestion("quelle occasion"),
    chips: ["Apéritif", "Un repas", "Un cadeau", "Découvrir", "Petit budget"],
    pick: 1,
  },
  replies: {
    r1: "Pour un repas, le Beaujolais Villages 2022 à 14 € ou le Brouilly 2022 à 15 €. Vous servez quoi ?",
    rows1: [P.beaujolais, P.brouilly],
    r2: "Pour 8 aux grillades, comptez 4 bouteilles : le Vacqueyras 2021 à 21 €, fruité et épicé, ou le Corbières 2022 à 12 €.",
    rows2: [P.vacqueyras, P.corbieres],
    soldOut: P.crozes,
    alt: P.vacqueyras,
    rows3: [P.vacqueyras, P.corbieres],
  },
  captions: [
    [fr("Tous ces rouges… Je tape « rouge »."), 6.96, 10.05],
    [fr("Comme un caviste."), 13.1, 15.6],
    [fr("Je réponds dans la barre."), 21.3, 23.8],
    [fr("Là, je gère."), 29.6, 31.2],
    [fr("Et le Crozes ?"), 31.5, 33.9],
    [fr("Il me prévient."), 37.3, 38.9],
    [fr("Un vendeur IA, dans la barre de recherche."), 51.5, 53.9],
  ],
  s08: {
    label: "SAMEDI, 20 H 15",
    items: [
      { p: P.vacqueyras, x: 1250, h: 470, d: 6, dim: 0.72 },
      { p: P.vacqueyras, x: 1660, h: 470, d: 9, dim: 0.72 },
      { p: P.vacqueyras, x: 1360, h: 520, d: 3, dim: 0.86 },
      { p: P.vacqueyras, x: 1500, h: 560, d: 0 },
    ],
  },
  s09: { label: "8 JOURS PLUS TARD", time: "09:14" },
  disclosure: "Boutique de démo Shopify, séquence reconstituée.",
};
