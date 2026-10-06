import React from "react";
import { Bottle, type BottleLook } from "../pov/Bottle";

/**
 * Dessins des produits des boutiques fictives, dans le style des bouteilles du
 * film 1 : aplats doux, un dégradé de volume, un reflet, une ombre portée. Pas
 * de photo, pas d'émoji. Chaque dessin vit dans un viewBox de 100 de haut ;
 * `size` = hauteur en px, la largeur suit ASPECT.
 */

export type ArtKind =
  | "bottle"
  | "jar"
  | "wheel"
  | "saucisson"
  | "figatellu"
  | "slices"
  | "bag"
  | "gift"
  | "sweater"
  | "cardigan"
  | "dress"
  | "plush"
  | "sleepbag"
  | "rattle"
  | "bust"
  | "bangle"
  | "dropper"
  | "cream"
  | "soap";

export interface Art {
  kind: ArtKind;
  /** couleur principale */
  c1: string;
  c2?: string;
  c3?: string;
  /** étiquette en petites capitales (1 ou 2 lignes) */
  lines?: string[];
  /** variante de forme ou de motif (plain, cable, stripes, drop, pearl, moon, long, dots…) */
  pattern?: string;
  /** kind = bottle */
  look?: BottleLook;
}

export const ASPECT: Record<ArtKind, number> = {
  bottle: 0.3,
  jar: 0.8,
  wheel: 1.3,
  saucisson: 1.6,
  figatellu: 1.15,
  slices: 1.3,
  bag: 0.75,
  gift: 1.2,
  sweater: 1.1,
  cardigan: 1.1,
  dress: 0.8,
  plush: 0.75,
  sleepbag: 0.66,
  rattle: 0.6,
  bust: 0.85,
  bangle: 1.2,
  dropper: 0.4,
  cream: 1.1,
  soap: 1.4,
};

/** Hauteur à donner pour tenir dans une boîte carrée `box`. */
export const fitHeight = (kind: ArtKind, box: number) =>
  ASPECT[kind] > 1 ? box / ASPECT[kind] : box;

