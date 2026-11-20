// Run identity (CS-390; docs/superpowers/plans/2026-11-13-dyno-dev-harness.md,
// section 5, and docs/design/benchmark-devices-and-sharing.md, section 1).
//
// Every run kind (bench, images, cold start) records what it is:
//
//   id         <ISO stamp>-<machine>, the results file's name without .json
//   purpose    "baseline" (the integration branch, clean: the history Trends
//              draws) or "dev" (everything else)
//   item       CS-<n>, the tracker item the run is for
//   study      the study the run belongs to
//   worktree   the basename of the worktree's top level, or "main checkout"
//   base       { ref, sha }: the integration branch and the merge base
//   machine    the machine's alias (BENCH_MACHINE, else platform and GPU)
//   servedFrom the machine whose servers the pages came from (the same one
//              for a local run)
//
// Runs written before this have none of it: they read as baseline runs
// (they are the history), see `runPurpose` in report.mjs, which the browser
// loads too, so it can't live here.
//
// Nothing here may carry a host name, a user name or a serial number: a
// default alias is the operating system and the GPU vendor, from a short
// fixed vocabulary, never read from the host.
import { execFileSync } from "node:child_process";
import { hostname, userInfo } from "node:os";
import { basename, resolve } from "node:path";
import process from "node:process";

/**
 * The integration branch: where baselines are measured and what a branch's
 * base is. The merge to `main` changes it here; BENCH_INTEGRATION_BRANCH
 * overrides it (tests, forks).
 */
export const INTEGRATION_BRANCH = "cesium-2.0-webgpu-poc";

export const integrationBranch = (env = process.env) =>
  env.BENCH_INTEGRATION_BRANCH || INTEGRATION_BRANCH;

/** Run kinds that may be baselines (plan, section 5). */
export const BASELINE_KINDS = ["bench", "images"];

// ----------------------------------------------------------------- run ids

const STAMP = "\\d{4}-\\d\\d-\\d\\dT\\d\\d-\\d\\d-\\d\\d-\\d{3}Z";
const ALIAS = "[a-z0-9]+(?:-[a-z0-9]+)*";
const RUN_ID = new RegExp(`^(${STAMP})(?:-(${ALIAS}))?$`);

/** `2026-11-14T09-12-03-512Z` for a date. */
export const stampOf = (date) => date.toISOString().replace(/[:.]/g, "-");

/** `<stamp>-<machine>`: the run's id, and its file's name without `.json`. */
export const makeRunId = (date, machine) => `${stampOf(date)}-${machine}`;

/**
 * Reads a run's id (or its file name, with `.json`) in either form: the new
 * `<stamp>-<machine>` or the older `<stamp>`. Returns the stamp, the date
 * and the machine alias (absent in the old form), or undefined for a name
 * that is not a run's (a summary, JUnit or Markdown file, `triage.json`).
 */
export function parseRunId(name) {
  const m = RUN_ID.exec(String(name).replace(/\.json$/, ""));
  if (!m) {
    return undefined;
  }
  const [, stamp, machine] = m;
  const date = new Date(
    stamp.replace(/T(\d\d)-(\d\d)-(\d\d)-(\d{3})Z$/, "T$1:$2:$3.$4Z"),
  );
  return {
    id: m[0],
    stamp,
    date,
    ...(machine ? { machine } : {}),
  };
}

/** Whether a results-directory file name is a run's result (`<id>.json`). */
export const isRunFile = (name) =>
  name.endsWith(".json") && parseRunId(name) !== undefined;

// ------------------------------------------------------------ the machine

const OS_NAMES = { darwin: "mac", win32: "win", linux: "linux" };
/** The vendors an alias may name, strongest GPU first. */
const VENDORS = ["nvidia", "amd", "apple", "intel"];

function tryExec(file, args) {
  try {
    return execFileSync(file, args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      windowsHide: true,
      timeout: 10000,
    });
  } catch {
    return undefined;
  }
}

/** The vendor named in free text (a GPU's name), from the fixed list. */
const vendorIn = (text) => {
  const t = String(text ?? "").toLowerCase();
  if (/nvidia|geforce|quadro/.test(t)) {
    return "nvidia";
  }
  if (/\bamd\b|radeon|advanced micro/.test(t)) {
    return "amd";
  }
  if (/apple/.test(t)) {
    return "apple";
  }
  if (/intel/.test(t)) {
    return "intel";
  }
  return undefined;
};

