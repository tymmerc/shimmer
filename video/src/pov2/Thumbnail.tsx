import React from "react";
import { AbsoluteFill } from "remotion";
import { FONT, S } from "../pov/brand";
import { Toxic } from "../pov/Toxic";
import { PhoneChat } from "./Phone";
import { ShopTake } from "./ShopTake";

/**
 * Miniatures de la vidéo (LinkedIn, 1920x1080, même format que le film).
 * A : l'histoire (le texto, « Je n'y connais rien. »).
 * B : le produit (la question du vendeur dans la barre de recherche).
 * Mêmes composants que le film, rendus à une image fixe.
 */

const Wordmark: React.FC<{ x: number; baseline: number; size: number }> = ({
  x,
  baseline,
  size,
}) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: baseline - size * 0.82,
      fontFamily: FONT.display,
      fontWeight: 500,
      fontSize: size,
      lineHeight: 1,
      letterSpacing: "-0.022em",
      color: S.paper,
    }}
  >
    Shimmer<span style={{ color: S.acid }}>.</span>
  </div>
);

const Kicker: React.FC<{ text: string; x: number; baseline: number }> = ({
  text,
  x,
  baseline,
}) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: baseline - 30 * 0.8,
      fontFamily: FONT.mono,
      fontWeight: 500,
      fontSize: 30,
      letterSpacing: "0.16em",
      color: "rgba(251,249,244,0.72)",
      whiteSpace: "nowrap",
    }}
  >
    {text}
  </div>
);

const Headline: React.FC<{
  lines: Array<[string, boolean]>;
  x: number;
  top: number;
  size: number;
}> = ({ lines, x, top, size }) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top,
      fontFamily: FONT.display,
      fontSize: size,
      lineHeight: 1.02,
      letterSpacing: "-0.022em",
      color: S.paper,
    }}
  >
    {lines.map(([t, em]) => (
      <div
        key={t}
        style={{
          fontStyle: em ? "italic" : "normal",
          color: em ? S.acid : S.paper,
          whiteSpace: "nowrap",
        }}
      >
        {t}
      </div>
    ))}
  </div>
);

export const ThumbA: React.FC = () => (
  <AbsoluteFill style={{ background: S.ink, overflow: "hidden" }}>
    <Toxic intensity={1} glow={[1480, 430]} speed={1.4} />
    <AbsoluteFill
      style={{
        background:
          "linear-gradient(90deg, #0d0b14 0%, rgba(13,11,20,.9) 38%, rgba(13,11,20,0) 62%)",
      }}
    />
    <div
      style={{ position: "absolute", inset: 0, transform: "translateX(430px)" }}
    >
      <PhoneChat f={83} fps={30} />
    </div>
    <Kicker text="VOTRE BOUTIQUE, CÔTÉ CLIENT" x={110} baseline={300} />
    <Headline
      lines={[
        ["Je n’y", false],
        ["connais", false],
        ["rien.", true],
      ]}
      x={104}
      top={340}
      size={170}
    />
    <Wordmark x={110} baseline={985} size={64} />
  </AbsoluteFill>
);

export const ThumbB: React.FC = () => (
  <AbsoluteFill style={{ background: S.ink, overflow: "hidden" }}>
    <Toxic intensity={1} glow={[1650, 760]} speed={1.4} />
    <AbsoluteFill
      style={{
        background:
          "linear-gradient(180deg, #0d0b14 0%, rgba(13,11,20,.88) 34%, rgba(13,11,20,0) 70%)",
      }}
    />
    <Headline
      lines={[
        ["Votre barre de recherche", false],
        ["vend comme un caviste.", true],
      ]}
      x={104}
      top={96}
      size={112}
    />
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: 1920,
        height: 1080,
        transformOrigin: "0 0",
        transform: "translate(560px, 350px) scale(0.7)",
        filter: "drop-shadow(0 40px 80px rgba(0,0,0,.55))",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 40,
          top: 40,
          width: 1840,
          height: 860,
          borderRadius: 18,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: -40,
            top: -40,
            width: 1920,
            height: 1080,
          }}
        >
          <ShopTake f={372} />
        </div>
      </div>
    </div>
    <Wordmark x={110} baseline={985} size={64} />
  </AbsoluteFill>
);
