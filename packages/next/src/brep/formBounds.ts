// A form's axis-aligned bounds from the form itself, with no tessellation
// (overall plan §13.33): a part's size and its lowest point, to place it. The
// box holds the whole boundary and is tight to about a tenth of a percent of
// the part's size on analytic faces, and to about a percent on free-form
// ones. A draft.
//
// A linear functional (a coordinate) over a face's region is extreme on its
// boundary or at an interior critical point. So a face's box is:
//
// - The box of its loops' edges (3D curves), always. Rational Bézier curves
//   lie in the hull of their control points for positive weights, but the hull
//   is loose where a curve bulges (a rotated 90° arc's is 41% wide), so a
//   segment whose hull sticks out of the box of points known to be on the
//   curves (segment ends) is halved by de Casteljau until it doesn't.
// - Planes, cylinders and cones have no interior critical point (along the
//   rulings a coordinate is monotone or constant, and the constant lines run
//   out to the boundary): nothing more.
// - Spheres and tori: the points where an axis direction is critical over the
//   whole surface (a few found in closed form), those that lie in the face.
// - Free-form faces (Bézier patches): the hull of each patch's part under the
//   face, found by cutting its net in four (de Casteljau) to cells in (u, v).
//   A cell outside the face is dropped (its boundary is the loops' polygons,
//   as the tessellator reads them); one whose hull is inside the box of known
//   points is dropped; the rest are cut until their hull sticks out of it by
//   less than `tolerance` of the part's size, or `MAX_DEPTH` cuts, and the
//   hulls that remain are added.
//
// Vertices are added. Edge and vertex tolerances (the gaps between a kernel's
// pieces) are not: the bounds are the geometry's. Planes are exact; the
// roundness is in the edges, so a form whose edge curves stray from its
// surfaces (see `validateBrep`) has the bounds of its edges.
import { restrictNet, netOf, type Net } from "./bounds.ts";
import { SurfaceKind, type BezierCurves, type BrepForm } from "./form.ts";
import { faceTrim, type FaceTrim } from "./tessellate.ts";

/** An axis-aligned box, m in the form's coordinates. */
export interface FormBounds {
  readonly min: readonly [number, number, number];
  readonly max: readonly [number, number, number];
}

export interface FormBoundsOptions {
  /** How far a curve's or patch's box may exceed it, as a share of the form's size (default 1e-3). */
  readonly tolerance?: number;
}

/** The most times a patch is cut in four. */
const MAX_DEPTH = 7;
/** The most cells examined in all, after which the hulls are taken as they are: a bound on the work. */
const MAX_CELLS = 100_000;
/** The most times a curve segment is halved. */
const CURVE_DEPTH = 10;
const TAU = Math.PI * 2;

/** u0, u1, v0, v1. */
type Rect = readonly [number, number, number, number];

/** A box of 2 or 3 dimensions grown by points and boxes. */
class Accumulator {
  readonly min: number[];
  readonly max: number[];

  constructor(readonly dim = 3) {
    this.min = new Array<number>(dim).fill(Infinity);
    this.max = new Array<number>(dim).fill(-Infinity);
  }

  point(...p: number[]): void {
    this.box(p, p);
  }

  /** Adds the box [low, high]. */
  box(low: readonly number[], high: readonly number[]): void {
    for (let k = 0; k < this.dim; k++) {
      this.min[k] = Math.min(this.min[k]!, low[k]!);
      this.max[k] = Math.max(this.max[k]!, high[k]!);
    }
  }

  get empty(): boolean {
    return !Number.isFinite(this.min[0]);
  }

  /** Whether the box [low, high] lies within this one grown by `slack`. */
  holds(
    low: readonly number[],
    high: readonly number[],
    slack: number,
  ): boolean {
    for (let k = 0; k < this.dim; k++) {
      if (low[k]! < this.min[k]! - slack || high[k]! > this.max[k]! + slack) {
        return false;
      }
    }
    return true;
  }

