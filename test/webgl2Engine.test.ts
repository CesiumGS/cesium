// An engine on the empty WebGL 2 device (CS-35): `emulate: "webgl2-basic"`
// makes an engine that clears, the option picks the device and says why, a
// device below the floor rejects naming the missing item, and the device's
// facts and support report are the view's. Node only: a fake WebGL 2 stands
// in for the browser's (test/fakeGl.ts), and there is no `navigator.gpu`.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as v3 from "../packages/next/src/math/vec3.ts";
import {
  forgetFallbackWarnings,
  forgetProbes,
} from "../packages/next/src/scene/deviceChoice.ts";
import type { Engine } from "../packages/next/src/scene/Engine.ts";
import { engineSnapshot } from "../packages/next/widgets/engine.ts";
import { gpuHtml } from "../packages/next/widgets/inspector.ts";
import type { GltfAsset } from "../packages/next/src/io/gltfTypes.ts";
import { GlobeImagery } from "../packages/next/src/globe/GlobeImagery.ts";
import { isCapacityError } from "../packages/next/src/scene/CapacityError.ts";
import { createBox } from "../packages/next/src/scene/meshes.ts";
import {
  CanvasTarget,
  OffscreenTarget,
} from "../packages/next/src/scene/renderTarget.ts";
import {
  FakeOffscreenCanvas,
  fakeGlFor,
  installFakeGl,
  uninstallFakeGl,
  type FakeGl,
} from "./fakeGl.ts";

const { Engine: EngineClass } =
  await import("../packages/next/src/scene/Engine.ts");

const engines: Engine[] = [];
async function create(
  options: Parameters<typeof EngineClass.create>[0] = {},
): Promise<Engine> {
  const engine = await EngineClass.create({ warnings: false, ...options });
  engine.stop();
  engines.push(engine);
  return engine;
}

/** One triangle, one draw, the default material: nothing to decode. */
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
    draws: [
      {
        mesh: 0,
        material: -1,
        matrix: Float64Array.from([
          1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1,
        ]),
      },
    ],
    featureTables: [],
    warnings: [],
  };
}

/** A canvas target over a fake canvas, and the context the engine takes of it. */
function canvasTarget(width = 64, height = 32) {
  const canvas = new FakeOffscreenCanvas(width, height);
  return { canvas, target: new CanvasTarget(canvas as never) };
}

beforeEach(() => {
  forgetProbes();
  forgetFallbackWarnings();
  // What the probe's throwaway contexts and the targets' own contexts are.
  installFakeGl(fakeGlFor("webgl2-chrome"));
});
afterEach(() => {
  for (const engine of engines.splice(0)) {
    engine.destroy();
  }
  uninstallFakeGl();
  vi.restoreAllMocks();
});

/** The fake context of the canvas a target draws into (the probe's came first and were released). */
const contextOf = (canvas: FakeOffscreenCanvas): FakeGl =>
  canvas.getContext("webgl2")!;

