// A draw's placement (plan 5a, Task 19; spec section 7.6): the per-vertex
// kinds' float64 twins and bounds, the world's shared parameters and
// placements buffer, and the frames module's placement query. The GPU
// side (shaders/placement.slang) is checked against the twins in the
// browser (spikes/placement.html).
import { readFileSync } from "node:fs";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { createFrameCatalog } from "../src/frames/catalog.ts";
import { placementOf } from "../src/frames/placementQuery.ts";
import { createFramesResolver } from "../src/frames/resolver.ts";
import {
  CENTER_WORD,
  MAX_DIRECTORY_ENTRIES,
  NO_PLACEMENT,
  PLACEMENT_WORD,
  RADIUS_WORD,
  RECORD_WORDS,
  attributeHash,
} from "../src/render/layout.ts";
import { EARTH } from "../src/scene/Body.ts";
import type { Engine } from "../src/scene/Engine.ts";
import { createBillboard, type MeshData } from "../src/scene/meshes.ts";
import {
  PLACEMENT_MONOMIALS,
  PLACEMENT_TERMS,
  maxDisplacement,
  placePosition,
  secondDerivativeBound,
  type DualPosition,
  type FittedOperation,
  type Placement,
  type PlacementBlend,
  type PlacementParameter,
} from "../src/scene/placement.ts";
import {
  TERM_ROWS,
  WARP_KIND,
  blockRows,
  latticeRows,
  LATTICE_HEAD_ROWS,
} from "../src/scene/placementTable.ts";
import { termsOf } from "../src/scene/warpEvaluate.ts";
import { type View } from "../src/scene/View.ts";
import { OffscreenTarget } from "../src/scene/renderTarget.ts";
import type { World } from "../src/scene/World.ts";
import type { DrawHandle } from "../src/scene/world/types.ts";
import { fakeEngine } from "./fakeGpu.ts";

const PARTNER = "_PARTNER";

/** A unit quad in z = 0 with its partner positions 2 m up in z. */
const quad: MeshData = {
  positions: Float32Array.of(-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0),
  indices: Uint32Array.of(0, 1, 2, 0, 2, 3),
  attributes: {
    [PARTNER]: {
      data: Float32Array.of(-1, -1, 2, 1, -1, 2, 1, 1, 2, -1, 1, 2),
      components: 3,
    },
  },
};

let engine: Engine;
let world: World;
const views: View[] = [];

beforeAll(async () => {
  engine = await fakeEngine();
  world = engine.createWorld({ maxDraws: 64 });
});

afterEach(() => {
  for (const view of views.splice(0)) {
    engine.removeView(view);
  }
});

const t = (value: number, range?: [number, number]): PlacementParameter =>
  world.createPlacementParameter(value, range ? { range } : undefined);

function dual(parameter: PlacementParameter, maxDistance = 2): DualPosition {
  return { kind: "dual", semantic: PARTNER, t: parameter, maxDistance };
}

/** A fitted operation with one coefficient per entry of `terms`. */
function fitted(
  terms: Record<number, readonly [number, number, number]>,
  options: Partial<FittedOperation> = {},
): FittedOperation {
  const coefficients = new Float64Array(PLACEMENT_TERMS * 3);
  for (const [k, c] of Object.entries(terms)) {
    coefficients.set(c, Number(k) * 3);
  }
  return {
    kind: "fitted",
    center: [0, 0, 0],
    scale: 2,
    coefficients,
    errorBound: 0.01,
    ...options,
  };
}

function addQuad(): DrawHandle {
  return world.addDraw({
    mesh: world.addMesh(quad),
    origin: Float64Array.of(10, 20, 30),
  });
}

const words = (draw: DrawHandle) => {
  const internal = world.raster;
  const o = draw.index * RECORD_WORDS;
  return {
    placement: internal.recordsU32[o + PLACEMENT_WORD]!,
    radius: internal.recordsF32[o + RADIUS_WORD]!,
    center: [0, 1, 2].map((i) => internal.recordsF32[o + CENTER_WORD + i]!),
    table: internal.placementTable,
  };
};

/** The float of the draw's first term's first weight factor (its block's words). */
const parameterWord = (draw: DrawHandle): number => {
  const { placement, table } = words(draw);
  return table.words(placement, 1 + TERM_ROWS).u32[8]!;
};

