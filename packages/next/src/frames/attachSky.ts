// The engine's sky inputs from the catalog (plan 5a's call 30): the stars'
// turn, the Sun's direction and the Moon's place and axes, in the Earth's
// anchor axes (ITRF), from GCRF, ITRF, HCRS, MOON_ICRF and MOON_ME. 5e makes
// them per body.
import type { SceneClock } from "../core/sceneClock.ts";
import type { Engine } from "../scene/Engine.ts";
import { Instant } from "../time/Instant.ts";
import type { LeapSeconds } from "../time/leapSeconds.ts";
import { FrameUnavailableError } from "../camera/frameResolver.ts";
import type { FrameCatalog, Precision } from "./catalog.ts";
import type { Frame } from "./Frame.ts";
import { createSkyState, skyState, turnSky, type SkyState } from "./sky.ts";

/** The reference frames the sky reads. */
const SKY_FRAMES = ["GCRF", "ITRF", "HCRS", "MOON_ICRF", "MOON_ME"] as const;

/** Options of `attachSky`. */
export interface AttachSkyOptions {
  catalog: FrameCatalog;
  clock: SceneClock;
  /** What the sky's reference frames are asked for (default `"analytic"`). */
  precision?: Precision;
}

/**
 * Gives `engine` its sky from `options.catalog` at `options.clock`'s time:
 * `engine.icrfToFixed`, `sunDirection`, `moonPosition` and `moonAxes`, in
 * the Earth's anchor axes (ITRF), from GCRF, ITRF, HCRS, MOON_ICRF and
 * MOON_ME at `options.precision`, which are marked as used by the sky.
 * Positions are the Sun and the Moon from the Earth's centre in ICRF axes
 * (their origins' difference, as `skyState` takes them), turned by ITRF's
 * rotation from GCRF.
 *
 * - At `"analytic"` (the default) nothing loads, and while every one of
 *   the five runs on its stand-in the sky is `skyState(ms, undefined)`'s,
 *   to the bit: the stand-ins are those models.
 * - At `"precise"`, the sky is the stand-ins' while the data loads and the
 *   ephemeris's once it arrives (`skyState(ms, data)`'s within 1e-11). At an
 *   instant outside the data (the ephemeris's span, or past the EOP
 *   table's predictions) the whole sky falls back to the analytic models
 *   for drawing, as `skyState` does; measurements there still throw.
 *
 * It recomputes when the clock changes or the catalog does (data arriving)
 * and asks the engine to render. Returns the detacher.
 */
export function attachSky(
  engine: Engine,
  options: AttachSkyOptions,
): () => void {
  const { catalog, clock } = options;
  const precision = options.precision ?? "analytic";
  const frames = {} as Record<(typeof SKY_FRAMES)[number], Frame>;
  for (const name of SKY_FRAMES) {
    frames[name] = catalog.get(name, { precision, user: "sky" });
  }
  const state = createSkyState();
  const m = new Float64Array(16);
  const earth = new Float64Array(3);
  const sun = new Float64Array(3);
  const moon = new Float64Array(3);
  const meanEarth = new Float64Array(9);
  let seconds = Number.NaN;
  let revision = Number.NaN;
  let leap: LeapSeconds | undefined;
  let warned = false;

  /** The five reference frames' revisions, summed: they go up when data arrives. */
  const revisions = () => {
    let sum = 0;
    for (const name of SKY_FRAMES) {
      sum += frames[name].revision;
    }
    return sum;
  };

  /** The sky through the catalog's edges; throws outside the data. */
  const fromFrames = (instant: Instant, out: SkyState): SkyState => {
    // ITRF from GCRF: the child-to-parent matrix is Rᵀ, so R's row-major
    // elements are its column-major ones.
    frames.ITRF.toParent(instant, m);
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        out.icrfToFixed[i * 3 + j] = m[i * 4 + j]!;
      }
    }
    origin(frames.GCRF, instant, earth);
    origin(frames.HCRS, instant, sun);
    origin(frames.MOON_ICRF, instant, moon);
    for (let i = 0; i < 3; i++) {
      sun[i] = sun[i]! - earth[i]!;
      moon[i] = moon[i]! - earth[i]!;
    }
    // MOON_ME from MOON_ICRF: likewise, the row-major ICRF to ME rotation.
    frames.MOON_ME.toParent(instant, m);
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        meanEarth[i * 3 + j] = m[i * 4 + j]!;
      }
    }
    return turnSky(sun, moon, meanEarth, out);
  };

  /** A reference frame's origin in ICRF: each edge is a translation from its parent, ICRF's. */
  const origin = (frame: Frame, instant: Instant, out: Float64Array) => {
    frame.toParent(instant, m);
    out[0] = m[12]!;
    out[1] = m[13]!;
    out[2] = m[14]!;
  };

  const update = () => {
    const now = clock.seconds;
    const r = revisions();
    if (now === seconds && r === revision && catalog.leapSeconds === leap) {
      return;
    }
    seconds = now;
    revision = r;
    leap = catalog.leapSeconds;
    const ms = now * 1000;
    if (SKY_FRAMES.every((name) => catalog.precisionOf(name) === "analytic")) {
      skyState(ms, undefined, state);
    } else {
      try {
        fromFrames(Instant.fromUtc(ms, leap), state);
      } catch (error) {
        // Outside the data: draw the analytic sky, as skyState does. The
        // tick goes on whatever failed; anything else is said once.
        if (!(error instanceof FrameUnavailableError) && !warned) {
          warned = true;
          console.warn(
            `attachSky: the sky falls back to the analytic models: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
        skyState(ms, undefined, state);
      }
    }
    engine.icrfToFixed.set(state.icrfToFixed);
    engine.sunDirection.set(state.sunDirection);
    (engine.moonPosition ??= new Float64Array(3)).set(state.moonPosition);
    (engine.moonAxes ??= new Float64Array(6)).set(state.moonAxes);
    engine.requestRender();
  };

  update();
  const unwatch = clock.watch(update);
  const offCatalog = catalog.events.on("change", update);
  return () => {
    unwatch();
    offCatalog();
  };
}
