/**
 * The acceleration-structure lifetime hook (spec section 7.10): building,
 * refitting and evicting ray-query structures hangs off tile and draw
 * lifetime through this one hook, so a per-tile bottom-level structure and
 * a per-tick top-level one have a place to live. 5a adds the hook with no
 * structure behind it (`World.acceleration`, a no-op by default).
 *
 * Each event is called at one point: a tile's placement and unload in
 * `Tileset3D`, a draw's addition and removal in `World.addDraw` and
 * `World.removeDraw`. A tile's draws are added (`drawAdded`) before its
 * placement is announced, and its unload is announced before they are
 * removed.
 */
import type { DrawHandle } from "../scene/World.ts";
import type { Tile } from "./Tile.ts";
import type { Tileset3D } from "./Tileset3D.ts";

export interface AccelerationStructures {
  /** A tile's content was placed: its draws are in the world. */
  tilePlaced(
    tileset: Tileset3D,
    tile: Tile,
    draws: readonly DrawHandle[],
  ): void;
  /** A tile's content is unloading: its draws go next. */
  tileUnloaded(tileset: Tileset3D, tile: Tile): void;
  /** A draw was added to the world. */
  drawAdded(draw: DrawHandle): void;
  /** A draw is being removed from the world (its handle still names it). */
  drawRemoved(draw: DrawHandle): void;
}

/** No structures: every event is ignored. */
export const NO_ACCELERATION: AccelerationStructures = Object.freeze({
  tilePlaced() {},
  tileUnloaded() {},
  drawAdded() {},
  drawRemoved() {},
});
