// Loads PROJ (proj.js v0.9.2's builds of PROJ 9.7.1), which `npm run setup`
// puts in the frames data store under `proj/` (scripts/frameData.mjs). Nothing
// loads until a caller asks: Earth-only scenes never pay for it.
//
//  - Browser: the WebAssembly C-API build (`proj_capi.mjs` beside
//    `proj_capi.wasm`, served from `base`), initialized the way proj.js's own
//    wasm/emnapi.mjs does, with `proj.db` and the grids written into the
//    module's file system. The glue, the WebAssembly and `proj.db` are
//    fetched and checked against their pins (projPins.ts) before any is used,
//    and the glue runs from a Blob URL of the checked bytes, so what runs is
//    what was hashed.
//  - Node: the native binding (`proj_capi.node`) from the store directory,
//    which PROJ_DATA names so it finds `proj.db` and the grids there; both
//    are checked first (projNode.ts).
//
// Licenses: PROJ and proj.js are MIT; proj.db carries the EPSG Dataset (IOGP,
// https://epsg.org/terms-of-use.html).
import { readWithProgress, type LoadProgress } from "../io/readWithProgress.ts";
import { sha256Hex } from "../io/sha256.ts";
import type { ProjApi } from "./projApi.ts";
import { isNode, loadNodeProj, type ProjPins } from "./projNode.ts";
import { PROJ_FILE_SHA256 } from "./projPins.ts";

export type { ProjApi } from "./projApi.ts";

export interface LoadProjOptions {
  /**
   * Where the store's `proj/` directory is served (a URL ending in "/", such
   * as `/frames-data/proj/`), or, in Node, its path (or file: URL).
   */
  readonly base: string;
  /** Grid files to load beside `proj.db` (browser; Node finds them in `base`). */
  readonly grids?: readonly string[];
  /**
   * Called as the browser fetches each file this call loads, by its name
   * (`proj_capi.wasm`, `proj.db`, a grid), with the bytes received and the
   * response's `Content-Length` (R9). A call that shares an earlier call's
   * load reports only the grids it adds. Node reads files and never calls it.
   */
  readonly onProgress?: LoadProgress;
  /**
   * Internal, for tests: the SHA-256 each PROJ file must have (default
   * `PROJ_FILE_SHA256`), so stubs can pass their own bytes' hashes.
   */
  readonly pins?: ProjPins;
  /**
   * Internal, for tests: imports the glue from its checked bytes (default:
   * from a Blob URL of them). Node's loader refuses blob: URLs, so the
   * Node-run unit tests inject a data: URL importer.
   */
  readonly importGlue?: (bytes: Uint8Array) => Promise<unknown>;
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

interface Loaded {
  readonly api: Promise<ProjApi>;
  readonly module?: WasmModule;
  readonly grids: Set<string>;
}

const loaded = new Map<string, Promise<Loaded>>();

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

/** Throws unless `bytes` hash to `expected`, naming the file and both hashes. */
async function verify(
  name: string,
  bytes: ArrayBuffer | Uint8Array,
  expected: string,
): Promise<void> {
  const actual = await sha256Hex(bytes);
  if (actual !== expected) {
    throw new Error(
      `PROJ: ${name} SHA-256 mismatch (expected ${expected}, got ${actual})`,
    );
  }
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

async function loadNode(base: string, pins: ProjPins): Promise<Loaded> {
  return {
    api: Promise.resolve(await loadNodeProj(base, pins)),
    grids: new Set(),
  };
}

/** Fetches the named files of `base` that `have` lacks, in parallel. */
async function fetchFiles(
  base: string,
  names: readonly string[],
  have: ReadonlySet<string>,
  onProgress: LoadProgress | undefined,
): Promise<(readonly [string, Uint8Array])[]> {
  for (const name of names) {
    // A bare file name: it becomes a path in the module's in-memory file system.
    if (!/^[\w.-]+$/.test(name) || name.startsWith("..")) {
      throw new Error(`PROJ: "${name}" is not a plain grid file name`);
    }
  }
  const missing = [...new Set(names)].filter((name) => !have.has(name));
  return Promise.all(
    missing.map(
      async (name) =>
        [
          name,
          new Uint8Array(await fetchBuffer(base, name, onProgress)),
        ] as const,
    ),
  );
}

function writeFiles(
  module: WasmModule,
  files: readonly (readonly [string, Uint8Array])[],
  have: Set<string>,
): void {
  for (const [name, bytes] of files) {
    module.FS.writeFile(`/${name}`, bytes, { encoding: "binary" });
    have.add(name);
  }
}

async function loadBrowser(
  base: string,
  grids: readonly string[],
  onProgress: LoadProgress | undefined,
  pins: ProjPins,
  importGlue: (bytes: Uint8Array) => Promise<unknown>,
): Promise<Loaded> {
  // proj.db counts as had from the start, so a grid list naming it can't
  // fetch an unchecked copy over the checked one.
  const have = new Set<string>(["proj.db"]);
  // The glue (small, so its bytes aren't reported), its WebAssembly (fetched
  // here, so its bytes can be reported), proj.db and the grids, all at once.
  // The pinned three are checked as they arrive; nothing runs until all are.
  const [glueBytes, wasmBinary, db, files] = await Promise.all([
    fetchPinned(base, "proj_capi.mjs", pins, undefined),
    fetchPinned(base, "proj_capi.wasm", pins, onProgress),
    fetchPinned(base, "proj.db", pins, onProgress),
    fetchFiles(base, grids, have, onProgress),
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
  writeFiles(module, [["proj.db", new Uint8Array(db)], ...files], have);
  return { api: Promise.resolve(api), module, grids: have };
}

/**
 * PROJ's C API, loaded once per `base` (later calls share the first one's
 * result, and load any further `grids` it names in the browser). Rejects,
 * naming the file and both hashes, when `proj_capi.mjs`, `proj_capi.wasm`
 * or `proj.db` (or, in Node, `proj_capi.node`) isn't the pinned file; a
 * refused load isn't remembered.
 */
export async function loadProj(options: LoadProjOptions): Promise<ProjApi> {
  const {
    grids = [],
    onProgress,
    pins = PROJ_FILE_SHA256,
    importGlue = importFromBlob,
  } = options;
  // Every URL and the cache key are built from one form that ends in a slash.
  const base = /[\\/]$/.test(options.base) ? options.base : `${options.base}/`;
  let entry = loaded.get(base);
  if (!entry) {
    entry = isNode()
      ? loadNode(base, pins)
      : loadBrowser(base, grids, onProgress, pins, importGlue);
    loaded.set(base, entry);
    // A failed load is not remembered, so a retry after setup can work.
    entry.catch(() => {
      if (loaded.get(base) === entry) {
        loaded.delete(base);
      }
    });
  }
  const { api, module, grids: have } = await entry;
  if (module) {
    writeFiles(module, await fetchFiles(base, grids, have, onProgress), have);
  }
  return api;
}
