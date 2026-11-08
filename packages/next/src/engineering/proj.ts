// Loads PROJ (proj.js v0.9.2's builds of PROJ 9.7.1), which `npm run setup`
// puts in the frames data store under `proj/` (scripts/frameData.mjs), and
// the grids PROJ reads. Nothing loads until a caller asks: Earth-only scenes
// never pay for it.
//
//  - Browser: the WebAssembly C-API build (`proj_capi.mjs` beside
//    `proj_capi.wasm`, served from `base`), initialized the way proj.js's own
//    wasm/emnapi.mjs does, with `proj.db` and the grids written into the
//    module's file system. The glue, the WebAssembly and `proj.db` are
//    fetched and checked against their pins (projPins.ts) before any is used,
//    and the glue runs from a Blob URL of the checked bytes, so what runs is
//    what was hashed.
//  - Node: the native binding (`proj_capi.node`), run from a staging
//    directory of the process's own that holds checked copies of it,
//    `proj.db` and the grids (projNode.ts).
//
// Grids, on both platforms, are one explicit set: `loadGrids` loads each
// named grid from a `GridSource` (a directory holding the PROJ-data catalog,
// checked against its pins, and the grids), checked against its catalog
// entry, and nothing else is where PROJ looks.
//
// Licenses: PROJ and proj.js are MIT; proj.db carries the EPSG Dataset (IOGP,
// https://epsg.org/terms-of-use.html); each grid carries its own, from the
// catalog's copyright_and_licenses.csv (GridCatalog.credit).
import { readWithProgress, type LoadProgress } from "../io/readWithProgress.ts";
import { GridCatalog, type GridEntry } from "./gridCatalog.ts";
import type { ProjApi } from "./projApi.ts";
import { checkGrid, verify } from "./projCheck.ts";
import {
  isNode,
  loadNodeProj,
  readNodeFile,
  RESERVED_NAMES,
  stageNodeGrid,
  type ProjPins,
} from "./projNode.ts";
import { PROJ_DATA_CATALOG, PROJ_FILE_SHA256 } from "./projPins.ts";

export type { ProjApi } from "./projApi.ts";

export interface LoadProjOptions {
  /**
   * Where the store's `proj/` directory is served (a URL ending in "/", such
   * as `/frames-data/proj/`), or, in Node, its path (or file: URL).
   */
  readonly base: string;
  /**
   * Grids to load: `loadGrids(api, await gridSource({ base }), grids)`, so
   * `base` must then hold the PROJ-data catalog (setup links it into
   * `proj/`). Omitted or empty, none is loaded, in the browser and in Node
   * alike: PROJ sees exactly the grids loaded explicitly (plan 4b's call 5).
   */
  readonly grids?: readonly string[];
  /**
   * Called as the browser fetches each file this call loads, by its name
   * (`proj_capi.wasm`, `proj.db`, a grid), with the bytes received and the
   * response's `Content-Length` (R9). A call that shares an earlier call's
   * load reports only the grids it adds; the catalog isn't reported. Node
   * reads files and never calls it.
   */
  readonly onProgress?: LoadProgress;
  /**
   * @internal For tests: the SHA-256 each PROJ file must have (default
   * `PROJ_FILE_SHA256`), so stubs can pass their own bytes' hashes.
   */
  readonly pins?: ProjPins;
  /**
   * @internal For tests: imports the glue from its checked bytes (default:
   * from a Blob URL of them). Node's loader refuses blob: URLs, so the
   * Node-run unit tests inject a data: URL importer.
   */
  readonly importGlue?: (bytes: Uint8Array) => Promise<unknown>;
  /**
   * @internal For tests: the SHA-256 of `base`'s catalog and licenses
   * (default `PROJ_DATA_CATALOG`'s), for the `GridSource` `grids` loads from.
   */
  readonly catalogPins?: {
    readonly catalogSha256: string;
    readonly licensesSha256: string;
  };
}

/**
 * A directory of grids and the PROJ-data catalog that vouches for them
 * (`gridSource`).
 */
export interface GridSource {
  /** Where the catalog and grids are (a URL or, in Node, a path), ending in "/". */
  readonly base: string;
  readonly catalog: GridCatalog;
}

