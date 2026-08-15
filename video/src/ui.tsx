import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  spring,
  useVideoConfig,
} from "remotion";
import { C, F } from "./theme";

/** Fond plein, couleur ink, avec un léger halo violet (la toxine). */
export const Stage: React.FC<{
  children?: React.ReactNode;
  glow?: boolean;
}> = ({ children, glow = true }) => (
  <AbsoluteFill style={{ backgroundColor: C.ink, overflow: "hidden" }}>
    {glow && (
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse 50% 40% at 75% 35%, rgba(106,43,245,0.45), transparent 60%)," +
            "radial-gradient(ellipse 40% 50% at 80% 75%, rgba(212,255,58,0.10), transparent 70%)",
        }}
      />
    )}
    {children}
  </AbsoluteFill>
);

/** Fenêtre navigateur stylisée qui contient la boutique. */
export const Browser: React.FC<{
  children: React.ReactNode;
  url?: string;
  style?: React.CSSProperties;
}> = ({ children, url = "la-cave-de-demo.fr", style }) => (
  <div
    style={{
      width: 1360,
      height: 820,
      borderRadius: 18,
      overflow: "hidden",
      background: "#faf8f4",
      boxShadow: "0 50px 120px -30px rgba(0,0,0,0.7)",
      border: `1px solid ${C.line}`,
      ...style,
    }}
  >
    <div
      style={{
        height: 52,
        background: "#efeae0",
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "0 18px",
        borderBottom: "1px solid #e3ddd0",
      }}
    >
      <Dot color="#ff5f57" />
      <Dot color="#febc2e" />
      <Dot color="#28c840" />
      <div
        style={{
          marginLeft: 16,
          flex: 1,
          height: 30,
          borderRadius: 8,
          background: "#fff",
          border: "1px solid #e3ddd0",
          display: "flex",
          alignItems: "center",
          padding: "0 14px",
          fontFamily: F.mono,
          fontSize: 14,
          color: "#9a9384",
        }}
      >
        {url}
      </div>
    </div>
    <div style={{ height: 768, position: "relative", background: "#faf8f4" }}>
      {children}
    </div>
  </div>
);

const Dot: React.FC<{ color: string }> = ({ color }) => (
  <div
    style={{ width: 13, height: 13, borderRadius: "50%", background: color }}
  />
);

// Géométrie déterministe de la barre de recherche (coords dans la zone contenu
// du navigateur), pour pouvoir greffer un menu déroulant dessus et viser au
// curseur précisément.
export const SEARCH = { left: 300, top: 22, width: 560, height: 50 };

/** En-tête boutique. `dropdown` est rendu greffé sous le champ de recherche
 *  (même largeur, attaché), comme un vrai menu d'autocomplétion. */
