// A draw's warp as terms (plan 13.26): the conversion from today's
// placements, the float64 twin, its bounds, its validation, and the
// placements buffer's layout read back as shaders/placement.slang reads it.
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { attributeHash } from "../src/render/layout.ts";
import type { Engine } from "../src/scene/Engine.ts";
import type { MeshData } from "../src/scene/meshes.ts";
import {
  PLACEMENT_MONOMIALS,
  PLACEMENT_TERMS,
  maxDisplacement,
  placePosition,
  secondDerivativeBound,
  type FittedOperation,
  type Placement,
  type PlacementParameter,
} from "../src/scene/placement.ts";
import {
  TERM_ROWS,
  WARP_KIND,
  blockRows,
  latticeRows,
} from "../src/scene/placementTable.ts";
import {
  checkTerms,
  latticeDisplacement,
  placeWithTerms,
  termsMaxDisplacement,
  termsOf,
  termsResamplable,
  termsSecondDerivativeBound,
  weightOf,
} from "../src/scene/warpEvaluate.ts";
import {
  LATTICE_CELLS,
  MAX_WARP_TERMS,
  constantWeight,
  type CubicLattice,
  type WarpTerms,
} from "../src/scene/warpTerms.ts";
import type { World } from "../src/scene/World.ts";
import { drawTerms, setPlacement } from "../src/scene/world/placements.ts";
import type { DrawHandle } from "../src/scene/world/types.ts";
import { fakeEngine } from "./fakeGpu.ts";

const PARTNER = "_PARTNER";

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

beforeAll(async () => {
  engine = await fakeEngine();
  world = engine.createWorld({ maxDraws: 64 });
});

afterEach(() => {
  engine.renderFrame();
});

const t = (value: number): PlacementParameter =>
  world.createPlacementParameter(value);

/** A repeatable stream in [-1, 1) (a linear congruential generator). */
function random(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 2 ** 31 - 1;
  };
}

/** `count` float32-exact coefficients, so the GPU's copies equal the twin's. */
function coefficients(
  count: number,
  seed: number,
  amplitude = 1,
): Float64Array {
  const next = random(seed);
  return Float64Array.from({ length: count }, () =>
    Math.fround(next() * amplitude),
  );
}

function fitted(
  seed: number,
  options: Partial<FittedOperation> = {},
): FittedOperation {
  return {
    kind: "fitted",
    center: [1, -2, 3],
    scale: 2,
    coefficients: coefficients(PLACEMENT_TERMS * 3, seed),
    errorBound: 0.01,
    ...options,
  };
}

function lattice(
  cells: number,
  seed: number,
  options: Partial<CubicLattice> = {},
): CubicLattice {
  return {
    kind: "cubic",
    center: [1, -2, 3],
    scale: 2,
    cells,
    coefficients: coefficients(cells ** 3 * PLACEMENT_TERMS * 3, seed),
    errorBound: 0.02,
    estimate: false,
    ...options,
  };
}

/** Points in the tile, on its faces and outside it, for a centre and radius. */
function points(
  center: ArrayLike<number>,
  scale: number,
  seed: number,
  count = 40,
): number[][] {
  const next = random(seed);
  return Array.from({ length: count }, (_, i) => {
    const reach = i < 24 ? 1 : i < 32 ? 1.6 : 3;
    return [0, 1, 2].map((a) => center[a]! + next() * scale * reach);
  });
}

const at = (terms: WarpTerms, p: number[], attribute?: number[]) =>
  Array.from(
    placeWithTerms(
      terms,
      p,
      attribute ? () => attribute : undefined,
      new Float64Array(3),
    ),
  );

