// A self-contained HTML report of one suite run (plan §16.5), overview
// first and details on demand: verdict tiles (the geometric mean ratio
// across scenes and how many scenes were better or worse), a forest plot
// per headline metric (each scene's ratio with its interval), the hardware
// conditions over the whole run, then each scene's frame timelines,
// metrics and conditions, and the setup. A scene counts as better or worse
// only when the bootstrap intervals separate; gaps (scenes an engine can't
// draw yet) are shown, not hidden.
import { ratio, summarize } from "./stats.mjs";
import {
  CHART_CSS,
  CHART_SCRIPT,
  forestPlot,
  lineChart,
  statTile,
} from "./charts.mjs";

/** Metrics shown, with units and whether lower is better. */
const METRICS = [
  ["firstContentMs", "first content", "s", 1000],
  ["settleMs", "settled", "s", 1000],
  ["frameP50", "frame p50", "ms", 1],
  ["frameP95", "frame p95", "ms", 1],
  ["over33", "frames > 2 vsyncs", "", 1],
  ["cpuP50", "CPU / frame p50", "ms", 1],
  ["gpuP50", "GPU / frame p50", "ms", 1],
  ["longFrames", "long frames", "", 1],
  ["resettleMs", "re-settled after motion", "s", 1000],
  ["requests", "requests", "", 1],
  ["bytes", "bytes", "MB", 1e6],
  ["heapBytes", "JS heap", "MB", 1e6],
];

const escape = (s) =>
  String(s).replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
  );

function format(value, scale) {
  if (value === undefined) {
    return "–";
  }
  const v = value / scale;
  return v >= 100 ? v.toFixed(0) : v >= 10 ? v.toFixed(1) : v.toFixed(2);
}

/** A key-value table; values may be HTML. */
function table(rows) {
  return `<table class="kv">${rows
    .filter(([, v]) => v !== undefined && v !== "")
    .map(([k, v]) => `<tr><th>${escape(k)}</th><td>${v}</td></tr>`)
    .join("")}</table>`;
}

const list = (items) =>
  `<span class="list">${(items ?? []).map(escape).join(" ")}</span>`;

/** Hardware, software, browser and graphics setup, and idle conditions. */
function environmentSection(results) {
  const env = results.environment;
  const page = env.page ?? {};
  const gpu = page.webgpu;
  const gl = page.webgl2;
  const idle = env.idle ?? {};
  const fixed = (v, d = 0) => (v === undefined ? undefined : v.toFixed(d));
  const versions = page.userAgentData?.fullVersionList
    ?.map((b) => `${b.brand} ${b.version}`)
    .join(" · ");
  return `<details class="setup"><summary>Hardware, software and graphics</summary>
<div class="cols">
<div><h3>Hardware</h3>${table([
    ["GPU", escape(gpu?.info?.description ?? env.adapter?.description ?? "")],
    ["GPU vendor / architecture", escape([gpu?.info?.vendor, gpu?.info?.architecture].filter(Boolean).join(" / "))],
    ["GPU driver", escape(env.gpuDriver ?? "")],
    ["GPU max clocks (graphics / memory)", env.gpuMaxClockMHz ? `${env.gpuMaxClockMHz} / ${env.gpuMaxMemoryClockMHz} MHz` : undefined],
    ["GPU power limit", env.gpuPowerLimitW ? `${env.gpuPowerLimitW} W` : "not reported"],
    ["CPU", escape(`${env.cpu} (${env.cores} logical processors)`)],
    ["Memory", `${env.memoryGiB} GiB`],
    ["Display", page.screen ? escape(`${page.screen}, ${page.refreshHz} Hz, device pixel ratio ${page.devicePixelRatio}`) : undefined],
    ["Power source / plan", escape(`${env.power ?? "?"} / ${env.powerPlan ?? "?"}`)],
  ])}</div>
<div><h3>Software</h3>${table([
    ["OS", escape(env.os ?? env.platform ?? "")],
    ["Browser", escape(env.browser ?? "")],
    ["Browser builds", versions ? escape(versions) : undefined],
    ["Platform (browser)", page.userAgentData ? escape(`${page.userAgentData.platform} ${page.userAgentData.platformVersion}, ${page.userAgentData.architecture} ${page.userAgentData.bitness}-bit`) : undefined],
    ["User agent", `<code>${escape(page.userAgent ?? "")}</code>`],
    ["Browser mode and flags", `${escape(env.browserMode ?? "")} ${list(env.browserArgs)}`],
    ["Viewport", escape(env.viewport ?? "")],
    ["Engines", env.engines
      ? `${Object.entries(env.engines).map(([id, what]) => `<b>${escape(id)}</b>: ${escape(what)}`).join("<br>")}<br>2.0 commit ${escape(results.commit.slice(0, 12))}${results.dirty ? " + uncommitted changes" : ""}`
      : escape(`1.x ${page.cesium1xVersion ?? "?"} (this repository's build) · 2.0 commit ${results.commit.slice(0, 12)}${results.dirty ? " + uncommitted changes" : ""}`)],
    ["1.x versions that ran", escape([...new Set(results.runs.map((r) => r.metrics.engineVersion).filter(Boolean))].join(", "))],
    ["Tools", escape(Object.entries(env.tools ?? {}).map(([k, v]) => `${k} ${v}`).join(" · "))],
  ])}</div>
