// PROJ's Node path (proj.ts): the native binding (`proj_capi.node`) and
// `proj.db`, run from a staging directory of the process's own.
//
// The first load makes a fresh `mkdtemp(<tmpdir>/cesium-proj-)` and points
// PROJ_DATA at it. Every file PROJ reads is copied there under a name PROJ
// never asks for (`<name>.partial`), the copy is checked, and only then is it
// renamed to its own name: what PROJ loads is the copy that was hashed, which
// a change at the source can't reach (the directory is the process's own, and
// a copy is a file of its own, unlike a hard link). `proj.db` is checked
// against its pin and the binding against setup's manifest entry for it (its
// extracted hash differs per platform, so it has no pin). The binding is
// required from its staged copy. Grids are staged the same way, by
// `stageNodeGrid`, each checked against its catalog entry.
//
// One base per process: PROJ_DATA names one directory, so a second, different
// base throws, naming the first. A refused load claims nothing.
//
// The copy is a clone where Node's copyFile makes one (a reflink on Linux's
// Btrfs or XFS; on macOS, Node 24 makes a full copy: about 18 MB, plus the
// grids). The directory is removed when the process exits normally. A killed
// process (Vitest ends its forks that way) leaves it, so each directory holds
// its process's pid (`owner`), and the next first load removes those whose
// process has ended.
//
// Its own module, typed by the little of Node it uses, so the library's
// declaration build (tsconfig.lib.json, browser types only) checks it without
// Node's types.
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
  readonly pid: number;
  on(event: "exit", listener: () => void): void;
  /** Signal 0 only: whether a process exists (it throws ESRCH if not). */
  kill(pid: number, signal: 0): boolean;
}

/** `node:module`'s `createRequire`, as the loader calls it. */
interface NodeModule {
  createRequire(from: string): (id: string) => unknown;
}

/** `node:url`'s `fileURLToPath`, as the loader calls it. */
interface NodeUrl {
  fileURLToPath(url: string): string;
}

/** `node:fs/promises`, as the loader calls it. */
interface NodeFs {
  readFile(path: string): Promise<Uint8Array>;
  readFile(path: string, encoding: "utf8"): Promise<string>;
  writeFile(path: string, data: string): Promise<void>;
  readdir(path: string): Promise<string[]>;
  mkdtemp(prefix: string): Promise<string>;
  copyFile(source: string, destination: string, mode: number): Promise<void>;
  rename(from: string, to: string): Promise<void>;
  rm(
    path: string,
    options: { recursive?: boolean; force: boolean },
  ): Promise<void>;
  access(path: string): Promise<void>;
  readonly constants: {
    readonly COPYFILE_EXCL: number;
    readonly COPYFILE_FICLONE: number;
  };
}

/** `node:fs`'s `rmSync`, for the exit handler. */
interface NodeFsSync {
  rmSync(path: string, options: { recursive: boolean; force: boolean }): void;
}

