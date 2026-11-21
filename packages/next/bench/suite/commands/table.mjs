// dyno's commands (CS-721): one entry per command, with its usage, its
// options and the function that runs it. The dispatcher (dispatch.mjs)
// reads this table for parsing, --help and `capabilities`.
//
// To add a command, add an entry; its module loads only when it runs. To
// add an option to a suite command (say CS-393's settings for `suite run`),
// add it to that command's options below: an option not listed is refused.
// A planned command has `planned: "<item>"`: it is listed, and running it
// exits 3 and names the item that builds it.
import process from "node:process";
import { settingsList } from "../settings.mjs";
import {
  API_VERSION,
  DynoError,
  EXIT_MEANINGS,
  describe,
} from "./dispatch.mjs";

/** A planned command no item builds yet. */
const NO_ITEM = "no item yet; today, dyno suite compare and dyno suite alerts";

const o = (help, value, extra = {}) => ({
  help,
  ...(value ? { value } : {}),
  ...extra,
});

/** Options every run takes: what it is for, and the lock (identity.mjs, runLock.mjs). */
const RUN_IDENTITY = {
  purpose: o(
    "dev (default) or baseline: a baseline only from a clean tree on the integration branch",
    "dev|baseline",
  ),
  item: o("the work item the run is for", "CS-n"),
  study: o("the study the run belongs to", "id"),
  note: o("what changed", "text"),
  tag: o("tags", "a,b"),
  "no-wait": o("exit instead of waiting for another run's lock"),
};

/** The suite's commands' options (suite.mjs reads them). */
const SUITE_OPTIONS = {
  list: {},
  verify: {},
  fetch: {},
  run: {
    ...RUN_IDENTITY,
    scenes: o("scenes to run", "a,b"),
    engines: o("engines, e.g. 1.146.0,2.0,2.0@main,2.0+sse=32", "list"),
    scenarios: o("scenarios", "cold-orbit,warm-orbit"),
    reps: o("repetitions", "n"),
    motion: o("seconds in motion", "s"),
    baseline: o("the baseline engine", "engine"),
    candidate: o("the candidate engine", "engine"),
    releases: o("a historical sweep: a range or a list", "1.120.0..1.146.0"),
    dpr: o("device pixel ratio", "n"),
    "pixel-ratio": o("render scale", "device|1"),
    sweep: o(
      "a sweep axis: a setting and its values; repeat it for a grid",
      "setting=v1,v2",
      { repeatable: true },
    ),
    "sweep-file": o(
      'axes and, for grids that aren\'t products, points: {"axes":[{"id","values"}],"points"?:[…]}',
      "file.json",
    ),
    reference: o(
      "the sweep's reference: a swept value, or a setting outside the grid",
      "setting=value",
    ),
    "reference-reps": o(
      "how often each reference point runs per repetition (the noise floor)",
      "n",
    ),
    yes: o("run a sweep of more than 60 browser runs"),
    "sweep-engines": o("the engines the sweep applies to", "list"),
    "motion-samples": o("frames in motion", "n"),
    "no-motion-quality": o("skip quality in motion"),
    tier: o(
      "the occasion: scenarios, repetitions and motion quality",
      "quick|standard|full",
    ),
    areas: o("the scenes of these areas", "a,b"),
    changed: o(
      "the scenes of the areas the files changed since ref fall in",
      "ref",
      { optional: true },
    ),
    "no-reuse": o("measure every repetition again"),
    "reuse-days": o("how old a reused repetition may be", "days"),
    "no-early-stop": o("run every repetition"),
    "min-reps": o("repetitions before an early stop", "n"),
    dev: o(
      "the live tree on Vite's dev server instead of a frozen production build",
    ),
    "against-base": o("this tree against its base commit"),
    primary: o("the metric the run is meant to move", "metric"),
    guardrails: o("metrics that must not get worse", "a,b"),
    hypothesis: o("what the run expects", "text"),
    tolerance: o("the guardrails' tolerance", "fraction"),
    "no-capture": o("no filmstrips"),
    configs: o("(replaced by --engines)", "list", { hidden: true }),
    cesium: o("(replaced by --engines)", "list", { hidden: true }),
  },
  images: {
    ...RUN_IDENTITY,
    "against-base": o(
      "(refused: image checks run the working tree)",
      undefined,
      { hidden: true },
    ),
    scenes: o("scenes", "a,b"),
    scenarios: o("scenarios", "a,b"),
    engine: o("the engine checked", "engine"),
    parity: o("also compare against the parity engine"),
    "parity-engine": o("the parity engine", "engine"),
    update: o("approve changed and new images"),
    reason: o("why, with --update", "text"),
    software: o("SwiftShader instead of the GPU"),
  },
  coldstart: {
    ...RUN_IDENTITY,
    route: o("the page", "/viewer"),
    reps: o("repetitions", "n"),
    port: o(
      "the dev server's port (4101 by default, not a free one: always pass yours)",
      "port",
    ),
    board: o("with the board, without, or both", "with,without"),
    profile: o("record a CPU profile"),
    quiet: o("the CPU utility a quiet machine stays under", "percent"),
    "env-file": o("an environment file for the dev server", "file"),
    https: o("serve over HTTPS"),
    url: o("an existing server", "url"),
    roots: o("trees to compare", "a,b"),
    interleave: o("alternate the trees within each repetition"),
    budget: o("the first-frame budget", "ms"),
    baseline: o("the baseline configuration", "id"),
    candidate: o("the candidate configuration", "id"),
    hypothesis: o("what the run expects", "text"),
  },
  report: {},
  alerts: {
    all: o("include invalid and fixed change points"),
    "fail-on-new": o("exit 1 when an untriaged regression exists"),
  },
  annotate: {
    short: o("a short label", "text"),
    kind: o("machine, data, note or method", "kind"),
    metrics: o("the metrics it concerns", "a,b"),
    date: o("when (ISO)", "date"),
  },
  resummarize: {},
  compare: {
    old: o("the old configuration", "engine"),
    new: o("the new configuration", "engine"),
    metrics: o("metrics", "a,b"),
  },
};

