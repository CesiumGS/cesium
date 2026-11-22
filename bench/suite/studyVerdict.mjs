// A study's evidence and its computed verdict (CS-404;
// work/studies/README.md, "The verdict").
//
// Evidence is every run in this machine's results store whose `study`
// names the study, the runs its file attaches, and the runs a verdict
// cites. A run not in this store shows by its id and machine instead of
// disappearing.
//
// The verdict (supported, refuted, inconclusive) is computed from what the
// study wrote down before results, never chosen: each device is a stratum,
// and the verdict names the hardware it holds for. Runs that fail the
// study's health bar (on battery, load above its limit, a thermal state
// other than nominal) are excluded, and the verdict says which. A missing
// instrument's runs make it inconclusive. Beside it, a Bayesian readout:
// the probability of a win, the expected loss, and scenes that differ.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import process from "node:process";
import { isRunFile, parseRunId } from "./identity.mjs";
import { declares, instrument } from "./instruments.mjs";
import {
  effectGain,
  parseBound,
  parseHealth,
  parsePrimary,
  parsePrior,
} from "./studies.mjs";
import {
  bayesReadout,
  benjaminiHochberg,
  describe,
  hierarchical,
  sequentialInterval,
  tInterval,
} from "./studyStats.mjs";

/** The results store (BENCH_RESULTS, else ~/.cesium-bench/results). */
export const resultsDirectory = (env = process.env) =>
  env.BENCH_RESULTS ?? join(homedir(), ".cesium-bench", "results");

const readJson = (file) => {
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return undefined;
  }
};

/** A run's kind, from its summary or record. */
export function kindOf(record, images) {
  if (images) {
    return "images";
  }
  if (record.kind === "recording" || record.kind === "lab") {
    return record.kind;
  }
  if ((record.tags ?? []).includes("cold-start") || record.coldStart) {
    return "coldstart";
  }
  return "bench";
}

/** The instrument that makes runs of `kind`. */
const instrumentOfKind = (kind) =>
  ({ bench: "suite", coldstart: "coldstart", images: "images", lab: "lab" })[
    kind
  ] ?? null;

/** A run's validity: the worst of its repetitions'. */
function validityOf(summary) {
  const v = summary?.validity;
  if (!v) {
    return "valid";
  }
  if (v.invalid > 0) {
    return "invalid";
  }
  return v.warning > 0 ? "warning" : "valid";
}

/**
 * Whether a run's recorded machine state passes the study's health bar:
 * { ok, reasons, unknown } (unknown: a field the bar asks about that the
 * run didn't record, so it can't be checked).
 */
export function checkHealth(state, bar) {
  const reasons = [];
  const unknown = [];
  for (const spec of bar) {
    const h = parseHealth(spec);
    if (typeof h === "string") {
      continue;
    }
    if (h.key === "power") {
      if (state?.power === undefined) {
        unknown.push("power");
      } else if (state.power !== "ac") {
        reasons.push("on battery");
      }
    } else if (h.key === "load") {
      const load = state?.loadAverage?.[0];
      if (!Number.isFinite(load)) {
        unknown.push("load");
      } else if (load > h.value) {
        reasons.push(`load ${load.toFixed(1)} above ${h.value}`);
      }
    } else if (h.key === "thermal") {
      if (state?.thermal === undefined) {
        unknown.push("thermal");
      } else if (state.thermal !== "nominal") {
        reasons.push(`thermal state ${state.thermal}`);
      }
    } else if (h.key === "battery") {
      if (state?.power === "battery") {
        if (!Number.isFinite(state.battery)) {
          unknown.push("battery");
        } else if (state.battery < h.value) {
          reasons.push(`battery at ${state.battery}%, under ${h.value}%`);
        }
      }
    }
  }
  return { ok: reasons.length === 0, reasons, unknown };
}

/**
 * The store's runs that a study draws on: those made for it (`study`), the
 * ones it attaches and the ones `cites` names. Returns an evidence list:
 * { id, inStore, machine, kind, instrument, made, attached, cited,
 * validity, state, health, record }; `record` (the summary, or an image
 * run's record) is for the verdict's computation and is never printed.
 */
