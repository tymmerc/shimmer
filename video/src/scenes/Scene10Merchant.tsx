import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import { Caption } from "../Caption";
import { C, F } from "../theme";

/** Scène 10 — le marchand à la plage pendant que Shimmer bosse, puis clôture. */
export const Scene10Merchant: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const sun = spring({ frame: frame - 4, fps, config: { damping: 18 } });
  const notif = spring({ frame: frame - 40, fps, config: { damping: 14 } });
  // bascule vers la clôture sur la fin
  const toClose = interpolate(frame, [110, 130], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill>
      {/* PLAGE */}
      <AbsoluteFill style={{ opacity: 1 - toClose }}>
        {/* ciel */}
        <AbsoluteFill
          style={{
            background:
              "linear-gradient(180deg, #fbd99b 0%, #ffcaa0 45%, #7fc8e0 72%, #4fb0d8 100%)",
          }}
        />
        {/* soleil */}
        <div
          style={{
            position: "absolute",
            top: 90,
            right: 220,
            width: 130,
            height: 130,
            borderRadius: "50%",
            background: "#fff3c4",
            boxShadow: "0 0 120px 50px rgba(255,240,180,0.8)",
            opacity: sun,
            transform: `scale(${sun})`,
          }}
        />
        {/* mer */}
        <div
          style={{
            position: "absolute",
            top: 620,
            left: 0,
            right: 0,
            height: 180,
            background: "linear-gradient(180deg, #3fa9d4, #2e8fc0)",
          }}
        />
        {/* sable */}
        <div
          style={{
            position: "absolute",
            top: 760,
            left: 0,
            right: 0,
            bottom: 0,
            background: "linear-gradient(180deg, #f0d9a8, #e6c98f)",
          }}
        />
        {/* scène plage en emojis */}
        <div
          style={{
            position: "absolute",
            top: 540,
            left: 0,
            right: 0,
            textAlign: "center",
            fontSize: 200,
            lineHeight: 1,
          }}
        >
          🏖️
        </div>
        <div
          style={{
            position: "absolute",
            top: 700,
            left: 0,
            right: 0,
            textAlign: "center",
            fontSize: 120,
          }}
        >
          😎🍹
        </div>
        {/* notif "ça vend tout seul" sur le téléphone */}
        <div
          style={{
            position: "absolute",
            top: 150,
            left: "50%",
            transform: `translateX(-50%) translateY(${interpolate(notif, [0, 1], [-30, 0])}px)`,
            opacity: notif,
            background: "rgba(13,11,20,0.92)",
            color: C.paper,
            borderRadius: 18,
            padding: "16px 24px",
            fontFamily: F.sans,
            fontSize: 24,
            display: "flex",
            alignItems: "center",
            gap: 14,
            boxShadow: "0 20px 50px rgba(0,0,0,0.3)",
          }}
        >
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: C.acid,
            }}
          />
          Shimmer : 3 ventes pendant que vous bronzez ☀️
        </div>
        <Caption appearAt={14}>
          Pendant ce temps, le marchand n'a rien à gérer.
        </Caption>
      </AbsoluteFill>

      {/* CLÔTURE */}
      <AbsoluteFill
        style={{
          background: C.ink,
          opacity: toClose,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse 50% 40% at 50% 45%, rgba(106,43,245,0.4), transparent 65%)",
          }}
        />
        <div
          style={{
            textAlign: "center",
            transform: `scale(${interpolate(toClose, [0, 1], [0.9, 1])})`,
          }}
        >
          <div
            style={{
              fontFamily: F.display,
              fontSize: 80,
              color: C.paper,
              fontWeight: 700,
            }}
          >
            Shimmer<span style={{ color: C.acid }}>.</span>
          </div>
          <div
            style={{
              fontFamily: F.sans,
              fontSize: 30,
              color: C.paperDim,
              marginTop: 18,
            }}
          >
            Votre boutique vend, répond et relance. Vous, vous vivez.
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
