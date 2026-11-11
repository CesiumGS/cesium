// A face's trim as the fragment stage reads it (src/brep/gpuTrims.ts): the
// winding test, on the packed words, agrees with the loops' classification
// everywhere but within the approximation's tolerance of the boundary, for a
// plate with holes, a cylinder cross-drilled by another, a curved trim on a
// free-form face, and loops that touch the seam; the dilation keeps what is
// within the reach of the boundary and nothing farther than it allows.
import { describe, expect, it } from "vitest";
import { BrepBuilder } from "../src/brep/build.ts";
import { evaluateCurve2 } from "../src/brep/evaluate.ts";
import type { BrepForm } from "../src/brep/form.ts";
import {
  NO_TRIM,
  SPAN,
  SPAN_WORDS,
  packGpuPatches,
  prepareGpuPatches,
  type GpuFace,
} from "../src/brep/gpuPatches.ts";
import {
  MAX_TRIM_BANDS,
  TRIM_BAND_WORDS,
  TRIM_HEADER_WORDS,
  trimCovers,
  trimCrossings,
  trimTolerance,
} from "../src/brep/gpuTrims.ts";
import type { NurbsCurve } from "../src/brep/nurbs.ts";
import { faceTrim } from "../src/brep/tessellate.ts";
import {
  boxBrep,
  cappedCylinderBrep,
  trimmedNurbsBrep,
} from "./brepFixtures.ts";

type Box = readonly [number, number, number, number];
type Pair = readonly [number, number];

/** A rational quadratic circle in (u, v), counter-clockwise or clockwise. */
function circle(
  cx: number,
  cy: number,
  r: number,
  clockwise: boolean,
): NurbsCurve {
  const s = Math.SQRT1_2;
  const ring = [
    [1, 0, 1],
    [1, 1, s],
    [0, 1, 1],
    [-1, 1, s],
    [-1, 0, 1],
    [-1, -1, s],
    [0, -1, 1],
    [1, -1, s],
    [1, 0, 1],
  ];
  const sign = clockwise ? -1 : 1;
  const points = new Float64Array(18);
  ring.forEach(([x, y], i) => {
    points.set([cx + r * x!, cy + sign * r * y!], i * 2);
  });
  return {
    degree: 2,
    knots: Float64Array.from([
      0, 0, 0, 0.25, 0.25, 0.5, 0.5, 0.75, 0.75, 1, 1, 1,
    ]),
    count: 9,
    dimension: 2,
    points,
    weights: Float64Array.from(ring.map((p) => p[2]!)),
  };
}

/** A closed curve through f(0..1) as `pieces` cubic Béziers from Hermite ends (f's derivative by differences). */
function cubicLoop(f: (t: number) => Pair, pieces: number): NurbsCurve {
  const d = (t: number): Pair => {
    const h = 1e-6;
    const a = f(t + h);
    const b = f(t - h);
    return [(a[0] - b[0]) / (2 * h), (a[1] - b[1]) / (2 * h)];
  };
  const points: number[] = [];
  for (let k = 0; k < pieces; k++) {
    const t0 = k / pieces;
    const t1 = (k + 1) / pieces;
    const p0 = f(t0);
    const p3 = f(t1);
    const d0 = d(t0);
    const d1 = d(t1);
    const w = 1 / pieces / 3;
    if (k === 0) {
      points.push(p0[0], p0[1]);
    }
    points.push(
      p0[0] + d0[0] * w,
      p0[1] + d0[1] * w,
      p3[0] - d1[0] * w,
      p3[1] - d1[1] * w,
      p3[0],
      p3[1],
    );
  }
  const knots = [0, 0, 0, 0];
  for (let k = 1; k < pieces; k++) {
    knots.push(k, k, k);
  }
  knots.push(pieces, pieces, pieces, pieces);
  return {
    degree: 3,
    knots: Float64Array.from(knots),
    count: pieces * 3 + 1,
    dimension: 2,
    points: Float64Array.from(points),
  };
}

/** The shoelace area of f sampled around 0..1: positive counter-clockwise. */
function area(f: (t: number) => Pair): number {
  let twice = 0;
  const n = 400;
  for (let k = 0; k < n; k++) {
    const a = f(k / n);
    const b = f((k + 1) / n);
    twice += a[0] * b[1] - b[0] * a[1];
  }
  return twice / 2;
}

/** A loop that runs clockwise, whichever way f runs. */
function clockwise(f: (t: number) => Pair, pieces: number): NurbsCurve {
  return area(f) > 0
    ? cubicLoop((t) => f(1 - t), pieces)
    : cubicLoop(f, pieces);
}