  get diagonal(): number {
    let sum = 0;
    for (let k = 0; k < this.dim; k++) {
      sum += (this.max[k]! - this.min[k]!) ** 2;
    }
    return Math.sqrt(sum);
  }
}

/** The bounds of the form's boundary. A form with no geometry has the box of the origin. */
export function formBounds(
  form: BrepForm,
  options: FormBoundsOptions = {},
): FormBounds {
  const tolerance = options.tolerance ?? 1e-3;
  // Points known to be on the boundary (to the tolerance), and hulls that may overshoot it.
  const known = new Accumulator();
  const hulls = new Accumulator();
  const v = form.vertexPosition;
  for (let i = 0; i + 2 < v.length; i += 3) {
    known.point(v[i]!, v[i + 1]!, v[i + 2]!);
  }
  const freeform: Array<{ face: number; rect: Rect }> = [];
  const faces = form.faceSurface.length;
  for (let face = 0; face < faces; face++) {
    const edges = curveBounds(
      form.curves3,
      3,
      loopSegments(form, face, false),
      tolerance,
    );
    if (edges) {
      known.box(edges.min, edges.max);
    }
    const rect = loopRect(form, face, tolerance);
    if (!rect) {
      continue;
    }
    const surface = form.faceSurface[face]!;
    const kind = form.surfaceKind[surface] as SurfaceKind;
    if (kind === SurfaceKind.Bezier) {
      freeform.push({ face, rect });
    } else if (kind === SurfaceKind.Sphere || kind === SurfaceKind.Torus) {
      interiorPoints(form, face, surface, kind, rect, known);
    }
  }
  const budget = { cells: MAX_CELLS };
  for (const { face, rect } of freeform) {
    refineFace(form, face, rect, known, hulls, tolerance, budget);
  }
  const out = [known, hulls].filter((box) => !box.empty);
  if (out.length === 0) {
    return { min: [0, 0, 0], max: [0, 0, 0] };
  }
  const pick = (
    f: (b: Accumulator) => number[],
    g: (...n: number[]) => number,
  ) =>
    [0, 1, 2].map((k) => g(...out.map((b) => f(b)[k]!))) as [
      number,
      number,
      number,
    ];
  return {
    min: pick((b) => b.min, Math.min),
    max: pick((b) => b.max, Math.max),
  };
}

// Curves.

/** The curve segments of a face's loops: its pcurves, or its edges' 3D curves. */
function* loopSegments(
  form: BrepForm,
  face: number,
  pcurves: boolean,
): Iterable<number> {
  const firstLoop = form.faceLoops[face * 2]!;
  const loops = form.faceLoops[face * 2 + 1]!;
  for (let loop = firstLoop; loop < firstLoop + loops; loop++) {
    const firstUse = form.loopUses[loop * 2]!;
    const uses = form.loopUses[loop * 2 + 1]!;
    for (let use = firstUse; use < firstUse + uses; use++) {
      const edge = form.useEdge[use]!;
      const first = pcurves
        ? form.usePcurve[use * 2]!
        : form.edgeCurve[edge * 2]!;
      const count = pcurves
        ? form.usePcurve[use * 2 + 1]!
        : form.edgeCurve[edge * 2 + 1]!;
      for (let segment = first; segment < first + count; segment++) {
        yield segment;
      }
    }
  }
}

/** The bounding rect of a face's loops' pcurves, or undefined if no loop has a finite extent. */
function loopRect(
  form: BrepForm,
  face: number,
  tolerance: number,
): Rect | undefined {
  const box = curveBounds(
    form.curves2,
    2,
    loopSegments(form, face, true),
    tolerance,
  );
  return box && [box.min[0]!, box.max[0]!, box.min[1]!, box.max[1]!];
}

/**
 * The box of rational Bézier segments of `dim` dimensions (positive weights),
 * or undefined if there are none or it isn't finite. A segment whose hull
 * sticks out of the box of the points known to be on the curves (the
 * segments' ends) by more than `tolerance` of the box's diagonal is halved.
 */
