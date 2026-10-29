import * as v3 from "../math/vec3.ts";
import * as m4 from "../math/mat4.ts";
import { Ellipsoid } from "../math/ellipsoid.ts";
import { eastNorthUpToFixedFrame } from "../math/transforms.ts";
import type { Vec3 } from "../math/vec3.ts";
import type { View } from "./View.ts";

/**
 * Orbits the view's camera around a focus point, for inspecting models and
 * tilesets: drag rotates (heading/pitch), right- or shift-drag pans in the
 * local east-north plane, wheel zooms the range. Only reacts inside the
 * view's rectangle.
 */
export class InspectController {
  readonly target: Vec3 = v3.vec3();
  heading = 0;
  pitch = -0.5;
  range = 100;
  /** Ignore input at these target pixels, e.g. where another view sits on top. */
  ignore?: (x: number, y: number) => boolean;
  private mode: "none" | "rotate" | "pan" = "none";
  private lastX = 0;
  private lastY = 0;
  private readonly abort = new AbortController();
  private readonly ellipsoid = Ellipsoid.WGS84;

  constructor(
    readonly view: View,
    readonly element: HTMLElement,
  ) {
    const signal = this.abort.signal;
    element.addEventListener("pointerdown", (e) => this.onDown(e), { signal });
    element.addEventListener("pointermove", (e) => this.onMove(e), { signal });
    element.addEventListener("pointerup", () => (this.mode = "none"), {
      signal,
    });
    element.addEventListener("pointerleave", () => (this.mode = "none"), {
      signal,
    });
    element.addEventListener("contextmenu", (e) => e.preventDefault(), {
      signal,
    });
    element.addEventListener("wheel", (e) => this.onWheel(e), {
      signal,
      passive: false,
    });
  }

  /** Looks at `target` from heading/pitch (radians) at `range` meters. */
  focus(target: Vec3, heading: number, pitch: number, range: number): void {
    v3.copy(this.target, target);
    this.heading = heading;
    this.pitch = pitch;
    this.range = range;
    this.apply();
  }

  dispose(): void {
    this.abort.abort();
  }

  private apply(): void {
    this.view.camera.lookAt(
      this.target,
      this.heading,
      this.pitch,
      this.range,
      this.ellipsoid,
    );
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
    this.mode = e.button === 2 || e.shiftKey ? "pan" : "rotate";
    this.lastX = x;
    this.lastY = y;
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
        Math.max(this.pitch - (dy / height) * Math.PI, -Math.PI / 2 + 1e-3),
        Math.PI / 2 - 1e-3,
      );
    } else {
      // Pan in the target's local east-north plane, rotated by the heading.
      const enu = eastNorthUpToFixedFrame(
        this.target,
        this.ellipsoid,
        scratchEnu,
      );
      const scale = (this.range * 1.2) / height;
      const c = Math.cos(this.heading);
      const s = Math.sin(this.heading);
      // Screen right/up mapped to east/north for the current heading.
      const east = -dx * c + dy * s;
      const north = dx * s + dy * c;
      for (let i = 0; i < 3; i++) {
        this.target[i] =
          this.target[i]! + (enu[i]! * east + enu[4 + i]! * north) * scale;
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
    this.range = Math.max(this.range * 1.15 ** Math.sign(e.deltaY), 0.01);
    this.apply();
  }
}

const scratchEnu = m4.mat4();