type Use = Parameters<BrepBuilder["face"]>[1][number][number];

/** The uses of a polygon of straight (u, v) lines, one use each. */
function polygon(edge: number, corners: readonly Pair[]): Use[] {
  return corners.map((a, i) => ({
    edge,
    pcurve: [a, corners[(i + 1) % corners.length]!] as const,
  }));
}

function oneEdge(b: BrepBuilder, tolerance = 1e-6): number {
  const v = b.vertex([0, 0, 0]);
  return b.edge(v, v, { tolerance });
}

const TAU = 2 * Math.PI;

/** A 10 × 6 m plate: a round hole, a rectangular one and a triangular one. */
function plate(): BrepForm {
  const b = new BrepBuilder();
  const e = oneEdge(b);
  const s = b.plane([0, 0, 0], [1, 0, 0], [0, 1, 0]);
  b.face(s, [
    polygon(e, [
      [0, 0],
      [10, 0],
      [10, 6],
      [0, 6],
    ]),
    [{ edge: e, pcurve: circle(2.5, 3, 1.5, true) }],
    polygon(e, [
      [6, 1.5],
      [6, 4.5],
      [8.5, 4.5],
      [8.5, 1.5],
    ]),
    polygon(e, [
      [4.5, 0.5],
      [5.2, 2.2],
      [5.9, 0.5],
    ]),
  ]);
  return b.build();
}

/** A cylinder (R = 1, 3 m tall) drilled by a 0.4 m cylinder along y at mid height: two holes, whose curves are saddle-shaped in (u, v). */
function drilled(): BrepForm {
  const R = 1;
  const r = 0.4;
  const h = 3;
  const b = new BrepBuilder();
  const e = oneEdge(b);
  const s = b.cylinder([0, 0, 0], [1, 0, 0], [0, 1, 0], R);
  const first = (t: number): Pair => {
    const phi = TAU * t;
    return [Math.acos((r * Math.cos(phi)) / R), h / 2 + r * Math.sin(phi)];
  };
  const second = (t: number): Pair => {
    const [u, v] = first(t);
    return [TAU - u, v];
  };
  b.face(s, [
    polygon(e, [
      [0, 0],
      [TAU, 0],
      [TAU, h],
      [0, h],
    ]),
    [{ edge: e, pcurve: clockwise(first, 3) }],
    [{ edge: e, pcurve: clockwise(second, 5) }],
  ]);
  return b.build();
}

/** A cylinder face whose outer loop has a half-ellipse notch in its seam edge (u = 2π), and a round hole that touches the other seam (u = 0). */
function seamed(): BrepForm {
  const b = new BrepBuilder();
  const e = oneEdge(b);
  const s = b.cylinder([0, 0, 0], [1, 0, 0], [0, 1, 0], 1);
  const notch = cubicLoop(
    (t) => [TAU - 0.5 * Math.sin(Math.PI * t), 0.8 + 1.4 * t],
    2,
  );
  b.face(s, [
    [
      {
        edge: e,
        pcurve: [
          [0, 0],
          [TAU, 0],
        ] as const,
      },
      {
        edge: e,
        pcurve: [
          [TAU, 0],
          [TAU, 0.8],
        ] as const,
      },
      { edge: e, pcurve: notch },
      {
        edge: e,
        pcurve: [
          [TAU, 2.2],
          [TAU, 3],
        ] as const,
      },
      {
        edge: e,
        pcurve: [
          [TAU, 3],
          [0, 3],
        ] as const,
      },
      {
        edge: e,
        pcurve: [
          [0, 3],
          [0, 0],
        ] as const,
      },
    ],
    [{ edge: e, pcurve: circle(0.6, 1.5, 0.6, true) }],
  ]);
  return b.build();
}

/** The first trimmed face of a form. */
function firstTrimmed(form: BrepForm): { face: GpuFace; index: number } {
  const first = trimmedFaces(form)[0];
  if (!first) {
    throw new Error("no trimmed face");
  }
  return first;
}

/** The trimmed faces of a form, prepared. */
function trimmedFaces(form: BrepForm): { face: GpuFace; index: number }[] {
  const patches = prepareGpuPatches(form);
  return patches.faces
    .map((face, index) => ({ face, index }))
    .filter(({ face }) => face.needsTrim && face.supported);
}

