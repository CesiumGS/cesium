// On-canvas callouts (S-I8, minor 9): the lunar clock's gain at the site
// while stand-on-moon shows or the site is selected, and Orion at the
// instant the globe shows while its path is drawn, with the frame it's
// drawn in. They go to the globe through the label board, with the triads'.
import type { Frame } from "../../src/frames/Frame.ts";
import type { LeapSeconds } from "../../src/time/leapSeconds.ts";
import type { LabelSpec } from "./globe.ts";
import type { OverlayState } from "./overlayConfig.ts";
import type { OrionLayer } from "./orionLayer.ts";
import { isFrame, type PageCore } from "./page.ts";
import type { ScenarioEvaluation } from "./scenarios/evaluate.ts";
import { LUNAR_SITE, type SceneSpec } from "./scenarios/scenes.ts";
import type { LabelBoard } from "./triadLayer.ts";

export interface Callouts {
  refresh(): void;
  /** Orion's marker came or went, or its minute changed, since the last refresh (the clock moved). */
  changed(): boolean;
  dispose(): void;
}

export function createCallouts(deps: {
  core: Pick<PageCore, "globe" | "view">;
  labels: LabelBoard;
  scene(): SceneSpec | undefined;
  local(): readonly Frame[];
  /** The current scenario's evaluation, and whether it's of another setup. */
  evaluation(): ScenarioEvaluation | undefined;
  stale(): boolean;
  orion: Pick<OrionLayer, "built" | "pathPoint" | "markerPoint">;
  /** Orion's overlay state. */
  orionOverlay: OverlayState;
  lunarSiteOrigin(): Float64Array | undefined;
  refreshTriads(): void;
  /** The frame data's leap seconds, once it's in (for the marker's UTC). */
  leapSeconds(): LeapSeconds | undefined;
}): Callouts {
  const { globe, view } = deps.core;
  const { orion } = deps;
  /** The marker's text as last shown, undefined when it wasn't. */
  let markerShown: string | undefined;

  /** "Orion, HH:MM UTC" at the instant the globe shows, while its path is drawn and Orion is in its data then. */
  function markerText(): string | undefined {
    const o = deps.orionOverlay;
    const instant = globe.shownAt();
    const leap = deps.leapSeconds();
    if (
      !o.on ||
      o.state !== "drawn" ||
      !instant ||
      !leap ||
      orion.markerPoint() === undefined
    ) {
      return undefined;
    }
    const hhmm = new Date(instant.toUtc(leap)).toISOString().slice(11, 16);
    return `Orion, ${hhmm} UTC`;
  }

  function refresh(): void {
    const orionBuilt = orion.built();
    const scene = deps.scene();
    const out: LabelSpec[] = [];
    const s = view.get().selection;
    const e = deps.evaluation();
    // Not a stale setup's gain (fix 1, item 1): "computing" until it's in.
    const gain =
      e?.scenario === "stand-on-moon" && !deps.stale()
        ? e.answer.value
        : undefined;
    if (
      deps.local().some((f) => f.name === LUNAR_SITE) &&
      (scene?.id === "stand-on-moon" || (isFrame(s) && s.id === LUNAR_SITE))
    ) {
      out.push({
        id: "callout:lunar-time",
        text:
          gain !== undefined
            ? // Short, so it stays inside the view (fix 2).
              `lunar clock ${gain >= 0 ? "+" : "−"}${Math.abs(gain).toFixed(2)} µs/day`
            : "lunar clock: computing its rate",
        at: () => globe.triadOrigin(LUNAR_SITE) ?? deps.lunarSiteOrigin(),
        priority: 4,
        leader: true,
      });
    }
    const o = deps.orionOverlay;
    markerShown = markerText();
    if (markerShown !== undefined) {
      // One clear indicator (fix 1): a dot on the path at Orion's place at
      // the instant the globe shows, that time beside it; the accuracy is
      // the answer's, on the callout. The dot comes from the OEM on this
      // thread every frame (orionLayer.ts `markerPoint`), and Orion's place
      // is the path's own sample at that instant in every frame the path is
      // drawn in (test/data/framesExplorerScenarios,
      // test/framesExplorerOrionMarker).
      out.push({
        id: "marker:orion-now",
        text: markerShown,
        at: () => orion.markerPoint(),
        family: "trajectory",
        priority: 5,
        marker: true,
        pinned: true,
      });
    }
    // The path says which frame it is drawn in, where it is drawn.
    if (o.on && o.state === "drawn" && orionBuilt) {
      const built = orionBuilt;
      const middle = built.chunks[Math.floor(built.chunks.length / 3)];
      if (middle) {
        out.push({
          id: "label:orion-path",
          text: `Orion's path, drawn in ${built.frame}`,
          at: () => orion.pathPoint(middle.origin),
          family: "trajectory",
          priority: 2,
        });
      }
    }
    deps.labels.set("callouts", out);
    deps.refreshTriads();
  }

  return {
    refresh,
    changed: () => markerText() !== markerShown,
    dispose: () => {},
  };
}
