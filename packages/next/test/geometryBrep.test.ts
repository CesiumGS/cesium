// The b-rep adapter behind the geometry query interface (brep 3, plan §13.33):
// rays, closest points, segments, entities and picks answered from the form's
// surfaces, checked against a dense tessellation of the same form, on the
// gallery's fixtures (analytic, trimmed, free-form), an SMLib-like rational
// sphere, and a placed copy far from the origin.
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
import {
  nearestOnFace,
  nearestVertexUv,
} from "../examples/brep-first-look/exact.ts";
import { BrepBuilder } from "../src/brep/build.ts";
import { evaluateSurface } from "../src/brep/evaluate.ts";
import { SurfaceKind, type BrepForm } from "../src/brep/form.ts";
import { formBounds } from "../src/brep/formBounds.ts";
import { tessellateBrep } from "../src/brep/tessellate.ts";
import { brepGeometry } from "../src/geometry/brep.ts";
import {
  meridianProfile,
  nurbsCylinderBrep,
  revolvedSurface,
  turnAngles,
} from "./brepFixtures.ts";
import { checkAgainstMesh, random } from "./geometryBrepOracle.ts";

/** A one-face form on a NURBS surface over its whole domain, with edges sampled off the surface (honest ones). */
function nurbsFace(
  addSurface: (b: BrepBuilder) => number,
  steps = 128,
): BrepForm {
  const probe = new BrepBuilder();
  addSurface(probe);
  const surfaceForm = probe.build();
  const pointAt = (u: number, v: number) =>
    Array.from(evaluateSurface(surfaceForm, 0, u, v).position);
  const b = new BrepBuilder();
  const surface = addSurface(b);
  const corners = [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, 1],
  ] as const;
  const vertices = corners.map(([u, v]) => b.vertex(pointAt(u, v)));
  const uses = corners.map(([ua, va], i) => {
    const [ub, vb] = corners[(i + 1) % 4]!;
    const along = Array.from({ length: steps + 1 }, (_, s) =>
      pointAt(ua + ((ub - ua) * s) / steps, va + ((vb - va) * s) / steps),
    );
    const edge = b.edge(vertices[i]!, vertices[(i + 1) % 4]!, {
      curve: {
        degree: 1,
        count: steps + 1,
        dimension: 3,
        knots: Float64Array.from([
          0,
          ...Array.from({ length: steps + 1 }, (_, k) => k / steps),
          1,
        ]),
        points: Float64Array.from(along.flat()),
      },
    });
    return {
      edge,
      pcurve: [
        [ua, va],
        [ub, vb],
      ] as [[number, number], [number, number]],
    };
  });
  b.face(surface, [uses]);
  return b.build();
}

/** A sphere of r = 1.5 m centred on (0.5, -1, 2) as one NURBS face with uneven arcs, as SMLib holds one. */
function rationalSphere(): BrepForm {
  const lat = [-Math.PI / 2, -Math.PI / 6, Math.PI / 3, Math.PI / 2];
  return nurbsFace((b) =>
    b.nurbsSurface(
      revolvedSurface(turnAngles([2, 1, 3, 2]), meridianProfile(1.5, lat)),
      {
        identity: {
          kind: SurfaceKind.Sphere,
          origin: [0, 0, 0],
          x: [1, 0, 0],
          y: [0, 1, 0],
          params: [1.5, 0],
        },
        error: 1e-6,
      },
    ),
  );
}

const fixtures: Record<string, () => BrepForm> = {
  box: boxBrep,
  cappedCylinder: cappedCylinderBrep,
  trimmedNurbs: trimmedNurbsBrep,
  sphere: sphereBrep,
  torus: torusBrep,
  coneFrustum: coneFrustumBrep,
  plate: plateBrep,
  filletedBlock: filletedBlockBrep,
  rationalSphere,
};

