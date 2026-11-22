// Measurements a program starts and watches (CS-721): `dyno measure start`
// returns a handle at once; `measure status <handle>` and `measure cancel
// <handle>` follow it. No command runs anything when a measurement ends:
// callers poll `measure status`, or read the completion record.
//
// The store (DYNO_STATE, by default ~/.cesium-bench/dyno; the fake target's
// under fake/ in it):
//   measurements/<handle>.json   the measurement: what, who asked, its state
//                                and, once it ends, its completion record
//   measurements/<handle>.log    what the measurement printed (local only)
//   events.jsonl                 one completion record per line, appended
//                                when a measurement ends
//
// A measurement's states: waiting-for-quiet (other work keeps the machine
// busy), queued (behind another of dyno's measurements), running, and the
// ends: done, failed, canceled.
//
// The local target runs each measurement in a detached worker (`measure
// _work`, below) that waits until the machine is quiet (status.mjs), then
// runs the dyno command (`suite run`, `suite images`, `suite coldstart` or
// `lab`) under the run lock. The fake target simulates one: nothing runs,
// and each `measure start`, `status` or `cancel` moves a simulated clock
// one minute and every fake measurement one step, so a sequence of calls
// always gives the same answers.
import { spawn } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import {
  appendFileSync,
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { API_VERSION, DynoError } from "./dispatch.mjs";
import {
  dataRefusals,
  dataStatus,
  lockHolder,
  machineConditions,
  machineState,
} from "./status.mjs";

/** bench/dyno.mjs. */
const DYNO = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "dyno.mjs",
);

/** What a measurement can be, and the dyno command that does it. */
export const KINDS = {
  suite: ["suite", "run"],
  images: ["suite", "images"],
  coldstart: ["suite", "coldstart"],
  lab: ["lab"],
};

export const TERMINAL = new Set(["done", "failed", "canceled"]);

/** The store's folder for a target. */
export function storeDirectory({ env = process.env, fake = false } = {}) {
  const base = env.DYNO_STATE ?? join(homedir(), ".cesium-bench", "dyno");
  return fake ? join(base, "fake") : base;
}

const recordPath = (dir, handle) => join(dir, "measurements", `${handle}.json`);

/** One measurement's record, or a problem if there is none. */
export function readMeasurement(dir, handle) {
  if (!/^[\w.-]+$/.test(handle) || !existsSync(recordPath(dir, handle))) {
    throw new DynoError("problem", `no measurement ${handle}`);
  }
  return JSON.parse(readFileSync(recordPath(dir, handle), "utf8"));
}

function save(dir, record) {
  mkdirSync(join(dir, "measurements"), { recursive: true });
  writeFileSync(
    recordPath(dir, record.handle),
    `${JSON.stringify(record, null, 2)}\n`,
  );
}

/** Every measurement on record, oldest first. */
export function listMeasurements(dir) {
  const folder = join(dir, "measurements");
  if (!existsSync(folder)) {
    return [];
  }
  return readdirSync(folder)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(readFileSync(join(folder, f), "utf8")))
    .sort(
      (a, b) =>
        a.requested.localeCompare(b.requested) ||
        a.handle.localeCompare(b.handle),
    );
}

// The fake target's clock: one minute per call, from a fixed start.
const FAKE_EPOCH = Date.parse("2026-01-01T00:00:00.000Z");

function fakeClock(dir, advance) {
  const file = join(dir, "clock.json");
  const tick = existsSync(file)
    ? JSON.parse(readFileSync(file, "utf8")).tick
    : 0;
  const next = tick + (advance ? 1 : 0);
  if (advance) {
    mkdirSync(dir, { recursive: true });
    writeFileSync(file, `${JSON.stringify({ tick: next })}\n`);
  }
  return FAKE_EPOCH + next * 60000;
}

/** The completion record: what a caller reads when a measurement ends. */
export function completion(record) {
  const duration =
    record.started && record.finished
      ? Math.round(
          (Date.parse(record.finished) - Date.parse(record.started)) / 1000,
        )
      : 0;
  return {
    api_version: API_VERSION,
    event: "measurement-finished",
    handle: record.handle,
    state: record.state,
    kind: record.kind,
    target: record.target,
    requested_by: record.requested_by,
    requested: record.requested,
    ...(record.started ? { started: record.started } : {}),
    finished: record.finished,
    duration_s: duration,
    run_id: record.result?.run_id ?? null,
    verdict: record.result?.verdict ?? null,
    exit_code: record.exit_code ?? null,
    ...(record.result?.run_id
      ? {
          result_command: `dyno result show ${record.result.run_id}${record.target === "fake" ? " --fake" : ""} --json`,
        }
      : {}),
  };
}

