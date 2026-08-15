import React from "react";
import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { C, F } from "./theme";

/** Sous-titre / narration en bas de l'écran, style sobre Shimmer. */
export const Caption: React.FC<{
  children: React.ReactNode;
  appearAt?: number;
}> = ({ children, appearAt = 6 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = spring({ frame: frame - appearAt, fps, config: { damping: 22 } });
  return (
    <div
      style={{
        position: "absolute",
        bottom: 70,
        left: 0,
        right: 0,
        textAlign: "center",
        opacity: t,
        transform: `translateY(${interpolate(t, [0, 1], [20, 0])}px)`,
      }}
    >
      <span
        style={{
          fontFamily: F.sans,
          fontSize: 34,
          color: C.paper,
          fontWeight: 500,
          background: "rgba(13,11,20,0.5)",
          padding: "10px 22px",
          borderRadius: 14,
          backdropFilter: "blur(4px)",
          lineHeight: 1.4,
        }}
      >
        {children}
      </span>
    </div>
  );
};

/** Petit label mono acide (eyebrow). */
export const Eyebrow: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <div
    style={{
      fontFamily: F.mono,
      fontSize: 16,
      letterSpacing: "0.24em",
      textTransform: "uppercase",
      color: C.acid,
    }}
  >
    {children}
  </div>
);