// A reference: the true curves sampled densely, with an even-odd crossing count and the distance to the samples' polyline.
function boundary(form: BrepForm, face: number): Pair[][] {
  const first = form.faceLoops[face * 2]!;
  const loops: Pair[][] = [];
  for (let loop = first; loop < first + form.faceLoops[face * 2 + 1]!; loop++) {
    const points: Pair[] = [];
    const firstUse = form.loopUses[loop * 2]!;
    for (
      let use = firstUse;
      use < firstUse + form.loopUses[loop * 2 + 1]!;
      use++
    ) {
      const f = form.usePcurve[use * 2]!;
      for (let seg = f; seg < f + form.usePcurve[use * 2 + 1]!; seg++) {
        for (let k = 0; k < 400; k++) {
          const p = evaluateCurve2(form, seg, k / 400).position;
          points.push([p[0]!, p[1]!]);
        }
      }
    }
    loops.push(points);
  }
  return loops;
}

function dense(loops: readonly Pair[][], u: number, v: number): boolean {
  let inside = false;
  for (const polygonPoints of loops) {
    for (
      let i = 0, j = polygonPoints.length - 1;
      i < polygonPoints.length;
      j = i++
    ) {
      const [xi, yi] = polygonPoints[i]!;
      const [xj, yj] = polygonPoints[j]!;
      if (yi > v !== yj > v && u < ((xj - xi) * (v - yi)) / (yj - yi) + xi) {
        inside = !inside;
      }
    }
  }
  return inside;
}

function distance(loops: readonly Pair[][], u: number, v: number): number {
  let best = Infinity;
  for (const points of loops) {
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const [ax, ay] = points[j]!;
      const [bx, by] = points[i]!;
      const dx = bx - ax;
      const dy = by - ay;
      const l2 = dx * dx + dy * dy;
      const t =
        l2 > 0
          ? Math.min(1, Math.max(0, ((u - ax) * dx + (v - ay) * dy) / l2))
          : 0;
      best = Math.min(best, Math.hypot(u - ax - t * dx, v - ay - t * dy));
    }
  }
  return best;
}

