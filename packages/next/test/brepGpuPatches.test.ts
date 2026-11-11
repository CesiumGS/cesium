// The b-rep form prepared for GPU dicing (src/brep/gpuPatches.ts): a record
// for every face, which faces need the trim test, and error constants that
// hold: a triangulated grid over a span is within C_u / n_u² + C_uv / (n_u n_v)
// + C_v / n_v² of the surface, for every kind, with analytic identities and
// for free-form patches with weights.
import { describe, expect, it } from "vitest";
import { BrepBuilder, type SurfaceIdentity } from "../src/brep/build.ts";
import { SurfaceKind, type BrepForm } from "../src/brep/form.ts";
import { evaluateNurbsSurface } from "../src/brep/nurbs.ts";
import {
  MAX_CELLS,
  NO_TRIM,
  SPAN,
  SPAN_WORDS,
  TRIM_PENDING,
  diceCounts,
  diceSpan,
  evaluateSpan,
  packGpuPatches,
  prepareGpuPatches,
  spanError,
  type GpuSpan,
} from "../src/brep/gpuPatches.ts";
import {
  boxBrep,
  highDegreeSurface,
  boxFace,
  cappedCylinderBrep,
  lineProfile,
  meridianProfile,
  nurbsCylinderBrep,
  revolvedSurface,
  spikeBSurface,
  trimmedNurbsBrep,
  turnAngles,
} from "./brepFixtures.ts";

type Vec = readonly [number, number, number];
type Distance = (p: Vec) => number;

const FRAME = {
  origin: [0, 0, 0] as const,
  x: [1, 0, 0] as const,
  y: [0, 1, 0] as const,
};
const ORIGIN = { origin: [0, 0, 0] } as const;

function identity(
  kind: SurfaceKind,
  params: [number, number],
): SurfaceIdentity {
  return { kind, ...FRAME, params };
}

/** A one-face form on an analytic surface or a NURBS one, over the (u, v) box. */
function oneFace(
  make: (b: BrepBuilder) => number,
  box: readonly [number, number, number, number],
): BrepForm {
  const b = new BrepBuilder();
  boxFace(b, make(b), box);
  return b.build();
}

/**
 * The largest distance from a span's triangles (a lattice of points in each)
 * to the surface: `distance` when the true surface is a closed form, else the
 * surface evaluated at the point's own (u, v).
 */
function worst(
  span: GpuSpan,
  nu: number,
  nv: number,
  distance: Distance | undefined,
): number {
  const grid = diceSpan(span, nu, nv);
  const at = (i: number) =>
    [
      grid.positions[i * 3]!,
      grid.positions[i * 3 + 1]!,
      grid.positions[i * 3 + 2]!,
    ] as const;
  const steps = 6;
  let largest = 0;
  for (let t = 0; t < grid.indices.length; t += 3) {
    const [a, b, c] = [
      grid.indices[t]!,
      grid.indices[t + 1]!,
      grid.indices[t + 2]!,
    ];
    for (let i = 0; i <= steps; i++) {
      for (let j = 0; i + j <= steps; j++) {
        const x = i / steps;
        const y = j / steps;
        const z = 1 - x - y;
        const p: Vec = [0, 1, 2].map(
          (k) => x * at(a)[k]! + y * at(b)[k]! + z * at(c)[k]!,
        ) as unknown as Vec;
        if (distance) {
          largest = Math.max(largest, distance(p));
        } else {
          const u =
            x * grid.parameters[a * 2]! +
            y * grid.parameters[b * 2]! +
            z * grid.parameters[c * 2]!;
          const v =
            x * grid.parameters[a * 2 + 1]! +
            y * grid.parameters[b * 2 + 1]! +
            z * grid.parameters[c * 2 + 1]!;
          const q = evaluateSpan(span, u, v).position;
          largest = Math.max(
            largest,
            Math.hypot(p[0] - q[0]!, p[1] - q[1]!, p[2] - q[2]!),
          );
        }
      }
    }
  }
  return largest;
}

