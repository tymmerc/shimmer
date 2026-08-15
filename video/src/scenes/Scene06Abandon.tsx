import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import { Stage, Browser, StoreHeader } from "../ui";
import { Caption } from "../Caption";
import { C, F } from "../theme";

/** Scène 6 — on VOIT l'ajout au panier (toast + compteur qui pop + article qui
 *  glisse), puis elle quitte : fondu au noir (panier abandonné). */
export const Scene06Abandon: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const added = frame >= 14;
  const cartPop = spring({ frame: frame - 14, fps, config: { damping: 10 } });
  const toast =
    spring({ frame: frame - 10, fps, config: { damping: 14 } }) *
    (1 -
      interpolate(frame, [40, 54], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      }));
  const item = spring({ frame: frame - 16, fps, config: { damping: 16 } });
  const leave = interpolate(frame, [92, 118], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <Stage glow={false}>
      <AbsoluteFill style={{ backgroundColor: C.ink }} />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          opacity: leave,
          transform: `scale(${interpolate(leave, [0, 1], [0.97, 1])})`,
        }}
      >
        <Browser>
          <StoreHeader query="" cart={added ? 1 : 0} cartPop={cartPop} />

          {/* toast d'ajout */}
          <div
            style={{
              position: "absolute",
              top: 24,
              left: "50%",
              transform: `translateX(-50%) translateY(${interpolate(toast, [0, 1], [-20, 0])}px)`,
              opacity: toast,
              background: C.ok,
              color: C.ink,
              fontFamily: F.sans,
              fontWeight: 700,
              fontSize: 18,
              padding: "12px 22px",
              borderRadius: 999,
              display: "flex",
              alignItems: "center",
              gap: 10,
              zIndex: 30,
              boxShadow: "0 14px 30px rgba(95,208,138,0.4)",
            }}
          >
            ✓ Ajouté au panier
          </div>

          <div style={{ padding: "48px 60px" }}>
            <div
              style={{ fontFamily: F.display, fontSize: 34, color: "#1a1a1a" }}
            >
              Votre panier
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 22,
                marginTop: 28,
                background: "#fff",
                border: "1px solid #ece7dd",
                borderRadius: 16,
                padding: 22,
                maxWidth: 620,
                opacity: item,
                transform: `translateX(${interpolate(item, [0, 1], [80, 0])}px)`,
              }}
            >
              <div
                style={{
                  width: 84,
                  height: 108,
                  borderRadius: 10,
                  background: "#f3e6e6",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 48,
                }}
              >
                🍷
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontFamily: F.mono,
                    fontSize: 11,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: "#a89f8d",
                  }}
                >
                  Domaine Trapet
                </div>
                <div
                  style={{
                    fontFamily: F.sans,
                    fontWeight: 600,
                    fontSize: 22,
                    color: "#1a1a1a",
                    marginTop: 3,
                  }}
                >
                  Gevrey-Chambertin 2020
                </div>
                <div
                  style={{
                    fontFamily: F.sans,
                    fontWeight: 700,
                    fontSize: 18,
                    color: "#1a1a1a",
                    marginTop: 8,
                  }}
                >
                  48,00 €
                </div>
              </div>
              <div
                style={{
                  fontFamily: F.sans,
                  fontSize: 16,
                  color: "#fff",
                  background: C.ink,
                  borderRadius: 999,
                  padding: "12px 22px",
                }}
              >
                Commander
              </div>
            </div>
          </div>
        </Browser>
      </AbsoluteFill>

      {frame < 74 ? (
        <Caption appearAt={16}>Un vin ajouté au panier.</Caption>
      ) : (
        <Caption appearAt={78}>Mais elle quitte. Panier abandonné.</Caption>
      )}
    </Stage>
  );
};
