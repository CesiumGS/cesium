// Queries on rational Bézier patches and curve segments (overall plan §13.33,
// the b-rep adapter): a ray against a patch by subdivision and Newton, the
// nearest point of a patch by branch and bound with Newton at the
// leaves, and the nearest point of a curve segment. A patch point is a convex
// combination of its control points for positive weights, so the control
// net's box holds the patch, and cutting the net (de Casteljau) tightens it.
// Coordinates are the form's, in m; s and t are the patch's local parameters.
import { netOf, restrictNet, type Net } from "./bounds.ts";
import { evaluatePatch } from "./bezier.ts";
import type { BrepForm } from "./form.ts";

export type V3 = [number, number, number];

/** The deepest a patch is cut. */
const MAX_DEPTH = 9;
/** Cells are leaves once their box is this share of the patch's diagonal. */
const LEAF_SHARE = 1 / 16;
/** The most cells one query looks at in one patch, a bound on the work. */
const MAX_CELLS = 20_000;
const NEWTON_STEPS = 24;

/** A patch's part, as a net over [0, 1]² and where that lies in the patch's (s, t). */
export interface PatchPart {
  readonly patch: number;
  readonly net: Net;
  /** s0, s1, t0, t1 */
  readonly rect: readonly [number, number, number, number];
  /** The diagonal of the part's box, m. */
  readonly size: number;
}

/** The box of a net's control points (x/w, y/w, z/w): min then max. */
export function netBox(net: Net): number[] {
  const out = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
  const points = (net.du + 1) * (net.dv + 1);
  for (let i = 0; i < points; i++) {
    const w = net.h[i * 4 + 3]!;
    for (let k = 0; k < 3; k++) {
      const x = net.h[i * 4 + k]! / w;
      out[k] = Math.min(out[k]!, x);
      out[3 + k] = Math.max(out[3 + k]!, x);
    }
  }
  return out;
}

/** The part of a patch over a rect of its (s, t). */
export function patchPart(
  form: BrepForm,
  patch: number,
  rect: readonly [number, number, number, number],
): PatchPart {
  const whole = rect[0] <= 0 && rect[1] >= 1 && rect[2] <= 0 && rect[3] >= 1;
  const net0 = netOf(form, patch);
  const net = whole
    ? net0
    : restrictNet(net0, rect[0], rect[1], rect[2], rect[3]);
  const box = netBox(net);
  return {
    patch,
    net,
    rect: whole ? [0, 1, 0, 1] : rect,
    size: Math.hypot(box[3]! - box[0]!, box[4]! - box[1]!, box[5]! - box[2]!),
  };
}

/** The four quarters of a net, with their rects within the net's own [0, 1]². */
function quarters(net: Net): Array<{ net: Net; a: number; b: number }> {
  const out: Array<{ net: Net; a: number; b: number }> = [];
  for (let b = 0; b < 2; b++) {
    for (let a = 0; a < 2; a++) {
      out.push({
        net: restrictNet(net, a / 2, (a + 1) / 2, b / 2, (b + 1) / 2),
        a,
        b,
      });
    }
  }
  return out;
}

const dot = (a: ArrayLike<number>, b: ArrayLike<number>): number =>
  a[0]! * b[0]! + a[1]! * b[1]! + a[2]! * b[2]!;

/** Solves the 3×3 system by Cramer's rule; undefined when singular. */
function solve3(
  c0: ArrayLike<number>,
  c1: ArrayLike<number>,
  c2: ArrayLike<number>,
  b: ArrayLike<number>,
): V3 | undefined {
  const cross = (x: ArrayLike<number>, y: ArrayLike<number>): V3 => [
    x[1]! * y[2]! - x[2]! * y[1]!,
    x[2]! * y[0]! - x[0]! * y[2]!,
    x[0]! * y[1]! - x[1]! * y[0]!,
  ];
  const det = dot(c0, cross(c1, c2));
  const scale =
    Math.hypot(...(c0 as V3)) *
    Math.hypot(...(c1 as V3)) *
    Math.hypot(...(c2 as V3));
  if (!(Math.abs(det) > 1e-12 * scale)) {
    return undefined;
  }
  return [
    dot(b, cross(c1, c2)) / det,
    dot(c0, cross(b, c2)) / det,
    dot(c0, cross(c1, b)) / det,
  ];
}

