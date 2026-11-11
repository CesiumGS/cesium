// A face's trim as the fragment stage reads it (overall plan §13.33, "Step 5
// redirected", part 2): the loops' pcurves as monotone quadratic pieces in
// horizontal bands of v, so a pixel's inside-or-outside is the winding number
// of a ray along +u, as Slug does for glyphs (Lengyel, "GPU-Centered Font
// Rendering Directly from Glyph Outlines", JCGT 2017), with the fragment
// solving one quadratic per piece in closed form (shaders/coverage.slang is
// the kernel; `trimCovers` here is its float64 twin, on the same words).
//
// Pieces. Each pcurve segment (rational Bézier, degree 1 to 3) is cut at the
// extrema of v, so every part is monotone in v, then fitted by a non-rational
// quadratic that interpolates its ends and middle, halving the part until the
// quadratic is within `tolerance` (u, v units) of the curve at 7 parameters
// (the difference is a cubic at most, which 7 samples bound). A piece is
// stored in ascending v with a sign (+1 where the loop ran up, −1 down), and
// holds the half-open rule: it crosses the ray at v when y0 ≤ v < y2, so a
// ray through a vertex counts one of the two pieces that share it, and a
// local extremum none or both with opposite signs. A loop is closed: where a
// use doesn't end at the next one's start (to the float32 the shader reads),
// a straight piece joins them, as the CPU's polygon does, so the count of a
// ray never depends on a gap. Horizontal pieces cross no ray and are dropped.
//
// Tolerance. The 3D deviation a piece may add is the least of the face's edge
// tolerances and 1e-5 of the face's size, which in (u, v) is that over
// hypot(speed_u, speed_v): the largest |∂P/∂u| and |∂P/∂v| over the face
// (`GpuSpan.speed`), whose Frobenius norm bounds the Jacobian's, so a deviation
// of e in (u, v) moves a point by at most hypot(speeds) · e. It is not smaller
// than 2e-7 of the rect's larger side, a few float32 steps, which the shader's
// coordinates cannot hold anyway.
//
// Bands. They split the rect's v evenly (B of 1 to 64, doubled while the mean
// pieces a band lists is above 2.5 and the doubling helps), and list each piece
// that overlaps, longest reach in u first, so the fragment stops at the first
// whose reach is short of it. A band no piece overlaps holds one winding for
// all of it, from the CPU's classification of its middle (an empty band is
// outside for closed loops, so 0; the CPU's answer also holds a band of a
// periodic face whose loops are not closed in (u, v)).
//
// Words, all offsets in words from the data's first (the span records'
// `trim` word is the data's offset in the draw's table, and a fragment reads
// the arena at record + offset). u32 unless marked f32:
//   0       bands B
//   1       f32 B / the rect's v extent (a fragment's band is floor(v · this))
//   2       pieces S
//   3       0
//   4 + 3 b band b: where its list starts, its count, its winding (i32)
//   then    the lists: each entry a piece's offset
//   then    S pieces of 8: f32 x0, y0, x1, y1, x2, y2 (relative to the rect's
//           lowest u and v), the largest of x0, x1, x2, and the sign (f32 ±1).

import type { BrepForm } from "./form.ts";

/** Words before the band records. */
export const TRIM_HEADER_WORDS = 4;
/** Words of a band record. */
export const TRIM_BAND_WORDS = 3;
/** Words of a piece. */
export const TRIM_SEGMENT_WORDS = 8;
/** The most bands a face has. */
export const MAX_TRIM_BANDS = 64;
/** Bands double while a band lists more pieces than this on average. */
const TARGET_PER_BAND = 2.5;
/** A band's range holds a piece's reach this far over, as a share of the rect's v extent (float32 rounding of the band's index). */
const BAND_PAD = 1e-5;
/** The most times one pcurve segment is halved. */
const MAX_DEPTH = 12;
/** The most pieces one pcurve segment becomes. */
const MAX_PIECES = 4096;

type Box = readonly [number, number, number, number];
type H = [number, number, number];

