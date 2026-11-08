// The design globe's per-frame work runs in the engine's frames
// (examples/design-globe/frameDriver.ts; plan 4b final review I1): the
// morph and the camera's flights step before the engine renders, busy while
// they run; the overlays and the stores' listeners run after it, against
// the frame drawn. A settled page asks for no frames and renders none.
//
// The engine runs on the fake device of test/fakeGpu.ts;
// requestAnimationFrame is a queue flushed by hand, one 60 Hz frame at a
// time (as test/frameLoopSleep.test.ts).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createFrameDriver } from "../examples/design-globe/frameDriver.ts";
import { MorphDriver } from "../examples/design-globe/morphDriver.ts";
import { MORPH_MS } from "../examples/design-globe/page.ts";
import type { PairState } from "../examples/design-globe/placementPair.ts";
import { CameraMoves, type Framing } from "../examples/design-globe/shots.ts";
import { createStore } from "../examples/design-globe/stores.ts";
import * as v3 from "../src/math/vec3.ts";
import type { Engine } from "../src/scene/Engine.ts";
import { OffscreenTarget, type View } from "../src/scene/View.ts";
import { fakeEngine } from "./fakeGpu.ts";

const R = 6_378_137;

describe("the design globe in the engine's frames", () => {
  let engine: Engine;
  let view: View;
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
    engine = await fakeEngine();
    view = engine.addView({
      target: new OffscreenTarget(640, 360),
      world: engine.createWorld(),
      exposure: { ev100: 15 },
    });
    view.camera.lookAt(v3.vec3(R, 0, 0), 0, -1, 100);
    engine.start();
    await frames(30);
    expect(queue.size).toBe(0);
  });
  afterEach(() => {
    engine.stop();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  /** Runs `n` display refreshes; returns the animation frame callbacks run. */
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

  /** Frames rendered while `work` runs. */
  async function rendered(work: () => Promise<unknown>): Promise<number> {
    const before = engine.stats.framesRendered;
    await work();
    return engine.stats.framesRendered - before;
  }

  /** A page's parts: the driver, a morph drawing one target, a store. */
  function page() {
    const frames_ = createFrameDriver(engine);
    const drawn: number[] = [];
    let changes = 0;
    const morph = new MorphDriver(
      {
        targets: () => [
          {
            setState: (state: PairState) => void drawn.push(state.t),
          },
        ],
        requestRender: () => engine.requestRender(),
        changed: () => changes++,
        disposed: () => false,
        animate: (step) => frames_.animate(step),
      },
      "rigid",
    );
    const moves = new CameraMoves(
      {
        engine,
        view,
        controller: {
          inputs: 0,
          focus: (c: Float64Array, h: number, p: number, r: number) =>
            view.camera.lookAt(c, h, p, r),
        },
      } as never,
      () => changes++,
      (step) => frames_.animate(step),
    );
    return {
      frames: frames_,
      morph,
      moves,
      drawn,
      changes: () => changes,
    };
  }

  it("a settled page asks for no frames and renders none", async () => {
    const p = page();
    let placed = 0;
    p.frames.afterRender(() => placed++);
    const store = createStore(0, p.frames);
    store.subscribe(() => {});
    await frames(10);
    expect(queue.size).toBe(0);
    const before = placed;
    const drawn = await rendered(async () => {
      expect(await frames(600)).toBe(0);
    });
    expect(drawn).toBe(0);
    expect(placed).toBe(before);
    p.frames.dispose();
  });

  it("a store's listeners run once, after the frame's placing, in the frame its set woke", async () => {
    const p = page();
    const order: string[] = [];
    p.frames.afterRender(() => order.push("place"));
    const store = createStore("a", p.frames);
    store.subscribe(() => order.push(`told ${store.get()}`));
    await frames(5);
    order.length = 0;
    store.set("b");
    store.set("c");
    store.set("c");
    expect(queue.size).toBe(1);
    expect(await frames(600)).toBe(1);
    expect(order).toEqual(["place", "told c"]);
    // Set from the placing (as the labels are), it is told in that frame,
    // and asks for no frame after.
    order.length = 0;
    const off = p.frames.afterRender(() => store.set("d"));
    expect(await frames(600)).toBe(1);
    expect(order).toEqual(["place", "told d"]);
    off();
    p.frames.dispose();
  });

  it("the morph: busy while it runs, each step before the render, t() as drawn; idle after", async () => {
    const p = page();
    // What the labels read after each render: the morph's t then.
    const read: number[] = [];
    const drawnAt: number[] = [];
    p.frames.afterRender(() => {
      read.push(p.morph.t());
      drawnAt.push(p.drawn.at(-1)!);
    });
    p.morph.setMode("reprojected", false);
    expect(p.morph.morphing).toBe(true);
    expect(p.changes()).toBe(1);
    let running = 0;
    while (p.morph.morphing && running < 1000) {
      // One frame a refresh: the engine's.
      expect(queue.size).toBe(1);
      expect(await frames(1)).toBe(1);
      running++;
    }
    // About the morph's length at 60 Hz.
    expect(running).toBeGreaterThan((MORPH_MS / 1000) * 60 - 3);
    expect(running).toBeLessThan((MORPH_MS / 1000) * 60 + 3);
    // Each frame's labels read the t that frame drew, rising to 1.
    expect(read).toEqual(drawnAt);
    expect(read.at(-1)).toBe(1);
    for (let i = 1; i < read.length; i++) {
      expect(read[i]).toBeGreaterThanOrEqual(read[i - 1]!);
    }
    expect(p.changes()).toBe(2);
    // Settled: no frames, none rendered.
    await frames(5);
    const drawn = await rendered(async () => {
      expect(await frames(600)).toBe(0);
    });
    expect(drawn).toBe(0);
    p.frames.dispose();
  });

  it("the morph under reduced motion switches at once, with no frames to run", async () => {
    const p = page();
    p.morph.setMode("reprojected", true);
    expect(p.morph.morphing).toBe(false);
    expect(p.morph.t()).toBe(1);
    // The one render it asked for, then nothing.
    expect(await frames(600)).toBe(1);
    p.frames.dispose();
  });

  it("a flight: busy while it flies, the camera placed before each render; idle after", async () => {
    const p = page();
    const path = (u: number): Framing => ({
      center: [R, 0, 0],
      heading: u,
      pitch: -1,
      range: 100 + 100 * u,
    });
    let arrived = 0;
    // The camera each frame rendered with, as the labels see it after.
    const versions: number[] = [];
    let renderedAt = engine.stats.framesRendered;
    p.frames.afterRender(() => {
      if (engine.stats.framesRendered > renderedAt) {
        renderedAt = engine.stats.framesRendered;
        versions.push(view.camera.version);
      }
    });
    p.moves.run(path, 500, { done: () => arrived++ });
    expect(p.moves.flying).toBe(true);
    let flying = 0;
    while (p.moves.flying && flying < 1000) {
      expect(queue.size).toBe(1);
      const before = view.camera.version;
      expect(await frames(1)).toBe(1);
      flying++;
      // Moved in this frame, before its render.
      expect(view.camera.version).toBeGreaterThan(before);
      expect(versions.at(-1)).toBe(view.camera.version);
    }
    expect(flying).toBeGreaterThan(25);
    expect(flying).toBeLessThan(35);
    expect(arrived).toBe(1);
    await frames(5);
    const drawn = await rendered(async () => {
      expect(await frames(600)).toBe(0);
    });
    expect(drawn).toBe(0);
    p.frames.dispose();
  });

  it("the user's input ends a flight, and the loop sleeps", async () => {
    const p = page();
    let arrived = 0;
    p.moves.run(
      (u) => ({ center: [R, 0, 0], heading: u, pitch: -1, range: 100 }),
      2000,
      { done: () => arrived++ },
    );
    await frames(10);
    expect(p.moves.flying).toBe(true);
    (p.moves as unknown as { viewer: { controller: { inputs: number } } })
      .viewer.controller.inputs++;
    await frames(1);
    expect(p.moves.flying).toBe(false);
    expect(arrived).toBe(0);
    await frames(5);
    expect(await frames(600)).toBe(0);
    p.frames.dispose();
  });

  it("dispose ends the animations and the overlays", async () => {
    const p = page();
    let placed = 0;
    p.frames.afterRender(() => placed++);
    p.morph.setMode("reprojected", false);
    p.moves.run(
      (u) => ({ center: [R, 0, 0], heading: u, pitch: -1, range: 100 }),
      2000,
    );
    await frames(5);
    p.frames.dispose();
    const before = placed;
    await frames(5);
    expect(await frames(600)).toBe(0);
    expect(placed).toBe(before);
  });
});
