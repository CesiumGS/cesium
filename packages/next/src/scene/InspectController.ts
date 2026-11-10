import * as v3 from "../math/vec3.ts";
import * as m4 from "../math/mat4.ts";
import { Ellipsoid } from "../math/ellipsoid.ts";
import { eastNorthUpToFixedFrame } from "../math/transforms.ts";
import type { Vec3 } from "../math/vec3.ts";
import type { View } from "./View.ts";
import { EarthFixedGuard, earthFixed } from "./earthAnchor.ts";
import {
  TouchGestures,
  holdBrowserGestures,
  type TouchGestureListener,
} from "./touchGestures.ts";

/**
 * A reference frame to orbit in, instead of the ellipsoid's east-north-up
 * at the target: `up` and `headingRef` (the heading-0 direction, "north")
 * are unit vectors in the Earth-fixed frame. `headingRef` is made
 * perpendicular to `up` if it isn't quite.
 */
export interface OrbitFrame {
  up: ArrayLike<number>;
  headingRef: ArrayLike<number>;
}

export interface InspectControllerOptions {
  /** Orbit in this frame (default: east-north-up at the target). */
  frame?: OrbitFrame;
  /** The wheel zooms no closer than this, in meters (default 0.01). */
  minRange?: number;
  /** The wheel zooms no farther than this, in meters (default unlimited). */
  maxRange?: number;
}

/** Pitch stays this far inside ±π/2, where up and the view would align. */
const maxPitch = Math.PI / 2 - 1e-3;

/** An orbit's axes: unit east, north (heading 0) and up, east = north × up. */
export interface OrbitBasis {
  east: Vec3;
  north: Vec3;
  up: Vec3;
}

/**
 * A frame's axes: `up` normalized, `headingRef` made perpendicular to it
 * (Gram-Schmidt) and normalized. Throws a RangeError on a degenerate frame.
 */
export function orbitBasis(frame: OrbitFrame): OrbitBasis {
  const up = v3.copy(v3.vec3(), frame.up);
  const north = v3.copy(v3.vec3(), frame.headingRef);
  if (
    frame.up.length !== 3 ||
    frame.headingRef.length !== 3 ||
    ![...up, ...north].every(Number.isFinite) ||
    v3.length(up) < 1e-12
  ) {
    throw new RangeError(
      "InspectController: the frame's up is not a direction",
    );
  }
  v3.normalize(up, up);
  v3.scaleAndAdd(north, north, up, -v3.dot(north, up));
  if (v3.length(north) < 1e-9) {
    throw new RangeError(
      "InspectController: the frame's headingRef is parallel to up",
    );
  }
  v3.normalize(north, north);
  return { east: v3.cross(v3.vec3(), north, up), north, up };
}

/** East-north-up at `target` on the ellipsoid, as an orbit's axes (scratch). */
export function enuBasis(
  target: ArrayLike<number>,
  ellipsoid = Ellipsoid.WGS84,
): OrbitBasis {
  const enu = eastNorthUpToFixedFrame(
    v3.copy(scratchT, target),
    ellipsoid,
    scratchEnu,
  );
  return {
    east: v3.set(scratchE, enu[0]!, enu[1]!, enu[2]!),
    north: v3.set(scratchN, enu[4]!, enu[5]!, enu[6]!),
    up: v3.set(scratchU, enu[8]!, enu[9]!, enu[10]!),
  };
}

/**
 * The heading, pitch and range (`Camera.lookAt`'s convention, in `basis`)
 * that put a camera at `position` orbiting `target`; undefined when it is
 * on the target. Pitch is clamped to ±(π/2 − 1e-3), as a drag clamps it:
 * at ±π/2 the roll would be arbitrary. Looking straight along ±up keeps
 * `heading`.
 */
