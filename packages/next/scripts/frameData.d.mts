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
    derivedFrom?: string;
    credit?: string;
  }[];
}>;
