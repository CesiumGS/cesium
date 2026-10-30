import * as v3 from "../math/vec3.ts";
import { Ellipsoid } from "../math/ellipsoid.ts";
import type { Vec3 } from "../math/vec3.ts";
import type { View } from "./View.ts";

/**
 * Globe camera input in the manner of CesiumJS 1.x's 3D
 * `ScreenSpaceCameraController`, built on what is drawn under the cursor
 * (`View.pickPosition`; the ellipsoid until the pick arrives):
 *
 * - drag: grab the point under the cursor and turn the globe so it stays
 *   there (over the sky: spin about the Earth's axis);
 * - wheel, right-drag: zoom toward the point under the cursor, by a share
 *   of the distance to it;
 * - middle-drag or ctrl-drag: tilt and turn about the point at the screen
 *   center;
 * - shift-drag: look around from where the camera is;
 * - spin and zoom keep their momentum after release (1.x inertia).
 *
 * The camera keeps `minimumHeight` above the ellipsoid (terrain height
 * queries come later in M3).
 */
export class GlobeController {
  /** Ignore input at these target pixels, e.g. where another view sits on top. */
  ignore?: (x: number, y: number) => boolean;
  /** Meters above the ellipsoid the camera stays (1.x minimumZoomDistance: 1). */
  minimumHeight = 1;
  /** Share of the momentum kept per 1/60 s (1.x inertiaSpin, inertiaZoom). */
  inertiaSpin = 0.9;
  inertiaZoom = 0.8;
  /** Focus of the last `focus` call (split views copy it). */
  readonly target: Vec3 = v3.vec3();
  heading = 0;
  pitch = -0.5;
  range = 100;

  private mode: "none" | "grab" | "spin" | "zoom" | "tilt" | "look" = "none";
  private lastX = 0;
  private lastY = 0;
  /** Point held under the cursor while grabbing, or the zoom/tilt pivot. */
  private readonly anchor = v3.vec3();
  private hasAnchor = false;
  /** Latest pick under the hovering cursor, for wheel zoom. */
  private readonly hover = v3.vec3();
  private hoverPixel: [number, number] | undefined;
  private hoverPending = false;
  /** Momentum: rotation about the Earth's center, and zoom per frame. */
  private readonly spinAxis = v3.vec3();
  private spinRate = 0;
  private zoomRate = 0;
  private readonly zoomTarget = v3.vec3();
  private lastTime = 0;
  private animating = false;
  private readonly abort = new AbortController();
  private readonly ellipsoid = Ellipsoid.WGS84;

