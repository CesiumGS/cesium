// The subset reader's size as a library would ship it: one minified ES
// module of the readers and the composer (not the coverage report or the
// fixture), with its gzip and Brotli sizes. Writes out/size.json.
//   node packages/next/spikes/usd-subset/size.mjs

// esbuild comes from the repository root; spike tools only.
import { build } from "esbuild";
import { mkdirSync, writeFileSync } from "node:fs";
import { brotliCompressSync, gzipSync } from "node:zlib";
import { fileURLToPath } from "node:url";

const here = fileURLToPath(new URL("./", import.meta.url));
const result = await build({
  stdin: {
    contents: `export { loadLayers, Stage, parseLayer } from "./compose.ts";`,
    resolveDir: here,
    loader: "ts",
  },
  bundle: true,
  minify: true,
  format: "esm",
  target: "es2023",
  write: false,
  logLevel: "warning",
});
const bytes = result.outputFiles[0].contents;
const size = {
  minified: bytes.length,
  gzip: gzipSync(bytes, { level: 9 }).length,
  brotli: brotliCompressSync(bytes).length,
};
mkdirSync(`${here}out`, { recursive: true });
writeFileSync(`${here}out/size.json`, JSON.stringify(size, null, 2));
console.log(size);