const cylinder =
  (r: number): Distance =>
  (p) =>
    Math.abs(Math.hypot(p[0], p[1]) - r);
const sphere =
  (r: number): Distance =>
  (p) =>
    Math.abs(Math.hypot(p[0], p[1], p[2]) - r);
const cone =
  (r: number, a: number): Distance =>
  (p) =>
    Math.abs(Math.hypot(p[0], p[1]) - (r + p[2] * Math.tan(a))) /
    Math.hypot(1, Math.tan(a));
const torus =
  (major: number, minor: number): Distance =>
  (p) =>
    Math.abs(Math.hypot(Math.hypot(p[0], p[1]) - major, p[2]) - minor);

/** The error holds for each grid in the list, tightly for at least one. */
function holds(
  span: GpuSpan,
  distance: Distance | undefined,
  grids: readonly (readonly [number, number])[],
): number {
  let tightest = 0;
  for (const [nu, nv] of grids) {
    const stated = spanError(span, nu, nv);
    const measured = worst(span, nu, nv, distance);
    expect(measured).toBeLessThanOrEqual(stated * (1 + 1e-9) + 1e-12);
    if (stated > 0) {
      tightest = Math.max(tightest, measured / stated);
    }
  }
  return tightest;
}

const GRIDS = [
  [1, 1],
  [2, 3],
  [4, 4],
  [8, 2],
  [3, 9],
  [16, 16],
] as const;

