// A view's exposure: its meter's reading, and the adaptation toward it.
import type { Engine } from "../../scene/Engine.ts";
import type { View } from "../../scene/View.ts";
import { ev100ToScale } from "../../scene/observer.ts";
import {
  SCOTOPIC_WHITE,
  eyeResponse,
  EYE_ADAPTATION_SPEED,
  adapt,
} from "../../scene/eye.ts";

/** Rasterizer side: meter reading and adaptation. */
export type ExposureEngine = Pick<Engine, "requestRender">;

/**
 * How near its meter reading an adapted exposure is settled: the eye's
 * cones and rods (log10 cd/m², about 1%) and automatic exposure (EV). A
 * reading this close moves nothing (see `adaptExposure`).
 */
const EYE_SETTLED = 0.005;
const AUTO_SETTLED = 0.02;

/** Reads a pick's feature ID and depth from the view's frame textures. */
/**
 * The view's exposure scale this frame: fixed for an EV100 or a scale;
 * automatic exposure and the eye move toward their meter reading
 * (`adaptExposure`).
 */
export function updateExposure(engine: ExposureEngine, view: View): number {
  const e = view.observer.exposure;
  if ("scale" in e) {
    view.exposureScale = e.scale;
  } else if ("ev100" in e) {
    view.exposureScale = ev100ToScale(e.ev100);
  } else {
    const state = (view.autoExposure ??= {
      ev100: "eye" in e ? 15 : Math.min(Math.max(15, e.min ?? -6), e.max ?? 18),
      // Daylight until the first reading.
      cones: Math.log10(4000),
      rods: Math.log10(4000 * SCOTOPIC_WHITE),
      time: performance.now(),
      pending: false,
      skipped: false,
      metered: false,
    });
    if ("eye" in e) {
      // Pre-exposed for the stronger of the two (fp16's range); the
      // present pass sees the light per pixel (present.slang `eyeSees`).
      const r = eyeResponse(
        10 ** state.cones,
        10 ** state.rods,
        e.compensation ?? 0,
      );
      const scale = Math.max(r.cones, r.rods * SCOTOPIC_WHITE);
      view.exposureScale = scale;
      return scale;
    }
    view.exposureScale = ev100ToScale(state.ev100);
  }
  return view.exposureScale;
}

/**
 * Automatic exposure, from a meter reading (average luminance, the
 * scene's units): the EV100 a reflected-light meter gives (K = 12.5,
 * ISO 100) minus the compensation, within [min, max], approached
 * exponentially at `speed` per second; the first reading is taken as is.
 * The eye's cones adapt to the photopic reading, its rods to the
 * scotopic one (scene/eye.ts `adapt`). Renders again until it settles,
 * and once more after the step that settles it: the view's scale follows
 * the state only in a frame.
 *
 * A settled exposure stays as it is for a reading within `EYE_SETTLED`
 * or `AUTO_SETTLED` of it. The meter divides the pre-exposure out of an
 * fp16 image, so its reading moves with the exposure (by about 0.01%):
 * following it moved the exposure, which is in the view's on-demand
 * fingerprint, so each metered frame asked for another and an idle scene
 * rendered indefinitely (OSM Buildings at the eye's exposure).
 */
export function adaptExposure(
  engine: ExposureEngine,
  view: View,
  average: number | undefined,
  scotopic: number | undefined,
): void {
  const e = view.observer.exposure;
  const state = view.autoExposure;
  if (!state) {
    return;
  }
  // Before the mode's check: a reading in flight as the exposure turned
  // fixed left it pending, and it never metered again on turning back.
  state.pending = false;
  const skipped = state.skipped;
  state.skipped = false;
  if (!("auto" in e || "eye" in e)) {
    return;
  }
  // A tick drew while this reading was in flight and metered nothing, so
  // it may have drawn at a stale exposure (noon right after night, with
  // the reading inside the band: nothing else would ask for a tick). The
  // next tick isn't skipped, so this ends.
  if (skipped) {
    engine.requestRender();
  }
  // A reading that isn't a number (infinities in the image) says
  // nothing; a state that isn't one starts over from the next reading.
  if (average === undefined || !Number.isFinite(average)) {
    return;
  }
  const now = performance.now();
  if ("eye" in e) {
    if (scotopic === undefined || !Number.isFinite(scotopic)) {
      return;
    }
    const cones = Math.log10(Math.max(average, 1e-7));
    const rods = Math.log10(Math.max(scotopic, 1e-7));
    const settled = () =>
      Math.abs(cones - state.cones) <= EYE_SETTLED &&
      Math.abs(rods - state.rods) <= EYE_SETTLED;
    const moved = !state.metered || !settled();
    if (!state.metered || !Number.isFinite(state.cones + state.rods)) {
      state.cones = cones;
      state.rods = rods;
      state.metered = true;
    } else if (!settled()) {
      const dt = Math.min((now - state.time) / 1000, 1);
      const speed = e.speed ?? EYE_ADAPTATION_SPEED;
      state.cones = adapt(state.cones, cones, dt, "cones", speed);
      state.rods = adapt(state.rods, rods, dt, "rods", speed);
    }
    state.time = now;
    // A frame at the new exposure, also when this step settled it: the
    // eye adapts to light at once, so noon after night landed in the
    // band in one step, and the loop slept with the last frame drawn at
    // night's exposure.
    if (moved) {
      engine.requestRender();
    }
    return;
  }
  if (!Number.isFinite(state.ev100)) {
    state.metered = false;
  }
  const target = Math.min(
    Math.max(
      Math.log2((average * 100) / 12.5) - (e.compensation ?? 0),
      e.min ?? -6,
    ),
    e.max ?? 18,
  );
  const moved = !state.metered || Math.abs(target - state.ev100) > AUTO_SETTLED;
  if (!state.metered) {
    state.ev100 = target;
    state.metered = true;
  } else if (moved) {
    const dt = Math.min((now - state.time) / 1000, 1);
    state.ev100 +=
      (target - state.ev100) * (1 - Math.exp(-dt * (e.speed ?? 2)));
  }
  state.time = now;
  // A frame at the new exposure (as the eye's).
  if (moved) {
    engine.requestRender();
  }
}
