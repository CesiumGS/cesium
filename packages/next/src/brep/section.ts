// The section of a b-rep by planes: the cap faces (plan §13.26, "Clip planes
// and caps: decided by the owner", item 5: B-rep caps are exact; increment 8b).
//
// For each plane, every face of the solid is cut by it. The section curve of
// the face's surface is found in its closed form where there is one (a plane
// cuts a plane in a line, a cylinder in an ellipse or two lines, a sphere in a
// circle, a cone or torus square to the plane in circles), else marched on the
// surface's (u, v) grid and fitted in cubics within the tolerance. The curve is cut at
// the exact crossings of the face's boundary edges with the plane, and a piece
// is kept when its midpoint is inside the face's trim. Pieces are turned so the
// solid's inside is on their left, joined into loops, cut by the plane's
// limits (the other sides of a clip box), nested into outer loops and holes,
// and built as planar faces of the plane's own frame (`BrepBuilder`): the
// loops are the faces' pcurves, and the pieces are the edges.
//
// The cap plane's normal is the cap's outward normal: outer loops are counter-
// clockwise in the plane's (u, v), holes clockwise, and the face is not
// reversed. Lengths are metres.
import { polynomialRoots } from "./analyticQueries.ts";
import { evaluateSegment } from "./bezier.ts";
import { BrepBuilder } from "./build.ts";
import { faceNormal } from "./evaluate.ts";
import { SurfaceKind, type BrepForm } from "./form.ts";
import type { NurbsCurve } from "./nurbs.ts";
import {
  analyticField,
  analyticSection,
  chainCurve,
  fromPlane,
  marchField,
  nearestParameter,
  patchField,
  planeFrame,
  toPlane,
  type P2,
  type SectionPlane,
  type SectionStats,
  type V3,
} from "./sectionCurves.ts";
import {
  bernsteinToPower,
  fitSection,
  type Bez2,
  type FitStats,
} from "./sectionFit.ts";
import {
  clipLoops,
  joinPieces,
  loopArea,
  nestLoops,
  pieceStart,
  reversePiece,
  type Loop,
  type Piece,
  type Region,
} from "./sectionLoops.ts";
import { faceTrim } from "./tessellate.ts";

/** One plane to cut by: a point on it and the cap's outward normal. */
export interface SectionPlaneInput {
  readonly point: ArrayLike<number>;
  readonly normal: ArrayLike<number>;
  /**
   * Half-spaces the cap is limited to, in the form's coordinates: a point `p`
   * is kept when `normal · (p − point) ≤ 0` (the other sides of a clip box).
   */
  readonly limits?: readonly {
    readonly point: ArrayLike<number>;
    readonly normal: ArrayLike<number>;
  }[];
  /** Names the cap faces (`cap:<id>:<n>`); the plane's index by default. */
  readonly id?: string;
}

export interface SectionOptions {
  /**
   * How far a fitted section curve may be from the surface's, m (default
   * 1e-5 of the form's size, at least 1e-7). Lines, circles and ellipses are exact.
   */
  readonly tolerance?: number;
  /** The cap form's version (default 1). */
  readonly version?: number;
}

/** A cap face of the result. */
export interface CapFace {
  /** The face's index in the cap form. */
  readonly face: number;
  /** The index of the plane (in the call's list) it lies on. */
  readonly plane: number;
  /** Its area, m². */
  readonly area: number;
  /** Its holes. */
  readonly holes: number;
  /** The loops' sources: the faces of the solid whose sections bound it. */
  readonly sources: readonly number[];
}

export interface SectionReport {
  /** The planes cut with. */
  planes: number;
  /** Faces of the solid a plane cut. */
  facesCut: number;
  /** Section curves, by how they were found. */
  methods: Record<string, number>;
  /** The largest distance of a fitted curve from the surface's, m (0 when every curve was exact). */
  fitError: number;
  /** The tolerance used, m. */
  tolerance: number;
  /** Chains of section pieces that did not close, with the plane's index: no cap is made of them. */
  openChains: { plane: number; pieces: number }[];
  /** Negative loops that no outer loop held. */
  strayLoops: number;
  /** Planes moved a hair into the solid because they lay on a face or edge. */
  nudged: number;
  /** Edge crossings that no section curve of their face passed through. */
  unmatchedCrossings: number;
  /** Pieces cut at a tangency, whose side could not be told. */
  ambiguous: number;
  /** Faces left out, and why. */
  skipped: { face: number; reason: string }[];
  /** Planes for which a limit broke a loop's cut. */
  brokenLimits: number;
}

