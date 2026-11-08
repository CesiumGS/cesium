// When the drawn headlands stop meeting the ship's mast's line to the
// lighthouse (Task 7; Alcatraz Island Light since the owner's follow-up,
// 2026-11-07), on the page's thread: the sight line traced over the drawn
// terrain each minute along the ship's whole track (the same frames as the
// worker's, vehicles.ts, and the same trace as the answer's,
// sightLines.ts). The spans where the drawn terrain doesn't block it go on
// the timeline as windows (Task 6c's clickable marks), each saying whether
// it is in sight or only within the terrain's error; the first that follows
// a minute the land blocked it is the moment, "Headland stops blocking (as
// drawn)", or "Lighthouse comes into view" only when that span traced
// clear.
//
// A minute over terrain not drawn, or drawn only coarsely, is in no window,
// and nothing is "in sight" within the terrain's error (Review Focus 2).
// Each slice asks its minutes through the engine's query interface as one
// batch, answered asynchronously; a scan cancelled or replaced meanwhile
// (its generation) publishes nothing. It runs on demand, in slices of
// about 8 ms so no tick waits long: when the mast's height or the datum
// changes (what was found for the old one goes at once), and 1.5 s after
// the terrain's heights last changed as tiles load. A running scan
// finishes; heights that change meanwhile queue one more. Never on every
// tick.
import { frameTransform } from "../../src/frames/Frame.ts";
import type { Frames } from "../../src/frames/frames.ts";
import {
  terrainLineOfSight,
  type TerrainLineOfSight,
} from "../../src/measure/terrainLineOfSight.ts";
import { Instant } from "../../src/time/Instant.ts";
import type { Viewer } from "../../widgets/index.ts";
import type { Moment, ScenarioEvaluation } from "./scenarios/evaluate.ts";
import { shipStartTdb } from "./scenarios/scenes.ts";
import type { KnobState, ScenarioId } from "./scenarios/spec.ts";
import {
  LIGHTHOUSE,
  LIGHTHOUSE_GROUND,
  SHIP,
  lighthouseLight,
  shipFrames,
  shipSpan,
} from "./scenarios/vehicles.ts";
import { placeObserver } from "./sightLines.ts";

/** The trace's step along the track, s. */
export const WINDOW_STEP = 60;

/** The main thread's time per slice of the scan, ms. */
const SLICE_MS = 8;

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
 * labelled by what the terrain says there; and the moment the drawn
 * headland stops blocking it: the first such span that follows a minute
 * where the drawn terrain blocked it, named "comes into view" only when the
 * whole span traced clear (pure). A span after terrain not drawn is no moment:
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
      id: `lighthouse-${windows.length}`,
      label: run.every((x) => x === "clear")
        ? `${LIGHTHOUSE.short} in sight from the mast: the line clears the drawn terrain beyond its error (traced each minute)`
        : `The drawn headlands don't meet the mast's line to ${LIGHTHOUSE.short}; it passes within the terrain's error, so the lighthouse can't be told in sight (traced each minute)`,
      startUtc,
      // A run's last sample stands for the minute after it, to the track's end.
      endUtc: startMs + Math.min(j + 1, samples.length - 1) * step * 1000,
    });
    if (moment === undefined && samples[i - 1] === "blocked") {
      // What the drawn terrain shows, no more (review finding 2): the
      // minute the drawn land stops meeting the line. In sight only if the
      // whole run traced clear.
      const clear = run.every((x) => x === "clear");
      moment = {
        id: "lighthouse-in-view",
        label: clear
          ? "Lighthouse comes into view"
          : "Headland stops blocking (as drawn)",
        title: clear
          ? `the first minute the mast's line to ${LIGHTHOUSE.short} clears the drawn terrain beyond its error, all the way to the span's end`
          : `the first minute the drawn headlands no longer meet the mast's line to ${LIGHTHOUSE.short}; the line passes within the drawn terrain's error, so the lighthouse can't be told in sight`,
        icon: "timeline",
        utcMs: startUtc,
      };
    }
  }
  return { windows, ...(moment && { moment }) };
}

/** How the last scan went: the samples it could settle, of all, and its cost. */
export interface LighthouseCoverage {
  settled: number;
  samples: number;
  /** The main thread's time tracing, ms. */
  busyMs: number;
  /** From its start to its end, slices and waits between them, ms. */
  elapsedMs: number;
}

export interface LighthouseWindow {
  windows(): readonly SightWindow[];
  /** The moment, once a scan finds one. */
  presets(): readonly Moment[] | undefined;
  coverage(): LighthouseCoverage | undefined;
  evaluationChanged(): void;
  /** The globe the viewer shows changed (stage.ts): follow its heights. */
  globeChanged(): void;
  dispose(): void;
}

