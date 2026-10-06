import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { S } from "../pov/brand";
import { Toxic } from "../pov/Toxic";
import { Band } from "./Band";
import { Annotation, Brand, EndCard } from "./Brand";
import { LifeGradients, S01, S01Line2, S01Thought, S08, S09 } from "./Life";
import { ShopTake } from "./ShopTake";
import { useDockTargets } from "./targets";
import { curtainY, EZ, keyed, lerp, seg, storyAt, toxinVeil } from "./timeline";
import { useVariant as useVariantFromContext, VariantContext } from "./variant";
import { variantById } from "./variants";

/**
 * « Ce soir, c'est moi qui ramène le vin » : la POV d'un client sur une
 * boutique équipée de Shimmer. Une seule ligne de temps (1590 f, 53 s).
 *
 * Calques, du fond vers le haut :
 * 1. Scène : ink + toxine (montée seulement quand elle est visible) + voile O
 * 2. Fenêtre de la boutique (visible au-dessus du rideau Y)
 * 3. Calque « vie » (S01, S08, S09 ; visible sous le rideau Y)
 * 4. Bande (sous-titres, surtitres, touche Entrée) + transition de S01
 * 5. Marque (mot « Shimmer. », révélation, carton final)
 */
/**
 * subtitles=false : version voix off (composition ShimmerPOV-VO).
 * variant : boutique du film (cave, epicerie, mode, enfant, bijoux, cosmetique).
 */
export const ShimmerPOV: React.FC<{ subtitles?: boolean; variant?: string }> = ({
  subtitles = true,
  variant = "cave",
}) => {
  const v = variantById(variant);
  return (
    <VariantContext.Provider value={v}>
      <Film subtitles={subtitles} />
    </VariantContext.Provider>
  );
};

const Film: React.FC<{ subtitles: boolean }> = ({ subtitles }) => {
  const F = useCurrentFrame();
  const f = storyAt(F);
  const { fps } = useVideoConfig();
  const Y = curtainY(f);
  const O = toxinVeil(f);

  // Lueur de la toxine (coordonnées composition).
  const glow = glowAt(f);
  // Cibles du curseur et bas du dock, lus sur le dock de la variante.
  const [probe, targets] = useDockTargets(useVariantFromContext());

  // Fenêtre : montée à l'ouverture (T1), réduction + bascule (T6), sortie (T7).
  const rise = seg(f, 120, 144, EZ.OUT);
  const shrink = seg(f, 1415, 1439, EZ.CURTAIN);
  const vanish = seg(f, 1455, 1467, EZ.IN);
  const winScale =
    f < 1415
      ? lerp(0.985, 1, rise)
      : lerp(1, 0.56, shrink) * lerp(1, 0.46 / 0.56, vanish);
  const winDY = f < 1415 ? 24 * (1 - rise) : lerp(0, -90, shrink);
  const winTilt = 6 * shrink;

  // Poussée lente du calque « vie ».
  const lifePush =
    f < 140
      ? lerp(1, 1.03, seg(f, 0, 138))
      : f < 1190
        ? lerp(1, 1.025, seg(f, 1092, 1190))
        : lerp(1, 1.02, seg(f, 1190, 1290));

  return (
    <AbsoluteFill style={{ background: S.ink, overflow: "hidden" }}>
      {probe}
      {/* 1. Scène */}
      {O < 0.999 && <Toxic intensity={1} glow={glow} speed={1.4} />}
      <AbsoluteFill style={{ background: S.ink, opacity: O }} />
      {O < 0.999 && <Grain seed={F % 7} opacity={0.07 * (1 - O)} />}

      {/* 2. Fenêtre de la boutique */}
      {Y > 0 && f >= 110 && (
        <AbsoluteFill
          style={{ clipPath: `inset(0 0 ${1080 - Y}px 0)`, perspective: 2400 }}
        >
          <AbsoluteFill
            style={{
              transformOrigin: "960px 470px",
              transform: `translateY(${winDY}px) scale(${winScale}) rotateX(${winTilt}deg)`,
              opacity: 1 - vanish,
            }}
          >
            <ShopTake f={f} targets={targets} />
            <div style={{ position: "absolute", left: 40, top: 40 }}>
              <Annotation f={f} dockBottom={targets.recapBottom} />
            </div>
          </AbsoluteFill>
          {Y > 0 && Y < 1080 && Y !== 900 && (
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: Y - 1,
                height: 1,
                background: "rgba(251,249,244,0.12)",
              }}
            />
          )}
        </AbsoluteFill>
      )}

      {/* 3. Calque « vie » */}
      {(f < 140 || (f >= 1092 && f < 1310)) && (
        <AbsoluteFill style={{ clipPath: `inset(${Y}px 0 0 0)` }}>
          <LifeGradients />
          <AbsoluteFill
            style={{
              transformOrigin: "960px 470px",
              transform: `scale(${lifePush})`,
            }}
          >
            {f < 140 && <S01 f={f} fps={fps} />}
            {!subtitles && f < 140 && <S01Thought f={f} />}
            {f >= 1092 && f < 1195 && <S08 f={f} />}
            {f >= 1180 && f < 1300 && <S09 f={f} fps={fps} />}
          </AbsoluteFill>
        </AbsoluteFill>
      )}

      {/* 4. Bande */}
      <S01Line2 f={f} subtitles={subtitles} />
      <Band f={f} subtitles={subtitles} />

      {/* 5. Marque */}
      <EndCard f={f} />
      <Brand f={f} fps={fps} />
    </AbsoluteFill>
  );
};

function glowAt(f: number): [number, number] {
  if (f < 1000) {
    const t = seg(f, 0, 140);
    return [lerp(1536, 1382, t), lerp(410, 497, t)];
  }
  if (f < 1410) {
    const a = ((f - 1092) / 180) * Math.PI * 2;
    return [1421 + 96 * Math.cos(a), 497 + 43 * Math.sin(a)];
  }
  if (f < 1494) {
    const a0 = ((1410 - 1092) / 180) * Math.PI * 2;
    const from: [number, number] = [
      1421 + 96 * Math.cos(a0),
      497 + 43 * Math.sin(a0),
    ];
    const t = seg(f, 1410, 1445, EZ.INOUT);
    return [lerp(from[0], 960, t), lerp(from[1], 389, t)];
  }
  const x = keyed(f, [
    [1494, 245],
    [1500, 560, EZ.INOUT],
    [1509, 1010, EZ.INOUT],
    [1570, 1632, EZ.INOUT],
  ]);
  const y = keyed(f, [
    [1494, 510],
    [1509, 510],
    [1570, 475, EZ.INOUT],
  ]);
  return [x, y];
}

/** Grain léger sur la toxine : casse les aplats en bandes à l'encodage h264. */
const Grain: React.FC<{ seed: number; opacity: number }> = ({
  seed,
  opacity,
}) => (
  <svg
    width={1920}
    height={1080}
    style={{ position: "absolute", inset: 0, opacity, mixBlendMode: "overlay" }}
  >
    <filter id={`grain-${seed}`}>
      <feTurbulence
        type="fractalNoise"
        baseFrequency="0.9"
        numOctaves="2"
        seed={seed}
        stitchTiles="stitch"
      />
      <feColorMatrix type="saturate" values="0" />
    </filter>
    <rect width="100%" height="100%" filter={`url(#grain-${seed})`} />
  </svg>
);