describe("prepareGpuPatches: records", () => {
  it("makes one plane span per face of a box, drawn complete", () => {
    const p = prepareGpuPatches(boxBrep());
    expect(p.faces).toHaveLength(6);
    expect(p.spans).toHaveLength(6);
    p.faces.forEach((face, i) => {
      expect(face.supported).toBe(true);
      expect(face.needsTrim).toBe(false);
      expect(face.count).toBe(1);
      const span = p.spans[face.first]!;
      expect(span.face).toBe(i);
      expect(span.kind).toBe(SurfaceKind.Plane);
      expect(span.trim).toBe(NO_TRIM);
      // A plane's grid is exact.
      expect(span.c).toEqual([0, 0, 0]);
      expect(diceCounts(span, 1e-3)).toEqual({ nu: 1, nv: 1 });
    });
  });

  it("is relative to the origin: the box's center by default", () => {
    const p = prepareGpuPatches(boxBrep());
    expect([...p.origin]).toEqual([1, 1.5, 2]);
    const shifted = prepareGpuPatches(boxBrep(), { origin: [10, 0, 0] });
    const a = p.spans[0]!;
    const b = shifted.spans[0]!;
    expect(a.frame[0]! - b.frame[0]!).toBeCloseTo(9, 12);
    // The sphere moves with it.
    expect(a.sphere[0] - b.sphere[0]).toBeCloseTo(9, 12);
  });

  it("splits a cylinder's side at quarter turns, which need no trim test", () => {
    const p = prepareGpuPatches(cappedCylinderBrep(), ORIGIN);
    const [side, bottom, top] = p.faces;
    expect(side!.needsTrim).toBe(false);
    expect(side!.count).toBe(4);
    const spans = p.spans.slice(side!.first, side!.first + side!.count);
    expect(spans.every((s) => s.kind === SurfaceKind.Cylinder)).toBe(true);
    expect(spans[0]!.rect[0]).toBe(0);
    expect(spans[3]!.rect[1]).toBeCloseTo(2 * Math.PI, 12);
    // Neighbouring pieces share their edge exactly.
    for (let i = 1; i < 4; i++) {
      expect(spans[i]!.rect[0]).toBe(spans[i - 1]!.rect[1]);
    }
    // The caps are discs: planar faces with a circular trim.
    for (const cap of [bottom!, top!]) {
      expect(cap.needsTrim).toBe(true);
      expect(cap.rect).toEqual([-1, 1, -1, 1]);
      expect(p.spans[cap.first]!.trim).toBe(TRIM_PENDING);
    }
    expect(p.spans[side!.first]!.trim).toBe(NO_TRIM);
    expect(top!.reversed).toBe(false);
    expect(bottom!.reversed).toBe(true);
  });

  it("needs a trim test where a planar face has holes", () => {
    const b = new BrepBuilder();
    const v = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => b.vertex([i, 0, 0]));
    const edge = (i: number, j: number) => b.edge(v[i]!, v[j]!);
    const surface = b.plane([0, 0, 0], [1, 0, 0], [0, 1, 0]);
    const line = (
      e: number,
      from: readonly [number, number],
      to: readonly [number, number],
    ) => ({ edge: e, pcurve: [from, to] as const });
    b.face(
      surface,
      [
        // Outer: counter-clockwise. Inner: clockwise.
        [
          line(edge(0, 1), [0, 0], [4, 0]),
          line(edge(1, 2), [4, 0], [4, 3]),
          line(edge(2, 3), [4, 3], [0, 3]),
          line(edge(3, 0), [0, 3], [0, 0]),
        ],
        [
          line(edge(4, 5), [1, 1], [1, 2]),
          line(edge(5, 6), [1, 2], [2, 2]),
          line(edge(6, 7), [2, 2], [2, 1]),
          line(edge(7, 4), [2, 1], [1, 1]),
        ],
      ],
      { id: "plate" },
    );
    const p = prepareGpuPatches(b.build(), ORIGIN);
    expect(p.faces[0]!.needsTrim).toBe(true);
    expect(p.faces[0]!.rect).toEqual([0, 4, 0, 3]);
    expect(p.spans[0]!.trim).toBe(TRIM_PENDING);
    expect(p.spans[0]!.rect).toEqual([0, 4, 0, 3]);
  });

  it("covers a trimmed NURBS face's patches, and flags its hole", () => {
    const p = prepareGpuPatches(trimmedNurbsBrep(), ORIGIN);
    expect(p.faces[0]!.needsTrim).toBe(true);
    // A 6 × 6 net of degree 3 under knots with two interior spans: 3 × 3 patches.
    expect(p.faces[0]!.count).toBe(9);
    for (const span of p.spans) {
      expect(span.kind).toBe(SurfaceKind.Bezier);
      expect([span.degreeU, span.degreeV]).toEqual([3, 3]);
      expect(span.net.length).toBe(16 * 4);
      expect(span.trim).toBe(TRIM_PENDING);
    }
    // The spans tile the (u, v) square.
    const area = p.spans.reduce(
      (sum, s) => sum + (s.rect[1] - s.rect[0]) * (s.rect[3] - s.rect[2]),
      0,
    );
    expect(area).toBeCloseTo(1, 12);
  });

  it("keeps a NURBS cylinder's identity, and is complete as a rect", () => {
    const p = prepareGpuPatches(nurbsCylinderBrep(), ORIGIN);
    expect(p.faces[0]!.needsTrim).toBe(false);
    // Three arcs under uniform knots: three patches of degree 2 × 1.
    expect(p.faces[0]!.count).toBe(3);
    expect(p.spans[0]!.representationError).toBeCloseTo(2.5e-5, 9);
    expect([p.spans[0]!.degreeU, p.spans[0]!.degreeV]).toEqual([2, 1]);
  });
});

