#!/usr/bin/env node
// Simple perf regression check: run existing Sandcastle gallery demos against
// two deployed CesiumJS builds (e.g. a wasm-worker branch vs main) and diff
// load time. No custom assets - just the demos Sandcastle already ships.
//
// Usage:
//   node Tools/perf-regression/sandcastle-perf.mjs
//   node Tools/perf-regression/sandcastle-perf.mjs --demo 3d-models --demo 3d-tiles-point-cloud
//   node Tools/perf-regression/sandcastle-perf.mjs --reps 3
//   node Tools/perf-regression/sandcastle-perf.mjs --self-test
import { chromium } from "@playwright/test";

const HOSTS = {
  wasm: "https://ci-builds.cesium.com/cesium/wasm-main-thread",
  main: "https://ci-builds.cesium.com/cesium/main",
};

const DEFAULT_DEMOS = [
  "3d-models",
  "3d-tiles-point-cloud",
  "3d-tiles-photogrammetry",
  "google-photorealistic-3d-tiles",
  "3d-tiles-gaussian-splatting",
];

// This demo has its own built-in tour + timer, but it streams a live Ion
// asset over the open internet with no cache/throttle control, so its
// timing is too variable for a quick regression check (one run: 36s for the
// first view, another run: 80s). It's supported via --demo for manual,
// patient, side-by-side runs; it's excluded from DEFAULT_DEMOS.
const TOUR_DEMO = "3d-tiles-performance-testing-dev";

// This demo's default toolbar selection ("Aircraft") is a plain,
// uncompressed glTF - it never touches the Draco/KTX2 decode path this
// whole benchmark is about. Its toolbar is a real <select>, so we drive it
// to the compressed option before measuring (see runDemo).
const MODEL_DEMO_WITH_DECOMPRESSION_OPTION = "3d-models";

const NAV_TIMEOUT_MS = 60000;
const READY_TIMEOUT_MS = 45000;
const TOUR_TIMEOUT_MS = 300000;
const DEFAULT_REPS = 5;
// Fixed post-ready observation window for the long-task metric. Must be the
// same for every run of a given demo (both hosts, all reps) or the totals
// aren't comparable - a longer window trivially accumulates more long-task
// time. 20s comfortably covers the slowest default demo's ready time (~18s)
// with margin to observe idle/settled behavior afterward.
const LONGTASK_WINDOW_MS = 20000;

// The one demo with a built-in timer reports itself via
// `Total Loads and Time (ignoring first view and flight time): <loads>, <seconds>`
const TOUR_LOG_PATTERN = /Total Loads and Time.*:\s*([\d.]+),\s*([\d.]+)/;

// ponytail: string-match on a console.log line is brittle if the demo's
// wording changes; upgrade to a page-exposed global if that happens.
export function parseTourLog(line) {
  const match = TOUR_LOG_PATTERN.exec(line);
  if (!match) {
    return undefined;
  }
  return { loads: Number(match[1]), seconds: Number(match[2]) };
}

export function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

