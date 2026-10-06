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

// Concept store enfant (boutique fictive). ATTENTION honnêteté : aujourd'hui
// « cadeau » déclenche bien la question guidée, mais avec les puces du vin
// (Apéritif, Un repas…). Cette variante montre les puces du préréglage
// « enfant » : ne pas l'envoyer avant que le widget sache le faire.

const p = (x: Product) => x;

const doudou = p({
  id: "doudou",
  name: "Doudou lapin",
  desc: "Doudous",
  price: 23,
  art: { kind: "plush", c1: "#eadccb", c2: "#efb7a6", c3: "#8fa894" },
});
const gigoteuse = p({
  id: "gigoteuse",
  name: "Gigoteuse en gaze",
  desc: "Sommeil",
  price: 59,
  art: { kind: "sleepbag", c1: "#c7d5c4", c2: "#ffffff", c3: "#d7c39b" },
});
const coffretNaissance = p({
  id: "coffret-naissance",
  name: "Coffret naissance",
  desc: "Coffrets",
  price: 85,
  soldOut: true,
  art: {
    kind: "gift",
    c1: "#ead7ca",
    c2: "#c0716a",
    c3: "#ffffff",
    pattern: "dots",
  },
});
const coffretRepas = p({
  id: "coffret-repas",
  name: "Coffret repas fleurs",
  desc: "Coffrets",
  price: 42,
  art: {
    kind: "gift",
    c1: "#cfdcd0",
    c2: "#b4635a",
    c3: "#f7efe6",
    pattern: "dots",
  },
});
const hochet = p({
  id: "hochet",
  name: "Hochet en bois",
  desc: "Éveil",
  price: 16,
  art: { kind: "rattle", c1: "#c99a68", c2: "#dca99b", c3: "#9fb5a2" },
});

export const ENFANT: Variant = {
  id: "enfant",
  label: "Concept store enfant",
  shop: {
    name: "Nidu",
    tagline: "concept store enfant, depuis 2018",
    banner: "Livraison offerte dès 60 € · Emballage cadeau offert",
    nav: [
      "Naissance",
      "Bébé",
      "Enfant",
      "Jouets",
      "Chambre",
      "Idées cadeaux",
      "La boutique",
    ],
    placeholder: "Rechercher un produit, une marque…",
    hero: {
      kicker: "Nouveautés d'automne",
      title: "Des cadeaux",
      em: "qui durent.",
      size: 60,
      sub: "Des marques douces et durables, choisies une à une.",
      cta: "Voir les nouveautés",
      layout: "shelf",
      gap: 30,
      items: [
        { p: gigoteuse, h: 220 },
        { p: doudou, h: 200 },
        { p: coffretNaissance, h: 150 },
        { p: hochet, h: 170 },
      ],
    },
    section: {
      title: "Nos idées naissance",
      items: [doudou, gigoteuse, coffretNaissance, coffretRepas, hochet],
    },
    theme: {
      bg: "#fbf6f1",
      ink: "#3b3330",
      mute: "#8b7f77",
      line: "#eee4da",
      primary: "#b4635a",
      onPrimary: "#fff7f2",
      accent: "#6f8f78",
      tile: "#f3eae2",
      heroFrom: "#f3e8df",
      heroTo: "#eadbcf",
      shelf: "#dcc6b4",
      placeholder: "#a99d94",
      cta: ["#b4635a", "#fff7f2"],
    },
    fonts: {
      title: FONT.quicksand,
      text: FONT.nunito,
      titleWeight: 700,
      logoWeight: 700,
      italic: false,
    },
    tileArt: 170,
  },
  chat: {
    from: "Chloé",
    time: "18:42",
    ydayDay: "Hier",
    ydayTime: "22:04",
    out0: fr("Des nouvelles de Laura ?"),
    day: "Aujourd’hui",
    dayTime: "17:58",
    in1: fr("Ça y est, elle est née !"),
    out1: fr("Trop bien !"),
    msg: fr("On passe samedi. Tu t'occupes du cadeau ?"),
    reply: fr("Je gère !"),
    delivered: "Distribué",
  },
  thought: {
    words: ["Je", fr("n'y"), "connais", "*rien.*"],
    line: fr("Je n'y connais rien."),
  },
  typed: {
    q1: "cadeau",
    q2: "une fille, 60 € max",
    q3: "et le coffret naissance ?",
    email: "camille@example.com",
  },
  typing: {
    q1: typeQ1("cadeau"),
    q2: typeQ2("une fille, 60 € max"),
    q3: typeQ3("et le coffret naissance ?"),
  },
  guided: {
    question: refineQuestion("quelle occasion"),
    chips: [
      "Une naissance",
      "Un anniversaire",
      "Noël",
      "Petit budget",
      "Découvrir",
    ],
    pick: 0,
  },
  replies: {
    r1: "Pour une naissance, le doudou lapin à 23 € ou la gigoteuse en gaze à 59 €. C'est une fille ou un garçon ?",
    rows1: [doudou, gigoteuse],
    r2: "Pour une petite fille, le coffret repas fleurs à 42 € et le hochet en bois à 16 € : 58 € en tout.",
    rows2: [coffretRepas, hochet],
    soldOut: coffretNaissance,
    alt: coffretRepas,
    rows3: [coffretRepas, hochet],
  },
  captions: [
    [fr("Tout est mignon… Je tape « cadeau »."), 6.96, 10.05],
    [fr("Comme en boutique."), 13.1, 15.6],
    [fr("Je réponds dans la barre."), 21.3, 23.8],
    [fr("Là, je gère."), 29.6, 31.2],
    [fr("Et le coffret naissance ?"), 31.5, 33.9],
    [fr("Il me prévient."), 37.3, 38.9],
    [fr("Un vendeur IA, dans la barre de recherche."), 51.5, 53.9],
  ],
  s08: {
    label: "SAMEDI, 16 H",
    items: [
      { p: doudou, x: 1700, h: 380, d: 8, dim: 0.8 },
      { p: hochet, x: 1250, h: 260, d: 4, dim: 0.85 },
      { p: coffretRepas, x: 1470, h: 250, d: 0 },
    ],
  },
  s09: { label: "8 JOURS PLUS TARD", time: "09:14" },
  disclosure: "Boutique fictive, séquence reconstituée.",
};
