// What dyno knows about this machine (CS-721): `dyno status` (busy, waiting
// for quiet, or quiet, and who started the current measurement), `dyno data
// status` (setup's datasets against the formats this code reads, CS-724) and
// `dyno storage status` (the stores outside the repository).
//
// The three states, for the machine and each target dyno controls:
//   busy               a measurement runs (dyno's run lock is held, or a
//                      measurement started with `measure start` runs);
//   waiting-for-quiet  a measurement is queued behind other work: callers
//                      start no heavy work (tests, builds) and let what runs
//                      finish, so the measurement isn't starved;
//   quiet              no measurement runs or waits.
// The machine's own conditions (load, power, thermal state) say whether a
// queued measurement may start: `machine.quiet_enough`.
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { cpus, homedir, loadavg } from "node:os";
import { join } from "node:path";
import process from "node:process";
import { defaultLockFile, processAlive } from "../runLock.mjs";

/** The datasets setup and the sky builder write, for the fake target. */
const FAKE_DATASETS = [
  ["sky", "sky pack", 2, "npm run sky -- build"],
  ["frames", "frames data", 1, "npm run setup"],
  ["designTiles", "design globe tiles", 1, "npm run setup"],
  ["smlib", "SMLib build", 1, "npm run setup"],
  ["occt", "Open CASCADE build", 1, "npm run setup"],
  ["slangc", "Slang compiler", 1, "npm run setup"],
  ["slangWasm", "Slang WebAssembly build", 1, "npm run setup"],
  ["step", "STEP samples", 1, "npm run setup"],
];

/**
 * Each dataset's recorded format against the one this code reads, with the
 * command that fixes it (CS-724's records). The fake target's are all
 * current except those DYNO_FAKE_STALE names (a comma-separated list).
 */
export async function dataStatus({ fake = false, env = process.env } = {}) {
  let rows;
  if (fake) {
    const stale = new Set(
      (env.DYNO_FAKE_STALE ?? "").split(",").filter(Boolean),
    );
    rows = FAKE_DATASETS.map(([name, label, format, command]) =>
      stale.has(name)
        ? {
            name,
            label,
            state: "outOfDate",
            found: format - 1 || 0,
            expected: format,
            fix: command,
            message: `${label}: out of date, run \`${command}\` (built as format ${format - 1 || 0}, this code reads format ${format}).`,
          }
        : {
            name,
            label,
            state: "current",
            found: format,
            expected: format,
            fix: command,
          },
    );
  } else {
    const { datasetStatuses } = await import("../../../scripts/dataStatus.mjs");
    const { DATASETS } = await import("../../../scripts/dataFormats.mjs");
    rows = datasetStatuses().map((s) => ({
      name: s.name,
      label: DATASETS[s.name]?.label ?? s.name,
      state: s.state,
      ...(s.found !== undefined ? { found: s.found } : {}),
      expected: s.expected,
      fix: DATASETS[s.name]?.command,
      ...(s.message ? { message: s.message } : {}),
    }));
  }
  return {
    datasets: rows,
    out_of_date: rows.filter((r) => r.state === "outOfDate").map((r) => r.name),
    missing: rows.filter((r) => r.state === "missing").map((r) => r.name),
  };
}

/** Why measuring is refused now (out-of-date data), as sentences. */
export function dataRefusals(data) {
  return data.datasets
    .filter((r) => r.state === "outOfDate")
    .map((r) => r.message);
}

const run = (file, args) => {
  try {
    return execFileSync(file, args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 5000,
    });
  } catch {
    return undefined;
  }
};

/**
 * The machine's conditions for a measurement: load per core against the
 * quiet level (DYNO_QUIET_LOAD, 0.3 by default), the power source and the
 * thermal state (macOS's pmset; elsewhere unknown). Other GPU use isn't
 * measured yet.
 */
export function machineConditions({ env = process.env } = {}) {
  const cores = cpus().length;
  const [one] = loadavg();
  const quietBelow = Number(env.DYNO_QUIET_LOAD ?? 0.3);
  const reasons = [];
  // Windows has no load average (Node reports 0).
  const load =
    process.platform === "win32"
      ? { one_minute: null, cores, per_core: null, quiet_below: quietBelow }
      : {
          one_minute: Math.round(one * 100) / 100,
          cores,
          per_core: Math.round((one / cores) * 100) / 100,
          quiet_below: quietBelow,
        };
  if (load.per_core !== null && load.per_core >= quietBelow) {
    reasons.push(
      `load ${load.one_minute} on ${cores} cores (${load.per_core} per core, quiet below ${quietBelow})`,
    );
  }
  let power = "unknown";
  let thermal = "unknown";
  if (process.platform === "darwin") {
    const batt = run("pmset", ["-g", "batt"]);
    if (batt) {
      power = /AC Power/.test(batt)
        ? "ac"
        : /Battery Power/.test(batt)
          ? "battery"
          : "unknown";
    }
    const therm = run("pmset", ["-g", "therm"]);
    if (therm !== undefined) {
      const limit = /CPU_Speed_Limit\s*=\s*(\d+)/.exec(therm);
      thermal = limit && Number(limit[1]) < 100 ? "limited" : "nominal";
    }
  }
  if (power === "battery") {
    reasons.push("on battery power");
  }
  if (thermal === "limited") {
    reasons.push("thermally limited");
  }
  return {
    load,
    power,
    thermal,
    gpu_use: "not measured",
    quiet_enough: reasons.length === 0,
    reasons,
  };
}

