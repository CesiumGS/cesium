// Studies (CS-404; docs/superpowers/plans/2026-11-13-dyno-dev-harness.md,
// section 2, "Studies in detail"; the model is CS-687's, answered A).
//
// A study is a judgment: a question and a hypothesis written down before
// results, the runs that test it, and a verdict that cites them. It lives
// in the repository, one Markdown file per study in
// packages/next/work/studies/, in the tracker's own format: a front matter
// block in the tracker's YAML subset (`key: value` lines, inline and block
// lists, no multi-line values), then sections. It holds no machine details:
// runs are cited by ID, and they stay in the results store.
//
// A study has one kind (comparison, sweep, feasibility, calibration), which
// sets what it writes down before results and what its verdict looks like,
// and a set of instruments (instruments.mjs) whose runs it draws on. The
// format, the fields each kind requires and the verdict's rules are in
// packages/next/work/studies/README.md.
//
// Everything here reads and writes files in one worktree, and reads other
// local branches through git without checking them out. Nothing commits:
// an agent commits study changes with its work, the owner commits changes
// made in Dyno.
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import { basename, join, resolve, sep } from "node:path";
import process from "node:process";
import { parseRunId } from "./identity.mjs";
import { declares, instrumentIds, metricDirection } from "./instruments.mjs";
import { runsNeeded } from "./studyStats.mjs";

/** Where studies live, from the repository's top level. */
export const STUDIES_PATH = "packages/next/work/studies";

/** A study's ID: its creation date and a short slug. */
export const STUDY_ID = /^(\d{4}-\d{2}-\d{2})-([a-z0-9]+(?:-[a-z0-9]+)*)$/;
export const MAX_ID_LENGTH = 64;
const ITEM = /^CS-\d+$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export const KINDS = ["comparison", "sweep", "feasibility", "calibration"];
export const STATUSES = ["open", "concluded", "abandoned"];
export const OUTCOMES = ["supported", "refuted", "inconclusive"];
export const STOPPING = ["fixed", "sequential"];
export const ORDERS = ["paired-interleaved"];
export const SECTIONS = [
  "Question",
  "Hypothesis",
  "Design",
  "Notes",
  "Verdict",
];

/**
 * The front matter's keys, in the order they are written, each with its
 * type ("text", "list", "int", "number") and, for a pre-registration
 * field, the option `study new` takes it from.
 */
export const KEYS = [
  ["id", "text"],
  ["title", "text"],
  ["kind", "text"],
  ["item", "text"],
  ["status", "text"],
  ["created", "text"],
  ["instruments", "list"],
  ["baseline", "text", "baseline"],
  ["candidate", "text", "candidate"],
  ["axes", "list", "axes"],
  ["reference", "text", "reference"],
  ["primary", "list", "primary"],
  ["guardrails", "list", "guardrails"],
  ["secondary", "list", "secondary"],
  ["criteria", "list", "criteria"],
  ["tolerances", "list", "tolerances"],
  ["runs", "int", "runs"],
  ["order", "text", "order"],
  ["stopping", "text", "stopping"],
  ["alpha", "number", "alpha"],
  ["power", "number", "power"],
  ["noise", "number", "noise"],
  ["aa_run", "text", "aa-run"],
  ["prior", "text", "prior"],
  ["health", "list", "health"],
  ["attached", "list"],
  ["computed", "text"],
  ["outcome", "text"],
  ["holds_for", "list"],
  ["decision", "text"],
  ["cites", "list"],
];
const KEY_TYPES = new Map(KEYS.map(([k, t]) => [k, t]));
/** Lists written one item per line, so a change diffs as one line. */
const BLOCK_LISTS = new Set(["attached", "cites"]);

/**
 * What each kind writes down before results: required fields (refused
 * when missing) and the optional ones it may set. `study new` fills
 * `order`, `stopping`, `alpha`, `power`, `prior`, `health` and (from the
 * power analysis) `runs` when they aren't given.
 */
export const KIND_FIELDS = {
  comparison: {
    required: [
      "baseline",
      "candidate",
      "primary",
      "guardrails",
      "noise",
      "runs",
      "order",
      "stopping",
    ],
    optional: ["secondary", "alpha", "power", "aa_run", "prior", "health"],
  },
  sweep: {
    required: ["axes", "reference", "primary", "noise", "runs"],
    optional: [
      "guardrails",
      "secondary",
      "alpha",
      "power",
      "aa_run",
      "prior",
      "health",
    ],
  },
  feasibility: {
    required: ["criteria", "runs"],
    optional: ["candidate", "alpha", "noise", "aa_run", "health"],
  },
  calibration: {
    required: ["reference", "tolerances", "runs"],
    optional: ["candidate", "alpha", "noise", "aa_run", "health"],
  },
};

/** What each pre-registration field holds, for messages. */
export const FIELD_HELP = {
  baseline: "--baseline <engine>: what the candidate is compared against",
  candidate: "--candidate <engine>: the change",
  axes: "--axes <setting,…>: the settings the sweep varies",
  reference:
    "--reference <setting=value | source>: the reference point or source",
  primary:
    "--primary <metric:lower|higher:effect>: one to three, with the minimum effect (a fraction)",
  guardrails:
    "--guardrails <metric:margin | metric<=bound,…>: each with its margin",
  secondary: "--secondary <metric,…>: corrected for multiple comparisons",
  criteria:
    "--criteria <metric<=budget | metric>=floor,…>: what feasible means",
  tolerances:
    "--tolerances <metric<=tolerance,…>: the error each quantity may have",
  runs: "--runs <n>: runs per arm (from --noise and the minimum effect when not given)",
  order: "--order paired-interleaved",
  stopping: "--stopping fixed|sequential",
  noise:
    "--noise <fraction>: the instrument's noise floor (one paired log ratio's standard deviation, from an A/A run)",
  alpha: "--alpha <fraction>: the false-positive rate (0.05)",
  power: "--power <fraction>: the chance of seeing the minimum effect (0.8)",
  aa_run: "--aa-run <run id>: the A/A run that measured the noise floor",
  prior: "--prior normal:<mean>:<sd>: the prior on the effect (a log ratio)",
  health:
    "--health <power:ac,load:n,thermal:nominal,battery:percent>: the machine's health bar",
};

