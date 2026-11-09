// Stars sorted into sky cells, so a view draws only the cells it sees and, in each,
// only the stars bright enough to show (CESIUM2_WEBGPU_PLAN.md §13.32). Plain data
// with no GPU types. It runs in the worker, for any star field, and `cullCell` is the
// plain function that sky.slang's `starCull` mirrors.
import type { PointSpread } from "../scene/observer.ts";
import {
  STAR_FLOATS,
  starPeakShare,
  starRadius,
  type StarField,
} from "./stars.ts";

/** Cells along a side of each of the sky cube's faces. */
export const CELLS_PER_SIDE = 8;
/** Cells in the sky (sky.slang `STAR_CELLS`). */
export const STAR_CELLS = 6 * CELLS_PER_SIDE * CELLS_PER_SIDE;
/** Floats per cell in `StarCells.table`. */
export const CELL_FLOATS = 8;
/** The binary search's bound (sky.slang `STAR_SEARCH_STEPS`): 2²⁴ stars. */
export const STAR_SEARCH_STEPS = 24;
/** The share of white below which a star's peak isn't drawn. */
export const STAR_VISIBLE = 1e-4;

/** A patch of sky: a cone around its stars, and where they are in the points. */
export interface StarCell {
  center: [number, number, number];
  /** The sine of the cone's half angle. */
  sinRadius: number;
  /** The first star, and how many. */
  first: number;
  count: number;
}

/** A star field's cells (`buildStarCells`). */
export interface StarCells {
  /** The field's stars, by cell, each cell brightest first. */
  points: Float32Array;
  cells: StarCell[];
  /** `CELL_FLOATS` per cell: center and `sinRadius`, then first and count. */
  table: Float32Array;
  /** Per star, in the points' order: for culling on the CPU (`cullCell`). */
  illuminance: Float32Array;
}

/** The cell of a direction: the cube's face, then a square of it. */
function cellOf(x: number, y: number, z: number): number {
  const [ax, ay, az] = [Math.abs(x), Math.abs(y), Math.abs(z)];
  let face: number;
  let u: number;
  let v: number;
  if (ax >= ay && ax >= az) {
    face = x >= 0 ? 0 : 1;
    u = y / ax;
    v = z / ax;
  } else if (ay >= az) {
    face = y >= 0 ? 2 : 3;
    u = x / ay;
    v = z / ay;
  } else {
    face = z >= 0 ? 4 : 5;
    u = x / az;
    v = y / az;
  }
  const side = (t: number) =>
    Math.min(
      Math.max(Math.floor(((t + 1) / 2) * CELLS_PER_SIDE) | 0, 0),
      CELLS_PER_SIDE - 1,
    );
  return (face * CELLS_PER_SIDE + side(v)) * CELLS_PER_SIDE + side(u);
}

/** The direction at the middle of a cell, unit. */
function cellCenter(cell: number): [number, number, number] {
  const face = Math.floor(cell / (CELLS_PER_SIDE * CELLS_PER_SIDE));
  const rest = cell - face * CELLS_PER_SIDE * CELLS_PER_SIDE;
  const u = (((rest % CELLS_PER_SIDE) + 0.5) / CELLS_PER_SIDE) * 2 - 1;
  const v =
    ((Math.floor(rest / CELLS_PER_SIDE) + 0.5) / CELLS_PER_SIDE) * 2 - 1;
  const sign = face % 2 === 0 ? 1 : -1;
  const axis = face >> 1;
  const d: [number, number, number] =
    axis === 0 ? [sign, u, v] : axis === 1 ? [u, sign, v] : [u, v, sign];
  const k = 1 / Math.hypot(d[0], d[1], d[2]);
  return [d[0] * k, d[1] * k, d[2] * k];
}

/**
 * Sorts a field's stars into `STAR_CELLS` cells, stably, so each cell stays
 * brightest first: if a field's order isn't that, its cell is sorted. Each
 * cell's cone is as tight as its stars allow.
 */
