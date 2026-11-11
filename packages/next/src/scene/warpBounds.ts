// Bounds of warps (plan §13.26, the second review's flaw 1 and 6; increment
// 3). A draw's culling sphere MOVES by the displacement at its centre and
// grows only by the residual, how far the displacement differs from that
// over the sphere. Weights read parameters that may declare a range, so
// the bounds hold for every value in it and a slider writes one float.
// Maps (a route carried into an anchor's coordinates) get a drawn
// bounding sphere and [σ_min, σ_max] over a volume, for selection, the
// ray-march step and snap tolerances (σ_min). All in float64, in the units
// of whoever calls. Sampled quantities say "estimate": a map's image of a
// box bulges between its corners, and its stretch between its samples.
import {
  PLACEMENT_MONOMIALS,
  PLACEMENT_TERMS,
  type PlacementParameter,
} from "./placement.ts";
import { routeForward, warpForward, type Route } from "../camera/route.ts";
import { latticeDisplacement } from "./warpEvaluate.ts";
import type {
  CubicLattice,
  TermWeight,
  WarpTerm,
  WarpTerms,
} from "./warpTerms.ts";

/** The values a parameter may take: its range, or the value it has. */
export function parameterInterval(
  parameter: PlacementParameter,
): readonly [number, number] {
  return parameter.range ?? [parameter.value, parameter.value];
}

/**
 * The interval a weight (`scale × Π (offset + slope · parameter)`, 0 to 2
 * factors) takes over its parameters' ranges: a parameter without one counts
 * at the value it has. Two factors of different parameters multiply
 * independently (the extreme of the product over the box is at a corner);
 * of the same, the product is a quadratic whose stationary point counts.
 */
export function weightInterval(weight: TermWeight): [number, number] {
  const { scale, factors } = weight;
  if (factors.length === 2 && factors[0]!.parameter === factors[1]!.parameter) {
    const [a, b] = parameterInterval(factors[0]!.parameter);
    const [f, g] = factors as [
      (typeof factors)[number],
      (typeof factors)[number],
    ];
    const at = (x: number) =>
      scale * (f.offset + f.slope * x) * (g.offset + g.slope * x);
    const candidates = [at(a), at(b)];
    const denominator = 2 * f.slope * g.slope;
    if (denominator !== 0) {
      const x = -(f.slope * g.offset + g.slope * f.offset) / denominator;
      if (x > a && x < b) {
        candidates.push(at(x));
      }
    }
    return [Math.min(...candidates), Math.max(...candidates)];
  }
  let lo = scale;
  let hi = scale;
  for (const f of factors) {
    const [a, b] = parameterInterval(f.parameter);
    const x = f.offset + f.slope * a;
    const y = f.offset + f.slope * b;
    const fl = Math.min(x, y);
    const fh = Math.max(x, y);
    const products = [lo * fl, lo * fh, hi * fl, hi * fh];
    lo = Math.min(...products);
    hi = Math.max(...products);
  }
  return [lo, hi];
}

/** Whether the weight reads a parameter with no range: its draws' bounds follow the value it has. */
export function weightFollowsValue(weight: TermWeight): boolean {
  return weight.factors.some((f) => f.parameter.range === undefined);
}

/** One term's bounds over a sphere, at weight 1. */
export interface TermBounds {
  /** The term's displacement at the sphere's centre, model units (zero for an attribute: it has none there). */
  readonly at: Float64Array;
  /**
   * The most it differs from `at` anywhere in the sphere, plus its fit's
   * error bound: what the sphere's radius grows by at weight 1. An
   * attribute's is its stated `maxDistance`.
   */
  readonly residual: number;
}

function power(x: number, e: number): number {
  return e === 0 ? 1 : e === 1 ? x : e === 2 ? x * x : x * x * x;
}

