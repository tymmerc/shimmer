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

/** Scène 1 — la cliente arrive sur la boutique. La fenêtre monte en douceur. */
export const Scene01Arrival: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 22, mass: 0.9 } });
  const scale = interpolate(enter, [0, 1], [0.92, 1]);
  const y = interpolate(enter, [0, 1], [60, 0]);

  const products = [
    {
      name: "Gevrey-Chambertin 2020",
      price: "48,00 €",
      emoji: "🍷",
      tint: "#f3e6e6",
      producer: "Domaine Trapet",
      rating: "4.8 (47)",
    },
    {
      name: "Sancerre Blanc 2022",
      price: "21,00 €",
      emoji: "🥂",
      tint: "#f3f0e0",
      producer: "Domaine Vacheron",
      rating: "4.6 (32)",
    },
    {
      name: "Brouilly 2022",
      price: "15,00 €",
      emoji: "🍷",
      tint: "#f3e6e6",
      producer: "Château Thivin",
      rating: "4.5 (21)",
    },
    {
      name: "Champagne Brut",
      price: "42,00 €",
      emoji: "🍾",
      tint: "#f1ece1",
      producer: "Larmandier",
      rating: "4.9 (58)",
    },
  ];

  return (
    <Stage>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <div
          style={{
            transform: `translateY(${y}px) scale(${scale})`,
            opacity: enter,
          }}
        >
          <Browser>
            <StoreHeader />
            <div style={{ padding: "34px 36px" }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: 24,
                }}
              >
                {products.map((p, i) => {
                  const t = spring({
                    frame: frame - 14 - i * 5,
                    fps,
                    config: { damping: 20 },
                  });
                  return (
                    <div
                      key={p.name}
                      style={{
                        opacity: t,
                        transform: `translateY(${interpolate(t, [0, 1], [24, 0])}px)`,
                      }}
                    >
                      <ProductCard
                        name={p.name}
                        price={p.price}
                        emoji={p.emoji}
                        tint={p.tint}
                        producer={p.producer}
                        rating={p.rating}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </Browser>
        </div>
      </AbsoluteFill>
      <Caption appearAt={20}>Une cliente arrive sur la boutique.</Caption>
    </Stage>
  );
};