const SUITE_SUMMARIES = {
  list: ["the catalog: scenes, areas and tiers", "dyno suite list"],
  verify: [
    "check the suite's datasets against the catalog (exit 1 on changed or missing)",
    "dyno suite verify",
  ],
  fetch: ["fetch the suite's datasets into the store", "dyno suite fetch"],
  run: [
    "a benchmark run (measures: prefer `dyno measure start suite`)",
    "dyno suite run [options]",
  ],
  images: [
    "image checks against approved baselines (exit 1 on changed or new)",
    "dyno suite images [options]",
  ],
  coldstart: [
    "a page's cold start against its budget",
    "dyno suite coldstart [options]",
  ],
  report: ["a run's HTML report", "dyno suite report <results.json>"],
  alerts: [
    "change points across runs, with their triage",
    "dyno suite alerts [--all] [--fail-on-new]",
  ],
  annotate: [
    "a dated note on Dyno's trend charts",
    'dyno suite annotate "text" [options]',
  ],
  resummarize: [
    "rewrite every run's summary after the format changes",
    "dyno suite resummarize",
  ],
  compare: [
    "two configurations, or one across two runs",
    "dyno suite compare <old.json> [new.json] [options]",
  ],
};

/** More for a suite command's --help. */
const SUITE_DETAILS = {
  run: [
    "A sweep (--sweep, repeated, or --sweep-file) runs each 2.0 engine once per",
    "point of the grid of its axes; it prints the points × scenes × repetitions",
    "first and needs --yes above 60 browser runs. --reference <setting>=<value>",
    "marks the reference points; --reference-reps runs them more often. Engine",
    "settings go without their namespace in engine ids too (2.0+sse=32). Settings:",
    ...settingsList({ kind: "bench" }).split("\n"),
  ],
  coldstart: [
    "Its dev server listens on --port, 4101 by default. dyno doesn't pick a free",
    "port for it, as `serve` does: 4101 can be another executor's leased port, so",
    "a scripted run always passes --port <your leased port>.",
  ],
};

/** The lines a suite command prints are its own; its result is the JSON. */
const suiteCommand = (name) => ({
  summary: SUITE_SUMMARIES[name][0],
  usage: SUITE_SUMMARIES[name][1],
  options: SUITE_OPTIONS[name],
  passthrough: true,
  ...(SUITE_DETAILS[name] ? { details: SUITE_DETAILS[name] } : {}),
  async run({ argv }) {
    const { main, SuiteRefusal, SuiteUsage } = await import("./suite.mjs");
    try {
      return await main([name, ...argv]);
    } catch (error) {
      if (error instanceof SuiteRefusal) {
        throw new DynoError("refused", error.message);
      }
      if (error instanceof SuiteUsage) {
        throw new DynoError("usage", error.message);
      }
      throw error;
    }
  },
});