/**
 * The vendor of the machine's strongest GPU, from the operating system:
 * Apple silicon is Apple's; elsewhere `nvidia-smi`, then the OS's own list
 * of display adapters. Only the vendor leaves this function: no model name,
 * serial number or UUID. `undefined` when it can't tell.
 */
export function gpuVendor({
  platform = process.platform,
  arch = process.arch,
  exec = tryExec,
} = {}) {
  if (platform === "darwin" && arch === "arm64") {
    return "apple";
  }
  if (exec("nvidia-smi", ["-L"])?.trim()) {
    return "nvidia";
  }
  const listing =
    platform === "darwin"
      ? exec("system_profiler", ["SPDisplaysDataType"])
      : platform === "win32"
        ? exec("powershell", [
            "-NoProfile",
            "-Command",
            "(Get-CimInstance Win32_VideoController | Select-Object -ExpandProperty Name) -join ';'",
          ])
        : exec("lspci", []);
  const lines =
    platform === "linux"
      ? String(listing ?? "")
          .split("\n")
          .filter((l) => /vga|3d|display/i.test(l))
      : [String(listing ?? "")];
  const found = new Set(lines.map(vendorIn).filter(Boolean));
  return VENDORS.find((v) => found.has(v));
}

/**
 * A machine's default alias: the operating system and its GPU's vendor
 * (`mac-apple`, `win-nvidia`). It comes from this fixed vocabulary and
 * never from the host name, the user name, a serial number or a network
 * address: those say who or where the machine is. When the alias would
 * equal the host name or the user name anyway, it gets a `-1`.
 */
export function defaultMachine({
  platform = process.platform,
  vendor,
  names = [],
} = {}) {
  const os = OS_NAMES[platform] ?? "other";
  const parts = vendor && VENDORS.includes(vendor) ? [os, vendor] : [os];
  let alias = parts.join("-");
  const taken = names.map((n) => String(n).toLowerCase());
  if (taken.includes(alias)) {
    alias += "-1";
  }
  return alias;
}

/**
 * The machine's alias for this run: BENCH_MACHINE when set (lowercase
 * letters, digits and hyphens, up to 32; never the host name or the user
 * name), else the default from the platform and GPU. `host` and `user` are
 * read only to refuse them.
 */
export function machineAlias({
  env = process.env,
  platform = process.platform,
  arch = process.arch,
  host = hostname(),
  user = safeUser(),
  vendor = () => gpuVendor({ platform, arch }),
} = {}) {
  const names = [host, host.split(".")[0], user].filter(Boolean);
  const given = env.BENCH_MACHINE?.trim().toLowerCase();
  if (given) {
    if (!new RegExp(`^${ALIAS}$`).test(given) || given.length > 32) {
      throw new Error(
        `BENCH_MACHINE "${env.BENCH_MACHINE}": use lowercase letters, digits and hyphens, at most 32 (for example "win" or "laptop-a")`,
      );
    }
    if (names.some((n) => n.toLowerCase() === given)) {
      throw new Error(
        `BENCH_MACHINE "${given}" is this computer's host name or your user name: an alias must not say who or where the machine is. Pick another.`,
      );
    }
    return given;
  }
  return defaultMachine({ platform, vendor: vendor(), names });
}

function safeUser() {
  try {
    return userInfo().username;
  } catch {
    return "";
  }
}

// --------------------------------------------------------------- the tree

/** A function running git in a directory and returning its trimmed output. */
export const gitIn = (cwd) => (args) => {
  try {
    return execFileSync("git", args, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      maxBuffer: 1 << 26,
    }).trim();
  } catch {
    return "";
  }
};

/**
 * What the tree says about itself: its branch (a short commit when
 * detached), whether it has changes, the worktree's name and the base.
 */
export function treeFacts(git, root, integration) {
  const abbrev = git(["rev-parse", "--abbrev-ref", "HEAD"]);
  const branch =
    abbrev === "HEAD" ? git(["rev-parse", "--short=12", "HEAD"]) : abbrev;
  const top = git(["rev-parse", "--show-toplevel"]) || root;
  const dir = git(["rev-parse", "--path-format=absolute", "--git-dir"]);
  const common = git([
    "rev-parse",
    "--path-format=absolute",
    "--git-common-dir",
  ]);
  const main = dir && common && resolve(dir) === resolve(common);
  const sha = git(["merge-base", "HEAD", integration]);
  return {
    branch,
    detached: abbrev === "HEAD",
    dirty: git(["status", "--porcelain"]).length > 0,
    worktree: main ? "main checkout" : basename(top),
    base: { ref: integration, ...(sha ? { sha } : {}) },
  };
}

