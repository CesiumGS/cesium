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
// its readings alternating between two values 0.01% apart. A reading within
// a settled band of the exposure now moves nothing (Engine `adaptExposure`).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GltfAsset } from "../src/io/gltfTypes.ts";
import * as m4 from "../src/math/mat4.ts";
import * as v3 from "../src/math/vec3.ts";
import type { Engine } from "../src/scene/Engine.ts";
import { EYE, type Exposure, type View } from "../src/scene/View.ts";
import { OffscreenTarget } from "../src/scene/renderTarget.ts";
import { fakeEngine } from "./fakeGpu.ts";

const R = 6_378_137;
const BASE = "https://tiles.test/idle/";
const URL_ = `${BASE}tileset.json`;
/** Scene luminances (cd/m²), photopic and scotopic: OSM Buildings by day. */
const DAY = { photopic: 17_188, scotopic: 39_296 };
const DUSK = { photopic: 20, scotopic: 60 };
/** src/render/view/exposure.ts `EYE_SETTLED` (log10 cd/m²) and `AUTO_SETTLED` (EV). */
const EYE_BAND = 0.005;
const AUTO_BAND = 0.02;
const AUTO: Exposure = { auto: true };

const f32 = new Float32Array(1);
const u32 = new Uint32Array(f32.buffer);

/**
 * `x` rounded to IEEE half precision (round to nearest, ties to even), as
 * the GPU stores a float32 into an rgba16float target: through float32
 * first. Subnormal halves are kept; past 65504 (after rounding) is
 * infinite. `Math.f16round` does this from a double, but only from Node 24.
 */
export function f16round(x: number): number {
  f32[0] = x;
  const bits = u32[0]!;
  const sign = bits >>> 31 ? -1 : 1;
  const biased = (bits >>> 23) & 0xff;
  const mantissa = bits & 0x7fffff;
  if (biased === 0xff) {
    return mantissa ? Number.NaN : sign * Infinity;
  }
  if (biased === 0) {
    return sign * 0; // float32 subnormals are far below half's smallest
  }
  const exponent = biased - 127;
  // The significand with its leading 1, and how many of its 24 bits drop:
  // 13 for a normal half, more below 2^-14 (a subnormal half's units are
  // 2^-24 apart).
  const significand = mantissa | 0x800000;
  const drop = exponent >= -14 ? 13 : 13 + (-14 - exponent);
  if (drop > 24) {
    return sign * 0; // under half of 2^-24
  }
  const unit = 2 ** drop;
  let kept = Math.floor(significand / unit);
  const rest = significand - kept * unit;
  if (rest > unit / 2 || (rest === unit / 2 && kept % 2 === 1)) {
    kept++;
  }
  const value = kept * 2 ** (exponent - 23 + drop);
  return sign * (value > 65504 ? Infinity : value);
}

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
}

describe("f16round (the test meter's fp16)", () => {
  it.each([
    [1, 1],
    [-2, -2],
    [0.1, 0.0999755859375],
    [17_188, 17_184], // halves are 16 apart in [16384, 32768)
    [1 + 2 ** -11, 1], // a tie: to the even neighbour
    [1 + 3 * 2 ** -11, 1 + 2 ** -9], // a tie: to the even neighbour
    [65_504, 65_504], // the largest half
    [65_519, 65_504], // under the tie with 2^16
    [65_520, Infinity], // the tie rounds to even, 2^16: overflow
    [2 ** -14, 2 ** -14], // the smallest normal half
    [2 ** -24, 2 ** -24], // the smallest subnormal half
    [3 * 2 ** -26, 2 ** -24], // three quarters of a unit
    [2 ** -25, 0], // half a unit: a tie, to even (zero)
    [1e-30, 0],
    [Infinity, Infinity],
  ])("%d rounds to %d", (x, half) => {
    expect(f16round(x)).toBe(half);
  });

  it("NaN stays NaN", () => {
    expect(f16round(Number.NaN)).toBeNaN();
  });

  const native = (Math as { f16round?: (x: number) => number }).f16round;
  it.runIf(native !== undefined)(
    "agrees with Math.f16round on float32 values (Node 24)",
    () => {
      for (let i = 0; i < 20_000; i++) {
        // Float32 inputs, so rounding through float32 first changes nothing.
        const x = Math.fround(
          (Math.random() - 0.5) * 2 ** Math.floor(Math.random() * 60 - 30),
        );
        expect(f16round(x)).toBe(native!(x));
      }
    },
  );
});

