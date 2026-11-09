import type { SkyPackManifest } from "../src/atmosphere/skyPack.ts";
export function insideWorktree(path: string): boolean;
export function readCatalog(
  text: string,
): Array<{ ra: number; dec: number; mag: number; bv: number }>;
export function buildPack(options: {
  outDir: string;
  files: Record<string, string>;
  recipe?: string;
  backgroundSize?: number;
  catalog?: string;
  allowUnsettledTerms?: boolean;
  log?: (line: string) => void;
}): SkyPackManifest;
export function fetchSources(
  recipeId: string,
  store: string,
  log?: (line: string) => void,
): Promise<Record<string, string>>;