export function createLighthouseWindow(deps: {
  viewer: Pick<Viewer, "globe" | "engine" | "view">;
  frames(): Frames | undefined;
  scenario(): ScenarioId | undefined;
  knobs(): KnobState;
  evaluation(): ScenarioEvaluation | undefined;
  globeShown(): "ellipsoid" | "terrain" | undefined;
  /** The windows or the moment changed. */
  changed(): void;
}): LighthouseWindow {
  const { viewer } = deps;
  let windows: SightWindow[] = [];
  let presets: Moment[] | undefined;
  let coverage: LighthouseCoverage | undefined;
  /** What the published windows were traced for ("" for none). */
  let published = "";
  /** The scan running, if one is: what it is for. */
  let running: { key: string; generation: number } | undefined;
  /** The terrain's heights changed while a scan ran: one more scan after it. */
  let again = false;
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
      e.track.lightSea === undefined ||
      deps.globeShown() !== "terrain"
    ) {
      return "";
    }
    return JSON.stringify([
      e.track.heights,
      e.track.lightSea,
      deps.knobs().mast,
    ]);
  }

  /** Drops what was published (another mast or datum's, or none now). */
  function unpublish(): void {
    published = "";
    if (windows.length > 0 || presets !== undefined || coverage) {
      windows = [];
      presets = undefined;
      coverage = undefined;
      deps.changed();
    }
  }

  /** Stops the running scan and any waiting one. */
  function cancel(): void {
    generation++;
    running = undefined;
    again = false;
    waitingSince = undefined;
    clearTimeout(timer);
    clearTimeout(slice);
  }

  function scan(): void {
    waitingSince = undefined;
    const key = keyNow();
    const frames = deps.frames();
    const globe = viewer.globe;
    const e = deps.evaluation();
    if (key === "" || !frames || !globe || !e?.track) {
      // Nothing to trace over yet: a later height change or knob asks again.
      if (key === "") {
        unpublish();
      }
      return;
    }
    const mine = ++generation;
    running = { key, generation: mine };
    again = false;
    clearTimeout(slice);
    const began = performance.now();
    let busy = 0;
    const heights = e.track.heights;
    const light = lighthouseLight(e.track.lightSea!);
    const startTdb = shipStartTdb(frames);
    const [, mast] = shipFrames(
      frames.itrf,
      heights,
      startTdb,
      Number(deps.knobs().mast),
    );
    const samples = Math.floor(shipSpan(heights).seconds / WINDOW_STEP) + 1;
    const out: SightSample[] = [];
    // The view's terrain, through the engine's query interface, in the
    // globe's (the Earth's) anchor: Earth-fixed.
    const queries = viewer.engine.queries;
    const options = {
      anchor: globe.anchor,
      view: viewer.view,
      groundRadius: LIGHTHOUSE_GROUND,
    };
    /**
     * The main thread's time per minute traced in the last slice, ms (none
     * yet: one minute first). Time the answers spent in flight while the
     * thread was free (a GPU engine's readback) doesn't count, so latency
     * never shrinks the batch.
     */
    let perSample: number | undefined;
    const step = async (): Promise<void> => {
      if (mine !== generation) {
        return;
      }
      // About 8 ms of the main thread per slice (review finding 1), at
      // least one trace: the minutes the last slice's cost says fit, asked
      // together as one batch.
      const t0 = performance.now();
      const count = Math.min(
        samples - out.length,
        perSample === undefined
          ? 1
          : Math.max(1, Math.floor(SLICE_MS / Math.max(perSample, 1e-3))),
      );
      const asked: Promise<TerrainLineOfSight>[] = [];
      for (let k = 0; k < count; k++) {
        const t = startTdb + (out.length + k) * WINDOW_STEP;
        const m = frameTransform(mast, frames.itrf, Instant.fromTdb(t));
        const placed = placeObserver(
          { from: [m[12]!, m[13]!, m[14]!], to: Array.from(light) },
          (lon, lat) => globe.surfaceHeight(lon, lat),
        );
        asked.push(
          terrainLineOfSight(placed.from, placed.to, queries, options),
        );
      }
      const placing = performance.now() - t0;
      // Whether the thread was free while the batch was in flight: a
      // timer that runs first says it was.
      let free = false;
      const probe = window.setTimeout(() => (free = true), 0);
      const answers = await Promise.all(asked);
      clearTimeout(probe);
      const resumed = performance.now();
      if (mine !== generation) {
        return; // cancelled, or a newer scan began: this one publishes nothing
      }
      out.push(...answers.map(sampleOf));
      const main = free
        ? placing + (performance.now() - resumed)
        : performance.now() - t0;
      perSample = main / count;
      busy += performance.now() - t0;
      if (out.length < samples) {
        slice = window.setTimeout(run, 0);
        return;
      }
      running = undefined;
      // A scan for a mast or datum that has since changed never publishes
      // (review finding 11): the change scheduled its own.
      if (key === keyNow()) {
        const found = sightWindows(out, Date.parse(SHIP.startUtc), WINDOW_STEP);
        windows = found.windows;
        presets = found.moment ? [found.moment] : undefined;
        coverage = {
          settled: out.filter((c) => c !== "unknown").length,
          samples,
          busyMs: busy,
          elapsedMs: performance.now() - began,
        };
        published = key;
        deps.changed();
      }
      if (again) {
        again = false;
        schedule(SETTLE);
      }
    };
    const run = (): void => {
      step().catch((error: unknown) => {
        if (mine === generation) {
          running = undefined;
        }
        console.error("lighthouse window: the scan failed", error);
      });
    };
    run();
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

  /** The terrain's heights changed: trace again once they settle, after a running scan ends. */
  function heightsChanged(): void {
    if (keyNow() === "") {
      return;
    }
    if (running) {
      again = true;
    } else {
      schedule(SETTLE);
    }
  }

  function globeChanged(): void {
    const globe = viewer.globe;
    if (globe !== subscribed) {
      offHeights?.();
      subscribed = globe;
      offHeights = globe?.onHeightsChanged(heightsChanged);
    }
    evaluationChanged();
    heightsChanged();
  }

  function evaluationChanged(): void {
    const key = keyNow();
    const wanted = running?.key ?? published;
    if (key === wanted) {
      return;
    }
    // Another mast or datum, or none: what was found for the old one goes
    // now, and its scan stops (review finding 11).
    cancel();
    unpublish();
    if (key !== "") {
      schedule(400);
    }
  }
  globeChanged();

  return {
    windows: () => windows,
    presets: () => presets,
    coverage: () => coverage,
    evaluationChanged,
    globeChanged,
    dispose: () => {
      cancel();
      offHeights?.();
    },
  };
}