describe("termsOf reproduces today's placements, bit for bit", () => {
  const partner = [3.25, -1.5, 8];

  it("a dual position", () => {
    for (const value of [-1.5, 0, 0.25, 1, 3]) {
      const placement: Placement = {
        kind: "dual",
        semantic: PARTNER,
        t: { value },
        maxDistance: 9,
      };
      const terms = termsOf(placement)!;
      expect(terms).toHaveLength(1);
      expect(terms[0]!.term).toMatchObject({
        kind: "attribute",
        semantic: PARTNER,
        absolute: true,
      });
      for (const p of points([0, 0, 0], 4, 3, 12)) {
        expect(at(terms, p, partner)).toEqual(
          Array.from(placePosition(placement, p, partner, new Float64Array(3))),
        );
      }
    }
  });

  it("a fitted operation", () => {
    const f = fitted(7);
    const terms = termsOf(f)!;
    expect(terms).toHaveLength(1);
    expect(terms[0]!.term).toMatchObject({ kind: "cubic", cells: 1 });
    expect(terms[0]!.weight).toEqual(constantWeight(1));
    for (const p of points(f.center, f.scale, 11)) {
      expect(at(terms, p)).toEqual(
        Array.from(placePosition(f, p, undefined, new Float64Array(3))),
      );
    }
  });

  it("a blend, at t inside and outside [0, 1]", () => {
    const f = fitted(1);
    const g = fitted(2, { center: [0, 0, 0], scale: 5 });
    const ends: Array<
      ["identity" | FittedOperation, "identity" | FittedOperation]
    > = [
      ["identity", f],
      [f, "identity"],
      [f, g],
      [g, f],
    ];
    for (const [from, to] of ends) {
      for (const value of [-1.5, 0, 0.25, 0.5, 1, 3]) {
        const p = t(value);
        const blend: Placement = { kind: "blend", from, to, t: p };
        const terms = termsOf(blend)!;
        expect(terms).toHaveLength(
          from === "identity" || to === "identity" ? 1 : 2,
        );
        for (const x of points(f.center, f.scale, 5, 16)) {
          expect(at(terms, x)).toEqual(
            Array.from(placePosition(blend, x, undefined, new Float64Array(3))),
          );
        }
      }
    }
  });

  it("has no terms for the affine placement or a blend of identities", () => {
    expect(termsOf({ kind: "affine" })).toBeUndefined();
    expect(
      termsOf({ kind: "blend", from: "identity", to: "identity", t: t(0.5) }),
    ).toBeUndefined();
  });

  it("follows its parameter, live", () => {
    const p = t(0.25);
    const f = fitted(4);
    const terms = termsOf({ kind: "blend", from: "identity", to: f, t: p })!;
    const x = [1.5, -2.5, 3.5];
    const before = at(terms, x);
    p.value = 0.75;
    const after = at(terms, x);
    expect(after).not.toEqual(before);
    expect(after).toEqual(
      Array.from(
        placePosition(
          { kind: "blend", from: "identity", to: f, t: p },
          x,
          undefined,
          new Float64Array(3),
        ),
      ),
    );
  });
});

describe("weights", () => {
  it("are the scale times the factors' values", () => {
    const k = t(5);
    const s = t(0.25);
    expect(weightOf(constantWeight(3))).toBe(3);
    expect(
      weightOf({ scale: 2, factors: [{ parameter: k, offset: -1, slope: 1 }] }),
    ).toBe(8);
    // Exaggeration by k during a morph by s: (k âˆ’ 1)(1 âˆ’ s).
    expect(
      weightOf({
        scale: 1,
        factors: [
          { parameter: k, offset: -1, slope: 1 },
          { parameter: s, offset: 1, slope: -1 },
        ],
      }),
    ).toBe(4 * 0.75);
    s.value = 1;
    expect(
      weightOf({
        scale: 1,
        factors: [
          { parameter: k, offset: -1, slope: 1 },
          { parameter: s, offset: 1, slope: -1 },
        ],
      }),
    ).toBe(0);
  });

  it("scale the displacement, term by term", () => {
    const a = lattice(1, 1);
    const b = lattice(2, 2);
    const k = t(3);
    const terms: WarpTerms = [
      { term: a, weight: constantWeight(1) },
      {
        term: b,
        weight: {
          scale: 0.5,
          factors: [{ parameter: k, offset: -1, slope: 1 }],
        },
      },
    ];
    const d = new Float64Array(3);
    for (const p of points(a.center, a.scale, 8, 12)) {
      const da = latticeDisplacement(a, p, new Float64Array(3));
      const db = latticeDisplacement(b, p, d);
      expect(at(terms, p)).toEqual(
        [0, 1, 2].map((i) => p[i]! + da[i]! + 1 * db[i]!),
      );
    }
  });
});

