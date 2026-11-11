// The float64 CPU twin of a draw's warp terms (scene/warpTerms.ts): where
// `p' = p + Σ wᵢ·Dᵢ(p)` puts a point, how far it can move one, and how
// sharply it bends, for picks, bounds and culling. shaders/placement.slang
// `placePosition` is its GPU twin, in float32 and in the same order of
// operations, and scene/placementTable.ts the layout between them.
// `termsOf` converts today's `Placement` kinds, which stay as input until
// the API review (5i).
import {
  PLACEMENT_MONOMIALS,
  PLACEMENT_TERMS,
  finite32,
  type FittedOperation,
  type Placement,
  type PlacementParameter,
} from "./placement.ts";
import {
  LATTICE_CELLS,
  MAX_WARP_TERMS,
  constantWeight,
  type AttributeTerm,
  type CubicLattice,
  type TermWeight,
  type WarpTerms,
} from "./warpTerms.ts";

/** A fitted operation as a one-cell lattice: `v = u`, so its coefficients carry over. */
function latticeOf(f: FittedOperation): CubicLattice {
  return {
    kind: "cubic",
    center: f.center,
    scale: f.scale,
    cells: 1,
    coefficients: f.coefficients,
    errorBound: f.errorBound,
    estimate: false,
    ...(f.operation !== undefined ? { operation: f.operation } : {}),
  };
}

/**
 * `placement` as terms: a dual position is one absolute attribute term
 * weighted by `t`; a fitted operation one one-cell lattice, weight 1; a
 * blend its ends weighted `1 − t` and `t`, an identity end omitted (it
 * moves nothing). Undefined where there is no term: the affine placement,
 * a blend of two identities.
 */
export function termsOf(placement: Placement): WarpTerms | undefined {
  switch (placement.kind) {
    case "affine":
      return undefined;
    case "dual":
      return [
        {
          term: {
            kind: "attribute",
            semantic: placement.semantic,
            absolute: true,
            maxDistance: placement.maxDistance,
          },
          weight: {
            scale: 1,
            factors: [{ parameter: placement.t, offset: 0, slope: 1 }],
          },
        },
      ];
    case "fitted":
      return [{ term: latticeOf(placement), weight: constantWeight(1) }];
    case "blend": {
      const terms: Array<WarpTerms[number]> = [];
      const parameter = placement.t;
      if (placement.from !== "identity") {
        terms.push({
          term: latticeOf(placement.from),
          weight: {
            scale: 1,
            factors: [{ parameter, offset: 1, slope: -1 }],
          },
        });
      }
      if (placement.to !== "identity") {
        terms.push({
          term: latticeOf(placement.to),
          weight: {
            scale: 1,
            factors: [{ parameter, offset: 0, slope: 1 }],
          },
        });
      }
      return terms.length > 0 ? terms : undefined;
    }
  }
}

function finite(caller: string, field: string, value: number): void {
  if (!Number.isFinite(value)) {
    throw new RangeError(
      `${caller}: ${field} is ${value}; a warp takes finite numbers only, so it is never drawn in the wrong place.`,
    );
  }
}

/** A weight's value now: `scale × Π (offset + slope · parameter)`. */
export function weightOf(weight: TermWeight): number {
  let w = weight.scale;
  for (const f of weight.factors) {
    const value = f.parameter.value;
    finite("weightOf", "a parameter's value", value);
    w *= f.offset + f.slope * value;
  }
  return w;
}

/** `x` to the power `e` (0 to 3). */
function power(x: number, e: number): number {
  return e === 0 ? 1 : e === 1 ? x : e === 2 ? x * x : x * x * x;
}

const local = new Float64Array(3);

/**
 * The lattice's displacement at `p`, into `out` (model units): the cell's
 * cubic at the local coordinate `v` (warpTerms.ts). One cell has `v = u`.
 */
