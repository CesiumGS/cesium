import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { positionHit } from "./positionHit.ts";
import { Ellipsoid } from "../packages/next/src/math/ellipsoid.ts";
import * as v3 from "../packages/next/src/math/vec3.ts";
import type { Engine } from "../packages/next/src/scene/Engine.ts";
import { GlobeController } from "../packages/next/src/scene/GlobeController.ts";
import { OffscreenTarget } from "../packages/next/src/scene/renderTarget.ts";
import type { View } from "../packages/next/src/scene/View.ts";
import type { World } from "../packages/next/src/scene/World.ts";
import { fakeEngine } from "./fakeGpu.ts";

const WIDTH = 640;
const HEIGHT = 360;

describe("GlobeController wheel zoom", () => {
  let engine: Engine;
  let world: World;
  let view: View;
  beforeAll(async () => {
    engine = await fakeEngine();
  });
  afterEach(() => {
    engine.removeWorld(world);
    vi.restoreAllMocks();
  });

  /**
   * Zooms in with a stream of small wheel deltas at a cursor between
   * pixel centers, serving picks the way the engine does: the point under
   * the center of the pixel in the picked image, with that tick's camera,
   * resolved `lag` ticks later. Returns how far (in pixels) the point that
   * started under the cursor ends up from it.
   */
  async function slide(lag: number): Promise<number> {
    world = engine.createWorld();
    view = engine.addView({
      target: new OffscreenTarget(WIDTH, HEIGHT),
      world,
    });
    view.camera.lookAt(Float64Array.of(6_378_137, 0, 0), 0.4, -0.5, 3_000);
    const ticks: ((now: number) => boolean)[] = [];
    const listeners = {
      onTick(listener: (now: number) => boolean) {
        ticks.push(listener);
        return () => ticks.splice(ticks.indexOf(listener), 1);
      },
    };
    const element = new EventTarget() as EventTarget & Record<string, unknown>;
    element.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      width: WIDTH,
      height: HEIGHT,
    });
    const controller = new GlobeController(
      view,
      element as unknown as HTMLElement,
      listeners,
    );
    const ellipsoid = Ellipsoid.WGS84;
    const camera = view.camera;
    const rayAt = (x: number, y: number): v3.Vec3 =>
      camera.rayDirection(
        (x / WIDTH) * 2 - 1,
        1 - (y / HEIGHT) * 2,
        WIDTH / HEIGHT,
        v3.vec3(),
      );
    const pending: { due: number; resolve: () => void }[] = [];
    let tick = 0;
    vi.spyOn(view, "pickPosition").mockImplementation((x, y) => {
      // The engine reads the center of the pixel the point falls in.
      const hit = ellipsoid.rayIntersection(
        camera.position,
        rayAt(Math.floor(x) + 0.5, Math.floor(y) + 0.5),
        v3.vec3(),
      );
      return new Promise((resolve) =>
        pending.push({
          due: tick + lag,
          resolve: () => resolve(positionHit(hit ?? undefined)),
        }),
      );
    });

    // A cursor between pixel centers.
    const x = 400.3;
    const y = 120.7;
    const start = ellipsoid.rayIntersection(
      camera.position,
      rayAt(x, y),
      v3.vec3(),
    )!;
    const wheel = (deltaY: number) =>
      element.dispatchEvent(
        Object.assign(new Event("wheel", { cancelable: true }), {
          clientX: x,
          clientY: y,
          deltaY,
          deltaMode: 0,
        }),
      );
    let now = performance.now();
    const run = async (n: number, deltas: (i: number) => number) => {
      for (let i = 0; i < n; i++) {
        const d = deltas(i);
        if (d !== 0) {
          wheel(d);
        }
        now += 1000 / 60;
        tick++;
        for (const t of [...ticks]) {
          t(now);
        }
        for (const p of pending.splice(0)) {
          if (p.due <= tick) {
            p.resolve();
          } else {
            pending.push(p);
          }
        }
        await Promise.resolve();
        await Promise.resolve();
      }
    };
    await run(40, (i) => -Math.round(9 * Math.sin((Math.PI * i) / 40)) || -1);
    await run(60, () => 0);
    const toStart = v3.sub(v3.vec3(), start, camera.position);
    const cos = v3.dot(v3.normalize(toStart, toStart), rayAt(x, y));
    const pixelsPerRadian =
      HEIGHT / 2 / Math.tan(camera.fovy(WIDTH / HEIGHT) / 2);
    controller.dispose();
    return Math.acos(Math.min(1, cos)) * pixelsPerRadian;
  }

  it("keeps the point under the cursor there, with picks that lag", async () => {
    for (const lag of [0, 2]) {
      expect(await slide(lag)).toBeLessThan(0.75);
      engine.removeWorld(world);
    }
  });

  /**
   * The transform graph example's assembly: parts a meter across, 1,800 m
   * above a globe that isn't drawn, seen from 3.4 m. With the cursor moved
   * off the parts, the wheel's target was the ellipsoid kilometers away,
   * and one notch out moved the camera hundreds of meters. Returns the
   * distance to the content after each of `notches` wheel notches out.
   */
  async function zoomOverBackground(
    x: number,
    y: number,
    notches: number,
  ): Promise<number[]> {
    world = engine.createWorld();
    view = engine.addView({
      target: new OffscreenTarget(WIDTH, HEIGHT),
      world,
    });
    const ellipsoid = Ellipsoid.WGS84;
    const center = ellipsoid.cartographicToCartesian(
      { longitude: 0.2, latitude: 0.8, height: 1_800 },
      v3.vec3(),
    );
    const radius = 0.5;
    const camera = view.camera;
    camera.lookAt(center, 0.5, -0.38, 3.4);
    const ticks: ((now: number) => boolean)[] = [];
    const element = new EventTarget() as EventTarget & Record<string, unknown>;
    element.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      width: WIDTH,
      height: HEIGHT,
    });
    const controller = new GlobeController(
      view,
      element as unknown as HTMLElement,
      {
        onTick(listener) {
          ticks.push(listener);
          return () => ticks.splice(ticks.indexOf(listener), 1);
        },
      },
    );
    // Only the content is drawn: a ball at the center, no globe.
    vi.spyOn(view, "pickPosition").mockImplementation((px, py) => {
      const d = camera.rayDirection(
        ((Math.floor(px) + 0.5) / WIDTH) * 2 - 1,
        1 - ((Math.floor(py) + 0.5) / HEIGHT) * 2,
        WIDTH / HEIGHT,
        v3.vec3(),
      );
      const o = v3.sub(v3.vec3(), camera.position, center);
      const b = v3.dot(o, d);
      const disc = b * b - (v3.dot(o, o) - radius * radius);
      const t = -b - Math.sqrt(Math.max(disc, 0));
      return Promise.resolve(
        positionHit(
          disc >= 0 && t > 0
            ? v3.scaleAndAdd(v3.vec3(), camera.position, d, t)
            : undefined,
        ),
      );
    });
    const pointer = (px: number, py: number) =>
      element.dispatchEvent(
        Object.assign(new Event("pointermove"), {
          clientX: px,
          clientY: py,
          pointerType: "mouse",
        }),
      );
    const settle = async () => {
      for (let i = 0; i < 4; i++) {
        await Promise.resolve();
      }
    };
    // The cursor crosses the parts, then rests on the background.
    pointer(WIDTH / 2, HEIGHT / 2);
    await settle();
    pointer(x, y);
    await settle();
    let now = performance.now();
    const distances: number[] = [];
    for (let n = 0; n < notches; n++) {
      element.dispatchEvent(
        Object.assign(new Event("wheel", { cancelable: true }), {
          clientX: x,
          clientY: y,
          deltaY: 100,
          deltaMode: 0,
        }),
      );
      for (let i = 0; i < 60; i++) {
        now += 1000 / 60;
        for (const t of [...ticks]) {
          t(now);
        }
        await settle();
      }
      distances.push(v3.distance(camera.position, center));
    }
    controller.dispose();
    return distances;
  }

  it("zooms at the content's scale over the background with no globe", async () => {
    // One notch of 100 px is a factor of e^0.15 = 1.16 in distance.
    const notch = Math.exp(100 * 0.0015);
    // Below the horizon (the hidden ellipsoid under the cursor), and above
    // it (sky).
    for (const [x, y] of [
      [60, 330],
      [600, 30],
    ] as const) {
      const distances = await zoomOverBackground(x, y, 4);
      let previous = 3.4;
      for (const d of distances) {
        expect(d / previous).toBeLessThan(notch * 1.1);
        previous = d;
      }
      engine.removeWorld(world);
    }
  });
});
