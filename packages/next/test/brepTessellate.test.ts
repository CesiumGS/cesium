import { describe, expect, it } from "vitest";
import { BrepBuilder } from "../src/brep/build.ts";
import { evaluateSurface } from "../src/brep/evaluate.ts";
import {
  faceTrim,
  tessellateBrep,
  type BrepMesh,
} from "../src/brep/tessellate.ts";
import {
  boxBrep,
  cappedCylinderBrep,
  trimmedNurbsBrep,
} from "./brepFixtures.ts";

type Vec = [number, number, number];

/** A mesh's face vertex, in m (origin added back). */
function facePoint(mesh: BrepMesh, i: number): Vec {
  const p = mesh.faces.positions;
  return [
    p[i * 3]! + mesh.origin[0]!,
    p[i * 3 + 1]! + mesh.origin[1]!,
    p[i * 3 + 2]! + mesh.origin[2]!,
  ];
}

function triangles(mesh: BrepMesh): [number, number, number][] {
  const out: [number, number, number][] = [];
  const ix = mesh.faces.indices;
  for (let t = 0; t < ix.length; t += 3) {
    out.push([ix[t]!, ix[t + 1]!, ix[t + 2]!]);
  }
  return out;
}

function sub(a: Vec, b: Vec): Vec {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}
function cross(a: Vec, b: Vec): Vec {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}
function dot(a: Vec, b: Vec): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

/** A triangle's geometric normal (not unit), from its winding. */
function geometricNormal(mesh: BrepMesh, t: [number, number, number]): Vec {
  const [a, b, c] = t.map((i) => facePoint(mesh, i)) as [Vec, Vec, Vec];
  return cross(sub(b, a), sub(c, a));
}

/** The number of triangles whose vertices belong to a face. */
function triangleCount(mesh: BrepMesh, face: number): number {
  return triangles(mesh).filter((t) => mesh.faces.featureIds[t[0]] === face)
    .length;
}

/** The number of line segments of an edge. */
function lineCount(mesh: BrepMesh, edge: number): number {
  let n = 0;
  for (let k = 0; k < mesh.edges.indices.length; k += 2) {
    if (mesh.edges.featureIds[mesh.edges.indices[k]!] === edge) {
      n++;
    }
  }
  return n;
}

describe("tessellateBrep: the box", () => {
  const mesh = tessellateBrep(boxBrep(), { tolerance: 1e-3 });

  it("is 12 triangles, 24 face vertices and 12 edge lines", () => {
    expect(triangles(mesh).length).toBe(12);
    expect(mesh.faces.positions.length / 3).toBe(24);
    expect(mesh.edges.indices.length / 2).toBe(12);
    expect(mesh.error).toBe(1e-3);
  });

  it("winds every triangle away from the box's centre", () => {
    const centre: Vec = [1, 1.5, 2];
    for (const t of triangles(mesh)) {
      const [a, b, c] = t.map((i) => facePoint(mesh, i)) as [Vec, Vec, Vec];
      const middle: Vec = [
        (a[0] + b[0] + c[0]) / 3,
        (a[1] + b[1] + c[1]) / 3,
        (a[2] + b[2] + c[2]) / 3,
      ];
      expect(
        dot(geometricNormal(mesh, t), sub(middle, centre)),
      ).toBeGreaterThan(0);
    }
  });

  it("gives each vertex its triangle's outward normal", () => {
    for (const t of triangles(mesh)) {
      const g = geometricNormal(mesh, t);
      for (const i of t) {
        const n: Vec = [
          mesh.faces.normals[i * 3]!,
          mesh.faces.normals[i * 3 + 1]!,
          mesh.faces.normals[i * 3 + 2]!,
        ];
        expect(dot(g, n)).toBeGreaterThan(0);
      }
    }
  });

  it("numbers faces 0 to 5 and edges 0 to 11, at the corners", () => {
    expect(new Set(mesh.faces.featureIds)).toEqual(new Set([0, 1, 2, 3, 4, 5]));
    expect(new Set(mesh.edges.featureIds)).toEqual(
      new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]),
    );
    const corners = new Set<string>();
    for (let i = 0; i < 8; i++) {
      corners.add([i & 1 ? 2 : 0, i & 2 ? 3 : 0, i & 4 ? 4 : 0].join(","));
    }
    const seen = new Set<string>();
    for (let i = 0; i < mesh.faces.positions.length / 3; i++) {
      const p = facePoint(mesh, i);
      const rounded = p.map((x, k) => {
        const r = Math.round(x);
        expect(Math.abs(x - r)).toBeLessThan(1e-6);
        expect(k).toBeLessThan(3);
        return r;
      });
      seen.add(rounded.join(","));
    }
    expect(seen).toEqual(corners);
  });
});

