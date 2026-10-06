// Identité Shimmer (site V2 validé par Tym) + la boutique fictive Caves
// Forty-Two, qui NE doit PAS ressembler à Shimmer : c'est le site du marchand.
import { loadFont as loadFraunces } from "@remotion/google-fonts/Fraunces";
import { loadFont as loadInterTight } from "@remotion/google-fonts/InterTight";
import { loadFont as loadJetBrains } from "@remotion/google-fonts/JetBrainsMono";
import { loadFont as loadCormorant } from "@remotion/google-fonts/CormorantGaramond";
import { loadFont as loadDMSans } from "@remotion/google-fonts/DMSans";
import { loadFont as loadLora } from "@remotion/google-fonts/Lora";
import { loadFont as loadKarla } from "@remotion/google-fonts/Karla";
import { loadFont as loadBodoni } from "@remotion/google-fonts/BodoniModa";
import { loadFont as loadJost } from "@remotion/google-fonts/Jost";
import { loadFont as loadQuicksand } from "@remotion/google-fonts/Quicksand";
import { loadFont as loadNunito } from "@remotion/google-fonts/Nunito";
import { loadFont as loadMarcellus } from "@remotion/google-fonts/Marcellus";
import { loadFont as loadFigtree } from "@remotion/google-fonts/Figtree";
import { loadFont as loadGilda } from "@remotion/google-fonts/GildaDisplay";
import { loadFont as loadOutfit } from "@remotion/google-fonts/Outfit";

const subsets: ("latin" | "latin-ext")[] = ["latin", "latin-ext"];

const fr = loadFraunces("normal", { weights: ["400", "500"], subsets });
loadFraunces("italic", { weights: ["400", "500"], subsets });
const it = loadInterTight("normal", {
  weights: ["400", "500", "600", "700"],
  subsets,
});
const jb = loadJetBrains("normal", { weights: ["400", "500"], subsets });
// Police de texte de la boutique (et du dock, réglé à l'installation sur la
// police du site : fontFamily du thème SDK). Distincte d'Inter Tight/Shimmer.
const dm = loadDMSans("normal", {
  weights: ["400", "500", "600", "700"],
  subsets,
});
// Police de titrage de la boutique (serif de caviste, distincte de Fraunces).
const cg = loadCormorant("normal", { weights: ["500", "600", "700"], subsets });
loadCormorant("italic", { weights: ["500"], subsets });

// Boutiques des autres métiers (variantes du film) : polices de sites marchands
// courants, jamais celles de Shimmer (Fraunces, Inter Tight, JetBrains Mono).
const lora = loadLora("normal", { weights: ["500", "600", "700"], subsets });
loadLora("italic", { weights: ["500"], subsets });
const karla = loadKarla("normal", { weights: ["400", "500", "600", "700"], subsets });
const bodoni = loadBodoni("normal", { weights: ["500", "600"], subsets });
loadBodoni("italic", { weights: ["500"], subsets });
const jost = loadJost("normal", { weights: ["400", "500", "600", "700"], subsets });
const quick = loadQuicksand("normal", { weights: ["600", "700"], subsets });
const nunito = loadNunito("normal", { weights: ["400", "600", "700"], subsets });
const marcellus = loadMarcellus("normal", { weights: ["400"], subsets });
const figtree = loadFigtree("normal", { weights: ["400", "500", "600", "700"], subsets });
const gilda = loadGilda("normal", { weights: ["400"], subsets });
const outfit = loadOutfit("normal", { weights: ["400", "500", "600", "700"], subsets });

export const FONT = {
  display: `${fr.fontFamily}, Georgia, serif`,
  sans: `${it.fontFamily}, system-ui, sans-serif`,
  mono: `${jb.fontFamily}, ui-monospace, monospace`,
  shopSerif: `${cg.fontFamily}, Georgia, serif`,
  shopSans: `${dm.fontFamily}, system-ui, sans-serif`,
  lora: `${lora.fontFamily}, Georgia, serif`,
  karla: `${karla.fontFamily}, system-ui, sans-serif`,
  bodoni: `${bodoni.fontFamily}, Georgia, serif`,
  jost: `${jost.fontFamily}, system-ui, sans-serif`,
  quicksand: `${quick.fontFamily}, system-ui, sans-serif`,
  nunito: `${nunito.fontFamily}, system-ui, sans-serif`,
  marcellus: `${marcellus.fontFamily}, Georgia, serif`,
  figtree: `${figtree.fontFamily}, system-ui, sans-serif`,
  gilda: `${gilda.fontFamily}, Georgia, serif`,
  outfit: `${outfit.fontFamily}, system-ui, sans-serif`,
};

/**
 * Shimmer, accent « duo » du site (en prod depuis le 05/10/2026) : magenta clair
 * de la toxine sur les petits éléments (point du logo, trait d'annotation,
 * soulignés), italiques des titres en papier. Jamais d'accent posé sur la lueur.
 */
export const S = {
  ink: "#0d0b14",
  ink2: "#15121f",
  paper: "#fbf9f4",
  acid: "#ecb0ff",
  /** même teinte en « r,g,b » pour les halos */
  acidRgb: "236,176,255",
  /** couleur des italiques de titre (duo : papier) */
  display: "#fbf9f4",
  violet: "#6a2bf5",
  magenta: "#e84aff",
  line: "rgba(251,249,244,0.12)",
};

/** Caves Forty-Two : caviste éditorial, crème + bordeaux. */
export const SHOP = {
  bg: "#f7f3ec",
  card: "#ffffff",
  ink: "#1f1a17",
  mute: "#7a716a",
  line: "#e6dfd4",
  primary: "#7a1f2b", // bordeaux, réglé à l'installation comme couleur du dock
  primarySoft: "rgba(122,31,43,0.08)",
  gold: "#b08a4a",
};

/** Dock Shimmer tel que rendu par le SDK (buildStyles, shimmer.ts). */
export const DOCK = {
  radius: 12,
  shadow: "0 12px 32px rgba(0,0,0,0.14)",
  border: "1px solid rgba(0,0,0,0.09)",
  text: "#1f2937",
  gray: "#6b7280",
  footer: "#9ca3af",
  sep: "#f1f2f4",
  hover: "#f3f4f6",
};

export const FPS = 30;
export const W = 1920;
export const H = 1080;