describe("brepGeometry: against a dense tessellation", () => {
  for (const [name, make] of Object.entries(fixtures)) {
    const form = make();
    const exact = brepGeometry(form);
    const box = formBounds(form);
    const diagonal = Math.hypot(
      box.max[0] - box.min[0],
      box.max[1] - box.min[1],
      box.max[2] - box.min[2],
    );

    it(`${name}: closest points and rays are as near as the mesh's, on the face, and mostly agree`, () => {
      const found = checkAgainstMesh(form, exact, { points: 200, rays: 250 });
      expect(found.outside).toBe(0);
      // Rays that graze a silhouette or a trim edge can differ; the rest agree, and the mesh hits only what the form does (but a jagged trim).
      const { error, slack } = found;
      expect(found.agree / found.rays).toBeGreaterThan(
        slack > 10 * error ? 0.85 : 0.97,
      );
      expect(found.missed / found.rays).toBeLessThan(0.02);
      expect(found.hits).toBeGreaterThan(found.rays / 10);
    });

    it(`${name}: a segment ending past the surface's far side crosses it, and its distance is 0`, () => {
      const centre = [0, 1, 2].map((k) => (box.min[k]! + box.max[k]!) / 2);
      const far = centre.map((c) => c + 5 * diagonal);
      const nearHit = exact.rayHit({
        from: Float64Array.from(far),
        to: Float64Array.from(centre),
      });
      if (nearHit.verdict === "hit") {
        expect(exact.segmentDistance(far, centre).distance).toBe(0);
      }
    });
  }
});

