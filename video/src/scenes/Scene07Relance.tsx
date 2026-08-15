import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import { Cursor } from "../ui";
import { Caption } from "../Caption";
import { C, F } from "../theme";

/** Scène 7 — sur fond noir, le mail de relance glisse, clic, commande confirmée. */
export const Scene07Relance: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const mail = spring({ frame: frame - 6, fps, config: { damping: 20 } });
  const confirm = spring({ frame: frame - 78, fps, config: { damping: 12 } });

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
            "radial-gradient(ellipse 50% 50% at 50% 40%, rgba(106,43,245,0.25), transparent 70%)",
        }}
      />

      {/* carte email */}
      <div
        style={{
          width: 620,
          opacity: mail,
          transform: `translateY(${interpolate(mail, [0, 1], [40, 0])}px)`,
          position: "relative",
          zIndex: 2,
        }}
      >
        <div
          style={{
            background: "#fff",
            borderRadius: 18,
            overflow: "hidden",
            boxShadow: "0 40px 100px -30px rgba(0,0,0,0.7)",
          }}
        >
          <div
            style={{
              padding: "18px 24px",
              borderBottom: "1px solid #eee",
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: C.ink,
                color: C.acid,
                fontFamily: F.display,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              S
            </div>
            <div>
              <div
                style={{
                  fontFamily: F.sans,
                  fontWeight: 600,
                  fontSize: 16,
                  color: "#1a1a1a",
                }}
              >
                La Cave de Démo
              </div>
              <div style={{ fontFamily: F.sans, fontSize: 13, color: "#999" }}>
                à vous, il y a 1 jour
              </div>
            </div>
          </div>
          <div style={{ padding: "26px 28px" }}>
            <div
              style={{
                fontFamily: F.display,
                fontSize: 28,
                color: "#1a1a1a",
                lineHeight: 1.2,
              }}
            >
              Votre Gevrey-Chambertin vous attend
            </div>
            <p
              style={{
                fontFamily: F.sans,
                fontSize: 17,
                color: "#555",
                lineHeight: 1.55,
                marginTop: 14,
              }}
            >
              Bonjour, votre bouteille est toujours dans votre panier. Pour vous
              faire plaisir, profitez de <b>-10 %</b> aujourd'hui.
            </p>
            <div
              style={{
                marginTop: 20,
                display: "inline-block",
                background: C.violet,
                color: "#fff",
                fontFamily: F.sans,
                fontSize: 17,
                padding: "14px 26px",
                borderRadius: 999,
              }}
            >
              Revenir à mon panier
            </div>
          </div>
        </div>
        <Cursor
          from={[700, 360]}
          to={[250, 250]}
          startFrame={52}
          durationFrames={22}
        />
      </div>

      {/* tampon commande confirmée */}
      {confirm > 0.01 && (
        <div
          style={{
            position: "absolute",
            zIndex: 3,
            opacity: confirm,
            transform: `scale(${interpolate(confirm, [0, 1], [0.7, 1])})`,
            display: "flex",
            alignItems: "center",
            gap: 14,
            background: C.ok,
            color: C.ink,
            fontFamily: F.sans,
            fontWeight: 700,
            fontSize: 26,
            padding: "18px 30px",
            borderRadius: 16,
            boxShadow: "0 20px 50px rgba(95,208,138,0.5)",
          }}
        >
          ✓ Commande confirmée
        </div>
      )}

      <Caption appearAt={16}>
        Le lendemain, un mail de relance. Elle revient et achète.
      </Caption>
    </AbsoluteFill>
  );
};
