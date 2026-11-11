// Sound bounds on a rational Bézier patch's derivatives, for the CPU
// tessellator's grid density (overall plan §13.33). Every bound is over the
// patch's local parameters s and t in [0, 1], and holds for any positive
// weights: a patch point is a convex combination of its control points, and
// the Bernstein coefficients of a polynomial bound the polynomial. Bernstein
// bounds tighten as the patch is cut, so each bound is the largest over a
// grid of sub-patches (de Casteljau), scaled back to the whole patch's
// parameters. Lengths are metres and angles are radians.
import type { BrepForm } from "./form.ts";

/** Sub-patches per side: 2 puts a quarter circle's bounds within 0.1% of exact. */
const CUTS = 2;

/** A surface's identity frame: origin, and the unit orthogonal axes x, y and z = x × y. */
export interface Frame {
  readonly origin: readonly [number, number, number];
  readonly x: readonly [number, number, number];
  readonly y: readonly [number, number, number];
  readonly z: readonly [number, number, number];
}

/** The frame a surface's `surfaceFrame` holds. */
export function frameOf(form: BrepForm, surface: number): Frame {
  const f = form.surfaceFrame;
  const at = (k: number): [number, number, number] => [
    f[surface * 9 + k]!,
    f[surface * 9 + k + 1]!,
    f[surface * 9 + k + 2]!,
  ];
  const x = at(3);
  const y = at(6);
  return {
    origin: at(0),
    x,
    y,
    z: [
      x[1] * y[2] - x[2] * y[1],
      x[2] * y[0] - x[0] * y[2],
      x[0] * y[1] - x[1] * y[0],
    ],
  };
}

/** A patch's homogeneous control net: degrees, and x·w, y·w, z·w, w per point with s fastest. */
export interface Net {
  readonly du: number;
  readonly dv: number;
  readonly h: Float64Array;
}

export function netOf(form: BrepForm, patch: number): Net {
  const du = form.patchDegree[patch * 2]!;
  const dv = form.patchDegree[patch * 2 + 1]!;
  const first = form.patchFirst[patch]!;
  const count = (du + 1) * (dv + 1);
  return {
    du,
    dv,
    h: form.patchPoints.slice(first * 4, (first + count) * 4),
  };
}

/** De Casteljau at `tau`: the coefficients of the polynomial on [0, tau] and on [tau, 1], each over [0, 1]. */
function split(a: readonly number[], tau: number): [number[], number[]] {
  const n = a.length - 1;
  const b = a.slice();
  const left = [b[0]!];
  const right = new Array<number>(n + 1);
  right[n] = b[n]!;
  for (let r = 1; r <= n; r++) {
    for (let i = 0; i <= n - r; i++) {
      b[i] = (1 - tau) * b[i]! + tau * b[i + 1]!;
    }
    left.push(b[0]!);
    right[n - r] = b[n - r]!;
  }
  return [left, right];
}

/** The coefficients of the polynomial restricted to [lo, hi], over [0, 1]. */
function restrict(a: readonly number[], lo: number, hi: number): number[] {
  const [left] = split(a, hi);
  return hi > 0 ? split(left, lo / hi)[1] : left;
}

/** The net of the patch's part over [s0, s1] × [t0, t1], reparameterized to [0, 1]². */
export function restrictNet(
  net: Net,
  s0: number,
  s1: number,
  t0: number,
  t1: number,
): Net {
  const { du, dv } = net;
  const h = new Float64Array(net.h.length);
  const line = (n: number): number[] => new Array<number>(n);
  for (let k = 0; k < 4; k++) {
    for (let j = 0; j <= dv; j++) {
      const row = line(du + 1);
      for (let i = 0; i <= du; i++) {
        row[i] = net.h[(j * (du + 1) + i) * 4 + k]!;
      }
      const cut = restrict(row, s0, s1);
      for (let i = 0; i <= du; i++) {
        h[(j * (du + 1) + i) * 4 + k] = cut[i]!;
      }
    }
    for (let i = 0; i <= du; i++) {
      const column = line(dv + 1);
      for (let j = 0; j <= dv; j++) {
        column[j] = h[(j * (du + 1) + i) * 4 + k]!;
      }
      const cut = restrict(column, t0, t1);
      for (let j = 0; j <= dv; j++) {
        h[(j * (du + 1) + i) * 4 + k] = cut[j]!;
      }
    }
  }
  return { du, dv, h };
}

/** The patch's CUTS × CUTS sub-nets. */
function subNets(net: Net): Net[] {
  const out: Net[] = [];
  for (let b = 0; b < CUTS; b++) {
    for (let a = 0; a < CUTS; a++) {
      out.push(
        restrictNet(net, a / CUTS, (a + 1) / CUTS, b / CUTS, (b + 1) / CUTS),
      );
    }
  }
  return out;
}

