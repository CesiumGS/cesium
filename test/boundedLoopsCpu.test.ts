// The CPU side of the Slang loops' constant bounds (test/boundedLoops.test.ts,
// AGENTS.md's GPU safety): where a constant caps a count the CPU writes, the
// CPU holds the same number, and at the cap it refuses, reroutes or reports,
// never silently drops what's past it.
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  MAX_MARCH_STEPS,
  marchSteps,
} from "../packages/core/src/atmosphere/RealtimeAtmosphere.ts";
import { SAMPLES_PER_DISPATCH as ATMOSPHERE_PATHS } from "../packages/core/src/atmosphere/AtmosphereReference.ts";
import {
  IblReference,
  MAX_REFERENCE_SPHERES,
  SAMPLES_PER_DISPATCH as IBL_SAMPLES,
  type IblReferenceOptions,
} from "../packages/core/src/lighting/IblReference.ts";
import { SH_SOURCE_TEXELS } from "../packages/core/src/gpu/Environment.ts";
import {
  DEPTH_RANGE_STEPS,
  depthRangeGroups,
} from "../packages/core/src/render/view/outputPasses.ts";
import {
  MAX_LIST_WALK,
  readListCounts,
} from "../packages/core/src/render/view/translucency.ts";
import {
  MAX_POOL_PARTS,
  ModelPool,
} from "../packages/core/src/vector/ModelPool.ts";
import {
  MAX_TERM_FACTORS,
  PlacementRows,
} from "../packages/core/src/scene/placementTable.ts";
import {
  MAX_CURVILINEAR_TERMS,
  constantWeight,
  type CurvilinearTerms,
  type WeightedTerm,
} from "../packages/core/src/scene/curvilinearTerms.ts";
import { MAX_GPU_DEGREE } from "../packages/core/src/brep/gpuPatches.ts";
import { MAX_BAND_PIECES } from "../packages/core/src/brep/gpuTrims.ts";
import { prepareGpuPatches } from "../packages/core/src/brep/index.ts";
import type { Engine } from "../packages/core/src/scene/Engine.ts";
import { cappedCylinderBrep } from "./brepFixtures.ts";
import { fakeEngine } from "./fakeGpu.ts";

