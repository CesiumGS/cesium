// Fitting a route's displacement over a tile with a lattice of cubics (plan
// §13.26, the second review, flaws 2 and 8). Float64 and CPU-side, so a draw
// can carry a warp the GPU evaluates cheaply; scene/warpTerms.ts has the
// lattice's layout.
import { invertAffine, multiply, mat4 } from "../math/mat4.ts";
import { routeForward, type Route } from "../camera/route.ts";
import { PLACEMENT_MONOMIALS, PLACEMENT_TERMS } from "./placement.ts";
import {
  LATTICE_CELLS,
  type ClipField,
  type CubicLattice,
} from "./warpTerms.ts";

/** The displacement at model point `p`, written to `out` (3). */
export type DisplacementFunction = (p: Float64Array, out: Float64Array) => void;

// Per cell: least squares at Chebyshev–Lobatto points (FIT_POINTS³ ≥ the 20
// unknowns, well spread, so the monomial basis in v ∈ [−1, 1] stays well
// conditioned), then the residual on a denser uniform grid that includes the
// faces and corners, mostly between the fit points.
const FIT_POINTS = 5;
const CHECK_POINTS = 9;

interface FitBasis {
  /** `PLACEMENT_TERMS × fit samples`: the least-squares solution operator. */
  readonly solve: Float64Array;
  readonly fitV: Float64Array;
  readonly checkV: Float64Array;
  /** `check samples × PLACEMENT_TERMS`. */
  readonly checkMonomials: Float64Array;
}

let basis: FitBasis | undefined;

function monomials(
  v: ArrayLike<number>,
  at: number,
  out: Float64Array,
  to: number,
) {
  const x = v[at]!;
  const y = v[at + 1]!;
  const z = v[at + 2]!;
  const px = [1, x, x * x, x * x * x];
  const py = [1, y, y * y, y * y * y];
  const pz = [1, z, z * z, z * z * z];
  for (let k = 0; k < PLACEMENT_TERMS; k++) {
    const [a, b, c] = PLACEMENT_MONOMIALS[k]!;
    out[to + k] = px[a]! * py[b]! * pz[c]!;
  }
}

function grid(coordinates: readonly number[]): Float64Array {
  const n = coordinates.length;
  const out = new Float64Array(n * n * n * 3);
  let at = 0;
  for (let k = 0; k < n; k++) {
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        out[at++] = coordinates[i]!;
        out[at++] = coordinates[j]!;
        out[at++] = coordinates[k]!;
      }
    }
  }
  return out;
}

/**
 * The pseudo-inverse of `a` (`m × n`, row-major, full column rank) by
 * Householder QR: `R⁻¹Qᵀ`, with Qᵀ built by applying the reflectors to the
 * identity and R inverted by back-substitution. No normal equations, so the
 * condition number isn't squared.
 */
function pseudoInverse(a: Float64Array, m: number, n: number): Float64Array {
  const r = a.slice();
  const qt = new Float64Array(m * m);
  for (let i = 0; i < m; i++) {
    qt[i * m + i] = 1;
  }
  const v = new Float64Array(m);
  for (let k = 0; k < n; k++) {
    let norm = 0;
    for (let i = k; i < m; i++) {
      norm = Math.hypot(norm, r[i * n + k]!);
    }
    const alpha = r[k * n + k]! > 0 ? -norm : norm;
    let vv = 0;
    for (let i = k; i < m; i++) {
      v[i] = r[i * n + k]! - (i === k ? alpha : 0);
      vv += v[i]! * v[i]!;
    }
    if (vv === 0) {
      continue;
    }
    for (let j = k; j < n; j++) {
      let s = 0;
      for (let i = k; i < m; i++) {
        s += v[i]! * r[i * n + j]!;
      }
      s = (2 * s) / vv;
      for (let i = k; i < m; i++) {
        r[i * n + j] = r[i * n + j]! - s * v[i]!;
      }
    }
    for (let j = 0; j < m; j++) {
      let s = 0;
      for (let i = k; i < m; i++) {
        s += v[i]! * qt[i * m + j]!;
      }
      s = (2 * s) / vv;
      for (let i = k; i < m; i++) {
        qt[i * m + j] = qt[i * m + j]! - s * v[i]!;
      }
    }
  }
  const out = new Float64Array(n * m);
  for (let j = 0; j < m; j++) {
    for (let i = n - 1; i >= 0; i--) {
      let s = qt[i * m + j]!;
      for (let l = i + 1; l < n; l++) {
        s -= r[i * n + l]! * out[l * m + j]!;
      }
      const d = r[i * n + i]!;
      if (!(Math.abs(d) > 1e-12)) {
        throw new Error("warpFit: the fit's design matrix is rank deficient");
      }
      out[i * m + j] = s / d;
    }
  }
  return out;
}

