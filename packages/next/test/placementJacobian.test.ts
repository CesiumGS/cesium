// A draw's placement Jacobian (plan 13.26, increment 2a): the float64 CPU
// twin of shaders/placement.slang's `placeVertex` Jacobian against central
// differences of the placement itself, and normals turned by its cofactor
// matrix against the geometry of small placed triangles. Also the fragment
// stage's rebuild of a placed draw's position (surface.slang
// `drawnPosition`) in float64, through the engine's own view matrices, and
// the varyings' count.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as m4 from "../src/math/mat4.ts";
import { Camera } from "../src/scene/Camera.ts";
import {
  PLACEMENT_TERMS,
  type PlacementParameter,
} from "../src/scene/placement.ts";
import {
  latticeJacobian,
  placeJacobianWithTerms,
  placeWithTerms,
  turnNormalByJacobian,
} from "../src/scene/warpEvaluate.ts";
import { fitLattice } from "../src/scene/warpFit.ts";
import type {
  AttributeTerm,
  CubicLattice,
  WarpTerms,
} from "../src/scene/warpTerms.ts";

/** A deterministic generator in [−1, 1). */
function random(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 2 ** 31 - 1;
  };
}

const parameter = (value: number): PlacementParameter => ({ value });

function lattice(cells: number, seed: number, scale = 2): CubicLattice {
  const next = random(seed);
  return {
    kind: "cubic",
    center: [1, -2, 3],
    scale,
    cells,
    coefficients: Float64Array.from(
      { length: cells ** 3 * PLACEMENT_TERMS * 3 },
      () => next() * 0.1,
    ),
    errorBound: 0,
    estimate: false,
  };
}

/**
 * Points in the tile and outside it that are not near a cell boundary of any
 * of `ls` (which share a centre and scale), `reach` tiles' radii out at most.
 */
function points(
  ls: CubicLattice[],
  seed: number,
  count = 60,
  reach = 3,
): number[][] {
  const next = random(seed);
  const l = ls[0]!;
  const out: number[][] = [];
  while (out.length < count) {
    const r = out.length < count * 0.7 ? 1 : reach;
    const p = [0, 1, 2].map((a) => l.center[a]! + next() * l.scale * r);
    const away = ls.every((m) =>
      p.every((x, a) => {
        const s = (((x - m.center[a]!) / m.scale + 1) / 2) * m.cells;
        return Math.abs(s - Math.round(s)) > 1e-3;
      }),
    );
    if (away) {
      out.push(p);
    }
  }
  return out;
}

const weighted = (
  term: CubicLattice | AttributeTerm,
  scale: number,
  factors: Array<[number, number, number]> = [],
) => ({
  term,
  weight: {
    scale,
    factors: factors.map(([value, offset, slope]) => ({
      parameter: parameter(value),
      offset,
      slope,
    })),
  },
});

/** The columns of `J` (`out[3 * column + row]`) by central differences of `placeWithTerms`. */
function difference(
  terms: WarpTerms,
  p: number[],
  h: number,
  out: Float64Array,
): void {
  const a = new Float64Array(3);
  const b = new Float64Array(3);
  for (let axis = 0; axis < 3; axis++) {
    const up = [...p];
    const down = [...p];
    up[axis]! += h;
    down[axis]! -= h;
    placeWithTerms(terms, up, undefined, a);
    placeWithTerms(terms, down, undefined, b);
    for (let row = 0; row < 3; row++) {
      out[axis * 3 + row] = (a[row]! - b[row]!) / (2 * h);
    }
  }
}

const IDENTITY = [1, 0, 0, 0, 1, 0, 0, 0, 1];

