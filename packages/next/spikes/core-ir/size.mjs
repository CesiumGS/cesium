// Bundle sizes of candidate (a): the core passes alone, and with the front ends.
//   node size.mjs
// esbuild comes from the repository root; spike tools only.
// eslint-disable-next-line n/no-extraneous-import
import { build } from "esbuild";
import { brotliCompressSync, gzipSync, constants } from "node:zlib";
import { readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";

const here = fileURLToPath(new URL(".", import.meta.url));
const sets = {
  core: ["cir.ts", "passes.ts", "ad.ts", "interval.ts", "emit.ts"],
  "core + style front end": [
    "cir.ts",
    "passes.ts",
    "ad.ts",
    "interval.ts",
    "emit.ts",
    "fromStyle.ts",
  ],
  "all of (a)": [
    "cir.ts",
    "passes.ts",
    "ad.ts",
    "interval.ts",
    "emit.ts",
    "fromStyle.ts",
    "fromTransform.ts",
    "fromMaterialX.ts",
    "fromSpirv.ts",
  ],
  "(b) onnx writer, reader, encoder": ["onnx.ts"],
};
const out = {};
for (const [name, files] of Object.entries(sets)) {
  const r = await build({
    stdin: {
      contents: files.map((f) => `export * from "./${f}";`).join("\n"),
      resolveDir: here,
      loader: "ts",
    },
    bundle: true,
    minify: true,
    format: "esm",
    write: false,
    platform: "browser",
    logLevel: "error",
  });
  const code = r.outputFiles[0].contents;
  out[name] = {
    minified: code.length,
    gzip: gzipSync(code, { level: 9 }).length,
    brotli: brotliCompressSync(code, {
      params: { [constants.BROTLI_PARAM_QUALITY]: 11 },
    }).length,
  };
}
const wasm = readFileSync(
  `${here}node_modules/naga-wasm/dist/wasm/naga_bg.wasm`,
);
out["naga-wasm 30.2.0 (wasm)"] = {
  minified: statSync(`${here}node_modules/naga-wasm/dist/wasm/naga_bg.wasm`)
    .size,
  gzip: gzipSync(wasm, { level: 9 }).length,
  brotli: brotliCompressSync(wasm, {
    params: { [constants.BROTLI_PARAM_QUALITY]: 11 },
  }).length,
};
console.table(out);
