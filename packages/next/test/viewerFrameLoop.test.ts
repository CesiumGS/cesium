// The Viewer's per-frame work runs in the engine's sleeping frame loop
// (Engine.onTick, onAfterTick): its controllers and clock before the
// engine renders, busy only while the clock runs; the canvas shown after
// the first frame drawn once presentation resumes. A real Viewer over a
// fake DOM and the fake device of test/fakeGpu.ts; requestAnimationFrame
// is a queue flushed by hand.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Engine } from "../src/scene/Engine.ts";
import type { Viewer } from "../widgets/Viewer.ts";
import { fakeDevice, fakeEngine } from "./fakeGpu.ts";

interface FakeElement {
  style: Record<string, string>;
  dataset: Record<string, string>;
  width: number;
  height: number;
  clientWidth: number;
  clientHeight: number;
  append(...children: unknown[]): void;
  remove(): void;
  addEventListener(): void;
  getContext(): unknown;
  getBoundingClientRect(): DOMRect;
}

function element(): FakeElement {
  const device = fakeDevice({});
  const el: FakeElement = {
    style: {},
    dataset: {},
    width: 300,
    height: 150,
    clientWidth: 300,
    clientHeight: 150,
    append: () => {},
    remove: () => {},
    addEventListener: () => {},
    getContext: () => ({
      configure: () => {},
      unconfigure: () => {},
      getCurrentTexture: () =>
        device.createTexture({
          size: [el.width, el.height],
          format: "bgra8unorm",
          usage: 0x10,
        }),
    }),
    getBoundingClientRect: () =>
      ({ left: 0, top: 0, width: 300, height: 150 }) as DOMRect,
  };
  return el;
}

describe("the Viewer in the engine's frame loop", () => {
  let engine: Engine;
  let now = 0;
  let queue = new Map<number, FrameRequestCallback>();
  let nextHandle = 1;
  let callbacks = 0;

  beforeEach(async () => {
    now = 1000;
    queue = new Map();
    nextHandle = 1;
    callbacks = 0;
    vi.spyOn(performance, "now").mockImplementation(() => now);
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      const handle = nextHandle++;
      queue.set(handle, cb);
      return handle;
    });
    vi.stubGlobal("cancelAnimationFrame", (h: number) => queue.delete(h));
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe(): void {}
        disconnect(): void {}
      },
    );
    vi.stubGlobal("document", { createElement: () => element() });
    vi.stubGlobal("getComputedStyle", () => ({ position: "relative" }));
    vi.stubGlobal("devicePixelRatio", 1);
    engine = await fakeEngine();
  });
  afterEach(() => {
    engine.stop();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  async function frames(n: number): Promise<number> {
    const before = callbacks;
    for (let i = 0; i < n; i++) {
      now += 1000 / 60;
      const due = [...queue.values()];
      queue.clear();
      for (const cb of due) {
        callbacks++;
        cb(now);
      }
      await new Promise((resolve) => setImmediate(resolve));
    }
    return callbacks - before;
  }

  async function viewer(
    options: { suspendPresentation?: boolean } = {},
  ): Promise<Viewer> {
    const { Viewer } = await import("../widgets/Viewer.ts");
    const v = await Viewer.create(element() as unknown as HTMLElement, {
      engine,
      globe: false,
      imagery: false,
      credits: false,
      timeControls: false,
      stars: false,
      moon: false,
      cityLights: false,
      ...options,
    });
    return v;
  }

  it("settles to no frames; a playing clock keeps the loop running; paused it sleeps", async () => {
    const v = await viewer();
    await frames(60);
    expect(queue.size).toBe(0);
    expect(await frames(300)).toBe(0);

    v.clock.mode = "playing";
    expect(queue.size).toBe(1);
    const start = v.clock.time;
    expect(await frames(120)).toBe(120);
    expect(v.clock.time - start).toBeGreaterThan(1900);
    expect(queue.size).toBe(1);

    v.clock.mode = "paused";
    await frames(10);
    expect(queue.size).toBe(0);
    expect(await frames(300)).toBe(0);
    v.destroy();
  });

  it("runs the controllers on each tick, before the engine renders", async () => {
    const v = await viewer();
    await frames(60);
    const update = vi.spyOn(v.controller, "update");
    const order: string[] = [];
    update.mockImplementation(() => void order.push("controller"));
    const rendered = engine.stats.framesRendered;
    engine.onAfterTick(() =>
      order.push(
        engine.stats.framesRendered > rendered ? "rendered" : "nothing",
      ),
    );
    await frames(5);
    order.length = 0;
    v.view.camera.lookAt(new Float64Array([6_378_137, 0, 0]), 0, -1, 1000);
    await frames(5);
    expect(order).toEqual(["controller", "rendered"]);
    v.destroy();
  });

  it("destroy removes its listeners: the clock no longer runs the loop", async () => {
    const v = await viewer();
    await frames(60);
    const clock = v.clock;
    v.destroy();
    await frames(5);
    clock.mode = "playing";
    // At most the clock change's own frame: no listener keeps it going.
    expect(await frames(60)).toBeLessThanOrEqual(1);
    expect(queue.size).toBe(0);
  });

  it("a hidden start shows the canvas on the first frame drawn after it resumes", async () => {
    const v = await viewer({ suspendPresentation: true });
    await frames(60);
    expect(v.canvas.style.visibility).toBe("hidden");
    expect(queue.size).toBe(0);
    const before = engine.stats.framesRendered;
    v.resumePresentation();
    expect(queue.size).toBe(1);
    await frames(1);
    expect(engine.stats.framesRendered).toBe(before + 1);
    expect(v.canvas.style.visibility).toBe("");
    await frames(60);
    expect(queue.size).toBe(0);
    v.destroy();
  });
});
