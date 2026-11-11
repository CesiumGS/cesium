// Closed-form queries on the b-rep form's analytic surfaces (overall plan
// §13.33, the b-rep adapter): where a ray crosses a surface (planes,
// cylinders, cones and spheres by quadratics, tori by the roots of a quartic),
// the (u, v) of a point on it, the stationary points of the distance to a
// point (the nearest point is one of them), and a box around a (u, v) region.
// Everything is in the form's coordinates, m and radians. The surface is the
// whole analytic surface: the caller trims it to the face.
import { frameOf, type Frame } from "./bounds.ts";
import { SurfaceKind, type BrepForm } from "./form.ts";

export type V3 = [number, number, number];

const TAU = Math.PI * 2;

const dot3 = (a: ArrayLike<number>, b: ArrayLike<number>): number =>
  a[0]! * b[0]! + a[1]! * b[1]! + a[2]! * b[2]!;

/** A point in the frame's coordinates (along x, y and z from its origin). */
function toFrame(f: Frame, p: ArrayLike<number>): V3 {
  const r: V3 = [p[0]! - f.origin[0], p[1]! - f.origin[1], p[2]! - f.origin[2]];
  return [dot3(r, f.x), dot3(r, f.y), dot3(r, f.z)];
}

/** A direction in the frame's coordinates. */
function dirToFrame(f: Frame, d: ArrayLike<number>): V3 {
  return [dot3(d, f.x), dot3(d, f.y), dot3(d, f.z)];
}

/** Whether a surface kind is analytic (not free-form patches). */
export function isAnalytic(kind: number): boolean {
  return kind >= SurfaceKind.Plane && kind < SurfaceKind.Bezier;
}

/** Whether u repeats every 2π on this kind. */
export function periodicU(kind: number): boolean {
  return kind >= SurfaceKind.Cylinder && kind <= SurfaceKind.Torus;
}

/** Whether v repeats every 2π on this kind. */
export function periodicV(kind: number): boolean {
  return kind === SurfaceKind.Torus;
}

/** `x` plus whole turns so that it lies in [lo − eps, hi + eps], clamped to [lo, hi], or undefined when no turn does. */
export function wrapAngle(
  x: number,
  lo: number,
  hi: number,
  eps: number,
): number | undefined {
  const turns = Math.ceil((lo - eps - x) / TAU);
  const y = x + turns * TAU;
  return y <= hi + eps ? Math.min(Math.max(y, lo), hi) : undefined;
}

// Polynomials.

/** The value of a polynomial (coefficients from the constant up) by Horner's rule. */
function horner(c: readonly number[], x: number): number {
  let y = 0;
  for (let i = c.length - 1; i >= 0; i--) {
    y = y * x + c[i]!;
  }
  return y;
}

/** The real roots of a polynomial in [lo, hi], ascending: those of its derivative split the interval into monotone pieces, each bisected. */
export function polynomialRoots(
  coefficients: readonly number[],
  lo: number,
  hi: number,
): number[] {
  let n = coefficients.length - 1;
  const largest = Math.max(...coefficients.map(Math.abs));
  while (n > 0 && Math.abs(coefficients[n]!) <= 1e-14 * largest) {
    n--;
  }
  if (n === 0 || !(lo <= hi)) {
    return [];
  }
  const c = coefficients.slice(0, n + 1);
  if (n === 1) {
    const x = -c[0]! / c[1]!;
    return x >= lo && x <= hi ? [x] : [];
  }
  const slope = c.slice(1).map((a, i) => a * (i + 1));
  const points = [lo, ...polynomialRoots(slope, lo, hi), hi];
  const roots: number[] = [];
  for (let i = 0; i + 1 < points.length; i++) {
    let a = points[i]!;
    let b = points[i + 1]!;
    const fa = horner(c, a);
    const fb = horner(c, b);
    if (fa === 0) {
      roots.push(a);
    } else if (fa * fb < 0) {
      for (
        let k = 0;
        k < 100 && b - a > 1e-16 * Math.max(1, Math.abs(a));
        k++
      ) {
        const mid = (a + b) / 2;
        const fm = horner(c, mid);
        if (fm === 0) {
          a = mid;
          b = mid;
          break;
        }
        if (fm * fa < 0) {
          b = mid;
        } else {
          a = mid;
        }
      }
      roots.push((a + b) / 2);
    }
  }
  if (horner(c, hi) === 0) {
    roots.push(hi);
  }
  return roots.filter((x, i) => i === 0 || x > roots[i - 1]!);
}

