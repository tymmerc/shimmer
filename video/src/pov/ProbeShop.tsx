import React from "react";
import { AbsoluteFill } from "remotion";
import { S } from "./brand";
import { WINES } from "./catalog";
import { Cursor } from "./Cursor";
import { Dock } from "./Dock";
import { DOCK_POS, Shop, VH, VW } from "./Shop";

/** Planche de contrôle : boutique + dock ouvert. Pas dans le film. */
export const ProbeShop: React.FC = () => {
  const k = 1080 / VH;
  return (
    <AbsoluteFill
      style={{
        background: S.ink,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div style={{ width: VW, height: VH, transform: `scale(${k})` }}>
        <Shop
          search={{ text: "un rouge pour un barbecue", focus: 1, caret: true }}
          cartCount={1}
          overlay={
            <div
              style={{
                position: "absolute",
                left: DOCK_POS.x,
                top: DOCK_POS.y,
              }}
            >
              <Dock
                width={DOCK_POS.w}
                open={1}
                restock={{
                  wine: WINES.crozes,
                  p: 1,
                  email: "lea.m@gmail.com",
                  caret: true,
                  done: 0,
                }}
                items={[
                  { wine: WINES.vacqueyras, p: 1 },
                  { wine: WINES.madiran, p: 1, hover: 1 },
                  { wine: WINES.saintjo, p: 1 },
                ]}
                question={{
                  text: "Plutôt **fruité et gourmand**, ou **charpenté** pour les grillades ?",
                  p: 1,
                }}
                chips={{
                  list: [
                    { label: "Fruité" },
                    { label: "Charpenté", fill: 1 },
                    { label: "Moins de 15 €" },
                  ],
                  p: 1,
                }}
              />
              <Cursor x={300} y={250} />
            </div>
          }
        />
      </div>
    </AbsoluteFill>
  );
};
