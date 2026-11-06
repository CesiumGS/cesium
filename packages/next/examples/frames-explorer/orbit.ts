// The camera's controls in space (owner, 2026-11-06: "i get stuck out in
// space, seem to only be able to start a rotation by clicking on the
// earth"). A view framed on the Moon or Orion, and earth-turns's polar view,
// orbit their subject with the viewer's orbit controls
// (`setControls("orbit", …)`), in a frame of the subject's own: a rig, its
// focus, its up and its heading 0. The Earth's views keep the globe
// controls, so the ground is a zoom away. Plain functions; main.ts applies them, follows
// the clock and draws the pivot marker (pivot.ts). The larger design, camera
// rigs attached to frames, is plan 5's (CESIUM2_WEBGPU_PLAN.md §13.14).
import { Camera } from "../../src/scene/Camera.ts";
import {
  orbitBasis,
  orbitPose,
  type OrbitFrame,
} from "../../src/scene/InspectController.ts";
import { LUNAR_SITE } from "./scenarios/scenes.ts";
import type { Framing } from "./globe.ts";
import { projectInto } from "./inset.ts";

/** WGS 84's equatorial radius, m. */
export const EARTH_RADIUS = 6_378_137;
/** The Moon's mean radius (IAU), m: the sky's lunar disk. */
export const MOON_RADIUS = 1_737_400;

/**
 * Where an orbit turns and how: its focus, its up (heading turns about it,
 * pitch is measured from the plane square to it) and heading 0's direction.
 * In a frame's own coordinates (`AXES_RIG`, `SITE_RIG`) or Earth-fixed
 * (`placeRig`).
 */
export interface Rig {
  target: number[];
  up: number[];
  headingRef: number[];
}

/**
 * The orbits the example uses:
 * - `geocentric`: the Earth's centre, up its axis, heading 0 toward 0°
 *   longitude (earth-turns, the polar view whose clock plays at 3,600×);
 * - `earthMoon`: between the Earth and the Moon, up the normal of the Moon's
 *   orbit at the flyby, heading 0 toward the Moon (one-path; Orion);
 * - `moon`: the Moon's centre, up its pole, heading 0 toward the Earth's
 *   side (MOON_ME's x; the Moon's frames);
 * - `lunarSite`: the south-pole site, up its vertical, heading 0 its north
 *   (stand-on-moon; the site).
 */
export type RigKind = "geocentric" | "earthMoon" | "moon" | "lunarSite";

/** A body-fixed frame's rig: its origin, z up, x at heading 0. */
export const AXES_RIG: Rig = {
  target: [0, 0, 0],
  up: [0, 0, 1],
  headingRef: [1, 0, 0],
};

/** An east-north-up site's rig: its origin, up up, north at heading 0. */
export const SITE_RIG: Rig = {
  target: [0, 0, 0],
  up: [0, 0, 1],
  headingRef: [0, 1, 0],
};

/**
 * A selected frame's orbit (when "Show on globe" or Frame content frames
 * it), on its origin: the Moon's frames, the lunar site and Orion. The
 * Earth's frames (ITRF, GCRF, EME2000, EARTH_ICRF, the sites) and ICRF and
 * HCRS, which show the opening shot, keep the globe controls.
 */
export function frameRig(id: string, orionId?: string): RigKind | undefined {
  if (id.startsWith("MOON_")) {
    return "moon";
  }
  if (id === LUNAR_SITE) {
    return "lunarSite";
  }
  if (orionId !== undefined && id === orionId) {
    return "earthMoon";
  }
  return undefined;
}

const unit = (v: ArrayLike<number>): number[] => {
  const l = Math.hypot(v[0]!, v[1]!, v[2]!);
  return [v[0]! / l, v[1]! / l, v[2]! / l];
};

/**
 * The Moon's prograde orbit normal: `moonAt(ms)` is the Moon from the
 * Earth's centre `ms` from the instant (stop 5: GCRF, DE440, at the
 * flyby); the normal is r(−30 min) × r(+30 min), normalized, so the Moon
 * goes counter-clockwise seen from it.
 */
