import type { BottleLook } from "../pov/Bottle";

// Vins du film : appellation + millésime (catalogue de démo réel, magasin 4),
// sans aucun nom de producteur. Ligne grise SDK = catégorie (marque nulle).
// Prix ronds (le SDK affiche Decimal.toString : « 21 € »).

export interface FilmWine {
  id: string;
  name: string;
  desc: string;
  price: number;
  look: BottleLook;
  soldOut?: boolean;
}

const w = (
  id: string,
  name: string,
  price: number,
  look: BottleLook,
  soldOut = false,
): FilmWine => ({
  id,
  name,
  desc: "Vin rouge",
  price,
  look,
  soldOut,
});

export const W = {
  chinon: w("chinon", "Chinon 2021", 18, {
    shape: "bordeaux",
    glass: "#2a0a12",
    label: "#e9e1d1",
    ink: "#2d4a3e",
    cap: "#2d4a3e",
    mark: "Ch", lines: ["CHINON"],
  }),
  vacqueyras: w("vacqueyras", "Vacqueyras 2021", 21, {
    shape: "bourgogne",
    glass: "#2a0a12",
    label: "#f3ede2",
    ink: "#7a1f2b",
    cap: "#7a1f2b",
    mark: "Vq", lines: ["VACQUEYRAS"],
  }),
  crozes: w(
    "crozes",
    "Crozes-Hermitage 2021",
    21,
    {
      shape: "bourgogne",
      glass: "#2a0a12",
      label: "#7a1f2b",
      ink: "#f3ede2",
      cap: "#b08a4a",
      mark: "CH", lines: ["CROZES", "HERMITAGE"],
    },
    true,
  ),
  saintjo: w("saintjo", "Saint-Joseph 2021", 26, {
    shape: "bourgogne",
    glass: "#2a0a12",
    label: "#f3ede2",
    ink: "#1f1a17",
    cap: "#1f1a17",
    mark: "SJ", lines: ["SAINT", "JOSEPH"],
  }),
  brouilly: w("brouilly", "Brouilly 2022", 15, {
    shape: "bourgogne",
    glass: "#3b0d16",
    label: "#f3ede2",
    ink: "#4f5d6b",
    cap: "#4f5d6b",
    mark: "Br", lines: ["BROUILLY"],
  }),
  beaujolais: w("beaujolais", "Beaujolais Villages 2022", 14, { shape: "bourgogne", glass: "#3b0d16", label: "#f3ede2", ink: "#7a1f2b", cap: "#b08a4a", mark: "BV", lines: ["BEAUJOLAIS", "VILLAGES"] }),
  corbieres: w("corbieres", "Corbières 2022", 12, { shape: "bordeaux", glass: "#2a0a12", label: "#d8c28f", ink: "#3b0d16", cap: "#3b0d16", mark: "Co", lines: ["CORBIÈRES"] }),
  madiran: w("madiran", "Madiran 2018", 22, {
    shape: "bordeaux",
    glass: "#2a0a12",
    label: "#1f1a17",
    ink: "#d8c28f",
    cap: "#1f1a17",
    mark: "Md", lines: ["MADIRAN"],
  }),
  chablis: {
    id: "chablis",
    name: "Chablis 2022",
    desc: "Vin blanc",
    price: 24,
    look: {
      shape: "bourgogne",
      glass: "#a8b56a",
      label: "#ffffff",
      ink: "#7a6a3a",
      cap: "#d8c28f",
      mark: "Cb", lines: ["CHABLIS"],
    },
  } as FilmWine,
  picpoul: {
    id: "picpoul",
    name: "Picpoul de Pinet 2022",
    desc: "Vin blanc",
    price: 11,
    look: {
      shape: "flute",
      glass: "#b9c07a",
      label: "#f3ede2",
      ink: "#2d4a6b",
      cap: "#2d4a6b",
      mark: "PP", lines: ["PICPOUL", "DE PINET"],
    },
  } as FilmWine,
};

/** Section « Nos rouges du moment » (5 cartes, le Crozes épuisé au centre). */
export const REDS = [W.beaujolais, W.corbieres, W.crozes, W.vacqueyras, W.brouilly];
/** Étagère du hero. */
export const SHELF = [
  W.chinon,
  W.madiran,
  W.vacqueyras,
  W.crozes,
  W.chablis,
  W.picpoul,
];
