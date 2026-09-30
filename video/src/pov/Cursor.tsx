import React from "react";
import { Easing, interpolate } from "remotion";

export interface CursorKey {
  /** frame */
  f: number;
  x: number;
  y: number;
}

/**
 * Position du curseur à la frame donnée : trajets courbes façon main humaine
 * (ease in-out + léger arc), pas de téléportation.
 */
export function cursorAt(
  frame: number,
  keys: CursorKey[],
): { x: number; y: number } {
  if (frame <= keys[0].f) return { x: keys[0].x, y: keys[0].y };
  const last = keys[keys.length - 1];
  if (frame >= last.f) return { x: last.x, y: last.y };
  let i = 0;
  while (i < keys.length - 1 && frame > keys[i + 1].f) i++;
  const a = keys[i];
  const b = keys[i + 1];
  const t = interpolate(frame, [a.f, b.f], [0, 1], {
    easing: Easing.bezier(0.65, 0, 0.25, 1),
  });
  // Arc : on bombe la trajectoire perpendiculairement, proportionnellement à la distance.
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const d = Math.hypot(dx, dy);
  const bow = Math.sin(Math.PI * t) * Math.min(60, d * 0.12);
  const nx = d ? -dy / d : 0;
  const ny = d ? dx / d : 0;
  return { x: a.x + dx * t + nx * bow, y: a.y + dy * t + ny * bow };
}

/** Pression 0..1 autour d'une frame de clic (appui 3 frames, relâche 5). */
export function pressAt(frame: number, clickFrames: number[]): number {
  let p = 0;
  for (const c of clickFrames) {
    p = Math.max(
      p,
      interpolate(frame, [c - 3, c, c + 5], [0, 1, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      }),
    );
  }
  return p;
}

/** Flèche macOS + onde de clic. Coordonnées = pointe de la flèche. */
export const Cursor: React.FC<{
  x: number;
  y: number;
  press?: number;
  /** frames écoulées depuis le dernier clic (onde), ou -1 */
  sinceClick?: number;
  scale?: number;
  opacity?: number;
}> = ({ x, y, press = 0, sinceClick = -1, scale = 1, opacity = 1 }) => {
  const ring = sinceClick >= 0 && sinceClick < 16;
  const rp = ring ? sinceClick / 16 : 0;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        pointerEvents: "none",
        opacity,
        zIndex: 1000,
      }}
    >
      {ring && (
        <div
          style={{
            position: "absolute",
            left: -22 * scale,
            top: -22 * scale,
            width: 44 * scale,
            height: 44 * scale,
            borderRadius: "50%",
            border: `${2 * scale}px solid rgba(0,0,0,${0.35 * (1 - rp)})`,
            transform: `scale(${0.4 + rp * 0.9})`,
          }}
        />
      )}
      <svg
        width={26 * scale}
        height={34 * scale}
        viewBox="0 0 26 34"
        style={{
          transform: `scale(${1 - press * 0.12})`,
          transformOrigin: "2px 2px",
          filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.35))",
        }}
      >
        <path
          d="M2 2 L2 27 L8.5 21 L12.8 31 L17 29.2 L12.8 19.6 L21.5 19.6 Z"
          fill="#111"
          stroke="#fff"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};