export function moonOrbitNormal(
  moonAt: (ms: number) => ArrayLike<number>,
): number[] {
  const a = moonAt(-1_800_000);
  const b = moonAt(1_800_000);
  return unit([
    a[1]! * b[2]! - a[2]! * b[1]!,
    a[2]! * b[0]! - a[0]! * b[2]!,
    a[0]! * b[1]! - a[1]! * b[0]!,
  ]);
}

/**
 * Which controls a flight leaves the camera in, and when (fix round 1). A
 * flight to a surface view takes the globe controls at its start, so a
 * grab of the globe ends it there. A flight to an orbit view takes an
 * interim orbit at its start (about the camera's own line of sight, its
 * own up: nothing moves), so any drag or wheel of the user's ends the
 * flight, and lands in the destination's orbit at once; otherwise it lands
 * there when the flight arrives. Never both: an ended or arrived flight
 * lands once. `R` is a destination's rig.
 */
export class CameraFlow<R> {
  /** The orbit the flight under way lands in, until it lands. */
  private pending: R | undefined;
  /** Counts flights: a fetched asset frames itself only if none started since it was asked for. */
  private flights = 0;

  /** A flight starts: the controls to take now. */
  fly(rig: R | undefined): "globe" | "interim" {
    this.flights++;
    this.pending = rig;
    return rig === undefined ? "globe" : "interim";
  }

  /** The flight arrived: the orbit to land in, if any. */
  arrive(): R | undefined {
    const rig = this.pending;
    this.pending = undefined;
    return rig;
  }

  /** The user took the camera: the orbit to land in now, if a flight to one was under way. */
  interrupt(): R | undefined {
    return this.arrive();
  }

  /** An asset fetch starts: a token for `arrival`. */
  ask(): number {
    return this.flights;
  }

  /** Whether the asset asked for at `token` may frame itself: no flight under way, none since. */
  arrival(token: number, flying: boolean): boolean {
    return !flying && token === this.flights;
  }
}

/** Stop 5's orbit: focus `center`, up the Moon's orbit `normal`, heading 0 along the Earth–Moon vector `moon`. */
export function earthMoonRig(
  center: ArrayLike<number>,
  moon: ArrayLike<number>,
  normal: ArrayLike<number>,
): Rig {
  return {
    target: Array.from(center),
    up: unit(normal),
    headingRef: unit(moon),
  };
}

/** `rig` carried by `m`, a 4×4 column-major rigid transform (a frame to the Earth-fixed one). */
export function placeRig(rig: Rig, m: ArrayLike<number>): Rig {
  const turn = (v: readonly number[], w: number) =>
    [0, 1, 2].map(
      (i) =>
        m[i]! * v[0]! + m[4 + i]! * v[1]! + m[8 + i]! * v[2]! + w * m[12 + i]!,
    );
  return {
    target: turn(rig.target, 1),
    up: turn(rig.up, 0),
    headingRef: turn(rig.headingRef, 0),
  };
}

/**
 * The wheel's range limits for each orbit, m, given the Earth–Moon
 * distance `earthMoon`: never inside the body orbited, never so far that
 * the subject is lost in space.
 */
export function rangeLimits(
  kind: RigKind,
  earthMoon: number,
): { minRange: number; maxRange: number } {
  switch (kind) {
    case "geocentric":
      // Stop 2: about 130 km above the equator (the ground a zoom away),
      // out to 40 Earth radii.
      return { minRange: 1.02 * EARTH_RADIUS, maxRange: 40 * EARTH_RADIUS };
    case "earthMoon":
      // The focus is between the two: short of either body, out to four
      // Earth–Moon distances.
      return { minRange: 0.15 * earthMoon, maxRange: 4 * earthMoon };
    case "moon":
      return { minRange: 1.3 * MOON_RADIUS, maxRange: 0.25 * earthMoon };
    case "lunarSite":
      // Close to the triad (drawn at 15% of the camera's distance), out to
      // where the whole Moon is small.
      return { minRange: 5_000, maxRange: 25_000_000 };
  }
}