export function orbitPose(
  position: ArrayLike<number>,
  target: ArrayLike<number>,
  basis: OrbitBasis,
  heading: number,
): { heading: number; pitch: number; range: number } | undefined {
  const offset = v3.set(
    scratchO,
    position[0]! - target[0]!,
    position[1]! - target[1]!,
    position[2]! - target[2]!,
  );
  const range = v3.length(offset);
  if (!(range > 1e-9)) {
    return undefined;
  }
  const ox = v3.dot(offset, basis.east);
  const oy = v3.dot(offset, basis.north);
  const oz = v3.dot(offset, basis.up);
  // `lookAt`'s offset inverted: o = r (-cos p cos h, cos p sin h, -sin p),
  // h = heading - π/2.
  const pitch = Math.min(
    Math.max(Math.asin(Math.min(Math.max(-oz / range, -1), 1)), -maxPitch),
    maxPitch,
  );
  if (Math.hypot(ox, oy) > 1e-12 * range) {
    heading = Math.atan2(oy, -ox) + Math.PI / 2;
  }
  return { heading, pitch, range };
}

/**
 * Orbits the view's camera around a focus point, for inspecting models and
 * tilesets: drag rotates (heading/pitch), right- or shift-drag pans in the
 * local east-north plane, wheel zooms the range. On touch, one finger
 * rotates, a pinch zooms the range, a two-finger drag pans and a two-finger
 * rotation turns the heading (`touchGestures.ts`). Only reacts inside the
 * view's rectangle; a drag starts anywhere in it (nothing is picked).
 *
 * With a `frame`, heading turns about the frame's up (clockwise from
 * `headingRef` seen from above), pitch is measured from the plane
 * perpendicular to up, and panning moves in that plane: for orbiting a
 * point in space, where east-north-up would make "up" Earth-radial.
 * In a frame, a camera moved by someone else since the controller last
 * placed it (`camera.version`) is re-read at the next drag or wheel
 * (`syncFromCamera`) rather than snapped back.
 *
 * Its points are Earth-fixed: while the Earth's anchor isn't at the
 * identity in the view's render space (a rig off the Earth), it ignores
 * input and warns once.
 */
export class InspectController {
  readonly target: Vec3 = v3.vec3();
  heading = 0;
  pitch = -0.5;
  range = 100;
  /** The wheel's range limits, in meters. */
  minRange = 0.01;
  maxRange = Infinity;
  /** Ignore input at these target pixels, e.g. where another view sits on top. */
  ignore?: (x: number, y: number) => boolean;
  /** Called after the controller moves the camera, and when a drag starts or ends. */
  onChange?: () => void;
  private frame_?: OrbitBasis;
  private mode: "none" | "rotate" | "pan" | "pinch" | "twist" = "none";
  private lastX = 0;
  private lastY = 0;
  /** The camera's version after this controller last placed it. */
  private appliedVersion = -1;
  private readonly abort = new AbortController();
  private readonly ellipsoid = Ellipsoid.WGS84;
  private readonly guard: EarthFixedGuard;
  private readonly touch = new TouchGestures(this.touchListener());

  constructor(
    readonly view: View,
    readonly element: HTMLElement,
    options: InspectControllerOptions = {},
  ) {
    this.guard = new EarthFixedGuard(view, "InspectController");
    this.frame = options.frame;
    this.minRange = options.minRange ?? this.minRange;
    this.maxRange = options.maxRange ?? this.maxRange;
    const signal = this.abort.signal;
    signal.addEventListener("abort", holdBrowserGestures(element), {
      once: true,
    });
    element.addEventListener("pointerdown", (e) => this.onDown(e), { signal });
    element.addEventListener("pointermove", (e) => this.onMove(e), { signal });
    element.addEventListener("pointerup", (e) => this.onUp(e), { signal });
    element.addEventListener("pointercancel", (e) => this.onUp(e, true), {
      signal,
    });
    // A finger's leave follows its up, which has already been handled.
    element.addEventListener(
      "pointerleave",
      (e) => e.pointerType === "touch" || this.end(),
      { signal },
    );
    element.addEventListener("contextmenu", (e) => e.preventDefault(), {
      signal,
    });
    element.addEventListener("wheel", (e) => this.onWheel(e), {
      signal,
      passive: false,
    });
  }

  /** The frame orbited in (normalized), or undefined for east-north-up. */
  get frame(): OrbitFrame | undefined {
    const f = this.frame_;
    return (
      f && {
        up: v3.copy(v3.vec3(), f.up),
        headingRef: v3.copy(v3.vec3(), f.north),
      }
    );
  }

