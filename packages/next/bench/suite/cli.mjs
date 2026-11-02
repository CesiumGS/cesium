// Benchmark suite command line (plan §16).
//
//   node packages/next/bench/suite/cli.mjs list
//   node packages/next/bench/suite/cli.mjs verify
//   node packages/next/bench/suite/cli.mjs fetch
//   node packages/next/bench/suite/cli.mjs run [--scenes a,b] [--engines 1.146.0,2.0]
//        [--scenarios cold-orbit,warm-orbit] [--reps 3] [--motion 15]
//        [--note "what changed"] [--tag a,b]
//        [--baseline 1.146.0] [--candidate 2.0]
//        [--releases 1.120.0..1.146.0 | 1.130.0,1.140.0]  (historical sweep)
//        [--dpr 2] [--pixel-ratio device|1]  (high-DPI display; render scale)
//        [--sweep maximumScreenSpaceError=8,16,32 [--sweep-engines 2.0]]
//        [--motion-samples 8 | --no-motion-quality]  (frames in motion)
//        [--tier quick|standard|full]  (scenarios, repetitions and motion
//        quality for the occasion; explicit options override them)
//        [--areas terrain,streaming | --changed [ref]]  (the scenes of
//        those areas, or of the areas the files changed since ref, HEAD by
//        default, fall in; uncommitted and untracked files count)
//        [--no-reuse] [--reuse-days 14] [--no-early-stop] [--min-reps 2]
//        [--dev]  (the live tree on Vite's dev server instead of the
//        working tree frozen and built for production, frozen.mjs)
//
// Engines (engines.mjs): a CesiumJS release ("1.146.0", "latest"), an
// engine from the working tree ("2.0", "1.x", named by the branch in
// results), or one built at a git ref ("2.0@main", "1.x@v1.140"), with
// settings after "+" ("2.0+stepwise", "2.0+sse=32"). Releases are fetched
// once into the store; refs are checked out once into snapshot worktrees.
//   node packages/next/bench/suite/cli.mjs report <results.json>
//   node packages/next/bench/suite/cli.mjs alerts [--all] [--fail-on-new]
//        (change points across runs, with their triage state from Dyno;
//        --fail-on-new exits 1 when an untriaged regression exists)
//   node packages/next/bench/suite/cli.mjs images [--scenes a,b] [--engine 2.0]
//        [--parity] [--update [--reason why]] [--software]
//        (image checks against approved baselines per renderer class;
//        exits 1 on changed or new images; --software uses SwiftShader)
//   node packages/next/bench/suite/cli.mjs annotate "driver 573.57" [--short
//        driver] [--kind machine|data|note] [--metrics a,b] [--date ISO]
//        (a dated note on Dyno's trend charts, in the results directory;
//        changes to the method go in bench/suite/annotations.json)
//   node packages/next/bench/suite/cli.mjs resummarize   (after the summary
//        format changes: rewrites every run's .summary.json)
//   node packages/next/bench/suite/cli.mjs compare <old.json> [new.json]
//        [--old 1.146.0] [--new 2.0@my-branch] [--metrics cpuP50,settleMs]
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
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
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
import { loadCatalog, sceneDatasets, unsupportedReason } from "./manifest.mjs";
import { fetchDatasets, verify } from "./store.mjs";
import { releaseList } from "./release.mjs";
import { describeBuild, resolveEngine, treeRef } from "./engineBuilds.mjs";
import { parseEngine } from "./engines.mjs";
import { renderReport, summarizeRun } from "./report.mjs";
import { compareTable, defaultPlan, scorecard } from "./scorecard.mjs";
import { ALERT_METRICS, detectAlerts } from "./changepoints.mjs";
import { runImages } from "./images.mjs";
import { areasFor, changedFiles, scenesFor } from "./areas.mjs";
import {
  checkoutFrozen,
  emptyCesium,
  freezeTree,
  serveBuild,
} from "./frozen.mjs";
import {
  drift,
  engineKey,
  findStored,
  immutable,
  machineKey,
  methodKey,
  sceneKey,
  storedRuns,
} from "./reuse.mjs";
import { ratio } from "./stats.mjs";
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
  for (const area of catalog.areas) {
    const ids = scenesFor(catalog, [area.id]).map((s) => s.id);
    console.log(`area ${area.id.padEnd(11)} ${ids.join(", ")}`);
  }
  for (const tier of catalog.tiers) {
    console.log(`tier ${tier.id.padEnd(9)} ${tier.title}`);
  }
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
  console.log(
    `${alerts.length} change points over ${summaries.length} runs; ${untriaged} untriaged regressions`,
  );
  if (opts["fail-on-new"] && untriaged > 0) {
    process.exit(1);
  }
} else if (command === "images") {
  const failed = await runImages({
    catalog,
    opts,
    root,
    directory:
      process.env.BENCH_RESULTS ?? join(homedir(), ".cesium-bench", "results"),
  });
  if (failed > 0) {
    process.exit(1);
  }
} else if (command === "annotate") {
  const text = opts._?.join(" ");
  if (!text) {
    throw new Error('annotate "what changed" [--short s] [--kind machine]');
  }
  const kinds = ["machine", "data", "note", "method"];
  const kind = opts.kind ? String(opts.kind) : "note";
  if (!kinds.includes(kind)) {
    throw new Error(`--kind: one of ${kinds.join(", ")}`);
  }
  const directory =
    process.env.BENCH_RESULTS ?? join(homedir(), ".cesium-bench", "results");
  const file = join(directory, "annotations.json");
  const stored = existsSync(file)
    ? JSON.parse(readFileSync(file, "utf8"))
    : { annotations: [] };
  const note = {
    date: new Date(opts.date ? String(opts.date) : Date.now()).toISOString(),
    kind,
    text,
    ...(opts.short ? { short: String(opts.short) } : {}),
    ...(opts.metrics ? { metrics: String(opts.metrics).split(",") } : {}),
  };
  stored.annotations.push(note);
  mkdirSync(directory, { recursive: true });
  writeFileSync(file, `${JSON.stringify(stored, null, 2)}\n`);
  console.log(`${note.date} ${kind}: ${text} (${file})`);
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
  // The occasion (catalog tiers) sets scenarios, repetitions and motion
  // quality; the areas a change touches (or --areas) pick the scenes.
  const tier = opts.tier
    ? catalog.tiers.find((t) => t.id === opts.tier)
    : undefined;
  if (opts.tier && !tier) {
    throw new Error(
      `unknown tier "${opts.tier}" (tiers: ${catalog.tiers.map((t) => t.id).join(", ")})`,
    );
  }
  let areaIds;
  if (opts.areas) {
    areaIds = String(opts.areas).split(",");
  } else if (opts.changed) {
    const ref = opts.changed === true ? "HEAD" : String(opts.changed);
    const files = changedFiles(root, ref);
    const found = areasFor(catalog, files);
    areaIds = [...found.keys()];
    console.log(
      `${files.length} file${files.length === 1 ? "" : "s"} changed since ${ref}: ${
        found.size
          ? [...found]
              .map(
                ([id, hits]) =>
                  `${id} (${hits.slice(0, 3).join(", ")}${hits.length > 3 ? ", …" : ""})`,
              )
              .join("; ")
          : "nothing measured"
      }`,
    );
    if (!areaIds.length && !opts.scenes) {
      console.log("no scenes to run");
      return;
    }
  }
  const scenes =
    pick(catalog.scenes, "scenes") ??
    (areaIds && !tier?.allScenes
      ? scenesFor(catalog, areaIds)
      : catalog.scenes);
  if (opts.configs || opts.cesium) {
    throw new Error(
      "--configs and --cesium became --engines (e.g. --engines 1.146.0,2.0)",
    );
  }
  // Engines (engines.mjs); a historical sweep adds one release each.
  const specs = opts.engines
    ? String(opts.engines).split(",")
    : [...catalog.engines.default];
  if (opts.releases) {
    for (const version of releaseList(opts.releases)) {
      if (!specs.includes(version)) {
        specs.push(version);
      }
    }
  }
  // A parameter sweep (plan §16.9, Explore): each 2.0 engine (or
  // --sweep-engines) once per value, e.g. --sweep maximumScreenSpaceError=8,16,32
  // or --sweep render.pixelRatio=1,2: "2.0+maximumScreenSpaceError=8".
  let sweep;
  if (opts.sweep) {
    const [param, list] = String(opts.sweep).split("=");
    if (!param || !list) {
      throw new Error("--sweep param=value,value");
    }
    const values = list.split(",");
    const swept = opts["sweep-engines"]
      ? String(opts["sweep-engines"]).split(",")
      : specs.filter((x) => parseEngine(x).engine === "2.0");
    specs.splice(
      0,
      specs.length,
      ...specs.flatMap((x) =>
        swept.includes(x) ? values.map((v) => `${x}+${param}=${v}`) : [x],
      ),
    );
    sweep = {
      param,
      values: values.map((v) => (Number.isFinite(Number(v)) ? Number(v) : v)),
      engines: swept,
    };
  }
  // What runs: the working tree frozen as a commit and built for
  // production (frozen.mjs), unless --dev serves the live tree.
  const frozen = opts.dev ? undefined : freezeTree(root);
  const benchRoot = frozen ? checkoutFrozen(frozen.repo, frozen.sha) : root;
  if (frozen) {
    console.log(
      `frozen ${frozen.dirty ? "working tree" : "HEAD"} at ${frozen.sha.slice(0, 12)}: edits from now on don't reach this run`,
    );
  }
  const repoRoot = join(root, "..", "..");
  // Served beside production builds (the dev server's own middleware).
  const directories = {
    "/cesium1x":
      process.env.CESIUM_BUILD_DIR ??
      join(repoRoot, "Build", "CesiumUnminified"),
    "/specs-data": join(repoRoot, "Specs", "Data"),
    "/cesium-release":
      process.env.BENCH_CESIUM_DIR ??
      join(homedir(), ".cesium-bench", "cesium"),
    "/cesium-ref": join(repoRoot, ".bench"),
  };
  const log = (line) => console.log(line);
  // Snapshot servers for 2.0 at other refs, one per worktree. Pages from
  // before r39 load 1.x's build on every run: they get an empty one, so
  // 2.0 at a ref measures as 2.0 here does.
  const snapshotDirectories = {
    ...directories,
    "/cesium1x": emptyCesium(),
  };
  const snapshotServers = new Map();
  const serve = async (snapRoot, repo) => {
    if (!snapshotServers.has(snapRoot) && !opts.dev) {
      const sha = execSync("git rev-parse HEAD", { cwd: snapRoot })
        .toString()
        .trim();
      try {
        snapshotServers.set(
          snapRoot,
          await serveBuild(snapRoot, sha, {
            directories: snapshotDirectories,
            port: 5194,
            log,
          }),
        );
      } catch (error) {
        console.log(
          `${sha.slice(0, 12)} doesn't build for production (${String(error).split(/\r?\n/)[0]}): served by a dev server`,
        );
      }
    }
    if (!snapshotServers.has(snapRoot)) {
      const { createServer } = await import("vite");
      const snap = await createServer({
        root: snapRoot,
        configFile: join(snapRoot, "vite.config.ts"),
        cacheDir: join(snapRoot, ".vite-bench"),
        server: {
          port: 5194,
          strictPort: false,
          hmr: false,
          watch: null,
          fs: { allow: [repo] },
        },
        logLevel: "error",
      });
      await snap.listen();
      snapshotServers.set(snapRoot, snap);
    }
    return snapshotServers
      .get(snapRoot)
      .resolvedUrls.local[0].replace(/\/$/, "");
  };
  const configs = [];
  const byspec = new Map();
  for (const spec of specs) {
    const config = await resolveEngine(spec, catalog, {
      cwd: root,
      serve,
      frozen,
      log,
    });
    configs.push(config);
    byspec.set(spec, config.id);
  }
  if (sweep) {
    // The swept engines (resolved ids) and, per value, the engines run.
    const suffix = (v) => `+${sweep.param}=${v}`;
    sweep.engines = [
      ...new Set(
        configs
          .filter((c) => c.id.includes(`+${sweep.param}=`))
          .map((c) => c.id.replace(/\+[^+]*=[^+]*$/, "")),
      ),
    ];
    sweep.points = sweep.values.map((value) => ({
      value,
      configs: configs
        .filter((c) => c.id.endsWith(suffix(value)))
        .map((c) => c.id),
    }));
  }
  // Baseline and candidate: specs as typed, or the catalog's defaults.
  const idOf = (spec) => {
    if (byspec.has(spec)) {
      return byspec.get(spec);
    }
    const found = configs.find((c) => c.id === spec);
    if (!found) {
      throw new Error(
        `"${spec}" is not one of this run's engines (${specs.join(", ")})`,
      );
    }
    return found.id;
  };
  const baseline = opts.baseline
    ? idOf(opts.baseline)
    : (byspec.get(catalog.engines.baseline) ??
      configs.find((c) => c.source.kind === "release")?.id ??
      configs[0].id);
  const candidate = opts.candidate
    ? idOf(opts.candidate)
    : (byspec.get(catalog.engines.candidate) ??
      configs.find((c) => c.engine === "2.0" && c.id !== baseline)?.id ??
      configs.at(-1).id);
  const scenarios =
    pick(catalog.scenarios, "scenarios") ??
    (tier
      ? catalog.scenarios.filter((s) => tier.scenarios.includes(s.id))
      : catalog.scenarios.filter(
          (s) => s.id === "cold-orbit" || s.id === "uncapped-orbit",
        ));
  const reps = Number(opts.reps ?? tier?.reps ?? 3);
  const replayMotion =
    !opts["no-motion-quality"] && tier?.motionQuality !== false;
  const motion = opts.motion ? Number(opts.motion) : undefined;

  // The verify step guards repeatability: changed local data stops the run.
  const checked = verify([
    ...new Set(scenes.flatMap((s) => sceneDatasets(catalog, s))),
  ]);
  const bad = checked.filter((r) => r.status === "changed");
  if (bad.length) {
    throw new Error(`datasets changed: ${bad.map((r) => r.id).join(", ")}`);
  }

  let server;
  if (frozen) {
    server = await serveBuild(benchRoot, frozen.sha, {
      directories,
      port: 5193,
      log,
    });
  } else {
    const { createServer } = await import("vite");
    server = await createServer({
      root,
      configFile: join(root, "vite.config.ts"),
      cacheDir: join(root, ".vite-bench"),
      server: { port: 5193, strictPort: false, hmr: false, watch: null },
      logLevel: "error",
    });
    await server.listen();
  }
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
    branch: treeRef(root),
    note: opts.note ?? "",
    baseline,
    candidate,
    tags: opts.tag ? opts.tag.split(",") : [],
    // The default depends on what is compared (2.0 vs 1.x or vs 2.0).
    plan: {
      ...defaultPlan(baseline, candidate, {
        motion: scenarios.some((s) => (motion ?? s.motionSeconds) > 0),
      }),
      ...(opts.primary ? { primary: opts.primary } : {}),
      ...(opts.guardrails ? { guardrails: opts.guardrails.split(",") } : {}),
      ...(opts.tolerance ? { tolerance: Number(opts.tolerance) } : {}),
      ...(opts.hypothesis ? { hypothesis: opts.hypothesis } : {}),
    },
    dirty: git("status --porcelain").length > 0,
    // The commit the run served (the working tree frozen), and how:
    // "build" (production) or "dev" (--dev, the live tree).
    ...(frozen ? { frozen: frozen.sha } : {}),
    served: frozen ? "build" : "dev",
    // Lineage (plan §16.9, Trust): how to reproduce this run exactly.
    command: ["node", "packages/next/bench/suite/cli.mjs", command, ...rest],
    diffSha256: sha256(
      execSync("git diff HEAD", {
        cwd: root,
        maxBuffer: 1 << 28,
        stdio: ["ignore", "pipe", "ignore"],
      }),
    ),
    catalogSha256: sha256(JSON.stringify(catalog)),
    datasets: checked,
    catalog: catalog.sources > 1 ? "public+private" : "public",
    environment: {
      os: `${osVersion()} (${platform()} ${release()}, ${arch()})`,
      cpu: cpus()[0]?.model,
      cores: cpus().length,
      memoryGiB: Math.round(totalmem() / 2 ** 30),
      browser: `${channel === "msedge" ? "Microsoft Edge" : channel} ${browser.version()}`,
      engines: Object.fromEntries(configs.map((c) => [c.id, describeBuild(c)])),
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
            opts["pixel-ratio"] === "device"
              ? "device"
              : Number(opts["pixel-ratio"]),
        }
      : {}),
  };
  results.environment.render = render;
  results.budgets = catalog.budgets;
  if (sweep) {
    results.sweep = sweep;
  }
  const filmstrip = [];
  const motionFrames = [];
  let total = scenes.length * scenarios.length * reps * configs.length;
  let done = 0;
  let failed = 0;
  const resultsDir =
    process.env.BENCH_RESULTS ?? join(homedir(), ".cesium-bench", "results");
  // Stored repetitions of engines that can't change, other than the
  // candidate (reuse.mjs): one calibration repetition, then the rest from
  // earlier runs on this machine, method and data. --no-reuse turns it off.
  results.reuse = {
    machine: machineKey(results.environment),
    method: methodKey(benchRoot),
  };
  results.configs = configs.map((c) => ({
    id: c.id,
    engine: c.engine,
    source: c.source,
    engineKey: engineKey(c),
  }));
  const reusing = !opts["no-reuse"] && reps > 1;
  const stored = reusing
    ? storedRuns(resultsDir, {
        ...results.reuse,
        days: Number(opts["reuse-days"] ?? 14),
      })
    : [];
  // Early stop: once a scene's comparison of the candidate with the
  // baseline is decided after at least --min-reps repetitions, its
  // remaining ones are skipped: the primary metric's interval lies wholly
  // past the tolerance (a large change; with two repetitions a bootstrap
  // interval is too narrow to call a small one), and each guardrail is
  // clearly within or past its tolerance. --no-early-stop runs them all.
  const minReps = Math.max(2, Number(opts["min-reps"] ?? 2));
  const earlyStop =
    !opts["no-early-stop"] && reps > minReps && baseline !== candidate;
  const decided = (sceneId, scenarioId) => {
    const runsOf = (config) =>
      results.runs.filter(
        (r) =>
          r.scene === sceneId &&
          r.scenario === scenarioId &&
          r.config === config,
      );
    const a = runsOf(baseline);
    const b = runsOf(candidate);
    if ([a, b].some((x) => x.some((r) => r.metrics.status === "unsupported"))) {
      return true;
    }
    const values = (list, key) =>
      list
        .filter((r) => r.metrics.status === "ok")
        .map((r) => r.metrics[key])
        .filter((v) => Number.isFinite(v));
    const settledBy = (key, tolerance, primary = false) => {
      const va = values(a, key);
      const vb = values(b, key);
      if (!va.length && !vb.length) {
        return true;
      }
      if (va.length < minReps || vb.length < minReps) {
        return false;
      }
      const r = ratio(va, vb);
      return primary
        ? r.low > 1 + tolerance || r.high < 1 - tolerance
        : r.low > 1 + tolerance || r.high < 1 + tolerance;
    };
    const plan = results.plan;
    return (
      settledBy(plan.primary, plan.tolerance, true) &&
      plan.guardrails.every((k) => settledBy(k, plan.tolerance))
    );
  };
  for (const scene of scenes) {
    const datasets = sceneDatasets(catalog, scene);
    for (const scenario of scenarios) {
      // Engines whose remaining repetitions came from stored runs.
      const fromStore = new Set();
      for (let rep = 0; rep < reps; rep++) {
        // Rotate the configuration order every repetition.
        const shift = rep % configs.length;
        const order = [...configs.slice(shift), ...configs.slice(0, shift)];
        for (const config of order) {
          if (fromStore.has(config.id)) {
            continue;
          }
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
          result.span = [(runStart - t0) / 1000, (Date.now() - t0) / 1000];
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
                scenario: scenario.id,
                config: config.id,
                moment: shot.moment,
                png: shot.png,
              });
            }
            delete result.shots;
          }
          const record = {
            scene: scene.id,
            sceneTitle: scene.private ? scene.id : scene.title,
            group: scene.group,
            scenario: scenario.id,
            motionSeconds:
              result.metrics.motionSeconds ?? spec.scenario.motionSeconds,
            vsync: spec.scenario.vsync !== false,
            config: config.id,
            engine: config.engine,
            rep,
            sceneKey: sceneKey(spec),
            ...result,
          };
          results.runs.push(record);
          if (result.metrics.status === "error") {
            failed++;
          }
          console.log(
            result.metrics.status === "ok"
              ? `settle ${(result.metrics.settleMs / 1000).toFixed(1)} s, ${
                  result.metrics.frameP50 === undefined
                    ? `first content ${(result.metrics.firstContentMs / 1000).toFixed(2)} s`
                    : `frame p50 ${result.metrics.frameP50.toFixed(1)} ms`
                }`
              : `${result.metrics.status}${result.metrics.message ? `: ${result.metrics.message}` : ""}`,
          );
          // The first repetition calibrates against stored ones.
          if (
            rep === 0 &&
            reusing &&
            config.id !== candidate &&
            immutable(config) &&
            result.metrics.status === "ok" &&
            result.validity.verdict === "valid"
          ) {
            const prior = findStored(
              stored,
              engineKey(config),
              record.sceneKey,
              reps - 1,
            );
            if (prior.length === reps - 1) {
              const d = drift(record, prior);
              const shown = (v) =>
                d.key === "cpuP50"
                  ? `${v.toFixed(2)} ms`
                  : `${(v / 1000).toFixed(2)} s`;
              if (d.drifted) {
                console.log(
                  `  ${config.id}: ${d.key} ${d.value === undefined ? "missing" : shown(d.value)} vs stored ${d.mean === undefined ? "none" : `${shown(d.mean)} ± ${shown(d.band)}`}: every repetition runs`,
                );
              } else {
                fromStore.add(config.id);
                total -= reps - 1;
                prior.forEach((p, i) =>
                  results.runs.push({ ...p.run, rep: i + 1, reused: p.file }),
                );
                console.log(
                  `  ${config.id}: within ${shown(d.band)} of stored runs: repetitions 2 to ${reps} from ${[...new Set(prior.map((p) => p.file))].join(", ")}`,
                );
              }
            }
          }
        }
        if (earlyStop && rep + 1 >= minReps && rep + 1 < reps) {
          if (decided(scene.id, scenario.id)) {
            const skipped =
              (reps - rep - 1) *
              configs.filter((c) => !fromStore.has(c.id)).length;
            total -= skipped;
            console.log(
              `  ${scene.id} ${scenario.id}: decided after ${rep + 1} repetitions; ${skipped} run${skipped === 1 ? "" : "s"} skipped`,
            );
            break;
          }
        }
      }
      // Quality in motion: the motion again per engine after the measured
      // runs, frames copied in flight and settled (cold cache with vsync:
      // the cache and pace the measured runs had).
      if (
        !opts["no-capture"] &&
        replayMotion &&
        (motion ?? scenario.motionSeconds) > 0 &&
        scenario.cache === "cold" &&
        scenario.vsync !== false
      ) {
        for (const config of configs) {
          const spec = {
            scene,
            datasets,
            scenario: motion
              ? { ...scenario, motionSeconds: motion }
              : scenario,
            config,
            unsupported: unsupportedReason(catalog, scene, config.engine),
            render,
          };
          if (spec.unsupported) {
            continue;
          }
          process.stdout.write(
            `${scene.id} ${scenario.id} ${config.id}: quality in motion… `,
          );
          await cooldown(sampler, idle.gpuTemperatureMaxC);
          const replay = await runMotion(
            await browserFor(scenario),
            base,
            spec,
          );
          for (const frame of replay.frames) {
            motionFrames.push({
              scene: scene.id,
              scenario: scenario.id,
              config: config.id,
              ...frame,
            });
          }
          console.log(
            replay.status === "ok"
              ? `${replay.frames.length} frames`
              : `${replay.status}${replay.message ? `: ${replay.message}` : ""}`,
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
    process.stdout.write(
      `filmstrips and image parity (${filmstrip.length} frames)… `,
    );
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
  if (motionFrames.length) {
    process.stdout.write(
      `quality in motion (${motionFrames.length} frame pairs)… `,
    );
    results.assets = `/bench-results/${stamp}/`;
    results.motionQuality = await motionQuality(
      browser,
      base,
      motionFrames,
      join(directory, stamp),
    );
    console.log("done");
  }
  await browser.close();
  await uncapped?.close();
  await server.close();
  for (const snap of snapshotServers.values()) {
    await snap.close();
  }

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
      `\n${card.candidate} vs ${card.baseline}: ${card.verdict.toUpperCase()} (primary ${card.plan.primary} ${card.primary.moved}; guardrails broken: ${
        [
          ...card.guardrails,
          ...(card.image ? [card.image] : []),
          ...(card.motion ? [card.motion] : []),
        ]
          .filter((g) => g.broken.length)
          .map((g) => g.key)
          .join(", ") || "none"
      })\n`,
    );
    console.log(
      compareTable(
        [results, card.baseline],
        [results, card.candidate],
        [card.plan.primary, ...card.plan.guardrails],
      ),
    );
  } else if (results.baseline !== results.candidate) {
    console.log("\nno verdict: no scene was measured by both engines\n");
  }
  if (results.motionQuality?.length) {
    console.log(
      "\nquality in motion (FLIP in motion vs settled, mean over frames)",
    );
    for (const e of results.motionQuality) {
      console.log(
        `${`${e.scene} · ${e.scenario}`.padEnd(40)} ${e.config.padEnd(28)} ${e.mean.toFixed(3)}  [${e.frames.map((f) => f.mean.toFixed(2)).join(" ")}]`,
      );
    }
    console.log("");
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
  let measuring = false;
  const hosts = new Map();
  const sizes = [];
  const starts = [];
  await page.exposeFunction("measureMemory", () =>
    retainedMemory(context, page),
  );
  // The page ends the measurement before the selection reference.
  await page.exposeFunction("endMeasurement", () => {
    measuring = false;
  });
  const count = (request) => {
    if (!measuring) {
      return;
    }
    // CORS preflights (OPTIONS) are not content requests: counted apart.
    if (request.method() === "OPTIONS") {
      preflights++;
      return;
    }
    // Content only: not the page's own origin (the engine's code, served
    // module by module in development) nor data: and blob: URLs.
    const url = new URL(request.url());
    if (
      !url.protocol.startsWith("http") ||
      url.origin === base ||
      url.origin === spec.config.page?.server
    ) {
      return;
    }
    requests++;
    hosts.set(url.hostname, (hosts.get(url.hostname) ?? 0) + 1);
    const size = request
      .sizes()
      .then((s) => s.responseBodySize + s.responseHeadersSize)
      .catch(() => 0);
    sizes.push(size);
    // When each request started, to split bytes at the motion's start.
    const startedAt = request.timing().startTime - runStart;
    starts.push(size.then((bytes) => [startedAt, bytes]));
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
          url.href,
        ]),
      );
    }
  };
  try {
    const { cesium, server } = spec.config.page ?? {};
    const origin = server ?? base;
    await page.goto(
      `${origin}/bench/suite/suite.html?bench${cesium ? `&cesium=${encodeURIComponent(cesium)}` : ""}`,
    );
    if (!results.environment.page) {
      results.environment.page = await page.evaluate(() =>
        globalThis.describeBrowser(),
      );
      const info = results.environment.page.webgpu?.info;
      results.environment.adapter = info;
    }
    if (spec.scenario.cache === "warm" && !spec.unsupported) {
      // Prime the HTTP cache, then measure a fresh page in the same context.
      await page.evaluate((s) => globalThis.runScene(s), {
        ...spec,
        capture: false,
      });
      await page.reload();
    }
    context.on("requestfinished", count);
    measuring = true;
    runStart = Date.now();
    const metrics = await page.evaluate((s) => globalThis.runScene(s), spec);
    context.off("requestfinished", count);
    // A page from before r39 (a snapshot at an older commit) read
    // performance.memory itself: kept apart, as migrated results are.
    if (metrics.heapBytes !== undefined && metrics.bufferBytes === undefined) {
      metrics.jsHeapReportedBytes = metrics.heapBytes;
      delete metrics.heapBytes;
    }
    // Each request's purpose (2.0), by URL (else without its query); the
    // URLs themselves are not kept.
    const purposes = new Map(metrics.purposes ?? []);
    const bare = new Map(
      (metrics.purposes ?? []).map(([u, p]) => [u.split("?")[0], p]),
    );
    delete metrics.purposes;
    const tag = (row) => {
      const href = row.pop();
      const purpose = purposes.get(href) ?? bare.get(href.split("?")[0]);
      return purpose ? [...row, purpose] : row;
    };
    const bytes = (await Promise.all(sizes)).reduce((a, b) => a + b, 0);
    // Bytes of requests started before the motion (the load until settled)
    // and from it on (in and after motion): 2.0 vs 1.x judges the first.
    if (metrics.motionMs) {
      let load = 0;
      for (const [at, b] of await Promise.all(starts)) {
        if (at < metrics.motionMs[0]) {
          load += b;
        }
      }
      metrics.bytesLoad = load;
      metrics.bytesMotion = bytes - load;
    }
    if (errors.length && metrics.status === "ok") {
      metrics.message = errors.slice(0, 3).join("; ");
    }
    return {
      metrics: { ...metrics, requests, bytes, preflights },
      hosts: Object.fromEntries(hosts),
      ...(shots.length ? { shots } : {}),
      ...(waterfall.length
        ? {
            // [start ms, time to first byte ms, end ms, bytes, kind, host,
            // purpose (2.0 content)]
            waterfall: (await Promise.all(waterfall))
              .map(tag)
              .sort((a, b) => a[0] - b[0]),
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

/**
 * What the page holds at the end of the run (the page asks, with the
 * engine still up), over CDP after full collections, on
 * the main thread and in every worker: JS objects (`heapBytes`) and
 * ArrayBuffer storage (`bufferBytes`, typed arrays and WebAssembly memory).
 * `performance.memory` (before r39) counted the main thread's objects with
 * garbage and its buffers together.
 */
async function retainedMemory(context, page) {
  const cdp = await context.newCDPSession(page);
  // Workers through Target messages: Playwright's sessions don't route
  // child sessions.
  const workers = [];
  const replies = new Map();
  let next = 0;
  cdp.on("Target.attachedToTarget", (e) => workers.push(e.sessionId));
  cdp.on("Target.receivedMessageFromTarget", ({ message }) => {
    const reply = JSON.parse(message);
    replies.get(reply.id)?.(reply.result ?? {});
  });
  const call = (sessionId, method) =>
    new Promise((resolve) => {
      const id = ++next;
      replies.set(id, resolve);
      cdp
        .send("Target.sendMessageToTarget", {
          sessionId,
          message: JSON.stringify({ id, method, params: {} }),
        })
        .catch(() => resolve({}));
    });
  try {
    await cdp.send("Target.setAutoAttach", {
      autoAttach: true,
      waitForDebuggerOnStart: false,
      flatten: false,
    });
    // Existing workers attach right away.
    await new Promise((resolve) => setTimeout(resolve, 200));
    const usage = async (send) => {
      for (let i = 0; i < 3; i++) {
        await send("HeapProfiler.collectGarbage");
      }
      return send("Runtime.getHeapUsage");
    };
    const all = [
      await usage((method) => cdp.send(method)),
      ...(await Promise.all(
        workers.map((id) => usage((method) => call(id, method))),
      )),
    ];
    const sum = (key) => all.reduce((n, u) => n + (u[key] ?? 0), 0);
    return {
      heapBytes: sum("usedSize"),
      bufferBytes: sum("backingStorageSize"),
      workers: workers.length,
    };
  } catch {
    return {};
  } finally {
    await cdp.detach().catch(() => {});
  }
}

/**
 * Quality in motion, one engine: the page replays the scenario's motion
 * in a fresh context (cold cache) and returns frames copied in flight with
 * the same poses settled (`runMotionQuality`). Nothing here is measured.
 */
async function runMotion(browser, base, spec) {
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 },
    deviceScaleFactor: Number(opts.dpr ?? 1),
  });
  try {
    const page = await context.newPage();
    const { cesium, server } = spec.config.page ?? {};
    await page.goto(
      `${server ?? base}/bench/suite/suite.html?bench${cesium ? `&cesium=${encodeURIComponent(cesium)}` : ""}`,
    );
    return await page.evaluate(
      ({ s, n }) => globalThis.runMotionQuality(s, n),
      { s: spec, n: Number(opts["motion-samples"] ?? 8) },
    );
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : String(error),
      frames: [],
    };
  } finally {
    await context.close();
  }
}

