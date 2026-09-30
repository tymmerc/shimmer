import React from "react";
import { FONT } from "./brand";

export const CHROME_H = 46;

/**
 * Fenêtre de navigateur sobre (type Safari/Arc clair). Le contenu est rendu
 * à sa taille CSS réelle (VW × VH) : c'est le parent qui met à l'échelle.
 */
export const Browser: React.FC<{
  width: number;
  height: number;
  url: string;
  children: React.ReactNode;
  /** 0..1 : fenêtre plein cadre (coins 0, sans ombre) */
  bleed?: number;
}> = ({ width, height, url, children, bleed = 0 }) => (
  <div
    style={{
      width,
      height: height + CHROME_H,
      borderRadius: 14 * (1 - bleed),
      overflow: "hidden",
      background: "#fff",
      boxShadow: `0 60px 140px -40px rgba(0,0,0,${0.75 * (1 - bleed)}), 0 0 0 1px rgba(255,255,255,${0.08 * (1 - bleed)})`,
    }}
  >
    <div
      style={{
        height: CHROME_H,
        background: "#ecebe8",
        borderBottom: "1px solid #dcdad5",
        display: "flex",
        alignItems: "center",
        padding: "0 18px",
        gap: 8,
      }}
    >
      {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
        <div
          key={c}
          style={{ width: 12, height: 12, borderRadius: 6, background: c }}
        />
      ))}
      <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
        <div
          style={{
            width: 460,
            height: 28,
            borderRadius: 8,
            background: "#fff",
            border: "1px solid #dcdad5",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 7,
            fontFamily: FONT.shopSans,
            fontSize: 13.5,
            color: "#55504a",
          }}
        >
          <svg width="11" height="12" viewBox="0 0 11 12" fill="#8a847c">
            <path d="M2 5V3.5a3.5 3.5 0 0 1 7 0V5h.5A1.5 1.5 0 0 1 11 6.5v4A1.5 1.5 0 0 1 9.5 12h-8A1.5 1.5 0 0 1 0 10.5v-4A1.5 1.5 0 0 1 1.5 5H2zm1.5 0h4V3.5a2 2 0 0 0-4 0V5z" />
          </svg>
          {url}
        </div>
      </div>
      <div style={{ width: 52 }} />
    </div>
    <div style={{ width, height, overflow: "hidden", position: "relative" }}>
      {children}
    </div>
  </div>
);
