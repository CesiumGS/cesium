import { lineChart } from "../charts.mjs";
import { CONDITION_METRICS, METRICS } from "../report.mjs";
import { ratio } from "../stats.mjs";
import {
  catalog,
  cellKey,
  cellTitle,
  geomean,
  short,
  type Summary,
  when,
} from "../data.ts";

/**
 * Trends' pure logic (no React): its sections, the points of a panel (per
 * configuration, or candidate over baseline), control bands with run
 * rules, annotations, budgets, and a panel's chart (charts.mjs HTML) with
 * the words the view shows above it.
 */

export interface SectionSpec {
  id: string;
  title: string;
  /** Metric keys, one panel each (per scene when split). */
  keys: string[];
  /** What the section's panels show, for its Help popover. */
  help: string;
}

/** The collapsible sections, in page order. */
export const SECTIONS: readonly SectionSpec[] = [
  {
    id: "headline",
    title: "Headline ratios",
    keys: ["cpuP50", "settleMs", "frameP95", "bytes", "heapBytes"],
    help: "The candidate divided by the baseline, per run: the geometric mean over scenes (or one scene), with its interval as a shaded area. Below 1× the candidate is faster or uses less. Red dotted lines are budgets.",
  },
  {
    id: "loading",
    title: "Loading",
    keys: ["firstContentMs", "settleMs", "resettleMs"],
    help: "How long each configuration takes to show the scene, to finish loading it, and to finish again after the camera moves. One line per configuration.",
  },
  {
    id: "rendering",
    title: "Rendering",
    keys: [
      "cpuP50",
      "gpuP50",
      "frameP50",
      "frameP95",
      "frameP999",
      "frameStdDev",
      "over100",
      "longFrames",
    ],
    help: "Frame times and hitches while the camera moves. One line per configuration.",
  },
  {
    id: "network",
    title: "Network and memory",
    keys: ["requests", "bytes", "heapBytes"],
    help: "What each configuration downloads and how much JavaScript memory it holds at the end.",
  },
  {
    id: "conditions",
    title: "Machine conditions",
    keys: CONDITION_METRICS.map((m) => m[0]),
    help: "The machine's state during each configuration's runs. These should match between engines; when they don't, a difference in the other sections may come from the machine rather than the engine.",
  },
];

/** [key, name, unit, scale] of every metric, conditions included. */
export const INFO = new Map(
  [...METRICS, ...CONDITION_METRICS].map((m) => [m[0], m] as const),
);

/**
 * Each metric's panel title in plain words, and what a change measures
 * when "faster" or "slower" doesn't fit (`formatChange`'s noun).
 */
const PLAIN: Record<string, readonly [string, string?]> = {
  firstContentMs: ["Time to first content"],
  settleMs: ["Time to finish loading"],
  resettleMs: ["Time to finish loading after the camera moves"],
  frameP50: ["Frame time, median"],
  frameP95: ["Frame time, 95th percentile"],
  frameP999: ["Frame time, 99.9th percentile"],
  frameStdDev: ["Frame time variation (standard deviation)"],
  cpuP50: ["CPU time per frame, median"],
  gpuP50: ["GPU time per frame, median"],
  over33: ["Frames longer than two vsyncs", "slow frames"],
  over100: ["Hitches longer than 100 ms", "hitches"],
  longFrames: ["Long frames", "long frames"],
  requests: ["Network requests", "requests"],
  bytes: ["Data downloaded", "data"],
  heapBytes: ["JavaScript heap at the end", "memory"],
  gpuTemperatureStartC: ["GPU temperature at the start"],
  gpuThermalFraction: ["Share of time the GPU slowed down for heat"],
  gpuClockMeanMHz: ["GPU clock speed (follows load)"],
  cpuPerformanceMean: ["CPU speed"],
  backgroundCpuUtility: ["CPU use before the run"],
};

/** A metric's title in plain words. */
export const titleOf = (key: string) =>
  PLAIN[key]?.[0] ?? INFO.get(key)?.[1] ?? key;
/** What a change in the metric measures ("data", "memory"), if not time. */
export const nounOf = (key: string) => PLAIN[key]?.[1];

const BUDGETS = catalog.budgets ?? [];
/** Budgets that apply to a panel's metric, configuration and scene. */
export const budgetsFor = (metric: string, config: string, scene: string) =>
  BUDGETS.filter(
    (b) =>
      b.metric === metric &&
      b.config === config &&
      (scene === "*" ||
        ((!b.scenes || b.scenes.includes(scene.split("|")[0]!)) &&
          (!b.scenario ||
            b.scenario === (scene.split("|")[1] ?? "cold-orbit")))),
  );