/** Ends a measurement: its state, its completion record and the event line. */
function finish(dir, record, state, nowIso, extra = {}) {
  Object.assign(record, extra, { state, finished: nowIso });
  record.completion = completion(record);
  save(dir, record);
  appendFileSync(
    join(dir, "events.jsonl"),
    `${JSON.stringify(record.completion)}\n`,
  );
  return record;
}

/** A deterministic number in [0, 1) from text. */
const unit = (text, salt) =>
  parseInt(
    createHash("sha256").update(`${salt}\0${text}`).digest("hex").slice(0, 8),
    16,
  ) /
  2 ** 32;

/** The fake target's result for a measurement: the same request, the same result. */
export function fakeResult(record) {
  const key = `${record.kind} ${record.args.join(" ")}`;
  const change = 0.9 + unit(key, "change") * 0.2;
  const noise = 0.01 + unit(key, "noise") * 0.03;
  const verdict =
    change - 1 > noise ? "slower" : 1 - change > noise ? "faster" : "no change";
  const baseline = Math.round((8 + unit(key, "base") * 8) * 100) / 100;
  return {
    run_id: `fake-run-${record.handle.replace(/^fake-/, "")}`,
    verdict,
    metrics: {
      cpuP50: {
        ratio: Math.round(change * 1000) / 1000,
        noise: Math.round(noise * 1000) / 1000,
        values: {
          baseline_ms: baseline,
          candidate_ms: Math.round(baseline * change * 100) / 100,
        },
      },
    },
  };
}

/** One step of the fake target's simulation, for every live fake measurement. */
function advanceFake(dir, nowIso) {
  const live = listMeasurements(dir).filter((m) => !TERMINAL.has(m.state));
  for (const m of live) {
    if (m.state === "waiting-for-quiet") {
      m.fake.wait -= 1;
      if (m.fake.wait <= 0) {
        m.state = "queued";
      }
      save(dir, m);
    }
  }
  const running = live.find((m) => m.state === "running");
  if (running) {
    running.fake.steps -= 1;
    if (running.fake.steps <= 0) {
      const outcome = running.fake.outcome;
      finish(dir, running, outcome, nowIso, {
        exit_code: outcome === "done" ? 0 : 1,
        result: outcome === "done" ? fakeResult(running) : undefined,
      });
    } else {
      save(dir, running);
    }
  }
  promoteFake(dir, nowIso);
}

/** Starts the first queued fake measurement when none runs. */
function promoteFake(dir, nowIso) {
  const live = listMeasurements(dir).filter((m) => !TERMINAL.has(m.state));
  if (live.some((m) => m.state === "running")) {
    return;
  }
  const next = live.find((m) => m.state === "queued");
  if (next) {
    next.state = "running";
    next.started = nowIso;
    save(dir, next);
  }
}

/** The handle a new measurement gets. */
function newHandle(dir, fake, now) {
  if (fake) {
    const n = listMeasurements(dir).length + 1;
    return `fake-${String(n).padStart(4, "0")}`;
  }
  const stamp = new Date(now).toISOString().replace(/[:.]/g, "-");
  return `m-${stamp}-${randomBytes(2).toString("hex")}`;
}

/** Who asked: the command line, unless --caller names a program. */
const requestedBy = (opts, env) =>
  opts.caller
    ? { via: "caller", caller: String(opts.caller) }
    : { via: env.DYNO_VIA ?? "cli" };

/**
 * Starts a measurement. `kind` is a key of KINDS, `args` its command's
 * arguments (checked by the caller). Refuses on out-of-date data and, with
 * `noQueue`, on a machine that isn't quiet.
 */