export function loadEvidence(
  fm,
  { results = resultsDirectory(), cites = [] } = {},
) {
  const wanted = new Set([
    ...(fm.attached ?? []),
    ...(fm.cites ?? []),
    ...cites,
  ]);
  const found = new Map();
  const consider = (record, file, images) => {
    const id = record.id ?? parseRunId(file)?.id;
    if (!id || (record.study !== fm.id && !wanted.has(id))) {
      return;
    }
    found.set(id, { record, file, images });
  };
  if (existsSync(results)) {
    for (const name of readdirSync(results)) {
      if (name.endsWith(".summary.json")) {
        const summary = readJson(join(results, name));
        if (summary) {
          consider(summary, name.replace(/\.summary\.json$/, ".json"), false);
        }
      }
    }
    const imagesDir = join(results, "images");
    if (existsSync(imagesDir)) {
      for (const name of readdirSync(imagesDir).filter(isRunFile)) {
        const record = readJson(join(imagesDir, name));
        if (record) {
          consider(record, name, true);
        }
      }
    }
  }
  const evidence = [];
  for (const [id, { record, file, images }] of found) {
    const kind = kindOf(record, images);
    // The machine's state is in the run's full record (the summary leaves
    // it out); an image run's record is its full record.
    const full = images ? record : readJson(join(results, file));
    const state = full?.environment?.machineState;
    evidence.push({
      id,
      inStore: true,
      machine: record.machine ?? parseRunId(id)?.machine ?? "unknown",
      kind,
      instrument: instrumentOfKind(kind),
      made: record.study === fm.id,
      attached: (fm.attached ?? []).includes(id),
      cited: (fm.cites ?? []).includes(id) || cites.includes(id),
      validity: images ? "valid" : validityOf(record),
      ...(state ? { state } : {}),
      health: checkHealth(state, fm.health ?? []),
      record,
    });
  }
  for (const id of wanted) {
    if (!found.has(id)) {
      evidence.push({
        id,
        inStore: false,
        machine: parseRunId(id)?.machine ?? "unknown",
        kind: null,
        instrument: null,
        made: false,
        attached: (fm.attached ?? []).includes(id),
        cited: (fm.cites ?? []).includes(id) || cites.includes(id),
        validity: "unknown",
      });
    }
  }
  return evidence.sort((a, b) => a.id.localeCompare(b.id));
}

// ------------------------------------------------------- the observations

/** A summary's cells by scene (scene|scenario) and configuration. */
function cellsOf(summary) {
  const out = new Map();
  for (const cell of summary.scenes ?? []) {
    const key = `${cell.scene}|${cell.scenario}`;
    const byConfig = out.get(key) ?? new Map();
    byConfig.set(cell.config, cell);
    out.set(key, byConfig);
  }
  return out;
}

const valuesOf = (cell, metric) => cell?.metrics?.[metric]?.values ?? [];

/**
 * Paired gains for `metric` in one run: for each scene, the repetitions'
 * log ratios candidate over baseline, as gains (positive is better in
 * `direction`). Returns { scenes: Map scene → gains[], reps: gains[] }, a
 * repetition's gain being its mean over scenes (one observation per
 * repetition: the run is the unit, never a tick).
 */
export function pairedGains(
  summary,
  { baseline, candidate, metric, direction },
) {
  const scenes = new Map();
  const byRep = [];
  for (const [scene, byConfig] of cellsOf(summary)) {
    const b = valuesOf(byConfig.get(baseline), metric);
    const c = valuesOf(byConfig.get(candidate), metric);
    const gains = [];
    for (let r = 0; r < Math.min(b.length, c.length); r++) {
      if (b[r] > 0 && c[r] > 0) {
        const log = Math.log(c[r] / b[r]);
        const gain = direction === "higher" ? log : -log;
        gains.push(gain);
        (byRep[r] ??= []).push(gain);
      }
    }
    if (gains.length) {
      scenes.set(scene, gains);
    }
  }
  return {
    scenes,
    reps: byRep
      .filter(Boolean)
      .map((g) => g.reduce((s, v) => s + v, 0) / g.length),
  };
}

