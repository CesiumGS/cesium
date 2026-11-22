// Cold start of a Dyno page (CS-706): the time from navigation to the
// first drawn frame in a browser with nothing cached, measured as a Dyno
// run and stored with the others (BENCH_RESULTS).
//
//   node bench/suite/cli.mjs coldstart
//        [--url http://127.0.0.1:4101 | --roots <dir>,<dir>] [--port 4101]
//        [--https] [--interleave]
//        [--route /viewer] [--reps 5] [--board with,without]
//        [--env-file <path>] [--budget ms] [--profile] [--quiet 25]
//        [--note "…"] [--tag a,b]
//
// Each repetition launches its own browser with a new, empty profile: no
// HTTP cache, no compiled-code cache and no GPU pipeline cache, as a cold
// browser has. The dev server is warm, as the owner's long-running one is:
// one load before the repetitions compiles the modules, and its numbers are
// discarded. The page is hooked before any of its scripts run, so the
// phases are read from the browser itself at any commit, without help from
// the code measured. The first frame waits on these, one after another:
//
// - modules: the last module the page asked for before engine start,
//   answered (Vite serves each source file as its own request);
// - device: WebGPU's adapter asked for, then the device;
// - engine setup: the engine, its Viewer and the page's host made (Dyno's
//   viewer page sets `dynoViewer` then);
// - content: the viewer's content (the default sample glTF) answered;
// - first frame: the first canvas texture drawn and submitted, then the
//   next animation frame, when the browser presents it.
//
// The reference data (the frames store's files, `/frames-data/`) loads
// beside them: the sky runs on analytic stand-ins until it is in. It is
// recorded as a span of its own, first request to last answer.
//
// "board": with, as main has it (the Work board's request runs while the
// page loads); without, by refusing `/work-api/` requests in the browser
// (Chromium's blocked URLs, which hold no other request).
//
// Without `--url` (a server already running), the command serves this tree
// with its own Vite on `--port`; `--roots` serves each directory given (a
// worktree's root, or its packages/next before CS-835) instead, one at a
// time, for other commits.
// `--https` serves them over TLS (DEV_HTTPS), so the browser speaks HTTP/2.
// `--interleave` serves each tree in turn within every repetition (a fresh
// server warmed by one load each time), so bursts of other work on the
// machine fall on every tree alike; without it, each tree's repetitions run
// together.
// `--env-file` passes that file's VITE_ variables to those servers through
// the environment, so a development ion token reaches them without being
// copied; nothing of it is printed or stored.
//
// Each load first waits, a minute at most, for the machine's CPU to be under
// `--quiet` percent (default 25) over a second: other work on the machine
// slows the dev server's answers and the page's parsing alike. Runs record
// the CPU they started at, and a load that never got quiet is a warning.
//
// `--profile` adds the main thread's time to the first frame by category
// (`cpuCategory`), from V8's sampling profiler: what the time between the
// phases' requests went to. The profiler has a cost of its own.
//
// `--budget` (default: COLD_START_BUDGET_MS) is the regression
// check: the command exits 1 when a configuration's median first frame
// without the board is over it.
import { execFileSync, spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { cpus, tmpdir } from "node:os";
import { join, resolve } from "node:path";

/**
 * The goal, ms from navigation to the first drawn frame: the owner's "used
 * to be less than 500 ms" (2026-11-19, CS-706), which Dyno's viewer met on
 * 2026-11-01 (491 to 509 ms, medians, on the owner's Mac).
 */
export const COLD_START_GOAL_MS = 500;

/**
 * The regression check's budget, ms (median of the repetitions without the
 * Work board): where CS-706 left the viewer on the owner's Mac, 1,164 and
 * 1,258 ms in two quiet runs, plus about a tenth for the level that moves
 * between sessions. It holds that level until the larger causes (the
 * engine's startup compiles, the dev server's module count) are taken on,
 * and should come down toward the goal as they are. Measured on another
 * machine, pass --budget for that machine.
 */
export const COLD_START_BUDGET_MS = 1400;

/** Metrics a cold-start run records, with labels and units for reports. */
export const COLD_START_METRICS = [
  ["firstFrameMs", "first drawn frame", "ms"],
  ["modulesMs", "modules loaded", "ms"],
  ["adapterMs", "engine start asked for", "ms"],
  ["deviceMs", "WebGPU device ready", "ms"],
  ["engineMs", "engine and viewer host made", "ms"],
  ["contentMs", "content answered", "ms"],
  ["frameDataMs", "reference data answered", "ms"],
  ["moduleRequests", "module requests", ""],
  ["requests", "requests", ""],
  ["duplicateFetches", "requests for a URL already asked for", ""],
  ["devices", "WebGPU devices created", ""],
  ["shaderModules", "shader modules made before the first frame", ""],
  ["pipelines", "pipelines made before the first frame", ""],
];

/** Requests that are the page's modules (Vite's dev server serves each). */
const MODULE =
  /\.(m?[jt]sx?|css)(\?|$)|\/@vite\/|\/@id\/|\/@fs\/.*\.(m?[jt]sx?)(\?|$)|\/node_modules\/\.vite\/deps\//;
/** The frames store's files. */
const FRAME_DATA = /\/frames-data\//;
/** The viewer's content (its default: a sample glTF from the 1.x specs). */
const CONTENT = /\/specs-data\//;
/** The Work board's read (CS-704's). */
const WORK = /\/work-api\//;

/**
 * Hooks installed before the page's own scripts: marks on the page's clock
 * (milliseconds since navigation began) for engine start and the first
 * frame.
 * Runs in the page; plain JavaScript only.
 */
export function pageHooks() {
  const state = {
    marks: {},
    devices: 0,
    canvas: false,
    shaderModules: 0,
    pipelines: 0,
  };
  Object.defineProperty(window, "__coldStart", { value: state });
  const mark = (key) => {
    if (!(key in state.marks)) {
      state.marks[key] = performance.now();
    }
  };
  // The viewer page's host made: Dyno hands it to the console as
  // `dynoViewer` in development (Viewer.tsx), at every commit measured.
  let host;
  Object.defineProperty(window, "dynoViewer", {
    configurable: true,
    get: () => host,
    set: (value) => {
      mark("host");
      host = value;
    },
  });
  const gpu = navigator.gpu;
  if (gpu) {
    const requestAdapter = gpu.requestAdapter.bind(gpu);
    gpu.requestAdapter = async (...args) => {
      mark("adapter");
      return requestAdapter(...args);
    };
  }
  const adapter = window.GPUAdapter?.prototype;
  if (adapter) {
    const requestDevice = adapter.requestDevice;
    adapter.requestDevice = async function (...args) {
      state.devices++;
      const device = await requestDevice.apply(this, args);
      mark("device");
      return device;
    };
  }
  // Shader modules and pipelines made before the first frame: what a
  // second engine compiles again.
  const device = window.GPUDevice?.prototype;
  if (device) {
    const count = (name, key) => {
      const original = device[name];
      if (original) {
        device[name] = function (...args) {
          if (!("firstFrame" in state.marks)) {
            state[key]++;
          }
          return original.apply(this, args);
        };
      }
    };
    count("createShaderModule", "shaderModules");
    for (const name of [
      "createRenderPipeline",
      "createRenderPipelineAsync",
      "createComputePipeline",
      "createComputePipelineAsync",
    ]) {
      count(name, "pipelines");
    }
  }
  const context = window.GPUCanvasContext?.prototype;
  if (context) {
    const getCurrentTexture = context.getCurrentTexture;
    context.getCurrentTexture = function (...args) {
      mark("canvas");
      state.canvas = true;
      return getCurrentTexture.apply(this, args);
    };
  }
  const queue = window.GPUQueue?.prototype;
  if (queue) {
    const submit = queue.submit;
    queue.submit = function (...args) {
      const out = submit.apply(this, args);
      if (state.canvas && !("submit" in state.marks)) {
        mark("submit");
        requestAnimationFrame(() => mark("firstFrame"));
      }
      return out;
    };
  }
}

const round = (x) => (x === undefined ? undefined : Math.round(x));
const maxOf = (list) => (list.length ? Math.max(...list) : undefined);
const minOf = (list) => (list.length ? Math.min(...list) : undefined);

/**
 * One repetition's metrics and phases from the page's marks and its
 * requests, its workers' too (`name`, `startTime`, `responseEnd`, all
 * milliseconds since navigation began). Pure, so tests can feed it.
 */
export function analyzeColdStart({
  marks,
  resources,
  devices,
  shaderModules,
  pipelines,
}) {
  const adapter = marks.adapter;
  const page = resources.filter((r) => !WORK.test(r.name));
  const modules = page.filter(
    (r) =>
      MODULE.test(r.name) && (adapter === undefined || r.startTime < adapter),
  );
  const frameData = page.filter((r) => FRAME_DATA.test(r.name));
  // Data asked for again before the first frame (modules and WebAssembly
  // are asked for once per worker, which is expected).
  const seen = new Map();
  const before = marks.firstFrame ?? Infinity;
  for (const r of page.filter(
    (x) =>
      x.startTime < before &&
      !MODULE.test(x.name) &&
      !/\.wasm(\?|$)/.test(x.name),
  )) {
    seen.set(r.name, (seen.get(r.name) ?? 0) + 1);
  }
  const duplicates = [...seen].filter(([, n]) => n > 1);
  const content = page.filter((r) => CONTENT.test(r.name));
  const metrics = {
    firstFrameMs: round(marks.firstFrame),
    modulesMs: round(maxOf(modules.map((r) => r.responseEnd))),
    adapterMs: round(adapter),
    deviceMs: round(marks.device),
    engineMs: round(marks.host),
    contentMs: round(maxOf(content.map((r) => r.responseEnd))),
    frameDataMs: round(maxOf(frameData.map((r) => r.responseEnd))),
    moduleRequests: modules.length,
    requests: page.length,
    duplicateFetches: duplicates.reduce((sum, [, n]) => sum + n - 1, 0),
    devices,
    shaderModules,
    pipelines,
  };
  // The phases the first frame waits on, end to end: each starts where the
  // one before ended. The reference data is not one of them (the sky runs
  // on its analytic stand-ins until the data is in), so it is a span of its
  // own beside them, which competes with them for the network and the CPU.
  const edges = [
    ["modules", metrics.modulesMs],
    ["device", metrics.deviceMs],
    ["engine setup", metrics.engineMs],
    ["content", metrics.contentMs],
    ["first frame", metrics.firstFrameMs],
  ];
  const phases = [];
  let from = 0;
  for (const [name, end] of edges) {
    if (end === undefined) {
      continue;
    }
    const to = Math.max(from, end);
    phases.push({ name, from, to, ms: to - from });
    from = to;
  }
  return {
    metrics,
    phases,
    frameData: frameData.length
      ? {
          from: round(minOf(frameData.map((r) => r.startTime))),
          to: metrics.frameDataMs,
        }
      : undefined,
    frameDataRequests: frameData.map((r) => ({
      path: new URL(r.name).pathname,
      startMs: round(r.startTime),
      endMs: round(r.responseEnd),
    })),
    duplicates: duplicates.map(([name, n]) => ({
      path: new URL(name).pathname,
      count: n,
    })),
    firstModuleMs: round(minOf(modules.map((r) => r.startTime))),
  };
}

/**
 * A request as stored: the path on the served origin, the host elsewhere;
 * a query only when it can't hold a token or key.
 */
function requestLabel(name, base) {
  const url = new URL(name);
  if (url.origin !== new URL(base).origin) {
    return url.host;
  }
  return (
    url.pathname + (/token|key|signature/i.test(url.search) ? "" : url.search)
  );
}

/** Main-thread time categories, in the order reports list them. */
export const CPU_CATEGORIES = [
  "ui",
  "compile",
  "engine",
  "reference data",
  "widgets",
  "dyno",
  "gc",
  "other",
  "idle",
];

/**
 * The category of one profile sample's stack (innermost frame first, each
 * `{ functionName, url }`): what the main thread was busy with.
 *
 * - ui: React and the UI libraries (StrataKit, MUI, Emotion), development
 *   builds as the dev server serves them;
 * - compile: V8's and the browser's own work outside script ("(program)":
 *   parsing and compiling modules, WGSL, style and layout);
 * - reference data: parsing the frames store's files;
 * - engine, widgets, dyno: the code under src/, widgets/ and bench/.
 */
export function cpuCategory(stack) {
  const leaf = stack[0]?.functionName;
  if (leaf === "(idle)") {
    return "idle";
  }
  if (leaf === "(program)") {
    return "compile";
  }
  if (leaf === "(garbage collector)") {
    return "gc";
  }
  let ui = false;
  for (const { url } of stack) {
    if (/\/src\/(frames|ephemeris)\/|\/src\/time\/eop\./.test(url)) {
      return "reference data";
    }
    if (/\/src\//.test(url)) {
      return "engine";
    }
    if (/\/widgets\//.test(url)) {
      return "widgets";
    }
    if (/\/bench\//.test(url)) {
      return "dyno";
    }
    if (
      /\/\.vite\/deps\/(react|@mui|@stratakit|@emotion|@tanstack|useMediaQuery|portal)/.test(
        url,
      )
    ) {
      ui = true;
    }
  }
  return ui ? "ui" : "other";
}

/**
 * Main-thread milliseconds by category (`cpuCategory`) from a V8 CPU profile
 * (CDP `Profiler.stop`), from `startUs` (the profile's clock) to `endMs`
 * after it.
 */
export function cpuByCategory(profile, startUs, endMs) {
  const nodes = new Map(profile.nodes.map((n) => [n.id, n]));
  const parent = new Map();
  for (const n of profile.nodes) {
    for (const child of n.children ?? []) {
      parent.set(child, n.id);
    }
  }
  const categoryOf = new Map();
  const category = (id) => {
    if (!categoryOf.has(id)) {
      const stack = [];
      for (let at = id; at !== undefined; at = parent.get(at)) {
        stack.push(nodes.get(at).callFrame);
      }
      categoryOf.set(id, cpuCategory(stack));
    }
    return categoryOf.get(id);
  };
  const out = Object.fromEntries(CPU_CATEGORIES.map((c) => [c, 0]));
  let t = profile.startTime;
  for (let i = 0; i < profile.samples.length; i++) {
    t += profile.timeDeltas[i];
    const ms = (t - startUs) / 1000;
    if (ms < 0 || ms > endMs) {
      continue;
    }
    out[category(profile.samples[i])] +=
      (profile.timeDeltas[i + 1] ?? 0) / 1000;
  }
  return Object.fromEntries(
    Object.entries(out).map(([k, v]) => [k, Math.round(v)]),
  );
}

/** One cold load of `url`: a new browser, a new profile, nothing cached. */
async function coldLoad(
  chromium,
  url,
  { channel, headless, blockWork, cpuProfile },
) {
  const profile = mkdtempSync(join(tmpdir(), "dyno-cold-"));
  const context = await chromium.launchPersistentContext(profile, {
    channel,
    headless,
    viewport: { width: 1400, height: 900 },
    args: ["--enable-unsafe-webgpu", "--force_high_performance_gpu"],
    // The dev server's own certificate (DEV_HTTPS), made at its startup.
    ignoreHTTPSErrors: url.startsWith("https:"),
  });
  try {
    const page = context.pages()[0] ?? (await context.newPage());
    const cdp = await context.newCDPSession(page);
    if (blockWork) {
      // Refused by the browser itself: `page.route` would hold every
      // request (each module too) for the driver to look at, a cost of its
      // own on a start of several hundred requests.
      await cdp.send("Network.enable");
      await cdp.send("Network.setBlockedURLs", { urls: ["*/work-api/*"] });
    }
    // The document's request on the profiler's clock (monotonic seconds),
    // which is where the page's clock starts, give or take a millisecond.
    let documentAt;
    if (cpuProfile) {
      await cdp.send("Network.enable");
      cdp.on("Network.requestWillBeSent", (e) => {
        if (e.type === "Document" && documentAt === undefined) {
          documentAt = e.timestamp;
        }
      });
      await cdp.send("Profiler.enable");
      await cdp.send("Profiler.setSamplingInterval", { interval: 250 });
      await cdp.send("Profiler.start");
    }
    await page.addInitScript(pageHooks);
    const errors = [];
    page.on("console", (m) => {
      if (m.type() === "error") {
        errors.push(m.text().slice(0, 300));
      }
    });
    page.on("pageerror", (e) => errors.push(String(e).slice(0, 300)));
    // Every request the page and its workers make (resource timing in the
    // page sees none of a worker's, and the content loads in one), on the
    // page's clock: wall-clock start less the page's time origin.
    const finished = [];
    const failed = [];
    page.on("requestfinished", (r) => {
      const t = r.timing();
      if (t.startTime > 0) {
        finished.push({
          name: r.url(),
          wallStart: t.startTime,
          responseEnd: t.responseEnd,
        });
      }
    });
    page.on("requestfailed", (r) => {
      if (!WORK.test(r.url())) {
        failed.push(new URL(r.url()).pathname);
      }
    });
    await page.goto(url, { waitUntil: "commit" });
    const drew = await page
      .waitForFunction(() => window.__coldStart?.marks.firstFrame, null, {
        timeout: 30000,
      })
      .then(
        () => true,
        () => false,
      );
    const profiled = cpuProfile
      ? (await cdp.send("Profiler.stop")).profile
      : undefined;
    // Late requests of the start (a second viewer, the board) land too.
    await page.waitForTimeout(1500);
    const raw = await page.evaluate(() => ({
      marks: window.__coldStart.marks,
      devices: window.__coldStart.devices,
      shaderModules: window.__coldStart.shaderModules,
      pipelines: window.__coldStart.pipelines,
      timeOrigin: performance.timeOrigin,
    }));
    const resources = finished
      .filter((r) => !r.name.startsWith("data:") && !r.name.startsWith("blob:"))
      .map((r) => {
        const startTime = r.wallStart - raw.timeOrigin;
        return {
          name: r.name,
          startTime,
          responseEnd: startTime + Math.max(0, r.responseEnd),
        };
      })
      .sort((a, b) => a.startTime - b.startTime);
    return {
      drew,
      errors,
      failed,
      marks: raw.marks,
      devices: raw.devices,
      shaderModules: raw.shaderModules,
      pipelines: raw.pipelines,
      resources,
      ...(profiled && documentAt !== undefined && raw.marks.firstFrame
        ? {
            cpu: cpuByCategory(
              profiled,
              documentAt * 1e6,
              raw.marks.firstFrame,
            ),
          }
        : {}),
    };
  } finally {
    await context.close();
    rmSync(profile, { recursive: true, force: true });
  }
}

/** All cores' busy and total CPU time so far, ms (any platform). */
function cpuTimes() {
  return cpus().reduce(
    (sum, c) => {
      const t = c.times;
      sum.busy += t.user + t.nice + t.sys + t.irq;
      sum.all += t.user + t.nice + t.sys + t.irq + t.idle;
      return sum;
    },
    { busy: 0, all: 0 },
  );
}

/** The busy share between two `cpuTimes()`, percent. */
function busyShare(a, b) {
  return b.all > a.all ? (100 * (b.busy - a.busy)) / (b.all - a.all) : 0;
}

/** The whole machine's CPU busy share over `ms`, percent. */
async function cpuBusy(ms = 1000) {
  const a = cpuTimes();
  await new Promise((r) => setTimeout(r, ms));
  return busyShare(a, cpuTimes());
}

/**
 * Waits until the machine is quiet (CPU under `maxPercent` over a second)
 * or `maxMs` passes, so other work on the machine doesn't land in a load:
 * the dev server's answers and the page's parsing both need the CPU.
 */
async function quietMachine(maxPercent, maxMs = 60000) {
  const start = Date.now();
  let busy = await cpuBusy();
  while (busy >= maxPercent && Date.now() - start < maxMs) {
    busy = await cpuBusy();
  }
  return {
    waitedMs: Date.now() - start,
    cpuPercent: Math.round(busy),
    quiet: busy < maxPercent,
  };
}

/** VITE_ variables from an env file, for a child's environment only. */
function viteEnv(file) {
  if (!file) {
    return {};
  }
  const out = {};
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = /^\s*(VITE_[A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (m) {
      out[m[1]] = m[2].replace(/^(['"])(.*)\1$/, "$2");
    }
  }
  return out;
}

/** Terminal colors in a server's output. */
const ANSI = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, "g");

/** A Vite dev server for `root` on `port`, until `close()`. */
async function serveRoot(root, port, env, log) {
  const child = spawn(
    "npx",
    ["vite", "--host", "127.0.0.1", "--port", String(port), "--strictPort"],
    {
      cwd: root,
      env: { ...process.env, ...env },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  let output = "";
  const ready = new Promise((resolve, reject) => {
    const onData = (chunk) => {
      output += chunk;
      // Vite's ready line (without its colors), and the scheme it serves.
      const local = /Local:\s+(https?):\/\//.exec(output.replace(ANSI, ""));
      if (local) {
        resolve(local[1]);
      }
    };
    child.stdout.on("data", onData);
    child.stderr.on("data", onData);
    child.on("exit", (code) =>
      reject(new Error(`vite exited (${code}): ${output.slice(-500)}`)),
    );
  });
  const scheme = await ready;
  log(`serving ${root} on ${port} (${scheme})`);
  return {
    base: `${scheme}://127.0.0.1:${port}`,
    close: () =>
      new Promise((resolve) => {
        child.once("exit", resolve);
        child.kill("SIGTERM");
      }),
  };
}

function gitIn(cwd, args) {
  try {
    return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

/** The middle value (lower of the two middles for an even count). */
export function median(values) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  return sorted.length ? sorted[(sorted.length - 1) >> 1] : undefined;
}

/**
 * The configurations whose median first frame without the board is over
 * `budgetMs` (or that never drew), from a cold-start run's results. Loads
 * that started on a machine that never got quiet are left out; a
 * configuration with none left can't be judged (`cantTell`), which fails
 * the check too: rerun it on a quieter machine.
 */
export function overBudget(results, budgetMs) {
  const out = [];
  const configs = [...new Set(results.runs.map((r) => r.config))];
  for (const config of configs) {
    const runs = results.runs.filter(
      (r) => r.config === config && r.scenario === "cold-browser-no-board",
    );
    if (!runs.length) {
      continue;
    }
    const quiet = runs.filter((r) => r.background?.quiet !== false);
    if (!quiet.length) {
      out.push({ config, cantTell: true });
      continue;
    }
    const value = median(quiet.map((r) => r.metrics.firstFrameMs));
    if (value === undefined || value > budgetMs) {
      out.push({ config, firstFrameMs: value });
    }
  }
  return out;
}

/**
 * Measures, and returns the results in the store's run format: one run per
 * repetition, scene "dyno-viewer" (or the route), scenario per board
 * setting, configuration per served commit.
 */
export async function measureColdStart(opts, { root, log }) {
  const { chromium } = await import("@playwright/test");
  const channel = process.env.BENCH_CHANNEL ?? "msedge";
  const headless = !process.env.BENCH_HEADED;
  const route = String(opts.route ?? "/viewer");
  const reps = Number(opts.reps ?? 5);
  const port = Number(opts.port ?? 4101);
  const boards = String(opts.board ?? "with,without").split(",");
  // Main-thread time by category: the profiler costs a little time of its
  // own, so profiled runs say so (`cpuProfile` in the results).
  const cpuProfile = Boolean(opts.profile);
  // Each load waits for the machine to be this quiet (CPU %, --quiet).
  const quietPercent = Number(opts.quiet ?? 25);
  // `--https`: served over TLS (the dev server's DEV_HTTPS), so the
  // browser speaks HTTP/2 to it, many requests on one connection, where
  // HTTP/1.1 holds six at a time.
  const env = {
    ...viteEnv(opts["env-file"] && String(opts["env-file"])),
    ...(opts.https ? { DEV_HTTPS: "1" } : {}),
  };
  // This tree served by its own Vite unless a URL or other trees are given.
  const targets = opts.url
    ? [{ url: String(opts.url), dir: root }]
    : String(opts.roots ?? root)
        .split(",")
        .map((dir) => ({ dir }));
  const runs = [];
  const configs = targets.map((target) => {
    const sha = gitIn(target.dir, ["rev-parse", "HEAD"]);
    const dirty = gitIn(target.dir, [
      "status",
      "--porcelain",
      "--untracked-files=no",
    ]);
    // This tree is "dyno" in every run, so trends and change points follow
    // it across commits (results.commit says which); another tree is named
    // by its commit.
    const own = resolve(target.dir) === resolve(root);
    return {
      id: `dyno${own ? "" : `@${sha.slice(0, 10)}${dirty ? "+dirty" : ""}`}${opts.https || String(target.url).startsWith("https:") ? "+https" : ""}`,
      commit: sha,
      subject: gitIn(target.dir, ["log", "-1", "--format=%s"]),
      date: gitIn(target.dir, ["log", "-1", "--format=%cI"]),
    };
  });
  const open = async (target, warmLoads) => {
    const server = target.url
      ? { base: target.url.replace(/\/$/, ""), close: async () => {} }
      : await serveRoot(target.dir, port, env, log);
    // Warm the server (its module transforms), as a long-running one is.
    for (let i = 0; i < warmLoads; i++) {
      await coldLoad(chromium, `${server.base}/#${route}`, {
        channel,
        headless,
        blockWork: true,
      });
    }
    return server;
  };
  const measure = async (index, server, rep) => {
    const config = configs[index].id;
    const url = `${server.base}/#${route}`;
    // Alternate the board settings within each repetition.
    for (const board of rep % 2 ? [...boards].reverse() : boards) {
      const blockWork = board === "without";
      const background = await quietMachine(quietPercent);
      const busyBefore = cpuTimes();
      const load = await coldLoad(chromium, url, {
        channel,
        headless,
        blockWork,
        cpuProfile,
      });
      // The whole machine during the load, this load's browser included.
      background.duringPercent = Math.round(busyShare(busyBefore, cpuTimes()));
      const analysis = analyzeColdStart(load);
      const ok = load.drew;
      runs.push({
        scene: `dyno${route.replace(/\//g, "-")}`,
        sceneTitle: `Dyno's #${route}, cold browser`,
        scenario: blockWork ? "cold-browser-no-board" : "cold-browser",
        config,
        rep,
        motionSeconds: 0,
        metrics: { status: ok ? "ok" : "failed", ...analysis.metrics },
        background,
        validity: {
          verdict: !ok
            ? "invalid"
            : load.errors.length || !background.quiet
              ? "warning"
              : "valid",
          reasons: [
            ...(!ok ? ["never drew within 30 s"] : []),
            ...(!background.quiet
              ? [
                  `the machine stayed busy (CPU ${background.cpuPercent}% after ${Math.round(background.waitedMs / 1000)} s)`,
                ]
              : []),
            ...load.errors.map((e) => `console: ${e}`),
          ],
        },
        phases: analysis.phases,
        ...(load.cpu ? { cpu: load.cpu } : {}),
        frameData: analysis.frameData,
        frameDataRequests: analysis.frameDataRequests,
        duplicates: analysis.duplicates,
        failedRequests: load.failed,
        // The first repetition's requests, in order: [path, start, end].
        ...(rep === 0
          ? {
              requestLog: load.resources.map((r) => [
                requestLabel(r.name, server.base),
                Math.round(r.startTime),
                Math.round(r.responseEnd),
              ]),
            }
          : {}),
        marks: Object.fromEntries(
          Object.entries(load.marks).map(([k, v]) => [k, Math.round(v)]),
        ),
      });
      const m = analysis.metrics;
      log(
        `${config} ${blockWork ? "no board" : "board   "} rep ${rep} (CPU ${background.cpuPercent}% before, ${background.duringPercent}% during): first frame ${m.firstFrameMs ?? "never"} ms | ${analysis.phases.map((p) => `${p.name} ${p.ms}`).join(" · ")} | ${m.moduleRequests} modules, ${m.devices} device${m.devices === 1 ? "" : "s"}, ${m.pipelines} pipelines, ${m.duplicateFetches} repeated requests${
          load.cpu
            ? ` | main thread: ${Object.entries(load.cpu)
                .filter(([, v]) => v >= 10)
                .map(([k, v]) => `${k} ${v}`)
                .join(", ")}`
            : ""
        }`,
      );
    }
  };
  if (opts.interleave && targets.length > 1) {
    // Each repetition serves every tree in turn (in alternating order), so
    // a burst of other work on the machine lands on all of them alike.
    for (let rep = 0; rep < reps; rep++) {
      const order = [...targets.keys()];
      for (const index of rep % 2 ? order.reverse() : order) {
        const server = await open(targets[index], 1);
        try {
          await measure(index, server, rep);
        } finally {
          await server.close();
        }
      }
    }
  } else {
    for (const [index, target] of targets.entries()) {
      const server = await open(target, 2);
      try {
        for (let rep = 0; rep < reps; rep++) {
          await measure(index, server, rep);
        }
      } finally {
        await server.close();
      }
    }
  }
  return {
    runs,
    configs,
    browser: channel === "msedge" ? "Microsoft Edge" : channel,
    headless,
    cpuProfile,
  };
}
