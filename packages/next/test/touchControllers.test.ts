// The touch gestures through each controller with synthetic pointer events:
// pinch, twist, pan and tilt, 1:1 (plan 5d's ruling 26). Node, no GPU.
import { afterEach, describe, expect, it, vi } from "vitest";
import { Ellipsoid } from "../src/math/ellipsoid.ts";
import * as m4 from "../src/math/mat4.ts";
import * as v3 from "../src/math/vec3.ts";
import { Camera } from "../src/scene/Camera.ts";
import { GlobeController } from "../src/scene/GlobeController.ts";
import { InspectController } from "../src/scene/InspectController.ts";
import { OrbitController } from "../src/scene/OrbitController.ts";
import { OffscreenTarget } from "../src/scene/renderTarget.ts";
import type { Engine } from "../src/scene/Engine.ts";
import type { View } from "../src/scene/View.ts";
import { fakeEngine } from "./fakeGpu.ts";

const SIZE = 100;
const WGS84 = Ellipsoid.WGS84;
/** The engine's tick loop, standing still. */
const frames = { onTick: () => () => {} };

function pointerEvent(type: string, id: number, x: number, y: number) {
  return Object.assign(new Event(type, { cancelable: true }), {
    pointerId: id,
    pointerType: "touch",
    clientX: x,
    clientY: y,
    button: 0,
    shiftKey: false,
    ctrlKey: false,
  });
}

/** A stand-in element, firing touch pointer events. */
function box() {
  const element = new EventTarget() as EventTarget & Record<string, unknown>;
  element.getBoundingClientRect = () => ({
    left: 0,
    top: 0,
    width: SIZE,
    height: SIZE,
  });
  element.setPointerCapture = () => {};
  element.releasePointerCapture = () => {};
  element.hasPointerCapture = () => false;
  const fire = (type: string, id: number, x: number, y: number) =>
    element.dispatchEvent(pointerEvent(type, id, x, y));
  /**
   * Two fingers go down at `a0` and `b0`, then move in `steps` equal steps
   * to `a1` and `b1`; the fingers stay down.
   */
  const two = (
    a0: [number, number],
    b0: [number, number],
    a1: [number, number],
    b1: [number, number],
    steps = 10,
  ) => {
    fire("pointerdown", 1, ...a0);
    fire("pointerdown", 2, ...b0);
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const at = (
        p: [number, number],
        q: [number, number],
      ): [number, number] => [
        p[0] + (q[0] - p[0]) * t,
        p[1] + (q[1] - p[1]) * t,
      ];
      fire("pointermove", 1, ...at(a0, a1));
      fire("pointermove", 2, ...at(b0, b1));
    }
  };
  const lift = () => {
    fire("pointerup", 1, 0, 0);
    fire("pointerup", 2, 0, 0);
  };
  return { element: element as unknown as HTMLElement, fire, two, lift };
}

const flatView = (camera: Camera) =>
  ({
    camera,
    world: { findBodyAnchor: () => undefined },
    anchorPlacement: () => m4.mat4(),
    target: { width: SIZE, height: SIZE },
    contains: () => true,
    pixelRect: () => ({ x: 0, y: 0, width: SIZE, height: SIZE }),
  }) as unknown as View;

const heightOf = (p: v3.Vec3) =>
  WGS84.cartesianToCartographic(p, { longitude: 0, latitude: 0, height: 0 })!
    .height;

/** The ray through a pixel of a square view. */
const rayAt = (camera: Camera, x: number, y: number) =>
  camera.rayDirection((x / SIZE) * 2 - 1, 1 - (y / SIZE) * 2, 1, v3.vec3());

/** The ground under a pixel. */
const groundAt = (camera: Camera, x: number, y: number) =>
  WGS84.rayIntersection(camera.position, rayAt(camera, x, y), v3.vec3())!;

/** The screen pixel a world point is at. */
function pixelOf(camera: Camera, p: v3.Vec3): [number, number] {
  const rel = v3.sub(v3.vec3(), p, camera.position);
  const depth = v3.dot(rel, camera.direction);
  const t = Math.tan(camera.fovy(1) / 2);
  const x = v3.dot(rel, camera.right) / (depth * t);
  const y = v3.dot(rel, camera.up) / (depth * t);
  return [((x + 1) / 2) * SIZE, ((1 - y) / 2) * SIZE];
}