describe("brepGeometry: routes and domain points", () => {
  it("names the route of each surface: closed form for analytic ones, Newton for patches", () => {
    const route = (form: BrepForm, from: number[], to: number[]) => {
      const a = brepGeometry(form).rayHit({
        from: Float64Array.from(from),
        to: Float64Array.from(to),
      });
      return a.verdict === "hit" ? a.hit.accuracy.route : a.verdict;
    };
    expect(route(boxBrep(), [1, 1.5, -1], [1, 1.5, 6])).toBe(
      "closed form, plane",
    );
    expect(route(cappedCylinderBrep(), [-3, 0, 1], [3, 0, 1])).toBe(
      "closed form, cylinder",
    );
    expect(route(sphereBrep(), [-3, 0.1, 0.1], [3, 0.1, 0.1])).toBe(
      "closed form, sphere",
    );
    expect(route(torusBrep(), [-3, 0.1, 0.1], [3, 0.1, 0.1])).toBe(
      "closed form, torus",
    );
    expect(route(coneFrustumBrep(), [-3, 0.1, 0.5], [3, 0.1, 0.5])).toContain(
      "closed form",
    );
    expect(route(rationalSphere(), [-3, 0.1, 0.1], [3, 0.1, 0.1])).toBe(
      "Newton on Bézier patch",
    );
  });

  it("a box: a hit names its face and (u, v), and its normal faces the ray", () => {
    const form = boxBrep();
    const exact = brepGeometry(form);
    const a = exact.rayHit({
      from: Float64Array.from([1, 1.5, 9]),
      to: Float64Array.from([1, 1.5, -9]),
    });
    expect(a.verdict).toBe("hit");
    if (a.verdict !== "hit") {
      return;
    }
    expect(a.hit.t).toBeCloseTo(5 / 18, 12);
    expect(Array.from(a.hit.normal)).toEqual([0, 0, 1]);
    expect(a.hit.entity.kind).toBe("face");
    const on = evaluateSurface(
      form,
      form.faceSurface[a.hit.entity.index]!,
      a.hit.uv![0],
      a.hit.uv![1],
    ).position;
    expect(Array.from(on)).toEqual([1, 1.5, 4]);
    // Reversed: the normal turns to face the new start.
    const down = exact.rayHit({
      from: Float64Array.from([1, 1.5, -9]),
      to: Float64Array.from([1, 1.5, 9]),
    });
    expect(down.verdict === "hit" && down.hit.normal[2]).toBe(-1);
    // tMin and tMax cut the segment; anyHit finds one.
    expect(
      exact.rayHit(
        {
          from: Float64Array.from([1, 1.5, 9]),
          to: Float64Array.from([1, 1.5, -9]),
        },
        { tMax: 0.2 },
      ).verdict,
    ).toBe("miss");
    expect(
      exact.rayHit(
        {
          from: Float64Array.from([1, 1.5, 9]),
          to: Float64Array.from([1, 1.5, -9]),
        },
        { anyHit: true },
      ).verdict,
    ).toBe("hit");
  });

  it("a box's closest points: a face, an edge or a vertex, by the kinds asked for", () => {
    const exact = brepGeometry(boxBrep());
    const face = exact.closestPoint([1, 1.5, 6])!;
    expect(face.entity.kind).toBe("face");
    expect(face.distance).toBeCloseTo(2, 12);
    expect(Array.from(face.normal!)).toEqual([0, 0, 1]);
    expect(face.uv).toBeDefined();
    // Beyond the top edge along y = 3, z = 4.
    const edge = exact.closestPoint([1, 4, 5])!;
    expect(edge.entity.kind).toBe("edge");
    expect(edge.distance).toBeCloseTo(Math.SQRT2, 12);
    expect(edge.t).toBeCloseTo(0.5, 12);
    expect(edge.accuracy.route).toBe("closed form, line edge");
    expect(exact.entity(edge.entity)!.faces.length).toBe(2);
    expect(
      exact.closestPoint([1, 4, 5], { kinds: ["face"] })!.entity.kind,
    ).toBe("face");
    // Past a corner.
    const corner = exact.closestPoint([-1, -1, -1])!;
    expect(corner.entity.kind).toBe("vertex");
    expect(corner.distance).toBeCloseTo(Math.sqrt(3), 12);
    expect(
      exact.closestPoint([-1, -1, -1], { kinds: ["edge"] })!.entity.kind,
    ).toBe("edge");
    expect(
      exact.closestPoint([-1, -1, -1], { kinds: ["face"] })!.entity.kind,
    ).toBe("face");
    expect(exact.closestPoint([1, 1, 1], { kinds: [] })).toBeUndefined();
    expect(exact.closestPoint([9, 9, 9], { maxDistance: 1 })).toBeUndefined();
    expect(
      exact.closestPoint([1, 1.5, 4.5], { maxDistance: 1 })!.distance,
    ).toBeCloseTo(0.5, 12);
    // A point inside is nearest the face it is nearest, and its normal turns to face it.
    const inside = exact.closestPoint([0.2, 1.5, 2])!;
    expect(inside.distance).toBeCloseTo(0.2, 12);
    expect(Array.from(inside.normal!)).toEqual([1, 0, 0]);
  });

  it("a sphere: closed forms, and the (u, v) evaluates back to the point", () => {
    const form = sphereBrep();
    const exact = brepGeometry(form);
    const p = [0.3, -2, 1.1];
    const a = exact.closestPoint(p, { kinds: ["face"] })!;
    const length = Math.hypot(...p);
    expect(a.distance).toBeCloseTo(length - 1, 12);
    for (let k = 0; k < 3; k++) {
      expect(a.position[k]!).toBeCloseTo(p[k]! / length, 12);
    }
    const on = evaluateSurface(form, 0, a.uv![0], a.uv![1]).position;
    for (let k = 0; k < 3; k++) {
      expect(on[k]!).toBeCloseTo(a.position[k]!, 12);
    }
    expect(a.accuracy.route).toBe("closed form, sphere");
  });

  it("a torus: the nearest point of the tube, from outside, inside the hole and from the axis", () => {
    const exact = brepGeometry(torusBrep());
    const near = (p: number[], distance: number) =>
      expect(exact.closestPoint(p, { kinds: ["face"] })!.distance).toBeCloseTo(
        distance,
        12,
      );
    near([3, 0, 0], 2 - 0.3);
    near([0.2, 0.2, 0.1], Math.hypot(Math.hypot(0.2, 0.2) - 1, 0.1) - 0.3);
    near([0, 0, 0.5], Math.hypot(1, 0.5) - 0.3);
    near([0, 0, 0], 0.7);
  });
});