// Runs inside the Sandcastle "bucket" iframe via page.addInitScript, before
// any demo code executes. Sandcastle assigns `window.Cesium = Cesium` once
// the demo module finishes its synchronous/awaited top-level code (see
// packages/sandcastle/src/Helpers.ts) - we intercept that assignment to
// patch Cesium3DTileset/Model so we get a real "asset ready" signal instead
// of guessing from network traffic. This replaces the old
// `networkidle`-based proxy, which an independent review found was mostly
// measuring 500ms-jitter coin flips and, for tile-streaming demos, globe
// terrain/imagery traffic unrelated to the asset under test.
//
// Readiness is event-driven, not polled, and reported to Node via
// `window.__reportReady()` (a Playwright `exposeFunction`, called exactly
// once). An earlier version had Node poll a `window.__cesiumPerfReady()`
// predicate every 200ms via `frame.evaluate` - a second independent review
// found that round-trip polling itself perturbed the main thread it was
// measuring, inflating readyMs by up to 2.4x on fast-loading demos.
//
// Ready is defined per Cesium3DTileset's own one-shot `initialTilesLoaded`
// event (fires exactly once, when the tileset's initial required tiles have
// all resolved - see Cesium3DTileset.js) and per top-level Model's
// `readyEvent`. Per-tile Model instances (b3dm/glTF/pnts tile content
// streamed by a tileset) are excluded via `model.content` - that review also
// found the un-filtered patch was requiring every resident tile's model to
// be ready, i.e. measuring "the whole tile cache is warm" instead of "the
// initial view is up."
function installPerfHooks() {
  window.__cesiumPerfInstances = { tilesets: new Set(), models: new Set() };
  window.__longTaskTotalMs = 0;
  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        window.__longTaskTotalMs += entry.duration;
      }
    }).observe({ entryTypes: ["longtask"] });
  } catch {
    // longtask API unsupported; metric just stays 0.
  }

  const readyFlags = new WeakMap();
  const listened = new WeakSet();

  function checkAllReady() {
    if (window.__reportedReady) {
      return;
    }
    const instances = window.__cesiumPerfInstances;
    const all = [...instances.tilesets, ...instances.models];
    if (all.length === 0) {
      return;
    }
    if (all.every((obj) => readyFlags.get(obj) === true)) {
      window.__reportedReady = true;
      window.__reportReady();
    }
  }

  function patch(Cesium) {
    if (window.__cesiumPerfPatched || !Cesium) {
      return;
    }
    window.__cesiumPerfPatched = true;

    const origTilesetUpdate = Cesium.Cesium3DTileset.prototype.update;
    Cesium.Cesium3DTileset.prototype.update = function (frameState) {
      window.__cesiumPerfInstances.tilesets.add(this);
      if (!listened.has(this)) {
        listened.add(this);
        readyFlags.set(this, false);
        this.initialTilesLoaded.addEventListener(() => {
          readyFlags.set(this, true);
          checkAllReady();
        });
      }
      return origTilesetUpdate.call(this, frameState);
    };

    const origModelUpdate = Cesium.Model.prototype.update;
    Cesium.Model.prototype.update = function (frameState) {
      if (this.content) {
        // Per-tile content model (streamed by a Cesium3DTileset) - its
        // tileset's own initialTilesLoaded event already covers readiness.
        return origModelUpdate.call(this, frameState);
      }
      window.__cesiumPerfInstances.models.add(this);
      if (!listened.has(this)) {
        listened.add(this);
        if (this.ready === true) {
          readyFlags.set(this, true);
        } else {
          readyFlags.set(this, false);
          this.readyEvent.addEventListener(() => {
            readyFlags.set(this, true);
            checkAllReady();
          });
        }
      }
      return origModelUpdate.call(this, frameState);
    };
  }

  let cesiumRef;
  Object.defineProperty(window, "Cesium", {
    configurable: true,
    get() {
      return cesiumRef;
    },
    set(value) {
      cesiumRef = value;
      patch(value);
    },
  });
}

async function getBucketFrame(page, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const frame = page.frames().find((f) => /bucket\.html/.test(f.url()));
    if (frame) {
      return frame;
    }
    await page.waitForTimeout(100);
  }
  throw new Error("bucket iframe never appeared");
}

