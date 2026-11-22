// The Lab's harnesses: the M0 spikes, benchmarks and parity suites, run in
// Playwright's browser, one JSON file per run in bench/results/.
//
//   dyno lab [suite ...]        # suites: `dyno lab --list`; none runs all
//   (the old entry point, `node bench/run.mjs`, still works and
//   says the new command)
//
// The runner serves the pages from its own Vite server with file watching
// and HMR off, so editing code mid-run can't reload the page being measured
// (BENCH_URL=<origin> or --url uses an existing server instead).
// BENCH_COMMIT=<rev> or --commit <rev> (e.g. HEAD) serves that commit from a
// snapshot worktree under .bench/ instead of the working tree, so
// development continues while benchmarks run (see snapshot.mjs). Every
// commit's 1.x is the pinned one (cesium-1x, in the repository's
// node_modules): a commit from before CS-611 reads it from
// CESIUM_BUILD_DIR, which this sets.
// The Slang suite needs SLANG_WASM_DIR, as for the dev server.
//
// Chromium flags: WebGPU developer features (unquantized timestamp queries)
// and the high-performance GPU on dual-GPU machines. Results record the
// adapter so numbers from different GPUs are never mixed up.
import { mkdirSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { keepAwake } from "../telemetry.mjs";

const here = dirname(fileURLToPath(import.meta.url));
/** bench/ at the repository's root. */
const bench = join(here, "..", "..");

/**
 * page path → global function that runs it and returns JSON-serializable
 * results. Some pages read their settings from the environment (`env`).
 */
export function labSuites(env = process.env) {
  return {
    precision: ["/spikes/precision.html?bench", "runPrecision"],
    // The reference atmosphere (docs/design/lighting-and-shading.md): GPU path tracer vs CPU integral.
    atmosphere: ["/spikes/atmosphere.html?bench", "runAtmosphere"],
    // 2.0's image-based lighting vs a Monte Carlo reference (docs/design/lighting-and-shading.md).
    ibl: ["/spikes/ibl.html?bench", "runIbl"],
    // The real-time atmosphere vs the reference (docs/design/lighting-and-shading.md).
    sky: ["/spikes/sky.html?bench", "runSky"],
    // The observer's chain: stages, and later the sky and glare (sky and observer plan).
    observer: [
      `/spikes/observer.html?bench${env.GROUP ? `&group=${env.GROUP}` : ""}`,
      "runObserver",
    ],
    indirect: ["/spikes/indirect.html?bench", "runIndirect"],
    parity: ["/parity/?bench", "runParity"],
    models: [
      `/parity/models.html?bench${env.MODELS_ONLY ? `&only=${env.MODELS_ONLY}` : ""}`,
      "runModels",
    ],
    "slang-probes": ["/spikes/slang-probes.html?bench", "runSlangProbes"],
    "slang-kernels": ["/spikes/slang-kernels.html?bench", "runSlangKernels"],
    baseline: ["/bench/baseline.html?bench", "runBaseline"],
    // Content in and out of a live world (needs VITE_ION_TOKEN).
    hitch: ["/bench/hitch.html?bench", "runHitch"],
    // Many instances of one multi-primitive model (docs/design/transforms-and-instancing.md).
    instances: ["/bench/instances.html?bench", "runInstances"],
    // Public Specs tilesets; ION_ASSET=<id> (with VITE_ION_TOKEN in .env.local)
    // runs a private ion asset instead, without the id entering the repo.
    lod: [
      `/parity/lod.html?bench${env.ION_ASSET ? `&asset=${env.ION_ASSET}` : ""}${env.IMODEL ? `&imodel=${env.IMODEL}` : ""}${env.AT ? `&at=${env.AT}` : ""}${env.SCENARIOS ? `&scenarios=${encodeURIComponent(env.SCENARIOS)}` : ""}${env.POLICIES ? `&policies=${env.POLICIES}` : ""}${env.ION_TOKEN === "default" ? "&token=default" : ""}${env.SHADOWS === "1" ? "&shadows=1" : ""}${env.CASTERS === "0" ? "&casters=0" : ""}${env.CACHE_BYTES ? `&cache=${env.CACHE_BYTES}` : ""}${env.CLOSE ? `&close=${env.CLOSE}` : ""}${env.NO_FLIP === "1" ? "&flip=0" : ""}${env.SIZE ? `&size=${env.SIZE}` : ""}${env.SUN ? `&sun=${env.SUN}` : ""}`,
      "runLod",
    ],
    selection: [
      `/parity/selection.html?bench${env.ION_ASSET ? `&asset=${env.ION_ASSET}` : ""}${env.AT ? `&at=${env.AT}` : ""}`,
      "runSelection",
    ],
    // Terrain (Cesium World Terrain, ion asset 1; needs VITE_ION_TOKEN).
    globe: [
      `/parity/globe.html?bench${env.FOG === "0" ? "&fog=0" : ""}`,
      "runGlobe",
    ],
    imagery: ["/parity/imagery.html?bench", "runImagery"],
    // Moment-based OIT against the exact per-pixel lists (work/README.md M4).
    translucency: ["/parity/translucency.html?bench", "runTranslucency"],
    customShader: ["/parity/customShader.html?bench", "runCustomShader"],
    tracks: ["/parity/tracks.html?bench", "runTracks"],
    tracksBench: ["/bench/tracksBench.html?bench", "runTracksBench"],
    shaderCost: ["/bench/shaderCost.html?bench", "runShaderCost"],
    translucencyCost: [
      "/bench/translucencyCost.html?bench",
      "runTranslucencyCost",
    ],
    // What the observer, stars and glare cost, with synthetic stars (no data).
    observerCost: [
      `/bench/observerCost.html?bench${env.COST_RUNS ? `&runs=${env.COST_RUNS}` : ""}${env.COST_SUBMISSION === "direct" ? "&submission=direct" : ""}${env.COST_PACK === "local" ? "&pack=local" : ""}`,
      "runObserverCost",
    ],
    // Clamping heights on OSM Buildings vs 1.x (needs VITE_ION_TOKEN).
    heights: ["/parity/heights.html?bench", "runHeights"],
    tileset: [
      `/parity/tileset.html?bench${env.ION_ASSET ? `&asset=${env.ION_ASSET}` : ""}${env.PICK_PROPERTY ? `&pick=${env.PICK_PROPERTY}` : ""}${env.TILESET_ZOOM ? `&zoom=${env.TILESET_ZOOM}` : ""}${env.TILESET_STYLES ? "&styles" : ""}`,
      "runTileset",
    ],
    // Cesium IR's WGSL emitter: Chrome compiles every test module, and the GPU's
    // answers are read back against the float64 evaluator (CS-51).
    irWgsl: ["/bench/irWgsl.html?bench", "runIrWgsl"],
    // The same programs in WebGL 2: Chrome compiles and links each GLSL ES 3.00
    // kernel, and transform feedback reads the answers back (CS-52).
    irGlsl: ["/bench/irGlsl.html?bench", "runIrGlsl"],
    // Driven through CDP by `allocSuite` below.
    alloc: ["/bench/alloc.html", "allocSetup"],
    // A Viewer under React's StrictMode: one device, each frames-store file
    // fetched once, a clean console (CS-708; needs the frames store).
    strictMode: ["/bench/strictMode.html?bench", "runStrictMode"],
    // Three USD readers over six SimReady samples: size, start time, coverage
    // of CS-802 B's features (CS-900). Needs spikes/usd-readers/serve.mjs as
    // the server (--url): its routes, builds and cross-origin isolation.
    usdReaders: ["/bench/usdReaders.html?bench", "runUsdReaders"],
  };
}

/** The harnesses' names. */
export const LAB_SUITES = Object.keys(labSuites({}));

/**
 * L1′ on a slow network: references render unthrottled, then the page and
 * its dedicated workers (where tile fetches run; each is its own DevTools
 * target) get 20 Mbit/s, 80 ms latency and no HTTP cache.
 */
async function throttledLod(page) {
  await page.evaluate(() => globalThis.runLodReference());
  // A shared 20 Mbit/s link with 80 ms latency for remote content, applied
  // at the request router (which, unlike CDP network emulation, also sees
  // worker fetches). route.fetch() bypasses the browser cache.
  const latencyMs = 80;
  const bytesPerMs = (20 * 1024 * 1024) / 8 / 1000;
  let linkFreeAt = 0;
  let throttled = 0;
  let failed = 0;
  await page.context().route(
    (url) => url.hostname !== "127.0.0.1" && url.hostname !== "localhost",
    async (route) => {
      try {
        const response = await route.fetch();
        const body = await response.body();
        const start = Math.max(performance.now() + latencyMs, linkFreeAt);
        linkFreeAt = start + body.length / bytesPerMs;
        await new Promise((r) =>
          setTimeout(r, Math.max(0, linkFreeAt - performance.now())),
        );
        throttled++;
        await route.fulfill({ response, body });
      } catch (error) {
        // Fetch failed or the page dropped the request: pass it through.
        if (failed++ === 0) {
          console.log(
            `(throttle passthrough: ${error.message.split("\n")[0]}) `,
          );
        }
        await route.continue().catch(() => {});
      }
    },
  );
  const rows = await page.evaluate(() => globalThis.runLod());
  console.log(`(${throttled} throttled requests, ${failed} passed through) `);
  return rows;
}

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
    const engine = all.filter((s) => /^packages\/[^/]+\/src\//.test(s.file));
    runs.push({
      draws,
      records: scene.records,
      batches: scene.batches,
      frames: ALLOC_FRAMES,
      bytesPerFrame: Math.round(sum(all) / ALLOC_FRAMES),
      engineBytesPerFrame: Math.round(sum(engine) / ALLOC_FRAMES),
      topEngineSites: engine
        .sort((a, b) => b.bytes - a.bytes)
        .slice(0, 40)
        .map((s) => ({
          site: s.site,
          bytesPerFrame: Math.round(s.bytes / ALLOC_FRAMES),
        })),
    });
  }
  await cdp.detach();
  return runs;
}

