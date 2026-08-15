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
import { Camera, cp } from "../Camera";
import { C, F } from "../theme";

/** Scène 4 — fiche produit. L'IA met un badge "Les clients recommandent",
 *  déduit en lisant les avis. Caméra : punch sur le badge, puis glisse vers
 *  la note "déduit de 47 avis". */
export const Scene04Product: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const badge = spring({ frame: frame - 20, fps, config: { damping: 13 } });

  const badgePt = cp(210, 180);
  const notePt = cp(770, 500);

  return (
    <AbsoluteFill>
      <Camera
        focuses={[
          { at: 0, scale: 1.0, x: 960, y: 540 },
          { at: 22, scale: 1.45, x: badgePt[0], y: badgePt[1] },
          { at: 46, scale: 1.45, x: badgePt[0], y: badgePt[1] },
          { at: 64, scale: 1.12, x: notePt[0], y: notePt[1] },
          { at: 95, scale: 1.12, x: notePt[0], y: notePt[1] },
        ]}
      >
        <Stage>
          <AbsoluteFill
            style={{ justifyContent: "center", alignItems: "center" }}
          >
            <Browser url="la-cave-de-demo.fr/gevrey-chambertin-2020">
              <StoreHeader query="" />
              <div style={{ display: "flex", gap: 48, padding: "48px 60px" }}>
                {/* visuel bouteille */}
                <div
                  style={{
                    position: "relative",
                    width: 420,
                    height: 560,
                    borderRadius: 18,
                    background: "#f3e6e6",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <span
                    style={{
                      fontSize: 240,
                      filter: "drop-shadow(0 20px 30px rgba(0,0,0,0.2))",
                    }}
                  >
                    🍷
                  </span>
                  <div
                    style={{
                      position: "absolute",
                      top: 18,
                      left: 18,
                      opacity: badge,
                      transform: `scale(${interpolate(badge, [0, 1], [0.6, 1])})`,
                      transformOrigin: "left top",
                      background: C.acid,
                      color: C.ink,
                      fontFamily: F.mono,
                      fontSize: 15,
                      fontWeight: 700,
                      padding: "9px 14px",
                      borderRadius: 999,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      boxShadow: "0 8px 24px rgba(212,255,58,0.4)",
                    }}
                  >
                    <span style={{ fontSize: 16 }}>★</span> Les clients
                    recommandent
                  </div>
                </div>
                {/* infos */}
                <div style={{ flex: 1, paddingTop: 20 }}>
                  <div
                    style={{
                      fontFamily: F.mono,
                      fontSize: 14,
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                      color: "#9a8",
                    }}
                  >
                    Domaine Trapet
                  </div>
                  <div
                    style={{
                      fontFamily: F.display,
                      fontSize: 46,
                      color: "#1a1a1a",
                      marginTop: 10,
                      lineHeight: 1.05,
                    }}
                  >
                    Gevrey-Chambertin 2020
                  </div>
                  <div
                    style={{
                      fontFamily: F.mono,
                      fontSize: 30,
                      color: C.acidDeep,
                      marginTop: 18,
                    }}
                  >
                    48,00 €
                  </div>
                  <p
                    style={{
                      fontFamily: F.sans,
                      fontSize: 19,
                      color: "#555",
                      lineHeight: 1.55,
                      marginTop: 22,
                      maxWidth: 460,
                    }}
                  >
                    Puissant et élégant, parfait sur une viande rouge ou un plat
                    mijoté.
                  </p>
                  {/* note IA déduite des avis */}
                  <div
                    style={{
                      opacity: badge,
                      marginTop: 18,
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      fontFamily: F.sans,
                      fontSize: 16,
                      color: C.violet,
                    }}
                  >
                    <span style={{ fontSize: 18 }}>✦</span> Déduit par l'IA en
                    lisant 47 avis clients
                  </div>
                  <div
                    style={{
                      marginTop: 28,
                      display: "inline-block",
                      background: C.ink,
                      color: C.paper,
                      fontFamily: F.sans,
                      fontSize: 18,
                      padding: "15px 30px",
                      borderRadius: 999,
                    }}
                  >
                    Ajouter au panier
                  </div>
                </div>
              </div>
            </Browser>
          </AbsoluteFill>
        </Stage>
      </Camera>
      <Caption appearAt={16}>
        L'IA lit les avis et met en avant ce que les clients valident.
      </Caption>
    </AbsoluteFill>
  );
};
