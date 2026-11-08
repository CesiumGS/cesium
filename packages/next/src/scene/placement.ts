/**
 * A draw's placement (spec section 7.6): how its content coordinates reach
 * render space. The affine part is the draw's transform, as always; a
 * per-vertex placement adds a term from a closed set, each evaluated in
 * Slang (shaders/placement.slang, before the custom vertex stage) and here
 * in float64, its CPU twin, for picks, bounds and culling:
 *
 * - **dual position:** a second position attribute, mixed with the
 *   position by a parameter `t`. `t` may be any finite number, so values
 *   past 1 extrapolate. A dual position exists only at the content's
 *   vertices, so it can't be resampled (plan 5a's ruling 4);
 * - **fitted operation:** a coordinate operation fitted over one tile: a
 *   polynomial of total order 3 or less in tile-local coordinates
 *   normalized by the tile's radius, giving a model-space displacement,
 *   with its stated error bound in meters (plan 5a's call 41);
 * - **a blend** of two placements by `t`, each the identity or a fitted
 *   operation (plan 5a's call 43).
 *
 * Every placement states how far it can move a vertex (`maxDisplacement`):
 * the draw's bounds grow by that much. The core never bakes a placement
 * into vertex buffers, so a later tessellation engine can evaluate the
 * same function at sample points the content never had (spec section
 * 8.2), using `secondDerivativeBound` to choose its sampling rate.
 *
 * A non-finite parameter, coefficient, center, scale or bound is refused
 * with a `RangeError` naming it, never drawn in the wrong place (plan 5a's
 * Review Focus 4). So is one the GPU can't hold: a number finite in
 * float64 but not in float32 (past about 3.4 × 10^38), where the GPU
 * reads it.
 *
 * Rays don't see placements: `World.castRays`, and terrain line of sight
 * through the query interface, test a placed draw's triangles where its
 * vertex buffers have them, unplaced (its bounds do grow). Picks read the
 * drawn depth, so they agree with the placement.
 */

/**
 * A placement's parameter: one float in its world's placements buffer
 * (`World.createPlacementParameter`), shared by every placement that names
 * it, so a morph writes one float a tick (plan 5a's call 42). Setting
 * `value` to a non-finite number throws a `RangeError` and keeps the old
 * value.
 */
export interface PlacementParameter {
  value: number;
}

/** The draw's transform alone (as a draw with no placement). */
export interface AffinePlacement {
  readonly kind: "affine";
}

/**
 * `mix(position, attribute(semantic), t)` in model space: the mesh's
 * named attribute `semantic` (3 components) is a second position. The
 * point drawn is the content's own only at `t = 0` (the position) and
 * `t = 1` (the attribute).
 */
export interface DualPosition {
  readonly kind: "dual";
  /** The mesh's named attribute holding the second position (`MeshData.attributes`). */
  readonly semantic: string;
  readonly t: PlacementParameter;
  /**
   * The largest distance between a vertex's position and its attribute,
   * in model units: stated by the caller, who made the attribute.
   */
  readonly maxDistance: number;
}

/**
 * A model-space displacement added to the position: per axis, a polynomial
 * of total order 3 or less in `u = (p − center) / scale`, with
 * `PLACEMENT_TERMS` terms (`PLACEMENT_MONOMIALS` gives their order).
 * `scale` is the tile's radius, so the tile's vertices have `|u| ≤ 1`.
 * The fitter is plan 5f's.
 */
export interface FittedOperation {
  readonly kind: "fitted";
  /** The tile's center in model coordinates (3 components). */
  readonly center: ArrayLike<number>;
  /** The tile's radius in model units (positive). */
  readonly scale: number;
  /**
   * `PLACEMENT_TERMS × 3` coefficients in model units: term `k`'s x, y
   * and z at `3k`, `3k + 1` and `3k + 2`.
   */
  readonly coefficients: Float64Array;
  /**
   * How far the polynomial may be from the coordinate operation it was
   * fitted to, over the tile, in meters.
   */
  readonly errorBound: number;
  /**
   * The coordinate operation it was fitted to, in words (a PROJ pipeline,
   * a CRS pair), which the placement query reports.
   */
  readonly operation?: string;
}