/** The cubic at `v` for one cell, written out directly. */
function cubic(c: Float64Array, cell: number, v: number[]): number[] {
  const out = [0, 0, 0];
  PLACEMENT_MONOMIALS.forEach(([a, b, e], k) => {
    const m = v[0]! ** a * v[1]! ** b * v[2]! ** e;
    for (let i = 0; i < 3; i++) {
      out[i]! += c[(cell * PLACEMENT_TERMS + k) * 3 + i]! * m;
    }
  });
  return out;
}

describe("a lattice of cells", () => {
  for (const cells of LATTICE_CELLS) {
    it(`evaluates its cell's cubic, ${cells} per axis, clamped outside`, () => {
      const l = lattice(cells, 20 + cells);
      for (const p of points(l.center, l.scale, 30 + cells, 60)) {
        const u = [0, 1, 2].map((a) => (p[a]! - l.center[a]!) / l.scale);
        const i = u.map((x) =>
          Math.min(Math.max(Math.floor(((x + 1) / 2) * cells), 0), cells - 1),
        );
        const v = u.map((x, a) => (x + 1) * cells - 2 * i[a]! - 1);
        const expected = cubic(
          l.coefficients,
          (i[2]! * cells + i[1]!) * cells + i[0]!,
          v,
        );
        const got = Array.from(latticeDisplacement(l, p, new Float64Array(3)));
        for (let a = 0; a < 3; a++) {
          expect(got[a]).toBeCloseTo(expected[a]!, 5);
        }
      }
    });
  }

  it("lays its cells out x fastest", () => {
    const cells = 4;
    const c = new Float64Array(cells ** 3 * PLACEMENT_TERMS * 3);
    for (let cell = 0; cell < cells ** 3; cell++) {
      c[cell * PLACEMENT_TERMS * 3] = cell; // the constant term, x
    }
    const l = lattice(cells, 1, {
      coefficients: c,
      scale: 4,
      center: [0, 0, 0],
    });
    for (let iz = 0; iz < cells; iz++) {
      for (let iy = 0; iy < cells; iy++) {
        for (let ix = 0; ix < cells; ix++) {
          // The cell's centre: u = (2i + 1) / cells âˆ’ 1, p = u Â· scale.
          const p = [ix, iy, iz].map((i) => ((2 * i + 1) / cells - 1) * 4);
          expect(latticeDisplacement(l, p, new Float64Array(3))[0]).toBe(
            (iz * cells + iy) * cells + ix,
          );
        }
      }
    }
  });

  it("with one cell is the old polynomial, v = u", () => {
    const f = fitted(9);
    const l = termsOf(f)![0]!.term as CubicLattice;
    for (const p of points(f.center, f.scale, 2)) {
      expect(
        Array.from(latticeDisplacement(l, p, new Float64Array(3))).map(
          (d, i) => p[i]! + d,
        ),
      ).toEqual(
        Array.from(placePosition(f, p, undefined, new Float64Array(3))),
      );
    }
  });
});

