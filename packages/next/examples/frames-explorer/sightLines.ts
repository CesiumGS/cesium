// The scenario's lines of sight over the drawn terrain (Task 6b), on the
// page's thread: the worker says where each starts and which way it goes
// (`ScenarioEvaluation.sightLines`, Earth-fixed); here each is traced
// exactly against the terrain triangles the view draws
// (`terrainLineOfSight` over `Tileset3D.terrainRayTarget`), for the local
// horizon: the dish's own hills, or the ridges round Sacramento.
//
// The first trace over freshly loaded tiles costs about 30 ms, so it runs
// on demand: when the evaluation changes, and 300 ms after the terrain's
// heights last changed as tiles load (trailing), never every frame. The
// stage says when the globe itself changes (no polling). A path
// over terrain that isn't drawn, or drawn only coarsely while finer tiles
// load, is unknown, never clear; inside the terrain's error it "may block"
// (Review Focus 2). Without the terrain globe nothing is traced and the line
// says why.
import { Ellipsoid } from "../../src/math/ellipsoid.ts";
import {
  terrainLineOfSight,
  type TerrainLineOfSight,
} from "../../src/measure/terrainLineOfSight.ts";
import type { Viewer } from "../../widgets/index.ts";
import { length } from "./panel/format.ts";
import type { SightLine } from "./scenarios/evaluate.ts";

import type { TerrainSightView } from "./panel/model.ts";

export type { TerrainSightView };

/** How high an observer on the drawn ground stands above it, m (an eye, or a dish's axes). */
export const OBSERVER_LIFT = 2;

/** The trace waits this long after the terrain's heights last changed, ms. */
export const HEIGHTS_SETTLE = 300;

/** While tiles keep loading, it traces at most this long after the first change it waited for, ms. */
export const HEIGHTS_MAX_WAIT = 1500;

/** "30%", or "under 1%" for a sliver (never "0%" for a share that isn't nothing). */
export const pct = (x: number) =>
  x > 0 && x < 0.005 ? "under 1%" : `${Math.round(x * 100)}%`;

/**
 * The answer's words for one line of sight to `label` (pure): the terrain's
 * verdict, never "clear" over unknown or coarse terrain, nor inside the
 * terrain's error.
 */
export function terrainSightText(
  id: string,
  label: string,
  r: TerrainLineOfSight | undefined,
  why?: string,
): TerrainSightView {
  if (r === undefined) {
    return {
      id,
      state: "waiting",
      text: `The local horizon toward ${label}: ${why ?? "waiting for the terrain"}.`,
    };
  }
  const accuracy = r.accuracy.note;
  const sizes = {
    ...(r.accuracy.meters !== undefined && { meters: r.accuracy.meters }),
    unknownFraction: r.unknownFraction,
  };
  if (r.clear === false) {
    return {
      id,
      state: "blocked",
      ...sizes,
      text: `The local horizon toward ${label}: the terrain blocks it.`,
      accuracy,
    };
  }
  if (r.clear === true) {
    return {
      id,
      state: "clear",
      ...sizes,
      text: `The local horizon toward ${label}: the terrain is clear${r.minClearance !== undefined ? `, by ${length(r.minClearance)} at the closest beyond the observer's own ground` : ""}.`,
      accuracy,
    };
  }
  if (r.unknownFraction > 0) {
    return {
      id,
      state: "unknown",
      ...sizes,
      text: `The local horizon toward ${label}: unknown over ${pct(r.unknownFraction)} of the path near the ground (terrain not drawn there yet, or only coarsely); not counted as clear.`,
      accuracy,
    };
  }
  return {
    id,
    state: "may-block",
    ...sizes,
    text: `The local horizon toward ${label}: the terrain may block it: the path passes within the terrain's error${r.minClearance !== undefined ? ` (${length(r.minClearance)} above the drawn surface)` : ""}.`,
    accuracy,
  };
}

/**
 * `from` on or above the drawn surface (`surface`, m, at its footprint):
 * an observer the terrain is drawn above is lifted to `OBSERVER_LIFT` over
 * it, and `to` moves with it, so the ray keeps its direction.
 */