export interface SectionResult {
  /** The caps as a form of planar faces; undefined when no plane cut the solid. */
  readonly form: BrepForm | undefined;
  readonly faces: readonly CapFace[];
  readonly report: SectionReport;
}

const dot = (a: ArrayLike<number>, b: ArrayLike<number>): number =>
  a[0]! * b[0]! + a[1]! * b[1]! + a[2]! * b[2]!;
const cross = (a: ArrayLike<number>, b: ArrayLike<number>): V3 => [
  a[1]! * b[2]! - a[2]! * b[1]!,
  a[2]! * b[0]! - a[0]! * b[2]!,
  a[0]! * b[1]! - a[1]! * b[0]!,
];

/** The size of a form: the diagonal of its vertices' box. */
function formSize(form: BrepForm): number {
  const v = form.vertexPosition;
  const lo = [Infinity, Infinity, Infinity];
  const hi = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i + 2 < v.length; i += 3) {
    for (let k = 0; k < 3; k++) {
      lo[k] = Math.min(lo[k]!, v[i + k]!);
      hi[k] = Math.max(hi[k]!, v[i + k]!);
    }
  }
  const size = Math.hypot(hi[0]! - lo[0]!, hi[1]! - lo[1]!, hi[2]! - lo[2]!);
  return Number.isFinite(size) && size > 0 ? size : 1;
}

/** Where the plane crosses the boundary edges of a face, in the plane's (u, v). */
function edgeCrossings(
  form: BrepForm,
  face: number,
  plane: SectionPlane,
  scale: number,
): { points: P2[]; coplanar: boolean; tolerance: number } {
  const points: P2[] = [];
  let coplanar = false;
  let tolerance = 0;
  const N = plane.z;
  const d = dot(N, plane.origin);
  const c = form.curves3;
  const seen = new Set<number>();
  const firstLoop = form.faceLoops[face * 2]!;
  const loops = form.faceLoops[face * 2 + 1]!;
  for (let loop = firstLoop; loop < firstLoop + loops; loop++) {
    const firstUse = form.loopUses[loop * 2]!;
    const uses = form.loopUses[loop * 2 + 1]!;
    for (let use = firstUse; use < firstUse + uses; use++) {
      const edge = form.useEdge[use]!;
      if (seen.has(edge)) {
        continue;
      }
      seen.add(edge);
      tolerance = Math.max(tolerance, form.edgeTolerance[edge]!);
      const first = form.edgeCurve[edge * 2]!;
      const count = form.edgeCurve[edge * 2 + 1]!;
      for (let s = first; s < first + count; s++) {
        const degree = c.degree[s]!;
        const at = c.first[s]!;
        const g: number[] = [];
        let largest = 0;
        for (let i = 0; i <= degree; i++) {
          const k = (at + i) * 4;
          const value =
            N[0] * c.points[k]! +
            N[1] * c.points[k + 1]! +
            N[2] * c.points[k + 2]! -
            d * c.points[k + 3]!;
          g.push(value);
          largest = Math.max(largest, Math.abs(value) / c.points[k + 3]!);
        }
        if (largest <= 1e-9 * scale) {
          coplanar = true;
          continue;
        }
        for (const t of polynomialRoots(bernsteinToPower(g), 0, 1)) {
          const p = evaluateSegment(c.points, at, degree, 3, t).position;
          points.push(toPlane(plane, p));
        }
      }
    }
  }
  return { points, coplanar, tolerance };
}