describe("bounds", () => {
  it("equal today's for fitted operations, dual positions and two-ended blends", () => {
    const f = fitted(1, { scale: 0.5 });
    const g = fitted(2);
    const cases: Placement[] = [
      f,
      { kind: "dual", semantic: PARTNER, t: t(0.4), maxDistance: 3 },
      { kind: "dual", semantic: PARTNER, t: t(-4), maxDistance: 3 },
      { kind: "blend", from: g, to: f, t: t(0.3) },
      { kind: "blend", from: g, to: f, t: t(3) },
      { kind: "blend", from: "identity", to: f, t: t(0.3) },
      { kind: "blend", from: f, to: "identity", t: t(0.9) },
    ];
    for (const placement of cases) {
      const terms = termsOf(placement)!;
      for (const reach of [1, 1.7, 4]) {
        expect(termsMaxDisplacement(terms, reach)).toBe(
          maxDisplacement(placement, reach),
        );
        const bend = secondDerivativeBound(placement, reach);
        if (Number.isNaN(bend)) {
          expect(termsSecondDerivativeBound(terms, reach)).toBeNaN();
        } else {
          expect(termsSecondDerivativeBound(terms, reach)).toBeCloseTo(
            bend,
            12,
          );
        }
      }
    }
  });

  it("are sound, and no looser than max(1, Î£|w|), for a blend past its ends", () => {
    const f = fitted(1);
    for (const value of [-2, 3]) {
      const placement: Placement = {
        kind: "blend",
        from: "identity",
        to: f,
        t: t(value),
      };
      const terms = termsOf(placement)!;
      expect(termsMaxDisplacement(terms)).toBeLessThanOrEqual(
        maxDisplacement(placement),
      );
      for (const p of points(f.center, f.scale, 6, 24).filter(
        (x) =>
          Math.max(
            ...x.map((c, a) => Math.abs((c - f.center[a]!) / f.scale)),
          ) <= 1,
      )) {
        const moved = at(terms, p);
        expect(
          Math.hypot(...moved.map((x, i) => x - p[i]!)),
        ).toBeLessThanOrEqual(termsMaxDisplacement(terms));
      }
    }
  });

  it("hold for a lattice of cells: its displacement and bend", () => {
    for (const cells of [2, 4]) {
      const l = lattice(cells, 40 + cells);
      const terms: WarpTerms = [{ term: l, weight: constantWeight(1) }];
      const reach = 1.5;
      const bound = termsMaxDisplacement(terms, reach);
      const bend = termsSecondDerivativeBound(terms, reach);
      for (const p of points(l.center, l.scale, 50 + cells, 80)) {
        const u = p.map((x, a) => Math.abs((x - l.center[a]!) / l.scale));
        if (Math.max(...u) > reach) {
          continue;
        }
        const moved = at(terms, p);
        expect(
          Math.hypot(...moved.map((x, i) => x - p[i]!)),
        ).toBeLessThanOrEqual(bound);
        // A second difference along a direction, inside one cell.
        const h = (l.scale / cells) * 1e-3;
        const along = [0.6, -0.48, 0.64];
        const f = (s: number) =>
          latticeDisplacement(
            l,
            p.map((x, a) => x + along[a]! * s),
            new Float64Array(3),
          );
        const [a, b, c] = [f(-h), f(0), f(h)];
        const same = [a, b, c].every(
          (d, k) => Math.abs(d[0]! - b[0]!) < 1e3 * (k + 1),
        );
        const second = Math.hypot(
          ...[0, 1, 2].map((i) => (a[i]! - 2 * b[i]! + c[i]!) / (h * h)),
        );
        if (same && second < 1e6) {
          // Skip the rare second difference that straddles a cell face.
          expect(second).toBeLessThanOrEqual(bend + 1e-3);
        }
      }
    }
  });

  it("bend scales by cells / scale per derivative", () => {
    // One coefficient: m = v_xÂ² in cell 0 of every lattice.
    const c = (cells: number) => {
      const co = new Float64Array(cells ** 3 * PLACEMENT_TERMS * 3);
      co[4 * 3] = 1;
      return co;
    };
    const bend = (cells: number, scale: number) =>
      termsSecondDerivativeBound(
        [
          {
            term: lattice(cells, 1, { coefficients: c(cells), scale }),
            weight: constantWeight(1),
          },
        ],
        1,
      );
    expect(bend(1, 1)).toBe(2);
    expect(bend(2, 1)).toBe(8);
    expect(bend(4, 2)).toBe((2 * 4 ** 2) / 4);
  });

  it("are NaN and not resamplable where a term reads an attribute", () => {
    const terms = termsOf({
      kind: "dual",
      semantic: PARTNER,
      t: t(0.5),
      maxDistance: 1,
    })!;
    expect(termsSecondDerivativeBound(terms)).toBeNaN();
    expect(termsResamplable(terms)).toBe(false);
    expect(termsResamplable(termsOf(fitted(1))!)).toBe(true);
  });
});

