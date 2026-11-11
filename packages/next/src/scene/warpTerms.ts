// A draw's warp on the GPU (plan §13.26, the second review): up to three
// weighted displacement terms in model space, p' = p + Σ wᵢ·Dᵢ(p). One form
// for every case: a route's fit (a cubic lattice, weight 1), an
// application's exaggeration (weight k − 1), a morph target (a vertex
// attribute, weight from the application), and their mixes. It replaces
// the closed set of `Placement` kinds inside the engine; those stay as
// input until the API review (5i) and are converted to terms. Types only:
// the CPU twin and the GPU layout are scene/warpEvaluate.ts and
// shaders/placement.slang's.
import type { PlacementParameter } from "./placement.ts";

/** Terms a draw may carry. */
export const MAX_WARP_TERMS = 3;

/** Cells per axis a lattice may have. */
export const LATTICE_CELLS = [1, 2, 4, 8] as const;

/**
 * A displacement fitted to a route over one tile, as a lattice of cubics:
 *
 * - `u = (p − center) / scale` puts the tile in [−1, 1]³ (`scale` is its
 *   radius in model units).
 * - The lattice has `cells` cells per axis over that cube. A point's cell is
 *   `i = clamp(floor((u + 1) / 2 · cells), 0, cells − 1)` per axis, and its
 *   local coordinate `v = 2((u + 1) / 2 · cells − i) − 1`, in [−1, 1].
 * - Each cell holds 20 monomials of total degree ≤ 3 in `v`, in
 *   `PLACEMENT_MONOMIALS`' order, times 3 components (x, y, z), model units:
 *   coefficient `((cell · 20) + term) · 3 + axis`. Cells run x fastest:
 *   `cell = (iz · cells + iy) · cells + ix`.
 *
 * Points outside the cube take the nearest cell's polynomial, extrapolated.
 */
export interface CubicLattice {
  readonly kind: "cubic";
  /** The tile's centre in model coordinates (3). */
  readonly center: ArrayLike<number>;
  /** The tile's radius in model units (> 0). */
  readonly scale: number;
  /** Cells per axis: one of `LATTICE_CELLS`. */
  readonly cells: number;
  /** `cells³ × 20 × 3` coefficients, model units. */
  readonly coefficients: Float64Array;
  /** How far the lattice may be from the route it was fitted to over the tile, m. */
  readonly errorBound: number;
  /** True when `errorBound` was measured at samples rather than proven: an estimate, not a bound. */
  readonly estimate: boolean;
  /** What it was fitted to, in words (the route's warps). */
  readonly operation?: string;
}

/**
 * A displacement read from a vertex attribute (3 components): a morph
 * target. `absolute` attributes hold a second position, and the
 * displacement is `attribute − p` (the dual positions of 5a); otherwise the
 * attribute is the displacement, as glTF's morph targets are.
 */
export interface AttributeTerm {
  readonly kind: "attribute";
  /** The mesh's named attribute (`MeshData.attributes`). */
  readonly semantic: string;
  readonly absolute: boolean;
  /** The largest displacement it holds, model units: stated by whoever made it. */
  readonly maxDistance: number;
}

export type WarpTerm = CubicLattice | AttributeTerm;

/** One factor of a weight: `offset + slope · parameter`. */
export interface WeightFactor {
  readonly parameter: PlacementParameter;
  readonly offset: number;
  readonly slope: number;
}

/**
 * A term's weight: `scale × Π factors`, with 0 to 2 factors. Exaggeration
 * by k is one factor (`−1 + 1·k`); exaggeration during a morph by t is two
 * (`(k − 1)(1 − t)`), so neither needs a refit when a slider moves.
 */
export interface TermWeight {
  readonly scale: number;
  readonly factors: readonly WeightFactor[];
}

export interface WeightedTerm {
  readonly term: WarpTerm;
  readonly weight: TermWeight;
}

/** A draw's warp: 1 to `MAX_WARP_TERMS` weighted terms. */
export type WarpTerms = readonly WeightedTerm[];

/** A constant weight. */
export function constantWeight(scale: number): TermWeight {
  return { scale, factors: [] };
}