/** The control values of a patch against the plane: all one sign means the plane misses it. */
function patchMissed(
  form: BrepForm,
  patch: number,
  plane: SectionPlane,
): boolean {
  const first = form.patchFirst[patch]!;
  const count =
    (form.patchDegree[patch * 2]! + 1) * (form.patchDegree[patch * 2 + 1]! + 1);
  const d = dot(plane.z, plane.origin);
  let positive = false;
  let negative = false;
  for (let i = 0; i < count; i++) {
    const k = (first + i) * 4;
    const w = form.patchPoints[k + 3]!;
    const f =
      (plane.z[0] * form.patchPoints[k]! +
        plane.z[1] * form.patchPoints[k + 1]! +
        plane.z[2] * form.patchPoints[k + 2]!) /
        w -
      d;
    positive ||= f >= 0;
    negative ||= f <= 0;
  }
  return !(positive && negative);
}

interface Context {
  readonly form: BrepForm;
  readonly tolerance: number;
  readonly scale: number;
  readonly report: SectionReport;
  readonly fit: FitStats;
}

function count(report: SectionReport, method: string): void {
  report.methods[method] = (report.methods[method] ?? 0) + 1;
}

/**
 * The pieces a plane makes of one face: its section curves cut at the edge
 * crossings, those inside the trim kept, and turned to run with the solid's
 * inside on their left.
 */
function facePieces(ctx: Context, face: number, plane: SectionPlane): Piece[] {
  const { form, report } = ctx;
  const trim = faceTrim(form, face);
  if (!trim) {
    report.skipped.push({ face, reason: "no loop with an extent" });
    return [];
  }
  const surface = form.faceSurface[face]!;
  const crossings = edgeCrossings(form, face, plane, ctx.scale);
  const stats: SectionStats = { marched: 0, coincident: 0 };
  let curves = analyticSection(form, surface, trim.domain, plane, stats);
  if (!curves) {
    curves = [];
    if (form.surfaceKind[surface] === SurfaceKind.Bezier) {
      const first = form.surfacePatches[surface * 2]!;
      const patches = form.surfacePatches[surface * 2 + 1]!;
      for (let patch = first; patch < first + patches; patch++) {
        if (patchMissed(form, patch, plane)) {
          continue;
        }
        const n =
          8 +
          4 *
            Math.max(
              form.patchDegree[patch * 2]!,
              form.patchDegree[patch * 2 + 1]!,
            );
        const field = patchField(form, patch, plane);
        for (const chain of marchField(field, n, n)) {
          const curve = chainCurve(
            field,
            chain,
            plane,
            "Bézier patch, marched and fitted",
          );
          if (curve) {
            curves.push(curve);
          }
        }
      }
    } else {
      const field = analyticField(form, surface, trim.domain, plane);
      for (const chain of marchField(field, 64, 64)) {
        const curve = chainCurve(
          field,
          chain,
          plane,
          "analytic surface, marched and fitted",
        );
        if (curve) {
          curves.push(curve);
        }
      }
    }
  }
  const matchTol = 4 * (crossings.tolerance + ctx.tolerance) + 1e-9 * ctx.scale;
  const pieces: Piece[] = [];
  const matched = new Set<number>();
  for (const curve of curves) {
    const span = curve.t1 - curve.t0;
    const params: number[] = [];
    crossings.points.forEach((x, i) => {
      const near = nearestParameter(curve, x);
      if (near.distance <= matchTol) {
        params.push(near.t);
        matched.add(i);
      }
    });
    params.sort((a, b) => a - b);
    const distinct = params.filter(
      (t, i) => i === 0 || t - params[i - 1]! > 1e-9 * Math.max(1, span),
    );
    const intervals: [number, number][] = [];
    if (curve.closed) {
      if (distinct.length === 0) {
        intervals.push([curve.t0, curve.t1]);
      } else {
        for (let i = 0; i < distinct.length; i++) {
          const next =
            i + 1 < distinct.length ? distinct[i + 1]! : distinct[0]! + span;
          intervals.push([distinct[i]!, next]);
        }
      }
    } else {
      const inner = distinct.filter(
        (t) => t > curve.t0 + 1e-9 && t < curve.t1 - 1e-9,
      );
      const edges = [curve.t0, ...inner, curve.t1];
      for (let i = 0; i + 1 < edges.length; i++) {
        intervals.push([edges[i]!, edges[i + 1]!]);
      }
    }
    for (const [a, b] of intervals) {
      const mid = (a + b) / 2;
      const [u, v] = curve.uv(mid);
      if (!trim.contains(u, v)) {
        continue;
      }
      const start = curve.point(a);
      const finish = curve.point(b);
      // A chain cut at a seam has both ends at one point: it is a whole loop, not nothing.
      if (
        b - a < 1e-9 * Math.max(1, span) ||
        (!curve.closed &&
          b - a < 1 &&
          Math.hypot(finish[0] - start[0], finish[1] - start[1]) < 1e-12)
      ) {
        continue;
      }
      // The solid's inside is on the left of the plane's loop: along z × n.
      const n = faceNormal(form, face, u, v);
      const tangent = curve.tangent(mid);
      const t3: V3 = [
        tangent[0] * plane.x[0] + tangent[1] * plane.y[0],
        tangent[0] * plane.x[1] + tangent[1] * plane.y[1],
        tangent[0] * plane.x[2] + tangent[1] * plane.y[2],
      ];
      let reverse = false;
      if (n) {
        const want = cross(plane.z, n);
        if (Math.hypot(want[0], want[1], want[2]) < 1e-9) {
          report.ambiguous++;
        }
        reverse = dot(t3, want) < 0;
      }
      const segs: Bez2[] = fitSection(curve, a, b, ctx.tolerance, ctx.fit);
      const piece: Piece = { segs, face };
      pieces.push(reverse ? reversePiece(piece) : piece);
      count(report, curve.method);
    }
  }
  report.unmatchedCrossings += crossings.points.length - matched.size;
  if (pieces.length > 0) {
    report.facesCut++;
  }
  return pieces;
}