/** A bivariate Bernstein polynomial of degrees `du` and `dv`: coefficients with s fastest. */
interface Bernstein {
  readonly du: number;
  readonly dv: number;
  readonly c: Float64Array;
}

const BINOMIALS: number[][] = [[1]];

function binomial(n: number, k: number): number {
  while (BINOMIALS.length <= n) {
    const previous = BINOMIALS[BINOMIALS.length - 1]!;
    const row = [1];
    for (let i = 1; i < previous.length; i++) {
      row.push(previous[i - 1]! + previous[i]!);
    }
    row.push(1);
    BINOMIALS.push(row);
  }
  return BINOMIALS[n]![k]!;
}

/** The product, by b^m_i · b^n_j = C(m, i) C(n, j) / C(m + n, i + j) · b^(m+n)_(i+j) in each direction. */
function multiply(a: Bernstein, b: Bernstein): Bernstein {
  const du = a.du + b.du;
  const dv = a.dv + b.dv;
  const c = new Float64Array((du + 1) * (dv + 1));
  for (let j = 0; j <= a.dv; j++) {
    for (let l = 0; l <= b.dv; l++) {
      const fv = (binomial(a.dv, j) * binomial(b.dv, l)) / binomial(dv, j + l);
      for (let i = 0; i <= a.du; i++) {
        const left = a.c[j * (a.du + 1) + i]! * binomial(a.du, i) * fv;
        if (left === 0) {
          continue;
        }
        for (let k = 0; k <= b.du; k++) {
          c[(j + l) * (du + 1) + i + k]! +=
            (left * b.c[l * (b.du + 1) + k]! * binomial(b.du, k)) /
            binomial(du, i + k);
        }
      }
    }
  }
  return { du, dv, c };
}

/** a + sign · b, of equal degrees. */
function combine(a: Bernstein, b: Bernstein, sign: 1 | -1): Bernstein {
  const c = new Float64Array(a.c.length);
  for (let i = 0; i < c.length; i++) {
    c[i] = a.c[i]! + sign * b.c[i]!;
  }
  return { du: a.du, dv: a.dv, c };
}

/** The derivative in s: a polynomial of one degree less in s (zero, of degree 0, for a constant). */
function derivativeS(a: Bernstein): Bernstein {
  if (a.du === 0) {
    return { du: 0, dv: a.dv, c: new Float64Array(a.dv + 1) };
  }
  const c = new Float64Array(a.du * (a.dv + 1));
  for (let j = 0; j <= a.dv; j++) {
    for (let i = 0; i < a.du; i++) {
      c[j * a.du + i] =
        a.du * (a.c[j * (a.du + 1) + i + 1]! - a.c[j * (a.du + 1) + i]!);
    }
  }
  return { du: a.du - 1, dv: a.dv, c };
}

/** The derivative in t. */
function derivativeT(a: Bernstein): Bernstein {
  if (a.dv === 0) {
    return { du: a.du, dv: 0, c: new Float64Array(a.du + 1) };
  }
  const c = new Float64Array((a.du + 1) * a.dv);
  for (let j = 0; j < a.dv; j++) {
    for (let i = 0; i <= a.du; i++) {
      c[j * (a.du + 1) + i] =
        a.dv * (a.c[(j + 1) * (a.du + 1) + i]! - a.c[j * (a.du + 1) + i]!);
    }
  }
  return { du: a.du, dv: a.dv - 1, c };
}

/**
 * A bound on |num / den| over the patch: both raised to the larger degrees,
 * the ratio is a weighted average of the coefficient ratios (the weights are
 * den's coefficients times the basis, positive), so no ratio is exceeded.
 * That is second order in a sub-patch's size, where the numerator's largest
 * over the denominator's smallest is first order. Undefined when a
 * denominator coefficient is not above 0.
 */
function ratio(num: Bernstein, den: Bernstein): number | undefined {
  const du = Math.max(num.du, den.du);
  const dv = Math.max(num.dv, den.dv);
  const raise = (a: Bernstein): Bernstein =>
    a.du === du && a.dv === dv
      ? a
      : multiply(a, {
          du: du - a.du,
          dv: dv - a.dv,
          c: new Float64Array((du - a.du + 1) * (dv - a.dv + 1)).fill(1),
        });
  const n = raise(num).c;
  const d = raise(den).c;
  // Roundoff in a denominator that is zero in exact arithmetic must not count as positive.
  const floor = 1e-9 * Math.max(...d);
  let largest = 0;
  for (let i = 0; i < n.length; i++) {
    if (!(d[i]! > floor)) {
      return undefined;
    }
    largest = Math.max(largest, Math.abs(n[i]!) / d[i]!);
  }
  return largest;
}

