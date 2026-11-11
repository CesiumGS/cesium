// Rational Bézier pieces in the section plane's (u, v), and the fit of a
// section curve to them (plan §13.26, caps). A line is one segment; a circle
// or an ellipse is exact, in rational quadratic arcs of at most a quarter
// turn; anything else is fitted in cubics from its points and tangents, cut
// until every sampled point of the curve is within the tolerance of the fit.
import { polynomialRoots } from "./analyticQueries.ts";
import type { P2, SectionCurve } from "./sectionCurves.ts";

/** A rational Bézier segment of degree 1 to 3: homogeneous (x·w, y·w, w) per point. */
export interface Bez2 {
  readonly degree: 1 | 2 | 3;
  readonly pts: Float64Array;
}

/** What the fit reports. */
export interface FitStats {
  /** The largest distance of a sampled curve point from its fit, m. */
  maxError: number;
  /** Segments of each degree. */
  segments: [number, number, number];
}

const TAU = Math.PI * 2;
/** Interval splits a fit may make. */
const MAX_DEPTH = 14;

export function line2(a: P2, b: P2): Bez2 {
  return { degree: 1, pts: Float64Array.of(a[0], a[1], 1, b[0], b[1], 1) };
}

/** The point of a segment at t. */
export function evalBez(seg: Bez2, t: number): P2 {
  const n = seg.degree;
  const buffer = Float64Array.from(seg.pts);
  for (let level = 1; level <= n; level++) {
    for (let i = 0; i <= n - level; i++) {
      for (let c = 0; c < 3; c++) {
        buffer[i * 3 + c] =
          (1 - t) * buffer[i * 3 + c]! + t * buffer[(i + 1) * 3 + c]!;
      }
    }
  }
  return [buffer[0]! / buffer[2]!, buffer[1]! / buffer[2]!];
}

/** The control point `i` of a segment, as a plain point. */
export function controlPoint(seg: Bez2, i: number): P2 {
  return [
    seg.pts[i * 3]! / seg.pts[i * 3 + 2]!,
    seg.pts[i * 3 + 1]! / seg.pts[i * 3 + 2]!,
  ];
}

export function startPoint(seg: Bez2): P2 {
  return controlPoint(seg, 0);
}

export function endPoint(seg: Bez2): P2 {
  return controlPoint(seg, seg.degree);
}

/** The segment run the other way. */
export function reverseBez(seg: Bez2): Bez2 {
  const n = seg.degree;
  const pts = new Float64Array(seg.pts.length);
  for (let i = 0; i <= n; i++) {
    for (let c = 0; c < 3; c++) {
      pts[i * 3 + c] = seg.pts[(n - i) * 3 + c]!;
    }
  }
  return { degree: seg.degree, pts };
}

/** The two halves of a segment, cut at t (de Casteljau, homogeneous). */
export function splitBez(seg: Bez2, t: number): [Bez2, Bez2] {
  const n = seg.degree;
  const rows: Float64Array[] = [Float64Array.from(seg.pts)];
  for (let level = 1; level <= n; level++) {
    const previous = rows[level - 1]!;
    const row = new Float64Array((n + 1 - level) * 3);
    for (let i = 0; i <= n - level; i++) {
      for (let c = 0; c < 3; c++) {
        row[i * 3 + c] =
          (1 - t) * previous[i * 3 + c]! + t * previous[(i + 1) * 3 + c]!;
      }
    }
    rows.push(row);
  }
  const left = new Float64Array((n + 1) * 3);
  const right = new Float64Array((n + 1) * 3);
  for (let level = 0; level <= n; level++) {
    for (let c = 0; c < 3; c++) {
      left[level * 3 + c] = rows[level]![c]!;
      right[(n - level) * 3 + c] = rows[level]![(n - level) * 3 + c]!;
    }
  }
  return [
    { degree: seg.degree, pts: left },
    { degree: seg.degree, pts: right },
  ];
}

/** The part of a segment between t0 and t1. */
export function subBez(seg: Bez2, t0: number, t1: number): Bez2 {
  const rest = t0 > 0 ? splitBez(seg, t0)[1] : seg;
  if (t1 >= 1) {
    return rest;
  }
  return splitBez(rest, (t1 - t0) / (1 - t0))[0];
}

