import React from "react";
import { Composition } from "remotion";
import { ShimmerStory, TOTAL } from "./ShimmerStory";

export const RemotionRoot: React.FC = () => (
  <Composition
    id="ShimmerStory"
    component={ShimmerStory}
    durationInFrames={TOTAL}
    fps={30}
    width={1920}
    height={1080}
  />
);
