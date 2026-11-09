// Rays through a tileset's tiles: the query interface's tiles to load and read.
import type { CastRay } from "../scene/World.ts";
import type { RequestPurpose } from "./Stepwise.ts";
import type { Tile } from "./Tile.ts";
import type { Tileset3D } from "./Tileset3D.ts";

/** Whether a ray segment passes through a sphere. */
function crossesSphere(
  ray: CastRay,
  sphere: { center: ArrayLike<number>; radius: number },
): boolean {
  const dx = sphere.center[0]! - ray.origin[0]!;
  const dy = sphere.center[1]! - ray.origin[1]!;
  const dz = sphere.center[2]! - ray.origin[2]!;
  const along =
    dx * ray.direction[0]! + dy * ray.direction[1]! + dz * ray.direction[2]!;
  const r = sphere.radius;
  if (along < -r || along > ray.maxDistance + r) {
    return false;
  }
  return dx * dx + dy * dy + dz * dz - along * along <= r * r;
}

/**
 * Serves ray queries for one frame: wanted tiles go first in `requests`;
 * pinned tiles count as touched (not evicted or cancelled).
 */
export function serveQueries(
  tileset: Tileset3D,
  frame: number,
  requests: Map<Tile, number>,
  purposes: Map<Tile, RequestPurpose>,
): void {
  for (let q = tileset.queries.length - 1; q >= 0; q--) {
    const query = tileset.queries[q]!;
    if (query.done) {
      for (const tile of query.pinned) {
        tileset.order.touch(tile, frame);
      }
      continue;
    }
    const tiles = new Set<Tile>();
    for (const ray of query.rays) {
      tilesAlongRay(tileset, tileset.root, ray, tiles);
    }
    let pending = false;
    for (const tile of tiles) {
      tileset.order.touch(tile, frame);
      if (tile.state === "unloaded" || tile.state === "loading") {
        pending = true;
        if (tile.state === "unloaded") {
          requests.set(tile, -1);
          purposes.set(tile, "sample");
        }
      }
    }
    if (tileset.externals.length > 0) {
      pending = true; // children still to be built
    }
    if (!pending) {
      query.done = true;
      query.pinned = [...tiles].filter((t) => t.placement);
      query.resolve({
        draws: query.pinned.flatMap((t) => t.placement!.draws),
        release: () => {
          const at = tileset.queries.indexOf(query);
          if (at >= 0) {
            tileset.queries.splice(at, 1);
          }
        },
      });
    }
  }
}

/** Tiles a ray needs for its most detailed content. */
function tilesAlongRay(
  tileset: Tileset3D,
  tile: Tile,
  ray: CastRay,
  out: Set<Tile>,
): void {
  if (!crossesSphere(ray, tile.volume.sphere)) {
    return;
  }
  if (tile.external) {
    if (tile.state !== "ready") {
      out.add(tile); // its tileset JSON, then its children
      return;
    }
  } else if (tile.hasContent) {
    const crossed = tile.children.some((c) =>
      crossesSphere(ray, c.volume.sphere),
    );
    if (tile.refine === "ADD" || !crossed) {
      out.add(tile);
    }
  }
  for (const child of tile.children) {
    tilesAlongRay(tileset, child, ray, out);
  }
}