/** Roots in (0, 1) of n·p + c = 0 along a segment, ascending. */
export function lineCrossings(seg: Bez2, n: P2, c: number): number[] {
  const g: number[] = [];
  for (let i = 0; i <= seg.degree; i++) {
    g.push(
      n[0] * seg.pts[i * 3]! +
        n[1] * seg.pts[i * 3 + 1]! +
        c * seg.pts[i * 3 + 2]!,
    );
  }
  return polynomialRoots(bernsteinToPower(g), 0, 1).filter(
    (t) => t > 1e-9 && t < 1 - 1e-9,
  );
}

/** Power-basis coefficients (constant first) of a polynomial in Bernstein form. */
export function bernsteinToPower(g: readonly number[]): number[] {
  switch (g.length) {
    case 2:
      return [g[0]!, g[1]! - g[0]!];
    case 3:
      return [g[0]!, 2 * (g[1]! - g[0]!), g[0]! - 2 * g[1]! + g[2]!];
    default:
      return [
        g[0]!,
        3 * (g[1]! - g[0]!),
        3 * (g[0]! - 2 * g[1]! + g[2]!),
        -g[0]! + 3 * g[1]! - 3 * g[2]! + g[3]!,
      ];
  }
}

/** The segment's unit direction leaving its start (`atEnd` false) or arriving at its end. */
export function segmentDirection(seg: Bez2, atEnd: boolean): P2 {
  const n = seg.degree;
  const pts = Array.from({ length: n + 1 }, (_, i) => controlPoint(seg, i));
  const order = atEnd ? pts.slice().reverse() : pts;
  for (let i = 1; i <= n; i++) {
    const dx = order[i]![0] - order[0]![0];
    const dy = order[i]![1] - order[0]![1];
    const length = Math.hypot(dx, dy);
    if (length > 1e-14) {
      const s = atEnd ? -1 : 1;
      return [(s * dx) / length, (s * dy) / length];
    }
  }
  return [1, 0];
}

// --- the fit ----------------------------------------------------------------------

/** An arc of the ellipse c + cos t·e1 + sin t·e2 from a to b (at most a quarter turn). */
function arc(c: P2, e1: P2, e2: P2, a: number, b: number): Bez2 {
  const at = (t: number): P2 => [
    c[0] + Math.cos(t) * e1[0] + Math.sin(t) * e2[0],
    c[1] + Math.cos(t) * e1[1] + Math.sin(t) * e2[1],
  ];
  const half = (b - a) / 2;
  const w = Math.cos(half);
  const mid = at((a + b) / 2);
  const p0 = at(a);
  const p2 = at(b);
  // The control point is the middle point scaled out: c + (mid − c) / w.
  const p1: P2 = [c[0] + (mid[0] - c[0]) / w, c[1] + (mid[1] - c[1]) / w];
  return {
    degree: 2,
    pts: Float64Array.of(
      p0[0],
      p0[1],
      1,
      p1[0] * w,
      p1[1] * w,
      w,
      p2[0],
      p2[1],
      1,
    ),
  };
}

function distanceToCubic(p: readonly P2[], q: P2): number {
  const at = (t: number): P2 => {
    const s = 1 - t;
    const a = s * s * s;
    const b = 3 * s * s * t;
    const c = 3 * s * t * t;
    const d = t * t * t;
    return [
      a * p[0]![0] + b * p[1]![0] + c * p[2]![0] + d * p[3]![0],
      a * p[0]![1] + b * p[1]![1] + c * p[2]![1] + d * p[3]![1],
    ];
  };
  let best = Infinity;
  let bestT = 0;
  const N = 32;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const x = at(t);
    const d = (x[0] - q[0]) ** 2 + (x[1] - q[1]) ** 2;
    if (d < best) {
      best = d;
      bestT = t;
    }
  }
  let lo = Math.max(0, bestT - 1 / N);
  let hi = Math.min(1, bestT + 1 / N);
  const phi = (Math.sqrt(5) - 1) / 2;
  const f = (t: number) => {
    const x = at(t);
    return (x[0] - q[0]) ** 2 + (x[1] - q[1]) ** 2;
  };
  let x1 = hi - phi * (hi - lo);
  let x2 = lo + phi * (hi - lo);
  let f1 = f(x1);
  let f2 = f(x2);
  for (let i = 0; i < 40; i++) {
    if (f1 < f2) {
      hi = x2;
      x2 = x1;
      f2 = f1;
      x1 = hi - phi * (hi - lo);
      f1 = f(x1);
    } else {
      lo = x1;
      x1 = x2;
      f1 = f2;
      x2 = lo + phi * (hi - lo);
      f2 = f(x2);
    }
  }
  return Math.sqrt(Math.min(best, f1, f2));
}