/** Absolute values of `metric` by scene (or image check) in one run. */
function absoluteValues(entry, metric, config) {
  const out = new Map();
  if (entry.kind === "images") {
    for (const check of entry.record.checks ?? []) {
      const v =
        metric === "flipMean"
          ? check.flip?.mean
          : metric === "flipP95"
            ? check.flip?.p95
            : undefined;
      if (Number.isFinite(v)) {
        out.set(check.key, [...(out.get(check.key) ?? []), v]);
      }
    }
    return out;
  }
  for (const [scene, byConfig] of cellsOf(entry.record)) {
    const cell = config
      ? byConfig.get(config)
      : byConfig.size === 1
        ? [...byConfig.values()][0]
        : undefined;
    const values = valuesOf(cell, metric).filter(Number.isFinite);
    if (values.length) {
      out.set(scene, values);
    }
  }
  return out;
}

// ---------------------------------------------------------------- the tests

const percent = (gain, direction) => {
  // A gain back to the metric's own change, candidate over baseline.
  const ratio = direction === "higher" ? Math.exp(gain) : Math.exp(-gain);
  const p = (ratio - 1) * 100;
  return `${p >= 0 ? "+" : "−"}${Math.abs(p).toFixed(1)}%`;
};

/** An interval for `values`' mean: fixed (t, two-sided at `level`) or always valid. */
function intervalOf(values, { sequential, sigma, tau, alpha, level }) {
  if (sequential) {
    const d = describe(values);
    return {
      ...sequentialInterval({ mean: d.mean, n: d.n, sigma, tau, alpha }),
      se: d.se,
    };
  }
  return tInterval(values, level);
}

/** Merges per-run scene maps. */
function mergeScenes(maps) {
  const out = new Map();
  for (const map of maps) {
    for (const [scene, values] of map) {
      out.set(scene, [...(out.get(scene) ?? []), ...values]);
    }
  }
  return out;
}

/** Tests an absolute bound per scene: pass when every scene's interval is inside. */
function absoluteTest(scenes, bound, { alpha }) {
  const per = [...scenes].map(([scene, values]) => {
    const i = tInterval(values, 1 - 2 * alpha);
    const inside =
      bound.op === "<=" ? i.high <= bound.value : i.low >= bound.value;
    const outside =
      bound.op === "<=" ? i.low > bound.value : i.high < bound.value;
    return {
      scene,
      n: values.length,
      mean: i.mean,
      low: i.low,
      high: i.high,
      state: inside ? "pass" : outside ? "broken" : "unsettled",
    };
  });
  const state = !per.length
    ? "no data"
    : per.some((s) => s.state === "broken")
      ? "broken"
      : per.every((s) => s.state === "pass")
        ? "pass"
        : "unsettled";
  return {
    metric: bound.metric,
    op: bound.op,
    bound: bound.value,
    state,
    scenes: per,
  };
}

/**
 * One stratum's (one device's) comparison of `candidate` against
 * `baseline`: the primary metrics, the guardrails, the secondary metrics
 * and the Bayesian readout.
 */