describe("the placement Jacobian", () => {
  it("is the identity without terms or under an attribute term alone", () => {
    const out = new Float64Array(9);
    expect(Array.from(placeJacobianWithTerms([], [1, 2, 3], out))).toEqual(
      IDENTITY,
    );
    const morph: AttributeTerm = {
      kind: "attribute",
      semantic: "_PARTNER",
      absolute: true,
      maxDistance: 4,
    };
    expect(
      Array.from(
        placeJacobianWithTerms(
          [weighted(morph, 1, [[0.5, 0, 1]])],
          [1, 2, 3],
          out,
        ),
      ),
    ).toEqual(IDENTITY);
  });

  it("reads a one-cell lattice's coefficient columns in Slang's layout", () => {
    // D = c · u.x · u.y: ∂D/∂x = c · u.y / scale, ∂D/∂y = c · u.x / scale.
    const coefficients = new Float64Array(PLACEMENT_TERMS * 3);
    coefficients.set([0.5, -1, 2], 5 * 3); // monomial 5 is x·y
    const l: CubicLattice = {
      kind: "cubic",
      center: [0, 0, 0],
      scale: 4,
      cells: 1,
      coefficients,
      errorBound: 0,
      estimate: false,
    };
    const out = new Float64Array(9);
    latticeJacobian(l, [2, 1, 7], out);
    // u = (0.5, 0.25, 1.75)
    expect(Array.from(out)).toEqual([
      ...[0.5, -1, 2].map((c) => (c * 0.25) / 4),
      ...[0.5, -1, 2].map((c) => (c * 0.5) / 4),
      0,
      0,
      0,
    ]);
    // J = I + w · dD/dp, column-major: column 0 is ∂/∂x.
    const j = placeJacobianWithTerms([weighted(l, 2)], [2, 1, 7], out);
    expect(j[0]).toBeCloseTo(1 + 2 * 0.5 * 0.0625, 12);
    expect(j[1]).toBeCloseTo(2 * -1 * 0.0625, 12);
    expect(j[3]).toBeCloseTo(2 * 0.5 * 0.125, 12);
    expect(j[4]).toBeCloseTo(1 + 2 * -1 * 0.125, 12);
  });

  it("matches central differences of the placement: cells, factors, t outside [0, 1], outside the tile", () => {
    const terms: WarpTerms = [
      weighted(lattice(4, 11), 1, [
        [1.7, -1, 1],
        [-0.4, 1, 0.5],
      ]),
      weighted(lattice(2, 12), 0.5, [[1.8, 0, 1]]),
      weighted(lattice(1, 13), -2),
    ];
    const j = new Float64Array(9);
    const fd = new Float64Array(9);
    for (const subset of [[0], [1], [2], [0, 1, 2]]) {
      const chosen = subset.map((i) => terms[i]!);
      const ls = chosen.map(({ term }) => term as CubicLattice);
      for (const p of points(ls, 21)) {
        placeJacobianWithTerms(chosen, p, j);
        difference(chosen, p, 1e-6, fd);
        // Each cell's cubic is a polynomial: the difference is exact to
        // rounding, whatever the cell or how far outside.
        const scale = Math.max(1, ...fd.map(Math.abs));
        for (let i = 0; i < 9; i++) {
          expect(Math.abs(j[i]! - fd[i]!) / scale).toBeLessThan(1e-6);
        }
      }
    }
  });

  it("matches differences of a fitted warp (k = 10 over a height wave) at its vertices", () => {
    const wave = (p: ArrayLike<number>, out: Float64Array) => {
      out[0] = 0;
      out[1] = 0;
      out[2] = 0.08 * Math.sin(2 * p[0]! + 0.3) * Math.cos(1.5 * p[1]!);
    };
    const fit = fitLattice(
      wave,
      { center: [0, 0, 0], scale: 1.5 },
      { tolerance: 1e-4 },
    );
    const k = parameter(10);
    const terms: WarpTerms = [
      {
        term: fit,
        weight: { scale: 1, factors: [{ parameter: k, offset: -1, slope: 1 }] },
      },
    ];
    const j = new Float64Array(9);
    const fd = new Float64Array(9);
    for (const q of points([fit], 31, 60, 1)) {
      placeJacobianWithTerms(terms, q, j);
      difference(terms, q, 1e-6, fd);
      for (let i = 0; i < 9; i++) {
        expect(j[i]).toBeCloseTo(fd[i]!, 5);
      }
    }
  });
});

