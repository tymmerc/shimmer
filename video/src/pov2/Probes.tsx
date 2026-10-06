import React from "react";
import { AbsoluteFill } from "remotion";
import { ArtView, fitHeight } from "./Art";
import { TargetsReadout } from "./targets";
import { VariantContext, type Product } from "./variant";
import { VARIANTS } from "./variants";

/** Planche de contrôle : tous les produits de toutes les variantes (vignette 120 + dock 46). */
export const ProbeArt: React.FC = () => (
  <AbsoluteFill
    style={{ background: "#f4f0e8", padding: 24, boxSizing: "border-box" }}
  >
    {VARIANTS.map((v) => {
      const seen = new Map<string, Product>();
      for (const p of [
        ...v.shop.section.items,
        ...v.shop.hero.items.map((h) => h.p),
        ...v.replies.rows1,
        ...v.replies.rows2,
        ...v.replies.rows3,
        ...v.s08.items.map((s) => s.p),
      ])
        seen.set(p.id, p);
      return (
        <div
          key={v.id}
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: 18,
            height: 168,
          }}
        >
          <div
            style={{
              width: 120,
              fontFamily: "sans-serif",
              fontSize: 18,
              color: "#333",
            }}
          >
            {v.id}
          </div>
          {[...seen.values()].map((p) => (
            <div
              key={p.id}
              style={{ display: "flex", alignItems: "flex-end", gap: 6 }}
            >
              <div
                style={{
                  width: 132,
                  height: 132,
                  background: v.shop.theme.tile,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ArtView
                  art={p.art}
                  size={
                    p.art.kind === "bottle" ? 120 : fitHeight(p.art.kind, 110)
                  }
                  id={`pa-${v.id}-${p.id}`}
                />
              </div>
              <div
                style={{
                  width: 56,
                  height: 56,
                  background: "#f3f4f6",
                  borderRadius: 8,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ArtView
                  art={p.art}
                  size={
                    p.art.kind === "bottle" ? 50 : fitHeight(p.art.kind, 46)
                  }
                  id={`pd-${v.id}-${p.id}`}
                />
              </div>
            </div>
          ))}
        </div>
      );
    })}
  </AbsoluteFill>
);

/** Positions mesurées du curseur, par variante (la cave doit retomber sur le film 1). */
export const ProbeTargets: React.FC = () => (
  <AbsoluteFill style={{ background: "#111", padding: 40, gap: 30 }}>
    {VARIANTS.map((v) => (
      <VariantContext.Provider key={v.id} value={v}>
        <div style={{ position: "relative", height: 60 }}>
          <TargetsReadout v={v} />
        </div>
      </VariantContext.Provider>
    ))}
  </AbsoluteFill>
);