const mean = (v: number[]) => v.reduce((a, b) => a + b, 0) / v.length;

/** Every configuration the runs measured, without sweep variants. */
export const configsOf = (summaries: Summary[]) =>
  // Sweep variants ("2.0[param=value]") belong to Analysis (sweeps).
  [...new Set(summaries.flatMap((s) => s.configs))].filter(
    (c) => !c.includes("["),
  );

/** Every scene key the runs measured, with its title. */
export function scenesOf(summaries: Summary[]): Map<string, string> {
  const scenes = new Map<string, string>();
  for (const s of summaries) {
    for (const c of s.scenes) {
      scenes.set(cellKey(c), cellTitle(c));
    }
  }
  return scenes;
}

/** The most common value over the runs (the default baseline, candidate). */
export function most(
  summaries: Summary[],
  pick: (s: Summary) => string | undefined,
  fallback: string,
): string {
  const counts = new Map<string, number>();
  for (const s of summaries) {
    const v = pick(s);
    if (v) {
      counts.set(v, (counts.get(v) ?? 0) + 1);
    }
  }
  return [...counts].sort((a, b) => b[1] - a[1])[0]?.[0] ?? fallback;
}

export type Verdict = "" | "valid" | "warning" | "invalid";
export const verdictOf = (s: Summary): Verdict =>
  !s.validity
    ? ""
    : s.validity.invalid
      ? "invalid"
      : s.validity.warning
        ? "warning"
        : "valid";

export interface RunFilter {
  hardware: string;
  hideInvalid: boolean;
  showSweeps: boolean;
}
/** Whether a run passes the sidebar's filters (hardware, validity, sweeps). */
export const passes = (s: Summary, f: RunFilter) =>
  (f.hardware === "*" || s.hardware === f.hardware) &&
  (!f.hideInvalid || verdictOf(s) !== "invalid") &&
  (f.showSweeps || !s.sweep);

/** The text the run search matches (lowercase). */
export const searchText = (s: Summary) =>
  `${s.note ?? ""} ${s.subject ?? ""} ${s.tags.join(" ")} ${s.commit} ${s.branch ?? ""}`.toLowerCase();

export type Point = [number, number, number];

/** A metric's value (and interval) for one run, configuration, scene. */
export function point(
  s: Summary,
  config: string,
  key: string,
  scene: string,
): Point | undefined {
  const m = s.scenes
    .filter(
      (c) => c.config === config && (scene === "*" || cellKey(c) === scene),
    )
    .map((c) => c.metrics[key])
    .filter((v) => v !== undefined && Number.isFinite(v.median))
    .map((v) => v!);
  if (!m.length) {
    return undefined;
  }
  if (scene !== "*") {
    return [m[0]!.median, m[0]!.low, m[0]!.high];
  }
  // All scenes: the geometric mean over scenes with positive values.
  const pos = m.filter((v) => v.median > 0 && v.low > 0);
  if (!pos.length) {
    return [mean(m.map((v) => v.median)), NaN, NaN];
  }
  return [
    geomean(pos.map((v) => v.median))!,
    geomean(pos.map((v) => v.low))!,
    geomean(pos.map((v) => v.high))!,
  ];
}

// The bootstrap behind a ratio is the costly part of a panel: remembered
// per run, so showing or hiding a run doesn't redo the others.
const ratioCache = new WeakMap<Summary, Map<string, Point | undefined>>();

/** Candidate over baseline for one run: per scene ratios, then geomean. */
export function ratioPoint(
  s: Summary,
  key: string,
  scene: string,
  base: string,
  cand: string,
): Point | undefined {
  let cache = ratioCache.get(s);
  if (!cache) {
    cache = new Map();
    ratioCache.set(s, cache);
  }
  const id = `${key}\0${scene}\0${base}\0${cand}`;
  if (cache.has(id)) {
    return cache.get(id);
  }
  const values: Point[] = [];
  for (const c of s.scenes) {
    if (c.config !== cand || (scene !== "*" && cellKey(c) !== scene)) {
      continue;
    }
    const b = s.scenes.find(
      (x) => x.config === base && cellKey(x) === cellKey(c),
    );
    const r =
      b && ratio(b.metrics[key]?.values ?? [], c.metrics[key]?.values ?? []);
    if (r?.value && r.low > 0) {
      values.push([r.value, r.low, r.high]);
    }
  }
  const result: Point | undefined = values.length
    ? [
        geomean(values.map((v) => v[0]))!,
        geomean(values.map((v) => v[1]))!,
        geomean(values.map((v) => v[2]))!,
      ]
    : undefined;
  cache.set(id, result);
  return result;
}

