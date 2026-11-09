// A tileset's debug views: tiles colored by depth, and bounding volumes drawn.
import type { Tile } from "./Tile.ts";
import type { Tileset3D } from "./Tileset3D.ts";
import { type DebugColor, VOLUME_COLORS } from "./debugVolumes.ts";
import type { TileVolume } from "./volumes.ts";
import type { TilesetState } from "./tilesetState.ts";

/** @internal Content side: debug colors and volumes. */
export interface TilesetDebug extends Pick<Tileset3D, "world"> {
  readonly state: Pick<
    TilesetState,
    | "baseItem"
    | "boundingVolumes"
    | "colorize"
    | "contentVolumes"
    | "masked"
    | "placeholders"
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