export async function startMeasurement({
  kind,
  args,
  opts = {},
  env = process.env,
  fake = false,
  spawnWorker = spawnLocalWorker,
}) {
  const dir = storeDirectory({ env, fake });
  const data = await dataStatus({ fake, env });
  const refusals = dataRefusals(data);
  if (refusals.length) {
    throw new DynoError("refused", `out-of-date data: ${refusals.join(" ")}`, {
      out_of_date: data.out_of_date,
    });
  }
  const now = fake ? fakeClock(dir, true) : Date.now();
  const nowIso = new Date(now).toISOString();
  if (opts["no-queue"]) {
    const state = measureStatus({ env, fake, advance: false });
    if (state.state !== "quiet" || !state.machine.quiet_enough) {
      throw new DynoError(
        "refused",
        `the machine isn't quiet (${state.state}${state.machine.reasons.length ? `; ${state.machine.reasons.join("; ")}` : ""}); --no-queue: not queuing`,
        { state: state.state },
      );
    }
  }
  const record = {
    api_version: API_VERSION,
    handle: newHandle(dir, fake, now),
    kind,
    args,
    target: fake ? "fake" : "local",
    requested_by: requestedBy(opts, env),
    requested: nowIso,
    state: "queued",
  };
  if (fake) {
    const wait = Number(opts["fake-wait"] ?? 0);
    const steps = Number(opts["fake-steps"] ?? 2);
    const outcome = String(opts["fake-outcome"] ?? "done");
    if (
      !Number.isInteger(wait) ||
      wait < 0 ||
      !Number.isInteger(steps) ||
      steps < 1
    ) {
      throw new DynoError(
        "usage",
        "--fake-wait is a whole number ≥ 0, --fake-steps ≥ 1",
      );
    }
    if (!["done", "failed"].includes(outcome)) {
      throw new DynoError(
        "usage",
        `--fake-outcome: done or failed, not "${outcome}"`,
      );
    }
    record.fake = { wait, steps, outcome };
    record.state = wait > 0 ? "waiting-for-quiet" : "queued";
    save(dir, record);
    promoteFake(dir, nowIso);
  } else {
    save(dir, record);
    record.worker_pid = spawnWorker(dir, record, env);
    save(dir, record);
  }
  return describeMeasurement(readMeasurement(dir, record.handle), now);
}

/** A measurement as `measure status` reports it (values only in `result show --values`). */
export function describeMeasurement(record, now) {
  const since = record.started ?? record.requested;
  return {
    handle: record.handle,
    kind: record.kind,
    args: record.args,
    target: record.target,
    state: record.state,
    requested_by: record.requested_by,
    requested: record.requested,
    ...(record.started ? { started: record.started } : {}),
    ...(record.finished ? { finished: record.finished } : {}),
    for_seconds: Math.max(
      0,
      Math.round(
        ((record.finished ? Date.parse(record.finished) : now) -
          Date.parse(since)) /
          1000,
      ),
    ),
    run_id: record.result?.run_id ?? null,
    verdict: record.result?.verdict ?? null,
    completion: record.completion ?? null,
    status_command: `dyno measure status ${record.handle}${record.target === "fake" ? " --fake" : ""} --json`,
  };
}

/** One measurement's status; the fake target moves one step first. */
export function measurementStatus({ handle, env = process.env, fake = false }) {
  const dir = storeDirectory({ env, fake });
  readMeasurement(dir, handle);
  let now = Date.now();
  if (fake) {
    now = fakeClock(dir, true);
    advanceFake(dir, new Date(now).toISOString());
  } else {
    reapLocal(dir, handle, now);
  }
  return describeMeasurement(readMeasurement(dir, handle), now);
}

/** Cancels a measurement that hasn't ended. */
export function cancelMeasurement({ handle, env = process.env, fake = false }) {
  const dir = storeDirectory({ env, fake });
  const record = readMeasurement(dir, handle);
  const now = fake ? fakeClock(dir, true) : Date.now();
  const nowIso = new Date(now).toISOString();
  if (TERMINAL.has(record.state)) {
    return { canceled: false, ...describeMeasurement(record, now) };
  }
  if (!fake && record.worker_pid && alive(record.worker_pid)) {
    // The worker leads its own process group, with the run under it.
    try {
      process.kill(-record.worker_pid, "SIGTERM");
    } catch {
      // Already gone.
    }
  }
  finish(dir, record, "canceled", nowIso);
  if (fake) {
    promoteFake(dir, nowIso);
  }
  return {
    canceled: true,
    ...describeMeasurement(readMeasurement(dir, handle), now),
  };
}

function alive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error.code === "EPERM";
  }
}

/** A local measurement whose worker died without ending it: failed. */
function reapLocal(dir, handle, now) {
  const record = readMeasurement(dir, handle);
  if (
    !TERMINAL.has(record.state) &&
    record.worker_pid &&
    !alive(record.worker_pid)
  ) {
    finish(dir, record, "failed", new Date(now).toISOString(), {
      error: "its worker ended without finishing it",
    });
  }
}

/**
 * The machine's state (status.mjs) with the target's live measurements:
 * `dyno status`. `advance: false` reads the fake target without moving it.
 */