/** Cell `cell`'s polynomial at local coordinate `v`, into `out`. */
function evaluateCell(
  lattice: CubicLattice,
  cell: number,
  v: ArrayLike<number>,
  out: Float64Array,
): Float64Array {
  let x = 0;
  let y = 0;
  let z = 0;
  const c = lattice.coefficients;
  for (let k = 0; k < PLACEMENT_TERMS; k++) {
    const [a, b, e] = PLACEMENT_MONOMIALS[k]!;
    const m = power(v[0]!, a) * power(v[1]!, b) * power(v[2]!, e);
    const r = (cell * PLACEMENT_TERMS + k) * 3;
    x += c[r]! * m;
    y += c[r + 1]! * m;
    z += c[r + 2]! * m;
  }
  out[0] = x;
  out[1] = y;
  out[2] = z;
  return out;
}

/**
 * A bound on how far the lattice's displacement differs from its value at
 * `center` anywhere within `radius` of it (model units), sound for the
 * lattice as it is evaluated, past its cube included (edge cells extrapolate).
 *
 * Per cell the sphere touches (by its box in the lattice's cube): the cell's
 * polynomial is expanded about a point `m` inside the part of the cell the
 * sphere's box covers, with half-widths `h`. Its difference from `m` is at
 * most the linear part's reach (the smaller of Σ|cₐ|hₐ and the Frobenius
 * norm of its matrix times the distance from `m`) plus, for each monomial of
 * order 2 and 3, |c| (Π(|mₐ| + hₐ)^eₐ − Π|mₐ|^eₐ); to that is added the
 * exact |D_cell(m) − D(center)|, which carries a jump between cells. So a
 * tile fitted over its own sphere, in one cell, gets the sum of its
 * non-constant coefficients' magnitudes, and a bigger lattice less per cell.
 */
export function latticeResidual(
  lattice: CubicLattice,
  center: ArrayLike<number>,
  radius: number,
): number {
  const n = lattice.cells;
  const inv = 1 / lattice.scale;
  const ru = radius * inv;
  const sLow = [0, 0, 0];
  const sHigh = [0, 0, 0];
  const iLow = [0, 0, 0];
  const iHigh = [0, 0, 0];
  const sCenter = [0, 0, 0];
  for (let a = 0; a < 3; a++) {
    const u = (center[a]! - lattice.center[a]!) * inv;
    sCenter[a] = (u + 1) * 0.5 * n;
    sLow[a] = (u - ru + 1) * 0.5 * n;
    sHigh[a] = (u + ru + 1) * 0.5 * n;
    iLow[a] = Math.min(Math.max(Math.floor(sLow[a]!), 0), n - 1);
    iHigh[a] = Math.min(Math.max(Math.floor(sHigh[a]!), 0), n - 1);
  }
  const rho = n * ru; // the sphere's radius in local coordinates
  const at = latticeDisplacement(lattice, center, new Float64Array(3));
  const c = lattice.coefficients;
  const norm = (r: number) => Math.hypot(c[r]!, c[r + 1]!, c[r + 2]!);
  const m = [0, 0, 0];
  const h = [0, 0, 0];
  const offset = new Float64Array(3);
  let worst = 0;
  for (let iz = iLow[2]!; iz <= iHigh[2]!; iz++) {
    for (let iy = iLow[1]!; iy <= iHigh[1]!; iy++) {
      for (let ix = iLow[0]!; ix <= iHigh[0]!; ix++) {
        const index = [ix, iy, iz];
        let empty = false;
        let toCenter = 0;
        for (let a = 0; a < 3; a++) {
          const i = index[a]!;
          const vLow = 2 * (sLow[a]! - i) - 1;
          const vHigh = 2 * (sHigh[a]! - i) - 1;
          const lo = i === 0 ? vLow : Math.max(vLow, -1);
          const hi = i === n - 1 ? vHigh : Math.min(vHigh, 1);
          if (lo > hi) {
            empty = true;
            break;
          }
          m[a] = (lo + hi) / 2;
          h[a] = (hi - lo) / 2;
          toCenter += (m[a]! - (2 * (sCenter[a]! - i) - 1)) ** 2;
        }
        if (empty) {
          continue;
        }
        const cell = (iz * n + iy) * n + ix;
        const base = cell * PLACEMENT_TERMS;
        evaluateCell(lattice, cell, m, offset);
        let total = Math.hypot(
          offset[0]! - at[0]!,
          offset[1]! - at[1]!,
          offset[2]! - at[2]!,
        );
        // Order 1 (monomials 1 to 3: x, y, z).
        let triangle = 0;
        let matrix = 0; // the squared Frobenius norm of the linear part
        for (let a = 0; a < 3; a++) {
          const len = norm((base + 1 + a) * 3);
          triangle += len * h[a]!;
          matrix += len * len;
        }
        const reach = Math.min(
          Math.hypot(h[0]!, h[1]!, h[2]!),
          rho + Math.sqrt(toCenter),
        );
        total += Math.min(triangle, Math.sqrt(matrix) * reach);
        // Orders 2 and 3.
        for (let k = 4; k < PLACEMENT_TERMS; k++) {
          const [a, b, e] = PLACEMENT_MONOMIALS[k]!;
          const ax = Math.abs(m[0]!);
          const ay = Math.abs(m[1]!);
          const az = Math.abs(m[2]!);
          const grown =
            power(ax + h[0]!, a) * power(ay + h[1]!, b) * power(az + h[2]!, e);
          const kept = power(ax, a) * power(ay, b) * power(az, e);
          total += norm((base + k) * 3) * Math.max(grown - kept, 0);
        }
        worst = Math.max(worst, total);
      }
    }
  }
  return worst;
}