export interface GridSourceOptions {
  /** A URL ending in "/" (such as `/proj-grids/`), or, in Node, a path or file: URL. */
  readonly base: string;
  /** The catalog's SHA-256 (default `PROJ_DATA_CATALOG.catalogSha256`). */
  readonly catalogSha256?: string;
  /** The licenses' SHA-256 (default `PROJ_DATA_CATALOG.licensesSha256`). */
  readonly licensesSha256?: string;
  /**
   * The PROJ-data version the overridden catalog belongs to, for credits
   * (default `PROJ_DATA_CATALOG.version`). Only with `catalogSha256`.
   */
  readonly version?: string;
  /** Called as the browser fetches the catalog and the licenses (R9). */
  readonly onProgress?: LoadProgress;
}

export interface LoadGridsOptions {
  /** Called as the browser fetches each grid this call loads (R9). */
  readonly onProgress?: LoadProgress;
}

/** The glue module's shape. */
interface Glue {
  default(moduleArg?: ModuleArg): Promise<WasmModule>;
}

interface WasmModule {
  FS: {
    writeFile(
      path: string,
      data: Uint8Array,
      options: { encoding: "binary" },
    ): void;
    /** The working directory, which PROJ's relative paths are in. */
    cwd?(): string;
  };
  emnapiInit(options: { context: unknown }): ProjApi;
}

/**
 * Emscripten's module settings: the WebAssembly, when the caller fetched it.
 * An ArrayBuffer, so the glue's `new Uint8Array(wasmBinary)` is a view of it,
 * not another copy.
 */
interface ModuleArg {
  wasmBinary?: ArrayBuffer;
  /**
   * Where the glue would find its files. Imported from a Blob URL, it can't
   * resolve them against its own URL (`new URL("proj_capi.wasm", "blob:…")`
   * throws), so this names them in `base`. Nothing is fetched there: the
   * glue uses `wasmBinary`.
   */
  locateFile?: (path: string) => string;
}

const loaded = new Map<string, Promise<ProjApi>>();

/** Every "/"-separated base ends in one, for URLs and cache keys. */
const withSlash = (base: string) => (/[\\/]$/.test(base) ? base : `${base}/`);

async function fetchBuffer(
  base: string,
  name: string,
  onProgress: LoadProgress | undefined,
): Promise<ArrayBuffer> {
  const url = `${base}${name}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `PROJ: ${url} returned ${response.status}; run \`npm run setup\` and restart the dev server`,
    );
  }
  return readWithProgress(
    response,
    onProgress && ((received, total) => onProgress(name, received, total)),
  );
}

/** Fetches one of PROJ's pinned files and checks it against its pin. */
async function fetchPinned(
  base: string,
  name: keyof ProjPins,
  pins: ProjPins,
  onProgress: LoadProgress | undefined,
): Promise<ArrayBuffer> {
  const bytes = await fetchBuffer(base, name, onProgress);
  await verify(name, bytes, pins[name]);
  return bytes;
}

/**
 * Imports the glue from a Blob URL of its checked bytes (call 4: what runs is
 * what was hashed, and the server isn't asked for it twice).
 */
