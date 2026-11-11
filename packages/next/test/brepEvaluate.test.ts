import { describe, expect, it } from "vitest";
import {
  edgeCount,
  faceCount,
  surfaceCount,
  vertexCount,
  SurfaceKind,
  type BezierCurves,
  type BrepForm,
} from "../src/brep/form.ts";
import { evaluateSurface, faceNormal } from "../src/brep/evaluate.ts";

const O = [10, 20, 30];
const X = [0, 1, 0];
const Y = [-1, 0, 0];
const Z = [0, 0, 1];

const noCurves: BezierCurves = {
  degree: new Uint8Array(0),
  first: new Uint32Array(0),
  points: new Float64Array(0),
};

/** A one-surface, one-face form with the test frame. */
function oneSurface(kind: SurfaceKind, p0 = 0, p1 = 0, reversed = 0): BrepForm {
  return {
    version: 1,
    surfaceKind: Uint8Array.of(kind),
    surfaceIdentity: Uint8Array.of(kind),
    surfaceError: Float32Array.of(0),
    surfaceFrame: Float64Array.from([...O, ...X, ...Y]),
    surfaceParams: Float64Array.of(p0, p1),
    surfacePatches: Uint32Array.of(0, 0),
    patchDegree: new Uint8Array(0),
    patchFirst: new Uint32Array(0),
    patchPoints: new Float64Array(0),
    patchDomain: new Float64Array(0),
    faceSurface: Uint32Array.of(0),
    faceReversed: Uint8Array.of(reversed),
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
    curves2: noCurves,
    curves3: noCurves,
    ids: [],
  };
}

/** A combination a·x + b·y + c·z plus an optional origin. */
function at(a: number, b: number, c: number, origin = false): number[] {
  return [0, 1, 2].map(
    (i) => (origin ? O[i]! : 0) + a * X[i]! + b * Y[i]! + c * Z[i]!,
  );
}

function expectVec(actual: Float64Array, expected: number[], digits = 12) {
  for (let i = 0; i < 3; i++) {
    expect(actual[i]).toBeCloseTo(expected[i]!, digits);
  }
}

/** A seeded linear congruential generator in [0, 1), so failures repeat. */
function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

describe("evaluateSurface, analytic kinds", () => {
  it("plane", () => {
    const s = evaluateSurface(oneSurface(SurfaceKind.Plane), 0, 2, 3);
    expectVec(s.position, at(2, 3, 0, true));
    expectVec(s.du, X);
    expectVec(s.dv, Y);
  });

  it("cylinder", () => {
    const s = evaluateSurface(
      oneSurface(SurfaceKind.Cylinder, 5),
      0,
      Math.PI / 2,
      4,
    );
    expectVec(s.position, at(0, 5, 4, true));
    expectVec(s.du, at(-5, 0, 0));
    expectVec(s.dv, Z);
  });

  it("cone", () => {
    const a = Math.PI / 6;
    const s = evaluateSurface(oneSurface(SurfaceKind.Cone, 5, a), 0, 0, 2);
    expectVec(s.position, at(5 + 2 * Math.tan(a), 0, 2, true));
    expectVec(s.dv, at(Math.tan(a), 0, 1));
  });

  it("sphere, with a vanishing du and no normal at the pole", () => {
    const form = oneSurface(SurfaceKind.Sphere, 2);
    const s = evaluateSurface(form, 0, 0, Math.PI / 2);
    expectVec(s.position, at(0, 0, 2, true));
    expectVec(s.du, [0, 0, 0]);
    expect(faceNormal(form, 0, 0, Math.PI / 2)).toBeUndefined();
  });

  it("torus", () => {
    const s = evaluateSurface(
      oneSurface(SurfaceKind.Torus, 10, 1),
      0,
      Math.PI,
      0,
    );
    expectVec(s.position, at(-11, 0, 0, true));
  });

  const kinds: [string, SurfaceKind, number, number][] = [
    ["plane", SurfaceKind.Plane, 0, 0],
    ["cylinder", SurfaceKind.Cylinder, 5, 0],
    ["cone", SurfaceKind.Cone, 5, Math.PI / 6],
    ["sphere", SurfaceKind.Sphere, 2, 0],
    ["torus", SurfaceKind.Torus, 10, 1],
  ];
  for (const [name, kind, p0, p1] of kinds) {
    it(`${name}: derivatives match central differences`, () => {
      const form = oneSurface(kind, p0, p1);
      const random = lcg(7 + kind);
      const h = 1e-6;
      for (let i = 0; i < 20; i++) {
        const u = random() * 6 - 3;
        const v = random() * 3 - 1.5;
        const s = evaluateSurface(form, 0, u, v);
        const pu1 = evaluateSurface(form, 0, u + h, v).position;
        const pu0 = evaluateSurface(form, 0, u - h, v).position;
        const pv1 = evaluateSurface(form, 0, u, v + h).position;
        const pv0 = evaluateSurface(form, 0, u, v - h).position;
        for (let k = 0; k < 3; k++) {
          const du = (pu1[k]! - pu0[k]!) / (2 * h);
          const dv = (pv1[k]! - pv0[k]!) / (2 * h);
          const scaleU = Math.hypot(s.du[0]!, s.du[1]!, s.du[2]!) + 1;
          const scaleV = Math.hypot(s.dv[0]!, s.dv[1]!, s.dv[2]!) + 1;
          expect(Math.abs(du - s.du[k]!) / scaleU).toBeLessThan(1e-6);
          expect(Math.abs(dv - s.dv[k]!) / scaleV).toBeLessThan(1e-6);
        }
      }
    });
  }
});

describe("faceNormal", () => {
  it("reversing negates the normal, and the cylinder's points away from the axis", () => {
    const forward = faceNormal(
      oneSurface(SurfaceKind.Cylinder, 5, 0, 0),
      0,
      0.3,
      1,
    )!;
    const reversed = faceNormal(
      oneSurface(SurfaceKind.Cylinder, 5, 0, 1),
      0,
      0.3,
      1,
    )!;
    for (let k = 0; k < 3; k++) {
      expect(reversed[k]).toBeCloseTo(-forward[k]!, 14);
    }
    // The outward direction at u = 0.3 is cos u·x + sin u·y.
    expectVec(forward, at(Math.cos(0.3), Math.sin(0.3), 0));
    expect(Math.hypot(forward[0]!, forward[1]!, forward[2]!)).toBeCloseTo(
      1,
      14,
    );
  });
});

describe("count helpers", () => {
  it("read counts from the arrays", () => {
    const base = oneSurface(SurfaceKind.Plane);
    const form: BrepForm = {
      ...base,
      edgeVertices: Uint32Array.of(0, 1, 1, 2, 2, 0),
      vertexPosition: new Float64Array(12),
    };
    expect(faceCount(form)).toBe(1);
    expect(surfaceCount(form)).toBe(1);
    expect(edgeCount(form)).toBe(3);
    expect(vertexCount(form)).toBe(4);
  });
});
