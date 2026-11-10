import * as v3 from "../math/vec3.ts";
import { Ellipsoid, cartographic } from "../math/ellipsoid.ts";
import type { Camera } from "./Camera.ts";
import type { View } from "./View.ts";
import { EarthFixedGuard, earthFixed } from "./earthAnchor.ts";
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
 * Touch: one finger spins the globe like a drag; two fingers pinch (zoom),
 * drag (the same spin) or rotate (turn the heading); see `touchGestures.ts`.
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
        if (m.kind === "pinch") {
          // Closer by the share the fingers spread by (as the wheel moves
          // along the view direction, by a share of the height).
          const step = Math.max(this.altitude(), 5) * (1 - 1 / m.scale);
          v3.scaleAndAdd(
            this.camera.position,
            this.camera.position,
            this.camera.direction,
            step,
          );
          this.camera.version++;
        } else if (m.kind === "drag") {
          const [sx, sy] = this.pixelScale();
          this.spin(m.dx * sx, m.dy * sy);
        } else {
          // The globe turns with the fingers: the camera turns the other
          // way about its own height axis.
          this.camera.rotateAroundCenter(
            v3.normalize(scratchAxis, this.camera.position),
            m.angle,
          );
        }
      },
    };
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
  private spin(dx: number, dy: number): void {
    // Angle per pixel so a drag across the view sweeps roughly the visible ground.
    const height = Math.max(this.altitude(), 1);
    const perPixel =
      (height / this.ellipsoid.maximumRadius) *
      (1.0 / this.view.pixelRect().height) *
      1.2;
    this.camera.rotateAroundCenter(
      v3.set(scratchAxis, 0, 0, 1),
      -dx * perPixel,
    );
    this.camera.rotateAroundCenter(
      v3.copy(scratchTilt, this.camera.right),
      -dy * perPixel,
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
const scratchTilt = v3.vec3();
const scratchCarto = cartographic();
