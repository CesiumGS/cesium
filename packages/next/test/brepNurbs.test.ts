import { describe, expect, it } from "vitest";
import { evaluatePatch, evaluateSegment } from "../src/brep/bezier.ts";
import {
  evaluateCurve2,
  evaluateCurve3,
  evaluateSurface,
} from "../src/brep/evaluate.ts";
import {
  SurfaceKind,
  type BezierCurves,
  type BrepForm,
} from "../src/brep/form.ts";
import {
  evaluateNurbsCurve,
  evaluateNurbsSurface,
  nurbsCurveToSegments,
  nurbsSurfaceToPatches,
  type NurbsSurface,
} from "../src/brep/nurbs.ts";
import { spikeBSurface as spikeB } from "./brepFixtures.ts";

/** A seeded linear congruential generator in [0, 1), so failures repeat. */
function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** The patches of a split, as the Bézier surface of a one-surface form. */
function bezierForm(split: ReturnType<typeof nurbsSurfaceToPatches>): BrepForm {
  const patches = split.domains.length / 4;
  const perPatch = (split.degreeU + 1) * (split.degreeV + 1);
  const none: BezierCurves = {
    degree: new Uint8Array(0),
    first: new Uint32Array(0),
    points: new Float64Array(0),
  };
  return {
    version: 1,
    surfaceKind: Uint8Array.of(SurfaceKind.Bezier),
    surfaceFrame: new Float64Array(9),
    surfaceParams: new Float64Array(2),
    surfacePatches: Uint32Array.of(0, patches),
    patchDegree: Uint8Array.from({ length: patches * 2 }, (_, i) =>
      i % 2 === 0 ? split.degreeU : split.degreeV,
    ),
    patchFirst: Uint32Array.from({ length: patches }, (_, i) => i * perPatch),
    patchPoints: split.points,
    patchDomain: split.domains,
    faceSurface: Uint32Array.of(0),
    faceReversed: Uint8Array.of(0),
    faceLoops: Uint32Array.of(0, 0),
    loopUses: new Uint32Array(0),
    useEdge: new Uint32Array(0),
    useReversed: new Uint8Array(0),
    usePcurve: new Uint32Array(0),
    edgeVertices: new Uint32Array(0),
    edgeCurve: new Uint32Array(0),
    edgeTolerance: new Float32Array(0),
    vertexPosition: new Float64Array(0),
    vertexTolerance: new Float32Array(0),
    curves2: none,
    curves3: none,
    ids: [],
  };
}

/** The largest distance between the split's patches and de Boor, over random points. */
function worstError(
  surface: NurbsSurface,
  samples: number,
  seed: number,
): number {
  const split = nurbsSurfaceToPatches(surface);
  const perPatch = (split.degreeU + 1) * (split.degreeV + 1);
  const random = lcg(seed);
  let worst = 0;
  for (let n = 0; n < samples; n++) {
    const u = random();
    const v = random();
    // The patch whose domain holds the point.
    let patch = -1;
    for (let p = 0; p < split.domains.length / 4; p++) {
      const d = split.domains;
      if (
        u >= d[p * 4]! &&
        u <= d[p * 4 + 1]! &&
        v >= d[p * 4 + 2]! &&
        v <= d[p * 4 + 3]!
      ) {
        patch = p;
        break;
      }
    }
    expect(patch).toBeGreaterThanOrEqual(0);
    const d = split.domains;
    const s = (u - d[patch * 4]!) / (d[patch * 4 + 1]! - d[patch * 4]!);
    const t = (v - d[patch * 4 + 2]!) / (d[patch * 4 + 3]! - d[patch * 4 + 2]!);
    const got = evaluatePatch(
      split.points,
      patch * perPatch,
      split.degreeU,
      split.degreeV,
      s,
      t,
    );
    const want = evaluateNurbsSurface(surface, u, v);
    for (let k = 0; k < 3; k++) {
      worst = Math.max(worst, Math.abs(got.position[k]! - want[k]!));
    }
  }
  return worst;
}