/**
 * `term`'s bounds over the sphere (`center`, `radius`, model units) at
 * weight 1: its displacement at the centre and the residual to pad by (plus a
 * lattice's `errorBound`). Compute once per draw: weights and parameters
 * only scale them.
 */
export function termBoundsOver(
  term: WarpTerm,
  center: ArrayLike<number>,
  radius: number,
): TermBounds {
  if (term.kind === "attribute") {
    return { at: new Float64Array(3), residual: term.maxDistance };
  }
  return {
    at: latticeDisplacement(term, center, new Float64Array(3)),
    residual: latticeResidual(term, center, radius) + term.errorBound,
  };
}

/** Where a draw's sphere goes: its centre moved by `shift` and its radius grown by `pad`. */
export interface DrawnSphere {
  /** What the centre moves by, model units: Σ (weights' middle) · (each term at the centre). */
  readonly shift: Float64Array;
  /** What the radius grows by, model units. */
  readonly pad: number;
}

/**
 * The sphere `terms` draw a draw's bounding sphere as, for every value of
 * their parameters' ranges (a parameter without one, at its value now). A
 * term's weight w lies in [w₁, w₂], middle w̄ and half-width ω, so
 * |wD(p) − w̄D(c)| ≤ ω|D(c)| + max|w| · |D(p) − D(c)|, and the centre moves
 * by Σ w̄ᵢ D(c)ᵢ and the radius grows by Σ ωᵢ|D(c)ᵢ| + max|wᵢ| · residualᵢ.
 * `bounds[i]` is `termBoundsOver(terms[i].term, center, radius)`.
 */
export function drawnSphere(
  terms: WarpTerms,
  bounds: readonly TermBounds[],
): DrawnSphere {
  const shift = new Float64Array(3);
  let pad = 0;
  terms.forEach(({ weight }, i) => {
    const [lo, hi] = weightInterval(weight);
    const middle = (lo + hi) / 2;
    const half = (hi - lo) / 2;
    const { at, residual } = bounds[i]!;
    shift[0] = shift[0]! + middle * at[0]!;
    shift[1] = shift[1]! + middle * at[1]!;
    shift[2] = shift[2]! + middle * at[2]!;
    pad +=
      half * Math.hypot(at[0]!, at[1]!, at[2]!) +
      Math.max(Math.abs(lo), Math.abs(hi)) * residual;
  });
  return { shift, pad };
}

const f32 = new Float32Array(1);
const u32 = new Uint32Array(f32.buffer);

/** The smallest float32 not below `x` (a stored bound never rounds down). */
export function roundUp32(x: number): number {
  f32[0] = x;
  if (f32[0]! >= x || !Number.isFinite(f32[0]!)) {
    return f32[0]!;
  }
  u32[0] = u32[0]! + (f32[0]! > 0 ? 1 : -1);
  return f32[0]!;
}

