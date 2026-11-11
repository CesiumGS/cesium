// A b-rep as a world's draws (World.addBrep, provisional): its complete faces
// are one patch draw that the view's cull and dice feed, the rest a CPU mesh.
import { beforeAll, describe, expect, it } from "vitest";
import {
  PLACEMENT_MONOMIALS,
  PLACEMENT_TERMS,
} from "../src/scene/placement.ts";
import { DrawRecordLayout } from "../src/render/generated/layouts.ts";
import { FLAGS_WORD, RECORD_WORDS, RecordFlags } from "../src/render/layout.ts";
import type { Engine } from "../src/scene/Engine.ts";
import { placementBounds } from "../src/scene/world/patches.ts";
import type { WarpTerms } from "../src/scene/warpTerms.ts";
import { prepareGpuPatches, tessellateBrep } from "../src/brep/index.ts";
import type { DrawHandle } from "../src/scene/world/types.ts";
import { boxBrep, cappedCylinderBrep } from "./brepFixtures.ts";
import { fakeEngine } from "./fakeGpu.ts";

interface Recorded {
  readonly name: string;
  readonly args: readonly unknown[];
}

/** A compute pass that records what the cull and the dice ask of it. */
function recordingEncoder(calls: Recorded[]): GPUCommandEncoder {
  const pass = new Proxy(
    {},
    {
      get:
        (_t, name: string) =>
        (...args: unknown[]) => {
          calls.push({ name, args });
        },
    },
  );
  return {
    clearBuffer: () => undefined,
    beginComputePass: () => pass,
  } as unknown as GPUCommandEncoder;
}

