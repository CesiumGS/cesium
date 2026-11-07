// On-demand rendering goes idle once nothing on screen changes, and renders
// again for a real change. The engine runs on the fake device of
// test/fakeGpu.ts and is ticked by hand, one 60 Hz frame of clock per tick.
//
// The fake device draws nothing, so its exposure meter reads nothing; the
// tests answer the meter's readbacks themselves, as the GPU's meter would:
// it averages the image after dividing the pre-exposure back out, and the
// image is fp16, so the reading carries a rounding error that moves with the
// exposure the frame was rendered at. Adapting to every such reading moved
// the exposure, a moved exposure changed the view's on-demand fingerprint,
// and the frame it rendered was metered again: OSM Buildings in Dyno's Viewer
// (the eye's exposure) rendered every second or third tick indefinitely,
// its readings alternating between two values 0.01% apart.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GltfAsset } from "../src/io/gltfTypes.ts";
import * as m4 from "../src/math/mat4.ts";
import * as v3 from "../src/math/vec3.ts";
import type { Engine } from "../src/scene/Engine.ts";
import {
  EYE,
  OffscreenTarget,
  type Exposure,
  type View,
} from "../src/scene/View.ts";
import { fakeEngine } from "./fakeGpu.ts";

const R = 6_378_137;
const BASE = "https://tiles.test/idle/";
const URL_ = `${BASE}tileset.json`;
/** Scene luminances (cd/m²), photopic and scotopic: OSM Buildings by day. */
const DAY = { photopic: 17_188, scotopic: 39_296 };
const DUSK = { photopic: 20, scotopic: 60 };
/** What the meter sees (the tests change it). */
let scene = DAY;

/** One triangle, one draw, the default material (as test/models.test.ts). */
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

interface EngineInternals {
  tick(): void;
  meters: Array<{ view: View; readback: GPUBuffer; scratch: GPUBuffer[] }>;
}

/**
 * Answers each meter readback as the GPU's meter would for a scene of
 * `scene`'s luminance rendered at the view's exposure then: the pre-exposed
 * light rounded to fp16, the exposure divided back out, log2 averaged in
 * float32 (meter.slang).
 */
function meterAsTheGpu(engine: Engine): void {
  const meters = (engine as unknown as EngineInternals).meters;
  meters.push = (...items) => {
    for (const meter of items) {
      const scale = meter.view.exposureScale;
      const seen = (l: number) => Math.log2(Math.f16round(l * scale) / scale);
      const values = Float32Array.of(
        seen(scene.photopic),
        1,
        seen(scene.scotopic),
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
}

describe("on-demand rendering goes idle", () => {
  let engine: Engine;
  let now = 0;

  beforeEach(async () => {
    now = 1000;
    scene = DAY;
    vi.spyOn(performance, "now").mockImplementation(() => now);
    engine = await fakeEngine();
    meterAsTheGpu(engine);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  /** Runs `n` frames of the loop (16.7 ms each); returns the frames rendered. */
  async function ticks(n: number): Promise<number> {
    const before = engine.stats.framesRendered;
    for (let i = 0; i < n; i++) {
      now += 1000 / 60;
      (engine as unknown as EngineInternals).tick();
      // Readbacks (the meter's) resolve between frames.
      await new Promise((resolve) => setImmediate(resolve));
    }
    return engine.stats.framesRendered - before;
  }

  function addView(exposure: Exposure): View {
    const view = engine.addView({
      target: new OffscreenTarget(640, 360),
      world: engine.createWorld(),
      exposure,
    });
    view.camera.lookAt(v3.vec3(R, 0, 0), 0, -Math.PI / 2, 100);
    return view;
  }

  it.each([
    ["the eye by day", EYE, DAY],
    ["the eye at dusk (darkening)", EYE, DUSK],
    ["automatic exposure", { auto: true } as Exposure, DAY],
  ])(
    "%s settles on a reading that moves with the exposure",
    async (_name, exposure, luminance) => {
      scene = luminance;
      const view = addView(exposure);
      // Adapting (from the default daylight state) renders.
      expect(await ticks(120)).toBeGreaterThan(0);
      await ticks(1200);
      const scale = view.exposureScale;
      // Settled: the meter's exposure-dependent rounding moves nothing.
      expect(await ticks(600)).toBe(0);
      expect(view.exposureScale).toBe(scale);
      expect(engine.stats.idle).toBe(true);
      // A real change of light adapts again, then settles.
      scene = { photopic: scene.photopic * 4, scotopic: scene.scotopic * 4 };
      engine.requestRender();
      expect(await ticks(600)).toBeGreaterThan(1);
      expect(view.exposureScale).not.toBe(scale);
      await ticks(600);
      expect(await ticks(600)).toBe(0);
    },
    60_000,
  );

  it("a fixed exposure is idle from its second frame", async () => {
    addView({ ev100: 15 });
    await ticks(10);
    expect(await ticks(600)).toBe(0);
  });

  it("a settled tileset renders nothing until the camera moves or a tile arrives", async () => {
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
    const view = addView(EYE);
    const tileset = await engine.addTileset(view.world, URL_);
    await ticks(600);
    // Requested and waiting for its content: nothing on screen changes.
    expect(arrive).toBeDefined();
    expect(tileset.stats.loaded).toBe(0);
    expect(await ticks(120)).toBe(0);

    // The tile arrives: it is drawn, then the scene settles again.
    arrive(triangle());
    expect(await ticks(120)).toBeGreaterThan(0);
    expect(tileset.stats.loaded).toBe(1);
    expect(tileset.active).toBe(false);
    expect(await ticks(600)).toBe(0);

    // A camera move renders; once still, the scene settles again.
    view.camera.lookAt(v3.vec3(R, 0, 0), 0.3, -Math.PI / 3, 120);
    expect(await ticks(1)).toBe(1);
    await ticks(300);
    expect(await ticks(600)).toBe(0);
  }, 60_000);
});
