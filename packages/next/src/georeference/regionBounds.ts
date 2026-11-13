// What the declared bounds of the georeference built-ins share
// (`TransformDescriptor.bound`): the ellipsoid's radii of curvature, and the
// local metric of geographic coordinates at a point (a `Region`'s radius there
// is in east, north and up metres), and the interval arithmetic that bounds
// a Jacobian entry by entry in a local east-north-up basis. Every bound here
// is sound over its region and not tight: selection draws a tile's volume
// from them (`scene/routeBounds.ts`).
import type { DeclaredBound } from "../transform/graph.ts";
import type { Radii } from "./ellipsoid.ts";

export const RAD = Math.PI / 180;

/** The smallest and largest principal radius of curvature of the surface of an ellipsoid with these semi-axes: c²/a and a²/c, for the shortest c and longest a. */
export function curvatureRadii(radii: Radii): { min: number; max: number } {
  const lo = Math.min(radii[0], radii[1], radii[2]);
  const hi = Math.max(radii[0], radii[1], radii[2]);
  return { min: (lo * lo) / hi, max: (hi * hi) / lo };
}

/** The meridian and prime-vertical radii of curvature at geodetic latitude `phi` (radians) on an ellipsoid of revolution. */
export function principalRadii(
  a: number,
  e2: number,
  phi: number,
): { meridian: number; primeVertical: number } {
  const s = Math.sin(phi);
  const w = 1 - e2 * s * s;
  return {
    meridian: (a * (1 - e2)) / (w * Math.sqrt(w)),
    primeVertical: a / Math.sqrt(w),
  };
}

/**
 * The local metric at geographic (latitude `lat` degrees, height `h`): the
 * metres per radian of longitude (`east`, the distance from the axis) and of
 * latitude (`north`), and the largest the meridian radius gets within
 * `reach` metres of north (`meridianMax`, by its monotonicity in |φ|).
 */
export function localMetric(
  a: number,
  e2: number,
  lat: number,
  h: number,
  reach: number,
): {
  east: number;
  north: number;
  /** The angle (radians) `reach` metres north span. */
  dphi: number;
  meridianMax: number;
  /** Radius of the parallel through the centre, the surface's (N cos φ). */
  parallel: number;
} {
  const phi = lat * RAD;
  const { meridian, primeVertical } = principalRadii(a, e2, phi);
  const north = meridian + h;
  const dphi = reach / north;
  const lo = Math.max(0, Math.abs(phi) - dphi);
  const hi = Math.min(Math.PI / 2, Math.abs(phi) + dphi);
  const meridianMax = Math.max(
    principalRadii(a, e2, lo).meridian,
    principalRadii(a, e2, hi).meridian,
  );
  return {
    east: (primeVertical + h) * Math.cos(phi),
    north,
    dphi,
    meridianMax,
    parallel: primeVertical * Math.cos(phi),
  };
}

/** An interval [lowest, highest]. */
export type Interval = readonly [number, number];

export function ivMul(a: Interval, b: Interval): Interval {
  const p = [a[0] * b[0], a[0] * b[1], a[1] * b[0], a[1] * b[1]];
  return [Math.min(...p), Math.max(...p)];
}

export function ivAdd(a: Interval, b: Interval): Interval {
  return [a[0] + b[0], a[1] + b[1]];
}

export const ZERO: Interval = [0, 0];

/** The interval hull of some values. */
export function hull(values: readonly number[]): Interval {
  return [Math.min(...values), Math.max(...values)];
}

/** A row-major 3×3 of intervals, entry (i, j) at i * 3 + j. */
export type IntervalMatrix = readonly Interval[];

export function ivMatMul(a: IntervalMatrix, b: IntervalMatrix): Interval[] {
  const out: Interval[] = [];
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      let sum: Interval = ZERO;
      for (let k = 0; k < 3; k++) {
        sum = ivAdd(sum, ivMul(a[i * 3 + k]!, b[k * 3 + j]!));
      }
      out.push(sum);
    }
  }
  return out;
}

/**
 * The entries of a rotation taking an east-north-up frame to another that
 * is `tilt` radians off its vertical and turned `twist` radians about it:
 * Rz(twist) · Tilt(tilt), the tilt about any horizontal axis. Row i, column
 * j is the dot product of the other frame's axis i with this frame's axis j.
 */