async function runDemo(browser, hostUrl, demo) {
  // Fresh, isolated context per run == cold HTTP cache every time. Reusing
  // a page/context across runs let earlier demos warm the cache for later
  // ones, which was silently biasing results.
  const context = await browser.newContext();
  let resolveReady;
  const readyPromise = new Promise((resolve) => {
    resolveReady = resolve;
  });
  // exposeFunction runs the callback in Node, so `performance.now()` here is
  // Node's clock - the same clock `started` below is measured on - with a
  // single IPC hop instead of a 200ms polling loop.
  await context.exposeFunction("__reportReady", () => {
    resolveReady(performance.now());
  });

  const page = await context.newPage();
  try {
    let tourResult;
    page.on("console", (msg) => {
      const parsed = parseTourLog(msg.text());
      if (parsed) {
        tourResult = parsed;
      }
    });

    await page.addInitScript(installPerfHooks);

    const started = performance.now();
    await page.goto(`${hostUrl}/Apps/Sandcastle2/standalone.html?id=${demo}`, {
      timeout: NAV_TIMEOUT_MS,
    });

    if (demo === TOUR_DEMO) {
      // Sandcastle runs demo code inside a "bucket" iframe, not the top page.
      const bucket = page.frameLocator('iframe[src*="bucket.html"]');
      await bucket.getByRole("button", { name: "Start Test" }).click();
      // Poll rather than waitForFunction: the result lands in the console
      // listener above (Node-side), not in page context.
      const deadline = Date.now() + TOUR_TIMEOUT_MS;
      while (!tourResult && Date.now() < deadline) {
        await page.waitForTimeout(250);
      }
      if (!tourResult) {
        throw new Error(`Timed out waiting for tour result on ${demo}`);
      }
      return { readyMs: tourResult.seconds * 1000, longTaskMs: undefined };
    }

    if (demo === MODEL_DEMO_WITH_DECOMPRESSION_OPTION) {
      // This demo's own default selection is a plain, uncompressed glTF
      // (Aircraft) - it never exercises the Draco/KTX2 decoding path this
      // benchmark exists to check. Its toolbar is a real <select>; picking
      // the Draco option re-triggers Model creation through that same path.
      const bucketFrame = await getBucketFrame(page, NAV_TIMEOUT_MS);
      await bucketFrame
        .locator("select")
        .selectOption({ label: "Draco Compressed Model" });
    }

    // Always wait out the full fixed window from navigation start,
    // regardless of when (or whether) the ready signal fires, so longTaskMs
    // is comparable across every run/host/demo. A version that only padded
    // up to a shorter elapsed time let slow runs silently inflate their own
    // window - the opposite of "fixed."
    let readyMs;
    let readyError;
    try {
      readyMs = await Promise.race([
        readyPromise.then((t) => t - started),
        new Promise((_resolve, reject) => {
          setTimeout(
            () => reject(new Error("Timed out waiting for Cesium ready signal")),
            READY_TIMEOUT_MS,
          );
        }),
      ]);
    } catch (error) {
      readyError = error;
    }

    const elapsedSoFar = performance.now() - started;
    if (elapsedSoFar < LONGTASK_WINDOW_MS) {
      await page.waitForTimeout(LONGTASK_WINDOW_MS - elapsedSoFar);
    }
    const bucketFrame = await getBucketFrame(page, NAV_TIMEOUT_MS);
    const longTaskMs = await bucketFrame.evaluate(
      () => window.__longTaskTotalMs || 0,
    );

    // longTaskMs is independently valid even if ready timed out - report it
    // rather than discarding the whole sample, so slow runs don't silently
    // bias the surviving sample set toward fast ones.
    return { readyMs, longTaskMs, readyError: readyError?.message };
  } finally {
    await context.close();
  }
}

