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

const Bubble: React.FC<{
  side: "user" | "bot";
  children: React.ReactNode;
  t: number;
}> = ({ side, children, t }) => (
  <div
    style={{
      alignSelf: side === "user" ? "flex-end" : "flex-start",
      maxWidth: "82%",
      opacity: t,
      transform: `translateY(${interpolate(t, [0, 1], [12, 0])}px)`,
      background: side === "user" ? C.acid : "#f1eee8",
      color: side === "user" ? C.ink : "#1a1a1a",
      fontFamily: F.sans,
      fontSize: 16,
      lineHeight: 1.45,
      padding: "12px 15px",
      borderRadius:
        side === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
    }}
  >
    {children}
  </div>
);

/** Scène 9 — elle revient, ouvre le chat pour suivre sa commande. Le SAV
 *  répond. Caméra zoomée sur la fenêtre de chat, rythme serré. */
export const Scene09Tracking: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const win = spring({
    frame: frame - 4,
    fps,
    config: { damping: 14, mass: 0.6 },
  });
  const q = spring({ frame: frame - 16, fps, config: { damping: 14 } });
  const a = spring({ frame: frame - 44, fps, config: { damping: 15 } });
  const chat = cp(1110, 582);

  return (
    <AbsoluteFill>
      <Camera
        focuses={[
          { at: 0, scale: 1.0, x: 960, y: 540 },
          { at: 14, scale: 1.32, x: chat[0], y: chat[1] },
          { at: 100, scale: 1.32, x: chat[0], y: chat[1] },
        ]}
      >
        <Stage>
          <AbsoluteFill
            style={{ justifyContent: "center", alignItems: "center" }}
          >
            <Browser>
              <StoreHeader query="" />
              {/* fenêtre de chat en bas à droite */}
              <div
                style={{
                  position: "absolute",
                  right: 40,
                  bottom: 36,
                  width: 420,
                  opacity: win,
                  transform: `translateY(${interpolate(win, [0, 1], [40, 0])}px)`,
                  background: "#fff",
                  borderRadius: 18,
                  overflow: "hidden",
                  boxShadow: "0 30px 70px -25px rgba(0,0,0,0.35)",
                  border: "1px solid #ece7dd",
                }}
              >
                <div
                  style={{
                    background: C.ink,
                    color: C.paper,
                    padding: "14px 18px",
                    fontFamily: F.sans,
                    fontWeight: 600,
                    fontSize: 16,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <span
                    style={{
                      width: 9,
                      height: 9,
                      borderRadius: "50%",
                      background: C.acid,
                    }}
                  />{" "}
                  Le vendeur
                </div>
                <div
                  style={{
                    padding: 18,
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                    minHeight: 220,
                  }}
                >
                  <Bubble side="user" t={q}>
                    Où en est ma commande ?
                  </Bubble>
                  <Bubble side="bot" t={a}>
                    Votre Gevrey-Chambertin est <b>expédié</b> 📦 Livraison
                    prévue demain. Suivi : Colissimo 6A1234. Santé !
                  </Bubble>
                </div>
              </div>
            </Browser>
          </AbsoluteFill>
        </Stage>
      </Camera>
      <Caption appearAt={16}>
        Elle revient suivre sa commande. Le SAV répond, tout seul.
      </Caption>
    </AbsoluteFill>
  );
};