/** Whether the plane lies on a face of the solid, or contains an edge of it. */
function* touches(
  ctx: Context,
  plane: SectionPlane,
): Generator<void, boolean, void> {
  const { form } = ctx;
  for (let face = 0; face < form.faceSurface.length; face++) {
    yield;
    if (edgeCrossings(form, face, plane, ctx.scale).coplanar) {
      return true;
    }
    const surface = form.faceSurface[face]!;
    if (form.surfaceKind[surface] === SurfaceKind.Plane) {
      const o = form.surfaceFrame;
      const x = [o[surface * 9 + 3]!, o[surface * 9 + 4]!, o[surface * 9 + 5]!];
      const y = [o[surface * 9 + 6]!, o[surface * 9 + 7]!, o[surface * 9 + 8]!];
      const z = cross(x, y);
      const away = dot(plane.z, [
        o[surface * 9]! - plane.origin[0],
        o[surface * 9 + 1]! - plane.origin[1],
        o[surface * 9 + 2]! - plane.origin[2],
      ]);
      const parallel = cross(z, plane.z);
      if (
        Math.hypot(parallel[0], parallel[1], parallel[2]) < 1e-9 &&
        Math.abs(away) < 1e-9 * ctx.scale
      ) {
        return true;
      }
    }
  }
  return false;
}

interface PlaneSection {
  readonly plane: SectionPlane;
  readonly regions: Region[];
}