/** The real roots of A x² + B x + C, in a form that does not cancel; A = 0 is the linear case. */
function quadraticRoots(a: number, b: number, c: number): number[] {
  if (a === 0) {
    return b === 0 ? [] : [-c / b];
  }
  const disc = b * b - 4 * a * c;
  if (disc < 0) {
    return [];
  }
  const q = -0.5 * (b + (b >= 0 ? Math.sqrt(disc) : -Math.sqrt(disc)));
  const x1 = q / a;
  const x2 = q !== 0 ? c / q : x1;
  return x1 === x2 ? [x1] : [Math.min(x1, x2), Math.max(x1, x2)];
}

// Rays.

/**
 * The parameters t in [tMin, tMax], ascending, at which the line
 * `from + t·d` crosses the whole surface. Quadratics for the plane, cylinder,
 * cone and sphere, and the roots of the quartic for the torus.
 */
export function rayRoots(
  form: BrepForm,
  surface: number,
  from: ArrayLike<number>,
  d: ArrayLike<number>,
  tMin: number,
  tMax: number,
): number[] {
  const kind = form.surfaceKind[surface] as SurfaceKind;
  const frame = frameOf(form, surface);
  const o = toFrame(frame, from);
  const dl = dirToFrame(frame, d);
  const p0 = form.surfaceParams[surface * 2]!;
  const p1 = form.surfaceParams[surface * 2 + 1]!;
  if (kind === SurfaceKind.Plane) {
    if (dl[2] === 0) {
      return [];
    }
    const t = -o[2] / dl[2];
    return t >= tMin && t <= tMax ? [t] : [];
  }
  const dd = dot3(dl, dl);
  if (!(dd > 0)) {
    return [];
  }
  // Move the start to the line's nearest point to the frame's origin, so the
  // coefficients don't cancel far from it.
  const t0 = -dot3(o, dl) / dd;
  const q: V3 = [o[0] + t0 * dl[0], o[1] + t0 * dl[1], o[2] + t0 * dl[2]];
  const sideSquared = dl[0] * dl[0] + dl[1] * dl[1];
  const sideCross = 2 * (q[0] * dl[0] + q[1] * dl[1]);
  const radialSquared = q[0] * q[0] + q[1] * q[1];
  let local: number[];
  switch (kind) {
    case SurfaceKind.Cylinder:
      local = quadraticRoots(sideSquared, sideCross, radialSquared - p0 * p0);
      break;
    case SurfaceKind.Cone: {
      // The radius at height c is r + c·tan a, either sign.
      const k = Math.tan(p1);
      const base = p0 + k * q[2];
      local = quadraticRoots(
        sideSquared - k * k * dl[2] * dl[2],
        sideCross - 2 * k * dl[2] * base,
        radialSquared - base * base,
      );
      break;
    }
    case SurfaceKind.Sphere: {
      const squared = (p0 * p0 - dot3(q, q)) / dd;
      local = squared < 0 ? [] : [-Math.sqrt(squared), Math.sqrt(squared)];
      break;
    }
    case SurfaceKind.Torus: {
      // (|P|² + R² − r²)² = 4R²(Px² + Py²), with the lengths scaled to R + r.
      const scale = 1 / (p0 + p1);
      const R = p0 * scale;
      const r = p1 * scale;
      const ds = dl.map((x) => x * scale) as V3;
      const qs = q.map((x) => x * scale) as V3;
      const ddS = dot3(ds, ds);
      const m = dot3(qs, qs) + R * R - r * r;
      const a2 = ds[0] * ds[0] + ds[1] * ds[1];
      const a1 = 2 * (qs[0] * ds[0] + qs[1] * ds[1]);
      const a0 = qs[0] * qs[0] + qs[1] * qs[1];
      local = polynomialRoots(
        [
          m * m - 4 * R * R * a0,
          -4 * R * R * a1,
          2 * m * ddS - 4 * R * R * a2,
          0,
          ddS * ddS,
        ],
        tMin - t0,
        tMax - t0,
      );
      break;
    }
    default:
      return [];
  }
  return local
    .map((x) => x + t0)
    .filter((t) => t >= tMin && t <= tMax)
    .sort((a, b) => a - b);
}

