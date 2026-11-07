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
import type { ScenarioEvaluation, SightLine } from "./scenarios/evaluate.ts";

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
  /** What the line is, leading each sentence (default "The local horizon toward <label>"). */
  subject = `The local horizon toward ${label}`,
): TerrainSightView {
  if (r === undefined) {
    return {
      id,
      state: "waiting",
      text: `${subject}: ${why ?? "waiting for the terrain"}.`,
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
      ...(r.blockedAt && { hitAt: Array.from(r.blockedAt) }),
      text: `${subject}: the terrain blocks it.`,
      accuracy,
    };
  }
  if (r.clear === true) {
    return {
      id,
      state: "clear",
      ...sizes,
      ...(r.minClearance !== undefined && { clearance: r.minClearance }),
      text: `${subject}: the terrain is clear${r.minClearance !== undefined ? `, by ${length(r.minClearance)} at the closest beyond the observer's own ground` : ""}.`,
      accuracy,
    };
  }
  if (r.unknownFraction > 0) {
    return {
      id,
      state: "unknown",
      ...sizes,
      text: `${subject}: unknown over ${pct(r.unknownFraction)} of the path near the ground (terrain not drawn there yet, or only coarsely); not counted as clear.`,
      accuracy,
    };
  }
  return {
    id,
    state: "may-block",
    ...sizes,
    ...(r.minClearance !== undefined && { clearance: r.minClearance }),
    text: `${subject}: the terrain may block it: the path passes within the terrain's error${r.minClearance !== undefined ? ` (${length(r.minClearance)} above the drawn surface)` : ""}.`,
    accuracy,
  };
}

/**
 * Our terrain against a published horizon mask (measured data, the DSN's
 * from SRTM): a ray from the dish at the mask's elevation at each azimuth,
 * traced over the drawn terrain. Clear: our terrain lies below the mask
 * there (consistent: the mask is the terrain, the antennas or the dish's
 * 6° limit). Blocked: our terrain rises above the published mask. Inside
 * our terrain's error, or over terrain not drawn, it can't tell, and says
 * so: no pass or fail.
 */
export function maskCheckText(
  label: string,
  results: readonly {
    azimuth: number;
    elevation: number;
    r: TerrainLineOfSight;
  }[],
): TerrainSightView {
  const below = results.filter((x) => x.r.clear === true);
  const above = results.filter((x) => x.r.clear === false);
  const unsure = results.filter((x) => x.r.clear === undefined);
  const err = Math.max(0, ...results.map((x) => x.r.accuracy.meters ?? 0));
  const at = (xs: typeof results) =>
    xs.map((x) => `${x.azimuth}° (${x.elevation.toFixed(1)}°)`).join(", ");
  return {
    id: "mask-check",
    // What it was traced for: the Checks row takes it only for its own
    // check (fix 2: a new station's row never reads the last one's trace).
    traced: label,
    state:
      above.length > 0 ? "blocked" : unsure.length > 0 ? "may-block" : "clear",
    mask: {
      azimuths: results.length,
      below: below.length,
      above: above.length,
      unsure: unsure.length,
    },
    text: `Our terrain against ${label} (measured data), at ${results.length} azimuths: ${below.length} below the mask${below.length ? ` (${at(below)})` : ""}; ${above.length} where it rises above the mask${above.length ? ` (${at(above)})` : ""}; ${unsure.length} it can't tell${unsure.length ? ` (${at(unsure)}: within our terrain's ±${length(err)}, or not drawn)` : ""}.`,
    ...(err > 0 && { meters: err }),
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
  /** Rays along a published horizon mask, to check our terrain against it (the dish's). */
  maskCheck?(): ScenarioEvaluation["maskCheck"];
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
  let tracedMask: object | undefined;
  let subscribed: object | undefined;
  let offHeights: (() => void) | undefined;
  let settle = 0;
  /** When the pending trace was first asked for (performance.now), if one is. */
  let waitingSince: number | undefined;

  function trace(): void {
    waitingSince = undefined;
    const lines = deps.lines() ?? [];
    const check = deps.maskCheck?.();
    if (lines.length === 0 && !check) {
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
        return {
          ...terrainSightText(l.id, l.label, undefined, why, l.subject),
          ...(l.key !== undefined && { traced: l.key }),
        };
      }
      const placed = placeObserver(l, (lon, lat) =>
        globe.surfaceHeight(lon, lat),
      );
      const r = terrainLineOfSight(
        placed.from,
        placed.to,
        target,
        l.groundRadius !== undefined ? { groundRadius: l.groundRadius } : {},
      );
      const v: TerrainSightView = {
        ...terrainSightText(l.id, l.label, r, undefined, l.subject),
        // What it was traced for: an answer takes only its own (Task 6c's rule).
        ...(l.key !== undefined && { traced: l.key }),
        from: placed.from,
      };
      return placed.lifted > 0
        ? {
            ...v,
            text: `${v.text} (The observer stands ${OBSERVER_LIFT} m above the drawn ground, lifted ${length(placed.lifted)} onto it.)`,
          }
        : v;
    });
    if (check && !(target && globe)) {
      // Not traced: loading while the terrain globe comes, and "can't
      // tell" (never clear) where this view has none or it failed.
      views.push({
        id: "mask-check",
        traced: check.label,
        state:
          shown === "ellipsoid" || deps.globeProblem() !== undefined
            ? "unknown"
            : "waiting",
        text: `Our terrain against ${check.label}: not traced, ${why ?? "waiting for the terrain"}.`,
      });
    } else if (check && target && globe) {
      const results = check.samples.map((x) => {
        const placed = placeObserver(
          { from: check.from, to: x.to },
          (lon, lat) => globe.surfaceHeight(lon, lat),
        );
        return {
          azimuth: x.azimuth,
          elevation: x.elevation,
          r: terrainLineOfSight(placed.from, placed.to, target),
        };
      });
      views.push(maskCheckText(check.label, results));
    }
    traced = deps.lines();
    tracedMask = check;
    deps.changed();
  }

  /** It has something to trace: lines of sight, or a mask to check. */
  const anything = () =>
    (deps.lines()?.length ?? 0) > 0 || deps.maskCheck?.() !== undefined;

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
        if (anything()) {
          schedule();
        }
      });
    }
    if (anything()) {
      schedule();
    }
  }
  globeChanged();

  return {
    view: () => views,
    globeChanged,
    evaluationChanged: () => {
      if (deps.lines() !== traced || deps.maskCheck?.() !== tracedMask) {
        schedule();
      }
    },
    dispose: () => {
      clearTimeout(settle);
      offHeights?.();
    },
  };
}
