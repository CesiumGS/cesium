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

/** Whether the `/frames-data` mount refuses a store path by name: `grids/` and `*.partial`. */
export function framesDataExcludes(relative: string): boolean;

/**
 * The `/frames-data` exclusion for the store at `root`, given an absolute
 * path: by name, and by the real path the file resolves to (under the root,
 * outside its real `grids/`, not a `*.partial`).
 */
export function framesDataExclusion(root: string): (path: string) => boolean;

/** The `code` of `ensure`'s rejection when a fetch was needed but not allowed. */
export const FETCH_NOT_ALLOWED: string;

/**
 * What a request lets it have, by `Sec-Fetch-Site`; without it, by `Origin`
 * and `Referer` (another origin: none; this `Host`: fetch), and with neither
 * fetch only from a loopback `remoteAddress` (curl, Node), else stored.
 */
export function gridAccess(
  headers: Record<string, string | string[] | undefined>,
  remoteAddress: string | undefined,
): "fetch" | "stored" | "none";

/** A grid cache: `ensure` gives the path of a verified copy. */
export interface GridCache {
  ensure(name: string, options?: { fetch?: boolean }): Promise<string>;
}

/**
 * Verified copies of the catalog's grids in `dir`, fetched from cdn.proj.org
 * on a miss (unless `{ fetch: false }`); concurrent calls for one name share
 * one fetch, and at most `maxFetches` (default 2) run at once.
 */
export function createGridCache(options: {
  dir: string;
  catalog: GridCatalog;
  fetch?: typeof fetch;
  log?: (line: string) => void;
  maxFetches?: number;
}): GridCache;

/** The endpoint's middleware (GET and HEAD), for a path after the prefix. */
export function createGridHandler(options: {
  catalog: GridCatalog;
  cache: GridCache;
  catalogBytes: Uint8Array;
  licensesBytes: Uint8Array;
  log: (line: string) => void;
}): (req: IncomingMessage, res: ServerResponse, next: () => void) => void;

/**
 * The grid endpoint at `prefix`, serving `dir` (the store's `grids/`); it
 * mounts only when the catalog and license table there match their pins.
 */
export function projGridsPlugin(prefix: string, dir: string): Plugin;