export function latticeDisplacement(
  lattice: CubicLattice,
  p: ArrayLike<number>,
  out: Float64Array,
): Float64Array {
  const inv = 1 / lattice.scale;
  const n = lattice.cells;
  let cell = 0;
  for (let a = 0; a < 3; a++) {
    const u = (p[a]! - lattice.center[a]!) * inv;
    if (n === 1) {
      local[a] = u;
      continue;
    }
    const s = (u + 1) * 0.5 * n;
    const i = Math.min(Math.max(Math.floor(s), 0), n - 1);
    local[a] = 2 * (s - i) - 1;
    cell += i * n ** a; // x fastest: (iz · n + iy) · n + ix
  }
  const vx = local[0]!;
  const vy = local[1]!;
  const vz = local[2]!;
  const base = cell * PLACEMENT_TERMS;
  const c = lattice.coefficients;
  let dx = 0;
  let dy = 0;
  let dz = 0;
  for (let k = 0; k < PLACEMENT_TERMS; k++) {
    const [a, b, e] = PLACEMENT_MONOMIALS[k]!;
    const m = power(vx, a) * power(vy, b) * power(vz, e);
    const r = (base + k) * 3;
    dx += c[r]! * m;
    dy += c[r + 1]! * m;
    dz += c[r + 2]! * m;
  }
  out[0] = dx;
  out[1] = dy;
  out[2] = dz;
  return out;
}

/**
 * The float64 CPU twin of shaders/placement.slang `placePosition`: where
 * `terms` put a vertex at model-space `position`, in model space (the draw's
 * transform then takes it to render space). `attribute` gives the vertex's
 * attribute for a semantic (3 components), which an attribute term needs.
 * Written into `out`, which is returned.
 */
export function placeWithTerms(
  terms: WarpTerms,
  position: ArrayLike<number>,
  attribute: ((semantic: string) => ArrayLike<number> | undefined) | undefined,
  out: Float64Array,
): Float64Array {
  const x = position[0]!;
  const y = position[1]!;
  const z = position[2]!;
  let ox = x;
  let oy = y;
  let oz = z;
  const d = new Float64Array(3);
  for (const { term, weight } of terms) {
    const w = weightOf(weight);
    if (term.kind === "cubic") {
      latticeDisplacement(term, position, d);
    } else {
      const a = attribute?.(term.semantic);
      if (!a || a.length < 3) {
        throw new RangeError(
          `placeWithTerms: an attribute term needs the vertex's ${term.semantic} (3 components).`,
        );
      }
      d[0] = term.absolute ? a[0]! - x : a[0]!;
      d[1] = term.absolute ? a[1]! - y : a[1]!;
      d[2] = term.absolute ? a[2]! - z : a[2]!;
    }
    ox += w * d[0]!;
    oy += w * d[1]!;
    oz += w * d[2]!;
  }
  out[0] = ox;
  out[1] = oy;
  out[2] = oz;
  return out;
}

/** The exponent of `reach` for a lattice's local coordinate: `v` reaches this far from the cell's centre. */
function localReach(lattice: CubicLattice, reach: number): number {
  const r = Math.max(1, reach);
  // Past the cube the edge cells extrapolate, `cells` times as fast in `v`.
  return lattice.cells === 1 ? r : lattice.cells * (r - 1) + 1;
}

/** The largest, over cells, of `cell`'s sum of `perCoefficient(L1 norm, order)`. */
function overCells(
  lattice: CubicLattice,
  perTerm: (l1: number, order: number) => number,
): number {
  let best = 0;
  const c = lattice.coefficients;
  for (let cell = 0; cell < lattice.cells ** 3; cell++) {
    let sum = 0;
    for (let k = 0; k < PLACEMENT_TERMS; k++) {
      const [a, b, e] = PLACEMENT_MONOMIALS[k]!;
      const r = (cell * PLACEMENT_TERMS + k) * 3;
      const l1 = Math.abs(c[r]!) + Math.abs(c[r + 1]!) + Math.abs(c[r + 2]!);
      sum += perTerm(l1, a + b + e);
    }
    best = Math.max(best, sum);
  }
  return best;
}

/**
 * How far one term moves a point at weight 1: a lattice, the sum of its
 * worst cell's coefficients' magnitudes, each of order `n` counting `reach^n`
 * (`reach` as `maxDisplacement`'s, in `u`); an attribute, its stated
 * `maxDistance`.
 */
export function termDisplacementBound(
  term: CubicLattice | AttributeTerm,
  reach = 1,
): number {
  if (term.kind === "attribute") {
    return term.maxDistance;
  }
  const v = localReach(term, reach);
  return overCells(term, (l1, order) => l1 * v ** order);
}