describe("World.addBrep", () => {
  let engine: Engine;
  const drawn: Recorded[] = [];

  beforeAll(async () => {
    engine = await fakeEngine();
    const device = engine.gpu.device as unknown as Record<string, unknown>;
    const create = device.createRenderBundleEncoder as (
      d: GPURenderBundleEncoderDescriptor,
    ) => GPURenderBundleEncoder;
    device.createRenderBundleEncoder = (
      d: GPURenderBundleEncoderDescriptor,
    ) => {
      const encoder = create(d) as unknown as Record<string, unknown>;
      if (d.label === "world.bundle") {
        for (const name of ["setPipeline", "setVertexBuffer", "drawIndirect"]) {
          encoder[name] = (...args: unknown[]) => {
            drawn.push({ name, args });
          };
        }
      }
      return encoder as unknown as GPURenderBundleEncoder;
    };
  });
  const options = { maxDraws: 64, vertexBytes: 1 << 20, indexBytes: 1 << 20 };

  it("draws a capped cylinder's side and its caps all from the GPU: the caps' trim as a draw of its own", () => {
    const world = engine.createWorld(options);
    const brep = world.addBrep(cappedCylinderBrep());
    expect(brep.gpuFaces).toEqual([0, 1, 2]);
    expect(brep.trimmedFaces).toEqual([1, 2]);
    expect(brep.cpuFaces).toEqual([]);
    expect(brep.unsupported).toEqual([]);
    expect(brep.patches).toBeDefined();
    expect(brep.trimmed).toBeDefined();
    expect(brep.mesh).toBeUndefined();
    const o = brep.patches!.index * RECORD_WORDS;
    const u = world.raster.recordsU32;
    expect(u[o + FLAGS_WORD]! & RecordFlags.patches).toBe(RecordFlags.patches);
    // The side is four quarter-turn spans; the record counts them.
    expect(u[o + DrawRecordLayout.indexCount / 4]).toBe(4);
    expect(
      u[brep.trimmed!.index * RECORD_WORDS + FLAGS_WORD]! & RecordFlags.patches,
    ).toBe(RecordFlags.patches);
    // A patch draw batches alone, with its own chunk list.
    const draw = world.raster.patchDraws.get(brep.patches!.index)!;
    expect(draw.batch.patches).toBe(true);
    expect(draw.batch.chunks).toBe(draw.chunks);
    expect(draw.batch.items).toBe(1);
    expect(draw.mesh.patches.spans).toBe(4);
    expect(draw.mesh.patches.trimmed).toBe(false);
    const trimmed = world.raster.patchDraws.get(brep.trimmed!.index)!;
    expect(trimmed.mesh.patches.trimmed).toBe(true);
    expect(trimmed.mesh.patches.spans).toBe(2);
    world.removeBrep(brep);
    expect(world.raster.patchDraws.size).toBe(0);
    world.destroy();
  });

  it("sends the trimmed faces to a CPU mesh when asked: cpuFaces 'trimmed', the diagnostic split", () => {
    const world = engine.createWorld(options);
    const brep = world.addBrep(cappedCylinderBrep(), { cpuFaces: "trimmed" });
    expect(brep.gpuFaces).toEqual([0]);
    expect(brep.trimmedFaces).toEqual([]);
    expect(brep.cpuFaces).toEqual([1, 2]);
    expect(brep.trimmed).toBeUndefined();
    expect(brep.mesh).toBeDefined();
    expect(
      world.raster.recordsU32[brep.mesh!.index * RECORD_WORDS + FLAGS_WORD]! &
        RecordFlags.patches,
    ).toBe(0);
    world.removeBrep(brep);
    world.destroy();
  });

  it("draws a box's faces all from the GPU, with no CPU mesh", () => {
    const world = engine.createWorld(options);
    const brep = world.addBrep(boxBrep());
    expect(brep.gpuFaces).toEqual([0, 1, 2, 3, 4, 5]);
    expect(brep.cpuFaces).toEqual([]);
    expect(brep.mesh).toBeUndefined();
    world.removeBrep(brep);
    world.destroy();
  });

  it("gives back its arena ranges when removed", () => {
    const world = engine.createWorld(options);
    const before = world.arenaBytes;
    const brep = world.addBrep(cappedCylinderBrep());
    expect(world.arenaBytes).toBeGreaterThan(before);
    world.removeBrep(brep);
    expect(world.arenaBytes).toBe(before);
    world.destroy();
  });

  it("draws the patch batch with its chunks and indirect arguments, in the patch pipelines", () => {
    const world = engine.createWorld(options);
    const brep = world.addBrep(boxBrep());
    drawn.length = 0;
    world.prepareFrame();
    const draw = world.raster.patchDraws.get(brep.patches!.index)!;
    const pipelines = engine.ctx.pipelines;
    expect(drawn.find((c) => c.name === "setPipeline")!.args[0]).toBe(
      pipelines.opaquePatch,
    );
    expect(drawn.find((c) => c.name === "setVertexBuffer")!.args[1]).toBe(
      draw.chunks,
    );
    expect(drawn.find((c) => c.name === "drawIndirect")!.args[1]).toBe(
      world.raster.drawArguments.slotOf(brep.patches!.index),
    );
    world.removeBrep(brep);
    world.destroy();
  });

  it("draws a trimmed face's batch in the trimmed pipelines, the others in the others", () => {
    const world = engine.createWorld(options);
    const brep = world.addBrep(cappedCylinderBrep());
    drawn.length = 0;
    world.prepareFrame();
    const pipelines = engine.ctx.pipelines;
    const set = drawn
      .filter((c) => c.name === "setPipeline")
      .map((c) => c.args[0]);
    expect(set).toContain(pipelines.opaquePatch);
    expect(set).toContain(pipelines.opaquePatchTrimmed);
    // Each batch's chunk list is its own: the trimmed one's is bound with its pipeline.
    const trimmed = world.raster.patchDraws.get(brep.trimmed!.index)!;
    expect(
      drawn.some(
        (c) => c.name === "setVertexBuffer" && c.args[1] === trimmed.chunks,
      ),
    ).toBe(true);
    world.removeBrep(brep);
    world.destroy();
  });

  it("dices each patch draw in the view's cull pass, after the cull", () => {
    const world = engine.createWorld(options);
    const brep = world.addBrep(boxBrep());
    const calls: Recorded[] = [];
    world.prepareFrame();
    world.encodeCull(recordingEncoder(calls), undefined, false);
    const names = calls.map((c) => c.name);
    const pipelines = engine.ctx.pipelines;
    const set = calls
      .filter((c) => c.name === "setPipeline")
      .map((c) => c.args[0]);
    expect(set).toEqual([
      pipelines.cullRecords,
      pipelines.writeDrawArgs,
      pipelines.dicePatches,
      pipelines.writePatchArgs,
    ]);
    const draw = world.raster.patchDraws.get(brep.patches!.index)!;
    expect(
      calls.some((c) => c.name === "setBindGroup" && c.args[1] === draw.group),
    ).toBe(true);
    // A thread a span, 64 a group: six spans, one group; then the arguments.
    const dispatches = calls.filter((c) => c.name === "dispatchWorkgroups");
    expect(dispatches.at(-2)!.args).toEqual([1]);
    expect(dispatches.at(-1)!.args).toEqual([1]);
    expect(names.indexOf("setPipeline")).toBeLessThan(
      names.lastIndexOf("dispatchWorkgroups"),
    );
    world.removeBrep(brep);
    world.destroy();
  });

  it("refuses an option that doesn't fit, and takes nothing", () => {
    const world = engine.createWorld(options);
    const before = world.arenaBytes;
    expect(() => world.addBrep(boxBrep(), { errorPixels: -1 })).toThrow(
      /errorPixels/,
    );
    expect(world.arenaBytes).toBe(before);
    expect(world.raster.patchDraws.size).toBe(0);
    world.destroy();
  });

  it("places the patch draw and the CPU mesh in the same frame", () => {
    const world = engine.createWorld(options);
    const form = cappedCylinderBrep();
    // A quarter turn about z, and the form's origin 10 m along x.
    const model = Float64Array.of(
      0,
      1,
      0,
      0,
      -1,
      0,
      0,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      0,
      1,
    );
    const brep = world.addBrep(form, {
      origin: Float64Array.of(10, 0, 0),
      model,
      cpuFaces: "trimmed",
    });
    const gpu = world.addBrep(form, {
      origin: Float64Array.of(10, 0, 0),
      model,
    });
    // Each draw's model space is the form's less its own origin.
    const world3 = (
      draw: DrawHandle,
      form3: number[],
      origin: ArrayLike<number>,
    ) => {
      const m = world.drawMatrix(draw)!;
      const local = form3.map((x, k) => x - origin[k]!);
      return [0, 1, 2].map(
        (k) =>
          m[k]! * local[0]! +
          m[4 + k]! * local[1]! +
          m[8 + k]! * local[2]! +
          m[12 + k]!,
      );
    };
    // (x, y, z) in the form is (10 − y, x, z) in the world.
    const patchOrigin = prepareGpuPatches(form).origin;
    const seam = world3(brep.patches!, [1, 0, 3], patchOrigin);
    expect(seam[0]).toBeCloseTo(10, 6);
    expect(seam[1]).toBeCloseTo(1, 6);
    expect(seam[2]).toBeCloseTo(3, 6);
    const meshOrigin = tessellateBrep(form, {
      tolerance: 1e-3,
      faces: (face) => face > 0,
    }).origin;
    const cap = world3(brep.mesh!, [0, 1, 3], meshOrigin);
    expect(cap[0]).toBeCloseTo(9, 6);
    expect(cap[1]).toBeCloseTo(0, 6);
    expect(cap[2]).toBeCloseTo(3, 6);
    // The trimmed patch draw puts the cap's point in the same place.
    const trimmedCap = world3(gpu.trimmed!, [0, 1, 3], patchOrigin);
    expect(trimmedCap[0]).toBeCloseTo(9, 6);
    expect(trimmedCap[1]).toBeCloseTo(0, 6);
    expect(trimmedCap[2]).toBeCloseTo(3, 6);
    world.removeBrep(brep);
    world.removeBrep(gpu);
    world.destroy();
  });
  it("hangs the draws off child transforms of a shared transform, and removes them", () => {
    const world = engine.createWorld(options);
    const shared = world.addTransform(
      Float64Array.of(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 5, 0, 0, 1),
    );
    const brep = world.addBrep(cappedCylinderBrep(), { transform: shared });
    expect(brep.transforms).toHaveLength(2);
    expect(
      world.addBrep(boxBrep(), { transform: shared }).transforms,
    ).toHaveLength(1);
    expect(() =>
      world.addBrep(boxBrep(), {
        transform: shared,
        origin: Float64Array.of(1, 0, 0),
      }),
    ).toThrow(/not with/);
    world.removeBrep(brep);
    expect(world.transformAlive(brep.transforms[0]!)).toBe(false);
    world.destroy();
  });

  it("changes a patch draw's target error", () => {
    const world = engine.createWorld(options);
    const brep = world.addBrep(boxBrep());
    world.setPatchErrorPixels(brep.patches!, 0.25);
    expect(world.raster.patchDraws.get(brep.patches!.index)!.errorPixels).toBe(
      0.25,
    );
    expect(() => world.setPatchErrorPixels(brep.patches!, 0)).toThrow(
      RangeError,
    );
    world.removeBrep(brep);
    world.destroy();
  });
});