/** A point where a ray meets a patch. */
export interface PatchRayHit {
  readonly t: number;
  readonly s: number;
  readonly tt: number;
}

export interface PatchRayResult {
  readonly hit: PatchRayHit | undefined;
  /** Cells whose Newton iteration came close to a crossing without settling. */
  readonly unsettled: number;
}

/**
 * The nearest crossing of the segment `from + t·d`, t in [tMin, limit], with
 * a patch's part for which `accept(s, t)` holds (the face's trim). Cells are
 * cut until their box is small, nearest entry first, and each small cell
 * seeds Newton's method on S(s, t) = from + t·d.
 */
export function rayPatch(
  form: BrepForm,
  part: PatchPart,
  from: ArrayLike<number>,
  d: ArrayLike<number>,
  tMin: number,
  tMax: number,
  accept: (s: number, t: number) => boolean,
): PatchRayResult {
  const { patch } = part;
  const first = form.patchFirst[patch]!;
  const du = form.patchDegree[patch * 2]!;
  const dv = form.patchDegree[patch * 2 + 1]!;
  const dd = dot(d, d);
  const leaf = part.size * LEAF_SHARE;
  const ftol = 1e-11 * Math.max(part.size, 1e-3);
  let best: PatchRayHit | undefined;
  let limit = tMax;
  let cells = 0;
  let unsettled = 0;

  const newton = (s: number, t: number): PatchRayHit | undefined => {
    const start = evaluatePatch(form.patchPoints, first, du, dv, s, t).position;
    let tau =
      ((start[0]! - from[0]!) * d[0]! +
        (start[1]! - from[1]!) * d[1]! +
        (start[2]! - from[2]!) * d[2]!) /
      dd;
    let residual = Infinity;
    for (let step = 0; step < NEWTON_STEPS; step++) {
      const sample = evaluatePatch(form.patchPoints, first, du, dv, s, t);
      const f = [
        sample.position[0]! - from[0]! - tau * d[0]!,
        sample.position[1]! - from[1]! - tau * d[1]!,
        sample.position[2]! - from[2]! - tau * d[2]!,
      ];
      residual = Math.hypot(f[0]!, f[1]!, f[2]!);
      if (residual <= ftol) {
        break;
      }
      const delta = solve3(
        sample.du,
        sample.dv,
        [-d[0]!, -d[1]!, -d[2]!],
        [-f[0]!, -f[1]!, -f[2]!],
      );
      if (!delta) {
        return undefined;
      }
      // Keep (s, t) in the patch, a little beyond so a root on its edge settles.
      s = Math.min(Math.max(s + delta[0], -1e-6), 1 + 1e-6);
      t = Math.min(Math.max(t + delta[1], -1e-6), 1 + 1e-6);
      tau += delta[2];
    }
    if (!(residual <= ftol)) {
      const end = evaluatePatch(form.patchPoints, first, du, dv, s, t).position;
      const left = Math.hypot(
        end[0]! - from[0]! - tau * d[0]!,
        end[1]! - from[1]! - tau * d[1]!,
        end[2]! - from[2]! - tau * d[2]!,
      );
      if (left > 1e-6 * leaf) {
        return undefined;
      }
      unsettled++;
      return undefined;
    }
    const e = 1e-9;
    if (s < -e || s > 1 + e || t < -e || t > 1 + e) {
      return undefined;
    }
    if (!(tau >= tMin - e && tau <= limit + e)) {
      return undefined;
    }
    const sc = Math.min(Math.max(s, 0), 1);
    const tc = Math.min(Math.max(t, 0), 1);
    return accept(sc, tc)
      ? { t: Math.min(Math.max(tau, tMin), limit), s: sc, tt: tc }
      : undefined;
  };

  const visit = (
    net: Net,
    a0: number,
    a1: number,
    b0: number,
    b1: number,
    depth: number,
  ): void => {
    if (cells++ > MAX_CELLS) {
      return;
    }
    const box = netBox(net);
    const size = Math.hypot(
      box[3]! - box[0]!,
      box[4]! - box[1]!,
      box[5]! - box[2]!,
    );
    if (size <= leaf || depth >= MAX_DEPTH) {
      // The cell's centre, in the patch's own (s, t).
      const found = newton((a0 + a1) / 2, (b0 + b1) / 2);
      if (found && (best === undefined || found.t < best.t)) {
        best = found;
        limit = found.t;
      }
      return;
    }
    const kids = quarters(net)
      .map((q) => {
        const lo = [a0 + ((a1 - a0) * q.a) / 2, b0 + ((b1 - b0) * q.b) / 2];
        const hi = [lo[0]! + (a1 - a0) / 2, lo[1]! + (b1 - b0) / 2];
        return { q, lo, hi, entry: enter(netBox(q.net), from, d, tMin, limit) };
      })
      .filter((k) => k.entry !== undefined)
      .sort((x, y) => x.entry! - y.entry!);
    for (const k of kids) {
      if (k.entry! > limit) {
        break;
      }
      visit(k.q.net, k.lo[0]!, k.hi[0]!, k.lo[1]!, k.hi[1]!, depth + 1);
    }
  };

  const [s0, s1, t0, t1] = part.rect;
  if (enter(netBox(part.net), from, d, tMin, limit) !== undefined) {
    visit(part.net, s0, s1, t0, t1, 0);
  }
  return { hit: best, unsettled: best ? 0 : unsettled };
}

