import * as v3 from "../math/vec3.ts";
import { Ellipsoid, cartographic } from "../math/ellipsoid.ts";
import type { Camera } from "./Camera.ts";
import type { View } from "./View.ts";
import { EarthFixedGuard, earthFixed } from "./earthAnchor.ts";
import { rotateAbout } from "./GlobeController.ts";
import {
  TouchGestures,
  holdBrowserGestures,
  type TouchGestureListener,
} from "./touchGestures.ts";

/**
 * Minimal globe navigation for the PoC: drag spins the globe under the
 * camera, wheel zooms toward the surface. Listens on the view's canvas but
 * only reacts inside the view's rectangle, and only while the Earth's
 * anchor is at the identity in the view's render space (it warns once
 * otherwise).
 *
 * `camera` defaults to the view's camera; point it at another view's camera
 * to make this view a controller for that one (a "control" link).
 *
 * Touch: one finger spins the globe like a drag. Two fingers pinch, twist
 * and pan together: the pinch scales the distance to the ground ahead by
 * the inverse of the spread, the twist turns the heading, and the pan moves
 * the ground with the midpoint. Two fingers sliding up or down together
 * change the pitch; see `touchGestures.ts`.
 */
export class OrbitController {
  camera: Camera;
  /** Ignore input at these target pixels, e.g. where another view sits on top. */
  ignore?: (x: number, y: number) => boolean;
  private dragging = false;
  private lastX = 0;
  private lastY = 0;
  private readonly ellipsoid = Ellipsoid.WGS84;
  private readonly abort = new AbortController();
  private readonly guard: EarthFixedGuard;
  private readonly touch = new TouchGestures(this.touchListener());

  constructor(
    readonly view: View,
    readonly element: HTMLElement,
  ) {
    this.camera = view.camera;
    this.guard = new EarthFixedGuard(view, "OrbitController");
    const signal = this.abort.signal;
    signal.addEventListener("abort", holdBrowserGestures(element), {
      once: true,
    });
    element.addEventListener("pointerdown", (e) => this.onDown(e), { signal });
    element.addEventListener("pointermove", (e) => this.onMove(e), { signal });
    element.addEventListener("pointerup", (e) => this.onUp(e), { signal });
    element.addEventListener("pointercancel", (e) => this.onCancel(e), {
      signal,
    });
    element.addEventListener("pointerleave", (e) => this.onCancel(e, true), {
      signal,
    });
    element.addEventListener("wheel", (e) => this.onWheel(e), {
      signal,
      passive: false,
    });
  }