// ------------------------------------------------------------- the format

const quoteIfNeeded = (value) => {
  const s = String(value);
  return s === "" ||
    /^[\s"'[\]{}#&*!|>%@`-]/.test(s) ||
    /:\s|\s#|\s$|[\n\r]/.test(s) ||
    /^(true|false|null|~)$/i.test(s)
    ? JSON.stringify(s)
    : s;
};

const unquote = (raw) => {
  const s = raw.trim();
  if (s.startsWith('"') && s.endsWith('"') && s.length >= 2) {
    try {
      return String(JSON.parse(s));
    } catch {
      return s.slice(1, -1);
    }
  }
  if (s.startsWith("'") && s.endsWith("'") && s.length >= 2) {
    return s.slice(1, -1).replaceAll("''", "'");
  }
  return s;
};

/**
 * Parses a study file: { fm, sections, errors }. `fm` holds strings and
 * lists of strings, as written; `sections` the text under each `## ` heading.
 * Nothing read is executed or evaluated.
 */
export function parseStudy(text) {
  const errors = [];
  const lines = String(text).replace(/\r\n/g, "\n").split("\n");
  if (lines[0] !== "---") {
    return {
      fm: {},
      sections: {},
      errors: ["no front matter (the file starts with ---)"],
    };
  }
  const end = lines.indexOf("---", 1);
  if (end < 0) {
    return {
      fm: {},
      sections: {},
      errors: ["the front matter has no closing ---"],
    };
  }
  const fm = {};
  let listKey;
  for (let i = 1; i < end; i++) {
    const line = lines[i];
    if (line.trim() === "") {
      continue;
    }
    const item = /^\s+-\s+(.*)$/.exec(line);
    if (item) {
      if (!listKey) {
        errors.push(`line ${i + 1}: a list item without its key`);
        continue;
      }
      fm[listKey].push(unquote(item[1]));
      continue;
    }
    const m = /^([a-z_]+):(?:\s(.*))?$/.exec(line);
    if (!m) {
      errors.push(`line ${i + 1}: not a "key: value" line`);
      listKey = undefined;
      continue;
    }
    const [, key, rawValue = ""] = m;
    if (Object.hasOwn(fm, key)) {
      errors.push(`line ${i + 1}: ${key} given twice`);
    }
    const raw = rawValue.trim();
    listKey = undefined;
    if (raw === "") {
      fm[key] = [];
      listKey = key;
    } else if (raw.startsWith("[") && raw.endsWith("]")) {
      const inner = raw.slice(1, -1).trim();
      fm[key] = inner === "" ? [] : inner.split(",").map(unquote);
    } else {
      fm[key] = unquote(raw);
    }
  }
  const sections = {};
  let current;
  const order = [];
  for (const line of lines.slice(end + 1)) {
    const heading = /^## (.+?)\s*$/.exec(line);
    if (heading) {
      current = heading[1];
      if (Object.hasOwn(sections, current)) {
        errors.push(`section ${current} given twice`);
      }
      sections[current] = [];
      order.push(current);
      continue;
    }
    if (current) {
      sections[current].push(line);
    } else if (line.trim() !== "") {
      errors.push("text before the first section");
    }
  }
  for (const name of order) {
    sections[name] = sections[name].join("\n").trim();
  }
  return { fm, sections, errors };
}

/**
 * Writes a study as its file's text: keys in KEYS' order, lists inline
 * except `attached` and `cites` (one per line), sections in SECTIONS'
 * order. Writing what parseStudy read gives the same text back.
 */
export function serializeStudy({ fm, sections }) {
  const out = ["---"];
  for (const [key] of KEYS) {
    const value = fm[key];
    if (value === undefined || value === null) {
      continue;
    }
    if (Array.isArray(value)) {
      if (BLOCK_LISTS.has(key)) {
        out.push(value.length ? `${key}:` : `${key}: []`);
        for (const v of value) {
          out.push(`  - ${quoteIfNeeded(v)}`);
        }
      } else {
        out.push(`${key}: [${value.map(quoteIfNeeded).join(", ")}]`);
      }
    } else {
      out.push(`${key}: ${quoteIfNeeded(value)}`);
    }
  }
  out.push("---");
  for (const name of SECTIONS) {
    const text = sections[name];
    if (text === undefined || (text.trim() === "" && name !== "Question")) {
      continue;
    }
    out.push("", `## ${name}`, "", text.trim());
  }
  return `${out.join("\n")}\n`;
}

// -------------------------------------------------------- the field forms

/** `cpuP50:lower:0.05` → { metric, direction, effect }, or a string saying what's wrong. */
export function parsePrimary(spec) {
  const m = /^([A-Za-z][\w.-]*):(lower|higher):(\d*\.?\d+)$/.exec(spec);
  if (!m) {
    return `primary "${spec}": metric:lower|higher:effect, the effect a fraction (cpuP50:lower:0.05)`;
  }
  const effect = Number(m[3]);
  if (!(effect > 0 && effect < 1)) {
    return `primary "${spec}": the minimum effect is a fraction above 0 and below 1`;
  }
  return { metric: m[1], direction: m[2], effect };
}

/**
 * A guardrail, criterion or tolerance: `metric:margin` (relative to the
 * baseline, in the metric's worse direction), `metric:lower|higher:margin`,
 * or an absolute bound `metric<=value` / `metric>=value`.
 */
export function parseBound(spec, { relative = true } = {}) {
  const abs = /^([A-Za-z][\w.-]*)(<=|>=)(-?\d*\.?\d+)$/.exec(spec);
  if (abs) {
    return { metric: abs[1], op: abs[2], value: Number(abs[3]) };
  }
  if (relative) {
    const rel = /^([A-Za-z][\w.-]*):(?:(lower|higher):)?(\d*\.?\d+)$/.exec(
      spec,
    );
    if (rel) {
      const margin = Number(rel[3]);
      if (!(margin > 0 && margin < 1)) {
        return `"${spec}": the margin is a fraction above 0 and below 1`;
      }
      return {
        metric: rel[1],
        direction: rel[2] ?? metricDirection(rel[1]),
        margin,
      };
    }
    return `"${spec}": metric:margin (settleMs:0.03) or a bound (flipMean<=0.02)`;
  }
  return `"${spec}": a bound, metric<=value or metric>=value`;
}

/** `power:ac`, `load:4`, `thermal:nominal`, `battery:50`. */
export function parseHealth(spec) {
  const m = /^(power|load|thermal|battery):(.+)$/.exec(spec);
  if (!m) {
    return `health "${spec}": power:ac, load:<n>, thermal:nominal or battery:<percent>`;
  }
  const [, key, value] = m;
  if (key === "power" && value !== "ac") {
    return `health "${spec}": power:ac`;
  }
  if (key === "thermal" && value !== "nominal") {
    return `health "${spec}": thermal:nominal`;
  }
  if ((key === "load" || key === "battery") && !(Number(value) > 0)) {
    return `health "${spec}": ${key}:<a number above 0>`;
  }
  return {
    key,
    value: key === "load" || key === "battery" ? Number(value) : value,
  };
}

/** `normal:0:0.04` → { mean, sd }. */
export function parsePrior(spec) {
  const m = /^normal:(-?\d*\.?\d+):(\d*\.?\d+)$/.exec(spec ?? "");
  if (!m || !(Number(m[2]) > 0)) {
    return `prior "${spec}": normal:<mean>:<sd>, the sd above 0`;
  }
  return { mean: Number(m[1]), sd: Number(m[2]) };
}

/** The minimum effect as a gain on the log scale (positive is good). */
export const effectGain = ({ direction, effect }) =>
  direction === "lower" ? -Math.log(1 - effect) : Math.log(1 + effect);

/** The runs the power analysis asks for, from the study's own numbers. */
export function plannedRuns(fm) {
  const primaries = (fm.primary ?? [])
    .map(parsePrimary)
    .filter((p) => typeof p !== "string");
  const noise = Number(fm.noise);
  if (!primaries.length || !(noise > 0)) {
    return undefined;
  }
  const effect = Math.min(...primaries.map(effectGain));
  return runsNeeded({
    noise,
    effect,
    alpha: Number(fm.alpha ?? 0.05),
    power: Number(fm.power ?? 0.8),
  });
}

// -------------------------------------------------------------- the check

const isNumberText = (v) => typeof v === "string" && /^-?\d*\.?\d+$/.test(v);

/** A study's metrics and which field names them. */
function namedMetrics(fm) {
  const out = [];
  for (const p of fm.primary ?? []) {
    const parsed = parsePrimary(p);
    if (typeof parsed !== "string") {
      out.push(["primary", parsed.metric]);
    }
  }
  for (const key of ["guardrails", "criteria", "tolerances"]) {
    for (const g of fm[key] ?? []) {
      const parsed = parseBound(g, { relative: key === "guardrails" });
      if (typeof parsed !== "string") {
        out.push([key, parsed.metric]);
      }
    }
  }
  for (const s of fm.secondary ?? []) {
    out.push(["secondary", s]);
  }
  return out;
}

/**
 * The pre-registration fields a study's kind requires and doesn't have, by
 * name ([] when it is ready for runs). A comparison without a primary
 * metric, a minimum effect, guardrail margins or a sample plan isn't.
 */
export function missingFields(fm) {
  const spec = KIND_FIELDS[fm.kind];
  if (!spec) {
    return [];
  }
  return spec.required.filter((key) => {
    const v = fm[key];
    return v === undefined || v === "" || (Array.isArray(v) && v.length === 0);
  });
}

/**
 * Checks a parsed study (the shared validator: `dyno study check`, the
 * tracker's check, the endpoint and every write). `file` is its file's
 * base name, when it has one. Returns { errors, warnings }.
 */
export function checkStudy(
  { fm, sections, errors: parseErrors = [] },
  { file } = {},
) {
  const errors = [...parseErrors];
  const warnings = [];
  for (const key of Object.keys(fm)) {
    if (!KEY_TYPES.has(key)) {
      errors.push(`unknown key ${key}`);
    }
  }
  for (const name of Object.keys(sections)) {
    if (!SECTIONS.includes(name)) {
      errors.push(
        `unknown section "${name}" (sections: ${SECTIONS.join(", ")})`,
      );
    }
  }
  for (const [key, type] of KEYS) {
    const v = fm[key];
    if (v === undefined) {
      continue;
    }
    if (type === "list" && !Array.isArray(v)) {
      errors.push(`${key}: a list`);
    } else if (type !== "list" && Array.isArray(v)) {
      errors.push(`${key}: one value, not a list`);
    } else if (type === "int" && !/^\d+$/.test(v)) {
      errors.push(`${key}: a whole number`);
    } else if (type === "number" && !isNumberText(v)) {
      errors.push(`${key}: a number`);
    }
  }
  const id = fm.id;
  if (
    typeof id !== "string" ||
    !STUDY_ID.test(id) ||
    id.length > MAX_ID_LENGTH
  ) {
    errors.push(
      `id: <date>-<slug> in lower case, at most ${MAX_ID_LENGTH} characters`,
    );
  } else {
    if (file !== undefined && file !== `${id}.md`) {
      errors.push(`the file is ${file}, its id ${id}: the name is the id`);
    }
    if (fm.created !== STUDY_ID.exec(id)[1]) {
      errors.push("created: the date the id starts with");
    }
  }
  if (typeof fm.title !== "string" || !fm.title.trim()) {
    errors.push("title: what the study is about");
  }
  if (!KINDS.includes(fm.kind)) {
    errors.push(`kind: one of ${KINDS.join(", ")}`);
  }
  if (typeof fm.item !== "string" || !ITEM.test(fm.item)) {
    errors.push("item: the CS-<n> the study serves");
  }
  if (!STATUSES.includes(fm.status)) {
    errors.push(`status: one of ${STATUSES.join(", ")}`);
  }
  if (typeof fm.created !== "string" || !DATE.test(fm.created)) {
    errors.push("created: YYYY-MM-DD");
  }
  const instruments = Array.isArray(fm.instruments) ? fm.instruments : [];
  if (!instruments.length) {
    errors.push(`instruments: one or more of ${instrumentIds().join(", ")}`);
  }
  for (const i of instruments) {
    if (!instrumentIds().includes(i)) {
      errors.push(
        `instruments: unknown "${i}" (${instrumentIds().join(", ")})`,
      );
    }
  }
  if (!sections.Question?.trim()) {
    errors.push("the Question section is empty");
  }
  // The kind's pre-registration.
  for (const key of missingFields(fm)) {
    errors.push(`${fm.kind} needs ${key}: ${FIELD_HELP[key]}`);
  }
  if (KIND_FIELDS[fm.kind]) {
    const allowed = new Set([
      ...KIND_FIELDS[fm.kind].required,
      ...KIND_FIELDS[fm.kind].optional,
    ]);
    for (const [key, , option] of KEYS) {
      if (option && fm[key] !== undefined && !allowed.has(key)) {
        errors.push(`${key}: not a ${fm.kind}'s field`);
      }
    }
  }
  const primaries = (fm.primary ?? []).map(parsePrimary);
  for (const p of primaries) {
    if (typeof p === "string") {
      errors.push(p);
    }
  }
  if (primaries.length > 3) {
    errors.push("primary: one, at most three");
  }
  for (const key of ["guardrails", "criteria", "tolerances"]) {
    for (const g of fm[key] ?? []) {
      const parsed = parseBound(g, { relative: key === "guardrails" });
      if (typeof parsed === "string") {
        errors.push(`${key} ${parsed}`);
      }
    }
  }
  for (const h of fm.health ?? []) {
    const parsed = parseHealth(h);
    if (typeof parsed === "string") {
      errors.push(parsed);
    }
  }
  if (fm.prior !== undefined && typeof parsePrior(fm.prior) === "string") {
    errors.push(parsePrior(fm.prior));
  }
  if (fm.order !== undefined && !ORDERS.includes(fm.order)) {
    errors.push(`order: ${ORDERS.join(" or ")}`);
  }
  if (fm.stopping !== undefined && !STOPPING.includes(fm.stopping)) {
    errors.push(`stopping: ${STOPPING.join(" or ")}`);
  }
  for (const key of ["alpha", "power"]) {
    if (
      isNumberText(fm[key]) &&
      !(Number(fm[key]) > 0 && Number(fm[key]) < 1)
    ) {
      errors.push(`${key}: a fraction above 0 and below 1`);
    }
  }
  if (isNumberText(fm.noise) && !(Number(fm.noise) > 0)) {
    errors.push("noise: above 0");
  }
  if (/^\d+$/.test(fm.runs ?? "") && Number(fm.runs) < 2) {
    errors.push("runs: two or more");
  }
  const planned = plannedRuns(fm);
  if (
    planned &&
    /^\d+$/.test(fm.runs ?? "") &&
    Number(fm.runs) < planned &&
    fm.kind !== "feasibility"
  ) {
    warnings.push(
      `runs: ${fm.runs} planned, fewer than the ${planned} the power analysis asks for (noise ${fm.noise}, the smallest minimum effect)`,
    );
  }
  for (const [field, metric] of namedMetrics(fm)) {
    if (instruments.length && !instruments.some((i) => declares(i, metric))) {
      errors.push(
        `${field}: no instrument of this study measures "${metric}" (${instruments.join(", ")})`,
      );
    }
  }
  for (const key of ["attached", "cites"]) {
    for (const run of fm[key] ?? []) {
      if (!parseRunId(run)) {
        errors.push(`${key}: "${run}" is not a run id`);
      }
    }
  }
  if (fm.aa_run !== undefined && !parseRunId(fm.aa_run)) {
    errors.push(`aa_run: "${fm.aa_run}" is not a run id`);
  }
  if (fm.decision !== undefined && !ITEM.test(fm.decision)) {
    errors.push("decision: the CS-<n> the verdict informs");
  }
  for (const key of ["computed", "outcome"]) {
    if (fm[key] !== undefined && !OUTCOMES.includes(fm[key])) {
      errors.push(`${key}: one of ${OUTCOMES.join(", ")}`);
    }
  }
  const notes = sections.Notes ?? "";
  if (fm.status === "concluded") {
    if (!fm.outcome || !fm.computed) {
      errors.push("a concluded study has an outcome and the computed verdict");
    }
    if (!sections.Verdict?.trim()) {
      errors.push("a concluded study has a Verdict section");
    }
    if (
      fm.outcome &&
      fm.computed &&
      fm.outcome !== fm.computed &&
      !/^Override: \S/m.test(sections.Verdict ?? "")
    ) {
      errors.push(
        `the outcome (${fm.outcome}) overrides the computed verdict (${fm.computed}): the Verdict section says why, on an "Override: " line`,
      );
    }
    if (!sections.Hypothesis?.trim()) {
      errors.push("a concluded study states its hypothesis");
    }
  } else {
    for (const key of ["outcome", "computed", "holds_for", "cites"]) {
      if (fm[key] !== undefined) {
        errors.push(`${key}: only a concluded study has a verdict`);
      }
    }
  }
  if (
    fm.status === "abandoned" &&
    !/^- \d{4}-\d{2}-\d{2}: Abandoned: \S/m.test(notes)
  ) {
    errors.push(
      'an abandoned study says why, in a note ("- <date>: Abandoned: <reason>")',
    );
  }
  if (fm.status === "open" && !sections.Hypothesis?.trim()) {
    warnings.push("no hypothesis yet: state it before any run that tests it");
  }
  return { errors, warnings };
}

// ------------------------------------------------------------- the files

/** The repository's top level: DYNO_REPO (tests), else git's, from `cwd`. */
export function repoRoot({ env = process.env, cwd = process.cwd() } = {}) {
  if (env.DYNO_REPO) {
    return resolve(env.DYNO_REPO);
  }
  try {
    return execFileSync("git", ["rev-parse", "--show-toplevel"], {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    throw new Error("not in a git checkout: studies live in the repository");
  }
}

export const studiesDirectory = (root) => join(root, STUDIES_PATH);

/** A study's path from the repository's top level. */
export const studyPath = (id) => `${STUDIES_PATH}/${id}.md`;

/**
 * The absolute path of study `id`'s file in `directory`, or undefined when
 * the id isn't one or the file would land anywhere else (the endpoint
 * relies on this: it never writes outside work/studies/).
 */
export function studyFile(directory, id) {
  if (
    typeof id !== "string" ||
    id.length > MAX_ID_LENGTH ||
    !STUDY_ID.test(id)
  ) {
    return undefined;
  }
  const base = resolve(directory);
  const path = resolve(base, `${id}.md`);
  if (basename(path) !== `${id}.md` || !path.startsWith(base + sep)) {
    return undefined;
  }
  // The folder itself must be the repository's: not a link out of it.
  if (existsSync(base)) {
    const real = realpathSync(base);
    if (!real.endsWith(join("work", "studies"))) {
      return undefined;
    }
  }
  return path;
}

function git(root, args, input) {
  try {
    return execFileSync("git", args, {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 1 << 28,
      stdio: [input === undefined ? "ignore" : "pipe", "pipe", "ignore"],
      ...(input === undefined ? {} : { input }),
    });
  } catch {
    return undefined;
  }
}

export const currentBranch = (root) =>
  git(root, ["rev-parse", "--abbrev-ref", "HEAD"])?.trim() ?? "";

/** The repository's local branches. */
export const localBranches = (root) =>
  (git(root, ["for-each-ref", "--format=%(refname:short)", "refs/heads"]) ?? "")
    .split("\n")
    .filter(Boolean);

/** Reads blobs by id in one `git cat-file --batch`: Map id → text. */
function readBlobs(root, ids) {
  const out = new Map();
  const unique = [...new Set(ids)];
  if (!unique.length) {
    return out;
  }
  const raw = execFileSync("git", ["cat-file", "--batch"], {
    cwd: root,
    input: `${unique.join("\n")}\n`,
    maxBuffer: 1 << 28,
    stdio: ["pipe", "pipe", "ignore"],
  });
  let at = 0;
  while (at < raw.length) {
    const nl = raw.indexOf(10, at);
    const [sha, type, size] = raw.subarray(at, nl).toString("utf8").split(" ");
    at = nl + 1;
    if (type === "missing") {
      continue;
    }
    const length = Number(size);
    out.set(sha, raw.subarray(at, at + length).toString("utf8"));
    at += length + 1;
  }
  return out;
}

/** Study files on a branch: [{ id, blob }]. */
function branchStudyBlobs(root, branch) {
  const listing =
    git(root, ["ls-tree", branch, "--", `${STUDIES_PATH}/`]) ?? "";
  return listing
    .split("\n")
    .map((line) => /^\d+ blob ([0-9a-f]+)\t(.+)$/.exec(line))
    .filter(Boolean)
    .map(([, blob, path]) => ({
      blob,
      id: basename(path).replace(/\.md$/, ""),
      path,
    }))
    .filter((s) => s.path.endsWith(".md") && STUDY_ID.test(s.id));
}

/** The study files in this worktree: [{ id, file, text }]. */
function worktreeStudies(root) {
  const directory = studiesDirectory(root);
  if (!existsSync(directory)) {
    return [];
  }
  return readdirSync(directory)
    .filter((f) => f.endsWith(".md") && STUDY_ID.test(f.replace(/\.md$/, "")))
    .sort()
    .map((f) => ({
      id: f.replace(/\.md$/, ""),
      file: join(directory, f),
      text: readFileSync(join(directory, f), "utf8"),
    }));
}

/**
 * The branches other than the current one where study `id` exists, read
 * through git.
 */
export function branchesWith(root, id) {
  const here = currentBranch(root);
  return localBranches(root).filter(
    (b) => b !== here && branchStudyBlobs(root, b).some((s) => s.id === id),
  );
}

/** Reads a study: from this worktree, or from `branch` through git (read-only). */
export function readStudy(root, id, { branch } = {}) {
  if (!STUDY_ID.test(id ?? "")) {
    throw new Error(`"${id}" is not a study id (<date>-<slug>)`);
  }
  let text;
  if (branch && branch !== currentBranch(root)) {
    const found = branchStudyBlobs(root, branch).find((s) => s.id === id);
    if (!found) {
      throw new Error(`no study ${id} on branch ${branch}`);
    }
    text = readBlobs(root, [found.blob]).get(found.blob);
  } else {
    const file = studyFile(studiesDirectory(root), id);
    if (!file || !existsSync(file)) {
      const elsewhere = branchesWith(root, id);
      throw new Error(
        elsewhere.length
          ? `no study ${id} in this worktree; it is on ${elsewhere.join(", ")} (--branch ${elsewhere[0]} to read it)`
          : `no study ${id} (dyno studies lists them)`,
      );
    }
    text = readFileSync(file, "utf8");
  }
  const parsed = parseStudy(text);
  return {
    ...parsed,
    text,
    path: studyPath(id),
    branch: branch ?? currentBranch(root),
  };
}

/** One study's row in a list: stable for the tracker (`studies --json`). */
function rowOf(parsed, { branch, uncommitted = false }) {
  const { fm, sections } = parsed;
  const check = checkStudy(parsed, { file: `${fm.id}.md` });
  return {
    id: fm.id,
    title: fm.title ?? "",
    kind: fm.kind ?? null,
    item: fm.item ?? null,
    status: fm.status ?? null,
    created: fm.created ?? null,
    instruments: fm.instruments ?? [],
    question: (sections.Question ?? "").split("\n")[0] ?? "",
    outcome: fm.outcome ?? null,
    decision: fm.decision ?? null,
    holds_for: fm.holds_for ?? [],
    branch,
    path: studyPath(fm.id),
    uncommitted,
    valid: check.errors.length === 0,
  };
}

/**
 * The studies in this worktree, and with `allBranches` those that exist
 * only on other local branches (labeled with their branch, read-only).
 * Filters: item, status, kind. Sorted by id.
 */
export function listStudies(
  root,
  { allBranches = false, item, status, kind } = {},
) {
  const here = currentBranch(root);
  const dirty = new Set(
    (
      git(root, [
        "status",
        "--porcelain",
        "--untracked-files=all",
        "--",
        `${STUDIES_PATH}/`,
      ]) ?? ""
    )
      .split("\n")
      .filter(Boolean)
      .map((l) => basename(l.slice(3).trim()).replace(/\.md$/, "")),
  );
  const rows = new Map();
  for (const s of worktreeStudies(root)) {
    const parsed = parseStudy(s.text);
    parsed.fm.id ??= s.id;
    rows.set(
      s.id,
      rowOf(parsed, { branch: here, uncommitted: dirty.has(s.id) }),
    );
  }
  if (allBranches) {
    const pending = [];
    for (const branch of localBranches(root)) {
      if (branch === here) {
        continue;
      }
      for (const s of branchStudyBlobs(root, branch)) {
        if (!rows.has(s.id) && !pending.some((p) => p.id === s.id)) {
          pending.push({ ...s, branch });
        }
      }
    }
    const blobs = readBlobs(
      root,
      pending.map((p) => p.blob),
    );
    for (const p of pending) {
      const parsed = parseStudy(blobs.get(p.blob) ?? "");
      parsed.fm.id ??= p.id;
      rows.set(p.id, {
        ...rowOf(parsed, { branch: p.branch }),
        readOnly: true,
      });
    }
  }
  return [...rows.values()]
    .filter((r) => (item ? r.item === item : true))
    .filter((r) => (status ? r.status === status : true))
    .filter((r) => (kind ? r.kind === kind : true))
    .sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * Every study's file text, here and on every local branch: [{ id, branch,
 * text }]. The current worktree's version first.
 */
function everyStudyText(root) {
  const here = currentBranch(root);
  const out = worktreeStudies(root).map((s) => ({
    id: s.id,
    branch: here,
    text: s.text,
  }));
  const pending = [];
  for (const branch of localBranches(root)) {
    for (const s of branchStudyBlobs(root, branch)) {
      pending.push({ ...s, branch });
    }
  }
  const blobs = readBlobs(
    root,
    pending.map((p) => p.blob),
  );
  for (const p of pending) {
    out.push({ id: p.id, branch: p.branch, text: blobs.get(p.blob) ?? "" });
  }
  return out;
}

// ------------------------------------------------------------- retention

/**
 * The runs every study cites or attaches, here and on every local branch:
 * Map run id → [{ study, branch }]. Retention keeps them all (the store's
 * clean-up asks before it prunes; CS-736 builds the pruning).
 */
export function studyRuns(root) {
  const out = new Map();
  for (const { id, branch, text } of everyStudyText(root)) {
    const { fm } = parseStudy(text);
    for (const run of [
      ...(fm.attached ?? []),
      ...(fm.cites ?? []),
      ...(fm.aa_run ? [fm.aa_run] : []),
    ]) {
      const list = out.get(run) ?? [];
      if (!list.some((e) => e.study === id && e.branch === branch)) {
        list.push({ study: id, branch });
      }
      out.set(run, list);
    }
  }
  return out;
}

/**
 * Which of `candidates` (run ids a clean-up would prune) may go: never a
 * run a study cites or attaches on any local branch, never a pinned one.
 * Returns { prune, kept: [{ id, reason }] }.
 */
export function planPrune(
  candidates,
  { cited = new Map(), pinned = new Set() } = {},
) {
  const prune = [];
  const kept = [];
  for (const id of candidates) {
    if (cited.has(id)) {
      kept.push({
        id,
        reason: `cited by ${cited
          .get(id)
          .map((e) => `${e.study} (${e.branch})`)
          .join(", ")}`,
      });
    } else if (pinned.has(id)) {
      kept.push({ id, reason: "pinned" });
    } else {
      prune.push(id);
    }
  }
  return { prune, kept };
}

// ------------------------------------------------------------ the writes

/** The reminder every write prints. */
export const commitReminder = (id) => `commit ${studyPath(id)} with your work`;

/** Today's date, YYYY-MM-DD, in the machine's own time zone. */
export function today(date = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Validates and writes a study into this worktree; throws listing every error. */
export function writeStudy(root, study) {
  const text = serializeStudy(study);
  const reparsed = parseStudy(text);
  const { errors, warnings } = checkStudy(reparsed, {
    file: `${study.fm.id}.md`,
  });
  if (errors.length) {
    const error = new Error(`study ${study.fm.id}: ${errors.join("; ")}`);
    error.errors = errors;
    throw error;
  }
  const directory = studiesDirectory(root);
  const file = studyFile(directory, study.fm.id);
  if (!file) {
    throw new Error(`study ${study.fm.id}: not a path inside ${STUDIES_PATH}`);
  }
  mkdirSync(directory, { recursive: true });
  writeFileSync(file, text);
  return { file, text, warnings };
}

const oneLine = (text, what) => {
  const s = String(text ?? "")
    .replace(/\s+/g, " ")
    .trim();
  if (!s) {
    throw new Error(`${what}: some text, please`);
  }
  return s;
};

const listOf = (value) =>
  value === undefined || value === true
    ? undefined
    : (Array.isArray(value) ? value : [value])
        .flatMap((v) => String(v).split(","))
        .map((v) => v.trim())
        .filter(Boolean);

/** The design's first commands, from the pre-registration. */
function designLines(fm) {
  const id = fm.id;
  const runs = fm.runs ? ` --reps ${fm.runs}` : "";
  switch (fm.kind) {
    case "comparison":
      return [
        `- ${fm.stopping === "sequential" ? "Sequential: look after each run, stop when the always-valid interval settles, at most" : "Fixed:"} ${fm.runs} runs per arm, baseline and candidate paired by device and scene and interleaved.`,
        `- \`npx @cesium/dyno measure start suite --study ${id} --baseline ${fm.baseline} --candidate ${fm.candidate}${runs}\``,
      ];
    case "sweep":
      return [
        `- ${fm.runs} runs per point; the reference ${fm.reference}.`,
        `- \`npx @cesium/dyno measure start suite --study ${id} ${(fm.axes ?? []).map((a) => `--sweep ${a}=…`).join(" ")} --reference ${fm.reference}${runs}\``,
      ];
    default:
      return [
        `- ${fm.runs} runs: \`npx @cesium/dyno measure start suite --study ${id}${runs}\``,
      ];
  }
}

/**
 * Creates a study (`study new`). `options` holds the command's options
 * (kebab-case names, as typed). Refuses an id that exists here or on any
 * local branch, and names every field the kind requires that is missing.
 * Returns { id, path, file, warnings }.
 */
export function createStudy(root, slug, options, { date = today() } = {}) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug ?? "")) {
    throw new Error(
      `"${slug}": a slug in lower-case letters, digits and hyphens (alpha-default)`,
    );
  }
  const id = `${date}-${slug}`;
  if (id.length > MAX_ID_LENGTH) {
    throw new Error(`${id}: at most ${MAX_ID_LENGTH} characters`);
  }
  const file = studyFile(studiesDirectory(root), id);
  if (!file) {
    throw new Error(`${id}: not a study id`);
  }
  if (existsSync(file)) {
    throw new Error(`${id} exists in this worktree (${studyPath(id)})`);
  }
  const elsewhere = localBranches(root).filter((b) =>
    branchStudyBlobs(root, b).some((s) => s.id === id),
  );
  if (elsewhere.length) {
    throw new Error(
      `${id} exists on ${elsewhere.join(", ")}: pick another slug`,
    );
  }
  const kind = options.kind;
  if (!KINDS.includes(kind)) {
    throw new Error(`--kind: one of ${KINDS.join(", ")}`);
  }
  const fm = {
    id,
    title: oneLine(options.title ?? options.question, "--title"),
    kind,
    item: options.item,
    status: "open",
    created: date,
    instruments: listOf(options.instruments) ?? ["suite"],
  };
  const spec = KIND_FIELDS[kind];
  const accepted = new Set([...spec.required, ...spec.optional]);
  for (const [key, type, option] of KEYS) {
    if (!option || options[option] === undefined) {
      continue;
    }
    if (!accepted.has(key)) {
      throw new Error(`--${option}: not a ${kind}'s field`);
    }
    fm[key] =
      type === "list" ? listOf(options[option]) : String(options[option]);
  }
  // The defaults a study writes down (each visible in the file).
  if (kind === "comparison") {
    fm.order ??= "paired-interleaved";
    fm.stopping ??= "fixed";
  }
  if (kind === "comparison" || kind === "sweep") {
    fm.alpha ??= "0.05";
    fm.power ??= "0.8";
    if (fm.noise && fm.prior === undefined) {
      fm.prior = `normal:0:${fm.noise}`;
    }
    if (fm.runs === undefined) {
      const planned = plannedRuns(fm);
      if (planned) {
        fm.runs = String(planned);
      }
    }
  }
  fm.health ??= ["power:ac", "thermal:nominal"];
  // A malformed field says so before anything is counted as missing.
  for (const p of fm.primary ?? []) {
    const parsed = parsePrimary(p);
    if (typeof parsed === "string") {
      throw new Error(parsed);
    }
  }
  for (const key of ["guardrails", "criteria", "tolerances"]) {
    for (const g of fm[key] ?? []) {
      const parsed = parseBound(g, { relative: key === "guardrails" });
      if (typeof parsed === "string") {
        throw new Error(`${key} ${parsed}`);
      }
    }
  }
  const missing = missingFields(fm);
  if (missing.length) {
    const error = new Error(
      `a ${kind} needs, before any run counts: ${missing.map((k) => FIELD_HELP[k]).join("; ")}`,
    );
    error.missing = missing;
    throw error;
  }
  const sections = {
    Question: oneLine(options.question, "--question"),
    Hypothesis: options.hypothesis
      ? oneLine(options.hypothesis, "--hypothesis")
      : "",
    Design: designLines(fm).join("\n"),
  };
  const written = writeStudy(root, { fm, sections });
  return {
    id,
    path: studyPath(id),
    file: written.file,
    warnings: written.warnings,
  };
}

