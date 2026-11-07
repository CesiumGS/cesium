// Types for projGrids.mjs (the dev server's `/proj-grids/` endpoint).
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";
import type { GridCatalog } from "../src/engineering/gridCatalog.ts";

/**
 * What a request path after the prefix (`/<name>`) asks for, or undefined
 * when it names nothing servable: decoded once, and a grid only when it is
 * exactly a current catalog key whose URL is `https://cdn.proj.org/<name>`.
 */
export function gridRequest(
  urlPath: string,
  catalog: GridCatalog,
): { kind: "catalog" | "licenses" | "grid"; name: string } | undefined;

/** Whether the `/frames-data` mount refuses a store path: `grids/` and `*.partial`. */
export function framesDataExcludes(relative: string): boolean;

/**
 * Verified copies of the catalog's grids in `dir`, fetched from cdn.proj.org
 * on a miss; concurrent calls for one name share one fetch.
 */
export function createGridCache(options: {
  dir: string;
  catalog: GridCatalog;
  fetch?: typeof fetch;
  log?: (line: string) => void;
}): { ensure(name: string): Promise<string> };

/** The endpoint's middleware (GET and HEAD), for a path after the prefix. */
export function createGridHandler(options: {
  catalog: GridCatalog;
  cache: { ensure(name: string): Promise<string> };
  catalogBytes: Uint8Array;
  licensesBytes: Uint8Array;
  log: (line: string) => void;
}): (req: IncomingMessage, res: ServerResponse, next: () => void) => void;

/**
 * The grid endpoint at `prefix`, serving `dir` (the store's `grids/`); it
 * mounts only when the catalog and license table there match their pins.
 */
export function projGridsPlugin(prefix: string, dir: string): Plugin;
