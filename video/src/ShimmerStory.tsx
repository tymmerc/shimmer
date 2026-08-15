import React from "react";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { Scene01Arrival } from "./scenes/Scene01Arrival";
import { Scene02Search } from "./scenes/Scene02Search";
import { Scene03Refine } from "./scenes/Scene03Refine";
import { Scene04Product } from "./scenes/Scene04Product";
import { Scene05CrossSell } from "./scenes/Scene05CrossSell";
import { Scene06Abandon } from "./scenes/Scene06Abandon";
import { Scene07Relance } from "./scenes/Scene07Relance";
import { Scene08Time } from "./scenes/Scene08Time";
import { Scene09Tracking } from "./scenes/Scene09Tracking";
import { Scene10Merchant } from "./scenes/Scene10Merchant";

// Durées par scène (30 fps).
export const SCENES = [
  { c: Scene01Arrival, d: 75 },
  { c: Scene02Search, d: 85 },
  { c: Scene03Refine, d: 110 },
  { c: Scene04Product, d: 100 },
  { c: Scene05CrossSell, d: 100 },
  { c: Scene06Abandon, d: 120 },
  { c: Scene07Relance, d: 110 },
  { c: Scene08Time, d: 60 },
  { c: Scene09Tracking, d: 105 },
  { c: Scene10Merchant, d: 135 },
];

// Fondu enchaîné entre chaque scène (les transitions chevauchent les scènes).
const TR = 16;
export const TOTAL =
  SCENES.reduce((s, x) => s + x.d, 0) - (SCENES.length - 1) * TR;

export const ShimmerStory: React.FC = () => (
  <TransitionSeries>
    {SCENES.flatMap((s, i) => {
      const seq = (
        <TransitionSeries.Sequence key={`s${i}`} durationInFrames={s.d}>
          <s.c />
        </TransitionSeries.Sequence>
      );
      if (i === SCENES.length - 1) return [seq];
      return [
        seq,
        <TransitionSeries.Transition
          key={`t${i}`}
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TR })}
        />,
      ];
    })}
  </TransitionSeries>
);
