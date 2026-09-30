import React from "react";
import { Composition } from "remotion";
import { ShimmerStory, TOTAL } from "./ShimmerStory";
import { Probe } from "./pov/Probe";
import { ShimmerPOV } from "./pov2/ShimmerPOV";
import { ThumbA, ThumbB, ThumbC } from "./pov2/Thumbnail";
import { FILM_DURATION } from "./pov2/timeline";
import { ProbeShop } from "./pov/ProbeShop";
import { ProbeKit } from "./pov/ProbeKit";

export const RemotionRoot: React.FC = () => (
  <>
  <Composition id="ShimmerPOV" component={ShimmerPOV} durationInFrames={FILM_DURATION} fps={30} width={1920} height={1080} />
  <Composition id="Thumb-A" component={ThumbA} durationInFrames={1} fps={30} width={1920} height={1080} />
  <Composition id="Thumb-B" component={ThumbB} durationInFrames={1} fps={30} width={1920} height={1080} />
  <Composition id="Thumb-C" component={ThumbC} durationInFrames={1} fps={30} width={1920} height={1080} />
  <Composition id="ShimmerPOV-VO" component={ShimmerPOV} durationInFrames={FILM_DURATION} fps={30} width={1920} height={1080} defaultProps={{ subtitles: false }} />
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