/** `mix(from(p), to(p), t)`: a morph between two placements (plan 5f's). */
export interface PlacementBlend {
  readonly kind: "blend";
  readonly from: "identity" | FittedOperation;
  readonly to: "identity" | FittedOperation;
  readonly t: PlacementParameter;
}

export type Placement =
  AffinePlacement | DualPosition | FittedOperation | PlacementBlend;

/** Terms of a fitted operation's polynomial per axis (shaders/placement.slang the same). */
export const PLACEMENT_TERMS = 20;

/**
 * The exponents of `u`'s x, y and z in each term, in coefficient order:
 * the constant, then order 1, 2 and 3, each in lexicographic order.
 */
export const PLACEMENT_MONOMIALS: readonly (readonly [
  number,
  number,
  number,
])[] = [
  [0, 0, 0],
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
  [2, 0, 0],
  [1, 1, 0],
  [1, 0, 1],
  [0, 2, 0],
  [0, 1, 1],
  [0, 0, 2],
  [3, 0, 0],
  [2, 1, 0],
  [2, 0, 1],
  [1, 2, 0],
  [1, 1, 1],
  [1, 0, 2],
  [0, 3, 0],
  [0, 2, 1],
  [0, 1, 2],
  [0, 0, 3],
];

function finite(caller: string, field: string, value: number): void {
  if (!Number.isFinite(value)) {
    throw new RangeError(
      `${caller}: ${field} is ${value}; a placement takes finite numbers only, so it is never drawn in the wrong place.`,
    );
  }
}

/**
 * `finite`, and finite as the GPU reads it: float32 overflows past about
 * 3.4 × 10^38 to infinity.
 */
export function finite32(caller: string, field: string, value: number): void {
  finite(caller, field, value);
  if (!Number.isFinite(Math.fround(value))) {
    throw new RangeError(
      `${caller}: ${field} is ${value}, past float32's range: the GPU would read it as infinite.`,
    );
  }
}

/**
 * Refuses a parameter whose value isn't finite in float64 and float32
 * (Review Focus 4).
 */
export function checkParameterValue(caller: string, value: number): void {
  finite32(caller, "the placement parameter's value", value);
}

function checkFitted(caller: string, f: FittedOperation, prefix: string): void {
  if (f.center.length !== 3) {
    throw new RangeError(
      `${caller}: ${prefix}center has ${f.center.length} components, not 3.`,
    );
  }
  for (let i = 0; i < 3; i++) {
    finite32(caller, `${prefix}center[${i}]`, f.center[i]!);
  }
  finite32(caller, `${prefix}scale`, f.scale);
  if (!(f.scale > 0)) {
    throw new RangeError(
      `${caller}: ${prefix}scale is ${f.scale}; it is the tile's radius, and must be positive.`,
    );
  }
  // The GPU reads its reciprocal.
  finite32(caller, `1 / ${prefix}scale`, 1 / f.scale);
  if (f.coefficients.length !== PLACEMENT_TERMS * 3) {
    throw new RangeError(
      `${caller}: ${prefix}coefficients has ${f.coefficients.length} values, not ${PLACEMENT_TERMS * 3} (${PLACEMENT_TERMS} terms per axis).`,
    );
  }
  for (let i = 0; i < f.coefficients.length; i++) {
    finite32(caller, `${prefix}coefficients[${i}]`, f.coefficients[i]!);
  }
  finite(caller, `${prefix}errorBound`, f.errorBound);
  if (f.errorBound < 0) {
    throw new RangeError(
      `${caller}: ${prefix}errorBound is ${f.errorBound}; a bound is not negative.`,
    );
  }
}

/**
 * Refuses a placement with a non-finite or out-of-range number, naming the
 * field (`t`, `maxDistance`, `center[1]`, `to.coefficients[7]`, …).
 */