function compareArms(entries, fm, { baseline, candidate }) {
  const alpha = Number(fm.alpha ?? 0.05);
  const sequential = fm.stopping === "sequential";
  const noise = Number(fm.noise);
  const planned = Number(fm.runs);
  const prior = parsePrior(fm.prior ?? `normal:0:${noise || 0.05}`);
  const notes = [];
  const relevant = (metric) =>
    entries.filter((e) => e.instrument && declares(e.instrument, metric));

  const gainsFor = (metric, direction) => {
    const runs = relevant(metric).filter((e) => e.kind !== "images");
    const per = runs.map((e) =>
      pairedGains(e.record, { baseline, candidate, metric, direction }),
    );
    return {
      reps: per.flatMap((p) => p.reps),
      scenes: mergeScenes(per.map((p) => p.scenes)),
    };
  };

  const primary = (fm.primary ?? []).map(parsePrimary).map((p) => {
    const threshold = effectGain(p);
    const { reps, scenes } = gainsFor(p.metric, p.direction);
    const i = intervalOf(reps, {
      sequential,
      sigma: noise,
      tau: threshold,
      alpha,
      level: 1 - alpha,
    });
    const d = describe(reps);
    let state;
    if (reps.length < 2) {
      state = "no data";
    } else if (!sequential && reps.length < planned) {
      state = "running";
    } else if (i.low > 0) {
      state = "better";
    } else if (i.high < 0) {
      state = "worse";
    } else if (i.high < threshold && i.low > -threshold) {
      state = "no effect worth having";
    } else {
      state = "unsettled";
    }
    if (reps.length >= 3 && noise > 0 && d.sd > 1.5 * noise) {
      notes.push(
        `${p.metric}: the runs' spread is ${(d.sd / noise).toFixed(1)} times the noise floor in the file; calibrate the instrument again with an A/A run`,
      );
    }
    const se =
      reps.length >= 3 && d.se > 0
        ? d.se
        : noise / Math.sqrt(Math.max(1, reps.length));
    const bayes =
      reps.length >= 1 && se > 0
        ? bayesReadout({
            priorMean: p.direction === "lower" ? -prior.mean : prior.mean,
            priorSd: prior.sd,
            gain: d.mean,
            se,
            threshold,
          })
        : undefined;
    const groups = [...scenes]
      .filter(([, g]) => g.length >= 2)
      .map(([scene, g]) => ({ id: scene, ...describe(g) }))
      .filter((g) => g.se > 0);
    const pooled =
      groups.length >= 3 ? hierarchical(groups, { alpha }) : undefined;
    return {
      ...p,
      threshold,
      n: reps.length,
      planned,
      mean: i.mean,
      low: i.low,
      high: i.high,
      state,
      bayes,
      scenes: pooled,
    };
  });

  const guardrails = (fm.guardrails ?? []).map((spec) => {
    const g = parseBound(spec);
    if (g.op) {
      return absoluteTest(
        mergeScenes(
          relevant(g.metric).map((e) => absoluteValues(e, g.metric, candidate)),
        ),
        g,
        { alpha },
      );
    }
    const limit = Math.log(1 + g.margin);
    const { reps } = gainsFor(g.metric, g.direction);
    const worse = reps.map((v) => -v);
    const i = intervalOf(worse, {
      sequential,
      sigma: noise,
      tau: limit,
      alpha: 2 * alpha,
      level: 1 - 2 * alpha,
    });
    const state =
      worse.length < 2 || (!sequential && worse.length < planned)
        ? worse.length < 2
          ? "no data"
          : "running"
        : i.high < limit
          ? "pass"
          : i.low > limit
            ? "broken"
            : "unsettled";
    return {
      metric: g.metric,
      direction: g.direction,
      margin: g.margin,
      n: worse.length,
      mean: i.mean,
      low: i.low,
      high: i.high,
      state,
    };
  });

  const secondaryRaw = (fm.secondary ?? []).map((metric) => {
    const direction =
      (fm.primary ?? []).map(parsePrimary).find((p) => p.metric === metric)
        ?.direction ?? "lower";
    const { reps } = gainsFor(metric, direction);
    const i = tInterval(reps, 1 - alpha);
    return {
      metric,
      n: reps.length,
      mean: i.mean,
      low: i.low,
      high: i.high,
      p: i.p,
    };
  });
  const q = benjaminiHochberg(secondaryRaw.map((s) => s.p));
  const secondary = secondaryRaw.map((s, k) => ({
    ...s,
    q: q[k],
    significant: s.n >= 2 && q[k] < alpha,
  }));

  let state;
  if (
    primary.some(
      (p) => p.state === "worse" || p.state === "no effect worth having",
    ) ||
    guardrails.some((g) => g.state === "broken")
  ) {
    state = "refuted";
  } else if (
    primary.every((p) => p.state === "better") &&
    guardrails.every((g) => g.state === "pass")
  ) {
    state = "supported";
  } else {
    state = "inconclusive";
  }
  return { state, primary, guardrails, secondary, notes };
}