export interface Mark {
  x: number;
  label: string;
  short: string;
}
/**
 * Annotations: where a configuration first appears, the hardware changes
 * or the render settings change.
 */
export function annotations(runs: Summary[]): Mark[] {
  const marks: Mark[] = [];
  const seen = new Set<string>();
  const render = (r: Summary) => JSON.stringify(r.render ?? null);
  runs.forEach((s, i) => {
    const fresh = s.configs.filter((c) => !seen.has(c));
    if (i > 0 && fresh.length) {
      marks.push({
        x: i,
        label: `first run of ${fresh.join(", ")}`,
        short: fresh.join(", "),
      });
    }
    for (const c of s.configs) {
      seen.add(c);
    }
    if (i > 0 && s.hardware !== runs[i - 1]!.hardware) {
      marks.push({
        x: i,
        label: `hardware: ${s.hardware}`,
        short: "hardware",
      });
    }
    if (i > 0 && render(s) !== render(runs[i - 1]!)) {
      marks.push({
        x: i,
        label: `render settings changed: ${render(s)}`,
        short: "render settings",
      });
    }
  });
  return marks;
}

/**
 * Control band for a line: mean ± 3σ of the earlier points (all but the
 * last), once there are six; flags points outside it and runs of seven
 * on one side of the mean (Western Electric rules 1 and 4).
 */
export function control(points: Array<[number, number | null]>) {
  const ys = points.filter((p): p is [number, number] => p[1] !== null);
  if (ys.length < 6) {
    return undefined;
  }
  const window = ys.slice(0, -1).map((p) => p[1]);
  const m = mean(window);
  const sd = Math.sqrt(mean(window.map((v) => (v - m) ** 2)));
  const flags: number[] = [];
  const reasons: string[] = [];
  for (const [x, y] of ys) {
    if (Math.abs(y - m) > 3 * sd && sd > 0) {
      flags.push(x);
    }
  }
  if (flags.length) {
    reasons.push(
      `${flags.length} ${flags.length === 1 ? "run" : "runs"} outside the control band`,
    );
  }
  let run = 0;
  let side = 0;
  for (const [x, y] of ys) {
    const s = Math.sign(y - m);
    run = s === side ? run + 1 : 1;
    side = s;
    if (run === 7) {
      flags.push(x);
      reasons.push("7 runs in a row on one side of the average");
    }
  }
  return { y0: m - 3 * sd, y1: m + 3 * sd, flags, reasons };
}

/** What every panel of the view shares. */
export interface PanelContext {
  /** The runs shown, oldest first (a point's x is its index here). */
  runs: Summary[];
  /** Every configuration, in series color order. */
  configs: string[];
  base: string;
  cand: string;
  /** The pinned run's name, or "". */
  pin: string;
}

export interface PanelSpec {
  key: string;
  /** A scene key, or "*" for the geometric mean over scenes. */
  scene: string;
  headline: boolean;
}

/** A panel: its chart and the words the view shows above it. */
export interface Panel {
  spec: PanelSpec;
  /** charts.mjs HTML (its own caption is hidden; the view titles it). */
  html: string;
  /** The metric in plain words. */
  title: string;
  /** The scene's title when the panel shows one scene of a split. */
  scene?: string;
  unit: string;
  /** Headline panels: the latest run's ratio [value, low, high]. */
  ratio?: Point;
  /** Other panels: the focus configuration and its latest value. */
  focus?: string;
  latest?: string;
  /** Whether a control band is drawn (it needs six runs). */
  band: boolean;
  /** Whether the pinned run is drawn as dashed reference lines. */
  pinned: boolean;
  /** Run-rule alerts on the focus line, in words. */
  alerts: string[];
}

const colorOf = (configs: string[], config: string) =>
  `var(--series-${Math.min(4, configs.indexOf(config) + 1)})`;

/** A value with no more digits than the noise allows. */
export const formatValue = (v: number, unit: string) => {
  const digits = Math.abs(v) >= 100 ? 0 : Math.abs(v) >= 10 ? 1 : 2;
  const text = v.toLocaleString(undefined, {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  });
  return unit ? `${text} ${unit}` : text;
};

/** The last point of a series that has a value. */
const lastOf = <T>(values: Array<T | undefined | null>) => {
  for (let i = values.length - 1; i >= 0; i--) {
    const v = values[i];
    if (v !== undefined && v !== null) {
      return v;
    }
  }
  return undefined;
};

