import { METRICS, summarizeRun } from "./report.mjs";
import publicCatalog from "./catalog/public.json";
import type { Budget, Dataset, EngineConfig, Scene } from "./schema.ts";

/**
 * Dyno's data (plan §16.5, §16.9): the results directory through the dev
 * server, compact run summaries (from `*.summary.json` when present, else
 * summarized here), full results on demand, and small helpers every view
 * shares. Loaded once per page.
 */

/* eslint-disable @typescript-eslint/no-explicit-any -- results are JSON */
export type Json = any;

export interface Cell {
  scene: string;
  scenario?: string;
  title: string;
  config: string;
  warnings?: number;
  metrics: Record<
    string,
    { median: number; low: number; high: number; values: number[] }
  >;
}

export interface Summary {
  name: string;
  date: string;
  commit: string;
  subject?: string;
  branch?: string;
  dirty: boolean;
  note?: string;
  tags: string[];
  hardware: string;
  cpu?: string;
  browser?: string;
  configs: string[];
  repetitions: number;
  baseline?: string;
  candidate?: string;
  validity?: { valid: number; warning: number; invalid: number };
  render?: unknown;
  sweep?: unknown;
  scenes: Cell[];
}

export const catalog = publicCatalog as unknown as {
  datasets: Dataset[];
  scenes: Scene[];
  /** Engine settings ("1.x", "2.0", "2.0+legacy1x"; engines.mjs). */
  setups: EngineConfig[];
  /** What runs measure by default, and the baseline and candidate. */
  engines: { default: string[]; baseline: string; candidate: string };
  budgets?: Budget[];
};

/** A scene and scenario as one key ("cold-orbit" is the default). */
export const cellKey = (c: Cell) =>
  c.scenario && c.scenario !== "cold-orbit"
    ? `${c.scene}|${c.scenario}`
    : c.scene;
export const cellTitle = (c: Cell) =>
  c.scenario && c.scenario !== "cold-orbit"
    ? `${c.title} · ${c.scenario}`
    : c.title;

/** Per-viewer conveniences in localStorage (never shared state). */
export const store = {
  get(key: string, fallback: Json) {
    try {
      return JSON.parse(localStorage.getItem(key) ?? "null") ?? fallback;
    } catch {
      return fallback;
    }
  },
  set(key: string, value: Json) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage unavailable: the choice lasts for this page only.
    }
  },
};

export interface RunIndex {
  /** Where the results are read from (shown to the viewer). */
  directory: string;
  runs: string[];
  summaries: string[];
  /** The working tree's branch (names its engines: "2.0@<branch>"). */
  branch?: string;
}

export interface Runs {
  index: RunIndex;
  /** Every run's summary, oldest first. */
  summaries: Summary[];
}

const fullCache = new Map<string, Promise<Json>>();
/** A run's full results file (cached). */
export function full(name: string): Promise<Json> {
  if (!fullCache.has(name)) {
    fullCache.set(
      name,
      fetch(`/bench-results/${name}`).then((r) => {
        if (!r.ok) {
          throw new Error(`${name}: ${r.status}`);
        }
        return r.json();
      }),
    );
  }
  return fullCache.get(name)!;
}

let runs: Promise<Runs> | undefined;
/**
 * The results directory's runs, loaded once per page (the router's root
 * loader; `useRuns()` reads it in views).
 */
export function loadRuns(): Promise<Runs> {
  runs ??= (async () => {
    const index = (await (
      await fetch("/bench-results/index.json")
    ).json()) as RunIndex;
    const summaries = (
      await Promise.all(
        index.runs.map(async (name) => {
          const summaryName = name.replace(/\.json$/, ".summary.json");
          try {
            const s = index.summaries.includes(summaryName)
              ? await (await fetch(`/bench-results/${summaryName}`)).json()
              : summarizeRun(await full(name));
            return { ...s, name } as Summary;
          } catch {
            return undefined;
          }
        }),
      )
    )
      .filter((s): s is Summary => !!s)
      .sort((a, b) => a.date.localeCompare(b.date));
    return { index, summaries };
  })();
  return runs;
}

/** The commit, with * when the working tree had changes. */
export const short = (s: Summary) =>
  `${s.commit.slice(0, 7)}${s.dirty ? "*" : ""}`;
export const when = (s: Summary) =>
  new Date(s.date).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
/** A run as one line for pickers. */
export const runLabel = (s: Summary) =>
  `${when(s)} · ${short(s)}${s.note ? ` · ${s.note}` : ""}${s.sweep ? " (sweep)" : ""}`;
export const metricInfo = (key: string) => METRICS.find((m) => m[0] === key)!;
export const geomean = (values: number[]) =>
  values.length
    ? Math.exp(values.reduce((a, v) => a + Math.log(v), 0) / values.length)
    : undefined;

/** A scene key's title from any run that measured it. */
export function titleOf(summaries: Summary[], key: string): string {
  for (const s of summaries) {
    const c = s.scenes.find((x) => cellKey(x) === key);
    if (c) {
      return cellTitle(c);
    }
  }
  return key;
}