describe("nurbsSurfaceToPatches", () => {
  it("is exact for Spike B's surface with one weight of 2", () => {
    const split = nurbsSurfaceToPatches(spikeB());
    expect(split.domains.length / 4).toBe(9);
    expect(worstError(spikeB(), 200, 11)).toBeLessThan(1e-9);
  });

  it("is exact with weights of 0.1 and 10", () => {
    const surface = spikeB((i, j) =>
      i === 1 && j === 1 ? 0.1 : i === 4 && j === 3 ? 10 : 1,
    );
    expect(worstError(surface, 200, 12)).toBeLessThan(1e-9);
  });

  it("makes no zero-width patch and stays exact when an interior knot is already at full multiplicity", () => {
    const base = spikeB();
    const knotsU = Float64Array.from([0, 0, 0, 0, 0.5, 0.5, 0.5, 1, 1, 1, 1]);
    const countU = 7;
    const points = new Float64Array(countU * 6 * 3);
    for (let j = 0; j < 6; j++) {
      for (let i = 0; i < countU; i++) {
        const k = j * 6 + Math.min(i, 5);
        points.set(
          base.points.subarray(k * 3, k * 3 + 3),
          (j * countU + i) * 3,
        );
        points[(j * countU + i) * 3] = (i / 6) * 100;
      }
    }
    const surface: NurbsSurface = {
      ...base,
      knotsU,
      countU,
      points,
      weights: undefined,
    };
    const split = nurbsSurfaceToPatches(surface);
    expect(split.domains.length / 4).toBe(2 * 3);
    for (let p = 0; p < split.domains.length / 4; p++) {
      expect(split.domains[p * 4 + 1]! - split.domains[p * 4]!).toBeGreaterThan(
        0,
      );
      expect(
        split.domains[p * 4 + 3]! - split.domains[p * 4 + 2]!,
      ).toBeGreaterThan(0);
    }
    expect(worstError(surface, 200, 13)).toBeLessThan(1e-9);
  });

  it("is exact with end knots wider than the degree", () => {
    const base = spikeB();
    // One extra end knot in u, which adds a point whose influence lies outside the range.
    const knotsU = Float64Array.from([
      0,
      0,
      0,
      0,
      0,
      1 / 3,
      2 / 3,
      1,
      1,
      1,
      1,
      1,
    ]);
    const countU = 8;
    const points = new Float64Array(countU * 6 * 3);
    for (let j = 0; j < 6; j++) {
      for (let i = 0; i < countU; i++) {
        const k = j * 6 + Math.min(Math.max(i - 1, 0), 5);
        points.set(
          base.points.subarray(k * 3, k * 3 + 3),
          (j * countU + i) * 3,
        );
      }
    }
    const surface: NurbsSurface = {
      ...base,
      knotsU,
      countU,
      points,
      weights: undefined,
    };
    const split = nurbsSurfaceToPatches(surface);
    expect(split.domains.length / 4).toBe(9);
    expect(worstError(surface, 200, 14)).toBeLessThan(1e-9);
  });

  it("keeps degree 2 for a biquadratic surface", () => {
    const n = 5;
    const points = new Float64Array(n * n * 3);
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        points.set([i * 10, j * 10, (i - 2) * (j - 2) * 3], (j * n + i) * 3);
      }
    }
    const knots = Float64Array.from([0, 0, 0, 1 / 3, 2 / 3, 1, 1, 1]);
    const surface: NurbsSurface = {
      degreeU: 2,
      degreeV: 2,
      knotsU: knots,
      knotsV: knots,
      countU: n,
      countV: n,
      points,
    };
    const split = nurbsSurfaceToPatches(surface);
    expect(split.degreeU).toBe(2);
    expect(split.degreeV).toBe(2);
    expect(split.domains.length / 4).toBe(9);
    expect(split.points.length).toBe(9 * 9 * 4);
    expect(worstError(surface, 100, 15)).toBeLessThan(1e-9);
  });
});

