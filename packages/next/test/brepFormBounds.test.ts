// formBounds: a form's box from the form itself. It holds every point of a
// fine tessellation (conservative), and is tight to a fraction of a percent
// to a few percent on analytic shapes, on NURBS surfaces held as Bézier
// patches (where the control hull alone is loose), and on trimmed faces.
import { describe, expect, it } from "vitest";
import {
  boxBrep,
  coneFrustumBrep,
  cappedCylinderBrep,
  filletedBlockBrep,
  plateBrep,
  sphereBrep,
  torusBrep,
  trimmedNurbsBrep,
} from "../examples/brep-first-look/fixtures.ts";
import { BrepBuilder } from "../src/brep/build.ts";
import { evaluateSurface } from "../src/brep/evaluate.ts";
import type { BrepForm } from "../src/brep/form.ts";
import { formBounds, type FormBounds } from "../src/brep/formBounds.ts";
import type { NurbsCurve } from "../src/brep/nurbs.ts";
import { tessellateBrep } from "../src/brep/tessellate.ts";
import {
  lineProfile,
  meridianProfile,
  revolvedSurface,
  spikeBSurface,
  turnAngles,
} from "./brepFixtures.ts";

/** A fine tessellation's box of the faces: points on the surface (to a float32's rounding). */
function sampleBox(form: BrepForm, tolerance = 2e-4): FormBounds {
  const mesh = tessellateBrep(form, { tolerance });
  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  const p = mesh.faces.positions;
  for (let i = 0; i < p.length; i++) {
    const k = i % 3;
    min[k] = Math.min(min[k]!, p[i]! + mesh.origin[k]!);
    max[k] = Math.max(max[k]!, p[i]! + mesh.origin[k]!);
  }
  return { min, max };
}

/** The most the bounds fall short of the samples (not above 0: they hold them), and the most they exceed them, per axis, in m. */
function compare(bounds: FormBounds, samples: FormBounds) {
  let short = -Infinity;
  let excess = -Infinity;
  for (let k = 0; k < 3; k++) {
    short = Math.max(
      short,
      bounds.min[k]! - samples.min[k]!,
      samples.max[k]! - bounds.max[k]!,
    );
    excess = Math.max(
      excess,
      samples.min[k]! - bounds.min[k]!,
      bounds.max[k]! - samples.max[k]!,
    );
  }
  return { short, excess };
}

const size = (box: FormBounds) =>
  Math.max(...[0, 1, 2].map((k) => box.max[k]! - box.min[k]!));

/** Float32 positions round to about 1e-7 m at these sizes. */
const FLOAT32 = 1e-6;
/** How far a test face's sampled edges may lie inside its surface's rim, m. */
const EDGE_SAG = 5e-5;
/** The sag of the samples' chords: the bounds may exceed their box by this. */
const SAMPLING = 2e-4 + FLOAT32;

const fixtures: Record<string, () => BrepForm> = {
  box: boxBrep,
  cappedCylinder: cappedCylinderBrep,
  trimmedNurbs: trimmedNurbsBrep,
  sphere: sphereBrep,
  torus: torusBrep,
  coneFrustum: coneFrustumBrep,
  plate: plateBrep,
  filletedBlock: filletedBlockBrep,
};

describe("formBounds: the gallery's forms", () => {
  for (const [name, make] of Object.entries(fixtures)) {
    it(`${name}: holds the tessellation, within 1% of its box`, () => {
      const form = make();
      const bounds = formBounds(form);
      const { short, excess } = compare(bounds, sampleBox(form));
      expect(short).toBeLessThanOrEqual(FLOAT32);
      expect(excess).toBeLessThanOrEqual(0.01 * size(bounds) + SAMPLING);
    });
  }

  it("a box's bounds are its corners", () => {
    const form = boxBrep();
    const v = form.vertexPosition;
    for (let k = 0; k < 3; k++) {
      const axis = Array.from(
        { length: v.length / 3 },
        (_, i) => v[i * 3 + k]!,
      );
      expect(formBounds(form).min[k]).toBe(Math.min(...axis));
      expect(formBounds(form).max[k]).toBe(Math.max(...axis));
    }
  });

  it("a capped cylinder's bounds are its radius and height", () => {
    const form = cappedCylinderBrep();
    const bounds = formBounds(form);
    const sampled = sampleBox(form, 1e-5);
    for (let k = 0; k < 3; k++) {
      expect(bounds.min[k]).toBeCloseTo(sampled.min[k]!, 3);
      expect(bounds.max[k]).toBeCloseTo(sampled.max[k]!, 3);
    }
  });

  it("an empty form has the box of the origin", () => {
    expect(formBounds(new BrepBuilder().build())).toEqual({
      min: [0, 0, 0],
      max: [0, 0, 0],
    });
  });
});

