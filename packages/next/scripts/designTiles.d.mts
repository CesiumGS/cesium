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
 * Writes `<store>/design-globe/` (the corridor rigid and reprojected, the
 * site building, the portfolio, answers.json and manifest.json) unless its
 * manifest is current.
 */
export function ensureDesignTiles(
  store: string,
  proj: ProjApi,
  grids: GridSource,
  frames: Frames,
  log?: (line: string) => void,
): Promise<void>;
