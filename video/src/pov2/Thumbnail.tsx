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
          color: em ? S.display : S.paper,
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

// ── C : la vue d'ensemble (vend, répond, relance) ──────────────────────────
const Tag: React.FC<{ text: string; x: number; y: number }> = ({ text, x, y }) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      padding: "8px 14px",
      borderRadius: 999,
      background: S.acid,
      color: S.ink,
      fontFamily: FONT.mono,
      fontWeight: 500,
      fontSize: 24,
      letterSpacing: "0.14em",
      boxShadow: "0 10px 30px rgba(0,0,0,.35)",
    }}
  >
    {text}
  </div>
);

const Card: React.FC<{ x: number; y: number; w: number; children: React.ReactNode }> = ({ x, y, w, children }) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      width: w,
      boxSizing: "border-box",
      padding: "22px 26px",
      borderRadius: 22,
      background: "#fbf9f4",
      boxShadow: "0 30px 70px -20px rgba(0,0,0,.6)",
      fontFamily: FONT.shopSans,
      color: "#1f1a17",
    }}
  >
    {children}
  </div>
);

export const ThumbC: React.FC = () => (
  <AbsoluteFill style={{ background: S.ink, overflow: "hidden" }}>
    <Toxic intensity={1} glow={[1420, 560]} speed={1.4} />
    <AbsoluteFill style={{ background: "linear-gradient(90deg, #0d0b14 0%, rgba(13,11,20,.92) 40%, rgba(13,11,20,.2) 62%, rgba(13,11,20,0) 100%)" }} />
    <Headline
      lines={[["Votre boutique", false], ["vend, répond", true], ["et relance", true], ["toute seule.", false]]}
      x={104}
      top={190}
      size={118}
    />
    {/* VEND : le dock avec les bouteilles proposées */}
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: 1920,
        height: 1080,
        transformOrigin: "0 0",
        transform: "translate(960px, 36px) scale(0.5)",
        filter: "drop-shadow(0 40px 80px rgba(0,0,0,.55))",
      }}
    >
      <div style={{ position: "absolute", left: 40, top: 40, width: 1840, height: 860, borderRadius: 28, overflow: "hidden" }}>
        <div style={{ position: "absolute", left: -40, top: -40, width: 1920, height: 1080 }}>
          <ShopTake f={700} />
        </div>
      </div>
    </div>
    <Tag text="VEND" x={1730} y={36} />
    {/* RÉPOND : le suivi de commande dans le chat (texte du code, order-tracking.ts) */}
    <Card x={1000} y={478} w={620}>
      <div style={{ fontSize: 19, color: "#7a716a", marginBottom: 12 }}>Caves Forty-Two · aide</div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
        <div style={{ background: "#e9e5de", borderRadius: 18, padding: "10px 16px", fontSize: 24 }}>Où en est ma commande ?</div>
      </div>
      <div style={{ background: "rgba(122,31,43,0.08)", color: "#5c1520", borderRadius: 18, padding: "12px 16px", fontSize: 24, lineHeight: 1.35 }}>
        Votre commande C42-5008 est en route avec Colissimo, elle est partie hier. <u>Voici votre suivi.</u>
      </div>
    </Card>
    <Tag text="RÉPOND" x={1500} y={458} />
    {/* RELANCE : l'e-mail de retour en stock (stock-alerts.ts) */}
    <Card x={1150} y={806} w={700}>
      <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
        <div style={{ width: 58, height: 58, borderRadius: 14, background: "#7a1f2b", display: "flex", alignItems: "center", justifyContent: "center", flex: "0 0 auto" }}>
          <svg width="30" height="22" viewBox="0 0 30 22" fill="none" stroke="#fbf9f4" strokeWidth="2.6" strokeLinejoin="round">
            <rect x="1.5" y="1.5" width="27" height="19" rx="3" />
            <path d="M2 3l13 10L28 3" />
          </svg>
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 19, color: "#7a716a" }}>Caves Forty-Two · e-mail</div>
          <div style={{ fontSize: 27, fontWeight: 600, whiteSpace: "nowrap" }}>Crozes-Hermitage 2021 est de retour</div>
          <div style={{ fontSize: 20, color: "#7a716a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 560 }}>
            Vous nous aviez demandé de vous prévenir…
          </div>
        </div>
      </div>
    </Card>
    <Tag text="RELANCE" x={1680} y={784} />
    <Wordmark x={110} baseline={985} size={64} />
  </AbsoluteFill>
);
