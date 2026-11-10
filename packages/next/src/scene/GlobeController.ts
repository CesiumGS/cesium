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
 * Touch: one finger grabs like the left button. Two fingers pinch, twist
 * and pan together: the pinch zooms toward the point under their midpoint
 * by the inverse of the spread, the twist turns the heading about that
 * point (level), and the point stays under the midpoint as it moves. Two
 * fingers sliding up or down together tilt the pitch about it instead (the
 * heading stays); see `touchGestures.ts`.
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
 *
 * It works in Earth-fixed coordinates: while the Earth's anchor isn't at
 * the identity in the view's render space (a rig off the Earth), it
 * ignores input and warns once (plan 5a's call 27).
 */
export class GlobeController {
  /** Ignore input at these target pixels, e.g. where another view sits on top. */
  ignore?: (x: number, y: number) => boolean;
  /**
   * Off: no input and no keeping above the ground, while another
   * controller drives the camera (Viewer `setControls("orbit")`).
   */
  enabled = true;
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
   * How quickly wheel zoom follows the wheel, per second: a critically
   * damped spring toward the zoom asked for, so a notch eases in and out
   * and fast notches blend into one motion (an exponential glide started
   * each notch at full speed, which read as jitter). About 0.25 s to
   * settle.
   */
  zoomResponse = 20;
  /**
   * Speed a notch adds at once, as a share of its zoom × `zoomResponse`
   * per second: the zoom starts moving on the notch instead of easing out
   * of rest, without the full kick of a glide.
   */
  zoomKick = 0.4;
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

  /** `sky`: a drag begun off the globe, which moves nothing. */
  private mode: "none" | "grab" | "sky" | "zoom" | "tilt" | "look" | "two" =
    "none";
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
  /** How fast `pendingZoom` is being applied, per second. */
  private zoomRate = 0;
  private readonly zoomTarget = v3.vec3();
  /** Where the zoom target stays on screen (none for the sky). */
  private zoomPixel: [number, number] | undefined;
  /** A pick at `zoomPixel` is in flight (`refreshZoomTarget`). */
  private zoomPickPending = false;
  private lastTime = 0;
  private animating = false;
  private readonly abort = new AbortController();
  private readonly ellipsoid = Ellipsoid.WGS84;
  private readonly guard: EarthFixedGuard;
  private readonly touch: TouchGestures;

  /**
   * `frames`: the engine's frame loop (`Engine.onTick`), for the momentum
   * and the wheel's glide: each step then moves the camera before the
   * engine renders, in the frame it shows, and keeps the loop awake while
   * it runs. Without it they run on their own animation frames (a camera
   * an application renders itself, `renderFrame`).
   */
  constructor(
    readonly view: View,
    readonly element: HTMLElement,
    private readonly frames?: {
      onTick(listener: (now: number) => boolean): () => void;
    },
  ) {
    this.guard = new EarthFixedGuard(view, "GlobeController");
    const signal = this.abort.signal;
    this.touch = new TouchGestures(this.touchListener());
    signal.addEventListener("abort", holdBrowserGestures(element), {
      once: true,
    });
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
    this.zoomRate = 0;
  }

  dispose(): void {
    this.abort.abort();
    this.offTick?.();
    this.offTick = undefined;
    this.animating = false;
  }

  /** Momentum or the wheel's glide is moving the camera. */
  get moving(): boolean {
    return this.animating;
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
    if (e.pointerType === "touch") {
      this.touch.down(e);
      return;
    }
    this.startGesture(x, y);
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
      // Off the globe nothing turns, unless the pick finds something drawn
      // there (terrain seen from below the ellipsoid, content above it).
      this.mode = this.hasAnchor ? "grab" : "sky";
    }
  }

  /** Begins any gesture at (x, y): momentum stops. */
  private startGesture(x: number, y: number): void {
    this.stop();
    this.lastX = x;
    this.lastY = y;
    this.lastTime = performance.now();
  }

  private onMove(e: PointerEvent): void {
    if (e.pointerType === "touch") {
      this.touch.move(e);
      return;
    }
    const [x, y] = this.targetPixel(e);
    if (this.mode === "none") {
      this.trackHover(x, y);
      return;
    }
    this.dragTo(x, y);
  }

  /** A drag's pointer is now at (x, y). */
  private dragTo(x: number, y: number): void {
    if (!this.stillOnEarth()) {
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
        this.grab(x, y, dx / height, dy / height, dt);
        break;
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

  /**
   * False, ending the gesture, when the view re-rooted off the Earth
   * mid-drag.
   */
  private stillOnEarth(): boolean {
    if (earthFixed(this.view)) {
      return true;
    }
    this.mode = "none";
    this.stop();
    return false;
  }

  private onUp(e: PointerEvent): void {
    if (e.pointerType === "touch") {
      try {
        this.element.releasePointerCapture(e.pointerId);
      } catch {
        // Not captured (synthetic pointers, tests).
      }
      this.touch.up(e);
      return;
    }
    if (this.mode === "none") {
      return;
    }
    if (this.element.hasPointerCapture(e.pointerId)) {
      this.element.releasePointerCapture(e.pointerId);
    }
    this.finish();
  }

  /** The last pointer of a gesture is up. */
  private finish(): void {
    if (this.mode === "none") {
      return;
    }
    // Momentum only if the pointer was still moving when released.
    if (performance.now() - this.lastTime > 80) {
      this.stop();
    }
    this.mode = "none";
    this.animate();
  }

  /** What the touch tracker's gestures do (the mouse's, in touch's terms). */
  private touchListener(): TouchGestureListener {
    return {
      oneStart: (cx, cy) => {
        const [x, y] = this.clientPixel(cx, cy);
        this.startGesture(x, y);
        this.anchorAt(x, y);
        this.mode = this.hasAnchor ? "grab" : "sky";
      },
      oneMove: (cx, cy) => {
        if (this.mode !== "none") {
          const [x, y] = this.clientPixel(cx, cy);
          this.dragTo(x, y);
        }
      },
      oneEnd: () => this.finish(),
      // The one-finger turn's momentum must not carry on under two fingers.
      // The point under the fingers' midpoint is what they pinch, twist and
      // tilt about.
      twoStart: (cx, cy) => {
        const [x, y] = this.clientPixel(cx, cy);
        this.startGesture(x, y);
        this.mode = "two";
        this.anchorAt(x, y);
        if (!this.hasAnchor) {
          this.ground(this.anchor);
        }
      },
      twoBegin: (mode) => {
        if (mode === "tilt") {
          this.mode = "tilt";
        }
      },
      twoMove: (m) => {
        if (!this.stillOnEarth()) {
          return;
        }
        if (m.kind === "tilt" && this.mode === "tilt") {
          // The pitch changes by the angle the midpoint's slide covers in
          // the view; the heading stays.
          this.tiltBy(this.pixelAngle(m.dy));
        } else if (m.kind === "combined" && this.mode === "two") {
          const [x, y] = this.clientPixel(m.x, m.y);
          if (m.angle !== 0) {
            this.twist(m.angle);
          }
          // The distance shrinks by the ratio the fingers spread by, and
          // the point under the midpoint follows it, as a grab does (over
          // the sky there is nothing to hold).
          this.zoomToward(
            this.anchor,
            1 - 1 / m.scale,
            this.hasAnchor ? [x, y] : undefined,
          );
        }
      },
      twoEnd: () => {
        this.mode = "none";
        this.stop();
      },
    };
  }

  /** The angle (radians) a vertical move of `dy` CSS pixels covers in the view. */
  private pixelAngle(dy: number): number {
    const [, sy] = this.pixelScale();
    const r = this.view.pixelRect();
    return ((dy * sy) / r.height) * this.view.camera.fovy(r.width / r.height);
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
      // The hovered point stays at the pixel it was picked at: pinning it
      // to the cursor's pixel a few pixels away jumped the view by that
      // much every notch (jitter with a real mouse, which moves a little
      // between notches).
      v3.copy(target, this.hover);
      this.zoomPixel = [this.hoverPixel![0], this.hoverPixel![1]];
    } else if (!this.nearEllipsoidAt(x, y, target)) {
      // No pick here yet: the wheel came with the cursor (or the window
      // got no pointer moves while unfocused). Start on a provisional
      // point on this pixel's ray, at the camera's height above the
      // ground; the pick pulled below replaces it with the drawn surface
      // when it arrives (on the same ray, so without a jump).
      const below = v3.vec3();
      this.ground(below);
      const height = Math.max(v3.distance(this.view.camera.position, below), 1);
      v3.scaleAndAdd(target, this.view.camera.position, this.ray(x, y), height);
    }
    const pixels = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
    // 1.x zooms by a share of the distance; momentum carries it on.
    // Multiplicative, so a notch feels the same at every range; applied
    // over the next frames.
    v3.copy(this.zoomTarget, target);
    const zoom = pixels * this.wheelZoomRate;
    this.pendingZoom += zoom;
    this.zoomRate += zoom * this.zoomKick * this.zoomResponse;
    this.refreshZoomTarget();
    this.trackHover(x, y);
    this.animate();
  }

  // ------------------------------------------------------------- motions

  /**
   * Turns the globe so the anchor stays under (x, y). Off the globe it
   * keeps turning by the cursor's motion (as a drag over the sky does; it
   * stopped dead at the limb), and grabs what is under the cursor again
   * when it comes back on.
   */
  private grab(x: number, y: number, dx: number, dy: number, dt: number): void {
    const camera = this.view.camera;
    const hit = raySphere(
      camera.position,
      this.ray(x, y),
      v3.length(this.anchor),
    );
    if (hit && this.offGlobe) {
      // A pick from the drag's start would now pull the globe back.
      this.anchoring++;
      v3.copy(this.anchor, hit);
      this.offGlobe = false;
      return;
    }
    let turn: { axis: Vec3; angle: number } | undefined;
    if (hit) {
      turn = this.pin(this.anchor, x, y);
    } else {
      this.offGlobe = true;
      // About the Earth's axis for across, the view's right for up and
      // down, as one turn so the glide after release carries on with it.
      const axis = v3.scale(v3.vec3(), v3.vec3(0, 0, 1), -dx);
      v3.scaleAndAdd(axis, axis, camera.right, dy);
      const angle = v3.length(axis) * Math.PI;
      if (angle < 1e-12) {
        return;
      }
      v3.scale(axis, axis, 1 / v3.length(axis));
      this.rotateGlobe(axis, angle);
      turn = { axis, angle };
    }
    if (turn) {
      v3.copy(this.spinAxis, turn.axis);
      this.spinRate = turn.angle / (dt / (1000 / 60));
    }
  }

  /** A grab's cursor left the globe (`grab`). */
  private offGlobe = false;
  /** Each anchor set: a late pick for an older one is dropped. */
  private anchoring = 0;

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
    // Not leveled after: a turn about the center keeps the roll (on a
    // sphere), and leveling turns about the view direction, which moved an
    // off-center point off its pixel (zoom slid sideways, worst in a narrow
    // view such as split view's halves).
    this.view.camera.rotateAroundCenter(axis, angle);
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
    // Level first, then pin: the target ends under the pixel.
    this.level();
    if (pixel) {
      this.pin(target, pixel[0], pixel[1]);
    }
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
    const c = this.ellipsoid.cartesianToCartographic(
      this.view.camera.position,
      { longitude: 0, latitude: 0, height: 0 },
    );
    if (!c) {
      v3.set(out, 0, 0, 0);
      return;
    }
    // The terrain's height there where it's loaded: the zoom is then a
    // share of the camera's height above the ground, not the ellipsoid
    // (which is above the ground where the geoid is negative).
    c.height =
      (this.surfaceHeight && this.surfaceHeight(c.longitude, c.latitude)) ?? 0;
    this.ellipsoid.cartographicToCartesian(c, out);
  }

  /**
   * The ellipsoid under (x, y) when it's a fair wheel target: within 20
   * times the camera's height above the ground. Farther (toward the
   * horizon) a notch moved the camera by a share of hundreds or thousands
   * of kilometers; with the camera below the ellipsoid (terrain below it,
   * where the geoid is negative) the ray met it on the far side of the
   * Earth and one notch out left for orbit.
   */
  private nearEllipsoidAt(x: number, y: number, out: Vec3): Vec3 | undefined {
    if (!this.ellipsoidAt(x, y, out)) {
      return undefined;
    }
    const camera = this.view.camera.position;
    const below = v3.vec3();
    this.ground(below);
    const height = Math.max(v3.distance(camera, below), 1);
    return v3.distance(camera, out) <= 20 * height ? out : undefined;
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
    if (v3.length(right) < STEEP) {
      // Nearly straight down (or up): the cross product of two almost
      // parallel vectors points wherever the small tilt left is. A turn
      // about the Earth's center leaves the camera up to 0.2° off the
      // geodetic normal (the ellipsoid's flattening), in no relation to its
      // heading: leveling with that spun the camera about its view direction
      // every frame of a glide. Keep the heading the camera's right gives,
      // made horizontal and across the view direction.
      v3.scaleAndAdd(right, camera.right, up, -v3.dot(camera.right, up));
      if (v3.length(right) < 1e-6) {
        return;
      }
      v3.scaleAndAdd(
        right,
        right,
        camera.direction,
        -v3.dot(right, camera.direction),
      );
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
    this.pitchBy(dy * Math.PI);
    this.level();
    this.keepAboveGround();
  }

  /** Changes the pitch about the anchor by `angle` radians, the heading kept. */
  private tiltBy(angle: number): void {
    this.pitchBy(angle);
    this.level();
    this.keepAboveGround();
  }

  /**
   * Raises the camera's elevation above the anchor's horizon by `angle`,
   * without going below the horizon or past straight down.
   */
  private pitchBy(angle: number): void {
    const camera = this.view.camera;
    const up = this.ellipsoid.geodeticSurfaceNormal(this.anchor, v3.vec3());
    if (!up) {
      return;
    }
    const toCamera = v3.normalize(
      v3.vec3(),
      v3.sub(v3.vec3(), camera.position, this.anchor),
    );
    const elevation = Math.asin(
      Math.min(Math.max(v3.dot(toCamera, up), -1), 1),
    );
    const next = Math.min(
      Math.max(elevation + angle, 0.01),
      Math.PI / 2 - 0.001,
    );
    rotateAbout(camera, this.anchor, camera.right, -(next - elevation));
  }

  /**
   * Turns the heading about the anchor by a clockwise turn of the fingers
   * (radians): the globe turns with them, so the camera goes the other way
   * about the local up. The camera stays level.
   */
  private twist(angle: number): void {
    const camera = this.view.camera;
    const up = this.ellipsoid.geodeticSurfaceNormal(this.anchor, v3.vec3());
    if (!up) {
      return;
    }
    rotateAbout(camera, this.anchor, up, angle);
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
   * checks every frame too). The lift is temporary: coarse terrain, which
   * loads first and smooths over valleys, rose above a camera framed on a
   * building by the river and lifted it 100 m, the building out of view;
   * when the finer ground below loads, the camera comes back down to where
   * it was put (unless something moved it since).
   */
  update(): void {
    if (
      !this.enabled ||
      this.mode !== "none" ||
      this.animating ||
      !earthFixed(this.view)
    ) {
      return;
    }
    const camera = this.view.camera;
    if (camera.version !== this.liftedVersion) {
      this.intendedHeight = undefined;
    }
    this.keepAboveGround(true);
  }

  /** Where the camera was put before the ground lifted it (meters). */
  private intendedHeight: number | undefined;
  /** The camera's version after the lift (another change: a new intent). */
  private liftedVersion = -1;

  private keepAboveGround(restore = false): void {
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
    const lowest = ground + this.minimumHeight;
    const intended = restore ? this.intendedHeight : undefined;
    const height = Math.max(intended ?? c.height, lowest);
    if (Math.abs(height - c.height) < 1e-3) {
      return;
    }
    if (restore) {
      this.intendedHeight ??= c.height;
    }
    c.height = height;
    this.ellipsoid.cartographicToCartesian(c, camera.position);
    camera.version++;
    if (restore) {
      this.liftedVersion = camera.version;
    }
  }

  /** Momentum after release, decaying per 1/60 s. */
  private animate(): void {
    if (this.animating) {
      return;
    }
    this.animating = true;
    let last = performance.now();
    /** One step; true while there is momentum left. */
    const step = (now: number): boolean => {
      const frames = Math.min((now - last) / (1000 / 60), 4);
      last = now;
      if (!earthFixed(this.view)) {
        // Off the Earth since the gesture: its momentum stops.
        this.stop();
      }
      if (this.mode === "none" && Math.abs(this.spinRate) > 1e-6) {
        this.rotateGlobe(this.spinAxis, this.spinRate * frames);
        this.spinRate *= this.inertiaSpin ** frames;
      }
      if (Math.abs(this.pendingZoom) > 1e-4 || Math.abs(this.zoomRate) > 1e-3) {
        // The critically damped spring's exact step: what's left decays as
        // (y0 + (v0 + ω y0) t) e^(−ωt), with v the rate it's applied at.
        const w = this.zoomResponse;
        const t = frames / 60;
        const y0 = this.pendingZoom;
        const v0 = -this.zoomRate;
        const decay = Math.exp(-w * t);
        const left = (y0 + (v0 + w * y0) * t) * decay;
        this.zoomRate = -(v0 - w * (v0 + w * y0) * t) * decay;
        const portion = y0 - left;
        this.pendingZoom = left;
        this.zoomToward(this.zoomTarget, 1 - Math.exp(portion), this.zoomPixel);
        this.refreshZoomTarget();
      }
      if (
        (this.mode === "none" && Math.abs(this.spinRate) > 1e-6) ||
        Math.abs(this.pendingZoom) > 1e-4 ||
        Math.abs(this.zoomRate) > 1e-3
      ) {
        return true;
      }
      this.spinRate = 0;
      this.pendingZoom = 0;
      this.zoomRate = 0;
      this.animating = false;
      return false;
    };
    if (this.frames !== undefined) {
      // In the engine's frame, before it renders; busy while it moves.
      const off = this.frames.onTick((now) => {
        const more = this.animating && step(now);
        if (!more) {
          off();
          if (this.offTick === off) {
            this.offTick = undefined;
          }
        }
        return more;
      });
      this.offTick = off;
      return;
    }
    const frame = (now: number) => {
      if (this.animating && step(now)) {
        requestAnimationFrame(frame);
      }
    };
    requestAnimationFrame(frame);
  }
  /** Removes the momentum's tick listener (`frames`). */
  private offTick: (() => void) | undefined;

  // ------------------------------------------------------------- picking

  /**
   * Sets the anchor to what is under (x, y): the ellipsoid at once, then
   * the drawn surface when the depth pick arrives.
   */
  private anchorAt(x: number, y: number): void {
    this.hasAnchor = this.ellipsoidAt(x, y, this.anchor) !== undefined;
    this.offGlobe = false;
    const anchoring = ++this.anchoring;
    const r = this.view.pixelRect();
    void this.view.pickPosition(x - r.x, y - r.y).then((p) => {
      if (p && anchoring === this.anchoring && this.mode !== "none") {
        v3.copy(this.anchor, p);
        this.hasAnchor = true;
        if (this.mode === "sky") {
          this.mode = "grab";
        }
      }
    });
  }

  /**
   * While a zoom moves, aims it at what is drawn under its pixel now. The
   * target was picked frames ago, perhaps on a coarse tile or the bare
   * ellipsoid under terrain still loading; once finer tiles show the
   * surface elsewhere along that ray, pinning the old point made the ground
   * slide sideways past it as the camera closed in. The new point lies on
   * the same ray through the pixel as the old one (both under it when the
   * pick's frame was drawn), so switching doesn't jump.
   */
  private refreshZoomTarget(): void {
    const pixel = this.zoomPixel;
    if (!pixel || this.zoomPickPending) {
      return;
    }
    this.zoomPickPending = true;
    const r = this.view.pixelRect();
    void this.view.pickPosition(pixel[0] - r.x, pixel[1] - r.y).then((p) => {
      this.zoomPickPending = false;
      const zooming =
        Math.abs(this.pendingZoom) > 1e-4 || Math.abs(this.zoomRate) > 1e-3;
      if (p && zooming && this.zoomPixel === pixel) {
        // The point is under the center of the pixel the pick read, not
        // under (x, y): pinning it to (x, y) moved the view by the offset,
        // and the next pick read the moved view, so each step slid it again.
        const center = this.pickedPixel(pixel[0], pixel[1]);
        v3.copy(this.zoomTarget, p);
        v3.copy(this.hover, p);
        this.zoomPixel = center;
        this.hoverPixel = [center[0], center[1]];
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
        this.hoverPixel = this.pickedPixel(x, y);
      } else {
        this.hoverPixel = undefined;
      }
    });
  }

  private ellipsoidAt(x: number, y: number, out: Vec3): Vec3 | undefined {
    const position = this.view.camera.position;
    // From inside the ellipsoid (a camera on terrain below it) the ray
    // meets it on the far side of the Earth: no use as a point under (x, y).
    const r = this.ellipsoid.radii;
    const inside =
      (position[0]! / r[0]!) ** 2 +
        (position[1]! / r[1]!) ** 2 +
        (position[2]! / r[2]!) ** 2 <
      1;
    if (inside) {
      return undefined;
    }
    return this.ellipsoid.rayIntersection(position, this.ray(x, y), out);
  }

  /**
   * Center of the pixel a pick at (x, y) reads (`View.pickPosition` takes
   * the pixel the position falls in): where the point it returns is.
   */
  private pickedPixel(x: number, y: number): [number, number] {
    const r = this.view.pixelRect();
    return [r.x + Math.floor(x - r.x) + 0.5, r.y + Math.floor(y - r.y) + 0.5];
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
      this.enabled &&
      this.view.contains(x, y) &&
      !this.ignore?.(x, y) &&
      this.guard.accepts()
    );
  }
}

/** Rotates the camera about an axis through `point`. */
export function rotateAbout(
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

/**
 * How far from straight down `level` trusts the view direction for the
 * horizon (the sine of 3°): steeper, it keeps the camera's own heading.
 */
const STEEP = 0.05;

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
