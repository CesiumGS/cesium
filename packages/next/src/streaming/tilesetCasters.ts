// Shadow casters' share of a tileset's streaming: their room, their age and
// their bytes. Casters follow view selection (`casterRoom` reads `viewBytes`).
import type { GltfAsset } from "../io/gltfTypes.ts";
import type { SelectionView, CasterRoom } from "./Stepwise.ts";
import type { Tile } from "./Tile.ts";
import type { Tileset3D } from "./Tileset3D.ts";
import type { TilesetState } from "./tilesetState.ts";

/** @internal Content side: casters' share of streaming. */
export interface TilesetCasters extends Pick<
  Tileset3D,
  "anchor" | "engine" | "stats" | "world"
> {
  readonly state: Pick<
    TilesetState,
    | "cacheBytes"
    | "casterBytesEstimate"
    | "casterLoad"
    | "casterResident"
    | "casterTimer"
    | "casterWake"
    | "casting"
    | "coldAgeMs"
    | "loaded"
    | "policy"
    | "recentCasterBytes"
    | "viewBytes"
  >;
}

/**
 * World pool pressure (World.pressure) past which shadow casters aren't
 * requested: they yield the pools to what views draw.
 */
export const CASTER_PRESSURE = 0.75;
/**
 * The cache has one budget, and casters have no share of it. What views use
 * this tick is never evicted. Casters get what is left after that and after
 * the cold tiles (no view uses them now) that may yet come back, so a view
 * never loses a tile to a caster that it would have kept with casters off.
 * A cold tile may come back until it has gone `COLD_AGE_MS` without a view.
 * After that, casters may take its room.
 *
 * Time, not ticks: a still camera on demand doesn't tick. A view coming back
 * to a tile after a longer absence shows that was too soon, and the age
 * becomes twice that absence, up to `COLD_AGE_MAX_MS`. So the worst a view
 * pays is one return after each longer absence, and stale cold tiles always
 * give way in the end.
 *
 * The age stops growing at `COLD_AGE_MAX_MS`. A view that returns after an
 * absence longer than that can't raise it further, so every such return can
 * cost reloads of what casters took in the meantime (a third to under half of
 * the view's requests, on a cache that casters off would have kept). The cap
 * is chosen: with none, casters would get less room for longer after each
 * long return.
 */
export const COLD_AGE_MS = 8_000;
export const COLD_AGE_MAX_MS = 60_000;
/**
 * Casters waiting for cold tiles to age wake the loop for one tick when the
 * next goes stale, this far apart at least, ms. On a still camera that ends
 * when the last cold tile is stale, within the age.
 */
export const COLD_WAKE_MIN_MS = 1_000;
/** Recent casters whose median is what one not yet loaded is assumed to cost. */
const CASTER_BYTES_WINDOW = 31;
/** Loading or waiting to upload for its shadow alone. */
export function isCaster(tile: Tile): boolean {
  return tile.purpose === "caster" && tile.viewMask === 0;
}

export function closeImages(asset: GltfAsset): void {
  for (const image of asset.images) {
    if (image instanceof ImageBitmap) {
      image.close();
    }
  }
}

/**
 * What shadow casters may use this tick, or undefined when none are
 * selected: the cache less what views use and less the cold tiles that may
 * yet come back (`COLD_AGE_MS`). Free room always counts, so does the room
 * of stale cold tiles, which eviction then takes.
 */
export function casterRoom(
  owner: TilesetCasters,
  views: readonly SelectionView[],
  frame: number,
  now: number,
): (CasterRoom & { nextStale: number }) | undefined {
  // A tileset that has drawn nothing yet but content this engine can't draw
  // (point clouds today: `deferredReason`) has no casters to load.
  owner.state.casting =
    owner.state.policy.castsShadows === true &&
    views.some((view) => view.casterPlanes !== undefined) &&
    (owner.stats.undrawn === 0 || owner.stats.loaded > 0);
  if (!owner.state.casting) {
    return undefined;
  }
  const heldSince = now - owner.state.coldAgeMs;
  let held = 0;
  let nextStale = Infinity;
  for (const tile of owner.state.loaded) {
    if (tile.castsOnly || tile.touchedFrame === frame) {
      continue;
    }
    // Just left the views, as far as a tick can tell.
    if (tile.touchedFrame === frame - 1) {
      tile.viewedAt = now;
    }
    if (tile.viewedAt > heldSince) {
      held += tile.bytes;
      nextStale = Math.min(nextStale, tile.viewedAt + owner.state.coldAgeMs);
    }
  }
  const { fraction } = owner.world.pressure();
  owner.state.casterLoad =
    fraction <= CASTER_PRESSURE &&
    !owner.engine.tilesets.some(
      (other) => other.world === owner.world && other.state.viewCapacityWait,
    );
  return {
    bytes: Math.max(0, owner.state.cacheBytes - owner.state.viewBytes - held),
    load: owner.state.casterLoad,
    estimate: owner.state.casterBytesEstimate,
    pressure: fraction,
    heldSince,
    receivers: (view, selected) => {
      const lists: Array<readonly Tile[]> = [selected];
      for (const tileset of owner.engine.tilesets) {
        if (
          tileset !== owner &&
          tileset.world === owner.world &&
          tileset.show
        ) {
          const tiles = tileset.lastSelected.get(view.id);
          if (tiles && tiles.length > 0) {
            if (tileset.anchor !== owner.anchor) {
              return undefined;
            }
            lists.push(tiles);
          }
        }
      }
      return lists;
    },
    counted: new Set(),
    denied: 0,
    scale: 1,
    nextStale,
  };
}

/** One tick when the next cold tile goes stale: the loop may be asleep. */
export function wakeForStale(tileset: TilesetCasters, delayMs: number): void {
  tileset.state.casterTimer ??= setTimeout(() => {
    tileset.state.casterTimer = undefined;
    tileset.state.casterWake = true;
    tileset.engine.wake();
  }, delayMs);
}

/** Drops decoded content of a caster that isn't wanted after all. */
export function dropCaster(
  tileset: TilesetCasters,
  tile: Tile,
  asset: GltfAsset,
): void {
  closeImages(asset);
  tile.state = "unloaded";
  tileset.stats.purposes.caster.unused++;
  tile.purpose = undefined;
}

export function markCastsOnly(
  tileset: TilesetCasters,
  tile: Tile,
  value: boolean,
): void {
  if (tile.castsOnly !== value && tile.state === "ready") {
    tile.castsOnly = value;
    tileset.state.casterResident += value ? tile.bytes : -tile.bytes;
  }
}

/**
 * One more caster's bytes for `casterBytesEstimate`. The median of casters
 * alone: one huge tile, or a view's, doesn't keep small ones out, and a
 * wrong guess corrects itself when the tile loads.
 */
export function noteCasterBytes(tileset: TilesetCasters, bytes: number): void {
  const recent = tileset.state.recentCasterBytes;
  recent.push(bytes);
  if (recent.length > CASTER_BYTES_WINDOW) {
    recent.shift();
  }
  // Three first: one huge tile, or one that fails, isn't what casters cost.
  tileset.state.casterBytesEstimate =
    recent.length < 3
      ? 0
      : [...recent].sort((a, b) => a - b)[recent.length >> 1]!;
}
