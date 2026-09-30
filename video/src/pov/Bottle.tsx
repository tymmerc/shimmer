import React from "react";

export type BottleShape = "bordeaux" | "bourgogne" | "flute";

export interface BottleLook {
  shape: BottleShape;
  /** couleur du verre */
  glass: string;
  /** couleur de l'étiquette */
  label: string;
  /** couleur du texte / filet de l'étiquette */
  ink: string;
  /** capsule */
  cap: string;
  /** repli court (inutilisé si `lines` est fourni) */
  mark: string;
  /** appellation en petites capitales, une ou deux lignes (« CROZES », « HERMITAGE ») */
  lines?: string[];
}

// Silhouettes (viewBox 0 0 60 200). Bordelaise : épaules marquées.
// Bourguignonne : épaules tombantes. Flûte : longue et fine (Muscadet, Alsace).
const PATHS: Record<BottleShape, string> = {
  bordeaux:
    "M24 6 h12 v44 c0 8 16 12 16 28 v108 c0 5 -4 8 -8 8 h-28 c-4 0 -8 -3 -8 -8 v-108 c0 -16 16 -20 16 -28 z",
  bourgogne:
    "M25 6 h10 v40 c0 18 19 26 19 48 v92 c0 5 -4 8 -8 8 h-32 c-4 0 -8 -3 -8 -8 v-92 c0 -22 19 -30 19 -48 z",
  flute:
    "M26 4 h8 v52 c0 20 13 30 13 52 v80 c0 4 -3 8 -7 8 h-20 c-4 0 -7 -4 -7 -8 v-80 c0 -22 13 -32 13 -52 z",
};

// Zone d'étiquette par silhouette (x, y, w, h).
const LABEL: Record<BottleShape, [number, number, number, number]> = {
  bordeaux: [11, 112, 38, 50],
  bourgogne: [9, 116, 42, 48],
  flute: [15, 118, 30, 44],
};

const CAP: Record<BottleShape, [number, number, number, number]> = {
  bordeaux: [23, 4, 14, 34],
  bourgogne: [24, 4, 12, 32],
  flute: [25, 2, 10, 38],
};

// Corps de la bouteille (sous les épaules) : le reflet vertical y reste,
// sinon il dépasse du goulot pendant les mouvements de caméra.
const BODY: Record<BottleShape, [number, number]> = {
  bordeaux: [84, 108],
  bourgogne: [96, 96],
  flute: [110, 76],
};

/**
 * Bouteille illustrée en SVG : verre dégradé avec reflet, capsule, étiquette
 * sobre portant l'appellation en petites capitales. Pas de photo, pas
 * d'émoji. `size` = hauteur en px. `sweep` (0..1) : balayage de lumière
 * contenu dans la silhouette.
 */
export const Bottle: React.FC<{
  look: BottleLook;
  size: number;
  id: string;
  style?: React.CSSProperties;
  sweep?: number;
}> = ({ look, size, id, style, sweep }) => {
  const [lx, ly, lw, lh] = LABEL[look.shape];
  const [cx, cy, cw, ch] = CAP[look.shape];
  const [by, bh] = BODY[look.shape];
  const g = `g-${id}`;
  const r = `r-${id}`;
  const sw = `s-${id}`;
  const clip = `c-${id}`;
  const lines = look.lines && look.lines.length > 0 ? look.lines : [look.mark];
  const longest = Math.max(...lines.map((l) => l.length));
  // Petites capitales Cormorant ≈ 0,62 em par caractère + interlettrage.
  const fs = Math.min(
    lines.length > 1 ? 6.2 : 7.4,
    (lw - 6) / (longest * 0.62 + 0.25 * longest * 0.1),
  );
  const lineGap = fs * 1.15;
  const textTop = ly + lh / 2 - ((lines.length - 1) * lineGap) / 2 + fs * 0.34;
  return (
    <svg
      viewBox="0 0 60 200"
      height={size}
      width={size * 0.3}
      style={{ overflow: "visible", ...style }}
    >
      <defs>
        <linearGradient id={g} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor={look.glass} stopOpacity="0.95" />
          <stop offset="0.45" stopColor={look.glass} stopOpacity="0.78" />
          <stop offset="1" stopColor={look.glass} stopOpacity="1" />
        </linearGradient>
        <linearGradient id={r} x1="0" x2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.38" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={sw} x1="0" x2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.22" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <clipPath id={clip}>
          <path d={PATHS[look.shape]} />
        </clipPath>
      </defs>
      {/* ombre portée */}
      <ellipse cx="30" cy="196" rx="24" ry="3.2" fill="rgba(0,0,0,0.18)" />
      <path d={PATHS[look.shape]} fill={`url(#${g})`} />
      <g clipPath={`url(#${clip})`}>
        {/* reflet vertical, limité au corps */}
        <rect x="14" y={by} width="7" height={bh} fill={`url(#${r})`} />
        {/* capsule */}
        <rect x={cx} y={cy} width={cw} height={ch} rx="2" fill={look.cap} />
        <rect
          x={cx}
          y={cy + ch - 3}
          width={cw}
          height="1.2"
          fill="rgba(0,0,0,0.25)"
        />
        {/* étiquette */}
        <rect x={lx} y={ly} width={lw} height={lh} rx="1.5" fill={look.label} />
        <rect
          x={lx + 3}
          y={ly + 4}
          width={lw - 6}
          height="0.6"
          fill={look.ink}
          opacity="0.5"
        />
        {lines.map((t, i) => (
          <text
            key={i}
            x={lx + lw / 2}
            y={textTop + i * lineGap}
            textAnchor="middle"
            fontFamily="'Cormorant Garamond', Georgia, serif"
            fontWeight="700"
            fontSize={fs}
            fill={look.ink}
            letterSpacing={fs * 0.1}
          >
            {t}
          </text>
        ))}
        <rect
          x={lx + 3}
          y={ly + lh - 5}
          width={lw - 6}
          height="0.6"
          fill={look.ink}
          opacity="0.5"
        />
        {/* balayage de lumière, contenu dans le verre */}
        {sweep !== undefined && sweep > 0 && sweep < 1 && (
          <rect
            x={-30 + 110 * sweep}
            y="0"
            width="22"
            height="200"
            fill={`url(#${sw})`}
          />
        )}
      </g>
    </svg>
  );
};