describe("brepGeometry: trimmed faces", () => {
  it("a plate: rays through a bolt hole miss, rays beside it hit the face", () => {
    const form = plateBrep();
    const exact = brepGeometry(form);
    const down = (x: number, y: number) =>
      exact.rayHit({
        from: Float64Array.from([x, y, 5]),
        to: Float64Array.from([x, y, -5]),
      });
    for (const [x, y] of [
      [0.5, 0.5],
      [3.5, 0.5],
      [0.5, 2.5],
      [3.5, 2.5],
      [0.5 + 0.1, 0.5 - 0.1],
    ]) {
      expect(down(x!, y!).verdict).toBe("miss");
    }
    for (const [x, y] of [
      [0.5 + 0.2, 0.5],
      [2, 1.5],
      [3.5, 2.5 + 0.16],
    ]) {
      const a = down(x!, y!);
      expect(a.verdict).toBe("hit");
      if (a.verdict === "hit") {
        expect(a.hit.position[2]).toBeCloseTo(0.2, 12);
      }
    }
    // The hole's rim is exact, not its 64-sided polygon (whose chords stray 0.18 mm): 10 µm each side of it.
    expect(down(0.5 + 0.15 - 1e-5, 0.5).verdict).toBe("miss");
    expect(down(0.5 + 0.15 + 1e-5, 0.5).verdict).toBe("hit");
    expect(down(0.5, 0.5 + 0.15 - 1e-5).verdict).toBe("miss");
    expect(down(0.5 - 0.15 - 1e-5, 0.5).verdict).toBe("hit");
    const rimAngle = Math.PI / 5;
    for (const [d, verdict] of [
      [0.15 - 1e-5, "miss"],
      [0.15 + 1e-5, "hit"],
    ] as const) {
      expect(
        down(0.5 + d * Math.cos(rimAngle), 0.5 + d * Math.sin(rimAngle))
          .verdict,
      ).toBe(verdict);
    }
    // Through the hole, slanted: it hits the bolt hole's cylinder wall.
    const slanted = exact.rayHit({
      from: Float64Array.from([0.4, 0.5, 0.3]),
      to: Float64Array.from([0.8, 0.5, 0.1]),
    });
    expect(slanted.verdict).toBe("hit");
    if (slanted.verdict === "hit") {
      expect(slanted.hit.accuracy.route).toBe("closed form, cylinder");
      expect(
        Math.hypot(
          slanted.hit.position[0]! - 0.5,
          slanted.hit.position[1]! - 0.5,
        ),
      ).toBeCloseTo(0.15, 9);
    }
  });

  it("a plate: the nearest point of a face is not in a hole", () => {
    const exact = brepGeometry(plateBrep());
    // Above the hole's centre: the nearest face point is the hole's rim (an edge), or the wall.
    const a = exact.closestPoint([0.5, 0.5, 0.2 + 0.5], { kinds: ["face"] })!;
    expect(a.distance).toBeGreaterThan(0.5);
    expect(a.distance).toBeLessThan(Math.hypot(0.5, 0.15) + 1e-6);
    const rim = exact.closestPoint([0.5, 0.5, 0.2 + 0.5], { kinds: ["edge"] })!;
    expect(rim.distance).toBeCloseTo(Math.hypot(0.5, 0.15), 6);
  });

  it("a trimmed free-form face: a ray through the hole misses, beside it hits at its (u, v)", () => {
    const form = trimmedNurbsBrep();
    const exact = brepGeometry(form);
    const column = (u: number, v: number) => {
      const p = evaluateSurface(form, 0, u, v).position;
      return exact.rayHit({
        from: Float64Array.from([p[0]!, p[1]!, 200]),
        to: Float64Array.from([p[0]!, p[1]!, -200]),
      });
    };
    expect(column(0.5, 0.5).verdict).toBe("miss");
    expect(column(0.5 + 0.1, 0.5).verdict).toBe("miss");
    for (const [u, v] of [
      [0.5, 0.5 + 0.3],
      [0.1, 0.1],
      [0.85, 0.7],
    ]) {
      const a = column(u!, v!);
      expect(a.verdict).toBe("hit");
      if (a.verdict === "hit") {
        expect(a.hit.uv![0]).toBeCloseTo(u!, 6);
        expect(a.hit.uv![1]).toBeCloseTo(v!, 6);
        expect(a.hit.accuracy.route).toBe("Newton on Bézier patch");
        // The face's edge tolerance (the hole's 5 cm) is one of the terms.
        expect(a.hit.accuracy.meters).toBeGreaterThanOrEqual(0.05);
        expect(a.hit.accuracy.note).toContain("edge");
      }
    }
  });
});