function fitBasis(): FitBasis {
  if (basis) {
    return basis;
  }
  const lobatto: number[] = [];
  for (let i = 0; i < FIT_POINTS; i++) {
    lobatto.push(-Math.cos((Math.PI * i) / (FIT_POINTS - 1)));
  }
  lobatto[(FIT_POINTS - 1) / 2] = 0;
  const uniform: number[] = [];
  for (let i = 0; i < CHECK_POINTS; i++) {
    uniform.push(-1 + (2 * i) / (CHECK_POINTS - 1));
  }
  const fitV = grid(lobatto);
  const checkV = grid(uniform);
  const fitN = fitV.length / 3;
  const checkN = checkV.length / 3;
  const design = new Float64Array(fitN * PLACEMENT_TERMS);
  for (let s = 0; s < fitN; s++) {
    monomials(fitV, 3 * s, design, s * PLACEMENT_TERMS);
  }
  const checkMonomials = new Float64Array(checkN * PLACEMENT_TERMS);
  for (let s = 0; s < checkN; s++) {
    monomials(checkV, 3 * s, checkMonomials, s * PLACEMENT_TERMS);
  }
  basis = {
    solve: pseudoInverse(design, fitN, PLACEMENT_TERMS),
    fitV,
    checkV,
    checkMonomials,
  };
  return basis;
}

/** The lattice's displacement at model point `p`, written to `out` (3); extrapolates outside the tile's cube. */
export function evaluateLattice(
  lattice: CubicLattice,
  p: ArrayLike<number>,
  out: Float64Array,
): Float64Array {
  const n = lattice.cells;
  const cell = [0, 0, 0];
  const v = [0, 0, 0];
  for (let a = 0; a < 3; a++) {
    const t = (((p[a]! - lattice.center[a]!) / lattice.scale + 1) / 2) * n;
    const i = Math.min(n - 1, Math.max(0, Math.floor(t)));
    cell[a] = i;
    v[a] = 2 * (t - i) - 1;
  }
  const base = ((cell[2]! * n + cell[1]!) * n + cell[0]!) * PLACEMENT_TERMS;
  const mono = new Float64Array(PLACEMENT_TERMS);
  monomials(v, 0, mono, 0);
  let x = 0;
  let y = 0;
  let z = 0;
  for (let k = 0; k < PLACEMENT_TERMS; k++) {
    const at = (base + k) * 3;
    const m = mono[k]!;
    x += lattice.coefficients[at]! * m;
    y += lattice.coefficients[at + 1]! * m;
    z += lattice.coefficients[at + 2]! * m;
  }
  out[0] = x;
  out[1] = y;
  out[2] = z;
  return out;
}

