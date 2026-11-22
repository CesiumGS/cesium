// dyno's run-finding commands (CS-392): `runs`, `show <id>` and `pin <id>`.
//
// They read a run's summary (`<id>.summary.json`) and nothing else: never
// the run's full record, never its samples. The reader and a run's identity
// are `dyno result`'s (result.mjs, summariesIn and identity); `show` is
// `result show` with the pin added, so it keeps that command's rule: measured
// values only with --values. A run's id is its summary's file name without
// the suffix (identity.mjs).
//
// Pins live in `pins.json` in the results store, not in the summary: a
// summary is derived (`dyno suite resummarize` rewrites it), a pin is the
// person's choice. `pinnedRuns` returns the set the store's clean-up reads
// (studies.mjs, planPrune), so retention keeps a pinned run.
import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseRunId } from "../identity.mjs";
import { kindOf, resultsDirectory } from "../studyVerdict.mjs";
import { DynoError } from "./dispatch.mjs";
import { identity, showResult, summariesIn } from "./result.mjs";

const PINS_FILE = "pins.json";


// ----------------------------------------------------------------- the pins

/**
 * The pins: Map run id → when it was pinned (ISO). A missing file is no pins.
 * A file that exists but can't be read or parsed throws: reading it as "no
 * pins" would let the next `pin` overwrite every pin, and let the clean-up
 * prune pinned runs.
 */
export function readPins(results) {
  const path = join(results, PINS_FILE);
  const out = new Map();
  if (!existsSync(path)) {
    return out;
  }
  let file;
  try {
    file = JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    throw new DynoError(
      "problem",
      `${path} can't be read (${error.message}): fix it or remove it`,
      { file: path },
    );
  }
  if (file === null || typeof file !== "object" || Array.isArray(file)) {
    throw new DynoError(
      "problem",
      `${path} isn't a pins file: fix it or remove it`,
      { file: path },
    );
  }
  for (const [id, pin] of Object.entries(file.pins ?? {})) {
    out.set(id, pin?.pinned ?? null);
  }
  return out;
}

/**
 * The pins for a listing. A corrupt file doesn't hide the run list: it warns
 * (through `warn`) and lists the runs as unpinned.
 */
function readPinsForListing(results, warn) {
  try {
    return readPins(results);
  } catch (error) {
    if (!(error instanceof DynoError)) {
      throw error;
    }
    warn?.(`warning: ${error.message}; runs list as not pinned`);
    return new Map();
  }
}

/** The ids of the pinned runs, for the clean-up (planPrune's `pinned`). */
export const pinnedRuns = (results) => new Set(readPins(results).keys());

function writePins(results, pins) {
  const body = {
    version: 1,
    pins: Object.fromEntries(
      [...pins]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([id, pinned]) => [id, { pinned }]),
    ),
  };
  // Written beside, then renamed: a reader never sees half a file.
  const temporary = join(results, `${PINS_FILE}.${process.pid}.tmp`);
  writeFileSync(temporary, `${JSON.stringify(body, null, 2)}\n`);
  renameSync(temporary, join(results, PINS_FILE));
}

// ------------------------------------------------------------ the summaries

/** One run's row for `runs`: who and what, never its metrics. */
export function runRow({ id, summary }, pins) {
  const who = identity(summary, id);
  return {
    id,
    date: who.date ?? parseRunId(id)?.date?.toISOString() ?? null,
    kind: kindOf(summary, false),
    purpose: who.purpose ?? "baseline",
    commit: who.commit ?? null,
    branch: who.branch ?? null,
    item: who.item ?? null,
    study: who.study ?? null,
    machine: who.machine ?? null,
    scenes: [...new Set((summary.scenes ?? []).map((c) => c.scene))],
    tags: who.tags,
    validity: who.validity ?? null,
    note: summary.note ?? null,
    pinned: pins.has(id),
  };
}

