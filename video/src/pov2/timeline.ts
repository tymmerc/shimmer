import { Easing, interpolate } from "remotion";

// Toutes les constantes de temps du film (30 fps, 1590 frames = 53 s).
export const DURATION = 1590;

export const EZ = {
  OUT: Easing.bezier(0.16, 1, 0.3, 1),
  INOUT: Easing.bezier(0.65, 0, 0.35, 1),
  SITE: Easing.bezier(0.22, 1, 0.36, 1),
  CURTAIN: Easing.bezier(0.76, 0, 0.24, 1),
  IN: Easing.bezier(0.7, 0, 0.84, 0),
  CSS: Easing.bezier(0.25, 0.1, 0.25, 1),
  LIN: (t: number) => t,
};

/** 0..1 entre deux frames, bornée, avec easing. */
export const seg = (
  f: number,
  a: number,
  b: number,
  ease: (t: number) => number = EZ.LIN,
) =>
  interpolate(f, [a, b], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease,
  });

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Valeur par paliers : [[frame, v, easing?], ...] interpolée entre paliers. */
export function keyed(
  f: number,
  keys: Array<[number, number, ((t: number) => number)?]>,
): number {
  if (f <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) {
    const [fa, va] = keys[i];
    const [fb, vb, e] = keys[i + 1];
    if (f <= fb) return lerp(va, vb, seg(f, fa, fb, e ?? EZ.LIN));
  }
  return keys[keys.length - 1][1];
}

/** Ligne de rideau : fenêtre visible pour y < Y, calque « vie » pour y ≥ Y. */
export const curtainY = (f: number) =>
  keyed(f, [
    [0, 0],
    [120, 0],
    [138, 900, EZ.CURTAIN],
    [1092, 900],
    [1110, 0, EZ.CURTAIN],
    [1290, 0],
    [1308, 900, EZ.CURTAIN],
  ]);

/** Voile ink sur la toxine : visibilité de la toxine = 1 − O. */
export const toxinVeil = (f: number) =>
  keyed(f, [
    [0, 1],
    [18, 0.3, EZ.OUT],
    [120, 0.3],
    [138, 1],
    [1092, 1],
    [1110, 0.6],
    [1290, 0.6],
    [1308, 1],
    [1415, 1],
    [1445, 0, (t) => t * t * (3 - 2 * t)],
  ]);

/** Frappe : liste des frames où chaque caractère apparaît. */
export const TYPE_Q1 = [256, 259, 263, 265, 269];
export const TYPE_Q2 = [
  586, 588, 589, 591, 593, 594, 596, 598, 599, 601, 603, 604, 606, 608, 613,
  615, 616, 618, 620, 621, 623, 625, 626, 628,
];
export const TYPE_Q3 = [
  856, 857, 859, 860, 862, 863, 865, 866, 867, 869, 870, 872, 874, 875, 877,
  878, 879, 881, 882, 884, 885, 886, 888, 890,
];
export const TYPE_EMAIL_START = 1005;

export const typed = (f: number, text: string, frames: number[]) => {
  let n = 0;
  while (n < frames.length && f >= frames[n]) n++;
  return text.slice(0, n);
};

/** Frames clés du dock (bascules instantanées du SDK). */
export const DOCK_T = {
  open: 300,
  chipClick: 404,
  reply1: 444,
  enter2: 639,
  reply2: 672,
  enter3: 893,
  soldout: 926,
  emailClick: 1002,
  btnClick: 1036,
  done: 1048,
};

export const SCROLL = (f: number) =>
  keyed(f, [
    [150, 0],
    [186, 360, EZ.INOUT],
  ]);

// ── Horloge « histoire » ─────────────────────────────────────────────────────
// Tous les minutages ci-dessus sont en frames HISTOIRE. Le film les rejoue avec
// des passages calmes étirés (temps de lecture ≥ 3 mots/s une fois le texte
// lisible) et les attentes du vendeur resserrées. [début, fin, frames ajoutées]
const STRETCH: Array<[number, number, number]> = [
  [0, 120, 40], // S01 : la conversation se lit (frappe, message, réponse)
  [150, 240, -35], // S02 : défilement plus vif
  [320, 376, 30], // S04 : lire la question du vendeur
  [506, 560, 36], // S05 : lire la réponse 1
  [694, 760, 30], // S06 : lire la réponse 2
  [950, 986, 10], // S07 : lire l'encart épuisé
  [1003, 1024, 12], // S07 : l'email se tape à une vitesse humaine
  [1068, 1092, 39], // S07 : lire la confirmation (+3 : « samedi » tombe sur la mesure 17)
  [1112, 1151, 10], // S08 : les mots montent
  [1151, 1178, 33], // S08 : samedi, 20 h 15 se tient (−3 : la suite ne bouge pas)
  [1232, 1284, 24], // S09 : l'email est de retour
  [1356, 1415, -25], // S10 : récap plus serré
  [1443, 1455, 20], // S10 : « C'était Shimmer. » se tient
];
const END_HOLD = 45;

export const FILM_DURATION = DURATION + STRETCH.reduce((s, [, , e]) => s + e, 0) + END_HOLD;

/** Frame film → frame histoire (fractionnaire, monotone). */
export function storyAt(F: number): number {
  let film = 0;
  let story = 0;
  for (const [a, b, extra] of STRETCH) {
    const id = a - story;
    if (F < film + id) return story + (F - film);
    film += id;
    story = a;
    const len = b - a + extra;
    if (F < film + len) return a + ((F - film) * (b - a)) / len;
    film += len;
    story = b;
  }
  return Math.min(story + (F - film), DURATION - 0.001);
}