<div><h3>Idle conditions (before the runs)</h3>${table([
    ["GPU clock mean / min", idle.gpuClockMeanMHz ? `${fixed(idle.gpuClockMeanMHz)} / ${idle.gpuClockMinMHz} MHz` : undefined],
    ["GPU memory clock", idle.gpuMemoryClockMeanMHz ? `${fixed(idle.gpuMemoryClockMeanMHz)} MHz` : undefined],
    ["GPU temperature", idle.gpuTemperatureMaxC !== undefined ? `${idle.gpuTemperatureMaxC} °C` : undefined],
    ["GPU power / utilization", idle.gpuPowerMeanW !== undefined ? `${fixed(idle.gpuPowerMeanW, 1)} W / ${fixed(idle.gpuUtilizationMean)}%` : undefined],
    ["GPU slowdown reasons (share of samples)", idle.gpuSlowedFraction !== undefined ? `${escape((idle.gpuSlowdownReasons ?? []).join(", ") || "none")} (${fixed(idle.gpuSlowedFraction, 2)})` : undefined],
    ["CPU speed (% of nominal)", idle.cpuPerformanceMean !== undefined ? `${fixed(idle.cpuPerformanceMean)} (min ${fixed(idle.cpuPerformanceMin)})` : undefined],
    ["CPU utility", idle.cpuUtilityMean !== undefined ? `${fixed(idle.cpuUtilityMean)}%` : undefined],
    ["Cooldown rule", `each run starts within ${env.cooldownMarginC ?? "?"} °C of idle GPU temperature (60 s at most)`],
    ["Quiet rule", escape(env.quietRule ?? "")],
    ["Wake lock", escape(env.wakeLock ?? "")],
  ])}</div>
</div>
${gpu ? `<details><summary>WebGPU (2.0): ${gpu.features.length} features, ${Object.keys(gpu.limits).length} limits, ${gpu.wgslLanguageFeatures.length} WGSL language features</summary>
${table([
    ["Adapter info", `<code>${escape(JSON.stringify(gpu.info))}</code>`],
    ["Preferred canvas format", escape(gpu.preferredCanvasFormat)],
    ["Features", list(gpu.features)],
    ["WGSL language features", list(gpu.wgslLanguageFeatures)],
    ...Object.entries(gpu.limits).map(([k, v]) => [k, escape(String(v))]),
  ])}</details>` : ""}
${gl ? `<details><summary>WebGL 2 (1.x): ${escape(gl.renderer)}, ${gl.extensions.length} extensions</summary>
${table([
    ["Version", escape(gl.version)],
    ["Shading language", escape(gl.shadingLanguage)],
    ["Vendor / renderer", escape(`${gl.vendor} / ${gl.renderer}`)],
    ["Max texture size / samples", `${gl.maxTextureSize} / ${gl.maxSamples}`],
    ["GPU timer queries", gl.timerQuery ? "available" : "not exposed (1.x GPU time unavailable)"],
    ["Extensions", list(gl.extensions)],
  ])}</details>` : ""}
