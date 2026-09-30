import React from "react";
import { AbsoluteFill, Easing, interpolate } from "remotion";

export interface RigKey {
  /** frame */
  f: number;
  /** zoom (1 = monde à l'échelle de base) */
  z: number;
  /** point du MONDE à placer au centre de l'écran */
  x: number;
  y: number;
}

const EASE = Easing.bezier(0.45, 0, 0.15, 1);

/** Interpole la caméra : zoom en log (vitesse perçue constante), point en linéaire. */
export function rigAt(
  frame: number,
  keys: RigKey[],
): { z: number; x: number; y: number } {
  if (frame <= keys[0].f) return keys[0];
  const last = keys[keys.length - 1];
  if (frame >= last.f) return last;
  let i = 0;
  while (i < keys.length - 1 && frame > keys[i + 1].f) i++;
  const a = keys[i];
  const b = keys[i + 1];
  const t = interpolate(frame, [a.f, b.f], [0, 1], { easing: EASE });
  const z = Math.exp(Math.log(a.z) + (Math.log(b.z) - Math.log(a.z)) * t);
  return { z, x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

/**
 * Caméra virtuelle façon Screen Studio : le monde (children, en px) est
 * translaté/zoomé pour centrer (x, y). Le monde a sa propre taille.
 */
export const Rig: React.FC<{
  frame: number;
  keys: RigKey[];
  worldW: number;
  worldH: number;
  children: React.ReactNode;
  screenW?: number;
  screenH?: number;
}> = ({
  frame,
  keys,
  worldW,
  worldH,
  children,
  screenW = 1920,
  screenH = 1080,
}) => {
  const c = rigAt(frame, keys);
  const tx = screenW / 2 - c.z * c.x;
  const ty = screenH / 2 - c.z * c.y;
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: worldW,
          height: worldH,
          transformOrigin: "0 0",
          transform: `translate(${tx}px, ${ty}px) scale(${c.z})`,
        }}
      >
        {children}
      </div>
    </AbsoluteFill>
  );
};
