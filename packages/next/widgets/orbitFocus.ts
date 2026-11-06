/**
 * The Viewer's orbit controls (`setControls("orbit", options)`), apart from
 * the Viewer so they run in Node: what an orbit's options resolve to, and
 * how `zoomTo` re-focuses an orbit.
 */
import * as vec3 from "../src/math/vec3.ts";
import { Ellipsoid } from "../src/math/ellipsoid.ts";
import {
  enuBasis,
  orbitBasis,
  orbitPose,
  type InspectController,
  type OrbitFrame,
} from "../src/scene/InspectController.ts";

/**
 * Where `setControls("orbit", options)` orbits. Fields left out keep the
 * orbit's current values while orbiting; when the orbit starts, the target
 * defaults to what was last framed (`zoomTo`) and the range to the camera's
 * distance from the target. Without a frame, heading and pitch are in
 * east-north-up at the target and start at the globe controls' heading and
 * -0.4 rad. A frame given (`OrbitFrame`, or `null` for east-north-up again)
 * reads heading, pitch and range from where the camera is unless they are
 * given too, so the camera only turns to face the target. The range limits
 * apply to the wheel (default 0.01 m to unlimited).
 */
export interface OrbitOptions {
  target?: ArrayLike<number>;
  frame?: OrbitFrame | null;
  heading?: number;
  pitch?: number;
  range?: number;
  minRange?: number;
  maxRange?: number;
}

/** An orbit, resolved: what the controller is set to. */
export interface OrbitPlan {
  target: Float64Array;
  /** Normalized; undefined for east-north-up at the target. */
  frame: OrbitFrame | undefined;
  heading: number;
  pitch: number;
  range: number;
  minRange: number;
  maxRange: number;
}

/** What the Viewer knows when an orbit starts. */
export interface OrbitContext {
  /** What was last framed. */
  focusCenter: ArrayLike<number>;
  cameraPosition: ArrayLike<number>;
  /** The globe controls' heading. */
  globeHeading: number;
}

/** A controller's current orbit, for `planOrbit`. */
export function orbitState(controller: InspectController): OrbitPlan {
  return {
    target: vec3.copy(vec3.vec3(), controller.target),
    frame: controller.frame,
    heading: controller.heading,
    pitch: controller.pitch,
    range: controller.range,
    minRange: controller.minRange,
    maxRange: controller.maxRange,
  };
}

/**
 * Resolves `options` against the current orbit (undefined when it starts).
 * Throws a RangeError, before anything changes, on a degenerate frame or a
 * target, heading, pitch, range or range limit that isn't a finite place,
 * angle or positive length.
 */
export function planOrbit(
  current: OrbitPlan | undefined,
  options: OrbitOptions,
  context: OrbitContext,
): OrbitPlan {
  const given = options.frame !== undefined;
  const basis =
    given && options.frame
      ? orbitBasis(options.frame)
      : given
        ? undefined
        : current?.frame && orbitBasis(current.frame);
  const frame = basis && { up: basis.up, headingRef: basis.north };
  const minRange = options.minRange ?? current?.minRange ?? 0.01;
  const maxRange = options.maxRange ?? current?.maxRange ?? Infinity;
  if (!(minRange >= 0 && maxRange >= minRange && Number.isFinite(minRange))) {
    throw new RangeError(
      `setControls: the range limits [${minRange}, ${maxRange}] are not an interval of lengths`,
    );
  }
  const source = options.target ?? current?.target ?? context.focusCenter;
  const target = vec3.copy(vec3.vec3(), source);
  if (source.length !== 3 || ![...target].every(Number.isFinite)) {
    throw new RangeError(
      "setControls: the orbit's target is not a finite place",
    );
  }
  let { heading, pitch, range } = current ?? {
    heading: context.globeHeading,
    pitch: -0.4,
    range: 0,
  };
  if (!current || given) {
    const pose =
      (basis || given) &&
      orbitPose(
        context.cameraPosition,
        target,
        basis ?? enuBasis(target),
        heading,
      );
    if (pose) {
      ({ heading, pitch } = pose);
    }
    range = Math.max(
      vec3.distance(vec3.copy(vec3.vec3(), context.cameraPosition), target),
      0.01,
    );
  }
  heading = options.heading ?? heading;
  pitch = options.pitch ?? pitch;
  range = options.range ?? range;
  if (![heading, pitch].every(Number.isFinite)) {
    throw new RangeError(
      "setControls: the orbit's heading or pitch is not finite",
    );
  }
  if (!(range > 0 && Number.isFinite(range))) {
    throw new RangeError(
      `setControls: the orbit's range (${range}) is not a positive length`,
    );
  }
  return { target, frame, heading, pitch, range, minRange, maxRange };
}

/**
 * `zoomTo` while orbiting: an east-north-up orbit focuses on what is framed
 * from `zoomTo`'s heading and pitch; one in a frame keeps the frame, the
 * camera placed as `zoomTo` places it and the orbit read from there.
 */
export function followZoom(
  controller: InspectController,
  center: ArrayLike<number>,
  heading: number,
  pitch: number,
  range: number,
): void {
  if (controller.frame) {
    controller.view.camera.lookAt(
      vec3.copy(vec3.vec3(), center),
      heading,
      pitch,
      range,
      Ellipsoid.WGS84,
    );
    controller.syncFromCamera(center);
  } else {
    controller.focus(center, heading, pitch, range);
  }
}