// A date is the whole UTC day; an ISO time without a zone is UTC too (a bare
// Date.parse would read it in the machine's own zone).
const ZONELESS = /^\d{4}-\d\d-\d\dT[\d:.]+$/;
const startOf = (text) =>
  /^\d{4}-\d\d-\d\d$/.test(text)
    ? `${text}T00:00:00.000Z`
    : ZONELESS.test(text)
      ? `${text}Z`
      : text;
const endOf = (text) =>
  /^\d{4}-\d\d-\d\d$/.test(text) ? `${text}T23:59:59.999Z` : startOf(text);

function checkDate(name, text) {
  if (typeof text !== "string" || text.trim() === "") {
    throw new DynoError("usage", `--${name}: needs a date such as 2026-11-21`);
  }
  if (Number.isNaN(Date.parse(startOf(text)))) {
    throw new DynoError(
      "usage",
      `--${name} ${text}: a date such as 2026-11-21 (or an ISO time)`,
    );
  }
}

/** The rows matching the filters, newest first. */
export function listRuns(results, opts = {}, warn) {
  for (const name of ["since", "until"]) {
    if (opts[name] !== undefined) {
      checkDate(name, opts[name]);
    }
  }
  const kinds = ["bench", "images", "coldstart", "recording", "lab"];
  if (opts.kind !== undefined && !kinds.includes(opts.kind)) {
    throw new DynoError(
      "usage",
      `--kind ${opts.kind}: one of ${kinds.join(", ")}`,
    );
  }
  const since = opts.since !== undefined ? Date.parse(startOf(opts.since)) : undefined;
  const until = opts.until !== undefined ? Date.parse(endOf(opts.until)) : undefined;
  const pins = readPinsForListing(results, warn);
  return summariesIn(results)
    .filter((entry) => entry.summary)
    .map((entry) => runRow(entry, pins))
    .filter(
      (row) =>
        (opts.kind === undefined || row.kind === opts.kind) &&
        (opts.purpose === undefined || row.purpose === opts.purpose) &&
        (opts.commit === undefined ||
          (row.commit ?? "").startsWith(opts.commit)) &&
        (opts.scene === undefined || row.scenes.includes(opts.scene)) &&
        (opts.tag === undefined || row.tags.includes(opts.tag)) &&
        (opts.item === undefined || row.item === opts.item) &&
        (opts.branch === undefined || row.branch === opts.branch) &&
        (!opts.pinned || row.pinned) &&
        (since === undefined || Date.parse(row.date) >= since) &&
        (until === undefined || Date.parse(row.date) <= until),
    )
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? "") || (a.id < b.id ? -1 : 1));
}

// ----------------------------------------------------------------- printing

const day = (iso) => (iso ? iso.slice(0, 16).replace("T", " ") : "?");

/** The table `runs` prints, as lines. */
export function runLines(rows) {
  if (!rows.length) {
    return ["no runs match"];
  }
  const cells = rows.map((r) => [
    r.id,
    day(r.date),
    r.kind,
    r.purpose,
    (r.commit ?? "").slice(0, 10),
    r.scenes.length ? `${r.scenes.length} scene${r.scenes.length === 1 ? "" : "s"}` : "",
    r.tags.join(","),
    r.pinned ? "pinned" : "",
  ]);
  const head = ["id", "date (UTC)", "kind", "purpose", "commit", "scenes", "tags", ""];
  const widths = head.map((h, i) => Math.max(h.length, ...cells.map((c) => c[i].length)));
  const line = (c) =>
    c.map((v, i) => v.padEnd(widths[i])).join("  ").trimEnd();
  return [line(head), ...cells.map(line), "", `${rows.length} run${rows.length === 1 ? "" : "s"}`];
}

