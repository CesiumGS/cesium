// The tessellator's error bounds (overall plan §13.33) are sound: every point
// of every triangle lies within the mesh's stated error of the surface, for
// analytic surfaces, for NURBS surfaces that carry an analytic identity
// (whose parameterization is not uniform in angle), and for free-form
// rational patches. The point sets are exact, so the distance to the true
// surface is a closed form, or the exact evaluator.
import { describe, expect, it } from "vitest";
import { BrepBuilder, type SurfaceIdentity } from "../src/brep/build.ts";
import { axisRates, frameOf, speedBounds } from "../src/brep/bounds.ts";
import { evaluateSurface } from "../src/brep/evaluate.ts";
import { SurfaceKind, type BrepForm } from "../src/brep/form.ts";
import { tessellateBrep, type BrepMesh } from "../src/brep/tessellate.ts";
import {
  boxFace,
  lineProfile,
  meridianProfile,
  revolvedSurface,
  spikeBSurface,
  turnAngles,
} from "./brepFixtures.ts";

/** Float32 positions relative to the mesh's origin round to about 1e-7 m. */
const FLOAT32 = 1e-6;

type Vec = readonly [number, number, number];

/** The distance of a point to the true surface. */
type Distance = (p: Vec) => number;

const FRAME = {
  origin: [0, 0, 0] as const,
  x: [1, 0, 0] as const,
  y: [0, 1, 0] as const,
};

function identity(
  kind: SurfaceKind,
  params: [number, number],
): SurfaceIdentity {
  return { kind, ...FRAME, params };
}

function triangleCountOf(mesh: BrepMesh): number {
  return mesh.faces.indices.length / 3;
}

/**
 * The largest sampled distance to the surface, over each triangle's centroid,
 * edge midpoints and a lattice of 15 points.
 */
function worstDistance(mesh: BrepMesh, distance: Distance): number {
  const { positions, indices } = mesh.faces;
  const o = mesh.origin;
  const at = (i: number): Vec => [
    positions[i * 3]! + o[0]!,
    positions[i * 3 + 1]! + o[1]!,
    positions[i * 3 + 2]! + o[2]!,
  ];
  let worst = 0;
  const steps = 4;
  for (let t = 0; t < indices.length; t += 3) {
    const a = at(indices[t]!);
    const b = at(indices[t + 1]!);
    const c = at(indices[t + 2]!);
    for (let i = 0; i <= steps; i++) {
      for (let j = 0; i + j <= steps; j++) {
        const x = i / steps;
        const y = j / steps;
        const z = 1 - x - y;
        worst = Math.max(
          worst,
          distance([
            x * a[0] + y * b[0] + z * c[0],
            x * a[1] + y * b[1] + z * c[1],
            x * a[2] + y * b[2] + z * c[2],
          ]),
        );
      }
    }
  }
  return worst;
}

/** A one-face form on a NURBS surface, with or without its identity. */
function nurbsForm(
  surface: Parameters<BrepBuilder["nurbsSurface"]>[0],
  id: SurfaceIdentity | undefined,
  box: readonly [number, number, number, number] = [0, 1, 0, 1],
): BrepForm {
  const b = new BrepBuilder();
  boxFace(b, b.nurbsSurface(surface, { identity: id }), box);
  return b.build();
}

const cylinderDistance =
  (r: number): Distance =>
  (p) =>
    Math.abs(Math.hypot(p[0], p[1]) - r);

const sphereDistance =
  (r: number): Distance =>
  (p) =>
    Math.abs(Math.hypot(p[0], p[1], p[2]) - r);