// ----------------------------------------------------------------------- maps

/**
 * A map from a tile's coordinates to where it is drawn, in the same
 * coordinates (a `Warp.forward` of the same shape): `jacobian`, when
 * given, gets ∂out/∂p (9 numbers, column-major).
 */
export type DrawnMap = (
  p: ArrayLike<number>,
  out: Float64Array,
  jacobian?: Float64Array,
) => Float64Array;

/** The step used to difference a map that has no Jacobian, m. */
const DIFFERENCE_STEP = 0.5;

const IDENTITY_3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];

function differenceJacobian(
  map: DrawnMap,
  p: ArrayLike<number>,
  jacobian: Float64Array,
): void {
  const a = new Float64Array(3);
  const b = new Float64Array(3);
  for (let axis = 0; axis < 3; axis++) {
    const q = [p[0]!, p[1]!, p[2]!];
    q[axis] = p[axis]! + DIFFERENCE_STEP;
    map(q, a);
    q[axis] = p[axis]! - DIFFERENCE_STEP;
    map(q, b);
    for (let r = 0; r < 3; r++) {
      jacobian[axis * 3 + r] = (a[r]! - b[r]!) / (2 * DIFFERENCE_STEP);
    }
  }
}

/** `L · J` for the linear part `L` of a column-major 4×4 and column-major 3×3 `J`, in place. */
function leftMultiply(m: ArrayLike<number>, j: Float64Array): void {
  for (let c = 0; c < 3; c++) {
    const x = j[c * 3]!;
    const y = j[c * 3 + 1]!;
    const z = j[c * 3 + 2]!;
    j[c * 3] = m[0]! * x + m[4]! * y + m[8]! * z;
    j[c * 3 + 1] = m[1]! * x + m[5]! * y + m[9]! * z;
    j[c * 3 + 2] = m[2]! * x + m[6]! * y + m[10]! * z;
  }
}

function transform(m: ArrayLike<number>, p: Float64Array): void {
  const x = p[0]!;
  const y = p[1]!;
  const z = p[2]!;
  p[0] = m[0]! * x + m[4]! * y + m[8]! * z + m[12]!;
  p[1] = m[1]! * x + m[5]! * y + m[9]! * z + m[13]!;
  p[2] = m[2]! * x + m[6]! * y + m[10]! * z + m[14]!;
}

/**
 * `route`'s forward map as a `DrawnMap`, then `after` (a 4×4 applied last:
 * an anchor's inverse place, which brings it to the anchor's coordinates,
 * where selection runs). The Jacobian composes the steps' (`warpForward`
 * honours scales); a route with an inverse step is differenced.
 */
export function routeMap(route: Route, after?: ArrayLike<number>): DrawnMap {
  const differenced = route.steps.some((s) => s.kind === "warp" && s.inverse);
  const at = new Float64Array(3);
  const from = new Float64Array(3);
  const step = new Float64Array(9);
  const map: DrawnMap = (p, out, jacobian) => {
    if (jacobian && differenced) {
      differenceJacobian(map, p, jacobian);
      jacobian = undefined;
    }
    if (!jacobian) {
      routeForward(route, p, at);
      if (after) {
        transform(after, at);
      }
      out.set(at);
      return out;
    }
    at[0] = p[0]!;
    at[1] = p[1]!;
    at[2] = p[2]!;
    jacobian.set(IDENTITY_3);
    for (const s of route.steps) {
      if (s.kind === "rigid") {
        transform(s.matrix, at);
        leftMultiply(s.matrix, jacobian);
      } else {
        from.set(at);
        warpForward(s.warp, from, at, step);
        // jacobian = step · jacobian
        for (let c = 0; c < 3; c++) {
          const x = jacobian[c * 3]!;
          const y = jacobian[c * 3 + 1]!;
          const z = jacobian[c * 3 + 2]!;
          jacobian[c * 3] = step[0]! * x + step[3]! * y + step[6]! * z;
          jacobian[c * 3 + 1] = step[1]! * x + step[4]! * y + step[7]! * z;
          jacobian[c * 3 + 2] = step[2]! * x + step[5]! * y + step[8]! * z;
        }
      }
    }
    if (after) {
      transform(after, at);
      leftMultiply(after, jacobian);
    }
    out.set(at);
    return out;
  };
  return map;
}

