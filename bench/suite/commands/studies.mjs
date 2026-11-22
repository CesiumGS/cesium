// dyno's study commands (CS-404): `study new`, `note`, `attach`, `verdict`,
// `abandon`, `reopen`, `show`, `check`, `power`, and `studies`. The model
// and the files are studies.mjs; the evidence and the computed verdict
// studyVerdict.mjs; the format packages/next/work/studies/README.md.
//
// Each write validates the whole file, writes it in this worktree, and says
// to commit it with your work. Nothing commits.
import process from "node:process";
import {
  abandonStudy,
  attachRuns,
  checkAll,
  checkStudy,
  commitReminder,
  concludeStudy,
  createStudy,
  listStudies,
  missingFields,
  noteStudy,
  parseBound,
  parsePrimary,
  readStudy,
  reopenStudy,
  repoRoot,
  FIELD_HELP,
} from "../studies.mjs";
import {
  citationWarnings,
  computeVerdict,
  evidenceRows,
  loadEvidence,
  resultsDirectory,
} from "../studyVerdict.mjs";
import { runsNeeded } from "../studyStats.mjs";
import { DynoError } from "./dispatch.mjs";

const rootOf = (env) => {
  try {
    return repoRoot({ env });
  } catch (error) {
    throw new DynoError("problem", error.message);
  }
};

/** Runs a study write, turning its refusals into usage errors. */
function writing(fn) {
  try {
    return fn();
  } catch (error) {
    if (error instanceof DynoError) {
      throw error;
    }
    throw new DynoError("usage", error.message, {
      ...(error.missing ? { missing: error.missing } : {}),
      ...(error.errors ? { errors: error.errors } : {}),
    });
  }
}

const wrote = (out, extra = []) => ({
  id: out.id,
  path: out.path,
  warnings: out.warnings ?? [],
  lines: [
    ...extra,
    ...(out.warnings ?? []).map((w) => `warning: ${w}`),
    commitReminder(out.id),
  ],
});

/** `study new <slug>`. */
export function studyNew({ args, opts, env }) {
  const root = rootOf(env);
  if (!opts.item) {
    throw new DynoError("usage", "--item CS-<n>: the item the study serves");
  }
  if (!opts.question) {
    throw new DynoError("usage", '--question "…": what the study asks');
  }
  if (!opts.kind) {
    throw new DynoError(
      "usage",
      "--kind comparison|sweep|feasibility|calibration: what the study writes down before results",
    );
  }
  const out = writing(() =>
    createStudy(root, args[0], opts, opts.date ? { date: opts.date } : {}),
  );
  return wrote(out, [`study ${out.id}: ${out.path}`]);
}

/** `study note <id> <text>`. */
export const studyNote = ({ args, opts, env }) =>
  wrote(
    writing(() =>
      noteStudy(
        rootOf(env),
        args[0],
        args.slice(1).join(" "),
        opts.date ? { date: opts.date } : {},
      ),
    ),
    [`noted on ${args[0]}`],
  );

/** `study attach <id> <run…>`. */
export function studyAttach({ args, env }) {
  const out = writing(() => attachRuns(rootOf(env), args[0], args.slice(1)));
  return {
    ...wrote(out, [
      out.added.length
        ? `attached ${out.added.join(", ")}`
        : "every run was already attached",
    ]),
    added: out.added,
  };
}

export const studyAbandon = ({ args, opts, env }) =>
  wrote(
    writing(() =>
      abandonStudy(
        rootOf(env),
        args[0],
        opts.reason,
        opts.date ? { date: opts.date } : {},
      ),
    ),
    [`${args[0]}: abandoned`],
  );

export const studyReopen = ({ args, opts, env }) =>
  wrote(
    writing(() =>
      reopenStudy(
        rootOf(env),
        args[0],
        opts.reason,
        opts.date ? { date: opts.date } : {},
      ),
    ),
    [`${args[0]}: open again`],
  );

/** A computed verdict without its per-run records, for JSON. */
const verdictData = (v) => ({
  outcome: v.outcome,
  holds_for: v.holds_for,
  reasons: v.reasons,
  warnings: v.warnings,
  settle: v.settle,
  excluded: v.excluded,
  readout: v.readout,
  strata: v.strata,
});

/** `study cite` values: `run:what it showed`. */
function parseCites(values = []) {
  return values.map((value) => {
    const at = value.indexOf(":");
    if (at <= 0 || !value.slice(at + 1).trim()) {
      throw new DynoError(
        "usage",
        `--cite ${value}: <run>:<what it showed, with numbers and units>`,
      );
    }
    return { run: value.slice(0, at), showed: value.slice(at + 1).trim() };
  });
}