// -------------------------------------------------------------- the guard

/**
 * Why a baseline run is refused, or undefined when it may go ahead. A
 * baseline is the integration branch, measured, from a clean tree, as a
 * bench or images run; nothing else is.
 */
export function baselineProblem({
  kind,
  dirty,
  branch,
  detached,
  integration,
}) {
  if (!BASELINE_KINDS.includes(kind)) {
    return `--purpose baseline is for ${BASELINE_KINDS.join(" and ")} runs, not ${kind} runs: record it as a dev run`;
  }
  if (detached || branch !== integration) {
    return `--purpose baseline needs the integration branch (${integration}); this tree is on ${detached ? `a detached commit (${branch})` : `the feature branch ${branch}`}. Run it with --purpose dev, or measure ${integration} itself`;
  }
  if (dirty) {
    return `--purpose baseline needs a clean tree; this one has changes. Commit or set them aside, or run it with --purpose dev`;
  }
  return undefined;
}

// ---------------------------------------------------------------- the run

const ITEM = /^CS-\d+$/;

/**
 * Everything a run records about what it is, from the command line and the
 * tree. Throws, before any work, when the options contradict each other or
 * a baseline is refused. `warnings` are lines for the CLI to print.
 *
 * `kind`: "bench", "images" or "coldstart".
 */
export function resolveIdentity({
  kind,
  opts,
  root,
  env = process.env,
  git = gitIn(root),
  machine = machineAlias({ env }),
}) {
  const purpose = opts.purpose === undefined ? "dev" : String(opts.purpose);
  if (purpose !== "dev" && purpose !== "baseline") {
    throw new Error(`--purpose: baseline or dev, not "${opts.purpose}"`);
  }
  const integration = integrationBranch(env);
  const tree = treeFacts(git, root, integration);
  if (purpose === "baseline") {
    const problem = baselineProblem({
      kind,
      dirty: tree.dirty,
      branch: tree.branch,
      detached: tree.detached,
      integration,
    });
    if (problem) {
      throw new Error(problem);
    }
  }
  const warnings = [];
  const text = (key) =>
    typeof opts[key] === "string" && opts[key].trim()
      ? opts[key].trim()
      : undefined;
  const item = text("item");
  if (opts.item !== undefined && !item) {
    throw new Error("--item CS-<n>");
  }
  if (item && !ITEM.test(item)) {
    warnings.push(
      `--item "${item}" is not of the form CS-<n>: recorded as typed`,
    );
  }
  if (opts.study !== undefined && !text("study")) {
    throw new Error("--study <study id>");
  }
  return {
    kind,
    purpose,
    ...(item ? { item } : {}),
    ...(text("study") ? { study: text("study") } : {}),
    branch: tree.branch,
    dirty: tree.dirty,
    worktree: tree.worktree,
    base: tree.base,
    machine,
    servedFrom: machine,
    warnings,
  };
}

/**
 * The fields a run's result records, for one start time: spread them into
 * the results object.
 */
export function runFields(identity, date) {
  return {
    id: makeRunId(date, identity.machine),
    purpose: identity.purpose,
    ...(identity.item ? { item: identity.item } : {}),
    ...(identity.study ? { study: identity.study } : {}),
    worktree: identity.worktree,
    base: identity.base,
    machine: identity.machine,
    servedFrom: identity.servedFrom,
  };
}

/** The CLI's first line: what this run is. */
export function identityLine(identity) {
  return [
    `${identity.kind} run`,
    `purpose ${identity.purpose}`,
    ...(identity.item ? [`item ${identity.item}`] : []),
    ...(identity.study ? [`study ${identity.study}`] : []),
    `branch ${identity.branch}${identity.dirty ? " (changes)" : ""}`,
    `worktree ${identity.worktree}`,
    `machine ${identity.machine}`,
  ].join(" · ");
}

/**
 * The CLI's last lines: the run's id, and where to read it in Dyno (any
 * Dyno on this machine reads the same store). Paths are Dyno's hash routes.
 */
export function closingLines(identity, id) {
  const file = `${id}.json`;
  return [
    `run:  ${id}`,
    `dyno: ${
      identity.kind === "images" ? `#/images?run=${file}` : `#/runs/${file}`
    }${identity.study ? `  (study ${identity.study})` : ""}`,
  ];
}