/** The singular values of the column-major 3×3 at `j[at…]`, written to `out` as [smallest, largest]. */
function singularInto(j: ArrayLike<number>, at: number, out: number[]): void {
  const a0 = j[at]!;
  const a1 = j[at + 1]!;
  const a2 = j[at + 2]!;
  const b0 = j[at + 3]!;
  const b1 = j[at + 4]!;
  const b2 = j[at + 5]!;
  const c0 = j[at + 6]!;
  const c1 = j[at + 7]!;
  const c2 = j[at + 8]!;
  // The eigenvalues of JᵀJ (symmetric), by the trigonometric solution.
  const s00 = a0 * a0 + a1 * a1 + a2 * a2;
  const s11 = b0 * b0 + b1 * b1 + b2 * b2;
  const s22 = c0 * c0 + c1 * c1 + c2 * c2;
  const s01 = a0 * b0 + a1 * b1 + a2 * b2;
  const s02 = a0 * c0 + a1 * c1 + a2 * c2;
  const s12 = b0 * c0 + b1 * c1 + b2 * c2;
  const off = s01 * s01 + s02 * s02 + s12 * s12;
  let high: number;
  let low: number;
  if (off === 0) {
    high = Math.max(s00, s11, s22);
    low = Math.min(s00, s11, s22);
  } else {
    const q = (s00 + s11 + s22) / 3;
    const p2 = (s00 - q) ** 2 + (s11 - q) ** 2 + (s22 - q) ** 2 + 2 * off;
    const p = Math.sqrt(p2 / 6);
    const b00 = (s00 - q) / p;
    const b11 = (s11 - q) / p;
    const b22 = (s22 - q) / p;
    const b01 = s01 / p;
    const b02 = s02 / p;
    const b12 = s12 / p;
    const det =
      b00 * (b11 * b22 - b12 * b12) -
      b01 * (b01 * b22 - b12 * b02) +
      b02 * (b01 * b12 - b11 * b02);
    const phi = Math.acos(Math.min(1, Math.max(-1, det / 2))) / 3;
    high = q + 2 * p * Math.cos(phi);
    low = q + 2 * p * Math.cos(phi + (2 * Math.PI) / 3);
  }
  out[0] = Math.sqrt(Math.max(low, 0));
  out[1] = Math.sqrt(Math.max(high, 0));
}

/** The singular values of a column-major 3×3, [smallest, largest]. */
export function singularValues(j: ArrayLike<number>): [number, number] {
  const out: [number, number] = [0, 0];
  singularInto(j, 0, out);
  return out;
}

/** What a map does to a volume: its image's bounding sphere and its stretch. An estimate (samples, not a proof). */
export interface DrawnBounds {
  readonly center: Float64Array;
  readonly radius: number;
  /** Over the samples: the smallest σ_min and largest σ_max of the Jacobian. */
  readonly sigmaMin: number;
  readonly sigmaMax: number;
  /**
   * An estimate of the map's second-derivative norm over the samples: the
   * largest |J(p) − J(q)|_F / |p − q| between two of them (an estimate: a
   * secant of the Jacobian, not a bound).
   */
  readonly secondDerivative: number;
}

/**
 * The bounding sphere of `points` (n × 3, flat) carried through every map
 * of `maps` (the ends of an interval of a map's scale: a spread map's image
 * is within their hull), with [σ_min, σ_max] of the Jacobians at them. The
 * sphere is centred in the images' box, so it is not the smallest.
 *
 * The image of a volume bulges past the hull of its samples' images. With
 * `spacing`, the largest distance between neighbouring samples (a grid
 * cell's diagonal), the radius grows by (1/8)·M₂·spacing², the error of
 * interpolating a map of second derivative M₂ between samples that far apart,
 * with M₂ the estimate `secondDerivative`. An estimate, not a proof: it
 * holds where the map is no more curved than between the samples.
 */
