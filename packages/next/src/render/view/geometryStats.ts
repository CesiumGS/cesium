// What a frame submits, by kind, counted on the CPU from the batches a world
// already keeps (no GPU readback, no walk of the draw records). A world's
// count is cached against `World.version`, which every draw added, removed
// or shown or hidden bumps, so a frame walks the batch list only when the
// draw list changed. Counts are what is submitted, before the GPU's culling.
import type { Batch, PointMesh } from "../../scene/world/types.ts";

/** The kinds, in the order the inspector lists them. */
export const GEOMETRY_KINDS = [
  "terrain",
  "meshes",
  "instanced",
  "patches",
  "billboards",
  "lines",
  "points",
] as const;
export type GeometryKind = (typeof GEOMETRY_KINDS)[number];

/** One kind's share of a frame. */
export interface KindStats {
  /** Draw items: records not instanced, plus each instance. */
  draws: number;
  /** Whole triangles (index count / 3, rounded down, per draw item). */
  triangles: number;
  /** Points (point sets: their capacity; an upper bound). */
  points: number;
  /** Line segments (index count / 2 per draw item). */
  segments: number;
}

export type GeometryStats = Record<GeometryKind, KindStats>;

export function emptyGeometry(): GeometryStats {
  const out = {} as GeometryStats;
  for (const kind of GEOMETRY_KINDS) {
    out[kind] = { draws: 0, triangles: 0, points: 0, segments: 0 };
  }
  return out;
}

/** Zeroes `g`. */
export function resetGeometry(g: GeometryStats): void {
  for (const kind of GEOMETRY_KINDS) {
    const k = g[kind];
    k.draws = k.triangles = k.points = k.segments = 0;
  }
}

/** The kind a batch counts under. */
export function kindOf(batch: Batch): GeometryKind {
  if (batch.points) {
    return "points";
  }
  if (batch.patches) {
    return "patches";
  }
  if (batch.billboard) {
    return "billboards";
  }
  if (batch.mesh.topology === "line-list") {
    return "lines";
  }
  if (batch.mesh.skirtStart !== undefined) {
    return "terrain";
  }
  return batch.instanced ? "instanced" : "meshes";
}

/** Adds the shown `batches` to `out`. Patch draws add draws only: their triangles aren't known on the CPU. */
export function addBatches(
  batches: readonly Batch[],
  out: GeometryStats,
): void {
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i]!;
    if (batch.shown === 0 || batch.items === 0) {
      continue;
    }
    const kind = out[kindOf(batch)];
    kind.draws += batch.items;
    if (batch.points) {
      kind.points +=
        ((batch.mesh as Partial<PointMesh>).points?.capacity ?? 0) *
        batch.items;
    } else if (batch.patches) {
      continue;
    } else if (batch.mesh.topology === "line-list") {
      kind.segments += Math.floor(batch.mesh.indexCount / 2) * batch.items;
    } else {
      kind.triangles += Math.floor(batch.mesh.indexCount / 3) * batch.items;
    }
  }
}

/** Adds `from` into `into`. */
export function addGeometry(into: GeometryStats, from: GeometryStats): void {
  for (const kind of GEOMETRY_KINDS) {
    const a = into[kind];
    const b = from[kind];
    a.draws += b.draws;
    a.triangles += b.triangles;
    a.points += b.points;
    a.segments += b.segments;
  }
}

/** The totals over the kinds. */
export function geometryTotals(g: GeometryStats): KindStats {
  const total = { draws: 0, triangles: 0, points: 0, segments: 0 };
  for (const kind of GEOMETRY_KINDS) {
    total.draws += g[kind].draws;
    total.triangles += g[kind].triangles;
    total.points += g[kind].points;
    total.segments += g[kind].segments;
  }
  return total;
}

const cache = new WeakMap<object, { version: number; stats: GeometryStats }>();

/** A world's counts, recounted only when its `version` changed. */
export function worldGeometry(world: {
  readonly version: number;
  readonly raster: { readonly batchList: readonly Batch[] };
}): GeometryStats {
  let entry = cache.get(world);
  if (!entry || entry.version !== world.version) {
    const stats = entry?.stats ?? emptyGeometry();
    resetGeometry(stats);
    addBatches(world.raster.batchList, stats);
    entry = { version: world.version, stats };
    cache.set(world, entry);
  }
  return entry.stats;
}
