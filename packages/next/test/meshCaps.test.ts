// Mesh caps (src/scene/world/meshCaps.ts): a mesh cut by a plane into
// segments by element, joined across tiles, triangulated, with the chains that
// do not close left as section lines.
import { describe, expect, it } from "vitest";
import {
  assembleMeshCaps,
  meshPlane,
  sectionTile,
  triangulateRegion,
  type MeshCapTile,
} from "../src/scene/world/meshCaps.ts";

type V3 = [number, number, number];

/** A box of n × n quads a face, outward winding (inward when `inward`), as triangles. */
function gridBox(
  min: V3,
  max: V3,
  n: number,
  inward = false,
): { positions: number[]; indices: number[]; centroids: V3[] } {
  const positions: number[] = [];
  const indices: number[] = [];
  const centroids: V3[] = [];
  for (let a = 0; a < 3; a++) {
    for (const s of [-1, 1]) {
      const u = (a + 1) % 3;
      const v = (a + 2) % 3;
      const at = (i: number, j: number): V3 => {
        const p: V3 = [0, 0, 0];
        p[a] = s < 0 ? min[a]! : max[a]!;
        p[u] = min[u]! + ((max[u]! - min[u]!) * i) / n;
        p[v] = min[v]! + ((max[v]! - min[v]!) * j) / n;
        return p;
      };
      for (let j = 0; j < n; j++) {
        for (let i = 0; i < n; i++) {
          const corners = [
            at(i, j),
            at(i + 1, j),
            at(i + 1, j + 1),
            at(i, j + 1),
          ];
          if (s < 0 !== inward) {
            corners.reverse();
          }
          const base = positions.length / 3;
          for (const c of corners) {
            positions.push(...c);
          }
          for (const t of [
            [0, 1, 2],
            [0, 2, 3],
          ]) {
            indices.push(base + t[0]!, base + t[1]!, base + t[2]!);
            centroids.push(
              [0, 1, 2].map(
                (k) =>
                  (positions[(base + t[0]!) * 3 + k]! +
                    positions[(base + t[1]!) * 3 + k]! +
                    positions[(base + t[2]!) * 3 + k]!) /
                  3,
              ) as V3,
            );
          }
        }
      }
    }
  }
  return { positions, indices, centroids };
}

/** The mesh's triangles that `keep` (by centroid), as a tile. */
function tileOf(
  id: string,
  box: ReturnType<typeof gridBox>,
  keep: (c: V3) => boolean,
  feature = 0,
  geometricError = 0,
): MeshCapTile {
  const indices: number[] = [];
  box.centroids.forEach((c, t) => {
    if (keep(c)) {
      indices.push(
        box.indices[t * 3]!,
        box.indices[t * 3 + 1]!,
        box.indices[t * 3 + 2]!,
      );
    }
  });
  return {
    id,
    revision: 1,
    positions: Float32Array.from(box.positions),
    indices: Uint32Array.from(indices),
    featureIds: new Uint32Array(box.positions.length / 3).fill(feature),
    geometricError,
  };
}

const plane = (z: number) => ({ point: [0, 0, z], normal: [0, 0, 1] });
const cut = (
  tiles: MeshCapTile[],
  p: Parameters<typeof meshPlane>[0] = plane(0.3),
  options = {},
) => {
  const frame = meshPlane(p);
  return assembleMeshCaps(
    tiles.map((t) => sectionTile(t, frame)),
    p,
    options,
  );
};

/** The area of a cap mesh's triangles. */
function area(positions: Float32Array, indices: Uint32Array): number {
  let total = 0;
  for (let t = 0; t < indices.length; t += 3) {
    const p = [0, 1, 2].map((k) => indices[t + k]! * 3);
    const e1 = [0, 1, 2].map(
      (k) => positions[p[1]! + k]! - positions[p[0]! + k]!,
    );
    const e2 = [0, 1, 2].map(
      (k) => positions[p[2]! + k]! - positions[p[0]! + k]!,
    );
    total +=
      Math.hypot(
        e1[1]! * e2[2]! - e1[2]! * e2[1]!,
        e1[2]! * e2[0]! - e1[0]! * e2[2]!,
        e1[0]! * e2[1]! - e1[1]! * e2[0]!,
      ) / 2;
  }
  return total;
}

