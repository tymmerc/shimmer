import React from "react";
import { spring } from "remotion";
import { FONT, S } from "../pov/brand";
import { FILM } from "./script";
import { EZ, lerp, seg } from "./timeline";
import { Line, useTextWidth } from "./type";
import { camAt, toWin } from "./camera";

/** Bas du dock dans l’état du récap (confirmation), px viewport. */
// Bas réel du dock pendant le récap (confirmation + 2 lignes + réponse sur 3
// lignes), mesuré sur l’image rendue le 30/09 : 429,7 px. Avant : 484 (hauteur
// max du dock), le cadre descendait 54 px sous le dock (retour de Tym).
const DOCK_BOTTOM_D5 = 430;

const BIG = 110;

/**
 * La marque : le petit « Shimmer. » dans la bande (dès f4), son vol dans
 * « C'était Shimmer. » (S10), puis sa place en haut à gauche (S11) sous
 * laquelle se construit l'accroche du site.
 */
export const Brand: React.FC<{ f: number; fps: number }> = ({ f, fps }) => {
  const [refC, wC] = useTextWidth("C'était", {});
  const [refS, wS] = useTextWidth("Shimmer.", {});
  const gap = BIG * 0.25;
  const L = 960 - (wC + gap + wS) / 2;

  // Trois ancrages du mot (bord gauche, ligne de base, taille).
  const band = { x: 1840 - wS * (40 / BIG), b: 1012, s: 40 };
  const reveal = { x: L + wC + gap, b: 820, s: BIG };
  const corner = { x: 120, b: 170, s: 56 };
  const t1 = seg(f, 1419, 1443, EZ.CURTAIN);
  const t2 = seg(f, 1461, 1487, EZ.INOUT);
  const at = (a: typeof band, b: typeof band, t: number) => ({
    x: lerp(a.x, b.x, t),
    b: lerp(a.b, b.b, t),
    s: lerp(a.s, b.s, t),
  });
  const pos = f < 1461 ? at(band, reveal, t1) : at(reveal, corner, t2);
  const flying = f >= 1419 && f < 1443;
  const pop = spring({
    frame: f - 1443,
    fps,
    config: { damping: 12, stiffness: 180, mass: 0.6 },
  });
  const dotScale = f < 1419 ? 1 : flying ? 0 : pop;
  const bugIn = seg(f, 4, 16, EZ.SITE);

  const cetait = seg(f, 1435, 1451, EZ.SITE);
  const cetaitOut = seg(f, 1455, 1465, EZ.IN);

  const measure: React.CSSProperties = {
    fontFamily: FONT.display,
    fontSize: BIG,
    letterSpacing: "-0.022em",
    whiteSpace: "nowrap",
  };
  return (
    <>
      {/* mesures (invisibles, non mises à l'échelle) */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: -400,
          visibility: "hidden",
        }}
      >
        <span ref={refC} style={{ ...measure, fontWeight: 400 }}>
          {FILM.reveal}
        </span>
        <span ref={refS} style={{ ...measure, fontWeight: 500 }}>
          Shimmer.
        </span>
      </div>

      {/* « C'était » */}
      {f >= 1435 && f < 1466 && wC > 0 && (
        <div
          style={{
            position: "absolute",
            left: L,
            top: 820 - BIG * 0.82 - 20 * cetaitOut,
            opacity: 1 - cetaitOut,
            overflow: "hidden",
            paddingBottom: BIG * 0.2,
          }}
        >
          <div
            style={{
              ...measure,
              fontWeight: 400,
              color: S.paper,
              lineHeight: 1,
              transform: `translateY(${(1 - cetait) * 110}%)`,
            }}
          >
            {FILM.reveal}
          </div>
        </div>
      )}

      {/* le mot « Shimmer. » */}
      {f >= 4 && wS > 0 && (
        <div
          style={{
            position: "absolute",
            left: pos.x,
            top: pos.b - BIG * 0.82,
            transformOrigin: `0 ${BIG * 0.82}px`,
            transform: `translateY(${8 * (1 - bugIn)}px) scale(${pos.s / BIG})`,
            opacity: bugIn,
            ...measure,
            fontWeight: 500,
            color: S.paper,
            lineHeight: 1,
          }}
        >
          Shimmer
          <span
            style={{
              display: "inline-block",
              color: S.acid,
              transform: `scale(${dotScale})`,
              transformOrigin: "30% 85%",
            }}
          >
            .
          </span>
        </div>
      )}
    </>
  );
};

/**
 * Trait acide autour de la barre native, puis autour de barre + dock (S10),
 * avec un projecteur : le reste de la page s'assombrit. Annotation vidéo,
 * après la fin de l'histoire, jamais dans le dock. Suit la caméra.
 */
