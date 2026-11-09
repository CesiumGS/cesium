// The Viewer's sun and sky: from the clock, or set by hand (Viewer's sky methods).
import type { Viewer } from "./Viewer.ts";
import { ellipsoid, deg } from "./viewerCamera.ts";
import { eastNorthUpToFixedFrame, mat4, vec3 } from "@cesium/next";
import type { ViewerState } from "./viewerState.ts";

/** @internal The sun and sky. */
export interface ViewerSkyContext extends Pick<Viewer, "engine" | "sky"> {
  readonly state: Pick<
    ViewerState,
    "destroyed" | "focusCenter" | "moon" | "sun" | "sunFromClock_" | "time_"
  >;
}

/**
 * The sky `attachSky` computed at the clock's time, on the engine: the
 * stars' turn, the Moon's place while it is drawn and, while the sun
 * follows the clock, the sun.
 */
export function applySky(viewer: ViewerSkyContext): void {
  if (viewer.state.destroyed) {
    return;
  }
  const sky = viewer.sky;
  viewer.engine.icrfToFixed.set(sky.icrfToFixed);
  if (viewer.state.sunFromClock_) {
    viewer.engine.sunDirection.set(sky.sunDirection);
  }
  if (viewer.state.moon) {
    (viewer.engine.moonPosition ??= new Float64Array(3)).set(sky.moonPosition!);
    (viewer.engine.moonAxes ??= new Float64Array(6)).set(sky.moonAxes!);
  }
  viewer.engine.requestRender();
}

export function applyClockSun(viewer: ViewerSkyContext): void {
  applySky(viewer);
}

export function setSun(
  viewer: ViewerSkyContext,
  azimuth: number,
  elevation: number,
): void {
  viewer.state.sunFromClock_ = false;
  viewer.state.time_?.show(false);
  viewer.state.sun = { azimuth, elevation };
  const enu = eastNorthUpToFixedFrame(
    viewer.state.focusCenter,
    ellipsoid,
    mat4.mat4(),
  );
  const az = azimuth * deg;
  const el = elevation * deg;
  const e = Math.cos(el) * Math.sin(az);
  const n = Math.cos(el) * Math.cos(az);
  const u = Math.sin(el);
  vec3.normalize(
    viewer.engine.sunDirection,
    vec3.vec3(
      enu[0]! * e + enu[4]! * n + enu[8]! * u,
      enu[1]! * e + enu[5]! * n + enu[9]! * u,
      enu[2]! * e + enu[6]! * n + enu[10]! * u,
    ),
  );
  viewer.engine.requestRender();
}