describe("mesh caps", () => {
  it("a closed box cut in one tile is a filled square", () => {
    const box = gridBox([-1, -1, -1], [1, 1, 1], 2);
    const caps = cut([tileOf("a", box, () => true)]);
    expect(caps.report.closedLoops).toBe(1);
    expect(caps.report.openChains).toBe(0);
    expect(caps.lines).toBeUndefined();
    expect(
      area(caps.triangles!.positions, caps.triangles!.indices),
    ).toBeCloseTo(4, 6);
    // The cap faces out along the plane's normal.
    expect(caps.triangles!.normals![2]).toBe(1);
    expect(caps.report.elements[0]!.area).toBeCloseTo(4, 9);
    expect(caps.report.triangulationShortfalls).toBe(0);
  });

  it("a closed box split across two tiles closes across them", () => {
    const box = gridBox([-1, -1, -1], [1, 1, 1], 2);
    const left = tileOf("left", box, (c) => c[0] < 0);
    const right = tileOf("right", box, (c) => c[0] >= 0);
    const alone = cut([left]);
    expect(alone.report.closedLoops).toBe(0);
    expect(alone.report.openChains).toBe(1);
    expect(alone.triangles).toBeUndefined();
    const caps = cut([left, right]);
    expect(caps.report.tilesCrossed).toBe(2);
    expect(caps.report.closedLoops).toBe(1);
    expect(caps.report.openChains).toBe(0);
    expect(
      area(caps.triangles!.positions, caps.triangles!.indices),
    ).toBeCloseTo(4, 6);
  });

  it("an open mesh's section is a chain, drawn as a line and not filled", () => {
    // An L-shaped wall: two quads standing from z = 0 to 1.
    const positions = [
      0, 0, 0, 2, 0, 0, 2, 0, 1, 0, 0, 1, 2, 0, 0, 2, 2, 0, 2, 2, 1, 2, 0, 1,
    ];
    const caps = cut(
      [
        {
          id: "wall",
          revision: 1,
          positions: Float32Array.from(positions),
          indices: Uint32Array.from([0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7]),
        },
      ],
      plane(0.5),
    );
    expect(caps.triangles).toBeUndefined();
    expect(caps.report.openChains).toBe(1);
    expect(caps.report.closedLoops).toBe(0);
    const lines = caps.lines!;
    expect(lines.topology).toBe("line-list");
    // Each quad's two triangles cut one segment each: a chain of four, five points.
    expect(lines.positions.length / 3).toBe(5);
    expect(lines.indices.length).toBe(8);
  });

  it("two elements make their own caps, keyed by element ID", () => {
    const a = gridBox([-3, -1, -1], [-1, 1, 1], 1);
    const b = gridBox([1, -1, -1], [3, 1, 1], 1);
    const caps = cut([
      tileOf("a", a, () => true, 7),
      tileOf("b", b, () => true, 9),
    ]);
    expect(caps.report.elements.map((e) => e.feature)).toEqual([7, 9]);
    expect(caps.report.elements.map((e) => e.area)).toEqual([
      expect.closeTo(4, 9),
      expect.closeTo(4, 9),
    ]);
    const ids = new Set(caps.triangles!.featureIds);
    expect([...ids].sort()).toEqual([7, 9]);
    expect(caps.triangles!.featureCount).toBe(10);
  });

  it("a box with an inner box turned inside out has a hole", () => {
    const outer = gridBox([-2, -2, -1], [2, 2, 1], 1);
    const inner = gridBox([-1, -1, -0.5], [1, 1, 0.5], 1, true);
    const caps = cut([
      tileOf("outer", outer, () => true),
      tileOf("inner", inner, () => true),
    ]);
    expect(caps.report.closedLoops).toBe(2);
    expect(caps.report.elements[0]!.holes).toBe(1);
    expect(
      area(caps.triangles!.positions, caps.triangles!.indices),
    ).toBeCloseTo(16 - 4, 6);
    expect(caps.report.triangulationShortfalls).toBe(0);
  });

  it("limits cut the caps to the clip box's side", () => {
    const box = gridBox([-1, -1, -1], [1, 1, 1], 2);
    const caps = cut([tileOf("a", box, () => true)], {
      ...plane(0.3),
      limits: [{ point: [0.5, 0, 0], normal: [1, 0, 0] }],
    });
    expect(
      area(caps.triangles!.positions, caps.triangles!.indices),
    ).toBeCloseTo(1.5 * 2, 6);
  });

  it("tiles that do not quite meet join within their geometric error, and stay open without it", () => {
    const left = gridBox([-1, -1, -1], [0, 1, 1], 1);
    const right = gridBox([0.02, -1, -1], [1, 1, 1], 1);
    // Their facing walls removed, they are open; the gap between them is 0.02.
    const strip = (box: ReturnType<typeof gridBox>, face: number) =>
      tileOf("t", box, (c) => Math.abs(c[0] - face) > 1e-9);
    const open = [strip(left, 0), strip(right, 0.02)];
    const narrow = cut([
      { ...open[0]!, id: "l", geometricError: 1 },
      { ...open[1]!, id: "r", geometricError: 1 },
    ]);
    expect(narrow.report.snap).toBeCloseTo(0.01, 9);
    // The gap is wider than the snap: still open, and reported as a near miss.
    expect(narrow.report.openChains).toBe(2);
    expect(narrow.report.nearMisses).toBeGreaterThan(0);
    const wide = cut([
      { ...open[0]!, id: "l", geometricError: 4 },
      { ...open[1]!, id: "r", geometricError: 4 },
    ]);
    expect(wide.report.closedLoops).toBe(1);
    expect(wide.report.openChains).toBe(0);
  });

  it("an inside-out mesh is turned over, and says so", () => {
    const box = gridBox([-1, -1, -1], [1, 1, 1], 1, true);
    const caps = cut([tileOf("a", box, () => true)]);
    expect(caps.report.elements[0]!.flipped).toBe(true);
    expect(
      area(caps.triangles!.positions, caps.triangles!.indices),
    ).toBeCloseTo(4, 6);
  });

  it("a plane that misses makes nothing", () => {
    const box = gridBox([-1, -1, -1], [1, 1, 1], 1);
    const caps = cut([tileOf("a", box, () => true)], plane(5));
    expect(caps.triangles).toBeUndefined();
    expect(caps.lines).toBeUndefined();
    expect(caps.report.tilesCrossed).toBe(0);
  });

  it("a plane through the mesh's vertices still closes", () => {
    const box = gridBox([-1, -1, -1], [1, 1, 1], 2);
    const caps = cut([tileOf("a", box, () => true)], plane(0));
    expect(caps.report.closedLoops).toBe(1);
    expect(
      area(caps.triangles!.positions, caps.triangles!.indices),
    ).toBeCloseTo(4, 6);
  });
});