describe('emulate: "webgl2-basic"', () => {
  it("makes an engine on the WebGL 2 device, emulating the persona", async () => {
    const engine = await create({ emulate: "webgl2-basic" });
    expect(engine.device.kind).toBe("webgl2");
    expect(engine.choice).toMatchObject({
      renderer: "webgl2",
      reason: "emulating webgl2-basic",
      emulating: "webgl2-basic",
    });
    const facts = engine.device.facts;
    expect(facts.renderer).toBe("webgl2");
    if (facts.renderer === "webgl2") {
      // The context the fake lists has clip control and multi-draw; the persona hides them.
      expect(facts.extensions).toEqual(["EXT_color_buffer_float"]);
      expect(facts.emulating).toBe("webgl2-basic");
    }
  });

  it("clears each view to its background color", async () => {
    const engine = await create({ emulate: "webgl2-basic" });
    const { canvas, target } = canvasTarget(64, 32);
    const view = engine.addView({
      target,
      world: engine.createWorld(),
      clearColor: [0.25, 0.5, 1],
      outputEncoding: "srgb",
    });
    engine.renderFrame();
    const gl = contextOf(canvas);
    // The canvas's own context, made once, for presenting.
    expect(
      FakeOffscreenCanvas.requests.filter(
        (r) => (r.attributes as { alpha?: boolean })?.alpha === false,
      ),
    ).toHaveLength(1);
    const [r, g, b, a] = gl.called("clearColor").at(-1)!.args as number[];
    // The linear color, sRGB encoded for the canvas.
    expect(r).toBeCloseTo(0.5372, 3);
    expect(g).toBeCloseTo(0.7354, 3);
    expect(b).toBeCloseTo(1, 9);
    expect(a).toBe(1);
    expect(gl.called("clear").at(-1)!.args[0]).toBe(gl.COLOR_BUFFER_BIT);
    // The view covers the target: its whole rectangle, no extra clear to black.
    expect(gl.called("scissor").at(-1)!.args).toEqual([0, 0, 64, 32]);
    expect(gl.called("clear")).toHaveLength(1);
    expect(engine.stats.framesRendered).toBe(1);
    expect(view.pixelRect()).toMatchObject({ width: 64, height: 32 });
  });

  it("clears a view's own rectangle, from the bottom-left, and the rest black", async () => {
    const engine = await create({ emulate: "webgl2-basic" });
    const { canvas, target } = canvasTarget(100, 50);
    engine.addView({
      target,
      world: engine.createWorld(),
      viewport: { x: 0, y: 0, width: 0.5, height: 0.5 },
      clearColor: [0, 0, 0.5],
    });
    engine.renderFrame();
    const gl = contextOf(canvas);
    // Black first (nothing covers the target), then the top-left quarter: GL's origin is the bottom-left.
    expect(gl.called("clearColor")[0]!.args).toEqual([0, 0, 0, 1]);
    expect(gl.called("scissor").at(-1)!.args).toEqual([0, 25, 50, 25]);
    expect(gl.called("clear")).toHaveLength(2);
  });

  it("sizes an element canvas to its CSS box on every tick, as the WebGPU path does", async () => {
    const engine = await create({ emulate: "webgl2-basic" });
    // An element: it has a CSS box (`clientWidth`), and its drawing buffer follows it.
    const gl = new FakeOffscreenCanvas(1, 1);
    const element = Object.assign(gl, { clientWidth: 200, clientHeight: 100 });
    const target = new CanvasTarget(element as never, { pixelRatio: 2 });
    engine.addView({ target, world: engine.createWorld() });
    engine.renderFrame();
    expect([element.width, element.height]).toEqual([400, 200]);
    element.clientWidth = 300;
    engine.renderFrame();
    expect([element.width, element.height]).toEqual([600, 200]);
    expect(contextOf(element).called("viewport").at(-1)!.args).toEqual([
      0, 0, 600, 200,
    ]);
  });

  it("draws only the targets asked for, and not a disabled view", async () => {
    const engine = await create({ emulate: "webgl2-basic" });
    const a = canvasTarget();
    const b = canvasTarget();
    const world = engine.createWorld();
    engine.addView({ target: a.target, world });
    const second = engine.addView({ target: b.target, world });
    second.enabled = false;
    engine.renderFrame();
    expect(contextOf(a.canvas).called("clear")).toHaveLength(1);
    expect(b.canvas.getContext("webgl2")?.called("clear") ?? []).toHaveLength(
      0,
    );
  });

  it("reports an OffscreenTarget as not drawn, once", async () => {
    const engine = await create({ emulate: "webgl2-basic" });
    engine.addView({
      target: new OffscreenTarget(8, 8),
      world: engine.createWorld(),
    });
    engine.renderFrame();
    engine.renderFrame();
    const frames = engine.errors.filter((e) => e.kind === "frame");
    expect(frames.map((e) => e.count)).toEqual([1]);
    expect(frames[0]!.message).toContain("OffscreenTarget");
  });

  it("stops, and reports once, when the context is lost", async () => {
    const engine = await create({ emulate: "webgl2-basic" });
    const { canvas, target } = canvasTarget();
    engine.addView({ target, world: engine.createWorld() });
    engine.renderFrame();
    const gl = contextOf(canvas);
    gl.lost = true;
    engine.renderFrame();
    engine.renderFrame();
    expect(gl.called("clear")).toHaveLength(1);
    expect(engine.errors.filter((e) => e.kind === "device")).toHaveLength(1);
    expect(engine.errors.at(-1)!.message).toContain("WebGL 2 context was lost");
  });

  it("answers a pick over it with nothing, since nothing is drawn", async () => {
    const engine = await create({ emulate: "webgl2-basic" });
    const view = engine.addView({
      target: canvasTarget().target,
      world: engine.createWorld(),
    });
    const pick = view.pick(1, 1);
    const position = view.pickPosition(1, 1);
    engine.device.servePicks(new Set());
    expect(await pick).toBeUndefined();
    expect(await position).toBeUndefined();
    expect(view.pendingPicks).toHaveLength(0);
  });
});

