// Bounds of warps (plan §13.26, increment 3): a draw's sphere moves by the
// displacement at its centre and pads by the residual, for every value in
// its parameters' ranges; a map's drawn bounding sphere and [σ_min, σ_max].
import { describe, expect, it } from "vitest";
import type { FrameKey } from "../src/camera/frameResolver.ts";
import type { Route, Warp } from "../src/camera/route.ts";
import {
  PLACEMENT_TERMS,
  type PlacementParameter,
} from "../src/scene/placement.ts";
import {
  drawnBounds,
  drawnSphere,
  latticeResidual,
  roundUp32,
  routeMap,
  routeSingularRange,
  scaledBounds,
  scaledImage,
  singularValues,
  termBoundsOver,
  weightFollowsValue,
  weightInterval,
} from "../src/scene/warpBounds.ts";
import { placeWithTerms } from "../src/scene/warpEvaluate.ts";
import type {
  CubicLattice,
  TermWeight,
  WarpTerms,
} from "../src/scene/warpTerms.ts";

/** A repeatable stream in [-1, 1) (a linear congruential generator). */
function random(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 2 ** 31 - 1;
  };
}

const parameter = (
  value: number,
  range?: readonly [number, number],
): PlacementParameter => ({ value, ...(range && { range }) });

function lattice(
  cells: number,
  seed: number,
  center: ArrayLike<number>,
  scale: number,
): CubicLattice {
  const next = random(seed);
  return {
    kind: "cubic",
    center,
    scale,
    cells,
    coefficients: Float64Array.from(
      { length: cells ** 3 * PLACEMENT_TERMS * 3 },
      () => next() * 3,
    ),
    errorBound: 0.01,
    estimate: false,
  };
}

describe("weightInterval", () => {
  it("takes the value of a parameter without a range, and the range of one with", () => {
    const free = parameter(0.5);
    const ranged = parameter(0.5, [-1, 3]);
    const w = (factors: TermWeight["factors"], scale = 1): TermWeight => ({
      scale,
      factors,
    });
    expect(weightInterval(w([]))).toEqual([1, 1]);
    expect(
      weightInterval(w([{ parameter: free, offset: -1, slope: 2 }], 3)),
    ).toEqual([0, 0]);
    // 2 − k over k in [−1, 3]: [−1, 3]; negative slope reverses.
    expect(
      weightInterval(w([{ parameter: ranged, offset: 2, slope: -1 }])),
    ).toEqual([-1, 3]);
    // A scale's sign, too.
    expect(
      weightInterval(w([{ parameter: ranged, offset: 2, slope: -1 }], -2)),
    ).toEqual([-6, 2]);
    expect(
      weightFollowsValue(w([{ parameter: free, offset: 0, slope: 1 }])),
    ).toBe(true);
    expect(
      weightFollowsValue(w([{ parameter: ranged, offset: 0, slope: 1 }])),
    ).toBe(false);
    expect(weightFollowsValue(w([]))).toBe(false);
  });

  it("is the extreme over the box of two parameters, and over a quadratic for one used twice", () => {
    const k = parameter(0, [1, 21]);
    const t = parameter(0, [0, 1]);
    // (k − 1)(1 − t): between 0 and 20.
    const morph: TermWeight = {
      scale: 1,
      factors: [
        { parameter: k, offset: -1, slope: 1 },
        { parameter: t, offset: 1, slope: -1 },
      ],
    };
    expect(weightInterval(morph)).toEqual([0, 20]);
    // t (1 − t) peaks at 1/4 inside the range.
    const bump: TermWeight = {
      scale: 1,
      factors: [
        { parameter: t, offset: 0, slope: 1 },
        { parameter: t, offset: 1, slope: -1 },
      ],
    };
    const [lo, hi] = weightInterval(bump);
    expect(lo).toBe(0);
    expect(hi).toBeCloseTo(0.25, 12);
    // Brute force agrees for random weights.
    const next = random(3);
    for (let trial = 0; trial < 40; trial++) {
      const a = parameter(0, [next() * 3, 4 + next() * 3]);
      const b = parameter(0, [-2 + next(), 1 + next()]);
      const weight: TermWeight = {
        scale: next() * 2,
        factors: [
          { parameter: a, offset: next(), slope: next() * 2 },
          {
            parameter: trial % 2 ? a : b,
            offset: next(),
            slope: next() * 2,
          },
        ],
      };
      const [wl, wh] = weightInterval(weight);
      let lowest = Infinity;
      let highest = -Infinity;
      const [a0, a1] = a.range!;
      const [b0, b1] = b.range!;
      for (let i = 0; i <= 60; i++) {
        for (let j = 0; j <= 60; j++) {
          a.value = a0 + ((a1 - a0) * i) / 60;
          b.value = b0 + ((b1 - b0) * j) / 60;
          let w = weight.scale;
          for (const f of weight.factors) {
            w *= f.offset + f.slope * f.parameter.value;
          }
          lowest = Math.min(lowest, w);
          highest = Math.max(highest, w);
        }
      }
      const slack = 1e-9 * (1 + Math.abs(wh) + Math.abs(wl));
      expect(lowest).toBeGreaterThanOrEqual(wl - slack);
      expect(highest).toBeLessThanOrEqual(wh + slack);
      // The bound is no looser than the grid by more than its resolution.
      expect(lowest - wl).toBeLessThan(0.1 * (1 + Math.abs(wl)));
      expect(wh - highest).toBeLessThan(0.1 * (1 + Math.abs(wh)));
    }
  });
});