</details>`;
}

/** Hardware conditions shown per configuration (medians over runs). */
const CONDITIONS = [
  ["gpuClockMeanMHz", "GPU clock (MHz)"],
  ["gpuMemoryClockMeanMHz", "GPU memory clock (MHz)"],
  ["gpuTemperatureStartC", "GPU temperature at start (°C)"],
  ["gpuTemperatureMaxC", "GPU temperature max (°C)"],
  ["gpuPowerMeanW", "GPU power (W)"],
  ["gpuUtilizationMean", "GPU utilization (%)"],
  ["gpuSlowedFraction", "GPU slowed (share of samples)"],
  ["cpuPerformanceMean", "CPU speed (% of nominal)"],
  ["cpuUtilityMean", "CPU utility during run (%)"],
  ["backgroundCpuUtility", "CPU utility before run (%)"],
  ["cooldownMs", "cooldown before run (ms)"],
  ["quietMs", "wait for a quiet machine (ms)"],
];

/**
 * Condition rows, and a note when a configuration ran under different
 * conditions than the baseline: GPU clock or CPU speed off by more than
 * 5%, or a GPU slowdown share differing by more than 0.2.
 */
function conditionRows(configs, baseline, telemetry, notes) {
  const med = (c, key) =>
    summarize((telemetry.get(c) ?? []).map((t) => t[key]))?.median;
  if (configs.every((c) => !(telemetry.get(c) ?? []).length)) {
    return "";
  }
  const rows = CONDITIONS.map(([key, label]) => {
    const cells = configs.map((c) => {
      const v = med(c, key);
      return `<td class="cond">${v === undefined ? "–" : key === "gpuSlowedFraction" ? v.toFixed(2) : v.toFixed(0)}</td>`;
    });
    return `<tr><th class="cond">${label}</th>${cells.join("")}</tr>`;
  }).join("");
  for (const c of configs) {
    if (c === baseline) {
      continue;
    }
    const differs = [];
    for (const key of ["gpuClockMeanMHz", "cpuPerformanceMean"]) {
      const a = med(baseline, key);
      const b = med(c, key);
      if (a && b && Math.abs(b - a) / a > 0.05) {
        differs.push(`${key === "gpuClockMeanMHz" ? "GPU clock" : "CPU speed"} ${a.toFixed(0)} vs ${b.toFixed(0)}`);
      }
    }
    const sa = med(baseline, "gpuSlowedFraction");
    const sb = med(c, "gpuSlowedFraction");
    if (sa !== undefined && sb !== undefined && Math.abs(sb - sa) > 0.2) {
      differs.push(`GPU slowed ${sa.toFixed(2)} vs ${sb.toFixed(2)}`);
    }
    if (differs.length) {
      notes.push(`conditions differ, ${baseline} vs ${c}: ${differs.join(", ")}`);
    }
  }
  return `<tr><th colspan="${configs.length + 1}" class="section">Conditions</th></tr>${rows}`;
}

/** The headline metrics: tiles and per-scene comparisons, in this order. */
const HEADLINES = [
  ["settleMs", "Time to settle", "loading the view until nothing is pending"],
  ["cpuP50", "CPU per frame", "main-thread time in the engine, median frame"],
  ["frameP95", "Frame time p95", "while orbiting; vsync-bound at 60 Hz"],
  ["bytes", "Bytes downloaded", "content from servers, whole run"],
  ["heapBytes", "JS heap", "after the run"],
];

/** Configuration colors: categorical slots in catalog order. */
function configColor(configs, config) {
  return `var(--series-${Math.min(4, configs.indexOf(config) + 1)})`;
}

const geomean = (values) =>
  values.length
    ? Math.exp(values.reduce((s, v) => s + Math.log(v), 0) / values.length)
    : undefined;

export function renderReport(results) {
  const configs = [...new Set(results.runs.map((r) => r.config))];
  const baseline =
    results.baseline && configs.includes(results.baseline)
      ? results.baseline
      : configs.includes("1.x")
        ? "1.x"
        : configs[0];
  const candidate =
    results.candidate && configs.includes(results.candidate)
      ? results.candidate
      : (configs.find((c) => c !== baseline) ?? baseline);
  const others = configs.filter((c) => c !== baseline && c !== candidate);
  const groups = new Map();
  for (const run of results.runs) {
    const key = `${run.scene}|${run.scenario}`;
    if (!groups.has(key)) {
      groups.set(key, {
        run,
        byConfig: new Map(),
        telemetry: new Map(),
        runs: [],
      });
    }
    const group = groups.get(key);
    group.runs.push(run);
    const list = group.byConfig.get(run.config) ?? [];
    list.push(run.metrics);
    group.byConfig.set(run.config, list);
    if (run.telemetry && run.metrics.status === "ok") {
      const t = group.telemetry.get(run.config) ?? [];
      t.push(run.telemetry);
      group.telemetry.set(run.config, t);
    }
  }
  const okValues = (group, config, key) =>
    (group.byConfig.get(config) ?? [])
      .filter((m) => m.status === "ok")
      .map((m) => m[key]);
  const gapOf = (group) => {
    for (const [config, list] of group.byConfig) {
      const bad = list.find((m) => m.status !== "ok");
      if (bad) {
        return `${config}: ${bad.status}${bad.message ? ` (${bad.message})` : ""}`;
      }
    }
    return undefined;
  };

  // ------------------------------------------------ overview: tiles and forests
  const tiles = [];
  const forests = [];
  for (const [key, label, subtitle] of HEADLINES) {
    const rows = [];
    const ratios = [];
    let better = 0;
    let worse = 0;
    for (const group of groups.values()) {
      const r = ratio(
        okValues(group, baseline, key),
        okValues(group, candidate, key),
      );
      if (r?.value !== undefined) {
        ratios.push(r.value);
        if (r.separated && r.value < 1) {
          better++;
        } else if (r.separated) {
          worse++;
        }
      }
      rows.push({
        label: group.run.sceneTitle,
        ratio: r?.value !== undefined ? r : undefined,
        note: gapOf(group),
      });
    }
    const g = geomean(ratios);
    if (g === undefined) {
      continue;
    }
    const same = ratios.length - better - worse;
    tiles.push(
      statTile({
        label,
        value: `×${g.toFixed(2)}`,
        delta: `${candidate} vs ${baseline}: better in ${better}, worse in ${worse}, no clear difference in ${same} of ${ratios.length} scenes`,
        status: better > worse ? "better" : worse > better ? "worse" : undefined,
      }),
    );
    forests.push(
      forestPlot({
        title: `${label}: ${candidate} relative to ${baseline}`,
        subtitle: `${subtitle}. Dot: ratio of medians; line: 95% interval; left of 1 is better.`,
        rows,
        baseline,
        candidate,
      }),
    );
  }

  // Secondary configurations (e.g. this repository's 1.x build against the
  // release): tiles only, against the same baseline.
  const otherTiles = others.map((config) => {
    const row = HEADLINES.map(([key, label]) => {
      const ratios = [];
      let better = 0;
      let worse = 0;
      for (const group of groups.values()) {
        const r = ratio(
          okValues(group, baseline, key),
          okValues(group, config, key),
        );
        if (r?.value !== undefined) {
          ratios.push(r.value);
          if (r.separated && r.value < 1) {
            better++;
          } else if (r.separated) {
            worse++;
          }
        }
      }
      const g = geomean(ratios);
      return g === undefined
        ? ""
        : statTile({
            label,
            value: `×${g.toFixed(2)}`,
            delta: `better in ${better}, worse in ${worse} of ${ratios.length} scenes`,
            status:
              better > worse ? "better" : worse > better ? "worse" : undefined,
          });
    }).join("");
    return `<h2>${escape(config)} relative to ${escape(baseline)}</h2><div class="tiles">${row}</div>`;
  });

  // ------------------------------------------------ conditions over the run
  const timeline = results.timeline;
  let conditions = "";
  if (timeline?.gpu?.length || timeline?.cpu?.length) {
    const bands = results.runs
      .filter((r) => r.span && r.metrics.status !== "unsupported")
      .map((r) => ({
        x0: r.span[0],
        x1: r.span[1],
        color: configColor(configs, r.config),
        label: `${r.sceneTitle} · ${r.config} #${r.rep + 1}`,
      }));
    const bandLegend = configs.map((c) => ({
      label: `${c} running`,
      color: configColor(configs, c),
    }));
    const chart = (title, unit, rows, index) =>
      lineChart({
        title,
        xLabel: "s",
        unit,
        series: [
          {
            label: title,
            color: "var(--ink-2)",
            points: rows.map((r) => [r[0], r[index]]),
          },
        ],
        bands,
        bandLegend,
        height: 130,
      });
    const gpu = timeline.gpu ?? [];
    const cpu = timeline.cpu ?? [];
    conditions = `<h2>Conditions over the run</h2>
<p class="lede">Hardware state for the whole run, with each scene's runs shaded by engine. Both engines should see the same clocks and temperatures; the per-scene tables flag where they did not.</p>
${gpu.length ? chart("GPU clock", "MHz", gpu, 1) + chart("GPU temperature", "°C", gpu, 3) + chart("GPU power", "W", gpu, 4) + chart("GPU utilization", "%", gpu, 5) : ""}
${cpu.length ? chart("CPU speed (% of nominal)", "%", cpu, 1) + chart("CPU utility (whole machine)", "%", cpu, 2) : ""}`;
  }

  // ------------------------------------------------ per scene, on demand
  const sections = [];
  for (const group of groups.values()) {
    const { run, telemetry } = group;
    const notes = [];
    const gap = gapOf(group);
    if (gap) {
      notes.push(gap);
    }
    const condition = conditionRows(configs, baseline, telemetry, notes);
    const rows = METRICS.map(([key, label, unit, scale]) => {
      const values = new Map(configs.map((c) => [c, okValues(group, c, key)]));
      if (configs.every((c) => !values.get(c).some(Number.isFinite))) {
        return "";
      }
      const cells = configs.map((c) => {
        const s = summarize(values.get(c));
        const cell = s
          ? `${format(s.median, scale)}<span class="ci">${format(s.low, scale)}–${format(s.high, scale)}</span>`
          : "–";
        let vs = "";
        if (c !== baseline) {
          const r = ratio(values.get(baseline), values.get(c));
          if (r?.value !== undefined) {
            const cls = r.separated
              ? r.value < 1
                ? "better"
                : "worse"
              : "same";
            const icon = cls === "better" ? "▼ " : cls === "worse" ? "▲ " : "";
            vs = `<span class="ratio ${cls}">${icon}×${r.value.toFixed(2)}</span>`;
          }
        }
        return `<td>${cell}${vs}</td>`;
      });
      return `<tr><th>${label}${unit ? ` (${unit})` : ""}</th>${cells.join("")}</tr>`;
    }).join("");
    // Frames: every repetition's line, colored by engine.
    const frameSeries = (phase, index) =>
      group.runs
        .filter((r) => r.metrics.series?.[phase]?.length)
        .map((r) => ({
          label: `${r.config} #${r.rep + 1}`,
          group: r.config,
          color: configColor(configs, r.config),
          opacity: 0.8,
          points: r.metrics.series[phase].map((p) => [p[0], p[index]]),
        }));
    const charts = [
      lineChart({
        title: "Frame time while orbiting",
        subtitle: "Each line is one repetition; 16.7 ms is 60 Hz.",
        xLabel: "s into the orbit",
        unit: "ms",
        series: frameSeries("motion", 1),
      }),
      lineChart({
        title: "CPU per frame while orbiting",
        subtitle: "Main-thread time inside the engine's frame.",
        xLabel: "s into the orbit",
        unit: "ms",
        series: frameSeries("motion", 2),
      }),
      lineChart({
        title: "Frame time while loading",
        subtitle: "From the start of the load until the view settled; spikes are hitches.",
        xLabel: "s since load start",
        unit: "ms",
        series: frameSeries("load", 1),
      }),
    ].join("");
    sections.push(`<details class="scene"><summary>${escape(run.sceneTitle)} <span class="tag">${run.group}</span> <span class="tag">${escape(run.scenario)}</span>${notes.length ? ` <span class="flag">${notes.length} note${notes.length > 1 ? "s" : ""}</span>` : ""}</summary>
  ${notes.length ? `<p class="note">${notes.map(escape).join("<br>")}</p>` : ""}
  ${charts}
  <table class="metrics"><tr><th></th>${configs.map((c) => `<th>${escape(c)}</th>`).join("")}</tr>${rows}${condition}</table>
</details>`);
  }

  const env = results.environment;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Benchmark Report</title>
