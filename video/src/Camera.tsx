import React from "react";
import { AbsoluteFill, interpolate, Easing, useCurrentFrame } from "remotion";

export interface Focus {
  at: number; // frame
  scale: number;
  x: number; // point à centrer (espace composition 1920x1080)
  y: number;
}

/**
 * Caméra virtuelle : zoome et se déplace pour centrer un point, façon
 * Screen Studio. On passe des keyframes `focuses` (frame + zoom + point visé),
 * la caméra interpole en douceur entre elles pour guider le regard.
 */
export const Camera: React.FC<{
  focuses: Focus[];
  children: React.ReactNode;
}> = ({ focuses, children }) => {
  const frame = useCurrentFrame();
  const ats = focuses.map((f) => f.at);
  const ease = {
    extrapolateLeft: "clamp" as const,
    extrapolateRight: "clamp" as const,
    easing: Easing.inOut(Easing.cubic),
  };
  const s = interpolate(
    frame,
    ats,
    focuses.map((f) => f.scale),
    ease,
  );
  const x = interpolate(
    frame,
    ats,
    focuses.map((f) => f.x),
    ease,
  );
  const y = interpolate(
    frame,
    ats,
    focuses.map((f) => f.y),
    ease,
  );
  // Pour que le point (x,y) apparaisse au centre (960,540) après scale.
  const tx = 960 - s * x;
  const ty = 540 - s * y;
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <div
        style={{
          width: 1920,
          height: 1080,
          transformOrigin: "0 0",
          transform: `translate(${tx}px, ${ty}px) scale(${s})`,
        }}
      >
        {children}
      </div>
    </AbsoluteFill>
  );
};

// Géométrie : la fenêtre navigateur (1360x820) est centrée dans la compo
// 1920x1080 → coin haut-gauche (280,130). La zone contenu est sous la barre
// chrome de 52px. Un point (cx,cy) DANS le contenu navigateur devient :
export const BROWSER_X = 280;
export const BROWSER_Y = 130;
export const CONTENT_Y = BROWSER_Y + 52; // 182
/** point contenu navigateur -> point composition */
export const cp = (cx: number, cy: number): [number, number] => [
  BROWSER_X + cx,
  CONTENT_Y + cy,
];
