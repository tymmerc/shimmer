// Tous les textes du film. Deux familles :
// - les chaînes du SDK / du serveur, recopiées octet pour octet (espaces
//   normales, y compris avant « ? » et dans « »), sources citées ;
// - les textes écrits pour le film (bande, titres) : espaces fines insécables
//   (U+202F) avant ? ! : ; et dans « », jamais de tiret cadratin ni demi-cadratin.

const NB = " ";
/** Typographie française pour NOS textes (pas pour les chaînes du SDK). */
export const fr = (s: string) =>
  s
    .replace(/'/g, "\u2019")
    .replace(/ ([?!:;])/g, `${NB}$1`)
    .replace(/« /g, `«${NB}`)
    .replace(/ »/g, `${NB}»`);

// ── Chaînes SDK (sdk/src/shimmer.ts) ────────────────────────────────────────
export const SDK = {
  refineQ: (q: string) =>
    `Avec plaisir. Pour bien vous orienter sur «\u00A0${q}\u00A0», c'est pour quelle occasion\u00A0?`, // :870
  refineChips: [
    "Apéritif",
    "Un repas",
    "Un cadeau",
    "Découvrir",
    "Petit budget",
  ], // :871
  thinking: "Le vendeur réfléchit…", // setThinking
  placeholderConv: "Précisez, ou demandez autre chose…", // :923
  footerNative: "Voir les résultats classiques →", // :847
  footerClose: "Fermer",
  restockTitle: (name: string) =>
    [name, " est épuisé. Je vous préviens dès qu'il revient\u00A0?"] as const, // :960
  restockPh: "votre@email.fr",
  restockBtn: "Prévenez-moi",
  restockDone: (name: string) =>
    `C'est noté. Vous serez prévenu dès le retour de ${name}.`, // :985
};

// ── Réponses du vendeur ─────────────────────────────────────────────────────
// Le modèle local était saturé le 29/09 (Ollama en file d'attente, 2 min par
// requête) : les réponses 1 et 2 sont ÉCRITES dans le style réel du prompt
// (vouvoiement, pas de markdown, prix cités, 3 phrases max ; cartes = vins
// cités dans l'ordre, sinon les 3 premiers rouges en stock), pas capturées.
// D'où la mention « séquence reconstituée » au générique. La réplique
// « épuisé » suit le gabarit déterministe du code (sales-assistant.ts:301-318).
export const REPLY1 =
  "Pour un repas, le Beaujolais Villages 2022 à 14 € ou le Brouilly 2022 à 15 €. Vous servez quoi ?";
export const REPLY2 =
  "Pour 8 aux grillades, comptez 4 bouteilles : le Vacqueyras 2021 à 21 €, fruité et épicé, ou le Corbières 2022 à 12 €.";
export const REPLY3 =
  "Crozes-Hermitage 2021 est épuisé pour le moment. Je peux vous prévenir dès qu'il revient. En attendant, regardez Vacqueyras 2021 (21 €), c'est ce qui s'en rapproche le plus en vin rouge.";

// ── Saisies du client ───────────────────────────────────────────────────────
export const TYPED = {
  q1: "rouge",
  q2: "des grillades, on sera 8",
  q3: "et le crozes-hermitage ?",
  email: "camille@example.com",
};

// ── Email de retour de stock (apps/api/src/lib/stock-alerts.ts:109-123) ─────
export const RESTOCK_MAIL = {
  subject: "Crozes-Hermitage 2021 est de retour",
  preview:
    "Vous nous aviez demandé de vous prévenir : Crozes-Hermitage 2021 est de nouveau disponible.",
};

// ── Textes du film ──────────────────────────────────────────────────────────
export const FILM = {
  kicker: "VOTRE BOUTIQUE, CÔTÉ CLIENT",
  msgFrom: "Julien",
  msgTime: "18:42",
  msgBody: fr("Barbecue samedi, on sera 8. Tu t'occupes du vin ?"),
  /** La conversation autour du texto (messagerie générique, S01). */
  chat: {
    ydayDay: "Hier",
    ydayTime: "21:07",
    out0: fr("Tu me dis pour la date ?"),
    day: "Aujourd\u2019hui",
    time: "18:40",
    in1: fr("Ça y est, on a la date !"),
    out1: fr("Alors ?"),
    reply: fr("Je gère !"),
    delivered: "Distribué",
  },
  s01b: ["Je", fr("n'y"), "connais", "*rien.*"],
  band: {
    L1: fr("Je n'y connais rien."),
    L2: fr("Tous ces rouges… Je prends lequel ?"),
    L3: fr("Bon, on tente « rouge »."),
    L4: fr("Comme un caviste, il me demande l'occasion."),
    L5: fr("Je lui réponds direct dans la barre."),
    L6: fr("Ouf, là je sais quoi prendre."),
    L7: fr("Et ce Crozes épuisé, il revient quand ?"),
    L7b: fr("Il me prévient, et m'en propose un proche."),
    L8: fr("Ce vendeur IA était dans la barre de recherche."),
  },
  kicker2: "COULEURS ET POLICE RÉGLÉES À L\u2019INSTALLATION",
  keycap: "Entrée ↵",
  s08label: "SAMEDI, 20\u202FH\u202F15",
  s08a: ["Personne", fr("n'a"), "su", "que"],
  s08b: ["je", fr("n'y"), "connaissais", "*rien.*"],
  s09label: "8 JOURS PLUS TARD",
  s09time: "09:14",
  s09line: ["Ils", "ne", fr("m'ont"), "pas", "*oublié.*"],
  reveal: fr("C'était"),
  tagline: [
    ["Votre", "boutique"],
    ["*vend,*", "*répond*", "*et*", "*relance*"],
    ["toute", "seule."],
  ],
  /** URL affichée sous l’accroche (vide tant que le domaine n’est pas choisi). */
  url: "",
  disclosure: "Boutique de démo Shopify, séquence reconstituée.",
};

/** Garde-fou : aucun tiret cadratin / demi-cadratin dans nos textes. */
export function lintNoDashes(): void {
  const all = JSON.stringify({
    FILM,
    REPLY1,
    REPLY2,
    REPLY3,
    TYPED,
    RESTOCK_MAIL,
  });
  if (/[–—]/.test(all))
    throw new Error("script.ts : tiret cadratin/demi-cadratin interdit");
}
lintNoDashes();
