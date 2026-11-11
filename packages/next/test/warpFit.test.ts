// Fitting a route's displacement with a lattice of cubics, and the cache that makes the fits lazily (placement increment 1, slice B).
import { describe, expect, it } from "vitest";
import { routeForward, type Route, type Warp } from "../src/camera/route.ts";
import { Ellipsoid, fromDegrees } from "../src/math/ellipsoid.ts";
import { fromBasis, mat4, multiply } from "../src/math/mat4.ts";
import { PLACEMENT_MONOMIALS } from "../src/scene/placement.ts";
import {
  affinePart,
  evaluateLattice,
  fitLattice,
  routeDisplacement,
} from "../src/scene/warpFit.ts";
import { WarpFitCache } from "../src/scene/warpFitCache.ts";
import type { CubicLattice } from "../src/scene/warpTerms.ts";

// A deterministic generator, so the runs are repeatable.
function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function randomInBall(
  next: () => number,
  center: ArrayLike<number>,
  r: number,
) {
  for (;;) {
    const u = [next() * 2 - 1, next() * 2 - 1, next() * 2 - 1];
    if (u[0]! ** 2 + u[1]! ** 2 + u[2]! ** 2 <= 1) {
      return new Float64Array(u.map((x, i) => center[i]! + r * x));
    }
  }
}

const WGS84 = Ellipsoid.WGS84;

/** ENU at (lon, lat, height) → ECEF. */
function enuToEcef(
  lonDeg: number,
  latDeg: number,
  height: number,
): Float64Array {
  const c = fromDegrees(lonDeg, latDeg, height);
  const sl = Math.sin(c.longitude);
  const cl = Math.cos(c.longitude);
  const sp = Math.sin(c.latitude);
  const cp = Math.cos(c.latitude);
  const origin = WGS84.cartographicToCartesian(c, new Float64Array(3));
  return fromBasis(
    mat4(),
    new Float64Array([-sl, cl, 0]),
    new Float64Array([-sp * cl, -sp * sl, cp]),
    new Float64Array([cp * cl, cp * sl, sp]),
    origin,
  );
}

/** p ↦ p + (k − 1)·h(p)·n(p), with the exact ellipsoidal height and normal. */
function exaggeration(k: number): Warp {
  const c = fromDegrees(0, 0, 0);
  const n = new Float64Array(3);
  const q = new Float64Array(3);
  return {
    from: { name: "ECEF" },
    to: { name: "ECEF" },
    presentation: true,
    revision: 1,
    description: `vertical exaggeration × ${k}`,
    forward(p, out) {
      q.set([p[0]!, p[1]!, p[2]!]);
      WGS84.cartesianToCartographic(q, c);
      WGS84.geodeticSurfaceNormalCartographic(c, n);
      const s = (k - 1) * c.height;
      out[0] = p[0]! + s * n[0]!;
      out[1] = p[1]! + s * n[1]!;
      out[2] = p[2]! + s * n[2]!;
      return out;
    },
  };
}

function exaggerationRoute(enu: Float64Array, k: number): Route {
  return {
    frame: { name: "ENU" },
    base: { name: "ECEF" },
    seconds: 0,
    steps: [
      { kind: "rigid", matrix: enu },
      { kind: "warp", warp: exaggeration(k), inverse: false },
    ],
    presentation: true,
    revision: 1,
  };
}