describe("brepGeometry: an SMLib-like rational sphere", () => {
  const form = rationalSphere();
  const exact = brepGeometry(form);

  it("rays cross at the sphere's radius, to float64", () => {
    const next = random(3);
    for (let i = 0; i < 100; i++) {
      const dir = [next() - 0.5, next() - 0.5, next() - 0.5];
      const length = Math.hypot(...dir);
      const to = dir.map((x) => (x / length) * 1.5 * 0.999);
      const from = dir.map((x) => (x / length) * 6);
      const a = exact.rayHit({
        from: Float64Array.from(from),
        to: Float64Array.from(to),
      });
      expect(a.verdict).toBe("hit");
      if (a.verdict === "hit") {
        expect(Math.hypot(...Array.from(a.hit.position))).toBeCloseTo(1.5, 9);
        expect(a.hit.accuracy.exact).toBe(true);
        // 1 µm representation error, and the model's 0.1 µm.
        expect(a.hit.accuracy.meters).toBeGreaterThan(1e-6);
        expect(a.hit.accuracy.note).toContain("Newton on Bézier patch");
        expect(a.hit.accuracy.note).toContain("surface 1.0 µm");
      }
    }
  });

  it("closest points are at the radius, and their (u, v) evaluates back", () => {
    const next = random(5);
    for (let i = 0; i < 100; i++) {
      const p = [next() * 6 - 3, next() * 6 - 3, next() * 6 - 3];
      const length = Math.hypot(...p);
      const a = exact.closestPoint(p, { kinds: ["face"] })!;
      expect(a.distance).toBeCloseTo(Math.abs(length - 1.5), 8);
      const on = evaluateSurface(form, 0, a.uv![0], a.uv![1]).position;
      for (let k = 0; k < 3; k++) {
        expect(on[k]!).toBeCloseTo(a.position[k]!, 8);
      }
    }
  });
});

