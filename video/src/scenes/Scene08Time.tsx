import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { C, F } from "../theme";

/** Scène 8 — transition "le temps passe" : des jours qui défilent. */
export const Scene08Time: React.FC = () => {
  const frame = useCurrentFrame();
  // défilement de jours
  const days = ["Jour 1", "Jour 2", "Jour 3"];
  const idx = Math.min(days.length - 1, Math.floor(frame / 18));
  const fadeIn = interpolate(frame, [0, 10], [0, 1], {
    extrapolateRight: "clamp",
  });
  const fadeOut = interpolate(frame, [50, 64], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: C.ink,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse 40% 40% at 50% 50%, rgba(106,43,245,0.2), transparent 70%)",
        }}
      />
      <div style={{ opacity: fadeIn * fadeOut, textAlign: "center" }}>
        <div
          style={{
            fontFamily: F.mono,
            fontSize: 18,
            letterSpacing: "0.3em",
            textTransform: "uppercase",
            color: C.acid,
          }}
        >
          Le temps passe
        </div>
        <div
          style={{
            fontFamily: F.display,
            fontSize: 92,
            color: C.paper,
            marginTop: 16,
          }}
        >
          {days[idx]}
        </div>
      </div>
    </AbsoluteFill>
  );
};