// Points and parameters.

/** The (u, v), unwrapped, of a point on a surface (as a surface of its kind: the point's nearest point, for one off it). */
export function surfaceUv(
  form: BrepForm,
  surface: number,
  point: ArrayLike<number>,
): [number, number] {
  const kind = form.surfaceKind[surface] as SurfaceKind;
  const [a, b, c] = toFrame(frameOf(form, surface), point);
  const p0 = form.surfaceParams[surface * 2]!;
  const p1 = form.surfaceParams[surface * 2 + 1]!;
  switch (kind) {
    case SurfaceKind.Plane:
      return [a, b];
    case SurfaceKind.Cylinder:
      return [Math.atan2(b, a), c];
    case SurfaceKind.Cone:
      // A negative radius is the other nappe: the same point at u + π.
      return [
        p0 + Math.tan(p1) * c >= 0 ? Math.atan2(b, a) : Math.atan2(-b, -a),
        c,
      ];
    case SurfaceKind.Sphere:
      return [Math.atan2(b, a), Math.atan2(c, Math.hypot(a, b))];
    default:
      return [Math.atan2(b, a), Math.atan2(c, Math.hypot(a, b) - p0)];
  }
}

/**
 * The points of a whole analytic surface where the distance to `p` is
 * stationary in the sense that matters: every local minimum is among them.
 * A point on the axis has every u alike, so `uMid` stands in for it. Each is
 * a (u, v) not yet wrapped into a face's domain.
 */
export function nearestCandidates(
  form: BrepForm,
  surface: number,
  p: ArrayLike<number>,
  uMid: number,
): Array<[number, number]> {
  const kind = form.surfaceKind[surface] as SurfaceKind;
  const [a, b, c] = toFrame(frameOf(form, surface), p);
  const p0 = form.surfaceParams[surface * 2]!;
  const p1 = form.surfaceParams[surface * 2 + 1]!;
  const radial = Math.hypot(a, b);
  const onAxis = radial <= 1e-14 * Math.max(1, Math.abs(c), p0);
  const u = onAxis ? uMid : Math.atan2(b, a);
  switch (kind) {
    case SurfaceKind.Plane:
      return [[a, b]];
    case SurfaceKind.Cylinder:
      return [[u, c]];
    case SurfaceKind.Cone: {
      // In the meridian plane of p, the cone is two lines: the nearest point
      // of each is a candidate.
      const k = Math.tan(p1);
      const scale = 1 + k * k;
      return [
        [u, (k * (radial - p0) + c) / scale],
        [u + Math.PI, (-k * (radial + p0) + c) / scale],
      ];
    }
    case SurfaceKind.Sphere:
      return [[u, Math.atan2(c, radial)]];
    default:
      // The torus's tube is two circles in the meridian plane.
      return [
        [u, Math.atan2(c, radial - p0)],
        [u + Math.PI, Math.PI - Math.atan2(c, radial + p0)],
      ];
  }
}

// Bounds.