/** Where the segment enters a box (min then max) within [tMin, tMax], or undefined. */
function enter(
  box: readonly number[],
  from: ArrayLike<number>,
  d: ArrayLike<number>,
  tMin: number,
  tMax: number,
): number | undefined {
  let near = tMin;
  let far = tMax;
  for (let k = 0; k < 3; k++) {
    if (d[k] === 0) {
      if (from[k]! < box[k]! || from[k]! > box[3 + k]!) {
        return undefined;
      }
      continue;
    }
    let t0 = (box[k]! - from[k]!) / d[k]!;
    let t1 = (box[3 + k]! - from[k]!) / d[k]!;
    if (t0 > t1) {
      [t0, t1] = [t1, t0];
    }
    near = Math.max(near, t0);
    far = Math.min(far, t1);
    if (near > far) {
      return undefined;
    }
  }
  return near;
}

/** A point of a patch near another, found by `nearestPatch`. */
export interface PatchPoint {
  readonly s: number;
  readonly t: number;
  readonly position: Float64Array;
  readonly distance: number;
}

/** The distance from a point to a box (min then max). */
function boxDistance(box: readonly number[], p: ArrayLike<number>): number {
  let sum = 0;
  for (let k = 0; k < 3; k++) {
    const gap = Math.max(box[k]! - p[k]!, p[k]! - box[3 + k]!, 0);
    sum += gap * gap;
  }
  return Math.sqrt(sum);
}

/**
 * Newton's method on |S(s, t) − p|² from (s, t), with both clamped to the
 * given range, for at most 30 steps; the step is halved until the point is
 * no further off, and falls back to Gauss–Newton, damped for a pole, where
 * the second-order matrix is not positive definite.
 */