describe("tessellateBrep: a rational NURBS cylinder", () => {
  // Three arcs of 90°, 150° and 120° under uniform knots: the parameter's
  // rate in angle differs between arcs and within each.
  const r = 0.5;
  const surface = revolvedSurface(turnAngles([3, 5, 4]), lineProfile(r, r, 2));
  const withIdentity = nurbsForm(
    surface,
    identity(SurfaceKind.Cylinder, [r, 0]),
  );
  const without = nurbsForm(surface, undefined);

  it("sits within the stated error of the cylinder, with an identity", () => {
    const mesh = tessellateBrep(withIdentity, { tolerance: 1e-3 });
    expect(mesh.error).toBe(1e-3);
    const worst = worstDistance(mesh, cylinderDistance(r));
    expect(worst).toBeLessThanOrEqual(mesh.error + FLOAT32);
    // Not loose either: the sag is most of the tolerance.
    expect(worst).toBeGreaterThan(0.5e-3);
  });

  it("needs one cell along the rulings, so far fewer triangles than the net bound", () => {
    const mesh = tessellateBrep(withIdentity, { tolerance: 1e-3 });
    const net = tessellateBrep(without, { tolerance: 1e-3 });
    // About 2π / 0.127 rad = 50 cells around at the average rate, more for the fastest arc.
    expect(triangleCountOf(mesh)).toBeLessThan(200);
    expect(triangleCountOf(net)).toBeGreaterThan(5 * triangleCountOf(mesh));
  });

  it("stays within the stated error on the net bound, whose weights are not 1", () => {
    for (const tolerance of [1e-2, 1e-3]) {
      const mesh = tessellateBrep(without, { tolerance });
      expect(worstDistance(mesh, cylinderDistance(r))).toBeLessThanOrEqual(
        mesh.error + FLOAT32,
      );
    }
  });

  it("states the error the grid cap leaves, from the identity", () => {
    const mesh = tessellateBrep(withIdentity, { tolerance: 1e-6, maxGrid: 16 });
    expect(mesh.error).toBeGreaterThan(1e-6);
    expect(worstDistance(mesh, cylinderDistance(r))).toBeLessThanOrEqual(
      mesh.error + FLOAT32,
    );
  });

  it("adds the surface's representation error to the stated error", () => {
    const b = new BrepBuilder();
    boxFace(
      b,
      b.nurbsSurface(surface, {
        identity: identity(SurfaceKind.Cylinder, [r, 0]),
        error: 2e-4,
      }),
      [0, 1, 0, 1],
    );
    const mesh = tessellateBrep(b.build(), { tolerance: 1e-3 });
    expect(mesh.error).toBeCloseTo(1.2e-3, 9);
  });
});

describe("tessellateBrep: a rational NURBS sphere", () => {
  const r = 1.5;
  // Uneven arcs in longitude and latitude; the pole is a degenerate row.
  const lat = [-Math.PI / 2, -Math.PI / 6, Math.PI / 3, Math.PI / 2];
  const surface = revolvedSurface(
    turnAngles([2, 1, 3, 2]),
    meridianProfile(r, lat),
  );
  const withIdentity = nurbsForm(surface, identity(SurfaceKind.Sphere, [r, 0]));
  const without = nurbsForm(surface, undefined);

  it("sits within the stated error of the sphere, tightly", () => {
    const mesh = tessellateBrep(withIdentity, { tolerance: 3e-3 });
    expect(mesh.error).toBe(3e-3);
    const worst = worstDistance(mesh, sphereDistance(r));
    expect(worst).toBeLessThanOrEqual(mesh.error + FLOAT32);
    expect(worst).toBeGreaterThan(0.3e-3);
  });

  it("uses fewer triangles than the net bound, which cannot reach the tolerance in the cap", () => {
    const mesh = tessellateBrep(withIdentity, { tolerance: 3e-3 });
    const net = tessellateBrep(without, { tolerance: 3e-3 });
    expect(triangleCountOf(mesh)).toBeLessThan(triangleCountOf(net));
    expect(net.error).toBeGreaterThan(mesh.error);
  });

  it("stays within the stated error on the net bound", () => {
    for (const tolerance of [5e-2, 1e-2]) {
      const mesh = tessellateBrep(without, { tolerance });
      expect(worstDistance(mesh, sphereDistance(r))).toBeLessThanOrEqual(
        mesh.error + FLOAT32,
      );
    }
  });

  it("holds on a part of the sphere that no patch fills, and with the grid capped", () => {
    const part = nurbsForm(
      surface,
      identity(SurfaceKind.Sphere, [r, 0]),
      [0.1, 0.6, 0.2, 0.7],
    );
    for (const options of [
      { tolerance: 2e-3 },
      { tolerance: 1e-5, maxGrid: 24 },
    ]) {
      const mesh = tessellateBrep(part, options);
      expect(worstDistance(mesh, sphereDistance(r))).toBeLessThanOrEqual(
        mesh.error + FLOAT32,
      );
    }
  });
});

describe("tessellateBrep: a rational NURBS cone", () => {
  const r0 = 1;
  const r1 = 0.4;
  const height = 1.5;
  const half = Math.atan((r1 - r0) / height);
  const surface = revolvedSurface(
    turnAngles([1, 1, 1]),
    lineProfile(r0, r1, height),
  );
  const cone: Distance = (p) =>
    Math.abs(Math.hypot(p[0], p[1]) - (r0 + p[2] * Math.tan(half))) *
    Math.cos(half);

  it("sits within the stated error of the cone, with an identity", () => {
    const form = nurbsForm(surface, identity(SurfaceKind.Cone, [r0, half]));
    const mesh = tessellateBrep(form, { tolerance: 1e-3 });
    expect(mesh.error).toBe(1e-3);
    expect(worstDistance(mesh, cone)).toBeLessThanOrEqual(mesh.error + FLOAT32);
    expect(triangleCountOf(mesh)).toBeLessThan(
      triangleCountOf(
        tessellateBrep(nurbsForm(surface, undefined), { tolerance: 1e-3 }),
      ),
    );
  });
});

