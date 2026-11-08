// Dyno's Explorer sleeps when nothing changes. Before, its loop called
// `Engine.renderFrame` (which always renders) on every display refresh, so a
// still camera in free flight kept 2.0 rendering; and writing a linked
// camera every refresh would have kept even an on-demand engine awake.
//
// The real session and 2.0 adapter run on the fake device of test/fakeGpu.ts;
// requestAnimationFrame is a queue these tests flush by hand, as in
// test/frameLoopSleep.test.ts.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Pose } from "../bench/suite/schema.ts";
import type { Adapter, RunSpec } from "../bench/suite/suite.ts";
import type { ExplorerSession } from "../bench/suite/views/explorerSession.ts";
import {
  fakeDevice,
  installFakeNavigator,
  installGpuGlobals,
} from "./fakeGpu.ts";

const R = 6_378_137;

/** Two poses above the prime meridian's equator, looking down. */
const pose = (x: number): Pose => ({
  position: [R + 1000, x, 0],
  direction: [-1, 0, 0],
  up: [0, 0, 1],
});

/** The 2.0 adapter's own numbers, as the session reads them. */
const rendered = (adapter: Adapter) => adapter.onDemandStats!().frames;

describe("the Explorer sleeps when nothing changes", () => {
  let now = 0;
  let queue = new Map<number, FrameRequestCallback>();
  let nextHandle = 1;
  let session: ExplorerSession;

  function fakeCanvas(): object {
    const device = fakeDevice({});
    const canvas = {
      width: 300,
      height: 150,
      clientWidth: 300,
      clientHeight: 150,
      style: {} as Record<string, string>,
      addEventListener: () => {},
      removeEventListener: () => {},
      getBoundingClientRect: () => ({
        left: 0,
        top: 0,
        width: 300,
        height: 150,
      }),
      getContext: () => ({
        configure: () => {},
        unconfigure: () => {},
        getCurrentTexture: () =>
          device.createTexture({
            size: [canvas.width, canvas.height],
            format: "bgra8unorm",
            usage: 0x10,
          }),
      }),
    };
    return canvas;
  }

  beforeEach(async () => {
    now = 1000;
    queue = new Map();
    nextHandle = 1;
    vi.spyOn(performance, "now").mockImplementation(() => now);
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      const handle = nextHandle++;
      queue.set(handle, cb);
      return handle;
    });
    vi.stubGlobal("cancelAnimationFrame", (handle: number) => {
      queue.delete(handle);
    });
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe(): void {}
        disconnect(): void {}
      },
    );
    vi.stubGlobal("devicePixelRatio", 1);
    vi.stubGlobal("document", {
      createElement: () => fakeCanvas(),
      querySelector: () => null,
    });
    installGpuGlobals();
    installFakeNavigator(fakeDevice({}));
    // After the GPU globals: the engine reads them as it loads.
    const { ExplorerSession } =
      await import("../bench/suite/views/explorerSession.ts");
    session = new ExplorerSession();
  });

  afterEach(() => {
    session.destroy();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  /** Runs `n` display refreshes; returns the animation frame callbacks run. */
  async function frames(n: number): Promise<number> {
    let callbacks = 0;
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
    return callbacks;
  }

  /** A session of `panes` 2.0 panes on a scene with nothing in it. */
  async function loaded(
    panes: number,
    mode: "free" | "path",
  ): Promise<Adapter[]> {
    session.setMode(mode);
    const scene = {
      id: "empty",
      title: "Empty",
      group: "A",
      areas: [],
      globe: "none",
      layers: [],
      camera: { kind: "path", poses: [pose(0), pose(100)] },
    };
    const base = {
      scene,
      datasets: [],
      scenarioSeconds: 15,
    } as unknown as Omit<RunSpec, "config">;
    const configs = Array.from({ length: panes }, () => ({
      engine: "2.0",
      id: "2.0",
    })) as never;
    const elements = Array.from({ length: panes }, () => ({
      append: () => {},
    })) as never;
    expect(await session.load(base, configs, elements, 15)).toBe(true);
    session.start();
    await frames(30);
    return session.adapters;
  }

  it("free flight with a still camera: no rendering, no animation frames", async () => {
    const [adapter] = await loaded(1, "free");
    expect(queue.size).toBe(0);
    const before = rendered(adapter!);
    expect(await frames(300)).toBe(0);
    expect(rendered(adapter!)).toBe(before);
  });

  it("linked free flight with a still camera: neither engine renders", async () => {
    const [a, b] = await loaded(2, "free");
    const before = [rendered(a!), rendered(b!)];
    await frames(300);
    expect([rendered(a!), rendered(b!)]).toEqual(before);
    // The session copies the camera while linked; the engines stay asleep.
    expect(queue.size).toBe(1);
  });

  it("a linked camera's move renders both, once, then they sleep", async () => {
    const [a, b] = await loaded(2, "free");
    const before = [rendered(a!), rendered(b!)];
    a!.setCamera(pose(50));
    await frames(5);
    expect(b!.getCamera().position).toEqual(pose(50).position);
    expect([rendered(a!) - before[0]!, rendered(b!) - before[1]!]).toEqual([
      1, 1,
    ]);
    const after = [rendered(a!), rendered(b!)];
    await frames(120);
    expect([rendered(a!), rendered(b!)]).toEqual(after);
  });

  it("a paused camera path sleeps; scrubbing it renders", async () => {
    const [adapter] = await loaded(1, "path");
    const before = rendered(adapter!);
    expect(await frames(120)).toBe(0);
    expect(rendered(adapter!)).toBe(before);
    session.setProgress(0.75);
    await frames(5);
    expect(adapter!.getCamera().position).toEqual(pose(100).position);
    expect(rendered(adapter!)).toBe(before + 1);
    expect(queue.size).toBe(0);
  });

  it("a playing camera path keeps rendering, and sleeps when paused", async () => {
    const [adapter] = await loaded(1, "path");
    session.playing = true;
    await frames(1);
    expect(queue.size).toBeGreaterThan(0);
    session.playing = false;
    await frames(5);
    const before = rendered(adapter!);
    expect(await frames(60)).toBe(0);
    expect(rendered(adapter!)).toBe(before);
  });

  it("tinting by engine doesn't render a still view again", async () => {
    const [a, b] = await loaded(2, "free");
    session.setTileColors("difference");
    await frames(5);
    const before = [rendered(a!), rendered(b!)];
    await frames(120);
    expect([rendered(a!), rendered(b!)]).toEqual(before);
  });

  it("a camera written with the same pose doesn't wake the engine", async () => {
    const [adapter] = await loaded(1, "free");
    adapter!.setCamera(pose(7));
    await frames(5);
    expect(queue.size).toBe(0);
    adapter!.setCamera(pose(7));
    expect(queue.size).toBe(0);
  });

  it("says each pane's rendering as it is", async () => {
    await loaded(1, "free");
    const snapshot = session.inspectable(0, "2.0", "#000").snapshot();
    expect(snapshot.frame?.rendering).toBe("on demand");
  });
});