describe("brepGeometry: placement", () => {
  // A turn about (1, 2, 2)/3, a uniform scale of 2 and a translation of Earth size.
  const angle = 0.7;
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const [x, y, z] = [1 / 3, 2 / 3, 2 / 3];
  const R = [
    [c + x * x * (1 - c), x * y * (1 - c) - z * s, x * z * (1 - c) + y * s],
    [y * x * (1 - c) + z * s, c + y * y * (1 - c), y * z * (1 - c) - x * s],
    [z * x * (1 - c) - y * s, z * y * (1 - c) + x * s, c + z * z * (1 - c)],
  ];
  const scale = 2;
  const t = [6_378_137.25, -42.5, 1_000.75];
  const matrix = Float64Array.from([
    ...[0, 1, 2].map((r) => R[r]![0]! * scale),
    0,
    ...[0, 1, 2].map((r) => R[r]![1]! * scale),
    0,
    ...[0, 1, 2].map((r) => R[r]![2]! * scale),
    0,
    t[0]!,
    t[1]!,
    t[2]!,
    1,
  ]);
  const place = (p: ArrayLike<number>): number[] =>
    [0, 1, 2].map(
      (r) =>
        scale * (R[r]![0]! * p[0]! + R[r]![1]! * p[1]! + R[r]![2]! * p[2]!) +
        t[r]!,
    );
  const form = plateBrep();
  const home = brepGeometry(form);
  const placed = brepGeometry(form, { matrix, origin: t });

  it("closest points and rays follow the placement, in metres, to a micrometre", () => {
    const next = random(9);
    for (let i = 0; i < 60; i++) {
      const p = [next() * 6 - 1, next() * 5 - 1, next() * 2 - 0.8];
      const a = home.closestPoint(p)!;
      const b = placed.closestPoint(place(p))!;
      expect(b.distance).toBeCloseTo(a.distance * scale, 6);
      const expected = place(a.position);
      for (let k = 0; k < 3; k++) {
        expect(b.position[k]!).toBeCloseTo(expected[k]!, 6);
      }
      expect(b.entity).toEqual(a.entity);
      if (a.normal) {
        // The normal turns with the part and stays unit.
        expect(Math.hypot(...Array.from(b.normal!))).toBeCloseTo(1, 9);
      }
      expect(b.accuracy.meters).toBeCloseTo(a.accuracy.meters * scale, 12);
    }
    const from = [2, 1.5, 4];
    const to = [2, 1.5, -4];
    const a = home.rayHit({
      from: Float64Array.from(from),
      to: Float64Array.from(to),
    });
    const b = placed.rayHit({
      from: Float64Array.from(place(from)),
      to: Float64Array.from(place(to)),
    });
    expect(a.verdict).toBe("hit");
    expect(b.verdict).toBe("hit");
    if (a.verdict === "hit" && b.verdict === "hit") {
      expect(b.hit.t).toBeCloseTo(a.hit.t, 12);
      expect(b.hit.uv![0]).toBeCloseTo(a.hit.uv![0], 9);
      expect(b.hit.uv![1]).toBeCloseTo(a.hit.uv![1], 9);
      const expected = place(a.hit.position);
      for (let k = 0; k < 3; k++) {
        expect(b.hit.position[k]!).toBeCloseTo(expected[k]!, 6);
      }
    }
    // A per-query origin gives the same answer.
    const other = placed.closestPoint(place([2, 1.5, 4]), {
      origin: [6_378_000, 0, 1000],
    })!;
    expect(other.distance).toBeCloseTo(
      home.closestPoint([2, 1.5, 4])!.distance * scale,
      6,
    );
  });

  it("bounds hold the placed corners, and display places the mesh", () => {
    const bounds = placed.bounds();
    const box = formBounds(form);
    for (let c8 = 0; c8 < 8; c8++) {
      const corner = [0, 1, 2].map((k) =>
        (c8 >> k) & 1 ? box.max[k]! : box.min[k]!,
      );
      const q = place(corner);
      for (let k = 0; k < 3; k++) {
        expect(bounds.min[k]!).toBeLessThanOrEqual(q[k]! + 1e-6);
        expect(bounds.max[k]!).toBeGreaterThanOrEqual(q[k]! - 1e-6);
      }
    }
    expect(bounds.accuracy.exact).toBe(false);
    const mesh = placed.display(0.01)!;
    expect(mesh.error).toBeLessThanOrEqual(0.01 * 1.0000001 + 1e-9);
    // A mesh vertex, placed by the display matrix, lies on a placed face.
    const p = Array.from(mesh.positions.subarray(0, 3));
    const m = mesh.matrix;
    const at = [0, 1, 2].map(
      (i) => m[i]! * p[0]! + m[4 + i]! * p[1]! + m[8 + i]! * p[2]! + m[12 + i]!,
    );
    expect(placed.closestPoint(at, { kinds: ["face"] })!.distance).toBeLessThan(
      1e-5,
    );
  });

  it("refuses a matrix that is not a rotation, translation and uniform scale", () => {
    const shear = Float64Array.from([
      1, 0, 0, 0, 0.5, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1,
    ]);
    expect(() => brepGeometry(form, { matrix: shear })).toThrow(
      /uniform scale/,
    );
    const stretch = Float64Array.from([
      2, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1,
    ]);
    expect(() => brepGeometry(form, { matrix: stretch })).toThrow(
      /uniform scale/,
    );
    expect(() => brepGeometry(form, { modelTolerance: -1 })).toThrow(
      /modelTolerance/,
    );
  });
});