describe("tessellateBrep: the capped cylinder at 1 mm", () => {
  const mesh = tessellateBrep(cappedCylinderBrep(), { tolerance: 1e-3 });
  const side = triangles(mesh).filter((t) => mesh.faces.featureIds[t[0]] === 0);

  it("puts every side vertex at radius 1", () => {
    for (let i = 0; i < mesh.faces.positions.length / 3; i++) {
      if (mesh.faces.featureIds[i] === 0) {
        const p = facePoint(mesh, i);
        expect(Math.abs(Math.hypot(p[0], p[1]) - 1)).toBeLessThan(1e-6);
      }
    }
  });

  it("keeps each side triangle's edge midpoints within 1 mm of the surface", () => {
    expect(side.length).toBeGreaterThan(8);
    for (const t of side) {
      const pts = t.map((i) => facePoint(mesh, i)) as [Vec, Vec, Vec];
      for (let k = 0; k < 3; k++) {
        const a = pts[k]!;
        const b = pts[(k + 1) % 3]!;
        const mid = Math.hypot((a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
        expect(Math.abs(mid - 1)).toBeLessThanOrEqual(1e-3 + 1e-6);
      }
    }
  });

  it("has radial normals on the side and outward z on the caps", () => {
    for (let i = 0; i < mesh.faces.positions.length / 3; i++) {
      const p = facePoint(mesh, i);
      const n = [
        mesh.faces.normals[i * 3]!,
        mesh.faces.normals[i * 3 + 1]!,
        mesh.faces.normals[i * 3 + 2]!,
      ];
      const face = mesh.faces.featureIds[i]!;
      if (face === 0) {
        expect(n[0]! * p[0] + n[1]! * p[1]).toBeGreaterThan(1 - 1e-5);
        expect(Math.abs(n[2]!)).toBeLessThan(1e-6);
      } else {
        expect(n[0]).toBeCloseTo(0, 6);
        expect(n[1]).toBeCloseTo(0, 6);
        expect(n[2]).toBeCloseTo(face === 1 ? -1 : 1, 6);
      }
    }
  });

  it("winds the caps outward, too", () => {
    for (const t of triangles(mesh)) {
      const face = mesh.faces.featureIds[t[0]]!;
      if (face !== 0) {
        expect(
          geometricNormal(mesh, t)[2] * (face === 1 ? -1 : 1),
        ).toBeGreaterThan(0);
      }
    }
  });

  it("draws the circle edges with at least 8 lines each", () => {
    // Edge 0 is the seam, 1 the bottom circle, 2 the top circle.
    expect(lineCount(mesh, 0)).toBe(1);
    expect(lineCount(mesh, 1)).toBeGreaterThanOrEqual(8);
    expect(lineCount(mesh, 2)).toBeGreaterThanOrEqual(8);
  });
});

/** A seeded generator, so the sampled cells repeat. */
function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("tessellateBrep: the trimmed NURBS face at 0.05 m", () => {
  const form = trimmedNurbsBrep();
  const mesh = tessellateBrep(form, { tolerance: 0.05 });

  /** The (u, v) of a point on the surface, by Newton's method on its x and y. */
  function uvOf(p: Vec): [number, number] {
    let u = p[0] / 100;
    let v = p[1] / 100;
    for (let k = 0; k < 40; k++) {
      const s = evaluateSurface(form, 0, u, v);
      const rx = s.position[0]! - p[0];
      const ry = s.position[1]! - p[1];
      const det = s.du[0]! * s.dv[1]! - s.dv[0]! * s.du[1]!;
      u -= (rx * s.dv[1]! - ry * s.dv[0]!) / det;
      v -= (ry * s.du[0]! - rx * s.du[1]!) / det;
    }
    return [u, v];
  }

  const cells = triangles(mesh).map((t) => {
    const pts = t.map((i) => facePoint(mesh, i)) as [Vec, Vec, Vec];
    const uvs = pts.map(uvOf);
    return {
      t,
      pts,
      uvs,
      centre: [
        (uvs[0]![0] + uvs[1]![0] + uvs[2]![0]) / 3,
        (uvs[0]![1] + uvs[1]![1] + uvs[2]![1]) / 3,
      ] as [number, number],
    };
  });

  it("keeps no triangle whose centre is in the hole", () => {
    expect(cells.length).toBeGreaterThan(100);
    // The hole's polygon sits just inside its circle of r = 0.2.
    for (const cell of cells) {
      const d = Math.hypot(cell.centre[0] - 0.5, cell.centre[1] - 0.5);
      expect(d).toBeGreaterThan(0.1995);
    }
  });

  it("keeps an area in (u, v) within 5% of the domain less the hole", () => {
    let area = 0;
    for (const { uvs } of cells) {
      area +=
        Math.abs(
          (uvs[1]![0] - uvs[0]![0]) * (uvs[2]![1] - uvs[0]![1]) -
            (uvs[2]![0] - uvs[0]![0]) * (uvs[1]![1] - uvs[0]![1]),
        ) / 2;
    }
    const exact = 1 - Math.PI * 0.2 ** 2;
    expect(Math.abs(area - exact) / exact).toBeLessThan(0.05);
  });

  it("stays within the tolerance of the surface at 200 seeded cells", () => {
    const random = seeded(7);
    for (let k = 0; k < 200; k++) {
      const cell = cells[Math.floor(random() * cells.length)]!;
      const [a, b, c] = cell.pts;
      const plane: Vec = [
        (a[0] + b[0] + c[0]) / 3,
        (a[1] + b[1] + c[1]) / 3,
        (a[2] + b[2] + c[2]) / 3,
      ];
      const s = evaluateSurface(
        form,
        0,
        cell.centre[0],
        cell.centre[1],
      ).position;
      const n = cross(sub(b, a), sub(c, a));
      const unit = Math.hypot(n[0], n[1], n[2]);
      const away = dot(sub([s[0]!, s[1]!, s[2]!], plane), n) / unit;
      // Float32 positions, relative to the origin, add about 1e-5 m.
      expect(Math.abs(away)).toBeLessThanOrEqual(0.05 + 1e-4);
    }
  });

  it("states the tolerance as its error", () => {
    expect(mesh.error).toBe(0.05);
  });
});

describe("tessellateBrep: limits", () => {
  it("caps the grid, and states the larger error", () => {
    const mesh = tessellateBrep(cappedCylinderBrep(), {
      tolerance: 1e-6,
      maxGrid: 4,
    });
    expect(mesh.error).toBeGreaterThan(1e-6);
    for (let face = 0; face < 3; face++) {
      expect(triangleCount(mesh, face)).toBeLessThanOrEqual(4 * 4 * 2);
    }
  });

  it("rejects a tolerance that is not positive and finite", () => {
    for (const tolerance of [0, -1, NaN, Infinity]) {
      expect(() => tessellateBrep(boxBrep(), { tolerance })).toThrow(
        "tessellateBrep: tolerance must be a positive finite number",
      );
    }
  });
});

describe("tessellateBrep: a sphere face at the pole", () => {
  function sphereCap(): ReturnType<BrepBuilder["build"]> {
    const b = new BrepBuilder();
    const r = 2;
    const tau = 2 * Math.PI;
    const equator = b.vertex([r * Math.SQRT1_2, 0, r * Math.SQRT1_2]);
    const pole = b.vertex([0, 0, r]);
    const bottom = b.edge(equator, equator);
    const seam = b.edge(equator, pole);
    const top = b.edge(pole, pole);
    const sphere = b.sphere([0, 0, 0], [1, 0, 0], [0, 1, 0], r);
    const lo = Math.PI / 4;
    const hi = Math.PI / 2;
    b.face(sphere, [
      [
        {
          edge: bottom,
          pcurve: [
            [0, lo],
            [tau, lo],
          ],
        },
        {
          edge: seam,
          pcurve: [
            [tau, lo],
            [tau, hi],
          ],
        },
        {
          edge: top,
          reversed: true,
          pcurve: [
            [tau, hi],
            [0, hi],
          ],
        },
        {
          edge: seam,
          reversed: true,
          pcurve: [
            [0, hi],
            [0, lo],
          ],
        },
      ],
    ]);
    return b.build();
  }

  it("has no NaN, and unit normals that point outward", () => {
    const mesh = tessellateBrep(sphereCap(), { tolerance: 1e-3 });
    for (const array of [
      mesh.faces.positions,
      mesh.faces.normals,
      mesh.edges.positions,
    ]) {
      for (const x of array) {
        expect(Number.isFinite(x)).toBe(true);
      }
    }
    expect(mesh.faces.indices.length).toBeGreaterThan(0);
    for (let i = 0; i < mesh.faces.positions.length / 3; i++) {
      const p = facePoint(mesh, i);
      const n: Vec = [
        mesh.faces.normals[i * 3]!,
        mesh.faces.normals[i * 3 + 1]!,
        mesh.faces.normals[i * 3 + 2]!,
      ];
      expect(Math.hypot(...n)).toBeCloseTo(1, 5);
      expect(dot(n, p) / 2).toBeGreaterThan(0.99);
    }
    for (const t of triangles(mesh)) {
      const g = geometricNormal(mesh, t);
      const n: Vec = [
        mesh.faces.normals[t[0] * 3]!,
        mesh.faces.normals[t[0] * 3 + 1]!,
        mesh.faces.normals[t[0] * 3 + 2]!,
      ];
      expect(dot(g, n)).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("tessellateBrep: trims by the even-odd rule", () => {
  /** A planar face over a polygon in (u, v), listed in the given order. */
  function polygonFace(points: [number, number][]): BrepMesh {
    const b = new BrepBuilder();
    const vertices = points.map((p) => b.vertex([p[0], p[1], 0]));
    const plane = b.plane([0, 0, 0], [1, 0, 0], [0, 1, 0]);
    const uses = points.map((p, k) => {
      const next = (k + 1) % points.length;
      return {
        edge: b.edge(vertices[k]!, vertices[next]!),
        pcurve: [p, points[next]!] as [[number, number], [number, number]],
      };
    });
    b.face(plane, [uses]);
    return tessellateBrep(b.build(), { tolerance: 1e-3, trimGrid: 8 });
  }

  it("tessellates a clockwise outer loop the same as a counter-clockwise one", () => {
    const ccw = polygonFace([
      [0, 0],
      [1, 0],
      [0, 1],
    ]);
    const cw = polygonFace([
      [0, 0],
      [0, 1],
      [1, 0],
    ]);
    expect(ccw.faces.indices.length).toBeGreaterThan(0);
    expect(cw.faces.indices.length).toBe(ccw.faces.indices.length);
  });

  it("trims an L-shape, though its segments are all axis-aligned", () => {
    const l = polygonFace([
      [0, 0],
      [2, 0],
      [2, 1],
      [1, 1],
      [1, 2],
      [0, 2],
    ]);
    // Its box is 2 × 2 and a trimmed 8 × 8 grid keeps 3 of 4 quadrants: 96 triangles.
    expect(l.faces.indices.length / 3).toBe(96);
  });
});

describe("faceTrim", () => {
  it("gives a face's domain and tells inside from outside the trim", () => {
    // The trimmed NURBS face: the unit square with a hole of r = 0.2 at (0.5, 0.5).
    const trim = faceTrim(trimmedNurbsBrep(), 0)!;
    expect(trim.domain).toEqual([0, 1, 0, 1]);
    expect(trim.trimmed).toBe(true);
    expect(trim.contains(0.1, 0.1)).toBe(true);
    expect(trim.contains(0.5, 0.5)).toBe(false);
    expect(trim.contains(0.5, 0.65)).toBe(false);
    expect(trim.contains(0.5, 0.8)).toBe(true);
  });

  it("is the whole box for an untrimmed face", () => {
    const trim = faceTrim(boxBrep(), 0)!;
    expect(trim.trimmed).toBe(false);
    expect(trim.contains(0.5, 0.5)).toBe(true);
    expect(trim.contains(-1, 0.5)).toBe(false);
  });

  it("is undefined for a face index with no loops", () => {
    const form = boxBrep();
    const copy = { ...form, faceLoops: Uint32Array.from(form.faceLoops) };
    copy.faceLoops[1] = 0;
    expect(faceTrim(copy, 0)).toBeUndefined();
  });
});

describe("tessellateBrep uvs", () => {
  it("gives each face vertex a (u, v) that evaluateSurface maps back to its position", () => {
    for (const make of [boxBrep, cappedCylinderBrep, trimmedNurbsBrep]) {
      const form = make();
      const mesh = tessellateBrep(form, { tolerance: 0.001 });
      const count = mesh.faces.positions.length / 3;
      expect(mesh.faces.uvs.length).toBe(count * 2);
      let worst = 0;
      for (let i = 0; i < count; i++) {
        const surface = form.faceSurface[mesh.faces.featureIds[i]!]!;
        const p = evaluateSurface(
          form,
          surface,
          mesh.faces.uvs[i * 2]!,
          mesh.faces.uvs[i * 2 + 1]!,
        ).position;
        const q = facePoint(mesh, i);
        worst = Math.max(
          worst,
          Math.hypot(p[0]! - q[0], p[1]! - q[1], p[2]! - q[2]),
        );
      }
      expect(worst).toBeLessThan(1e-5);
    }
  });
});
