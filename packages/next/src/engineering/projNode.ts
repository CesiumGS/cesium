// PROJ's Node path (proj.ts): the native binding (`proj_capi.node`) from the
// store directory, which PROJ_DATA names so it finds `proj.db` and the grids
// there. Its own module, typed by the little of Node it uses, so the
// library's declaration build (tsconfig.lib.json, browser types only) checks
// it without Node's types.
import type { ProjApi } from "./projApi.ts";

/** The parts of Node's `process` the loader reads. */
interface NodeProcess {
  readonly versions?: { readonly node?: string };
  readonly env: Record<string, string | undefined>;
}

/** `node:module`'s `createRequire`, as the loader calls it. */
interface NodeModule {
  createRequire(from: string): (id: string) => unknown;
}

/** `node:url`'s `fileURLToPath`, as the loader calls it. */
interface NodeUrl {
  fileURLToPath(url: string): string;
}

const nodeProcess = (): NodeProcess | undefined =>
  (globalThis as { process?: NodeProcess }).process;

/** Whether this is Node (not a browser, nor a worker in one). */
export const isNode = (): boolean =>
  typeof window === "undefined" && !!nodeProcess()?.versions?.node;

/** PROJ's C API from the native binding in `base` (a path or file: URL). */
export async function loadNodeProj(base: string): Promise<ProjApi> {
  // Variable specifiers keep bundlers from resolving the Node modules.
  const moduleName = "node:module";
  const urlName = "node:url";
  const { createRequire } = (await import(
    /* @vite-ignore */ moduleName
  )) as NodeModule;
  const { fileURLToPath } = (await import(
    /* @vite-ignore */ urlName
  )) as NodeUrl;
  const directory = base.startsWith("file:") ? fileURLToPath(base) : base;
  // Read when the binding initializes, so it comes before the require.
  nodeProcess()!.env.PROJ_DATA = directory;
  const require = createRequire(import.meta.url);
  const api = require(`${directory}proj_capi.node`) as ProjApi;
  // The binding reads PROJ_DATA when its context is first used, not when it
  // loads, so use it now: a later load of another base then cannot change
  // where this one looks.
  api.proj_create("EPSG:4326");
  return api;
}
