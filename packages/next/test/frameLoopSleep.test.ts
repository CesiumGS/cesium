// The frame loop sleeps when settled on demand: `Engine.start` requests no
// animation frames once nothing changes, and each source of change wakes
// it with one. Before, the engine's loop and the Viewer's each asked for a
// frame on every display refresh (120 a second on a ProMotion display)
// with nothing to render: 0 frames drawn (test/onDemandIdle.test.ts), but
// the main thread woken for every refresh.
//
// The engine runs on the fake device of test/fakeGpu.ts; requestAnimationFrame
// is a queue these tests flush by hand, one 60 Hz frame at a time.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GltfAsset } from "../src/io/gltfTypes.ts";
import * as m4 from "../src/math/mat4.ts";
import * as v3 from "../src/math/vec3.ts";
import type { Engine } from "../src/scene/Engine.ts";
import { CanvasTarget, OffscreenTarget, type View } from "../src/scene/View.ts";
import { Clock } from "../src/time/Clock.ts";
import { fakeDevice, fakeEngine } from "./fakeGpu.ts";

const R = 6_378_137;
const BASE = "https://tiles.test/sleep/";
const URL_ = `${BASE}tileset.json`;

/** One triangle, one draw, the default material (as onDemandIdle.test.ts). */
function triangle(): GltfAsset {
  return {
    meshes: [
      {
        positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
        normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]),
        indices: new Uint32Array([0, 1, 2]),
      },
    ],
    materials: [],
    textures: [],
    images: [],
    draws: [{ mesh: 0, material: -1, matrix: m4.mat4() }],
    featureTables: [],
    warnings: [],
  };
}

/** A one-tile tileset at the equator and prime meridian. */
const TILESET = {
  asset: { version: "1.1" },
  geometricError: 100,
  root: {
    geometricError: 0,
    refine: "REPLACE",
    transform: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, R, 0, 0, 1],
    boundingVolume: { box: [0, 0, 0, 10, 0, 0, 0, 10, 0, 0, 0, 10] },
    content: { uri: "tile.gltf" },
  },
};

