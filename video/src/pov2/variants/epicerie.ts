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

// Épicerie fine corse (boutique fictive). Fidèle au widget TEL QU'IL EST : « apéro »
// fait partie des requêtes vagues du SDK et les puces actuelles (Apéritif, Un
// repas, Un cadeau, Découvrir, Petit budget) conviennent à une épicerie.

const p = (x: Product) => x;

const coppa = p({
  id: "coppa",
  name: "Coppa tranchée",
  desc: "Charcuterie",
  price: 12,
  art: { kind: "slices", c1: "#8e2f2a", c2: "#f2d8cc", c3: "#d9c29c" },
});
const tomme = p({
  id: "tomme",
  name: "Tomme de brebis",
  desc: "Fromages",
  price: 14,
  art: { kind: "wheel", c1: "#a98d63", c2: "#f0dfb0" },
});
const figatellu = p({
  id: "figatellu",
  name: "Figatellu fermier",
  desc: "Charcuterie",
  price: 8,
  soldOut: true,
  art: { kind: "figatellu", c1: "#4a1d17" },
});
const canistrelli = p({
  id: "canistrelli",
  name: "Canistrelli au vin blanc",
  desc: "Biscuiterie",
  price: 6,
  art: {
    kind: "bag",
    c1: "#c7a273",
    c2: "#e0bf88",
    c3: "#8f3b22",
    lines: ["CANISTRELLI"],
  },
});
const miel = p({
  id: "miel",
  name: "Miel de maquis",
  desc: "Épicerie sucrée",
  price: 11,
  art: {
    kind: "jar",
    c1: "#b06c27",
    c2: "#f4ecdf",
    c3: "#3b2f2a",
    lines: ["MIEL", "DE MAQUIS"],
  },
});
const saucisson = p({
  id: "saucisson",
  name: "Saucisson de montagne",
  desc: "Charcuterie",
  price: 9,
  art: { kind: "saucisson", c1: "#9a3b33", c2: "#d4c7b2" },
});
const lonzu = p({
  id: "lonzu",
  name: "Lonzu tranché",
  desc: "Charcuterie",
  price: 13,
  art: {
    kind: "slices",
    c1: "#b8524a",
    c2: "#f6e3d8",
    c3: "#d9c29c",
    pattern: "oval",
  },
});
const huile = p({
  id: "huile",
  name: "Huile d'olive",
  desc: "Épicerie salée",
  price: 16,
  art: {
    kind: "bottle",
    c1: "#4f5a24",
    look: {
      shape: "bordeaux",
      glass: "#4f5a24",
      label: "#efe6d2",
      ink: "#3d4a1c",
      cap: "#3d4a1c",
      mark: "HO",
      lines: ["HUILE", "D'OLIVE"],
    },
  },
});

export const EPICERIE: Variant = {
  id: "epicerie",
  label: "Épicerie fine",
  shop: {
    name: "Comptoir Capanna",
    tagline: "épicerie corse, depuis 2009",
    banner: "Livraison offerte dès 70 € · Expédié sous vide en 48 h",
    nav: [
      "Charcuterie",
      "Fromages",
      "Épicerie salée",
      "Douceurs",
      "Vins et liqueurs",
      "Coffrets",
      "Nos producteurs",
    ],
    placeholder: "Rechercher un produit, un producteur…",
    hero: {
      kicker: "Arrivage de la semaine",
      title: "Le goût de l'île,",
      em: "sans détour.",
      size: 56,
      sub: "Charcuterie, fromages et douceurs de petites fermes corses.",
      cta: "Voir l'arrivage",
      layout: "shelf",
      gap: 30,
      items: [
        { p: huile, h: 236 },
        { p: miel, h: 170 },
        { p: tomme, h: 150 },
        { p: canistrelli, h: 160 },
      ],
    },
    section: {
      title: "Nos incontournables",
      items: [coppa, tomme, figatellu, canistrelli, miel],
    },
    theme: {
      bg: "#f5efe4",
      ink: "#2b211b",
      mute: "#7d7066",
      line: "#e5dbcc",
      primary: "#8f3b22",
      onPrimary: "#f7efe4",
      accent: "#5f6d3a",
      tile: "#ede4d5",
      heroFrom: "#ece2d2",
      heroTo: "#e0d2bd",
      shelf: "#c9b493",
      placeholder: "#a59889",
      cta: ["#2b211b", "#f5efe4"],
    },
    fonts: {
      title: FONT.lora,
      text: FONT.karla,
      titleWeight: 600,
      logoWeight: 700,
      italic: true,
    },
    tileArt: 168,
  },
  chat: {
    from: "Léa",
    time: "18:42",
    ydayDay: "Hier",
    ydayTime: "20:12",
    out0: fr("On se fait un apéro bientôt ?"),
    day: "Aujourd’hui",
    dayTime: "18:37",
    in1: fr("Vendredi, ça te va ?"),
    out1: fr("Parfait !"),
    msg: fr("Chez nous, on sera 6. Tu ramènes un truc corse ?"),
    reply: fr("Je gère !"),
    delivered: "Distribué",
  },
  thought: {
    words: ["Je", fr("n'y"), "connais", "*rien.*"],
    line: fr("Je n'y connais rien."),
  },
  typed: {
    q1: "apéro",
    q2: "on sera 6, fans de fromage",
    q3: "et le figatellu ?",
    email: "camille@example.com",
  },
  typing: {
    q1: typeQ1("apéro"),
    q2: typeQ2("on sera 6, fans de fromage"),
    q3: typeQ3("et le figatellu ?"),
  },
  guided: {
    question: refineQuestion("quelle occasion"),
    chips: ["Apéritif", "Un repas", "Un cadeau", "Découvrir", "Petit budget"],
    pick: 3,
  },
  replies: {
    r1: "Pour découvrir, la coppa tranchée à 12 € ou la tomme de brebis à 14 €, deux classiques. Vous serez combien ?",
    rows1: [coppa, tomme],
    r2: "Pour 6 amateurs de fromage, la tomme de brebis à 14 € et le lonzu tranché à 13 €, de quoi tenir tout l'apéro.",
    rows2: [tomme, lonzu],
    soldOut: figatellu,
    alt: saucisson,
    rows3: [saucisson, lonzu],
  },
  captions: [
    [fr("Tout a l'air bon… Je tape « apéro »."), 6.96, 10.05],
    [fr("Comme au comptoir."), 13.1, 15.6],
    [fr("Je réponds dans la barre."), 21.3, 23.8],
    [fr("Là, je gère."), 29.6, 31.2],
    [fr("Et le figatellu ?"), 31.5, 33.9],
    [fr("Il me prévient."), 37.3, 38.9],
    [fr("Un vendeur IA, dans la barre de recherche."), 51.5, 53.9],
  ],
  s08: {
    label: "VENDREDI, 19 H 30",
    items: [
      { p: huile, x: 1720, h: 520, d: 9, dim: 0.72 },
      { p: miel, x: 1250, h: 330, d: 6, dim: 0.8 },
      { p: lonzu, x: 1660, h: 210, d: 3, dim: 0.9 },
      { p: tomme, x: 1430, h: 270, d: 0 },
    ],
  },
  s09: { label: "8 JOURS PLUS TARD", time: "09:14" },
  disclosure: "Boutique fictive, séquence reconstituée.",
};