/** The run lock's holder, if a live process holds it. */
export function lockHolder({ env = process.env } = {}) {
  const file = defaultLockFile(env);
  if (!existsSync(file)) {
    return undefined;
  }
  try {
    const holder = JSON.parse(readFileSync(file, "utf8"));
    return processAlive(holder.pid) ? { ...holder, file } : undefined;
  } catch {
    return undefined;
  }
}

const seconds = (from, now) =>
  Math.max(0, Math.round((now - Date.parse(from)) / 1000));

/**
 * The machine's state and the measurements behind it. `measurements` is
 * the measure store's live records (measure.mjs) and `now` its clock (the
 * fake target's is simulated).
 */
export function machineState({ holder, measurements, now, conditions }) {
  const running = measurements.find((m) => m.state === "running");
  const waiting = measurements.filter(
    (m) => m.state === "waiting-for-quiet" || m.state === "queued",
  );
  let current = null;
  if (running) {
    current = {
      handle: running.handle,
      kind: running.kind,
      via: running.requested_by.via,
      ...(running.requested_by.caller
        ? { caller: running.requested_by.caller }
        : {}),
      since: running.started,
      for_seconds: seconds(running.started, now),
    };
  } else if (holder) {
    current = {
      ...(holder.measurement ? { handle: holder.measurement } : {}),
      command: holder.command,
      via: holder.via ?? "cli",
      ...(holder.caller ? { caller: holder.caller } : {}),
      ...(holder.item ? { item: holder.item } : {}),
      ...(holder.worktree ? { worktree: holder.worktree } : {}),
      pid: holder.pid,
      since: holder.start,
      for_seconds: seconds(holder.start, now),
    };
  }
  const state = current
    ? "busy"
    : waiting.length
      ? "waiting-for-quiet"
      : "quiet";
  return {
    state,
    current,
    waiting: waiting.map((m) => ({
      handle: m.handle,
      kind: m.kind,
      state: m.state,
      via: m.requested_by.via,
      ...(m.requested_by.caller ? { caller: m.requested_by.caller } : {}),
      since: m.requested,
      for_seconds: seconds(m.requested, now),
    })),
    conditions,
  };
}

/** The size and file count of a folder, walking it. */
function folderSize(directory) {
  let bytes = 0;
  let files = 0;
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(path);
      } else if (entry.isFile()) {
        bytes += statSync(path).size;
        files++;
      }
    }
  };
  walk(directory);
  return { bytes, files };
}

/** The stores dyno reads and writes, outside the repository. */
export async function storageStatus({ env = process.env, fake = false } = {}) {
  const bench = join(homedir(), ".cesium-bench");
  const stores = fake
    ? [
        { name: "results", path: "/fake/results" },
        { name: "datasets", path: "/fake/datasets" },
        { name: "servers", path: "/fake/servers" },
        { name: "measurements", path: "/fake/dyno" },
      ]
    : [
        { name: "results", path: env.BENCH_RESULTS ?? join(bench, "results") },
        {
          name: "datasets",
          path: (await import("../store.mjs")).storeDirectory(),
        },
        { name: "servers", path: env.DYNO_SERVERS ?? join(bench, "servers") },
        { name: "measurements", path: env.DYNO_STATE ?? join(bench, "dyno") },
      ];
  return {
    stores: stores.map((s, i) => {
      if (fake) {
        return { ...s, exists: true, bytes: 1000 * (i + 1), files: i + 1 };
      }
      if (!existsSync(s.path)) {
        return { ...s, exists: false, bytes: 0, files: 0 };
      }
      return { ...s, exists: true, ...folderSize(s.path) };
    }),
  };
}

/** Bytes as a person reads them. */
export function bytesLabel(bytes) {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n < 10 && i > 0 ? n.toFixed(1) : Math.round(n)} ${units[i]}`;
}