describe("patches of degree 4 to 7", () => {
  const DEGREES = [
    [4, 1],
    [1, 5],
    [4, 4],
    [5, 3],
    [3, 6],
    [7, 7],
  ] as const;

  it("are drawn by the GPU: one span a patch, its degrees and whole net in the records", () => {
    for (const [du, dv] of DEGREES) {
      const form = oneFace(
        (b) => b.nurbsSurface(highDegreeSurface(du, dv, { spansU: 2 })),
        [0, 1, 0, 1],
      );
      const p = prepareGpuPatches(form, ORIGIN);
      expect(p.faces[0]!.supported).toBe(true);
      expect(p.spans).toHaveLength(2);
      const data = packGpuPatches(p);
      const points = (du + 1) * (dv + 1);
      expect(data.words.length).toBe(2 * SPAN_WORDS + 2 * points * 4);
      p.spans.forEach((span, i) => {
        expect([span.degreeU, span.degreeV]).toEqual([du, dv]);
        expect(span.net.length).toBe(points * 4);
        const o = i * SPAN_WORDS;
        expect(data.words[o + SPAN.degrees]).toBe(du | (dv << 8));
        const at = data.words[o + SPAN.controls]!;
        for (let k = 0; k < points * 4; k++) {
          expect(data.f32[at + k]).toBeCloseTo(span.net[k]!, 5);
        }
      });
    }
  });

  it("have the surface's points and normals in the CPU twin, weights or not", () => {
    for (const weighted of [false, true]) {
      for (const [du, dv] of DEGREES) {
        const surface = highDegreeSurface(du, dv, {
          spansU: 2,
          spansV: 2,
          weighted,
        });
        const form = oneFace((b) => b.nurbsSurface(surface), [0.1, 0.9, 0, 1]);
        const p = prepareGpuPatches(form, ORIGIN);
        expect(p.spans).toHaveLength(4);
        const normalAt = (u: number, v: number): number[] => {
          const h = 1e-6;
          const at = (x: number, y: number) =>
            evaluateNurbsSurface(surface, x, y);
          const a = at(u + h, v);
          const b = at(u - h, v);
          const c = at(u, v + h);
          const d = at(u, v - h);
          const du3 = [0, 1, 2].map((k) => a[k]! - b[k]!);
          const dv3 = [0, 1, 2].map((k) => c[k]! - d[k]!);
          const n = [
            du3[1]! * dv3[2]! - du3[2]! * dv3[1]!,
            du3[2]! * dv3[0]! - du3[0]! * dv3[2]!,
            du3[0]! * dv3[1]! - du3[1]! * dv3[0]!,
          ];
          const length = Math.hypot(...n);
          return n.map((x) => x / length);
        };
        for (const span of p.spans) {
          const grid = diceSpan(span, 5, 4);
          for (let k = 0; k < grid.parameters.length / 2; k++) {
            const u = grid.parameters[k * 2]!;
            const v = grid.parameters[k * 2 + 1]!;
            // Inside the patch, where the finite differences stay in range.
            const inside = (x: number, lo: number, hi: number) =>
              Math.min(Math.max(x, lo + 1e-5), hi - 1e-5);
            const direct = evaluateNurbsSurface(surface, u, v);
            for (let c = 0; c < 3; c++) {
              expect(grid.positions[k * 3 + c]!).toBeCloseTo(direct[c]!, 9);
            }
            const n = normalAt(
              inside(u, span.domain[0], span.domain[1]),
              inside(v, span.domain[2], span.domain[3]),
            );
            for (let c = 0; c < 3; c++) {
              expect(grid.normals[k * 3 + c]!).toBeCloseTo(n[c]!, 3);
            }
          }
        }
      }
    }
  });

  it("have error constants that hold under dense sampling, tightly for at least one grid", () => {
    const grids = [...GRIDS, [32, 32], [7, 40]] as const;
    for (const [du, dv] of DEGREES) {
      const form = oneFace(
        (b) => b.nurbsSurface(highDegreeSurface(du, dv)),
        [0, 1, 0, 1],
      );
      const [span] = prepareGpuPatches(form, ORIGIN).spans;
      expect(span!.c.some((c) => c > 0)).toBe(true);
      expect(holds(span!, undefined, grids)).toBeGreaterThan(0.01);
    }
  });

  it("have error constants that hold for part of a patch, and put the same cells on shared boundaries", () => {
    const form = oneFace(
      (b) => b.nurbsSurface(highDegreeSurface(5, 4, { spansU: 2, spansV: 2 })),
      [0.2, 0.8, 0.1, 0.7],
    );
    const p = prepareGpuPatches(form, ORIGIN);
    expect(p.spans).toHaveLength(4);
    for (const span of p.spans) {
      holds(span, undefined, GRIDS);
    }
    const counts = p.spans.map((s) => diceCounts(s, 0.01));
    expect(counts[0]!.nu).toBe(counts[2]!.nu);
    expect(counts[1]!.nu).toBe(counts[3]!.nu);
    expect(counts[0]!.nv).toBe(counts[1]!.nv);
    expect(counts[2]!.nv).toBe(counts[3]!.nv);
  });
});