/** Every `writeBuffer` while `run` runs: buffer, offset and bytes. */
function writesDuring(run: () => void): Array<[GPUBuffer, number, number]> {
  const writes: Array<[GPUBuffer, number, number]> = [];
  const device = engine.gpu.device as unknown as { queue: GPUQueue };
  const queue = device.queue;
  device.queue = new Proxy(queue, {
    get: (target, key) =>
      key === "writeBuffer"
        ? (
            buffer: GPUBuffer,
            offset: number,
            data: ArrayBufferView,
            dataOffset = 0,
            size?: number,
          ) => {
            const element =
              (data as unknown as { BYTES_PER_ELEMENT?: number })
                .BYTES_PER_ELEMENT ?? 1;
            const bytes =
              size !== undefined
                ? size * element
                : data.byteLength - dataOffset * element;
            writes.push([buffer, offset, bytes]);
          }
        : (target as unknown as Record<PropertyKey, unknown>)[key],
  });
  try {
    run();
  } finally {
    device.queue = queue;
  }
  return writes;
}

describe("the CPU twins", () => {
  it("dual position mixes by t and extrapolates past 1", () => {
    const out = placePosition(
      dual(t(1.5)),
      [0, 0, 0],
      [2, 0, 0],
      new Float64Array(3),
    );
    expect(Array.from(out)).toEqual([3, 0, 0]);
    // At 0 and 1, the content's own points; past 0 the other way.
    const p = t(0);
    expect(
      Array.from(
        placePosition(dual(p), [1, 2, 3], [5, 6, 7], new Float64Array(3)),
      ),
    ).toEqual([1, 2, 3]);
    p.value = 1;
    expect(
      Array.from(
        placePosition(dual(p), [1, 2, 3], [5, 6, 7], new Float64Array(3)),
      ),
    ).toEqual([5, 6, 7]);
    p.value = -9;
    expect(
      Array.from(
        placePosition(dual(p), [1, 2, 3], [5, 6, 7], new Float64Array(3)),
      ),
    ).toEqual([-35, -34, -33]);
    expect(() =>
      placePosition(dual(p), [1, 2, 3], undefined, new Float64Array(3)),
    ).toThrow(/_PARTNER/);
  });

  it("the fitted twin evaluates the polynomial; its bounds come from the coefficients", () => {
    // Every term's order and place, as placement.slang's TERM_POWERS.
    expect(PLACEMENT_MONOMIALS).toHaveLength(PLACEMENT_TERMS);
    expect(new Set(PLACEMENT_MONOMIALS.map((m) => m.join())).size).toBe(20);
    expect(PLACEMENT_MONOMIALS.every((m) => m[0] + m[1] + m[2] <= 3)).toBe(
      true,
    );
    // d = (0.5, 0, 0) + u.x · (0, 2, 0) + u.x u.y · (0, 0, 3) + u.z³ · (1, 0, 0),
    // u = (p − center) / scale.
    const f = fitted(
      { 0: [0.5, 0, 0], 1: [0, 2, 0], 5: [0, 0, 3], 19: [1, 0, 0] },
      { center: [1, 1, 1], scale: 2 },
    );
    const p = [2, 3, 0]; // u = (0.5, 1, -0.5)
    const out = placePosition(f, p, undefined, new Float64Array(3));
    expect(out[0]).toBeCloseTo(2 + 0.5 + 1 * -0.125, 14);
    expect(out[1]).toBeCloseTo(3 + 2 * 0.5, 14);
    expect(out[2]).toBeCloseTo(0 + 3 * 0.5 * 1, 14);
    // Over the tile (|u_i| ≤ 1) each term is at most 1: Σ |c|.
    expect(maxDisplacement(f)).toBe(0.5 + 2 + 3 + 1);
    // Beyond it, a term of order n counts reach^n.
    expect(maxDisplacement(f, 2)).toBe(0.5 + 2 * 2 + 3 * 4 + 1 * 8);
    // Second derivative: |c| n (n − 1) / scale² for each term of order 2 or 3.
    expect(secondDerivativeBound(f)).toBeCloseTo((3 * 2 + 1 * 6) / 4, 14);
    expect(secondDerivativeBound({ kind: "affine" })).toBe(0);
    expect(secondDerivativeBound(dual(t(0.5)))).toBeNaN();
    // A sampled second difference never exceeds the bound.
    const along = [0.6, -0.48, 0.64];
    const h = 1e-3;
    const at = (s: number) =>
      placePosition(
        f,
        [1 + along[0]! * s, 1 + along[1]! * s, 1 + along[2]! * s],
        undefined,
        new Float64Array(3),
      );
    for (const s of [-1.5, -0.5, 0, 0.7, 1.4]) {
      const a = at(s - h);
      const b = at(s);
      const c = at(s + h);
      const second = Math.hypot(
        ...[0, 1, 2].map((i) => (a[i]! - 2 * b[i]! + c[i]!) / (h * h)),
      );
      expect(second).toBeLessThanOrEqual(secondDerivativeBound(f) + 1e-4);
    }
  });

  it("a blend of identity and a fitted operation moves by t", () => {
    const f = fitted({ 0: [4, 0, 0], 2: [0, 0, 2] });
    const s = t(0);
    const blend: PlacementBlend = {
      kind: "blend",
      from: "identity",
      to: f,
      t: s,
    };
    const p = [1, 1, 1];
    const full = placePosition(f, p, undefined, new Float64Array(3));
    expect(
      Array.from(placePosition(blend, p, undefined, new Float64Array(3))),
    ).toEqual(p);
    s.value = 0.25;
    const quarter = placePosition(blend, p, undefined, new Float64Array(3));
    for (let i = 0; i < 3; i++) {
      expect(quarter[i]).toBeCloseTo(p[i]! + 0.25 * (full[i]! - p[i]!), 14);
    }
    s.value = 1;
    expect(
      Array.from(placePosition(blend, p, undefined, new Float64Array(3))),
    ).toEqual(Array.from(full));
    // Two fitted ends: mix(from(p), to(p), t).
    const g = fitted({ 0: [0, -2, 0] });
    const both: PlacementBlend = { kind: "blend", from: g, to: f, t: s };
    s.value = 0.5;
    const half = placePosition(both, p, undefined, new Float64Array(3));
    expect(Array.from(half)).toEqual([1 + 2, 1 - 1, 1 + 0.5]);
    // The larger end's displacement; past 1, |1 − t| + |t| times it.
    expect(maxDisplacement(both)).toBe(maxDisplacement(f));
    s.value = 3;
    expect(maxDisplacement(both)).toBe(5 * maxDisplacement(f));
    expect(maxDisplacement(dual(t(0.3), 2))).toBe(2);
    expect(maxDisplacement(dual(t(-4), 2))).toBe(8);
  });
});

