// Runs the M0 spikes and benchmarks in Playwright's Chromium and writes one
// JSON file per run to bench/results/.
//
//   npm run dev --workspace @cesium/next          # in another terminal
//   node packages/next/bench/run.mjs [suite ...]  # suites: see below
//
// Chromium flags: WebGPU developer features (unquantized timestamp queries)
// and the high-performance GPU on dual-GPU machines. Results record the
// adapter so numbers from different GPUs are never mixed up.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const BASE = process.env.BENCH_URL ?? "http://127.0.0.1:5190";
const here = dirname(fileURLToPath(import.meta.url));

/** page path → global function that runs it and returns JSON-serializable results */
const suites = {
  precision: ["/spikes/precision.html?bench", "runPrecision"],
  indirect: ["/spikes/indirect.html?bench", "runIndirect"],
  parity: ["/parity/?bench", "runParity"],
  models: [
    `/parity/models.html?bench${process.env.MODELS_ONLY ? `&only=${process.env.MODELS_ONLY}` : ""}`,
    "runModels",
  ],
  slang: ["/spikes/slang.html?bench", "runSlang"],
  baseline: ["/bench/baseline.html?bench", "runBaseline"],
  // Public Specs tilesets; ION_ASSET=<id> (with VITE_ION_TOKEN in .env.local)
  // runs a private ion asset instead, without the id entering the repo.
  lod: [
    `/parity/lod.html?bench${process.env.ION_ASSET ? `&asset=${process.env.ION_ASSET}` : ""}${process.env.AT ? `&at=${process.env.AT}` : ""}`,
    "runLod",
  ],
  selection: [
    `/parity/selection.html?bench${process.env.ION_ASSET ? `&asset=${process.env.ION_ASSET}` : ""}${process.env.AT ? `&at=${process.env.AT}` : ""}`,
    "runSelection",
  ],
  tileset: [
    `/parity/tileset.html?bench${process.env.ION_ASSET ? `&asset=${process.env.ION_ASSET}` : ""}${process.env.PICK_PROPERTY ? `&pick=${process.env.PICK_PROPERTY}` : ""}${process.env.TILESET_ZOOM ? `&zoom=${process.env.TILESET_ZOOM}` : ""}`,
    "runTileset",
  ],
  // Driven through CDP by `allocSuite` below.
  alloc: ["/bench/alloc.html", "allocSetup"],
};

const ALLOC_FRAMES = 300;

/**
 * Steady-state allocation gate. Profiles allocations with the sampling heap
 * profiler (including objects already garbage-collected) while frames run,
 * at two draw counts, and attributes them to source locations. Engine
 * allocations should not grow with draw count and should trend to zero.
 */
async function allocSuite(page) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("HeapProfiler.enable");
  const runs = [];
  for (const draws of [1000, 10000]) {
    const scene = await page.evaluate((n) => globalThis.allocSetup(n), draws);
    await cdp.send("HeapProfiler.collectGarbage");
    await cdp.send("HeapProfiler.startSampling", {
      samplingInterval: 128,
      includeObjectsCollectedByMajorGC: true,
      includeObjectsCollectedByMinorGC: true,
    });
    await page.evaluate((n) => globalThis.allocRun(n), ALLOC_FRAMES);
    const { profile } = await cdp.send("HeapProfiler.stopSampling");
    const sites = new Map();
    const walk = (node) => {
      if (node.selfSize > 0) {
        const { functionName, url, lineNumber } = node.callFrame;
        const file = url
          .replace(/^https?:\/\/[^/]+\//, "")
          .replace(/\?.*$/, "");
        const key = `${functionName || "(anonymous)"} ${file}:${lineNumber + 1}`;
        const site = sites.get(key) ?? { site: key, file, bytes: 0 };
        site.bytes += node.selfSize;
        sites.set(key, site);
      }
      node.children.forEach(walk);
    };
    walk(profile.head);
    const all = [...sites.values()];
    const sum = (list) => list.reduce((n, s) => n + s.bytes, 0);
    const engine = all.filter((s) => s.file.startsWith("src/"));
    runs.push({
      draws,
      records: scene.records,
      batches: scene.batches,
      frames: ALLOC_FRAMES,
      bytesPerFrame: Math.round(sum(all) / ALLOC_FRAMES),
      engineBytesPerFrame: Math.round(sum(engine) / ALLOC_FRAMES),
      topEngineSites: engine
        .sort((a, b) => b.bytes - a.bytes)
        .slice(0, 12)
        .map((s) => ({
          site: s.site,
          bytesPerFrame: Math.round(s.bytes / ALLOC_FRAMES),
        })),
    });
  }
  await cdp.detach();
  return runs;
}