// Runs `reps` samples per host, alternating which host goes first each rep
// (ABBA) so warmup/thermal/network drift over the run hits both hosts
// evenly instead of always favoring whichever host is listed second.
async function runDemoSamples(browser, demo, reps) {
  const samples = { wasm: [], main: [] };
  const errors = { wasm: [], main: [] };
  for (let rep = 0; rep < reps; rep++) {
    const order = rep % 2 === 0 ? ["wasm", "main"] : ["main", "wasm"];
    for (const label of order) {
      try {
        samples[label].push(await runDemo(browser, HOSTS[label], demo));
      } catch (error) {
        errors[label].push(error.message);
      }
    }
  }
  return { samples, errors };
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--self-test")) {
    selfTest();
    return;
  }
  const demoArgIndices = args
    .map((arg, i) => (arg === "--demo" ? i : -1))
    .filter((i) => i >= 0);
  const demos = demoArgIndices.length
    ? demoArgIndices.map((i) => args[i + 1])
    : DEFAULT_DEMOS;
  const repsArgIndex = args.indexOf("--reps");
  const reps =
    repsArgIndex >= 0 ? Number(args[repsArgIndex + 1]) : DEFAULT_REPS;
  // Headless Chromium falls back to SwiftShader (CPU) for WebGL, which
  // turns Cesium's continuous render loop into one unbroken long task -
  // longTaskMs saturates near the window length regardless of workload and
  // loses virtually all discriminative power (confirmed: ~17.3-17.7s across
  // wildly different demos, a ~2% spread). Headed mode is required for the
  // long-task metric to mean anything; --headless is available for a
  // readyMs-only run (e.g. on a display-less CI box) but its longTaskMs
  // numbers should not be trusted.
  const headless = args.includes("--headless");

  const browser = await chromium.launch({ headless });
  try {
    const results = [];
    for (const demo of demos) {
      const { samples, errors } = await runDemoSamples(browser, demo, reps);
      results.push({ demo, samples, errors });
    }

    console.log(
      `\n(n=${reps}, ABBA host order, cold cache per run, ${headless ? "headless - longTaskMs not meaningful" : "headed"})`,
    );
    for (const { demo, samples, errors } of results) {
      console.log(`\n${demo}`);
      const mainReady = samples.main
        .map((s) => s.readyMs)
        .filter((v) => v !== undefined);
      const wasmReady = samples.wasm
        .map((s) => s.readyMs)
        .filter((v) => v !== undefined);
      logMetric("  ready (ms)", mainReady, wasmReady, errors, {
        main: samples.main.length,
        wasm: samples.wasm.length,
      });
      const mainLongTask = samples.main
        .map((s) => s.longTaskMs)
        .filter((v) => v !== undefined);
      const wasmLongTask = samples.wasm
        .map((s) => s.longTaskMs)
        .filter((v) => v !== undefined);
      if (mainLongTask.length > 0 || wasmLongTask.length > 0) {
        logMetric(
          `  main-thread long tasks in first ${LONGTASK_WINDOW_MS / 1000}s (ms)`,
          mainLongTask,
          wasmLongTask,
          errors,
          { main: samples.main.length, wasm: samples.wasm.length },
        );
      }
    }
  } finally {
    await browser.close();
  }
}

function logMetric(label, mainValues, wasmValues, errors, sampleCounts) {
  const mainOk = mainValues.length > 0;
  const wasmOk = wasmValues.length > 0;
  const mainSummary = mainOk
    ? `${median(mainValues).toFixed(0)} [${Math.min(...mainValues).toFixed(0)}-${Math.max(...mainValues).toFixed(0)}] (n=${mainValues.length}/${sampleCounts.main})`
    : `ERROR: ${errors.main[0] ?? "no samples"}`;
  const wasmSummary = wasmOk
    ? `${median(wasmValues).toFixed(0)} [${Math.min(...wasmValues).toFixed(0)}-${Math.max(...wasmValues).toFixed(0)}] (n=${wasmValues.length}/${sampleCounts.wasm})`
    : `ERROR: ${errors.wasm[0] ?? "no samples"}`;
  const delta =
    mainOk && wasmOk
      ? `${(median(wasmValues) - median(mainValues)).toFixed(0)}ms (${(
          ((median(wasmValues) - median(mainValues)) / median(mainValues)) *
          100
        ).toFixed(1)}%)`
      : "n/a";
  console.log(
    `${label}: main ${mainSummary}, wasm ${wasmSummary}, delta ${delta}`,
  );
}

function selfTest() {
  const parsed = parseTourLog(
    "view 3 flight loads, final view time: 12, 1.234",
  );
  console.assert(
    parsed === undefined,
    "unrelated console lines must not match",
  );

  const tourLine =
    "Total Loads and Time (ignoring first view and flight time): 42, 7.5";
  const tourParsed = parseTourLog(tourLine);
  console.assert(
    tourParsed?.loads === 42 && tourParsed?.seconds === 7.5,
    `expected {loads:42, seconds:7.5}, got ${JSON.stringify(tourParsed)}`,
  );

  console.assert(median([3, 1, 2]) === 2, "odd-length median");
  console.assert(median([1, 2, 3, 4]) === 2.5, "even-length median");

  console.log("self-test ok");
}

main();