function* sectionPlane(
  ctx: Context,
  input: SectionPlaneInput,
  index: number,
  nudge: number,
): Generator<void, PlaneSection, void> {
  const { form, report } = ctx;
  const base = planeFrame(input.point, input.normal);
  // Shifted into the solid (against the outward normal) when nudged.
  const plane: SectionPlane = nudge
    ? {
        ...base,
        origin: [
          base.origin[0] - nudge * base.z[0],
          base.origin[1] - nudge * base.z[1],
          base.origin[2] - nudge * base.z[2],
        ],
      }
    : base;
  const pieces: Piece[] = [];
  const faces = form.faceSurface.length;
  for (let face = 0; face < faces; face++) {
    pieces.push(...facePieces(ctx, face, plane));
    yield;
  }
  if (pieces.length === 0) {
    return { plane, regions: [] };
  }
  const joinTol = 4 * (ctx.tolerance + 1e-6) + 1e-9 * ctx.scale;
  const joined = joinPieces(pieces, joinTol);
  for (const chain of joined.open) {
    report.openChains.push({ plane: index, pieces: chain.length });
  }
  let loops: Loop[] = joined.loops;
  for (const limit of input.limits ?? []) {
    const n: V3 = [limit.normal[0]!, limit.normal[1]!, limit.normal[2]!];
    const length = Math.hypot(n[0], n[1], n[2]);
    const o = plane.origin;
    const c =
      (n[0] * (o[0] - limit.point[0]!) +
        n[1] * (o[1] - limit.point[1]!) +
        n[2] * (o[2] - limit.point[2]!)) /
      length;
    const n2: P2 = [dot(n, plane.x) / length, dot(n, plane.y) / length];
    const m = Math.hypot(n2[0], n2[1]);
    if (m < 1e-9) {
      // Parallel to the cap's plane: all of it or none.
      if (c > 1e-9 * ctx.scale) {
        loops = [];
      }
      continue;
    }
    const clipped = clipLoops(loops, [n2[0] / m, n2[1] / m], c / m);
    report.brokenLimits += clipped.broken;
    loops = clipped.loops;
  }
  const minimum = ctx.tolerance * ctx.tolerance;
  loops = loops.filter((loop) => Math.abs(loopArea(loop)) > minimum);
  const nested = nestLoops(loops);
  report.strayLoops += nested.stray.length;
  return { plane, regions: nested.regions };
}

/** A piece's segments as a NURBS curve (all of one degree), lifted by `lift`. */
function pieceCurve(
  piece: Piece,
  lift: ((p: P2) => number[]) | undefined,
): NurbsCurve {
  const degree = piece.segs[0]!.degree;
  const n = piece.segs.length;
  const dimension = lift ? 3 : 2;
  const total = n * degree + 1;
  const points = new Float64Array(total * dimension);
  const weights = new Float64Array(total);
  piece.segs.forEach((seg, k) => {
    for (let i = 0; i <= degree; i++) {
      const w = seg.pts[i * 3 + 2]!;
      const p: P2 = [seg.pts[i * 3]! / w, seg.pts[i * 3 + 1]! / w];
      const at = k * degree + i;
      points.set(lift ? lift(p) : p, at * dimension);
      weights[at] = w;
    }
  });
  const knots = [
    ...Array<number>(degree + 1).fill(0),
    ...Array.from({ length: n - 1 }, (_, k) =>
      Array<number>(degree).fill(k + 1),
    ).flat(),
    ...Array<number>(degree + 1).fill(n),
  ];
  return {
    degree,
    knots: Float64Array.from(knots),
    count: total,
    dimension,
    points,
    weights,
  };
}

/**
 * The caps of the solid for planes, in steps: a `SectionJob` does the same
 * work as `sectionBrep`, a face of a plane at a time, so a caller can spread
 * it over frames (`step(budgetMs)`) and keep drawing what it had until the
 * result is whole.
 */
export class SectionJob {
  private readonly steps: Generator<void, SectionResult, void>;
  private result_: SectionResult | undefined;
  private units = 0;

  constructor(
    form: BrepForm,
    planes: readonly SectionPlaneInput[],
    options: SectionOptions = {},
  ) {
    const size = formSize(form);
    const tolerance = options.tolerance ?? Math.max(1e-7, 1e-5 * size);
    if (!(tolerance > 0 && Number.isFinite(tolerance))) {
      throw new RangeError(
        "sectionBrep: tolerance must be a positive finite number of metres",
      );
    }
    this.steps = sectionSteps(form, planes, options, size, tolerance);
  }

  /** Whether every step has been taken. */
  get done(): boolean {
    return this.result_ !== undefined;
  }

  /** Steps taken so far (a step is one face of one plane, or one plane's assembly). */
  get stepsTaken(): number {
    return this.units;
  }

