/** A sampling date, as generated files state it. */
export const SAMPLED_DATE: RegExp;
/** A sample cache's default file: samples/<name> in the frames data directory. */
export function sampleCacheFile(name: string): string;
/** Where the scripts used to cache <name>: the shared temporary directory. */
export function legacySampleCacheFile(name: string): string;
/** Writes a cache only the user can read or change: 0600 in a 0700 folder. */
export function writeSampleCache(file: string, data: unknown): void;
/** A cache read back through `check`, moving one from `legacy` first. */
export function readSampleCache<T>(
  file: string,
  check: (json: unknown, path: string) => T,
  legacy?: string,
): T | undefined;
/** A lidar height, ODN metres. */
export function lidarHeight(v: unknown): v is number;
/** A 3DEP height, NAVD88 metres. */
export function groundHeight(v: unknown): v is number;
/** poleLineGround.mjs's cache, checked; throws for anything else. */
export function checkedCache(
  json: unknown,
  path: string,
): { sampled: string; cells: Record<string, number[]> };
/** corridorGround.mjs's cache, checked; throws for anything else. */
export function checkedCorridorGround(
  json: unknown,
  path: string,
): {
  sampled: string;
  every: number;
  points: {
    station: number;
    longitude: number;
    latitude: number;
    groundMeters: number;
  }[];
};
/** corridorDaylight.mjs's cache, checked; throws for anything else. */
export function checkedCorridorSections(
  json: unknown,
  path: string,
): { sampled: string; ground: Record<string, number> };