/** A face's trim data for the GPU. */
export interface FaceTrimData {
  /** The words (see above): offsets are relative to the first. */
  readonly words: Uint32Array;
  readonly bands: number;
  /** Quadratic pieces. */
  readonly pieces: number;
  /** The most and the mean pieces a band lists. */
  readonly maxPerBand: number;
  readonly meanPerBand: number;
  /** The deviation the pieces may add, and the most they did, in (u, v) units. */
  readonly tolerance: number;
  readonly error: number;
}

/** What a trim's tolerance comes from. */
export interface TrimToleranceInput {
  /** The face's loops' edge tolerances, m (the least counts). */
  readonly edgeTolerances: Iterable<number>;
  /** The face's size, m: the diameter of its bounding sphere. */
  readonly size: number;
  /** The largest |∂P/∂u| and |∂P/∂v| over the face, m per unit. */
  readonly speed: readonly [number, number];
  /** The rect's sides in (u, v). */
  readonly rect: Box;
}

/** The deviation a trim piece may add: m, and in (u, v) units (see the top). */
export function trimTolerance(input: TrimToleranceInput): {
  meters: number;
  uv: number;
} {
  let meters = 1e-5 * input.size;
  for (const t of input.edgeTolerances) {
    if (t > 0) {
      meters = Math.min(meters, t);
    }
  }
  const extent = Math.max(
    input.rect[1] - input.rect[0],
    input.rect[3] - input.rect[2],
  );
  const speed = Math.hypot(input.speed[0], input.speed[1]);
  const uv = speed > 0 ? meters / speed : 1e-5 * extent;
  return { meters, uv: Math.max(uv, 2e-7 * extent) };
}

// Curves.

function lerp(a: H, b: H, t: number): H {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
}

/** De Casteljau split of homogeneous control points; the middle point is shared. */
function split(p: readonly H[], t: number): [H[], H[]] {
  const left: H[] = [];
  const right: H[] = [];
  let level: H[] = p.map((q) => [...q]);
  left.push(level[0]!);
  right.unshift(level[level.length - 1]!);
  while (level.length > 1) {
    const next: H[] = [];
    for (let i = 0; i + 1 < level.length; i++) {
      next.push(lerp(level[i]!, level[i + 1]!, t));
    }
    level = next;
    left.push(level[0]!);
    right.unshift(level[level.length - 1]!);
  }
  return [left, right];
}

/** The Bézier polynomial of control values `v` (a degree of 0 to 3) at t. */
function bezier(v: ArrayLike<number>, t: number): number {
  const s = 1 - t;
  switch (v.length) {
    case 1:
      return v[0]!;
    case 2:
      return s * v[0]! + t * v[1]!;
    case 3:
      return s * s * v[0]! + 2 * s * t * v[1]! + t * t * v[2]!;
    default:
      return (
        s * s * s * v[0]! +
        3 * s * s * t * v[1]! +
        3 * s * t * t * v[2]! +
        t * t * t * v[3]!
      );
  }
}

/** A curve: writes its point and derivative at t as x, y, dx, dy. */
type Curve = (t: number, out: Float64Array) => void;

function rational(p: readonly H[]): Curve {
  const n = p.length - 1;
  const x = Float64Array.from(p, (q) => q[0]);
  const y = Float64Array.from(p, (q) => q[1]);
  const w = Float64Array.from(p, (q) => q[2]);
  const d = (v: Float64Array): Float64Array =>
    v.slice(1).map((q, i) => n * (q - v[i]!));
  const dx = d(x);
  const dy = d(y);
  const dw = d(w);
  return (t, out) => {
    const h = bezier(w, t);
    const px = bezier(x, t) / h;
    const py = bezier(y, t) / h;
    const q = bezier(dw, t);
    out[0] = px;
    out[1] = py;
    out[2] = (bezier(dx, t) - px * q) / h;
    out[3] = (bezier(dy, t) - py * q) / h;
  };
}

function point(p: readonly H[], t: number): [number, number] {
  const out = new Float64Array(4);
  rational(p)(t, out);
  return [out[0]!, out[1]!];
}

function quadratic(q: Quad): Curve {
  return (t, out) => {
    const s = 1 - t;
    out[0] = s * s * q[0] + 2 * s * t * q[2] + t * t * q[4];
    out[1] = s * s * q[1] + 2 * s * t * q[3] + t * t * q[5];
    out[2] = 2 * s * (q[2] - q[0]) + 2 * t * (q[4] - q[2]);
    out[3] = 2 * s * (q[3] - q[1]) + 2 * t * (q[5] - q[3]);
  };
}