  /** The caps; throws until `done`. */
  get result(): SectionResult {
    if (!this.result_) {
      throw new Error("SectionJob: the section is not done");
    }
    return this.result_;
  }

  /**
   * Works for about `budgetMs` (a step in progress is not split, and one is
   * always taken). Returns whether the job is done.
   */
  step(budgetMs: number): boolean {
    const start = performance.now();
    while (!this.result_) {
      const next = this.steps.next();
      this.units++;
      if (next.done) {
        this.result_ = next.value;
        break;
      }
      if (performance.now() - start >= budgetMs) {
        break;
      }
    }
    return this.done;
  }
}

/**
 * The caps of the solid for planes: planar faces whose outer loop is the
 * section, with the holes it has, as a form of their own.
 */
export function sectionBrep(
  form: BrepForm,
  planes: readonly SectionPlaneInput[],
  options: SectionOptions = {},
): SectionResult {
  const job = new SectionJob(form, planes, options);
  job.step(Infinity);
  return job.result;
}

function* sectionSteps(
  form: BrepForm,
  planes: readonly SectionPlaneInput[],
  options: SectionOptions,
  size: number,
  tolerance: number,
): Generator<void, SectionResult, void> {
  const report: SectionReport = {
    planes: planes.length,
    facesCut: 0,
    methods: {},
    fitError: 0,
    tolerance,
    openChains: [],
    strayLoops: 0,
    nudged: 0,
    unmatchedCrossings: 0,
    ambiguous: 0,
    skipped: [],
    brokenLimits: 0,
  };
  const fit: FitStats = { maxError: 0, segments: [0, 0, 0] };
  const ctx: Context = { form, tolerance, scale: size, report, fit };
  const builder = new BrepBuilder(
    options.version !== undefined ? { version: options.version } : undefined,
  );
  const faces: CapFace[] = [];
  for (const [index, input] of planes.entries()) {
    // On a face or an edge: the plane moves a hair into the solid.
    const nudged = yield* touches(ctx, planeFrame(input.point, input.normal));
    if (nudged) {
      report.nudged++;
    }
    const section = yield* sectionPlane(
      ctx,
      input,
      index,
      nudged ? 1e-6 * size : 0,
    );
    if (section.regions.length === 0) {
      continue;
    }
    const { plane, regions } = section;
    const surface = builder.plane(plane.origin, plane.x, plane.y);
    const lift = (p: P2): number[] => fromPlane(plane, p);
    const edgeTolerance = 8 * tolerance;
    regions.forEach((region, k) => {
      const loops = [region.outer, ...region.holes];
      const uses = loops.map((loop) => {
        const vertices = loop.map((piece) => {
          const p = pieceStart(piece);
          return builder.vertex(fromPlane(plane, p), {
            tolerance: edgeTolerance,
          });
        });
        return loop.map((piece, i) => {
          const edge = builder.edge(
            vertices[i]!,
            vertices[(i + 1) % loop.length]!,
            {
              curve: pieceCurve(piece, lift),
              tolerance: edgeTolerance,
            },
          );
          const single = piece.segs.length === 1 && piece.segs[0]!.degree === 1;
          const seg = piece.segs[0]!;
          return {
            edge,
            pcurve: single
              ? ([
                  [seg.pts[0]! / seg.pts[2]!, seg.pts[1]! / seg.pts[2]!],
                  [seg.pts[3]! / seg.pts[5]!, seg.pts[4]! / seg.pts[5]!],
                ] as const)
              : pieceCurve(piece, undefined),
          };
        });
      });
      const face = builder.face(surface, uses, {
        id: `cap:${input.id ?? index}:${k}`,
      });
      const sources = [
        ...new Set(
          loops
            .flatMap((loop) => loop.map((p) => p.face))
            .filter((f) => f >= 0),
        ),
      ].sort((a, b) => a - b);
      faces.push({
        face,
        plane: index,
        area: region.area,
        holes: region.holes.length,
        sources,
      });
    });
    yield;
  }
  report.fitError = fit.maxError;
  return {
    form: faces.length > 0 ? builder.build() : undefined,
    faces,
    report,
  };
}
