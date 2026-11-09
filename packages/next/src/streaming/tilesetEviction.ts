// What a tileset unloads, over its byte budget or a world pool's pressure.
import type { Tile } from "./Tile.ts";
import type { Tileset3D } from "./Tileset3D.ts";
import { accumulate } from "./pipeline.ts";

/**
 * World pool pressure (World.pressure) past which streaming evicts as if
 * over its byte budget (§13.15).
 */
const CAPACITY_PRESSURE = 0.9;

export function evict(tileset: Tileset3D, frame: number): void {
  // This frame's touches and loads, in the order eviction walks.
  tileset.order.seal(frame);
  // Another tileset's view tile is waiting for a pool: casters yield it.
  if (
    tileset.casterResident > 0 &&
    tileset.engine.tilesets.some(
      (other) =>
        other !== tileset &&
        other.world === tileset.world &&
        other.viewCapacityWait,
    )
  ) {
    let count = 0;
    for (const tile of tileset.order.coldest(frame)) {
      if (count >= tileset.uploadsPerFrame) {
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
  if (tileset.capacityFull === undefined) {
    const { fraction, pool } = tileset.world.pressure();
    if (fraction >= CAPACITY_PRESSURE) {
      tileset.capacityFull = pool;
    }
  }
  if (tileset.capacityFull !== undefined) {
    tileset.evictForCapacity(frame);
    return;
  }
  // Eviction starts at the budget; the overflow is for content in use.
  if (tileset.stats.bytes <= tileset.cacheBytes) {
    return;
  }
  // Spread over frames, as uploads are: after a camera jump everything
  // shown before becomes evictable at once, and freeing it all in one
  // frame (textures and buffers by the hundred) stalls that frame. Past
  // the hard limit (budget + overflow), whatever is needed goes now.
  let allowance = Math.max(
    2 * tileset.engine.uploadBytesPerFrame,
    tileset.stats.bytes - (tileset.cacheBytes + tileset.overflowBytes),
  );
  const evict = (tile: Tile): void => {
    allowance -= tile.bytes;
    unload(tileset, tile);
  };
  if (tileset.casterResident > 0) {
    for (const tile of tileset.order.coldest(frame)) {
      if (tileset.stats.bytes <= tileset.cacheBytes || allowance <= 0) {
        return;
      }
      if (tile.castsOnly && tile.casterMask === 0) {
        evict(tile);
      }
    }
  }
  const heldSince = performance.now() - tileset.coldAgeMs;
  for (const tile of tileset.order.coldest(frame)) {
    if (tileset.stats.bytes <= tileset.cacheBytes || allowance <= 0) {
      return;
    }
    if (tile.castsOnly) {
      continue;
    }
    if (
      tileset.stats.bytes - tileset.casterResident > tileset.cacheBytes ||
      (tile.casterMask === 0 && tile.viewedAt <= heldSince)
    ) {
      evict(tile);
    }
  }
}

export function evictForCapacity(tileset: Tileset3D, frame: number): void {
  tileset.warnings.add(
    `capacity: world ${tileset.capacityFull} ${tileset.capacityFailed ? "full" : "nearly full"}, evicting`,
  );
  tileset.capacityFull = undefined;
  let count = 0;
  // Casters first, casting or not: they yield the pools.
  for (const castsOnly of [true, false]) {
    for (const tile of tileset.order.coldest(frame)) {
      if (count >= tileset.uploadsPerFrame) {
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
  tileset.capacityWait = tileset.capacityFailed && count === 0 ? 30 : 0;
  tileset.capacityFailed = false;
}

export function unload(tileset: Tileset3D, tile: Tile): void {
  if (tile.placement) {
    tileset.world.acceleration.tileUnloaded(tileset, tile);
  }
  tileset.source?.unloadTile?.(tile);
  if (tile.purpose) {
    tileset.stats.purposes[tile.purpose].unused++;
    tile.purpose = undefined;
  }
  if (tile.placement) {
    for (const item of tileset.itemList) {
      item.unplace(tile);
    }
    for (const draw of tile.placement.draws) {
      if (tileset.drawTiles.get(draw.index)?.tile === tile) {
        tileset.drawTiles.delete(draw.index);
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
  tileset.casters.delete(tile);
  tile.debugColor = undefined;
  tile.appliedPlaceholderMask = 0;
  tile.placeholderMask = 0;
  tile.standInMask = 0;
  tileset.standIns.delete(tile);
  tile.holes = tile.appliedHoles = undefined;
  if (tile.clip) {
    tileset.world.freeClip(tile.clip);
    tile.clip = undefined;
  }
  tileset.placeholders.delete(tile);
  tileset.order.remove(tile);
  if (tileset.loaded.delete(tile)) {
    for (let t = tile.parent; t; t = t.parent) {
      t.residentBelow--;
    }
  }
  tileset.masked.delete(tile);
}