  /**
   * Sets the frame (undefined: east-north-up at the target). Takes effect
   * at the next `focus` or input; throws on a degenerate frame.
   */
  set frame(frame: OrbitFrame | undefined) {
    this.frame_ = frame && orbitBasis(frame);
  }

  /** Whether a drag (rotate or pan) is under way. */
  get dragging(): boolean {
    return this.mode !== "none";
  }

  /** Looks at `target` from heading/pitch (radians) at `range` meters. */
  focus(
    target: ArrayLike<number>,
    heading: number,
    pitch: number,
    range: number,
  ): void {
    v3.copy(this.target, target);
    this.heading = heading;
    this.pitch = pitch;
    this.range = range;
    this.apply();
  }

  /**
   * Takes the camera's current place as the orbit's: around `pivot`, or by
   * default around the point on the view axis at the old target's depth
   * (at `range` if that is behind the camera). The camera keeps its
   * position and turns to face the pivot, unrolled about the frame's up.
   */
  syncFromCamera(pivot?: ArrayLike<number>): void {
    const camera = this.view.camera;
    if (pivot) {
      v3.copy(this.target, pivot);
    } else {
      const depth = v3.dot(
        v3.sub(scratchA, this.target, camera.position),
        camera.direction,
      );
      v3.scaleAndAdd(
        this.target,
        camera.position,
        camera.direction,
        depth > 1e-9 ? depth : this.range,
      );
    }
    const pose = orbitPose(
      camera.position,
      this.target,
      this.basis(),
      this.heading,
    );
    if (pose) {
      // On the pivot there is no pose to read: keep the one there is.
      this.heading = pose.heading;
      this.pitch = pose.pitch;
      this.range = pose.range;
    }
    this.apply();
  }

  dispose(): void {
    this.abort.abort();
  }

  private apply(): void {
    const camera = this.view.camera;
    const f = this.frame_;
    if (f) {
      camera.lookAtInFrame(
        this.target,
        this.heading,
        this.pitch,
        this.range,
        f.north,
        f.up,
      );
    } else {
      camera.lookAt(
        this.target,
        this.heading,
        this.pitch,
        this.range,
        this.ellipsoid,
      );
    }
    this.appliedVersion = camera.version;
    this.onChange?.();
  }

  /** East, north and up: the frame's, or the ellipsoid's at the target. */
  private basis(): OrbitBasis {
    return this.frame_ ?? enuBasis(this.target, this.ellipsoid);
  }

  /** In a frame, re-reads a camera someone else moved (see the class doc). */
  private resync(): void {
    if (this.frame_ && this.view.camera.version !== this.appliedVersion) {
      this.syncFromCamera();
    }
  }

  private end(): void {
    if (this.mode !== "none") {
      this.mode = "none";
      this.onChange?.();
    }
  }

  private targetPixel(e: PointerEvent | WheelEvent): [number, number] {
    return this.clientPixel(e.clientX, e.clientY);
  }

  /** The target pixel under a client position (CSS pixels). */
  private clientPixel(cx: number, cy: number): [number, number] {
    const rect = this.element.getBoundingClientRect();
    const [sx, sy] = this.pixelScale();
    return [(cx - rect.left) * sx, (cy - rect.top) * sy];
  }

  /** Target pixels per CSS pixel, across and down. */
  private pixelScale(): [number, number] {
    const rect = this.element.getBoundingClientRect();
    return [
      this.view.target.width / rect.width,
      this.view.target.height / rect.height,
    ];
  }

  private onUp(e: PointerEvent, cancelled = false): void {
    if (e.pointerType === "touch") {
      this.touch.up(e);
    } else if (!cancelled) {
      this.end();
    }
  }

