// The scale ladder's coarse-tile simplifier (scripts/designTiles/coarsen.mjs):
//  - its distance grid finds the nearest triangle, as brute force does;
//  - its sampled largest distance plus its spacing bounds the true one
//    (checked against a much denser brute-force sampling), and is no more
//    than that true one;
//  - a coarse tile of small boxes takes fewer triangles, keeps one for
//    every box, and states an error that covers its true deviation;
//  - welding keeps every triangle, by position.
import { describe, expect, it } from "vitest";
import {
  TriangleGrid,
  coarsen,
  largestDistance,
  trianglesOf,
  weld,
} from "../scripts/designTiles/coarsen.mjs";
import { MeshBuilder, random } from "../scripts/designTiles/meshBuilder.mjs";

type P = number[];

/** The distance from a point to a triangle: in its plane, or to an edge. */
function toTriangle(q: P, p: P): number {
  const a = p.slice(0, 3);
  const b = p.slice(3, 6);
  const c = p.slice(6, 9);
  const sub = (u: P, v: P) => u.map((x, k) => x - v[k]!);
  const dot = (u: P, v: P) => u.reduce((s, x, k) => s + x * v[k]!, 0);
  const cross = (u: P, v: P) => [
    u[1]! * v[2]! - u[2]! * v[1]!,
    u[2]! * v[0]! - u[0]! * v[2]!,
    u[0]! * v[1]! - u[1]! * v[0]!,
  ];
  const segment = (u: P, v: P) => {
    const d = sub(v, u);
    const t = Math.max(0, Math.min(1, dot(sub(q, u), d) / dot(d, d)));
    return Math.hypot(
      ...sub(
        q,
        u.map((x, k) => x + t * d[k]!),
      ),
    );
  };
  const n = cross(sub(b, a), sub(c, a));
  const nn = Math.hypot(...n);
  const h = dot(sub(q, a), n) / nn;
  const foot = q.map((x, k) => x - (h * n[k]!) / nn);
  const inside = [
    [a, b],
    [b, c],
    [c, a],
  ].every(([u, v]) => dot(cross(sub(v!, u!), sub(foot, u!)), n) >= 0);
  return inside
    ? Math.abs(h)
    : Math.min(segment(a, b), segment(b, c), segment(c, a));
}

/** A triangle's bounding box, kept. */
const boxes = new WeakMap<object, number[]>();
const boxOf = (t: { p: P }) => {
  let b = boxes.get(t);
  if (b === undefined) {
    const { p } = t;
    b = [0, 1, 2].flatMap((k) => [
      Math.min(p[k]!, p[3 + k]!, p[6 + k]!),
      Math.max(p[k]!, p[3 + k]!, p[6 + k]!),
    ]);
    boxes.set(t, b);
  }
  return b;
};

/** The nearest distance from q to a set, brute force (boxes skip the far). */
function nearest(q: P, set: { p: P }[]): number {
  let best = Infinity;
  for (const t of set) {
    const b = boxOf(t);
    const gap = Math.hypot(
      ...[0, 1, 2].map((k) =>
        Math.max(b[2 * k]! - q[k]!, 0, q[k]! - b[2 * k + 1]!),
      ),
    );
    if (gap < best) {
      best = Math.min(best, toTriangle(q, t.p));
    }
  }
  return best;
}

/** Dense samples of a triangle: a barycentric grid of n steps a side. */
function* dense(p: P, n: number) {
  for (let i = 0; i <= n; i++) {
    for (let j = 0; i + j <= n; j++) {
      const [u, v] = [i / n, j / n];
      yield [0, 1, 2].map(
        (k) => (1 - u - v) * p[k]! + u * p[3 + k]! + v * p[6 + k]!,
      );
    }
  }
}

/** Random triangles in a 100-unit cube, about `size` across. */
function soup(seed: number, count: number, size: number) {
  const rand = random(seed);
  return Array.from({ length: count }, () => {
    const o = [rand() * 100, rand() * 100, rand() * 20];
    return {
      p: Array.from({ length: 9 }, (_v, k) => o[k % 3]! + rand() * size),
    };
  });
}