/** Feasibility and calibration: absolute criteria or tolerances. */
function checkBounds(entries, fm, key) {
  const alpha = Number(fm.alpha ?? 0.05);
  const bounds = (fm[key] ?? []).map((s) => parseBound(s, { relative: false }));
  const planned = Number(fm.runs);
  const tests = bounds.map((b) => {
    const scenes = mergeScenes(
      entries
        .filter((e) => e.instrument && declares(e.instrument, b.metric))
        .map((e) => absoluteValues(e, b.metric, fm.candidate)),
    );
    const t = absoluteTest(scenes, b, { alpha });
    const fewest = Math.min(...[...scenes.values()].map((v) => v.length));
    return {
      ...t,
      n: Number.isFinite(fewest) ? fewest : 0,
      state: t.state !== "no data" && fewest < planned ? "running" : t.state,
    };
  });
  const state = tests.some((t) => t.state === "broken")
    ? "refuted"
    : tests.length && tests.every((t) => t.state === "pass")
      ? "supported"
      : "inconclusive";
  return { state, criteria: tests, notes: [] };
}

/** A sweep: each point against the reference, as a comparison. */
function sweepPoints(entries, fm) {
  const [setting, value] = String(fm.reference ?? "").split("=");
  const points = [];
  for (const e of entries) {
    const sweep = e.record?.sweep;
    if (!sweep?.points) {
      continue;
    }
    const isReference = (p) => String(p.coords?.[setting]) === value;
    const reference = sweep.points.find(isReference);
    for (const p of sweep.points.filter((x) => !isReference(x))) {
      for (const [i, config] of (p.configs ?? []).entries()) {
        const base = reference?.configs?.[i];
        if (base) {
          points.push({ coords: p.coords, baseline: base, candidate: config });
        }
      }
    }
  }
  const seen = new Set();
  const results = points
    .filter((p) => {
      const key = `${p.baseline}|${p.candidate}`;
      return seen.has(key) ? false : seen.add(key);
    })
    .map((p) => ({
      coords: p.coords,
      ...compareArms(entries, { ...fm, stopping: "fixed" }, p),
    }));
  const state = results.some((r) => r.state === "supported")
    ? "supported"
    : results.length && results.every((r) => r.state === "refuted")
      ? "refuted"
      : "inconclusive";
  return {
    state,
    points: results,
    notes: results.length
      ? []
      : ["no sweep points with the reference in the runs"],
  };
}

// --------------------------------------------------------------- the verdict

/**
 * Computes a study's verdict from its pre-stated criteria and its
 * evidence (loadEvidence). Returns { outcome, holds_for, strata, excluded,
 * missing_instruments, reasons, settle, readout }, `readout` being lines
 * fit for the study file (relative changes, never milliseconds or bytes).
 */