describe("brepGeometry: accuracy terms", () => {
  it("adds the model tolerance, the surface's error and the edge's tolerance, with the route", () => {
    const form = nurbsCylinderBrep();
    const exact = brepGeometry(form, { modelTolerance: 2e-6 });
    const a = exact.rayHit({
      from: Float64Array.from([-3, 0.1, 1]),
      to: Float64Array.from([3, 0.1, 1]),
    });
    expect(a.verdict).toBe("hit");
    if (a.verdict === "hit") {
      // 2 µm model + 25 µm surface + the edges' default 1 µm.
      expect(a.hit.accuracy.meters).toBeCloseTo(2e-6 + 2.5e-5 + 1e-6, 9);
      expect(a.hit.accuracy.route).toBe("Newton on Bézier patch");
      expect(a.hit.accuracy.note).toMatch(/model 2\.0 µm \+ surface 25 µm/);
      expect(a.hit.accuracy.note).not.toMatch(/\de[-+]?\d/);
    }
    // A miss and bounds carry the largest surface error.
    expect(
      exact.rayHit({
        from: Float64Array.from([-3, 5, 1]),
        to: Float64Array.from([3, 5, 1]),
      }).verdict,
    ).toBe("miss");
    expect(exact.bounds().accuracy.meters).toBeGreaterThanOrEqual(2.69e-5);
  });

  it("a vertex's and an edge's answers carry their own tolerances", () => {
    const form = trimmedNurbsBrep();
    const exact = brepGeometry(form);
    // The hole's edge has a tolerance of 5 cm: a point near its rim answers with it.
    const rim = evaluateSurface(form, 0, 0.5 + 0.2, 0.5).position;
    const a = exact.closestPoint([rim[0]!, rim[1]!, rim[2]! + 3], {
      kinds: ["edge"],
    })!;
    expect(a.entity.kind).toBe("edge");
    expect(a.accuracy.meters).toBeGreaterThanOrEqual(0.05);
    const v = exact.closestPoint([-5, -5, 0], { kinds: ["vertex"] })!;
    expect(v.entity.kind).toBe("vertex");
    expect(v.accuracy.route).toBe("vertex position");
  });
});

describe("brepGeometry: segments, entities, bounds, display", () => {
  it("segmentDistance: crossing 0, parallel to a face, and a dip between ends", () => {
    const box = brepGeometry(boxBrep());
    expect(box.segmentDistance([1, 1, -1], [1, 1, 9]).distance).toBe(0);
    expect(box.segmentDistance([0, 0, 5], [2, 3, 5]).distance).toBeCloseTo(
      1,
      9,
    );
    const sphere = brepGeometry(sphereBrep());
    const d = sphere.segmentDistance([1.5, -3, 0], [1.5, 3, 0]);
    expect(d.distance).toBeCloseTo(0.5, 6);
    expect(d.accuracy.exact).toBe(false);
    expect(d.accuracy.note).toContain("sampled");
    expect(sphere.segmentDistance([0, 0, 3], [0, 0, 3]).distance).toBeCloseTo(
      2,
      12,
    );
    expect(
      brepGeometry(new BrepBuilder().build()).segmentDistance(
        [0, 0, 0],
        [1, 1, 1],
      ).distance,
    ).toBe(Infinity);
  });

  it("entities: a face's corners, an edge's faces, a vertex's faces", () => {
    const form = boxBrep();
    const exact = brepGeometry(form);
    const face = exact.entity({ kind: "face", index: 0 })!;
    expect(face.points.length).toBe(4);
    expect(face.faces).toEqual([{ kind: "face", index: 0 }]);
    const edge = exact.entity({ kind: "edge", index: 0 })!;
    expect(edge.points.length).toBe(2);
    expect(edge.faces.length).toBe(2);
    const vertex = exact.entity({ kind: "vertex", index: 0 })!;
    expect(vertex.points.length).toBe(1);
    expect(vertex.faces.length).toBe(3);
    expect(exact.entity({ kind: "face", index: 6 })).toBeUndefined();
    expect(exact.entity({ kind: "edge", index: -1 })).toBeUndefined();
    expect(exact.entity({ kind: "vertex", index: 1.5 })).toBeUndefined();
    expect(exact.kind).toBe("brep");
    expect(exact.version).toBe(form.version);
    expect(brepGeometry(form, { version: 9 }).version).toBe(9);
  });

  it("bounds hold the form, and display meshes within the tolerance asked", () => {
    for (const make of Object.values(fixtures)) {
      const form = make();
      const exact = brepGeometry(form);
      const bounds = exact.bounds();
      const box = formBounds(form);
      for (let k = 0; k < 3; k++) {
        expect(bounds.min[k]!).toBeCloseTo(box.min[k]!, 9);
        expect(bounds.max[k]!).toBeCloseTo(box.max[k]!, 9);
      }
      expect(bounds.accuracy.route).toBe("form bounds");
      const mesh = exact.display(1e-3)!;
      expect(mesh.indices.length).toBeGreaterThan(0);
      expect(mesh.error).toBeGreaterThan(0);
    }
  });

  it("a form with no faces misses every ray and has no closest point", () => {
    const empty = brepGeometry(new BrepBuilder().build());
    expect(
      empty.rayHit({
        from: Float64Array.from([0, 0, 0]),
        to: Float64Array.from([1, 1, 1]),
      }).verdict,
    ).toBe("miss");
    expect(empty.closestPoint([0, 0, 0])).toBeUndefined();
  });
});

