// The Slang WebAssembly build for runtime compilation (CustomShader.fromSlang,
// Dyno's Slang playground, the Slang spike): one pinned release, fetched
// once from GitHub into a store outside the repo and checked against the
// release's published SHA-256 digest. The dev server serves it at
// /slang-wasm/ (vite.config.ts), SLANG_WASM_DIR overriding the store.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import process from "node:process";

/** The Slang release the WASM build and slangc are pinned to. */
export const SLANG_VERSION = "2026.21";

/** Where the WASM build is unpacked: the folder holding slang-wasm.js. */
export function slangWasmDirectory() {
  const root =
    process.env.SLANG_WASM_STORE ??
    join(homedir(), ".cesium-bench", "slang-wasm", SLANG_VERSION);
  return findScript(root) ?? root;
}

/** The folder under `root` that holds slang-wasm.js, if any. */
function findScript(root) {
  if (!existsSync(root)) {
    return undefined;
  }
  if (existsSync(join(root, "slang-wasm.js"))) {
    return root;
  }
  for (const name of readdirSync(root)) {
    const path = join(root, name);
    if (statSync(path).isDirectory()) {
      const found = findScript(path);
      if (found) {
        return found;
      }
    }
  }
  return undefined;
}

/** Fetches and unpacks the WASM build if it isn't in the store yet. */
export async function ensureSlangWasm(log = console.log) {
  const root =
    process.env.SLANG_WASM_STORE ??
    join(homedir(), ".cesium-bench", "slang-wasm", SLANG_VERSION);
  const found = findScript(root);
  if (found) {
    return found;
  }
  const name = `slang-${SLANG_VERSION}-wasm.zip`;
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
  const unpacked = findScript(root);
  if (!unpacked) {
    throw new Error(`${name}: no slang-wasm.js inside`);
  }
  log(
    `  slang-wasm ${SLANG_VERSION}: ready (${asset.digest ?? "no digest published"})`,
  );
  return unpacked;
}

// Run directly (`node scripts/slangWasm.mjs`): fetch it now.
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(`slang-wasm: ${await ensureSlangWasm()}`);
}