/**
 * The wheel's limits for an orbit landed `landed` from its pivot, the camera
 * now `range` from it (fix rounds 2 and 3). A flight interrupted outside the
 * destination's `limits` (a wheel about 140,000 km out on the way to stop 6,
 * whose orbit zooms to 25,000 km) lands where it is: the limits widen to take
 * the landing range, so the first tick moves one notch instead of jumping to
 * the limit, and hold so until the camera is inside the destination's own
 * limits, which apply from then on. The user can zoom back out to where the
 * flight landed, never past it.
 */
export function landedLimits(
  limits: { minRange: number; maxRange: number },
  landed: number,
  range: number,
): { minRange: number; maxRange: number } {
  if (range >= limits.minRange && range <= limits.maxRange) {
    return { minRange: limits.minRange, maxRange: limits.maxRange };
  }
  return {
    minRange: Math.min(limits.minRange, landed),
    maxRange: Math.max(limits.maxRange, landed),
  };
}

/** What an orbit is set to: `setControls("orbit", …)`'s options. */
export interface RigOrbit {
  target: number[];
  frame: OrbitFrame;
  heading: number;
  pitch: number;
  range: number;
}

/**
 * The orbit that carries the camera with its subject as the clock moves it
 * from `from` to `to` (both Earth-fixed): the camera at `camera` orbiting
 * `pivot` keeps its heading, pitch and range, and a pivot panned off the
 * focus moves with it. `heading` is kept when the camera is straight above
 * the pivot; undefined for a camera at the pivot.
 */
export function followRig(
  camera: ArrayLike<number>,
  pivot: ArrayLike<number>,
  from: Rig,
  to: Rig,
  heading: number,
): RigOrbit | undefined {
  const a = orbitBasis(from);
  const b = orbitBasis(to);
  const pose = orbitPose(camera, pivot, a, heading);
  if (!pose) {
    return undefined;
  }
  const o = [0, 1, 2].map((i) => pivot[i]! - from.target[i]!);
  const e = o[0]! * a.east[0]! + o[1]! * a.east[1]! + o[2]! * a.east[2]!;
  const n = o[0]! * a.north[0]! + o[1]! * a.north[1]! + o[2]! * a.north[2]!;
  const u = o[0]! * a.up[0]! + o[1]! * a.up[1]! + o[2]! * a.up[2]!;
  return {
    target: [0, 1, 2].map(
      (i) => to.target[i]! + e * b.east[i]! + n * b.north[i]! + u * b.up[i]!,
    ),
    frame: { up: to.up, headingRef: to.headingRef },
    ...pose,
  };
}

/**
 * A flight's end in `rig` (Earth-fixed): the camera at `heading`, `pitch`
 * and `range` about its focus, as the orbit reads them back (`Framing.from`).
 */
export function rigFraming(
  rig: Rig,
  heading: number,
  pitch: number,
  range: number,
): Framing & {
  center: number[];
  from: { direction: number[]; up: number[] };
} {
  const b = orbitBasis(rig);
  const camera = new Camera().lookAtInFrame(
    Float64Array.from(rig.target),
    heading,
    pitch,
    range,
    b.north,
    b.up,
  );
  return {
    center: [...rig.target],
    range,
    heading: 0,
    pitch: 0,
    from: {
      direction: unit(
        [0, 1, 2].map((i) => camera.position[i]! - rig.target[i]!),
      ),
      up: Array.from(b.up),
    },
  };
}

/**
 * The heading, in `rig`, that keeps a camera's view as it is when the orbit
 * takes it over: the heading of its line of sight, or, looking straight
 * along the rig's up (stop 5's view, down the Moon's orbit normal), of the
 * screen's up, which is where heading points then. Without it the orbit
 * would read no heading from the camera's place and turn the view.
 */
