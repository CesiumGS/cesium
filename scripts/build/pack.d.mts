/** The parts of the API the API review has audited (checkDeclarations --only). */
export const AUDITED: readonly string[];

/** `manifest` as a release publishes it: no `@cesium/source` condition. */
export function publishedManifest<T extends { exports?: unknown }>(manifest: T): T;

/**
 * The entries of a manifest's `files` that match nothing in the tarball's
 * file list (`packed`, paths relative to the package). An entry with a glob
 * character is left to npm.
 */
export function missingFiles(
  listed: readonly string[],
  packed: readonly string[],
): string[];

/**
 * Packs and checks every package; throws when any check fails. Returns the
 * private packages' listed-but-missing files.
 */
export function checkPacked(
  packageDirs: readonly string[],
  options?: { log?: (line: string) => void; keep?: boolean },
): Promise<{ lacking: { name: string; missing: string[] }[] }>;