/** The value of `static const <type> name = <integer expression>;` in a Slang source. */
function slangConstant(path: string, name: string): number {
  const code = readFileSync(
    new URL(`../packages/core/src/${path}`, import.meta.url),
    "utf8",
  );
  const m = new RegExp(
    String.raw`static\s+const\s+\w+\s+${name}\s*=\s*([^;]+);`,
  ).exec(code);
  if (!m) {
    throw new Error(`${path} has no static const ${name}`);
  }
  const expression = m[1]!.replace(/(\d+)u\b/g, "$1");
  if (!/^[\d\s*+()-]+$/.test(expression)) {
    throw new Error(
      `${path} ${name} = ${m[1]} isn't a plain integer expression`,
    );
  }
  return Function(`return (${expression});`)() as number;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("the Slang caps and the CPU agree", () => {
  it.each([
    ["atmosphere/air.slang", "MAX_MARCH_STEPS", MAX_MARCH_STEPS],
    ["atmosphere/reference.slang", "MAX_PATHS_PER_DISPATCH", ATMOSPHERE_PATHS],
    ["lighting/iblReference.slang", "MAX_SAMPLES_PER_DISPATCH", IBL_SAMPLES],
    [
      "lighting/iblReference.slang",
      "MAX_REFERENCE_SPHERES",
      MAX_REFERENCE_SPHERES,
    ],
    ["shaders/depthRange.slang", "DEPTH_RANGE_STEPS", DEPTH_RANGE_STEPS],
    ["shaders/composite.slang", "MAX_LIST_WALK", MAX_LIST_WALK],
    ["vector/modelPool.slang", "MAX_POOL_PARTS", MAX_POOL_PARTS],
    ["shaders/placement.slang", "MAX_PLACEMENT_TERMS", MAX_CURVILINEAR_TERMS],
    ["shaders/placement.slang", "MAX_TERM_FACTORS", MAX_TERM_FACTORS],
    ["shaders/patch.slang", "MAX_PATCH_DEGREE", MAX_GPU_DEGREE],
    ["shaders/coverage.slang", "MAX_BAND_PIECES", MAX_BAND_PIECES],
  ])("%s %s is the CPU's %d", (path, name, value) => {
    expect(slangConstant(path, name)).toBe(value);
  });

  it("the SH projection reads every texel of the face Environment.ts gives it", () => {
    expect(SH_SOURCE_TEXELS).toBe(32 * 32);
    expect(
      slangConstant("shaders/ibl.slang", "MAX_SH_TEXELS"),
    ).toBeGreaterThanOrEqual(SH_SOURCE_TEXELS);
  });

  it("a span's chunks never reach the dice's cap (MAX_CELLS a side)", () => {
    const cells = slangConstant("shaders/patch.slang", "MAX_CELLS");
    const chunk = slangConstant("shaders/patch.slang", "CHUNK_CELLS");
    const code = readFileSync(
      new URL("../packages/core/src/shaders/dice.slang", import.meta.url),
      "utf8",
    );
    expect(code).toMatch(
      /MAX_SPAN_CHUNKS = \(MAX_CELLS \/ CHUNK_CELLS\) \* \(MAX_CELLS \/ CHUNK_CELLS\);/,
    );
    expect(Math.ceil(cells / chunk) ** 2).toBe((cells / chunk) ** 2);
  });
});

describe("a probe's march steps (air.slang MAX_MARCH_STEPS)", () => {
  it("takes 1 to MAX_MARCH_STEPS and refuses past them, naming the cap", () => {
    expect(marchSteps(1)).toBe(1);
    expect(marchSteps(MAX_MARCH_STEPS)).toBe(MAX_MARCH_STEPS);
    expect(() => marchSteps(MAX_MARCH_STEPS + 1)).toThrow(
      /steps is 1025; it takes a whole number from 1 to 1024/,
    );
    expect(() => marchSteps(0)).toThrow(RangeError);
    expect(() => marchSteps(1.5)).toThrow(RangeError);
    expect(() => marchSteps(Number.NaN)).toThrow(RangeError);
  });
});

describe("the depth range's workgroups (depthRange.slang DEPTH_RANGE_STEPS)", () => {
  it("are 8 × 8 up to 8,192 pixels a side, and more past it: every pixel read", () => {
    const reach = 16 * DEPTH_RANGE_STEPS;
    expect(depthRangeGroups(1920, 1080)).toEqual([8, 8]);
    expect(depthRangeGroups(8 * reach, 8 * reach)).toEqual([8, 8]);
    expect(depthRangeGroups(8 * reach + 1, 1)).toEqual([9, 8]);
    for (const size of [1, 1023, 8192, 8193, 16384, 16385, 32768]) {
      const [x, y] = depthRangeGroups(size, size);
      expect(x * reach).toBeGreaterThanOrEqual(size);
      expect(y * reach).toBeGreaterThanOrEqual(size);
    }
  });
});

describe("the composite's list walk (composite.slang MAX_LIST_WALK)", () => {
  const raster = () => ({
    listCountPending: true,
    listNodes: 100,
    listWalksCut: 0,
  });

  it("grows the lists from the count, and reads no cut from a whole walk", () => {
    const r = raster();
    const render = vi.fn();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    readListCounts(r, Uint32Array.of(200, 0), render);
    expect(r).toEqual({
      listCountPending: false,
      listNodes: 250,
      listWalksCut: 0,
    });
    expect(render).toHaveBeenCalledTimes(1);
    readListCounts(r, Uint32Array.of(10, 0), render);
    expect(r.listNodes).toBe(250);
    expect(render).toHaveBeenCalledTimes(1);
    expect(warn).not.toHaveBeenCalled();
  });

  it("counts a cut walk and reports it once", () => {
    const r = raster();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    readListCounts(r, Uint32Array.of(10, 1), () => {});
    readListCounts(r, Uint32Array.of(10, 1), () => {});
    expect(r.listWalksCut).toBe(2);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]![0]).toContain(
      `more than ${MAX_LIST_WALK} translucent layers`,
    );
  });
});

