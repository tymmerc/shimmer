import React from "react";
import { Composition } from "remotion";
import { ShimmerStory, TOTAL } from "./ShimmerStory";
import { Probe } from "./pov/Probe";
import { ShimmerPOV } from "./pov2/ShimmerPOV";
import { FILM_DURATION } from "./pov2/timeline";
import { ProbeShop } from "./pov/ProbeShop";
import { ProbeKit } from "./pov/ProbeKit";

export const RemotionRoot: React.FC = () => (
  <>
  <Composition id="ShimmerPOV" component={ShimmerPOV} durationInFrames={FILM_DURATION} fps={30} width={1920} height={1080} />
  <Composition id="ProbeKit" component={ProbeKit} durationInFrames={60} fps={30} width={1920} height={1080} />
  <Composition id="ProbeShop" component={ProbeShop} durationInFrames={30} fps={30} width={1920} height={1080} />
  <Composition id="Probe" component={Probe} durationInFrames={90} fps={30} width={1920} height={1080} />
  <Composition
    id="ShimmerStory"
    component={ShimmerStory}
    durationInFrames={TOTAL}
    fps={30}
    width={1920}
    height={1080}
  />
  </>
);
