// What a tileset unloads, over its byte budget or a world pool's pressure.
import type { Tile } from "./Tile.ts";
import type { Tileset3D } from "./Tileset3D.ts";
import { accumulate } from "./pipeline.ts";
import type { TilesetState } from "./tilesetState.ts";

/** @internal Content side: what's evicted, and when. */
export interface TilesetEviction extends Pick<
  Tileset3D,
  | "engine"
  | "evictForCapacity"
  | "markCastsOnly"
  | "resident"
  | "stats"
  | "warnings"
  | "world"
> {
  readonly state: Pick<
    TilesetState,
    | "cacheBytes"
    | "capacityFailed"
    | "capacityFull"
    | "capacityWait"
    | "casterResident"
    | "casters"
    | "coldAgeMs"
    | "drawTiles"
    | "itemList"
    | "loaded"
    | "masked"
    | "order"
    | "overflowBytes"
    | "placeholders"
    | "source"
    | "standIns"
    | "uploadsPerFrame"
  >;
}

/**
 * World pool pressure (World.pressure) past which streaming evicts as if
 * over its byte budget (§13.15).
 */
const CAPACITY_PRESSURE = 0.9;

export function evict(tileset: TilesetEviction, frame: number): void {
  // This frame's touches and loads, in the order eviction walks.
  tileset.state.order.seal(frame);
  // Another tileset's view tile is waiting for a pool: casters yield it.
  if (
    tileset.state.casterResident > 0 &&
    tileset.engine.tilesets.some(
      (other) =>
        other !== tileset &&
        other.world === tileset.world &&
        other.state.viewCapacityWait,
    )
  ) {
    let count = 0;
    for (const tile of tileset.state.order.coldest(frame)) {
      if (count >= tileset.state.uploadsPerFrame) {
        break;
      }
      if (tile.castsOnly) {
        unload(tileset, tile);
        count++;
      }
    }
  }
  // A world pool at capacity (an upload's CapacityError), or nearly so
  // (World.pressure), evicts as being over the byte budget does, until
  // uploads fit again.
  if (tileset.state.capacityFull === undefined) {
    const { fraction, pool } = tileset.world.pressure();
    if (fraction >= CAPACITY_PRESSURE) {
      tileset.state.capacityFull = pool;
    }
  }
  if (tileset.state.capacityFull !== undefined) {
    tileset.evictForCapacity(frame);
    return;
  }
  // Eviction starts at the budget; the overflow is for content in use.
  if (tileset.stats.bytes <= tileset.state.cacheBytes) {
    return;
  }
  // Spread over frames, as uploads are: after a camera jump everything
  // shown before becomes evictable at once, and freeing it all in one
  // frame (textures and buffers by the hundred) stalls that frame. Past
  // the hard limit (budget + overflow), whatever is needed goes now.
  let allowance = Math.max(
    2 * tileset.engine.uploadBytesPerFrame,
    tileset.stats.bytes -
      (tileset.state.cacheBytes + tileset.state.overflowBytes),
  );
  const evict = (tile: Tile): void => {
    allowance -= tile.bytes;
    unload(tileset, tile);
  };
  if (tileset.state.casterResident > 0) {
    for (const tile of tileset.state.order.coldest(frame)) {
      if (tileset.stats.bytes <= tileset.state.cacheBytes || allowance <= 0) {
        return;
      }
      if (tile.castsOnly && tile.casterMask === 0) {
        evict(tile);
      }
    }
  }
  const heldSince = performance.now() - tileset.state.coldAgeMs;
  for (const tile of tileset.state.order.coldest(frame)) {
    if (tileset.stats.bytes <= tileset.state.cacheBytes || allowance <= 0) {
      return;
    }
    if (tile.castsOnly) {
      continue;
    }
    if (
      tileset.stats.bytes - tileset.state.casterResident >
        tileset.state.cacheBytes ||
      (tile.casterMask === 0 && tile.viewedAt <= heldSince)
    ) {
      evict(tile);
    }
  }
}

export function evictForCapacity(
  tileset: TilesetEviction,
  frame: number,
): void {
  tileset.warnings.add(
    `capacity: world ${tileset.state.capacityFull} ${tileset.state.capacityFailed ? "full" : "nearly full"}, evicting`,
  );
  tileset.state.capacityFull = undefined;
  let count = 0;
  // Casters first, casting or not: they yield the pools.
  for (const castsOnly of [true, false]) {
    for (const tile of tileset.state.order.coldest(frame)) {
      if (count >= tileset.state.uploadsPerFrame) {
        break;
      }
      if (tile.castsOnly === castsOnly) {
        unload(tileset, tile);
        count++;
      }
    }
  }
  // After a failed upload with nothing to free here (everything is in
  // view, or another tileset holds the pool): retry in half a second,
  // while the error threshold rises. Pressure alone doesn't hold uploads.
  tileset.state.capacityWait =
    tileset.state.capacityFailed && count === 0 ? 30 : 0;
  tileset.state.capacityFailed = false;
}

export function unload(tileset: TilesetEviction, tile: Tile): void {
  if (tile.placement) {
    // The hook names the whole tileset (public API).
    tileset.world.acceleration.tileUnloaded(tileset as Tileset3D, tile);
  }
  tileset.state.source?.unloadTile?.(tile);
  if (tile.purpose) {
    tileset.stats.purposes[tile.purpose].unused++;
    tile.purpose = undefined;
  }
  if (tile.placement) {
    for (const item of tileset.state.itemList) {
      item.unplace(tile);
    }
    for (const draw of tile.placement.draws) {
      if (tileset.state.drawTiles.get(draw.index)?.tile === tile) {
        tileset.state.drawTiles.delete(draw.index);
      }
    }
    tile.placement.remove();
    tile.placement = undefined;
  }
  tile.geometry = undefined;
  tileset.markCastsOnly(tile, false);
  tileset.stats.bytes -= tile.bytes;
  tileset.stats.loaded--;
  if (tile.summary) {
    accumulate(tileset.resident, tile.summary, -1);
    tile.summary = undefined;
  }
  tile.bytes = 0;
  tile.state = "unloaded";
  tile.appliedMask = -1;
  tile.casterMask = tile.appliedCasterMask = 0;
  tileset.state.casters.delete(tile);
  tile.debugColor = undefined;
  tile.appliedPlaceholderMask = 0;
  tile.placeholderMask = 0;
  tile.standInMask = 0;
  tileset.state.standIns.delete(tile);
  tile.holes = tile.appliedHoles = undefined;
  if (tile.clip) {
    tileset.world.freeClip(tile.clip);
    tile.clip = undefined;
  }
  tileset.state.placeholders.delete(tile);
  tileset.state.order.remove(tile);
  if (tileset.state.loaded.delete(tile)) {
    for (let t = tile.parent; t; t = t.parent) {
      t.residentBelow--;
    }
  }
  tileset.state.masked.delete(tile);
}