describe("the coarse-tile simplifier", { timeout: 120_000 }, () => {
  it("finds the nearest triangle as brute force does", () => {
    const set = soup(1, 300, 12);
    const grid = new TriangleGrid(set, 7);
    const rand = random(2);
    for (let k = 0; k < 300; k++) {
      const q = [rand() * 120 - 10, rand() * 120 - 10, rand() * 40 - 10];
      expect(grid.distance(q[0]!, q[1]!, q[2]!)).toBeCloseTo(
        nearest(q, set),
        9,
      );
    }
  });

  it("bounds the largest distance between two sets to within its spacing", () => {
    for (const seed of [3, 4, 5]) {
      const from = soup(seed, 40, 15);
      const to = soup(seed + 100, 60, 10);
      const spacing = 2;
      const found = largestDistance(from, new TriangleGrid(to, 8), spacing);
      // Brute force, 4 times denser.
      let truth = 0;
      for (const { p } of from) {
        const n = Math.ceil(
          Math.max(
            Math.hypot(p[3]! - p[0]!, p[4]! - p[1]!, p[5]! - p[2]!),
            Math.hypot(p[6]! - p[3]!, p[7]! - p[4]!, p[8]! - p[5]!),
            Math.hypot(p[0]! - p[6]!, p[1]! - p[7]!, p[2]! - p[8]!),
          ) /
            (spacing / 4),
        );
        for (const q of dense(p, n)) {
          truth = Math.max(truth, nearest(q, to));
        }
      }
      // Each sample lies within the dense grid's own spacing of one of it.
      expect(found).toBeLessThanOrEqual(truth + spacing / 4);
      expect(truth).toBeLessThanOrEqual(found + spacing);
    }
  });

  it("draws a yard of small boxes lighter, a box where each stood, within its stated error", () => {
    const rand = random(7);
    const ground = { name: "Ground", kind: "ground" };
    const color = [0.5, 0.5, 0.5, 1] as [number, number, number, number];
    // Forty 2 × 3 m crates, 1 to 4 m high, with eight-sided drums on them.
    const parts = Array.from({ length: 40 }, (_v, k) => {
      const at = [10 + (k % 8) * 12 + rand(), 10 + Math.floor(k / 8) * 15];
      const h = 1 + 3 * rand();
      const feature = { name: `Crate ${k}`, kind: "crate" };
      return trianglesOf((b) => {
        const m = b as MeshBuilder;
        m.box(at as [number, number], 0, 2, 3, h, 0, color, feature);
        m.cylinder(at as [number, number], h, 1, 0.8, 8, color, feature);
      });
    });
    const floor = trianglesOf((b) =>
      (b as MeshBuilder).flat([55, 45], 0, 120, 100, 0, color, ground),
    );
    const cell = 6;
    const out = coarsen({
      pieces: parts.map((full) => ({
        part: full,
        full,
        lod: { error: 0 },
        hand: full,
      })),
      ground: floor,
      detail: () => false,
      cell,
      layer: 0.05,
    });
    const before = parts.reduce((sum, p) => sum + p.length, 0);
    expect(out.triangles.length).toBeLessThan(before / 2);
    // Every crate's region holds something standing.
    for (const full of parts) {
      const xs = full.flatMap((t) => [t.p[0]!, t.p[3]!, t.p[6]!]);
      const ys = full.flatMap((t) => [t.p[1]!, t.p[4]!, t.p[7]!]);
      const hit = out.triangles.some((t) =>
        [0, 3, 6].some(
          (k) =>
            t.p[k + 2]! > 0.5 &&
            t.p[k]! >= Math.min(...xs) - cell &&
            t.p[k]! <= Math.max(...xs) + cell &&
            t.p[k + 1]! >= Math.min(...ys) - cell &&
            t.p[k + 1]! <= Math.max(...ys) + cell,
        ),
      );
      expect(hit).toBe(true);
    }
    // The stated error covers the deviation both ways, densely sampled.
    const shown = [...out.triangles, ...floor];
    const detail = [...parts.flat(), ...floor];
    let worst = 0;
    for (const [from, to] of [
      [parts.flat(), shown],
      [out.triangles, detail],
    ] as const) {
      for (const { p } of from) {
        for (const q of dense(p, 3)) {
          worst = Math.max(worst, nearest(q, to));
        }
      }
    }
    expect(worst).toBeGreaterThan(0);
    expect(worst).toBeLessThanOrEqual(out.error);
    expect(out.error).toBeLessThan(2 * cell);
  });

  it("welds a mesh's repeated corners and keeps every triangle", () => {
    const b = new MeshBuilder(Infinity);
    const f = { name: "Box", kind: "box" };
    b.box([0, 0], 0, 4, 4, 4, 0.3, [1, 0, 0, 1], f);
    for (const t of trianglesOf((m) =>
      (m as MeshBuilder).box([9, 0], 0, 2, 2, 2, 0, [0, 1, 0, 1], f),
    )) {
      b.triangle(
        t.p.slice(0, 3) as [number, number, number],
        t.p.slice(3, 6) as [number, number, number],
        t.p.slice(6, 9) as [number, number, number],
        t.color,
        f,
      );
    }
    const mesh = b.build();
    const welded = weld(mesh);
    expect(welded.design.length).toBeLessThan(mesh.design.length);
    const corners = (m: typeof mesh) =>
      Array.from(m.indices, (i) =>
        Array.from(m.design.subarray(3 * i, 3 * i + 3)).join(","),
      );
    expect(corners(welded)).toEqual(corners(mesh));
  });
});