/** Reads, changes and writes a study in this worktree. */
function update(root, id, change) {
  const study = readStudy(root, id);
  if (study.errors.length) {
    throw new Error(`study ${id} doesn't parse: ${study.errors.join("; ")}`);
  }
  const extra = change(study) ?? {};
  const written = writeStudy(root, study);
  return {
    id,
    path: studyPath(id),
    file: written.file,
    warnings: written.warnings,
    ...extra,
  };
}

const addNote = (sections, date, text) => {
  sections.Notes = [sections.Notes?.trim(), `- ${date}: ${text}`]
    .filter(Boolean)
    .join("\n");
};

/** `study note`: a dated observation. */
export const noteStudy = (root, id, text, { date = today() } = {}) =>
  update(root, id, ({ sections }) =>
    addNote(sections, date, oneLine(text, "the note")),
  );

/** `study attach`: earlier runs as evidence (the runs stay as they are). */
export function attachRuns(root, id, runs) {
  for (const run of runs) {
    if (!parseRunId(run)) {
      throw new Error(`"${run}" is not a run id`);
    }
  }
  return update(root, id, ({ fm }) => {
    const added = runs.filter(
      (r) => !(fm.attached ?? []).includes(parseRunId(r).id),
    );
    fm.attached = [
      ...(fm.attached ?? []),
      ...added.map((r) => parseRunId(r).id),
    ];
    return { added };
  });
}

