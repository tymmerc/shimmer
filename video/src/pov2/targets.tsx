import React, { useLayoutEffect, useRef, useState } from "react";
import { continueRender, delayRender } from "remotion";
import { ShimmerDock } from "./ShimmerDock";
import { dockAt, FILM1_TARGETS, type DockTargets } from "./state";
import type { Variant } from "./variant";

/**
 * Où cliquer dans le dock ? Les libellés (puces, nom du produit épuisé) changent
 * d'une variante à l'autre, donc la puce choisie, le champ email et le bouton
 * bougent. On rend le dock dans trois états, invisible et sans transformation,
 * on lit les positions une fois les polices chargées, et le curseur vise ces
 * points. La cave garde les cibles du film 1 (validé), au pixel près.
 */
const PROBE_FRAMES = { chips: 390, restock: 1002, recap: 1091 } as const;

function center(
  el: Element | null,
  origin: DOMRect,
  k: number,
): [number, number] | null {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return [
    Math.round(((r.left + r.width / 2 - origin.left) / k) * 2) / 2,
    Math.round(((r.top + r.height / 2 - origin.top) / k) * 2) / 2,
  ];
}

export function useDockTargets(v: Variant): [React.ReactNode, DockTargets] {
  const ref = useRef<HTMLDivElement>(null);
  const [measured, setMeasured] = useState<DockTargets | null>(null);
  const [handle] = useState(() => delayRender(`mesure du dock (${v.id})`));
  const released = useRef(false);

  useLayoutEffect(() => {
    const measure = () => {
      const box = ref.current;
      if (!box) return;
      const origin = box.getBoundingClientRect();
      const k = origin.width / 1440 || 1;
      const q = (sel: string) => box.querySelector(sel);
      const chip = center(
        q(`[data-probe="chips"] [data-chip="${v.guided.pick}"]`),
        origin,
        k,
      );
      const input = center(
        q(`[data-probe="restock"] [data-restock-input]`),
        origin,
        k,
      );
      const button = center(
        q(`[data-probe="restock"] [data-restock-btn]`),
        origin,
        k,
      );
      const recap = q(`[data-probe="recap"]`)?.getBoundingClientRect();
      if (!chip || !input || !button || !recap) return;
      // Le champ email : on clique dans son premier tiers (comme le film 1), pas au centre.
      const inputEl = q(
        `[data-probe="restock"] [data-restock-input]`,
      )!.getBoundingClientRect();
      const inputX = (inputEl.left + inputEl.width * 0.42 - origin.left) / k;
      const next: DockTargets = {
        chip,
        input: [Math.round(inputX * 2) / 2, input[1]],
        button,
        recapBottom: Math.round((recap.bottom - origin.top) / k),
      };
      setMeasured((prev) =>
        prev && JSON.stringify(prev) === JSON.stringify(next) ? prev : next,
      );
    };
    measure();
    document.fonts.ready.then(() => {
      measure();
      if (!released.current) {
        released.current = true;
        continueRender(handle);
      }
    });
  });

  const probe = (
    <div
      ref={ref}
      aria-hidden
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: 1440,
        height: 673,
        visibility: "hidden",
        pointerEvents: "none",
      }}
    >
      {(Object.keys(PROBE_FRAMES) as Array<keyof typeof PROBE_FRAMES>).map(
        (k) => {
          const ui = dockAt(v, PROBE_FRAMES[k]);
          return ui ? <ShimmerDock key={k} ui={ui} probe={k} /> : null;
        },
      )}
    </div>
  );
  const targets = v.id === "cave" ? FILM1_TARGETS : (measured ?? FILM1_TARGETS);
  return [probe, targets];
}

/** Valeurs mesurées, pour vérification (composition « ProbeTargets »). */
export const TargetsReadout: React.FC<{ v: Variant }> = ({ v }) => {
  const [probe, t] = useDockTargets({ ...v, id: `${v.id}-mesure` });
  return (
    <>
      {probe}
      <div style={{ fontFamily: "monospace", fontSize: 28, color: "#fff" }}>
        {v.id} : puce {t.chip.join(",")} · email {t.input.join(",")} · bouton{" "}
        {t.button.join(",")} · bas du récap {t.recapBottom}
      </div>
    </>
  );
};