describe("a draw's moved sphere", () => {
  /** Where the sphere (centre moved by `shift`, radius `r + pad`) fails to hold a placed point; the worst ratio. */
  function worstRatio(
    terms: WarpTerms,
    center: number[],
    radius: number,
    parameters: PlacementParameter[],
    seed: number,
  ): number {
    const bounds = terms.map(({ term }) =>
      termBoundsOver(term, center, radius),
    );
    const { shift, pad } = drawnSphere(terms, bounds);
    const moved = center.map((c, a) => c + shift[a]!);
    const next = random(seed);
    const out = new Float64Array(3);
    let worst = 0;
    // Every corner of the parameters' ranges, and some between.
    const values: number[][] = [];
    for (let corner = 0; corner < 2 ** parameters.length; corner++) {
      values.push(parameters.map((p, i) => p.range![(corner >> i) & 1]!));
    }
    for (let k = 0; k < 4; k++) {
      values.push(
        parameters.map(
          (p) => p.range![0] + ((next() + 1) / 2) * (p.range![1] - p.range![0]),
        ),
      );
    }
    for (const v of values) {
      parameters.forEach((p, i) => {
        p.value = v[i]!;
      });
      for (let i = 0; i < 150; i++) {
        // Inside the sphere and on it.
        let d = [next(), next(), next()];
        const length = Math.hypot(d[0]!, d[1]!, d[2]!) || 1;
        const r = i % 3 === 0 ? radius : radius * ((next() + 1) / 2);
        d = d.map((x) => (x / length) * r);
        const p = center.map((c, a) => c + d[a]!);
        placeWithTerms(terms, p, undefined, out);
        const away = Math.hypot(
          out[0]! - moved[0]!,
          out[1]! - moved[1]!,
          out[2]! - moved[2]!,
        );
        worst = Math.max(worst, away / (radius + pad));
      }
    }
    return worst;
  }

  it("holds every placed point of the sphere, for lattices of 1, 2 and 4 cells and weights of two factors", () => {
    for (const cells of [1, 2, 4]) {
      for (let seed = 1; seed <= 6; seed++) {
        const next = random(seed * 31 + cells);
        const l1 = lattice(cells, seed, [1, -2, 3], 2);
        const l2 = lattice(cells, seed + 100, [1.5, -2.5, 3], 1.5);
        const a = parameter(0, [-1, 2]);
        const b = parameter(0, [0, 1]);
        const free = parameter(0.3);
        const terms: WarpTerms = [
          {
            term: l1,
            weight: {
              scale: 1.5,
              factors: [
                { parameter: a, offset: 0.5, slope: 1 },
                { parameter: b, offset: 1, slope: -2 },
              ],
            },
          },
          {
            term: l2,
            weight: {
              scale: 1,
              factors: [{ parameter: free, offset: 0, slope: 1 }],
            },
          },
        ];
        // Inside the cube, straddling its faces and beyond it.
        for (const reach of [0, 0.7, 1.4]) {
          const center = [
            1 + next() * 2 * reach,
            -2 + next() * 2 * reach,
            3 + next() * 2 * reach,
          ];
          const radius = 0.2 + Math.abs(next()) * 1.6;
          const ratio = worstRatio(
            terms,
            center,
            radius,
            [a, b],
            seed * 7 + cells,
          );
          expect(
            ratio,
            `cells ${cells}, seed ${seed}, reach ${reach}`,
          ).toBeLessThanOrEqual(1 + 1e-9);
        }
      }
    }
  });

  it("holds an attribute term's moves, which have no displacement at the centre", () => {
    const t = parameter(0, [-1, 2]);
    const terms: WarpTerms = [
      {
        term: {
          kind: "attribute",
          semantic: "_P",
          absolute: false,
          maxDistance: 3,
        },
        weight: { scale: 1, factors: [{ parameter: t, offset: 0, slope: 1 }] },
      },
    ];
    const bounds = terms.map(({ term }) => termBoundsOver(term, [0, 0, 0], 1));
    const { shift, pad } = drawnSphere(terms, bounds);
    expect(Array.from(shift)).toEqual([0, 0, 0]);
    // max |t| · maxDistance.
    expect(pad).toBe(6);
  });

  it("is tight where it can be: a linear displacement over a tile fitted to its sphere", () => {
    // D(p) = s (n·δ) n, δ = p − c: |D(p) − D(c)| ≤ s r, reached along n.
    const s = 9;
    const n = [0.6, 0.0, 0.8];
    const radius = 5;
    const coefficients = new Float64Array(PLACEMENT_TERMS * 3);
    for (let axis = 0; axis < 3; axis++) {
      for (let a = 0; a < 3; a++) {
        // monomial 1 + axis is u_axis; u = δ / radius.
        coefficients[(1 + axis) * 3 + a] = s * radius * n[axis]! * n[a]!;
      }
    }
    const l: CubicLattice = {
      kind: "cubic",
      center: [10, 20, 30],
      scale: radius,
      cells: 1,
      coefficients,
      errorBound: 0,
      estimate: false,
    };
    const residual = latticeResidual(l, [10, 20, 30], radius);
    expect(residual).toBeGreaterThanOrEqual(s * radius - 1e-9);
    expect(residual).toBeLessThan(1.01 * s * radius);
    // Off-centre in a finer lattice it is no looser than the same bound.
    const fine = { ...l, cells: 1 };
    expect(latticeResidual(fine, [10, 20, 30], radius / 2)).toBeLessThan(
      0.51 * s * radius,
    );
  });
});