const selected = process.argv.slice(2);
const names = selected.length > 0 ? selected : Object.keys(suites);
for (const name of names) {
  if (!suites[name]) {
    throw new Error(
      `Unknown suite "${name}". Known: ${Object.keys(suites).join(", ")}`,
    );
  }
}

const browser = await chromium.launch({
  headless: process.env.BENCH_HEADED ? false : true,
  // Edge: Chromium with the same WebGPU stack, installed under Program Files.
  // (Playwright's bundled Chromium may be blocked from running on managed PCs.)
  channel: process.env.BENCH_CHANNEL ?? "msedge",
  args: [
    "--enable-unsafe-webgpu",
    // Lets pages force a major GC to reach a known idle state before timing.
    "--js-flags=--expose-gc",
    "--enable-webgpu-developer-features",
    "--force_high_performance_gpu",
  ],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on("console", (message) => {
  // Resource failures are reported with their URL by the response handler.
  if (
    message.type() === "error" &&
    !message.text().startsWith("Failed to load resource")
  ) {
    errors.push(message.text());
  }
});
page.on("pageerror", (error) => errors.push(String(error)));
page.on("response", (response) => {
  if (response.status() >= 400 && !response.url().endsWith("/favicon.ico")) {
    errors.push(`HTTP ${response.status()} ${response.url()}`);
  }
});

await page.goto(`${BASE}/spikes/precision.html?bench`);
const environment = await page.evaluate(async () => {
  const adapter = await navigator.gpu?.requestAdapter({
    powerPreference: "high-performance",
  });
  return {
    userAgent: navigator.userAgent,
    adapter: adapter
      ? {
          vendor: adapter.info.vendor,
          architecture: adapter.info.architecture,
          description: adapter.info.description,
        }
      : null,
    timestampQuery: adapter?.features.has("timestamp-query") ?? false,
  };
});
console.log(`adapter: ${JSON.stringify(environment.adapter)}`);
if (!environment.adapter) {
  throw new Error("No WebGPU adapter in this browser.");
}

const results = {};
for (const name of names) {
  const [path, fn] = suites[name];
  const started = performance.now();
  process.stdout.write(`${name}… `);
  await page.goto(`${BASE}${path}`);
  await page.waitForFunction((f) => typeof globalThis[f] === "function", fn, {
    timeout: 60_000,
  });
  results[name] =
    name === "alloc"
      ? await allocSuite(page)
      : await page.evaluate((f) => globalThis[f](), fn);
  console.log(`${((performance.now() - started) / 1000).toFixed(1)} s`);
}
await browser.close();

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const gpu =
  `${environment.adapter.vendor}-${environment.adapter.architecture}`.replace(
    /[^a-z0-9-]/gi,
    "_",
  );
const outDir = join(here, "results");
mkdirSync(outDir, { recursive: true });
const file = join(outDir, `${stamp}-${gpu}.json`);
writeFileSync(
  file,
  `${JSON.stringify({ date: new Date().toISOString(), environment, errors, results }, null, 2)}\n`,
);
console.log(`wrote ${file}`);
if (errors.length > 0) {
  console.log(`${errors.length} console errors recorded`);
}
