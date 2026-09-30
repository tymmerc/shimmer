import React from "react";
import { Easing, interpolate } from "remotion";
import { FONT, S } from "./brand";

const OUT = Easing.bezier(0.16, 1, 0.3, 1);
const IN = Easing.bezier(0.7, 0, 0.84, 0);

/**
 * Ligne display Fraunces, mot par mot : chaque mot monte derrière un masque
 * (clip), décalé. Syntaxe : *mot* = italique acide (comme le site).
 * Les titres display sont desserrés : -0.022em, interligne 1.02.
 */
export const Kinetic: React.FC<{
  frame: number;
  text: string;
  /** frame d'entrée du premier mot */
  at: number;
  /** frame de sortie (tous les mots redescendent), optionnel */
  out?: number;
  size: number;
  color?: string;
  accent?: string;
  stagger?: number;
  dur?: number;
  align?: "left" | "center";
  maxWidth?: number;
  font?: string;
  weight?: number;
  style?: React.CSSProperties;
}> = ({
  frame,
  text,
  at,
  out,
  size,
  color = S.paper,
  accent = S.acid,
  stagger = 3,
  dur = 18,
  align = "left",
  maxWidth,
  font = FONT.display,
  weight = 400,
  style,
}) => {
  // Découpe en jetons, en gardant les groupes *...* comme un seul style.
  const tokens: { w: string; em: boolean }[] = [];
  const re = /\*([^*]+)\*|(\S+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m[1]) m[1].split(/\s+/).forEach((w) => tokens.push({ w, em: true }));
    else tokens.push({ w: m[2], em: false });
  }
  return (
    <div
      style={{
        fontFamily: font,
        fontSize: size,
        fontWeight: weight,
        lineHeight: 1.08,
        letterSpacing: "-0.022em",
        color,
        textAlign: align,
        maxWidth,
        display: "flex",
        flexWrap: "wrap",
        justifyContent: align === "center" ? "center" : "flex-start",
        columnGap: size * 0.26,
        ...style,
      }}
    >
      {tokens.map((t, i) => {
        const pIn = interpolate(
          frame,
          [at + i * stagger, at + i * stagger + dur],
          [0, 1],
          {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: OUT,
          },
        );
        const pOut =
          out === undefined
            ? 0
            : interpolate(frame, [out + i * 1.5, out + i * 1.5 + 12], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: IN,
              });
        const y = (1 - pIn) * 105 - pOut * 105;
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              overflow: "hidden",
              paddingBottom: size * 0.12,
              marginBottom: -size * 0.12,
            }}
          >
            <span
              style={{
                display: "inline-block",
                transform: `translateY(${y}%)`,
                fontStyle: t.em ? "italic" : "normal",
                color: t.em ? accent : color,
              }}
            >
              {t.w}
            </span>
          </span>
        );
      })}
    </div>
  );
};

/** Petit label JetBrains Mono en capitales espacées (eyebrow). */
export const Mono: React.FC<{
  frame: number;
  at: number;
  out?: number;
  children: string;
  size?: number;
  color?: string;
  style?: React.CSSProperties;
}> = ({ frame, at, out, children, size = 20, color = S.acid, style }) => {
  const pIn = interpolate(frame, [at, at + 14], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: OUT,
  });
  const pOut =
    out === undefined
      ? 0
      : interpolate(frame, [out, out + 10], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
  // Les lettres se révèlent de gauche à droite (clip), pas de fondu mou.
  return (
    <div
      style={{
        fontFamily: FONT.mono,
        fontSize: size,
        letterSpacing: "0.24em",
        textTransform: "uppercase",
        color,
        opacity: 1 - pOut,
        clipPath: `inset(0 ${(1 - pIn) * 100}% 0 0)`,
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {children}
    </div>
  );
};