export function drawnBounds(
  maps: readonly DrawnMap[],
  points: ArrayLike<number>,
  spacing = 0,
): DrawnBounds {
  const count = Math.floor(points.length / 3);
  const images = new Float64Array(maps.length * count * 3);
  const jacobians = new Float64Array(count * 9);
  const at = new Float64Array(3);
  const out = new Float64Array(3);
  const jacobian = new Float64Array(9);
  const sigma = [0, 0];
  let sigmaMin = Infinity;
  let sigmaMax = 0;
  // The largest squared secant of the Jacobian; its root is M₂.
  let change2 = 0;
  let next = 0;
  for (const map of maps) {
    for (let i = 0; i < count; i++) {
      at[0] = points[i * 3]!;
      at[1] = points[i * 3 + 1]!;
      at[2] = points[i * 3 + 2]!;
      map(at, out, jacobian);
      jacobians.set(jacobian, i * 9);
      images[next++] = out[0]!;
      images[next++] = out[1]!;
      images[next++] = out[2]!;
      singularInto(jacobian, 0, sigma);
      sigmaMin = Math.min(sigmaMin, sigma[0]!);
      sigmaMax = Math.max(sigmaMax, sigma[1]!);
    }
    for (let i = 0; i < count; i++) {
      const xi = points[i * 3]!;
      const yi = points[i * 3 + 1]!;
      const zi = points[i * 3 + 2]!;
      for (let j = i + 1; j < count; j++) {
        const dx = xi - points[j * 3]!;
        const dy = yi - points[j * 3 + 1]!;
        const dz = zi - points[j * 3 + 2]!;
        const distance2 = dx * dx + dy * dy + dz * dz;
        if (distance2 === 0) {
          continue;
        }
        let change = 0;
        for (let k = 0; k < 9; k++) {
          const d = jacobians[i * 9 + k]! - jacobians[j * 9 + k]!;
          change += d * d;
        }
        change2 = Math.max(change2, change / distance2);
      }
    }
  }
  const secondDerivative = Math.sqrt(change2);
  let lo0 = Infinity;
  let lo1 = Infinity;
  let lo2 = Infinity;
  let hi0 = -Infinity;
  let hi1 = -Infinity;
  let hi2 = -Infinity;
  for (let i = 0; i < images.length; i += 3) {
    lo0 = Math.min(lo0, images[i]!);
    lo1 = Math.min(lo1, images[i + 1]!);
    lo2 = Math.min(lo2, images[i + 2]!);
    hi0 = Math.max(hi0, images[i]!);
    hi1 = Math.max(hi1, images[i + 1]!);
    hi2 = Math.max(hi2, images[i + 2]!);
  }
  const center = Float64Array.of(
    (lo0 + hi0) / 2,
    (lo1 + hi1) / 2,
    (lo2 + hi2) / 2,
  );
  let radius2 = 0;
  for (let i = 0; i < images.length; i += 3) {
    const dx = images[i]! - center[0]!;
    const dy = images[i + 1]! - center[1]!;
    const dz = images[i + 2]! - center[2]!;
    radius2 = Math.max(radius2, dx * dx + dy * dy + dz * dz);
  }
  const radius = Math.sqrt(radius2);
  return {
    center,
    radius: radius + (secondDerivative * spacing * spacing) / 8,
    sigmaMin: Number.isFinite(sigmaMin) ? sigmaMin : 1,
    sigmaMax: sigmaMax || 1,
    secondDerivative,
  };
}

/**
 * What a map that is affine in the scale it carries does to some points,
 * kept in a few numbers: the map at scale `s` is `M(0) + s·(M(1) − M(0))`,
 * Jacobian included (one scaled warp among rigid steps: `warpForward`'s
 * `p + s·(forward(p) − p)`). `scaledBounds` gives the bounds for any
 * interval of the scale from it, with no map evaluated again.
 */