/** `study verdict <id>`: computes the verdict, then records it. */
export function studyVerdict({ args, opts, env }) {
  const root = rootOf(env);
  const id = args[0];
  const study = writing(() => readStudy(root, id));
  const cites = parseCites(opts.cite);
  const evidence = loadEvidence(study.fm, {
    results: resultsDirectory(env),
    cites: cites.map((c) => c.run),
  });
  const verdict = computeVerdict(study.fm, evidence);
  const warnings = [
    ...verdict.warnings,
    ...citationWarnings(cites, evidence, verdict),
  ];
  const outcome = opts.outcome ?? verdict.outcome;
  if (outcome !== "inconclusive" && !cites.length) {
    throw new DynoError(
      "usage",
      `a ${outcome} verdict cites its runs: --cite <run>:<what it showed>`,
    );
  }
  const out = writing(() =>
    concludeStudy(root, id, {
      computed: verdict.outcome,
      outcome,
      override: opts.override,
      reasoning:
        opts.reasoning ??
        (verdict.outcome === "inconclusive" && verdict.settle
          ? `What would settle it: ${verdict.settle}.`
          : undefined),
      decision: opts.decision,
      cites,
      holdsFor: verdict.holds_for,
      readout: verdict.readout,
    }),
  );
  return {
    id,
    path: out.path,
    computed: verdictData(verdict),
    outcome,
    warnings,
    lines: [
      `${id}: ${outcome}${outcome !== verdict.outcome ? ` (computed: ${verdict.outcome}, overridden)` : ""}${verdict.holds_for.length ? `, holds for ${verdict.holds_for.join(", ")}` : ""}`,
      ...verdict.readout.map((l) => `  ${l}`),
      ...warnings.map((w) => `warning: ${w}`),
      commitReminder(id),
    ],
  };
}

/** `study show <id> [--branch b]`: the study, its evidence, and the verdict so far. */
export function studyShow({ args, opts, env }) {
  const root = rootOf(env);
  const study = writing(() =>
    readStudy(root, args[0], opts.branch ? { branch: opts.branch } : {}),
  );
  const check = checkStudy(study, { file: `${args[0]}.md` });
  const evidence = loadEvidence(study.fm, { results: resultsDirectory(env) });
  const verdict = computeVerdict(study.fm, evidence);
  const rows = evidenceRows(evidence);
  const { fm, sections } = study;
  return {
    id: fm.id,
    path: study.path,
    branch: study.branch,
    study: { ...fm },
    sections,
    errors: check.errors,
    warnings: check.warnings,
    evidence: rows,
    computed: verdictData(verdict),
    exitCode: check.errors.length ? 1 : 0,
    lines: [
      `${fm.id}: ${fm.title} (${fm.kind}, ${fm.item}, ${fm.status}${fm.outcome ? `: ${fm.outcome}` : ""}) on ${study.branch}`,
      `instruments: ${(fm.instruments ?? []).join(", ")}`,
      `question: ${sections.Question ?? ""}`,
      `hypothesis: ${sections.Hypothesis || "(not stated yet)"}`,
      ...(fm.primary ? [`primary: ${fm.primary.join(", ")}`] : []),
      ...(fm.guardrails ? [`guardrails: ${fm.guardrails.join(", ")}`] : []),
      ...(fm.runs
        ? [
            `plan: ${fm.runs} runs, ${fm.stopping ?? "fixed"}${fm.noise ? `, noise ${fm.noise}` : ""}`,
          ]
        : []),
      `evidence: ${rows.length ? "" : "none yet"}`,
      ...rows.map(
        (r) =>
          `  ${r.id}  ${r.inStore ? `${r.kind}, ${r.validity}${r.health && !r.health.ok ? `, fails the health bar (${r.health.reasons.join("; ")})` : ""}` : `not in this store (made on ${r.machine})`}${r.made ? "" : r.attached ? "  (attached)" : "  (cited)"}`,
      ),
      `computed verdict so far: ${verdict.outcome}${verdict.holds_for.length ? ` (holds for ${verdict.holds_for.join(", ")})` : ""}`,
      ...verdict.readout.map((l) => `  ${l}`),
      ...(verdict.settle ? [`what would settle it: ${verdict.settle}`] : []),
      ...check.errors.map((e) => `error: ${e}`),
      ...check.warnings.map((w) => `warning: ${w}`),
    ],
  };
}

/** `study check`: every study file in this worktree (the shared validator). */
export function studyCheck({ env }) {
  const results = checkAll(rootOf(env));
  const bad = results.filter((r) => r.errors.length);
  return {
    studies: results,
    exitCode: bad.length ? 1 : 0,
    lines: [
      ...results.flatMap((r) => [
        ...r.errors.map((e) => `${r.path}: ${e}`),
        ...r.warnings.map((w) => `${r.path}: warning: ${w}`),
      ]),
      `${results.length} ${results.length === 1 ? "study" : "studies"}, ${bad.length} with errors`,
    ],
  };
}

