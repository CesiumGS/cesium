type Feature = { name: string; kind: string };

/** A triangle: its corners (9 numbers, design units), colour and feature. */
export interface CoarseTriangle {
  p: number[];
  color: [number, number, number, number];
  feature: Feature;
}
export interface CoarsenStats {
  standIns: number;
  blocks: number;
  merged: number;
  unsimplified: number;
  restored: number;
  droppedFlats: number;
  there?: number;
  back?: number;
}

/** A feature within this many metres of one height everywhere is flat. */
export const FLAT_METRES: number;
/** A feature whose every triangle is narrower than this, metres, is a wire. */
export const WIRE_METRES: number;

/** A drawing's triangles (no subdivision). */
export function trianglesOf(draw: (builder: unknown) => void): CoarseTriangle[];
/** The flat and wire features of a model's full-detail triangles. */
export function detailFeatures(
  triangles: readonly CoarseTriangle[],
  metersPerUnit: number,
): Set<Feature>;
/** Triangles in a horizontal grid, for the distance to the nearest. */
export class TriangleGrid {
  constructor(
    triangles: readonly { p: ArrayLike<number> }[],
    cell: number,
    clip?: [number, number, number, number],
  );
  /** The nearest distance; or, once one within `enough` is found, at most it. */
  distance(x: number, y: number, z: number, enough?: number): number;
}
/**
 * The largest distance from samples of `from` (at most `spacing` apart, so
 * the true largest is at most this plus `spacing`) to `grid`; at least
 * `start`, and a sample within `start` ends its search there.
 */
export function largestDistance(
  from: readonly { p: ArrayLike<number> }[],
  grid: TriangleGrid,
  spacing: number,
  start?: number,
): number;
/** A mesh with its repeated vertices shared. */
export function weld<
  M extends {
    design: Float64Array;
    normals: Float32Array;
    colors: Float32Array;
    featureIds: Uint16Array;
    indices: Uint32Array;
  },
>(mesh: M): M;
/** One coarse tile: what it draws and the error it must state. */
export function coarsen(input: {
  pieces: {
    part: unknown;
    full: CoarseTriangle[];
    lod: { error: number };
    hand: CoarseTriangle[] | null;
  }[];
  ground: CoarseTriangle[];
  detail: (feature: Feature) => boolean;
  cell: number;
  layer: number;
  target?: number;
}): { triangles: CoarseTriangle[]; error: number; stats: CoarsenStats };
