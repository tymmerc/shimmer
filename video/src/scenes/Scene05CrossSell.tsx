import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import { Stage, Browser, StoreHeader, ProductCard } from "../ui";
import { Caption } from "../Caption";
import { C, F } from "../theme";

const SUGGESTIONS = [
  {
    name: "Maroilles fermier",
    price: "12,00 €",
    why: "L'accord classique",
    emoji: "🧀",
    tint: "#f5efe0",
  },
  {
    name: "Carafe à décanter",
    price: "49,00 €",
    why: "Pour aérer 30 min",
    emoji: "🍷",
    tint: "#efeaf6",
  },
  {
    name: "Côte-Rôtie 2019",
    price: "92,00 €",
    why: "Si vous montez en gamme",
    emoji: "🍷",
    tint: "#f3e6e6",
  },
];

/** Scène 5 — cross-sell IA : "Avec ça, on prend souvent...", et l'IA apprend
 *  de chaque vente. */
export const Scene05CrossSell: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const learn = spring({ frame: frame - 60, fps, config: { damping: 20 } });

  return (
    <Stage>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <Browser url="la-cave-de-demo.fr/gevrey-chambertin-2020">
          <StoreHeader query="" />
          <div style={{ padding: "40px 60px" }}>
            <div
              style={{ fontFamily: F.display, fontSize: 32, color: "#1a1a1a" }}
            >
              Avec ce vin, on prend souvent...
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 28,
                marginTop: 30,
              }}
            >
              {SUGGESTIONS.map((s, i) => {
                const t = spring({
                  frame: frame - 14 - i * 8,
                  fps,
                  config: { damping: 18 },
                });
                return (
                  <div
                    key={s.name}
                    style={{
                      opacity: t,
                      transform: `translateY(${interpolate(t, [0, 1], [30, 0])}px)`,
                    }}
                  >
                    <ProductCard
                      name={s.name}
                      price={s.price}
                      emoji={s.emoji}
                      tint={s.tint}
                    />
                    <div
                      style={{
                        marginTop: 8,
                        fontFamily: F.sans,
                        fontSize: 15,
                        color: C.violet,
                        fontStyle: "italic",
                      }}
                    >
                      « {s.why} »
                    </div>
                  </div>
                );
              })}
            </div>
            {/* tag apprentissage */}
            <div
              style={{
                opacity: learn,
                marginTop: 30,
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                background: "#f0ecff",
                border: `1px solid ${C.violet}33`,
                borderRadius: 999,
                padding: "10px 18px",
                fontFamily: F.sans,
                fontSize: 16,
                color: C.violet,
              }}
            >
              <span style={{ fontSize: 18 }}>✦</span> Les suggestions s'affinent
              à chaque vente
            </div>
          </div>
        </Browser>
      </AbsoluteFill>
      <Caption appearAt={16}>
        Et propose les bons accords, en apprenant de chaque vente.
      </Caption>
    </Stage>
  );
};
