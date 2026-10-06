import { FONT } from "../../pov/brand";
import { fr } from "../script";
import {
  refineQuestion,
  typeQ1,
  typeQ2,
  typeQ3,
  type Product,
  type Variant,
} from "../variant";

// Créatrice de bijoux (boutique fictive). ATTENTION honnêteté : « collier » ne
// déclenche pas encore la question guidée et les puces du SDK sont celles du
// vin. Cette variante montre les puces du préréglage « bijoux » : ne pas
// l'envoyer avant que le widget sache le faire.

const p = (x: Product) => x;

const SILVER = "#c4c8ce";
const GOLD = "#c7a35a";

const goutte = p({
  id: "goutte",
  name: "Collier goutte",
  desc: "Colliers",
  price: 79,
  art: {
    kind: "bust",
    c1: SILVER,
    c2: "#9fc2c7",
    c3: "#e8dfd2",
    pattern: "drop",
  },
});
const perle = p({
  id: "perle",
  name: "Collier perle",
  desc: "Colliers",
  price: 89,
  art: {
    kind: "bust",
    c1: GOLD,
    c2: "#d9d1c3",
    c3: "#e8dfd2",
    pattern: "pearl",
  },
});
const lune = p({
  id: "lune",
  name: "Collier lune",
  desc: "Colliers",
  price: 95,
  soldOut: true,
  art: { kind: "bust", c1: SILVER, c3: "#e8dfd2", pattern: "moon" },
});
const sautoir = p({
  id: "sautoir",
  name: "Sautoir fin",
  desc: "Colliers",
  price: 65,
  art: { kind: "bust", c1: SILVER, c3: "#e8dfd2", pattern: "long" },
});
const jonc = p({
  id: "jonc",
  name: "Bracelet jonc",
  desc: "Bracelets",
  price: 55,
  art: { kind: "bangle", c1: GOLD, c3: "#d6ccc0" },
});
const ecrin = p({
  id: "ecrin",
  name: "Écrin",
  desc: "Accessoires",
  price: 0,
  art: { kind: "gift", c1: "#2b4a57", c2: "#c7a35a" },
});

export const BIJOUX: Variant = {
  id: "bijoux",
  label: "Bijoux",
  shop: {
    name: "Maison Albore",
    tagline: "bijoux faits main, depuis 2016",
    banner: "Livraison offerte · Écrin cadeau offert",
    nav: [
      "Colliers",
      "Bracelets",
      "Boucles d'oreilles",
      "Bagues",
      "Mariage",
      "Idées cadeaux",
      "L'atelier",
    ],
    placeholder: "Rechercher un bijou, une matière…",
    hero: {
      kicker: "Collection Mer",
      title: "Faits main,",
      em: "pièce par pièce.",
      size: 60,
      sub: "Argent 925 et plaqué or, façonnés dans notre atelier.",
      cta: "Découvrir la collection",
      layout: "shelf",
      gap: 26,
      items: [
        { p: perle, h: 230 },
        { p: goutte, h: 262 },
        { p: jonc, h: 120 },
      ],
    },
    section: {
      title: "Les pièces de la saison",
      items: [goutte, perle, lune, sautoir, jonc],
    },
    theme: {
      bg: "#f6f2ec",
      ink: "#22201e",
      mute: "#85796f",
      line: "#e7ded3",
      primary: "#2b4a57",
      onPrimary: "#f6f2ec",
      accent: "#a8874a",
      tile: "#eee7de",
      heroFrom: "#ece4d9",
      heroTo: "#e0d4c5",
      shelf: "#c9b8a3",
      placeholder: "#a2978d",
      cta: ["#2b4a57", "#f6f2ec"],
    },
    fonts: {
      title: FONT.marcellus,
      text: FONT.figtree,
      titleWeight: 400,
      logoWeight: 400,
      italic: false,
    },
    tileArt: 186,
  },
  chat: {
    from: "Emma",
    time: "18:42",
    ydayDay: "Hier",
    ydayTime: "19:45",
    out0: fr("C'est quand, l'anniv de Clara ?"),
    day: "Aujourd’hui",
    dayTime: "18:21",
    in1: fr("Samedi ! Tout est réservé."),
    out1: fr("On lui offre quoi ?"),
    msg: fr("Un bijou, elle adore. Tu t'en occupes ?"),
    reply: fr("Je gère !"),
    delivered: "Distribué",
  },
  thought: {
    words: ["Je", fr("n'y"), "connais", "*rien.*"],
    line: fr("Je n'y connais rien."),
  },
  typed: {
    q1: "collier",
    q2: "argent, 80 € max",
    q3: "et le collier lune ?",
    email: "camille@example.com",
  },
  typing: {
    q1: typeQ1("collier"),
    q2: typeQ2("argent, 80 € max"),
    q3: typeQ3("et le collier lune ?"),
  },
  guided: {
    question: refineQuestion("quelle occasion"),
    chips: [
      "Un anniversaire",
      "Un mariage",
      "Tous les jours",
      "Un cadeau",
      "Petit budget",
    ],
    pick: 0,
  },
  replies: {
    r1: "Pour un anniversaire, le collier perle à 89 € ou le collier goutte à 79 €. Plutôt or ou argent ?",
    rows1: [perle, goutte],
    r2: "En argent et sous 80 €, le collier goutte à 79 € ou le sautoir fin à 65 €, faciles à porter tous les jours.",
    rows2: [goutte, sautoir],
    soldOut: lune,
    alt: goutte,
    rows3: [goutte, sautoir],
  },
  captions: [
    [fr("Tant de bijoux… Je tape « collier »."), 6.96, 10.05],
    [fr("Comme une bijoutière."), 13.1, 15.6],
    [fr("Je réponds dans la barre."), 21.3, 23.8],
    [fr("Là, je gère."), 29.6, 31.2],
    [fr("Et le collier lune ?"), 31.5, 33.9],
    [fr("Il me prévient."), 37.3, 38.9],
    [fr("Un vendeur IA, dans la barre de recherche."), 51.5, 53.9],
  ],
  s08: {
    label: "SAMEDI, 21 H",
    items: [
      { p: perle, x: 1730, h: 360, d: 8, dim: 0.72 },
      { p: ecrin, x: 1260, h: 170, d: 4, dim: 0.85 },
      { p: goutte, x: 1490, h: 470, d: 0 },
    ],
  },
  s09: { label: "8 JOURS PLUS TARD", time: "09:14" },
  disclosure: "Boutique fictive, séquence reconstituée.",
};
