// Runs in the results store (CS-721): `dyno result list` and `dyno result
// show <run-id>`. A run's measured values (per-repetition numbers, medians
// and intervals) appear only with --values: they carry machine details, and
// what a pull request or an issue may quote is the verdict, never the values.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import process from "node:process";
import { DynoError } from "./dispatch.mjs";
import { listMeasurements, storeDirectory } from "./measure.mjs";

const resultsDirectory = (env) =>
  env.BENCH_RESULTS ?? join(homedir(), ".cesium-bench", "results");

/** What a run is, without its values. */
export function identity(summary, id) {
  return {
    id: summary.id ?? id,
    date: summary.date,
    purpose: summary.purpose,
    ...(summary.item ? { item: summary.item } : {}),
    ...(summary.study ? { study: summary.study } : {}),
    ...(summary.machine ? { machine: summary.machine } : {}),
    commit: summary.commit,
    branch: summary.branch,
    baseline: summary.baseline,
    candidate: summary.candidate,
    validity: summary.validity,
    tags: summary.tags ?? [],
  };
}

/**
 * A scorecard's verdict without its per-scene numbers: pass, marginal or
 * fail, how the primary metric moved (a geometric mean of ratios, with its
 * scene counts), and which guardrails broke where.
 */
function verdictOf(card) {
  if (!card) {
    return null;
  }
  const metric = (m) => ({
    metric: m.metric ?? m.key ?? m.label,
    label: m.label,
    geomean: m.geomean ?? null,
    better: m.better,
    worse: m.worse,
    broken: m.broken ?? [],
  });
  return {
    verdict: card.verdict,
    baseline: card.baseline,
    candidate: card.candidate,
    primary: { ...metric(card.primary), moved: card.primary.moved },
    guardrails: (card.guardrails ?? []).map(metric),
  };
}

/**
 * The store's run summaries (`*.summary.json`, the only files opened: never a
 * run's full record), oldest name first: { id, file, summary } or, for one
 * that isn't valid JSON, { id, file, problem }.
 */
export function summariesIn(directory) {
  if (!existsSync(directory)) {
    return [];
  }
  return readdirSync(directory)
    .filter((f) => f.endsWith(".summary.json"))
    .sort()
    .map((file) => {
      const id = file.replace(/\.summary\.json$/, "");
      try {
        return {
          id,
          file,
          summary: JSON.parse(readFileSync(join(directory, file), "utf8")),
        };
      } catch {
        return { id, file, problem: "its summary is not valid JSON" };
      }
    });
}

/** The store's runs, newest first. */
export function listResults({ env = process.env, fake = false, limit = 20 }) {
  if (fake) {
    const runs = listMeasurements(storeDirectory({ env, fake: true }))
      .filter((m) => m.result)
      .reverse()
      .slice(0, limit)
      .map((m) => ({
        id: m.result.run_id,
        date: m.finished,
        purpose: "dev",
        measurement: m.handle,
        verdict: m.result.verdict,
      }));
    return { directory: "fake", runs };
  }
  const directory = resultsDirectory(env);
  if (!existsSync(directory)) {
    return { directory, runs: [] };
  }
  const runs = summariesIn(directory)
    .reverse()
    .slice(0, limit)
    .map((e) => (e.summary ? identity(e.summary, e.id) : { id: e.id, problem: e.problem }));
  return { directory, runs };
}

/**
 * One run: its identity, validity and scorecard (the verdict), and with
 * `values` each scene's measured metrics.
 */
export function showResult({
  id,
  values = false,
  env = process.env,
  fake = false,
}) {
  if (!/^[\w.@+-]+$/.test(id)) {
    throw new DynoError("usage", `not a run id: ${id}`);
  }
  if (fake) {
    const m = listMeasurements(storeDirectory({ env, fake: true })).find(
      (r) => r.result?.run_id === id,
    );
    if (!m) {
      throw new DynoError("problem", `no run ${id} in the fake target`);
    }
    const metrics = Object.fromEntries(
      Object.entries(m.result.metrics).map(([name, metric]) => {
        const shown = { ...metric };
        if (!values) {
          delete shown.values;
        }
        return [name, shown];
      }),
    );
    return {
      run: { id, date: m.finished, purpose: "dev", measurement: m.handle },
      verdict: m.result.verdict,
      metrics,
      values_included: values,
    };
  }
  const directory = resultsDirectory(env);
  const file = join(directory, `${id}.summary.json`);
  if (!existsSync(file)) {
    throw new DynoError("problem", `no run ${id} in ${directory}`);
  }
  const summary = JSON.parse(readFileSync(file, "utf8"));
  return {
    run: identity(summary, id),
    verdict: verdictOf(summary.scorecard),
    ...(values ? { scorecard: summary.scorecard ?? null } : {}),
    scenes: (summary.scenes ?? []).map((s) => ({
      scene: s.scene,
      scenario: s.scenario,
      config: s.config,
      warnings: s.warnings,
      ...(values
        ? { metrics: s.metrics }
        : { metrics: Object.keys(s.metrics ?? {}) }),
    })),
    values_included: values,
    report: join(directory, `${id}.html`),
  };
}