describe("fitLattice", () => {
  it("reproduces a cubic to rounding with one cell", () => {
    const next = rng(1);
    const coefficients = PLACEMENT_MONOMIALS.map(() => [
      next() * 50 - 25,
      next() * 50 - 25,
      next() * 50 - 25,
    ]);
    const center = [1200, -340, 77];
    const scale = 300;
    const cubic = (p: Float64Array, out: Float64Array) => {
      const u = [0, 1, 2].map((a) => (p[a]! - center[a]!) / scale);
      out.fill(0);
      PLACEMENT_MONOMIALS.forEach(([a, b, c], k) => {
        const m = u[0]! ** a * u[1]! ** b * u[2]! ** c;
        for (let i = 0; i < 3; i++) {
          out[i] = out[i]! + coefficients[k]![i]! * m;
        }
      });
    };
    const fit = fitLattice(cubic, { center, scale }, { tolerance: 1e-6 });
    expect(fit.cells).toBe(1);
    expect(fit.estimate).toBe(true);
    expect(fit.errorBound).toBeLessThan(1e-9 * 25);
    const d = new Float64Array(3);
    const e = new Float64Array(3);
    const p = new Float64Array(3);
    for (let i = 0; i < 200; i++) {
      p.set(randomInBall(next, center, scale));
      cubic(p, d);
      evaluateLattice(fit, p, e);
      expect(
        Math.hypot(e[0]! - d[0]!, e[1]! - d[1]!, e[2]! - d[2]!),
      ).toBeLessThan(1e-8);
    }
    // The coefficients are the cubic's own, in v = u.
    for (let k = 0; k < 20; k++) {
      for (let i = 0; i < 3; i++) {
        expect(fit.coefficients[3 * k + i]).toBeCloseTo(
          coefficients[k]![i]!,
          8,
        );
      }
    }
  });

  it("improves monotonically with cells on a sinusoid, and stops at the tolerance", () => {
    const wave = (p: Float64Array, out: Float64Array) => {
      out[0] = 3 * Math.sin(p[0]! / 40) + 0.5 * Math.cos(p[1]! / 25);
      out[1] = 2 * Math.sin((p[1]! + p[2]!) / 55);
      out[2] = Math.cos(p[2]! / 30) * Math.sin(p[0]! / 70);
    };
    const tile = { center: [10, -20, 5], scale: 200 };
    const bounds = [1, 2, 4, 8].map(
      (maxCells) =>
        fitLattice(wave, tile, { tolerance: 0, maxCells }).errorBound,
    );
    for (let i = 1; i < bounds.length; i++) {
      expect(bounds[i]!).toBeLessThan(bounds[i - 1]!);
    }
    expect(bounds[3]!).toBeLessThan(bounds[0]! / 100);
    const target = (bounds[1]! + bounds[2]!) / 2;
    const fit = fitLattice(wave, tile, { tolerance: target });
    expect(fit.cells).toBe(4);
    expect(fit.errorBound).toBeLessThanOrEqual(target);
    expect(fit.operation).toBeUndefined();
    expect(
      fitLattice(wave, tile, { tolerance: 0, maxCells: 4, operation: "wave" })
        .operation,
    ).toBe("wave");
  });

  it("rejects non-finite displacements and bad tiles", () => {
    const tile = { center: [0, 0, 0], scale: 1 };
    expect(() =>
      fitLattice((_p, out) => out.fill(NaN), tile, { tolerance: 1 }),
    ).toThrow(RangeError);
    expect(() =>
      fitLattice(
        (_p, out) => out.fill(0),
        { ...tile, scale: 0 },
        { tolerance: 1 },
      ),
    ).toThrow(RangeError);
  });
});

describe("vertical exaggeration over WGS84 heights", () => {
  const rows: string[] = [];
  const cases = [
    { name: "Everest 10 km", radius: 1e4, geometricError: 100, height: 7000 },
    { name: "coarse 1000 km", radius: 1e6, geometricError: 50000, height: 0 },
  ];
  for (const c of cases) {
    for (const [label, tolerance] of [
      ["1 mm", 1e-3],
      ["gE/64", c.geometricError / 64],
    ] as const) {
      it(`${c.name}, ${label}: independent check on 2,000 points`, () => {
        const enu = enuToEcef(86.925, 27.9881, c.height);
        const route = exaggerationRoute(enu, 10);
        const d = routeDisplacement(route, mat4(), affinePart(route));
        const t0 = performance.now();
        const fit = fitLattice(
          d,
          { center: [0, 0, 0], scale: c.radius },
          {
            tolerance,
            operation: "exaggeration × 10",
          },
        );
        const ms = performance.now() - t0;
        const next = rng(7);
        const p = new Float64Array(3);
        const truth = new Float64Array(3);
        const got = new Float64Array(3);
        let worst = 0;
        for (let i = 0; i < 2000; i++) {
          p.set(randomInBall(next, [0, 0, 0], c.radius));
          d(p, truth);
          evaluateLattice(fit, p, got);
          worst = Math.max(
            worst,
            Math.hypot(
              got[0]! - truth[0]!,
              got[1]! - truth[1]!,
              got[2]! - truth[2]!,
            ),
          );
        }
        const ratio = worst / fit.errorBound;
        rows.push(
          `${c.name.padEnd(15)} tol ${label.padEnd(5)} ${tolerance.toPrecision(3).padStart(9)} m  cells ${fit.cells}  errorBound ${fit.errorBound.toExponential(2)} m  max/bound ${ratio.toFixed(2)}  ${ms.toFixed(1)} ms`,
        );
        expect(worst).toBeLessThanOrEqual(fit.errorBound * 1.5 + 1e-8);
        if (fit.cells < 8) {
          expect(fit.errorBound).toBeLessThanOrEqual(tolerance);
        }
      });
    }
  }

  it("reports the table", () => {
    console.log(`\n${rows.join("\n")}`);
    expect(rows.length).toBe(4);
  });

  it("times a 1-cell and a 4-cell fit", () => {
    const route = exaggerationRoute(enuToEcef(86.925, 27.9881, 0), 10);
    const d = routeDisplacement(route, mat4(), affinePart(route));
    const time = (cells: number) => {
      const t0 = performance.now();
      const fit = fitLattice(
        d,
        { center: [0, 0, 0], scale: 1e6 },
        {
          tolerance: 0,
          maxCells: cells,
        },
      );
      return { ms: performance.now() - t0, fit };
    };
    time(1);
    const one = time(1);
    const four = time(4);
    expect(four.fit.cells).toBe(4);
    console.log(
      `\n1-cell fit ${one.ms.toFixed(1)} ms; fit to 4 cells (1+8+64 cells) ${four.ms.toFixed(1)} ms`,
    );
  });
});

