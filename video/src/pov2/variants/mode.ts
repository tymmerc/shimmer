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

// Prêt-à-porter (boutique fictive). ATTENTION honnêteté : « pull » ne déclenche
// pas encore la question guidée et les puces du SDK sont celles du vin. Cette
// variante montre les puces du préréglage « mode » (même question, autres
// puces) : ne pas l'envoyer avant que le widget sache le faire.

const p = (x: Product) => x;

const pullBleu = p({
  id: "pull-bleu",
  name: "Pull col rond bleu",
  desc: "Maille",
  price: 59,
  art: { kind: "sweater", c1: "#3d5a8a", pattern: "plain" },
});
const torsade = p({
  id: "torsade",
  name: "Pull torsadé écru",
  desc: "Maille",
  price: 69,
  art: { kind: "sweater", c1: "#e6dcc8", pattern: "cable" },
});
const marin = p({
  id: "marin",
  name: "Pull marin rayé",
  desc: "Maille",
  price: 64,
  soldOut: true,
  art: { kind: "sweater", c1: "#f1ede3", c2: "#1f2f52", pattern: "stripes" },
});
const cardigan = p({
  id: "cardigan",
  name: "Cardigan bleu nuit",
  desc: "Maille",
  price: 79,
  art: { kind: "cardigan", c1: "#22304f", c2: "#d9cbb3" },
});
const robe = p({
  id: "robe",
  name: "Robe en maille",
  desc: "Robes",
  price: 89,
  art: { kind: "dress", c1: "#8c4a3c" },
});
const boite = p({
  id: "boite",
  name: "Boîte cadeau",
  desc: "Accessoires",
  price: 0,
  art: { kind: "gift", c1: "#e4d6bf", c2: "#1f2b45" },
});

export const MODE: Variant = {
  id: "mode",
  label: "Prêt-à-porter",
  shop: {
    name: "Maison Anela",
    tagline: "prêt-à-porter femme, depuis 2014",
    banner: "Livraison et retours offerts · Expédié sous 48 h",
    nav: [
      "Nouveautés",
      "Robes",
      "Maille",
      "Pantalons",
      "Accessoires",
      "Idées cadeaux",
      "La maison",
    ],
    placeholder: "Rechercher un vêtement, une matière…",
    hero: {
      kicker: "Collection automne",
      title: "Maille d'automne,",
      em: "douce et durable.",
      size: 56,
      sub: "Des pièces en laine et en coton, fabriquées en petites séries.",
      cta: "Voir la collection",
      layout: "rail",
      gap: -12,
      items: [
        { p: robe, h: 250 },
        { p: torsade, h: 214 },
        { p: cardigan, h: 204 },
      ],
    },
    section: {
      title: "Nouvelle collection",
      items: [pullBleu, torsade, marin, cardigan, robe],
    },
    theme: {
      bg: "#f4f1ec",
      ink: "#161616",
      mute: "#77706a",
      line: "#e3ddd4",
      primary: "#1f2b45",
      onPrimary: "#f4f1ec",
      accent: "#9a6b4f",
      tile: "#ece6dd",
      heroFrom: "#ebe4da",
      heroTo: "#dfd5c8",
      shelf: "#6f655c",
      placeholder: "#9b948d",
      cta: ["#161616", "#f4f1ec"],
    },
    fonts: {
      title: FONT.bodoni,
      text: FONT.jost,
      titleWeight: 500,
      logoWeight: 600,
      italic: true,
    },
    tileArt: 200,
  },
  chat: {
    from: "Hugo",
    time: "18:42",
    ydayDay: "Hier",
    ydayTime: "21:30",
    out0: fr("On fait quoi pour Maman ?"),
    day: "Aujourd’hui",
    dayTime: "18:36",
    in1: fr("J'ai réservé le resto !"),
    out1: fr("Top. Et le cadeau ?"),
    msg: fr("Resto dimanche midi. Tu t'occupes du cadeau ?"),
    reply: fr("Je gère !"),
    delivered: "Distribué",
  },
  thought: {
    words: ["Je", fr("n'y"), "connais", "*rien.*"],
    line: fr("Je n'y connais rien."),
  },
  typed: {
    q1: "pull",
    q2: "le bleu, surtout",
    q3: "et le pull marin ?",
    email: "camille@example.com",
  },
  typing: {
    q1: typeQ1("pull"),
    q2: typeQ2("le bleu, surtout"),
    q3: typeQ3("et le pull marin ?"),
  },
  guided: {
    question: refineQuestion("quelle occasion"),
    chips: [
      "Tous les jours",
      "Une soirée",
      "Un mariage",
      "Un cadeau",
      "Petit budget",
    ],
    pick: 3,
  },
  replies: {
    r1: "Pour offrir, le pull torsadé écru à 69 € ou le cardigan bleu nuit à 79 €. Elle aime quelles couleurs ?",
    rows1: [torsade, cardigan],
    r2: "Alors le pull col rond bleu à 59 €, tout doux, ou le cardigan bleu nuit à 79 €, qui se porte ouvert ou fermé.",
    rows2: [pullBleu, cardigan],
    soldOut: marin,
    alt: pullBleu,
    rows3: [pullBleu, cardigan],
  },
  captions: [
    [fr("Tous ces pulls… Je tape « pull »."), 6.96, 10.05],
    [fr("Comme une vendeuse."), 13.1, 15.6],
    [fr("Je réponds dans la barre."), 21.3, 23.8],
    [fr("Là, je gère."), 29.6, 31.2],
    [fr("Et le pull marin ?"), 31.5, 33.9],
    [fr("Il me prévient."), 37.3, 38.9],
    [fr("Un vendeur IA, dans la barre de recherche."), 51.5, 53.9],
  ],
  s08: {
    label: "DIMANCHE, 12 H 30",
    items: [
      { p: cardigan, x: 1720, h: 390, d: 8, dim: 0.7 },
      { p: pullBleu, x: 1420, h: 420, d: 4, dim: 0.88 },
      { p: boite, x: 1590, h: 200, d: 0 },
    ],
  },
  s09: { label: "8 JOURS PLUS TARD", time: "09:14" },
  disclosure: "Boutique fictive, séquence reconstituée.",
};
