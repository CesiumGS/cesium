// Loads PROJ (proj.js v0.9.2's builds of PROJ 9.7.1), which `npm run setup`
// puts in the frames data store under `proj/` (scripts/frameData.mjs). Nothing
// loads until a caller asks: Earth-only scenes never pay for it.
//
//  - Browser: the WebAssembly C-API build (`proj_capi.mjs` beside
//    `proj_capi.wasm`, served from `base`), initialized the way proj.js's own
//    wasm/emnapi.mjs does, with `proj.db` and the grids written into the
//    module's file system.
//  - Node: the native binding (`proj_capi.node`) from the store directory,
//    which PROJ_DATA names so it finds `proj.db` and the grids there.
//
// Licenses: PROJ and proj.js are MIT; proj.db carries the EPSG Dataset (IOGP,
// https://epsg.org/terms-of-use.html).
import { readWithProgress, type LoadProgress } from "../io/readWithProgress.ts";
import type { ProjApi } from "./projApi.ts";

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
}

interface Loaded {
  readonly api: Promise<ProjApi>;
  readonly module?: WasmModule;
  readonly grids: Set<string>;
}

const loaded = new Map<string, Promise<Loaded>>();

const isNode = (): boolean =>
  typeof window === "undefined" &&
  typeof process !== "undefined" &&
  !!process.versions?.node;

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

async function loadNode(base: string): Promise<Loaded> {
  // Variable specifiers keep bundlers from resolving the Node modules.
  const moduleName = "node:module";
  const urlName = "node:url";
  const { createRequire } = (await import(
    /* @vite-ignore */ moduleName
  )) as typeof import("node:module");
  const { fileURLToPath } = (await import(
    /* @vite-ignore */ urlName
  )) as typeof import("node:url");
  const directory = base.startsWith("file:") ? fileURLToPath(base) : base;
  // Read when the binding initializes, so it comes before the require.
  process.env.PROJ_DATA = directory;
  const require = createRequire(import.meta.url);
  const api = require(`${directory}proj_capi.node`) as ProjApi;
  // The binding reads PROJ_DATA when its context is first used, not when it
  // loads, so use it now: a later load of another base then cannot change
  // where this one looks.
  api.proj_create("EPSG:4326");
  return { api: Promise.resolve(api), grids: new Set() };
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
): Promise<Loaded> {
  const have = new Set<string>();
  // The glue, its WebAssembly (fetched here, so its bytes can be reported),
  // proj.db and the grids, all at once.
  const [glue, wasmBinary, files] = await Promise.all([
    import(/* @vite-ignore */ `${base}proj_capi.mjs`) as Promise<{
      default(moduleArg?: ModuleArg): Promise<WasmModule>;
    }>,
    fetchBuffer(base, "proj_capi.wasm", onProgress),
    fetchFiles(base, ["proj.db", ...grids], have, onProgress),
  ]);
  const module = await glue.default({ wasmBinary });
  // Only the browser path needs it, so importing the package index does not
  // pull the runtime into every bundle.
  const emnapi = await import("@emnapi/runtime");
  const api = module.emnapiInit({ context: emnapi.getDefaultContext() });
  writeFiles(module, files, have);
  return { api: Promise.resolve(api), module, grids: have };
}

/**
 * PROJ's C API, loaded once per `base` (later calls share the first one's
 * result, and load any further `grids` it names in the browser).
 */
export async function loadProj(options: LoadProjOptions): Promise<ProjApi> {
  const { grids = [], onProgress } = options;
  // Every URL and the cache key are built from one form that ends in a slash.
  const base = /[\\/]$/.test(options.base) ? options.base : `${options.base}/`;
  let entry = loaded.get(base);
  if (!entry) {
    entry = isNode() ? loadNode(base) : loadBrowser(base, grids, onProgress);
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
