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
//        [--dpr 2] [--pixel-ratio device|1]  (high-DPI display; render scale)
//
// 1.x configurations run this repository's build ("cesium": "repo") or a
// released version from npm ("latest", or --cesium to pin one), fetched
// once into the store and recorded exactly in the results.
//   node packages/next/bench/suite/cli.mjs report <results.json>
//   node packages/next/bench/suite/cli.mjs alerts [--all] [--fail-on-new]
//        (change points across runs, with their triage state from Dyno;
//        --fail-on-new exits 1 when an untriaged regression exists)
//   node packages/next/bench/suite/cli.mjs resummarize   (after the summary
//        format changes: rewrites every run's .summary.json)
//   node packages/next/bench/suite/cli.mjs compare <old.json> [new.json]
//        [--old 1.x@1.146.0] [--new 2.0] [--metrics cpuP50,settleMs]
//        (benchstat-style: two configurations of one run, or one
//        configuration across two runs, e.g. before and after a change)
//
// A run declares what it is meant to move before results exist (plan
// §16.9): --primary cpuP50 --guardrails settleMs,bytes --hypothesis "…";
// the report's scorecard tests them.
//
// BENCH_MANIFEST adds a private manifest (outside the repo). Results go to
// BENCH_RESULTS (default ~/.cesium-bench/results), outside the repo: they
// carry machine details. Each run is its own browser context (cold cache)
// in Edge with WebGPU; configurations alternate within each repetition so
// drift (thermals, background work) spreads across all of them. Exits 1
// when a run fails or the catalog is invalid.
import { execSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
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
import { compareTable, DEFAULT_PLAN, scorecard } from "./scorecard.mjs";
import { ALERT_METRICS, detectAlerts } from "./changepoints.mjs";
import {
  conditions,
  cooldown,
  keepAwake,
  quiet,
  startSampler,
} from "./telemetry.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");

/**
 * `--key value` options, `--flag` booleans (followed by another option or
 * nothing) and positional arguments.
 */