/** Lab options and the environment variables they set (lab.mjs reads those). */
const LAB_OPTIONS = {
  list: o("the harnesses, without running any"),
  commit: o("serve this commit from a snapshot worktree (BENCH_COMMIT)", "rev"),
  url: o("use an existing server (BENCH_URL)", "origin"),
  headed: o("show the browser (BENCH_HEADED)"),
  channel: o(
    "the browser channel (BENCH_CHANNEL; msedge by default)",
    "channel",
  ),
};

/** The options a measurement's kind takes. */
const MEASURE_KIND_OPTIONS = {
  suite: SUITE_OPTIONS.run,
  images: SUITE_OPTIONS.images,
  coldstart: SUITE_OPTIONS.coldstart,
  lab: {},
};

const MEASURE_OPTIONS = {
  caller: o("the program asking (status reports it as via: caller)", "name"),
  "no-queue": o("refuse instead of waiting when the machine isn't quiet"),
  "fake-wait": o("fake: polls spent waiting for quiet (0)", "n"),
  "fake-steps": o("fake: polls spent running (2)", "n"),
  "fake-outcome": o("fake: how it ends (done)", "done|failed"),
};

/** Splits `measure start` arguments into its own options and its kind's. */
function splitMeasureArgs(tokens) {
  const own = [];
  const rest = [];
  for (let i = 0; i < tokens.length; i++) {
    const name = tokens[i].startsWith("--") ? tokens[i].slice(2) : undefined;
    if (name && Object.hasOwn(MEASURE_OPTIONS, name)) {
      own.push(tokens[i]);
      if (MEASURE_OPTIONS[name].value) {
        own.push(tokens[++i]);
      }
    } else {
      rest.push(tokens[i]);
    }
  }
  return { own, rest };
}

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

const measurementLines = (m) => [
  `${m.handle}: ${m.state} (${m.kind}${m.args.length ? ` ${m.args.join(" ")}` : ""}; ${m.target}, asked by ${m.requested_by.caller ?? m.requested_by.via}, ${m.for_seconds} s)`,
  ...(m.run_id ? [`run ${m.run_id}${m.verdict ? `: ${m.verdict}` : ""}`] : []),
  ...(m.completion
    ? []
    : [`follow it: ${m.status_command.replace(/ --json$/, "")}`]),
];

/** The completion record's fields, for `capabilities`. */
const COMPLETION_FIELDS = [
  "api_version",
  "event",
  "handle",
  "state",
  "kind",
  "target",
  "requested_by",
  "requested",
  "started",
  "finished",
  "duration_s",
  "run_id",
  "verdict",
  "exit_code",
  "result_command",
];

const dataLines = (data) => [
  ...data.datasets.map((d) =>
    d.state === "current"
      ? `  ${d.name}: format ${d.found}, current`
      : `  ${d.name}: ${d.message}`,
  ),
  data.out_of_date.length
    ? `${plural(data.out_of_date.length, "dataset")} out of date: measuring is refused until fixed`
    : `every dataset is current${data.missing.length ? ` (${data.missing.length} not built)` : ""}`,
];

