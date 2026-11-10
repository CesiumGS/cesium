// The mesh adapter of the geometry query interface: ray hits, bounds and
// display (brep 3, Task 1). A unit square at z = 0 of two triangles, plain or
// placed by a translation of an Earth radius.
import { describe, expect, it } from "vitest";
import { meshGeometry } from "../src/geometry/mesh.ts";

const T = [6_378_137, 0, 0] as const;
const positions = Float32Array.from([0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0]);
const indices = Uint32Array.from([0, 1, 2, 0, 2, 3]);
const identity = Float64Array.from([
  1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1,
]);
const placed = Float64Array.from([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, ...T, 1]);

const down = { from: [0.75, 0.25, 1], to: [0.75, 0.25, -1] };
const up = { from: [0.75, 0.25, -1], to: [0.75, 0.25, 1] };

function near(a: ArrayLike<number>, b: ArrayLike<number>, tol = 1e-12): void {
  for (let i = 0; i < 3; i++) {
    expect(Math.abs(a[i]! - b[i]!)).toBeLessThanOrEqual(tol);
  }
}

describe("meshGeometry rays", () => {
  const g = meshGeometry({ positions, indices });

  it("reports its kind and version", () => {
    expect(g.kind).toBe("mesh");
    expect(g.version).toBe(0);
    expect(meshGeometry({ positions, indices }, { version: 4 }).version).toBe(
      4,
    );
  });

  it("hits the nearest face, with its normal turned to the ray's start", () => {
    const a = g.rayHit(down);
    expect(a.verdict).toBe("hit");
    if (a.verdict !== "hit") {
      return;
    }
    expect(a.hit.t).toBeCloseTo(0.5, 12);
    near(a.hit.position, [0.75, 0.25, 0]);
    near(a.hit.normal, [0, 0, 1]);
    expect(a.hit.entity).toEqual({ kind: "face", index: 0 });
    expect(a.hit.accuracy).toMatchObject({ meters: 0, exact: true });
  });

  it("turns the normal toward a ray from below", () => {
    const a = g.rayHit(up);
    expect(a.verdict).toBe("hit");
    if (a.verdict === "hit") {
      near(a.hit.normal, [0, 0, -1]);
    }
  });

  it("misses off the square, and outside the searched part", () => {
    expect(g.rayHit({ from: [2, 0.25, 1], to: [2, 0.25, -1] }).verdict).toBe(
      "miss",
    );
    expect(g.rayHit(down, { tMax: 0.4 }).verdict).toBe("miss");
    expect(g.rayHit(down, { tMin: 0.6 }).verdict).toBe("miss");
    expect(g.rayHit(down, { tMin: 0.4, tMax: 0.6 }).verdict).toBe("hit");
  });

  it("takes a hit's feature from its first corner", () => {
    const f = meshGeometry({
      positions,
      indices,
      featureIds: Uint32Array.from([5, 6, 7, 9]),
    });
    const a = f.rayHit({ from: [0.25, 0.75, 1], to: [0.25, 0.75, -1] });
    expect(a.verdict).toBe("hit");
    if (a.verdict === "hit") {
      expect(a.hit.entity.index).toBe(1);
      expect(a.hit.entity.feature).toBe(5);
    }
  });

  it("stays precise far from the origin when given one", () => {
    const p = meshGeometry({ positions, indices, matrix: placed });
    const ray = {
      from: [down.from[0]! + T[0], down.from[1]!, down.from[2]!],
      to: [down.to[0]! + T[0], down.to[1]!, down.to[2]!],
    };
    const a = p.rayHit(ray, { origin: T });
    expect(a.verdict).toBe("hit");
    if (a.verdict === "hit") {
      near(a.hit.position, [T[0] + 0.75, 0.25, 0], 1e-6);
      expect(Math.abs(a.hit.t - 0.5)).toBeLessThan(1e-9);
    }
  });

  it("ignores degenerate and out-of-range triangles", () => {
    const bad = meshGeometry({
      positions,
      indices: Uint32Array.from([0, 1, 2, 0, 2, 3, 0, 0, 1, 0, 1, 99]),
    });
    for (const r of [down, up]) {
      const x = g.rayHit(r);
      const y = bad.rayHit(r);
      expect(y).toEqual(x);
    }
    expect(bad.rayHit({ from: [2, 0, 1], to: [2, 0, -1] }).verdict).toBe(
      "miss",
    );
    const b = bad.bounds();
    expect(Array.from(b.min)).toEqual([0, 0, 0]);
    expect(Array.from(b.max)).toEqual([1, 1, 0]);
  });

  it("answers an any-hit query with a hit", () => {
    expect(g.rayHit(down, { anyHit: true }).verdict).toBe("hit");
    expect(
      g.rayHit({ from: [2, 0, 1], to: [2, 0, -1] }, { anyHit: true }).verdict,
    ).toBe("miss");
  });
});

