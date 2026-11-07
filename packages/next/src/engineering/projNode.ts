// PROJ's Node path (proj.ts): the native binding (`proj_capi.node`) from the
// store directory, which PROJ_DATA names so it finds `proj.db` and the grids
// there. Before either loads, `proj.db` is checked against its pin and the
// binding against setup's manifest entry for it (its extracted hash differs
// per platform, so it has no pin). Its own module, typed by the little of
// Node it uses, so the library's declaration build (tsconfig.lib.json,
// browser types only) checks it without Node's types.
import { sha256Hex } from "../io/sha256.ts";
import type { ProjApi } from "./projApi.ts";

/**
 * The SHA-256 each of PROJ's own files must have (`PROJ_FILE_SHA256`, from
 * projPins.ts, by default). Node checks only `proj.db` against it.
 */
export type ProjPins = Readonly<
  Record<"proj_capi.mjs" | "proj_capi.wasm" | "proj.db", string>
>;

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

/** `node:fs/promises`' `readFile`, as the loader calls it. */
interface NodeFs {
  readFile(path: string): Promise<Uint8Array>;
  readFile(path: string, encoding: "utf8"): Promise<string>;
}

/** `node:os`'s `homedir` and `node:path`'s `join`, as the loader calls them. */
interface NodeOs {
  homedir(): string;
}
interface NodePath {
  join(...parts: string[]): string;
}

const nodeProcess = (): NodeProcess | undefined =>
  (globalThis as { process?: NodeProcess }).process;

/** Whether this is Node (not a browser, nor a worker in one). */
export const isNode = (): boolean =>
  typeof window === "undefined" && !!nodeProcess()?.versions?.node;

// Variable specifiers keep bundlers from resolving the Node modules.
const nodeImport = <T>(name: string): Promise<T> =>
  import(/* @vite-ignore */ name) as Promise<T>;

const SETUP = "run `npm run setup`";

/**
 * The SHA-256 setup recorded for `file` in the store's manifest. The store is
 * found as scripts/frameData.mjs's framesDataDirectory() finds it
 * (FRAMES_DATA_DIR, else ~/.cesium-bench/frames), not from `base`.
 */
async function manifestSha256(file: string): Promise<string> {
  const { readFile } = await nodeImport<NodeFs>("node:fs/promises");
  const { homedir } = await nodeImport<NodeOs>("node:os");
  const { join } = await nodeImport<NodePath>("node:path");
  const store =
    nodeProcess()!.env.FRAMES_DATA_DIR ??
    join(homedir(), ".cesium-bench", "frames");
  const path = join(store, "manifest.json");
  let text: string;
  try {
    text = await readFile(path, "utf8");
  } catch {
    throw new Error(`PROJ: the frames data store has no ${path}; ${SETUP}`);
  }
  const files = (JSON.parse(text) as { files?: unknown }).files;
  const entry = Array.isArray(files)
    ? (files as { file?: unknown; sha256?: unknown }[]).find(
        (f) => f.file === file,
      )
    : undefined;
  if (typeof entry?.sha256 !== "string") {
    throw new Error(`PROJ: ${path} lists no ${file}; ${SETUP}`);
  }
  return entry.sha256;
}

/** Throws unless the file hashes to `expected`, naming it and both hashes. */
async function verifyFile(
  directory: string,
  name: string,
  expected: string,
): Promise<void> {
  const { readFile } = await nodeImport<NodeFs>("node:fs/promises");
  const path = `${directory}${name}`;
  let bytes: Uint8Array;
  try {
    bytes = await readFile(path);
  } catch {
    throw new Error(`PROJ: there is no ${path}; ${SETUP}`);
  }
  const actual = await sha256Hex(bytes);
  if (actual !== expected) {
    throw new Error(
      `PROJ: ${name} SHA-256 mismatch (expected ${expected}, got ${actual})`,
    );
  }
}

/**
 * PROJ's C API from the native binding in `base` (a path or file: URL), once
 * it and `proj.db` are checked: `proj.db` against `pins`, the binding against
 * the store manifest's `proj/proj_capi.node` entry.
 */
export async function loadNodeProj(
  base: string,
  pins: ProjPins,
): Promise<ProjApi> {
  const { createRequire } = await nodeImport<NodeModule>("node:module");
  const { fileURLToPath } = await nodeImport<NodeUrl>("node:url");
  const directory = base.startsWith("file:") ? fileURLToPath(base) : base;
  await Promise.all([
    verifyFile(directory, "proj.db", pins["proj.db"]),
    manifestSha256("proj/proj_capi.node").then((sha256) =>
      verifyFile(directory, "proj_capi.node", sha256),
    ),
  ]);
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
