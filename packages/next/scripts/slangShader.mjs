// Compiles Slang custom shader stages (`import cesium;`) to custom shader
// WGSL at build time, the recommended path (plan §3.4):
//
//   SLANGC=/path/to/slangc node scripts/slangShader.mjs stages.slang [-o stages.wgsl]
//     [--attributes name:type,...] [--metadata name:type,...]
//     [--uniforms name:type,...]
//
// `--attributes`, `--metadata` and `--uniforms` give the types of the
// shader's named attributes, metadata properties and uniforms
// (`CustomShaderOptions`), e.g. `--metadata temperatures:vec2f`,
// `--uniforms amplitude:f32,palette:texture2d`; pass the same to
// `CustomShader`.
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
  cesiumModule,
  slangStages,
  slangStub,
} from "../src/scene/slangStages.ts";

const slangc = process.env.SLANGC;
if (!slangc) {
  throw new Error("Set SLANGC to the slangc executable.");
}
const args = process.argv.slice(2);
const valued = new Set(["-o", "--attributes", "--metadata", "--uniforms"]);
const input = args.find((a, i) => !a.startsWith("-") && !valued.has(args[i - 1]));
const declared = (flag) => {
  const at = args.indexOf(flag);
  return at < 0
    ? {}
    : Object.fromEntries(args[at + 1].split(",").map((d) => d.split(":")));
};
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
    cesiumModule(readFileSync(join(here, "../src/shaders/cesium.slang"), "utf8"), {
      attributes: declared("--attributes"),
      metadata: declared("--metadata"),
      uniforms: Object.fromEntries(
        Object.entries(declared("--uniforms")).map(([n, type]) => [n, { type }]),
      ),
    }),
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
