// When the headlands stop hiding the buoy from the ship's mast (Task 7), on
// the page's thread: the sight line traced over the drawn terrain each
// minute along the ship's whole track (the same frames as the worker's,
// vehicles.ts, and the same trace as the answer's, sightLines.ts). The
// spans where the drawn terrain doesn't block it go on the timeline as
// windows (Task 6c's clickable marks), each saying whether it is in sight
// or only within the terrain's error; the first that follows a minute the
// land blocked it is the "Buoy clears the headland" moment.
//
// A minute over terrain not drawn, or drawn only coarsely, is in no window,
// and nothing is "in sight" within the terrain's error (Review Focus 2). It runs on demand, in slices so no frame waits long:
// when the mast's height or the datum changes, and 1.5 s after the
// terrain's heights last changed as tiles load. Never per frame.
import { frameTransform } from "../../src/frames/Frame.ts";
import type { Frames } from "../../src/frames/frames.ts";
import { terrainLineOfSight } from "../../src/measure/terrainLineOfSight.ts";
import { Instant } from "../../src/time/Instant.ts";
import type { Viewer } from "../../widgets/index.ts";
import type { Moment, ScenarioEvaluation } from "./scenarios/evaluate.ts";
import { shipStartTdb } from "./scenarios/scenes.ts";
import type { KnobState, ScenarioId } from "./scenarios/spec.ts";
import {
  BUOY,
  BUOY_GROUND,
  SHIP,
  buoyLight,
  shipFrames,
  shipSpan,
} from "./scenarios/vehicles.ts";
import { placeObserver } from "./sightLines.ts";

/** The trace's step along the track, s. */
export const WINDOW_STEP = 60;

/** Lines traced per slice of the main thread. */
const SLICE = 4;

/** It traces again this long after the terrain's heights last changed, ms. */
const SETTLE = 1500;

/** While tiles keep loading, it traces at most this long after the first change it waited for, ms. */
const MAX_WAIT = 6000;

/** A span on the timeline, UTC ms. */
export interface SightWindow {
  id: string;
  label: string;
  startUtc: number;
  endUtc: number;
}

/**
 * What the drawn terrain says of the mast's line at one minute: it meets
 * the terrain (`blocked`); it clears it by more than its error (`clear`);
 * it passes within its error (`within`); or it crosses terrain not drawn,
 * or drawn only coarsely (`unknown`).
 */
export type SightSample = "blocked" | "clear" | "within" | "unknown";

/** A trace's verdict as a sample. */
export const sampleOf = (r: {
  clear: boolean | undefined;
  unknownFraction: number;
}): SightSample =>
  r.clear === true
    ? "clear"
    : r.clear === false
      ? "blocked"
      : r.unknownFraction > 0
        ? "unknown"
        : "within";

/**
 * The spans where the drawn terrain doesn't block the line (samples each
 * `step` s from `startMs`: clear, or within the terrain's error), each
 * labelled by what the terrain says there; and the moment the buoy clears
 * the headland: the first such span that follows a minute where the drawn
 * terrain blocked it (pure). A span after terrain not drawn is no moment:
 * nothing says the land hid it before.
 */
export function sightWindows(
  samples: readonly SightSample[],
  startMs: number,
  step: number,
): { windows: SightWindow[]; moment?: Moment } {
  const open = (s: SightSample | undefined) => s === "clear" || s === "within";
  const windows: SightWindow[] = [];
  let moment: Moment | undefined;
  for (let i = 0; i < samples.length; i++) {
    if (!open(samples[i]) || open(samples[i - 1])) {
      continue;
    }
    let j = i;
    while (open(samples[j + 1])) {
      j++;
    }
    const run = samples.slice(i, j + 1);
    const startUtc = startMs + i * step * 1000;
    windows.push({
      id: `buoy-${windows.length}`,
      label: run.every((x) => x === "clear")
        ? `${BUOY.short} in sight from the mast (traced each minute over the drawn terrain)`
        : `${BUOY.short} past the headlands: the drawn terrain doesn't block the mast's line, though near the water it passes within the terrain's error (traced each minute)`,
      startUtc,
      // A run's last sample stands for the minute after it, to the track's end.
      endUtc: startMs + Math.min(j + 1, samples.length - 1) * step * 1000,
    });
    if (moment === undefined && samples[i - 1] === "blocked") {
      moment = {
        id: "buoy-in-view",
        label: "Buoy clears the headland",
        icon: "timeline",
        utcMs: startUtc,
      };
    }
  }
  return { windows, ...(moment && { moment }) };
}

export interface BuoyWindow {
  windows(): readonly SightWindow[];
  /** The moment, once a scan finds one. */
  presets(): readonly Moment[] | undefined;
  /** How the last scan went: the samples it could settle, of all. */
  coverage(): { settled: number; samples: number } | undefined;
  evaluationChanged(): void;
  /** The globe the viewer shows changed (stage.ts): follow its heights. */
  globeChanged(): void;
  dispose(): void;
}