export interface ScaledImage {
  /** The centre and radius of a sphere holding the images at scale 0. */
  readonly base: readonly [number, number, number, number];
  /** The centre and radius of a sphere holding the displacements from scale 0 to 1. */
  readonly shift: readonly [number, number, number, number];
  /** [σ_min, σ_max] of the Jacobians at scale 0, then at scale 1, over the samples. */
  readonly sigma: readonly [number, number, number, number];
  /** The largest |J(p) − J(q)|_F / |p − q| at scale 1 (at scale s it is s times this: the Jacobian is affine in s and the rigid part's is constant). */
  readonly secondDerivative: number;
  /** The spacing of the samples (`drawnBounds`'s). */
  readonly spacing: number;
}

/**
 * The `ScaledImage` of `points` (n × 3, flat) under the map at scale 0
 * (`base`) and at scale 1 (`full`).
 */
export function scaledImage(
  base: DrawnMap,
  full: DrawnMap,
  points: ArrayLike<number>,
  spacing = 0,
): ScaledImage {
  const count = Math.floor(points.length / 3);
  const at = new Float64Array(3);
  const b = new Float64Array(3);
  const f = new Float64Array(3);
  const jb = new Float64Array(9);
  const jf = new Float64Array(9);
  const sigma = [0, 0];
  const images = new Float64Array(count * 3);
  const shifts = new Float64Array(count * 3);
  const jacobians = new Float64Array(count * 9);
  const lo = [Infinity, Infinity, Infinity, Infinity, Infinity, Infinity];
  const hi = [-Infinity, -Infinity, -Infinity, -Infinity, -Infinity, -Infinity];
  let min0 = Infinity;
  let max0 = 0;
  let min1 = Infinity;
  let max1 = 0;
  for (let i = 0; i < count; i++) {
    at[0] = points[i * 3]!;
    at[1] = points[i * 3 + 1]!;
    at[2] = points[i * 3 + 2]!;
    base(at, b, jb);
    full(at, f, jf);
    jacobians.set(jf, i * 9);
    for (let a = 0; a < 3; a++) {
      images[i * 3 + a] = b[a]!;
      shifts[i * 3 + a] = f[a]! - b[a]!;
      lo[a] = Math.min(lo[a]!, b[a]!);
      hi[a] = Math.max(hi[a]!, b[a]!);
      lo[3 + a] = Math.min(lo[3 + a]!, f[a]! - b[a]!);
      hi[3 + a] = Math.max(hi[3 + a]!, f[a]! - b[a]!);
    }
    singularInto(jb, 0, sigma);
    min0 = Math.min(min0, sigma[0]!);
    max0 = Math.max(max0, sigma[1]!);
    singularInto(jf, 0, sigma);
    min1 = Math.min(min1, sigma[0]!);
    max1 = Math.max(max1, sigma[1]!);
  }
  let change2 = 0;
  for (let i = 0; i < count; i++) {
    for (let j = i + 1; j < count; j++) {
      const dx = points[i * 3]! - points[j * 3]!;
      const dy = points[i * 3 + 1]! - points[j * 3 + 1]!;
      const dz = points[i * 3 + 2]! - points[j * 3 + 2]!;
      const distance2 = dx * dx + dy * dy + dz * dz;
      if (distance2 === 0) {
        continue;
      }
      let change = 0;
      for (let k = 0; k < 9; k++) {
        const d = jacobians[i * 9 + k]! - jacobians[j * 9 + k]!;
        change += d * d;
      }
      change2 = Math.max(change2, change / distance2);
    }
  }
  const sphere = (
    values: Float64Array,
    from: number,
  ): [number, number, number, number] => {
    const cx = (lo[from]! + hi[from]!) / 2;
    const cy = (lo[from + 1]! + hi[from + 1]!) / 2;
    const cz = (lo[from + 2]! + hi[from + 2]!) / 2;
    let r2 = 0;
    for (let i = 0; i < values.length; i += 3) {
      const x = values[i]! - cx;
      const y = values[i + 1]! - cy;
      const z = values[i + 2]! - cz;
      r2 = Math.max(r2, x * x + y * y + z * z);
    }
    return [cx, cy, cz, Math.sqrt(r2)];
  };
  return {
    base: sphere(images, 0),
    shift: sphere(shifts, 3),
    sigma: [
      Number.isFinite(min0) ? min0 : 1,
      max0 || 1,
      Number.isFinite(min1) ? min1 : 1,
      max1 || 1,
    ],
    secondDerivative: Math.sqrt(change2),
    spacing,
  };
}

