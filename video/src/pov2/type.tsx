import React, { useLayoutEffect, useRef, useState } from "react";
import { FONT, S } from "../pov/brand";
import { EZ, lerp, seg } from "./timeline";

/**
 * Bord bas du masque d'un mot qui monte : calé juste sous la ligne de base
 * pendant 80 % de la montée (le mot sort de sa propre ligne, pas de points
 * isolés dessous), puis il descend pour libérer les jambages (p, q, j, y).
 */
function maskEdge(p: number): string {
  const edge = p < 0.8 ? 0.95 : lerp(0.95, 1.55, (p - 0.8) / 0.2);
  return `linear-gradient(to bottom, #000 0, #000 ${edge - 0.07}em, transparent ${edge + 0.07}em)`;
}

/** Unité de texte qui monte derrière un masque (mot ou groupe de mots). */
export interface Unit {
  w: string;
  at: number;
  /** italique acide (Fraunces) */
  em?: boolean;
}

/**
 * Ligne display Fraunces à la ligne de base (x, baseline). Chaque unité monte
 * dans son masque. L'unité accentuée : italique acide + resserrement
 * d'interlettrage 0.04em → −0.01em. Titres desserrés : −0.022em.
 */
export const Line: React.FC<{
  f: number;
  units: Unit[];
  x: number;
  baseline: number;
  size: number;
  dur?: number;
  settle?: number;
  skewEm?: boolean;
  align?: "left" | "center";
  color?: string;
  weight?: number;
  opacity?: number;
  dy?: number;
}> = ({
  f,
  units,
  x,
  baseline,
  size,
  dur = 16,
  settle = 18,
  skewEm = false,
  align = "left",
  color = S.paper,
  weight = 400,
  opacity = 1,
  dy = 0,
}) => (
  <div
    style={{
      position: "absolute",
      left: align === "left" ? x : 0,
      width: align === "center" ? 1920 : undefined,
      top: baseline - size * 0.82 + dy,
      display: "flex",
      justifyContent: align === "center" ? "center" : "flex-start",
      columnGap: size * 0.25,
      fontFamily: FONT.display,
      fontWeight: weight,
      fontSize: size,
      lineHeight: 1,
      letterSpacing: "-0.022em",
      color,
      whiteSpace: "nowrap",
      opacity,
    }}
  >
    {units.map((u, i) => {
      const p = seg(f, u.at, u.at + dur, EZ.SITE);
      const ls = u.em
        ? lerp(0.04, -0.01, seg(f, u.at, u.at + settle, EZ.SITE))
        : -0.022;
      return (
        <span
          key={i}
          style={{
            display: "inline-block",
            overflow: "hidden",
            padding: `0 ${size * 0.06}px ${size * 0.2}px`,
            margin: `0 ${-size * 0.06}px ${-size * 0.2}px`,
            // Bord bas du masque FONDU pendant la montée : le haut des lettres
            // n'apparaît plus en points isolés sous la ligne ; le fondu glisse
            // vers le bas avec la montée, les jambages sont entiers à l'arrivée.
            ...(p < 1
              ? {
                  maskImage: maskEdge(p),
                  WebkitMaskImage: maskEdge(p),
                }
              : {}),
          }}
        >
          <span
            style={{
              display: "inline-block",
              transform: `translateY(${(1 - p) * 140}%) skewX(${u.em && skewEm ? -6 * (1 - p) : 0}deg)`,
              fontStyle: u.em ? "italic" : "normal",
                visibility: p <= 0.001 ? "hidden" : "visible",
              color: u.em ? S.acid : color,
              letterSpacing: `${ls}em`,
            }}
          >
            {u.w}
          </span>
        </span>
      );
    })}
  </div>
);

/**
 * Sous-titre de la bande : Inter Tight 500 48 px. La ligne ENTIÈRE monte
 * derrière son masque (10 f) : le mot à mot faisait « sous-titres auto ».
 */
export const Subtitle: React.FC<{ f: number; text: string; inAt: number; outAt: number; x?: number; baseline?: number }> = ({
  f,
  text,
  inAt,
  outAt,
  x = 80,
  baseline = 1012,
}) => {
  if (f < inAt || f > outAt + 6) return null;
  const out = seg(f, outAt, outAt + 6, EZ.IN);
  const p = seg(f, inAt, inAt + 10, EZ.OUT);
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: baseline - 48 * 0.8,
        overflow: "hidden",
        paddingBottom: 12,
        opacity: 1 - out,
        transform: `translateY(${-10 * out}px)`,
      }}
    >
      <div
        style={{
          fontFamily: FONT.sans,
          fontWeight: 500,
          fontSize: 48,
          lineHeight: 1,
          letterSpacing: "-0.005em",
          color: S.paper,
          whiteSpace: "nowrap",
          transform: `translateY(${(1 - p) * 110}%)`,
        }}
      >
        {text}
      </div>
    </div>
  );
};

/** Label JetBrains Mono en capitales. */
export const MonoLabel: React.FC<{
  text: string;
  x: number;
  baseline: number;
  size?: number;
  tracking?: number;
  color?: string;
  opacity?: number;
  dy?: number;
  align?: "left" | "right";
}> = ({
  text,
  x,
  baseline,
  size = 34,
  tracking = 0.2,
  color = "rgba(251,249,244,0.6)",
  opacity = 1,
  dy = 0,
  align = "left",
}) => (
  <div
    style={{
      position: "absolute",
      left: align === "left" ? x : undefined,
      right: align === "right" ? 1920 - x : undefined,
      top: baseline - size * 0.8 + dy,
      fontFamily: FONT.mono,
      fontWeight: 500,
      fontSize: size,
      lineHeight: 1,
      letterSpacing: `${tracking}em`,
      textTransform: "uppercase",
      color,
      opacity,
      whiteSpace: "nowrap",
    }}
  >
    {text}
  </div>
);

/** Mesure DOM d'une largeur de texte (déterministe, après chargement des polices). */
export function useTextWidth(
  text: string,
  style: React.CSSProperties,
): [React.RefObject<HTMLSpanElement | null>, number] {
  const ref = useRef<HTMLSpanElement>(null);
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    if (ref.current) {
      const nw = ref.current.getBoundingClientRect().width;
      if (Math.abs(nw - w) > 0.25) setW(nw);
    }
  });
  void text;
  void style;
  return [ref, w];
}
