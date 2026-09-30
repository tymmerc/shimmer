import { EZ, seg } from "./timeline";

// Caméra de la prise « boutique ». Coordonnées = viewport CSS (1440 × 673).
// La fenêtre (40,40, 1840×860) affiche le viewport à k = 1840/1440 ; le zoom
// caméra z multiplie : m = k·z. Centre de la fenêtre = (960,470) à l'écran.

export const VW = 1440;
export const VH = 673;
export const WIN = { x: 40, y: 40, w: 1840, h: 860 };
export const K = WIN.w / VW;

type Ease = (t: number) => number;
interface Key {
  f: number;
  z: number;
  fx: number;
  fy: number;
  e?: Ease;
}

const FOLLOW_START_1 = 580;
const FOLLOW_END_1 = 639;
const FOLLOW_START_2 = 854;
const FOLLOW_END_2 = 893;

/** Largeur approx. du texte tapé (DM Sans 400 16 px ≈ 8,2 px/caractère). */
const textW = (n: number) => n * 8.2;

/** Suiveur de caret précalculé (déterministe) : fx += (cible − fx)·0.16 / frame. */
function follower(start: number, end: number, frames: number[]): number[] {
  const out: number[] = [];
  let fx = 600;
  for (let f = start; f <= end; f++) {
    let n = 0;
    while (n < frames.length && f >= frames[n]) n++;
    const caretX = 509 + textW(n);
    const target = Math.min(760, Math.max(600, caretX + 20));
    fx += (target - fx) * 0.16;
    out.push(fx);
  }
  return out;
}

import { TYPE_Q2, TYPE_Q3 } from "./timeline";
const F1 = follower(FOLLOW_START_1, FOLLOW_END_1, TYPE_Q2);
const F2 = follower(FOLLOW_START_2, FOLLOW_END_2, TYPE_Q3);

const KEYS: Key[] = [
  { f: 120, z: 1.0, fx: 720, fy: 336.5 },
  { f: 150, z: 1.0, fx: 720, fy: 336.5 },
  { f: 186, z: 1.5, fx: 480, fy: 448.7, e: EZ.INOUT },
  { f: 212, z: 1.5, fx: 760, fy: 448.7, e: EZ.INOUT },
  { f: 240, z: 1.9, fx: 720, fy: 177.1, e: EZ.INOUT },
  { f: 300, z: 1.96, fx: 720, fy: 177.1 },
  { f: 320, z: 2.0, fx: 720, fy: 168.3, e: EZ.OUT },
  { f: 404, z: 2.0, fx: 720, fy: 168.3 },
  { f: 424, z: 2.15, fx: 720, fy: 156.5, e: EZ.INOUT },
  { f: 444, z: 2.15, fx: 720, fy: 156.5 },
  { f: 468, z: 1.9, fx: 720, fy: 240, e: EZ.OUT },
  { f: 486, z: 1.9, fx: 720, fy: 240 },
  { f: 506, z: 2.15, fx: 720, fy: 262, e: EZ.INOUT },
  { f: 560, z: 2.18, fx: 720, fy: 262 },
  { f: 580, z: 2.6, fx: 600, fy: 129.4, e: EZ.INOUT },
  // F1 : suivi du caret (fx) entre 580 et 639, voir camAt
  { f: 639, z: 2.6, fx: F1[F1.length - 1], fy: 129.4 },
  { f: 661, z: 2.0, fx: 720, fy: 300, e: EZ.INOUT },
  { f: 672, z: 2.0, fx: 720, fy: 300 },
  { f: 694, z: 2.1, fx: 720, fy: 235, e: EZ.OUT },
  { f: 760, z: 2.1, fx: 720, fy: 235 },
  { f: 784, z: 2.55, fx: 720, fy: 190, e: EZ.INOUT },
  { f: 834, z: 2.6, fx: 720, fy: 190 },
  { f: 854, z: 2.6, fx: 600, fy: 129.4, e: EZ.INOUT },
  // F2 : suivi du caret entre 854 et 893
  { f: 893, z: 2.6, fx: F2[F2.length - 1], fy: 129.4 },
  { f: 913, z: 2.0, fx: 720, fy: 260, e: EZ.INOUT },
  { f: 926, z: 2.0, fx: 720, fy: 260 },
  { f: 950, z: 2.4, fx: 720, fy: 214, e: EZ.OUT },
  { f: 1048, z: 2.44, fx: 720, fy: 214 },
  { f: 1068, z: 2.7, fx: 720, fy: 200, e: EZ.OUT },
  { f: 1092, z: 2.72, fx: 720, fy: 200 },
];

export interface Cam {
  z: number;
  fx: number;
  fy: number;
  dx: number;
  dy: number;
  m: number;
}

const r05 = (v: number) => Math.round(v * 2) / 2;

export function camAt(f: number): Cam {
  // Récap S10 : plan fixe, pas de dérive.
  if (f >= 1290) {
    // Récap S10 : plan fixe puis légère poussée vers la barre et le dock.
    const t = seg(f, 1312, 1410, EZ.INOUT);
    const zz = 1 + 0.24 * t;
    const fyy = Math.min(VH - 336.5 / zz, Math.max(336.5 / zz, 336.5 + (262 - 336.5) * t));
    return { z: zz, fx: 720, fy: fyy, dx: 0, dy: 0, m: K * zz };
  }

  let z: number;
  let fx: number;
  let fy: number;
  if (f <= KEYS[0].f) {
    ({ z, fx, fy } = KEYS[0]);
  } else if (f >= KEYS[KEYS.length - 1].f) {
    ({ z, fx, fy } = KEYS[KEYS.length - 1]);
  } else {
    let i = 0;
    while (i < KEYS.length - 1 && f > KEYS[i + 1].f) i++;
    const a = KEYS[i];
    const b = KEYS[i + 1];
    const t = seg(f, a.f, b.f, b.e ?? EZ.LIN);
    z = Math.exp(Math.log(a.z) + (Math.log(b.z) - Math.log(a.z)) * t);
    fx = a.fx + (b.fx - a.fx) * t;
    fy = a.fy + (b.fy - a.fy) * t;
  }
  // Suivi du caret pendant la frappe.
  if (f >= FOLLOW_START_1 && f <= FOLLOW_END_1) fx = F1[f - FOLLOW_START_1];
  if (f >= FOLLOW_START_2 && f <= FOLLOW_END_2) fx = F2[f - FOLLOW_START_2];

  // Petit « coup » de caméra quand le dock s'ouvre (la touche Entrée touche le fond).
  if (f >= 300 && f <= 310)
    z *= 1 + 0.03 * Math.sin(Math.PI * seg(f, 300, 310));

  // Bornes : on ne sort jamais du viewport.
  fx = Math.min(VW - 720 / z, Math.max(720 / z, fx));
  fy = Math.min(VH - 336.5 / z, Math.max(336.5 / z, fy));

  // Dérive « caméra à l'épaule », très légère, arrondie au demi-pixel.
  const live = f >= 138 && f < 1092;
  const dx = live ? r05(2 * Math.sin((2 * Math.PI * f) / 159)) : 0;
  const dy = live ? r05(1.5 * Math.sin((2 * Math.PI * f) / 123 + 1.1)) : 0;
  return { z, fx, fy, dx, dy, m: K * z };
}

/** Point viewport → coordonnées locales de la fenêtre (0..1840, 0..860). */
export function toWin(c: Cam, x: number, y: number): [number, number] {
  return [
    WIN.w / 2 + (x - c.fx) * c.m + c.dx,
    WIN.h / 2 + (y - c.fy) * c.m + c.dy,
  ];
}
