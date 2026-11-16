// Two-phase occlusion culling of a view's draws (render/view/occlusionCull.ts,
// cull.slang): the switch, which draws it may cull, the uniforms and counters,
// the two phases on a CPU model of the kernels' test (nothing pops in), and
// the passes a tick encodes on the fake engine.
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import {
  boxHidden,
  buildPyramid,
  sphereHidden,
  type PyramidCamera,
  type PyramidLevel,
} from "../src/render/view/occlusionMath.ts";
import {
  cullsByOcclusion,
  hiddenByOcclusion,
  occlusionCullParams,
  occlusionCullingOn,
  OCCLUSION_CULL_BYTES,
} from "../src/render/view/occlusionCull.ts";
import { occludable } from "../src/render/world/bundles.ts";
import { MATERIAL_WORDS, MaterialFlags } from "../src/render/layout.ts";
import type { Engine } from "../src/scene/Engine.ts";
import { OffscreenTarget } from "../src/scene/renderTarget.ts";
import type { MeshData } from "../src/scene/meshes.ts";
import { fakeEngine } from "./fakeGpu.ts";

describe("the switch", () => {
  it("is the view's own, else the engine's", () => {
    expect(
      occlusionCullingOn(
        { occlusionCulling: "on" },
        { occlusionCulling: undefined },
      ),
    ).toBe(true);
    expect(
      occlusionCullingOn(
        { occlusionCulling: "off" },
        { occlusionCulling: undefined },
      ),
    ).toBe(false);
    expect(
      occlusionCullingOn(
        { occlusionCulling: "off" },
        { occlusionCulling: "on" },
      ),
    ).toBe(true);
    expect(
      occlusionCullingOn(
        { occlusionCulling: "on" },
        { occlusionCulling: "off" },
      ),
    ).toBe(false);
  });

  it("culls only with the depth prepass, through the cull, and without clips", () => {
    const base = {
      on: true,
      depthPrepass: true,
      indirect: true,
      clipped: false,
    };
    expect(cullsByOcclusion(base)).toBe(true);
    expect(cullsByOcclusion({ ...base, on: false })).toBe(false);
    expect(cullsByOcclusion({ ...base, depthPrepass: false })).toBe(false);
    expect(cullsByOcclusion({ ...base, indirect: false })).toBe(false);
    expect(cullsByOcclusion({ ...base, clipped: true })).toBe(false);
  });
});

