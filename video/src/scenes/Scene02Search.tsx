import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Stage, Browser, StoreHeader, SEARCH, Cursor } from "../ui";
import { Caption } from "../Caption";
import { Camera, cp } from "../Camera";

/** Scène 2 — clic sur la barre, frappe "rouge". Caméra qui zoome sur le champ. */
export const Scene02Search: React.FC = () => {
  const frame = useCurrentFrame();
  const full = "rouge";
  const typed = full.slice(
    0,
    Math.max(0, Math.min(full.length, Math.floor((frame - 24) / 5))),
  );
  const focused = frame > 16;
  const field = cp(
    SEARCH.left + SEARCH.width / 2,
    SEARCH.top + SEARCH.height / 2,
  );

  return (
    <AbsoluteFill>
      <Camera
        focuses={[
          { at: 0, scale: 1.0, x: 960, y: 540 },
          { at: 16, scale: 1.55, x: field[0], y: field[1] },
          { at: 80, scale: 1.55, x: field[0], y: field[1] },
        ]}
      >
        <Stage>
          <AbsoluteFill
            style={{ justifyContent: "center", alignItems: "center" }}
          >
            <Browser>
              <StoreHeader query={typed} focused={focused} />
              <Cursor
                from={[900, 460]}
                to={[SEARCH.left + 30, SEARCH.top + 25]}
                startFrame={2}
                durationFrames={14}
              />
            </Browser>
          </AbsoluteFill>
        </Stage>
      </Camera>
      <Caption appearAt={28}>Elle cherche un rouge.</Caption>
    </AbsoluteFill>
  );
};