export function buildStarCells(points: Float32Array, count: number): StarCells {
  const cellOfStar = new Uint16Array(count);
  const counts = new Uint32Array(STAR_CELLS);
  for (let i = 0; i < count; i++) {
    const at = i * STAR_FLOATS;
    const cell = cellOf(points[at]!, points[at + 1]!, points[at + 2]!);
    cellOfStar[i] = cell;
    counts[cell]!++;
  }
  const cells: StarCell[] = [];
  const next = new Uint32Array(STAR_CELLS);
  let first = 0;
  for (let c = 0; c < STAR_CELLS; c++) {
    cells.push({
      center: cellCenter(c),
      sinRadius: 0,
      first,
      count: counts[c]!,
    });
    next[c] = first;
    first += counts[c]!;
  }
  const sorted = new Float32Array(count * STAR_FLOATS);
  const illuminance = new Float32Array(count);
  const smallestCos = new Float64Array(STAR_CELLS).fill(1);
  for (let i = 0; i < count; i++) {
    const at = i * STAR_FLOATS;
    const c = cellOfStar[i]!;
    const to = next[c]!++;
    for (let k = 0; k < STAR_FLOATS; k++) {
      sorted[to * STAR_FLOATS + k] = points[at + k]!;
    }
    const lux = points[at + 3]!;
    illuminance[to] = lux;
    const center = cells[c]!.center;
    const length =
      Math.hypot(points[at]!, points[at + 1]!, points[at + 2]!) || 1;
    const cos =
      (points[at]! * center[0] +
        points[at + 1]! * center[1] +
        points[at + 2]! * center[2]) /
      length;
    if (cos < smallestCos[c]!) {
      smallestCos[c] = cos;
    }
  }
  const table = new Float32Array(STAR_CELLS * CELL_FLOATS);
  cells.forEach((cell, c) => {
    if (cell.count > 0) {
      sortCell(sorted, illuminance, cell);
      // Past rounding in 32-bit floats, which is what a shader tests with.
      cell.sinRadius = Math.min(
        Math.sqrt(Math.max(1 - smallestCos[c]! * smallestCos[c]!, 0)) + 1e-5,
        1,
      );
    }
    table.set(cell.center, c * CELL_FLOATS);
    table[c * CELL_FLOATS + 3] = cell.sinRadius;
    table[c * CELL_FLOATS + 4] = cell.first;
    table[c * CELL_FLOATS + 5] = cell.count;
  });
  return { points: sorted, cells, table, illuminance };
}

/** Puts a cell brightest first, if it isn't already. */
function sortCell(
  points: Float32Array,
  illuminance: Float32Array,
  { first, count }: StarCell,
): void {
  let ordered = true;
  for (let i = 1; i < count && ordered; i++) {
    ordered = illuminance[first + i - 1]! >= illuminance[first + i]!;
  }
  if (ordered) {
    return;
  }
  const order = Array.from({ length: count }, (_, i) => i).sort(
    (a, b) => illuminance[first + b]! - illuminance[first + a]! || a - b,
  );
  const from = points.slice(first * STAR_FLOATS, (first + count) * STAR_FLOATS);
  order.forEach((was, now) => {
    const to = (first + now) * STAR_FLOATS;
    points.set(from.subarray(was * STAR_FLOATS, (was + 1) * STAR_FLOATS), to);
    illuminance[first + now] = from[was * STAR_FLOATS + 3]!;
  });
}

/** A field with its cells: its points replaced by their sorted order. */
export function withStarCells(field: StarField): StarField {
  const built = buildStarCells(field.points, field.count);
  return { ...field, points: built.points, cells: built };
}

/**
 * How many of a cell's stars to draw: none if its cone is outside any of the view's
 * planes; otherwise those at or above `minIlluminance`, found in at most
 * `STAR_SEARCH_STEPS` steps.
 */
export function cullCell(
  { center, sinRadius, first, count }: StarCell,
  planes: ArrayLike<number>,
  minIlluminance: number,
  illuminance: ArrayLike<number>,
): number {
  for (let p = 0; p < 16; p += 4) {
    const facing =
      planes[p]! * center[0] +
      planes[p + 1]! * center[1] +
      planes[p + 2]! * center[2];
    if (facing < -sinRadius) {
      return 0;
    }
  }
  let low = 0;
  let high = count;
  for (let step = 0; step < STAR_SEARCH_STEPS && low < high; step++) {
    const middle = (low + high) >>> 1;
    if (illuminance[first + middle]! >= minIlluminance) {
      low = middle + 1;
    } else {
      high = middle;
    }
  }
  return low;
}