export const StoreHeader: React.FC<{
  query?: string;
  focused?: boolean;
  dropdown?: React.ReactNode;
  cart?: number;
  cartPop?: number;
}> = ({ query = "", focused = false, dropdown, cart, cartPop = 0 }) => (
  <div
    style={{
      position: "relative",
      height: 94,
      borderBottom: "1px solid #ece7dd",
    }}
  >
    <div
      style={{
        position: "absolute",
        left: 36,
        top: 30,
        fontFamily: F.display,
        fontSize: 28,
        fontWeight: 700,
        color: "#1a1a1a",
        whiteSpace: "nowrap",
      }}
    >
      La Cave de Démo
    </div>
    <div
      style={{
        position: "absolute",
        left: SEARCH.left,
        top: SEARCH.top,
        width: SEARCH.width,
        zIndex: 20,
      }}
    >
      <div
        style={{
          height: SEARCH.height,
          borderRadius: dropdown ? "12px 12px 0 0" : 12,
          background: "#fff",
          border: `2px solid ${focused ? C.violet : "#ddd6c8"}`,
          borderBottom: dropdown ? "none" : undefined,
          display: "flex",
          alignItems: "center",
          padding: "0 18px",
          fontFamily: F.sans,
          fontSize: 18,
          color: query ? "#1a1a1a" : "#a89f8d",
        }}
      >
        {query || "Rechercher un vin, ou décrivez votre besoin..."}
        {focused && <Caret />}
      </div>
      {/* Menu déroulant greffé : même largeur, collé au champ, coins bas arrondis. */}
      {dropdown && (
        <div
          style={{
            background: "#fff",
            border: `2px solid ${C.violet}`,
            borderTop: "none",
            borderRadius: "0 0 14px 14px",
            boxShadow: "0 24px 50px -24px rgba(0,0,0,0.25)",
            padding: "16px 18px",
          }}
        >
          {dropdown}
        </div>
      )}
    </div>
    <div
      style={{
        position: "absolute",
        right: 36,
        top: 34,
        display: "flex",
        gap: 22,
        fontFamily: F.sans,
        fontSize: 15,
        color: "#777",
      }}
    >
      <span>Vins</span>
      <span>Champagnes</span>
      <span>Coffrets</span>
      {cart !== undefined && (
        <div
          style={{
            position: "relative",
            fontSize: 22,
            transform: `scale(${1 + cartPop * 0.25})`,
          }}
        >
          🛒
          {cart > 0 && (
            <span
              style={{
                position: "absolute",
                top: -8,
                right: -10,
                background: C.violet,
                color: "#fff",
                fontFamily: F.mono,
                fontSize: 12,
                fontWeight: 700,
                width: 20,
                height: 20,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {cart}
            </span>
          )}
        </div>
      )}
    </div>
  </div>
);

const Caret: React.FC = () => {
  const frame = useCurrentFrame();
  const on = Math.floor(frame / 15) % 2 === 0;
  return (
    <span style={{ marginLeft: 2, color: C.violet, opacity: on ? 1 : 0 }}>
      |
    </span>
  );
};

/** Carte produit façon vraie boutique : visuel emoji sur fond teinté, nom,
 *  domaine, prix, note. Cohérent et lisible (pas de photo dépareillée). */
export const ProductCard: React.FC<{
  name: string;
  price: string;
  emoji?: string;
  tint?: string;
  producer?: string;
  rating?: string;
  badge?: string;
  style?: React.CSSProperties;
}> = ({
  name,
  price,
  emoji = "🍷",
  tint = "#f3e9ea",
  producer,
  rating,
  badge,
  style,
}) => (
  <div
    style={{
      background: "#fff",
      border: "1px solid #ece7dd",
      borderRadius: 16,
      overflow: "hidden",
      position: "relative",
      boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
      ...style,
    }}
  >
    {badge && (
      <div
        style={{
          position: "absolute",
          top: 12,
          left: 12,
          zIndex: 2,
          background: C.acid,
          color: C.ink,
          fontFamily: F.mono,
          fontSize: 12,
          fontWeight: 700,
          padding: "6px 10px",
          borderRadius: 999,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
        }}
      >
        {badge}
      </div>
    )}
    <div
      style={{
        aspectRatio: "4 / 3",
        background: tint,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderBottom: "1px solid #f0ebe1",
      }}
    >
      <span
        style={{
          fontSize: 88,
          filter: "drop-shadow(0 8px 14px rgba(0,0,0,0.18))",
        }}
      >
        {emoji}
      </span>
    </div>
    <div style={{ padding: "14px 16px" }}>
      {producer && (
        <div
          style={{
            fontFamily: F.mono,
            fontSize: 11,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "#a89f8d",
          }}
        >
          {producer}
        </div>
      )}
      <div
        style={{
          fontFamily: F.sans,
          fontWeight: 600,
          fontSize: 18,
          color: "#1a1a1a",
          marginTop: 3,
        }}
      >
        {name}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: 8,
        }}
      >
        <div
          style={{
            fontFamily: F.sans,
            fontWeight: 700,
            fontSize: 17,
            color: "#1a1a1a",
          }}
        >
          {price}
        </div>
        {rating && (
          <div style={{ fontFamily: F.sans, fontSize: 14, color: "#e0a82e" }}>
            ★ <span style={{ color: "#777" }}>{rating}</span>
          </div>
        )}
      </div>
    </div>
  </div>
);

/** Curseur souris animé qui se déplace de A à B sur une fenêtre. */
export const Cursor: React.FC<{
  from: [number, number];
  to: [number, number];
  startFrame: number;
  durationFrames: number;
}> = ({ from, to, startFrame, durationFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = spring({
    frame: frame - startFrame,
    fps,
    config: { damping: 18, mass: 0.7 },
    durationInFrames: durationFrames,
  });
  const x = interpolate(t, [0, 1], [from[0], to[0]]);
  const y = interpolate(t, [0, 1], [from[1], to[1]]);
  return (
    <svg
      width="34"
      height="34"
      viewBox="0 0 24 24"
      style={{
        position: "absolute",
        left: x,
        top: y,
        zIndex: 50,
        filter: "drop-shadow(0 3px 6px rgba(0,0,0,0.4))",
      }}
    >
      <path
        d="M4 2 L4 20 L9 15 L12.5 22 L15.5 20.5 L12 14 L19 14 Z"
        fill="#fff"
        stroke="#1a1a1a"
        strokeWidth="1.4"
      />
    </svg>
  );
};

/** Apparition douce (fade + montée). */
export const FadeUp: React.FC<{
  children: React.ReactNode;
  delay?: number;
  y?: number;
  style?: React.CSSProperties;
}> = ({ children, delay = 0, y = 30, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = spring({ frame: frame - delay, fps, config: { damping: 20 } });
  return (
    <div
      style={{
        opacity: t,
        transform: `translateY(${interpolate(t, [0, 1], [y, 0])}px)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};