describe("meshGeometry bounds and display", () => {
  it("bounds the placed vertices", () => {
    const b = meshGeometry({ positions, indices }).bounds();
    expect(Array.from(b.min)).toEqual([0, 0, 0]);
    expect(Array.from(b.max)).toEqual([1, 1, 0]);
    const p = meshGeometry({ positions, indices, matrix: placed }).bounds();
    expect(Array.from(p.min)).toEqual([...T]);
    expect(Array.from(p.max)).toEqual([T[0] + 1, 1, 0]);
  });

  it("displays the source's own arrays, with its error", () => {
    for (const error of [0, 0.25]) {
      const g = meshGeometry({ positions, indices }, { error });
      const d = g.display(0.1)!;
      expect(d.positions).toBe(positions);
      expect(d.indices).toBe(indices);
      expect(Array.from(d.matrix)).toEqual(Array.from(identity));
      expect(d.error).toBe(error);
    }
    const m = meshGeometry({ positions, indices, matrix: placed }).display(1)!;
    expect(m.matrix).toBe(placed);
  });

  it("states its accuracy", () => {
    const g = meshGeometry(
      { positions, indices },
      { error: 0.25, note: "lod 3" },
    );
    const a = g.rayHit(down);
    expect(a.verdict).toBe("hit");
    if (a.verdict === "hit") {
      expect(a.hit.accuracy).toEqual({
        meters: 0.25,
        exact: false,
        note: "lod 3",
      });
    }
    expect(g.bounds().accuracy.meters).toBe(0.25);
    expect(meshGeometry({ positions, indices }).bounds().accuracy.note).toBe(
      "the mesh as stored (float32 positions)",
    );
  });
});

