// The Slang toolchain, pinned to one release (plan §3.4): the native
// compiler `slangc` (build-time Slang: the spike's ports, scripts/
// slangShader.mjs, later the engine's shaders) and the WebAssembly build
// (runtime Slang: CustomShader.fromSlang, Dyno's Slang playground).
// Each is fetched once from the release on GitHub into a store outside
// the repo (~/.cesium-bench/slang-*/<version>), checked against the
// release's published SHA-256 digest. `npm run setup` fetches both;
// `node scripts/slangTools.mjs` does it alone. SLANGC and SLANG_WASM_DIR
// still override the store.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import process from "node:process";

/** The Slang release slangc and the WASM build are pinned to. */
export const SLANG_VERSION = "2026.21";

const store = (kind) =>
  join(homedir(), ".cesium-bench", `slang-${kind}`, SLANG_VERSION);

/** The folder under `root` holding a file named `file`, if any. */
function find(root, file) {
  if (!existsSync(root)) {
    return undefined;
  }
  if (existsSync(join(root, file))) {
    return root;
  }
  for (const name of readdirSync(root)) {
    const path = join(root, name);
    if (statSync(path).isDirectory()) {
      const found = find(path, file);
      if (found) {
        return found;
      }
    }
  }
  return undefined;
}

/** The release asset for this machine's native slangc. */
function nativeAsset() {
  const os = { darwin: "macos", linux: "linux", win32: "windows" }[
    process.platform
  ];
  const arch = { arm64: "aarch64", x64: "x86_64" }[process.arch];
  if (!os || !arch) {
    throw new Error(
      `slangc: no release for ${process.platform} ${process.arch}`,
    );
  }
  return `slang-${SLANG_VERSION}-${os}-${arch}.zip`;
}

const SLANGC = process.platform === "win32" ? "slangc.exe" : "slangc";

/** Where the WASM build is: the folder holding slang-wasm.js. */
export function slangWasmDirectory() {
  return (
    process.env.SLANG_WASM_DIR ??
    find(store("wasm"), "slang-wasm.js") ??
    store("wasm")
  );
}

/** The native slangc to run: SLANGC, else the store's, else undefined. */
export function slangcPath() {
  if (process.env.SLANGC) {
    return process.env.SLANGC;
  }
  const bin = find(store("native"), SLANGC);
  return bin ? join(bin, SLANGC) : undefined;
}

/** Downloads, verifies and unpacks a release asset into `root`. */
async function fetchAsset(name, root, log) {
  const release = await fetch(
    `https://api.github.com/repos/shader-slang/slang/releases/tags/v${SLANG_VERSION}`,
    { headers: { Accept: "application/vnd.github+json" } },
  ).then((r) => {
    if (!r.ok) {
      throw new Error(`Slang release v${SLANG_VERSION}: HTTP ${r.status}`);
    }
    return r.json();
  });
  const asset = release.assets?.find((a) => a.name === name);
  if (!asset) {
    throw new Error(`Slang release v${SLANG_VERSION} has no ${name}`);
  }
  log(
    `downloading ${name} (${(asset.size / 1048576).toFixed(1)} MB) from GitHub…`,
  );
  const response = await fetch(asset.browser_download_url);
  if (!response.ok) {
    throw new Error(`${name}: HTTP ${response.status}`);
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  // GitHub publishes each asset's SHA-256 (`digest`, "sha256:…").
  const digest = `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
  if (asset.digest && asset.digest !== digest) {
    throw new Error(
      `${name}: digest ${digest} isn't the release's ${asset.digest}`,
    );
  }
  mkdirSync(root, { recursive: true });
  const zip = join(root, name);
  writeFileSync(zip, bytes);
  // unzip on macOS and Linux; Windows' bsdtar reads zip archives too.
  if (process.platform === "win32") {
    execFileSync(
      join(process.env.SystemRoot ?? "C:\\Windows", "System32", "tar.exe"),
      ["-xf", zip, "-C", root],
    );
  } else {
    execFileSync("unzip", ["-q", "-o", zip, "-d", root]);
  }
  return asset.digest ?? "no digest published";
}

/** The WASM build's folder, fetching it first if the store lacks it. */
export async function ensureSlangWasm(log = console.log) {
  const found =
    process.env.SLANG_WASM_DIR ?? find(store("wasm"), "slang-wasm.js");
  if (found) {
    return found;
  }
  const digest = await fetchAsset(
    `slang-${SLANG_VERSION}-wasm.zip`,
    store("wasm"),
    log,
  );
  const unpacked = find(store("wasm"), "slang-wasm.js");
  if (!unpacked) {
    throw new Error("slang-wasm: no slang-wasm.js in the release's zip");
  }
  log(`  slang-wasm ${SLANG_VERSION}: ready (${digest})`);
  return unpacked;
}

/** The native slangc, fetching this platform's release first if needed. */
export async function ensureSlangc(log = console.log) {
  const found = slangcPath();
  if (found) {
    return found;
  }
  const digest = await fetchAsset(nativeAsset(), store("native"), log);
  const path = slangcPath();
  if (!path) {
    throw new Error(`slangc: no ${SLANGC} in ${nativeAsset()}`);
  }
  if (process.platform !== "win32") {
    chmodSync(path, 0o755);
  }
  if (process.platform === "darwin") {
    // Downloaded by a script, not a browser, it has no quarantine flag;
    // clear it anyway in case the archive carried one.
    try {
      execFileSync("xattr", ["-dr", "com.apple.quarantine", store("native")]);
    } catch {
      // Nothing to clear.
    }
  }
  log(`  slangc ${SLANG_VERSION}: ready (${digest})`);
  return path;
}

// Run directly (`node scripts/slangTools.mjs`): fetch both now.
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(`slangc: ${await ensureSlangc()}`);
  console.log(`slang-wasm: ${await ensureSlangWasm()}`);
}
