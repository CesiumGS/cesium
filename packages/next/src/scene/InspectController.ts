import * as v3 from "../math/vec3.ts";
import * as m4 from "../math/mat4.ts";
import { Ellipsoid } from "../math/ellipsoid.ts";
import { eastNorthUpToFixedFrame } from "../math/transforms.ts";
import type { Vec3 } from "../math/vec3.ts";
import type { View } from "./View.ts";

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

const maxPitch = Math.PI / 2 - 1e-3;

/**
 * Orbits the view's camera around a focus point, for inspecting models and
 * tilesets: drag rotates (heading/pitch), right- or shift-drag pans in the
 * local east-north plane, wheel zooms the range. Only reacts inside the
 * view's rectangle; a drag starts anywhere in it (nothing is picked).
 *
 * With a `frame`, heading turns about the frame's up (clockwise from
 * `headingRef` seen from above), pitch is measured from the plane
 * perpendicular to up, and panning moves in that plane: for orbiting a
 * point in space, where east-north-up would make "up" Earth-radial.
 * In a frame, a camera moved by someone else since the controller last
 * placed it (`camera.version`) is re-read at the next drag or wheel
 * (`syncFromCamera`) rather than snapped back.
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
  private frame_?: { up: Vec3; north: Vec3; east: Vec3 };
  private mode: "none" | "rotate" | "pan" = "none";
  private lastX = 0;
  private lastY = 0;
  /** The camera's version after this controller last placed it. */
  private appliedVersion = -1;
  private readonly abort = new AbortController();
  private readonly ellipsoid = Ellipsoid.WGS84;

  constructor(
    readonly view: View,
    readonly element: HTMLElement,
    options: InspectControllerOptions = {},
  ) {
    this.frame = options.frame;
    this.minRange = options.minRange ?? this.minRange;
    this.maxRange = options.maxRange ?? this.maxRange;
    const signal = this.abort.signal;
    element.addEventListener("pointerdown", (e) => this.onDown(e), { signal });
    element.addEventListener("pointermove", (e) => this.onMove(e), { signal });
    element.addEventListener("pointerup", () => this.end(), { signal });
    element.addEventListener("pointerleave", () => this.end(), { signal });
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
    if (!frame) {
      this.frame_ = undefined;
      return;
    }
    const up = v3.copy(v3.vec3(), frame.up);
    const north = v3.copy(v3.vec3(), frame.headingRef);
    if (![...up, ...north].every(Number.isFinite) || v3.length(up) < 1e-12) {
      throw new RangeError(
        "InspectController: the frame's up is not a direction",
      );
    }
    v3.normalize(up, up);
    // Gram-Schmidt: the part of headingRef perpendicular to up.
    v3.scaleAndAdd(north, north, up, -v3.dot(north, up));
    if (v3.length(north) < 1e-9) {
      throw new RangeError(
        "InspectController: the frame's headingRef is parallel to up",
      );
    }
    v3.normalize(north, north);
    this.frame_ = { up, north, east: v3.cross(v3.vec3(), north, up) };
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
    const offset = v3.sub(scratchA, camera.position, this.target);
    const range = v3.length(offset);
    if (!(range > 1e-9)) {
      // On the pivot: keep the heading, pitch and range there are.
      this.apply();
      return;
    }
    const [east, north, up] = this.basis();
    const ox = v3.dot(offset, east);
    const oy = v3.dot(offset, north);
    const oz = v3.dot(offset, up);
    // `lookAt`'s offset inverted: o = r (-cos p cos h, cos p sin h, -sin p),
    // h = heading - π/2.
    this.range = range;
    this.pitch = Math.asin(Math.min(Math.max(-oz / range, -1), 1));
    if (Math.hypot(ox, oy) > 1e-12 * range) {
      this.heading = Math.atan2(oy, -ox) + Math.PI / 2;
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
  private basis(): [Vec3, Vec3, Vec3] {
    const f = this.frame_;
    if (f) {
      return [f.east, f.north, f.up];
    }
    const enu = eastNorthUpToFixedFrame(
      this.target,
      this.ellipsoid,
      scratchEnu,
    );
    return [
      v3.set(scratchE, enu[0]!, enu[1]!, enu[2]!),
      v3.set(scratchN, enu[4]!, enu[5]!, enu[6]!),
      v3.set(scratchU, enu[8]!, enu[9]!, enu[10]!),
    ];
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
    const rect = this.element.getBoundingClientRect();
    const sx = this.view.target.width / rect.width;
    const sy = this.view.target.height / rect.height;
    return [(e.clientX - rect.left) * sx, (e.clientY - rect.top) * sy];
  }

  private accepts(x: number, y: number): boolean {
    return this.view.contains(x, y) && !this.ignore?.(x, y);
  }

  private onDown(e: PointerEvent): void {
    const [x, y] = this.targetPixel(e);
    if (!this.accepts(x, y)) {
      return;
    }
    this.resync();
    this.mode = e.button === 2 || e.shiftKey ? "pan" : "rotate";
    this.lastX = x;
    this.lastY = y;
    this.onChange?.();
  }

  private onMove(e: PointerEvent): void {
    if (this.mode === "none") {
      return;
    }
    const [x, y] = this.targetPixel(e);
    const dx = x - this.lastX;
    const dy = y - this.lastY;
    this.lastX = x;
    this.lastY = y;
    const height = this.view.pixelRect().height;
    if (this.mode === "rotate") {
      this.heading += (dx / height) * Math.PI;
      this.pitch = Math.min(
        Math.max(this.pitch - (dy / height) * Math.PI, -maxPitch),
        maxPitch,
      );
    } else {
      // Pan in the plane perpendicular to up (the target's local
      // east-north plane without a frame), rotated by the heading.
      const [eastAxis, northAxis] = this.basis();
      const scale = (this.range * 1.2) / height;
      const c = Math.cos(this.heading);
      const s = Math.sin(this.heading);
      // Screen right/up mapped to east/north for the current heading.
      const east = -dx * c + dy * s;
      const north = dx * s + dy * c;
      for (let i = 0; i < 3; i++) {
        this.target[i] =
          this.target[i]! +
          (eastAxis[i]! * east + northAxis[i]! * north) * scale;
      }
    }
    this.apply();
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
const scratchE = v3.vec3();
const scratchN = v3.vec3();
const scratchU = v3.vec3();
