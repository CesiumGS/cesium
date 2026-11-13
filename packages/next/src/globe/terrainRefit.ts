/**
 * Per-tile terrain error, refitted bottom-up like a bounding volume
 * hierarchy from its contents.
 *
 * A terrain tile's geometric error starts as its level's estimate
 * (`levelZeroError / 2 ** level`), the same for a ridge and a valley floor.
 * Once a tile and its parent are both decoded, the two meshes can be
 * compared: `deviationFromParent` is the largest height difference between
 * the child's surface and the parent's over the child's quadrant. By the
 * triangle inequality, the parent's distance from the true surface, over
 * one quadrant, is at most that deviation plus the child's own distance from
 * the true surface. Over all four quadrants, `parentBound` is the bound.
 * The parent's error becomes the smaller of its level estimate and that
 * bound, and the change propagates upward.
 *
 * What the numbers do and do not claim:
 * - The deviation is measured at the vertices of both meshes (the difference
 *   of two piecewise-linear surfaces is piecewise linear, so its extreme is
 *   at a vertex of the two meshes laid over each other). Points where an
 *   edge of one mesh crosses an edge of the other are not sampled, so the
 *   deviation can fall short of the true maximum there.
 * - Heights are the quantized ones (15 bits over the tile's height range), as
 *   drawn. The source's own error against reality is not in the bound.
 * - A child's "own error" is its level estimate until its children refit it:
 *   the level estimate is the data's nominal error, not a measurement.
 */
import type { TerrainHeights } from "./quantizedMesh.ts";

/** Cells per side of a mesh's triangle index. */
const GRID = 16;
const QUANT = 32767;

/** A mesh's triangles binned on a regular grid over the tile. */
interface TriangleGrid {
  /** Per cell, the first triangle index into `entries` and the count. */
  start: Uint32Array;
  entries: Uint32Array;
}

const grids = new WeakMap<TerrainHeights, TriangleGrid>();

function gridOf(t: TerrainHeights): TriangleGrid {
  let g = grids.get(t);
  if (g) {
    return g;
  }
  const { u, v, triangles } = t;
  const count = Math.floor(triangles.length / 3);
  const cell = (q: number) =>
    Math.min(GRID - 1, Math.max(0, Math.floor((q / QUANT) * GRID)));
  const counts = new Uint32Array(GRID * GRID);
  const ranges = new Uint8Array(count * 4);
  for (let k = 0; k < count; k++) {
    const a = triangles[k * 3]!;
    const b = triangles[k * 3 + 1]!;
    const c = triangles[k * 3 + 2]!;
    const x0 = cell(Math.min(u[a]!, u[b]!, u[c]!));
    const x1 = cell(Math.max(u[a]!, u[b]!, u[c]!));
    const y0 = cell(Math.min(v[a]!, v[b]!, v[c]!));
    const y1 = cell(Math.max(v[a]!, v[b]!, v[c]!));
    ranges.set([x0, x1, y0, y1], k * 4);
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        counts[y * GRID + x]!++;
      }
    }
  }
  const start = new Uint32Array(GRID * GRID + 1);
  for (let i = 0; i < GRID * GRID; i++) {
    start[i + 1] = start[i]! + counts[i]!;
  }
  const fill = start.slice(0, GRID * GRID);
  const entries = new Uint32Array(start[GRID * GRID]!);
  for (let k = 0; k < count; k++) {
    const [x0, x1, y0, y1] = [
      ranges[k * 4]!,
      ranges[k * 4 + 1]!,
      ranges[k * 4 + 2]!,
      ranges[k * 4 + 3]!,
    ];
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        entries[fill[y * GRID + x]!++] = k;
      }
    }
  }
  g = { start, entries };
  grids.set(t, g);
  return g;
}

/**
 * The mesh's height (metres) at quantized (u, v) in 0..32767, interpolated in
 * the triangle containing it; undefined if none does (a gap in the mesh).
 */