describe("normals turned by the cofactor matrix", () => {
  const sub = (a: ArrayLike<number>, b: ArrayLike<number>) => [
    a[0]! - b[0]!,
    a[1]! - b[1]!,
    a[2]! - b[2]!,
  ];
  const cross = (a: number[], b: number[]) => [
    a[1]! * b[2]! - a[2]! * b[1]!,
    a[2]! * b[0]! - a[0]! * b[2]!,
    a[0]! * b[1]! - a[1]! * b[0]!,
  ];
  const dot = (a: ArrayLike<number>, b: ArrayLike<number>) =>
    a[0]! * b[0]! + a[1]! * b[1]! + a[2]! * b[2]!;
  const unit = (a: number[]) => {
    const n = Math.hypot(...a);
    return a.map((x) => x / n);
  };

  it("stay perpendicular to the placed triangle's plane, steep warps included", () => {
    // A k = 10 exaggeration of a height wave: slopes ten times steeper.
    const wave = (p: ArrayLike<number>, out: Float64Array) => {
      out[0] = 0;
      out[1] = 0;
      out[2] = 0.08 * Math.sin(2 * p[0]! + 0.3) * Math.cos(1.5 * p[1]!);
    };
    const fit = fitLattice(
      wave,
      { center: [0, 0, 0], scale: 1.5 },
      { tolerance: 1e-4 },
    );
    const terms: WarpTerms = [
      { term: fit, weight: { scale: 9, factors: [] } },
      weighted(lattice(2, 5, 1.5), 0.3),
    ];
    const next = random(77);
    const j = new Float64Array(9);
    const turned = new Float64Array(3);
    const placed = [0, 1, 2].map(() => new Float64Array(3));
    let turnedMost = 0;
    for (let i = 0; i < 80; i++) {
      const p0 = [next() * 0.9, next() * 0.9, next() * 0.2];
      const n = unit([next(), next(), 1 + next() * 0.3]);
      // Two edges spanning the plane through p0 with normal n.
      const e1 = unit(cross(n, [0.3 + next() * 0.1, 0.1, 1]));
      const e2 = unit(cross(n, e1));
      const h = 1e-5;
      const vertices = [
        p0,
        [0, 1, 2].map((k) => p0[k]! + h * e1[k]!),
        [0, 1, 2].map((k) => p0[k]! + h * e2[k]!),
      ];
      vertices.forEach((v, k) =>
        placeWithTerms(terms, v, undefined, placed[k]!),
      );
      const centroid = [0, 1, 2].map(
        (k) => (vertices[0]![k]! + vertices[1]![k]! + vertices[2]![k]!) / 3,
      );
      placeJacobianWithTerms(terms, centroid, j);
      turnNormalByJacobian(j, n, turned);
      const a = sub(placed[1]!, placed[0]!);
      const b = sub(placed[2]!, placed[0]!);
      const geometric = unit(cross(a, b));
      const sign = dot(geometric, turned) < 0 ? -1 : 1;
      expect(
        Math.hypot(
          ...sub(
            geometric.map((x) => x * sign),
            turned,
          ),
        ),
      ).toBeLessThan(1e-5);
      // Perpendicular to the placed plane's edges, and unit.
      expect(Math.abs(dot(turned, unit(a)))).toBeLessThan(1e-5);
      expect(Math.abs(dot(turned, unit(b)))).toBeLessThan(1e-5);
      expect(Math.hypot(...turned)).toBeCloseTo(1, 12);
      turnedMost = Math.max(turnedMost, Math.acos(Math.min(1, dot(turned, n))));
    }
    // The turn matters: more than 10 degrees at the worst of these.
    expect((turnedMost * 180) / Math.PI).toBeGreaterThan(10);
  });

  it("keeps a normal on its side under a fold (negative determinant): it is J⁻ᵀ n", () => {
    const flip = [1, 0, 0, 0, 1, 0, 0, 0, -1];
    const out = new Float64Array(3);
    turnNormalByJacobian(flip, [0.3, 0.4, 0.5], out);
    const want = unit([0.3, 0.4, -0.5]);
    expect(out[0]).toBeCloseTo(want[0]!, 12);
    expect(out[1]).toBeCloseTo(want[1]!, 12);
    expect(out[2]).toBeCloseTo(want[2]!, 12);
  });

  it("is the normal as it is under the identity", () => {
    const out = new Float64Array(3);
    turnNormalByJacobian(IDENTITY, [0, 0, 1], out);
    expect(Array.from(out)).toEqual([0, 0, 1]);
  });
});

