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
import { EARTH } from "../src/scene/Body.ts";
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
    ["a position pick", (view) => void view.pickPosition(320, 180), 0],
    ["the camera's field of view", (view) => (view.camera.fov = 0.5), 1],
    ["the camera's near plane", (view) => (view.camera.near = 1), 1],
    ["a view's world", (view) => (view.world = engine.createWorld()), 1],
    ["a view's background", (view) => (view.background = "color"), 1],
    ["a view's sun disk", (view) => (view.sunDisk = false), 1],
    [
      "a view's aerial perspective",
      (view) => (view.aerialPerspective = false),
      1,
    ],
    ["a view's clear color", (view) => (view.clearColor = [1, 0, 0]), 1],
    [
      "a view's output encoding",
      (view) => (view.outputEncoding = "gamma2.2"),
      1,
    ],
    ["a view's tone mapping", (view) => (view.toneMapping = "agx"), 1],
    [
      "a view's lighting",
      (view) => (view.lighting = { ...view.lighting, diffuseIbl: 0.5 }),
      1,
    ],
    ["a view disabled", (view) => (view.enabled = false), 0],
    ["a viewport written in place", (view) => (view.viewport.width = 0.5), 1],
    [
      "an exposure written in place",
      (view) => ((view.exposure as { ev100: number }).ev100 = 13),
      1,
    ],
    [
      "lighting written in place",
      (view) => (view.lighting.sunIlluminance = 1234),
      1,
    ],
    [
      "a height capture",
      (view) =>
        void engine.addHeightCapture(view.world, {
          origin: v3.vec3(R, 0, 0),
          halfExtent: 100,
          size: 16,
        }),
      1,
    ],
    ["a world created", () => void engine.createWorld(), 0],
    ["a world removed", () => engine.removeWorld(engine.createWorld()), 0],
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

  it("a wake inside the tick (a tileset's listener moving the camera) runs the next frame", async () => {
    const view = await settled();
    // A settled tileset whose update, inside the tick and after the camera
    // was fingerprinted, moves the camera once (as a synchronous `request`
    // listener can, Tileset3D.ts): nothing in needsTicks covers it.
    let moves = 0;
    const tileset = {
      world: view.world,
      url: "mover",
      show: true,
      enableCollision: false,
      terrain: false,
      lights: undefined,
      changedAt: 0,
      active: true,
      needsFrames: false,
      exactHeight: () => undefined,
      onHeightsChanged: () => () => {},
      update: () => {
        if (moves++ === 0) {
          view.camera.lookAt(v3.vec3(R, 0, 0), 0.4, -1, 130);
        }
      },
      destroy: () => {},
    };
    (engine.tilesets as unknown[]).push(tileset);
    engine.requestRender();
    const drawn = await rendered(async () => {
      expect(await frames(600)).toBe(2);
    });
    // The request's frame, then the camera's.
    expect(drawn).toBe(2);
    expect(moves).toBe(2);
    expect(queue.size).toBe(0);
  });

  it("a tick listener's own wakes run no further frame", async () => {
    const view = await settled();
    let moves = 0;
    // Its change renders in this tick: no wake is needed for it.
    engine.onTick(() => {
      if (moves < 3) {
        moves++;
        view.camera.lookAt(v3.vec3(R, 0, 0), 0.1 * moves, -1, 100);
        engine.wake();
      }
      return false;
    });
    const drawn = await rendered(async () => {
      expect(await frames(600)).toBe(1);
    });
    expect(drawn).toBe(1);
    expect(queue.size).toBe(0);
  });

  it("a tick listener added inside a frame runs from the next one", async () => {
    await settled();
    let ran = 0;
    let added = false;
    engine.onTick(() => {
      if (!added) {
        added = true;
        engine.onTick(() => {
          ran++;
          return ran < 5;
        });
      }
      return false;
    });
    await frames(600);
    expect(ran).toBe(5);
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

  it.each<[string, (view: View) => void]>([
    ["the sun set in place", () => engine.sunDirection.set([0, 1, 0])],
    [
      "a camera written in place without version++",
      (view) => (view.camera.position[0]! += 5),
    ],
    ["state outside the fingerprint", (view) => (view.shadows = true)],
  ])(
    "%s needs requestRender (documented): no frame until then",
    async (_name, change) => {
      const view = await settled();
      change(view);
      expect(queue.size).toBe(0);
      expect(await rendered(() => frames(60))).toBe(0);
      engine.requestRender();
      expect(queue.size).toBe(1);
      expect(await rendered(() => frames(60))).toBe(1);
    },
  );

  it("an enabled view again renders once", async () => {
    const view = await settled();
    view.enabled = false;
    await frames(10);
    expect(queue.size).toBe(0);
    view.enabled = true;
    expect(queue.size).toBe(1);
    expect(await rendered(() => frames(600))).toBe(1);
    expect(queue.size).toBe(0);
  });

  it("a mirror link sleeps when settled; its source's camera wakes it", async () => {
    const a = addView();
    const b = addView();
    engine.start();
    await frames(30);
    const link = engine.link(a, b, { modes: ["mirror"] });
    expect(queue.size).toBe(1);
    await frames(30);
    // The link copies the camera every tick (a version bump inside the
    // tick): that wake is the tick's own, and the loop sleeps.
    expect(queue.size).toBe(0);
    expect(await frames(300)).toBe(0);
    a.camera.lookAt(v3.vec3(R, 0, 0), 0.5, -1, 150);
    expect(queue.size).toBe(1);
    expect(await rendered(() => frames(300))).toBe(1);
    expect(b.camera.position).toEqual(a.camera.position);
    expect(queue.size).toBe(0);
    engine.unlink(link);
    expect(queue.size).toBe(1);
    expect(await frames(300)).toBe(1);
  });

  it("removing a view wakes it, and the views left render", async () => {
    await settled();
    const second = addView();
    await frames(30);
    expect(queue.size).toBe(0);
    engine.removeView(second);
    expect(queue.size).toBe(1);
    expect(await rendered(() => frames(300))).toBe(1);
    // Its camera no longer wakes the loop.
    second.camera.lookAt(v3.vec3(R, 0, 0), 1, -1, 100);
    second.viewport = { x: 0, y: 0, width: 0.5, height: 0.5 };
    expect(queue.size).toBe(0);
  });

  /** A canvas the fake device can draw into. */
  function fakeCanvas(html: boolean) {
    const device = fakeDevice({});
    const canvas: Record<string, unknown> & { width: number; height: number } =
      {
        width: 300,
        height: 150,
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
    if (html) {
      canvas.clientWidth = 300;
      canvas.clientHeight = 150;
    }
    return canvas;
  }

  async function settledOn(canvas: object): Promise<CanvasTarget> {
    vi.stubGlobal("devicePixelRatio", 1);
    const target = new CanvasTarget(canvas as unknown as HTMLCanvasElement);
    const view = engine.addView({
      target,
      world: engine.createWorld(),
      exposure: { ev100: 15 },
    });
    view.camera.lookAt(v3.vec3(R, 0, 0), 0, -Math.PI / 2, 100);
    engine.start();
    await frames(30);
    expect(queue.size).toBe(0);
    return target;
  }

  it("a canvas's fixed pixel ratio wakes it", async () => {
    const canvas = fakeCanvas(true);
    const target = await settledOn(canvas);
    target.fixedPixelRatio = 2;
    expect(queue.size).toBe(1);
    expect(await rendered(() => frames(300))).toBe(1);
    expect(canvas.width).toBe(600);
    expect(queue.size).toBe(0);
  });

  it("an OffscreenCanvas resized by its owner wakes it", async () => {
    const canvas = fakeCanvas(false);
    await settledOn(canvas);
    canvas.width = 400;
    expect(queue.size).toBe(1);
    expect(await rendered(() => frames(300))).toBe(1);
    expect(canvas.width).toBe(400);
    canvas.height = 200;
    expect(await rendered(() => frames(300))).toBe(1);
    expect(queue.size).toBe(0);
  });

  it("a tileset's selection knob (maximumScreenSpaceError) wakes it", async () => {
    vi.spyOn(engine, "loadGltf").mockResolvedValue(triangle());
    vi.stubGlobal("fetch", async () =>
      Response.json(TILESET, {
        headers: { "Content-Type": "application/json" },
      }),
    );
    const view = await settled();
    const tileset = await engine.addTileset(view.world, URL_);
    await frames(120);
    expect(queue.size).toBe(0);
    tileset.selection.maximumScreenSpaceError = 8;
    expect(queue.size).toBe(1);
    expect(await frames(300)).toBeGreaterThan(0);
    expect(tileset.selection.maximumScreenSpaceError).toBe(8);
    expect(queue.size).toBe(0);
    // The tileset's own per-frame writes (the memory-adjusted SSE) don't.
    expect(await frames(300)).toBe(0);
    // A proxy, stable until setPolicy replaces the policy (its documented
    // identity), which carries the knob over.
    const proxy = tileset.selection;
    expect(tileset.selection).toBe(proxy);
    tileset.setPolicy("budgeted");
    expect(tileset.selection).not.toBe(proxy);
    expect(tileset.selection.maximumScreenSpaceError).toBe(8);
    await frames(300);
    engine.removeTileset(tileset);
    expect(queue.size).toBe(1);
  });

  describe("custom shaders", () => {
    async function shaded(uniforms: Record<string, unknown>) {
      const { CustomShader } = await import("../src/scene/CustomShader.ts");
      const shader = new CustomShader({
        uniforms: uniforms as never,
        fragment:
          "fn fragmentMain(fsInput: FragmentInput, material: ptr<function, MaterialOutput>) {}",
      });
      const view = await settled();
      const placement = engine
        .uploadModel(view.world, triangle())
        .place({ modelMatrix: m4.mat4() });
      placement.setShader(shader);
      return { shader, placement };
    }

    it("its pipeline becoming ready wakes it", async () => {
      await shaded({ amount: { type: "f32", value: 1 } });
      // The placement's frame draws with the engine's stand-in. Nothing
      // else needs a frame after it: the shader's compile and pipeline
      // (asynchronous) arriving are what wake the loop, for a frame drawn
      // with it (here they resolve between frames, so it never sleeps).
      expect(await rendered(() => frames(300))).toBeGreaterThanOrEqual(2);
      expect(queue.size).toBe(0);
    });

    it("a uniform set wakes it", async () => {
      const { shader } = await shaded({ amount: { type: "f32", value: 1 } });
      await frames(300);
      expect(queue.size).toBe(0);
      shader.setUniform("amount", 2);
      expect(queue.size).toBe(1);
      expect(await rendered(() => frames(300))).toBe(1);
      expect(queue.size).toBe(0);
    });

    it("a texture that loaded wakes it", async () => {
      const image = { width: 1, height: 1 } as unknown as ImageBitmap;
      const { shader } = await shaded({
        tint: { type: "texture2d", value: image },
      });
      await frames(300);
      expect(queue.size).toBe(0);
      // Set, it wakes; the frame starts its load; loaded, it wakes again.
      shader.setUniform("tint", { width: 2, height: 2 } as never);
      expect(queue.size).toBe(1);
      const drawn = await rendered(() => frames(300));
      expect(drawn).toBeGreaterThanOrEqual(2);
      expect(queue.size).toBe(0);
    });
  });

  describe("height clamping", () => {
    /** A surface the clamping stands content on (a collision tileset). */
    function collider(world: View["world"]) {
      const tileset = {
        world,
        anchor: world.bodyAnchor(EARTH),
        url: "collider",
        show: true,
        enableCollision: true,
        terrain: false,
        lights: undefined,
        changedAt: 0,
        active: false,
        needsFrames: false,
        exactHeight: () => undefined,
        onHeightsChanged: () => () => {},
        update: () => {},
        destroy: () => {},
      };
      (engine.tilesets as unknown[]).push(tileset);
      return tileset;
    }

    it("add, a sample's arrival and a cast's end wake it; busy holds it through the cast interval", async () => {
      const view = await settled();
      const surface = collider(view.world);
      let sampled!: (heights: Array<number | undefined>) => void;
      vi.spyOn(engine, "sampleHeightMostDetailed").mockImplementation(
        () => new Promise((resolve) => (sampled = resolve)),
      );
      const casts: Array<(hits: Array<number | undefined>) => void> = [];
      vi.spyOn(view.world, "castRays").mockImplementation(
        () => new Promise((resolve) => casts.push(resolve)),
      );
      const transform = view.world.addTransform(m4.mat4());
      await frames(10);
      expect(queue.size).toBe(0);

      const clamp = engine.clamping.add(view.world, transform, {
        heightReference: "clampTo3DTiles",
        longitude: 0,
        latitude: 0,
        height: 0,
      });
      expect(queue.size).toBe(1);
      await frames(10);
      // Sampling and casting: both in flight, the loop asleep.
      expect(sampled).toBeDefined();
      expect(casts).toHaveLength(1);
      expect(queue.size).toBe(0);
      expect(engine.clamping.busy).toBe(false);

      casts[0]!([5]);
      await new Promise((resolve) => setImmediate(resolve));
      expect(queue.size).toBe(1);
      await frames(10);
      expect(queue.size).toBe(0);

      sampled([5]);
      await new Promise((resolve) => setImmediate(resolve));
      expect(queue.size).toBe(1);
      expect(await rendered(() => frames(10))).toBe(1);
      expect(clamp.settled).toBe(true);
      expect(queue.size).toBe(0);

      // The collider changed what it draws: a cast is due but held back by
      // CAST_INTERVAL; busy keeps the loop going until it goes out.
      surface.changedAt = 1;
      engine.wake();
      let n = 0;
      while (casts.length < 2 && n < 30) {
        n += await frames(1);
      }
      expect(casts).toHaveLength(2);
      expect(n).toBeGreaterThan(1);
      expect(n).toBeLessThanOrEqual(11);
      await frames(5);
      expect(queue.size).toBe(0);
      casts[1]!([5]);
      await frames(5);
      expect(queue.size).toBe(0);
      expect(engine.clamping.busy).toBe(false);
    });
  });

  describe("the frame's order and failures", () => {
    it("tick listeners, the render, then after-tick listeners; a wake after the tick asks for the next frame", async () => {
      const view = await settled();
      const order: string[] = [];
      const renderFrame = engine.stats.framesRendered;
      engine.onTick(() => {
        order.push("before");
        return false;
      });
      let moved = false;
      engine.onAfterTick(() => {
        order.push(
          engine.stats.framesRendered > renderFrame ? "after-render" : "after",
        );
        if (!moved) {
          moved = true;
          view.camera.lookAt(v3.vec3(R, 0, 0), 0.6, -1, 100);
        }
      });
      view.camera.lookAt(v3.vec3(R, 0, 0), 0.5, -1, 100);
      expect(await frames(1)).toBe(1);
      expect(order).toEqual(["before", "after-render"]);
      // The after-tick camera move: the next frame renders it.
      expect(queue.size).toBe(1);
      expect(await rendered(() => frames(300))).toBe(1);
      expect(queue.size).toBe(0);
    });

    it("a throwing tick listener is reported; the frame and later wakes go on", async () => {
      const view = await settled();
      vi.spyOn(console, "error").mockImplementation(() => {});
      const errors = () => engine.errors.map((e) => e.message);
      let throwOnce = true;
      engine.onTick(() => {
        if (throwOnce) {
          throwOnce = false;
          throw new Error("boom");
        }
        return false;
      });
      view.world.changedViews = 0xffffffff;
      expect(await rendered(() => frames(5))).toBe(1);
      expect(errors().some((m) => /tick listener threw: boom/.test(m))).toBe(
        true,
      );
      expect(queue.size).toBe(0);
      // World edits still wake it.
      const t = view.world.addTransform(m4.mat4());
      await frames(5);
      expect(queue.size).toBe(0);
      const moved = m4.mat4();
      moved[12] = 5;
      view.world.setTransform(t, moved);
      expect(queue.size).toBe(1);
    });

    it("a throwing tick is reported, and the loop waits for the next wake", async () => {
      const view = await settled();
      const internals = engine as unknown as { tick(): void };
      const tick = internals.tick.bind(engine);
      let throwOnce = true;
      internals.tick = () => {
        if (throwOnce) {
          throwOnce = false;
          throw new Error("bad frame");
        }
        tick();
      };
      vi.spyOn(console, "error").mockImplementation(() => {});
      const errors = () => engine.errors.map((e) => e.message);
      const t = view.world.addTransform(m4.mat4());
      await frames(5);
      // The failed frame leaves the world's changes unconsumed.
      view.world.changedViews = 0xffffffff;
      expect(await frames(5)).toBe(1);
      expect(errors().some((m) => /the tick threw: bad frame/.test(m))).toBe(
        true,
      );
      expect(queue.size).toBe(0);
      // A later world edit still wakes it, and renders.
      const moved = m4.mat4();
      moved[12] = 5;
      view.world.setTransform(t, moved);
      expect(queue.size).toBe(1);
      expect(await rendered(() => frames(300))).toBe(1);
    });

    it("stop from a tick listener skips the tick and asks for no frame", async () => {
      await settled();
      const before = engine.stats.framesRendered;
      engine.onTick(() => {
        engine.stop();
        return true;
      });
      engine.requestRender();
      await frames(5);
      expect(engine.stats.framesRendered).toBe(before);
      expect(queue.size).toBe(0);
      engine.requestRender();
      expect(queue.size).toBe(0);
    });

    it("destroy from a tick listener skips the tick", async () => {
      await settled();
      const before = engine.stats.framesRendered;
      engine.onTick(() => {
        engine.destroy();
        return true;
      });
      await frames(5);
      expect(engine.stats.framesRendered).toBe(before);
      expect(queue.size).toBe(0);
    });
  });
});