describe("brepGeometry: refining a pick", () => {
  for (const [name, make] of Object.entries(fixtures)) {
    it(`${name}: a mesh point and its (u, v) refine onto the exact face, no worse than the example's Gauss–Newton`, () => {
      const form = make();
      const exact = brepGeometry(form);
      const mesh = tessellateBrep(form, { tolerance: 2e-3 });
      const { positions, uvs, featureIds, indices } = mesh.faces;
      const next = random(13);
      const triangles = indices.length / 3;
      for (let n = 0; n < 40; n++) {
        const t = Math.floor(next() * triangles);
        const corners = [0, 1, 2].map((c) => indices[t * 3 + c]!);
        const face = featureIds[corners[0]!]!;
        const w = [next(), next(), next()];
        const sum = w[0]! + w[1]! + w[2]!;
        const point = [0, 1, 2].map(
          (k) =>
            mesh.origin[k]! +
            corners.reduce(
              (acc, v, i) => acc + (w[i]! / sum) * positions[v * 3 + k]!,
              0,
            ),
        );
        const uv: [number, number] = [
          corners.reduce((acc, v, i) => acc + (w[i]! / sum) * uvs[v * 2]!, 0),
          corners.reduce(
            (acc, v, i) => acc + (w[i]! / sum) * uvs[v * 2 + 1]!,
            0,
          ),
        ];
        const byPoint = exact.refinePick(face, { point })!;
        const both = exact.refinePick(face, { point, uv })!;
        const onlyUv = exact.refinePick(face, { uv })!;
        expect(byPoint).toBeDefined();
        // On the face's surface, within the mesh's error of the hint.
        for (const pick of [byPoint, both, onlyUv]) {
          const on = evaluateSurface(
            form,
            form.faceSurface[face]!,
            pick.uv[0],
            pick.uv[1],
          ).position;
          expect(
            Math.hypot(
              on[0]! - pick.position[0]!,
              on[1]! - pick.position[1]!,
              on[2]! - pick.position[2]!,
            ),
          ).toBeLessThan(1e-9);
          expect(Math.hypot(...Array.from(pick.normal))).toBeCloseTo(1, 9);
          expect(pick.entity).toEqual({ kind: "face", index: face });
          expect(pick.accuracy.exact).toBe(true);
        }
        expect(byPoint.distance).toBeLessThanOrEqual(mesh.error + 1e-6);
        expect(both.distance).toBeLessThanOrEqual(mesh.error + 1e-6);
        expect(onlyUv.distance).toBe(0);
        // The example's Gauss–Newton from the nearest mesh vertex's (u, v): ours is at least as near.
        const start = nearestVertexUv(mesh, face, point);
        const theirs = start && nearestOnFace(form, face, point, start);
        if (theirs) {
          expect(both.distance).toBeLessThanOrEqual(theirs.distance + 1e-9);
          expect(byPoint.distance).toBeLessThanOrEqual(theirs.distance + 1e-9);
        }
      }
    });
  }

  it("names its route, refuses a hint with nothing, and a face with no such index", () => {
    const exact = brepGeometry(boxBrep());
    const point = [1, 1.5, 4.001];
    expect(exact.refinePick(0, { point })?.accuracy.route).toBeTruthy();
    expect(exact.refinePick(0, { uv: [0.5, 0.5] })?.accuracy.route).toBe(
      "evaluation at the pick's (u, v)",
    );
    expect(exact.refinePick(0, {})).toBeUndefined();
    expect(exact.refinePick(99, { point })).toBeUndefined();
  });
});