describe("packGpuPatches", () => {
  it("writes the records, then each control net once, then the trim data", () => {
    const p = prepareGpuPatches(trimmedNurbsBrep(), ORIGIN);
    const data = packGpuPatches(p);
    const trim = p.faces[0]!.trim!;
    expect(data.spanCount).toBe(9);
    expect(data.trimmed).toBe(true);
    expect(data.words.length).toBe(
      9 * SPAN_WORDS + 9 * 16 * 4 + trim.words.length,
    );
    const o = 4 * SPAN_WORDS;
    const span = p.spans[4]!;
    expect(data.words[o + SPAN.kind]! & 0xff).toBe(SurfaceKind.Bezier);
    expect(data.words[o + SPAN.degrees]).toBe(3 | (3 << 8));
    // The trim word was pending: it is the data's offset, after the control nets.
    expect(span.trim).toBe(TRIM_PENDING);
    expect(data.words[o + SPAN.trim]).toBe(9 * SPAN_WORDS + 9 * 16 * 4);
    expect(data.spans[4]!.trim).toBe(data.words[o + SPAN.trim]);
    expect(data.f32[o + SPAN.rect]).toBeCloseTo(span.rect[0], 6);
    expect(data.f32[o + SPAN.density + 2]).toBeCloseTo(span.density[2], 3);
    const at = data.words[o + SPAN.controls]!;
    expect(at).toBeGreaterThanOrEqual(9 * SPAN_WORDS);
    expect(data.f32[at + 3]).toBeCloseTo(span.net[3]!, 6);
  });

  it("keeps only the faces asked for, and their controls", () => {
    const p = prepareGpuPatches(cappedCylinderBrep(), ORIGIN);
    const data = packGpuPatches(p, (face) => !face.needsTrim);
    expect(data.spanCount).toBe(4);
    expect(data.words.length).toBe(4 * SPAN_WORDS);
    // The face index is the form's.
    expect(data.words[SPAN.face]).toBe(0);
    expect(data.sphere[3]).toBeGreaterThan(0);
  });
});

