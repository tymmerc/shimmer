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

// Cosmétiques naturels (boutique fictive). ATTENTION honnêteté : « crème » ne
// déclenche pas encore la question guidée et les puces du SDK sont celles du
// vin. Cette variante montre le préréglage « cosmétique » (question « pour
// quel besoin ? », autres puces) : ne pas l'envoyer avant que le widget sache
// le faire.

const p = (x: Product) => x;

const creme = p({
  id: "creme",
  name: "Crème à l'immortelle",
  desc: "Soin visage",
  price: 39,
  art: {
    kind: "cream",
    c1: "#f1eee7",
    c2: "#e4e8dc",
    c3: "#b9a27a",
    lines: ["IMMORTELLE"],
  },
});
const huile = p({
  id: "huile",
  name: "Huile visage à l'immortelle",
  desc: "Soin visage",
  price: 34,
  art: {
    kind: "dropper",
    c1: "#93602b",
    c2: "#f3eee6",
    c3: "#2a2522",
    lines: ["HUILE", "VISAGE"],
  },
});
const serum = p({
  id: "serum",
  name: "Sérum à l'immortelle",
  desc: "Soin visage",
  price: 42,
  soldOut: true,
  art: {
    kind: "dropper",
    c1: "#dfe5df",
    c2: "#f6f3ec",
    c3: "#4c6b58",
    lines: ["SÉRUM"],
  },
});
const miel = p({
  id: "miel",
  name: "Crème riche au miel",
  desc: "Soin visage",
  price: 29,
  art: {
    kind: "cream",
    c1: "#ece2cc",
    c2: "#f6efe2",
    c3: "#4c6b58",
    lines: ["AU MIEL"],
  },
});
const savon = p({
  id: "savon",
  name: "Savon au lait d'ânesse",
  desc: "Corps",
  price: 9,
  art: {
    kind: "soap",
    c1: "#eee6d6",
    c2: "#cdb38c",
    lines: ["LAIT", "D'ÂNESSE"],
  },
});
const coffret = p({
  id: "coffret",
  name: "Coffret soin visage",
  desc: "Coffrets",
  price: 49,
  art: { kind: "gift", c1: "#4c6b58", c2: "#e9dccb" },
});

export const COSMETIQUE: Variant = {
  id: "cosmetique",
  label: "Cosmétiques naturels",
  shop: {
    name: "Atelier Linfa",
    tagline: "soins naturels aux plantes, depuis 2017",
    banner: "Livraison offerte dès 50 € · Échantillons offerts",
    nav: [
      "Visage",
      "Corps",
      "Savons",
      "Huiles",
      "Coffrets",
      "Ingrédients",
      "L'atelier",
    ],
    placeholder: "Rechercher un soin, un ingrédient…",
    hero: {
      kicker: "Rituel d'automne",
      title: "Aux plantes,",
      em: "rien de plus.",
      size: 60,
      sub: "Immortelle, myrte et miel, cultivés et distillés près de chez nous.",
      cta: "Découvrir les soins",
      layout: "shelf",
      gap: 28,
      items: [
        { p: huile, h: 210 },
        { p: creme, h: 150 },
        { p: serum, h: 232 },
        { p: savon, h: 110 },
      ],
    },
    section: {
      title: "Nos soins visage",
      items: [creme, huile, serum, miel, savon],
    },
    theme: {
      bg: "#f3f1ea",
      ink: "#24302a",
      mute: "#7b8079",
      line: "#e1e1d6",
      primary: "#4c6b58",
      onPrimary: "#f3f1ea",
      accent: "#a2775c",
      tile: "#e9e7dd",
      heroFrom: "#e7e5da",
      heroTo: "#dad7c8",
      shelf: "#c3bfae",
      placeholder: "#9da199",
      cta: ["#24302a", "#f3f1ea"],
    },
    fonts: {
      title: FONT.gilda,
      text: FONT.outfit,
      titleWeight: 400,
      logoWeight: 400,
      italic: false,
    },
    tileArt: 176,
  },
  chat: {
    from: "Sarah",
    time: "18:42",
    ydayDay: "Hier",
    ydayTime: "20:50",
    out0: fr("On fait un cadeau commun pour Nina ?"),
    day: "Aujourd’hui",
    dayTime: "18:30",
    in1: fr("Oui ! Son anniv, c'est jeudi."),
    out1: fr("Une idée ?"),
    msg: fr("Un soin, elle adore ça. Tu t'en charges ?"),
    reply: fr("Je gère !"),
    delivered: "Distribué",
  },
  thought: {
    words: ["Je", fr("n'y"), "connais", "*rien.*"],
    line: fr("Je n'y connais rien."),
  },
  typed: {
    q1: "crème",
    q2: "sèche, 40 € max",
    q3: "et le sérum immortelle ?",
    email: "camille@example.com",
  },
  typing: {
    q1: typeQ1("crème"),
    q2: typeQ2("sèche, 40 € max"),
    q3: typeQ3("et le sérum immortelle ?"),
  },
  guided: {
    question: refineQuestion("quel besoin"),
    chips: [
      "Peau sèche",
      "Peau sensible",
      "Anti-âge",
      "Un cadeau",
      "Petit budget",
    ],
    pick: 3,
  },
  replies: {
    r1: "Pour offrir, la crème à l'immortelle à 39 € ou le coffret soin visage à 49 €. Sa peau est sèche ou sensible ?",
    rows1: [creme, coffret],
    r2: "Pour une peau sèche et sous 40 €, l'huile visage à l'immortelle à 34 € ou la crème riche au miel à 29 €.",
    rows2: [huile, miel],
    soldOut: serum,
    alt: huile,
    rows3: [huile, miel],
  },
  captions: [
    [fr("Tous ces soins… Je tape « crème »."), 6.96, 10.05],
    [fr("Comme une conseillère."), 13.1, 15.6],
    [fr("Je réponds dans la barre."), 21.3, 23.8],
    [fr("Là, je gère."), 29.6, 31.2],
    [fr("Et le sérum ?"), 31.5, 33.9],
    [fr("Il me prévient."), 37.3, 38.9],
    [fr("Un vendeur IA, dans la barre de recherche."), 51.5, 53.9],
  ],
  s08: {
    label: "JEUDI, 18 H 45",
    items: [
      { p: huile, x: 1720, h: 400, d: 8, dim: 0.75 },
      { p: creme, x: 1280, h: 230, d: 4, dim: 0.85 },
      { p: coffret, x: 1500, h: 250, d: 0 },
    ],
  },
  s09: { label: "8 JOURS PLUS TARD", time: "09:14" },
  disclosure: "Boutique fictive, séquence reconstituée.",
};
