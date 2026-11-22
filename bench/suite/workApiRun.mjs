// A Dyno run of the Work board's read (CS-704): how long the dev server's
// `/work-api/query.json` and `/work-api/count.json` take, on the first
// request after the server starts and warm, on today's tracker and on one
// ten times its size. The results land in Dyno's results store like any
// run (BENCH_RESULTS, default ~/.cesium-bench/results), with one record per
// request: scene "work-board-read", the scenario says which request, the
// configuration which tracker, and `requestMs` the time to the whole answer.
//
//   node bench/suite/workApiRun.mjs [--configs live,today,ten-times]
//        [--cold 3] [--warm 20] [--note "what changed"] [--tag a,b] [--keep]
//
// Configurations:
//   live       this worktree's repository and hitld's private store as they
//              are (read only), the owner's case.
//   today      a copy: a repository sharing this one's objects, with its
//              local branches and refs/hitld/*, and a copy of the store's
//              files without its worktrees, private terms and git history.
//   ten-times  the same with every branch but the main one copied nine
//              more times (hitld/* copies stay under hitld/) and the
//              ledger's events nine more times, as older events.
// The copies go in a temporary folder, removed afterwards unless --keep.
// Nothing is written to the repository or the store.
//
// Each cold repetition starts a fresh dev server (only the work-api plugin,
// on port 4100) in a child process, so nothing is cached in memory:
//   first-request   the first /work-api/query.json, as a page would send it
//   first-complete  until an answer has every source read (an answer may
//                   say some are still being read; the page then reads
//                   again when the server says the work changed)
//   count-first     the first /work-api/count.json, on another fresh server
// and after the first complete answer, on the same server:
//   warm            /work-api/query.json, every 250 ms
//   count-warm      /work-api/count.json, every 250 ms

import { execFileSync, spawn } from "node:child_process";
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import {
  arch,
  cpus,
  homedir,
  platform,
  release,
  tmpdir,
  totalmem,
} from "node:os";
import { dirname, join } from "node:path";
import { performance } from "node:perf_hooks";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { renderReport, summarizeRun } from "./report.mjs";
import { conditions } from "./telemetry.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const pkg = join(here, "..", "..");
const PORT = 4100;
const SCENE = "work-board-read";
const SCENE_TITLE = "Work board read (/work-api/query.json, /work-api/count.json)";

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};

// ------------------------------------------------------------ child: a server

if (args[0] === "--child") {
  // argv: --child <root of packages/next in the repository read>
  const { createServer } = await import("vite");
  const { workApi } = await import(
    pathToFileURL(join(pkg, "scripts", "vitePluginWork.ts")).href
  );
  const server = await createServer({
    root: args[1],
    configFile: false,
    appType: "custom",
    plugins: [workApi()],
    server: { port: PORT, strictPort: true, host: "127.0.0.1" },
    optimizeDeps: { noDiscovery: true, include: [] },
    logLevel: "error",
  });
  await server.listen();
  process.stdout.write(`ready http://127.0.0.1:${PORT}\n`);
  process.on("SIGTERM", () => void server.close().then(() => process.exit(0)));
  await new Promise(() => {});
}

// ------------------------------------------------------------ fixtures

const git = (cwd, a, input) =>
  execFileSync("git", a, {
    cwd,
    encoding: "utf8",
    input,
    maxBuffer: 1 << 28,
    stdio: [input === undefined ? "ignore" : "pipe", "pipe", "pipe"],
  }).trim();

const repoRoot = git(pkg, ["rev-parse", "--show-toplevel"]);
const policy = JSON.parse(
  readFileSync(join(repoRoot, ".human-in-the-lead", "policy.json"), "utf8"),
);
const projectId = policy.project.id;
const mainBranch = policy.merge?.main_branch ?? "main";
const storeOf = (xdg) => join(xdg, "human-in-the-lead", projectId);
const realStore = storeOf(
  process.env.XDG_DATA_HOME ?? join(homedir(), ".local", "share"),
);

/**
 * A repository and store `times` the size of today's, in `dir`: returns
 * the packages/next folder to serve and the XDG_DATA_HOME to point hitld at.
 */