/** A 3D polyline as a degree-1 NURBS edge curve. */
function polyline(points: readonly (readonly number[])[]): NurbsCurve {
  const n = points.length;
  return {
    degree: 1,
    count: n,
    dimension: 3,
    knots: Float64Array.from([
      0,
      ...Array.from({ length: n }, (_, i) => i / (n - 1)),
      1,
    ]),
    points: Float64Array.from(points.flat()),
  };
}

/**
 * A one-face form on the surface `addSurface` adds, over the (u, v) rect,
 * with honest edges: the rect's four sides sampled off the surface itself.
 */
function faceOver(
  addSurface: (b: BrepBuilder) => number,
  [u0, u1, v0, v1]: readonly [number, number, number, number],
): BrepForm {
  const probe = new BrepBuilder();
  addSurface(probe);
  const surfaceForm = probe.build();
  const pointAt = (u: number, v: number) =>
    Array.from(evaluateSurface(surfaceForm, 0, u, v).position);
  const b = new BrepBuilder();
  const surface = addSurface(b);
  const corners = [
    [u0, v0],
    [u1, v0],
    [u1, v1],
    [u0, v1],
  ] as const;
  const vertices = corners.map(([u, v]) => b.vertex(pointAt(u, v)));
  const steps = 512;
  const uses = corners.map(([ua, va], i) => {
    const [ub, vb] = corners[(i + 1) % 4]!;
    const along = Array.from({ length: steps + 1 }, (_, s) =>
      pointAt(ua + ((ub - ua) * s) / steps, va + ((vb - va) * s) / steps),
    );
    const edge = b.edge(vertices[i]!, vertices[(i + 1) % 4]!, {
      curve: polyline(along),
    });
    return {
      edge,
      pcurve: [
        [ua, va],
        [ub, vb],
      ] as const,
    };
  });
  b.face(surface, [uses]);
  return b.build();
}

/** A frame turned about two axes, to put the extremes off the axes. */
const turned = {
  origin: [0.3, -0.2, 0.5] as [number, number, number],
  x: [0.6, 0.8, 0] as [number, number, number],
  y: [-0.48, 0.36, 0.8] as [number, number, number],
};
const upright = {
  origin: [0, 0, 0] as [number, number, number],
  x: [1, 0, 0] as [number, number, number],
  y: [0, 1, 0] as [number, number, number],
};

describe("formBounds: surfaces held as Bézier patches", () => {
  // Uneven arcs: some arcs are rotated, so their control hulls overshoot.
  const cylinder = revolvedSurface(
    turnAngles([3, 5, 4]),
    lineProfile(0.5, 0.5, 2),
  );
  const cone = revolvedSurface(turnAngles([1, 1, 1]), lineProfile(1, 0.4, 1.5));
  const lat = [-Math.PI / 2, -Math.PI / 6, Math.PI / 3, Math.PI / 2];
  const sphere = revolvedSurface(
    turnAngles([2, 1, 3, 2]),
    meridianProfile(1.5, lat),
  );
  const over = (
    surface: Parameters<BrepBuilder["nurbsSurface"]>[0],
    rect: readonly [number, number, number, number] = [0, 1, 0, 1],
  ) => faceOver((b) => b.nurbsSurface(surface), rect);
  const cases: Record<string, { form: BrepForm; tolerance: number }> = {
    cylinder: { form: over(cylinder), tolerance: 0.005 },
    "half a cylinder": {
      form: over(cylinder, [0.1, 0.5, 0, 1]),
      tolerance: 0.005,
    },
    cone: { form: over(cone), tolerance: 0.005 },
    sphere: { form: over(sphere), tolerance: 0.005 },
    "part of a sphere": {
      form: over(sphere, [0.1, 0.6, 0.2, 0.7]),
      tolerance: 0.005,
    },
    // 100 m across: the tolerance is a share of that.
    freeform: {
      form: over(spikeBSurface((i, j) => 0.5 + ((i * 7 + j * 3) % 5) / 4)),
      tolerance: 0.002,
    },
  };
  for (const [name, { form, tolerance }] of Object.entries(cases)) {
    it(`${name}: holds the tessellation, within ${tolerance * 100}% of its size`, () => {
      const bounds = formBounds(form);
      const { short, excess } = compare(bounds, sampleBox(form, 1e-4));
      expect(short).toBeLessThanOrEqual(EDGE_SAG);
      expect(excess).toBeLessThanOrEqual(
        tolerance * size(bounds) + 1e-4 + FLOAT32,
      );
    });
  }

  it("beats the control hull on a rotated arc", () => {
    // Three arcs of 120°: each arc's middle control point is twice the radius off its chord's middle.
    const form = over(
      revolvedSurface(turnAngles([1, 1, 1]), lineProfile(0.5, 0.5, 1)),
    );
    const hull = formBounds(form, { tolerance: 10 });
    const bounds = formBounds(form);
    expect(size(bounds)).toBeLessThan(size(hull));
    expect(bounds.max[0]).toBeCloseTo(0.5, 2);
    expect(bounds.min[1]).toBeCloseTo(-0.5, 2);
  });
});