/** The homogeneous coordinate along `axis` from `origin`, (P − origin) · axis times the weight; the weight itself when there is no axis. */
function along(
  net: Net,
  origin: readonly number[],
  axis?: readonly number[],
): Bernstein {
  const c = new Float64Array((net.du + 1) * (net.dv + 1));
  const shift = axis
    ? origin[0]! * axis[0]! + origin[1]! * axis[1]! + origin[2]! * axis[2]!
    : 0;
  for (let i = 0; i < c.length; i++) {
    const p = i * 4;
    const w = net.h[p + 3]!;
    c[i] = axis
      ? net.h[p]! * axis[0]! +
        net.h[p + 1]! * axis[1]! +
        net.h[p + 2]! * axis[2]! -
        shift * w
      : w;
  }
  return { du: net.du, dv: net.dv, c };
}

/**
 * Bounds on the angle about the frame's z axis, rad per unit s and per unit t:
 * with X and Y the homogeneous coordinates along x and y, θ' = (X Y' − Y X') /
 * (X² + Y²), which has no weight in it. The bound is the ratio of the two
 * Bernstein polynomials, over each sub-patch. Undefined when the
 * denominator's coefficients are not all above 0, as for a patch that
 * reaches the axis.
 */
export function axisRates(
  form: BrepForm,
  patch: number,
  frame: Frame,
): { s: number; t: number } | undefined {
  let rateS = 0;
  let rateT = 0;
  for (const net of subNets(netOf(form, patch))) {
    const x = along(net, frame.origin, frame.x);
    const y = along(net, frame.origin, frame.y);
    const square = combine(multiply(x, x), multiply(y, y), 1);
    const cross = (d: (a: Bernstein) => Bernstein) =>
      ratio(combine(multiply(x, d(y)), multiply(y, d(x)), -1), square);
    const s = cross(derivativeS);
    const t = cross(derivativeT);
    if (s === undefined || t === undefined) {
      return undefined;
    }
    rateS = Math.max(rateS, s);
    rateT = Math.max(rateT, t);
  }
  return { s: rateS * CUTS, t: rateT * CUTS };
}

/** The largest distance of a patch's control points from the frame's z axis, m. */
export function axisRadius(
  form: BrepForm,
  patch: number,
  frame: Frame,
): number {
  const net = netOf(form, patch);
  let largest = 0;
  for (let i = 0; i < net.h.length; i += 4) {
    const w = net.h[i + 3]!;
    const d = [0, 1, 2].map((k) => net.h[i + k]! / w - frame.origin[k]!);
    const px = d[0]! * frame.x[0] + d[1]! * frame.x[1] + d[2]! * frame.x[2];
    const py = d[0]! * frame.y[0] + d[1]! * frame.y[1] + d[2]! * frame.y[2];
    largest = Math.max(largest, Math.hypot(px, py));
  }
  return largest;
}

/**
 * Bounds on a patch point's speed: `ss` and `tt` bound |∂P/∂s|² and
 * |∂P/∂t|², and `st` bounds |∂P/∂s · ∂P/∂t|, in m² per unit s and t. With H
 * the homogeneous coordinates from the frame's origin and W the weight,
 * ∂P/∂s = (W H_s − W_s H) / W², so each is a ratio of Bernstein polynomials
 * over W⁴, over each sub-patch.
 */
export function speedBounds(
  form: BrepForm,
  patch: number,
  frame: Frame,
): { ss: number; tt: number; st: number } | undefined {
  const axes = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ];
  let ss = 0;
  let tt = 0;
  let st = 0;
  for (const net of subNets(netOf(form, patch))) {
    const w = along(net, frame.origin);
    const w2 = multiply(w, w);
    const w4 = multiply(w2, w2);
    const parts = axes.map((axis) => {
      const h = along(net, frame.origin, axis);
      const numerator = (d: (a: Bernstein) => Bernstein): Bernstein =>
        combine(multiply(w, d(h)), multiply(d(w), h), -1);
      return [numerator(derivativeS), numerator(derivativeT)] as const;
    });
    const bound = (a: 0 | 1, b: 0 | 1): number | undefined => {
      let total: Bernstein | undefined;
      for (const part of parts) {
        const product = multiply(part[a], part[b]);
        total = total ? combine(total, product, 1) : product;
      }
      return ratio(total!, w4);
    };
    const bounds = [bound(0, 0), bound(1, 1), bound(0, 1)];
    if (bounds.some((value) => value === undefined)) {
      return undefined;
    }
    ss = Math.max(ss, bounds[0]!);
    tt = Math.max(tt, bounds[1]!);
    st = Math.max(st, bounds[2]!);
  }
  return { ss: ss * CUTS ** 2, tt: tt * CUTS ** 2, st: st * CUTS ** 2 };
}

