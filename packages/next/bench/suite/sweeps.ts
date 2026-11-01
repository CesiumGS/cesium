import { METRICS } from "./report.mjs";
import { escape, lineChart } from "./charts.mjs";
import { ratio } from "./stats.mjs";
import { cellKey, type Summary } from "./workspace.ts";

/**
 * Dyno's Sweeps and Hardware views (plan §16.9, Explore).
 *
 * Sweeps: a run that varied one parameter (`cli.mjs run --sweep`) or ran
 * several CesiumJS releases (`--releases`), each metric against the
 * parameter's values, one line per swept configuration, with the
 * baseline as a reference line.
 *
 * Hardware: the same comparison across machines: per hardware class, the
 * latest run's candidate over baseline per headline metric.
 */

const INFO = new Map(METRICS.map((m) => [m[0], m] as const));
const KEYS = ["cpuP50", "gpuP50", "frameP95", "settleMs", "bytes", "heapBytes"];
/** Sweeps also show image quality: what a cheaper setting gives up. */
const SWEEP_KEYS = [...KEYS, "flipEnd"];
const geomean = (v: number[]) =>
  v.length
    ? Math.exp(v.reduce((a, x) => a + Math.log(x), 0) / v.length)
    : undefined;

interface SweepAxis {
  param: string;
  /** Per value (in order): the configuration ids that ran it. */
  points: Array<{ label: string; configs: string[] }>;
  lines: string[];
  baseline?: string;
}

/** The axis a run swept, if any: a parameter, or CesiumJS releases. */
function axisOf(
  s: Summary & {
    sweep?: {
      param: string;
      values: Array<string | number>;
      configs: string[];
    };
  },
): SweepAxis | undefined {
  if (s.sweep) {
    return {
      param: s.sweep.param,
      points: s.sweep.values.map((v) => ({
        label: String(v),
        configs: s.sweep!.configs.map((c) => `${c}[${s.sweep!.param}=${v}]`),
      })),
      lines: s.sweep.configs,
      baseline: s.baseline,
    };
  }
  const releases = s.configs
    .filter((c) => /^1\.x@\d+\.\d+\.\d+$/.test(c))
    .sort((a, b) => {
      const k = (c: string) => c.slice(4).split(".").map(Number);
      const [x, y] = [k(a), k(b)];
      return x[0]! - y[0]! || x[1]! - y[1]! || x[2]! - y[2]!;
    });
  if (releases.length >= 2) {
    return {
      param: "CesiumJS release",
      points: releases.map((c) => ({ label: c.slice(4), configs: [c] })),
      lines: ["1.x"],
      baseline: s.configs.includes("2.0") ? "2.0" : undefined,
    };
  }
  return undefined;
}