const scratch = new Float64Array(4);

/** The distance from (x, y) to the curve over [0, 1]: the nearest of 5 samples, then Gauss–Newton steps. */
function distanceTo(curve: Curve, x: number, y: number): number {
  const c = scratch;
  let t = 0;
  let best = Infinity;
  for (let k = 0; k <= 4; k++) {
    curve(k / 4, c);
    const d = Math.hypot(c[0]! - x, c[1]! - y);
    if (d < best) {
      best = d;
      t = k / 4;
    }
  }
  for (let i = 0; i < 3; i++) {
    curve(t, c);
    const speed = c[2]! * c[2]! + c[3]! * c[3]!;
    if (speed === 0) {
      break;
    }
    t = Math.min(
      Math.max(t - ((c[0]! - x) * c[2]! + (c[1]! - y) * c[3]!) / speed, 0),
      1,
    );
    curve(t, c);
    best = Math.min(best, Math.hypot(c[0]! - x, c[1]! - y));
  }
  return best;
}

/**
 * How far two curves are apart, each sampled at 11 parameters against the
 * other; stops at the first sample beyond `limit` and returns it.
 */
function apart(a: Curve, b: Curve, limit: number): number {
  const p = new Float64Array(4);
  const q = new Float64Array(4);
  let worst = 0;
  for (let k = 1; k < 12; k++) {
    a(k / 12, p);
    b(k / 12, q);
    worst = Math.max(
      worst,
      distanceTo(b, p[0]!, p[1]!),
      distanceTo(a, q[0]!, q[1]!),
    );
    if (worst > limit) {
      break;
    }
  }
  return worst;
}

/** The parameters in (0, 1) where v turns around, from sign changes of v'(t)'s numerator at 32 steps, bisected. */
function turns(p: readonly H[]): number[] {
  const n = p.length - 1;
  if (n < 2) {
    return [];
  }
  const y = p.map((q) => q[1]);
  const w = p.map((q) => q[2]);
  const dy = y.slice(1).map((q, i) => n * (q - y[i]!));
  const dw = w.slice(1).map((q, i) => n * (q - w[i]!));
  const g = (t: number): number =>
    bezier(dy, t) * bezier(w, t) - bezier(y, t) * bezier(dw, t);
  const steps = 32;
  const out: number[] = [];
  let prevT = 0;
  let prev = g(0);
  for (let k = 1; k <= steps; k++) {
    const t = k / steps;
    const value = g(t);
    if (prev !== 0 && value !== 0 && prev < 0 !== value < 0) {
      let lo = prevT;
      let hi = t;
      const loNegative = prev < 0;
      for (let i = 0; i < 50; i++) {
        const mid = (lo + hi) / 2;
        if (g(mid) < 0 === loNegative) {
          lo = mid;
        } else {
          hi = mid;
        }
      }
      const root = (lo + hi) / 2;
      if (root > 0 && root < 1) {
        out.push(root);
      }
    }
    prevT = t;
    prev = value;
  }
  return out;
}

/** A quadratic: x0, y0, x1, y1, x2, y2. */
type Quad = [number, number, number, number, number, number];

/**
 * Fits a monotone part by quadratics, halving it until each is within
 * `tolerance` of it (as curves, not at equal parameters); the largest
 * deviation is `state.error`. A quadratic's middle control point is the
 * intersection of the part's end tangents, or else the one that passes
 * through the part's middle, whichever is nearer.
 */