/** What a view's cull tests with (`starCullInputs`). */
export interface StarCullInputs {
  /** Four planes through the eye, in ICRF: inward unit normals, then 0. */
  planes: Float32Array;
  /** Fainter stars can't show anywhere in the view, lux. */
  minIlluminance: number;
  /** Fainter than this at a pixel, a star doesn't show there, cd/m². */
  minRadiance: number;
}

/** The set of planes and thresholds to reuse each tick. */
export const starCullStorage = (): StarCullInputs => ({
  planes: new Float32Array(16),
  minIlluminance: 0,
  minRadiance: 0,
});

/** A plane through the eye at `tangent` along `axis`, in ICRF: inward, unit. */
function writePlane(
  planes: Float32Array,
  at: number,
  forward: ArrayLike<number>,
  tangent: number,
  axis: ArrayLike<number>,
  sign: number,
  rows: ArrayLike<number>,
): void {
  let length = 0;
  for (let i = 0; i < 3; i++) {
    // Earth-fixed to ICRF: the transpose of `rows`.
    let v = 0;
    for (let j = 0; j < 3; j++) {
      v += rows[j * 3 + i]! * (forward[j]! * tangent + sign * axis[j]!);
    }
    planes[at + i] = v;
    length += v * v;
  }
  length = 1 / Math.sqrt(length);
  for (let i = 0; i < 3; i++) {
    planes[at + i]! *= length;
  }
  planes[at + 3] = 0;
}

/**
 * What a view's cull tests with: from the sky's uniform values, so there's no new
 * read of the field of view. `rows` is `icrfToFixed`, row by row. A star shows if
 * its peak pixel reaches `STAR_VISIBLE` of white, after the chain's `shadowGain`
 * lifts it; `minIlluminance` is that at the view's smallest pixel, in its corner,
 * and the planes stand out by the largest `starRadius`. Writes `out`.
 */
export function starCullInputs(
  forward: ArrayLike<number>,
  right: ArrayLike<number>,
  up: ArrayLike<number>,
  tanX: number,
  tanY: number,
  width: number,
  height: number,
  exposure: number,
  rows: ArrayLike<number>,
  shadowGain: number,
  spread: PointSpread,
  pixelRatio: number,
  out: StarCullInputs = starCullStorage(),
): StarCullInputs {
  const margin = starRadius(spread, Infinity, pixelRatio);
  const wideX = tanX * (1 + (2 * margin) / width);
  const wideY = tanY * (1 + (2 * margin) / height);
  const { planes } = out;
  writePlane(planes, 0, forward, wideX, right, 1, rows);
  writePlane(planes, 4, forward, wideX, right, -1, rows);
  writePlane(planes, 8, forward, wideY, up, 1, rows);
  writePlane(planes, 12, forward, wideY, up, -1, rows);
  const pixelAngle = (2 * tanY) / height;
  const gain = Math.max(shadowGain, 1);
  out.minRadiance =
    STAR_VISIBLE / (exposure * starPeakShare(spread.core * pixelRatio) * gain);
  const cornerZ = 1 / Math.sqrt(1 + wideX * wideX + wideY * wideY);
  out.minIlluminance = out.minRadiance * pixelAngle * pixelAngle * cornerZ ** 3;
  return out;
}

/** How a view's stars are submitted. */
export type StarSubmission = "indirect" | "direct";

/**
 * Indirect, unless the world submits directly, or an indirect draw's first
 * instance would be silently ignored.
 */
export function starSubmission(
  mode: "indirect" | "direct",
  capabilities: { readonly indirectFirstInstance: boolean },
): StarSubmission {
  return mode === "direct" || !capabilities.indirectFirstInstance
    ? "direct"
    : "indirect";
}
