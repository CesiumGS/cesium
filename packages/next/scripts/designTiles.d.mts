import type {
  EngineeringFrame,
  EngineeringFrameDefinition,
} from "../src/engineering/EngineeringFrame.ts";
import type { GridSource } from "../src/engineering/proj.ts";
import type { ProjApi } from "../src/engineering/projApi.ts";
import type { Frames } from "../src/frames/frames.ts";

/** The instant `measure` runs at for answers.json (2026-01-01T00:00:00 UTC). */
export const DESIGN_TILES_INSTANT: string;
/**
 * PROJ with no grids loaded yet, a GridSource over the store's grids, and the
 * Frames from the store's frame data.
 */
export function designTilesInputs(
  store: string,
): Promise<{ proj: ProjApi; grids: GridSource; frames: Frames }>;
/**
 * The parts of a rigid placement's error at a design point, metres:
 * curvature d²/2R, scale d·|1 − 1/k| and the geoid's rise from the anchor.
 */
export function rigidErrorTerms(
  frame: EngineeringFrame,
  anchor: ArrayLike<number>,
  point: ArrayLike<number>,
): { curvature: number; scale: number; geoid: number };
/**
 * Writes `<store>/design-globe/` (the corridor rigid and reprojected, the
 * site building, the scale ladder's sites rigid and reprojected,
 * answers.json and manifest.json) unless its manifest is current.
 */
export function ensureDesignTiles(
  store: string,
  proj: ProjApi,
  grids: GridSource,
  frames: Frames,
  log?: (line: string) => void,
): Promise<void>;
/**
 * The tileset-level extensions of a frame and a placement: the
 * `BENTLEY_engineering_frame` declaration, and `BENTLEY_alignments` when the
 * frame has alignments.
 */
export function frameExtensions(
  definition: EngineeringFrameDefinition,
  placement:
    { mode: "rigid"; anchor: readonly number[] } | { mode: "reprojected" },
): Record<string, unknown>;