function fit(
  part: readonly H[],
  tolerance: number,
  depth: number,
  out: Quad[],
  state: { error: number },
): void {
  const [x0, y0] = point(part, 0);
  const [x2, y2] = point(part, 1);
  if (part.length === 2) {
    out.push([x0, y0, (x0 + x2) / 2, (y0 + y2) / 2, x2, y2]);
    return;
  }
  const curve = rational(part);
  const lo = Math.min(y0, y2);
  const hi = Math.max(y0, y2);
  const n = part.length - 1;
  const d1: [number, number] = [
    part[1]![0] / part[1]![2],
    part[1]![1] / part[1]![2],
  ];
  const dn: [number, number] = [
    part[n - 1]![0] / part[n - 1]![2],
    part[n - 1]![1] / part[n - 1]![2],
  ];
  const candidates: [number, number][] = [];
  const t0: [number, number] = [d1[0] - x0, d1[1] - y0];
  const t1: [number, number] = [x2 - dn[0], y2 - dn[1]];
  const det = t0[0] * t1[1] - t0[1] * t1[0];
  if (Math.abs(det) > 1e-9 * Math.hypot(...t0) * Math.hypot(...t1)) {
    const dx = x2 - x0;
    const dy = y2 - y0;
    const a = (dx * t1[1] - dy * t1[0]) / det;
    const b = (t0[0] * dy - t0[1] * dx) / det;
    if (a >= 0 && b >= 0 && a <= 4 && b <= 4) {
      candidates.push([x0 + a * t0[0], y0 + a * t0[1]]);
    }
  }
  const [mx, my] = point(part, 0.5);
  candidates.push([2 * mx - (x0 + x2) / 2, 2 * my - (y0 + y2) / 2]);
  let best: Quad | undefined;
  let error = Infinity;
  for (const [x1, y1] of candidates) {
    const q: Quad = [x0, y0, x1, Math.min(Math.max(y1, lo), hi), x2, y2];
    const limit = depth >= MAX_DEPTH ? Infinity : Math.min(error, tolerance);
    const e = apart(curve, quadratic(q), limit);
    if (e < error) {
      error = e;
      best = q;
    }
    if (error <= tolerance) {
      break;
    }
  }
  if (error <= tolerance || depth >= MAX_DEPTH || out.length >= MAX_PIECES) {
    state.error = Math.max(state.error, error);
    out.push(best!);
    return;
  }
  const [a, b] = split(part, 0.5);
  fit(a, tolerance, depth + 1, out, state);
  fit(b, tolerance, depth + 1, out, state);
}

/** Cuts a segment at its turns in v: its monotone parts, in order. */
function monotoneParts(segment: readonly H[]): H[][] {
  const parts: H[][] = [];
  let rest = segment.map((q): H => [...q]);
  let from = 0;
  for (const t of turns(segment)) {
    const [a, b] = split(rest, (t - from) / (1 - from));
    parts.push(a);
    rest = b;
    from = t;
  }
  parts.push(rest);
  return parts;
}

// Bands.

interface Piece {
  /** Relative to the rect's corner, float32 values: x0, y0, x1, y1, x2, y2. */
  readonly c: readonly [number, number, number, number, number, number];
  readonly sign: 1 | -1;
  readonly reach: number;
}