/** `node:os`'s `homedir` and `tmpdir`, and `node:path`'s `join` and `resolve`. */
interface NodeOs {
  homedir(): string;
  tmpdir(): string;
}
interface NodePath {
  join(...parts: string[]): string;
  resolve(path: string): string;
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

/** `base` (a path or file: URL) as an absolute directory path, with no trailing separator. */
async function directoryOf(base: string): Promise<string> {
  const { fileURLToPath } = await nodeImport<NodeUrl>("node:url");
  const { resolve } = await nodeImport<NodePath>("node:path");
  return resolve(base.startsWith("file:") ? fileURLToPath(base) : base);
}

/**
 * The files of setup's manifest. The store is found as
 * scripts/frameData.mjs's framesDataDirectory() finds it (FRAMES_DATA_DIR,
 * else ~/.cesium-bench/frames), not from `base`.
 */
async function manifestFiles(): Promise<{
  readonly path: string;
  readonly files: readonly { file?: unknown; sha256?: unknown }[];
}> {
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
  return {
    path,
    files: Array.isArray(files)
      ? (files as { file?: unknown; sha256?: unknown }[])
      : [],
  };
}

/** The SHA-256 setup recorded for `file` in the store's manifest. */
async function manifestSha256(file: string): Promise<string> {
  const { path, files } = await manifestFiles();
  const entry = files.find((f) => f.file === file);
  if (typeof entry?.sha256 !== "string") {
    throw new Error(`PROJ: ${path} lists no ${file}; ${SETUP}`);
  }
  return entry.sha256;
}

/**
 * The legacy default grid set: every `.tif` in `base` that setup's manifest
 * lists under `proj/` (GEOID18, in today's store).
 */
export async function manifestGridNames(base: string): Promise<string[]> {
  const { access } = await nodeImport<NodeFs>("node:fs/promises");
  const { join } = await nodeImport<NodePath>("node:path");
  const directory = await directoryOf(base);
  const names: string[] = [];
  for (const { file } of (await manifestFiles()).files) {
    const name =
      typeof file === "string" ? /^proj\/([\w.-]+\.tif)$/.exec(file)?.[1] : "";
    if (name) {
      try {
        await access(join(directory, name));
        names.push(name);
      } catch {
        // Listed, but not in this base.
      }
    }
  }
  return names;
}

/** Throws unless `bytes` hash to `expected`, naming the file and both hashes. */
async function verify(
  name: string,
  bytes: Uint8Array,
  expected: string,
): Promise<void> {
  const actual = await sha256Hex(bytes);
  if (actual !== expected) {
    throw new Error(
      `PROJ: ${name} SHA-256 mismatch (expected ${expected}, got ${actual})`,
    );
  }
}

/**
 * Copies `source` into `staging` as `<name>.partial`, passes the copy's bytes
 * to `check`, and renames it to `name` only if `check` resolves. On any
 * failure the copy is removed and nothing named `name` is left.
 */
async function stage(
  staging: string,
  source: string,
  name: string,
  check: (bytes: Uint8Array) => Promise<void>,
): Promise<void> {
  const fs = await nodeImport<NodeFs>("node:fs/promises");
  const { join } = await nodeImport<NodePath>("node:path");
  const partial = join(staging, `${name}.partial`);
  try {
    await fs.copyFile(
      source,
      partial,
      fs.constants.COPYFILE_EXCL | fs.constants.COPYFILE_FICLONE,
    );
  } catch (error) {
    if ((error as { code?: string }).code === "ENOENT") {
      throw new Error(`PROJ: there is no ${source}; ${SETUP}`, {
        cause: error,
      });
    }
    throw error;
  }
  try {
    await check(await fs.readFile(partial));
    await fs.rename(partial, join(staging, name));
  } catch (error) {
    await fs.rm(partial, { force: true });
    throw error;
  }
}

/** Staging directories are `<tmpdir>/cesium-proj-XXXXXX`, each with an `owner`. */
const STAGING_PREFIX = "cesium-proj-";
const OWNER = "owner";

/** Whether process `pid` exists (one we may not signal exists too). */
function alive(pid: number): boolean {
  try {
    nodeProcess()!.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as { code?: string }).code !== "ESRCH";
  }
}

/**
 * Removes the staging directories in `tmp` whose owner process has ended.
 * Best effort: a directory with no readable `owner`, or one whose process
 * may still run, is left alone.
 */
async function sweepStaging(tmp: string): Promise<void> {
  const fs = await nodeImport<NodeFs>("node:fs/promises");
  const { join } = await nodeImport<NodePath>("node:path");
  let entries: string[];
  try {
    entries = await fs.readdir(tmp);
  } catch {
    return;
  }
  await Promise.all(
    entries
      .filter((name) => name.startsWith(STAGING_PREFIX))
      .map(async (name) => {
        const directory = join(tmp, name);
        try {
          const owner = await fs.readFile(join(directory, OWNER), "utf8");
          const pid = /^\d+$/.test(owner) ? Number(owner) : 0;
          if (pid > 0 && pid !== nodeProcess()!.pid && !alive(pid)) {
            await fs.rm(directory, { recursive: true, force: true });
          }
        } catch {
          // Not readable, or removed meanwhile by another process's sweep.
        }
      }),
  );
}

let swept: Promise<void> | undefined;

/** What loadNodeProj gives proj.ts. */
export interface NodeProj {
  readonly api: ProjApi;
  /** PROJ_DATA: the directory PROJ reads `proj.db` and grids from. */
  readonly staging: string;
}