function curveBounds(
  curves: BezierCurves,
  dim: 2 | 3,
  segments: Iterable<number>,
  tolerance: number,
): Accumulator | undefined {
  const stride = dim + 1;
  const pieces: number[][] = [];
  const known = new Accumulator(dim);
  const crude = new Accumulator(dim);
  for (const segment of segments) {
    const first = curves.first[segment]! * stride;
    const piece = Array.from(
      curves.points.subarray(
        first,
        first + (curves.degree[segment]! + 1) * stride,
      ),
    );
    pieces.push(piece);
    crude.box(...homogeneousHull(piece, dim));
    addEnds(known, piece, dim);
  }
  if (known.empty || crude.empty) {
    return undefined;
  }
  const slack = tolerance * crude.diagonal;
  const hulls = new Accumulator(dim);
  const stack = pieces.map((piece) => ({ piece, depth: 0 }));
  while (stack.length > 0) {
    const { piece, depth } = stack.pop()!;
    const [low, high] = homogeneousHull(piece, dim);
    if (known.holds(low, high, 0)) {
      continue;
    }
    if (known.holds(low, high, slack) || depth >= CURVE_DEPTH) {
      hulls.box(low, high);
      continue;
    }
    for (const half of halve(piece, stride)) {
      addEnds(known, half, dim);
      stack.push({ piece: half, depth: depth + 1 });
    }
  }
  const box = new Accumulator(dim);
  box.box(known.min, known.max);
  if (!hulls.empty) {
    box.box(hulls.min, hulls.max);
  }
  return [...box.min, ...box.max].every(Number.isFinite) ? box : undefined;
}

/** Adds a homogeneous control polygon's first and last points, which are on its curve. */
function addEnds(into: Accumulator, piece: readonly number[], dim: number) {
  const stride = dim + 1;
  for (const at of [0, piece.length - stride]) {
    const w = piece[at + dim]!;
    into.point(...Array.from({ length: dim }, (_, k) => piece[at + k]! / w));
  }
}

/** The box of a homogeneous control polygon's points. */
function homogeneousHull(
  piece: readonly number[],
  dim: number,
): [number[], number[]] {
  const low = new Array<number>(dim).fill(Infinity);
  const high = new Array<number>(dim).fill(-Infinity);
  for (let at = 0; at < piece.length; at += dim + 1) {
    const w = piece[at + dim]!;
    for (let k = 0; k < dim; k++) {
      const value = piece[at + k]! / w;
      low[k] = Math.min(low[k]!, value);
      high[k] = Math.max(high[k]!, value);
    }
  }
  return [low, high];
}

/** A Bézier segment's two halves by de Casteljau at 1/2 (homogeneous, `stride` per point). */
function halve(piece: readonly number[], stride: number): [number[], number[]] {
  const n = piece.length / stride;
  let level = piece.slice();
  const left: number[] = [];
  const lasts: number[][] = [];
  for (let r = 0; r < n; r++) {
    left.push(...level.slice(0, stride));
    lasts.push(level.slice(-stride));
    const next: number[] = [];
    for (let i = 0; i + 1 < level.length / stride; i++) {
      for (let c = 0; c < stride; c++) {
        next.push((level[i * stride + c]! + level[(i + 1) * stride + c]!) / 2);
      }
    }
    level = next;
  }
  return [left, lasts.reverse().flat()];
}

// Spheres and tori.

/** `t` moved by whole turns into [lo, hi], or undefined if no turn does. */
function within(t: number, lo: number, hi: number): number | undefined {
  const slack = 1e-9;
  const moved = t + TAU * Math.ceil((lo - slack - t) / TAU);
  return moved <= hi + slack ? moved : undefined;
}

/**
 * The surface points where a coordinate axis's component is critical over the
 * whole surface that lie within the face, added to `into`: where a box may
 * be reached away from the face's loops.
 */