describe("the view's support on the WebGL 2 device", () => {
  it("names the renderer, the content and the paths, from the device's facts", async () => {
    const engine = await create({ emulate: "webgl2-basic" });
    const view = engine.addView({
      target: canvasTarget().target,
      world: engine.createWorld(),
      // Exact lists need storage buffers, which WebGL 2 doesn't have.
      translucencyMethod: "exact",
    });
    const report = view.support;
    expect(report.renderer).toBe("webgl2");
    expect(report.content.required).toEqual([
      "globe",
      "terrain",
      "imagery",
      "meshes",
    ]);
    expect(report.paths).toEqual(
      expect.arrayContaining([
        expect.stringContaining("depth: log (no EXT_clip_control"),
        expect.stringContaining("draws: one call per record"),
      ]),
    );
    // Glare is compute, and exact lists need storage buffers: WebGL 2 has
    // no step for the first, and says why it holds the second back.
    expect(report.features["glare"]).toEqual([]);
    expect(report.features["translucency"]).not.toContain("exact");
    expect(view.explain("translucency").trail.map((t) => t.rule)).toContain(
      "translucency.webgl2.exact",
    );
    expect(view.effective.features["translucency"]!.given).not.toBe("exact");
  });

  it("is the same object for every view, and keeps the device's facts", async () => {
    const engine = await create({ emulate: "webgl2-basic" });
    const world = engine.createWorld();
    const one = engine.addView({ target: canvasTarget().target, world });
    const two = engine.addView({ target: canvasTarget().target, world });
    expect(two.support).toBe(one.support);
  });
});

describe("content on the empty WebGL 2 device", () => {
  // The call: the device draws no content yet (CS-36), so it refuses content,
  // wherever it reaches the device, with one message naming CS-36.
  const REFUSAL = /draws no content yet \(CS-36\), so it can't take /;

  it("refuses a mesh, with the message, and not as a capacity error streaming would retry", async () => {
    const engine = await create({ emulate: "webgl2-basic" });
    const world = engine.createWorld();
    let error: unknown;
    try {
      world.addMesh(createBox());
    } catch (e) {
      error = e;
    }
    expect((error as Error).message).toMatch(REFUSAL);
    expect((error as Error).message).toContain("geometry");
    expect(isCapacityError(error)).toBe(false);
    // Nothing was left behind.
    expect(world.recordCount).toBe(0);
  });

  it("refuses a model", async () => {
    const engine = await create({ emulate: "webgl2-basic" });
    const world = engine.createWorld();
    expect(() =>
      engine.uploadModel(world, triangle(), { name: "tri" }),
    ).toThrow(REFUSAL);
  });

  it("refuses textures and queued geometry on the world's mirror", async () => {
    const engine = await create({ emulate: "webgl2-basic" });
    const { mirror } = engine.createWorld();
    expect(() =>
      mirror.textures.createTexture({
        label: "t",
        image: {} as ImageBitmap,
        srgb: true,
        mipmaps: false,
      }),
    ).toThrow(/a texture/);
    expect(() => mirror.textures.createSampler({} as never)).toThrow(
      /a sampler/,
    );
    expect(() =>
      mirror.queueUpload(0, "vertex", 0, new Float32Array(3)),
    ).toThrow(REFUSAL);
  });

  it("refuses globe imagery, and offers the layers the device has", async () => {
    const engine = await create({ emulate: "webgl2-basic" });
    const world = engine.createWorld();
    expect(world.mirror.imagery.maxLayers).toBe(256);
    expect(
      () =>
        new GlobeImagery(
          world.mirror.imagery,
          world,
          {
            name: "test",
            tilingScheme: "webMercator",
            minimumLevel: 0,
            maximumLevel: 4,
            tileSize: 256,
            tileUrl: () => "https://imagery.test/tile.png",
            attributions: [],
          },
          engine.requests,
          engine.scene.workers,
        ),
    ).toThrow(/imagery/);
  });

  it("takes no content and still clears: a world and its view work, and it comes down with the engine", async () => {
    const engine = await create({ emulate: "webgl2-basic" });
    const world = engine.createWorld();
    const { canvas, target } = canvasTarget();
    engine.addView({ target, world });
    expect(() => world.addMesh(createBox())).toThrow(REFUSAL);
    engine.renderFrame();
    expect(contextOf(canvas).called("clear")).toHaveLength(1);
    expect(world.recordCount).toBe(0);
    void v3;
  });
});