function heightAt(t: TerrainHeights, u: number, v: number): number | undefined {
  const g = gridOf(t);
  const cx = Math.min(GRID - 1, Math.max(0, Math.floor((u / QUANT) * GRID)));
  const cy = Math.min(GRID - 1, Math.max(0, Math.floor((v / QUANT) * GRID)));
  const cell = cy * GRID + cx;
  const { u: us, v: vs, h: hs, triangles } = t;
  for (let e = g.start[cell]!; e < g.start[cell + 1]!; e++) {
    const k = g.entries[e]! * 3;
    const i0 = triangles[k]!;
    const i1 = triangles[k + 1]!;
    const i2 = triangles[k + 2]!;
    const u0 = us[i0]!,
      u1 = us[i1]!,
      u2 = us[i2]!;
    const v0 = vs[i0]!,
      v1 = vs[i1]!,
      v2 = vs[i2]!;
    const x1mx3 = u0 - u2;
    const x3mx2 = u2 - u1;
    const y2my3 = v1 - v2;
    const y1my3 = v0 - v2;
    const inverse = 1 / (y2my3 * x1mx3 + x3mx2 * y1my3);
    const l1 = (y2my3 * (u - u2) + x3mx2 * (v - v2)) * inverse;
    const l2 = (-y1my3 * (u - u2) + x1mx3 * (v - v2)) * inverse;
    const l3 = 1 - l1 - l2;
    if (l1 >= -1e-9 && l2 >= -1e-9 && l3 >= -1e-9) {
      const q = l1 * hs[i0]! + l2 * hs[i1]! + l3 * hs[i2]!;
      return (
        t.minimumHeight + (q / QUANT) * (t.maximumHeight - t.minimumHeight)
      );
    }
  }
  return undefined;
}

/**
 * The largest height difference (metres) between a child's mesh and its
 * parent's, over the child's quadrant (`qx`, `qy` in {0, 1}, from the
 * south-west). Measured at the child's vertices against the parent's
 * triangles, and at the parent's vertices inside the quadrant against the
 * child's. Infinity if a point has no triangle under it (a mesh with a gap):
 * no refit then.
 */
export function deviationFromParent(
  child: TerrainHeights,
  parent: TerrainHeights,
  qx: number,
  qy: number,
): number {
  let dev = 0;
  const childRange = child.maximumHeight - child.minimumHeight;
  for (let i = 0; i < child.u.length; i++) {
    const hc = child.minimumHeight + (child.h[i]! / QUANT) * childRange;
    const hp = heightAt(
      parent,
      (qx + child.u[i]! / QUANT) * 0.5 * QUANT,
      (qy + child.v[i]! / QUANT) * 0.5 * QUANT,
    );
    if (hp === undefined) {
      return Infinity;
    }
    dev = Math.max(dev, Math.abs(hc - hp));
  }
  const parentRange = parent.maximumHeight - parent.minimumHeight;
  const lo = (qx * QUANT) / 2;
  const hi = lo + QUANT / 2;
  const lov = (qy * QUANT) / 2;
  const hiv = lov + QUANT / 2;
  for (let i = 0; i < parent.u.length; i++) {
    const pu = parent.u[i]!;
    const pv = parent.v[i]!;
    if (pu < lo || pu > hi || pv < lov || pv > hiv) {
      continue;
    }
    const hp = parent.minimumHeight + (parent.h[i]! / QUANT) * parentRange;
    const hc = heightAt(child, (pu - lo) * 2, (pv - lov) * 2);
    if (hc === undefined) {
      return Infinity;
    }
    dev = Math.max(dev, Math.abs(hc - hp));
  }
  return dev;
}

/**
 * The parent's distance from the true surface, bounded by its four
 * children's: each child's deviation from it plus its own error.
 */
export function parentBound(
  children: readonly { deviation: number; error: number }[],
): number {
  let bound = 0;
  for (const c of children) {
    bound = Math.max(bound, c.deviation + c.error);
  }
  return bound;
}

/**
 * How much of a tile's deviation from its parent an estimate takes for the
 * tile's own error, where its children are not loaded to measure it. A
 * guess, not a bound: a tile one level finer usually has half the error of
 * its parent's mesh, and its parent's deviation from it is roughly that
 * error.
 */
export const PREDICTED_ERROR_RATIO = 0.5;

/** A tile's error as a refit found it. */
export interface RefitState {
  /** The level's estimate: the error before any refit; never exceeded. */
  levelError: number;
  /** Its mesh's largest height difference from its parent's, once measured. */
  deviation?: number;
  /**
   * min(levelError, bound from its children), once all four are measured:
   * a bound, within what the header above says it measures.
   */
  soundError?: number;
}

/** The error a bound alone supports for a tile: its level's until refit. */
export function soundError(s: RefitState): number {
  return s.soundError ?? s.levelError;
}

/**
 * An estimate of the tile's error from its deviation from its parent, never
 * above its level's estimate. Not a bound.
 */
export function predictedError(s: RefitState): number | undefined {
  return s.deviation === undefined || !Number.isFinite(s.deviation)
    ? undefined
    : Math.min(s.levelError, PREDICTED_ERROR_RATIO * s.deviation);
}