export const Annotation: React.FC<{ f: number }> = ({ f }) => {
  if (f < 1310 || f > 1424) return null;
  const cam = camAt(f);
  const draw = seg(f, 1310, 1332, EZ.INOUT);
  const glow = seg(f, 1332, 1340);
  const grow = seg(f, 1336, 1356, EZ.INOUT);
  const out = seg(f, 1415, 1423, EZ.IN);
  const dim = seg(f, 1312, 1332, EZ.OUT) * (1 - out);
  // Rectangle en px viewport : barre (460-980, 28-74) + 4 px, puis jusqu'au bas du dock (D5).
  const [x0, y0] = toWin(cam, 456, 24);
  const [x1, yBar] = toWin(cam, 984, 78);
  const [, yDock] = toWin(cam, 984, DOCK_BOTTOM_D5 + 4);
  const y1 = lerp(yBar, yDock, grow);
  const rx = lerp(27 * cam.m, 16 * cam.m, grow);
  return (
    <svg
      width={1840}
      height={860}
      style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}
    >
      <defs>
        <mask id="spot">
          <rect x={-10} y={-10} width={1860} height={880} fill="white" />
          <rect
            x={x0}
            y={y0}
            width={x1 - x0}
            height={y1 - y0}
            rx={rx}
            fill="black"
          />
        </mask>
      </defs>
      <rect
        x={-10}
        y={-10}
        width={1860}
        height={880}
        fill={`rgba(13,11,20,${0.55 * dim})`}
        mask="url(#spot)"
      />
      <rect
        x={x0}
        y={y0}
        width={x1 - x0}
        height={y1 - y0}
        rx={rx}
        fill="none"
        stroke={S.acid}
        strokeWidth={4}
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={1 - draw}
        opacity={1 - out}
        style={{
          filter: `drop-shadow(0 0 ${14 * glow}px rgba(98,255,184,${0.45 * glow}))`,
        }}
      />
    </svg>
  );
};

/**
 * Carton final (S11) : le logo (déjà en haut à gauche), l'accroche du site,
 * l'adresse quand le domaine existera, et la mention démo en petit. Rien
 * d'autre : retour de Tym du 30/09, l'ancien carton était trop chargé.
 */
export const EndCard: React.FC<{ f: number }> = ({ f }) => {
  if (f < 1455) return null;
  const grad = seg(f, 1455, 1475, EZ.OUT);
  const tl = FILM.tagline;
  const l1 = tl[0].map((w, i) => ({ w, at: 1486 + i * 3 }));
  const l2at = [1494, 1500, 1506, 1509];
  const l2 = tl[1].map((w, i) => ({
    w: w.replace(/\*/g, ""),
    at: l2at[i],
    em: true,
  }));
  const l3 = tl[2].map((w, i) => ({ w, at: 1516 + i * 3 }));
  const url = seg(f, 1534, 1548, EZ.OUT);
  const ul = seg(f, 1540, 1558, EZ.SITE);
  const hasUrl = FILM.url.length > 0;
  // Sans adresse, la mention prend son créneau : lisible près de 3 s avant la fin.
  const disc = hasUrl ? seg(f, 1546, 1560) : seg(f, 1534, 1548);
  return (
    <>
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: grad,
          background:
            "linear-gradient(90deg, #0d0b14 0%, rgba(13,11,20,.85) 52%, rgba(13,11,20,0) 78%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 260,
          opacity: grad,
          background: "linear-gradient(180deg, rgba(13,11,20,0), #0d0b14 70%)",
        }}
      />
      <Line f={f} x={120} baseline={470} size={104} units={l1} dur={20} />
      <Line
        f={f}
        x={120}
        baseline={576}
        size={104}
        units={l2}
        dur={20}
        skewEm
      />
      <Line f={f} x={120} baseline={682} size={104} units={l3} dur={20} />
      {hasUrl && (
        <div
          style={{
            position: "absolute",
            left: 120,
            top: 800 - 38 * 0.8 + 12 * (1 - url),
            opacity: url,
            fontFamily: FONT.mono,
            fontWeight: 500,
            fontSize: 38,
            lineHeight: 1,
            color: S.paper,
            whiteSpace: "nowrap",
          }}
        >
          {FILM.url}
          <div
            style={{
              height: 2,
              background: S.acid,
              marginTop: 10,
              transformOrigin: "0 0",
              transform: `scaleX(${ul})`,
            }}
          />
        </div>
      )}
      <div
        style={{
          position: "absolute",
          left: 120,
          top: 1000 - 30 * 0.8,
          opacity: disc,
          fontFamily: FONT.sans,
          fontWeight: 400,
          fontSize: 30,
          lineHeight: 1,
          color: "rgba(251,249,244,0.7)",
          whiteSpace: "nowrap",
        }}
      >
        {FILM.disclosure}
      </div>
    </>
  );
};