export const TABLE = {
  capabilities: {
    summary:
      "what this dyno can do: its commands, targets, states and exit codes",
    usage: "dyno capabilities",
    async run({ fake }) {
      const commands = describe(TABLE);
      const flat = [];
      const walk = (list) => {
        for (const c of list) {
          if (c.subcommands) {
            walk(c.subcommands);
          } else {
            flat.push(c);
          }
        }
      };
      walk(commands);
      return {
        fake,
        targets: [
          { id: "local", kind: "this machine", available: !fake },
          { id: "fake", kind: "simulated, deterministic", available: true },
        ],
        states: ["busy", "waiting-for-quiet", "quiet"],
        measurement_states: [
          "waiting-for-quiet",
          "queued",
          "running",
          "done",
          "failed",
          "canceled",
        ],
        measurement_kinds: Object.keys(MEASURE_KIND_OPTIONS),
        completion_record: {
          file: "<DYNO_STATE>/events.jsonl, one JSON object per line; also `completion` in measure status",
          fields: COMPLETION_FIELDS,
        },
        commands: flat,
        exit_codes: EXIT_MEANINGS,
        lines: [
          `dyno, api_version ${API_VERSION}${fake ? " (fake target)" : ""}`,
          ...flat.map(
            (c) =>
              `  ${c.command.padEnd(22)}${c.state === "planned" ? `planned (${c.item})` : c.summary}`,
          ),
        ],
      };
    },
  },
  status: {
    summary:
      "busy, waiting-for-quiet or quiet; who measures and for how long; whether measuring is allowed",
    usage: "dyno status",
    details: [
      "busy: a measurement runs. waiting-for-quiet: one is queued behind other work;",
      "start no heavy work (tests, builds) and let what runs finish. quiet: neither.",
      "measure.allowed is false while any dataset is out of date (dyno data status).",
    ],
    async run({ fake, env }) {
      const { measureStatus } = await import("./measure.mjs");
      const { dataRefusals, dataStatus } = await import("./status.mjs");
      const state = measureStatus({ env, fake });
      const data = await dataStatus({ fake, env });
      const refusals = dataRefusals(data);
      const current = state.current;
      return {
        ...state,
        targets: [{ id: state.target, state: state.state }],
        data: { out_of_date: data.out_of_date, missing: data.missing },
        measure: { allowed: refusals.length === 0, reasons: refusals },
        lines: [
          `${state.state}${current ? `: ${current.handle ?? current.command} (asked by ${current.caller ?? current.via}, ${current.for_seconds} s)` : ""}`,
          ...state.waiting.map(
            (w) =>
              `  ${w.state}: ${w.handle} (${w.kind}, asked by ${w.caller ?? w.via}, ${w.for_seconds} s)`,
          ),
          `machine: ${state.machine.quiet_enough ? "quiet enough to measure" : `not quiet (${state.machine.reasons.join("; ")})`}`,
          refusals.length
            ? `measuring refused: ${refusals.join(" ")}`
            : "data: current",
        ],
      };
    },
  },
  data: {
    summary:
      "setup's datasets: their recorded formats against what this code reads",
    children: {
      status: {
        summary:
          "each dataset's format, current or out of date, and the command that fixes it (exit 1 when one is out of date)",
        usage: "dyno data status",
        details: [
          "Setup stays the repository's: `npm run setup` and `npm run sky -- build` fix",
          "what this reports. The same list is Dyno's Problems.",
        ],
        async run({ fake, env }) {
          const { dataStatus } = await import("./status.mjs");
          const data = await dataStatus({ fake, env });
          return {
            ...data,
            exitCode: data.out_of_date.length ? 1 : 0,
            lines: dataLines(data),
          };
        },
      },
    },
  },
  storage: {
    summary: "the stores outside the repository",
    children: {
      status: {
        summary: "each store's folder, size and file count",
        usage: "dyno storage status",
        async run({ fake, env }) {
          const { bytesLabel, storageStatus } = await import("./status.mjs");
          const out = await storageStatus({ fake, env });
          return {
            ...out,
            lines: out.stores.map(
              (s) =>
                `  ${s.name.padEnd(13)}${s.exists ? `${bytesLabel(s.bytes)} in ${plural(s.files, "file")}` : "none yet"}  ${s.path}`,
            ),
          };
        },
      },
    },
  },
  suite: {
    summary:
      "the benchmark suite: its catalog, runs, image checks, cold starts and reports",
    children: Object.fromEntries(
      Object.keys(SUITE_OPTIONS).map((n) => [n, suiteCommand(n)]),
    ),
  },
  lab: {
    summary:
      "the Lab's harnesses: spikes, benchmarks and parity suites (bench/results)",
    usage:
      "dyno lab [suite ...] [--commit rev] [--url origin] [--headed] [--channel c] | --list",
    args: [{ name: "suite", variadic: true }],
    options: LAB_OPTIONS,
    details: [
      "With no suite, runs every one. Pages read some settings from the environment",
      "(GROUP, MODELS_ONLY, ION_ASSET, AT, SCENARIOS, POLICIES, THROTTLE, ALLOC_GLARE, …;",
      "see suite/commands/lab.mjs).",
      "--commit serves a snapshot worktree under .bench/. In a linked worktree (an",
      "executor's) suites that load 1.x (baseline, parity) need CESIUM_BUILD_DIR set",
      "to the main checkout's Build/CesiumUnminified: the snapshot has no 1.x build.",
    ],
    async run({ args, opts, env }) {
      const { LAB_SUITES, LabUsage, main } = await import("./lab.mjs");
      if (opts.list) {
        if (args.length) {
          throw new DynoError("usage", "--list takes no suites");
        }
        return { suites: LAB_SUITES, lines: LAB_SUITES.map((s) => `  ${s}`) };
      }
      for (const name of args) {
        if (!LAB_SUITES.includes(name)) {
          throw new DynoError(
            "usage",
            `unknown suite "${name}" (dyno lab --list)`,
          );
        }
      }
      const settings = {
        commit: "BENCH_COMMIT",
        url: "BENCH_URL",
        headed: "BENCH_HEADED",
        channel: "BENCH_CHANNEL",
      };
      for (const [option, variable] of Object.entries(settings)) {
        if (opts[option] !== undefined) {
          env[variable] = opts[option] === true ? "1" : String(opts[option]);
        }
      }
      try {
        return await main(args, { env });
      } catch (error) {
        if (error instanceof LabUsage) {
          throw new DynoError("usage", error.message);
        }
        throw error;
      }
    },
  },
  serve: {
    summary:
      "Dyno's and the handbook's dev servers, detached: a free port per worktree, or the owner's 5190 and 5199",
    children: {
      start: {
        summary: "start one detached (again: says where the running one is)",
        usage:
          "dyno serve start <dyno|handbook> [--port n] [--owner] [--wait s]",
        details: [
          "In a fresh worktree the handbook needs one full `npm run handbook:data` first:",
          "its dev server keeps the bundle figures from an earlier full run.",
        ],
        args: [
          { name: "server", required: true, choices: ["dyno", "handbook"] },
        ],
        options: {
          port: o(
            "this port (refused if anything listens on it, or it is the owner's)",
            "n",
          ),
          owner: o(
            "the owner's server, on 5190 or 5199: from the main checkout only",
          ),
          wait: o("seconds until it must answer (90)", "s"),
        },
        async run({ args, opts, env }) {
          const { startServer, serversDirectory } = await import("./serve.mjs");
          const out = await startServer({
            directory: serversDirectory(env),
            name: args[0],
            port: opts.port === undefined ? undefined : portNumber(opts.port),
            owner: Boolean(opts.owner),
            wait: opts.wait === undefined ? 90 : Number(opts.wait),
          });
          const s = out.server;
          return {
            ...out,
            lines: [
              `${s.name}: ${s.url} (${out.started ? "started" : "already running"}, pid ${s.pid}; log ${s.log})`,
            ],
          };
        },
      },
      stop: {
        summary:
          "stop one dyno started (only after checking its port is its own)",
        usage: "dyno serve stop <dyno|handbook> [--port n] [--owner]",
        args: [
          { name: "server", required: true, choices: ["dyno", "handbook"] },
        ],
        options: {
          port: o("which, when this worktree has more than one", "n"),
          owner: o("the owner's server: from the main checkout only"),
        },
        async run({ args, opts, env }) {
          const { stopServer, serversDirectory } = await import("./serve.mjs");
          const out = await stopServer({
            directory: serversDirectory(env),
            name: args[0],
            owner: Boolean(opts.owner),
            port: opts.port === undefined ? undefined : portNumber(opts.port),
          });
          return {
            ...out,
            lines: [
              out.stopped
                ? `stopped ${out.id} on ${out.port} (pid ${out.pid})`
                : `nothing stopped: ${out.reason}`,
            ],
          };
        },
      },
      status: {
        summary: "every server on record: port, pid, whether it answers, whose",
        usage: "dyno serve status",
        async run({ env }) {
          const { serverStatus, serversDirectory } =
            await import("./serve.mjs");
          const out = await serverStatus({ directory: serversDirectory(env) });
          return {
            ...out,
            lines: out.servers.length
              ? out.servers.map(
                  (s) =>
                    `  ${s.id.padEnd(16)}${s.url}  ${s.alive ? (s.answering ? "answering" : "running, not answering") : "not running"}  ${s.owner ? "the owner's" : s.mine ? "this worktree's" : (s.worktree ?? "")}`,
                )
              : ["no servers on record"],
          };
        },
      },
      logs: {
        summary: "the end of a server's log",
        usage:
          "dyno serve logs <dyno|handbook> [--port n] [--owner] [--lines n]",
        args: [
          { name: "server", required: true, choices: ["dyno", "handbook"] },
        ],
        options: {
          port: o("which, when this worktree has more than one", "n"),
          owner: o("the owner's server"),
          lines: o("how many lines (40)", "n"),
        },
        async run({ args, opts, env }) {
          const { serverLogs, serversDirectory } = await import("./serve.mjs");
          const out = serverLogs({
            directory: serversDirectory(env),
            name: args[0],
            owner: Boolean(opts.owner),
            port: opts.port === undefined ? undefined : portNumber(opts.port),
            lines: opts.lines === undefined ? 40 : Number(opts.lines),
          });
          return { ...out, lines_shown: out.lines.length, lines: out.lines };
        },
      },
    },
  },
  measure: {
    summary:
      "measurements a program starts and watches: asynchronous, with a handle",
    children: {
      start: {
        summary:
          "queue a measurement until the machine is quiet; returns its handle at once",
        usage:
          "dyno measure start <suite|images|coldstart|lab> [its options] [--caller name] [--no-queue]",
        args: [
          {
            name: "kind",
            required: true,
            choices: Object.keys(MEASURE_KIND_OPTIONS),
          },
        ],
        options: MEASURE_OPTIONS,
        // Its kind's options follow it: checked in `run`.
        passthrough: "raw",
        details: [
          "suite is `dyno suite run`, images `suite images`, coldstart `suite coldstart`, lab `dyno lab`;",
          "their options follow the kind. Refused (exit 4) while any dataset is out of date.",
          "Nothing runs when it ends: poll `measure status`, or read the completion record",
          "(a line in <DYNO_STATE>/events.jsonl). --fake simulates it: each start, status",
          "or cancel moves a simulated minute and every fake measurement one step.",
        ],
        async run({ argv, fake, env }) {
          const [kind, ...tokens] = argv;
          if (!kind || kind.startsWith("--")) {
            throw new DynoError(
              "usage",
              "missing <kind>: suite, images, coldstart or lab",
            );
          }
          if (!Object.hasOwn(MEASURE_KIND_OPTIONS, kind)) {
            throw new DynoError(
              "usage",
              `<kind>: one of ${Object.keys(MEASURE_KIND_OPTIONS).join(", ")}, not "${kind}"`,
            );
          }
          const { own, rest } = splitMeasureArgs(tokens);
          const { parseOptions, checkPassthrough } =
            await import("./dispatch.mjs");
          const { opts } = parseOptions(own, MEASURE_OPTIONS);
          let args;
          if (kind === "lab") {
            const { LAB_SUITES } = await import("./lab.mjs");
            for (const t of rest) {
              if (t.startsWith("--") || !LAB_SUITES.includes(t)) {
                throw new DynoError(
                  "usage",
                  `lab measurements take suite names only, not ${t} (dyno lab --list)`,
                );
              }
            }
            args = rest;
          } else {
            args = checkPassthrough(rest, MEASURE_KIND_OPTIONS[kind]);
          }
          if (!fake && Object.keys(opts).some((k) => k.startsWith("fake-"))) {
            throw new DynoError(
              "usage",
              "--fake-wait, --fake-steps and --fake-outcome are for --fake",
            );
          }
          const { startMeasurement } = await import("./measure.mjs");
          const m = await startMeasurement({ kind, args, opts, env, fake });
          return { ...m, lines: measurementLines(m) };
        },
      },
      status: {
        summary:
          "a measurement's state, and its completion record once it ends",
        usage: "dyno measure status <handle>",
        args: [{ name: "handle", required: true }],
        async run({ args, fake, env }) {
          const { measurementStatus } = await import("./measure.mjs");
          const m = measurementStatus({ handle: args[0], env, fake });
          return { ...m, lines: measurementLines(m) };
        },
      },
      cancel: {
        summary: "cancel a measurement that hasn't ended",
        usage: "dyno measure cancel <handle>",
        args: [{ name: "handle", required: true }],
        async run({ args, fake, env }) {
          const { cancelMeasurement } = await import("./measure.mjs");
          const m = cancelMeasurement({ handle: args[0], env, fake });
          return {
            ...m,
            lines: [
              `${m.handle}: ${m.canceled ? "canceled" : `already ${m.state}`}`,
            ],
          };
        },
      },
      list: {
        summary: "every measurement on record",
        usage: "dyno measure list",
        async run({ fake, env }) {
          const { describeMeasurement, listMeasurements, storeDirectory } =
            await import("./measure.mjs");
          const now = Date.now();
          const all = listMeasurements(storeDirectory({ env, fake })).map((r) =>
            describeMeasurement(r, now),
          );
          return {
            measurements: all,
            lines: all.length
              ? all.map((m) => `  ${m.handle}  ${m.state}  ${m.kind}`)
              : ["no measurements"],
          };
        },
      },
      _work: {
        hidden: true,
        summary: "the local worker (measure start runs it)",
        usage: "dyno measure _work <handle>",
        args: [{ name: "handle", required: true }],
        async run({ args, env }) {
          const { work } = await import("./measure.mjs");
          const record = await work({ handle: args[0], env });
          return { handle: record.handle, state: record.state };
        },
      },
    },
  },
  result: {
    summary: "runs in the results store; measured values only with --values",
    children: {
      list: {
        summary: "the latest runs",
        usage: "dyno result list [--limit n]",
        options: { limit: o("how many (20)", "n") },
        async run({ opts, fake, env }) {
          const { listResults } = await import("./result.mjs");
          const out = listResults({
            env,
            fake,
            limit: opts.limit === undefined ? 20 : Number(opts.limit),
          });
          return {
            ...out,
            lines: out.runs.length
              ? out.runs.map(
                  (r) =>
                    `  ${r.id}  ${r.purpose ?? ""}  ${r.item ?? r.verdict ?? ""}`,
                )
              : ["no runs"],
          };
        },
      },
      show: {
        summary:
          "a run's identity and verdict; its measured values with --values",
        usage: "dyno result show <run-id> [--values]",
        args: [{ name: "run-id", required: true }],
        options: {
          values: o(
            "include measured values (never paste them in a public pull request)",
          ),
        },
        async run({ args, opts, fake, env }) {
          const { showResult } = await import("./result.mjs");
          const out = showResult({
            id: args[0],
            values: Boolean(opts.values),
            env,
            fake,
          });
          const v = out.verdict;
          return {
            ...out,
            lines: [
              `${out.run.id} (${out.run.purpose}${out.run.item ? `, ${out.run.item}` : ""})`,
              typeof v === "string"
                ? `verdict: ${v}`
                : v
                  ? `verdict: ${v.verdict}; ${v.primary.label} ${v.primary.moved}`
                  : "verdict: none (no scene measured by both engines)",
              ...(out.report ? [`report: ${out.report}`] : []),
            ],
          };
        },
      },
      fetch: {
        summary: "fetch a run from another machine's store",
        planned: "CS-406",
      },
      pin: {
        summary: "keep a run from being pruned, with the reason",
        planned: "CS-736",
      },
      unpin: { summary: "let a pinned run be pruned again", planned: "CS-736" },
    },
  },
  analysis: {
    summary:
      "comparisons across commits with noise estimates (today: dyno suite compare and suite alerts)",
    children: {
      compare: {
        summary: "two commits, with noise estimates",
        planned: NO_ITEM,
      },
      trend: { summary: "a metric across commits", planned: NO_ITEM },
      bisect: { summary: "the commit a regression came in", planned: NO_ITEM },
    },
  },
  study: {
    summary: "studies: a question, its runs and its answer",
    planned: "CS-404",
  },
  device: {
    summary: "other devices: pairing and device runs",
    planned: "CS-408",
  },
  runner: {
    summary: "the runner that takes measurements from a queue",
    planned: "CS-407",
  },
  store: {
    summary: "the shared results store and the authority",
    planned: "CS-406",
  },
};

function portNumber(value) {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new DynoError("usage", `--port: a port number, not "${value}"`);
  }
  return port;
}

/** Runs dyno with the process's arguments: bench/dyno.mjs. */
export async function cli(argv = process.argv.slice(2)) {
  const { dispatch } = await import("./dispatch.mjs");
  return dispatch(argv, { table: TABLE, env: process.env });
}