/** A deterministic stream in [0, 1). */
function random(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const CASES: { name: string; form: () => BrepForm }[] = [
  { name: "a plate with round, rectangular and triangular holes", form: plate },
  { name: "a cylinder drilled across", form: drilled },
  {
    name: "a trimmed free-form face (a circular hole)",
    form: trimmedNurbsBrep,
  },
  { name: "loops that touch the seam", form: seamed },
];

describe.each(CASES)("the trim of $name", ({ form: make }) => {
  const form = make();
  const faces = trimmedFaces(form);
  const patches = prepareGpuPatches(form);
  const data = packGpuPatches(patches);

  it("is a face that needs the test, with data", () => {
    expect(faces.length).toBeGreaterThan(0);
    for (const { face } of faces) {
      expect(face.trim).toBeDefined();
      expect(face.trim!.pieces).toBeGreaterThan(0);
      expect(face.trim!.bands).toBeLessThanOrEqual(MAX_TRIM_BANDS);
      expect(face.trim!.error).toBeLessThanOrEqual(
        face.trim!.tolerance * 1.0001,
      );
    }
  });

  it("is written where the records point, after the spans and control points", () => {
    for (const { face, index } of faces) {
      const spans = data.spans.filter((s) => s.face === index);
      const at = spans[0]!.trim;
      expect(at).toBeGreaterThanOrEqual(data.spanCount * SPAN_WORDS);
      expect(at + face.trim!.words.length).toBeLessThanOrEqual(
        data.words.length,
      );
      for (const s of spans) {
        expect(s.trim).toBe(at);
        expect(data.words[data.spans.indexOf(s) * SPAN_WORDS + SPAN.trim]).toBe(
          at,
        );
      }
      expect(
        Array.from(data.words.subarray(at, at + face.trim!.words.length)),
      ).toEqual(Array.from(face.trim!.words));
    }
  });

  it("classifies samples as the loops do, away from the boundary", () => {
    const rand = random(7);
    for (const { face, index } of faces) {
      const rect = face.rect as Box;
      const extent = Math.max(rect[1] - rect[0], rect[3] - rect[2]);
      const loops = boundary(form, index);
      const cpu = faceTrim(form, index)!;
      const at = data.spans.find((s) => s.face === index)!.trim;
      const tolerance = face.trim!.tolerance;
      let checked = 0;
      let inside = 0;
      for (let k = 0; k < 6000; k++) {
        const u = rect[0] + rand() * (rect[1] - rect[0]);
        const v = rect[2] + rand() * (rect[3] - rect[2]);
        const d = distance(loops, u, v);
        const here =
          trimCrossings(data.words, at, u - rect[0], v - rect[2], 0).winding !==
          0;
        if (d > 4 * tolerance + 1e-6 * extent) {
          expect(here, `dense (${u}, ${v}), ${d}`).toBe(dense(loops, u, v));
          checked++;
          inside += Number(here);
        }
        if (d > 5e-3 * extent) {
          expect(here, `faceTrim (${u}, ${v})`).toBe(cpu.contains(u, v));
        }
      }
      expect(checked).toBeGreaterThan(4000);
      // Both sides of the trim were sampled.
      expect(inside).toBeGreaterThan(100);
      expect(checked - inside).toBeGreaterThan(100);
    }
  });

  it("dilates by the reach: inside stays, what is near is kept, what is far is dropped", () => {
    const rand = random(11);
    for (const { face, index } of faces) {
      const rect = face.rect as Box;
      const extent = Math.max(rect[1] - rect[0], rect[3] - rect[2]);
      const loops = boundary(form, index);
      const at = data.spans.find((s) => s.face === index)!.trim;
      const reach = 4e-3 * extent;
      const slack = 4 * face.trim!.tolerance + 1e-6 * extent;
      let kept = 0;
      let nearKept = 0;
      for (let k = 0; k < 6000; k++) {
        const u = rect[0] + rand() * (rect[1] - rect[0]);
        const v = rect[2] + rand() * (rect[3] - rect[2]);
        const d = distance(loops, u, v);
        if (d < slack) {
          continue;
        }
        const truth = dense(loops, u, v);
        const covered = trimCovers(
          data.words,
          at,
          u - rect[0],
          v - rect[2],
          reach,
          reach,
        );
        if (truth) {
          expect(covered, `inside (${u}, ${v})`).toBe(true);
        } else if (d <= 0.6 * reach) {
          expect(covered, `near (${u}, ${v}), ${d}`).toBe(true);
          nearKept++;
        } else if (d > Math.SQRT2 * reach + slack) {
          expect(covered, `far (${u}, ${v}), ${d}`).toBe(false);
        }
        kept += Number(covered);
      }
      expect(kept).toBeGreaterThan(0);
      expect(nearKept).toBeGreaterThan(0);
    }
  });
});

describe("the trim data", () => {
  it("has a layout the words say: header, bands, lists, pieces", () => {
    const { face } = firstTrimmed(plate());
    const w = face.trim!.words;
    const bands = w[0]!;
    expect(bands).toBe(face.trim!.bands);
    expect(new Float32Array(w.buffer)[1]).toBeCloseTo(bands / 6, 5);
    expect(w[2]).toBe(face.trim!.pieces);
    let entries = 0;
    for (let b = 0; b < bands; b++) {
      const record = TRIM_HEADER_WORDS + TRIM_BAND_WORDS * b;
      entries += w[record + 1]!;
      expect(w[record]!).toBeGreaterThanOrEqual(
        TRIM_HEADER_WORDS + TRIM_BAND_WORDS * bands,
      );
    }
    expect(entries / bands).toBeCloseTo(face.trim!.meanPerBand, 9);
  });

  it("makes a rectangular plate with one rectangular hole a cheap test: few bands, pieces that are lines", () => {
    const b = new BrepBuilder();
    const e = oneEdge(b);
    const s = b.plane([0, 0, 0], [1, 0, 0], [0, 1, 0]);
    b.face(s, [
      polygon(e, [
        [0, 0],
        [4, 0],
        [4, 4],
        [0, 4],
      ]),
      polygon(e, [
        [1, 1],
        [1, 3],
        [3, 3],
        [3, 1],
      ]),
    ]);
    const { face } = firstTrimmed(b.build());
    // The horizontal edges cross no ray: 4 pieces, 2 verticals each of the outer and the hole.
    expect(face.trim!.pieces).toBe(4);
    expect(face.trim!.bands).toBe(1);
    expect(face.trim!.error).toBe(0);
  });

  it("classifies a diamond with a square hole", () => {
    const b = new BrepBuilder();
    const e = oneEdge(b);
    const s = b.plane([0, 0, 0], [1, 0, 0], [0, 1, 0]);
    b.face(s, [
      polygon(e, [
        [2, 0],
        [4, 2],
        [2, 4],
        [0, 2],
      ]),
      polygon(e, [
        [1.8, 1.8],
        [1.8, 2.2],
        [2.2, 2.2],
        [2.2, 1.8],
      ]),
    ]);
    const form = b.build();
    const { index } = firstTrimmed(form);
    const data = packGpuPatches(prepareGpuPatches(form));
    const at = data.spans.find((s) => s.face === index)!.trim;
    const winding = (u: number, v: number) =>
      trimCrossings(data.words, at, u, v, 0).winding;
    expect(winding(2, 1)).toBe(1);
    expect(winding(2, 2)).toBe(0);
    expect(winding(3.9, 0.1)).toBe(0);
    expect(winding(0.3, 2)).toBe(1);
  });

  it("closes a loop whose uses don't meet with a straight piece, as the CPU's polygon does", () => {
    const b = new BrepBuilder();
    const e = oneEdge(b);
    const s = b.plane([0, 0, 0], [1, 0, 0], [0, 1, 0]);
    // The hole's left edge has a gap from v = 1.9 to 2.1.
    b.face(s, [
      polygon(e, [
        [0, 0],
        [4, 0],
        [4, 4],
        [0, 4],
      ]),
      [
        {
          edge: e,
          pcurve: [
            [1, 1],
            [1, 1.9],
          ] as const,
        },
        {
          edge: e,
          pcurve: [
            [1, 2.1],
            [1, 3],
          ] as const,
        },
        {
          edge: e,
          pcurve: [
            [1, 3],
            [3, 3],
          ] as const,
        },
        {
          edge: e,
          pcurve: [
            [3, 3],
            [3, 1],
          ] as const,
        },
        {
          edge: e,
          pcurve: [
            [3, 1],
            [1, 1],
          ] as const,
        },
      ],
    ]);
    const form = b.build();
    const { index } = firstTrimmed(form);
    const data = packGpuPatches(prepareGpuPatches(form));
    const at = data.spans.find((s) => s.face === index)!.trim;
    const winding = (u: number, v: number) =>
      trimCrossings(data.words, at, u, v, 0).winding;
    // Left of the gap, a ray would cross only the hole's right edge without the joining piece.
    expect(winding(0.5, 2)).toBe(1);
    expect(winding(2, 2)).toBe(0);
  });

  it("is empty for a face whose loops are all horizontal, with the CPU's winding", () => {
    const b = new BrepBuilder();
    const e = oneEdge(b);
    const s = b.cylinder([0, 0, 0], [1, 0, 0], [0, 1, 0], 1);
    b.face(s, [
      [
        {
          edge: e,
          pcurve: [
            [0, 0],
            [TAU, 0],
          ] as const,
        },
      ],
      [
        {
          edge: e,
          pcurve: [
            [TAU, 3],
            [0, 3],
          ] as const,
        },
      ],
    ]);
    const form = b.build();
    const { face, index } = firstTrimmed(form);
    const data = packGpuPatches(prepareGpuPatches(form));
    expect(face.trim!.pieces).toBe(0);
    const at = data.spans.find((s) => s.face === index)!.trim;
    expect(trimCrossings(data.words, at, 3, 1.5, 0)).toEqual({
      winding: 0,
      nearest: Infinity,
    });
  });

  it("writes NO_TRIM for faces the rect completes, and none of their data", () => {
    const patches = prepareGpuPatches(boxBrep());
    expect(patches.faces.every((f) => f.trim === undefined)).toBe(true);
    const data = packGpuPatches(patches);
    expect(data.trimmed).toBe(false);
    expect(data.spans.every((s) => s.trim === NO_TRIM)).toBe(true);
    expect(data.words.length).toBeGreaterThanOrEqual(
      data.spanCount * SPAN_WORDS,
    );
    // A capped cylinder's round caps are trimmed planar faces.
    const caps = prepareGpuPatches(cappedCylinderBrep());
    expect(caps.faces.filter((f) => f.trim).length).toBe(2);
  });

  it("takes the least of the edges' tolerance and 1e-5 of the size, over the speeds, never below a few float32 steps", () => {
    const rect: Box = [0, 10, 0, 4];
    expect(
      trimTolerance({
        edgeTolerances: [1e-3, 1e-4],
        size: 100,
        speed: [3, 4],
        rect,
      }).meters,
    ).toBe(1e-4);
    expect(
      trimTolerance({ edgeTolerances: [1e-3], size: 10, speed: [3, 4], rect })
        .uv,
    ).toBeCloseTo(1e-4 / 5, 12);
    expect(
      trimTolerance({ edgeTolerances: [1e-12], size: 10, speed: [3, 4], rect })
        .uv,
    ).toBeCloseTo(2e-6, 12);
  });
});
