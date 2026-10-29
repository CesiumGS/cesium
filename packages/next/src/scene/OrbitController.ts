import * as v3 from "../math/vec3.ts";
import { Ellipsoid, cartographic } from "../math/ellipsoid.ts";
import type { Camera } from "./Camera.ts";
import type { View } from "./View.ts";

/**
 * Minimal globe navigation for the PoC: drag spins the globe under the
 * camera, wheel zooms toward the surface. Listens on the view's canvas but
 * only reacts inside the view's rectangle.
 *
 * `camera` defaults to the view's camera; point it at another view's camera
 * to make this view a controller for that one (a "control" link).
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

  constructor(
    readonly view: View,
    readonly element: HTMLElement,
  ) {
    this.camera = view.camera;
    const signal = this.abort.signal;
    element.addEventListener("pointerdown", (e) => this.onDown(e), { signal });
    element.addEventListener("pointermove", (e) => this.onMove(e), { signal });
    element.addEventListener("pointerup", () => (this.dragging = false), {
      signal,
    });
    element.addEventListener("pointerleave", () => (this.dragging = false), {
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
    this.dragging = true;
    this.lastX = x;
    this.lastY = y;
  }

  private onMove(e: PointerEvent): void {
    if (!this.dragging) {
      return;
    }
    const [x, y] = this.targetPixel(e);
    const dx = x - this.lastX;
    const dy = y - this.lastY;
    this.lastX = x;
    this.lastY = y;
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