describe("GlobeController touch", () => {
  let engine: Engine | undefined;
  afterEach(() => vi.restoreAllMocks());

  async function setup() {
    engine = await fakeEngine();
    const world = engine.createWorld();
    const view = engine.addView({
      target: new OffscreenTarget(SIZE, SIZE),
      world,
    });
    view.camera.lookAt(Float64Array.of(6_378_137, 0, 0), 0.4, -0.5, 3_000);
    const camera = view.camera;
    // The engine's pick: the ground under the pixel, one tick later.
    vi.spyOn(view, "pickPosition").mockImplementation((x, y) =>
      Promise.resolve(
        WGS84.rayIntersection(
          camera.position,
          rayAt(camera, Math.floor(x) + 0.5, Math.floor(y) + 0.5),
          v3.vec3(),
        ) ?? undefined,
      ),
    );
    const b = box();
    const controller = new GlobeController(view, b.element, frames);
    return {
      ...b,
      controller,
      camera,
      done: () => {
        controller.dispose();
        engine!.removeWorld(world);
      },
    };
  }

  it("pinch-out brings the camera closer to the point under the midpoint", async () => {
    const t = await setup();
    const point = groundAt(t.camera, 50, 50);
    const before = v3.distance(t.camera.position, point);
    t.two([40, 50], [60, 50], [30, 50], [70, 50]); // twice as far apart
    expect(v3.distance(t.camera.position, point)).toBeLessThan(before * 0.55);
    t.done();
  });

  it("pinch-out with one finger fixed (a thumb held still) zooms too", async () => {
    const t = await setup();
    const before = heightOf(t.camera.position);
    t.two([40, 50], [60, 50], [40, 50], [80, 50]);
    expect(heightOf(t.camera.position)).toBeLessThan(before * 0.6);
    t.done();
  });

  it("scales the distance by exactly the inverse of the spread", async () => {
    const t = await setup();
    const point = groundAt(t.camera, 50, 50);
    const before = v3.distance(t.camera.position, point);
    t.two([40, 50], [60, 50], [30, 50], [70, 50]); // 20 apart to 40: twice
    expect(v3.distance(t.camera.position, point) / (before / 2)).toBeCloseTo(
      1,
      2,
    );
    t.done();
  });

  it("keeps the point under the midpoint while the fingers spread and move", async () => {
    const t = await setup();
    const point = groundAt(t.camera, 50, 50);
    // Fingers 20 apart spread to 40, the midpoint moving from (50,50) to (46,52).
    t.two([40, 50], [60, 50], [26, 52], [66, 52]);
    const [px, py] = pixelOf(t.camera, point);
    expect(px).toBeCloseTo(46, 0);
    expect(py).toBeCloseTo(52, 0);
    t.done();
  });

  it("a pan alone keeps the grabbed point under the midpoint, like one finger", async () => {
    const t = await setup();
    const point = groundAt(t.camera, 50, 50);
    const radius = v3.length(t.camera.position);
    t.two([40, 50], [60, 50], [50, 40], [70, 40]);
    // The globe turned under the camera: it stayed as high above it.
    expect(v3.length(t.camera.position)).toBeCloseTo(radius, 1);
    const [px, py] = pixelOf(t.camera, point);
    expect(px).toBeCloseTo(60, 0);
    expect(py).toBeCloseTo(40, 0);
    t.done();
  });

  it("a twist turns the heading by the angle about the point under the midpoint, level", async () => {
    const t = await setup();
    const point = groundAt(t.camera, 50, 50);
    const before = v3.copy(v3.vec3(), t.camera.right);
    // The line between the fingers turns 20 degrees clockwise about (50,50).
    const a = (20 * Math.PI) / 180;
    const r = 30;
    t.two(
      [50 - r, 50],
      [50 + r, 50],
      [50 - r * Math.cos(a), 50 - r * Math.sin(a)],
      [50 + r * Math.cos(a), 50 + r * Math.sin(a)],
      20,
    );
    const turned = Math.acos(Math.min(1, v3.dot(t.camera.right, before)));
    // Heading turns about the local up; the camera right moves by about the angle.
    expect(turned).toBeGreaterThan(a * 0.9);
    expect(turned).toBeLessThan(a * 1.1);
    const up = WGS84.geodeticSurfaceNormal(t.camera.position, v3.vec3())!;
    expect(Math.abs(v3.dot(t.camera.right, up))).toBeLessThan(1e-6);
    const [px, py] = pixelOf(t.camera, point);
    expect(px).toBeCloseTo(50, 0);
    expect(py).toBeCloseTo(50, 0);
    t.done();
  });

  it("a vertical two-finger slide tilts the pitch about the midpoint and leaves the heading", async () => {
    const t = await setup();
    const point = groundAt(t.camera, 50, 50);
    const up = WGS84.geodeticSurfaceNormal(point, v3.vec3())!;
    const elevation = () =>
      Math.asin(
        v3.dot(
          v3.normalize(v3.vec3(), v3.sub(v3.vec3(), t.camera.position, point)),
          up,
        ),
      );
    const rightBefore = v3.copy(v3.vec3(), t.camera.right);
    const before = elevation();
    const distance = v3.distance(t.camera.position, point);
    t.two([40, 50], [60, 50], [40, 30], [60, 30]); // both up
    // Sliding up lowers the camera toward the horizon.
    expect(elevation()).toBeLessThan(before - 0.05);
    expect(v3.distance(t.camera.position, point)).toBeCloseTo(distance, 0);
    expect(v3.dot(t.camera.right, rightBefore)).toBeGreaterThan(0.9999);
    t.done();
  });
});