export function mountSweeps(
  root: HTMLElement,
  summaries: Summary[],
  bindCharts: () => void,
): void {
  const sweeps = summaries
    .map((s) => ({ s, axis: axisOf(s as never) }))
    .filter((x): x is { s: Summary; axis: SweepAxis } => !!x.axis)
    .reverse();
  if (!sweeps.length) {
    root.innerHTML = `<div class="empty">No sweeps yet. Vary a parameter with <code>cli.mjs run --sweep maximumScreenSpaceError=8,16,32</code> (or <code>render.pixelRatio=1,2</code>, <code>policy=budgeted,legacy1x</code>), or sweep releases with <code>--releases 1.120.0..1.146.0</code>.</div>`;
    return;
  }
  let pick = 0;
  let scene = "*";
  root.innerHTML = `<div class="controls"><label>Sweep <select data-id="sweep">${sweeps
    .map(
      (x, i) =>
        `<option value="${i}">${escape(new Date(x.s.date).toLocaleString())} · ${escape(x.axis.param)} · ${escape(x.s.note || x.s.subject || "")}</option>`,
    )
    .join(
      "",
    )}</select></label><label>Scene <select data-id="scene"></select></label></div><p class="lede" data-id="lede"></p><div class="grid" data-id="charts"></div>`;
  const $ = <T extends Element>(id: string) =>
    root.querySelector<T>(`[data-id="${id}"]`)!;
  $<HTMLSelectElement>("sweep").addEventListener("change", (e) => {
    pick = Number((e.target as HTMLSelectElement).value);
    scene = "*";
    draw();
  });
  $<HTMLSelectElement>("scene").addEventListener("change", (e) => {
    scene = (e.target as HTMLSelectElement).value;
    draw();
  });

  function draw(): void {
    const { s, axis } = sweeps[pick]!;
    const sceneSelect = $<HTMLSelectElement>("scene");
    const keys = [...new Set(s.scenes.map(cellKey))];
    sceneSelect.replaceChildren(
      new Option("All scenes (geometric mean)", "*"),
      ...keys.map(
        (k) =>
          new Option(
            s.scenes.find((c) => cellKey(c) === k)!.title +
              (k.includes("|") ? ` · ${k.split("|")[1]}` : ""),
            k,
          ),
      ),
    );
    sceneSelect.value = scene;
    $("lede").textContent =
      `Each metric against ${axis.param}; ${scene === "*" ? "the geometric mean over scenes" : "this scene's median"} per value${axis.baseline ? `, with ${axis.baseline} as the dashed reference` : ""}.`;
    const value = (config: string, metric: string) => {
      const cells = s.scenes.filter(
        (c) => c.config === config && (scene === "*" || cellKey(c) === scene),
      );
      const medians = cells
        .map((c) => c.metrics[metric]?.median)
        .filter((v): v is number => Number.isFinite(v) && v! > 0);
      return scene === "*" ? geomean(medians) : medians[0];
    };
    const xNames = axis.points.map((p) => p.label);
    const charts = SWEEP_KEYS.map((metric) => {
      const [, name, unit, scale] = INFO.get(metric)!;
      const series = axis.lines.map((line, i) => ({
        label: line,
        color: `var(--series-${Math.min(4, i + 2)})`,
        points: axis.points.map((p, x) => {
          const config =
            p.configs.find((c) => c.startsWith(line)) ?? p.configs[0]!;
          const v = value(config, metric);
          return [x, v === undefined ? null : v / scale] as [
            number,
            number | null,
          ];
        }),
      }));
      const base = axis.baseline ? value(axis.baseline, metric) : undefined;
      return lineChart({
        title: name,
        xLabel: axis.param,
        unit,
        xNames,
        series,
        refs:
          base !== undefined
            ? [
                {
                  y: base / scale,
                  label: axis.baseline,
                  color: "var(--series-1)",
                  dash: "6 4",
                },
              ]
            : [],
        width: 520,
        height: 170,
      });
    });
    $("charts").innerHTML = charts.join("");
    bindCharts();
  }
  draw();
}

export function mountHardware(root: HTMLElement, summaries: Summary[]): void {
  // Sweeps vary the configurations; compare ordinary runs only.
  const plain = summaries.filter((s) => !(s as { sweep?: unknown }).sweep);
  const classes = [...new Set(plain.map((s) => s.hardware))];
  const latest = classes.map((h) =>
    [...plain].reverse().find((s) => s.hardware === h)!,
  );
  const rows = latest.map((s) => {
    const base = s.baseline ?? s.configs[0]!;
    const cand = s.candidate ?? s.configs.find((c) => c !== base) ?? base;
    const cells = KEYS.map((metric) => {
      const ratios: number[] = [];
      for (const c of s.scenes.filter((x) => x.config === cand)) {
        const b = s.scenes.find(
          (x) => x.config === base && cellKey(x) === cellKey(c),
        );
        const r =
          b &&
          ratio(
            b.metrics[metric]?.values ?? [],
            c.metrics[metric]?.values ?? [],
          );
        if (r?.value) {
          ratios.push(r.value);
        }
      }
      const g = geomean(ratios);
      return `<td>${g === undefined ? "–" : `${g < 0.95 ? "▼ " : g > 1.05 ? "▲ " : ""}×${g.toFixed(2)}`}</td>`;
    });
    return `<tr><th>${escape(s.hardware)}<div class="muted">${escape(s.browser ?? "")} · ${summaries.filter((x) => x.hardware === s.hardware).length} runs · latest ${escape(new Date(s.date).toLocaleDateString())}</div></th><td>${escape(cand)} / ${escape(base)}</td>${cells.join("")}</tr>`;
  });
  root.innerHTML = `<p class="lede">The candidate over the baseline on each machine (the latest run per hardware class, geometric mean across scenes; ▼ better, ▲ worse). Runs on more machines (§16.8, v3) fill this in; scaling across GPUs shows where each engine is bound.</p>
<table class="metrics hardware"><tr><th>Hardware</th><th>Comparison</th>${KEYS.map((k) => `<th>${escape(INFO.get(k)![1])}</th>`).join("")}</tr>${rows.join("")}</table>`;
}