/**
 * The bounds of a `ScaledImage`'s points for the scale anywhere in
 * [`low`, `high`] (within [0, 1]): a sphere about the images at the middle
 * scale, holding the base sphere, its displacement's spread at `high` and
 * the drift across the interval, so a little larger than `drawnBounds`'s;
 * σ_max by the Jacobian's affine dependence on the scale (a norm is
 * convex), σ_min interpolated, as an estimate.
 */
export function scaledBounds(
  image: ScaledImage,
  low: number,
  high: number,
): DrawnBounds {
  const { base, shift, sigma } = image;
  const middle = (low + high) / 2;
  const drift = ((high - low) / 2) * Math.hypot(shift[0], shift[1], shift[2]);
  // The scales are within [0, 1] in use; a value outside it still gets a bound.
  const largest = Math.max(Math.abs(low), Math.abs(high));
  const secondDerivative = largest * image.secondDerivative;
  const along = (a: number, b: number, s: number) =>
    Math.abs(1 - s) * a + Math.abs(s) * b;
  return {
    center: Float64Array.of(
      base[0] + middle * shift[0],
      base[1] + middle * shift[1],
      base[2] + middle * shift[2],
    ),
    radius:
      base[3] +
      largest * shift[3] +
      drift +
      (secondDerivative * image.spacing * image.spacing) / 8,
    sigmaMin: Math.min(
      along(sigma[0], sigma[2], low),
      along(sigma[0], sigma[2], high),
    ),
    sigmaMax: Math.max(
      along(sigma[1], sigma[3], low),
      along(sigma[1], sigma[3], high),
    ),
    secondDerivative,
  };
}

/** A volume's sample points: with `halfAxes` (column-major 3×3) a 3 × 3 × 3 grid of the box (corners, edge midpoints, face centres, centre); else `center` and, with `radius`, 6 points on its axes. Flat, n × 3. */
export function volumeSamples(volume: {
  readonly center: ArrayLike<number>;
  readonly halfAxes?: ArrayLike<number>;
  readonly radius?: number;
}): number[] {
  const c = volume.center;
  const out: number[] = [];
  const h = volume.halfAxes;
  if (h) {
    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        for (let k = -1; k <= 1; k++) {
          out.push(
            c[0]! + i * h[0]! + j * h[3]! + k * h[6]!,
            c[1]! + i * h[1]! + j * h[4]! + k * h[7]!,
            c[2]! + i * h[2]! + j * h[5]! + k * h[8]!,
          );
        }
      }
    }
  } else {
    out.push(c[0]!, c[1]!, c[2]!);
    if (volume.radius !== undefined) {
      const r = volume.radius;
      for (let a = 0; a < 3; a++) {
        for (const s of [-1, 1]) {
          const p = [c[0]!, c[1]!, c[2]!];
          p[a] = p[a]! + s * r;
          out.push(p[0]!, p[1]!, p[2]!);
        }
      }
    }
  }
  return out;
}

/**
 * [σ_min, σ_max] of `route`'s Jacobian over a volume, estimated at its
 * 3 × 3 × 3 samples (a sphere: centre and axis points). σ_max is how much
 * the route stretches the volume at most (selection's error scale), σ_min
 * the least: the Lipschitz constant of f∘W⁻¹ is 1/σ_min, which sets the
 * ray-march step and divides snap tolerances (the second review's flaw 6).
 * Exaggeration by k over a tile gives about [1, k].
 */
export function routeSingularRange(
  route: Route,
  volume: Parameters<typeof volumeSamples>[0],
): [number, number] {
  const b = drawnBounds([routeMap(route)], volumeSamples(volume));
  return [b.sigmaMin, b.sigmaMax];
}
