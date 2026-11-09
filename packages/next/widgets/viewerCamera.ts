// Where the Viewer's camera goes: its Earth-relative pose, and zooming to content
// (Viewer's camera methods).
import type { Viewer, ZoomTarget } from "./Viewer.ts";
import { followZoom } from "./orbitFocus.ts";
import {
  Ellipsoid,
  type Camera,
  EARTH,
  type View,
  ModelPlacement,
  fromDegrees,
  vec3,
} from "@cesium/next";
import type { ViewerState } from "./viewerState.ts";

/** Camera, zoom and the clock's sun. */
export interface ViewerCameraContext extends Pick<
  Viewer,
  "applyClockSun" | "clock" | "controller" | "setSun" | "view" | "world"
> {
  readonly state: Pick<
    ViewerState,
    | "clockPlaced"
    | "destroyed"
    | "earthPose"
    | "focusCenter"
    | "orbit_"
    | "second"
    | "secondController"
    | "sun"
    | "sunFromClock_"
    | "time_"
    | "zoomToken"
  >;
}

export const ellipsoid = Ellipsoid.WGS84;
export const deg = Math.PI / 180;

// ------------------------------------------------------------- camera

/**
 * The main view's camera in the Earth's anchor (`View.anchorCamera`):
 * Earth-fixed, whatever the view's render space. Reused: current until
 * the next call.
 */
export function earthCamera(viewer: ViewerCameraContext): Camera {
  return viewer.view.anchorCamera(
    viewer.world.bodyAnchor(EARTH),
    viewer.state.earthPose,
  );
}

/**
 * Re-expresses the pose a controller or `lookAt` just wrote into `view`'s
 * camera, which is Earth-fixed, in its render space through the Earth's
 * anchor (`View.setCameraFromAnchor`): framing shows the same Earth
 * however the view places it. A copy while the anchor is at the
 * identity.
 */
export function fromEarth(viewer: ViewerCameraContext, view: View): void {
  view.setCameraFromAnchor(viewer.world.bodyAnchor(EARTH), view.camera);
}

export function zoomTo(
  viewer: ViewerCameraContext,
  target: ZoomTarget,
  heading = 35 * deg,
  pitch = -30 * deg,
): void {
  const token = ++viewer.state.zoomToken;
  if (target instanceof ModelPlacement) {
    const model = target;
    const { center, radius } = model.bounds();
    frameCamera(viewer, Float64Array.from(center), radius, heading, pitch);
    const inputs = viewer.controller.inputs;
    if (model.clamp && !model.clamp.settled) {
      void model.clamp.whenSettled().then(() => {
        if (
          token === viewer.state.zoomToken &&
          inputs === viewer.controller.inputs &&
          !viewer.state.destroyed
        ) {
          const { center, radius } = model.bounds();
          frameCamera(
            viewer,
            Float64Array.from(center),
            radius,
            heading,
            pitch,
          );
        }
      });
    }
    return;
  }
  if ("longitude" in target) {
    const range = target.range ?? 1500;
    frameCamera(
      viewer,
      ellipsoid.cartographicToCartesian(
        fromDegrees(target.longitude, target.latitude, 0),
        vec3.vec3(),
      ),
      range / 2.6,
      heading,
      pitch,
    );
    return;
  }
  let sphere: { center: ArrayLike<number>; radius: number };
  if ("root" in target) {
    // The root's content volume when it has one (publishers often pad
    // the root volume to a power of two).
    const volume = target.root.contentVolume ?? target.root.volume;
    sphere = {
      center: volume.kind === "box" ? volume.obb.center : volume.sphere.center,
      radius: volume.sphere.radius,
    };
  } else {
    sphere = target;
  }
  const center = Float64Array.from(sphere.center);
  if (vec3.length(center) < 0.1 * ellipsoid.minimumRadius) {
    // Planet-scale content (OSM Buildings' root is the whole globe) is
    // centered near the Earth's center, where east-north-up is the
    // direction of a small offset: the camera went below a pole, upside
    // down, orbiting a point thousands of kilometers underground. Frame
    // the globe instead from straight above the ground under the camera,
    // north up, orbiting that ground point.
    const ground = ellipsoid.scaleToGeodeticSurface(
      earthCamera(viewer).position,
      vec3.vec3(),
    );
    if (ground) {
      const range = sphere.radius * 2.6 - vec3.length(ground);
      frameCamera(
        viewer,
        ground,
        Math.max(range, 1) / 2.6,
        0,
        -Math.PI / 2 + 1e-4,
      );
      return;
    }
  }
  frameCamera(viewer, center, sphere.radius, heading, pitch);
}

/** Points both cameras at a sphere (the split view's from the other side). */
function frameCamera(
  viewer: ViewerCameraContext,
  center: Float64Array,
  radius: number,
  heading: number,
  pitch: number,
): void {
  if (![...center, radius, heading, pitch].every(Number.isFinite)) {
    // A NaN camera hung the page (a NaN range from a bad URL).
    throw new RangeError("zoomTo: the target is not a finite place");
  }
  const range = radius * 2.6;
  // 1.x's near plane (0.1 m), closer for small models. Fixed, not scaled
  // to what is framed: zooming in from a globe-sized root kept a near
  // plane kilometers out, cutting (and culling) the ground. Reverse-Z
  // float depth is as precise whatever the near plane, so 1.x's per-frame
  // near from drawn volumes isn't needed.
  viewer.view.camera.near = Math.min(0.1, Math.max(0.001, radius * 0.002));
  vec3.copy(viewer.state.focusCenter, center);
  viewer.controller.focus(center, heading, pitch, range);
  fromEarth(viewer, viewer.view);
  if (viewer.state.orbit_) {
    followZoom(viewer.state.orbit_, center, heading, pitch, range);
  }
  if (viewer.state.second && viewer.state.secondController) {
    viewer.state.second.camera.near = viewer.view.camera.near;
    viewer.state.secondController.focus(
      center,
      heading + (150 * Math.PI) / 180,
      -0.25,
      range * 0.4,
    );
    fromEarth(viewer, viewer.state.second);
  }
  if (viewer.state.sunFromClock_) {
    if (!viewer.state.clockPlaced) {
      // A first look in daylight: 10:30 local solar time today there.
      viewer.state.clockPlaced = true;
      const place = placeCamera(viewer);
      const offset = place ? (place.longitude / Math.PI) * 12 * 3_600_000 : 0;
      const day = 86_400_000;
      const start = Math.floor((Date.now() + offset) / day) * day - offset;
      viewer.clock.time = start + 10.5 * 3_600_000;
    }
    viewer.applyClockSun();
    viewer.state.time_?.update();
  } else if (viewer.state.sun) {
    viewer.setSun(viewer.state.sun.azimuth, viewer.state.sun.elevation);
  }
}

/** What the time is about: what is framed, else below the camera. */
export function placeCamera(
  viewer: ViewerCameraContext,
): { longitude: number; latitude: number } | undefined {
  const at =
    vec3.length(viewer.state.focusCenter) > 0
      ? viewer.state.focusCenter
      : earthCamera(viewer).position;
  const c = ellipsoid.cartesianToCartographic(at, {
    longitude: 0,
    latitude: 0,
    height: 0,
  });
  return c ? { longitude: c.longitude, latitude: c.latitude } : undefined;
}