/** The base this process loaded PROJ from, once a load has succeeded. */
let claimed:
  { readonly directory: string; readonly proj: NodeProj } | undefined;

/**
 * PROJ's C API from the native binding in `base` (a path or file: URL), run
 * from a fresh staging directory holding checked copies of it and `proj.db`:
 * `proj.db` against `pins`, the binding against the store manifest's
 * `proj/proj_capi.node` entry. The same base again gives the same API; a
 * different one throws, naming the first.
 */
export async function loadNodeProj(
  base: string,
  pins: ProjPins,
): Promise<NodeProj> {
  const directory = await directoryOf(base);
  if (claimed?.directory === directory) {
    return claimed.proj;
  }
  const fs = await nodeImport<NodeFs>("node:fs/promises");
  const { tmpdir } = await nodeImport<NodeOs>("node:os");
  const { join } = await nodeImport<NodePath>("node:path");
  const { createRequire } = await nodeImport<NodeModule>("node:module");
  const { rmSync } = await nodeImport<NodeFsSync>("node:fs");
  const bindingSha256 = await manifestSha256("proj/proj_capi.node");
  await (swept ??= sweepStaging(tmpdir()));
  const staging = await fs.mkdtemp(join(tmpdir(), STAGING_PREFIX));
  const discard = () => fs.rm(staging, { recursive: true, force: true });
  try {
    await fs.writeFile(join(staging, OWNER), String(nodeProcess()!.pid));
  } catch (error) {
    await discard();
    throw error;
  }
  // Both settle before a refusal removes the directory they write into.
  const refused = (
    await Promise.allSettled([
      stage(staging, join(directory, "proj.db"), "proj.db", (bytes) =>
        verify("proj.db", bytes, pins["proj.db"]),
      ),
      stage(
        staging,
        join(directory, "proj_capi.node"),
        "proj_capi.node",
        (bytes) => verify("proj_capi.node", bytes, bindingSha256),
      ),
    ])
  ).find((result) => result.status === "rejected");
  if (refused) {
    await discard();
    throw refused.reason;
  }
  // Checked again after the awaits: a concurrent load may have claimed the
  // process meanwhile. From here to the claim nothing awaits.
  if (claimed) {
    await discard();
    if (claimed.directory === directory) {
      return claimed.proj;
    }
    throw new Error(
      `PROJ: this process loaded PROJ from ${claimed.directory}; it can't also load ${directory} (PROJ_DATA names one directory per process)`,
    );
  }
  let api: ProjApi;
  try {
    // Read when the binding initializes, so it comes before the require.
    nodeProcess()!.env.PROJ_DATA = staging;
    const require = createRequire(import.meta.url);
    api = require(join(staging, "proj_capi.node")) as ProjApi;
    // The binding reads PROJ_DATA when its context is first used, not when
    // it loads, so use it now.
    api.proj_create("EPSG:4326");
  } catch (error) {
    await discard();
    throw error;
  }
  claimed = { directory, proj: { api, staging } };
  nodeProcess()!.on("exit", () =>
    rmSync(staging, { recursive: true, force: true }),
  );
  return claimed.proj;
}

/** Reads `name` from `base` (a path or file: URL). */
export async function readNodeFile(
  base: string,
  name: string,
): Promise<Uint8Array> {
  const { readFile } = await nodeImport<NodeFs>("node:fs/promises");
  const { join } = await nodeImport<NodePath>("node:path");
  const path = join(await directoryOf(base), name);
  try {
    return await readFile(path);
  } catch (error) {
    throw new Error(`PROJ: there is no ${path}; ${SETUP}`, { cause: error });
  }
}

/**
 * Stages grid `name` from `base` into `staging` (see the header): copied,
 * checked by `check`, then given its name. Returns the path PROJ should find
 * it at.
 */
export async function stageNodeGrid(
  staging: string,
  base: string,
  name: string,
  check: (bytes: Uint8Array) => Promise<void>,
): Promise<string> {
  const { join } = await nodeImport<NodePath>("node:path");
  await stage(staging, join(await directoryOf(base), name), name, check);
  return join(staging, name);
}