/** `study abandon`: the status, and why. */
export function abandonStudy(root, id, reason, { date = today() } = {}) {
  const why = oneLine(reason, "--reason");
  return update(root, id, ({ fm, sections }) => {
    if (fm.status !== "open") {
      throw new Error(
        `study ${id} is ${fm.status}: only an open study can be abandoned (reopen it first)`,
      );
    }
    fm.status = "abandoned";
    addNote(sections, date, `Abandoned: ${why}`);
  });
}

/**
 * `study reopen`: back to open. The old verdict stays in git's history; the
 * file says when it was reopened, and why.
 */
export function reopenStudy(root, id, reason, { date = today() } = {}) {
  const why = oneLine(reason, "--reason");
  return update(root, id, ({ fm, sections }) => {
    if (fm.status === "open") {
      throw new Error(`study ${id} is already open`);
    }
    const was = fm.status === "concluded" ? `${fm.outcome}` : "abandoned";
    fm.status = "open";
    for (const key of [
      "computed",
      "outcome",
      "holds_for",
      "decision",
      "cites",
    ]) {
      delete fm[key];
    }
    sections.Verdict = "";
    addNote(sections, date, `Reopened (was ${was}): ${why}`);
  });
}

/**
 * `study verdict`: writes a verdict already computed (studyVerdict.mjs) and
 * the author's words. `outcome` defaults to the computed one; a different
 * one needs `override`, the written reason, kept in the file.
 */