function options(args) {
  const out = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith("--")) {
      const next = args[i + 1];
      if (next === undefined || next.startsWith("--")) {
        out[args[i].slice(2)] = true;
      } else {
        out[args[i].slice(2)] = next;
        i++;
      }
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
} else if (command === "alerts") {
  const directory =
    process.env.BENCH_RESULTS ?? join(homedir(), ".cesium-bench", "results");
  const summaries = readdirSync(directory)
    .filter((f) => /Z\.summary\.json$/.test(f))
    .map((f) => ({
      ...JSON.parse(readFileSync(join(directory, f), "utf8")),
      name: f.replace(".summary.json", ".json"),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
  let triage = {};
  try {
    triage = JSON.parse(readFileSync(join(directory, "triage.json"), "utf8"));
  } catch {
    // Nothing triaged yet.
  }
  const alerts = detectAlerts(summaries, ALERT_METRICS);
  let untriaged = 0;
  for (const a of alerts) {
    const status = triage[a.id]?.status ?? "new";
    if (!opts.all && (status === "invalid" || status === "fixed")) {
      continue;
    }
    if (status === "new" && a.kind === "regression") {
      untriaged++;
    }
    const pct = ((a.change - 1) * 100).toFixed(1);
    console.log(
      `${a.kind === "regression" ? "▲" : "▼"} ${a.metric} ${a.change > 1 ? "+" : ""}${pct}%  ${a.title} · ${a.config} · ${a.hardware}  ${a.range.from.commit.slice(0, 7)}..${a.range.to.commit.slice(0, 7)}  [${status}]${triage[a.id]?.owner ? ` ${triage[a.id].owner}` : ""}`,
    );
  }
  console.log(`${alerts.length} change points over ${summaries.length} runs; ${untriaged} untriaged regressions`);
  if (opts["fail-on-new"] && untriaged > 0) {
    process.exit(1);
  }
} else if (command === "resummarize") {
  const directory =
    process.env.BENCH_RESULTS ?? join(homedir(), ".cesium-bench", "results");
  const files = readdirSync(directory).filter((f) => /Z\.json$/.test(f));
  for (const f of files) {
    const results = JSON.parse(readFileSync(join(directory, f), "utf8"));
    writeFileSync(
      join(directory, f.replace(/\.json$/, ".summary.json")),
      JSON.stringify(summarizeRun(results)),
    );
  }
  console.log(`${files.length} summaries rewritten in ${directory}`);
} else if (command === "compare") {
  const [a, b] = opts._ ?? [];
  if (!a) {
    throw new Error("compare <old.json> [new.json]");
  }
  const older = JSON.parse(readFileSync(a, "utf8"));
  const newer = b ? JSON.parse(readFileSync(b, "utf8")) : older;
  const oldConfig = opts.old ?? older.baseline ?? older.runs[0].config;
  const newConfig =
    opts.new ?? (b ? oldConfig : (newer.candidate ?? newer.runs.at(-1).config));
  console.log(
    compareTable(
      [older, oldConfig],
      [newer, newConfig],
      opts.metrics?.split(","),
    ),
  );
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
    catalog.scenarios.filter((s) => s.id === "cold-orbit" || s.id === "uncapped-orbit");
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
  // Uncapped scenarios ("vsync": false) run in a second browser without
  // vsync or a frame-rate limit, so frame time is the frame's real cost
  // (vsync hides everything under 16.7 ms) and 1.x's GPU-bound cost shows
  // even without GPU timer queries.
  const uncappedArgs = ["--disable-gpu-vsync", "--disable-frame-rate-limit"];
  let uncapped;
  const browserFor = async (scenario) => {
    if (scenario.vsync !== false) {
      return browser;
    }
    uncapped ??= await chromium.launch({
      headless,
      channel,
      args: [...browserArgs, ...uncappedArgs],
    });
    return uncapped;
  };
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
    subject: git("log -1 --format=%s"),
    branch: git("rev-parse --abbrev-ref HEAD"),
    note: opts.note ?? "",
    baseline,
    candidate,
    tags: opts.tag ? opts.tag.split(",") : [],
    plan: {
      primary: opts.primary ?? DEFAULT_PLAN.primary,
      guardrails: opts.guardrails?.split(",") ?? DEFAULT_PLAN.guardrails,
      tolerance: opts.tolerance ? Number(opts.tolerance) : DEFAULT_PLAN.tolerance,
      ...(opts.hypothesis ? { hypothesis: opts.hypothesis } : {}),
    },
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
      uncappedArgs,
      viewport: `1400×900 CSS px, device scale ${Number(opts.dpr ?? 1)}; scenes 1280×720 CSS px`,
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

  // Render settings, the same for every engine (apples to apples); the
  // display's pixel density is a browser setting (--dpr), and how many
  // drawing-buffer pixels per CSS pixel the engines use is a render one.
  const render = {
    ...catalog.render,
    ...(opts["pixel-ratio"]
      ? {
          pixelRatio:
            opts["pixel-ratio"] === "device" ? "device" : Number(opts["pixel-ratio"]),
        }
      : {}),
  };
  results.environment.render = render;
  const filmstrip = [];
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
            capture: rep === 0 && !opts["no-capture"],
            render,
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
          const result = await runOne(
            await browserFor(scenario),
            base,
            spec,
            results,
          );
          result.span = [
            (runStart - t0) / 1000,
            (Date.now() - t0) / 1000,
          ];
          result.telemetry = {
            ...sampler.window(runStart, Date.now()),
            cooldownMs,
            ...calm,
          };
          result.validity = validity(result, quietLimit, idle);
          if (result.shots) {
            for (const shot of result.shots) {
              filmstrip.push({
                scene: scene.id,
                config: config.id,
                moment: shot.moment,
                png: shot.png,
              });
            }
            delete result.shots;
          }
          results.runs.push({
            scene: scene.id,
            sceneTitle: scene.private ? scene.id : scene.title,
            group: scene.group,
            scenario: scenario.id,
            motionSeconds: spec.scenario.motionSeconds,
            vsync: spec.scenario.vsync !== false,
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

  const directory =
    process.env.BENCH_RESULTS ?? join(homedir(), ".cesium-bench", "results");
  const stamp = started.toISOString().replace(/[:.]/g, "-");
  if (filmstrip.length) {
    process.stdout.write(`filmstrips and image parity (${filmstrip.length} frames)… `);
    results.assets = `/bench-results/${stamp}/`;
    results.filmstrips = await filmstrips(
      browser,
      base,
      filmstrip,
      join(directory, stamp),
      baseline,
    );
    console.log("done");
  }
  await browser.close();
  await uncapped?.close();
  await server.close();

  mkdirSync(directory, { recursive: true });
  const file = join(directory, `${stamp}.json`);
  writeFileSync(file, JSON.stringify(results));
  writeFileSync(
    file.replace(/\.json$/, ".summary.json"),
    JSON.stringify(summarizeRun(results)),
  );
  writeFileSync(file.replace(/\.json$/, ".html"), renderReport(results));
  // The verdict and the benchstat table for the declared plan.
  const card = scorecard(results);
  if (card) {
    console.log(
      `\n${card.candidate} vs ${card.baseline}: ${card.verdict.toUpperCase()} (primary ${card.plan.primary} ${card.primary.moved}; guardrails broken: ${card.guardrails.filter((g) => g.broken.length).map((g) => g.key).join(", ") || "none"})\n`,
    );
    console.log(
      compareTable([results, card.baseline], [results, card.candidate], [
        card.plan.primary,
        ...card.plan.guardrails,
      ]),
    );
  }
  console.log(`results: ${file}\nreport:  ${file.replace(/\.json$/, ".html")}`);
  if (failed > 0) {
    process.exit(1);
  }
}

/** One run in a fresh browser context: requests and bytes counted for the run. */
async function runOne(browser, base, spec, results) {
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 },
    deviceScaleFactor: Number(opts.dpr ?? 1),
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  // Filmstrip: the settled views, captured when the page asks (between
  // timed phases, so captures never land in a measurement).
  const shots = [];
  if (spec.capture) {
    await page.exposeFunction("captureMoment", async (moment) => {
      shots.push({
        moment,
        png: await page.locator("#view").screenshot({ type: "png" }),
      });
    });
  }
  // Waterfall: every content request of the measured load, timed.
  const waterfall = [];
  let runStart = 0;
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
    const size = request
      .sizes()
      .then((s) => s.responseBodySize + s.responseHeadersSize)
      .catch(() => 0);
    sizes.push(size);
    if (spec.capture) {
      const t = request.timing();
      waterfall.push(
        size.then((bytes) => [
          Math.round(t.startTime - runStart),
          t.responseStart >= 0 ? Math.round(t.responseStart) : null,
          t.responseEnd >= 0 ? Math.round(t.responseEnd) : null,
          bytes,
          requestKind(url),
          url.hostname,
        ]),
      );
    }
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
      await page.evaluate(
        (s) => globalThis.runScene(s),
        { ...spec, capture: false },
      );
      await page.reload();
    }
    context.on("requestfinished", count);
    runStart = Date.now();
    const metrics = await page.evaluate((s) => globalThis.runScene(s), spec);
    context.off("requestfinished", count);
    const bytes = (await Promise.all(sizes)).reduce((a, b) => a + b, 0);
    if (errors.length && metrics.status === "ok") {
      metrics.message = errors.slice(0, 3).join("; ");
    }
    return {
      metrics: { ...metrics, requests, bytes, preflights },
      hosts: Object.fromEntries(hosts),
      ...(shots.length ? { shots } : {}),
      ...(waterfall.length
        ? {
            // [start ms, time to first byte ms, end ms, bytes, kind, host]
            waterfall: (await Promise.all(waterfall)).sort((a, b) => a[0] - b[0]),
          }
        : {}),
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

/** What a content request was, from its URL (waterfalls). */
function requestKind(url) {
  const path = url.pathname.toLowerCase();
  if (url.hostname === "api.cesium.com") {
    return "endpoint";
  }
  if (/\.json$/.test(path)) {
    return "tileset";
  }
  if (/\.terrain$/.test(path) || /layer\.json$/.test(path)) {
    return "terrain";
  }
  if (/\.(b3dm|glb|gltf|i3dm|cmpt|pnts|bin)$/.test(path)) {
    return "content";
  }
  if (/\.(jpe?g|png|webp|ktx2)$/.test(path) || /virtualearth|tiles\./.test(url.hostname)) {
    return "imagery";
  }
  return "other";
}

/**
 * A run's validity (plan §16.9, Trust): invalid when it failed or timed
 * out; a warning when its conditions were not reached (cooldown or quiet
 * waits ran out, the machine stayed busy). Reasons are listed.
 */
function validity(result, quietLimit, idle = {}) {
  const m = result.metrics;
  const t = result.telemetry ?? {};
  if (m.status === "unsupported") {
    return { verdict: "not run", reasons: [m.message ?? "unsupported"] };
  }
  if (m.status !== "ok") {
    return { verdict: "invalid", reasons: [`${m.status}: ${m.message ?? ""}`] };
  }
  const reasons = [];
  if (t.cooldownMs >= 60000) {
    reasons.push("GPU did not cool to near idle before the run");
  }
  // Beyond the idle level: some laptops report a thermal limit (of the
  // chassis, not the GPU) all the time, which is the machine's state.
  if (t.gpuThermalFraction > (idle.gpuThermalFraction ?? 0) + 0.1) {
    reasons.push(
      `GPU thermally throttled in ${Math.round(t.gpuThermalFraction * 100)}% of samples (${Math.round((idle.gpuThermalFraction ?? 0) * 100)}% at idle)`,
    );
  }
  if (t.gpuHeadroomMinC !== undefined && t.gpuHeadroomMinC <= 5) {
    reasons.push(`GPU within ${t.gpuHeadroomMinC} °C of its throttle limit`);
  }
  if (t.quietMs >= 30000 && t.backgroundCpuUtility > quietLimit) {
    reasons.push(
      `machine busy before the run (CPU utility ${Math.round(t.backgroundCpuUtility)}%)`,
    );
  }
  if (m.message) {
    reasons.push(`page errors: ${m.message}`);
  }
  return { verdict: reasons.length ? "warning" : "valid", reasons };
}

/**
 * Filmstrip assets: each settled view as a JPEG, and per scene and moment
 * the image parity (FLIP) of every configuration against the baseline,
 * with its heatmap, computed in a page with the parity harness's FLIP.
 */
async function filmstrips(browser, base, frames, directory, baseline) {
  mkdirSync(directory, { recursive: true });
  const page = await browser.newPage();
  await page.goto(`${base}/bench/suite/flip.html`);
  const out = [];
  const key = (f) => `${f.scene}|${f.moment}`;
  const groups = new Map();
  for (const f of frames) {
    (groups.get(key(f)) ?? groups.set(key(f), []).get(key(f))).push(f);
  }
  for (const list of groups.values()) {
    const entry = {
      scene: list[0].scene,
      moment: list[0].moment,
      images: {},
      flip: {},
    };
    const reference = list.find((f) => f.config === baseline);
    for (const f of list) {
      const name = `${f.scene}__${f.config}__${f.moment}`.replace(/[^\w@.-]/g, "_");
      const result = await page.evaluate(
        ({ test, ref }) => globalThis.processFrame(test, ref),
        {
          test: f.png.toString("base64"),
          ref: reference && f !== reference ? reference.png.toString("base64") : null,
        },
      );
      writeFileSync(join(directory, `${name}.jpg`), Buffer.from(result.jpeg, "base64"));
      entry.images[f.config] = `${name}.jpg`;
      if (result.flip) {
        writeFileSync(
          join(directory, `${name}.flip.png`),
          Buffer.from(result.flip.heatmap, "base64"),
        );
        entry.flip[f.config] = {
          mean: result.flip.mean,
          p95: result.flip.p95,
          heatmap: `${name}.flip.png`,
        };
      }
    }
    out.push(entry);
  }
  await page.close();
  return out;
}