describe("on-demand rendering goes idle", () => {
  let engine: Engine;
  let now = 0;
  /** What the meter sees (the tests change it). */
  let scene = DAY;
  /** The meter rounds the pre-exposed image to fp16 (false: a control). */
  let rounds = true;

  /**
   * Answers each meter readback as the GPU's meter would for a scene of
   * `scene`'s luminance rendered at the view's exposure then: the
   * pre-exposed light rounded to fp16, the exposure divided back out, log2
   * averaged in float32. The readback's layout is meter.slang's result
   * (`sum`, `count`, `rodSum`, `rodCount`: log2 sums and their counts) as
   * renderTick.ts reads it after submit.
   */
  function meterAsTheGpu(): void {
    const meters = engine.raster.meters;
    meters.push = (...items) => {
      const seen = (l: number, scale: number) =>
        Math.log2(rounds ? f16round(l * scale) / scale : l);
      for (const meter of items) {
        const scale = meter.view.exposureScale;
        const values = Float32Array.of(
          seen(scene.photopic, scale),
          1,
          seen(scene.scotopic, scale),
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

  beforeEach(async () => {
    now = 1000;
    scene = DAY;
    rounds = true;
    vi.spyOn(performance, "now").mockImplementation(() => now);
    engine = await fakeEngine();
    meterAsTheGpu();
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

  /** A view adapted to `scene` and idle (no frame in 600 ticks). */
  async function settled(exposure: Exposure): Promise<View> {
    const view = addView(exposure);
    // Adapting (from the default daylight state) renders.
    expect(await ticks(120)).toBeGreaterThan(0);
    await ticks(1200);
    expect(await ticks(600)).toBe(0);
    return view;
  }

  /** How far the scene is from the view's adapted state, in its band's units. */
  function offBand(view: View): number {
    const s = view.autoExposure!;
    if ("eye" in view.exposure) {
      return (
        Math.max(
          Math.abs(Math.log10(scene.photopic) - s.cones),
          Math.abs(Math.log10(scene.scotopic) - s.rods),
        ) / EYE_BAND
      );
    }
    return (
      Math.abs(Math.log2((scene.photopic * 100) / 12.5) - s.ev100) / AUTO_BAND
    );
  }

  /** The scene moved by `bands` of the view's band from its adapted state. */
  function sceneOff(view: View, bands: number): typeof scene {
    const s = view.autoExposure!;
    if ("eye" in view.exposure) {
      const d = bands * EYE_BAND;
      return { photopic: 10 ** (s.cones + d), scotopic: 10 ** (s.rods + d) };
    }
    const photopic = (12.5 / 100) * 2 ** (s.ev100 + bands * AUTO_BAND);
    return { photopic, scotopic: photopic * 2.5 };
  }

  it.each([
    ["the eye by day", EYE, DAY],
    ["the eye at dusk (darkening)", EYE, DUSK],
    ["automatic exposure", AUTO, DAY],
  ])(
    "%s settles on a reading that moves with the exposure",
    async (_name, exposure, luminance) => {
      scene = luminance;
      const view = await settled(exposure);
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

  it.each([
    ["the eye", EYE],
    ["automatic exposure", AUTO],
  ])(
    "%s settles with a meter that doesn't round (the control)",
    async (_name, exposure) => {
      rounds = false;
      const view = await settled(exposure);
      const scale = view.exposureScale;
      expect(await ticks(600)).toBe(0);
      expect(view.exposureScale).toBe(scale);
    },
  );

  it.each([
    ["the eye", 1, EYE],
    ["the eye", -1, EYE],
    ["automatic exposure", 1, AUTO],
    ["automatic exposure", -1, AUTO],
  ])(
    "%s holds for a change just inside its band, adapts just outside (direction %d)",
    async (_name, sign, exposure) => {
      const view = await settled(exposure);
      const scale = view.exposureScale;
      // Just inside: the frame that meters it is the only one.
      scene = sceneOff(view, sign * 0.8);
      engine.requestRender();
      expect(await ticks(600)).toBe(1);
      expect(view.exposureScale).toBe(scale);
      // Just outside: it adapts, until within the band again.
      scene = sceneOff(view, sign * 1.2);
      engine.requestRender();
      expect(await ticks(600)).toBeGreaterThan(1);
      expect(view.exposureScale).not.toBe(scale);
      await ticks(1200);
      expect(offBand(view)).toBeLessThanOrEqual(1.02);
      expect(await ticks(600)).toBe(0);
    },
    60_000,
  );

  it.each([
    ["the eye", EYE],
    ["automatic exposure", AUTO],
  ])(
    "%s catches up with a slow ramp of changes each inside the band (sunset)",
    async (_name, exposure) => {
      const view = await settled(exposure);
      const scale = view.exposureScale;
      // 200 steps, each 0.6 of the band darker than the last, each redrawn
      // (as the sun moving redraws): 120 bands in all.
      const factor =
        "eye" in exposure ? 10 ** (-0.6 * EYE_BAND) : 2 ** (-0.6 * AUTO_BAND);
      let frames = 0;
      for (let i = 0; i < 200; i++) {
        scene = {
          photopic: scene.photopic * factor,
          scotopic: scene.scotopic * factor,
        };
        engine.requestRender();
        frames += await ticks(6);
      }
      // More frames than the redraws asked for: it adapted along the way
      // (lagging as an eye does, not held by the band).
      expect(frames).toBeGreaterThan(200);
      expect(view.exposureScale).not.toBe(scale);
      // Once the light stops changing it catches up to within the band, and
      // the frames stop.
      await ticks(1200);
      expect(offBand(view)).toBeLessThanOrEqual(1.02);
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
    // A fixed exposure: what renders here is the tileset's doing alone.
    const view = addView({ ev100: 15 });
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