export function nearestNewton(
  surface: (
    s: number,
    t: number,
  ) => {
    position: Float64Array;
    du: Float64Array;
    dv: Float64Array;
  },
  p: ArrayLike<number>,
  start: readonly [number, number],
  range: readonly [number, number, number, number],
): { s: number; t: number; position: Float64Array; distance: number } {
  const clamp = (x: number, lo: number, hi: number) =>
    Math.min(Math.max(x, lo), hi);
  let s = clamp(start[0], range[0], range[1]);
  let t = clamp(start[1], range[2], range[3]);
  const residual = (a: number, b: number) => {
    const sample = surface(a, b);
    const r = [
      sample.position[0]! - p[0]!,
      sample.position[1]! - p[1]!,
      sample.position[2]! - p[2]!,
    ];
    return { sample, r, norm: Math.hypot(r[0]!, r[1]!, r[2]!) };
  };
  let now = residual(s, t);
  // Steps for the differences of ∂s and ∂t, kept inside the range.
  const hs = 1e-6 * Math.max(range[1] - range[0], 1e-6);
  const ht = 1e-6 * Math.max(range[3] - range[2], 1e-6);
  for (let step = 0; step < 30 && now.norm > 0; step++) {
    const { du, dv } = now.sample;
    const r = now.r;
    const gu = dot(du, r);
    const gv = dot(dv, r);
    let a = dot(du, du);
    let b = dot(du, dv);
    let c = dot(dv, dv);
    // Newton's matrix adds the residual's share of the curvature, from
    // differences of the derivatives; Gauss–Newton's alone converges slowly
    // when the point is far off the surface.
    const sign = s + hs <= range[1] ? 1 : -1;
    const sideways = surface(s + sign * hs, t);
    const signT = t + ht <= range[3] ? 1 : -1;
    const upwards = surface(s, t + signT * ht);
    const curved = (d1: Float64Array, d0: Float64Array, h: number): number =>
      (r[0]! * (d1[0]! - d0[0]!) +
        r[1]! * (d1[1]! - d0[1]!) +
        r[2]! * (d1[2]! - d0[2]!)) /
      h;
    const newton = {
      a: a + curved(sideways.du, du, sign * hs),
      b: b + curved(sideways.dv, dv, sign * hs),
      c: c + curved(upwards.dv, dv, signT * ht),
    };
    if (newton.a > 0 && newton.a * newton.c - newton.b * newton.b > 0) {
      ({ a, b, c } = newton);
    } else {
      // Not a minimum's neighbourhood: take Gauss–Newton's, damped for a pole.
      const damping = 1e-9 * Math.max(a, c, 1e-300);
      a += damping;
      c += damping;
    }
    const det = a * c - b * b;
    if (!(Math.abs(det) > 0)) {
      break;
    }
    const stepS = -(c * gu - b * gv) / det;
    const stepT = -(a * gv - b * gu) / det;
    let scale = 1;
    let next = now;
    let ns = s;
    let nt = t;
    for (let tries = 0; tries < 8; tries++) {
      ns = clamp(s + stepS * scale, range[0], range[1]);
      nt = clamp(t + stepT * scale, range[2], range[3]);
      next = residual(ns, nt);
      if (next.norm <= now.norm) {
        break;
      }
      scale /= 2;
    }
    if (next.norm > now.norm) {
      break;
    }
    const moved = Math.hypot(ns - s, nt - t);
    s = ns;
    t = nt;
    now = next;
    if (moved < 1e-14) {
      break;
    }
  }
  return { s, t, position: now.sample.position, distance: now.norm };
}

/**
 * The points of a patch's part that are locally nearest `p` within their
 * cells, reported through `offer` as it finds them, cells nearest first. A
 * cell is skipped when its box is farther than `bound()`, so a caller that
 * keeps the best point sees the nearest point of the part. `accept` filters
 * by (s, t) (the face's trim).
 */
export function nearestPatch(
  form: BrepForm,
  part: PatchPart,
  p: ArrayLike<number>,
  bound: () => number,
  accept: (s: number, t: number) => boolean,
  offer: (point: PatchPoint) => void,
): void {
  const { patch } = part;
  const first = form.patchFirst[patch]!;
  const du = form.patchDegree[patch * 2]!;
  const dv = form.patchDegree[patch * 2 + 1]!;
  const leaf = part.size * LEAF_SHARE;
  let cells = 0;
  const surface = (s: number, t: number) =>
    evaluatePatch(form.patchPoints, first, du, dv, s, t);

  const visit = (
    net: Net,
    a0: number,
    a1: number,
    b0: number,
    b1: number,
    depth: number,
  ): void => {
    if (cells++ > MAX_CELLS) {
      return;
    }
    const box = netBox(net);
    const size = Math.hypot(
      box[3]! - box[0]!,
      box[4]! - box[1]!,
      box[5]! - box[2]!,
    );
    if (size <= leaf || depth >= MAX_DEPTH) {
      const found = nearestNewton(
        surface,
        p,
        [(a0 + a1) / 2, (b0 + b1) / 2],
        [a0, a1, b0, b1],
      );
      if (found.distance <= bound() && accept(found.s, found.t)) {
        offer(found);
      }
      return;
    }
    const kids = quarters(net)
      .map((q) => {
        const lo = [a0 + ((a1 - a0) * q.a) / 2, b0 + ((b1 - b0) * q.b) / 2];
        return {
          q,
          lo,
          hi: [lo[0]! + (a1 - a0) / 2, lo[1]! + (b1 - b0) / 2],
          lower: boxDistance(netBox(q.net), p),
        };
      })
      .sort((x, y) => x.lower - y.lower);
    for (const k of kids) {
      if (k.lower > bound()) {
        break;
      }
      visit(k.q.net, k.lo[0]!, k.hi[0]!, k.lo[1]!, k.hi[1]!, depth + 1);
    }
  };

  const [s0, s1, t0, t1] = part.rect;
  if (boxDistance(netBox(part.net), p) <= bound()) {
    visit(part.net, s0, s1, t0, t1, 0);
  }
}