// ── Couleurs ────────────────────────────────────────────────────────────────
function hex(c: string): [number, number, number] {
  const h = c.replace("#", "");
  const n = parseInt(h.length === 3 ? h.replace(/./g, "$&$&") : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
/** amt < 0 : vers le noir ; amt > 0 : vers le blanc. */
export function shade(c: string, amt: number): string {
  const [r, g, b] = hex(c);
  const t = amt < 0 ? 0 : 255;
  const k = Math.abs(amt);
  const m = (v: number) => Math.round(v + (t - v) * k);
  return `rgb(${m(r)},${m(g)},${m(b)})`;
}

const LABEL_FONT = "'Cormorant Garamond', Georgia, serif";

/** Dégradé horizontal de volume (bords plus sombres, centre plus clair). */
const Vol: React.FC<{ id: string; c: string; k?: number }> = ({
  id,
  c,
  k = 0.18,
}) => (
  <linearGradient id={id} x1="0" x2="1" y1="0" y2="0">
    <stop offset="0" stopColor={shade(c, -k)} />
    <stop offset="0.38" stopColor={shade(c, k * 0.35)} />
    <stop offset="0.62" stopColor={c} />
    <stop offset="1" stopColor={shade(c, -k * 1.2)} />
  </linearGradient>
);

const Shadow: React.FC<{ w: number; rx?: number }> = ({ w, rx }) => (
  <ellipse
    cx={w / 2}
    cy={97.6}
    rx={rx ?? w * 0.4}
    ry={1.9}
    fill="rgba(0,0,0,0.16)"
  />
);

/** Petites capitales centrées sur une étiquette. */
const LabelText: React.FC<{
  x: number;
  y: number;
  w: number;
  h: number;
  lines: string[];
  ink: string;
  max?: number;
}> = ({ x, y, w, h, lines, ink, max = 7.6 }) => {
  const longest = Math.max(...lines.map((l) => l.length), 1);
  const fs = Math.min(
    lines.length > 1 ? max * 0.84 : max,
    (w - 5) / (longest * 0.64),
  );
  const gap = fs * 1.12;
  const top = y + h / 2 - ((lines.length - 1) * gap) / 2 + fs * 0.34;
  return (
    <>
      {lines.map((t, i) => (
        <text
          key={i}
          x={x + w / 2}
          y={top + i * gap}
          textAnchor="middle"
          fontFamily={LABEL_FONT}
          fontWeight={700}
          fontSize={fs}
          letterSpacing={fs * 0.08}
          fill={ink}
        >
          {t}
        </text>
      ))}
    </>
  );
};

// ── Dessins ─────────────────────────────────────────────────────────────────
type P = { a: Art; id: string };

/** Pot (miel, confiture, terrine) : couvercle, verre, étiquette. */
const Jar: React.FC<P> = ({ a, id }) => {
  const lid = a.c3 ?? "#3b2f2a";
  const label = a.c2 ?? "#f4ecdf";
  return (
    <>
      <defs>
        <Vol id={`${id}v`} c={a.c1} k={0.22} />
        <Vol id={`${id}l`} c={lid} k={0.25} />
      </defs>
      <Shadow w={80} rx={30} />
      <rect x={9} y={24} width={62} height={73} rx={12} fill={`url(#${id}v)`} />
      <rect
        x={18}
        y={19}
        width={44}
        height={8}
        rx={2}
        fill={shade(a.c1, -0.25)}
      />
      <rect x={14} y={5} width={52} height={16} rx={3} fill={`url(#${id}l)`} />
      {[22, 30, 38, 46, 54].map((x) => (
        <rect
          key={x}
          x={x}
          y={7}
          width={1}
          height={12}
          fill="rgba(255,255,255,0.18)"
        />
      ))}
      <rect x={14} y={42} width={52} height={36} rx={2} fill={label} />
      <rect
        x={18}
        y={46}
        width={44}
        height={0.7}
        fill={shade(a.c1, -0.3)}
        opacity={0.5}
      />
      <rect
        x={18}
        y={73}
        width={44}
        height={0.7}
        fill={shade(a.c1, -0.3)}
        opacity={0.5}
      />
      {a.lines && (
        <LabelText
          x={14}
          y={44}
          w={52}
          h={30}
          lines={a.lines}
          ink={shade(a.c1, -0.45)}
        />
      )}
      <rect
        x={14}
        y={29}
        width={5}
        height={60}
        rx={2.5}
        fill="#fff"
        opacity={0.26}
      />
    </>
  );
};

/** Meule de fromage + une part posée devant. */
const Wheel: React.FC<P> = ({ a, id }) => {
  const rind = a.c1;
  const paste = a.c2 ?? "#f1e1b0";
  return (
    <>
      <defs>
        <Vol id={`${id}v`} c={rind} k={0.2} />
        <radialGradient id={`${id}t`} cx="0.45" cy="0.45" r="0.7">
          <stop offset="0" stopColor={shade(rind, 0.22)} />
          <stop offset="1" stopColor={shade(rind, 0.02)} />
        </radialGradient>
      </defs>
      <Shadow w={130} rx={56} />
      <path d="M8 40 V74 A54 15 0 0 0 116 74 V40 Z" fill={`url(#${id}v)`} />
      <ellipse cx={62} cy={40} rx={54} ry={15} fill={`url(#${id}t)`} />
      <ellipse
        cx={62}
        cy={40}
        rx={46}
        ry={11.5}
        fill="none"
        stroke={shade(rind, -0.12)}
        strokeWidth={0.8}
        opacity={0.6}
      />
      {/* part : dessus (croûte), face coupée (pâte), flanc (croûte) */}
      <path d="M74 66 L126 60 L120 76 Z" fill={shade(rind, 0.16)} />
      <path d="M74 66 L120 76 L120 93 L74 83 Z" fill={paste} />
      <path d="M120 76 L126 60 L126 77 L120 93 Z" fill={shade(rind, -0.1)} />
      {[
        [86, 74, 1.6],
        [98, 80, 1.2],
        [108, 82, 1.8],
        [92, 84, 1.1],
      ].map(([x, y, r], i) => (
        <ellipse
          key={i}
          cx={x}
          cy={y}
          rx={r}
          ry={r * 0.7}
          fill={shade(paste, -0.14)}
        />
      ))}
      <rect
        x={14}
        y={46}
        width={6}
        height={30}
        rx={3}
        fill="#fff"
        opacity={0.14}
      />
    </>
  );
};

/** Saucisson (fleur blanche, ficelle) + deux tranches. */
const Saucisson: React.FC<P> = ({ a, id }) => {
  const bloom = a.c2 ?? "#ece5d8";
  const meat = a.c1;
  return (
    <>
      <defs>
        <linearGradient id={`${id}v`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={shade(bloom, 0.25)} />
          <stop offset="0.55" stopColor={bloom} />
          <stop offset="1" stopColor={shade(bloom, -0.22)} />
        </linearGradient>
      </defs>
      <Shadow w={160} rx={62} />
      <g transform="rotate(-9 86 62)">
        <rect
          x={22}
          y={46}
          width={128}
          height={30}
          rx={15}
          fill={`url(#${id}v)`}
        />
        {Array.from({ length: 22 }, (_, i) => (
          <circle
            key={i}
            cx={30 + ((i * 37) % 116)}
            cy={52 + ((i * 13) % 20)}
            r={0.9 + (i % 3) * 0.4}
            fill={shade(meat, -0.1)}
            opacity={0.18}
          />
        ))}
        {[56, 98, 128].map((x) => (
          <rect
            key={x}
            x={x}
            y={45}
            width={1.4}
            height={32}
            fill="#b9a27a"
            opacity={0.8}
          />
        ))}
        <path
          d="M150 61 C 160 58, 162 48, 156 44 C 150 41, 147 50, 152 55"
          fill="none"
          stroke="#b9a27a"
          strokeWidth={1.4}
        />
      </g>
      {[
        [26, 84],
        [44, 88],
      ].map(([cx, cy], i) => (
        <g key={i}>
          <ellipse
            cx={cx}
            cy={cy}
            rx={13}
            ry={9.5}
            fill={shade(bloom, -0.05)}
          />
          <ellipse cx={cx} cy={cy} rx={11.5} ry={8.2} fill={meat} />
          {[
            [-4, -2],
            [3, -3],
            [-1, 3],
            [5, 2],
            [-6, 2],
          ].map(([dx, dy], j) => (
            <ellipse
              key={j}
              cx={cx + dx}
              cy={cy + dy}
              rx={1.1}
              ry={0.8}
              fill="#f3e2d6"
            />
          ))}
        </g>
      ))}
    </>
  );
};

/** Figatellu : boucle sombre nouée par une ficelle. */
const Figatellu: React.FC<P> = ({ a, id }) => (
  <>
    <defs>
      <linearGradient id={`${id}v`} x1="0" x2="1">
        <stop offset="0" stopColor={shade(a.c1, -0.2)} />
        <stop offset="0.5" stopColor={shade(a.c1, 0.12)} />
        <stop offset="1" stopColor={shade(a.c1, -0.25)} />
      </linearGradient>
    </defs>
    <Shadow w={115} rx={44} />
    <path
      d="M30 22 C 26 70, 38 93, 57.5 93 C 77 93, 89 70, 85 22"
      fill="none"
      stroke={`url(#${id}v)`}
      strokeWidth={17}
      strokeLinecap="round"
    />
    <path
      d="M30 26 C 27 66, 38 86, 56 87"
      fill="none"
      stroke="#fff"
      strokeOpacity={0.16}
      strokeWidth={3}
      strokeLinecap="round"
    />
    <path
      d="M28 16 C 40 6, 75 6, 87 16"
      fill="none"
      stroke="#b9a27a"
      strokeWidth={1.6}
    />
    <circle cx={28} cy={17} r={2.2} fill="#b9a27a" />
    <circle cx={87} cy={17} r={2.2} fill="#b9a27a" />
  </>
);

/** Tranches (coppa, lonzu) sur papier kraft. */
const Slices: React.FC<P> = ({ a, id }) => {
  const paper = a.c3 ?? "#dcc6a1";
  const fat = a.c2 ?? "#f3ddd2";
  const oval = a.pattern === "oval";
  return (
    <>
      <defs>
        <radialGradient id={`${id}m`} cx="0.45" cy="0.4" r="0.65">
          <stop offset="0" stopColor={shade(a.c1, 0.12)} />
          <stop offset="1" stopColor={shade(a.c1, -0.12)} />
        </radialGradient>
      </defs>
      <Shadow w={130} rx={56} />
      <path d="M6 66 L108 48 L124 84 L20 97 Z" fill={paper} />
      <path d="M6 66 L108 48 L109 51 L8 69 Z" fill={shade(paper, 0.15)} />
      {[
        [32, 72],
        [52, 68],
        [72, 65],
        [92, 62],
      ].map(([cx, cy], i) => {
        const rx = oval ? 17 : 18;
        const ry = oval ? 11 : 15;
        return (
          <g key={i}>
            <ellipse
              cx={cx}
              cy={cy + 1.5}
              rx={rx}
              ry={ry}
              fill="rgba(0,0,0,0.12)"
            />
            <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={fat} />
            <ellipse
              cx={cx}
              cy={cy}
              rx={rx - 2.4}
              ry={ry - 2.4}
              fill={`url(#${id}m)`}
            />
            <path
              d={`M${cx - 8} ${cy - 3} C ${cx - 3} ${cy - 6}, ${cx + 2} ${cy + 1}, ${cx + 7} ${cy - 2}`}
              fill="none"
              stroke={fat}
              strokeWidth={1.2}
              opacity={0.85}
            />
            <path
              d={`M${cx - 5} ${cy + 4} C ${cx - 1} ${cy + 2}, ${cx + 3} ${cy + 6}, ${cx + 8} ${cy + 4}`}
              fill="none"
              stroke={fat}
              strokeWidth={0.9}
              opacity={0.7}
            />
          </g>
        );
      })}
    </>
  );
};

/** Sachet kraft à fenêtre (canistrelli). */
const Bag: React.FC<P> = ({ a, id }) => {
  const cookie = a.c2 ?? "#e2c18b";
  return (
    <>
      <defs>
        <Vol id={`${id}v`} c={a.c1} k={0.14} />
      </defs>
      <Shadow w={75} rx={30} />
      <path d="M9 24 L66 24 L69 97 L6 97 Z" fill={`url(#${id}v)`} />
      <path d="M9 12 L66 12 L66 26 L9 26 Z" fill={shade(a.c1, -0.12)} />
      <path d="M9 12 L13 8 L62 8 L66 12 Z" fill={shade(a.c1, 0.1)} />
      <circle cx={37.5} cy={19} r={5} fill={a.c3 ?? "#8f3b22"} />
      <rect x={17} y={36} width={41} height={28} rx={3} fill="#f8f1e4" />
      {[
        [23, 44, -8],
        [36, 42, 6],
        [48, 45, -4],
        [28, 54, 10],
        [42, 55, -6],
      ].map(([x, y, r], i) => (
        <rect
          key={i}
          x={x - 6}
          y={y - 3.5}
          width={12}
          height={7}
          rx={1.6}
          fill={cookie}
          transform={`rotate(${r} ${x} ${y})`}
        />
      ))}
      <rect x={15} y={70} width={45} height={17} rx={1.5} fill="#f3e9d6" />
      {a.lines && (
        <LabelText
          x={15}
          y={70}
          w={45}
          h={17}
          lines={a.lines}
          ink={shade(a.c1, -0.55)}
          max={6.4}
        />
      )}
      <rect
        x={12}
        y={28}
        width={4}
        height={64}
        rx={2}
        fill="#fff"
        opacity={0.14}
      />
    </>
  );
};

/** Coffret cadeau à ruban (motif « dots » en option). */
const Gift: React.FC<P> = ({ a, id }) => {
  const ribbon = a.c2 ?? "#c9a24d";
  return (
    <>
      <defs>
        <Vol id={`${id}v`} c={a.c1} k={0.14} />
      </defs>
      <Shadow w={120} rx={50} />
      <rect x={14} y={42} width={92} height={55} rx={3} fill={`url(#${id}v)`} />
      {a.pattern === "dots" &&
        Array.from({ length: 24 }, (_, i) => (
          <circle
            key={i}
            cx={20 + (i % 8) * 11.5}
            cy={50 + Math.floor(i / 8) * 15 + (i % 2) * 4}
            r={1.6}
            fill={a.c3 ?? "#fff"}
            opacity={0.7}
          />
        ))}
      <rect
        x={10}
        y={32}
        width={100}
        height={14}
        rx={2}
        fill={shade(a.c1, 0.08)}
      />
      <rect
        x={10}
        y={44}
        width={100}
        height={2.4}
        fill={shade(a.c1, -0.18)}
        opacity={0.5}
      />
      <rect x={54} y={32} width={12} height={65} fill={ribbon} />
      <ellipse
        cx={47}
        cy={25}
        rx={13}
        ry={7}
        fill="none"
        stroke={ribbon}
        strokeWidth={4.5}
        transform="rotate(-22 47 25)"
      />
      <ellipse
        cx={73}
        cy={25}
        rx={13}
        ry={7}
        fill="none"
        stroke={ribbon}
        strokeWidth={4.5}
        transform="rotate(22 73 25)"
      />
      <rect
        x={55}
        y={26}
        width={10}
        height={8}
        rx={2.5}
        fill={shade(ribbon, -0.12)}
      />
      <rect
        x={18}
        y={50}
        width={5}
        height={42}
        rx={2.5}
        fill="#fff"
        opacity={0.14}
      />
    </>
  );
};

/** Cintre commun aux vêtements (crochet au point (cx, 2)). */
const Hanger: React.FC<{ cx: number; w: number }> = ({ cx, w }) => (
  <g
    fill="none"
    stroke="#8d8279"
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d={`M${cx} 13 V9 C ${cx} 4, ${cx + 6} 3, ${cx + 6} 7`} />
    <path d={`M${cx - w} 22 L${cx} 13 L${cx + w} 22`} />
  </g>
);

const SWEATER_PATH =
  "M34 19 L22 24 C 15 28, 12 40, 10 60 L 8 84 L 20 86 L 22 62 L 31 42 L 31 93 L 79 93 L 79 42 L 88 62 L 90 86 L 102 84 L 100 60 C 98 40, 95 28, 88 24 L 76 19 C 70 25, 40 25, 34 19 Z";

/** Pull (uni, torsadé ou marinière), suspendu. */
const Sweater: React.FC<P & { open?: boolean }> = ({ a, id, open }) => {
  const dark = shade(a.c1, -0.16);
  const clip = `${id}c`;
  return (
    <>
      <defs>
        <Vol id={`${id}v`} c={a.c1} k={0.12} />
        <clipPath id={clip}>
          <path d={SWEATER_PATH} />
        </clipPath>
      </defs>
      <Shadow w={110} rx={30} />
      <Hanger cx={55} w={27} />
      <path d={SWEATER_PATH} fill={`url(#${id}v)`} />
      <g clipPath={`url(#${clip})`}>
        {a.pattern === "stripes" &&
          Array.from({ length: 10 }, (_, i) => (
            <rect
              key={i}
              x={0}
              y={30 + i * 6.6}
              width={110}
              height={3}
              fill={a.c2 ?? "#1d2b4f"}
            />
          ))}
        {a.pattern === "cable" &&
          [44, 55, 66].map((x) => (
            <path
              key={x}
              d={`M${x} 30 ${Array.from({ length: 7 }, (_, k) => `q ${k % 2 ? -3.4 : 3.4} 4 0 8`).join(" ")}`}
              fill="none"
              stroke={dark}
              strokeWidth={2}
              opacity={0.55}
            />
          ))}
        {(!a.pattern || a.pattern === "plain") &&
          Array.from({ length: 9 }, (_, i) => (
            <rect
              key={i}
              x={34 + i * 5.2}
              y={28}
              width={0.6}
              height={60}
              fill={dark}
              opacity={0.18}
            />
          ))}
        {/* côtes : bas, poignets */}
        <rect x={31} y={86} width={48} height={7} fill={dark} opacity={0.3} />
        {Array.from({ length: 16 }, (_, i) => (
          <rect
            key={i}
            x={32 + i * 3}
            y={86}
            width={0.7}
            height={7}
            fill={shade(a.c1, -0.3)}
            opacity={0.35}
          />
        ))}
        <path d="M8 80 L20 82 L20 86 L8 84 Z" fill={dark} opacity={0.35} />
        <path d="M102 80 L90 82 L90 86 L102 84 Z" fill={dark} opacity={0.35} />
      </g>
      {open ? (
        <>
          <path
            d="M40 20 L55 46 L70 20"
            fill="none"
            stroke={dark}
            strokeWidth={3}
            strokeLinejoin="round"
          />
          <path
            d="M40 20 L55 46 L70 20 C 66 23, 44 23, 40 20 Z"
            fill={shade(a.c1, -0.35)}
            opacity={0.55}
          />
          <rect x={54.2} y={46} width={1.6} height={47} fill={dark} />
          {[54, 63, 72, 81].map((y) => (
            <circle
              key={y}
              cx={55}
              cy={y}
              r={1.9}
              fill={a.c2 ?? "#d9cbb3"}
              stroke={shade(a.c1, -0.4)}
              strokeWidth={0.4}
            />
          ))}
        </>
      ) : (
        <path
          d="M34 19 C 40 25, 70 25, 76 19"
          fill="none"
          stroke={dark}
          strokeWidth={3.4}
          strokeLinecap="round"
        />
      )}
    </>
  );
};

const DRESS_PATH =
  "M26 20 C 29 28, 30 38, 30 47 C 22 63, 16 80, 11 95 L 69 95 C 64 80, 58 63, 50 47 C 50 38, 51 28, 54 20 C 48 25, 32 25, 26 20 Z";

/** Robe en maille, suspendue. */
const Dress: React.FC<P> = ({ a, id }) => {
  const dark = shade(a.c1, -0.16);
  return (
    <>
      <defs>
        <Vol id={`${id}v`} c={a.c1} k={0.12} />
        <clipPath id={`${id}c`}>
          <path d={DRESS_PATH} />
        </clipPath>
      </defs>
      <Shadow w={80} rx={28} />
      <Hanger cx={40} w={17} />
      <path d={DRESS_PATH} fill={`url(#${id}v)`} />
      <g clipPath={`url(#${id}c)`}>
        {Array.from({ length: 13 }, (_, i) => (
          <path
            key={i}
            d={`M${40 + (i - 6) * 1.6} 47 L${40 + (i - 6) * 4.6} 96`}
            stroke={dark}
            strokeWidth={0.6}
            opacity={0.3}
          />
        ))}
        <rect x={0} y={45} width={80} height={3} fill={dark} opacity={0.45} />
      </g>
      <path
        d="M26 20 C 32 25, 48 25, 54 20"
        fill="none"
        stroke={dark}
        strokeWidth={3}
        strokeLinecap="round"
      />
    </>
  );
};

/** Doudou lapin. */
const Plush: React.FC<P> = ({ a, id }) => {
  const inner = a.c2 ?? "#efb7a6";
  return (
    <>
      <defs>
        <radialGradient id={`${id}g`} cx="0.42" cy="0.38" r="0.7">
          <stop offset="0" stopColor={shade(a.c1, 0.16)} />
          <stop offset="1" stopColor={shade(a.c1, -0.12)} />
        </radialGradient>
      </defs>
      <Shadow w={75} rx={24} />
      {[
        [27, -9],
        [48, 9],
      ].map(([x, r], i) => (
        <g key={i} transform={`rotate(${r} ${x} 30)`}>
          <rect
            x={x - 6.5}
            y={2}
            width={13}
            height={34}
            rx={6.5}
            fill={`url(#${id}g)`}
          />
          <rect
            x={x - 3.4}
            y={7}
            width={6.8}
            height={25}
            rx={3.4}
            fill={inner}
            opacity={0.85}
          />
        </g>
      ))}
      <ellipse cx={37.5} cy={73} rx={20} ry={23} fill={`url(#${id}g)`} />
      <ellipse
        cx={18}
        cy={70}
        rx={6}
        ry={10}
        fill={`url(#${id}g)`}
        transform="rotate(20 18 70)"
      />
      <ellipse
        cx={57}
        cy={70}
        rx={6}
        ry={10}
        fill={`url(#${id}g)`}
        transform="rotate(-20 57 70)"
      />
      <ellipse cx={27} cy={94} rx={8} ry={4.5} fill={shade(a.c1, -0.06)} />
      <ellipse cx={48} cy={94} rx={8} ry={4.5} fill={shade(a.c1, -0.06)} />
      <circle cx={37.5} cy={42} r={16} fill={`url(#${id}g)`} />
      <path
        d="M24 54 C 30 58, 45 58, 51 54 L 49 60 C 42 62, 33 62, 26 60 Z"
        fill={a.c3 ?? "#8fa894"}
      />
      <circle cx={31.5} cy={41} r={1.7} fill="#3b302b" />
      <circle cx={43.5} cy={41} r={1.7} fill="#3b302b" />
      <ellipse cx={37.5} cy={46} rx={2.2} ry={1.5} fill={shade(inner, -0.12)} />
      <circle cx={27} cy={46} r={2.6} fill={inner} opacity={0.5} />
      <circle cx={48} cy={46} r={2.6} fill={inner} opacity={0.5} />
    </>
  );
};

const SLEEP_PATH =
  "M13 12 C 17 7, 24 7, 26 12 C 28 18, 38 18, 40 12 C 42 7, 49 7, 53 12 L 55 28 C 60 52, 60 80, 53 94 C 43 99, 23 99, 13 94 C 6 80, 6 52, 11 28 Z";

/** Gigoteuse en gaze. */
const SleepBag: React.FC<P> = ({ a, id }) => (
  <>
    <defs>
      <Vol id={`${id}v`} c={a.c1} k={0.12} />
      <clipPath id={`${id}c`}>
        <path d={SLEEP_PATH} />
      </clipPath>
    </defs>
    <Shadow w={66} rx={24} />
    <path d={SLEEP_PATH} fill={`url(#${id}v)`} />
    <g clipPath={`url(#${id}c)`}>
      {Array.from({ length: 10 }, (_, i) => (
        <rect
          key={i}
          x={8 + i * 5.2}
          y={0}
          width={1.6}
          height={100}
          fill={a.c2 ?? "#fff"}
          opacity={0.22}
        />
      ))}
      <ellipse
        cx={9}
        cy={22}
        rx={6}
        ry={9}
        fill={shade(a.c1, -0.2)}
        opacity={0.5}
      />
      <ellipse
        cx={57}
        cy={22}
        rx={6}
        ry={9}
        fill={shade(a.c1, -0.2)}
        opacity={0.5}
      />
    </g>
    <path
      d="M26 12 C 28 18, 38 18, 40 12"
      fill="none"
      stroke={shade(a.c1, -0.25)}
      strokeWidth={1.6}
    />
    <rect x={32.2} y={18} width={1.6} height={72} fill={shade(a.c1, -0.3)} />
    <rect
      x={30.6}
      y={22}
      width={4.8}
      height={8}
      rx={1.4}
      fill={a.c3 ?? "#d7c39b"}
    />
  </>
);

/** Hochet en bois (anneau, perles, boule). */
const Rattle: React.FC<P> = ({ a, id }) => {
  const wood = a.c1;
  return (
    <>
      <defs>
        <radialGradient id={`${id}w`} cx="0.4" cy="0.35" r="0.7">
          <stop offset="0" stopColor={shade(wood, 0.2)} />
          <stop offset="1" stopColor={shade(wood, -0.15)} />
        </radialGradient>
      </defs>
      <Shadow w={60} rx={16} />
      <circle
        cx={30}
        cy={33}
        r={21}
        fill="none"
        stroke={shade(wood, -0.1)}
        strokeWidth={6.5}
      />
      <circle
        cx={30}
        cy={33}
        r={21}
        fill="none"
        stroke={shade(wood, 0.15)}
        strokeWidth={2}
        strokeDasharray="20 112"
        strokeDashoffset={-6}
        opacity={0.7}
      />
      {[
        [210, a.c2 ?? "#d9a99a"],
        [250, a.c3 ?? "#9fb5a2"],
        [290, a.c2 ?? "#d9a99a"],
      ].map(([deg, c], i) => {
        const r = ((deg as number) * Math.PI) / 180;
        return (
          <circle
            key={i}
            cx={30 + 21 * Math.cos(r)}
            cy={33 - 21 * Math.sin(r)}
            r={6.2}
            fill={c as string}
          />
        );
      })}
      <path d="M30 54 V68" stroke="#b9a27a" strokeWidth={1.6} />
      <circle cx={30} cy={80} r={14} fill={`url(#${id}w)`} />
    </>
  );
};

/** Buste en lin avec collier (goutte, perle, lune, sautoir). */
const Bust: React.FC<P> = ({ a, id }) => {
  const linen = a.c3 ?? "#e7ddcf";
  const metal = a.c1;
  const long = a.pattern === "long";
  const chain = long
    ? "M31 38 C 30 62, 38 80, 42.5 82 C 47 80, 55 62, 54 38"
    : "M31 38 C 31 52, 38 62, 42.5 64 C 47 62, 54 52, 54 38";
  const py = long ? 84 : 66;
  return (
    <>
      <defs>
        <Vol id={`${id}v`} c={linen} k={0.12} />
        <radialGradient id={`${id}p`} cx="0.35" cy="0.3" r="0.75">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor={a.c2 ?? "#d8d0c2"} />
        </radialGradient>
      </defs>
      <Shadow w={85} rx={26} />
      <rect x={30} y={91} width={25} height={6} rx={1.5} fill="#5b4838" />
      <path
        d="M32 8 C 32 5, 53 5, 53 8 L 53 32 C 60 36, 76 42, 80 58 L 79 92 L 6 92 L 5 58 C 9 42, 25 36, 32 32 Z"
        fill={`url(#${id}v)`}
      />
      <ellipse cx={42.5} cy={8} rx={10.5} ry={3} fill={shade(linen, 0.1)} />
      <path
        d="M32 32 C 36 36, 49 36, 53 32"
        fill="none"
        stroke={shade(linen, -0.12)}
        strokeWidth={0.8}
      />
      <path d={chain} fill="none" stroke={metal} strokeWidth={1.3} />
      <path
        d={chain}
        fill="none"
        stroke="#fff"
        strokeWidth={0.5}
        opacity={0.5}
        strokeDasharray="1 2.2"
      />
      {a.pattern === "pearl" && (
        <circle
          cx={42.5}
          cy={py + 4}
          r={5}
          fill={`url(#${id}p)`}
          stroke={shade(a.c2 ?? "#d8d0c2", -0.15)}
          strokeWidth={0.4}
        />
      )}
      {a.pattern === "moon" && (
        <path
          d={`M${42.5 - 1} ${py} a 6.5 6.5 0 1 0 6 8.5 a 5 5 0 1 1 -6 -8.5 Z`}
          fill={metal}
          stroke={shade(metal, -0.25)}
          strokeWidth={0.4}
        />
      )}
      {(a.pattern === "drop" || !a.pattern) && (
        <path
          d={`M42.5 ${py} C 46 ${py + 5}, 47.5 ${py + 8}, 47.5 ${py + 10.5} A 5 5 0 0 1 37.5 ${py + 10.5} C 37.5 ${py + 8}, 39 ${py + 5}, 42.5 ${py} Z`}
          fill={a.c2 ?? metal}
          stroke={shade(metal, -0.2)}
          strokeWidth={0.5}
        />
      )}
      {long && (
        <rect x={40.5} y={py} width={4} height={9} rx={1} fill={metal} />
      )}
    </>
  );
};

/** Jonc sur coussin. */
const Bangle: React.FC<P> = ({ a, id }) => (
  <>
    <defs>
      <radialGradient id={`${id}c`} cx="0.5" cy="0.3" r="0.8">
        <stop offset="0" stopColor={shade(a.c3 ?? "#d8cec2", 0.15)} />
        <stop offset="1" stopColor={shade(a.c3 ?? "#d8cec2", -0.1)} />
      </radialGradient>
    </defs>
    <Shadow w={120} rx={50} />
    <ellipse cx={60} cy={80} rx={50} ry={16} fill={`url(#${id}c)`} />
    <path
      d="M24 62 A 36 17 0 0 1 96 62"
      fill="none"
      stroke={shade(a.c1, -0.25)}
      strokeWidth={5}
    />
    <path
      d="M24 62 A 36 17 0 0 0 96 62"
      fill="none"
      stroke={a.c1}
      strokeWidth={7.5}
    />
    <path
      d="M30 68 A 32 13 0 0 0 70 77"
      fill="none"
      stroke="#fff"
      strokeWidth={1.4}
      opacity={0.6}
    />
  </>
);

/** Flacon compte-gouttes (sérum, huile). */
const Dropper: React.FC<P> = ({ a, id }) => {
  const label = a.c2 ?? "#f3eee6";
  const bulb = a.c3 ?? "#2a2522";
  return (
    <>
      <defs>
        <Vol id={`${id}v`} c={a.c1} k={0.2} />
      </defs>
      <Shadow w={40} rx={15} />
      <rect x={13} y={4} width={14} height={22} rx={7} fill={bulb} />
      <rect
        x={10}
        y={24}
        width={20}
        height={12}
        rx={2}
        fill={shade(bulb, 0.08)}
      />
      <rect x={5} y={34} width={30} height={63} rx={7} fill={`url(#${id}v)`} />
      <rect x={8} y={54} width={24} height={30} rx={1.5} fill={label} />
      {a.lines && (
        <LabelText
          x={8}
          y={56}
          w={24}
          h={26}
          lines={a.lines}
          ink={shade(a.c1, -0.5)}
          max={4.8}
        />
      )}
      <rect
        x={9}
        y={38}
        width={3.4}
        height={52}
        rx={1.7}
        fill="#fff"
        opacity={0.3}
      />
    </>
  );
};

/** Pot de crème. */
const Cream: React.FC<P> = ({ a, id }) => {
  const lid = a.c3 ?? "#b9a27a";
  const label = a.c2 ?? "#f3eee6";
  return (
    <>
      <defs>
        <Vol id={`${id}v`} c={a.c1} k={0.14} />
        <Vol id={`${id}l`} c={lid} k={0.2} />
      </defs>
      <Shadow w={110} rx={44} />
      <rect
        x={10}
        y={44}
        width={90}
        height={53}
        rx={11}
        fill={`url(#${id}v)`}
      />
      <rect x={13} y={30} width={84} height={17} rx={4} fill={`url(#${id}l)`} />
      <rect x={10} y={58} width={90} height={24} fill={label} />
      {a.lines && (
        <LabelText
          x={10}
          y={58}
          w={90}
          h={24}
          lines={a.lines}
          ink={shade(a.c1, -0.55)}
          max={8}
        />
      )}
      <rect
        x={16}
        y={48}
        width={5}
        height={44}
        rx={2.5}
        fill="#fff"
        opacity={0.25}
      />
    </>
  );
};

/** Savon (pain gravé) dans sa bande de papier. */
const Soap: React.FC<P> = ({ a, id }) => (
  <>
    <defs>
      <linearGradient id={`${id}v`} x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stopColor={shade(a.c1, 0.14)} />
        <stop offset="0.5" stopColor={a.c1} />
        <stop offset="1" stopColor={shade(a.c1, -0.16)} />
      </linearGradient>
    </defs>
    <Shadow w={140} rx={58} />
    <rect x={14} y={48} width={112} height={44} rx={13} fill={`url(#${id}v)`} />
    <rect
      x={20}
      y={51}
      width={100}
      height={5}
      rx={2.5}
      fill="#fff"
      opacity={0.3}
    />
    <rect x={56} y={48} width={30} height={44} fill={a.c2 ?? "#cdb38c"} />
    {a.lines && (
      <LabelText
        x={56}
        y={52}
        w={30}
        h={36}
        lines={a.lines}
        ink={shade(a.c2 ?? "#cdb38c", -0.55)}
        max={6}
      />
    )}
  </>
);

// ── Composant ───────────────────────────────────────────────────────────────
export const ArtView: React.FC<{
  art: Art;
  size: number;
  id: string;
  style?: React.CSSProperties;
  /** balayage de lumière (bouteilles seulement) */
  sweep?: number;
}> = ({ art, size, id, style, sweep }) => {
  if (art.kind === "bottle" && art.look) {
    return (
      <Bottle look={art.look} size={size} id={id} style={style} sweep={sweep} />
    );
  }
  const w = 100 * ASPECT[art.kind];
  const sid = `a-${id}`;
  const p = { a: art, id: sid };
  let body: React.ReactNode = null;
  switch (art.kind) {
    case "jar":
      body = <Jar {...p} />;
      break;
    case "wheel":
      body = <Wheel {...p} />;
      break;
    case "saucisson":
      body = <Saucisson {...p} />;
      break;
    case "figatellu":
      body = <Figatellu {...p} />;
      break;
    case "slices":
      body = <Slices {...p} />;
      break;
    case "bag":
      body = <Bag {...p} />;
      break;
    case "gift":
      body = <Gift {...p} />;
      break;
    case "sweater":
      body = <Sweater {...p} />;
      break;
    case "cardigan":
      body = <Sweater {...p} open />;
      break;
    case "dress":
      body = <Dress {...p} />;
      break;
    case "plush":
      body = <Plush {...p} />;
      break;
    case "sleepbag":
      body = <SleepBag {...p} />;
      break;
    case "rattle":
      body = <Rattle {...p} />;
      break;
    case "bust":
      body = <Bust {...p} />;
      break;
    case "bangle":
      body = <Bangle {...p} />;
      break;
    case "dropper":
      body = <Dropper {...p} />;
      break;
    case "cream":
      body = <Cream {...p} />;
      break;
    case "soap":
      body = <Soap {...p} />;
      break;
    default:
      body = null;
  }
  return (
    <svg
      viewBox={`0 0 ${w} 100`}
      height={size}
      width={size * ASPECT[art.kind]}
      style={{ overflow: "visible", ...style }}
    >
      {body}
    </svg>
  );
};