export function measureStatus({
  env = process.env,
  fake = false,
  advance = false,
} = {}) {
  const dir = storeDirectory({ env, fake });
  let now = Date.now();
  if (fake) {
    now = fakeClock(dir, advance);
    if (advance) {
      advanceFake(dir, new Date(now).toISOString());
    }
  } else {
    for (const m of listMeasurements(dir).filter(
      (r) => !TERMINAL.has(r.state),
    )) {
      reapLocal(dir, m.handle, now);
    }
  }
  const live = listMeasurements(dir).filter((m) => !TERMINAL.has(m.state));
  const conditions = fake
    ? {
        load: { one_minute: 0.5, cores: 8, per_core: 0.06, quiet_below: 0.3 },
        power: "ac",
        thermal: "nominal",
        gpu_use: "not measured",
        quiet_enough: true,
        reasons: [],
      }
    : machineConditions({ env });
  const state = machineState({
    holder: fake ? undefined : lockHolder({ env }),
    measurements: live,
    now,
    conditions,
  });
  return {
    target: fake ? "fake" : "local",
    state: state.state,
    current: state.current,
    waiting: state.waiting,
    machine: conditions,
    now: new Date(now).toISOString(),
    events: join(dir, "events.jsonl"),
  };
}

/** Starts the detached worker for a local measurement; returns its pid. */
function spawnLocalWorker(dir, record, env) {
  const log = join(dir, "measurements", `${record.handle}.log`);
  const fd = openSync(log, "a");
  try {
    const child = spawn(
      process.execPath,
      [DYNO, "measure", "_work", record.handle],
      {
        detached: true,
        stdio: ["ignore", fd, fd],
        env: { ...env, DYNO_STATE: env.DYNO_STATE ?? join(dir) },
      },
    );
    child.unref();
    return child.pid;
  } finally {
    closeSync(fd);
  }
}

/** Runs the measurement's dyno command, reading its JSON answer. */
function runDynoCommand(record, env, log) {
  return new Promise((resolve) => {
    const child = spawn(
      process.execPath,
      [DYNO, ...KINDS[record.kind], ...record.args, "--json"],
      {
        stdio: ["ignore", "pipe", "pipe"],
        env: {
          ...env,
          DYNO_VIA: record.requested_by.via,
          ...(record.requested_by.caller
            ? { DYNO_CALLER: record.requested_by.caller }
            : {}),
          DYNO_MEASUREMENT: record.handle,
        },
      },
    );
    let out = "";
    child.stdout.on("data", (chunk) => {
      out += chunk;
    });
    child.stderr.on("data", (chunk) => log(String(chunk)));
    child.on("exit", (code) => {
      let answer = {};
      try {
        answer = JSON.parse(out);
      } catch {
        log(out);
      }
      resolve({ code: code ?? 1, answer });
    });
  });
}

/**
 * The local worker: waits for a quiet machine, runs the measurement, ends
 * it. `runCommand`, `quiet` and `pollMs` are for tests.
 */
export async function work({
  handle,
  env = process.env,
  runCommand = runDynoCommand,
  quiet = () => {
    const status = measureStatus({ env });
    const others = status.current && status.current.handle !== handle;
    return {
      quiet: !others && status.machine.quiet_enough,
      others,
      reasons: status.machine.reasons,
    };
  },
  pollMs = 15000,
  log = (text) => process.stdout.write(text),
}) {
  const dir = storeDirectory({ env });
  for (;;) {
    if (TERMINAL.has(readMeasurement(dir, handle).state)) {
      return readMeasurement(dir, handle);
    }
    const gate = quiet();
    // Read again: a cancel may have come while the machine was checked.
    const record = readMeasurement(dir, handle);
    if (TERMINAL.has(record.state)) {
      return record;
    }
    if (gate.quiet) {
      break;
    }
    const state = gate.others ? "queued" : "waiting-for-quiet";
    if (record.state !== state) {
      record.state = state;
      save(dir, record);
      log(
        `${state}: ${gate.others ? "another measurement runs" : gate.reasons.join("; ")}\n`,
      );
    }
    await new Promise((r) => setTimeout(r, pollMs));
  }
  const record = readMeasurement(dir, handle);
  record.state = "running";
  record.started = new Date().toISOString();
  save(dir, record);
  const { code, answer } = await runCommand(record, env, log);
  const latest = readMeasurement(dir, handle);
  if (TERMINAL.has(latest.state)) {
    // Canceled while it ran.
    return latest;
  }
  return finish(
    dir,
    latest,
    code === 0 ? "done" : "failed",
    new Date().toISOString(),
    {
      exit_code: code,
      result: {
        run_id: answer.run_id ?? null,
        verdict: answer.ok === undefined ? null : answer.ok ? "ran" : "failed",
        ...(answer.results ? { results: answer.results } : {}),
        ...(answer.file ? { file: answer.file } : {}),
      },
    },
  );
}