/** `study power`: a run count from a noise floor and a minimum effect. */
export function studyPower({ opts }) {
  const noise = Number(opts.noise);
  const effect = Number(opts.effect);
  const alpha = Number(opts.alpha ?? 0.05);
  const power = Number(opts.power ?? 0.8);
  let runs;
  try {
    runs = runsNeeded({ noise, effect, alpha, power });
  } catch (error) {
    throw new DynoError("usage", `${error.message} (--noise, --effect)`);
  }
  return {
    noise,
    effect,
    alpha,
    power,
    runs,
    lines: [
      `${runs} runs per arm: a noise floor of ${noise} against a minimum effect of ${effect}, α ${alpha}, power ${power} (paired, two-sided)`,
    ],
  };
}

/** `studies`: the list, stable for the tracker (`--item CS-<n> --json`). */
export function studiesList({ opts, env }) {
  const studies = listStudies(rootOf(env), {
    allBranches: Boolean(opts["all-branches"]),
    item: opts.item,
    status: opts.status,
    kind: opts.kind,
  });
  return {
    studies,
    lines: studies.length
      ? studies.map(
          (s) =>
            `  ${s.id}  ${s.status}${s.outcome ? `: ${s.outcome}` : ""}  ${s.kind}  ${s.item}  ${s.title}${s.readOnly ? `  (on ${s.branch})` : ""}${s.uncommitted ? "  (uncommitted)" : ""}${s.valid ? "" : "  (invalid: dyno study check)"}`,
        )
      : ["no studies"],
  };
}

/**
 * What a run's study options mean, before anything runs (suite.mjs and
 * `measure start`): a hypothesis without a study is refused, naming `study
 * new`; a study must exist here, be open, parse, state its hypothesis and
 * have every field its kind requires. Returns undefined without --study,
 * else { id, fm, expectations, inherit } for the run to apply. Throws
 * Error with `kind` "usage" or "refused".
 */
export function studyForRun(
  opts,
  { env = process.env, cwd = process.cwd() } = {},
) {
  const fail = (kind, message) => {
    const error = new Error(message);
    error.kind = kind;
    throw error;
  };
  if (opts.hypothesis && !opts.study) {
    fail(
      "usage",
      '--hypothesis needs a study: run `dyno study new <slug> --kind … --item CS-<n> --question "…" --hypothesis "…"` first, then this run with --study <id>',
    );
  }
  if (!opts.study || opts.study === true) {
    return undefined;
  }
  let study;
  try {
    study = readStudy(repoRoot({ env, cwd }), String(opts.study));
  } catch (error) {
    fail("refused", `--study: ${error.message}`);
  }
  const { fm, sections } = study;
  const check = checkStudy(study, { file: `${opts.study}.md` });
  const missing = missingFields(fm);
  if (missing.length) {
    fail(
      "refused",
      `study ${fm.id} is a ${fm.kind} without ${missing.join(", ")}: no run counts before it has them (${missing.map((k) => FIELD_HELP[k]).join("; ")})`,
    );
  }
  if (check.errors.length) {
    fail("refused", `study ${fm.id} doesn't check: ${check.errors.join("; ")}`);
  }
  if (fm.status !== "open") {
    fail(
      "refused",
      `study ${fm.id} is ${fm.status}: reopen it to run against it`,
    );
  }
  if (!sections.Hypothesis?.trim()) {
    fail(
      "refused",
      `study ${fm.id} has no hypothesis: state it in its Hypothesis section before a run tests it`,
    );
  }
  const primaries = (fm.primary ?? []).map(parsePrimary);
  const guardrails = (fm.guardrails ?? []).map((g) => parseBound(g));
  const margins = guardrails.filter((g) => g.margin).map((g) => g.margin);
  return {
    id: fm.id,
    fm,
    // What the run inherits (explicit options override it, and the run records that).
    inherit: {
      item: fm.item,
      hypothesis: sections.Hypothesis.trim(),
      ...(fm.kind === "comparison"
        ? { baseline: fm.baseline, candidate: fm.candidate }
        : {}),
      ...(primaries.length ? { primary: primaries[0].metric } : {}),
      ...(guardrails.length
        ? { guardrails: guardrails.map((g) => g.metric).join(",") }
        : {}),
      ...(margins.length ? { tolerance: String(Math.min(...margins)) } : {}),
    },
    // A copy of the expectations, kept in the run's plan.
    expectations: {
      id: fm.id,
      kind: fm.kind,
      instruments: fm.instruments,
      ...Object.fromEntries(
        [
          "primary",
          "guardrails",
          "secondary",
          "criteria",
          "tolerances",
          "runs",
          "stopping",
          "alpha",
          "noise",
          "reference",
          "axes",
        ]
          .filter((k) => fm[k] !== undefined)
          .map((k) => [k, fm[k]]),
      ),
    },
  };
}

/**
 * Applies a study to a run's options: fills what the run doesn't say and
 * returns the overrides (an option the run gave that differs from the
 * study's), which the run records.
 */
export function applyStudy(opts, found) {
  const overrides = {};
  for (const [key, value] of Object.entries(found.inherit)) {
    if (opts[key] === undefined) {
      opts[key] = value;
    } else if (String(opts[key]) !== String(value)) {
      overrides[key] = { study: value, run: opts[key] };
    }
  }
  return overrides;
}