/** The range of cos (or sin) over [lo, hi]. */
function trigRange(
  fn: (x: number) => number,
  critical: number,
  lo: number,
  hi: number,
): [number, number] {
  if (hi - lo >= TAU) {
    return [-1, 1];
  }
  let min = Math.min(fn(lo), fn(hi));
  let max = Math.max(fn(lo), fn(hi));
  // Extremes lie at critical + kπ.
  for (let k = Math.ceil((lo - critical) / Math.PI); ; k++) {
    const x = critical + k * Math.PI;
    if (x > hi) {
      break;
    }
    min = Math.min(min, fn(x));
    max = Math.max(max, fn(x));
  }
  return [min, max];
}

/** The range of the product of two intervals. */
function product(
  a: readonly [number, number],
  b: readonly [number, number],
): [number, number] {
  const ps = [a[0] * b[0], a[0] * b[1], a[1] * b[0], a[1] * b[1]];
  return [Math.min(...ps), Math.max(...ps)];
}

/**
 * A box that holds the surface over [u0, u1] × [v0, v1]: planes by their
 * corners; the others by intervals, as `o + ρ(v)·(cos u·x + sin u·y) + h(v)·z`
 * with ρ and h each over the v range. Sound, and loose by up to the ρ–h
 * coupling on spheres and tori.
 */
export function analyticBounds(
  form: BrepForm,
  surface: number,
  [u0, u1, v0, v1]: readonly [number, number, number, number],
): { min: V3; max: V3 } {
  const kind = form.surfaceKind[surface] as SurfaceKind;
  const frame = frameOf(form, surface);
  const [fo, fx, fy, fz]: [
    readonly number[],
    readonly number[],
    readonly number[],
    readonly number[],
  ] = [frame.origin, frame.x, frame.y, frame.z];
  const p0 = form.surfaceParams[surface * 2]!;
  const p1 = form.surfaceParams[surface * 2 + 1]!;
  const min: V3 = [Infinity, Infinity, Infinity];
  const max: V3 = [-Infinity, -Infinity, -Infinity];
  if (kind === SurfaceKind.Plane) {
    for (const u of [u0, u1]) {
      for (const v of [v0, v1]) {
        for (let k = 0; k < 3; k++) {
          const x = fo[k]! + u * fx[k]! + v * fy[k]!;
          min[k] = Math.min(min[k]!, x);
          max[k] = Math.max(max[k]!, x);
        }
      }
    }
    return { min, max };
  }
  let rho: [number, number];
  let h: [number, number];
  switch (kind) {
    case SurfaceKind.Cylinder:
      rho = [p0, p0];
      h = [v0, v1];
      break;
    case SurfaceKind.Cone: {
      const k = Math.tan(p1);
      rho = [
        Math.min(p0 + k * v0, p0 + k * v1),
        Math.max(p0 + k * v0, p0 + k * v1),
      ];
      h = [v0, v1];
      break;
    }
    case SurfaceKind.Sphere: {
      const cos = trigRange(Math.cos, 0, v0, v1);
      const sin = trigRange(Math.sin, Math.PI / 2, v0, v1);
      rho = [p0 * cos[0], p0 * cos[1]];
      h = [p0 * sin[0], p0 * sin[1]];
      break;
    }
    default: {
      const cos = trigRange(Math.cos, 0, v0, v1);
      const sin = trigRange(Math.sin, Math.PI / 2, v0, v1);
      rho = [p0 + p1 * cos[0], p0 + p1 * cos[1]];
      h = [p1 * sin[0], p1 * sin[1]];
    }
  }
  for (let k = 0; k < 3; k++) {
    // cos u·xk + sin u·yk = A cos(u − φ).
    const amplitude = Math.hypot(fx[k]!, fy[k]!);
    const phase = Math.atan2(fy[k]!, fx[k]!);
    const c = trigRange(Math.cos, 0, u0 - phase, u1 - phase);
    const radial = product(rho, [amplitude * c[0], amplitude * c[1]]);
    const hz = product(h, [fz[k]!, fz[k]!]);
    min[k] = fo[k]! + radial[0] + hz[0];
    max[k] = fo[k]! + radial[1] + hz[1];
  }
  return { min, max };
}