/** The trim data of a face with the loops `form` gives it, over the rect (u0, u1, v0, v1). `inside` is the CPU's classification (for bands no piece crosses). */
export function buildFaceTrim(
  form: BrepForm,
  face: number,
  rect: Box,
  tolerance: number,
  inside: (u: number, v: number) => boolean,
): FaceTrimData {
  const round = Math.fround;
  const u0 = rect[0];
  const v0 = rect[2];
  const pieces: Piece[] = [];
  const state = { error: 0 };
  const relative = (x: number, y: number): [number, number] => [
    round(x - u0),
    round(y - v0),
  ];
  const add = (q: Quad): void => {
    const [ax, ay] = relative(q[0], q[1]);
    const [cx, cy] = relative(q[4], q[5]);
    if (ay === cy) {
      return;
    }
    const [bx, by0] = relative(q[2], q[3]);
    const up = ay < cy;
    const by = Math.min(Math.max(by0, Math.min(ay, cy)), Math.max(ay, cy));
    const c: Piece["c"] = up
      ? [ax, ay, bx, by, cx, cy]
      : [cx, cy, bx, by, ax, ay];
    pieces.push({
      c,
      sign: up ? 1 : -1,
      reach: Math.max(c[0], c[2], c[4]),
    });
  };
  const c2 = form.curves2;
  const firstLoop = form.faceLoops[face * 2]!;
  const loops = form.faceLoops[face * 2 + 1]!;
  for (let loop = firstLoop; loop < firstLoop + loops; loop++) {
    const firstUse = form.loopUses[loop * 2]!;
    const uses = form.loopUses[loop * 2 + 1]!;
    let start: [number, number] | undefined;
    let last: [number, number] | undefined;
    const join = (to: [number, number]): void => {
      if (last) {
        const a = relative(last[0], last[1]);
        const b = relative(to[0], to[1]);
        if (a[0] !== b[0] || a[1] !== b[1]) {
          add([
            last[0],
            last[1],
            (last[0] + to[0]) / 2,
            (last[1] + to[1]) / 2,
            to[0],
            to[1],
          ]);
        }
      }
    };
    for (let use = firstUse; use < firstUse + uses; use++) {
      const first = form.usePcurve[use * 2]!;
      const count = form.usePcurve[use * 2 + 1]!;
      for (let segment = first; segment < first + count; segment++) {
        const degree = c2.degree[segment]!;
        const at = c2.first[segment]! * 3;
        const hom: H[] = [];
        for (let k = 0; k <= degree; k++) {
          hom.push([
            c2.points[at + k * 3]!,
            c2.points[at + k * 3 + 1]!,
            c2.points[at + k * 3 + 2]!,
          ]);
        }
        const a: [number, number] = [
          hom[0]![0] / hom[0]![2],
          hom[0]![1] / hom[0]![2],
        ];
        const e = hom[degree]!;
        const b: [number, number] = [e[0] / e[2], e[1] / e[2]];
        join(a);
        start ??= a;
        const quads: Quad[] = [];
        for (const part of monotoneParts(hom)) {
          fit(part, tolerance, 0, quads, state);
        }
        for (const q of quads) {
          add(q);
        }
        last = b;
      }
    }
    if (start) {
      join(start);
    }
  }
  return assemble(pieces, rect, tolerance, state.error, inside);
}

function assemble(
  pieces: readonly Piece[],
  rect: Box,
  tolerance: number,
  error: number,
  inside: (u: number, v: number) => boolean,
): FaceTrimData {
  const round = Math.fround;
  const height = rect[3] - rect[2];
  const pad = BAND_PAD * height;
  const bandsOf = (count: number): { low: number[]; high: number[] } => {
    const scale = height > 0 ? count / height : 0;
    const at = (v: number): number =>
      Math.min(Math.max(Math.floor(v * scale), 0), count - 1);
    return {
      low: pieces.map((p) => at(p.c[1] - pad)),
      high: pieces.map((p) => at(p.c[5] + pad)),
    };
  };
  const mean = (count: number): number => {
    const { low, high } = bandsOf(count);
    let total = 0;
    for (let i = 0; i < pieces.length; i++) {
      total += high[i]! - low[i]! + 1;
    }
    return total / count;
  };
  let bands = 1;
  if (height > 0) {
    let current = mean(1);
    while (current > TARGET_PER_BAND && bands < MAX_TRIM_BANDS) {
      const next = mean(bands * 2);
      if (next > 0.85 * current) {
        break;
      }
      bands *= 2;
      current = next;
    }
  }
  const { low, high } = bandsOf(bands);
  const lists: number[][] = Array.from({ length: bands }, () => []);
  for (let i = 0; i < pieces.length; i++) {
    for (let b = low[i]!; b <= high[i]!; b++) {
      lists[b]!.push(i);
    }
  }
  for (const list of lists) {
    list.sort((a, b) => pieces[b]!.reach - pieces[a]!.reach);
  }
  const entries = lists.reduce((n, l) => n + l.length, 0);
  const listsStart = TRIM_HEADER_WORDS + TRIM_BAND_WORDS * bands;
  const piecesStart = listsStart + entries;
  const words = new Uint32Array(
    piecesStart + TRIM_SEGMENT_WORDS * pieces.length,
  );
  const f32 = new Float32Array(words.buffer);
  words[0] = bands;
  f32[1] = height > 0 ? bands / height : 0;
  words[2] = pieces.length;
  let at = listsStart;
  let maxPerBand = 0;
  const middleU = (rect[0] + rect[1]) / 2;
  lists.forEach((list, b) => {
    const record = TRIM_HEADER_WORDS + TRIM_BAND_WORDS * b;
    words[record] = at;
    words[record + 1] = list.length;
    if (list.length === 0) {
      const middleV = rect[2] + (height * (b + 0.5)) / bands;
      words[record + 2] = inside(middleU, middleV) ? 1 : 0;
    }
    maxPerBand = Math.max(maxPerBand, list.length);
    for (const i of list) {
      words[at++] = piecesStart + TRIM_SEGMENT_WORDS * i;
    }
  });
  pieces.forEach((p, i) => {
    const o = piecesStart + TRIM_SEGMENT_WORDS * i;
    for (let k = 0; k < 6; k++) {
      f32[o + k] = p.c[k]!;
    }
    f32[o + 6] = round(p.reach);
    f32[o + 7] = p.sign;
  });
  return {
    words,
    bands,
    pieces: pieces.length,
    maxPerBand,
    meanPerBand: entries / bands,
    tolerance,
    error,
  };
}