function interiorPoints(
  form: BrepForm,
  face: number,
  surface: number,
  kind: SurfaceKind,
  rect: Rect,
  into: Accumulator,
): void {
  const trim = faceTrim(form, face);
  if (!trim) {
    return;
  }
  const f = form.surfaceFrame;
  const o = [f[surface * 9]!, f[surface * 9 + 1]!, f[surface * 9 + 2]!];
  const x = [f[surface * 9 + 3]!, f[surface * 9 + 4]!, f[surface * 9 + 5]!];
  const y = [f[surface * 9 + 6]!, f[surface * 9 + 7]!, f[surface * 9 + 8]!];
  const z = [
    x[1]! * y[2]! - x[2]! * y[1]!,
    x[2]! * y[0]! - x[0]! * y[2]!,
    x[0]! * y[1]! - x[1]! * y[0]!,
  ];
  const p0 = form.surfaceParams[surface * 2]!;
  const p1 = form.surfaceParams[surface * 2 + 1]!;
  const at = (u: number, v: number): number[] => {
    const ring = [0, 1, 2].map(
      (k) => Math.cos(u) * x[k]! + Math.sin(u) * y[k]!,
    );
    const radius =
      kind === SurfaceKind.Sphere ? p0 * Math.cos(v) : p0 + p1 * Math.cos(v);
    const lift =
      kind === SurfaceKind.Sphere ? p0 * Math.sin(v) : p1 * Math.sin(v);
    return [0, 1, 2].map((k) => o[k]! + radius * ring[k]! + lift * z[k]!);
  };
  const [u0, u1, v0, v1] = rect;
  const take = (u: number, v: number): void => {
    const uu = within(u, u0, u1);
    const vv = within(v, v0, v1);
    if (uu !== undefined && vv !== undefined && trim.contains(uu, vv)) {
      into.point(...at(uu, vv));
    }
  };
  for (let axis = 0; axis < 3; axis++) {
    for (const sign of [1, -1]) {
      // The axis direction in the surface's frame.
      const nx = sign * x[axis]!;
      const ny = sign * y[axis]!;
      const nz = sign * z[axis]!;
      const q = Math.hypot(nx, ny);
      // On the pole axis, every u does; the rect's first one stands for them.
      const us =
        q > 1e-12 ? [Math.atan2(ny, nx), Math.atan2(ny, nx) + Math.PI] : [u0];
      // A sphere's critical v is one; a torus's are the four of its tube's two sides.
      const vs =
        kind === SurfaceKind.Sphere
          ? [Math.atan2(nz, q)]
          : [
              Math.atan2(nz, q),
              Math.atan2(nz, q) + Math.PI,
              Math.atan2(nz, -q),
              Math.atan2(nz, -q) + Math.PI,
            ];
      for (const u of us) {
        for (const v of vs) {
          take(u, v);
        }
      }
    }
  }
}

// Free-form faces.

const clamp01 = (t: number): number => Math.min(1, Math.max(0, t));

/** Adds the corner points of a net, which lie on its surface. */
function addCorners(net: Net, into: Accumulator): void {
  const { du, dv, h } = net;
  for (const [i, j] of [
    [0, 0],
    [du, 0],
    [0, dv],
    [du, dv],
  ] as const) {
    const o = (j * (du + 1) + i) * 4;
    into.point(h[o]! / h[o + 3]!, h[o + 1]! / h[o + 3]!, h[o + 2]! / h[o + 3]!);
  }
}

/** The box of a net's control points. */
function hullOf(net: Net): [number[], number[]] {
  const low = [Infinity, Infinity, Infinity];
  const high = [-Infinity, -Infinity, -Infinity];
  const h = net.h;
  for (let i = 0; i < h.length; i += 4) {
    const w = h[i + 3]!;
    for (let k = 0; k < 3; k++) {
      const value = h[i + k]! / w;
      if (value < low[k]!) {
        low[k] = value;
      }
      if (value > high[k]!) {
        high[k] = value;
      }
    }
  }
  return [low, high];
}