describe("the error constants hold", () => {
  it("for a cylinder, tightly", () => {
    const form = oneFace(
      (b) => b.cylinder([0, 0, 0], [1, 0, 0], [0, 1, 0], 2),
      [0.3, 1.5, -1, 2],
    );
    const span = prepareGpuPatches(form, ORIGIN).spans[0]!;
    expect(holds(span, cylinder(2), GRIDS)).toBeGreaterThan(0.85);
  });

  it("for a cone, with the radius growing along v", () => {
    const a = 0.3;
    const form = oneFace(
      (b) => b.cone([0, 0, 0], [1, 0, 0], [0, 1, 0], 1, a),
      [0, 1.4, -0.5, 2],
    );
    const span = prepareGpuPatches(form, ORIGIN).spans[0]!;
    holds(span, cone(1, a), GRIDS);
  });

  it("for a sphere across the equator and beyond a pole's latitude", () => {
    for (const box of [
      [0, 1.2, -0.6, 0.9],
      [0.5, 2, 0.2, Math.PI / 2],
      [0, 1, 1.2, 2],
    ] as const) {
      const form = oneFace(
        (b) => b.sphere([0, 0, 0], [1, 0, 0], [0, 1, 0], 1.5),
        box,
      );
      const p = prepareGpuPatches(form, ORIGIN);
      for (const span of p.spans) {
        holds(span, sphere(1.5), GRIDS);
      }
    }
  });

  it("for a torus", () => {
    const form = oneFace(
      (b) => b.torus([0, 0, 0], [1, 0, 0], [0, 1, 0], 3, 0.8),
      [0, 1.5, -1, 2.5],
    );
    const p = prepareGpuPatches(form, ORIGIN);
    expect(p.spans.length).toBe(1 * 3);
    for (const span of p.spans) {
      holds(span, torus(3, 0.8), GRIDS);
    }
  });

  it("for a rational NURBS cylinder, from its identity", () => {
    const r = 0.5;
    const surface = revolvedSurface(
      turnAngles([3, 5, 4]),
      lineProfile(r, r, 2),
    );
    const form = oneFace(
      (b) =>
        b.nurbsSurface(surface, {
          identity: identity(SurfaceKind.Cylinder, [r, 0]),
        }),
      [0, 1, 0, 1],
    );
    const p = prepareGpuPatches(form, ORIGIN);
    expect(p.spans).toHaveLength(3);
    for (const span of p.spans) {
      holds(span, cylinder(r), GRIDS);
    }
  });

  it("for a rational NURBS sphere across a pole's degenerate row", () => {
    const r = 1.5;
    const lat = [-Math.PI / 2, -Math.PI / 6, Math.PI / 3, Math.PI / 2];
    const surface = revolvedSurface(
      turnAngles([2, 1, 3, 2]),
      meridianProfile(r, lat),
    );
    const form = oneFace(
      (b) =>
        b.nurbsSurface(surface, {
          identity: identity(SurfaceKind.Sphere, [r, 0]),
        }),
      [0, 1, 0, 1],
    );
    const p = prepareGpuPatches(form, ORIGIN);
    expect(p.spans).toHaveLength(12);
    for (const span of p.spans) {
      holds(span, sphere(r), GRIDS);
    }
    // The normal at a pole is defined, and outward.
    const pole = p.spans.find((s) => s.rect[3] === 1 && s.rect[2] > 0.5)!;
    const n = evaluateSpan(pole, pole.rect[0], pole.rect[3]).normal;
    expect(Math.hypot(...n)).toBeCloseTo(1, 9);
    expect(n[2]).toBeGreaterThan(0.9);
  });

  it("for a free-form patch whose weights are not 1", () => {
    for (const weight of [2, 5]) {
      const form = oneFace(
        (b) =>
          b.nurbsSurface(
            spikeBSurface((i, j) => (i === 2 && j === 3 ? weight : 1)),
          ),
        [0, 1, 0, 1],
      );
      const p = prepareGpuPatches(form, ORIGIN);
      expect(p.spans).toHaveLength(9);
      for (const span of p.spans) {
        holds(span, undefined, GRIDS);
      }
    }
  });

  it("when the rect is part of a patch", () => {
    const form = oneFace(
      (b) => b.nurbsSurface(spikeBSurface()),
      [0.1, 0.5, 0.2, 0.45],
    );
    const p = prepareGpuPatches(form, ORIGIN);
    expect(p.spans.length).toBe(2 * 2);
    for (const span of p.spans) {
      holds(span, undefined, GRIDS);
    }
  });
});