describe("float32 rounding", () => {
  it("never rounds a bound down", () => {
    const next = random(9);
    for (let i = 0; i < 2000; i++) {
      const x = Math.abs(next()) * 10 ** Math.floor(next() * 6 + 3);
      expect(roundUp32(x)).toBeGreaterThanOrEqual(x);
      expect(roundUp32(x) - x).toBeLessThanOrEqual(x * 2 ** -22);
    }
    expect(roundUp32(0.5)).toBe(0.5);
  });
});

// ------------------------------------------------------------------- maps

const R = 6371e3;

/** Height above a sphere of radius R about the origin times `k`, with its Jacobian. */
function exaggerate(
  k: number,
  p: ArrayLike<number>,
  out: Float64Array,
  jacobian?: Float64Array,
): Float64Array {
  const x = p[0]!;
  const y = p[1]!;
  const z = p[2]!;
  const r = Math.hypot(x, y, z);
  const f = R + k * (r - R);
  out[0] = (f * x) / r;
  out[1] = (f * y) / r;
  out[2] = (f * z) / r;
  if (jacobian) {
    const u = [x / r, y / r, z / r];
    for (let c = 0; c < 3; c++) {
      for (let row = 0; row < 3; row++) {
        jacobian[c * 3 + row] =
          (row === c ? f / r : 0) + (k - f / r) * u[row]! * u[c]!;
      }
    }
  }
  return out;
}