describe("routeDisplacement", () => {
  const rotation = (axis: number[], angle: number, t: number[]) => {
    const [x, y, z] = axis.map((a) => a / Math.hypot(...axis)) as [
      number,
      number,
      number,
    ];
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    const k = 1 - c;
    return new Float64Array([
      c + x * x * k,
      y * x * k + z * s,
      z * x * k - y * s,
      0,
      x * y * k - z * s,
      c + y * y * k,
      z * y * k + x * s,
      0,
      x * z * k + y * s,
      y * z * k - x * s,
      c + z * z * k,
      0,
      t[0]!,
      t[1]!,
      t[2]!,
      1,
    ]);
  };
  const shear: Warp = {
    from: { name: "A" },
    to: { name: "B" },
    presentation: false,
    revision: 1,
    forward(p, out) {
      out[0] = p[0]! + 40 * Math.sin(p[1]! / 3000);
      out[1] = p[1]! + (0.01 * p[0]! ** 2) / 1000;
      out[2] = p[2]! - 5 * Math.cos(p[0]! / 2000);
      return out;
    },
  };

  it("satisfies affine · (p + D(p)) = route(modelToFrame · p), and fits through", () => {
    const toEcef = rotation([1, 2, 3], 0.7, [4.2e6, 1.3e6, 4.4e6]);
    const after = rotation([0, 0, 1], -0.2, [10, 20, 30]);
    const route: Route = {
      frame: { name: "model" },
      base: { name: "world" },
      seconds: 0,
      steps: [
        { kind: "rigid", matrix: toEcef },
        { kind: "warp", warp: shear, inverse: false },
        { kind: "rigid", matrix: after },
      ],
      presentation: false,
      revision: 3,
    };
    const modelToFrame = rotation([0, 1, 0], 0.3, [100, -50, 25]);
    const affine = multiply(mat4(), affinePart(route), modelToFrame);
    const d = routeDisplacement(route, modelToFrame, affine);
    const next = rng(3);
    const p = new Float64Array(3);
    const frame = new Float64Array(3);
    const D = new Float64Array(3);
    const want = new Float64Array(3);
    const moved = new Float64Array(3);
    for (let i = 0; i < 100; i++) {
      p.set(randomInBall(next, [0, 0, 0], 5000));
      d(p, D);
      for (let r = 0; r < 3; r++) {
        const q = [p[0]! + D[0]!, p[1]! + D[1]!, p[2]! + D[2]!];
        moved[r] =
          affine[r]! * q[0]! +
          affine[4 + r]! * q[1]! +
          affine[8 + r]! * q[2]! +
          affine[12 + r]!;
      }
      for (let r = 0; r < 3; r++) {
        frame[r] =
          modelToFrame[r]! * p[0]! +
          modelToFrame[4 + r]! * p[1]! +
          modelToFrame[8 + r]! * p[2]! +
          modelToFrame[12 + r]!;
      }
      routeForward(route, frame, want);
      for (let r = 0; r < 3; r++) {
        expect(Math.abs(moved[r]! - want[r]!)).toBeLessThan(1e-7);
      }
    }
    const fit = fitLattice(
      d,
      { center: [0, 0, 0], scale: 5000 },
      { tolerance: 1e-2 },
    );
    expect(fit.errorBound).toBeLessThanOrEqual(1e-2);
  });

  it("is zero for a rigid route, and affinePart ignores warps", () => {
    const m = rotation([1, 1, 0], 1.1, [6e6, 1, 2]);
    const route: Route = {
      frame: { name: "a" },
      base: { name: "b" },
      seconds: 0,
      steps: [{ kind: "rigid", matrix: m }],
      presentation: false,
      revision: 1,
    };
    expect(Array.from(affinePart(route))).toEqual(Array.from(m));
    const d = routeDisplacement(route, mat4(), m);
    const out = new Float64Array(3);
    d(new Float64Array([123, -456, 789]), out);
    expect(Math.hypot(...out)).toBeLessThan(1e-8);
  });
});