export function computeVerdict(fm, evidence) {
  const excluded = [];
  const included = [];
  const warnings = [];
  for (const e of evidence.filter((x) => x.inStore)) {
    const reasons = [...(e.health?.reasons ?? [])];
    if (
      fm.kind === "comparison" &&
      e.kind !== "images" &&
      e.record?.baseline !== undefined &&
      (e.record.baseline !== fm.baseline || e.record.candidate !== fm.candidate)
    ) {
      reasons.push(
        `compares ${e.record.baseline} with ${e.record.candidate}, not the study's ${fm.baseline} with ${fm.candidate}`,
      );
    }
    if (e.kind === "recording") {
      reasons.push(
        "a recording: evidence for what happens when, never for faster",
      );
    }
    if (reasons.length) {
      excluded.push({ id: e.id, machine: e.machine, reasons });
    } else {
      included.push(e);
      if (e.health?.unknown?.length) {
        warnings.push(
          `${e.id}: no ${e.health.unknown.join(", ")} recorded, so its health bar can't be checked`,
        );
      }
    }
  }
  const machines = [...new Set(included.map((e) => e.machine))].sort();
  const strata = machines.map((machine) => {
    const entries = included.filter((e) => e.machine === machine);
    const missing = (fm.instruments ?? []).filter(
      (i) => !entries.some((e) => e.instrument === i),
    );
    let result;
    if (fm.kind === "comparison") {
      result = compareArms(entries, fm, {
        baseline: fm.baseline,
        candidate: fm.candidate,
      });
    } else if (fm.kind === "sweep") {
      result = sweepPoints(entries, fm);
    } else {
      result = checkBounds(
        entries,
        fm,
        fm.kind === "feasibility" ? "criteria" : "tolerances",
      );
    }
    return {
      machine,
      runs: entries.map((e) => e.id),
      missing_instruments: missing,
      ...result,
      state: missing.length ? "inconclusive" : result.state,
    };
  });
  const supported = strata
    .filter((s) => s.state === "supported")
    .map((s) => s.machine);
  const refuted = strata
    .filter((s) => s.state === "refuted")
    .map((s) => s.machine);
  const reasons = [];
  let outcome;
  let holdsFor = [];
  if (!strata.length) {
    outcome = "inconclusive";
    reasons.push(excluded.length ? "every run was excluded" : "no runs yet");
  } else if (supported.length && refuted.length) {
    outcome = "inconclusive";
    reasons.push(
      `it differs by device: supported on ${supported.join(", ")}, refuted on ${refuted.join(", ")}`,
    );
  } else if (supported.length) {
    outcome = "supported";
    holdsFor = supported;
  } else if (refuted.length) {
    outcome = "refuted";
    holdsFor = refuted;
  } else {
    outcome = "inconclusive";
  }
  for (const s of strata) {
    if (s.missing_instruments.length) {
      reasons.push(
        `${s.machine}: no runs from ${s.missing_instruments.join(", ")}`,
      );
    }
  }
  for (const e of excluded) {
    reasons.push(`excluded ${e.id}: ${e.reasons.join("; ")}`);
  }
  return {
    outcome,
    holds_for: holdsFor,
    strata,
    excluded,
    reasons,
    warnings: [...warnings, ...strata.flatMap((s) => s.notes ?? [])],
    settle:
      outcome === "inconclusive" ? settleText(fm, strata, excluded) : null,
    readout: readoutLines(strata, excluded),
  };
}

/** What would settle an inconclusive verdict. */
function settleText(fm, strata, excluded) {
  const parts = [];
  for (const s of strata) {
    if (s.missing_instruments.length) {
      parts.push(
        `runs from ${s.missing_instruments.join(", ")} on ${s.machine}`,
      );
    }
    for (const p of s.primary ?? []) {
      if (p.state === "running" || p.state === "no data") {
        parts.push(
          `${Math.max(0, p.planned - p.n)} more runs on ${s.machine} (the plan's ${p.planned})`,
        );
      } else if (p.state === "unsettled") {
        parts.push(
          `more runs on ${s.machine}: ${p.metric}'s interval still spans both the minimum effect and no effect`,
        );
      }
    }
    for (const g of s.guardrails ?? []) {
      if (g.state === "unsettled") {
        parts.push(
          `more runs on ${s.machine} to show ${g.metric} within its margin`,
        );
      }
    }
  }
  if (!strata.length && excluded.length) {
    parts.push("runs on a machine that passes the health bar");
  }
  if (!strata.length && !excluded.length) {
    parts.push(`the plan's runs (${fm.runs ?? "?"} per arm)`);
  }
  return [...new Set(parts)].join("; ") || "more runs";
}