/** A net cut in two at the middle of s or of t, by de Casteljau on the homogeneous points. */
function halveNet(net: Net, alongS: boolean): [Net, Net] {
  const { du, dv, h } = net;
  const n = alongS ? du + 1 : dv + 1;
  const step = alongS ? 4 : (du + 1) * 4;
  const lines = alongS ? dv + 1 : du + 1;
  const lineStep = alongS ? (du + 1) * 4 : 4;
  const left = new Float64Array(h.length);
  const right = new Float64Array(h.length);
  const level = new Float64Array(n);
  for (let line = 0; line < lines; line++) {
    for (let k = 0; k < 4; k++) {
      const base = line * lineStep + k;
      for (let i = 0; i < n; i++) {
        level[i] = h[base + i * step]!;
      }
      left[base] = level[0]!;
      right[base + (n - 1) * step] = level[n - 1]!;
      for (let r = 1; r < n; r++) {
        for (let i = 0; i < n - r; i++) {
          level[i] = (level[i]! + level[i + 1]!) / 2;
        }
        left[base + r * step] = level[0]!;
        right[base + (n - 1 - r) * step] = level[n - 1 - r]!;
      }
    }
  }
  return [
    { du, dv, h: left },
    { du, dv, h: right },
  ];
}

/** Whether a segment (x0, y0)–(x1, y1) meets the rect. */
function segmentMeets(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  [u0, u1, v0, v1]: Rect,
): boolean {
  // Liang–Barsky.
  let t0 = 0;
  let t1 = 1;
  const dx = x1 - x0;
  const dy = y1 - y0;
  for (const [p, q] of [
    [-dx, x0 - u0],
    [dx, u1 - x0],
    [-dy, y0 - v0],
    [dy, v1 - y0],
  ] as const) {
    if (p === 0) {
      if (q < 0) {
        return false;
      }
    } else {
      const r = q / p;
      if (p < 0) {
        t0 = Math.max(t0, r);
      } else {
        t1 = Math.min(t1, r);
      }
      if (t0 > t1) {
        return false;
      }
    }
  }
  return true;
}

/**
 * Where a cell of the face's (u, v) rect lies against its trim, and which of
 * the polygons' segments `candidates` (indices into `segments`, 4 numbers
 * each) meet it: a cell inside one is itself only met by those.
 */
function cellState(
  trim: FaceTrim,
  segments: Float64Array,
  candidates: readonly number[],
  cell: Rect,
): { state: "inside" | "outside" | "edge"; meeting: number[] } {
  if (!trim.trimmed) {
    return { state: "inside", meeting: [] };
  }
  // The polygons are the tessellator's, an approximation of the pcurves: meet them with room to spare.
  const pad = 0.01 * Math.max(cell[1] - cell[0], cell[3] - cell[2]);
  const grown: Rect = [
    cell[0] - pad,
    cell[1] + pad,
    cell[2] - pad,
    cell[3] + pad,
  ];
  const meeting = candidates.filter((s) =>
    segmentMeets(
      segments[s * 4]!,
      segments[s * 4 + 1]!,
      segments[s * 4 + 2]!,
      segments[s * 4 + 3]!,
      grown,
    ),
  );
  if (meeting.length > 0) {
    return { state: "edge", meeting };
  }
  const inside = trim.contains(
    (cell[0] + cell[1]) / 2,
    (cell[2] + cell[3]) / 2,
  );
  return { state: inside ? "inside" : "outside", meeting };
}

/** The segments of a trim's polygons, 4 numbers each: x0, y0, x1, y1. */
function polygonSegments(trim: FaceTrim): Float64Array {
  let count = 0;
  for (const loop of trim.loops) {
    count += Math.max(0, loop.length / 2 - 1);
  }
  const out = new Float64Array(count * 4);
  let at = 0;
  for (const loop of trim.loops) {
    for (let i = 0; i + 3 < loop.length; i += 2) {
      out.set([loop[i]!, loop[i + 1]!, loop[i + 2]!, loop[i + 3]!], at);
      at += 4;
    }
  }
  return out;
}

/**
 * Bounds a free-form face: the hulls of the parts of its patches that lie
 * under it, cut as the header says. Corners of cells inside the face join
 * `known`; the hulls that remain go to `hulls`.
 */
