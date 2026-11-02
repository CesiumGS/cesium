// Reusing stored runs of engines that can't change (plan §16, r39).
//
// A release, a commit, or the working tree frozen at a commit measures the
// same on the same machine with the same method and data, so a comparison
// against it needn't rerun all of its repetitions. A run reuses stored
// repetitions of an engine (never the candidate's) when it finds enough
// of them with the same keys:
//
//   machine  OS, CPU, memory, browser, GPU driver and clocks, power, the
//            browser's flags and viewport
//   method   the harness that measures (the suite page, the CLI, telemetry
//            and the build), from the frozen tree
//   engine   the build (version and integrity, or commit) and its settings
//   scene    the scene, scenario, render settings and the scene's datasets
//
// and then runs one calibration repetition: if it lands within the stored
// spread (drift: thermals, a background update, the network) the stored
// repetitions join it, else every repetition runs fresh.
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const hash = (value) =>
  createHash("sha256")
    .update(typeof value === "string" ? value : JSON.stringify(value))
    .digest("hex")
    .slice(0, 16);

/** The machine and browser a run measured on. */
export function machineKey(environment) {
  const e = environment;
  return hash({
    os: e.os,
    cpu: e.cpu,
    cores: e.cores,
    memoryGiB: e.memoryGiB,
    browser: e.browser,
    browserMode: e.browserMode,
    browserArgs: e.browserArgs,
    uncappedArgs: e.uncappedArgs,
    viewport: e.viewport,
    gpuDriver: e.gpuDriver,
    gpuMaxClockMHz: e.gpuMaxClockMHz,
    power: e.power,
    powerPlan: e.powerPlan,
  });
}

/** Files whose changes change what a measurement means. */
const METHOD_FILES = [
  "bench/suite/suite.ts",
  "bench/suite/cli.mjs",
  "bench/suite/telemetry.mjs",
  "bench/suite/frozen.mjs",
  "vite.config.ts",
];

/** The measuring harness in `root` (the frozen tree's packages/next). */
export function methodKey(root) {
  return hash(
    METHOD_FILES.map((f) =>
      existsSync(join(root, f)) ? readFileSync(join(root, f), "utf8") : "",
    ).join("\0"),
  );
}

/**
 * An engine's build and settings, without its name (the working tree is
 * named by its branch, which says nothing about its code).
 */
export function engineKey(config) {
  const settings = { ...config };
  delete settings.id;
  delete settings.page;
  const build = { ...config.source };
  delete build.ref;
  return hash({ ...settings, source: build });
}

/** Whether `config` builds the same code every time (reusable). */
export const immutable = (config) =>
  config.source?.kind === "release" || config.source?.sha !== undefined;

/** The scene as measured: scene, scenario, render settings, its data. */
export function sceneKey(spec) {
  // Not what describes or files the scene (title, areas, catalog group).
  const scene = { ...spec.scene };
  delete scene.title;
  delete scene.areas;
  delete scene.group;
  return hash({
    scene,
    scenario: spec.scenario,
    render: spec.render,
    datasets: spec.datasets,
  });
}

/**
 * Stored runs, indexed once per invocation: the newest first, from result
 * files no older than `days` with the same machine and method.
 */
export function storedRuns(directory, { machine, method, days }) {
  if (!existsSync(directory)) {
    return [];
  }
  const since = Date.now() - days * 86400e3;
  const out = [];
  for (const name of readdirSync(directory)) {
    const m = /^(\d{4}-\d\d-\d\dT\d\d)-(\d\d)-(\d\d)-(\d{3})Z\.json$/.exec(
      name,
    );
    if (!m) {
      continue;
    }
    const date = Date.parse(`${m[1]}:${m[2]}:${m[3]}.${m[4]}Z`);
    if (!(date >= since)) {
      continue;
    }
    let results;
    try {
      results = JSON.parse(readFileSync(join(directory, name), "utf8"));
    } catch {
      continue;
    }
    if (
      results.reuse?.machine !== machine ||
      results.reuse?.method !== method
    ) {
      continue;
    }
    const engines = new Map(
      (results.configs ?? []).map((c) => [c.id, c.engineKey]),
    );
    for (const run of results.runs ?? []) {
      if (
        run.sceneKey &&
        !run.reused &&
        run.metrics?.status === "ok" &&
        run.validity?.verdict === "valid" &&
        engines.has(run.config)
      ) {
        out.push({
          file: name.replace(/\.json$/, ""),
          date,
          engineKey: engines.get(run.config),
          run,
        });
      }
    }
  }
  return out.sort((a, b) => b.date - a.date);
}

/** Stored repetitions of one engine on one scene, the newest first. */
export function findStored(index, engine, scene, limit) {
  return index
    .filter((s) => s.engineKey === engine && s.run.sceneKey === scene)
    .slice(0, limit);
}

/**
 * Whether a fresh repetition drifted from stored ones: CPU per frame
 * where the scenario moves (the machine's state, not the network's), else
 * time to settle, with a wider band (the network).
 */
export function drift(fresh, stored) {
  const key = fresh.metrics.cpuP50 !== undefined ? "cpuP50" : "settleMs";
  const relative = key === "cpuP50" ? 0.1 : 0.25;
  const values = stored
    .map((s) => s.run.metrics[key])
    .filter((v) => Number.isFinite(v));
  const value = fresh.metrics[key];
  if (!values.length || !Number.isFinite(value)) {
    return { key, drifted: true, value, reason: "nothing to compare" };
  }
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const sd = Math.sqrt(
    values.reduce((a, b) => a + (b - mean) ** 2, 0) /
      Math.max(1, values.length - 1),
  );
  const band = Math.max(relative * mean, 3 * sd);
  return {
    key,
    value,
    mean,
    band,
    drifted: Math.abs(value - mean) > band,
  };
}