describe("formBounds: analytic surfaces", () => {
  const analytic = (
    make: (b: BrepBuilder, frame: typeof upright) => number,
    rect: readonly [number, number, number, number],
    frame = upright,
  ) => faceOver((b) => make(b, frame), rect);
  const cylinder = (b: BrepBuilder, f: typeof upright) =>
    b.cylinder(f.origin, f.x, f.y, 2);
  const cone = (b: BrepBuilder, f: typeof upright) =>
    b.cone(f.origin, f.x, f.y, 1, 0.3);
  const sphere = (b: BrepBuilder, f: typeof upright) =>
    b.sphere(f.origin, f.x, f.y, 1.5);
  const torus = (b: BrepBuilder, f: typeof upright) =>
    b.torus(f.origin, f.x, f.y, 2, 0.6);

  it("a quarter of a cylinder is its arc's box and its height", () => {
    const bounds = formBounds(
      analytic(cylinder, [0.2, Math.PI / 2 - 0.1, 1, 3]),
    );
    expect(bounds.min[0]).toBeCloseTo(2 * Math.cos(Math.PI / 2 - 0.1), 3);
    expect(bounds.max[0]).toBeCloseTo(2 * Math.cos(0.2), 3);
    expect(bounds.max[1]).toBeCloseTo(2 * Math.sin(Math.PI / 2 - 0.1), 3);
    expect(bounds.min[2]).toBeCloseTo(1, 12);
    expect(bounds.max[2]).toBeCloseTo(3, 12);
  });

  it("a cylinder's extreme lies between its edges, and the box reaches it", () => {
    const bounds = formBounds(analytic(cylinder, [-0.3, 0.4, 0, 1]));
    expect(bounds.max[0]).toBeCloseTo(2, 3);
    expect(bounds.min[1]).toBeCloseTo(-2 * Math.sin(0.3), 3);
  });

  it("a whole sphere is its radius about its centre, in a turned frame", () => {
    const bounds = formBounds(
      analytic(sphere, [0, 2 * Math.PI, -Math.PI / 2, Math.PI / 2], turned),
    );
    for (let k = 0; k < 3; k++) {
      expect(bounds.min[k]).toBeCloseTo(turned.origin[k]! - 1.5, 3);
      expect(bounds.max[k]).toBeCloseTo(turned.origin[k]! + 1.5, 3);
    }
  });

  it("a whole torus is its outer radius in the plane and its tube along the axis", () => {
    const bounds = formBounds(
      analytic(torus, [0, 2 * Math.PI, 0, 2 * Math.PI]),
    );
    expect(bounds.min[0]).toBeCloseTo(-2.6, 3);
    expect(bounds.max[0]).toBeCloseTo(2.6, 3);
    expect(bounds.min[2]).toBeCloseTo(-0.6, 3);
    expect(bounds.max[2]).toBeCloseTo(0.6, 3);
  });

  const cases: Array<[string, () => BrepForm]> = [
    ["a turned cone", () => analytic(cone, [-1, 4.5, 0, 1.2], turned)],
    [
      "a turned sphere cap",
      () => analytic(sphere, [0.7, 5.1, 0.2, Math.PI / 2], turned),
    ],
    ["a turned torus patch", () => analytic(torus, [-2, 3.7, -1, 4.2], turned)],
    ["a turned cylinder wrap", () => analytic(cylinder, [3, 9, -1, 1], turned)],
  ];
  for (const [name, make] of cases) {
    it(`${name}: holds the tessellation, and is tight to it`, () => {
      const form = make();
      const bounds = formBounds(form);
      const { short, excess } = compare(bounds, sampleBox(form, 1e-4));
      expect(short).toBeLessThanOrEqual(EDGE_SAG);
      expect(excess).toBeLessThanOrEqual(0.01 * size(bounds) + 1e-4 + FLOAT32);
    });
  }
});