describe("tessellateBrep: a planar NURBS patch with an uneven net", () => {
  // Four collinear rows at uneven spacing: the net's second differences ask for
  // a fine grid, but the surface is a plane.
  const xs = [0, 0.1, 0.2, 1];
  const points = new Float64Array(16 * 3);
  xs.forEach((y, j) =>
    xs.forEach((x, i) => points.set([x, y, 1], (j * 4 + i) * 3)),
  );
  const surface = {
    degreeU: 3,
    degreeV: 3,
    knotsU: Float64Array.from([0, 0, 0, 0, 1, 1, 1, 1]),
    knotsV: Float64Array.from([0, 0, 0, 0, 1, 1, 1, 1]),
    countU: 4,
    countV: 4,
    points,
  };

  it("is one cell on the plane's identity, and a fine grid without it", () => {
    const plane = tessellateBrep(
      nurbsForm(surface, identity(SurfaceKind.Plane, [0, 0])),
      { tolerance: 1e-3 },
    );
    expect(triangleCountOf(plane)).toBe(2);
    const net = tessellateBrep(nurbsForm(surface, undefined), {
      tolerance: 1e-3,
    });
    expect(triangleCountOf(net)).toBeGreaterThan(100);
  });
});

describe("tessellateBrep: a free-form patch with weights that are not 1", () => {
  // Seeded weights from 0.4 to 2.5 over a 6 × 6 net.
  let seed = 11;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const weights = new Map<string, number>();
  const net = spikeBSurface((i, j) => {
    const w = 0.4 + 2.1 * random();
    weights.set(`${i},${j}`, w);
    return w;
  });
  const form = nurbsForm(net, undefined);

  /** The largest distance, over triangle samples, to the surface at the same (u, v). */
  function worstParametric(mesh: BrepMesh): number {
    const { positions, uvs, indices } = mesh.faces;
    const o = mesh.origin;
    let worst = 0;
    const steps = 3;
    for (let t = 0; t < indices.length; t += 3) {
      const ix = [indices[t]!, indices[t + 1]!, indices[t + 2]!];
      for (let i = 0; i <= steps; i++) {
        for (let j = 0; i + j <= steps; j++) {
          const w = [i / steps, j / steps, 1 - (i + j) / steps];
          const q = [0, 1, 2].map(
            (k) =>
              w[0]! * (positions[ix[0]! * 3 + k]! + o[k]!) +
              w[1]! * (positions[ix[1]! * 3 + k]! + o[k]!) +
              w[2]! * (positions[ix[2]! * 3 + k]! + o[k]!),
          );
          const u =
            w[0]! * uvs[ix[0]! * 2]! +
            w[1]! * uvs[ix[1]! * 2]! +
            w[2]! * uvs[ix[2]! * 2]!;
          const v =
            w[0]! * uvs[ix[0]! * 2 + 1]! +
            w[1]! * uvs[ix[1]! * 2 + 1]! +
            w[2]! * uvs[ix[2]! * 2 + 1]!;
          const s = evaluateSurface(form, 0, u, v).position;
          worst = Math.max(
            worst,
            Math.hypot(q[0]! - s[0]!, q[1]! - s[1]!, q[2]! - s[2]!),
          );
        }
      }
    }
    return worst;
  }

  it("keeps every triangle point within the stated error of the patch at the same (u, v)", () => {
    for (const tolerance of [0.5, 0.05]) {
      const mesh = tessellateBrep(form, { tolerance });
      // float32 (u, v) over a domain with speeds near 150 m per unit: about 1e-5 m.
      expect(worstParametric(mesh)).toBeLessThanOrEqual(mesh.error + 1e-4);
    }
  });

  it("still reaches a coarse tolerance inside the grid cap", () => {
    expect(tessellateBrep(form, { tolerance: 0.5 }).error).toBe(0.5);
  });
});