/**
 * A bound on one term's first derivative at weight 1 (the norm of its
 * Jacobian, model units per model unit): a lattice's worst cell, each
 * term of order `n ≥ 1` counting `|c| n · reach^(n − 1)` (a monomial's
 * gradient has L1 norm at most that), times `cells / scale`; NaN for an
 * attribute.
 */
export function termDerivativeBound(
  term: CubicLattice | AttributeTerm,
  reach = 1,
): number {
  if (term.kind === "attribute") {
    return Number.NaN;
  }
  const v = localReach(term, reach);
  const sum = overCells(term, (l1, order) =>
    order < 1 ? 0 : l1 * order * v ** (order - 1),
  );
  return (sum * term.cells) / term.scale;
}

/**
 * A bound on one term's second derivative at weight 1 (model units per
 * model unit squared): a lattice's worst cell, each term of order `n ≥ 2`
 * counting `|c| n (n − 1) · reach^(n − 2)`, times `(cells / scale)²` (each
 * derivative in the model's units scales `v` by `cells / scale`); NaN for
 * an attribute (no function between its vertices).
 */
export function termCurvatureBound(
  term: CubicLattice | AttributeTerm,
  reach = 1,
): number {
  if (term.kind === "attribute") {
    return Number.NaN;
  }
  const v = localReach(term, reach);
  const sum = overCells(term, (l1, order) =>
    order < 2 ? 0 : l1 * order * (order - 1) * v ** (order - 2),
  );
  return (sum * term.cells * term.cells) / (term.scale * term.scale);
}

/** Each term's `termDisplacementBound`. */
export function termBounds(terms: WarpTerms, reach = 1): number[] {
  return terms.map(({ term }) => termDisplacementBound(term, reach));
}

/**
 * How far `terms` can move a point from where it is, in model units, at
 * their parameters' values now: the draw's bounding radius grows by this
 * much. `max(1, Σ|wᵢ|)` times the largest term's bound: at least the largest
 * term alone, so a weight moving between 0 and 1 (a morph) leaves it be
 * (ranges of parameters will tighten this); and since
 * `|Σ wᵢ·Dᵢ| ≤ Σ|wᵢ|·|Dᵢ|`, never less than the move. `bounds` is
 * `termBounds(terms, reach)` when the caller has it.
 */
export function termsMaxDisplacement(
  terms: WarpTerms,
  reach = 1,
  bounds: readonly number[] = termBounds(terms, reach),
): number {
  let sum = 0;
  let largest = 0;
  terms.forEach(({ weight }, i) => {
    sum += Math.abs(weightOf(weight));
    largest = Math.max(largest, bounds[i]!);
  });
  return Math.max(1, sum) * largest;
}

/**
 * A bound on the second derivative of `terms`' displacement over the tile
 * (spec section 8.2): `Σ |wᵢ| · termCurvatureBound`. NaN if any term is an
 * attribute.
 */
export function termsSecondDerivativeBound(
  terms: WarpTerms,
  reach = 1,
): number {
  let sum = 0;
  for (const { term, weight } of terms) {
    const c = termCurvatureBound(term, reach);
    if (Number.isNaN(c)) {
      return Number.NaN;
    }
    sum += Math.abs(weightOf(weight)) * c;
  }
  return sum;
}

/** Whether `terms` can be evaluated where the content has no vertex: none reads an attribute. */
export function termsResamplable(terms: WarpTerms): boolean {
  return terms.every(({ term }) => term.kind !== "attribute");
}

/** The parameters `terms` read, each once. */
export function termsParameters(terms: WarpTerms): PlacementParameter[] {
  const seen = new Set<PlacementParameter>();
  for (const { weight } of terms) {
    for (const f of weight.factors) {
      seen.add(f.parameter);
    }
  }
  return [...seen];
}

