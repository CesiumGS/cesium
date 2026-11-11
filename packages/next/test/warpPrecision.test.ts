// The order-0 term of a placed draw's displacement, as hi and lo parts for the
// cull kernel (plan 13.26, the second review's flaw 3): what the placements
// buffer holds, and what float32 arithmetic makes of a draw's drawn place with
// the term added to each vertex in model space (before) and to the
// camera-relative translation, summed exactly (after). The shaders' twins
// below run in `Math.fround` (placement.slang `placementOffset`,
// exactSum.slang, cullTables.slang `drawnTranslation`); the GPU's own numbers
// are spikes/warpPrecision.html.
import { describe, expect, it } from "vitest";
import { installGpuGlobals } from "./fakeGpu.ts";
import {
  LATTICE_HEAD_ROWS,
  PlacementTable,
} from "../src/scene/placementTable.ts";
import {
  PLACEMENT_MONOMIALS,
  PLACEMENT_TERMS,
} from "../src/scene/placement.ts";
import { latticeDisplacement } from "../src/scene/warpEvaluate.ts";
import {
  constantWeight,
  type CubicLattice,
  type WarpTerms,
} from "../src/scene/warpTerms.ts";

installGpuGlobals();

const f = Math.fround;

function twoSum(a: number, b: number): [number, number] {
  const s = f(a + b);
  const v = f(s - a);
  return [s, f(f(a - f(s - v)) + f(b - v))];
}

function highHalf(a: number): number {
  const c = f(4097 * a);
  return f(c - f(c - a));
}

function twoProd(a: number, b: number): [number, number] {
  const p = f(a * b);
  const ah = highHalf(a);
  const al = f(a - ah);
  const bh = highHalf(b);
  const bl = f(b - bh);
  return [p, f(f(f(f(f(ah * bh) - p) + f(ah * bl)) + f(al * bh)) + f(al * bl))];
}

const stubDevice = {
  createBuffer: () => ({ destroy() {} }),
  queue: { writeBuffer() {} },
} as unknown as GPUDevice;

/** A lattice of smooth noise, `variation` m across `scale`, plus `constant`. */
function lattice(
  constant: readonly number[],
  variation: number,
  cells = 2,
  scale = 100_000,
): CubicLattice {
  const coefficients = new Float64Array(cells ** 3 * PLACEMENT_TERMS * 3);
  let seed = 7;
  const next = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 2 ** 32 - 0.5;
  };
  for (let cell = 0; cell < cells ** 3; cell++) {
    for (let k = 0; k < PLACEMENT_TERMS; k++) {
      for (let a = 0; a < 3; a++) {
        coefficients[(cell * PLACEMENT_TERMS + k) * 3 + a] =
          k === 0
            ? constant[a]! + variation * next()
            : (variation / (1 + k)) * next();
      }
    }
  }
  return {
    kind: "cubic",
    center: [0, 0, 0],
    scale,
    cells,
    coefficients,
    errorBound: 0,
    estimate: false,
  };
}

/** The block of one lattice at weight `w`: its words, and where the body starts (in rows). */
function packed(l: CubicLattice, w: number) {
  const table = new PlacementTable(stubDevice, () => {});
  const terms: WarpTerms = [{ term: l, weight: constantWeight(w) }];
  const at = table.add(terms, () => 0);
  const rows = 1 + 3 + LATTICE_HEAD_ROWS + l.cells ** 3 * PLACEMENT_TERMS;
  return { f32: table.words(at, rows).f32, body: 1 + 3 };
}

/** The lattice's cubic at `p` from `coefficients` (3 a row, as float32 holds them), float64 arithmetic. */
function evaluate(
  l: CubicLattice,
  coefficients: ArrayLike<number>,
  p: readonly number[],
): number[] {
  const n = l.cells;
  const s = [0, 1, 2].map((a) => (p[a]! / l.scale + 1) * 0.5 * n);
  const i = s.map((x) => Math.min(Math.max(Math.floor(x), 0), n - 1));
  const v =
    n === 1
      ? [0, 1, 2].map((a) => p[a]! / l.scale)
      : s.map((x, a) => 2 * (x - i[a]!) - 1);
  const cell = (i[2]! * n + i[1]!) * n + i[0]!;
  const d = [0, 0, 0];
  PLACEMENT_MONOMIALS.forEach(([a, b, c], k) => {
    const m = v[0]! ** a * v[1]! ** b * v[2]! ** c;
    for (let axis = 0; axis < 3; axis++) {
      d[axis]! += coefficients[(cell * PLACEMENT_TERMS + k) * 3 + axis]! * m;
    }
  });
  return d;
}

