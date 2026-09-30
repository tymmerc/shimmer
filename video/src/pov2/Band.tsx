import React from "react";
import { FONT, S } from "../pov/brand";
import { FILM } from "./script";
import { EZ, lerp, seg } from "./timeline";
import { MonoLabel, Subtitle } from "./type";

// Bande de pensée (y 900-1080, ink plat) : la seule couche de sous-titres.
const LINES: Array<[string, number, number]> = [
  [FILM.band.L2, 166, 250],
  [FILM.band.L3, 256, 340],
  [FILM.band.L4, 346, 444],
  [FILM.band.L5, 520, 639],
  [FILM.band.L6, 780, 828],
  [FILM.band.L7, 834, 893],
  [FILM.band.L7b, 930, 1000],
  [FILM.band.L8, 1312, 1415],
];

export const Band: React.FC<{ f: number }> = ({ f }) => {
  // L1 : après le crossfade (géré par S01Line2), tenu puis sorti 160-166.
  const l1 = f >= 138 && f < 167;
  const l1out = seg(f, 160, 166, EZ.IN);
  // L0 : surtitre marchand dans les 2 premières secondes.
  const k0in = seg(f, 6, 16);
  const k0ls = lerp(0.3, 0.16, seg(f, 6, 24, EZ.SITE));
  const k0out = seg(f, 96, 104, EZ.IN);
  // L9 : surtitre « réglées à l'installation » (S10).
  return (
    <>
      {f < 105 && (
        <MonoLabel
          text={FILM.kicker}
          x={80}
          baseline={1012}
          size={34}
          tracking={k0ls}
          color="rgba(251,249,244,0.7)"
          opacity={k0in * (1 - k0out)}
          dy={-8 * k0out}
        />
      )}
      {l1 && (
        <div
          style={{
            position: "absolute",
            left: 80,
            top: 1012 - 48 * 0.8,
            fontFamily: FONT.sans,
            fontWeight: 500,
            fontSize: 48,
            lineHeight: 1,
            letterSpacing: "-0.005em",
            color: S.paper,
            whiteSpace: "nowrap",
            opacity: 1 - l1out,
            transform: `translateY(${-10 * l1out}px)`,
          }}
        >
          {FILM.band.L1}
        </div>
      )}
      {LINES.map(([t, a, b]) => (
        <Subtitle key={t} f={f} text={t} inAt={a} outAt={b} />
      ))}
      {f >= 140 && f < 252 && (
        <MonoLabel
          text={FILM.kicker}
          x={80}
          baseline={950}
          size={34}
          tracking={0.16}
          color="rgba(251,249,244,0.85)"
          opacity={seg(f, 140, 150) * (1 - seg(f, 244, 252, EZ.IN))}
        />
      )}
      <Keycap f={f} inAt={286} press={297} out={310} />
      <Keycap f={f} inAt={626} press={636} out={650} />
      <Keycap f={f} inAt={880} press={890} out={904} />
    </>
  );
};

/** Touche « Entrée ↵ » : entre, s'enfonce (touche le fond à press+3), remonte, sort. */
const Keycap: React.FC<{
  f: number;
  inAt: number;
  press: number;
  out: number;
}> = ({ f, inAt, press, out }) => {
  if (f < inAt || f > out + 8) return null;
  const pin = seg(f, inAt, inAt + 6, EZ.OUT);
  const down =
    seg(f, press, press + 3, EZ.IN) *
    (1 - seg(f, press + 3, press + 7, EZ.OUT));
  const pout = seg(f, out, out + 8);
  return (
    <div
      style={{
        position: "absolute",
        left: 1420,
        top: 958,
        width: 188,
        height: 68,
        boxSizing: "border-box",
        borderRadius: 14,
        background: "rgba(251,249,244,0.06)",
        border: "1.5px solid rgba(251,249,244,0.35)",
        boxShadow: `0 ${lerp(5, 1, down)}px 0 rgba(251,249,244,0.16)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: FONT.mono,
        fontWeight: 500,
        fontSize: 30,
        color: "rgba(251,249,244,0.85)",
        opacity: pin * (1 - pout),
        transform: `translateY(${8 * (1 - pin) + 4 * down}px)`,
      }}
    >
      <span>Entrée</span>
      <svg width="26" height="22" viewBox="0 0 26 22" style={{ marginLeft: 12 }} fill="none" stroke="rgba(251,249,244,0.85)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 3v7a3 3 0 0 1-3 3H5" />
        <path d="M9 8l-5 5 5 5" />
      </svg>
    </div>
  );
};
