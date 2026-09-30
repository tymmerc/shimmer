import { cursorAt } from "../pov/Cursor";
import type { NativeState } from "./CavesPage";
import { REPLY1, REPLY2, REPLY3, SDK, TYPED } from "./script";
import type { DockUI } from "./ShimmerDock";
import {
  DOCK_T as T,
  EZ,
  SCROLL,
  seg,
  TYPE_EMAIL_START,
  TYPE_Q1,
  TYPE_Q2,
  TYPE_Q3,
  typed,
} from "./timeline";
import { W } from "./wines";

const P0 = "Rechercher un vin, une appellation…";
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
export function barAt(f: number): NativeState {
  if (f >= 1290)
    return { value: "", placeholder: P1, focus: false, caret: false };
  if (f < 246)
    return { value: "", placeholder: P0, focus: false, caret: false };
  if (f < T.chipClick) {
    const v = typed(f, TYPED.q1, TYPE_Q1);
    return {
      value: v,
      placeholder: P0,
      focus: true,
      caret: caretOn(f, lastKey(f, TYPE_Q1, 246)),
    };
  }
  if (f < T.reply1)
    return { value: TYPED.q1, placeholder: P0, focus: false, caret: false };
  if (f < T.reply2) {
    const v = typed(f, TYPED.q2, TYPE_Q2);
    return {
      value: v,
      placeholder: P1,
      focus: true,
      caret: caretOn(f, lastKey(f, TYPE_Q2, T.reply1)),
    };
  }
  if (f < T.soldout) {
    const v = f >= TYPE_Q3[0] ? typed(f, TYPED.q3, TYPE_Q3) : "";
    return {
      value: v,
      placeholder: P1,
      focus: true,
      caret: caretOn(f, lastKey(f, TYPE_Q3, T.reply2)),
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

/** Dock (null avant l'ouverture). */
export function dockAt(f: number): DockUI | null {
  // Récap S10 : le dock tel que le client l’a laissé (confirmation verte).
  if (f >= 1290) return dockAt(1091);
  if (f < T.open) return null;
  const enter = seg(f, T.open, T.open + 6, EZ.CSS);
  if (f < T.chipClick) {
    const hover = seg(f, 394, 399, EZ.CSS);
    return {
      enter,
      rows: [],
      question: SDK.refineQ(TYPED.q1),
      chips: { labels: SDK.refineChips, fill: [0, hover, 0, 0, 0] },
      footer: FOOTER,
    };
  }
  if (f < T.reply1)
    return { enter, rows: [], question: SDK.thinking, footer: FOOTER };
  const r1 = [W.beaujolais, W.brouilly];
  if (f < T.enter2)
    return { enter, rows: r1, question: REPLY1, footer: FOOTER };
  if (f < T.reply2)
    return { enter, rows: r1, question: SDK.thinking, footer: FOOTER };
  const r2 = [W.vacqueyras, W.corbieres];
  // Pas de survol de ligne : dans le SDK, une ligne du dock n’est pas un lien.
  if (f < T.enter3) return { enter, rows: r2, question: REPLY2, footer: FOOTER };
  if (f < T.soldout)
    return { enter, rows: r2, question: SDK.thinking, footer: FOOTER };
  const n = Math.max(0, Math.min(TYPED.email.length, f - TYPE_EMAIL_START + 1));
  const inputFocus = f >= T.emailClick;
  return {
    enter,
    rows: [W.vacqueyras, W.corbieres],
    question: REPLY3,
    footer: FOOTER,
    restock: {
      name: W.crozes.name,
      title: SDK.restockTitle(W.crozes.name),
      placeholder: SDK.restockPh,
      btn: SDK.restockBtn,
      doneText: SDK.restockDone(W.crozes.name),
      done: f >= T.done,
      email: f >= TYPE_EMAIL_START ? TYPED.email.slice(0, n) : "",
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

const CLICKS = [246, 404, 1002, 1036];

export function cursorState(f: number): CursorState | null {
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
      { f: 396, x: 611, y: 161 },
    ]);
    const shape: CursorShape =
      f < 238 ? "arrow" : f < 252 ? "ibeam" : f < 390 ? "arrow" : "pointer";
    return { ...p, shape, opacity: 1 - seg(f, 424, 432), ...base };
  }
  if (f >= 986 && f < 1060) {
    const p = cursorAt(f, [
      { f: 986, x: 1060, y: 300 },
      { f: 1000, x: 661, y: 173 },
      { f: 1026, x: 661, y: 173 },
      { f: 1034, x: 891, y: 173 },
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