export function concludeStudy(
  root,
  id,
  {
    computed,
    outcome,
    override,
    reasoning,
    decision,
    cites = [],
    holdsFor = [],
    readout = [],
  },
) {
  return update(root, id, ({ fm, sections }) => {
    if (fm.status !== "open") {
      throw new Error(
        `study ${id} is ${fm.status}: reopen it to record another verdict`,
      );
    }
    if (!sections.Hypothesis?.trim()) {
      throw new Error(`study ${id} has no hypothesis: a verdict tests one`);
    }
    const final = outcome ?? computed;
    if (!OUTCOMES.includes(final)) {
      throw new Error(`--outcome: one of ${OUTCOMES.join(", ")}`);
    }
    if (final !== computed && !override) {
      throw new Error(
        `the computed verdict is ${computed}: recording ${final} needs --override "<why>", kept in the file`,
      );
    }
    if (decision !== undefined && !ITEM.test(decision)) {
      throw new Error("--decision CS-<n>");
    }
    fm.status = "concluded";
    fm.computed = computed;
    fm.outcome = final;
    fm.holds_for = holdsFor;
    if (decision) {
      fm.decision = decision;
    }
    fm.cites = cites.map((c) => c.run);
    const capital = (s) => s.charAt(0).toUpperCase() + s.slice(1);
    sections.Verdict = [
      `${capital(final)}.${reasoning ? ` ${oneLine(reasoning, "--reasoning")}` : ""}`,
      ...(final !== computed
        ? ["", `Override: ${oneLine(override, "--override")}`]
        : []),
      "",
      `Computed from the pre-stated criteria: ${computed}${holdsFor.length ? ` (holds for ${holdsFor.join(", ")})` : ""}.`,
      ...readout.map((line) => `- ${line}`),
      ...(cites.length
        ? ["", ...cites.map((c) => `- \`${c.run}\`: ${c.showed}`)]
        : []),
    ].join("\n");
  });
}

/** Checks every study file in this worktree: [{ id, file, errors, warnings }]. */
export function checkAll(root) {
  return worktreeStudies(root).map((s) => ({
    id: s.id,
    path: studyPath(s.id),
    ...checkStudy(parseStudy(s.text), { file: basename(s.file) }),
  }));
}
