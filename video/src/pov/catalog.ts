import type { BottleLook } from "./Bottle";

/**
 * Catalogue de la boutique fictive, calqué sur la démo réelle (magasin 4) :
 * appellation + millésime, JAMAIS de nom de producteur (la démo utilise de
 * vrais domaines). Ligne grise = ce que rend le SDK : `${category} · ${brand}`,
 * ici sans marque, donc « Vin rouge ». Prix ronds uniquement : le SDK affiche
 * le prix brut de la base (Decimal.toString), un 15,50 sortirait « 15.5 € ».
 */
export interface Wine {
  id: string;
  name: string;
  desc: string;
  price: number;
  look: BottleLook;
  soldOut?: boolean;
}

const RED = "#3b0d16";
const RED2 = "#2a0a12";
const WHITE = "#b9c07a";
const WHITE2 = "#a8b56a";

export const WINES = {
  vacqueyras: {
    id: "vacqueyras",
    name: "Vacqueyras 2021",
    desc: "Vin rouge",
    price: 21,
    look: {
      shape: "bourgogne",
      glass: RED2,
      label: "#f3ede2",
      ink: "#7a1f2b",
      cap: "#7a1f2b",
      mark: "Vq",
    },
  },
  madiran: {
    id: "madiran",
    name: "Madiran 2018",
    desc: "Vin rouge",
    price: 22,
    look: {
      shape: "bordeaux",
      glass: RED2,
      label: "#1f1a17",
      ink: "#d8c28f",
      cap: "#1f1a17",
      mark: "Md",
    },
  },
  cahors: {
    id: "cahors",
    name: "Cahors 2020",
    desc: "Vin rouge",
    price: 19,
    look: {
      shape: "bordeaux",
      glass: RED2,
      label: "#e9e1d1",
      ink: "#3b0d16",
      cap: "#3b0d16",
      mark: "Ca",
    },
  },
  chinon: {
    id: "chinon",
    name: "Chinon 2021",
    desc: "Vin rouge",
    price: 18,
    look: {
      shape: "bordeaux",
      glass: RED,
      label: "#e9e1d1",
      ink: "#2d4a3e",
      cap: "#2d4a3e",
      mark: "Ch",
    },
  },
  crozes: {
    id: "crozes",
    name: "Crozes-Hermitage 2021",
    desc: "Vin rouge",
    price: 21,
    look: {
      shape: "bourgogne",
      glass: RED2,
      label: "#7a1f2b",
      ink: "#f3ede2",
      cap: "#b08a4a",
      mark: "CH",
    },
    soldOut: true,
  },
  saintjo: {
    id: "saintjo",
    name: "Saint-Joseph 2021",
    desc: "Vin rouge",
    price: 26,
    look: {
      shape: "bourgogne",
      glass: RED2,
      label: "#f3ede2",
      ink: "#1f1a17",
      cap: "#1f1a17",
      mark: "SJ",
    },
  },
  faugeres: {
    id: "faugeres",
    name: "Faugères 2021",
    desc: "Vin rouge",
    price: 24,
    look: {
      shape: "bourgogne",
      glass: RED,
      label: "#d8c28f",
      ink: "#3b0d16",
      cap: "#3b0d16",
      mark: "Fg",
    },
  },
  picpoul: {
    id: "picpoul",
    name: "Picpoul de Pinet 2022",
    desc: "Vin blanc",
    price: 11,
    look: {
      shape: "flute",
      glass: WHITE,
      label: "#f3ede2",
      ink: "#2d4a6b",
      cap: "#2d4a6b",
      mark: "PP",
    },
  },
  chablis: {
    id: "chablis",
    name: "Chablis 2022",
    desc: "Vin blanc",
    price: 24,
    look: {
      shape: "bourgogne",
      glass: WHITE2,
      label: "#ffffff",
      ink: "#7a6a3a",
      cap: "#d8c28f",
      mark: "Cb",
    },
  },
  champ: {
    id: "champ",
    name: "Champagne Brut",
    desc: "Champagne",
    price: 42,
    look: {
      shape: "bourgogne",
      glass: "#1d2a1e",
      label: "#1f1a17",
      ink: "#d8c28f",
      cap: "#d8c28f",
      mark: "B",
    },
  },
} satisfies Record<string, Wine>;

/** Format réellement affiché par le SDK : `${price} €`. */
export const euro = (n: number) => `${n} €`;