describe("the drawn position, rebuilt from the window position and depth", () => {
  /** surface.slang `drawnPosition`, in float64 on a view's matrices (column-major, as the view block has them). */
  function rebuild(
    viewProj: ArrayLike<number>,
    near: number,
    width: number,
    height: number,
    x: number,
    y: number,
    depth: number,
  ): number[] {
    const row = (r: number) => [0, 1, 2].map((c) => viewProj[c * 4 + r]!);
    const right = row(0);
    const up = row(1);
    const direction = row(3);
    const ndcX = x * (1 / width) * 2 - 1;
    const ndcY = y * (1 / height) * -2 + 1;
    const w = near / depth;
    const dr = right[0]! ** 2 + right[1]! ** 2 + right[2]! ** 2;
    const du = up[0]! ** 2 + up[1]! ** 2 + up[2]! ** 2;
    return [0, 1, 2].map(
      (k) =>
        (right[k]! * (ndcX / dr) + up[k]! * (ndcY / du) + direction[k]!) * w,
    );
  }

  it("is the point, for the engine's own view matrices", () => {
    const next = random(3);
    for (let trial = 0; trial < 20; trial++) {
      const camera = new Camera();
      camera.near = 0.1 + Math.abs(next());
      const direction = [next(), next(), next()];
      const length = Math.hypot(...direction);
      camera.direction.set(direction.map((d) => d / length));
      camera.orient(Float64Array.of(0, 0, 1));
      const width = 640;
      const height = 480;
      const aspect = width / height;
      const view = camera.viewRotation(m4.mat4());
      const projection = camera.projection(m4.mat4(), aspect);
      const viewProj = m4.multiply(m4.mat4(), projection, view);
      for (let i = 0; i < 10; i++) {
        // A point in the view, 3 m to 3 km away.
        const distance = 10 ** (next() * 1.5 + 2);
        const target = [
          ...[0, 1, 2].map(
            (k) =>
              camera.direction[k]! * distance +
              camera.right[k]! * distance * next() * aspect * 0.4 +
              camera.up[k]! * distance * next() * 0.4,
          ),
        ];
        const clip = [0, 1, 2, 3].map(
          (r) =>
            viewProj[r]! * target[0]! +
            viewProj[4 + r]! * target[1]! +
            viewProj[8 + r]! * target[2]! +
            viewProj[12 + r]!,
        );
        const x = ((clip[0]! / clip[3]! + 1) / 2) * width;
        const y = ((1 - clip[1]! / clip[3]!) / 2) * height;
        const depth = clip[2]! / clip[3]!;
        const exact = rebuild(
          viewProj,
          camera.near,
          width,
          height,
          x,
          y,
          depth,
        );
        for (let k = 0; k < 3; k++) {
          expect(Math.abs(exact[k]! - target[k]!)).toBeLessThan(
            1e-9 * distance,
          );
        }
        // The view block holds it in float32, and the depth is a float32.
        const f32 = Float32Array.from(viewProj);
        const loose = rebuild(
          f32,
          Math.fround(camera.near),
          width,
          height,
          x,
          y,
          Math.fround(depth),
        );
        for (let k = 0; k < 3; k++) {
          expect(Math.abs(loose[k]! - target[k]!)).toBeLessThan(
            1e-5 * distance,
          );
        }
      }
    }
  });
});

describe("the surface shaders' varyings", () => {
  const source = (path: string) =>
    readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

  it("keep their 13 locations, the position at 4 and the model position at 8", () => {
    const wgsl = source("src/shaders/surfaceVertex.wgsl");
    const locations = [...wgsl.matchAll(/@location\((\d+)\)/g)]
      .map((m) => Number(m[1]))
      .slice(0, 13);
    expect(locations).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(wgsl).toMatch(/@location\(4\) relPosition/);
    expect(wgsl).toMatch(/@location\(8\) positionMC/);
  });

  it("carry the design position at 8 and the pre-placement position at 4", () => {
    const surface = source("src/shaders/surface.slang");
    expect(surface).toMatch(/out\.positionMC = designPosition;/);
    // An unplaced draw's is where it is drawn, as it was; a placed one's
    // the transform on the position before the placement.
    expect(surface).toMatch(
      /out\.relPosition = placedDraw \? mul\(m, float4\(designPosition, 1\.0\)\)\.xyz : world\.xyz;/,
    );
    // One call places the vertex, and shading reads the rebuilt position.
    expect(surface.match(/placeVertex\(/g)!.length).toBe(1);
    expect(surface).toMatch(/float3 drawn = drawnPosition\(in, r\);/);
  });
});