export function checkPlacement(caller: string, placement: Placement): void {
  switch (placement.kind) {
    case "affine":
      return;
    case "dual":
      if (typeof placement.semantic !== "string" || !placement.semantic) {
        throw new RangeError(`${caller}: a dual position needs a semantic.`);
      }
      finite32(caller, "t (its value)", placement.t.value);
      finite32(caller, "maxDistance", placement.maxDistance);
      if (placement.maxDistance < 0) {
        throw new RangeError(
          `${caller}: maxDistance is ${placement.maxDistance}; a distance is not negative.`,
        );
      }
      return;
    case "fitted":
      checkFitted(caller, placement, "");
      return;
    case "blend":
      finite32(caller, "t (its value)", placement.t.value);
      for (const end of ["from", "to"] as const) {
        const e = placement[end] as unknown;
        if (e === "identity") {
          continue;
        }
        if (
          typeof e !== "object" ||
          e === null ||
          (e as { kind?: unknown }).kind !== "fitted"
        ) {
          throw new RangeError(
            `${caller}: a blend's ${end} is ${describeEnd(e)}; it takes "identity" or a fitted operation (plan 5a's call 43).`,
          );
        }
        checkFitted(caller, e as FittedOperation, `${end}.`);
      }
      return;
    default:
      throw new RangeError(
        `${caller}: unknown placement kind ${String((placement as { kind: unknown }).kind)}.`,
      );
  }
}

/** A blend end as a refusal names it. */
function describeEnd(e: unknown): string {
  if (typeof e === "object" && e !== null && "kind" in e) {
    return `a placement of kind ${String((e as { kind: unknown }).kind)}`;
  }
  return typeof e === "string" ? `"${e}"` : String(e);
}

/** `x` to the power `e` (0 to 3). */
function power(x: number, e: number): number {
  return e === 0 ? 1 : e === 1 ? x : e === 2 ? x * x : x * x * x;
}

/** Adds `f`'s displacement at `p`, times `weight`, to `out`. */
function addFitted(
  f: FittedOperation,
  p: ArrayLike<number>,
  weight: number,
  out: Float64Array,
): void {
  const inv = 1 / f.scale;
  const ux = (p[0]! - f.center[0]!) * inv;
  const uy = (p[1]! - f.center[1]!) * inv;
  const uz = (p[2]! - f.center[2]!) * inv;
  let dx = 0;
  let dy = 0;
  let dz = 0;
  for (let k = 0; k < PLACEMENT_TERMS; k++) {
    const [a, b, c] = PLACEMENT_MONOMIALS[k]!;
    const m = power(ux, a) * power(uy, b) * power(uz, c);
    dx += f.coefficients[3 * k]! * m;
    dy += f.coefficients[3 * k + 1]! * m;
    dz += f.coefficients[3 * k + 2]! * m;
  }
  out[0] = out[0]! + weight * dx;
  out[1] = out[1]! + weight * dy;
  out[2] = out[2]! + weight * dz;
}

/**
 * The float64 CPU twin of shaders/placement.slang `placePosition`: where
 * `placement` puts a vertex at model-space `position`, in model space (the
 * draw's transform then takes it to render space). `attribute` is the
 * vertex's dual-position attribute (a dual position needs it; the other
 * kinds ignore it). Written into `out`, which is returned.
 */
export function placePosition(
  placement: Placement,
  position: ArrayLike<number>,
  attribute: ArrayLike<number> | undefined,
  out: Float64Array,
): Float64Array {
  const x = position[0]!;
  const y = position[1]!;
  const z = position[2]!;
  switch (placement.kind) {
    case "affine":
      break;
    case "dual": {
      const t = placement.t.value;
      finite("placePosition", "t (its value)", t);
      if (!attribute || attribute.length < 3) {
        throw new RangeError(
          `placePosition: a dual position needs the vertex's ${placement.semantic} (3 components).`,
        );
      }
      out[0] = x + t * (attribute[0]! - x);
      out[1] = y + t * (attribute[1]! - y);
      out[2] = z + t * (attribute[2]! - z);
      return out;
    }
    case "fitted":
      out[0] = x;
      out[1] = y;
      out[2] = z;
      addFitted(placement, position, 1, out);
      return out;
    case "blend": {
      const t = placement.t.value;
      finite("placePosition", "t (its value)", t);
      out[0] = x;
      out[1] = y;
      out[2] = z;
      if (placement.from !== "identity") {
        addFitted(placement.from, position, 1 - t, out);
      }
      if (placement.to !== "identity") {
        addFitted(placement.to, position, t, out);
      }
      return out;
    }
  }
  out[0] = x;
  out[1] = y;
  out[2] = z;
  return out;
}

