// Textes du film communs à toutes les variantes. Deux familles :
// - les chaînes du SDK / du serveur, recopiées octet pour octet (espaces
//   normales, y compris avant « ? » et dans « »), sources citées ;
// - les textes écrits pour le film (bande, titres) : espaces fines insécables
//   (U+202F) avant ? ! : ; et dans « », jamais de tiret cadratin ni demi-cadratin.
// Les textes propres à une boutique (texto, sous-titres, réponses du vendeur,
// produits) vivent dans variants/*.ts.

const NB = " ";
/** Typographie française pour NOS textes (pas pour les chaînes du SDK). */
export const fr = (s: string) =>
  s
    .replace(/'/g, "’")
    .replace(/ ([?!:;])/g, `${NB}$1`)
    .replace(/« /g, `«${NB}`)
    .replace(/ »/g, `${NB}»`);

// ── Chaînes SDK (sdk/src/shimmer.ts) ────────────────────────────────────────
// La question d'affinage et ses puces dépendent du métier : voir variant.ts
// (refineQuestion) et chaque variante.
export const SDK = {
  thinking: "Le vendeur réfléchit…", // setThinking
  placeholderConv: "Précisez, ou demandez autre chose…",
  footerNative: "Voir les résultats classiques →",
  footerClose: "Fermer",
  restockTitle: (name: string) =>
    [name, " est épuisé. Je vous préviens dès qu'il revient ?"] as const,
  restockPh: "votre@email.fr",
  restockBtn: "Prévenez-moi",
  restockDone: (name: string) =>
    `C'est noté. Vous serez prévenu dès le retour de ${name}.`,
};

// ── Textes du film, identiques pour toutes les boutiques ────────────────────
export const BRAND = {
  kicker: "VOTRE BOUTIQUE, CÔTÉ CLIENT",
  s08a: ["Personne", fr("n'a"), "su", "que"],
  s08b: ["je", fr("n'y"), "connaissais", "*rien.*"],
  s09line: ["Ils", "ne", fr("m'ont"), "pas", "*oublié.*"],
  reveal: fr("C'était"),
  tagline: [
    ["Votre", "boutique"],
    ["*vend,*", "*répond*", "*et*", "*relance*"],
    ["toute", "seule."],
  ],
  /** URL affichée sous l’accroche (vide tant que le domaine n’est pas choisi). */
  url: "",
};

/** Garde-fou : aucun tiret cadratin / demi-cadratin dans nos textes. */
export function lintNoDashes(): void {
  const all = JSON.stringify({
    BRAND,
    SDK: { ...SDK, restockTitle: SDK.restockTitle("x") },
  });
  if (/[–—]/.test(all))
    throw new Error("script.ts : tiret cadratin/demi-cadratin interdit");
}
lintNoDashes();