  constructor(
    readonly view: View,
    readonly element: HTMLElement,
  ) {
    const signal = this.abort.signal;
    element.addEventListener("pointerdown", (e) => this.onDown(e), { signal });
    element.addEventListener("pointermove", (e) => this.onMove(e), { signal });
    element.addEventListener("pointerup", (e) => this.onUp(e), { signal });
    element.addEventListener("pointercancel", (e) => this.onUp(e), {
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
    this.stop();
    this.view.camera.lookAt(target, heading, pitch, range, this.ellipsoid);
  }

  /** Cancels any momentum. */
  stop(): void {
    this.spinRate = 0;
    this.zoomRate = 0;
  }

  dispose(): void {
    this.abort.abort();
  }

  // ------------------------------------------------------------- input

  private onDown(e: PointerEvent): void {
    const [x, y] = this.targetPixel(e);
    if (!this.accepts(x, y)) {
      return;
    }
    try {
      // Keep receiving moves outside the element while dragging.
      this.element.setPointerCapture(e.pointerId);
    } catch {
      // Synthetic pointers (tests) can't be captured.
    }
    this.stop();
    this.lastX = x;
    this.lastY = y;
    this.lastTime = performance.now();
    if (e.button === 1 || (e.button === 0 && e.ctrlKey)) {
      this.mode = "tilt";
      const r = this.view.pixelRect();
      this.anchorAt(r.x + r.width / 2, r.y + r.height / 2);
    } else if (e.button === 0 && e.shiftKey) {
      this.mode = "look";
    } else if (e.button === 2) {
      this.mode = "zoom";
      this.anchorAt(x, y);
    } else {
      this.anchorAt(x, y);
      this.mode = this.hasAnchor ? "grab" : "spin";
    }
  }

  private onMove(e: PointerEvent): void {
    const [x, y] = this.targetPixel(e);
    if (this.mode === "none") {
      this.trackHover(x, y);
      return;
    }
    const dx = x - this.lastX;
    const dy = y - this.lastY;
    const now = performance.now();
    const dt = Math.max(now - this.lastTime, 1);
    this.lastX = x;
    this.lastY = y;
    this.lastTime = now;
    const height = this.view.pixelRect().height;
    switch (this.mode) {
      case "grab":
        this.grab(x, y, dt);
        break;
      case "spin": {
        // Over the sky: turn the globe about its axis and the view's right.
        const angle = (dx / height) * Math.PI;
        this.rotateGlobe(v3.vec3(0, 0, 1), -angle);
        this.rotateGlobe(this.view.camera.right, (dy / height) * Math.PI);
        break;
      }
      case "zoom":
        this.zoomToward(this.anchor, (dy / height) * 4);
        break;
      case "tilt":
        this.tilt(dx / height, dy / height);
        break;
      case "look":
        this.look(dx / height, dy / height);
        break;
    }
  }

  private onUp(e: PointerEvent): void {
    if (this.mode === "none") {
      return;
    }
    if (this.element.hasPointerCapture(e.pointerId)) {
      this.element.releasePointerCapture(e.pointerId);
    }
    // Momentum only if the pointer was still moving when released.
    if (performance.now() - this.lastTime > 80) {
      this.stop();
    }
    this.mode = "none";
    this.animate();
  }

  private onWheel(e: WheelEvent): void {
    const [x, y] = this.targetPixel(e);
    if (!this.accepts(x, y)) {
      return;
    }
    e.preventDefault();
    const target = v3.vec3();
    const near =
      this.hoverPixel &&
      Math.hypot(this.hoverPixel[0] - x, this.hoverPixel[1] - y) < 8;
    if (near) {
      v3.copy(target, this.hover);
    } else if (!this.ellipsoidAt(x, y, target)) {
      // Sky: along the view direction, as far as the globe's center.
      v3.scaleAndAdd(
        target,
        this.view.camera.position,
        this.view.camera.direction,
        v3.length(this.view.camera.position),
      );
    }
    const pixels = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
    // 1.x zooms by a share of the distance; momentum carries it on.
    const amount = Math.max(Math.min(-pixels / 600, 0.5), -1);
    v3.copy(this.zoomTarget, target);
    this.zoomRate = amount * (1 - this.inertiaZoom);
    this.zoomToward(target, amount);
    this.trackHover(x, y);
    this.animate();
  }

  // ------------------------------------------------------------- motions

  /** Turns the globe so the anchor stays under (x, y). */
  private grab(x: number, y: number, dt: number): void {
    const camera = this.view.camera;
    const radius = v3.length(this.anchor);
    const ray = this.ray(x, y);
    const hit = raySphere(camera.position, ray, radius);
    if (!hit) {
      return;
    }
    const axis = v3.cross(v3.vec3(), hit, this.anchor);
    const length = v3.length(axis);
    if (length < 1e-12) {
      return;
    }
    v3.scale(axis, axis, 1 / length);
    const angle = Math.atan2(length, v3.dot(hit, this.anchor));
    // Turning the camera by this angle brings the anchor under the cursor.
    this.rotateGlobe(axis, angle);
    v3.copy(this.spinAxis, axis);
    this.spinRate = angle / (dt / (1000 / 60));
  }

  /** Moves the camera toward `target` by `amount` of the distance. */
  private zoomToward(target: Vec3, amount: number): void {
    const camera = this.view.camera;
    const offset = v3.sub(v3.vec3(), target, camera.position);
    const distance = v3.length(offset);
    if (distance < 1e-6) {
      return;
    }
    // Never past the target (keep at least a meter).
    const step = Math.min(amount, 1 - 1 / distance) * distance;
    v3.scaleAndAdd(camera.position, camera.position, offset, step / distance);
    this.keepAboveGround();
    camera.version++;
  }

  /** Orbits the camera about the pivot: heading about its up, pitch about right. */
  private tilt(dx: number, dy: number): void {
    const camera = this.view.camera;
    const up = this.ellipsoid.geodeticSurfaceNormal(this.anchor, v3.vec3());
    if (!up) {
      return;
    }
    rotateAbout(camera, this.anchor, up, -dx * Math.PI);
    // Pitch, without going below the pivot's horizon or past straight down.
    const toCamera = v3.normalize(
      v3.vec3(),
      v3.sub(v3.vec3(), camera.position, this.anchor),
    );
    const elevation = Math.asin(
      Math.min(Math.max(v3.dot(toCamera, up), -1), 1),
    );
    const next = Math.min(
      Math.max(elevation + dy * Math.PI, 0.01),
      Math.PI / 2 - 0.001,
    );
    rotateAbout(camera, this.anchor, camera.right, -(next - elevation));
    this.keepAboveGround();
  }

  /** Turns the view direction about the local up and the camera's right. */
  private look(dx: number, dy: number): void {
    const camera = this.view.camera;
    const up = this.ellipsoid.geodeticSurfaceNormal(camera.position, v3.vec3());
    if (!up) {
      return;
    }
    rotateAbout(camera, camera.position, up, -dx * Math.PI * 0.5);
    rotateAbout(camera, camera.position, camera.right, -dy * Math.PI * 0.5);
  }

  /** Rotates the camera about the Earth's center (the globe turns opposite). */
  private rotateGlobe(axis: Vec3, angle: number): void {
    this.view.camera.rotateAroundCenter(v3.normalize(v3.vec3(), axis), angle);
  }

  private keepAboveGround(): void {
    const camera = this.view.camera;
    const c = this.ellipsoid.cartesianToCartographic(camera.position, {
      longitude: 0,
      latitude: 0,
      height: 0,
    });
    if (c && c.height < this.minimumHeight) {
      c.height = this.minimumHeight;
      this.ellipsoid.cartographicToCartesian(c, camera.position);
      camera.version++;
    }
  }

  /** Momentum after release, decaying per 1/60 s. */
  private animate(): void {
    if (this.animating) {
      return;
    }
    this.animating = true;
    let last = performance.now();
    const step = (now: number) => {
      const frames = Math.min((now - last) / (1000 / 60), 4);
      last = now;
      if (this.mode === "none" && Math.abs(this.spinRate) > 1e-6) {
        this.rotateGlobe(this.spinAxis, this.spinRate * frames);
        this.spinRate *= this.inertiaSpin ** frames;
      }
      if (Math.abs(this.zoomRate) > 1e-4) {
        this.zoomToward(this.zoomTarget, this.zoomRate * frames);
        this.zoomRate *= this.inertiaZoom ** frames;
      }
      if (
        (this.mode === "none" && Math.abs(this.spinRate) > 1e-6) ||
        Math.abs(this.zoomRate) > 1e-4
      ) {
        requestAnimationFrame(step);
      } else {
        this.spinRate = 0;
        this.zoomRate = 0;
        this.animating = false;
      }
    };
    requestAnimationFrame(step);
  }

  // ------------------------------------------------------------- picking

  /**
   * Sets the anchor to what is under (x, y): the ellipsoid at once, then
   * the drawn surface when the depth pick arrives.
   */
  private anchorAt(x: number, y: number): void {
    this.hasAnchor = this.ellipsoidAt(x, y, this.anchor) !== undefined;
    const r = this.view.pixelRect();
    void this.view.pickPosition(x - r.x, y - r.y).then((p) => {
      if (p && this.mode !== "none" && this.mode !== "spin") {
        v3.copy(this.anchor, p);
        this.hasAnchor = true;
      }
    });
  }

  /** Keeps a pick under the hovering cursor (for the wheel), one at a time. */
  private trackHover(x: number, y: number): void {
    if (this.hoverPending || !this.view.contains(x, y)) {
      return;
    }
    this.hoverPending = true;
    const r = this.view.pixelRect();
    void this.view.pickPosition(x - r.x, y - r.y).then((p) => {
      this.hoverPending = false;
      if (p) {
        v3.copy(this.hover, p);
        this.hoverPixel = [x, y];
      } else {
        this.hoverPixel = undefined;
      }
    });
  }

  private ellipsoidAt(x: number, y: number, out: Vec3): Vec3 | undefined {
    return this.ellipsoid.rayIntersection(
      this.view.camera.position,
      this.ray(x, y),
      out,
    );
  }

  /** World ray through a target pixel. */
  private ray(x: number, y: number): Vec3 {
    const r = this.view.pixelRect();
    const ndcX = ((x - r.x) / r.width) * 2 - 1;
    const ndcY = 1 - ((y - r.y) / r.height) * 2;
    return this.view.camera.rayDirection(
      ndcX,
      ndcY,
      r.width / r.height,
      v3.vec3(),
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
}

/** Rotates the camera about an axis through `point`. */
function rotateAbout(
  camera: View["camera"],
  point: Vec3,
  axis: Vec3,
  angle: number,
): void {
  const k = v3.normalize(v3.vec3(), axis);
  const offset = v3.sub(v3.vec3(), camera.position, point);
  for (const v of [offset, camera.direction, camera.up, camera.right]) {
    rodrigues(v, k, angle);
  }
  v3.add(camera.position, point, offset);
  camera.version++;
}

function rodrigues(v: Vec3, k: Vec3, angle: number): void {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const kv = v3.cross(v3.vec3(), k, v);
  const kdv = v3.dot(k, v);
  for (let i = 0; i < 3; i++) {
    v[i] = v[i]! * c + kv[i]! * s + k[i]! * kdv * (1 - c);
  }
}

/** Nearest intersection of a ray with a sphere about the Earth's center. */
function raySphere(
  origin: Vec3,
  direction: Vec3,
  radius: number,
): Vec3 | undefined {
  const b = v3.dot(origin, direction);
  const c = v3.dot(origin, origin) - radius * radius;
  const disc = b * b - c;
  if (disc < 0) {
    return undefined;
  }
  const sq = Math.sqrt(disc);
  const t = -b - sq > 0 ? -b - sq : -b + sq;
  if (!(t > 0)) {
    return undefined;
  }
  return v3.scaleAndAdd(v3.vec3(), origin, direction, t);
}