/**
 * Bounds on a patch's second derivatives, m per unit s and t squared: `ss`,
 * `st` and `tt` bound |P_ss|, |P_st| and |P_tt| for a rational patch with any
 * positive weights. With c = w (P − o) for a point o, and the point itself,
 * P*, in place of o (so that P − P* vanishes there), H_ss = p (p − 1) ΣB
 * Δ²_s (c − P* w), and P_ss = (H_ss − 2 W_s P_s) / W. P* lies in the control
 * points' hull, at most R from o, so |Δ²(c − P* w)| ≤ |Δ²c| + R |Δ²w|, and
 * dividing by the smallest weight bounds each term: the net's second
 * differences times p (p − 1) when the weights agree.
 */
export function netBounds(
  form: BrepForm,
  patch: number,
): { ss: number; st: number; tt: number } {
  let ss = 0;
  let st = 0;
  let tt = 0;
  for (const net of subNets(netOf(form, patch))) {
    const bound = subNetBounds(net);
    ss = Math.max(ss, bound.ss);
    st = Math.max(st, bound.st);
    tt = Math.max(tt, bound.tt);
  }
  return { ss: ss * CUTS ** 2, st: st * CUTS ** 2, tt: tt * CUTS ** 2 };
}

function subNetBounds(net: Net): { ss: number; st: number; tt: number } {
  const p = net.du;
  const q = net.dv;
  const h = net.h;
  const index = (i: number, j: number): number => (j * (p + 1) + i) * 4;
  const weight = (i: number, j: number): number => h[index(i, j) + 3]!;
  const point = (i: number, j: number): number[] => {
    const o = index(i, j);
    return [h[o]! / h[o + 3]!, h[o + 1]! / h[o + 3]!, h[o + 2]! / h[o + 3]!];
  };
  // The centre of the control points' box keeps R small.
  const low = [Infinity, Infinity, Infinity];
  const high = [-Infinity, -Infinity, -Infinity];
  let wmin = Infinity;
  for (let j = 0; j <= q; j++) {
    for (let i = 0; i <= p; i++) {
      const at = point(i, j);
      for (let k = 0; k < 3; k++) {
        low[k] = Math.min(low[k]!, at[k]!);
        high[k] = Math.max(high[k]!, at[k]!);
      }
      wmin = Math.min(wmin, weight(i, j));
    }
  }
  const centre = [0, 1, 2].map((k) => (low[k]! + high[k]!) / 2);
  let reach = 0;
  for (let j = 0; j <= q; j++) {
    for (let i = 0; i <= p; i++) {
      const at = point(i, j);
      reach = Math.max(
        reach,
        Math.hypot(
          at[0]! - centre[0]!,
          at[1]! - centre[1]!,
          at[2]! - centre[2]!,
        ),
      );
    }
  }
  const stencil = (n: number): number[] =>
    n === 0 ? [1] : n === 1 ? [-1, 1] : [1, -2, 1];
  // The largest |Δc| and |Δw| over the net, for a difference of order a in s and b in t.
  const largest = (a: number, b: number): { c: number; w: number } => {
    const ca = stencil(a);
    const cb = stencil(b);
    let cMax = 0;
    let wMax = 0;
    for (let j = 0; j + b <= q; j++) {
      for (let i = 0; i + a <= p; i++) {
        const sum = [0, 0, 0];
        let weights = 0;
        for (let jj = 0; jj <= b; jj++) {
          for (let ii = 0; ii <= a; ii++) {
            const factor = ca[ii]! * cb[jj]!;
            const w = weight(i + ii, j + jj);
            const at = point(i + ii, j + jj);
            for (let k = 0; k < 3; k++) {
              sum[k]! += factor * w * (at[k]! - centre[k]!);
            }
            weights += factor * w;
          }
        }
        cMax = Math.max(cMax, Math.hypot(sum[0]!, sum[1]!, sum[2]!));
        wMax = Math.max(wMax, Math.abs(weights));
      }
    }
    return { c: cMax, w: wMax };
  };
  const s1 = largest(1, 0);
  const t1 = largest(0, 1);
  const s2 = largest(2, 0);
  const t2 = largest(0, 2);
  const mixed = largest(1, 1);
  const speedS = (p * (s1.c + reach * s1.w)) / wmin;
  const speedT = (q * (t1.c + reach * t1.w)) / wmin;
  const weightS = p * s1.w;
  const weightT = q * t1.w;
  return {
    ss: (p * (p - 1) * (s2.c + reach * s2.w) + 2 * weightS * speedS) / wmin,
    tt: (q * (q - 1) * (t2.c + reach * t2.w) + 2 * weightT * speedT) / wmin,
    st:
      (p * q * (mixed.c + reach * mixed.w) +
        weightS * speedT +
        weightT * speedS) /
      wmin,
  };
}
