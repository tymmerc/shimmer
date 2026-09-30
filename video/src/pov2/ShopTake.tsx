import React from "react";
import { CavesPage } from "./CavesPage";
import { camAt, toWin, WIN } from "./camera";
import { ShimmerDock } from "./ShimmerDock";
import {
  barAt,
  cursorState,
  dockAt,
  scrollAt,
  type CursorShape,
} from "./state";

/**
 * La fenêtre de la boutique (40,40, 1840×860, sans barre de navigateur : aucun
 * domaine n'est montré) et tout ce qui vit dedans : le site, le dock, le
 * curseur. Le site reste en 2D (pas de will-change, pas de translateZ) pour
 * un texte net même zoomé ×2,7.
 */
export const ShopTake: React.FC<{ f: number; style?: React.CSSProperties }> = ({
  f,
  style,
}) => {
  const cam = camAt(f);
  const dock = dockAt(f);
  const cur = cursorState(f);
  const tx = WIN.w / 2 - cam.fx * cam.m + cam.dx;
  const ty = WIN.h / 2 - cam.fy * cam.m + cam.dy;
  return (
    <div
      style={{
        position: "absolute",
        left: WIN.x,
        top: WIN.y,
        width: WIN.w,
        height: WIN.h,
        borderRadius: 18,
        overflow: "hidden",
        border: "1px solid rgba(251,249,244,0.10)",
        boxShadow: "0 30px 80px rgba(0,0,0,0.5)",
        background: "#f7f3ec",
        boxSizing: "border-box",
        ...style,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: 1440,
          height: 673,
          transformOrigin: "0 0",
          transform: `translate(${tx}px, ${ty}px) scale(${cam.m})`,
        }}
      >
        <CavesPage scrollY={scrollAt(f)} bar={barAt(f)}>
          {dock && <ShimmerDock ui={dock} />}
        </CavesPage>
      </div>
      {cur && cur.opacity > 0 && <CursorView c={cur} cam={cam} />}
    </div>
  );
};

const CursorView: React.FC<{
  c: NonNullable<ReturnType<typeof cursorState>>;
  cam: ReturnType<typeof camAt>;
}> = ({ c, cam }) => {
  const [x, y] = toWin(cam, c.x, c.y);
  const size = Math.min(46, Math.max(30, 26 * Math.sqrt(cam.m)));
  const s = size / 26;
  const k = 1 - 0.14 * c.press;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        opacity: c.opacity,
        pointerEvents: "none",
      }}
    >
      {c.ring >= 0 && (
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: 0,
            height: 0,
          }}
        >
          <div
            style={{
              position: "absolute",
              left: -(6 + 22 * ease(c.ring / 8)),
              top: -(6 + 22 * ease(c.ring / 8)),
              width: 2 * (6 + 22 * ease(c.ring / 8)),
              height: 2 * (6 + 22 * ease(c.ring / 8)),
              borderRadius: "50%",
              border: `2px solid rgba(13,11,20,${0.35 * (1 - c.ring / 8)})`,
              boxSizing: "border-box",
            }}
          />
        </div>
      )}
      <div style={{ transform: `scale(${k * s})`, transformOrigin: "0 0" }}>
        {shapeSvg(c.shape)}
      </div>
    </div>
  );
};

const ease = (t: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);

/** Formes dessinées pour 26 px de haut ; (0,0) = point chaud. */
function shapeSvg(shape: CursorShape) {
  const shadow = "drop-shadow(0 2px 3px rgba(0,0,0,0.25))";
  if (shape === "ibeam") {
    return (
      <svg
        width="14"
        height="26"
        viewBox="-7 -13 14 26"
        style={{
          position: "absolute",
          left: -7,
          top: -13,
          filter: shadow,
          overflow: "visible",
        }}
      >
        <path
          d="M-4 -11 C-1 -11 0 -10 0 -8 L0 8 C0 10 -1 11 -4 11 M4 -11 C1 -11 0 -10 0 -8 M0 8 C0 10 1 11 4 11"
          stroke="#fff"
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M-4 -11 C-1 -11 0 -10 0 -8 L0 8 C0 10 -1 11 -4 11 M4 -11 C1 -11 0 -10 0 -8 M0 8 C0 10 1 11 4 11"
          stroke="#111"
          strokeWidth="1.8"
          fill="none"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (shape === "pointer") {
    return (
      <svg
        width="24"
        height="28"
        viewBox="0 0 24 28"
        style={{ position: "absolute", left: -8, top: -1, filter: shadow }}
      >
        <path
          d="M8 1.5c1.2 0 2 .9 2 2V11h.6V9.7c0-1.1.9-1.9 2-1.9s2 .8 2 1.9V11h.6v-.6c0-1.1.9-1.9 2-1.9s1.9.8 1.9 1.9v1.2h.5c0-1 .9-1.7 1.9-1.7s1.9.8 1.9 1.9v6.7c0 4.7-3.2 8.5-8 8.5h-1.8c-2.6 0-4.4-1-5.9-3l-4.9-6.7c-.6-.9-.4-2.1.5-2.7.8-.6 2-.4 2.7.4L6 16.4V3.5c0-1.1.9-2 2-2z"
          fill="#fff"
          stroke="#111"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        <path
          d="M11.2 18v4.4M14.4 18v4.4M17.6 18v4.4"
          stroke="#111"
          strokeWidth="1.1"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  return (
    <svg
      width="26"
      height="34"
      viewBox="0 0 26 34"
      style={{ position: "absolute", left: -2, top: -2, filter: shadow }}
    >
      <path
        d="M2 2 L2 27 L8.5 21 L12.8 31 L17 29.2 L12.8 19.6 L21.5 19.6 Z"
        fill="#111"
        stroke="#fff"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}