describe("what may be culled", () => {
  // Material 0 opaque, 1 cut out, 2 blended with an opaque part, 3 blended whole.
  const materials = new Uint32Array(4 * MATERIAL_WORDS);
  materials[1 * MATERIAL_WORDS + 12] = MaterialFlags.alphaMask;
  materials[2 * MATERIAL_WORDS + 12] = MaterialFlags.alphaBlend;
  materials[3 * MATERIAL_WORDS + 12] =
    MaterialFlags.alphaBlend | MaterialFlags.blendedOnly;
  const batch = (over: Partial<Parameters<typeof occludable>[0]> = {}) => ({
    material: 0,
    points: false,
    patches: false,
    billboard: false,
    shader: undefined,
    mesh: { topology: "triangle-list" as GPUPrimitiveTopology },
    ...over,
  });

  it("is opaque triangles, cut out or not", () => {
    expect(occludable(batch() as never, materials)).toBe(true);
    expect(occludable(batch({ material: 1 }) as never, materials)).toBe(true);
  });

  it("is never a translucent draw: blended whole, or with its translucent part drawn later", () => {
    expect(occludable(batch({ material: 2 }) as never, materials)).toBe(false);
    expect(occludable(batch({ material: 3 }) as never, materials)).toBe(false);
  });

  it("is never a line, a point set, a patch draw, a billboard or a custom shader's draw", () => {
    const lines = batch({ mesh: { topology: "line-list" } } as never);
    expect(occludable(lines as never, materials)).toBe(false);
    expect(occludable(batch({ points: true }) as never, materials)).toBe(false);
    expect(occludable(batch({ patches: true }) as never, materials)).toBe(
      false,
    );
    expect(occludable(batch({ billboard: true }) as never, materials)).toBe(
      false,
    );
    expect(occludable(batch({ shader: {} as never }) as never, materials)).toBe(
      false,
    );
  });

  it("is what the first phase's kernels test, and nothing else", async () => {
    const { readFileSync } = await import("node:fs");
    const cull = readFileSync("src/shaders/cull.slang", "utf8");
    // The retest list takes an item only from a batch flagged occludable...
    expect(cull).toMatch(
      /occlusion\.test != 0u && occludable\(batch\) &&\s+sphereHidden\(/,
    );
    // ...the flag that writeBatches sets from `occludable`.
    const bundles = readFileSync("src/render/world/bundles.ts", "utf8");
    expect(bundles).toMatch(
      /table\[o \+ 3\] = occludable\(batch, world\.raster\.materialsU32\) \? 1 : 0;/,
    );
  });
});

describe("the uniforms and the counters", () => {
  const camera = {
    position: Float64Array.of(1e7, 2e6, -3e6),
    right: [1, 0, 0],
    up: [0, 1, 0],
    direction: [0, 0, 1],
    tanX: 0.5,
    tanY: 0.25,
    near: 0.5,
  };
  const layout = { argumentRows: 64, itemRows: 300, counterWord: 640 };

  it("sees the last camera from this tick's eye, the offset in float64", () => {
    const out = new ArrayBuffer(OCCLUSION_CULL_BYTES);
    const last = {
      ...camera,
      position: Float64Array.of(1e7 - 1.25, 2e6 + 0.5, -3e6),
      tanX: 0.6,
    };
    occlusionCullParams(
      out,
      camera,
      last,
      { width: 64, height: 48, levels: 6 },
      layout,
    );
    const f = new Float32Array(out);
    const u = new Uint32Array(out);
    // The last camera's axes, each with this eye's offset from its eye along it.
    expect([...f.subarray(0, 4)]).toEqual([1, 0, 0, 1.25]);
    expect([...f.subarray(4, 8)]).toEqual([0, 1, 0, -0.5]);
    expect([...f.subarray(8, 12)]).toEqual([0, 0, 1, 0]);
    expect(f[12]).toBeCloseTo(0.6, 6);
    // This tick's: no offset.
    expect([...f.subarray(16, 20)]).toEqual([1, 0, 0, 0]);
    expect(f[28]).toBeCloseTo(0.5, 6);
    expect([...u.subarray(32, 40)]).toEqual([64, 48, 6, 1, 64, 300, 640, 0]);
  });

  it("tests nothing in the first phase without a last pyramid", () => {
    const out = new ArrayBuffer(OCCLUSION_CULL_BYTES);
    occlusionCullParams(
      out,
      camera,
      undefined,
      { width: 64, height: 48, levels: 6 },
      layout,
    );
    expect(new Uint32Array(out)[35]).toBe(0);
  });

  it("counts what was listed less what the second phase showed again", () => {
    expect(hiddenByOcclusion([10, 4000, 3, 1000])).toEqual({
      draws: 7,
      triangles: 3000,
    });
    expect(hiddenByOcclusion([0, 0, 0, 0])).toEqual({ draws: 0, triangles: 0 });
  });
});

// A CPU model of a view's tick: camera-facing rectangles drawn at their depth,
// each with the sphere the kernels test, culled in two phases as cull.slang
// does with `sphereHidden`, its CPU mirror.
const W = 64;
const H = 48;
const FRAME: PyramidCamera = {
  frameWidth: W,
  frameHeight: H,
  tanX: 0.5,
  tanY: 0.375,
  near: 0.5,
};

interface Rect {
  name: string;
  /** Camera space: x right, y up, z forward. */
  center: [number, number, number];
  half: [number, number];
}

/** Reverse-Z depth (near / z) of the rectangles, nearest kept; the sky is 0. */
function draw(rects: readonly Rect[]): Float32Array {
  const depth = new Float32Array(W * H);
  for (const r of rects) {
    const [x, y, z] = r.center;
    const px = (v: number) => ((v / z / FRAME.tanX) * 0.5 + 0.5) * W;
    const py = (v: number) => (0.5 - (v / z / FRAME.tanY) * 0.5) * H;
    const x0 = px(x - r.half[0]);
    const x1 = px(x + r.half[0]);
    const y0 = py(y + r.half[1]);
    const y1 = py(y - r.half[1]);
    for (let j = 0; j < H; j++) {
      for (let i = 0; i < W; i++) {
        if (i + 0.5 >= x0 && i + 0.5 < x1 && j + 0.5 >= y0 && j + 0.5 < y1) {
          depth[j * W + i] = Math.max(depth[j * W + i]!, FRAME.near / z);
        }
      }
    }
  }
  return depth;
}

const pyramidOf = (depth: Float32Array) =>
  buildPyramid(W, H, (x, y) => depth[y * W + x]!);

const hidden = (levels: PyramidLevel[], r: Rect) =>
  sphereHidden(levels, FRAME, r.center, Math.hypot(...r.half));

/** One tick: what each phase drew, the image, and the pyramid it leaves. */
function tick(rects: readonly Rect[], last: PyramidLevel[] | undefined) {
  const first = rects.filter((r) => !last || !hidden(last, r));
  const listed = rects.filter((r) => !first.includes(r));
  const firstDepth = draw(first);
  const second = listed.filter((r) => !hidden(pyramidOf(firstDepth), r));
  const image = draw([...first, ...second]);
  return {
    first: first.map((r) => r.name),
    second: second.map((r) => r.name),
    image,
    pyramid: pyramidOf(image),
  };
}

describe("the two phases", () => {
  const wall: Rect = { name: "wall", center: [0, 0, 5], half: [2, 2] };
  const behind: Rect = { name: "behind", center: [0.5, 0, 40], half: [2, 2] };
  const beside: Rect = { name: "beside", center: [14, 0, 40], half: [2, 2] };

  it("culls what the last depth hid while it stays hidden", () => {
    const one = tick([wall, behind, beside], undefined);
    // No last pyramid: everything in the first phase.
    expect(one.first).toEqual(["wall", "behind", "beside"]);
    const two = tick([wall, behind, beside], one.pyramid);
    expect(two.first).toEqual(["wall", "beside"]);
    expect(two.second).toEqual([]);
    expect(two.image).toEqual(draw([wall, behind, beside]));
  });

  it("draws in the same tick what the last depth hid and this one doesn't: nothing pops", () => {
    const one = tick([wall, behind, beside], undefined);
    const two = tick([wall, behind, beside], one.pyramid);
    // The wall moves aside: the last pyramid still hides `behind`.
    const moved: Rect = { ...wall, center: [-20, 0, 5] };
    const three = tick([moved, behind, beside], two.pyramid);
    expect(three.first).toEqual(["wall", "beside"]);
    // The second phase tests it against this tick's first depth: drawn.
    expect(three.second).toEqual(["behind"]);
    expect(three.image).toEqual(draw([moved, behind, beside]));
    // And the next tick draws it in the first phase.
    expect(tick([moved, behind, beside], three.pyramid).first).toContain(
      "behind",
    );
  });

  it("draws what the last pyramid wrongly hid (a camera cut), in the second phase", () => {
    // A pyramid all near: every sphere it sees is hidden.
    const cut = buildPyramid(W, H, () => 1);
    const t = tick([wall, behind, beside], cut);
    expect(t.first).toEqual([]);
    // The first phase drew nothing: an empty pyramid hides nothing.
    expect(t.second).toEqual(["wall", "behind", "beside"]);
    expect(t.image).toEqual(draw([wall, behind, beside]));
  });

  it("never hides a sphere with no bound", () => {
    const near = buildPyramid(W, H, () => 1);
    expect(sphereHidden(near, FRAME, [0, 0, 40], 3e38)).toBe(false);
    expect(sphereHidden(near, FRAME, [0, 0, 40], Number.NaN)).toBe(false);
  });
});

describe("the draws' test", () => {
  // A wall over the frame below row 14, 5 m away; sky above it.
  const levels = buildPyramid(W, H, (_x, y) => (y >= 14 ? 0.1 : 0));
  const sphere = { center: [0.3, -1, 20], radius: 2 };

  it("reads a finer level than the tile queries: their 2 × 2 texels reach the sky", () => {
    const { center, radius } = sphere;
    const box = { center, axes: [radius, 0, 0, 0, radius, 0, 0, 0, radius] };
    expect(boxHidden(levels, FRAME, box)).toBe(false);
    expect(sphereHidden(levels, FRAME, center, radius)).toBe(true);
  });

  it("is the same box test: a window of 2 is the tile queries'", () => {
    const { center, radius } = sphere;
    const box = { center, axes: [radius, 0, 0, 0, radius, 0, 0, 0, radius] };
    expect(boxHidden(levels, FRAME, box, undefined, 2)).toBe(false);
    expect(boxHidden(levels, FRAME, box, undefined, 8)).toBe(true);
    // In front of the wall, never.
    expect(sphereHidden(levels, FRAME, [0.3, -1, 3], 0.5)).toBe(false);
  });
});

describe("the pyramid of a single-sampled depth", () => {
  it("folds the ring round each block, so a sample past an edge isn't hidden by its center", () => {
    // A near wall over the pixels x < 8, sky beyond. Level-0 texel 3 covers
    // pixels 6 and 7, all wall at their centers; but pixel 7's samples near
    // its right edge may see past the wall's edge, as pixel 8's center does.
    const edge = (x: number) => (x < 8 ? 0.5 : 0);
    expect(buildPyramid(W, H, edge)[0]!.texels[3]).toBe(0.5);
    // With the ring it takes pixel 8 too: it doesn't claim the wall.
    expect(buildPyramid(W, H, edge, true)[0]!.texels[3]).toBe(0);
    // Away from the edge it still does.
    expect(buildPyramid(W, H, edge, true)[0]!.texels[2]).toBe(0.5);
  });
});

describe("a tick on the fake engine", () => {
  let engine: Engine;
  const square: MeshData = {
    positions: new Float32Array([
      -0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0,
    ]),
    normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1]),
    uvs: new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]),
    indices: new Uint32Array([0, 1, 2, 0, 2, 3]),
  };
  /** What the frame's encoders saw: passes, pipelines, bundles' draw offsets. */
  const seen = {
    passes: [] as string[],
    pipelines: [] as unknown[],
    retestDraws: [] as number[],
  };

  beforeAll(async () => {
    engine = await fakeEngine();
    const device = engine.gpu.device as unknown as Record<string, unknown>;
    const createEncoder = device.createCommandEncoder as (
      d?: GPUCommandEncoderDescriptor,
    ) => GPUCommandEncoder;
    device.createCommandEncoder = (d?: GPUCommandEncoderDescriptor) => {
      const enc = createEncoder(d) as unknown as Record<string, unknown>;
      const beginCompute = enc.beginComputePass as (
        d?: GPUComputePassDescriptor,
      ) => GPUComputePassEncoder;
      const beginRender = enc.beginRenderPass as (
        d: GPURenderPassDescriptor,
      ) => GPURenderPassEncoder;
      enc.beginComputePass = (desc?: GPUComputePassDescriptor) => {
        seen.passes.push(String(desc?.label ?? "compute"));
        const pass = beginCompute(desc) as unknown as Record<string, unknown>;
        pass.setPipeline = (p: GPUComputePipeline) => {
          seen.pipelines.push(p);
        };
        return pass as unknown as GPUComputePassEncoder;
      };
      enc.beginRenderPass = (desc: GPURenderPassDescriptor) => {
        seen.passes.push(String(desc.label));
        return beginRender(desc);
      };
      return enc as unknown as GPUCommandEncoder;
    };
    const createBundle = device.createRenderBundleEncoder as (
      d: GPURenderBundleEncoderDescriptor,
    ) => GPURenderBundleEncoder;
    device.createRenderBundleEncoder = (
      d: GPURenderBundleEncoderDescriptor,
    ) => {
      const encoder = createBundle(d) as unknown as Record<string, unknown>;
      if (d.label === "world.bundle.retest") {
        encoder.drawIndexedIndirect = (_: GPUBuffer, offset: number) => {
          seen.retestDraws.push(offset);
        };
      }
      return encoder as unknown as GPURenderBundleEncoder;
    };
  });

  afterEach(() => {
    engine.occlusionCulling = "on";
  });

  function scene() {
    const world = engine.createWorld({
      maxDraws: 64,
      vertexBytes: 1 << 18,
      indexBytes: 1 << 18,
    });
    const opaque = world.addDraw({
      mesh: world.addMesh(square),
      origin: Float64Array.of(0, 0, 10),
    });
    const glass = world.materialWithFlags(
      world.addMaterial({}),
      MaterialFlags.alphaBlend | MaterialFlags.blendedOnly,
    );
    const translucent = world.addDraw({
      mesh: world.addMesh(square),
      origin: Float64Array.of(0, 1, 10),
      material: glass,
    });
    const view = engine.addView({ target: new OffscreenTarget(64, 48), world });
    view.camera.position.set([0, 0, 0]);
    view.camera.direction.set([0, 0, 1]);
    view.camera.orient(Float64Array.of(0, 1, 0));
    view.camera.version++;
    const render = () => {
      seen.passes = [];
      seen.pipelines = [];
      seen.retestDraws = [];
      view.camera.version++;
      engine.renderFrame();
    };
    const done = () => {
      engine.removeView(view);
      world.destroy();
    };
    return { world, view, opaque, translucent, render, done };
  }

  it("culls in two phases when on", () => {
    const { world, opaque, translucent, render, done } = scene();
    render();
    const { pipelines } = engine.ctx;
    expect(seen.pipelines).toContain(pipelines.cullRecordsOccluded);
    expect(seen.pipelines).toContain(pipelines.retestOccluded);
    expect(seen.pipelines).not.toContain(pipelines.cullRecords);
    // The first phase's depth, then its pyramid and the second phase, before the opaque pass.
    const at = (label: string) => seen.passes.indexOf(label);
    expect(at("occlusion-depth")).toBeGreaterThan(-1);
    expect(at("hzb")).toBeGreaterThan(at("occlusion-depth"));
    expect(at("occlusion-retest")).toBeGreaterThan(at("hzb"));
    expect(at("opaque")).toBeGreaterThan(at("occlusion-retest"));
    // The second phase's bundle draws the opaque batch from its second set,
    // never the translucent one.
    const args = world.raster.drawArguments;
    const rows = args.occlusionLayout.argumentRows;
    expect(seen.retestDraws).toEqual([rows * 20 + args.slotOf(opaque.index)]);
    expect(seen.retestDraws).not.toContain(
      rows * 20 + args.slotOf(translucent.index),
    );
    done();
  });

  it("splits the ambient-occlusion prepass into the two phases, with no depth pass of its own", () => {
    const { view, render, done } = scene();
    view.ambientOcclusion = true;
    render();
    const { pipelines } = engine.ctx;
    expect(seen.passes).not.toContain("occlusion-depth");
    // The prepass's first phase, the pyramid of its single-sampled depth,
    // the second phase, then the prepass's second phase, then the opaque pass.
    const prepass = seen.passes.indexOf("prepass");
    const hzb = seen.passes.indexOf("hzb");
    const retest = seen.passes.indexOf("occlusion-retest");
    const again = seen.passes.indexOf("prepass", prepass + 1);
    const opaque = seen.passes.indexOf("opaque");
    expect(prepass).toBeGreaterThan(-1);
    expect(hzb).toBeGreaterThan(prepass);
    expect(retest).toBeGreaterThan(hzb);
    expect(again).toBeGreaterThan(retest);
    expect(opaque).toBeGreaterThan(again);
    expect(seen.pipelines).toContain(pipelines.hzbLevel0Pixels);
    expect(seen.pipelines).not.toContain(pipelines.hzbLevel0);
    // One pyramid a tick.
    expect(seen.passes.filter((p) => p === "hzb")).toHaveLength(1);
    done();
  });

  it("builds the pyramid once a tick from its own depth pass without the prepass", () => {
    const { render, done } = scene();
    render();
    expect(seen.passes.filter((p) => p === "hzb")).toHaveLength(1);
    expect(seen.pipelines).toContain(engine.ctx.pipelines.hzbLevel0);
    done();
  });

  it("culls by the frustum alone when off, for the engine or the view", () => {
    for (const off of ["engine", "view"] as const) {
      const { view, render, done } = scene();
      if (off === "engine") {
        engine.occlusionCulling = "off";
      } else {
        view.occlusionCulling = "off";
      }
      render();
      const { pipelines } = engine.ctx;
      expect(seen.pipelines).toContain(pipelines.cullRecords);
      expect(seen.pipelines).not.toContain(pipelines.cullRecordsOccluded);
      expect(seen.pipelines).not.toContain(pipelines.retestOccluded);
      expect(seen.passes).not.toContain("occlusion-depth");
      expect(seen.passes).not.toContain("occlusion-retest");
      expect(engine.occlusionCullStats.views).toBe(0);
      done();
    }
  });
});
