export interface SurfaceOptions {
  /** The package root; default the directory above `scripts`. */
  root?: string;
  /** Entry name to source file (relative to `root`); default the package's `exports` plus the widgets. */
  entries?: Record<string, string>;
}

/** The header line, then one tab-separated line per public export. */
export function surfaceLines(options?: SurfaceOptions): string[];