export function viewHeading(
  camera: {
    direction: ArrayLike<number>;
    up: ArrayLike<number>;
  },
  rig: Rig,
): number {
  const b = orbitBasis(rig);
  const d = camera.direction;
  const vertical = d[0]! * b.up[0]! + d[1]! * b.up[1]! + d[2]! * b.up[2]!;
  const level = (v: ArrayLike<number>, sign = 1) =>
    [0, 1, 2].map((i) => sign * v[i]!);
  const flat = Math.sqrt(Math.max(0, 1 - vertical * vertical));
  const f = flat > 1e-6 ? level(d) : level(camera.up, vertical < 0 ? 1 : -1);
  return Math.atan2(
    f[0]! * b.east[0]! + f[1]! * b.east[1]! + f[2]! * b.east[2]!,
    f[0]! * b.north[0]! + f[1]! * b.north[1]! + f[2]! * b.north[2]!,
  );
}

/**
 * Stop 6's range from straight above the site: the sky's lunar disk (a
 * backdrop: right only along the site's vertical) a little under three
 * quarters of the view's smaller half-angle, limb and all, for a camera of
 * `fov` (the wider dimension's) and `aspect` (width / height).
 */
export function lunarSiteRange(
  fov: number,
  aspect: number,
  fill = 0.72,
): number {
  const t = Math.tan(fov / 2);
  const half =
    aspect >= 1 ? Math.atan(t / aspect) : Math.atan(t * Math.max(aspect, 0.1));
  return MOON_RADIUS / Math.sin(fill * half) - MOON_RADIUS;
}

/** What Frame content re-flies: the selection, else the scenario's view, else the opening view. */
export type FrameTarget =
  | { kind: "scenario"; id: string }
  | { kind: "frame"; id: string }
  | { kind: "result"; id: string }
  | { kind: "opening" };

/**
 * Frame content's target: a selected frame (a tree node, or an edge by its
 * child node) or result first, as what the user picked last; otherwise the
 * scenario's own view.
 */
export function frameTarget(
  scenario: string | undefined,
  selection:
    | { kind: "none" }
    | { kind: "frame" | "node" | "edge"; id: string }
    | { kind: "result"; id: string },
): FrameTarget {
  if (selection.kind === "node" || selection.kind === "edge") {
    return { kind: "frame", id: selection.id };
  }
  if (selection.kind !== "none") {
    return { kind: selection.kind, id: selection.id };
  }
  if (scenario !== undefined) {
    return { kind: "scenario", id: scenario };
  }
  return { kind: "opening" };
}

const EDITABLE =
  "input, textarea, select, [contenteditable=''], [contenteditable='true'], .cm-editor";

/** Whether a key press is Frame content's F: no modifier, not typed into a field. */
export function isFrameKey(e: {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  target: { closest?: (selector: string) => unknown } | null;
}): boolean {
  if (e.metaKey || e.ctrlKey || e.altKey || (e.key !== "f" && e.key !== "F")) {
    return false;
  }
  return !e.target?.closest?.(EDITABLE);
}

/**
 * Where the pivot marker goes for `camera` in a view `width` × `height` CSS
 * px: undefined behind the camera or outside the view.
 */
export function pivotPlacement(
  pivot: ArrayLike<number>,
  camera: {
    position: ArrayLike<number>;
    direction: ArrayLike<number>;
    up: ArrayLike<number>;
    right: ArrayLike<number>;
    fov: number;
  },
  width: number,
  height: number,
): { x: number; y: number } | undefined {
  if (!(width > 0 && height > 0)) {
    return undefined;
  }
  const q = projectInto(pivot, camera, width / height, camera.fov);
  if (!q) {
    return undefined;
  }
  const x = q.x * width;
  const y = q.y * height;
  return x >= 0 && x <= width && y >= 0 && y <= height ? { x, y } : undefined;
}
