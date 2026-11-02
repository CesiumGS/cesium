import * as v3 from "../math/vec3.ts";
import * as m4 from "../math/mat4.ts";
import { Ellipsoid } from "../math/ellipsoid.ts";
import { eastNorthUpToFixedFrame } from "../math/transforms.ts";
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
 * - spin keeps its momentum after release (1.x inertia); wheel zoom glides.
 *
 * The camera never rolls (1.x constrains it to the Earth's axis): every
 * motion levels it about its view direction. A zoom keeps the heading and
 * pitch it had relative to the ground below it (1.x restores them after
 * each zoom step) and turns the globe so the point zoomed toward stays
 * under the cursor. Moving straight at the point kept the orientation
 * fixed in Earth coordinates, so across the globe's curve a level camera
 * came down rolled 10 degrees and pitched 30 (r38).
 *
 * The camera keeps `minimumHeight` above the ellipsoid (terrain height
 * queries come later in M3).
 */
export class GlobeController {
  /** Ignore input at these target pixels, e.g. where another view sits on top. */
  ignore?: (x: number, y: number) => boolean;
  /**
   * Meters the camera stays above the surface (1.x minimumZoomDistance: 1):
   * the terrain from `surfaceHeight`, else the ellipsoid.
   */
  minimumHeight = 1;
  /**
   * Meters above the ellipsoid the camera can zoom out to (1.x: no limit).
   * Unbounded, a few dozen wheel notches went 50 million km out, where the
   * globe is under a pixel and nothing is left to grab or zoom toward.
   */
  maximumHeight = 1e8;
  /**
   * Height of the ground (meters above the ellipsoid) at a longitude and
   * latitude in radians, e.g. `terrain.sampleHeight`; undefined where it
   * isn't known yet. Without it the ellipsoid is the ground.
   */
  surfaceHeight?: (longitude: number, latitude: number) => number | undefined;
  /** Share of the spin momentum kept per 1/60 s (1.x inertiaSpin). */
  inertiaSpin = 0.9;
  /**
   * Share of a wheel zoom still to apply after each 1/60 s: wheel steps
   * glide instead of jumping (about 150 ms per notch).
   */
  zoomSmoothing = 0.75;
  /** Distance factor per wheel pixel, as a logarithm (100 px: ×1.16). */
  wheelZoomRate = 0.0015;
  /** Focus of the last `focus` call (split views copy it). */
  readonly target: Vec3 = v3.vec3();
  heading = 0;
  pitch = -0.5;
  range = 100;
  /**
   * Camera gestures so far (pointer presses and wheel turns on the view):
   * code that moves the camera later (framing content once it has loaded)
   * can tell whether someone took over meanwhile.
   */
  inputs = 0;

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
  /** Wheel zoom not yet applied: the log of the distance factor. */
  private pendingZoom = 0;
  private readonly zoomTarget = v3.vec3();
  /** Where the zoom target stays on screen (none for the sky). */
  private zoomPixel: [number, number] | undefined;
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
    // Level where the camera is, not at the target (the target stays at
    // the screen's center).
    this.level();
  }

  /** Cancels any momentum. */
  stop(): void {
    this.spinRate = 0;
    this.pendingZoom = 0;
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
    this.inputs++;
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
      this.zoomPixel = [x, y];
      this.anchorAt(x, y);
      if (!this.hasAnchor) {
        this.zoomPixel = undefined;
        this.ground(this.anchor);
      }
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
        this.zoomToward(this.anchor, (dy / height) * 4, this.zoomPixel);
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
    this.inputs++;
    e.preventDefault();
    const target = v3.vec3();
    const near =
      this.hoverPixel &&
      Math.hypot(this.hoverPixel[0] - x, this.hoverPixel[1] - y) < 8;
    this.zoomPixel = [x, y];
    if (near) {
      v3.copy(target, this.hover);
    } else if (!this.ellipsoidAt(x, y, target)) {
      this.zoomPixel = undefined;
      this.ground(target);
    }
    const pixels = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
    // 1.x zooms by a share of the distance; momentum carries it on.
    // Multiplicative, so a notch feels the same at every range; applied
    // over the next frames.
    v3.copy(this.zoomTarget, target);
    this.pendingZoom += pixels * this.wheelZoomRate;
    this.trackHover(x, y);
    this.animate();
  }

  // ------------------------------------------------------------- motions

  /** Turns the globe so the anchor stays under (x, y). */
  private grab(x: number, y: number, dt: number): void {
    const turn = this.pin(this.anchor, x, y);
    if (turn) {
      v3.copy(this.spinAxis, turn.axis);
      this.spinRate = turn.angle / (dt / (1000 / 60));
    }
  }

  /**
   * Turns the globe about its center so `point` lies under (x, y): where
   * the pixel's ray meets the sphere through the point. Returns the turn,
   * or undefined where the ray misses that sphere.
   */
  private pin(
    point: Vec3,
    x: number,
    y: number,
  ): { axis: Vec3; angle: number } | undefined {
    const hit = raySphere(
      this.view.camera.position,
      this.ray(x, y),
      v3.length(point),
    );
    if (!hit) {
      return undefined;
    }
    const axis = v3.cross(v3.vec3(), hit, point);
    const length = v3.length(axis);
    if (length < 1e-12) {
      return undefined;
    }
    v3.scale(axis, axis, 1 / length);
    const angle = Math.atan2(length, v3.dot(hit, point));
    // Turning the camera by this angle brings the point under the pixel.
    this.rotateGlobe(axis, angle);
    return { axis, angle };
  }

  /**
   * Moves the camera toward `target` by `amount` of the distance, keeping
   * its heading and pitch relative to the ground below it and the target
   * under `pixel`.
   */
  private zoomToward(
    target: Vec3,
    amount: number,
    pixel?: [number, number],
  ): void {
    const camera = this.view.camera;
    const offset = v3.sub(v3.vec3(), target, camera.position);
    const distance = v3.length(offset);
    if (distance < 1e-6) {
      return;
    }
    const from = v3.copy(v3.vec3(), camera.position);
    // Never past the target (keep at least a meter).
    const step = Math.min(amount, 1 - 1 / distance) * distance;
    v3.scaleAndAdd(camera.position, camera.position, offset, step / distance);
    const c = this.ellipsoid.cartesianToCartographic(camera.position, {
      longitude: 0,
      latitude: 0,
      height: 0,
    });
    if (c && c.height > this.maximumHeight) {
      c.height = this.maximumHeight;
      this.ellipsoid.cartographicToCartesian(c, camera.position);
    }
    this.carryOrientation(from);
    if (pixel) {
      this.pin(target, pixel[0], pixel[1]);
    }
    this.level();
    this.keepAboveGround();
    camera.version++;
  }

  /**
   * The ellipsoid below the camera: what a zoom heads for over the sky
   * (1.x zooms by a share of the height). A point along the view direction
   * was empty space once the globe was off screen, so zooming in from far
   * out never came back.
   */
  private ground(out: Vec3): void {
    if (
      !this.ellipsoid.scaleToGeodeticSurface(this.view.camera.position, out)
    ) {
      v3.set(out, 0, 0, 0);
    }
  }

  /**
   * Gives the camera, now at its position, the orientation it had in the
   * east-north-up frame at `from` (1.x keeps heading, pitch and roll
   * through a zoom).
   */
  private carryOrientation(from: Vec3): void {
    const camera = this.view.camera;
    const a = eastNorthUpToFixedFrame(from, this.ellipsoid, m4.mat4());
    const b = eastNorthUpToFixedFrame(
      camera.position,
      this.ellipsoid,
      m4.mat4(),
    );
    for (const v of [camera.direction, camera.up, camera.right]) {
      const e = v[0]! * a[0]! + v[1]! * a[1]! + v[2]! * a[2]!;
      const n = v[0]! * a[4]! + v[1]! * a[5]! + v[2]! * a[6]!;
      const u = v[0]! * a[8]! + v[1]! * a[9]! + v[2]! * a[10]!;
      for (let i = 0; i < 3; i++) {
        v[i] = b[i]! * e + b[4 + i]! * n + b[8 + i]! * u;
      }
    }
  }

  /**
   * Removes roll: turns the camera about its view direction until its
   * right is level with the ground below it.
   */
  private level(): void {
    const camera = this.view.camera;
    const up = this.ellipsoid.geodeticSurfaceNormal(camera.position, v3.vec3());
    if (!up) {
      return;
    }
    const right = v3.cross(v3.vec3(), camera.direction, up);
    if (v3.length(right) < 1e-6) {
      // Straight down: keep the heading the camera's right gives.
      v3.scaleAndAdd(right, camera.right, up, -v3.dot(camera.right, up));
      if (v3.length(right) < 1e-6) {
        return;
      }
    }
    v3.normalize(camera.right, right);
    v3.normalize(
      camera.up,
      v3.cross(camera.up, camera.right, camera.direction),
    );
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
    this.level();
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
    this.level();
  }

  /** Rotates the camera about the Earth's center (the globe turns opposite). */
  private rotateGlobe(axis: Vec3, angle: number): void {
    this.view.camera.rotateAroundCenter(v3.normalize(v3.vec3(), axis), angle);
    this.level();
  }

  /**
   * Keeps the camera `minimumHeight` above the ground. Call once per frame:
   * finer terrain loading under a still camera can rise above it (1.x
   * checks every frame too).
   */
  update(): void {
    if (this.mode === "none" && !this.animating) {
      this.keepAboveGround();
    }
  }

  private keepAboveGround(): void {
    const camera = this.view.camera;
    const c = this.ellipsoid.cartesianToCartographic(camera.position, {
      longitude: 0,
      latitude: 0,
      height: 0,
    });
    if (!c) {
      return;
    }
    const ground = this.surfaceHeight
      ? this.surfaceHeight(c.longitude, c.latitude)
      : 0;
    if (ground === undefined) {
      return; // not loaded there yet
    }
    if (c.height < ground + this.minimumHeight) {
      c.height = ground + this.minimumHeight;
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
      if (Math.abs(this.pendingZoom) > 1e-4) {
        const portion = this.pendingZoom * (1 - this.zoomSmoothing ** frames);
        this.pendingZoom -= portion;
        this.zoomToward(this.zoomTarget, 1 - Math.exp(portion), this.zoomPixel);
      }
      if (
        (this.mode === "none" && Math.abs(this.spinRate) > 1e-6) ||
        Math.abs(this.pendingZoom) > 1e-4
      ) {
        requestAnimationFrame(step);
      } else {
        this.spinRate = 0;
        this.pendingZoom = 0;
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