describe("nurbsCurveToSegments", () => {
  const w = Math.SQRT1_2;
  const circle = {
    degree: 2,
    knots: Float64Array.from([
      0, 0, 0, 0.25, 0.25, 0.5, 0.5, 0.75, 0.75, 1, 1, 1,
    ]),
    count: 9,
    dimension: 2 as const,
    points: Float64Array.from([
      1, 0, 1, 1, 0, 1, -1, 1, -1, 0, -1, -1, 0, -1, 1, -1, 1, 0,
    ]),
    weights: Float64Array.from([1, w, 1, w, 1, w, 1, w, 1]),
  };

  it("splits a rational quadratic circle into 4 segments on the unit radius", () => {
    const split = nurbsCurveToSegments(circle);
    expect(split.domains.length / 2).toBe(4);
    for (let n = 0; n <= 99; n++) {
      const seg = Math.min(Math.floor(n / 25), 3);
      const t = (n - seg * 25) / 25;
      const p = evaluateSegment(
        split.points,
        seg * 3,
        2,
        2,
        Math.min(t, 1),
      ).position;
      expect(Math.abs(Math.hypot(p[0]!, p[1]!) - 1)).toBeLessThan(1e-12);
    }
  });

  it("agrees with de Boor", () => {
    const split = nurbsCurveToSegments(circle);
    const random = lcg(5);
    for (let n = 0; n < 50; n++) {
      const t = random();
      const seg = Math.min(Math.floor(t * 4), 3);
      const local = (t - split.domains[seg * 2]!) / 0.25;
      const got = evaluateSegment(split.points, seg * 3, 2, 2, local).position;
      const want = evaluateNurbsCurve(circle, t);
      expect(got[0]).toBeCloseTo(want[0]!, 12);
      expect(got[1]).toBeCloseTo(want[1]!, 12);
    }
  });

  it("throws for degree 4", () => {
    expect(() =>
      nurbsCurveToSegments({
        degree: 4,
        knots: Float64Array.from([0, 0, 0, 0, 0, 1, 1, 1, 1, 1]),
        count: 5,
        dimension: 3,
        points: new Float64Array(15),
      }),
    ).toThrow(/degree/);
  });

  it("splits a cubic in 3D exactly", () => {
    const curve = {
      degree: 3,
      knots: Float64Array.from([0, 0, 0, 0, 0.3, 0.7, 1, 1, 1, 1]),
      count: 6,
      dimension: 3 as const,
      points: Float64Array.from([
        0, 0, 0, 1, 2, 0, 2, 3, 1, 4, 3, 2, 5, 1, 2, 6, 0, 3,
      ]),
      weights: Float64Array.from([1, 0.1, 10, 1, 2, 1]),
    };
    const split = nurbsCurveToSegments(curve);
    expect(split.domains.length / 2).toBe(3);
    const random = lcg(9);
    for (let n = 0; n < 100; n++) {
      const t = random();
      let seg = 0;
      while (t > split.domains[seg * 2 + 1]!) {
        seg++;
      }
      const a = split.domains[seg * 2]!;
      const b = split.domains[seg * 2 + 1]!;
      const got = evaluateSegment(
        split.points,
        seg * 4,
        3,
        3,
        (t - a) / (b - a),
      ).position;
      const want = evaluateNurbsCurve(curve, t);
      for (let k = 0; k < 3; k++) {
        expect(Math.abs(got[k]! - want[k]!)).toBeLessThan(1e-9);
      }
    }
  });
});

describe("evaluateSurface, Bézier kind", () => {
  const split = nurbsSurfaceToPatches(spikeB());
  const form = bezierForm(split);

  it("is continuous across a patch boundary and takes the lower patch's derivatives", () => {
    const perPatch = 16;
    const d = split.domains;
    // Patches 0 and 1 share u = 1/3.
    const u = d[1]!;
    expect(d[4]).toBe(u);
    const v = 0.1;
    const left = evaluatePatch(
      split.points,
      0,
      3,
      3,
      1,
      (v - d[2]!) / (d[3]! - d[2]!),
    );
    const right = evaluatePatch(
      split.points,
      perPatch,
      3,
      3,
      0,
      (v - d[6]!) / (d[7]! - d[6]!),
    );
    const got = evaluateSurface(form, 0, u, v);
    for (let k = 0; k < 3; k++) {
      expect(Math.abs(got.position[k]! - left.position[k]!)).toBeLessThan(
        1e-12,
      );
      expect(Math.abs(got.position[k]! - right.position[k]!)).toBeLessThan(
        1e-12,
      );
      expect(got.du[k]).toBeCloseTo(left.du[k]! / (d[1]! - d[0]!), 9);
    }
  });

  it("has no NaN at the corners of the domain", () => {
    for (const [u, v] of [
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
      [1 / 3, 1 / 3],
    ] as const) {
      const s = evaluateSurface(form, 0, u, v);
      for (const a of [s.position, s.du, s.dv]) {
        for (const x of a) {
          expect(Number.isFinite(x)).toBe(true);
        }
      }
    }
    const corner = evaluateSurface(form, 0, 1, 1).position;
    const want = evaluateNurbsSurface(spikeB(), 1, 1);
    for (let k = 0; k < 3; k++) {
      expect(corner[k]).toBeCloseTo(want[k]!, 9);
    }
  });

  it("scales derivatives to the surface parameters", () => {
    const random = lcg(21);
    const h = 1e-6;
    for (let n = 0; n < 20; n++) {
      const u = 0.05 + random() * 0.9;
      const v = 0.05 + random() * 0.9;
      const s = evaluateSurface(form, 0, u, v);
      const a = evaluateSurface(form, 0, u + h, v).position;
      const b = evaluateSurface(form, 0, u - h, v).position;
      const c = evaluateSurface(form, 0, u, v + h).position;
      const e = evaluateSurface(form, 0, u, v - h).position;
      for (let k = 0; k < 3; k++) {
        const scale = Math.abs(s.du[k]!) + Math.abs(s.dv[k]!) + 1;
        // Skip the rare step that straddles a patch boundary, where the derivative jumps.
        expect(
          Math.abs((a[k]! - b[k]!) / (2 * h) - s.du[k]!) / scale,
        ).toBeLessThan(1e-5);
        expect(
          Math.abs((c[k]! - e[k]!) / (2 * h) - s.dv[k]!) / scale,
        ).toBeLessThan(1e-5);
      }
    }
  });
});

