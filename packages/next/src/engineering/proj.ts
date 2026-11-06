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
import * as emnapi from "@emnapi/runtime";
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

async function fetchBytes(url: string): Promise<Uint8Array> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `PROJ: ${url} returned ${response.status}; run \`npm run setup\` and restart the dev server`,
    );
  }
  return new Uint8Array(await response.arrayBuffer());
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
  const separator =
    directory.endsWith("/") || directory.endsWith("\\") ? "" : "/";
  // Read when the binding initializes, so it comes before the require.
  process.env.PROJ_DATA = directory;
  const require = createRequire(import.meta.url);
  const api = require(`${directory}${separator}proj_capi.node`) as ProjApi;
  return { api: Promise.resolve(api), grids: new Set() };
}

async function writeGrids(
  module: WasmModule,
  base: string,
  names: readonly string[],
  have: Set<string>,
): Promise<void> {
  for (const name of names) {
    // A bare file name: it becomes a path in the module's in-memory file system.
    if (!/^[\w.-]+$/.test(name) || name.startsWith("..")) {
      throw new Error(`PROJ: "${name}" is not a plain grid file name`);
    }
  }
  const missing = names.filter((name) => !have.has(name));
  const files = await Promise.all(
    missing.map(
      async (name) => [name, await fetchBytes(`${base}${name}`)] as const,
    ),
  );
  for (const [name, bytes] of files) {
    module.FS.writeFile(`/${name}`, bytes, { encoding: "binary" });
    have.add(name);
  }
}

async function loadBrowser(
  base: string,
  grids: readonly string[],
): Promise<Loaded> {
  const glue = (await import(/* @vite-ignore */ `${base}proj_capi.mjs`)) as {
    default(): Promise<WasmModule>;
  };
  const module = await glue.default();
  const api = module.emnapiInit({ context: emnapi.getDefaultContext() });
  const have = new Set<string>();
  await writeGrids(module, base, ["proj.db", ...grids], have);
  return { api: Promise.resolve(api), module, grids: have };
}

/**
 * PROJ's C API, loaded once per `base` (later calls share the first one's
 * result, and load any further `grids` it names in the browser).
 */
export async function loadProj(options: LoadProjOptions): Promise<ProjApi> {
  const { base, grids = [] } = options;
  let entry = loaded.get(base);
  if (!entry) {
    entry = isNode() ? loadNode(base) : loadBrowser(base, grids);
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
    await writeGrids(module, base, grids, have);
  }
  return api;
}