<style>
${CHART_CSS}
body { margin: 0; background: var(--page, #f9f9f7); }
.viz { color: var(--ink); font: 13px/1.45 system-ui, -apple-system, "Segoe UI", sans-serif; padding: 20px 24px 40px; max-width: 1080px; margin: 0 auto; }
@media (prefers-color-scheme: dark) { body { background: #0d0d0d; } }
h1 { font-size: 20px; margin: 0 0 4px; } h2 { font-size: 16px; margin: 28px 0 6px; }
.meta, .lede { color: var(--ink-2); max-width: 900px; margin: 4px 0 10px; }
.note { color: var(--critical); } .flag { font-size: 11px; color: var(--critical); font-weight: normal; }
.tag { font-size: 11px; color: var(--muted); border: 1px solid var(--grid); border-radius: 4px; padding: 0 5px; font-weight: normal; }
details.scene { background: var(--surface); border: 1px solid var(--grid); border-radius: 8px; padding: 8px 14px; margin: 8px 0; }
details.scene > summary { cursor: pointer; font-weight: 600; padding: 4px 0; }
details.scene[open] > summary { margin-bottom: 8px; }
table.metrics { border-collapse: collapse; font-variant-numeric: tabular-nums; margin: 8px 0; }
table.metrics th, table.metrics td { padding: 4px 10px; border-bottom: 1px solid var(--grid); text-align: right; white-space: nowrap; }
table.metrics th:first-child { text-align: left; font-weight: normal; color: var(--ink-2); }
.ci { display: block; font-size: 11px; color: var(--muted); }
.ratio { display: block; font-size: 11px; color: var(--ink-2); } .better .icon, .ratio.better { color: var(--good-text); } .ratio.worse { color: var(--critical); } .ratio.same { color: var(--muted); }
.cond { color: var(--muted); } th.section { text-align: left; padding-top: 10px; font-weight: 600; color: var(--ink); }
details { margin: 8px 0; } summary { cursor: pointer; } h3 { font-size: 13px; margin: 10px 0 4px; }
details.setup > summary { font-weight: 600; }
.cols { display: flex; gap: 24px; flex-wrap: wrap; align-items: flex-start; }
table.kv { border-collapse: collapse; }
table.kv th { text-align: left; font-weight: normal; color: var(--ink-2); vertical-align: top; padding: 3px 10px 3px 0; border-bottom: 1px solid var(--grid); }
table.kv td { text-align: left; white-space: normal; max-width: 640px; padding: 3px 0; border-bottom: 1px solid var(--grid); }
.list { font-family: ui-monospace, monospace; font-size: 11px; word-break: break-word; } code { font-size: 11px; word-break: break-all; }
</style></head><body><div class="viz">
<h1>${escape(candidate)} vs ${escape(baseline)}</h1>
<p class="meta">${escape(new Date(results.date).toLocaleString())} · commit ${escape(results.commit.slice(0, 12))}${results.dirty ? " (uncommitted changes)" : ""}${results.note ? ` · ${escape(results.note)}` : ""}${results.tags?.length ? ` · ${results.tags.map(escape).join(", ")}` : ""}<br>
${escape(env.adapter?.description ?? "unknown GPU")} · ${escape(env.cpu)} · ${escape(env.os ?? env.platform)} · ${escape(env.browser)} · ${groups.size} scenes × ${configs.length} configurations × ${Math.max(...results.runs.map((r) => r.rep + 1))} repetitions</p>
<p class="lede">Ratios are ${escape(candidate)} over ${escape(baseline)} (lower is better for every metric), the geometric mean across scenes on the tiles. A scene counts as better or worse only when the 95% bootstrap intervals separate.</p>
<div class="tiles">${tiles.join("")}</div>
<h2>By scene</h2>
${forests.join("")}
${otherTiles.join("")}
${conditions}
<h2>Scenes in detail</h2>
<p class="lede">Every metric with its interval, the frame timelines of each repetition, and the hardware conditions per engine.</p>
${sections.join("\n")}
<h2>Setup</h2>
${environmentSection(results)}
</div><script>${CHART_SCRIPT}</script></body></html>
`;
}

/**
 * A compact summary of a run for the experiment log and trends: run
 * metadata, the hardware class, and per scene × configuration each
 * metric's median and interval (no per-frame series or timeline).
 */
export function summarizeRun(results) {
  const env = results.environment ?? {};
  const cells = {};
  for (const run of results.runs) {
    if (run.metrics.status !== "ok") {
      continue;
    }
    const key = `${run.scene}|${run.config}`;
    (cells[key] ??= { scene: run.scene, title: run.sceneTitle, config: run.config, values: {} });
    for (const [metric] of METRICS) {
      const v = run.metrics[metric];
      if (Number.isFinite(v)) {
        (cells[key].values[metric] ??= []).push(v);
      }
    }
  }
  const scenes = Object.values(cells).map((c) => ({
    scene: c.scene,
    title: c.title,
    config: c.config,
    metrics: Object.fromEntries(
      Object.entries(c.values).map(([k, v]) => [k, { ...summarize(v), values: v }]),
    ),
  }));
  return {
    date: results.date,
    commit: results.commit,
    branch: results.branch,
    dirty: results.dirty,
    note: results.note,
    tags: results.tags ?? [],
    catalog: results.catalog,
    hardware: env.adapter?.description ?? "unknown GPU",
    cpu: env.cpu,
    browser: env.browser,
    configs: [...new Set(results.runs.map((r) => r.config))],
    repetitions: Math.max(0, ...results.runs.map((r) => r.rep + 1)),
    scenes,
  };
}

export { METRICS };
