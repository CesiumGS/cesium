// Open CASCADE in WebAssembly (plan §13.33, the CSG sample's second kernel):
// replicad's custom build of OpenCascade.js, pinned to one npm version and
// checked against its integrity hash, unpacked into a store outside the repo
// (~/.cesium-bench/occt/<version>), never committed and never bundled. It is
// LGPL 2.1 (unlike SMLib's Apache 2.0), so it stays a separate module that an
// example loads on request from the dev server's /occt/; check the licence
// before distributing anything built with it. Only the single-threaded build
// is kept: the threaded one needs cross-origin isolation.
//
//   node scripts/occtTools.mjs     fetch and unpack, print the folder
//   npm run setup                  the same, as part of setup
//
// OCCT_DIR overrides the store (a folder holding replicad_single.js).
import { execFileSync, execSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

export const OCCT_PACKAGE = "replicad-opencascadejs";
export const OCCT_VERSION = "1.2.1";
/** npm's integrity hash for OCCT_VERSION's tarball. */
const INTEGRITY =
  "sha512-nFWkL5+24JiN1sv5fLGhdQr3FKCOLR3PIBkeZJcLm37p4eraEtD7Jueo8dP2BoqClJwb9hTSkf2QMli3GVqhpg==";
const FILES = ["replicad_single.js", "replicad_single.wasm"];

const store = join(homedir(), ".cesium-bench", "occt", OCCT_VERSION);

const complete = (directory) =>
  FILES.every((file) => existsSync(join(directory, file)));

/** The folder holding replicad_single.js, or undefined if it isn't fetched. */
export function occtDirectory() {
  if (process.env.OCCT_DIR) {
    return process.env.OCCT_DIR;
  }
  return complete(store) ? store : undefined;
}

/** The pinned build's folder, fetching it first if the store lacks it. */
export function ensureOcct(log = console.log) {
  const found = occtDirectory();
  if (found) {
    return found;
  }
  log(`${OCCT_PACKAGE}@${OCCT_VERSION}: downloading from npm (about 20 MB)…`);
  const staging = `${store}.partial`;
  rmSync(staging, { recursive: true, force: true });
  mkdirSync(staging, { recursive: true });
  const windows = process.platform === "win32";
  // One command string, as npm is a script on Windows; every part is a constant.
  const packed = JSON.parse(
    execSync(
      `npm pack ${OCCT_PACKAGE}@${OCCT_VERSION} --json --pack-destination .`,
      { cwd: staging, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    ),
  )[0];
  // npm pack checks the tarball against the registry's hash; this checks the
  // registry still serves the tarball that was pinned.
  if (packed.integrity !== INTEGRITY) {
    rmSync(staging, { recursive: true, force: true });
    throw new Error(
      `${OCCT_PACKAGE}@${OCCT_VERSION}: integrity ${packed.integrity}, pinned ${INTEGRITY}`,
    );
  }
  // Windows' own bsdtar (Git's GNU tar would read "C:" as a remote host).
  const tar = windows
    ? join(process.env.SystemRoot ?? "C:\\Windows", "System32", "tar.exe")
    : "tar";
  execFileSync(tar, ["-xzf", join(staging, packed.filename), "-C", staging]);
  rmSync(store, { recursive: true, force: true });
  mkdirSync(store, { recursive: true });
  for (const file of FILES) {
    copyFileSync(join(staging, "package", "dist", file), join(store, file));
  }
  copyFileSync(join(staging, "package", "LICENSE"), join(store, "LICENSE"));
  rmSync(staging, { recursive: true, force: true });
  log(`  ${OCCT_PACKAGE}@${OCCT_VERSION}: ready (${INTEGRITY.slice(0, 20)}…)`);
  return store;
}

// Run directly: fetch now.
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  console.log(`occt: ${ensureOcct()}`);
}