async function importFromBlob(bytes: Uint8Array): Promise<unknown> {
  const url = URL.createObjectURL(
    new Blob([bytes as BlobPart], { type: "text/javascript" }),
  );
  try {
    return await import(/* @vite-ignore */ url);
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function loadNode(base: string, pins: ProjPins): Promise<ProjApi> {
  const { api, staging } = await loadNodeProj(base, pins);
  if (!gridStates.has(api)) {
    gridStates.set(
      api,
      newGridState(async (source, entry) =>
        stageNodeGrid(staging, source.base, entry.name, (bytes) =>
          checkGrid(entry, bytes),
        ),
      ),
    );
  }
  return api;
}

/**
 * Makes a path PROJ reports in `module` absolute: the WebAssembly build names
 * a grid it opened from its working directory ("/") by its bare name.
 */
const absoluteIn =
  (module: WasmModule) =>
  (found: string): string => {
    if (found === "" || found.startsWith("/")) {
      return found;
    }
    const cwd = module.FS.cwd?.() ?? "/";
    return `${cwd.endsWith("/") ? cwd : `${cwd}/`}${found.replace(/^\.\//, "")}`;
  };

async function loadBrowser(
  base: string,
  onProgress: LoadProgress | undefined,
  pins: ProjPins,
  importGlue: (bytes: Uint8Array) => Promise<unknown>,
): Promise<ProjApi> {
  // The glue (small, so its bytes aren't reported), its WebAssembly (fetched
  // here, so its bytes can be reported) and proj.db, all at once. Each is
  // checked as it arrives; nothing runs until all are.
  const [glueBytes, wasmBinary, db] = await Promise.all([
    fetchPinned(base, "proj_capi.mjs", pins, undefined),
    fetchPinned(base, "proj_capi.wasm", pins, onProgress),
    fetchPinned(base, "proj.db", pins, onProgress),
  ]);
  const glue = (await importGlue(new Uint8Array(glueBytes))) as Glue;
  const module = await glue.default({
    wasmBinary,
    locateFile: (path) => `${base}${path}`,
  });
  // Only the browser path needs it, so importing the package index does not
  // pull the runtime into every bundle.
  const emnapi = await import("@emnapi/runtime");
  const api = module.emnapiInit({ context: emnapi.getDefaultContext() });
  module.FS.writeFile("/proj.db", new Uint8Array(db), { encoding: "binary" });
  gridStates.set(
    api,
    newGridState(async (source, entry, progress) => {
      const bytes = new Uint8Array(
        await fetchBuffer(source.base, entry.name, cappedAt(entry, progress)),
      );
      await checkGrid(entry, bytes);
      module.FS.writeFile(`/${entry.name}`, bytes, { encoding: "binary" });
      return `/${entry.name}`;
    }, absoluteIn(module)),
  );
  return api;
}

/**
 * PROJ's C API, loaded once per `base` (later calls share the first one's
 * result), with `grids` loaded through `loadGrids`. Rejects, naming the file
 * and both hashes, when `proj_capi.mjs`, `proj_capi.wasm` or `proj.db` (or,
 * in Node, `proj_capi.node`) isn't the pinned file; a refused load isn't
 * remembered. In Node, a second, different `base` in one process throws,
 * naming the first.
 */
export async function loadProj(options: LoadProjOptions): Promise<ProjApi> {
  const {
    grids,
    onProgress,
    pins = PROJ_FILE_SHA256,
    importGlue = importFromBlob,
    catalogPins,
  } = options;
  const base = withSlash(options.base);
  let entry = loaded.get(base);
  if (!entry) {
    entry = isNode()
      ? loadNode(base, pins)
      : loadBrowser(base, onProgress, pins, importGlue);
    loaded.set(base, entry);
    // A failed load is not remembered, so a retry after setup can work.
    entry.catch(() => {
      if (loaded.get(base) === entry) {
        loaded.delete(base);
      }
    });
  }
  // The catalog is read alongside PROJ's own files when grids are named.
  const source =
    grids && grids.length > 0
      ? gridSource({ base, ...catalogPins })
      : undefined;
  source?.catch(() => {});
  const api = await entry;
  if (source !== undefined) {
    await loadGrids(api, await source, grids!, { onProgress });
  }
  return api;
}

const sources = new Map<string, Promise<GridSource>>();

/** Reads `name` from `base` (fetched in the browser, read in Node) and checks it. */
async function readVerified(
  base: string,
  name: string,
  sha256: string,
  onProgress: LoadProgress | undefined,
): Promise<Uint8Array> {
  const bytes = isNode()
    ? await readNodeFile(base, name)
    : new Uint8Array(await fetchBuffer(base, name, onProgress));
  await verify(name, bytes, sha256);
  return bytes;
}

/**
 * The grids in `base` and the catalog that vouches for them: `files.geojson`
 * and `copyright_and_licenses.csv`, read from `base` and checked against
 * `PROJ_DATA_CATALOG` (or the given hashes) before they are parsed. Rejects,
 * naming the file and both hashes, on a mismatch. Memoized per base (and
 * hashes); a refused read isn't remembered. Every refusal is a rejection.
 */
export function gridSource(options: GridSourceOptions): Promise<GridSource> {
  const base = withSlash(options.base);
  if (
    options.version !== undefined &&
    options.version !== PROJ_DATA_CATALOG.version &&
    options.catalogSha256 === undefined
  ) {
    return Promise.reject(
      new TypeError(
        `gridSource: a version (${options.version}) goes with the catalogSha256 of that version's catalog`,
      ),
    );
  }
  const catalogSha256 =
    options.catalogSha256 ?? PROJ_DATA_CATALOG.catalogSha256;
  const licensesSha256 =
    options.licensesSha256 ?? PROJ_DATA_CATALOG.licensesSha256;
  const version = options.version ?? PROJ_DATA_CATALOG.version;
  const key = JSON.stringify([base, catalogSha256, licensesSha256, version]);
  let source = sources.get(key);
  if (!source) {
    source = (async () => {
      const [catalog, licenses] = await Promise.all([
        readVerified(base, "files.geojson", catalogSha256, options.onProgress),
        readVerified(
          base,
          "copyright_and_licenses.csv",
          licensesSha256,
          options.onProgress,
        ),
      ]);
      const text = new TextDecoder();
      return Object.freeze({
        base,
        catalog: GridCatalog.parse(
          text.decode(catalog),
          text.decode(licenses),
          version,
        ),
      });
    })();
    sources.set(key, source);
    const settled = source;
    settled.catch(() => {
      if (sources.get(key) === settled) {
        sources.delete(key);
      }
    });
  }
  return source;
}

/** One loaded PROJ's grids. */
interface GridState {
  /** Each loaded grid's SHA-256, by name. */
  readonly loaded: Map<string, string>;
  /** Loads under way, by name: the SHA-256 being loaded, and the load. */
  readonly pending: Map<string, { sha256: string; load: Promise<void> }>;
  /**
   * The .json entries put where PROJ looks, confirmed or not: PROJ finding
   * one of these before a retry installs it again is finding this copy.
   */
  readonly staged: Set<string>;
  /**
   * Reads `entry` from the source, checks it (`checkGrid`) and puts it where
   * PROJ looks; resolves to the path PROJ must find it at.
   */
  readonly install: (
    source: GridSource,
    entry: GridEntry,
    onProgress: LoadProgress | undefined,
  ) => Promise<string>;
  /** The path proj_grid_info reports, made absolute (absoluteIn). */
  readonly absolute: (found: string) => string;
}

const gridStates = new WeakMap<ProjApi, GridState>();

const newGridState = (
  install: GridState["install"],
  absolute: GridState["absolute"] = (found) => found,
): GridState => ({
  loaded: new Map(),
  pending: new Map(),
  staged: new Set(),
  install,
  absolute,
});

/**
 * Reports a grid's progress, and stops the read once it has more bytes than
 * the catalog's size: nothing larger is held.
 */
const cappedAt =
  (entry: GridEntry, onProgress: LoadProgress | undefined) =>
  (item: string, received: number, total: number | undefined) => {
    if (received > entry.bytes) {
      throw new Error(
        `PROJ: ${entry.name} is over the catalog's ${entry.bytes} bytes (SHA-256 expected ${entry.sha256}); the rest isn't read`,
      );
    }
    onProgress?.(item, received, total);
  };

/**
 * The one-step operation that reads a catalog `.json` entry, by its type: a
 * TIN (`tinshift +file`) or a deformation model (`defmodel +model`). Other
 * entries are grids, which `proj_grid_info` confirms.
 */
function operationReading(entry: GridEntry): string | undefined {
  // The name is a plain file name (gridEntry), so it is a valid PROJ value.
  switch (entry.type) {
    case "TRIANGULATION":
      return `+proj=tinshift +file=${entry.name}`;
    case "DEFORMATION_MODEL":
      return `+proj=defmodel +model=${entry.name}`;
    default:
      return undefined;
  }
}

/**
 * Whether PROJ creates an operation from `definition` now, quietly (PROJ
 * logs each file it can't open). proj_create doesn't throw for one it can't
 * build: it returns an object with neither a name nor a PROJ string. The
 * object isn't kept: proj.js frees a PJ when its wrapper is garbage-collected
 * (SWIG's destructor in the native build, emnapi's FinalizationRegistry in
 * the browser), so the probe needs no proj_destroy. Measured on the native
 * build, 2026-11-07: 300,000 probes with GC between rounds left RSS flat.
 */
function creates(proj: ProjApi, definition: string): boolean {
  const previous = proj.proj_log_level(proj.PJ_LOG_NONE);
  try {
    const object = proj.proj_create(definition);
    return (
      (proj.proj_get_name(object) ?? null) !== null ||
      (proj.proj_as_proj_string(object, proj.PJ_PROJ_5) ?? null) !== null
    );
  } catch {
    return false;
  } finally {
    proj.proj_log_level(previous);
  }
}

/** The catalog entry for `name`; throws unless it is a plain, current catalog key. */
function gridEntry(source: GridSource, name: string): GridEntry {
  // A bare file name: it becomes a path where PROJ looks. It ends in a letter
  // or digit, as Windows drops a trailing dot ("proj.db." is "proj.db").
  if (!/^(?:[A-Za-z0-9]|[A-Za-z0-9_][\w.-]*[A-Za-z0-9])$/.test(name)) {
    throw new Error(
      `PROJ: ${JSON.stringify(name)} is not a plain grid file name`,
    );
  }
  // PROJ's own files and the rest of RESERVED_NAMES, in any case (macOS's and
  // Windows's file systems ignore it): a catalog (an overridden one, say)
  // listing one of these can't put a grid over it.
  const lower = name.toLowerCase();
  if (RESERVED_NAMES.has(lower) || lower.endsWith(".partial")) {
    throw new Error(
      `PROJ: ${name} is the name of one of PROJ's own files, not a grid's`,
    );
  }
  const entry = source.catalog.get(name);
  if (!entry) {
    throw new Error(
      `PROJ: ${name} is not in the PROJ-data ${source.catalog.version} catalog`,
    );
  }
  if (entry.removed) {
    throw new Error(
      `PROJ: ${name} is marked removed in the PROJ-data ${source.catalog.version} catalog`,
    );
  }
  return entry;
}

/**
 * Loads grids from `source` where `proj` (from `loadProj`) reads them. Each
 * name must be a plain file name and a current (not removed) key of the
 * source's catalog; every name is checked before anything is fetched. Each
 * grid's length and SHA-256 are checked against its entry before it is
 * written to the module's file system (browser) or staged beside `proj.db`
 * (Node), and PROJ must then find it there (a TIN or deformation-model
 * `.json`: PROJ must build the tinshift or defmodel that reads it, and must
 * not have found one before). Concurrent calls for one name
 * share one fetch; a name loaded already is a no-op (and throws if the
 * source's catalog gives it another hash). A refused grid isn't remembered.
 */
export async function loadGrids(
  proj: ProjApi,
  source: GridSource,
  names: readonly string[],
  options: LoadGridsOptions = {},
): Promise<void> {
  const state = gridStates.get(proj);
  if (!state) {
    throw new Error("PROJ: loadGrids needs a ProjApi that loadProj returned");
  }
  const entries = [...new Set(names)].map((name) => gridEntry(source, name));
  await Promise.all(
    entries.map(async (entry) => {
      const { name, sha256 } = entry;
      const had = state.loaded.get(name) ?? state.pending.get(name)?.sha256;
      if (had !== undefined && had !== sha256) {
        throw new Error(
          `PROJ: ${name} is loaded already with SHA-256 ${had}, not this catalog's ${sha256}`,
        );
      }
      if (state.loaded.has(name)) {
        return;
      }
      let pending = state.pending.get(name);
      if (!pending) {
        const load = (async () => {
          const probe = operationReading(entry);
          if (probe !== undefined) {
            // A .json (a TIN or a deformation model) isn't a grid to
            // proj_grid_info, so PROJ is asked to build the operation that
            // reads it: it must fail before the file is first put where PROJ
            // looks (else PROJ has a file of that name elsewhere, which it
            // might read instead), and work after.
            if (!state.staged.has(name) && creates(proj, probe)) {
              throw new Error(
                `PROJ: ${name} is found by PROJ before it is loaded (a file of that name is on PROJ's search path), so the one loaded can't be told from it`,
              );
            }
            const path = await state.install(source, entry, options.onProgress);
            state.staged.add(name);
            if (!creates(proj, probe)) {
              throw new Error(
                `PROJ: ${name} was loaded at ${path}, but PROJ can't create "${probe}" from it${entry.type === "DEFORMATION_MODEL" ? " (a deformation model's component grids must be loaded first)" : ""}`,
              );
            }
          } else {
            const path = await state.install(source, entry, options.onProgress);
            // PROJ must find it where it was put: not missing, and not a file
            // of the same name somewhere PROJ searches first.
            const found = state.absolute(proj.proj_grid_info(name).filename);
            if (found !== path) {
              throw new Error(
                `PROJ: ${name} was loaded at ${path}, but PROJ finds ${found === "" ? "no such grid" : found}`,
              );
            }
          }
          state.loaded.set(name, sha256);
        })().finally(() => state.pending.delete(name));
        pending = { sha256, load };
        state.pending.set(name, pending);
      }
      await pending.load;
    }),
  );
}

/** The grids `loadGrids` has loaded into `proj` (empty for any other ProjApi). */
export function loadedGrids(proj: ProjApi): ReadonlySet<string> {
  return new Set(gridStates.get(proj)?.loaded.keys());
}
