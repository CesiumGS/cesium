// Regenerates spikes/slang/generated/*.wgsl with slangc.
// Usage: SLANGC=/path/to/slangc node spikes/slang/build.mjs
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const slangc = process.env.SLANGC;
if (!slangc) {
  throw new Error("Set SLANGC to the slangc executable.");
}
const here = dirname(fileURLToPath(import.meta.url));
const run = (args) => execFileSync(slangc, args, { cwd: here, stdio: "inherit" });
const temp = mkdtempSync(join(tmpdir(), "slang-"));
try {
  for (const material of ["default", "toon"]) {
    const ir = join(temp, `material_${material}.slang-module`);
    run([`material_${material}.slang`, "-o", ir]);
    run([
      "opaque.slang", ir, "-target", "wgsl",
      "-entry", "vs", "-stage", "vertex", "-entry", "fs", "-stage", "fragment",
      "-o", `generated/opaque_${material}.wgsl`,
    ]);
  }
  run(["prep.slang", "-target", "wgsl", "-entry", "main", "-stage", "compute", "-o", "generated/prep.wgsl"]);
} finally {
  rmSync(temp, { recursive: true, force: true });
}