describe("World placements", () => {
  it("refuses a non-finite parameter or coefficient, naming it", () => {
    expect(() => world.createPlacementParameter(Number.NaN)).toThrow(/value/); // Review Focus 4
    expect(() => world.createPlacementParameter(Infinity)).toThrow(RangeError);
    const p = t(0.5);
    expect(() => {
      p.value = Number.NaN;
    }).toThrow(/value/);
    expect(() => world.createPlacementParameter(1e39)).toThrow(/float32/);
    expect(() => {
      p.value = -4e38;
    }).toThrow(/float32/);
    expect(p.value).toBe(0.5);
    const draw = addQuad();
    const before = words(draw);
    const bad = (k: number, c: number) => {
      const f = fitted({});
      f.coefficients[k * 3 + c] = Number.NaN;
      return f;
    };
    const cases: Array<[Placement, RegExp]> = [
      [bad(7, 1), /coefficients\[22\]/],
      // Finite in float64, infinite as the GPU reads it (float32).
      [
        fitted({ 3: [0, 4e38, 0] }),
        /coefficients\[10\] is 4e\+38, past float32/,
      ],
      [fitted({}, { center: [0, 0, -1e39] }), /center\[2\].*float32/],
      [fitted({}, { scale: 1e39 }), /scale.*float32/],
      [fitted({}, { scale: 1e-39 }), /1 \/ scale.*float32/],
      [
        {
          kind: "blend",
          from: "identity",
          to: fitted({}, { scale: 1e-40 }),
          t: p,
        },
        /1 \/ to\.scale/,
      ],
      [{ ...dual(p), maxDistance: 1e39 }, /maxDistance.*float32/],
      // The grown radius itself (base + 2e38 · 2) past float32.
      [{ ...dual(t(2)), maxDistance: 2e38 }, /grown bounding radius/],
      // A blend's ends are the identity or fitted operations only.
      [
        { kind: "blend", from: dual(p) as never, to: "identity", t: p },
        /blend's from is a placement of kind dual/,
      ],
      [
        { kind: "blend", from: "identity", to: "fitted" as never, t: p },
        /blend's to is "fitted"/,
      ],
      [fitted({}, { center: [0, Infinity, 0] }), /center\[1\]/],
      [fitted({}, { scale: Number.NaN }), /scale/],
      [fitted({}, { scale: 0 }), /scale/],
      [fitted({}, { errorBound: Infinity }), /errorBound/],
      [
        fitted({}, { coefficients: new Float64Array(59) }),
        /coefficients has 59/,
      ],
      [{ ...dual(p), maxDistance: Number.NaN }, /maxDistance/],
      [
        { kind: "blend", from: "identity", to: bad(0, 0), t: p },
        /to\.coefficients\[0\]/,
      ],
      [
        { kind: "blend", from: bad(19, 2), to: "identity", t: p },
        /from\.coefficients\[59\]/,
      ],
    ];
    const place = (placement: Placement) => () =>
      world.setPlacement(draw, placement);
    for (const [placement, message] of cases) {
      expect(place(placement)).toThrow(message);
      expect(place(placement)).toThrow(RangeError);
    }
    // A parameter object that isn't this world's (a NaN smuggled in).
    expect(() => world.setPlacement(draw, dual({ value: Number.NaN }))).toThrow(
      /t \(its value\)/,
    );
    expect(() => world.setPlacement(draw, dual({ value: 0.5 }))).toThrow(
      /isn't a parameter of this world/,
    );
    // Nothing was placed.
    expect(words(draw)).toEqual(before);
    expect(words(draw).placement).toBe(NO_PLACEMENT);
    expect(world.drawPlacement(draw)).toBeUndefined();
    // And the CPU twin refuses a non-finite t too.
    expect(() =>
      placePosition(
        dual({ value: Infinity }),
        [0, 0, 0],
        [1, 1, 1],
        new Float64Array(3),
      ),
    ).toThrow(/t \(its value\)/);
  });

  it("refuses a parameter change that grows a bound past float32, writing nothing", () => {
    const draw = addQuad();
    const p = t(0.5);
    world.setPlacement(draw, dual(p, 1e38));
    const before = words(draw);
    const writes = writesDuring(() => {
      expect(() => {
        p.value = 5;
      }).toThrow(/grown bounding radius/);
    });
    expect(writes).toEqual([]);
    expect(p.value).toBe(0.5);
    expect(words(draw)).toEqual(before);
    expect(before.table.parameter(parameterWord(draw))).toBe(0.5);
    // Within float32 it goes through: |t| · maxDistance (t = 2, 2e38).
    p.value = 2;
    expect(words(draw).radius).toBeCloseTo(
      Math.fround(before.radius - 0.5e38 + 2e38),
      -32,
    );
    world.removeDraw(draw);
  });

  it("refuses a mesh whose named-attribute directory passes readNamed's bound", () => {
    const attributes: MeshData["attributes"] = {};
    for (let i = 0; i <= MAX_DIRECTORY_ENTRIES; i++) {
      attributes[`_A${i}`] = { data: new Float32Array(4), components: 1 };
    }
    expect(() => world.addMesh({ ...quad, attributes })).toThrow(
      new RegExp(
        `${MAX_DIRECTORY_ENTRIES + 1} named attributes.*at most ${MAX_DIRECTORY_ENTRIES}`,
      ),
    );
    delete attributes[`_A${MAX_DIRECTORY_ENTRIES}`];
    const mesh = world.addMesh({ ...quad, attributes });
    world.removeMesh(mesh);
  });

  it("refuses instance directories past readInstance's bound", () => {
    const layout: Record<string, { offset: number; components: number }> = {};
    for (let i = 0; i <= MAX_DIRECTORY_ENTRIES; i++) {
      layout[`f${i}`] = { offset: 0, components: 1 };
    }
    expect(() => world.addPointMesh(4, { stride: 1, layout })).toThrow(
      new RegExp(`${MAX_DIRECTORY_ENTRIES + 1} fields.*at most`),
    );
    expect(() =>
      world.addDraw({
        mesh: world.addMesh(quad),
        origin: Float64Array.of(0, 0, 0),
        instances: {
          matrices: Float64Array.of(
            1,
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
            0,
            0,
            0,
            0,
            1,
          ),
          streams: { data: new Float32Array(1), stride: 1, layout },
        },
      }),
    ).toThrow(new RegExp(`${MAX_DIRECTORY_ENTRIES + 1} instance fields`));
  });

  it("refuses a dual position without its attribute, and billboards", () => {
    const draw = addQuad();
    expect(() =>
      world.setPlacement(draw, { ...dual(t(1)), semantic: "_ELSEWHERE" }),
    ).toThrow(/no _ELSEWHERE attribute of 3 components/);
    const billboard = world.addDraw({
      mesh: world.addMesh(createBillboard()),
      origin: Float64Array.of(0, 0, 0),
      billboard: { size: 10 },
    });
    expect(() => world.setPlacement(billboard, fitted({}))).toThrow(
      /billboard or point draw/,
    );
    world.removeDraw(draw);
    expect(() => world.setPlacement(draw, fitted({}))).toThrow(/removed/);
  });

  it("refuses an instanced draw: a placement runs before the instance's matrix", () => {
    const draw = world.addDraw({
      mesh: world.addMesh(quad),
      origin: Float64Array.of(0, 0, 0),
      instances: {
        matrices: Float64Array.of(
          1,
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
          0,
          5,
          0,
          0,
          1,
        ),
      },
    });
    expect(world.drawHasPosition(draw, PARTNER)).toBe(false);
    expect(() => world.setPlacement(draw, dual(t(1)))).toThrow(
      /instanced draw/,
    );
    expect(world.drawHasPosition(addQuad(), PARTNER)).toBe(true);
  });

  it("writes each kind's block as placement.slang reads it", () => {
    const draw = addQuad();
    const p = t(0.75);
    world.setPlacement(draw, dual(p));
    let { placement, table } = words(draw);
    // The header, then one attribute term and its weight's one factor.
    let block = table.words(placement, 1 + TERM_ROWS);
    expect(block.u32[0]).toBe(1);
    expect(block.u32[4]).toBe(WARP_KIND.attribute | (1 << 8));
    expect(block.f32[5]).toBe(1);
    expect(block.u32[6]).toBe(attributeHash(PARTNER));
    expect(block.u32[7]).toBe(1);
    expect(table.parameter(block.u32[8]!)).toBe(0.75);
    expect(Array.from(block.f32.subarray(9, 11))).toEqual([0, 1]);
    const f = fitted(
      { 0: [1, 2, 3], 19: [-4, 5, -6] },
      { center: [1, 2, 3], scale: 4 },
    );
    world.setPlacement(draw, f);
    ({ placement, table } = words(draw));
    block = table.words(placement, blockRows(termsOf(f)!));
    expect(block.u32[0]).toBe(1);
    expect(block.u32[4]).toBe(WARP_KIND.lattice);
    expect(block.u32[6]).toBe(1 + TERM_ROWS); // its body, from the header
    expect(block.u32[7]).toBe(1);
    const body = (1 + TERM_ROWS) * 4;
    expect(Array.from(block.f32.subarray(body, body + 4))).toEqual([
      1, 2, 3, 0.25,
    ]);
    // The value at the center, hi then lo (the cull kernel adds it), then
    // the cells less it: the first monomial's row is zero.
    expect(Array.from(block.f32.subarray(body + 4, body + 8))).toEqual([
      1, 2, 3, 0,
    ]);
    expect(Array.from(block.f32.subarray(body + 8, body + 12))).toEqual([
      0, 0, 0, 0,
    ]);
    const first = body + LATTICE_HEAD_ROWS * 4;
    expect(Array.from(block.f32.subarray(first, first + 4))).toEqual([
      0, 0, 0, 0,
    ]);
    const last = first + 19 * 4;
    expect(Array.from(block.f32.subarray(last, last + 4))).toEqual([
      -4, 5, -6, 0,
    ]);
    expect(block.f32.length).toBe((1 + TERM_ROWS + latticeRows(1)) * 4);
    world.setPlacement(draw, { kind: "blend", from: "identity", to: f, t: p });
    ({ placement, table } = words(draw));
    block = table.words(placement, 1 + TERM_ROWS);
    expect(block.u32[0]).toBe(1);
    expect(block.u32[4]).toBe(WARP_KIND.lattice | (1 << 8));
    expect(table.parameter(block.u32[8]!)).toBe(0.75);
    world.setPlacement(draw, { kind: "affine" });
    expect(words(draw).placement).toBe(NO_PLACEMENT);
    expect(world.drawPlacement(draw)).toBeUndefined();
  });

  it("a placement moves the draw's bounding sphere by its displacement at the centre and grows it by the residual", () => {
    const draw = addQuad();
    const base = words(draw).radius;
    expect(base).toBeCloseTo(Math.SQRT2, 6);
    const p = t(0.5);
    world.setPlacement(draw, dual(p, 2));
    // A dual position has no displacement at the centre: it only grows, by
    // |t| · maxDistance.
    expect(words(draw).radius).toBeCloseTo(base + 1, 6);
    expect(words(draw).center).toEqual([0, 0, 0]);
    p.value = 3;
    expect(words(draw).radius).toBeCloseTo(base + 6, 6);
    p.value = -0.25;
    expect(words(draw).radius).toBeCloseTo(base + 0.5, 6);
    // A fitted operation: its constant moves the centre; the radius grows by
    // what the rest does over the sphere (x² · (0, −2, 0) over |x| ≤ √2/2).
    const f = fitted({ 0: [1, 0, 0], 4: [0, -2, 0] }, { scale: 2 });
    world.setPlacement(draw, f);
    expect(words(draw).center).toEqual([1, 0, 0]);
    expect(words(draw).radius).toBeCloseTo(base + 1 + 0.01, 5);
    // A tile smaller than the mesh: the sphere reaches further across it.
    const small = fitted({ 0: [1, 0, 0], 4: [0, -2, 0] }, { scale: 0.5 });
    world.setPlacement(draw, small);
    const reach = Math.SQRT2 / 0.5;
    expect(words(draw).radius).toBeCloseTo(base + 2 * reach * reach + 0.01, 4);
    // Removing it gives the sphere back, exactly.
    world.setPlacement(draw, undefined);
    expect(words(draw).radius).toBe(base);
    expect(words(draw).center).toEqual([0, 0, 0]);
  });

  it("a placement leaves other draws' records alone, and unplacing restores its own bit for bit", () => {
    const placed = addQuad();
    const bystander = addQuad();
    const record = (draw: DrawHandle) =>
      Array.from(
        { length: RECORD_WORDS },
        (_, i) => world.raster.recordsU32[draw.index * RECORD_WORDS + i]!,
      );
    const before = [record(placed), record(bystander)];
    const p = t(0);
    world.setPlacement(placed, {
      kind: "blend",
      from: "identity",
      to: fitted({ 0: [4, 0, 0], 4: [0, 1, 0] }),
      t: p,
    });
    expect(record(placed)).not.toEqual(before[0]);
    p.value = 0.7;
    p.value = -3;
    expect(record(bystander)).toEqual(before[1]);
    world.setPlacement(placed, undefined);
    expect(record(placed)).toEqual(before[0]);
    expect(record(bystander)).toEqual(before[1]);
  });

  it("one parameter moves every draw that names it, with one 4-byte write", () => {
    const a = addQuad();
    const b = addQuad();
    const p = t(0, [0, 1]);
    world.setPlacement(a, dual(p));
    world.setPlacement(b, {
      kind: "blend",
      from: "identity",
      to: fitted({ 0: [1, 0, 0] }),
      t: p,
    });
    const { table } = words(a);
    const word = parameterWord(a);
    expect(parameterWord(b)).toBe(word);
    const spheres = [words(a), words(b)].map((w) => [w.radius, ...w.center]);
    engine.renderFrame();
    const version = world.version;
    const writes = writesDuring(() => {
      p.value = 0.5;
    });
    expect(writes).toEqual([[table.buffer, word * 4, 4]]);
    expect(table.parameter(word)).toBe(0.5);
    // Both draws' views redraw; no record changed: the range holds for both.
    expect(world.version).toBeGreaterThan(version);
    expect(world.changedViews).not.toBe(0);
    expect([words(a), words(b)].map((w) => [w.radius, ...w.center])).toEqual(
      spheres,
    );
    // The same value again writes nothing.
    expect(writesDuring(() => (p.value = 0.5))).toEqual([]);
  });

  it("without a range a parameter's change moves the sphere with the value, writing the record", () => {
    const draw = addQuad();
    const p = t(0);
    world.setPlacement(draw, {
      kind: "blend",
      from: "identity",
      to: fitted({ 0: [4, 0, 0] }),
      t: p,
    });
    expect(words(draw).center).toEqual([0, 0, 0]);
    p.value = 0.5;
    expect(words(draw).center).toEqual([2, 0, 0]);
    p.value = 1;
    expect(words(draw).center).toEqual([4, 0, 0]);
  });

  it("a parameter's range is checked on creation and on every change", () => {
    expect(() => t(0.5, [1, 0])).toThrow(/min above max/);
    expect(() => t(0.5, [Number.NaN, 1])).toThrow(RangeError);
    expect(() => t(0.5, [0, 1e39])).toThrow(/float32/);
    expect(() => t(2, [0, 1])).toThrow(/outside the parameter's range/);
    const p = t(0.5, [0, 1]);
    expect(p.range).toEqual([0, 1]);
    expect(() => {
      p.value = 1.5;
    }).toThrow(/outside the parameter's range \[0, 1\]/);
    expect(p.value).toBe(0.5); // refused: kept
    p.value = 1; // the ends are in
    expect(p.value).toBe(1);
    expect(t(3).range).toBeUndefined();
  });

  it("never writes a vertex buffer", () => {
    const mesh = world.addMesh(quad);
    const draw = world.addDraw({ mesh, origin: Float64Array.of(0, 0, 0) });
    engine.renderFrame(); // the mesh's own upload is behind us
    const slab = world.vertexBufferOf(mesh);
    const p = t(0.2);
    const writes = writesDuring(() => {
      world.setPlacement(draw, dual(p));
      p.value = 0.9;
      world.setPlacement(draw, fitted({ 3: [0, 0, 1] }));
      world.setPlacement(draw, {
        kind: "blend",
        from: fitted({}),
        to: "identity",
        t: p,
      });
      p.value = 1.7;
      world.setPlacement(draw, undefined);
      engine.renderFrame();
    });
    expect(writes.length).toBeGreaterThan(0);
    expect(writes.filter(([buffer]) => buffer === slab)).toEqual([]);
    // The mesh's positions are its own: the GPU's are never placed.
    expect(world.drawPlacement(draw)).toBeUndefined();
  });

  it("placementOf answers which placement applies, for which root, and why", () => {
    const catalog = createFrameCatalog();
    const resolver = createFramesResolver(catalog);
    engine.cameras.setResolver(world, resolver);
    const view = engine.addView({ target: new OffscreenTarget(64, 48), world });
    views.push(view);
    const earth = world.bodyAnchor(EARTH);
    const draw = world.addDraw({
      mesh: world.addMesh(quad),
      parent: earth,
      origin: Float64Array.of(6_378_137, 0, 0),
    });
    // The transform alone, until a placement is set.
    let info = placementOf(world, draw, view, resolver)!;
    expect(info.kind).toBe("affine");
    expect(info.root).toBe(engine.cameras.root(view));
    expect(info.errorBound).toBe(0);
    expect(info.resamplable).toBe(true);
    expect(info.operation).toMatch(/transform from ITRF/);
    // A dual position can't be resampled (ruling 4) and states no bound.
    const p = t(0.4);
    world.setPlacement(draw, dual(p));
    info = placementOf(world, draw, view, resolver)!;
    expect(info).toMatchObject({ kind: "dual", resamplable: false });
    expect(info.errorBound).toBeUndefined();
    expect(info.operation).toMatch(/dual position \(_PARTNER\) at t = 0.4/);
    // A fitted operation names its coordinate operation and bound.
    const f = fitted(
      { 0: [1, 0, 0] },
      { errorBound: 0.03, operation: "ETRS89 to OSGB36 (OSTN15)" },
    );
    world.setPlacement(draw, f);
    info = placementOf(world, draw, view, resolver)!;
    expect(info).toMatchObject({
      kind: "fitted",
      errorBound: 0.03,
      resamplable: true,
    });
    expect(info.operation).toMatch(/OSTN15/);
    // A blend weighs its ends' bounds by t.
    world.setPlacement(draw, { kind: "blend", from: "identity", to: f, t: p });
    info = placementOf(world, draw, view, resolver)!;
    expect(info.kind).toBe("blend");
    expect(info.errorBound).toBeCloseTo(0.4 * 0.03, 15);
    // On a GCRF rig, the root it is computed for is GCRF.
    const gcrf = catalog.get("GCRF");
    engine.cameras.setRig(view, {
      position: { frame: gcrf },
      orientation: { kind: "free" },
    });
    engine.renderFrame();
    info = placementOf(world, draw, view, resolver)!;
    expect(info.root).toBe(gcrf);
    expect(info.operation).toMatch(/to the render root, GCRF/);
    // A removed draw has none.
    world.removeDraw(draw);
    expect(placementOf(world, draw, view, resolver)).toBeUndefined();
  });

  it("a removed draw's block is reused, and its slot starts with no placement", () => {
    const draw = addQuad();
    world.setPlacement(draw, fitted({ 0: [1, 0, 0] }));
    const at = words(draw).placement;
    world.removeDraw(draw);
    const next = addQuad();
    expect(words(next).placement).toBe(NO_PLACEMENT);
    world.setPlacement(next, fitted({ 0: [0, 1, 0] }));
    expect(words(next).placement).toBe(at);
  });
});

describe("placement.slang and the TypeScript agree", () => {
  const slang = readFileSync(
    new URL("../src/shaders/placement.slang", import.meta.url),
    "utf8",
  );
  const constant = (name: string, source = slang): number => {
    const m = new RegExp(
      String.raw`static\s+const\s+uint\s+${name}\s*=\s*(0x[0-9a-f]+|\d+)u\s*;`,
      "i",
    ).exec(source);
    expect(m, name).not.toBeNull();
    return Number(m![1]);
  };

  it("on the terms' exponents, the kinds, NO_PLACEMENT and the bounds", () => {
    const table = /TERM_POWERS\[(\d+)\]\s*=\s*\{([^}]*)\}/.exec(slang)!;
    expect(Number(table[1])).toBe(PLACEMENT_TERMS);
    const powers = table[2]!
      .split(",")
      .map((v) => Number(v.trim().replace(/u$/, "")));
    expect(powers).toEqual(
      PLACEMENT_MONOMIALS.map(([x, y, z]) => x | (y << 2) | (z << 4)),
    );
    expect(constant("PLACEMENT_TERMS")).toBe(PLACEMENT_TERMS);
    expect(constant("NO_PLACEMENT")).toBe(NO_PLACEMENT);
    expect(constant("WARP_LATTICE")).toBe(WARP_KIND.lattice);
    expect(constant("WARP_ATTRIBUTE")).toBe(WARP_KIND.attribute);
    expect(constant("TERM_ROWS")).toBe(TERM_ROWS);
    // A lattice body: its center row, then a row per cell and monomial.
    expect(slang).toMatch(/placementRow\(first \+ k\)/);
    expect(latticeRows(1)).toBe(LATTICE_HEAD_ROWS + PLACEMENT_TERMS);
    expect(constant("LATTICE_HEAD_ROWS")).toBe(LATTICE_HEAD_ROWS);
    const surface = readFileSync(
      new URL("../src/shaders/surface.slang", import.meta.url),
      "utf8",
    );
    expect(constant("MAX_DIRECTORY_ENTRIES", surface)).toBe(
      MAX_DIRECTORY_ENTRIES,
    );
  });
});