/** Fits `cells` per axis over the cube [−1, 1]³ of u. */
function fitCells(
  displacement: DisplacementFunction,
  center: Float64Array,
  scale: number,
  cells: number,
  operation: string | undefined,
): CubicLattice {
  const b = fitBasis();
  const fitN = b.fitV.length / 3;
  const checkN = b.checkV.length / 3;
  const coefficients = new Float64Array(cells ** 3 * PLACEMENT_TERMS * 3);
  const p = new Float64Array(3);
  const d = new Float64Array(3);
  const samples = new Float64Array(fitN * 3);
  const half = 1 / cells;
  let worst = 0;
  for (let iz = 0; iz < cells; iz++) {
    for (let iy = 0; iy < cells; iy++) {
      for (let ix = 0; ix < cells; ix++) {
        const cell = (iz * cells + iy) * cells + ix;
        const at = (v: Float64Array, s: number) => {
          // u = −1 + (2 i + v + 1) / cells
          p[0] = center[0]! + scale * (-1 + (2 * ix + v[3 * s]! + 1) * half);
          p[1] =
            center[1]! + scale * (-1 + (2 * iy + v[3 * s + 1]! + 1) * half);
          p[2] =
            center[2]! + scale * (-1 + (2 * iz + v[3 * s + 2]! + 1) * half);
        };
        for (let s = 0; s < fitN; s++) {
          at(b.fitV, s);
          displacement(p, d);
          samples[3 * s] = d[0]!;
          samples[3 * s + 1] = d[1]!;
          samples[3 * s + 2] = d[2]!;
        }
        const c0 = cell * PLACEMENT_TERMS * 3;
        for (let k = 0; k < PLACEMENT_TERMS; k++) {
          let sx = 0;
          let sy = 0;
          let sz = 0;
          for (let s = 0; s < fitN; s++) {
            const w = b.solve[k * fitN + s]!;
            sx += w * samples[3 * s]!;
            sy += w * samples[3 * s + 1]!;
            sz += w * samples[3 * s + 2]!;
          }
          coefficients[c0 + 3 * k] = sx;
          coefficients[c0 + 3 * k + 1] = sy;
          coefficients[c0 + 3 * k + 2] = sz;
        }
        for (let s = 0; s < checkN; s++) {
          at(b.checkV, s);
          displacement(p, d);
          let rx = d[0]!;
          let ry = d[1]!;
          let rz = d[2]!;
          for (let k = 0; k < PLACEMENT_TERMS; k++) {
            const m = b.checkMonomials[s * PLACEMENT_TERMS + k]!;
            rx -= coefficients[c0 + 3 * k]! * m;
            ry -= coefficients[c0 + 3 * k + 1]! * m;
            rz -= coefficients[c0 + 3 * k + 2]! * m;
          }
          const r = Math.hypot(rx, ry, rz);
          if (!Number.isFinite(r)) {
            throw new RangeError(
              `fitLattice: the displacement is not finite near the tile${operation ? ` (${operation})` : ""}`,
            );
          }
          worst = Math.max(worst, r);
        }
      }
    }
  }
  return {
    kind: "cubic",
    center: Array.from(center),
    scale,
    cells,
    coefficients,
    errorBound: worst,
    estimate: true,
    ...(operation === undefined ? {} : { operation }),
  };
}

/**
 * Fits `displacement` over the tile's sphere (the cube [−1, 1]³ of u covers
 * it) with a lattice of cubics: 1 cell per axis, doubling (1, 2, 4, 8) until
 * `errorBound ≤ tolerance` or `maxCells`. Returns the last fit, so a caller
 * reads from its `errorBound` whether it missed. The bound is the largest
 * residual at a grid of 9³ points per cell, an estimate and no proof
 * (`estimate` is true); a caller wanting the plan's `geometricError / 64`
 * with a millimetre floor passes `max(1e-3, geometricError / 64)`.
 */
export function fitLattice(
  displacement: DisplacementFunction,
  tile: { center: ArrayLike<number>; scale: number },
  options: { tolerance: number; maxCells?: number; operation?: string },
): CubicLattice {
  if (!(tile.scale > 0) || !Number.isFinite(tile.scale)) {
    throw new RangeError(
      `fitLattice: scale is ${tile.scale}; it must be positive`,
    );
  }
  if (!(options.tolerance >= 0)) {
    throw new RangeError(
      `fitLattice: tolerance is ${options.tolerance}; it must be 0 or more`,
    );
  }
  const center = new Float64Array([
    tile.center[0]!,
    tile.center[1]!,
    tile.center[2]!,
  ]);
  const maxCells = options.maxCells ?? LATTICE_CELLS[LATTICE_CELLS.length - 1]!;
  let fit: CubicLattice | undefined;
  for (const cells of LATTICE_CELLS) {
    if (fit && cells > maxCells) {
      break;
    }
    fit = fitCells(displacement, center, tile.scale, cells, options.operation);
    if (fit.errorBound <= options.tolerance) {
      break;
    }
  }
  return fit!;
}