/**
 * Quality in motion: per scene, scenario and engine, FLIP of each frame
 * drawn in motion against the same pose settled (its own engine, so
 * renderer differences cancel), with JPEGs and heatmaps; `mean` is over
 * the frames.
 */
async function motionQuality(browser, base, frames, directory) {
  mkdirSync(directory, { recursive: true });
  const page = await browser.newPage();
  await page.goto(`${base}/bench/suite/flip.html`);
  const groups = new Map();
  for (const f of frames) {
    const k = `${f.scene}|${f.scenario}|${f.config}`;
    (groups.get(k) ?? groups.set(k, []).get(k)).push(f);
  }
  const out = [];
  for (const list of groups.values()) {
    const { scene, scenario, config } = list[0];
    const entry = { scene, scenario, config, frames: [] };
    for (const f of list) {
      const name =
        `${scene}__${scenario}__${config}__motion${Math.round(f.progress * 100)}`.replace(
          /[^\w@.-]/g,
          "_",
        );
      const r = await page.evaluate(
        ({ test, ref }) => globalThis.processFrame(test, ref),
        { test: f.moving, ref: f.settled },
      );
      const settled = await page.evaluate(
        ({ test }) => globalThis.processFrame(test, null),
        { test: f.settled },
      );
      writeFileSync(
        join(directory, `${name}.jpg`),
        Buffer.from(r.jpeg, "base64"),
      );
      writeFileSync(
        join(directory, `${name}.settled.jpg`),
        Buffer.from(settled.jpeg, "base64"),
      );
      writeFileSync(
        join(directory, `${name}.flip.png`),
        Buffer.from(r.flip.heatmap, "base64"),
      );
      entry.frames.push({
        progress: f.progress,
        mean: r.flip.mean,
        p95: r.flip.p95,
        image: `${name}.jpg`,
        settled: `${name}.settled.jpg`,
        heatmap: `${name}.flip.png`,
      });
    }
    entry.mean =
      entry.frames.reduce((a, f) => a + f.mean, 0) / entry.frames.length;
    out.push(entry);
  }
  await page.close();
  return out;
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
      const slice = rows.slice(
        Math.floor(b * size),
        Math.floor((b + 1) * size),
      );
      const mean = [];
      for (let k = 0; k < slice[0].length; k++) {
        mean.push(
          slice.reduce((sum, r) => sum + (r[k] ?? 0), 0) / slice.length,
        );
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
  if (
    /\.(jpe?g|png|webp|ktx2)$/.test(path) ||
    /virtualearth|tiles\./.test(url.hostname)
  ) {
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
 * A 2.0 frame with a selection reference (the same view under Stepwise
 * selection, moment "<moment>-stepwise") also gets `selection`: FLIP
 * against it, what its tile selection draws differently, renderer aside.
 */
async function filmstrips(browser, base, frames, directory, baseline) {
  mkdirSync(directory, { recursive: true });
  const page = await browser.newPage();
  await page.goto(`${base}/bench/suite/flip.html`);
  const out = [];
  const key = (f) => `${f.scene}|${f.scenario}|${f.moment}`;
  const isReference = (f) => f.moment.endsWith("-stepwise");
  const references = new Map(
    frames
      .filter(isReference)
      .map((f) => [
        `${key({ ...f, moment: f.moment.replace(/-stepwise$/, "") })}|${f.config}`,
        f,
      ]),
  );
  const groups = new Map();
  for (const f of frames.filter((f) => !isReference(f))) {
    (groups.get(key(f)) ?? groups.set(key(f), []).get(key(f))).push(f);
  }
  for (const list of groups.values()) {
    const entry = {
      scene: list[0].scene,
      scenario: list[0].scenario,
      moment: list[0].moment,
      images: {},
      flip: {},
      selection: {},
    };
    const reference = list.find((f) => f.config === baseline);
    for (const f of list) {
      const name =
        `${f.scene}__${f.scenario}__${f.config}__${f.moment}`.replace(
          /[^\w@.-]/g,
          "_",
        );
      const result = await page.evaluate(
        ({ test, ref }) => globalThis.processFrame(test, ref),
        {
          test: f.png.toString("base64"),
          ref:
            reference && f !== reference
              ? reference.png.toString("base64")
              : null,
        },
      );
      writeFileSync(
        join(directory, `${name}.jpg`),
        Buffer.from(result.jpeg, "base64"),
      );
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
      const own = references.get(`${key(f)}|${f.config}`);
      if (own) {
        const parity = await page.evaluate(
          ({ test, ref }) => globalThis.processFrame(test, ref),
          { test: f.png.toString("base64"), ref: own.png.toString("base64") },
        );
        const reference = await page.evaluate(
          ({ test }) => globalThis.processFrame(test, null),
          { test: own.png.toString("base64") },
        );
        writeFileSync(
          join(directory, `${name}.stepwise.jpg`),
          Buffer.from(reference.jpeg, "base64"),
        );
        writeFileSync(
          join(directory, `${name}.selection.flip.png`),
          Buffer.from(parity.flip.heatmap, "base64"),
        );
        entry.selection[f.config] = {
          mean: parity.flip.mean,
          p95: parity.flip.p95,
          heatmap: `${name}.selection.flip.png`,
          reference: `${name}.stepwise.jpg`,
        };
      }
    }
    out.push(entry);
  }
  await page.close();
  return out;
}

function sha256(data) {
  return createHash("sha256").update(data).digest("hex");
}