export function frameRotation(tilt: number, twist: number): Interval[] {
  const ct = Math.max(-1, Math.cos(tilt));
  const st = tilt < Math.PI / 2 ? Math.sin(tilt) : 1;
  const cp = Math.max(-1, Math.cos(twist));
  const sp = twist < Math.PI / 2 ? Math.sin(twist) : 1;
  const half = (1 - ct) / 2;
  const tiltM: Interval[] = [
    [ct, 1],
    [-half, half],
    [-st, st],
    [-half, half],
    [ct, 1],
    [-st, st],
    [-st, st],
    [-st, st],
    [ct, 1],
  ];
  const twistM: Interval[] = [
    [cp, 1],
    [-sp, sp],
    ZERO,
    [-sp, sp],
    [cp, 1],
    ZERO,
    ZERO,
    ZERO,
    [1, 1],
  ];
  return ivMatMul(twistM, tiltM);
}

/** The largest |value| of each entry, column-major. */
export function absColumns(m: IntervalMatrix): Float64Array {
  const out = new Float64Array(9);
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      const v = m[i * 3 + j]!;
      out[j * 3 + i] = Math.max(Math.abs(v[0]), Math.abs(v[1]));
    }
  }
  return out;
}

/**
 * |J'| for J = I + D, D = [[T, 0], [0, dU]] in the east-north-up frame at
 * a point of a region, seen in the frame at its centre (`tilt`, `twist` off
 * it): T is the 2 × 2 symmetric block along the surface with eigenvalues in
 * `dT` (so its diagonal is in `dT` and its off-diagonal within half the
 * width), `dU` the vertical entry. A height-based lift and offset are this.
 */
export function liftBound(
  dT: Interval,
  dU: Interval,
  tilt: number,
  twist: number,
): Float64Array {
  const w = (dT[1] - dT[0]) / 2;
  const off: Interval = [-w, w];
  const d: IntervalMatrix = [dT, off, ZERO, off, dT, ZERO, ZERO, ZERO, dU];
  const r = frameRotation(tilt, twist);
  const rT: Interval[] = [];
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      rT.push(r[j * 3 + i]!);
    }
  }
  const q = ivMatMul(ivMatMul(r, d), rT);
  const j = q.map((v, k) => (k % 4 === 0 ? ivAdd(v, [1, 1]) : v));
  return absColumns(j);
}

/**
 * |diag(s) · Rot| (`side` "rows") or |Rot · diag(s)| ("columns") for a frame
 * rotation: a map whose rows (or columns) are along a frame's own axes,
 * scaled by `s`, seen across a region from the frame at its centre.
 */
export function scaledRotation(
  s: readonly [Interval, Interval, Interval],
  tilt: number,
  twist: number,
  side: "rows" | "columns",
): Float64Array {
  const r = frameRotation(tilt, twist);
  return absColumns(
    r.map((v, k) => ivMul(s[side === "rows" ? Math.floor(k / 3) : k % 3]!, v)),
  );
}

/** The half extents of a region along the columns of `basis` (column-major, orthonormal): Σ_k |(Bᵀ A)_jk|. */
export function halfExtents(
  basis: ArrayLike<number>,
  axes: ArrayLike<number>,
): [number, number, number] {
  const out: [number, number, number] = [0, 0, 0];
  for (let j = 0; j < 3; j++) {
    for (let k = 0; k < 3; k++) {
      out[j]! += Math.abs(
        basis[j * 3]! * axes[k * 3]! +
          basis[j * 3 + 1]! * axes[k * 3 + 1]! +
          basis[j * 3 + 2]! * axes[k * 3 + 2]!,
      );
    }
  }
  return out;
}

/** East, north and up (column-major) at the geodetic unit normal `n`; at a pole east is x. */
export function enuAtNormal(n: ArrayLike<number>): Float64Array {
  const rho = Math.hypot(n[0]!, n[1]!);
  const east = rho > 1e-12 ? [-n[1]! / rho, n[0]! / rho, 0] : [1, 0, 0];
  const north = [
    n[1]! * east[2]! - n[2]! * east[1]!,
    n[2]! * east[0]! - n[0]! * east[2]!,
    n[0]! * east[1]! - n[1]! * east[0]!,
  ];
  return Float64Array.of(
    east[0]!,
    east[1]!,
    east[2]!,
    north[0]!,
    north[1]!,
    north[2]!,
    n[0]!,
    n[1]!,
    n[2]!,
  );
}

/** East, north and up (column-major) at geodetic longitude and latitude in degrees. */
export function enuAt(lon: number, lat: number): Float64Array {
  const l = lon * RAD;
  const p = lat * RAD;
  return enuAtNormal([
    Math.cos(p) * Math.cos(l),
    Math.cos(p) * Math.sin(l),
    Math.sin(p),
  ]);
}

export const IDENTITY = Float64Array.of(1, 0, 0, 0, 1, 0, 0, 0, 1);

/** No bound: infinite entries, which a route takes as "sample it". */
export const UNBOUNDED: DeclaredBound = {
  basisIn: IDENTITY,
  basisOut: IDENTITY,
  absJ: new Float64Array(9).fill(Infinity),
};