describe("WarpFitCache", () => {
  const lattice = (tag: number): CubicLattice => ({
    kind: "cubic",
    center: [0, 0, 0],
    scale: 1,
    cells: 1,
    coefficients: new Float64Array(60),
    errorBound: tag,
    estimate: true,
  });
  const clock = () => {
    let t = 0;
    return { now: () => t, tick: (ms: number) => void (t += ms) };
  };

  it("returns undefined until the first fit, then the fit", () => {
    const cache = new WarpFitCache();
    let runs = 0;
    const job = () => {
      runs++;
      return lattice(1);
    };
    expect(cache.request("a", "world", 1, job)).toBeUndefined();
    expect(cache.pending).toBe(1);
    expect(cache.run(10)).toBe(1);
    expect(cache.pending).toBe(0);
    expect(cache.request("a", "world", 1, job)?.errorBound).toBe(1);
    expect(runs).toBe(1);
    expect(cache.pending).toBe(0);
  });

  it("respects the budget, always runs one, and runs the newest first", () => {
    const cache = new WarpFitCache();
    const c = clock();
    const order: string[] = [];
    for (const k of ["a", "b", "c", "d"]) {
      cache.request(k, "w", 1, () => {
        order.push(k);
        c.tick(4);
        return lattice(0);
      });
    }
    expect(cache.run(6, c.now)).toBe(2);
    expect(order).toEqual(["d", "c"]);
    expect(cache.pending).toBe(2);
    expect(cache.run(0, c.now)).toBe(1);
    expect(order).toEqual(["d", "c", "b"]);
    expect(cache.run(100, c.now)).toBe(1);
    expect(cache.run(100, c.now)).toBe(0);
  });

  it("returns the stale fit while a new revision is pending, then the new one", () => {
    const cache = new WarpFitCache();
    cache.request("a", "w", 1, () => lattice(1));
    cache.run(10);
    expect(cache.request("a", "w", 2, () => lattice(2))?.errorBound).toBe(1);
    expect(cache.pending).toBe(1);
    expect(cache.request("a", "w", 2, () => lattice(3))?.errorBound).toBe(1);
    expect(cache.pending).toBe(1);
    cache.run(10);
    expect(cache.request("a", "w", 2, () => lattice(9))?.errorBound).toBe(3);
    expect(cache.pending).toBe(0);
  });

  it("refits for another root, with no stale fit of the other root's", () => {
    const cache = new WarpFitCache();
    cache.request("a", "w", 1, () => lattice(1));
    cache.run(10);
    expect(cache.request("a", "other", 1, () => lattice(2))).toBeUndefined();
    expect(cache.pending).toBe(1);
    cache.run(10);
    expect(cache.request("a", "other", 1, () => lattice(0))?.errorBound).toBe(
      2,
    );
    expect(cache.request("a", "w", 1, () => lattice(0))?.errorBound).toBe(1);
  });

  it("evicts the least recently requested over the cap, and forgets", () => {
    const cache = new WarpFitCache(3);
    for (const k of ["a", "b", "c"]) {
      cache.request(k, "w", 1, () => lattice(1));
    }
    cache.run(100);
    cache.request("a", "w", 1, () => lattice(0));
    cache.request("d", "w", 1, () => lattice(1));
    expect(cache.size).toBe(3);
    expect(cache.request("b", "w", 1, () => lattice(5))).toBeUndefined();
    expect(cache.request("a", "w", 1, () => lattice(0))?.errorBound).toBe(1);
    cache.forget("a");
    expect(cache.request("a", "w", 1, () => lattice(6))).toBeUndefined();
    cache.forget("zzz");
  });

  it("keeps the last few variants of a key, and takes and restores its fits", () => {
    const cache = new WarpFitCache(512, 2);
    for (const v of ["a", "b", "c"]) {
      cache.request("k", v, 1, () => lattice(v.charCodeAt(0)));
      cache.run(10);
    }
    // "a", the least recently requested, was dropped.
    expect(cache.size).toBe(2);
    expect(cache.request("k", "a", 1, () => lattice(0))).toBeUndefined();
    cache.run(10);
    const fits = cache.take("k");
    expect(fits.map((f) => f.variant).sort()).toEqual(["a", "c"]);
    expect(cache.size).toBe(0);
    for (const fit of fits) {
      cache.restore("k", fit);
    }
    expect(cache.pending).toBe(0);
    expect(cache.current("k", "c", 1)?.errorBound).toBe(99);
    expect(cache.request("k", "a", 1, () => lattice(5))?.errorBound).toBe(0);
    expect(cache.pending).toBe(0);
  });

  it("drops a job that throws and keeps the others", () => {
    const cache = new WarpFitCache();
    cache.request("a", "w", 1, () => lattice(1));
    cache.request("b", "w", 1, () => {
      throw new Error("no");
    });
    expect(() => cache.run(10)).toThrow("no");
    expect(cache.pending).toBe(1);
    expect(cache.run(10)).toBe(1);
  });
});
