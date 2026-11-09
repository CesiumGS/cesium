import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { Ellipsoid } from "../src/math/ellipsoid.ts";
import * as v3 from "../src/math/vec3.ts";
import type { Engine } from "../src/scene/Engine.ts";
import { GlobeController } from "../src/scene/GlobeController.ts";
import { OffscreenTarget } from "../src/scene/renderTarget.ts";
import type { View } from "../src/scene/View.ts";
import type { World } from "../src/scene/World.ts";
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
        pending.push({ due: tick + lag, resolve: () => resolve(hit) }),
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
});