describe("validation", () => {
  const p = () => t(0.5);
  const one = (term: CubicLattice) => [{ term, weight: constantWeight(1) }];

  it("names the field it refuses", () => {
    const bad = (k: number, value: number) => {
      const l = lattice(2, 1);
      l.coefficients[k] = value;
      return one(l);
    };
    const cases: Array<[WarpTerms, RegExp]> = [
      [[], /no term/],
      [
        Array.from({ length: MAX_WARP_TERMS + 1 }, () => ({
          term: lattice(1, 1),
          weight: constantWeight(1),
        })),
        /at most 3/,
      ],
      [bad(7, Number.NaN), /terms\[0\]\.coefficients\[7\]/],
      [bad(9, 4e38), /coefficients\[9\] is 4e\+38, past float32/],
      [
        one(
          lattice(3, 1, { cells: 3, coefficients: new Float64Array(27 * 60) }),
        ),
        /cells is 3/,
      ],
      [
        one(lattice(2, 1, { coefficients: new Float64Array(59) })),
        /coefficients has 59 values, not 480/,
      ],
      [one(lattice(1, 1, { scale: 0 })), /scale/],
      [one(lattice(1, 1, { scale: 1e-39 })), /1 \/ terms\[0\]\.scale.*float32/],
      [one(lattice(1, 1, { center: [0, Infinity, 0] })), /center\[1\]/],
      [one(lattice(1, 1, { center: [0, 0] })), /center has 2/],
      [one(lattice(1, 1, { errorBound: -1 })), /errorBound/],
      [
        [{ term: lattice(1, 1), weight: { scale: Number.NaN, factors: [] } }],
        /terms\[0\]\.weight\.scale/,
      ],
      [
        [
          {
            term: lattice(1, 1),
            weight: {
              scale: 1,
              factors: [{ parameter: p(), offset: 0, slope: Infinity }],
            },
          },
        ],
        /weight\.factors\[0\]\.slope/,
      ],
      [
        [
          {
            term: lattice(1, 1),
            weight: {
              scale: 1,
              factors: Array.from({ length: 3 }, () => ({
                parameter: p(),
                offset: 0,
                slope: 1,
              })),
            },
          },
        ],
        /3 factors; at most 2/,
      ],
      [
        [
          {
            term: {
              kind: "attribute",
              semantic: "",
              absolute: true,
              maxDistance: 1,
            },
            weight: constantWeight(1),
          },
        ],
        /semantic/,
      ],
      [
        [
          {
            term: {
              kind: "attribute",
              semantic: "_A",
              absolute: false,
              maxDistance: -1,
            },
            weight: constantWeight(1),
          },
        ],
        /maxDistance/,
      ],
    ];
    for (const [terms, message] of cases) {
      expect(() => checkTerms("test", terms)).toThrow(RangeError);
      expect(() => checkTerms("test", terms)).toThrow(message);
    }
    expect(() => checkTerms("test", one(lattice(8, 1)))).not.toThrow();
  });

  it("is refused by the twin for a non-finite parameter or a missing attribute", () => {
    const terms = termsOf({
      kind: "dual",
      semantic: PARTNER,
      t: { value: Infinity },
      maxDistance: 1,
    })!;
    expect(() =>
      placeWithTerms(terms, [0, 0, 0], () => [1, 1, 1], new Float64Array(3)),
    ).toThrow(/parameter's value/);
    const ok = termsOf({
      kind: "dual",
      semantic: PARTNER,
      t: p(),
      maxDistance: 1,
    })!;
    expect(() =>
      placeWithTerms(ok, [0, 0, 0], undefined, new Float64Array(3)),
    ).toThrow(/_PARTNER/);
  });
});

/**
 * placement.slang's `placePosition`, read from the buffer's words: the
 * layout round trip, in float64 where the shader is in float32.
 */
describe("the placements buffer", () => {
  let draw: DrawHandle;

  function addQuad(): DrawHandle {
    return world.addDraw({
      mesh: world.addMesh(quad),
      origin: Float64Array.of(10, 20, 30),
    });
  }

  /** Where the shader puts `position`: placement.slang's `placePosition` over the block's words. */
  function placed(
    handle: DrawHandle,
    terms: WarpTerms,
    position: number[],
    attribute: number[],
  ): number[] {
    const table = world.raster.placementTable;
    const header = world.scene.drawPlacements[handle.index]!.at;
    const block = table.words(header, blockRows(terms));
    const out = [...position];
    for (let i = 0; i < block.u32[0]!; i++) {
      const row = (1 + TERM_ROWS * i) * 4;
      const head = block.u32.subarray(row, row + 4);
      let w = block.f32[row + 1]!;
      for (let f = 0; f < ((head[0]! >> 8) & 3); f++) {
        const factor = row + 4 + 4 * f;
        w *=
          block.f32[factor + 1]! +
          block.f32[factor + 2]! * table.parameter(block.u32[factor]!);
      }
      let d: number[];
      if ((head[0]! & 255) === WARP_KIND.lattice) {
        const body = head[2]! * 4;
        const cells = head[3]!;
        const o = block.f32.subarray(body, body + 4);
        let v = [0, 1, 2].map((a) => (position[a]! - o[a]!) * o[3]!);
        let cell = 0;
        if (cells > 1) {
          const s = v.map((x) => (x + 1) * 0.5 * cells);
          const i = s.map((x) =>
            Math.min(Math.max(Math.floor(x), 0), cells - 1),
          );
          v = s.map((x, a) => 2 * (x - i[a]!) - 1);
          cell = (i[2]! * cells + i[1]!) * cells + i[0]!;
        }
        d = [0, 0, 0];
        for (let k = 0; k < PLACEMENT_TERMS; k++) {
          const [a, b, e] = PLACEMENT_MONOMIALS[k]!;
          const m = v[0]! ** a * v[1]! ** b * v[2]! ** e;
          const r = body + 4 + (cell * PLACEMENT_TERMS + k) * 4;
          for (let c = 0; c < 3; c++) {
            d[c]! += block.f32[r + c]! * m;
          }
        }
      } else {
        expect(head[2]).toBe(attributeHash(PARTNER));
        d = head[3] ? attribute.map((x, a) => x - position[a]!) : attribute;
      }
      for (let c = 0; c < 3; c++) {
        out[c]! += w * d[c]!;
      }
    }
    return out;
  }

  it("round-trips terms through the table to the shader's reading", () => {
    draw = addQuad();
    const k = t(3);
    const s = t(0.25);
    const l2 = lattice(2, 61);
    const terms: WarpTerms = [
      {
        term: l2,
        weight: {
          scale: 1,
          factors: [
            { parameter: k, offset: -1, slope: 1 },
            { parameter: s, offset: 1, slope: -1 },
          ],
        },
      },
      {
        term: {
          kind: "attribute",
          semantic: PARTNER,
          absolute: true,
          maxDistance: 4,
        },
        weight: { scale: 1, factors: [{ parameter: s, offset: 0, slope: 1 }] },
      },
      { term: lattice(1, 62, { scale: 3 }), weight: constantWeight(0.5) },
    ];
    setPlacement(world, draw, terms);
    expect(drawTerms(world, draw)).toBe(terms);
    expect(world.drawPlacement(draw)).toBeUndefined();
    const attribute = [2.5, -1, 6];
    for (const p of points(l2.center, l2.scale, 70, 30)) {
      const expected = at(terms, p, attribute);
      const got = placed(draw, terms, p, attribute);
      for (let a = 0; a < 3; a++) {
        expect(got[a]).toBeCloseTo(expected[a]!, 5);
      }
    }
    // A parameter written to its float moves the sum, with no rewrite.
    s.value = 0.75;
    const p = [1.25, -1.5, 3.5];
    const expected = at(terms, p, attribute);
    const got = placed(draw, terms, p, attribute);
    for (let a = 0; a < 3; a++) {
      expect(got[a]).toBeCloseTo(expected[a]!, 5);
    }
    world.removeDraw(draw);
  });

  it("sets from public placements through the same terms", () => {
    draw = addQuad();
    const f = fitted(3);
    const p = t(0.4);
    const placement: Placement = {
      kind: "blend",
      from: "identity",
      to: f,
      t: p,
    };
    world.setPlacement(draw, placement);
    expect(world.drawPlacement(draw)).toBe(placement);
    const terms = drawTerms(world, draw)!;
    expect(terms).toHaveLength(1);
    for (const x of points(f.center, f.scale, 9, 20)) {
      const expected = Array.from(
        placePosition(placement, x, undefined, new Float64Array(3)),
      );
      const got = placed(draw, terms, x, [0, 0, 0]);
      for (let a = 0; a < 3; a++) {
        expect(got[a]).toBeCloseTo(expected[a]!, 5);
      }
    }
    // A block's rows are those of `blockRows`.
    expect(blockRows(terms)).toBe(1 + TERM_ROWS + latticeRows(1));
    world.removeDraw(draw);
  });

  it("refuses terms the way it refuses placements, writing nothing", () => {
    draw = addQuad();
    const bad = lattice(2, 1);
    bad.coefficients[5] = Number.NaN;
    expect(() =>
      setPlacement(world, draw, [{ term: bad, weight: constantWeight(1) }]),
    ).toThrow(/terms\[0\]\.coefficients\[5\]/);
    expect(() =>
      setPlacement(world, draw, [
        {
          term: lattice(1, 1),
          weight: {
            scale: 1,
            factors: [{ parameter: { value: 0.5 }, offset: 0, slope: 1 }],
          },
        },
      ]),
    ).toThrow(/isn't a parameter of this world/);
    expect(() =>
      setPlacement(world, draw, [
        {
          term: {
            kind: "attribute",
            semantic: "_NOPE",
            absolute: true,
            maxDistance: 1,
          },
          weight: constantWeight(1),
        },
      ]),
    ).toThrow(/no _NOPE attribute of 3 components/);
    expect(drawTerms(world, draw)).toBeUndefined();
    setPlacement(world, draw, undefined);
    world.removeDraw(draw);
  });

  it("grows the draw's bounds by the terms' displacement, weights and all", () => {
    draw = addQuad();
    const k = t(1);
    const l = lattice(2, 5);
    const terms: WarpTerms = [
      {
        term: l,
        weight: { scale: 1, factors: [{ parameter: k, offset: -1, slope: 1 }] },
      },
    ];
    setPlacement(world, draw, terms);
    const placement = world.scene.drawPlacements[draw.index]!;
    expect(placement.pad).toBe(termsMaxDisplacement(terms, placement.reach));
    const before = placement.pad;
    k.value = 5;
    expect(placement.pad).toBeGreaterThan(before);
    expect(placement.pad).toBe(termsMaxDisplacement(terms, placement.reach));
    world.removeDraw(draw);
  });
});
