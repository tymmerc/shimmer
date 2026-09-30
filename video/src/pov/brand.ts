// Identité Shimmer (site V2 validé par Tym) + la boutique fictive Caves
// Forty-Two, qui NE doit PAS ressembler à Shimmer : c'est le site du marchand.
import { loadFont as loadFraunces } from "@remotion/google-fonts/Fraunces";
import { loadFont as loadInterTight } from "@remotion/google-fonts/InterTight";
import { loadFont as loadJetBrains } from "@remotion/google-fonts/JetBrainsMono";
import { loadFont as loadCormorant } from "@remotion/google-fonts/CormorantGaramond";
import { loadFont as loadDMSans } from "@remotion/google-fonts/DMSans";

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

export const FONT = {
  display: `${fr.fontFamily}, Georgia, serif`,
  sans: `${it.fontFamily}, system-ui, sans-serif`,
  mono: `${jb.fontFamily}, ui-monospace, monospace`,
  shopSerif: `${cg.fontFamily}, Georgia, serif`,
  shopSans: `${dm.fontFamily}, system-ui, sans-serif`,
};

/** Shimmer. */
export const S = {
  ink: "#0d0b14",
  ink2: "#15121f",
  paper: "#fbf9f4",
  acid: "#d4ff3a",
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