/** A suite name the Lab doesn't have: the dispatcher's `usage`. */
export class LabUsage extends Error {}

/**
 * Runs the named harnesses (all of them when `names` is empty) and writes
 * one results file. Returns the file, the suites and the console errors
 * the pages logged.
 */
export async function main(names = [], { env = process.env } = {}) {
  const suites = labSuites(env);
  if (names.length === 0) {
    names = Object.keys(suites);
  }
  for (const name of names) {
    if (!Object.hasOwn(suites, name)) {
      throw new LabUsage(
        `unknown suite "${name}" (suites: ${Object.keys(suites).join(", ")})`,
      );
    }
  }
  const { chromium } = await import("@playwright/test");
  let BASE = env.BENCH_URL;
  let server;
  let commit;
  if (!BASE) {
    let root = join(bench, "..");
    let allow;
    if (env.BENCH_COMMIT) {
      const { snapshot } = await import("../../snapshot.mjs");
      const snap = snapshot(env.BENCH_COMMIT, here);
      root = snap.root;
      commit = snap.sha;
      // The repository's node_modules (resolved by walking up from
      // .bench/<sha>), served without links, with the pinned 1.x in it.
      // Commits from before CS-611 read their 1.x build from
      // CESIUM_BUILD_DIR.
      const { pinned1x } = await import("../pinned1x.mjs");
      env.CESIUM_BUILD_DIR ??= pinned1x().build;
      allow = [snap.repo];
      console.log(`commit ${commit.slice(0, 12)} (${root})`);
    }
    const { createServer } = await import("vite");
    server = await createServer({
      root,
      configFile: join(root, "vite.config.ts"),
      // Its own dependency cache inside the served tree.
      cacheDir: join(root, ".vite-bench"),
      server: {
        port: 5191,
        strictPort: false,
        hmr: false,
        watch: null,
        ...(allow ? { fs: { allow } } : {}),
      },
      logLevel: "error",
    });
    await server.listen();
    BASE = server.resolvedUrls.local[0].replace(/\/$/, "");
  }

  // The machine and display stay awake for the run (a GPU clocked down
  // mid-run reads as a regression).
  const awake = keepAwake();
  const browser = await chromium.launch({
    headless: env.BENCH_HEADED ? false : true,
    // Edge: Chromium with the same WebGPU stack, installed under Program Files.
    // (Playwright's bundled Chromium may be blocked from running on managed PCs.)
    channel: env.BENCH_CHANNEL ?? "msedge",
    args: [
      "--enable-unsafe-webgpu",
      // Lets pages force a major GC to reach a known idle state before timing.
      "--js-flags=--expose-gc",
      "--enable-webgpu-developer-features",
      "--force_high_performance_gpu",
    ],
  });
  const page = await browser.newPage({
    viewport: { width: 1280, height: 900 },
  });
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
    // ALLOC_GLARE=1: the allocation gate with glare on, in every view.
    const query = name === "alloc" && env.ALLOC_GLARE === "1" ? "?glare=1" : "";
    await page.goto(`${BASE}${path}${query}`);
    await page.waitForFunction((f) => typeof globalThis[f] === "function", fn, {
      timeout: 60_000,
    });
    results[name] =
      name === "alloc"
        ? await allocSuite(page)
        : name === "lod" && env.THROTTLE
          ? await throttledLod(page)
          : await page.evaluate((f) => globalThis[f](), fn);
    console.log(`${((performance.now() - started) / 1000).toFixed(1)} s`);
  }
  await browser.close();
  await server?.close();
  awake.release();

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const gpu =
    `${environment.adapter.vendor}-${environment.adapter.architecture}`.replace(
      /[^a-z0-9-]/gi,
      "_",
    );
  const outDir = join(bench, "results");
  mkdirSync(outDir, { recursive: true });
  const file = join(outDir, `${stamp}-${gpu}.json`);
  writeFileSync(
    file,
    `${JSON.stringify({ date: new Date().toISOString(), ...(commit ? { commit } : {}), environment, errors, results }, null, 2)}\n`,
  );
  console.log(`wrote ${file}`);
  if (errors.length > 0) {
    console.log(`${errors.length} console errors recorded`);
  }
  return {
    file,
    // The results file's name is the run's id until CS-401 records Lab
    // runs in the store; `measure` keeps it in its completion record.
    run_id: basename(file, ".json"),
    suites: names,
    errors: errors.length,
    ...(commit ? { commit } : {}),
  };
}