  /** What the touch tracker's gestures do. */
  private touchListener(): TouchGestureListener {
    return {
      oneStart: (cx, cy) => {
        const [x, y] = this.clientPixel(cx, cy);
        this.resync();
        this.mode = "rotate";
        this.lastX = x;
        this.lastY = y;
        this.onChange?.();
      },
      oneMove: (cx, cy) => {
        if (this.mode !== "rotate") {
          return;
        }
        if (!earthFixed(this.view)) {
          this.end();
          return;
        }
        const [x, y] = this.clientPixel(cx, cy);
        const dx = x - this.lastX;
        const dy = y - this.lastY;
        this.lastX = x;
        this.lastY = y;
        this.moveBy(dx, dy);
      },
      oneEnd: () => this.end(),
      twoStart: () => this.end(),
      twoBegin: (kind) => {
        this.resync();
        this.mode =
          kind === "pinch" ? "pinch" : kind === "drag" ? "pan" : "twist";
        this.onChange?.();
      },
      twoMove: (m) => {
        if (!earthFixed(this.view)) {
          this.end();
          return;
        }
        if (m.kind === "pinch" && this.mode === "pinch") {
          this.range = Math.min(
            Math.max(this.range / m.scale, this.minRange),
            this.maxRange,
          );
        } else if (m.kind === "drag" && this.mode === "pan") {
          const [sx, sy] = this.pixelScale();
          this.pan(m.dx * sx, m.dy * sy);
        } else if (m.kind === "rotate" && this.mode === "twist") {
          // The scene turns with the fingers, so the heading goes the
          // other way (a heading grows clockwise seen from above).
          this.heading -= m.angle;
        } else {
          return;
        }
        this.apply();
      },
      twoEnd: () => this.end(),
    };
  }

  private accepts(x: number, y: number): boolean {
    return (
      this.view.contains(x, y) && !this.ignore?.(x, y) && this.guard.accepts()
    );
  }

  private onDown(e: PointerEvent): void {
    const [x, y] = this.targetPixel(e);
    if (!this.accepts(x, y)) {
      return;
    }
    if (e.pointerType === "touch") {
      this.touch.down(e);
      return;
    }
    this.resync();
    this.mode = e.button === 2 || e.shiftKey ? "pan" : "rotate";
    this.lastX = x;
    this.lastY = y;
    this.onChange?.();
  }

  private onMove(e: PointerEvent): void {
    if (e.pointerType === "touch") {
      this.touch.move(e);
      return;
    }
    if (this.mode === "none") {
      return;
    }
    if (!earthFixed(this.view)) {
      this.end(); // re-rooted off the Earth mid-drag
      return;
    }
    const [x, y] = this.targetPixel(e);
    const dx = x - this.lastX;
    const dy = y - this.lastY;
    this.lastX = x;
    this.lastY = y;
    this.moveBy(dx, dy);
  }

  /** Rotates or pans by a drag of (dx, dy) target pixels, and places the camera. */
  private moveBy(dx: number, dy: number): void {
    if (this.mode === "rotate") {
      const height = this.view.pixelRect().height;
      this.heading += (dx / height) * Math.PI;
      this.pitch = Math.min(
        Math.max(this.pitch - (dy / height) * Math.PI, -maxPitch),
        maxPitch,
      );
    } else {
      this.pan(dx, dy);
    }
    this.apply();
  }

  /** Pans the target by a drag of (dx, dy) target pixels. */
  private pan(dx: number, dy: number): void {
    const height = this.view.pixelRect().height;
    // Pan in the plane perpendicular to up (the target's local
    // east-north plane without a frame), rotated by the heading.
    const { east: eastAxis, north: northAxis } = this.basis();
    const scale = (this.range * 1.2) / height;
    const c = Math.cos(this.heading);
    const s = Math.sin(this.heading);
    // Screen right/up mapped to east/north for the current heading.
    const east = -dx * c + dy * s;
    const north = dx * s + dy * c;
    for (let i = 0; i < 3; i++) {
      this.target[i] =
        this.target[i]! + (eastAxis[i]! * east + northAxis[i]! * north) * scale;
    }
  }

  private onWheel(e: WheelEvent): void {
    const [x, y] = this.targetPixel(e);
    if (!this.accepts(x, y)) {
      return;
    }
    e.preventDefault();
    this.resync();
    this.range = Math.min(
      Math.max(this.range * 1.15 ** Math.sign(e.deltaY), this.minRange),
      this.maxRange,
    );
    this.apply();
  }
}

const scratchEnu = m4.mat4();
const scratchA = v3.vec3();
const scratchO = v3.vec3();
const scratchT = v3.vec3();
const scratchE = v3.vec3();
const scratchN = v3.vec3();
const scratchU = v3.vec3();
