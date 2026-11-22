// Runs the Node measurements: bundles bench.ts (and today's sources) with
// esbuild, then runs it with naga-wasm, the 1.x styling oracle and, when
// installed, onnxruntime-web. Writes out/node.json.
//   cd packages/next/spikes/core-ir && npm install && node run.mjs

// esbuild comes from the repository root; spike tools only.
// eslint-disable-next-line n/no-extraneous-import
import { build } from "esbuild";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { pinned1x } from "../../bench/suite/pinned1x.mjs";

const here = fileURLToPath(new URL("./", import.meta.url));
// The 1.x styling oracle comes from the pinned release (cesium-1x).
const pinned = pinned1x();
const engine = pinned.engine.dir;
const core = pinned.core.dir;
mkdirSync(`${here}out`, { recursive: true });

await build({
  entryPoints: [`${here}bench.ts`, `${here}oracle.js`],
  outdir: `${here}out`,
  bundle: true,
  platform: "node",
  format: "esm",
  logLevel: "warning",
  alias: { "cesium-engine-oracle": engine, "cesium-oracle": core },
});

const { run } = await import(pathToFileURL(`${here}out/bench.js`).href);
const { evaluate1x } = await import(pathToFileURL(`${here}out/oracle.js`).href);
const naga = await import("naga-wasm").catch(() => undefined);

let ort;
try {
  // onnxruntime-web is in the repository root's tree, not a dependency of this package.
  // eslint-disable-next-line n/no-extraneous-import
  const ortWeb = await import("onnxruntime-web");
  ortWeb.env.wasm.numThreads = 1;
  ort = async (bytes, feeds) => {
    // Twice: the first call also starts ort's wasm; the second is a session per edit.
    await ortWeb.InferenceSession.create(bytes);
    const t0 = performance.now();
    const session = await ortWeb.InferenceSession.create(bytes);
    const ms = performance.now() - t0;
    const inputs = {};
    for (const [k, v] of Object.entries(feeds)) {
      inputs[k] = Array.isArray(v)
        ? new ortWeb.Tensor("float64", Float64Array.from(v), [v.length])
        : new ortWeb.Tensor("float64", Float64Array.of(v), []);
    }
    const r = await session.run(inputs);
    const out = {};
    for (const [k, t] of Object.entries(r)) {
      out[k] = Array.from(t.data, Number);
    }
    return { ms: Math.round(ms * 100) / 100, out };
  };
} catch {
  ort = undefined;
}

const results = await run({ naga, oracle: { evaluate: evaluate1x }, ort });
results.env = {
  node: process.version,
  date: new Date().toISOString(),
  ort: Boolean(ort),
  naga: Boolean(naga),
};
writeFileSync(`${here}out/node.json`, JSON.stringify(results, null, 2));
console.log(
  JSON.stringify(
    results,
    (k, v) =>
      ["wgsl", "glsl", "listing", "nagaGlsl"].includes(k)
        ? `<${String(v).length} chars>`
        : v,
    2,
  ),
);
