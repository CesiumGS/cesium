// Types for release.mjs (released CesiumJS builds in the store).
export interface Release {
  directory: string;
  version: string;
  integrity: string;
  shasum: string;
  bytes: number;
  unpackedBytes: number;
}
export function releasesDirectory(): string;
export function resolveVersion(spec: string): string;
export function releaseList(spec: string): string[];
export function ensureRelease(
  version: string,
  log?: (line: string) => void,
): Release;