function checkLattice(caller: string, l: CubicLattice, prefix: string): void {
  if (l.center.length !== 3) {
    throw new RangeError(
      `${caller}: ${prefix}center has ${l.center.length} components, not 3.`,
    );
  }
  for (let i = 0; i < 3; i++) {
    finite32(caller, `${prefix}center[${i}]`, l.center[i]!);
  }
  finite32(caller, `${prefix}scale`, l.scale);
  if (!(l.scale > 0)) {
    throw new RangeError(
      `${caller}: ${prefix}scale is ${l.scale}; it is the tile's radius, and must be positive.`,
    );
  }
  // The GPU reads its reciprocal.
  finite32(caller, `1 / ${prefix}scale`, 1 / l.scale);
  if (!(LATTICE_CELLS as readonly number[]).includes(l.cells)) {
    throw new RangeError(
      `${caller}: ${prefix}cells is ${l.cells}; a lattice has ${LATTICE_CELLS.join(", ")} cells per axis.`,
    );
  }
  const expected = l.cells ** 3 * PLACEMENT_TERMS * 3;
  if (l.coefficients.length !== expected) {
    throw new RangeError(
      `${caller}: ${prefix}coefficients has ${l.coefficients.length} values, not ${expected} (${l.cells}³ cells of ${PLACEMENT_TERMS} terms per axis).`,
    );
  }
  for (let i = 0; i < l.coefficients.length; i++) {
    finite32(caller, `${prefix}coefficients[${i}]`, l.coefficients[i]!);
  }
  finite(caller, `${prefix}errorBound`, l.errorBound);
  if (l.errorBound < 0) {
    throw new RangeError(
      `${caller}: ${prefix}errorBound is ${l.errorBound}; a bound is not negative.`,
    );
  }
}

/**
 * Refuses terms with a non-finite or out-of-range number, or one the GPU
 * can't hold, naming the field (`terms[1].weight.scale`,
 * `terms[0].coefficients[7]`, …): at most `MAX_WARP_TERMS` terms, a lattice's
 * `cells` one of `LATTICE_CELLS`, its coefficients `cells³ × 20 × 3`.
 */
export function checkTerms(caller: string, terms: WarpTerms): void {
  if (terms.length < 1) {
    throw new RangeError(
      `${caller}: terms has no term; it takes 1 to ${MAX_WARP_TERMS}.`,
    );
  }
  if (terms.length > MAX_WARP_TERMS) {
    throw new RangeError(
      `${caller}: terms has ${terms.length} terms; a draw takes at most ${MAX_WARP_TERMS}.`,
    );
  }
  terms.forEach(({ term, weight }, i) => {
    const prefix = `terms[${i}].`;
    finite32(caller, `${prefix}weight.scale`, weight.scale);
    if (weight.factors.length > 2) {
      throw new RangeError(
        `${caller}: ${prefix}weight has ${weight.factors.length} factors; at most 2.`,
      );
    }
    weight.factors.forEach((f, j) => {
      const at = `${prefix}weight.factors[${j}].`;
      finite32(caller, `${at}offset`, f.offset);
      finite32(caller, `${at}slope`, f.slope);
      finite32(caller, `${at}parameter's value`, f.parameter.value);
    });
    if (term.kind === "attribute") {
      if (typeof term.semantic !== "string" || !term.semantic) {
        throw new RangeError(`${caller}: ${prefix}semantic is empty.`);
      }
      finite32(caller, `${prefix}maxDistance`, term.maxDistance);
      if (term.maxDistance < 0) {
        throw new RangeError(
          `${caller}: ${prefix}maxDistance is ${term.maxDistance}; a distance is not negative.`,
        );
      }
    } else if (term.kind === "cubic") {
      checkLattice(caller, term, prefix);
    } else {
      throw new RangeError(
        `${caller}: ${prefix}kind is ${String((term as { kind: unknown }).kind)}; a term is a cubic lattice or an attribute.`,
      );
    }
  });
}

/** `x`'s derivative at the power `e` (0 to 3): `e · x^(e−1)`. */
function powerDerivative(x: number, e: number): number {
  return e === 0 ? 0 : e === 1 ? 1 : e === 2 ? 2 * x : 3 * x * x;
}

/**
 * A lattice's Jacobian `dD/dp` at `p`, column-major into `out` (9 values,
 * `out[3 * column + row]`, as Slang's `float3x3` reads): each monomial's
 * derivative in the cell's local coordinate `v`, times `dv/dp = cells / scale`
 * on every axis. The twin of shaders/placement.slang `latticeDisplacement`.
 */
