import React from "react";
import { AbsoluteFill } from "remotion";
import { FONT, S } from "./brand";
import { Toxic } from "./Toxic";

/** Composition de test technique : polices + shader. Pas dans le film. */
export const Probe: React.FC = () => (
  <AbsoluteFill>
    <Toxic />
    <AbsoluteFill
      style={{ padding: 120, justifyContent: "center", color: S.paper }}
    >
      <div
        style={{
          fontFamily: FONT.display,
          fontSize: 120,
          letterSpacing: "-0.022em",
          lineHeight: 1.02,
        }}
      >
        Votre boutique{" "}
        <span style={{ fontStyle: "italic", color: S.acid }}>vend, répond</span>
      </div>
      <div style={{ fontFamily: FONT.sans, fontSize: 40, marginTop: 30 }}>
        Inter Tight · un rouge pour un barbecue
      </div>
      <div
        style={{
          fontFamily: FONT.mono,
          fontSize: 22,
          letterSpacing: "0.24em",
          marginTop: 20,
          color: S.acid,
        }}
      >
        JETBRAINS MONO · CAVES FORTY-TWO
      </div>
      <div
        style={{
          fontFamily: FONT.shopSerif,
          fontSize: 64,
          marginTop: 30,
          fontWeight: 600,
        }}
      >
        Caves Forty-Two
      </div>
    </AbsoluteFill>
  </AbsoluteFill>
);