describe("the counts a face's spans take", () => {
  const form = oneFace((b) => b.nurbsSurface(spikeBSurface()), [0, 1, 0, 1]);
  const p = prepareGpuPatches(form, ORIGIN);

  it("keep the error within the target, from the face's densities", () => {
    for (const error of [0.5, 0.05, 0.005]) {
      for (const span of p.spans) {
        const { nu, nv } = diceCounts(span, error);
        if (nu < MAX_CELLS && nv < MAX_CELLS) {
          expect(spanError(span, nu, nv)).toBeLessThanOrEqual(error);
        }
      }
    }
  });

  it("put the same cells on a boundary two spans share, so they don't crack", () => {
    const counts = p.spans.map((s) => diceCounts(s, 0.01));
    // Spans run u fastest: one row (same v range) has one nv, one column one nu.
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        expect(counts[row * 3 + col]!.nv).toBe(counts[row * 3]!.nv);
        expect(counts[row * 3 + col]!.nu).toBe(counts[col]!.nu);
      }
    }
    expect(counts[0]!.nu).toBeGreaterThan(1);
  });

  it("share the target among the error's terms that aren't zero, and keep it when one is", () => {
    const rect = [0, 1, 0, 1] as const;
    for (const density of [
      [1, 0, 0],
      [0, 0, 1],
      [1, 2, 0],
      [0, 3, 0],
      [0.5, 1, 4],
    ] as const) {
      const span = { density, speed: [0, 0] as const, rect, c: density };
      const { nu, nv } = diceCounts(span, 0.05);
      expect(spanError(span, nu, nv)).toBeLessThanOrEqual(0.05);
    }
    // A cylinder's one term gets the whole target: the cells are the least.
    const one = { density: [1, 0, 0] as const, speed: [0, 0] as const, rect };
    expect(diceCounts(one, 0.01).nu).toBe(10);
  });

  it("grow as the target shrinks, are bounded, and grow under a placement's curvature", () => {
    const span = p.spans[4]!;
    const a = diceCounts(span, 0.1);
    const b = diceCounts(span, 0.01);
    expect(b.nu).toBeGreaterThan(a.nu);
    expect(diceCounts(span, 1e-12)).toEqual({ nu: MAX_CELLS, nv: MAX_CELLS });
    expect(diceCounts(span, 0.1, 1, 1e-2).nu).toBeGreaterThan(a.nu);
    expect(diceCounts(span, 0.1, 2).nu).toBeGreaterThan(a.nu);
  });
});

describe("diceSpan", () => {
  it("winds counter-clockwise in (u, v), clockwise when the face is reversed", () => {
    const winding = (reversed: boolean) => {
      const b = new BrepBuilder();
      const surface = b.plane([0, 0, 0], [1, 0, 0], [0, 1, 0]);
      const v = [0, 1, 2, 3].map((i) => b.vertex([i, 0, 0]));
      const e = [0, 1, 2, 3].map((i) => b.edge(v[i]!, v[(i + 1) % 4]!));
      const corners = [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
      ] as const;
      b.face(
        surface,
        [
          e.map((edge, i) => ({
            edge,
            pcurve: [corners[i]!, corners[(i + 1) % 4]!] as const,
          })),
        ],
        { reversed },
      );
      const span = prepareGpuPatches(b.build(), ORIGIN).spans[0]!;
      const grid = diceSpan(span, 2, 2);
      const i = grid.indices;
      const p = grid.positions;
      const area =
        (p[i[1]! * 3]! - p[i[0]! * 3]!) *
          (p[i[2]! * 3 + 1]! - p[i[0]! * 3 + 1]!) -
        (p[i[1]! * 3 + 1]! - p[i[0]! * 3 + 1]!) *
          (p[i[2]! * 3]! - p[i[0]! * 3]!);
      return { area, nz: grid.normals[2]! };
    };
    expect(winding(false).area).toBeGreaterThan(0);
    expect(winding(false).nz).toBe(1);
    expect(winding(true).area).toBeLessThan(0);
    expect(winding(true).nz).toBe(-1);
  });

  it("gives the exact surface's points and the normal ∂u × ∂v", () => {
    const form = oneFace(
      (b) => b.sphere([0, 0, 0], [1, 0, 0], [0, 1, 0], 2),
      [0.2, 1.2, -0.3, 0.8],
    );
    const span = prepareGpuPatches(form, ORIGIN).spans[0]!;
    const grid = diceSpan(span, 4, 3);
    for (let k = 0; k < 5 * 4; k++) {
      const pos = [...grid.positions.subarray(k * 3, k * 3 + 3)];
      const n = [...grid.normals.subarray(k * 3, k * 3 + 3)];
      expect(Math.hypot(...pos)).toBeCloseTo(2, 12);
      for (let c = 0; c < 3; c++) {
        expect(n[c]!).toBeCloseTo(pos[c]! / 2, 12);
      }
    }
    // The UV varying is relative to the face rect's corner.
    expect(grid.uvs[0]).toBeCloseTo(0, 15);
    expect(grid.uvs[(5 * 4 - 1) * 2]).toBeCloseTo(1, 12);
  });
});