/** The lines `show` prints for one run. */
export function showLines(row, summary) {
  const field = (name, value) =>
    value === null || value === undefined || value === ""
      ? []
      : [`${name.padEnd(10)}${value}`];
  const v = summary.validity;
  return [
    row.id,
    ...field("date", day(row.date)),
    ...field("kind", row.kind),
    ...field("purpose", row.purpose),
    ...field("item", row.item),
    ...field("study", row.study),
    ...field("commit", row.commit && `${row.commit}${summary.dirty ? " (dirty)" : ""}`),
    ...field("branch", row.branch),
    ...field("machine", row.machine),
    ...field("hardware", summary.hardware),
    ...field("tags", row.tags.join(", ")),
    ...field("note", row.note),
    ...field("validity", v && `${v.valid} valid, ${v.warning} warning, ${v.invalid} invalid`),
    ...field("pinned", row.pinned ? "yes" : "no"),
    ...(summary.scenes?.length
      ? [
          "",
          `${summary.scenes.length} cell${summary.scenes.length === 1 ? "" : "s"} (scene, scenario, configuration):`,
          ...summary.scenes.map(
            (c) =>
              `  ${c.scene} ${c.scenario} ${c.config}: ${Object.keys(c.metrics ?? {}).length} metrics${c.warnings ? `, ${c.warnings} warning` : ""}`,
          ),
        ]
      : []),
  ];
}

// ----------------------------------------------------------------- commands

/** `runs`: the store's runs, from their summaries. */
export function runs({ opts, env, warn }) {
  const rows = listRuns(resultsDirectory(env), opts, warn);
  const limit = opts.limit === undefined ? undefined : Number(opts.limit);
  if (limit !== undefined && !(Number.isInteger(limit) && limit > 0)) {
    throw new DynoError("usage", `--limit ${opts.limit}: a whole number above 0`);
  }
  const shown = limit ? rows.slice(0, limit) : rows;
  return {
    runs: shown,
    total: rows.length,
    lines: runLines(shown),
  };
}

/** `show <id>`: one run's identity, verdict and cells. */
export function show({ args, opts, env, warn }) {
  const results = resultsDirectory(env);
  const id = args[0];
  // An unknown id is a usage error (exit 2), as for `pin`: the argument is
  // wrong. (`result show` keeps its own code for the same case.)
  requireRun(results, id);
  const shown = showResult({ id, values: Boolean(opts.values), env });
  const entry = summariesIn(results).find((e) => e.id === id);
  const row = runRow(entry, readPinsForListing(results, warn));
  return {
    ...shown,
    run: { ...shown.run, kind: row.kind, scenes: row.scenes, note: row.note, pinned: row.pinned },
    lines: showLines(row, entry.summary),
  };
}

function requireRun(results, id) {
  if (!/^[\w.@+-]+$/.test(id) || !summariesIn(results).some((e) => e.id === id)) {
    throw new DynoError("usage", `no run ${id} in the results store (dyno runs lists them)`, { run: id });
  }
}

/** `pin <id>` and `pin <id> --unpin`. */
export function pin({ args, opts, env }) {
  const results = resultsDirectory(env);
  const id = args[0];
  requireRun(results, id);
  // A corrupt pins file throws here, before anything is written.
  const pins = readPins(results);
  const was = pins.has(id);
  if (opts.unpin) {
    pins.delete(id);
  } else if (!was) {
    pins.set(id, new Date().toISOString());
  }
  if (opts.unpin ? was : !was) {
    // Read again just before the write, so a pin made since the first read
    // isn't lost. Two `pin` calls at the same moment can still race (a lock
    // isn't worth it for a one-person tool).
    const latest = readPins(results);
    if (opts.unpin) {
      latest.delete(id);
    } else {
      latest.set(id, pins.get(id));
    }
    writePins(results, latest);
  }
  const pinned = pins.has(id);
  return {
    id,
    pinned,
    changed: pinned !== was,
    lines: [
      pinned
        ? `${id}: pinned${was ? " already" : ": clean-up keeps it"}`
        : `${id}: ${was ? "unpinned" : "was not pinned"}`,
    ],
  };
}