export function latticeJacobian(
  lattice: CubicLattice,
  p: ArrayLike<number>,
  out: Float64Array,
): Float64Array {
  const n = lattice.cells;
  const inv = 1 / lattice.scale;
  // The cell and the local coordinate `v`, as `latticeDisplacement` finds them.
  const v = [0, 0, 0];
  let cell = 0;
  for (let a = 0; a < 3; a++) {
    const u = (p[a]! - lattice.center[a]!) * inv;
    if (n === 1) {
      v[a] = u;
      continue;
    }
    const s = (u + 1) * 0.5 * n;
    const i = Math.min(Math.max(Math.floor(s), 0), n - 1);
    v[a] = 2 * (s - i) - 1;
    cell += i * n ** a;
  }
  const dvdp = n * inv;
  const base = cell * PLACEMENT_TERMS;
  const c = lattice.coefficients;
  out.fill(0);
  for (let k = 0; k < PLACEMENT_TERMS; k++) {
    const [a, b, e] = PLACEMENT_MONOMIALS[k]!;
    const px = power(v[0]!, a);
    const py = power(v[1]!, b);
    const pz = power(v[2]!, e);
    const g = [
      powerDerivative(v[0]!, a) * py * pz,
      px * powerDerivative(v[1]!, b) * pz,
      px * py * powerDerivative(v[2]!, e),
    ];
    const r = (base + k) * 3;
    for (let axis = 0; axis < 3; axis++) {
      for (let row = 0; row < 3; row++) {
        out[axis * 3 + row]! += c[r + row]! * g[axis]! * dvdp;
      }
    }
  }
  return out;
}

/**
 * The Jacobian of the placement `terms` give at model-space `position`:
 * `J = I + Σ wᵢ·Jᵢ`, column-major into `out` (9 values), where a lattice's
 * `Jᵢ` is its cubic's derivative (`latticeJacobian`) and an attribute's is
 * zero (data has no derivative in space: the position's own is the
 * identity, and a normal is not turned by it). The float64 twin of
 * shaders/placement.slang `placeVertex`'s `jacobian`.
 */
export function placeJacobianWithTerms(
  terms: WarpTerms,
  position: ArrayLike<number>,
  out: Float64Array,
): Float64Array {
  out.fill(0);
  out[0] = out[4] = out[8] = 1;
  const j = new Float64Array(9);
  for (const { term, weight } of terms) {
    const w = weightOf(weight);
    if (term.kind !== "cubic") {
      continue;
    }
    latticeJacobian(term, position, j);
    for (let i = 0; i < 9; i++) {
      out[i]! += w * j[i]!;
    }
  }
  return out;
}

/**
 * A normal turned by the Jacobian `j` (column-major, 9 values): the
 * cofactor matrix `det(J)·J⁻ᵀ` on `n`, normalized, kept on its side under a
 * negative determinant. The twin of shaders/placement.slang `turnNormal`.
 */
export function turnNormalByJacobian(
  j: ArrayLike<number>,
  n: ArrayLike<number>,
  out: Float64Array,
): Float64Array {
  const cross = (a: number, b: number): [number, number, number] => {
    const [ax, ay, az] = [j[a * 3]!, j[a * 3 + 1]!, j[a * 3 + 2]!];
    const [bx, by, bz] = [j[b * 3]!, j[b * 3 + 1]!, j[b * 3 + 2]!];
    return [ay * bz - az * by, az * bx - ax * bz, ax * by - ay * bx];
  };
  const c0 = cross(1, 2);
  const c1 = cross(2, 0);
  const c2 = cross(0, 1);
  const det = j[0]! * c0[0] + j[1]! * c0[1] + j[2]! * c0[2];
  const sign = det < 0 ? -1 : 1;
  let length = 0;
  for (let i = 0; i < 3; i++) {
    out[i] = (c0[i]! * n[0]! + c1[i]! * n[1]! + c2[i]! * n[2]!) * sign;
    length += out[i]! * out[i]!;
  }
  length = Math.sqrt(length);
  for (let i = 0; i < 3; i++) {
    out[i]! /= length;
  }
  return out;
}
