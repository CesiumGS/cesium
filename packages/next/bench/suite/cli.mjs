// Benchmark suite command line (plan §16).
//
//   node packages/next/bench/suite/cli.mjs list
//   node packages/next/bench/suite/cli.mjs verify
//   node packages/next/bench/suite/cli.mjs fetch
//   node packages/next/bench/suite/cli.mjs run [--scenes a,b] [--configs 1.x,2.0]
//        [--scenarios cold-orbit,warm-orbit] [--reps 3] [--motion 15]
//   node packages/next/bench/suite/cli.mjs report <results.json>
//
// BENCH_MANIFEST adds a private manifest (outside the repo). Results go to
// BENCH_RESULTS (default ~/.cesium-bench/results), outside the repo: they
// carry machine details. Each run is its own browser context (cold cache)
// in Edge with WebGPU; configurations alternate within each repetition so
// drift (thermals, background work) spreads across all of them. Exits 1
// when a run fails or the catalog is invalid.
import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { cpus, homedir, platform, release, totalmem } from "node:os";
import { dirname, join } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import {
  loadCatalog,
  sceneDatasets,
  unsupportedReason,
} from "./manifest.mjs";
import { fetchDatasets, verify } from "./store.mjs";
import { renderReport } from "./report.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");

function options(args) {
  const out = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith("--")) {
      out[args[i].slice(2)] = args[i + 1];
      i++;
    } else {
      (out._ ??= []).push(args[i]);
    }
  }
  return out;
}

const [command = "list", ...rest] = process.argv.slice(2);
const opts = options(rest);
const catalog = loadCatalog();

if (command === "list") {
  for (const scene of catalog.scenes) {
    const gaps = ["1.x", "2.0"]
      .map((e) => unsupportedReason(catalog, scene, e))
      .filter(Boolean);
    console.log(
      `${scene.group}  ${scene.id.padEnd(24)} ${scene.title}${gaps.length ? `  [${gaps.join("; ")}]` : ""}`,
    );
  }
  console.log(
    `${catalog.scenes.length} scenes, ${catalog.datasets.length} datasets, ${catalog.sources > 1 ? "public + private" : "public"} catalog`,
  );
} else if (command === "verify") {
  const rows = verify(catalog.datasets);
  console.table(
    rows.map((r) => ({
      id: r.id,
      status: r.status,
      files: r.files,
      bytes: r.bytes,
    })),
  );
  if (rows.some((r) => r.status === "changed" || r.status === "missing")) {
    process.exit(1);
  }
} else if (command === "fetch") {
  await fetchDatasets(catalog.datasets);
} else if (command === "run") {
  await run();
} else if (command === "report") {
  const file = opts._?.[0];
  if (!file) {
    throw new Error("report <results.json>");
  }
  const results = JSON.parse(readFileSync(file, "utf8"));
  const out = file.replace(/\.json$/, ".html");
  writeFileSync(out, renderReport(results));
  console.log(out);
} else {
  throw new Error(`unknown command ${command}`);
}