/** A panel (chart and words), or undefined when it has no data. */
export function panelOf(
  ctx: PanelContext,
  spec: PanelSpec,
  sceneTitle?: string,
  size = { width: 520, height: 180 },
): Panel | undefined {
  const { key, scene, headline } = spec;
  const info = INFO.get(key);
  if (!info) {
    return undefined;
  }
  const { runs, configs: allConfigs, base, cand } = ctx;
  const [, , unit, scale] = info;
  const title = titleOf(key);
  const label = sceneTitle ? `${title}, ${sceneTitle}` : title;
  const xNames = runs.map(
    (s) =>
      `${when(s)} · ${short(s)}${s.note || s.subject ? ` · ${s.note || s.subject}` : ""}`,
  );
  const marks = annotations(runs);
  const pinned = runs.findIndex((s) => s.name === ctx.pin);
  if (headline) {
    const pts = runs.map((s) => ratioPoint(s, key, scene, base, cand));
    if (!pts.some(Boolean)) {
      return undefined;
    }
    const series = [
      {
        label: `${cand} ÷ ${base}`,
        color: colorOf(allConfigs, cand),
        points: pts.map((p, i) => [i, p ? p[0] : null]),
        band: pts.flatMap((p, i) => (p ? [[i, p[1], p[2]]] : [])),
      },
    ];
    const html = lineChart({
      title: `${label}: ${cand} ÷ ${base}`,
      xLabel: "run",
      unit: "×",
      xNames,
      series,
      refs: [
        { y: 1, label: "1×" },
        ...budgetsFor(key, cand, scene)
          .filter((b) => b.maxRatio !== undefined)
          .map((b) => ({
            y: b.maxRatio!,
            label: `budget ${b.maxRatio!.toFixed(2)}×`,
            color: "var(--critical)",
            dash: "2 3",
          })),
      ],
      marks,
      yMin: Infinity,
      ...size,
    });
    return {
      spec,
      html,
      title,
      scene: sceneTitle,
      unit: "×",
      ratio: lastOf(pts),
      band: false,
      pinned: false,
      alerts: [],
    };
  }
  const configs = allConfigs.filter((c) =>
    runs.some((s) => s.scenes.some((x) => x.config === c && x.metrics[key])),
  );
  const series = configs.map((config) => {
    const pts = runs.map((s) => point(s, config, key, scene));
    return {
      label: config,
      color: colorOf(allConfigs, config),
      points: pts.map((p, i) => [i, p ? p[0] / scale : null]) as Array<
        [number, number | null]
      >,
      band: pts.flatMap((p, i) =>
        p && Number.isFinite(p[1]) ? [[i, p[1] / scale, p[2] / scale]] : [],
      ),
      flags: [] as number[],
    };
  });
  if (!series.some((s) => s.points.some((p) => p[1] !== null))) {
    return undefined;
  }
  const focus = series.find((s) => s.label === cand) ?? series[0]!;
  const band = control(focus.points);
  if (band) {
    focus.flags = band.flags;
  }
  const budgetRefs = budgetsFor(key, cand, scene)
    .filter((b) => b.max !== undefined)
    .map((b) => ({
      y: b.max! / scale,
      label: `budget ${formatValue(b.max! / scale, unit)}`,
      color: "var(--critical)",
      dash: "2 3",
    }));
  const refs = [
    ...budgetRefs,
    ...(pinned >= 0
      ? series.flatMap((s) => {
          const y = s.points[pinned]?.[1];
          return y === null || y === undefined
            ? []
            : [{ y, color: s.color, dash: "6 4", label: "" }];
        })
      : []),
  ];
  const html = lineChart({
    title: label,
    xLabel: "run",
    unit,
    xNames,
    series,
    hbands: band
      ? [
          {
            y0: band.y0,
            y1: band.y1,
            color: focus.color,
            label: `control band of ${focus.label}: mean ± 3σ of the earlier runs`,
          },
        ]
      : [],
    refs,
    marks,
    ...size,
  });
  const latest = lastOf(focus.points.map((p) => p[1]));
  return {
    spec,
    html,
    title,
    scene: sceneTitle,
    unit,
    focus: focus.label,
    latest: latest === undefined ? undefined : formatValue(latest, unit),
    band: !!band,
    pinned: pinned >= 0,
    alerts: band ? [...new Set(band.reasons)] : [],
  };
}

/** A saved view: everything but the run search ("dyno.views" by name). */
export interface SavedView {
  scene?: string;
  split?: boolean;
  base?: string;
  cand?: string;
  pin?: string;
  hardware?: string;
  hideInvalid?: boolean;
  showSweeps?: boolean;
}