export function createBuoyWindow(deps: {
  viewer: Pick<Viewer, "globe" | "engine" | "view">;
  frames(): Frames | undefined;
  scenario(): ScenarioId | undefined;
  knobs(): KnobState;
  evaluation(): ScenarioEvaluation | undefined;
  globeShown(): "ellipsoid" | "terrain" | undefined;
  /** The windows or the moment changed. */
  changed(): void;
}): BuoyWindow {
  const { viewer } = deps;
  let windows: SightWindow[] = [];
  let presets: Moment[] | undefined;
  let coverage: { settled: number; samples: number } | undefined;
  let scanned = "";
  let generation = 0;
  let timer = 0;
  /** The running scan's next slice. */
  let slice = 0;
  /** When the pending scan was first asked for (performance.now), if one is. */
  let waitingSince: number | undefined;
  let subscribed: object | undefined;
  let offHeights: (() => void) | undefined;

  /** What a scan depends on: the track's heights and the mast. */
  function keyNow(): string {
    if (deps.scenario() !== "ship") {
      return "";
    }
    const e = deps.evaluation();
    if (
      e?.scenario !== "ship" ||
      !e.track ||
      e.track.buoySea === undefined ||
      deps.globeShown() !== "terrain"
    ) {
      return "";
    }
    return JSON.stringify([
      e.track.heights,
      e.track.buoySea,
      deps.knobs().mast,
    ]);
  }

  function reset(): void {
    generation++;
    clearTimeout(timer);
    clearTimeout(slice);
    if (windows.length > 0 || presets !== undefined || coverage) {
      windows = [];
      presets = undefined;
      coverage = undefined;
      deps.changed();
    }
  }

  function scan(): void {
    waitingSince = undefined;
    const key = keyNow();
    const frames = deps.frames();
    const globe = viewer.globe;
    const target = globe?.terrainRayTarget(viewer.engine.viewBit(viewer.view));
    const e = deps.evaluation();
    if (key === "" || !frames || !globe || !target || !e?.track) {
      reset();
      scanned = key;
      return;
    }
    const mine = ++generation;
    clearTimeout(slice);
    scanned = key;
    const heights = e.track.heights;
    const light = buoyLight(e.track.buoySea!);
    const startTdb = shipStartTdb(frames);
    const [, mast] = shipFrames(
      frames.itrf,
      heights,
      startTdb,
      Number(deps.knobs().mast),
    );
    const samples = Math.floor(shipSpan(heights).seconds / WINDOW_STEP) + 1;
    const clear: SightSample[] = [];
    const step = (): void => {
      if (mine !== generation) {
        return;
      }
      for (let k = 0; k < SLICE && clear.length < samples; k++) {
        const t = startTdb + clear.length * WINDOW_STEP;
        const m = frameTransform(mast, frames.itrf, Instant.fromTdb(t));
        const placed = placeObserver(
          { from: [m[12]!, m[13]!, m[14]!], to: Array.from(light) },
          (lon, lat) => globe.surfaceHeight(lon, lat),
        );
        clear.push(
          sampleOf(
            terrainLineOfSight(placed.from, placed.to, target, {
              groundRadius: BUOY_GROUND,
            }),
          ),
        );
      }
      if (clear.length < samples) {
        slice = window.setTimeout(step, 0);
        return;
      }
      const found = sightWindows(clear, Date.parse(SHIP.startUtc), WINDOW_STEP);
      windows = found.windows;
      presets = found.moment ? [found.moment] : undefined;
      coverage = {
        settled: clear.filter((c) => c !== "unknown").length,
        samples,
      };
      deps.changed();
    };
    step();
  }

  function schedule(delay: number): void {
    clearTimeout(timer);
    const now = performance.now();
    waitingSince ??= now;
    timer = window.setTimeout(
      scan,
      Math.max(0, Math.min(delay, waitingSince + MAX_WAIT - now)),
    );
  }

  function globeChanged(): void {
    const globe = viewer.globe;
    if (globe !== subscribed) {
      offHeights?.();
      subscribed = globe;
      offHeights = globe?.onHeightsChanged(() => {
        if (keyNow() !== "") {
          schedule(SETTLE);
        }
      });
    }
    if (keyNow() !== scanned) {
      schedule(SETTLE);
    }
  }
  globeChanged();

  return {
    windows: () => windows,
    presets: () => presets,
    coverage: () => coverage,
    evaluationChanged: () => {
      const key = keyNow();
      if (key === "") {
        if (scanned !== "") {
          scanned = "";
          reset();
        }
      } else if (key !== scanned) {
        schedule(400);
      }
    },
    globeChanged,
    dispose: () => {
      generation++;
      clearTimeout(timer);
      clearTimeout(slice);
      offHeights?.();
    },
  };
}
