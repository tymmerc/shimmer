import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
} from "remotion";
import { Stage, Browser, StoreHeader, SEARCH, Cursor } from "../ui";
import { Caption } from "../Caption";
import { Camera, cp } from "../Camera";
import { C, F } from "../theme";

const CHIPS = ["Apéritif", "Un repas", "Un cadeau", "Découvrir"];
const REPAS = 1;

/** Scène 3 — le vendeur affine DANS la barre. Caméra qui zoome sur la zone
 *  recherche puis punch sur "Un repas" au clic. Rythme serré. */
export const Scene03Refine: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const snappy = { damping: 14, mass: 0.6 };
  const click = spring({ frame: frame - 48, fps, config: { damping: 12 } });

  const dropdown = (
    <div>
      <div
        style={{
          fontFamily: F.sans,
          fontSize: 19,
          color: "#2a2440",
          lineHeight: 1.4,
        }}
      >
        <span style={{ color: C.violet, fontWeight: 600 }}>Avec plaisir.</span>{" "}
        Pour « rouge », c'est pour quelle occasion ?
      </div>
      <div
        style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}
      >
        {CHIPS.map((c, i) => {
          const appear = spring({
            frame: frame - 12 - i * 3,
            fps,
            config: snappy,
          });
          const hot = i === REPAS ? click : 0;
          return (
            <div
              key={c}
              style={{
                opacity: appear,
                transform: `scale(${(0.9 + 0.1 * appear) * (1 + hot * 0.06)})`,
                fontFamily: F.sans,
                fontSize: 17,
                border: `1.5px solid ${C.violet}`,
                borderRadius: 999,
                padding: "9px 16px",
                color: hot > 0.3 ? "#fff" : C.violet,
                background: hot > 0.3 ? C.violet : "transparent",
              }}
            >
              {c}
            </div>
          );
        })}
      </div>
    </div>
  );

  const searchCenter = cp(SEARCH.left + SEARCH.width / 2, 140);
  const chip = cp(SEARCH.left + 182, 176);

  return (
    <AbsoluteFill>
      <Camera
        focuses={[
          { at: 0, scale: 1.08, x: searchCenter[0], y: searchCenter[1] },
          { at: 10, scale: 1.35, x: searchCenter[0], y: searchCenter[1] },
          { at: 44, scale: 1.35, x: searchCenter[0], y: searchCenter[1] },
          { at: 60, scale: 1.9, x: chip[0], y: chip[1] },
          { at: 115, scale: 1.9, x: chip[0], y: chip[1] },
        ]}
      >
        <Stage>
          <AbsoluteFill
            style={{ justifyContent: "center", alignItems: "center" }}
          >
            <Browser>
              <StoreHeader query="rouge" focused dropdown={dropdown} />
              <Cursor
                from={[720, 430]}
                to={[SEARCH.left + 182, 176]}
                startFrame={30}
                durationFrames={18}
              />
            </Browser>
          </AbsoluteFill>
        </Stage>
      </Camera>
      <Caption appearAt={8}>Le vendeur affine, comme en magasin.</Caption>
    </AbsoluteFill>
  );
};