function refineFace(
  form: BrepForm,
  face: number,
  rect: Rect,
  known: Accumulator,
  hulls: Accumulator,
  tolerance: number,
  budget: { cells: number },
): void {
  const trim = faceTrim(form, face);
  if (!trim) {
    return;
  }
  const segments = polygonSegments(trim);
  const everySegment = Array.from({ length: segments.length / 4 }, (_, i) => i);
  const surface = form.faceSurface[face]!;
  const first = form.surfacePatches[surface * 2]!;
  const count = form.surfacePatches[surface * 2 + 1]!;
  const eps = 1e-9;
  const spanU = rect[1] - rect[0];
  const spanV = rect[3] - rect[2];
  const stack: Array<{
    net: Net;
    cell: Rect;
    depth: number;
    candidates: readonly number[];
  }> = [];
  for (let patch = first; patch < first + count; patch++) {
    const d0 = form.patchDomain[patch * 4]!;
    const d1 = form.patchDomain[patch * 4 + 1]!;
    const e0 = form.patchDomain[patch * 4 + 2]!;
    const e1 = form.patchDomain[patch * 4 + 3]!;
    if (
      d1 <= rect[0] + eps * spanU ||
      d0 >= rect[1] - eps * spanU ||
      e1 <= rect[2] + eps * spanV ||
      e0 >= rect[3] - eps * spanV
    ) {
      continue;
    }
    const s0 = clamp01((rect[0] - d0) / (d1 - d0));
    const s1 = clamp01((rect[1] - d0) / (d1 - d0));
    const t0 = clamp01((rect[2] - e0) / (e1 - e0));
    const t1 = clamp01((rect[3] - e0) / (e1 - e0));
    const net = netOf(form, patch);
    const whole = s0 <= eps && s1 >= 1 - eps && t0 <= eps && t1 >= 1 - eps;
    stack.push({
      net: whole ? net : restrictNet(net, s0, s1, t0, t1),
      cell: [
        d0 + s0 * (d1 - d0),
        d0 + s1 * (d1 - d0),
        e0 + t0 * (e1 - e0),
        e0 + t1 * (e1 - e0),
      ],
      depth: 0,
      candidates: everySegment,
    });
  }
  const crude = new Accumulator();
  for (const { net } of stack) {
    crude.box(...hullOf(net));
  }
  if (crude.empty) {
    return;
  }
  const slack =
    tolerance * Math.max(crude.diagonal, known.empty ? 0 : known.diagonal);
  while (stack.length > 0) {
    const { net, cell, depth, candidates } = stack.pop()!;
    const [low, high] = hullOf(net);
    if (known.holds(low, high, 0)) {
      continue;
    }
    const { state, meeting } = cellState(trim, segments, candidates, cell);
    if (state === "outside") {
      continue;
    }
    if (state === "inside") {
      addCorners(net, known);
    }
    // A cell on the trim reaches past it by at most its own size: small ones are taken whole.
    const size = Math.hypot(
      high[0]! - low[0]!,
      high[1]! - low[1]!,
      high[2]! - low[2]!,
    );
    if (
      known.holds(low, high, slack) ||
      (state === "edge" && size <= 4 * slack) ||
      depth >= MAX_DEPTH ||
      --budget.cells < 0
    ) {
      hulls.box(low, high);
      continue;
    }
    const [u0, u1, v0, v1] = cell;
    const um = (u0 + u1) / 2;
    const vm = (v0 + v1) / 2;
    const halves = halveNet(net, true);
    const us = [
      [u0, um],
      [um, u1],
    ] as const;
    const vs = [
      [v0, vm],
      [vm, v1],
    ] as const;
    halves.forEach((half, i) => {
      halveNet(half, false).forEach((quarter, j) => {
        stack.push({
          net: quarter,
          cell: [us[i]![0], us[i]![1], vs[j]![0], vs[j]![1]],
          depth: depth + 1,
          candidates: meeting,
        });
      });
    });
  }
}