describe("the frame loop sleeps when settled", () => {
  let engine: Engine;
  let now = 0;
  /** Requested animation frames, by handle. */
  let queue = new Map<number, FrameRequestCallback>();
  let nextHandle = 1;
  /** Animation frame callbacks run so far. */
  let callbacks = 0;
  /** The canvases' resize observers' callbacks. */
  let observers: Array<() => void> = [];

  beforeEach(async () => {
    now = 1000;
    queue = new Map();
    nextHandle = 1;
    callbacks = 0;
    observers = [];
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
        constructor(private readonly cb: () => void) {
          observers.push(cb);
        }
        observe(): void {}
        disconnect(): void {
          observers = observers.filter((o) => o !== this.cb);
        }
      },
    );
    engine = await fakeEngine();
  });
  afterEach(() => {
    engine.stop();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  /**
   * Runs `n` display refreshes (16.7 ms each): each runs the animation
   * frames requested before it. Returns the callbacks run.
   */
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
      // Readbacks and loads resolve between frames.
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

  function addView(): View {
    const view = engine.addView({
      target: new OffscreenTarget(640, 360),
      world: engine.createWorld(),
      exposure: { ev100: 15 },
    });
    view.camera.lookAt(v3.vec3(R, 0, 0), 0, -Math.PI / 2, 100);
    return view;
  }

  /** A started engine with one view, settled: no frame requested. */
  async function settled(): Promise<View> {
    const view = addView();
    engine.start();
    expect(await rendered(() => frames(30))).toBeGreaterThan(0);
    expect(queue.size).toBe(0);
    return view;
  }

  it("a settled engine requests no animation frames", async () => {
    await settled();
    expect(await frames(600)).toBe(0);
    expect(engine.stats.idle).toBe(true);
  });

  it.each<[string, (view: View) => void, number]>([
    ["requestRender", () => engine.requestRender(), 1],
    [
      "a camera move",
      (view) => view.camera.lookAt(v3.vec3(R, 0, 0), 0.3, -1, 120),
      1,
    ],
    [
      "a camera written in place, then version++",
      (view) => {
        view.camera.position[0]! += 5;
        view.camera.version++;
      },
      1,
    ],
    [
      "a view's viewport",
      (view) => (view.viewport = { x: 0, y: 0, width: 0.5, height: 1 }),
      1,
    ],
    ["a view's exposure", (view) => (view.exposure = { ev100: 14 }), 1],
    ["wake, with nothing changed", () => engine.wake(), 0],
    [
      "several wakes before the frame",
      (view) => {
        engine.wake();
        view.camera.lookAt(v3.vec3(R, 0, 0), 0.2, -1, 110);
        engine.requestRender();
        engine.wake();
      },
      1,
    ],
    ["a pick", (view) => void view.pick(320, 180), 0],
  ])(
    "%s requests exactly one frame, then sleeps again",
    async (_name, change, frameCount) => {
      const view = await settled();
      change(view);
      expect(queue.size).toBe(1);
      let count = 0;
      const drawn = await rendered(async () => {
        count = await frames(600);
      });
      expect(count).toBe(1);
      expect(drawn).toBe(frameCount);
      expect(queue.size).toBe(0);
    },
  );

  it("a world change wakes it", async () => {
    const view = await settled();
    const placement = engine
      .uploadModel(view.world, triangle())
      .place({ modelMatrix: m4.mat4() });
    expect(queue.size).toBe(1);
    expect(await rendered(() => frames(600))).toBe(1);
    expect(queue.size).toBe(0);
    placement.setVisible(false);
    expect(queue.size).toBe(1);
    expect(await rendered(() => frames(600))).toBe(1);
    expect(queue.size).toBe(0);
  });

  it("a resized canvas wakes it", async () => {
    const device = fakeDevice({});
    const canvas = {
      width: 300,
      height: 150,
      clientWidth: 300,
      clientHeight: 150,
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
    vi.stubGlobal("devicePixelRatio", 1);
    const view = engine.addView({
      target: new CanvasTarget(canvas as unknown as HTMLCanvasElement),
      world: engine.createWorld(),
      exposure: { ev100: 15 },
    });
    view.camera.lookAt(v3.vec3(R, 0, 0), 0, -Math.PI / 2, 100);
    engine.start();
    await frames(30);
    expect(queue.size).toBe(0);
    expect(observers).toHaveLength(1);
    canvas.clientWidth = 400;
    observers[0]!();
    expect(queue.size).toBe(1);
    expect(await rendered(() => frames(600))).toBe(1);
    expect(canvas.width).toBe(400);
    expect(queue.size).toBe(0);
    // Removed, the view's canvas no longer wakes it.
    engine.removeView(view);
    await frames(10);
    expect(observers).toHaveLength(0);
  });

  it("a tile in flight lets it sleep; the tile's arrival wakes it", async () => {
    let arrive!: (asset: GltfAsset) => void;
    vi.spyOn(engine, "loadGltf").mockImplementation(
      () => new Promise<GltfAsset>((resolve) => (arrive = resolve)),
    );
    vi.stubGlobal("fetch", async (input: string | URL) =>
      String(input) === URL_
        ? new Response(JSON.stringify(TILESET), {
            headers: { "Content-Type": "application/json" },
          })
        : new Response("not found", { status: 404 }),
    );
    const view = await settled();
    const tileset = await engine.addTileset(view.world, URL_);
    await frames(60);
    // Requested, and waiting on the network: nothing to do until it lands.
    expect(arrive).toBeDefined();
    expect(tileset.stats.loaded).toBe(0);
    expect(tileset.active).toBe(true);
    expect(queue.size).toBe(0);
    expect(await frames(600)).toBe(0);

    arrive(triangle());
    await new Promise((resolve) => setImmediate(resolve));
    expect(queue.size).toBe(1);
    expect(await rendered(() => frames(600))).toBeGreaterThan(0);
    expect(tileset.stats.loaded).toBe(1);
    expect(queue.size).toBe(0);
    expect(await frames(600)).toBe(0);
  });

  it("a tileset's setting wakes it", async () => {
    vi.spyOn(engine, "loadGltf").mockResolvedValue(triangle());
    vi.stubGlobal("fetch", async () =>
      Response.json(TILESET, {
        headers: { "Content-Type": "application/json" },
      }),
    );
    const view = await settled();
    const tileset = await engine.addTileset(view.world, URL_);
    await frames(120);
    expect(tileset.stats.loaded).toBe(1);
    expect(queue.size).toBe(0);
    tileset.show = false;
    expect(queue.size).toBe(1);
    expect(await rendered(() => frames(600))).toBeGreaterThan(0);
    expect(queue.size).toBe(0);
  });

  it("a playing clock keeps it running; paused, it sleeps", async () => {
    await settled();
    // As the Viewer drives its clock (widgets/Viewer.ts).
    const clock = new Clock({ mode: "paused", time: 0 });
    clock.events.on("change", () => engine.requestRender());
    const off = engine.onTick((t) => {
      clock.tick(t);
      return clock.mode !== "paused";
    });
    expect(await frames(600)).toBe(1);
    expect(queue.size).toBe(0);

    clock.mode = "playing";
    expect(queue.size).toBe(1);
    expect(await rendered(() => frames(120))).toBeGreaterThan(100);
    expect(queue.size).toBe(1);
    expect(clock.time).toBeGreaterThan(1900);

    clock.mode = "paused";
    expect(await frames(600)).toBeLessThanOrEqual(2);
    expect(queue.size).toBe(0);

    // Removed, a listener no longer runs.
    off();
    clock.mode = "playing";
    expect(await frames(600)).toBe(1); // the clock's change, rendered once
    expect(queue.size).toBe(0);
  });

  it("continuous rendering runs every frame until on demand again", async () => {
    await settled();
    engine.renderMode = "continuous";
    expect(await rendered(() => frames(60))).toBe(60);
    engine.renderMode = "onDemand";
    expect(await frames(600)).toBeLessThanOrEqual(1);
    expect(queue.size).toBe(0);
  });

  it("stop cancels the requested frame; a wake while stopped requests none", async () => {
    const view = addView();
    engine.start();
    expect(queue.size).toBe(1);
    engine.stop();
    expect(queue.size).toBe(0);
    view.camera.lookAt(v3.vec3(R, 0, 0), 0.4, -1, 100);
    engine.requestRender();
    expect(queue.size).toBe(0);
    engine.start();
    expect(queue.size).toBe(1);
  });
});