// The fragment's test, in float64 on the same words.

/**
 * The winding number of a ray along +u from `(u, v)` (relative to the rect's
 * corner) over the pieces of the data at `base` in `words`, and the distance
 * to the nearest crossing on either side up to `reach` (Infinity beyond):
 * shaders/coverage.slang `trimCrossings`.
 */
export function trimCrossings(
  words: Uint32Array,
  base: number,
  u: number,
  v: number,
  reach: number,
): { winding: number; nearest: number } {
  const f32 = new Float32Array(words.buffer, words.byteOffset, words.length);
  const bands = words[base]!;
  const scale = f32[base + 1]!;
  const band = Math.min(Math.max(Math.floor(v * scale), 0), bands - 1);
  const record = base + TRIM_HEADER_WORDS + band * TRIM_BAND_WORDS;
  const list = base + words[record]!;
  const count = words[record + 1]!;
  if (count === 0) {
    return { winding: words[record + 2]! | 0, nearest: Infinity };
  }
  let winding = 0;
  let nearest = Infinity;
  for (let i = 0; i < count; i++) {
    const s = base + words[list + i]!;
    if (f32[s + 6]! < u - reach) {
      break;
    }
    const y0 = f32[s + 1]! - v;
    const y1 = f32[s + 3]! - v;
    const y2 = f32[s + 5]! - v;
    if (y0 > 0 || y2 <= 0) {
      continue;
    }
    const a = y0 - 2 * y1 + y2;
    const b = y0 - y1;
    const d = Math.sqrt(Math.max(b * b - a * y0, 0));
    const q = b + (b < 0 ? -d : d);
    const t1 = Math.abs(a) > 1e-30 ? q / a : 1e30;
    const t2 = q !== 0 ? y0 / q : 0;
    const e1 = Math.abs(t1 - Math.min(Math.max(t1, 0), 1));
    const e2 = Math.abs(t2 - Math.min(Math.max(t2, 0), 1));
    const t = Math.min(Math.max(e1 <= e2 ? t1 : t2, 0), 1);
    const s1 = 1 - t;
    const x =
      s1 * s1 * (f32[s]! - u) +
      2 * s1 * t * (f32[s + 2]! - u) +
      t * t * (f32[s + 4]! - u);
    nearest = Math.min(nearest, Math.abs(x));
    if (x > 0) {
      winding += f32[s + 7]! > 0 ? 1 : -1;
    }
  }
  return { winding, nearest };
}

/**
 * Whether a fragment at `(u, v)` (relative to the rect's corner) is kept:
 * inside by the winding rule, or within `reachU` along u or `reachV` along v
 * of the boundary (shaders/coverage.slang `trimCovers`). Along u the
 * nearest crossing on the ray decides; along v the winding at (u, v ± reachV).
 * With the reaches half a pixel, the dilation is that, to a half-pixel
 * Chebyshev distance at most.
 */
export function trimCovers(
  words: Uint32Array,
  base: number,
  u: number,
  v: number,
  reachU: number,
  reachV: number,
): boolean {
  const here = trimCrossings(words, base, u, v, reachU);
  if (here.winding !== 0 || here.nearest <= reachU) {
    return true;
  }
  return (
    trimCrossings(words, base, u, v + reachV, 0).winding !== 0 ||
    trimCrossings(words, base, u, v - reachV, 0).winding !== 0
  );
}