/** A scalar of model point `p` (a curved clip's signed distance, `fitClipField`). */
export type ScalarFunction = (p: Float64Array) => number;

/** The `ClipField` of `cells` cells per axis over the cube [−1, 1]³ of u, and the worst residual at its check points. */
function fitScalarCells(
  scalar: ScalarFunction,
  center: ArrayLike<number>,
  scale: number,
  cells: number,
  operation: string | undefined,
): ClipField {
  const b = fitBasis();
  const fitN = b.fitV.length / 3;
  const checkN = b.checkV.length / 3;
  const coefficients = new Float64Array(cells ** 3 * PLACEMENT_TERMS);
  const p = new Float64Array(3);
  const samples = new Float64Array(fitN);
  const half = 1 / cells;
  let worst = 0;
  for (let iz = 0; iz < cells; iz++) {
    for (let iy = 0; iy < cells; iy++) {
      for (let ix = 0; ix < cells; ix++) {
        const c0 = ((iz * cells + iy) * cells + ix) * PLACEMENT_TERMS;
        const at = (v: Float64Array, s: number) => {
          p[0] = center[0]! + scale * (-1 + (2 * ix + v[3 * s]! + 1) * half);
          p[1] =
            center[1]! + scale * (-1 + (2 * iy + v[3 * s + 1]! + 1) * half);
          p[2] =
            center[2]! + scale * (-1 + (2 * iz + v[3 * s + 2]! + 1) * half);
        };
        for (let s = 0; s < fitN; s++) {
          at(b.fitV, s);
          samples[s] = scalar(p);
        }
        for (let k = 0; k < PLACEMENT_TERMS; k++) {
          let sum = 0;
          for (let s = 0; s < fitN; s++) {
            sum += b.solve[k * fitN + s]! * samples[s]!;
          }
          coefficients[c0 + k] = sum;
        }
        for (let s = 0; s < checkN; s++) {
          at(b.checkV, s);
          let r = scalar(p);
          for (let k = 0; k < PLACEMENT_TERMS; k++) {
            r -=
              coefficients[c0 + k]! *
              b.checkMonomials[s * PLACEMENT_TERMS + k]!;
          }
          if (!Number.isFinite(r)) {
            throw new RangeError(
              `fitClipField: the clip's distance is not finite near the tile${operation ? ` (${operation})` : ""}`,
            );
          }
          worst = Math.max(worst, Math.abs(r));
        }
      }
    }
  }
  return { coefficients, errorBound: worst, estimate: true };
}

/**
 * Fits a scalar (a curved clip's signed distance) over the tile's sphere in
 * model space, cells as `fitLattice`: `cells` fixed (the draw's position
 * lattice has them, and the scalar shares its rows), or doubling (1, 2, 4, 8)
 * from 1 until `errorBound ≤ tolerance` or `maxCells`. The field's cells are
 * the lattice's: `center`, `scale` and `cells` are the lattice's own.
 */
export function fitClipField(
  scalar: ScalarFunction,
  tile: { center: ArrayLike<number>; scale: number },
  options: {
    tolerance: number;
    cells?: number;
    maxCells?: number;
    operation?: string;
  },
): { field: ClipField; cells: number } {
  if (!(tile.scale > 0) || !Number.isFinite(tile.scale)) {
    throw new RangeError(
      `fitClipField: scale is ${tile.scale}; it must be positive`,
    );
  }
  if (options.cells !== undefined) {
    return {
      field: fitScalarCells(
        scalar,
        tile.center,
        tile.scale,
        options.cells,
        options.operation,
      ),
      cells: options.cells,
    };
  }
  const maxCells = options.maxCells ?? LATTICE_CELLS[LATTICE_CELLS.length - 1]!;
  let fit: { field: ClipField; cells: number } | undefined;
  for (const cells of LATTICE_CELLS) {
    if (fit && cells > maxCells) {
      break;
    }
    fit = {
      field: fitScalarCells(
        scalar,
        tile.center,
        tile.scale,
        cells,
        options.operation,
      ),
      cells,
    };
    if (fit.field.errorBound <= options.tolerance) {
      break;
    }
  }
  return fit!;
}