describe("the renderer option", () => {
  it('"webgl2" picks WebGL 2 where WebGPU is missing, and is not a fallback', async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const engine = await create({ renderer: "webgl2", warnings: true });
    expect(engine.choice).toMatchObject({
      renderer: "webgl2",
      reason: 'renderer: "webgl2"',
      fellBack: false,
    });
    expect(warn).not.toHaveBeenCalled();
  });

  it('"auto" falls back to WebGL 2 with a warning once, and says why', async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const first = await create({ warnings: true });
    expect(first.choice).toMatchObject({
      renderer: "webgl2",
      requested: "auto",
      reason: "WebGPU unavailable: navigator.gpu is missing",
      fellBack: true,
    });
    await create({ warnings: true });
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]![0]).toContain(
      "WebGPU unavailable: navigator.gpu is missing",
    );
  });

  it('"auto" says nothing under warnings: false', async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    await create({ warnings: false });
    expect(warn).not.toHaveBeenCalled();
  });

  it('"auto" under strict throws instead of falling back', async () => {
    await expect(create({ strict: true })).rejects.toThrow(
      'strict: WebGPU is unavailable (navigator.gpu is missing), and renderer "auto" would fall back to WebGL 2.',
    );
  });

  it('"webgpu" rejects, naming why, where WebGPU is missing', async () => {
    await expect(create({ renderer: "webgpu" })).rejects.toThrow(
      'renderer "webgpu" was asked for, but WebGPU is unavailable: navigator.gpu is missing.',
    );
  });

  it("keeps the WebGPU renderer's members off a WebGL 2 engine, naming why", async () => {
    const engine = await create({ renderer: "webgl2" });
    expect(() => engine.gpu).toThrow(
      /belongs to the WebGPU renderer, and this engine draws with WebGL 2/,
    );
    expect(() => engine.raster).toThrow(/Engine\.raster/);
    // What an app reads of a sky it doesn't have yet is undefined, not a throw.
    expect(engine.visibility).toBeUndefined();
  });
});

describe("a device below the floor", () => {
  it("rejects, naming the missing extension", async () => {
    installFakeGl(fakeGlFor("webgl2-basic", { extensions: [] }));
    const error = await create({ renderer: "webgl2" }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toContain(
      "the extension EXT_color_buffer_float",
    );
    expect((error as Error).message).toMatch(
      /^Engine\.create: renderer "webgl2" was asked for, but WebGL 2 lacks/,
    );
  });

  it("rejects, naming the limit and what is needed", async () => {
    installFakeGl(
      fakeGlFor("webgl2-basic", { limits: { maxArrayTextureLayers: 128 } }),
    );
    await expect(create({ renderer: "webgl2" })).rejects.toThrow(
      "MAX_ARRAY_TEXTURE_LAYERS is 128, and at least 256 is needed",
    );
  });

  it("rejects an emulated persona that the real context can't be", async () => {
    // The real context lacks the extension the persona needs.
    installFakeGl(fakeGlFor("webgl2-basic", { extensions: [] }));
    await expect(create({ emulate: "webgl2-basic" })).rejects.toThrow(
      /EXT_color_buffer_float/,
    );
  });

  it("rejects, naming a context, where the browser has no WebGL 2", async () => {
    installFakeGl({ noWebgl2: true });
    await expect(create({})).rejects.toThrow(
      "WebGPU is unavailable (navigator.gpu is missing), and WebGL 2 lacks a WebGL 2 context.",
    );
  });
});

describe("the inspector on the WebGL 2 device", () => {
  it("shows the device and why it was chosen, with the facts under WebGL's names", async () => {
    const engine = await create({ emulate: "webgl2-basic" });
    engine.addView({
      target: canvasTarget(80, 40).target,
      world: engine.createWorld(),
    });
    engine.renderFrame();
    const snapshot = engineSnapshot(engine, { tilesets: () => [] });
    expect(snapshot.gpu).toMatchObject({
      device: "WebGL 2 · emulating webgl2-basic",
      adapter:
        "ANGLE (Apple, ANGLE Metal Renderer: Apple M2, Unspecified Version)",
      webgl2: {
        backend: "metal",
        software: false,
        maxTextureSize: 4096,
        maxArrayTextureLayers: 256,
        maxSamples: 4,
        extensions: 1,
        emulating: "webgl2-basic",
      },
      views: 1,
    });
    // No WebGPU limits, memory pools or render targets to report.
    expect(snapshot.gpu?.limits).toBeUndefined();
    expect(snapshot.memory).toBeUndefined();
    const html = gpuHtml(snapshot.gpu!);
    expect(html).toContain("WebGL 2 · emulating webgl2-basic");
    expect(html).toContain("MAX_TEXTURE_SIZE");
    expect(html).toContain("metal");
  });

  it("says a fallback and its reason", async () => {
    const engine = await create({});
    const snapshot = engineSnapshot(engine, { tilesets: () => [] });
    expect(snapshot.gpu?.device).toBe(
      "WebGL 2 · WebGPU unavailable: navigator.gpu is missing",
    );
    expect(snapshot.gpu?.webgl2?.emulating).toBeUndefined();
  });
});