const key = (name: string): FrameKey => ({ name });

function exaggeration(k: number): Warp {
  return {
    from: key("itrf"),
    to: key("exaggerated"),
    revision: 1,
    forward: (p, out, jacobian) => exaggerate(k, p, out, jacobian),
  };
}

function route(...steps: Route["steps"][number][]): Route {
  return {
    frame: key("itrf"),
    base: key("exaggerated"),
    seconds: 0,
    steps,
    revision: 1,
  };
}

describe("σ over a volume", () => {
  const box = {
    center: [R + 3000, 0, 0],
    halfAxes: [500, 0, 0, 0, 500, 0, 0, 0, 500],
  };

  it("is [≈1, k] for a vertical exaggeration by k = 10", () => {
    const [low, high] = routeSingularRange(
      route({ kind: "warp", warp: exaggeration(10), inverse: false }),
      box,
    );
    // Radially k; across it (R + kh) / (R + h), which is 1.004 here.
    expect(high).toBeCloseTo(10, 9);
    expect(low).toBeGreaterThan(1);
    expect(low).toBeLessThan(1.01);
    // Compression the other way round: the ray-march step goes by 1/σ_min.
    const [cLow, cHigh] = routeSingularRange(
      route({ kind: "warp", warp: exaggeration(0.2), inverse: false }),
      box,
    );
    expect(cLow).toBeCloseTo(0.2, 9);
    expect(cHigh).toBeLessThan(1);
    // A sphere volume: its centre and axis points.
    const [sLow, sHigh] = routeSingularRange(
      route({ kind: "warp", warp: exaggeration(10), inverse: false }),
      { center: box.center, radius: 500 },
    );
    expect(sHigh).toBeCloseTo(10, 9);
    expect(sLow).toBeLessThan(1.01);
  });

  it("differences a route that has an inverse step, and agrees", () => {
    const w = exaggeration(10);
    // forward then inverse: the identity, σ = 1.
    const [low, high] = routeSingularRange(
      route(
        { kind: "warp", warp: w, inverse: false },
        { kind: "warp", warp: w, inverse: true },
      ),
      box,
    );
    expect(low).toBeCloseTo(1, 3);
    expect(high).toBeCloseTo(1, 3);
  });

  it("carries a rigid step and an after matrix through the Jacobian", () => {
    // A rotation by 90° about z then the exaggeration: σ unchanged.
    // prettier-ignore
    const rotate = Float64Array.of(
      0, 1, 0, 0,
      -1, 0, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1,
    );
    const r = route({ kind: "rigid", matrix: rotate });
    const out = new Float64Array(3);
    const jacobian = new Float64Array(9);
    routeMap(r)([1, 2, 3], out, jacobian);
    expect(Array.from(out)).toEqual([-2, 1, 3]);
    expect(Array.from(singularValues(jacobian))).toEqual([1, 1]);
    // After: a translation, the anchor's inverse place.
    const after = Float64Array.of(
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
      6,
      7,
      1,
    );
    routeMap(r, after)([1, 2, 3], out, jacobian);
    expect(Array.from(out)).toEqual([3, 7, 10]);
  });

  it("gives singular values of a general matrix", () => {
    // diag(3, 1, 2) rotated: [1, 3].
    expect(Array.from(singularValues([3, 0, 0, 0, 1, 0, 0, 0, 2]))).toEqual([
      1, 3,
    ]);
    // A shear [[1, 1], [0, 1]]: φ and 1/φ.
    const [low, high] = singularValues([1, 0, 0, 1, 1, 0, 0, 0, 1]);
    const phi = (1 + Math.sqrt(5)) / 2;
    expect(high).toBeCloseTo(phi, 12);
    expect(low).toBeCloseTo(1 / phi, 12);
  });
});