/** A clip field's value at model point `p` (the lattice's cells and local coordinates), float64: the GPU's twin. */
export function evaluateClipField(
  lattice: Pick<CubicLattice, "center" | "scale" | "cells">,
  field: ClipField,
  p: ArrayLike<number>,
): number {
  const n = lattice.cells;
  const cell = [0, 0, 0];
  const v = [0, 0, 0];
  for (let a = 0; a < 3; a++) {
    const t = (((p[a]! - lattice.center[a]!) / lattice.scale + 1) / 2) * n;
    const i = Math.min(n - 1, Math.max(0, Math.floor(t)));
    cell[a] = i;
    v[a] = 2 * (t - i) - 1;
  }
  const base = ((cell[2]! * n + cell[1]!) * n + cell[0]!) * PLACEMENT_TERMS;
  const mono = new Float64Array(PLACEMENT_TERMS);
  monomials(v, 0, mono, 0);
  let sum = 0;
  for (let k = 0; k < PLACEMENT_TERMS; k++) {
    sum += field.coefficients[base + k]! * mono[k]!;
  }
  return sum;
}

/** The draw's affine part of `route`: its rigid steps composed in order, warps taken as identity. Column-major 4×4. */
export function affinePart(route: Route): Float64Array {
  const out = mat4();
  for (const step of route.steps) {
    if (step.kind === "rigid") {
      multiply(out, step.matrix, out);
    }
  }
  return out;
}

/**
 * `D(p) = affine⁻¹(route(modelToFrame · p)) − p`, in model coordinates, so
 * that `affine · (p + D(p)) = route(modelToFrame · p)`; `affine` is the
 * draw's model-to-base matrix (`affinePart` times `modelToFrame` when the
 * model isn't the route's frame). Computed as `L⁻¹(q − affine · p)`, with L
 * its linear part, so base-frame magnitudes (the Earth's radius) cancel
 * before they are scaled: float64's error stays at the base's ulp.
 */
export function routeDisplacement(
  route: Route,
  modelToFrame: Float64Array,
  affine: Float64Array,
): DisplacementFunction {
  const inverse = invertAffine(mat4(), affine);
  const frame = new Float64Array(3);
  const q = new Float64Array(3);
  return (p, out) => {
    frame[0] =
      modelToFrame[0]! * p[0]! +
      modelToFrame[4]! * p[1]! +
      modelToFrame[8]! * p[2]! +
      modelToFrame[12]!;
    frame[1] =
      modelToFrame[1]! * p[0]! +
      modelToFrame[5]! * p[1]! +
      modelToFrame[9]! * p[2]! +
      modelToFrame[13]!;
    frame[2] =
      modelToFrame[2]! * p[0]! +
      modelToFrame[6]! * p[1]! +
      modelToFrame[10]! * p[2]! +
      modelToFrame[14]!;
    routeForward(route, frame, q);
    const x =
      q[0]! -
      (affine[0]! * p[0]! +
        affine[4]! * p[1]! +
        affine[8]! * p[2]! +
        affine[12]!);
    const y =
      q[1]! -
      (affine[1]! * p[0]! +
        affine[5]! * p[1]! +
        affine[9]! * p[2]! +
        affine[13]!);
    const z =
      q[2]! -
      (affine[2]! * p[0]! +
        affine[6]! * p[1]! +
        affine[10]! * p[2]! +
        affine[14]!);
    out[0] = inverse[0]! * x + inverse[4]! * y + inverse[8]! * z;
    out[1] = inverse[1]! * x + inverse[5]! * y + inverse[9]! * z;
    out[2] = inverse[2]! * x + inverse[6]! * y + inverse[10]! * z;
  };
}
