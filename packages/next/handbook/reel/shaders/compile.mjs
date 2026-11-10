// Compiles the reel's shader presets to WGSL, the build-time path, so the page
// needs no Slang download: node --experimental-strip-types handbook/reel/shaders/compile.mjs
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PRESETS } from "../../../examples/slang-playground/presets.ts";

const here = dirname(fileURLToPath(import.meta.url));
const scratch = mkdtempSync(join(tmpdir(), "reel-shaders-"));
const names = [
  "Rim glow",
  "Vertex wave",
  "Iridescence",
  "Hologram",
  "Brushed gold",
  "Plasma",
];
/**
 * Sliders the reel sets apart from the playground's defaults: the vertex
 * stages move in the model's own units, and the toy car's mesh is hundreds
 * of them across (its nodes scale it down).
 */
const OVERRIDES = {
  "Vertex wave": { amplitude: "12", frequency: "0.03", speed: "3" },
};
const out = {};
for (const name of names) {
  const preset = PRESETS.find((p) => p.name === name);
  const source = join(scratch, "stages.slang");
  // The presets' sliders become constants at their defaults (or the reel's
  // own): no uniforms.
  const own = OVERRIDES[name] ?? {};
  const code = preset.code
    .replace(
      /\[Color\(([^)]*)\)\]\s*uniform float3 (\w+);/g,
      "static const float3 $2 = float3($1);",
    )
    .replace(
      /\[Slider\(([^,)]*)[^)]*\)\]\s*uniform (float|int) (\w+);/g,
      (...groups) => {
        const [value, type, key] = groups.slice(1, 4);
        return `static const ${type} ${key} = ${own[key] ?? value};`;
      },
    )
    .replace(
      /\[Toggle\((true|false)\)\]\s*uniform bool (\w+);/g,
      "static const bool $2 = $1;",
    );
  writeFileSync(source, code);
  const target = join(scratch, "stages.wgsl");
  execFileSync(process.execPath, [
    join(here, "../../../scripts/slangShader.mjs"),
    source,
    "-o",
    target,
  ]);
  out[name] = readFileSync(target, "utf8");
}
rmSync(scratch, { recursive: true });
writeFileSync(join(here, "presets.json"), `${JSON.stringify(out, null, 1)}\n`);
console.log(
  Object.entries(out)
    .map(([k, v]) => `${k}: ${v.length}`)
    .join(", "),
);
