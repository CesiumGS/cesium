// Compiles Slang custom shader stages (`import cesium;`) to custom shader
// WGSL at build time, the recommended path (plan §3.4):
//
//   SLANGC=/path/to/slangc node scripts/slangShader.mjs stages.slang [-o stages.wgsl]
//
// The output is `CustomShader`'s `wgsl` option, e.g. from a `?raw` import.
// Runtime compilation (`CustomShader.fromSlang`) produces the same.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import {
  SLANG_STUB_ENTRY,
  adaptSlangStages,
  slangStages,
  slangStub,
} from "../src/scene/slangStages.ts";

const slangc = process.env.SLANGC;
if (!slangc) {
  throw new Error("Set SLANGC to the slangc executable.");
}
const args = process.argv.slice(2);
const input = args.find((a, i) => !a.startsWith("-") && args[i - 1] !== "-o");
if (!input) {
  throw new Error("Usage: node scripts/slangShader.mjs stages.slang [-o out.wgsl]");
}
const o = args.indexOf("-o");
const output =
  o >= 0 ? resolve(args[o + 1]) : resolve(input.replace(/\.slang$/, ".wgsl"));

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(input, "utf8");
const stages = slangStages(source);
if (!stages.vertex && !stages.fragment) {
  throw new Error(`${input} defines neither vertexMain nor fragmentMain.`);
}
// Slang resolves `import user;` and `import cesium;` by file name.
const temp = mkdtempSync(join(tmpdir(), "slang-stages-"));
try {
  writeFileSync(
    join(temp, "cesium.slang"),
    readFileSync(join(here, "../src/shaders/cesium.slang")),
  );
  writeFileSync(join(temp, "user.slang"), source);
  writeFileSync(join(temp, "stages.slang"), slangStub(stages));
  const wgsl = join(temp, "stages.wgsl");
  execFileSync(
    slangc,
    [
      "stages.slang",
      "-target",
      "wgsl",
      "-entry",
      SLANG_STUB_ENTRY,
      "-stage",
      "fragment",
      "-o",
      wgsl,
    ],
    { cwd: temp, stdio: "inherit" },
  );
  writeFileSync(
    output,
    `// Generated from ${basename(input)} by scripts/slangShader.mjs; do not edit.\n${adaptSlangStages(readFileSync(wgsl, "utf8"), stages)}`,
  );
  console.log(`wrote ${output}`);
} finally {
  rmSync(temp, { recursive: true, force: true });
}
