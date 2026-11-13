// A tileset's debug views: tiles colored by depth, and bounding volumes drawn.
import type { DrawSink } from "./DrawSink.ts";
import type { SelectionView } from "./Stepwise.ts";
import type { Tile } from "./Tile.ts";
import { OCCLUDED_TICKS } from "./occlusion.ts";
import { drawnTile, terrainDrawnError } from "./tileWarp.ts";
import { packTileDebug, TileDebugState } from "./debugViews.ts";
import { type DebugColor, VOLUME_COLORS } from "./debugVolumes.ts";
import type { TileVolume } from "./volumes.ts";
import type { TilesetState } from "./tilesetState.ts";

/** Content side: debug colors and volumes. */
export interface TilesetDebug {
  readonly world: DrawSink;
  readonly state: Pick<
    TilesetState,
    | "baseItem"
    | "boundingVolumes"
    | "colorize"
    | "contentVolumes"
    | "masked"
    | "placeholders"
    | "policy"
    | "tileColor"
  >;
}

/** Tile colors by tree depth for `debugColorizeTiles` (linear RGBA). */
export const DEPTH_COLORS: ReadonlyArray<
  readonly [number, number, number, number]
> = [
  [0.9, 0.2, 0.2, 1],
  [0.95, 0.55, 0.1, 1],
  [0.95, 0.85, 0.1, 1],
  [0.3, 0.8, 0.25, 1],
  [0.1, 0.7, 0.8, 1],
  [0.2, 0.35, 0.95, 1],
  [0.6, 0.3, 0.9, 1],
  [0.9, 0.35, 0.75, 1],
];
const WHITE = [1, 1, 1, 1] as const;

export function applyDebugColor(tileset: TilesetDebug, tile: Tile): void {
  if (!tile.placement) {
    return;
  }
  const color =
    tileset.state.tileColor?.(tile) ??
    (tileset.state.colorize
      ? DEPTH_COLORS[tile.depth % DEPTH_COLORS.length]!
      : undefined);
  const current = tile.debugColor;
  if (
    color === current ||
    (color && current && color.every((c, i) => c === current[i]))
  ) {
    return;
  }
  for (const draw of tile.placement.draws) {
    tileset.world.setColor(
      draw,
      color ?? tileset.state.baseItem?.drawColor ?? WHITE,
    );
  }
  tile.debugColor = color;
}

/** Debug tints and volumes for what is drawn now (also while frozen). */
export function updateDebug(tileset: TilesetDebug): void {
  if (tileset.state.tileColor) {
    for (const tile of tileset.state.masked) {
      applyDebugColor(tileset, tile);
    }
  }
  if (!tileset.state.boundingVolumes && !tileset.state.contentVolumes) {
    return;
  }
  const drawn = new Set([
    ...tileset.state.masked,
    ...tileset.state.placeholders,
  ]);
  type Want = Map<Tile, { volume: TileVolume; color: DebugColor }>;
  const bounding: Want = new Map();
  const content: Want = new Map();
  for (const tile of drawn) {
    bounding.set(tile, {
      volume: tile.volume,
      color:
        tile.placeholderMask !== 0
          ? VOLUME_COLORS.refining
          : tile.renderable
            ? VOLUME_COLORS.final
            : VOLUME_COLORS.empty,
    });
    if (tile.contentVolume) {
      content.set(tile, {
        volume: tile.contentVolume,
        color: VOLUME_COLORS.content,
      });
    }
  }
  tileset.state.boundingVolumes?.update(bounding);
  tileset.state.contentVolumes?.update(content);
}

/** A running number per tile, so neighbours differ in the "tiles" view. */
const tileNumbers = new WeakMap<Tile, number>();
let nextTileNumber = 0;

function tileHash(tile: Tile): number {
  let n = tileNumbers.get(tile);
  if (n === undefined) {
    n = nextTileNumber++;
    tileNumbers.set(tile, n);
  }
  // 11 is coprime to 32: consecutive tiles (siblings) land far apart.
  return (n * 11) & 31;
}

/**
 * What a debug view shows of `tile` in `view`'s selection (`View.debug`): its
 * level, its state, its screen-space error over the threshold, and the
 * stretch its error was multiplied by (the one `screenSpaceError` used).
 */
export function tileDebugWord(
  tileset: Pick<TilesetDebug, "state">,
  tile: Tile,
  view: SelectionView,
): number {
  const state = tile.viewState(view.id);
  const threshold = tileset.state.policy.memoryAdjustedScreenSpaceError;
  const bit = (mask: number): boolean => ((mask >>> view.id) & 1) !== 0;
  const kind = bit(tile.placeholderMask)
    ? TileDebugState.placeholder
    : bit(tile.standInMask)
      ? TileDebugState.standIn
      : state.occludedTicks >= OCCLUDED_TICKS && state.sse > threshold
        ? TileDebugState.held
        : TileDebugState.drawn;
  let stretch = 1;
  if (view.warp) {
    const drawn = drawnTile(tile, view.warp);
    stretch =
      tile.globe && drawn.slopeMax !== undefined
        ? terrainDrawnError(tile, drawn, view.position, 1) - drawn.fit
        : drawn.sigmaMax;
  }
  return packTileDebug({
    level: tile.globe?.level ?? tile.depth,
    state: kind,
    hash: tileHash(tile),
    error: threshold > 0 ? state.sse / threshold : 0,
    stretch,
  });
}

/**
 * Writes the debug-view data of the tiles drawn now to their draws, for the
 * first view whose `debug` is on; nothing while none is. A tile is written
 * again only when its word changed.
 */
export function writeTileDebug(
  tileset: TilesetDebug,
  views: readonly SelectionView[],
  drawn: Iterable<Tile>,
): void {
  const view = views.find((v) => v.debug !== undefined);
  if (!view || !tileset.world.setDrawDebug) {
    return;
  }
  for (const tile of drawn) {
    if (!tile.placement) {
      continue;
    }
    const word = tileDebugWord(tileset, tile, view);
    if (word === tile.debugWord) {
      continue;
    }
    tile.debugWord = word;
    for (const draw of tile.placement.draws) {
      tileset.world.setDrawDebug(draw, word);
    }
  }
}
