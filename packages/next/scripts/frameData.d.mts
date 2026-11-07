export const NAIF_SHA256: Record<string, string>;
/** One file of the store, as `manifest.json` lists it. */
export interface ManifestEntry {
  file: string;
  role: string;
  sha256: string;
  sourceUrl: string;
  /** Packs: the SHA-256 of the NAIF kernel the pack is excerpted from. */
  sourceSha256?: string;
  credit?: string;
}
/** FRAMES_DATA_DIR, else ~/.cesium-bench/frames. */
export function framesDataDirectory(): string;
/** "2000-2050" gives [2000, 2050]. */
export function parseSpan(text: string): [number, number];
/** Download, verify and excerpt the frames data; `span` includes both years. */
export function ensureFrameData(
  options: { span: [number, number]; grids?: readonly string[] },
  log?: (line: string) => void,
): Promise<{
  directory: string;
  files: ManifestEntry[];
}>;
/**
 * PROJ-data's pinned catalog and the named grid sets into `<store>/grids/`,
 * every file checked against its pin or the catalog. Returns the manifest
 * entries (roles `gridCatalog` and `grid`).
 */
export function ensureGrids(
  dir: string,
  sets: readonly string[],
  log?: (line: string) => void,
): Promise<ManifestEntry[]>;
/** "portfolio,tests" gives ["portfolio", "tests"]; an unknown set throws. */
export function parseGrids(text: string): string[];
/**
 * A table refreshed when older than 7 days; `validate` throws on a bad file.
 * A failed or invalid refresh keeps a valid stored copy, else throws.
 */
export function ensureFresh(
  dir: string,
  source: { file: string; url: string },
  log: (line: string) => void,
  validate: (text: string) => void,
): Promise<Buffer>;
/** The wanted entries of a gzipped ustar archive, path to bytes. */
export function extractTar(
  gz: Uint8Array,
  wanted: readonly string[],
): Map<string, Uint8Array>;
/** The previous manifest's `files`, or `[]` when absent, unreadable or file-less. */
export function readPreviousFiles(
  dir: string,
): { file: string; role: string; sha256: string }[];
