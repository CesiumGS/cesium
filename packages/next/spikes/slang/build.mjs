// Regenerates spikes/slang/generated/*.wgsl with slangc.
// Usage: node spikes/slang/build.mjs (slangc from `npm run setup`, or SLANGC)
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { slangcPath } from "../../scripts/slangTools.mjs";

// SLANGC, else the pinned one `npm run setup` fetched (scripts/slangTools.mjs).
const slangc = slangcPath();
if (!slangc) {
  throw new Error(
    "No slangc: run `npm run setup --workspace @cesium/next` (or set SLANGC).",
  );
}
const here = dirname(fileURLToPath(import.meta.url));
const run = (args) =>
  execFileSync(slangc, args, { cwd: here, stdio: "inherit" });
const temp = mkdtempSync(join(tmpdir(), "slang-"));
try {
  for (const material of ["default", "toon"]) {
    // The binding module is precompiled separately so its `export` satisfies
    // the engine module's `extern struct Material_` at link time.
    const ir = join(temp, `bind_${material}.slang-module`);
    run([`bind_${material}.slang`, "-o", ir]);
    run([
      "opaque.slang",
      ir,
      "-target",
      "wgsl",
      "-entry",
      "vs",
      "-stage",
      "vertex",
      "-entry",
      "fs",
      "-stage",
      "fragment",
      "-o",
      `generated/opaque_${material}.wgsl`,
    ]);
  }
  run([
    "cull.slang",
    "-target",
    "wgsl",
    "-entry",
    "cullRecords",
    "-stage",
    "compute",
    "-entry",
    "cullInstances",
    "-stage",
    "compute",
    "-entry",
    "writeDrawArgs",
    "-stage",
    "compute",
    "-o",
    "generated/cull.wgsl",
  ]);
} finally {
  rmSync(temp, { recursive: true, force: true });
}
