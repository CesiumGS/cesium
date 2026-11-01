// Released CesiumJS builds for the benchmark suite (plan §16.6): a 1.x
// configuration can run this repository's build or any version published
// on npm. Versions are resolved ("latest" → an exact version), downloaded
// once with `npm pack` into the store outside the repo
// (BENCH_CESIUM_DIR, default ~/.cesium-bench/cesium/<version>), verified
// against npm's integrity hash, and served by the dev server at
// /cesium-release/<version>/. Results record the exact version.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import process from "node:process";

export function releasesDirectory() {
  return (
    process.env.BENCH_CESIUM_DIR ?? join(homedir(), ".cesium-bench", "cesium")
  );
}

const npm = (args, cwd) =>
  execFileSync(process.platform === "win32" ? "npm.cmd" : "npm", args, {
    cwd,
    encoding: "utf8",
    shell: process.platform === "win32",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();

/** An exact version for "latest", a dist-tag or a version range. */
export function resolveVersion(spec) {
  // Versions and dist-tags only: the spec reaches a shell on Windows.
  if (!/^[\w.-]+$/.test(spec)) {
    throw new Error(`cesium version "${spec}": use a version or a dist-tag`);
  }
  if (/^\d+\.\d+\.\d+$/.test(spec)) {
    return spec;
  }
  const version = npm(["view", `cesium@${spec}`, "version"]).split("\n").pop();
  if (!/^\d+\.\d+\.\d+(-[\w.]+)?$/.test(version)) {
    throw new Error(`cesium@${spec}: no such version`);
  }
  return version;
}

/**
 * Exact versions for a sweep: "1.120.0,1.130.0" as listed, or a range
 * "1.120.0..1.146.0" of every published stable release in it (oldest
 * first; pre-releases skipped).
 */
export function releaseList(spec) {
  if (!spec.includes("..")) {
    return spec.split(",").map((v) => resolveVersion(v.trim()));
  }
  const [from, to] = spec.split("..").map((v) => resolveVersion(v.trim()));
  const key = (v) => v.split(".").map(Number);
  const before = (a, b) => {
    const [x, y] = [key(a), key(b)];
    for (let i = 0; i < 3; i++) {
      if (x[i] !== y[i]) {
        return x[i] < y[i];
      }
    }
    return false;
  };
  const all = JSON.parse(npm(["view", "cesium", "versions", "--json"]));
  return all.filter(
    (v) => /^\d+\.\d+\.\d+$/.test(v) && !before(v, from) && !before(to, v),
  );
}

/**
 * Makes sure `version` is in the store; returns its directory and npm
 * metadata (integrity, size). Downloads and unpacks it the first time.
 */
export function ensureRelease(version, log = console.log) {
  const directory = join(releasesDirectory(), version);
  const meta = join(directory, "release.json");
  if (
    existsSync(meta) &&
    existsSync(join(directory, "package", "Build", "Cesium", "Cesium.js"))
  ) {
    return { directory, ...JSON.parse(readFileSync(meta, "utf8")) };
  }
  mkdirSync(directory, { recursive: true });
  log(`downloading cesium@${version} from npm…`);
  const packed = JSON.parse(
    npm(["pack", `cesium@${version}`, "--json", "--pack-destination", "."], directory),
  )[0];
  const tarball = join(directory, packed.filename);
  // npm pack checks the tarball against the registry's integrity hash.
  // Windows' own bsdtar (Git's GNU tar would read "C:" as a remote host).
  const tar =
    process.platform === "win32"
      ? join(process.env.SystemRoot ?? "C:\\Windows", "System32", "tar.exe")
      : "tar";
  execFileSync(tar, ["-xzf", tarball, "-C", directory]);
  if (!existsSync(join(directory, "package", "Build", "Cesium", "Cesium.js"))) {
    throw new Error(`cesium@${version}: no Build/Cesium in the package`);
  }
  const info = {
    version,
    integrity: packed.integrity,
    shasum: packed.shasum,
    bytes: packed.size,
    unpackedBytes: packed.unpackedSize,
  };
  writeFileSync(meta, JSON.stringify(info, null, 2));
  return { directory, ...info };
}