describe("a placement block's terms (placement.slang MAX_PLACEMENT_TERMS)", () => {
  const term = (factors: number): WeightedTerm => ({
    term: {
      kind: "attribute",
      semantic: "OFFSET",
      absolute: false,
      maxDistance: 1,
    },
    weight: {
      ...constantWeight(1),
      factors: Array.from({ length: factors }, () => ({
        parameter: { value: 0 } as never,
        offset: 0,
        slope: 1,
      })),
    },
  });

  it("packs MAX_CURVILINEAR_TERMS terms of MAX_TERM_FACTORS factors", () => {
    const rows = new PlacementRows(64);
    const terms: CurvilinearTerms = Array.from(
      { length: MAX_CURVILINEAR_TERMS },
      () => term(MAX_TERM_FACTORS),
    );
    rows.pack(terms, 0, () => 0);
    expect(rows.words(0, 1).u32[0]).toBe(MAX_CURVILINEAR_TERMS);
  });

  it("refuses a block past them, which the vertex stage would draw short", () => {
    const rows = new PlacementRows(64);
    expect(() =>
      rows.pack(
        Array.from({ length: MAX_CURVILINEAR_TERMS + 1 }, () => term(0)),
        0,
        () => 0,
      ),
    ).toThrow(/at most 3 terms of at most 2 factors/);
    expect(() => rows.pack([term(MAX_TERM_FACTORS + 1)], 0, () => 0)).toThrow(
      RangeError,
    );
  });
});

describe("the IBL reference's spheres (iblReference.slang MAX_REFERENCE_SPHERES)", () => {
  it("refuses more than MAX_REFERENCE_SPHERES before any GPU work", async () => {
    const reference = Object.create(IblReference.prototype) as IblReference;
    const sphere = {
      center: [0, 0, 0],
      radius: 1,
      baseColor: [1, 1, 1],
      metallic: 0,
      roughness: 1,
    };
    const options = {
      width: 1,
      height: 1,
      camera: { position: [0, 0, 0] },
      spheres: Array.from({ length: MAX_REFERENCE_SPHERES + 1 }, () => sphere),
      samples: 64,
    } as unknown as IblReferenceOptions;
    await expect(reference.render(options)).rejects.toThrow(
      /65 spheres; it takes at most 64/,
    );
  });
});

describe("a model pool's parts (modelPool.slang MAX_POOL_PARTS)", () => {
  it("refuses a model of more parts, and removes what it placed", () => {
    const remove = vi.fn();
    const model = {
      place: () => ({
        draws: Array.from({ length: MAX_POOL_PARTS + 1 }, () => ({})),
        instanceFrames: [],
        remove,
      }),
    };
    const engine = { gpu: { device: {} } } as unknown as Engine;
    const source = { frame: new Float64Array(16), anchor: undefined };
    expect(
      () =>
        new ModelPool(engine, {} as never, source as never, model as never, {
          slots: 1,
          code: "",
          uniforms: {},
        }),
    ).toThrow(/1025 primitives; a pool takes at most 1024/);
    expect(remove).toHaveBeenCalledTimes(1);
  });
});

describe("a b-rep face's trim (coverage.slang MAX_BAND_PIECES)", () => {
  it("is drawn from the CPU mesh when a band lists more pieces than the fragment's test reads", async () => {
    const engine = await fakeEngine();
    const world = engine.createWorld({
      maxDraws: 64,
      vertexBytes: 1 << 20,
      indexBytes: 1 << 20,
    });
    const form = cappedCylinderBrep();
    const prepared = prepareGpuPatches(form);
    const withBusiest = (face: number, pieces: number) => ({
      ...prepared,
      faces: prepared.faces.map((f) =>
        f.face === face && f.trim
          ? { ...f, trim: { ...f.trim, maxPerBand: pieces } }
          : f,
      ),
    });
    // At the cap: on the GPU, as before.
    const at = world.addBrep(form, {
      prepared: withBusiest(1, MAX_BAND_PIECES),
    });
    expect(at.gpuFaces).toEqual([0, 1, 2]);
    expect(at.cpuFaces).toEqual([]);
    world.removeBrep(at);
    // One past it: the CPU mesh draws the face; nothing is left out.
    const past = world.addBrep(form, {
      prepared: withBusiest(1, MAX_BAND_PIECES + 1),
    });
    expect(past.gpuFaces).toEqual([0, 2]);
    expect(past.trimmedFaces).toEqual([2]);
    expect(past.cpuFaces).toEqual([1]);
    expect(past.unsupported).toEqual([]);
    expect(past.mesh).toBeDefined();
    world.removeBrep(past);
    world.destroy();
  });
});