/** The readout's lines, for the study file and the terminal. */
function readoutLines(strata, excluded) {
  const lines = [];
  const pct = (gain, direction) => percent(gain, direction);
  for (const s of strata) {
    for (const p of s.primary ?? []) {
      if (p.n < 2) {
        lines.push(`${s.machine}: primary ${p.metric}: no paired runs`);
        continue;
      }
      // The interval of a gain is reversed as a change when lower is better.
      const [a, b] =
        p.direction === "lower" ? [p.high, p.low] : [p.low, p.high];
      lines.push(
        `${s.machine}: primary ${p.metric} (${p.direction}, minimum effect ${(p.effect * 100).toFixed(1)}%): ${pct(p.mean, p.direction)} (interval ${pct(a, p.direction)} to ${pct(b, p.direction)}), ${p.n} runs: ${p.state}`,
      );
      if (p.bayes) {
        lines.push(
          `${s.machine}: ${p.metric}, Bayesian: P(better) ${p.bayes.pBetter.toFixed(2)}, P(beats the minimum effect) ${p.bayes.pWin.toFixed(2)}, expected loss ${(p.bayes.expectedLoss * 100).toFixed(2)}%`,
        );
      }
      for (const g of p.scenes?.groups.filter((x) => x.differs) ?? []) {
        lines.push(
          `${s.machine}: ${p.metric} differs in ${g.id} (${pct(g.mean, p.direction)} against the others)`,
        );
      }
    }
    for (const g of s.guardrails ?? []) {
      if (g.op) {
        lines.push(
          `${s.machine}: guardrail ${g.metric}${g.op}${g.bound}: ${g.state}`,
        );
      } else {
        lines.push(
          `${s.machine}: guardrail ${g.metric} (margin ${(g.margin * 100).toFixed(1)}%): ${g.state}${g.n >= 2 ? `, worst end ${pct(-g.high, g.direction)}` : ""}`,
        );
      }
    }
    for (const c of s.criteria ?? []) {
      lines.push(`${s.machine}: ${c.metric}${c.op}${c.bound}: ${c.state}`);
    }
    for (const point of s.points ?? []) {
      lines.push(
        `${s.machine}: point ${Object.entries(point.coords ?? {})
          .map(([k, v]) => `${k}=${v}`)
          .join(" ")}: ${point.state}`,
      );
    }
    for (const sec of s.secondary ?? []) {
      if (sec.n >= 2) {
        lines.push(
          `${s.machine}: secondary ${sec.metric}: q ${sec.q.toFixed(3)}${sec.significant ? ", a change" : ", no clear change"}`,
        );
      }
    }
    if (s.missing_instruments.length) {
      lines.push(
        `${s.machine}: no runs from ${s.missing_instruments.join(", ")}`,
      );
    }
  }
  for (const e of excluded) {
    lines.push(`excluded ${e.id}: ${e.reasons.join("; ")}`);
  }
  return lines;
}

/**
 * Warnings for a verdict's citations: a run not in this store, an invalid
 * one, a recording cited for a timing claim, a run from a device the
 * verdict doesn't hold for.
 */
export function citationWarnings(cites, evidence, verdict) {
  const out = [];
  const byId = new Map(evidence.map((e) => [e.id, e]));
  for (const { run } of cites) {
    const e = byId.get(run);
    if (!e || !e.inStore) {
      out.push(
        `${run}: not in this store (made on ${parseRunId(run)?.machine ?? "another machine"})`,
      );
      continue;
    }
    if (e.validity === "invalid") {
      out.push(
        `${run}: an invalid run (its conditions weren't met); a verdict cites valid runs`,
      );
    } else if (e.validity === "warning") {
      out.push(
        `${run}: a run with warnings (the machine was busy, or the GPU throttled)`,
      );
    }
    if (e.kind === "recording") {
      out.push(`${run}: a recording, cited for a timing claim`);
    }
    const excluded = verdict.excluded.find((x) => x.id === run);
    if (excluded) {
      out.push(
        `${run}: excluded from the verdict (${excluded.reasons.join("; ")})`,
      );
    }
    if (verdict.holds_for.length && !verdict.holds_for.includes(e.machine)) {
      out.push(
        `${run}: made on ${e.machine}, a device the verdict doesn't hold for (${verdict.holds_for.join(", ")})`,
      );
    }
  }
  return out;
}

/** Evidence without its records: what `study show` prints. */
export const evidenceRows = (evidence) =>
  evidence
    .map((entry) => {
      const rest = { ...entry };
      delete rest.record;
      delete rest.state;
      return rest;
    })
    .map((rest) => ({
      ...rest,
      ...(rest.instrument
        ? { instrument_title: instrument(rest.instrument)?.title }
        : {}),
    }));