/** The distance from a camera along its view direction to the ground. */
const groundAhead = (camera: Camera) =>
  v3.distance(
    camera.position,
    WGS84.rayIntersection(camera.position, camera.direction, v3.vec3())!,
  );

/** The angle between two heading-turned vectors, about `axis` (radians). */
const turnAbout = (from: v3.Vec3, to: v3.Vec3) =>
  Math.acos(Math.min(1, Math.max(-1, v3.dot(from, to))));

/** Two fingers 60 apart turned clockwise by `angle` about (50,50). */
function twistFingers(angle: number): [number[], number[], number[], number[]] {
  const r = 30;
  return [
    [50 - r, 50],
    [50 + r, 50],
    [50 - r * Math.cos(angle), 50 - r * Math.sin(angle)],
    [50 + r * Math.cos(angle), 50 + r * Math.sin(angle)],
  ];
}

describe("OrbitController touch", () => {
  function setup() {
    const camera = new Camera();
    camera.lookAt(Float64Array.of(6_378_137, 0, 0), 0.3, -1, 10_000);
    const b = box();
    const controller = new OrbitController(flatView(camera), b.element);
    return { ...b, camera, controller };
  }

  it("pinch-out scales the distance to the ground ahead by the inverse of the spread", () => {
    const t = setup();
    const before = groundAhead(t.camera);
    t.two([40, 50], [60, 50], [30, 50], [70, 50]);
    expect(groundAhead(t.camera) / (before / 2)).toBeCloseTo(1, 4);
    t.controller.dispose();
  });

  it("pinch-out with one finger still zooms", () => {
    const t = setup();
    const before = groundAhead(t.camera);
    t.two([40, 50], [60, 50], [40, 50], [80, 50]);
    expect(groundAhead(t.camera)).toBeLessThan(before * 0.55);
    t.controller.dispose();
  });

  it("a twist turns the heading by the angle and does not spin the globe", () => {
    const t = setup();
    const right = v3.copy(v3.vec3(), t.camera.right);
    const position = v3.copy(v3.vec3(), t.camera.position);
    const a = (20 * Math.PI) / 180;
    const [a0, b0, a1, b1] = twistFingers(a);
    t.two(
      a0 as [number, number],
      b0 as [number, number],
      a1 as [number, number],
      b1 as [number, number],
      20,
    );
    expect(turnAbout(right, t.camera.right)).toBeCloseTo(a, 2);
    // (The fingers move one at a time, so the midpoint jitters a little.)
    expect(v3.distance(position, t.camera.position)).toBeLessThan(100);
    t.controller.dispose();
  });

  it("a pan keeps the ground under the midpoint, in meters per pixel", () => {
    const t = setup();
    const point = groundAt(t.camera, 50, 50);
    const height = heightOf(t.camera.position);
    t.two([40, 50], [60, 50], [50, 40], [70, 40]);
    const [px, py] = pixelOf(t.camera, point);
    expect(Math.hypot(px - 60, py - 40)).toBeLessThan(3);
    expect(heightOf(t.camera.position)).toBeCloseTo(height, 0);
    t.controller.dispose();
  });

  it("a vertical two-finger slide changes the pitch and leaves the heading", () => {
    const t = setup();
    const pivot = groundAt(t.camera, 50, 50);
    const up = WGS84.geodeticSurfaceNormal(pivot, v3.vec3())!;
    const elevation = () =>
      Math.asin(
        v3.dot(
          v3.normalize(v3.vec3(), v3.sub(v3.vec3(), t.camera.position, pivot)),
          up,
        ),
      );
    const before = elevation();
    const right = v3.copy(v3.vec3(), t.camera.right);
    const distance = v3.distance(t.camera.position, pivot);
    t.two([40, 50], [60, 50], [40, 30], [60, 30]);
    // Up by 20 of 100 px at a 60 degree view: 12 degrees toward the horizon.
    expect(elevation()).toBeCloseTo(before - 0.2 * (Math.PI / 3), 3);
    expect(v3.distance(t.camera.position, pivot)).toBeCloseTo(distance, 0);
    expect(v3.dot(t.camera.right, right)).toBeGreaterThan(0.9999);
    t.controller.dispose();
  });
});