/** Where a fit samples the curve between its ends. */
const SAMPLES = [0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875];

function fitCubic(
  curve: SectionCurve,
  ta: number,
  tb: number,
  tol: number,
  depth: number,
  out: Bez2[],
  stats: FitStats,
  forceSplit: boolean,
): void {
  const p0 = curve.point(ta);
  const p3 = curve.point(tb);
  const t0 = curve.tangent(ta);
  const t3 = curve.tangent(tb);
  const dx = p3[0] - p0[0];
  const dy = p3[1] - p0[1];
  const chord = Math.hypot(dx, dy);
  const turn = Math.acos(
    Math.min(1, Math.max(-1, t0[0] * t3[0] + t0[1] * t3[1])),
  );
  const forward =
    chord > 0 &&
    (t0[0] * dx + t0[1] * dy) / chord > 0.05 &&
    (t3[0] * dx + t3[1] * dy) / chord > 0.05;
  if (!forceSplit && forward && turn < 1.6) {
    const handle = chord / (3 * Math.cos(turn / 4) ** 2);
    const p1: P2 = [p0[0] + t0[0] * handle, p0[1] + t0[1] * handle];
    const p2: P2 = [p3[0] - t3[0] * handle, p3[1] - t3[1] * handle];
    const net = [p0, p1, p2, p3];
    let worst = 0;
    for (const s of SAMPLES) {
      worst = Math.max(
        worst,
        distanceToCubic(net, curve.point(ta + s * (tb - ta))),
      );
    }
    if (worst <= 0.6 * tol || depth >= MAX_DEPTH) {
      stats.maxError = Math.max(stats.maxError, worst);
      out.push({
        degree: 3,
        pts: Float64Array.of(
          p0[0],
          p0[1],
          1,
          p1[0],
          p1[1],
          1,
          p2[0],
          p2[1],
          1,
          p3[0],
          p3[1],
          1,
        ),
      });
      stats.segments[2]++;
      return;
    }
  }
  const mid = (ta + tb) / 2;
  fitCubic(curve, ta, mid, tol, depth + 1, out, stats, false);
  fitCubic(curve, mid, tb, tol, depth + 1, out, stats, false);
}

/**
 * The curve over [ta, tb] as rational Bézier segments in the plane's (u, v),
 * all of one degree: exact for lines and ellipses, else cubics within `tol`.
 */
export function fitSection(
  curve: SectionCurve,
  ta: number,
  tb: number,
  tol: number,
  stats: FitStats,
): Bez2[] {
  if (curve.line) {
    stats.segments[0]++;
    return [line2(curve.point(ta), curve.point(tb))];
  }
  if (curve.ellipse) {
    const { c, e1, e2 } = curve.ellipse;
    const arcs = Math.max(1, Math.ceil((tb - ta) / (Math.PI / 2) - 1e-9));
    const out: Bez2[] = [];
    for (let i = 0; i < arcs; i++) {
      out.push(
        arc(
          c,
          e1,
          e2,
          ta + ((tb - ta) * i) / arcs,
          ta + ((tb - ta) * (i + 1)) / arcs,
        ),
      );
    }
    stats.segments[1] += arcs;
    return out;
  }
  const out: Bez2[] = [];
  // A full turn or a long span is cut first: a cubic holds a part of a loop.
  const pieces = Math.max(
    1,
    Math.ceil(((tb - ta) / Math.max(curve.t1 - curve.t0, 1e-300)) * 4),
  );
  for (let i = 0; i < pieces; i++) {
    fitCubic(
      curve,
      ta + ((tb - ta) * i) / pieces,
      ta + ((tb - ta) * (i + 1)) / pieces,
      tol,
      0,
      out,
      stats,
      false,
    );
  }
  return out;
}

export { TAU };