describe("triangulateRegion", () => {
  type P = [number, number];
  const polygonArea = (r: P[]) => {
    let s = 0;
    for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
      s += r[j]![0] * r[i]![1] - r[i]![0] * r[j]![1];
    }
    return s / 2;
  };
  const total = (t: { points: P[]; indices: number[] }) => {
    let a = 0;
    for (let i = 0; i < t.indices.length; i += 3) {
      a += polygonArea([
        t.points[t.indices[i]!]!,
        t.points[t.indices[i + 1]!]!,
        t.points[t.indices[i + 2]!]!,
      ]);
    }
    return a;
  };

  it("covers a concave L exactly", () => {
    const L: P[] = [
      [0, 0],
      [3, 0],
      [3, 1],
      [1, 1],
      [1, 3],
      [0, 3],
    ];
    const t = triangulateRegion(L, []);
    expect(t.indices).toHaveLength(12);
    expect(total(t)).toBeCloseTo(5, 12);
  });

  it("covers a square with two holes", () => {
    const outer: P[] = [
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
    ];
    const hole = (cx: number, cy: number, r: number): P[] =>
      [0, 1, 2, 3, 4, 5, 6, 7].map(
        (i) =>
          [
            cx + r * Math.cos(-i * (Math.PI / 4)),
            cy + r * Math.sin(-i * (Math.PI / 4)),
          ] as P,
      );
    const holes = [hole(3, 5, 1.5), hole(7, 5, 2)];
    const t = triangulateRegion(outer, holes);
    const expected =
      100 - Math.abs(polygonArea(holes[0]!)) - Math.abs(polygonArea(holes[1]!));
    expect(total(t)).toBeCloseTo(expected, 9);
  });

  it("covers a circle of a thousand points with a hole", () => {
    const ring = (r: number, n: number, sign: number): P[] =>
      Array.from({ length: n }, (_, i) => [
        r * Math.cos((sign * 2 * Math.PI * i) / n),
        r * Math.sin((sign * 2 * Math.PI * i) / n),
      ]);
    const t = triangulateRegion(ring(5, 1000, 1), [ring(2, 400, -1)]);
    expect(total(t)).toBeCloseTo(
      polygonArea(ring(5, 1000, 1)) + polygonArea(ring(2, 400, -1)),
      9,
    );
  });
});
