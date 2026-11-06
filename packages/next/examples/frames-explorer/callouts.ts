// On-canvas callouts (S-I8, minor 9): the lunar clock's gain at the site
// while stand-on-moon shows or the site is selected, and Orion at the
// clock's instant while its path is drawn, with the frame it's drawn in.
// They go to the globe through the label board, with the triads'.
import type { Frame } from "../../src/frames/Frame.ts";
import type { LabelSpec } from "./globe.ts";
import type { OverlayState } from "./overlayConfig.ts";
import type { OrionLayer } from "./orionLayer.ts";
import { isFrame, type PageCore } from "./page.ts";
import type { ScenarioEvaluation } from "./scenarios/evaluate.ts";
import { LUNAR_SITE, type SceneSpec } from "./scenarios/scenes.ts";
import type { LabelBoard } from "./triadLayer.ts";

export interface Callouts {
  refresh(): void;
  /** "Orion now" became current or stale since the last refresh (the clock moved). */
  orionNowChanged(): boolean;
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
  orion: Pick<
    OrionLayer,
    "info" | "error" | "built" | "nowCurrent" | "pathPoint"
  >;
  /** Orion's overlay state. */
  orionOverlay: OverlayState;
  lunarSiteOrigin(): Float64Array | undefined;
  refreshTriads(): void;
}): Callouts {
  const { globe, view } = deps.core;
  const { orion } = deps;
  let orionNowShown = false;

  function refresh(): void {
    orionNowShown = orion.nowCurrent();
    const orionInfo = orion.info();
    const orionInfoError = orion.error();
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
    // Only while it is Orion's position now: a statement for another time
    // (the clock was just scrubbed) would hang the marker off the path.
    if (
      o.on &&
      o.state === "drawn" &&
      orionInfo &&
      orion.nowCurrent() &&
      !orionInfoError
    ) {
      // One clear indicator (fix 1): a dot on the path at Orion's place at
      // the clock's time, its time beside it; the accuracy is the answer's,
      // on the callout. Orion's place in ITRF is on the drawn path in every
      // frame: the path is placed by its frame now (orionLayer.ts `place`),
      // so its sample at this time lands here
      // (test/data/framesExplorerScenarios).
      const hhmm = new Date(orionInfo.utc).toISOString().slice(11, 16);
      out.push({
        id: "marker:orion-now",
        text: `Orion, ${hhmm} UTC`,
        at: orionInfo.info.itrf,
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
    orionNowChanged: () => orion.nowCurrent() !== orionNowShown,
    dispose: () => {},
  };
}