export function placeObserver(
  line: Pick<SightLine, "from" | "to">,
  surface: (longitude: number, latitude: number) => number | undefined,
): { from: number[]; to: number[]; lifted: number } {
  const geo = Ellipsoid.WGS84.cartesianToCartographic(
    Float64Array.from(line.from),
    {
      longitude: 0,
      latitude: 0,
      height: 0,
    },
  );
  const ground = geo && surface(geo.longitude, geo.latitude);
  const from = Array.from(line.from);
  const to = Array.from(line.to);
  if (!geo || ground === undefined || geo.height >= ground + OBSERVER_LIFT) {
    return { from, to, lifted: 0 };
  }
  const lift = ground + OBSERVER_LIFT - geo.height;
  // Along the geodetic normal at the footprint.
  const n = [
    Math.cos(geo.latitude) * Math.cos(geo.longitude),
    Math.cos(geo.latitude) * Math.sin(geo.longitude),
    Math.sin(geo.latitude),
  ];
  return {
    from: from.map((x, i) => x + lift * n[i]!),
    to: to.map((x, i) => x + lift * n[i]!),
    lifted: lift,
  };
}

export interface SightLines {
  /** The current scenario's lines over the terrain, once it has any. */
  view(): readonly TerrainSightView[] | undefined;
  /** The evaluation changed: trace its lines again. */
  evaluationChanged(): void;
  /** The globe the viewer shows changed (stage.ts, after `setGlobe`): follow its heights. */
  globeChanged(): void;
  dispose(): void;
}

export function createSightLines(deps: {
  viewer: Pick<Viewer, "globe" | "engine" | "view">;
  /** The shown evaluation's lines (none outside a scenario). */
  lines(): readonly SightLine[] | undefined;
  /** The globe the viewer shows: only "terrain" is traced. */
  globeShown(): "ellipsoid" | "terrain" | undefined;
  /** Why the terrain globe isn't there, if it failed. */
  globeProblem(): string | undefined;
  /** The view changed: the panel reads `view` again. */
  changed(): void;
}): SightLines {
  const { viewer } = deps;
  let views: TerrainSightView[] | undefined;
  let traced: object | undefined;
  let subscribed: object | undefined;
  let offHeights: (() => void) | undefined;
  let settle = 0;
  /** When the pending trace was first asked for (performance.now), if one is. */
  let waitingSince: number | undefined;

  function trace(): void {
    waitingSince = undefined;
    const lines = deps.lines();
    if (!lines || lines.length === 0) {
      if (views !== undefined) {
        views = undefined;
        deps.changed();
      }
      return;
    }
    const globe = viewer.globe;
    const shown = deps.globeShown();
    const target =
      shown === "terrain"
        ? globe?.terrainRayTarget(viewer.engine.viewBit(viewer.view))
        : undefined;
    const why =
      deps.globeProblem() ??
      (shown === undefined
        ? "the terrain globe is loading"
        : shown === "ellipsoid"
          ? "this view has no terrain globe"
          : undefined);
    views = lines.map((l) => {
      if (!target || !globe) {
        return terrainSightText(l.id, l.label, undefined, why);
      }
      const placed = placeObserver(l, (lon, lat) =>
        globe.surfaceHeight(lon, lat),
      );
      const r = terrainLineOfSight(placed.from, placed.to, target);
      const v = terrainSightText(l.id, l.label, r);
      return placed.lifted > 0
        ? {
            ...v,
            text: `${v.text} (The observer stands ${OBSERVER_LIFT} m above the drawn ground, lifted ${length(placed.lifted)} onto it.)`,
          }
        : v;
    });
    traced = lines;
    deps.changed();
  }

  function schedule(): void {
    clearTimeout(settle);
    const now = performance.now();
    waitingSince ??= now;
    settle = window.setTimeout(
      trace,
      Math.max(
        0,
        Math.min(HEIGHTS_SETTLE, waitingSince + HEIGHTS_MAX_WAIT - now),
      ),
    );
  }

  /** Follows the globe shown (a scenario switches it, stage.ts), trailing its height changes. */
  function globeChanged(): void {
    const globe = viewer.globe;
    if (globe !== subscribed) {
      offHeights?.();
      subscribed = globe;
      offHeights = globe?.onHeightsChanged(() => {
        if (deps.lines()?.length) {
          schedule();
        }
      });
    }
    if (deps.lines()?.length) {
      schedule();
    }
  }
  globeChanged();

  return {
    view: () => views,
    globeChanged,
    evaluationChanged: () => {
      if (deps.lines() !== traced) {
        schedule();
      }
    },
    dispose: () => {
      clearTimeout(settle);
      offHeights?.();
    },
  };
}
