export const NAIF_SHA256: Record<string, string>;
/** FRAMES_DATA_DIR, else ~/.cesium-bench/frames. */
export function framesDataDirectory(): string;
/** "2000-2050" gives [2000, 2050]. */
export function parseSpan(text: string): [number, number];
/** Download, verify and excerpt the frames data; `span` includes both years. */
export function ensureFrameData(
  options: { span: [number, number] },
  log?: (line: string) => void,
): Promise<{
  directory: string;
  files: {
    file: string;
    role: string;
    sha256: string;
    sourceUrl: string;
    /** Packs: the SHA-256 of the NAIF kernel the pack is excerpted from. */
    sourceSha256?: string;
    credit?: string;
  }[];
}>;
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