describe("meshGeometry closest point, segment distance and topology", () => {
  const g = meshGeometry({ positions, indices });
  const bad = meshGeometry({
    positions,
    indices: Uint32Array.from([0, 1, 2, 0, 2, 3, 0, 0, 1, 0, 1, 99]),
  });

  for (const [name, m] of [
    ["clean", g],
    ["with malformed triangles", bad],
  ] as const) {
    describe(name, () => {
      it("finds a point inside a face", () => {
        const c = m.closestPoint([0.75, 0.25, 2])!;
        near(c.position, [0.75, 0.25, 0]);
        expect(c.distance).toBeCloseTo(2, 12);
        expect(c.entity).toMatchObject({ kind: "face", index: 0 });
        near(c.normal!, [0, 0, 1]);
        expect(c.accuracy).toMatchObject({ meters: 0, exact: true });
      });

      it("finds an edge and a vertex", () => {
        const e = m.closestPoint([2, 0.5, 0])!;
        expect(e.entity).toMatchObject({ kind: "edge", index: 1 });
        near(e.position, [1, 0.5, 0]);
        expect(e.distance).toBeCloseTo(1, 12);
        const v = m.closestPoint([2, -1, 0])!;
        expect(v.entity).toMatchObject({ kind: "vertex", index: 1 });
        near(v.position, [1, 0, 0]);
      });

      it("restricts the kinds, interior edges included", () => {
        const v = m.closestPoint([0.5, 0.5, 0.1], { kinds: ["vertex"] })!;
        expect(v.entity.kind).toBe("vertex");
        expect(v.distance).toBeCloseTo(Math.hypot(0.5, 0.5, 0.1), 12);
        const e = m.closestPoint([0.5, 0.5, 0.1], { kinds: ["edge"] })!;
        expect(e.entity.kind).toBe("edge");
        expect([2, 3]).toContain(e.entity.index);
        expect(e.distance).toBeCloseTo(0.1, 12);
      });

      it("answers undefined beyond maxDistance", () => {
        expect(
          m.closestPoint([0.5, 0.5, 2], { maxDistance: 1.5 }),
        ).toBeUndefined();
        expect(
          m.closestPoint([0.5, 0.5, 2], { maxDistance: 2.5 }),
        ).toBeDefined();
      });

      it("measures a segment's distance", () => {
        expect(m.segmentDistance([0, 0, 1], [1, 1, 1]).distance).toBeCloseTo(
          1,
          12,
        );
        expect(
          m.segmentDistance([0.5, 0.25, 1], [0.5, 0.25, -1]).distance,
        ).toBe(0);
      });

      it("lists an entity's points and faces", () => {
        const e = m.entity({ kind: "edge", index: 2 })!;
        expect(e.points).toHaveLength(2);
        near(e.points[0]!, [1, 1, 0]);
        near(e.points[1]!, [0, 0, 0]);
        expect(e.faces.map((f) => f.index)).toEqual([0, 1]);
        const v = m.entity({ kind: "vertex", index: 0 })!;
        expect(v.points).toHaveLength(1);
        expect(v.faces.map((f) => f.index)).toEqual([0, 1]);
        const f = m.entity({ kind: "face", index: 1 })!;
        expect(f.points).toHaveLength(3);
        expect(f.faces).toEqual([{ kind: "face", index: 1 }]);
        expect(m.entity({ kind: "face", index: 2 })).toBeUndefined();
        expect(m.entity({ kind: "face", index: 9 })).toBeUndefined();
        expect(m.entity({ kind: "edge", index: 60 })).toBeUndefined();
        expect(m.entity({ kind: "vertex", index: 4 })).toBeUndefined();
      });
    });
  }

  it("measures a placed segment's distance with an origin", () => {
    const p = meshGeometry({ positions, indices, matrix: placed });
    const off = (v: number[]) => [v[0]! + T[0], v[1]!, v[2]!];
    const o = { origin: T };
    expect(
      p.segmentDistance(off([0, 0, 1]), off([1, 1, 1]), o).distance,
    ).toBeCloseTo(1, 6);
    expect(
      p.segmentDistance(off([0.5, 0.25, 1]), off([0.5, 0.25, -1]), o).distance,
    ).toBeLessThan(1e-6);
    const c = p.closestPoint(off([0.75, 0.25, 2]), o)!;
    near(c.position, off([0.75, 0.25, 0]), 1e-6);
  });

  it("places a rotated and translated mesh, answering in the rotated frame", () => {
    // Rotates 90 degrees about z ((x, y) -> (-y, x)), then translates by T.
    const turned = Float64Array.from([
      0,
      1,
      0,
      0,
      -1,
      0,
      0,
      0,
      0,
      0,
      1,
      0,
      ...T,
      1,
    ]);
    const r = meshGeometry({ positions, indices, matrix: turned });
    const at = (v: number[]) => [v[0]! + T[0], v[1]!, v[2]!];
    const o = { origin: T };
    // Untranslated answer (0.75, 0.25, 0) turns to (-0.25, 0.75, 0).
    const a = r.rayHit(
      { from: at([-0.25, 0.75, 1]), to: at([-0.25, 0.75, -1]) },
      o,
    );
    expect(a.verdict).toBe("hit");
    if (a.verdict === "hit") {
      expect(a.hit.t).toBeCloseTo(0.5, 12);
      near(a.hit.position, at([-0.25, 0.75, 0]), 1e-6);
      near(a.hit.normal, [0, 0, 1]);
      expect(a.hit.entity).toMatchObject({ kind: "face", index: 0 });
    }
    // The point (0.75, 0.25, 2) turns to (-0.25, 0.75, 2).
    const c = r.closestPoint(at([-0.25, 0.75, 2]), o)!;
    near(c.position, at([-0.25, 0.75, 0]), 1e-6);
    expect(c.distance).toBeCloseTo(2, 6);
    expect(c.entity).toMatchObject({ kind: "face", index: 0 });
    near(c.normal!, [0, 0, 1], 1e-9);
  });

  it("answers the vertex when only edges and vertices are allowed", () => {
    const g2 = meshGeometry({ positions, indices });
    const v = g2.closestPoint([2, -1, 0], { kinds: ["edge", "vertex"] })!;
    expect(v.entity).toMatchObject({ kind: "vertex", index: 1 });
    near(v.position, [1, 0, 0]);
  });

  it("leaves the feature out when the ids are shorter than the vertices", () => {
    const f = meshGeometry({
      positions,
      indices,
      featureIds: Uint32Array.from([5, 6]),
    });
    const ref = f.entity({ kind: "vertex", index: 3 })!.ref;
    expect("feature" in ref).toBe(false);
    expect(f.entity({ kind: "face", index: 1 })!.ref.feature).toBe(5);
    expect(f.entity({ kind: "face", index: 0.5 })).toBeUndefined();
  });

  it("gives vertices and edges a feature when the mesh has one", () => {
    const f = meshGeometry({
      positions,
      indices,
      featureIds: Uint32Array.from([5, 6, 7, 9]),
    });
    expect(f.entity({ kind: "face", index: 1 })!.ref.feature).toBe(5);
  });
});