describe("InspectController touch", () => {
  function setup() {
    const camera = new Camera();
    const b = box();
    const controller = new InspectController(flatView(camera), b.element);
    controller.focus(Float64Array.of(6_378_137, 0, 0), 0.3, -0.5, 100);
    return { ...b, camera, controller };
  }

  it("pinch-out divides the range by the spread", () => {
    const t = setup();
    t.two([40, 50], [60, 50], [30, 50], [70, 50]);
    expect(t.controller.range).toBeCloseTo(50, 6);
    expect(v3.distance(t.camera.position, t.controller.target)).toBeCloseTo(
      50,
      6,
    );
    t.controller.dispose();
  });

  it("pinch-out with one finger still zooms", () => {
    const t = setup();
    t.two([40, 50], [60, 50], [40, 50], [80, 50]);
    expect(t.controller.range).toBeLessThan(55);
    t.controller.dispose();
  });

  it("keeps the range within its limits", () => {
    const t = setup();
    t.controller.minRange = 80;
    t.two([40, 50], [60, 50], [10, 50], [90, 50]);
    expect(t.controller.range).toBe(80);
    t.controller.dispose();
  });

  it("a twist turns the heading by the angle, clockwise fingers turning the scene clockwise", () => {
    const t = setup();
    const a = (20 * Math.PI) / 180;
    const [a0, b0, a1, b1] = twistFingers(a);
    t.two(
      a0 as [number, number],
      b0 as [number, number],
      a1 as [number, number],
      b1 as [number, number],
      20,
    );
    expect(t.controller.heading).toBeCloseTo(0.3 - a, 6);
    expect(t.controller.range).toBeCloseTo(100, 4);
    t.controller.dispose();
  });

  it("a pan moves the target so the old target follows the midpoint across the screen", () => {
    const t = setup();
    const target = v3.copy(v3.vec3(), t.controller.target);
    t.two([40, 50], [60, 50], [50, 42], [70, 42]);
    const [px, py] = pixelOf(t.camera, target);
    // Across: one pixel of the view at the target is `range` x 2 tan(fov/2) / 100 meters.
    expect(Math.abs(px - 60)).toBeLessThan(1);
    expect(py).toBeLessThan(50);
    expect(t.controller.range).toBeCloseTo(100, 4);
    t.controller.dispose();
  });

  it("a vertical two-finger slide changes the pitch only", () => {
    const t = setup();
    const target = v3.copy(v3.vec3(), t.controller.target);
    t.two([40, 50], [60, 50], [40, 30], [60, 30]);
    // Sliding up by 20 of 100 px at a 60 degree view raises the pitch toward the horizon.
    expect(t.controller.pitch).toBeCloseTo(-0.5 + 0.2 * (Math.PI / 3), 6);
    expect(t.controller.heading).toBeCloseTo(0.3, 9);
    expect(t.controller.range).toBeCloseTo(100, 9);
    expect(v3.distance(target, t.controller.target)).toBeLessThan(1e-6);
    t.controller.dispose();
  });
});
