import { cursorAt } from "../pov/Cursor";
import type { NativeState } from "./ShopPage";
import { SDK } from "./script";
import type { DockUI } from "./ShimmerDock";
import {
  DOCK_T as T,
  EZ,
  SCROLL,
  seg,
  TYPE_EMAIL_START,
  typed,
} from "./timeline";
import { soldOutReply, type Variant } from "./variant";

const P1 = SDK.placeholderConv;

/** Caret : plein pendant la frappe et 10 f après, puis clignote (16 f, 50 %). */
function caretOn(f: number, since: number): boolean {
  const d = f - since;
  if (d < 10) return true;
  return (d - 10) % 16 < 8;
}
const lastKey = (f: number, frames: number[], fallback: number) => {
  let last = fallback;
  for (const k of frames) if (k <= f) last = k;
  return last;
};

/** Barre de recherche native du thème. */
export function barAt(v: Variant, f: number): NativeState {
  const P0 = v.shop.placeholder;
  const { q1, q2, q3 } = v.typed;
  const { q1: K1, q2: K2, q3: K3 } = v.typing;
  if (f >= 1290)
    return { value: "", placeholder: P1, focus: false, caret: false };
  if (f < 246)
    return { value: "", placeholder: P0, focus: false, caret: false };
  if (f < T.chipClick) {
    const val = typed(f, q1, K1);
    return {
      value: val,
      placeholder: P0,
      focus: true,
      caret: caretOn(f, lastKey(f, K1, 246)),
    };
  }
  if (f < T.reply1)
    return { value: q1, placeholder: P0, focus: false, caret: false };
  if (f < T.reply2) {
    const val = typed(f, q2, K2);
    return {
      value: val,
      placeholder: P1,
      focus: true,
      caret: caretOn(f, lastKey(f, K2, T.reply1)),
    };
  }
  if (f < T.soldout) {
    const val = f >= K3[0] ? typed(f, q3, K3) : "";
    return {
      value: val,
      placeholder: P1,
      focus: true,
      caret: caretOn(f, lastKey(f, K3, T.reply2)),
    };
  }
  if (f < T.emailClick)
    return {
      value: "",
      placeholder: P1,
      focus: true,
      caret: caretOn(f, T.soldout),
    };
  return { value: "", placeholder: P1, focus: false, caret: false };
}

const FOOTER: [string, string] = [SDK.footerNative, SDK.footerClose];

/** Dock (null avant l'ouverture). `enterOverride` : 1 pour les sondes de mesure. */
export function dockAt(v: Variant, f: number): DockUI | null {
  // Récap S10 : le dock tel que le client l’a laissé (confirmation verte).
  if (f >= 1290) return dockAt(v, 1091);
  if (f < T.open) return null;
  const enter = seg(f, T.open, T.open + 6, EZ.CSS);
  const { guided, replies, typed: ty } = v;
  if (f < T.chipClick) {
    const hover = seg(f, 394, 399, EZ.CSS);
    return {
      enter,
      rows: [],
      question: guided.question(ty.q1),
      chips: {
        labels: guided.chips,
        fill: guided.chips.map((_, i) => (i === guided.pick ? hover : 0)),
      },
      footer: FOOTER,
    };
  }
  if (f < T.reply1)
    return { enter, rows: [], question: SDK.thinking, footer: FOOTER };
  if (f < T.enter2)
    return { enter, rows: replies.rows1, question: replies.r1, footer: FOOTER };
  if (f < T.reply2)
    return {
      enter,
      rows: replies.rows1,
      question: SDK.thinking,
      footer: FOOTER,
    };
  // Pas de survol de ligne : dans le SDK, une ligne du dock n’est pas un lien.
  if (f < T.enter3)
    return { enter, rows: replies.rows2, question: replies.r2, footer: FOOTER };
  if (f < T.soldout)
    return {
      enter,
      rows: replies.rows2,
      question: SDK.thinking,
      footer: FOOTER,
    };
  const n = Math.max(0, Math.min(ty.email.length, f - TYPE_EMAIL_START + 1));
  const inputFocus = f >= T.emailClick;
  const name = replies.soldOut.name;
  return {
    enter,
    rows: replies.rows3,
    question: soldOutReply(replies.soldOut, replies.alt),
    footer: FOOTER,
    restock: {
      name,
      title: SDK.restockTitle(name),
      placeholder: SDK.restockPh,
      btn: SDK.restockBtn,
      doneText: SDK.restockDone(name),
      done: f >= T.done,
      email: f >= TYPE_EMAIL_START ? ty.email.slice(0, n) : "",
      inputFocus,
      caret:
        inputFocus &&
        f < T.btnClick &&
        caretOn(f, Math.max(T.emailClick, TYPE_EMAIL_START + n - 1)),
      btnDisabled: f >= T.btnClick,
    },
  };
}

export const scrollAt = (f: number) => (f >= 1290 ? 360 : SCROLL(f));

// ── Curseur (coordonnées viewport) ──────────────────────────────────────────
export type CursorShape = "arrow" | "ibeam" | "pointer";
export interface CursorState {
  x: number;
  y: number;
  shape: CursorShape;
  opacity: number;
  press: number;
  ring: number; // frames depuis le dernier clic, −1 si aucun
}

/**
 * Cibles du curseur, mesurées sur le dock rendu (puce choisie, champ email,
 * bouton) : les libellés changent d'une variante à l'autre. Valeurs de repli =
 * mesures du film 1.
 */
export interface DockTargets {
  chip: [number, number];
  input: [number, number];
  button: [number, number];
  /** bas du dock dans l'état du récap (confirmation), px viewport */
  recapBottom: number;
}
export const FILM1_TARGETS: DockTargets = {
  chip: [611, 161],
  input: [661, 173],
  button: [891, 173],
  recapBottom: 430,
};

const CLICKS = [246, 404, 1002, 1036];

export function cursorState(f: number, tg: DockTargets): CursorState | null {
  const press = CLICKS.reduce(
    (p, c) =>
      Math.max(p, f >= c - 3 && f <= c + 3 ? 1 - Math.abs(f - c) / 3 : 0),
    0,
  );
  const last = CLICKS.filter((c) => c <= f).pop();
  const ring = last !== undefined && f - last < 8 ? f - last : -1;
  const base = { press, ring };
  if (f >= 214 && f < 432) {
    const p = cursorAt(f, [
      { f: 214, x: 840, y: 700 },
      { f: 244, x: 540, y: 51 },
      { f: 252, x: 540, y: 51 },
      { f: 270, x: 1030, y: 200 },
      { f: 376, x: 1030, y: 200 },
      { f: 396, x: tg.chip[0], y: tg.chip[1] },
    ]);
    const shape: CursorShape =
      f < 238 ? "arrow" : f < 252 ? "ibeam" : f < 390 ? "arrow" : "pointer";
    return { ...p, shape, opacity: 1 - seg(f, 424, 432), ...base };
  }
  if (f >= 986 && f < 1060) {
    const p = cursorAt(f, [
      { f: 986, x: 1060, y: 300 },
      { f: 1000, x: tg.input[0], y: tg.input[1] },
      { f: 1026, x: tg.input[0], y: tg.input[1] },
      { f: 1034, x: tg.button[0], y: tg.button[1] },
    ]);
    const shape: CursorShape =
      f < 996 ? "arrow" : f < 1028 ? "ibeam" : "pointer";
    return {
      ...p,
      shape,
      opacity: seg(f, 986, 992) * (1 - seg(f, 1052, 1060)),
      ...base,
    };
  }
  return null;
}