  dispose(): void {
    this.abort.abort();
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

  private accepts(x: number, y: number): boolean {
    return (
      this.view.contains(x, y) && !this.ignore?.(x, y) && this.guard.accepts()
    );
  }

  private onUp(e: PointerEvent): void {
    if (e.pointerType === "touch") {
      this.touch.up(e);
    } else {
      this.dragging = false;
    }
  }

  /** A cancelled pointer, or a mouse leaving (a finger's leave follows its up). */
  private onCancel(e: PointerEvent, leave = false): void {
    if (e.pointerType === "touch") {
      if (!leave) {
        this.touch.up(e);
      }
    } else if (leave) {
      this.dragging = false;
    }
  }

  /** What the touch tracker's gestures do. */
  private touchListener(): TouchGestureListener {
    return {
      oneStart: (cx, cy) => {
        const [x, y] = this.clientPixel(cx, cy);
        this.dragging = true;
        this.lastX = x;
        this.lastY = y;
      },
      oneMove: (cx, cy) => {
        if (this.dragging) {
          const [x, y] = this.clientPixel(cx, cy);
          this.dragTo(x, y);
        }
      },
      oneEnd: () => (this.dragging = false),
      twoStart: () => (this.dragging = false),
      twoMove: (m) => {
        if (!earthFixed(this.view)) {
          return;
        }
        const [sx, sy] = this.pixelScale();
        if (m.kind === "tilt") {
          this.pitchBy(
            ((m.dy * sy) / this.view.pixelRect().height) * this.fovy(),
          );
          return;
        }
        const distance = this.groundDistance();
        // The pan keeps the ground under the midpoint: a pixel is as many
        // meters as the view shows there, turned about the Earth's center.
        const r = this.view.pixelRect();
        const perPixel =
          (2 * distance * Math.tan(this.fovy() / 2)) /
          r.height /
          Math.max(v3.length(this.camera.position) - this.altitude(), 1);
        this.spin(m.dx * sx, m.dy * sy, perPixel);
        if (m.angle !== 0) {
          // The globe turns with the fingers: the camera turns the other
          // way about its own height axis.
          this.camera.rotateAroundCenter(
            v3.normalize(scratchAxis, this.camera.position),
            m.angle,
          );
        }
        if (m.scale !== 1) {
          // The distance to the ground ahead scales by the inverse of the
          // spread (a meter is the closest).
          const next = Math.max(distance / m.scale, 1);
          v3.scaleAndAdd(
            this.camera.position,
            this.camera.position,
            this.camera.direction,
            distance - next,
          );
          this.camera.version++;
        }
      },
    };
  }

  /** The vertical field of view of this view (radians). */
  private fovy(): number {
    const r = this.view.pixelRect();
    return this.camera.fovy(r.width / r.height);
  }

  /**
   * The distance from the camera to the ground along its view direction, or
   * its height above the ellipsoid where it looks past the globe.
   */
  private groundDistance(): number {
    const hit = this.ellipsoid.rayIntersection(
      this.camera.position,
      this.camera.direction,
      scratchHit,
    );
    return Math.max(
      hit ? v3.distance(this.camera.position, hit) : this.altitude(),
      1,
    );
  }

  /**
   * Changes the pitch by `angle` radians about the ground the camera faces:
   * a positive angle lifts the camera toward straight down. It stays above
   * the horizon there and short of straight down.
   */
  private pitchBy(angle: number): void {
    const camera = this.camera;
    const distance = this.groundDistance();
    const pivot = v3.scaleAndAdd(
      scratchHit,
      camera.position,
      camera.direction,
      distance,
    );
    const up = this.ellipsoid.geodeticSurfaceNormal(pivot, scratchTilt);
    if (!up) {
      return;
    }
    const toCamera = v3.normalize(
      scratchAxis,
      v3.sub(scratchAxis, camera.position, pivot),
    );
    const elevation = Math.asin(
      Math.min(Math.max(v3.dot(toCamera, up), -1), 1),
    );
    const next = Math.min(
      Math.max(elevation + angle, 0.01),
      Math.PI / 2 - 0.001,
    );
    rotateAbout(camera, pivot, camera.right, -(next - elevation));
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
    this.dragging = true;
    this.lastX = x;
    this.lastY = y;
  }

  private onMove(e: PointerEvent): void {
    if (e.pointerType === "touch") {
      this.touch.move(e);
      return;
    }
    if (!this.dragging) {
      return;
    }
    const [x, y] = this.targetPixel(e);
    this.dragTo(x, y);
  }

  /** A drag's pointer is now at (x, y). */
  private dragTo(x: number, y: number): void {
    if (!earthFixed(this.view)) {
      this.dragging = false; // re-rooted off the Earth mid-drag
      return;
    }
    const dx = x - this.lastX;
    const dy = y - this.lastY;
    this.lastX = x;
    this.lastY = y;
    this.spin(dx, dy);
  }

  /** Spins the globe under the camera by a drag of (dx, dy) target pixels. */
  private spin(dx: number, dy: number, perPixel = this.dragAngle()): void {
    this.camera.rotateAroundCenter(
      v3.set(scratchAxis, 0, 0, 1),
      -dx * perPixel,
    );
    this.camera.rotateAroundCenter(
      v3.copy(scratchTilt, this.camera.right),
      -dy * perPixel,
    );
  }

  /** Radians per pixel for a mouse drag: across the view sweeps roughly the visible ground. */
  private dragAngle(): number {
    const height = Math.max(this.altitude(), 1);
    return (
      (height / this.ellipsoid.maximumRadius) *
      (1.0 / this.view.pixelRect().height) *
      1.2
    );
  }

  private onWheel(e: WheelEvent): void {
    const [x, y] = this.targetPixel(e);
    if (!this.accepts(x, y)) {
      return;
    }
    e.preventDefault();
    const height = this.altitude();
    const step = Math.sign(e.deltaY) * Math.max(height * 0.15, 5);
    v3.scaleAndAdd(
      this.camera.position,
      this.camera.position,
      this.camera.direction,
      -step,
    );
    this.camera.version++;
  }

  private altitude(): number {
    return (
      this.ellipsoid.cartesianToCartographic(this.camera.position, scratchCarto)
        ?.height ?? 0
    );
  }
}

const scratchAxis = v3.vec3();
const scratchHit = v3.vec3();
const scratchTilt = v3.vec3();
const scratchCarto = cartographic();