describe("derivatives of patches and segments", () => {
  it("evaluatePatch agrees with central differences", () => {
    const split = nurbsSurfaceToPatches(spikeB());
    const random = lcg(31);
    const h = 1e-6;
    for (let n = 0; n < 20; n++) {
      const patch = Math.floor(random() * 9);
      const s = 0.1 + random() * 0.8;
      const t = 0.1 + random() * 0.8;
      const at = (a: number, b: number) =>
        evaluatePatch(split.points, patch * 16, 3, 3, a, b);
      const mid = at(s, t);
      for (let k = 0; k < 3; k++) {
        const ds =
          (at(s + h, t).position[k]! - at(s - h, t).position[k]!) / (2 * h);
        const dt =
          (at(s, t + h).position[k]! - at(s, t - h).position[k]!) / (2 * h);
        expect(Math.abs(ds - mid.du[k]!) / (Math.abs(ds) + 1)).toBeLessThan(
          1e-6,
        );
        expect(Math.abs(dt - mid.dv[k]!) / (Math.abs(dt) + 1)).toBeLessThan(
          1e-6,
        );
      }
    }
  });

  it("evaluateSegment agrees with central differences", () => {
    const points = Float64Array.from([0, 0, 1, 2, 4, 3, 6, 1, 0.5, 8, 0, 2]);
    const h = 1e-6;
    for (const t of [0.1, 0.4, 0.9]) {
      const mid = evaluateSegment(points, 0, 3, 2, t);
      for (let k = 0; k < 2; k++) {
        const d =
          (evaluateSegment(points, 0, 3, 2, t + h).position[k]! -
            evaluateSegment(points, 0, 3, 2, t - h).position[k]!) /
          (2 * h);
        expect(
          Math.abs(d - mid.derivative[k]!) / (Math.abs(d) + 1),
        ).toBeLessThan(1e-6);
      }
    }
  });

  it("evaluateCurve2 and evaluateCurve3 read the form's segments", () => {
    const base = bezierForm(nurbsSurfaceToPatches(spikeB()));
    const form: BrepForm = {
      ...base,
      curves2: {
        degree: Uint8Array.of(1),
        first: Uint32Array.of(0),
        points: Float64Array.of(0, 0, 1, 4, 2, 1),
      },
      curves3: {
        degree: Uint8Array.of(1),
        first: Uint32Array.of(0),
        points: Float64Array.of(0, 0, 0, 1, 10, 20, 30, 1),
      },
    };
    const a = evaluateCurve2(form, 0, 0.5);
    expect([...a.position]).toEqual([2, 1]);
    expect([...a.derivative]).toEqual([4, 2]);
    const b = evaluateCurve3(form, 0, 0.25);
    expect([...b.position]).toEqual([2.5, 5, 7.5]);
    expect([...b.derivative]).toEqual([10, 20, 30]);
  });
});

describe("nurbsSurfaceToPatches and nurbsCurveToSegments, bad input", () => {
  it("throws for a surface degree outside 1 to 7", () => {
    const base = spikeB();
    expect(() => nurbsSurfaceToPatches({ ...base, degreeU: 8 })).toThrow(
      /degree 8 in u is not 1 to 7/,
    );
    expect(() => nurbsSurfaceToPatches({ ...base, degreeV: 0 })).toThrow(
      /degree 0 in v is not 1 to 7/,
    );
  });

  it("throws for a surface with the wrong number of point values or weights", () => {
    const base = spikeB();
    expect(() =>
      nurbsSurfaceToPatches({ ...base, points: base.points.slice(3) }),
    ).toThrow(/point values/);
    expect(() =>
      nurbsSurfaceToPatches({ ...base, weights: new Float64Array(5) }),
    ).toThrow(/weights/);
  });

  it("throws for a curve of degree 4, or with the wrong sizes", () => {
    const line = {
      degree: 1,
      knots: Float64Array.from([0, 0, 1, 1]),
      count: 2,
      dimension: 2 as const,
      points: Float64Array.from([0, 0, 1, 1]),
    };
    expect(() => nurbsCurveToSegments(line)).not.toThrow();
    expect(() => nurbsCurveToSegments({ ...line, degree: 4 })).toThrow(
      /degree 4 is not 1 to 3/,
    );
    expect(() =>
      nurbsCurveToSegments({ ...line, points: Float64Array.of(0, 0, 1) }),
    ).toThrow(/point values/);
    expect(() =>
      nurbsCurveToSegments({ ...line, weights: Float64Array.of(1) }),
    ).toThrow(/weights/);
  });
});