function fixture(dir, times) {
  const repo = join(dir, "repo");
  mkdirSync(repo, { recursive: true });
  git(repo, ["init", "-q"]);
  const objects = join(
    git(repoRoot, ["rev-parse", "--path-format=absolute", "--git-common-dir"]),
    "objects",
  );
  writeFileSync(join(repo, ".git", "objects", "info", "alternates"), `${objects}\n`);
  const refs = git(repoRoot, [
    "for-each-ref",
    "--format=%(objectname) %(refname)",
    "refs/heads",
    "refs/hitld",
  ])
    .split("\n")
    .filter(Boolean)
    .map((l) => l.split(" "));
  const lines = [];
  let main;
  for (const [sha, ref] of refs) {
    lines.push(`create ${ref} ${sha}`);
    if (ref === `refs/heads/${mainBranch}`) {
      main = sha;
      continue;
    }
    if (!ref.startsWith("refs/heads/")) {
      continue;
    }
    const name = ref.slice("refs/heads/".length);
    for (let k = 1; k < times; k++) {
      lines.push(
        `create ${
          name.startsWith("hitld/")
            ? `refs/heads/hitld/x${k}-${name.slice(6)}`
            : `refs/heads/x${k}/${name}`
        } ${sha}`,
      );
    }
  }
  git(repo, ["update-ref", "--stdin"], `${lines.join("\n")}\n`);
  git(repo, ["-c", "advice.detachedHead=false", "checkout", "-q", "-b", "fixture", main]);

  const xdg = join(dir, "xdg");
  const store = storeOf(xdg);
  mkdirSync(store, { recursive: true });
  const skip = new Set(["worktrees", "private", ".git", "ledger.jsonl"]);
  for (const name of readdirSync(realStore)) {
    if (!skip.has(name)) {
      cpSync(join(realStore, name), join(store, name), { recursive: true });
    }
  }
  const ledger = readFileSync(join(realStore, "ledger.jsonl"), "utf8")
    .split("\n")
    .filter(Boolean);
  const out = [];
  for (let k = times - 1; k >= 1; k--) {
    for (const line of ledger) {
      const e = JSON.parse(line);
      out.push(JSON.stringify({ ...e, id: `${e.id}~x${k}` }));
    }
  }
  out.push(...ledger);
  writeFileSync(join(store, "ledger.jsonl"), `${out.join("\n")}\n`);
  return {
    root: join(repo, "packages", "next"),
    xdg,
    branches: refs.filter(([, r]) => r.startsWith("refs/heads/")).length * times -
      (times - 1),
    events: out.length,
  };
}

// ------------------------------------------------------------ measuring

async function startServer(root, xdg) {
  const child = spawn(process.execPath, [fileURLToPath(import.meta.url), "--child", root], {
    cwd: pkg,
    env: xdg ? { ...process.env, XDG_DATA_HOME: xdg } : process.env,
    stdio: ["ignore", "pipe", "inherit"],
  });
  const base = await new Promise((resolve, reject) => {
    let out = "";
    child.stdout.on("data", (d) => {
      out += d;
      const m = /ready (\S+)/.exec(out);
      if (m) {
        resolve(m[1]);
      }
    });
    child.on("exit", (code) => reject(new Error(`server exited ${code}`)));
  });
  return {
    base,
    stop: () =>
      new Promise((r) => {
        child.removeAllListeners("exit");
        child.on("exit", r);
        child.kill("SIGTERM");
      }),
  };
}

/** One request: its time to the whole answer, and what it said. */
async function request(base, path) {
  const t0 = performance.now();
  const res = await fetch(`${base}${path}`);
  const body = await res.json().catch(() => undefined);
  return { ms: performance.now() - t0, status: res.status, body };
}

/** The sources an answer says are still being read (none before CS-704). */
const pendingOf = (body) => body?.pending ?? [];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function measure(config, root, xdg, cold, warm) {
  const runs = [];
  const record = (scenario, rep, r, extra = {}) => {
    runs.push({
      scene: SCENE,
      sceneTitle: SCENE_TITLE,
      group: "tooling",
      scenario,
      config,
      engine: config,
      rep,
      metrics:
        r.status === 200
          ? { status: "ok", requestMs: r.ms }
          : { status: `http ${r.status}` },
      validity: { verdict: "valid" },
      pending: pendingOf(r.body),
      ...extra,
    });
    console.log(
      `${config.padEnd(10)} ${scenario.padEnd(15)} #${rep} ${r.status} ${r.ms.toFixed(0)} ms${
        pendingOf(r.body).length ? ` (still reading: ${pendingOf(r.body).join(", ")})` : ""
      }`,
    );
  };
  for (let rep = 0; rep < cold; rep++) {
    let server = await startServer(root, xdg);
    try {
      const first = await request(server.base, "/work-api/query.json");
      record("first-request", rep, first);
      let complete = first;
      const t0 = performance.now() - first.ms;
      while (complete.status === 200 && pendingOf(complete.body).length) {
        await sleep(100);
        complete = await request(server.base, "/work-api/query.json");
      }
      record("first-complete", rep, { ...complete, ms: performance.now() - t0 });
      if (rep === 0) {
        for (let i = 0; i < warm; i++) {
          await sleep(250);
          record("warm", i, await request(server.base, "/work-api/query.json"));
        }
        for (let i = 0; i < warm; i++) {
          await sleep(250);
          record("count-warm", i, await request(server.base, "/work-api/count.json"));
        }
      }
    } finally {
      await server.stop();
    }
    server = await startServer(root, xdg);
    try {
      record("count-first", rep, await request(server.base, "/work-api/count.json"));
    } finally {
      await server.stop();
    }
  }
  return runs;
}

