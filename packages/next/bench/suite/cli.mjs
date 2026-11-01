// Benchmark suite command line (plan §16).
//
//   node packages/next/bench/suite/cli.mjs list
//   node packages/next/bench/suite/cli.mjs verify
//   node packages/next/bench/suite/cli.mjs fetch
//   node packages/next/bench/suite/cli.mjs run [--scenes a,b] [--configs 1.x,2.0]
//        [--scenarios cold-orbit,warm-orbit] [--reps 3] [--motion 15]
//        [--note "what changed"] [--tag a,b] [--cesium 1.147.0]
//        [--baseline 1.x@1.146.0] [--candidate 2.0]
//        [--releases 1.120.0..1.146.0 | 1.130.0,1.140.0]  (historical sweep)
//
// 1.x configurations run this repository's build ("cesium": "repo") or a
// released version from npm ("latest", or --cesium to pin one), fetched
// once into the store and recorded exactly in the results.
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
import {
  arch,
  cpus,
  homedir,
  platform,
  release,
  totalmem,
  version as osVersion,
} from "node:os";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import {
  loadCatalog,
  sceneDatasets,
  unsupportedReason,
} from "./manifest.mjs";
import { fetchDatasets, verify } from "./store.mjs";
import { ensureRelease, releaseList, resolveVersion } from "./release.mjs";
import { renderReport, summarizeRun } from "./report.mjs";
import {
  conditions,
  cooldown,
  keepAwake,
  quiet,
  startSampler,
} from "./telemetry.mjs";

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
  const configs = (
    pick(catalog.configs, "configs") ??
    catalog.configs.filter((c) =>
      ["1.x-release", "1.x", "2.0"].includes(c.id),
    )
  ).map((c) => ({ ...c }));
  // A historical sweep adds one pinned 1.x configuration per release.
  if (opts.releases) {
    const template = catalog.configs.find((c) => c.id === "1.x-release") ?? {
      engine: "1.x",
      maximumScreenSpaceError: 16,
    };
    for (const version of releaseList(opts.releases)) {
      if (!configs.some((c) => c.cesium === version)) {
        configs.push({ ...template, id: `1.x@${version}`, cesium: version });
      }
    }
  }
  // Released 1.x builds: catalogs pin an exact version (a moving tag
  // would mix releases in one trend across a release window); --cesium
  // overrides it on purpose and may name a tag, resolved and recorded.
  // Each run's configuration carries its version (1.x@1.146.0), so a new
  // release is a new line in trends, not a jump in the old one.
  const releases = {};
  for (const config of configs) {
    if (config.engine === "1.x" && config.cesium && config.cesium !== "repo") {
      if (!opts.cesium && !/^\d+\.\d+\.\d+$/.test(config.cesium)) {
        throw new Error(
          `config ${config.id}: pin an exact CesiumJS version, not "${config.cesium}" (or pass --cesium)`,
        );
      }
      const version = resolveVersion(opts.cesium ?? config.cesium);
      config.cesiumVersion = version;
      config.id = `1.x@${version}`;
      releases[config.id] = ensureRelease(version);
    }
  }
  const baseline =
    opts.baseline ??
    (configs.find((c) => c.cesiumVersion)?.id ?? configs[0].id);
  const candidate =
    opts.candidate ??
    (configs.find((c) => c.engine === "2.0")?.id ?? configs.at(-1).id);
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
  const channel = process.env.BENCH_CHANNEL ?? "msedge";
  const headless = !process.env.BENCH_HEADED;
  const browserArgs = [
    "--enable-unsafe-webgpu",
    "--enable-webgpu-developer-features",
    "--force_high_performance_gpu",
    "--js-flags=--expose-gc",
  ];
  const browser = await chromium.launch({
    headless,
    channel,
    args: browserArgs,
  });
  const require = createRequire(import.meta.url);
  const versionOf = (name) => {
    try {
      return require(`${name}/package.json`).version;
    } catch {
      return undefined;
    }
  };

  // Hardware conditions: sampled throughout; each run starts from the
  // idle temperature measured here, after the browser is up.
  const t0 = Date.now();
  const sampler = startSampler();
  const awake = keepAwake();
  process.stdout.write("measuring idle conditions (10 s)… ");
  const idleStart = Date.now();
  await new Promise((r) => setTimeout(r, 10000));
  const idle = sampler.window(idleStart, Date.now());
  console.log(
    idle.gpuTemperatureMaxC !== undefined
      ? `GPU ${idle.gpuTemperatureMaxC} °C`
      : "no GPU telemetry",
  );

  const quietLimit = Math.max(15, (idle.cpuUtilityMean ?? 5) + 10);

  const started = new Date();
  const results = {
    date: started.toISOString(),
    commit: git("rev-parse HEAD"),
    branch: git("rev-parse --abbrev-ref HEAD"),
    note: opts.note ?? "",
    baseline,
    candidate,
    tags: opts.tag ? opts.tag.split(",") : [],
    dirty: git("status --porcelain").length > 0,
    catalog: catalog.sources > 1 ? "public+private" : "public",
    environment: {
      os: `${osVersion()} (${platform()} ${release()}, ${arch()})`,
      cpu: cpus()[0]?.model,
      cores: cpus().length,
      memoryGiB: Math.round(totalmem() / 2 ** 30),
      browser: `${channel === "msedge" ? "Microsoft Edge" : channel} ${browser.version()}`,
      engines: Object.fromEntries(
        configs.map((c) => [
          c.id,
          c.engine === "1.x"
            ? c.cesiumVersion
              ? `CesiumJS ${c.cesiumVersion} (npm release, ${releases[c.id].integrity})`
              : "CesiumJS, this repository's build"
            : `2.0 prototype, policy ${c.policy ?? "budgeted"}`,
        ]),
      ),
      browserMode: headless ? "headless" : "headed",
      browserArgs,
      viewport: "1400×900 CSS px, device scale 1; scenes 1280×720",
      tools: {
        node: process.version,
        playwright: versionOf("@playwright/test"),
        vite: versionOf("vite"),
      },
      ...conditions(),
      idle,
      cooldownMarginC: 3,
      wakeLock: awake.held ? "held (system and display)" : "not available",
      quietRule: `CPU utility under ${quietLimit.toFixed(0)}% (idle + 10, at least 15) for 3 s before each run (30 s at most)`,
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
          const cooldownMs = spec.unsupported
            ? 0
            : await cooldown(sampler, idle.gpuTemperatureMaxC);
          const calm = spec.unsupported
            ? { quietMs: 0 }
            : await quiet(sampler, quietLimit);
          const runStart = Date.now();
          const result = await runOne(browser, base, spec, results);
          result.span = [
            (runStart - t0) / 1000,
            (Date.now() - t0) / 1000,
          ];
          result.telemetry = {
            ...sampler.window(runStart, Date.now()),
            cooldownMs,
            ...calm,
          };
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
  results.timeline = timeline(sampler.samples(), t0);
  sampler.stop();
  awake.release();
  await browser.close();
  await server.close();

  const directory =
    process.env.BENCH_RESULTS ?? join(homedir(), ".cesium-bench", "results");
  mkdirSync(directory, { recursive: true });
  const stamp = started.toISOString().replace(/[:.]/g, "-");
  const file = join(directory, `${stamp}.json`);
  writeFileSync(file, JSON.stringify(results));
  writeFileSync(
    file.replace(/\.json$/, ".summary.json"),
    JSON.stringify(summarizeRun(results)),
  );
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
  let preflights = 0;
  const hosts = new Map();
  const sizes = [];
  const count = (request) => {
    // CORS preflights (OPTIONS) are not content requests: counted apart.
    if (request.method() === "OPTIONS") {
      preflights++;
      return;
    }
    // Content only: not the page's own origin (the engine's code, served
    // module by module in development) nor data: and blob: URLs.
    const url = new URL(request.url());
    if (!url.protocol.startsWith("http") || url.origin === base) {
      return;
    }
    requests++;
    hosts.set(url.hostname, (hosts.get(url.hostname) ?? 0) + 1);
    sizes.push(
      request
        .sizes()
        .then((s) => s.responseBodySize + s.responseHeadersSize)
        .catch(() => 0),
    );
  };
  try {
    const release = spec.config.cesiumVersion
      ? `&cesium=${spec.config.cesiumVersion}`
      : "";
    await page.goto(`${base}/bench/suite/suite.html?bench${release}`);
    if (!results.environment.page) {
      results.environment.page = await page.evaluate(() =>
        globalThis.describeBrowser(),
      );
      const info = results.environment.page.webgpu?.info;
      results.environment.adapter = info;
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
    return {
      metrics: { ...metrics, requests, bytes, preflights },
      hosts: Object.fromEntries(hosts),
    };
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

/**
 * The run's hardware timeline for charts: seconds since the suite began;
 * GPU [t, clock MHz, memory clock MHz, °C, W, utilization %, slowed 0/1]
 * and CPU [t, speed % of nominal, utility %], averaged into at most 4,000
 * buckets each.
 */
function timeline({ gpu, cpu }, t0) {
  const bucket = (samples, row, max = 4000) => {
    const rows = samples.map((s) => row(s));
    if (rows.length <= max) {
      return rows;
    }
    const size = rows.length / max;
    const out = [];
    for (let b = 0; b < max; b++) {
      const slice = rows.slice(Math.floor(b * size), Math.floor((b + 1) * size));
      const mean = [];
      for (let k = 0; k < slice[0].length; k++) {
        mean.push(slice.reduce((sum, r) => sum + (r[k] ?? 0), 0) / slice.length);
      }
      out.push(mean);
    }
    return out;
  };
  const round = (v) => (Number.isFinite(v) ? Math.round(v * 10) / 10 : null);
  return {
    gpu: bucket(gpu, (s) =>
      [
        (s.t - t0) / 1000,
        s.clock,
        s.memory,
        s.temperature,
        s.power,
        s.utilization,
        s.reasons & 0xec ? 1 : 0,
      ].map(round),
    ),
    cpu: bucket(cpu, (s) =>
      [(s.t - t0) / 1000, s.performance, s.utility].map(round),
    ),
  };
}