describe("a map's drawn bounding sphere", () => {
  it("holds the image of the volume, and the ends of a scale's interval", () => {
    const points = [R + 3000, 0, 0, R + 3500, 400, 0, R + 2600, 0, -300];
    const b = drawnBounds(
      [
        routeMap(
          route({ kind: "warp", warp: exaggeration(10), inverse: false }),
        ),
      ],
      points,
    );
    const out = new Float64Array(3);
    for (let i = 0; i < 3; i++) {
      exaggerate(10, points.slice(i * 3, i * 3 + 3), out);
      expect(
        Math.hypot(
          out[0]! - b.center[0]!,
          out[1]! - b.center[1]!,
          out[2]! - b.center[2]!,
        ),
      ).toBeLessThanOrEqual(b.radius + 1e-6);
    }
    // 3 km up moves 27 km: the sphere sits well off the true points.
    expect(b.center[0]!).toBeGreaterThan(R + 20_000);
    expect(b.sigmaMax).toBeCloseTo(10, 9);
  });
});

describe("a map affine in its scale", () => {
  const scaled = (value: number): Warp => ({
    ...exaggeration(10),
    scale: { value },
  });
  const points = [
    R + 3000,
    0,
    0,
    R + 3500,
    400,
    0,
    R + 2600,
    0,
    -300,
    R + 900,
    -600,
    500,
    R + 3300,
    200,
    300,
  ];
  const mapAt = (s: number) =>
    routeMap(route({ kind: "warp", warp: scaled(s), inverse: false }));

  it("gives, from the map at 0 and 1, the bounds drawnBounds gives for an interval, and a little more", () => {
    const image = scaledImage(mapAt(0), mapAt(1), points, 700);
    for (const [low, high] of [
      [0, 1],
      [0.25, 0.3],
      [0.9, 1],
      [0.5, 0.5],
    ] as const) {
      const exact = drawnBounds([mapAt(low), mapAt(high)], points, 700);
      const made = scaledBounds(image, low, high);
      // Holds every image the exact one does, at the interval's scales.
      const out = new Float64Array(3);
      for (const s of [low, (low + high) / 2, high]) {
        const at = mapAt(s);
        for (let i = 0; i < points.length / 3; i++) {
          at(points.slice(i * 3, i * 3 + 3), out);
          expect(
            Math.hypot(
              out[0]! - made.center[0]!,
              out[1]! - made.center[1]!,
              out[2]! - made.center[2]!,
            ),
          ).toBeLessThanOrEqual(made.radius);
        }
      }
      expect(made.radius).toBeGreaterThanOrEqual(exact.radius * 0.999);
      expect(made.radius).toBeLessThan(exact.radius * 1.5 + 10);
      expect(made.sigmaMax).toBeGreaterThanOrEqual(exact.sigmaMax - 1e-9);
      expect(made.sigmaMax).toBeLessThan(exact.sigmaMax * 1.001);
      expect(made.sigmaMin).toBeCloseTo(exact.sigmaMin, 2);
      expect(made.secondDerivative).toBeCloseTo(exact.secondDerivative, 12);
    }
  });

  it("gets tighter as the interval narrows, where the whole range is far larger", () => {
    const image = scaledImage(mapAt(0), mapAt(1), points, 0);
    const whole = scaledBounds(image, 0, 1);
    const near = scaledBounds(image, 0.3, 0.35);
    expect(near.radius).toBeLessThan(whole.radius / 3);
    expect(near.sigmaMax).toBeCloseTo(1 + 9 * 0.35, 6);
  });
});