// ------------------------------------------------------------ the run

const configs = opt("configs", "live,today,ten-times").split(",");
const cold = Number(opt("cold", "3"));
const warm = Number(opt("warm", "20"));
const tmp = mkdtempSync(join(tmpdir(), "work-api-run-"));
const sizes = {};
const runs = [];
try {
  for (const config of configs) {
    if (config === "live") {
      sizes.live = {
        branches: git(repoRoot, ["for-each-ref", "refs/heads"]).split("\n").length,
        events: readFileSync(join(realStore, "ledger.jsonl"), "utf8")
          .split("\n")
          .filter(Boolean).length,
      };
      runs.push(...(await measure(config, pkg, undefined, cold, warm)));
      continue;
    }
    const times = config === "ten-times" ? 10 : 1;
    const f = fixture(join(tmp, config), times);
    sizes[config] = { branches: f.branches, events: f.events };
    console.log(`${config}: ${f.branches} branches, ${f.events} ledger events`);
    runs.push(...(await measure(config, f.root, f.xdg, cold, warm)));
  }
} finally {
  if (!args.includes("--keep")) {
    rmSync(tmp, { recursive: true, force: true });
  } else {
    console.log(`kept ${tmp}`);
  }
}

const started = new Date();
const results = {
  date: started.toISOString(),
  commit: git(pkg, ["rev-parse", "HEAD"]),
  subject: git(pkg, ["log", "-1", "--format=%s"]),
  branch: git(pkg, ["rev-parse", "--abbrev-ref", "HEAD"]),
  note: opt("note", ""),
  baseline: configs[0],
  candidate: configs.at(-1),
  tags: ["work-api", ...(opt("tag") ? opt("tag").split(",") : [])],
  dirty: git(pkg, ["status", "--porcelain"]).length > 0,
  served: "dev",
  command: ["node", "bench/suite/workApiRun.mjs", ...args],
  workApi: { sizes, cold, warm, port: PORT },
  environment: {
    os: `${platform()} ${release()} (${arch()})`,
    cpu: cpus()[0]?.model,
    cores: cpus().length,
    memoryGiB: Math.round(totalmem() / 2 ** 30),
    tools: { node: process.version },
    ...conditions(),
  },
  runs,
};
const dir = process.env.BENCH_RESULTS ?? join(homedir(), ".cesium-bench", "results");
mkdirSync(dir, { recursive: true });
const stamp = results.date.replace(/[:.]/g, "-");
writeFileSync(join(dir, `${stamp}.json`), JSON.stringify(results, null, 1));
writeFileSync(
  join(dir, `${stamp}.summary.json`),
  JSON.stringify(summarizeRun(results), null, 1),
);
writeFileSync(join(dir, `${stamp}.html`), renderReport(results));
console.log(`run ${stamp}`);
// Medians, for the log.
for (const config of configs) {
  for (const scenario of [
    "first-request",
    "first-complete",
    "warm",
    "count-first",
    "count-warm",
  ]) {
    const v = runs
      .filter((r) => r.config === config && r.scenario === scenario && r.metrics.requestMs)
      .map((r) => r.metrics.requestMs)
      .sort((a, b) => a - b);
    if (v.length) {
      console.log(
        `${config.padEnd(10)} ${scenario.padEnd(15)} median ${v[v.length >> 1].toFixed(0)} ms, max ${v.at(-1).toFixed(0)} ms (n=${v.length})`,
      );
    }
  }
}