/** `f`'s largest displacement over `|u_i| ≤ reach`: Σ |c| · reach^order. */
function fittedReach(f: FittedOperation, reach: number): number {
  let sum = 0;
  for (let k = 0; k < PLACEMENT_TERMS; k++) {
    const [a, b, c] = PLACEMENT_MONOMIALS[k]!;
    const scale = reach ** (a + b + c);
    sum +=
      (Math.abs(f.coefficients[3 * k]!) +
        Math.abs(f.coefficients[3 * k + 1]!) +
        Math.abs(f.coefficients[3 * k + 2]!)) *
      scale;
  }
  return sum;
}

/**
 * How far `placement` can move a vertex from where its position is, in
 * model units: the draw's bounding radius grows by this much.
 *
 * - dual position: `max(1, |t|) · maxDistance` (so `t` between −1 and 1
 *   changes no bounds);
 * - fitted operation: the sum of the coefficients' magnitudes (each term
 *   is at most 1 in magnitude over the tile, `|u_i| ≤ 1`);
 * - blend: the larger end's, times `|1 − t| + |t|` (1 for `t` between 0
 *   and 1; past them the blend extrapolates).
 *
 * `reach` (default 1) is how far the vertices reach in `u`, for a mesh
 * larger than the fitted operation's `scale`: each term of order `n`
 * counts `reach^n`.
 */
export function maxDisplacement(placement: Placement, reach = 1): number {
  switch (placement.kind) {
    case "affine":
      return 0;
    case "dual":
      return Math.max(1, Math.abs(placement.t.value)) * placement.maxDistance;
    case "fitted":
      return fittedReach(placement, Math.max(1, reach));
    case "blend": {
      const r = Math.max(1, reach);
      const end = (e: "identity" | FittedOperation) =>
        e === "identity" ? 0 : fittedReach(e, r);
      const t = placement.t.value;
      return (
        (Math.abs(1 - t) + Math.abs(t)) *
        Math.max(end(placement.from), end(placement.to))
      );
    }
  }
}

/** `f`'s bound on its second derivative over `|u_i| ≤ reach`. */
function fittedCurvature(f: FittedOperation, reach: number): number {
  let sum = 0;
  for (let k = 0; k < PLACEMENT_TERMS; k++) {
    const [a, b, c] = PLACEMENT_MONOMIALS[k]!;
    const n = a + b + c;
    if (n < 2) {
      continue;
    }
    // Σ over i, j of |∂²(u^α)/∂u_i∂u_j| ≤ Σ α_i (α_j − δ_ij) = n (n − 1).
    sum +=
      (Math.abs(f.coefficients[3 * k]!) +
        Math.abs(f.coefficients[3 * k + 1]!) +
        Math.abs(f.coefficients[3 * k + 2]!)) *
      n *
      (n - 1) *
      reach ** (n - 2);
  }
  return sum / (f.scale * f.scale);
}

/**
 * A bound on the placement's second derivative over the tile (spec section
 * 8.2): for any unit direction `v` in model space, the displacement's
 * second derivative along `v` is at most this long, in model units per
 * model unit squared (1/m for content in meters). A subdivider holds the
 * chord error of a segment of length `h` to `bound · h² / 8`.
 *
 * Computed from the coefficients: each term of order `n ≥ 2` contributes
 * `|c| · n (n − 1) / scale²` (a bound on the sum of its Hessian's entries,
 * which bounds the Hessian's norm). 0 for the affine placement (no term),
 * NaN for a dual position (no function between its vertices; ruling 4),
 * and for a blend `|1 − t| · from + |t| · to`.
 */
export function secondDerivativeBound(placement: Placement, reach = 1): number {
  const r = Math.max(1, reach);
  switch (placement.kind) {
    case "affine":
      return 0;
    case "dual":
      return Number.NaN;
    case "fitted":
      return fittedCurvature(placement, r);
    case "blend": {
      const t = placement.t.value;
      const end = (e: "identity" | FittedOperation) =>
        e === "identity" ? 0 : fittedCurvature(e, r);
      return (
        Math.abs(1 - t) * end(placement.from) + Math.abs(t) * end(placement.to)
      );
    }
  }
}

/**
 * Whether a placement can be evaluated at points the content never had
 * (spec section 8.2): every kind but the dual position (ruling 4).
 */
export function resamplable(placement: Placement): boolean {
  return placement.kind !== "dual";
}