/** placement.slang `placementOffset` for one lattice: the hi and lo of `w` times its constant. */
function offsetOf(
  f32: Float32Array,
  body: number,
  w: number,
): { hi: number[]; lo: number[] } {
  const hi = [0, 0, 0];
  const lo = [0, 0, 0];
  for (let a = 0; a < 3; a++) {
    const [p, pe] = twoProd(w, f32[body * 4 + 4 + a]!);
    const [s, se] = twoSum(hi[a]!, p);
    hi[a] = s;
    lo[a] = f(f(lo[a]! + f(se + pe)) + f(w * f32[body * 4 + 8 + a]!));
  }
  for (let a = 0; a < 3; a++) {
    [hi[a], lo[a]] = twoSum(hi[a]!, lo[a]!);
  }
  return { hi, lo };
}

/** cullTables.slang `drawnTranslation` for an identity `linear`: the origin's offset from the eye, plus the offset. */
function drawnTranslation(
  whole: readonly number[],
  fraction: readonly number[],
  offset: { hi: number[]; lo: number[] },
): number[] {
  return [0, 1, 2].map((i) => {
    const [p, pe] = twoProd(1, offset.hi[i]!);
    const [s, se] = twoSum(whole[i]!, p);
    const small = f(f(fraction[i]! + pe) + f(offset.lo[i]!));
    return f(s + f(se + small));
  });
}

interface Errors {
  /** The worst error of a drawn vertex when the constant is added in model space, m. */
  before: number;
  /** The same, with it in the cull's translation. */
  after: number;
}

/**
 * The worst error, m, over `points` (offsets from the draw's origin) of a
 * vertex's camera-relative drawn place against float64: the camera sits
 * 3 m above where the draw's origin is drawn, `w` times the lattice's
 * displacement from it.
 */
function drawnErrors(
  l: CubicLattice,
  w: number,
  origin: readonly number[],
  points: ReadonlyArray<readonly number[]>,
): Errors {
  const weight = f(w);
  const { f32, body } = packed(l, weight);
  const old = Float32Array.from(l.coefficients);
  const cells = new Float32Array(l.coefficients.length);
  for (let k = 0; k < cells.length / 3; k++) {
    for (let a = 0; a < 3; a++) {
      cells[k * 3 + a] = f32[(body + LATTICE_HEAD_ROWS + k) * 4 + a]!;
    }
  }
  const c = latticeDisplacement(l, l.center, new Float64Array(3));
  const eye = [0, 1, 2].map(
    (a) => origin[a]! + weight * c[a]! + (a === 2 ? 3 : 0),
  );
  const split = (x: number) => {
    const hi = Math.round(x);
    return { hi, lo: f(x - hi) };
  };
  const whole = [0, 1, 2].map((a) => split(origin[a]!).hi - split(eye[a]!).hi);
  const fraction = [0, 1, 2].map((a) =>
    f(split(origin[a]!).lo - split(eye[a]!).lo),
  );
  const offset = offsetOf(f32, body, weight);
  const translation = drawnTranslation(whole, fraction, offset);
  const exact = new Float64Array(3);
  let before = 0;
  let after = 0;
  for (const p of points) {
    latticeDisplacement(l, p, exact);
    const dOld = evaluate(l, old, p);
    const dNew = evaluate(l, cells, p);
    for (let a = 0; a < 3; a++) {
      const truth = origin[a]! + p[a]! + weight * exact[a]! - eye[a]!;
      const rel = f(whole[a]! + fraction[a]!);
      const was = f(rel + f(f(p[a]!) + f(weight * f(dOld[a]!))));
      const now = f(translation[a]! + f(f(p[a]!) + f(weight * f(dNew[a]!))));
      before = Math.max(before, Math.abs(was - truth));
      after = Math.max(after, Math.abs(now - truth));
    }
  }
  return { before, after };
}

function street(n: number, extent: number): number[][] {
  let seed = 11;
  const next = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return (seed / 2 ** 32 - 0.5) * 2 * extent;
  };
  return Array.from({ length: n }, () => [next(), next(), next()]);
}