describe("placementBounds", () => {
  const lattice = (coefficient: (monomial: readonly number[]) => number[]) => {
    const coefficients = new Float64Array(PLACEMENT_TERMS * 3);
    PLACEMENT_MONOMIALS.forEach((m, k) =>
      coefficients.set(coefficient(m), k * 3),
    );
    return {
      kind: "cubic" as const,
      center: [0, 0, 0],
      scale: 10,
      cells: 1,
      coefficients,
      errorBound: 0,
      estimate: false,
    };
  };
  const at = (terms: WarpTerms) =>
    placementBounds({ terms, center: [0, 0, 0], base: 1 });

  it("is 1 and 0 without a placement", () => {
    expect(placementBounds(undefined)).toEqual({ jacobian: 1, curvature: 0 });
  });

  it("adds a weighted lattice's derivative to the jacobian and its second derivative to the curvature", () => {
    // d = 0.1 x + 0.2 x²: derivative 0.1 + 0.4 v, second 0.4, per 10 m.
    const term = lattice(([a, b, c]) =>
      a === 1 && b === 0 && c === 0
        ? [0.1, 0, 0]
        : a === 2 && b === 0 && c === 0
          ? [0.2, 0, 0]
          : [0, 0, 0],
    );
    const bounds = at([{ term, weight: { scale: 2, factors: [] } }]);
    // The cube's whole reach (v up to 1): 1 + 2 · (0.1 + 0.4) / 10.
    expect(bounds.jacobian).toBeCloseTo(1.1, 12);
    expect(bounds.curvature).toBeCloseTo((2 * 0.2 * 2) / 100, 12);
  });
});