describe("tessellateBrep: analytic surfaces keep their error within the stated one", () => {
  function analytic(
    make: (b: BrepBuilder) => number,
    box: readonly [number, number, number, number],
  ): BrepForm {
    const b = new BrepBuilder();
    boxFace(b, make(b), box);
    return b.build();
  }
  const tau = 2 * Math.PI;

  it("holds on a sphere, where both directions sag", () => {
    const r = 1.5;
    const form = analytic(
      (b) => b.sphere([0, 0, 0], [1, 0, 0], [0, 1, 0], r),
      [0, tau, -1.2, 1.3],
    );
    for (const tolerance of [1e-2, 1e-3]) {
      const mesh = tessellateBrep(form, { tolerance });
      expect(mesh.error).toBe(tolerance);
      const worst = worstDistance(mesh, sphereDistance(r));
      expect(worst).toBeLessThanOrEqual(mesh.error + FLOAT32);
      expect(worst).toBeGreaterThan(0.4 * tolerance);
    }
  });

  it("holds on a torus", () => {
    const [major, minor] = [2, 0.5];
    const form = analytic(
      (b) => b.torus([0, 0, 0], [1, 0, 0], [0, 1, 0], major, minor),
      [0, tau, 0, tau],
    );
    const torus: Distance = (p) =>
      Math.abs(Math.hypot(Math.hypot(p[0], p[1]) - major, p[2]) - minor);
    for (const tolerance of [1e-2, 1e-3]) {
      const mesh = tessellateBrep(form, { tolerance });
      expect(mesh.error).toBe(tolerance);
      expect(worstDistance(mesh, torus)).toBeLessThanOrEqual(
        mesh.error + FLOAT32,
      );
    }
  });

  it("holds on a cone and a cylinder", () => {
    const half = 0.3;
    const cone = analytic(
      (b) => b.cone([0, 0, 0], [1, 0, 0], [0, 1, 0], 1, half),
      [0, tau, 0, 2],
    );
    const distance: Distance = (p) =>
      Math.abs(Math.hypot(p[0], p[1]) - (1 + p[2] * Math.tan(half))) *
      Math.cos(half);
    const mesh = tessellateBrep(cone, { tolerance: 1e-3 });
    expect(worstDistance(mesh, distance)).toBeLessThanOrEqual(
      mesh.error + FLOAT32,
    );
    const cylinder = analytic(
      (b) => b.cylinder([0, 0, 0], [1, 0, 0], [0, 1, 0], 2),
      [0, tau, 0, 3],
    );
    const m = tessellateBrep(cylinder, { tolerance: 1e-3 });
    expect(worstDistance(m, cylinderDistance(2))).toBeLessThanOrEqual(
      m.error + FLOAT32,
    );
  });
});

describe("the bounds on a rational quadratic arc", () => {
  // Four arcs of 90°: the rate bound against the exact one. A symmetric arc of
  // half-angle β has θ = 2 atan(τ tan(β / 2)) for τ in [−1, 1], so its rate
  // peaks at the middle at 2 tan(β / 2) per τ, which is (2 tan(β / 2) / β)
  // times the mean: 1.0548 for β = 45°.
  const r = 0.5;
  const form = nurbsForm(
    revolvedSurface(turnAngles([1, 1, 1, 1]), lineProfile(r, r, 2)),
    identity(SurfaceKind.Cylinder, [r, 0]),
  );
  const frame = frameOf(form, 0);
  const exact = (Math.PI / 2) * ((2 * Math.tan(Math.PI / 8)) / (Math.PI / 4));

  it("bounds the angular rate about the axis within 2% of exact, and none along the ruling", () => {
    const rates = axisRates(form, 0, frame)!;
    expect(rates.s).toBeGreaterThanOrEqual(exact * (1 - 1e-9));
    expect(rates.s).toBeLessThan(exact * 1.02);
    expect(rates.t).toBeLessThan(1e-9);
  });

  it("bounds the speed, in 3D, within 2% of exact", () => {
    const speeds = speedBounds(form, 0, frame)!;
    expect(Math.sqrt(speeds.ss)).toBeGreaterThanOrEqual(r * exact * (1 - 1e-9));
    expect(Math.sqrt(speeds.ss)).toBeLessThan(r * exact * 1.02);
    // v runs 2 m along the ruling in one unit.
    expect(Math.sqrt(speeds.tt)).toBeGreaterThanOrEqual(2 * (1 - 1e-9));
    expect(Math.sqrt(speeds.tt)).toBeLessThan(2 * 1.02);
    expect(speeds.st).toBeLessThan(1e-9);
  });

  it("gives up on a patch that reaches the axis", () => {
    const pole = nurbsForm(
      revolvedSurface(
        turnAngles([1, 1, 1, 1]),
        meridianProfile(1, [-Math.PI / 2, -Math.PI / 4, 0]),
      ),
      identity(SurfaceKind.Sphere, [1, 0]),
    );
    expect(axisRates(pole, 0, frameOf(pole, 0))).toBeUndefined();
  });
});