const ORIGIN = [1_234_567.89, -2_345_678.91, 5_432_109.37];

describe("the order-0 term of a placement", () => {
  it("is packed as hi and lo, and the cells hold the rest", () => {
    const l = lattice([37_110.33, -2_555.55, 4_001.001], 800);
    const { f32, body } = packed(l, 1);
    const c = latticeDisplacement(l, l.center, new Float64Array(3));
    for (let a = 0; a < 3; a++) {
      const sum = f32[body * 4 + 4 + a]! + f32[body * 4 + 8 + a]!;
      expect(Math.abs(sum - c[a]!)).toBeLessThan(1e-10);
    }
    for (let cell = 0; cell < l.cells ** 3; cell++) {
      for (let a = 0; a < 3; a++) {
        const row = (body + LATTICE_HEAD_ROWS + cell * PLACEMENT_TERMS) * 4;
        expect(f32[row + a]).toBe(
          f(l.coefficients[cell * PLACEMENT_TERMS * 3 + a]! - c[a]!),
        );
      }
      // The other monomials are as the fit made them.
      const row = (body + LATTICE_HEAD_ROWS + cell * PLACEMENT_TERMS + 5) * 4;
      expect(f32[row]).toBe(
        f(l.coefficients[(cell * PLACEMENT_TERMS + 5) * 3]!),
      );
    }
  });

  it("is zero for a lattice with no displacement, and a weight scales it", () => {
    const l = lattice([0, 0, 0], 0);
    const { f32, body } = packed(l, 1);
    expect(Array.from(f32.subarray(body * 4 + 4, body * 4 + 12))).toEqual(
      new Array(8).fill(0),
    );
    const constant = [37_110.33, 12_345.678, -9_876.5];
    const big = packed(lattice(constant, 0, 1), 0.4);
    const offset = offsetOf(big.f32, big.body, f(0.4));
    for (let a = 0; a < 3; a++) {
      expect(
        Math.abs(offset.hi[a]! + offset.lo[a]! - f(0.4) * constant[a]!),
      ).toBeLessThan(5e-5);
    }
  });

  it("drops the float32 error of a 37 km displacement from millimetres to below a tenth of one", () => {
    const l = lattice([31_000.77, -20_333.31, 5_555.55], 800, 2);
    const points = street(60, 20);
    for (const w of [1, 0.4]) {
      const { before, after } = drawnErrors(l, w, ORIGIN, points);
      expect(after).toBeLessThan(1e-4);
      expect(before).toBeGreaterThan(5 * after);
    }
    const { before, after } = drawnErrors(l, 1, ORIGIN, points);
    expect(before).toBeGreaterThan(1e-3);
    expect(after).toBeLessThan(1e-4);
  });

  it("drops it from decimetres to below a tenth of a millimetre for a whole-world map at street level", () => {
    const l = lattice([3_000_000.37, 2_000_000.61, 1_234.567], 0.001, 1, 1e7);
    const { before, after } = drawnErrors(l, 1, ORIGIN, street(60, 20));
    expect(before).toBeGreaterThan(0.05);
    expect(after).toBeLessThan(1e-4);
  });

  it("leaves a point source's kernel the whole displacement: the constant and the cells", () => {
    const l = lattice([37_110.33, -2_555.55, 4_001.001], 800);
    const w = f(0.4);
    const { f32, body } = packed(l, w);
    const cells = new Float32Array(l.coefficients.length);
    for (let k = 0; k < cells.length / 3; k++) {
      for (let a = 0; a < 3; a++) {
        cells[k * 3 + a] = f32[(body + LATTICE_HEAD_ROWS + k) * 4 + a]!;
      }
    }
    const exact = new Float64Array(3);
    for (const p of street(40, 20_000)) {
      // placement.slang `placeAnchor`: w (constant + cells), in one float32.
      const residual = evaluate(l, cells, p);
      const d = [0, 1, 2].map(
        (a) =>
          w * (f32[body * 4 + 4 + a]! + f32[body * 4 + 8 + a]! + residual[a]!),
      );
      latticeDisplacement(l, p, exact);
      for (let a = 0; a < 3; a++) {
        expect(Math.abs(d[a]! - w * exact[a]!)).toBeLessThan(2e-3);
      }
    }
  });
});
