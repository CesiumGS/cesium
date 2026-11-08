// Engine bug 2: the exposure stuck after night, then noon. The eye adapts
// to light at once (0.1 s, 400 times a real eye's pace), so the first
// reading at noon moved its state from night's to noon's, already within
// the settled band: `adaptExposure` asked for no frame, and the on-demand
// loop slept with the last frame drawn at night's exposure, washed out,
// the inspector at "settled". The view's scale follows the state only when
// a frame is made. Now a reading that moves the state asks for one.
//
// Part two: only the on-demand loop's change check (`viewKey`) computed a
// view's exposure scale, so `renderFrame()` (and the continuous loop,
// which calls it) drew with whatever scale the last check left: a fixed
// exposure set after the view was made never applied, and automatic
// exposure never moved.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as v3 from "../src/math/vec3.ts";
import type { Engine } from "../src/scene/Engine.ts";
import {
  EYE,
  OffscreenTarget,
  ev100ToScale,
  type Exposure,
  type View,
} from "../src/scene/View.ts";
import { eyeResponse, SCOTOPIC_WHITE } from "../src/scene/eye.ts";
import { fakeEngine } from "./fakeGpu.ts";

const R = 6_378_137;

interface EngineInternals {
  meters: Array<{ view: View; readback: GPUBuffer; scratch: GPUBuffer[] }>;
}

describe("a view's exposure in renderFrame()", () => {
  let engine: Engine;
  let now = 0;

  beforeEach(async () => {
    now = 1000;
    vi.spyOn(performance, "now").mockImplementation(() => now);
    engine = await fakeEngine();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  function addView(): View {
    const view = engine.addView({
      target: new OffscreenTarget(64, 36),
      world: engine.createWorld(),
      exposure: { ev100: 15 },
    });
    view.camera.lookAt(v3.vec3(R, 0, 0), 0, -Math.PI / 2, 100);
    return view;
  }

  it("applies a fixed exposure set after the view was made", () => {
    const view = addView();
    engine.renderFrame();
    expect(view.exposureScale).toBe(ev100ToScale(15));
    view.exposure = { ev100: 5 };
    engine.renderFrame();
    expect(view.exposureScale).toBe(ev100ToScale(5));
    view.exposure = { scale: 0.25 };
    engine.renderFrame();
    expect(view.exposureScale).toBe(0.25);
  });

  it("moves automatic exposure toward its meter's reading", async () => {
    const meters = (engine as unknown as EngineInternals).meters;
    // The meter reads 4 cd/m² (log2 average 2).
    meters.push = (...items) => {
      for (const meter of items) {
        meter.readback = {
          mapAsync: () => Promise.resolve(),
          getMappedRange: () => Float32Array.of(2, 1, 2, 1).buffer,
          destroy: () => {},
        } as unknown as GPUBuffer;
      }
      return Array.prototype.push.apply(meters, items);
    };
    const view = addView();
    view.exposure = { auto: true };
    for (let i = 0; i < 20; i++) {
      now += 1000 / 60;
      engine.renderFrame();
      await new Promise((resolve) => setImmediate(resolve));
    }
    // EV100 of 4 cd/m² at K = 12.5: log2(4 · 100 / 12.5) = 5.
    expect(view.autoExposure!.ev100).toBeCloseTo(5, 6);
    engine.renderFrame();
    expect(view.exposureScale).toBeCloseTo(ev100ToScale(5), 12);
  });
});

describe("adapting on demand, the loop asleep", () => {
  let engine: Engine;
  let now = 0;
  let queue = new Map<number, FrameRequestCallback>();
  let nextHandle = 1;
  /** What the meter reads, cd/m² (photopic, scotopic). */
  let scene = { photopic: 0.2, scotopic: 0.4 };

  beforeEach(async () => {
    now = 1000;
    queue = new Map();
    nextHandle = 1;
    scene = { photopic: 0.2, scotopic: 0.4 };
    vi.spyOn(performance, "now").mockImplementation(() => now);
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      const handle = nextHandle++;
      queue.set(handle, cb);
      return handle;
    });
    vi.stubGlobal("cancelAnimationFrame", (handle: number) => {
      queue.delete(handle);
    });
    engine = await fakeEngine();
    // The meter's readbacks answer `scene` (meter.slang's layout: log2
    // sums and their weights).
    const meters = (engine as unknown as EngineInternals).meters;
    meters.push = (...items) => {
      for (const meter of items) {
        const values = Float32Array.of(
          Math.log2(scene.photopic),
          1,
          Math.log2(scene.scotopic),
          1,
        );
        meter.readback = {
          mapAsync: () => Promise.resolve(),
          getMappedRange: () => values.buffer.slice(0),
          destroy: () => {},
        } as unknown as GPUBuffer;
      }
      return Array.prototype.push.apply(meters, items);
    };
  });
  afterEach(() => {
    engine.stop();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  /** Runs `n` display refreshes: each runs the frames asked for before it. */
  async function frames(n: number): Promise<void> {
    for (let i = 0; i < n; i++) {
      now += 1000 / 60;
      const due = [...queue.values()];
      queue.clear();
      for (const cb of due) {
        cb(now);
      }
      await new Promise((resolve) => setImmediate(resolve));
    }
  }

  /** The scale the view's adapted state calls for. */
  function adaptedScale(view: View): number {
    const s = view.autoExposure!;
    if ("eye" in view.exposure) {
      const r = eyeResponse(10 ** s.cones, 10 ** s.rods);
      return Math.max(r.cones, r.rods * SCOTOPIC_WHITE);
    }
    return ev100ToScale(s.ev100);
  }

  it.each([
    ["the eye", EYE],
    ["automatic exposure", { auto: true, speed: 1000 } as Exposure],
  ])("%s at noon after night draws at noon's exposure", async (_, exposure) => {
    const view = engine.addView({
      target: new OffscreenTarget(64, 36),
      world: engine.createWorld(),
      exposure,
    });
    view.camera.lookAt(v3.vec3(R, 0, 0), 0, -Math.PI / 2, 100);
    engine.start();
    // Night: adapted, then asleep.
    await frames(2400);
    expect(queue.size).toBe(0);
    const night = view.exposureScale;
    expect(night).toBeCloseTo(adaptedScale(view), 12);
    // Noon (a time change wakes the loop for one frame).
    scene = { photopic: 5651, scotopic: 14393 };
    engine.requestRender();
    await frames(600);
    expect(queue.size).toBe(0);
    const noon = adaptedScale(view);
    expect(noon).toBeLessThan(night / 1000);
    // The last frame drawn used noon's exposure, not night's.
    expect(view.exposureScale).toBeCloseTo(noon, 12);
  });
});