async function run() {
  const pick = (list, key) =>
    opts[key]
      ? opts[key].split(",").map((id) => {
          const found = list.find((x) => x.id === id);
          if (!found) {
            throw new Error(`unknown ${key} entry "${id}"`);
          }
          return found;
        })
      : undefined;
  const scenes = pick(catalog.scenes, "scenes") ?? catalog.scenes;
  const configs =
    pick(catalog.configs, "configs") ??
    catalog.configs.filter((c) => c.id === "1.x" || c.id === "2.0");
  const scenarios =
    pick(catalog.scenarios, "scenarios") ??
    catalog.scenarios.filter((s) => s.id === "cold-orbit");
  const reps = Number(opts.reps ?? 3);
  const motion = opts.motion ? Number(opts.motion) : undefined;

  // The verify step guards repeatability: changed local data stops the run.
  const checked = verify(
    [...new Set(scenes.flatMap((s) => sceneDatasets(catalog, s)))],
  );
  const bad = checked.filter((r) => r.status === "changed");
  if (bad.length) {
    throw new Error(`datasets changed: ${bad.map((r) => r.id).join(", ")}`);
  }

  const { createServer } = await import("vite");
  const server = await createServer({
    root,
    configFile: join(root, "vite.config.ts"),
    cacheDir: join(root, ".vite-bench"),
    server: { port: 5193, strictPort: false, hmr: false, watch: null },
    logLevel: "error",
  });
  await server.listen();
  const base = server.resolvedUrls.local[0].replace(/\/$/, "");
  const { chromium } = await import("@playwright/test");
  const browser = await chromium.launch({
    headless: !process.env.BENCH_HEADED,
    channel: process.env.BENCH_CHANNEL ?? "msedge",
    args: [
      "--enable-unsafe-webgpu",
      "--enable-webgpu-developer-features",
      "--force_high_performance_gpu",
      "--js-flags=--expose-gc",
    ],
  });

  const started = new Date();
  const results = {
    date: started.toISOString(),
    commit: git("rev-parse HEAD"),
    dirty: git("status --porcelain").length > 0,
    catalog: catalog.sources > 1 ? "public+private" : "public",
    environment: {
      platform: `${platform()} ${release()}`,
      cpu: cpus()[0]?.model,
      cores: cpus().length,
      memoryGiB: Math.round(totalmem() / 2 ** 30),
      browser: browser.version(),
    },
    runs: [],
  };

  const total = scenes.length * scenarios.length * reps * configs.length;
  let done = 0;
  let failed = 0;
  for (const scene of scenes) {
    const datasets = sceneDatasets(catalog, scene);
    for (const scenario of scenarios) {
      for (let rep = 0; rep < reps; rep++) {
        // Rotate the configuration order every repetition.
        const shift = rep % configs.length;
        const order = [...configs.slice(shift), ...configs.slice(0, shift)];
        for (const config of order) {
          done++;
          const spec = {
            scene,
            datasets,
            scenario: motion
              ? { ...scenario, motionSeconds: motion }
              : scenario,
            config,
            unsupported: unsupportedReason(catalog, scene, config.engine),
          };
          const label = `[${done}/${total}] ${scene.id} ${scenario.id} ${config.id} #${rep + 1}`;
          process.stdout.write(`${label}… `);
          const result = await runOne(browser, base, spec, results);
          results.runs.push({
            scene: scene.id,
            sceneTitle: scene.private ? scene.id : scene.title,
            group: scene.group,
            scenario: scenario.id,
            config: config.id,
            engine: config.engine,
            rep,
            ...result,
          });
          if (result.metrics.status === "error") {
            failed++;
          }
          console.log(
            result.metrics.status === "ok"
              ? `settle ${(result.metrics.settleMs / 1000).toFixed(1)} s, frame p50 ${result.metrics.frameP50?.toFixed(1)} ms`
              : `${result.metrics.status}${result.metrics.message ? `: ${result.metrics.message}` : ""}`,
          );
        }
      }
    }
  }
  await browser.close();
  await server.close();

  const directory =
    process.env.BENCH_RESULTS ?? join(homedir(), ".cesium-bench", "results");
  mkdirSync(directory, { recursive: true });
  const stamp = started.toISOString().replace(/[:.]/g, "-");
  const file = join(directory, `${stamp}.json`);
  writeFileSync(file, JSON.stringify(results, null, 2));
  writeFileSync(file.replace(/\.json$/, ".html"), renderReport(results));
  console.log(`results: ${file}\nreport:  ${file.replace(/\.json$/, ".html")}`);
  if (failed > 0) {
    process.exit(1);
  }
}

/** One run in a fresh browser context: requests and bytes counted for the run. */
async function runOne(browser, base, spec, results) {
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  let requests = 0;
  const sizes = [];
  const count = (request) => {
    requests++;
    sizes.push(
      request
        .sizes()
        .then((s) => s.responseBodySize + s.responseHeadersSize)
        .catch(() => 0),
    );
  };
  try {
    await page.goto(`${base}/bench/suite/suite.html?bench`);
    if (!results.environment.adapter) {
      results.environment.adapter = await page.evaluate(async () => {
        const adapter = await navigator.gpu?.requestAdapter({
          powerPreference: "high-performance",
        });
        return adapter
          ? {
              vendor: adapter.info.vendor,
              architecture: adapter.info.architecture,
              description: adapter.info.description,
            }
          : undefined;
      });
    }
    if (spec.scenario.cache === "warm" && !spec.unsupported) {
      // Prime the HTTP cache, then measure a fresh page in the same context.
      await page.evaluate((s) => globalThis.runScene(s), spec);
      await page.reload();
    }
    context.on("requestfinished", count);
    const metrics = await page.evaluate((s) => globalThis.runScene(s), spec);
    context.off("requestfinished", count);
    const bytes = (await Promise.all(sizes)).reduce((a, b) => a + b, 0);
    if (errors.length && metrics.status === "ok") {
      metrics.message = errors.slice(0, 3).join("; ");
    }
    return { metrics: { ...metrics, requests, bytes } };
  } catch (error) {
    return {
      metrics: {
        status: "error",
        message: error instanceof Error ? error.message : String(error),
      },
    };
  } finally {
    await context.close();
  }
}

function git(args) {
  try {
    return execSync(`git ${args}`, { cwd: root, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}
