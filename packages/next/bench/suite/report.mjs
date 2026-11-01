// A self-contained HTML report of one suite run (plan §16.5), overview
// first and details on demand: verdict tiles (the geometric mean ratio
// across scenes and how many scenes were better or worse), a forest plot
// per headline metric (each scene's ratio with its interval), the hardware
// conditions over the whole run, then each scene's frame timelines,
// metrics and conditions, and the setup. A scene counts as better or worse
// only when the bootstrap intervals separate; gaps (scenes an engine can't
// draw yet) are shown, not hidden.
import { ratio, summarize } from "./stats.mjs";
import { engineLabel, isRelease } from "./engines.mjs";
import {
  CHART_CSS,
  CHART_SCRIPT,
  forestPlot,
  lineChart,
  statTile,
} from "./charts.mjs";
import {
  DIAGNOSE_CSS,
  filmstrip,
  PATH_METRICS,
  pathMap,
  pathOverlay,
  pathProfiles,
  percentileCurve,
  segmentTable,
  waterfall,
} from "./diagnose.mjs";
import {
  budgetsHtml,
  checkBudgets,
  scorecard,
  SCORECARD_CSS,
  scorecardHtml,
} from "./scorecard.mjs";

/** Metrics shown, with units and whether lower is better. */
const METRICS = [
  ["firstContentMs", "first content", "s", 1000],
  ["settleMs", "settled", "s", 1000],
  ["frameP50", "frame p50", "ms", 1],
  ["frameP95", "frame p95", "ms", 1],
  ["over33", "frames > 2 vsyncs", "", 1],
  ["over100", "hitches > 100 ms", "", 1],
  ["frameP999", "frame p99.9", "ms", 1],
  ["frameStdDev", "frame time std. dev.", "ms", 1],
  ["cpuP50", "CPU / frame p50", "ms", 1],
  ["gpuP50", "GPU / frame p50", "ms", 1],
  ["longFrames", "long frames", "", 1],
  ["resettleMs", "re-settled after motion", "s", 1000],
  ["requests", "requests", "", 1],
  ["bytes", "bytes", "MB", 1e6],
  ["heapBytes", "JS heap", "MB", 1e6],
  // From the filmstrip: how differently the settled view after the orbit
  // looks from the baseline's (summaries, sweeps; not a per-run metric).
  ["flipEnd", "image difference from the baseline (FLIP)", "", 1],
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
    ["GPU thermal limits", env.gpuTargetTemperatureC !== undefined ? `target ${env.gpuTargetTemperatureC} °C; slowdown at ${env.gpuSlowdownTLimitC ?? "?"} °C T.Limit` : undefined],
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
    ["Render settings (both engines)", env.render ? escape(`pixel ratio ${env.render.pixelRatio}, ${env.render.msaaSamples}× MSAA, ${env.render.hdr ? "HDR" : "LDR"}, FXAA ${env.render.fxaa ? "on" : "off"}, fog ${env.render.fog ? "on" : "off"}`) : "not recorded (before r33: 1.x LDR with fog, 2.0 HDR)"],
    ["Engines", env.engines
      ? `${Object.entries(env.engines).map(([id, what]) => `<b>${escape(id)}</b>: ${escape(what)}`).join("<br>")}<br>2.0 commit ${escape(results.commit.slice(0, 12))}${results.dirty ? " + uncommitted changes" : ""}`
      : escape(`1.x ${page.cesium1xVersion ?? "?"} (this repository's build) · 2.0 commit ${results.commit.slice(0, 12)}${results.dirty ? " + uncommitted changes" : ""}`)],
    ["1.x versions that ran", escape([...new Set(results.runs.map((r) => r.metrics.engineVersion).filter(Boolean))].join(", "))],
    ["Tools", escape(Object.entries(env.tools ?? {}).map(([k, v]) => `${k} ${v}`).join(" · "))],
  ])}</div>
<div><h3>Idle conditions (before the runs)</h3>${table([
    ["GPU clock mean / min", idle.gpuClockMeanMHz ? `${fixed(idle.gpuClockMeanMHz)} / ${idle.gpuClockMinMHz} MHz` : undefined],
    ["GPU memory clock", idle.gpuMemoryClockMeanMHz ? `${fixed(idle.gpuMemoryClockMeanMHz)} MHz` : undefined],
    ["GPU temperature", idle.gpuTemperatureMaxC !== undefined ? `${idle.gpuTemperatureMaxC} °C${idle.gpuHeadroomMinC !== undefined ? ` (${idle.gpuHeadroomMinC} °C below the throttle limit)` : ""}` : undefined],
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

/**
 * Lineage (plan §16.9, Trust): what produced the run, enough to reproduce
 * it: the command, commit and working-tree state, catalog and dataset
 * checksums, engine builds with their integrity hashes, the plan.
 */
function lineageSection(results) {
  const env = results.environment ?? {};
  const datasets = results.datasets ?? [];
  const rows = [
    ["Command", results.command ? `<code>${escape(results.command.join(" "))}</code>` : "not recorded (before r33)"],
    ["Commit", `<code>${escape(results.commit)}</code> on ${escape(results.branch ?? "?")}${results.subject ? ` · ${escape(results.subject)}` : ""}`],
    ["Working tree", results.dirty ? `uncommitted changes (diff sha256 <code>${escape((results.diffSha256 ?? "not recorded").slice(0, 16))}</code>)` : "clean"],
    ["Catalog", `${escape(results.catalog ?? "public")}${results.catalogSha256 ? ` · sha256 <code>${escape(results.catalogSha256.slice(0, 16))}</code>` : ""}`],
    ["Engines", env.engines ? Object.entries(env.engines).map(([id, what]) => `<b>${escape(id)}</b>: ${escape(what)}`).join("<br>") : undefined],
    ["Plan", results.plan ? escape(`primary ${results.plan.primary}; guardrails ${results.plan.guardrails.join(", ")}; tolerance ${Math.round(results.plan.tolerance * 100)}%${results.plan.hypothesis ? `; hypothesis: ${results.plan.hypothesis}` : ""}`) : undefined],
    ["Render settings", env.render ? `<code>${escape(JSON.stringify(env.render))}</code>` : undefined],
    [
      "Datasets",
      datasets.length
        ? datasets
            .map((d) => `${escape(d.id)}: ${escape(d.status)}${d.sha256 ? ` <code>${escape(d.sha256.slice(0, 16))}</code>` : ""}`)
            .join("<br>")
        : undefined,
    ],
  ];
  return `<details class="setup"><summary>Lineage: reproduce this run</summary>${table(rows)}</details>`;
}

/** Hardware conditions shown per configuration (medians over runs). */
const CONDITIONS = [
  ["gpuClockMeanMHz", "GPU clock (MHz; follows load)"],
  ["gpuMemoryClockMeanMHz", "GPU memory clock (MHz)"],
  ["gpuTemperatureStartC", "GPU temperature at start (°C)"],
  ["gpuTemperatureMaxC", "GPU temperature max (°C)"],
  ["gpuHeadroomMinC", "GPU thermal headroom min (°C below throttle)"],
  ["gpuPowerMeanW", "GPU power (W)"],
  ["gpuUtilizationMean", "GPU utilization (%)"],
  ["gpuSlowedFraction", "GPU slowed, any reason (share)"],
  ["gpuThermalFraction", "GPU thermal slowdown (share)"],
  ["cpuPerformanceMean", "CPU speed (% of nominal)"],
  ["cpuUtilityMean", "CPU utility during run (%)"],
  ["backgroundCpuUtility", "CPU utility before run (%)"],
  ["cooldownMs", "cooldown before run (ms)"],
  ["quietMs", "wait for a quiet machine (ms)"],
];

/**
 * Condition rows, and a note when a configuration ran under different
 * conditions than the baseline. Only true conditions count: the GPU's
 * temperature at the start (more than 3 °C apart), its share of thermal
 * slowdowns (more than 0.2 apart), CPU speed (more than 10% apart) and
 * how busy the machine was before the run (more than 10 points apart).
 * GPU clock and power are shown but not compared: on power-managed GPUs
 * they follow each engine's own load.
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
    const check = (key, label, limit, relative = false) => {
      const a = med(baseline, key);
      const b = med(c, key);
      if (a === undefined || b === undefined) {
        return;
      }
      const gap = relative ? Math.abs(b - a) / Math.max(Math.abs(a), 1e-9) : Math.abs(b - a);
      if (gap > limit) {
        differs.push(`${label} ${a.toFixed(key.endsWith("Fraction") ? 2 : 0)} vs ${b.toFixed(key.endsWith("Fraction") ? 2 : 0)}`);
      }
    };
    check("gpuTemperatureStartC", "GPU temperature at start (°C)", 3);
    check("gpuThermalFraction", "GPU thermal slowdown share", 0.2);
    check("cpuPerformanceMean", "CPU speed (%)", 0.1, true);
    check("backgroundCpuUtility", "CPU utility before the run (%)", 10);
    if (differs.length) {
      notes.push(`conditions differ, ${engineLabel(baseline)} vs ${engineLabel(c)}: ${differs.join(", ")}`);
    }
  }
  return `<tr><th colspan="${configs.length + 1}" class="section">Conditions</th></tr>${rows}`;
}

/** The headline metrics: tiles and per-scene comparisons, in this order. */
const HEADLINES = [
  ["settleMs", "Time to settle", "loading the view until nothing is pending"],
  ["cpuP50", "CPU per frame", "main-thread time in the engine, median frame"],
  ["frameP95", "Frame time p95", "while orbiting; vsync-bound at 60 Hz unless uncapped"],
  ["bytes", "Bytes downloaded", "content from servers, whole run"],
  ["heapBytes", "JS heap", "after the run"],
];

/** Configuration colors: categorical slots in catalog order. */
function configColor(configs, config) {
  return `var(--series-${Math.min(4, configs.indexOf(config) + 1)})`;
}

const BADGES = {
  valid: ["✓", "valid"],
  warning: ["!", "valid with warnings"],
  invalid: ["✕", "invalid"],
  "not run": ["–", "not run"],
};

/** A validity badge: icon and label, never color alone. */
function validityBadge(verdict) {
  const [icon, label] = BADGES[verdict] ?? BADGES["not run"];
  return `<span class="badge ${verdict.replace(" ", "-")}">${icon} ${label}</span>`;
}

/**
 * The run's validity before any number (plan §16.9, Trust): how many
 * scenes were valid, valid with warnings, invalid or not run, and why.
 */
function validitySummary(scenes) {
  if (!scenes.length) {
    return "";
  }
  const count = (v) => scenes.filter((s) => s.verdict === v).length;
  const measured = scenes.filter((s) => s.verdict !== "not run");
  const overall = !measured.length || count("valid") + count("warning") === 0
    ? "invalid"
    : count("warning") || count("invalid")
      ? "warning"
      : "valid";
  const flagged = scenes.filter((s) => s.verdict === "warning" || s.verdict === "invalid");
  return `<div class="validity">${validityBadge(overall)} <b>${count("valid")}</b> valid, <b>${count("warning")}</b> with warnings, <b>${count("invalid")}</b> invalid, <b>${count("not run")}</b> not run (of ${scenes.length} scenes)${
    flagged.length
      ? `<details><summary>Why</summary><ul>${flagged
          .map((s) => `<li><b>${escape(s.title)}</b>: ${s.reasons.map(escape).join("; ") || "a run failed"}</li>`)
          .join("")}</ul></details>`
      : ""
  }</div>`;
}

const geomean = (values) =>
  values.length
    ? Math.exp(values.reduce((s, v) => s + Math.log(v), 0) / values.length)
    : undefined;

export function renderReport(results, options = {}) {
  const configs = [...new Set(results.runs.map((r) => r.config))];
  const baseline =
    results.baseline && configs.includes(results.baseline)
      ? results.baseline
      : (configs.find(isRelease) ?? configs[0]);
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

  const scenarioCount = new Set(results.runs.map((r) => r.scenario)).size;
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
        label: scenarioCount > 1
          ? `${group.run.sceneTitle} · ${group.run.scenario}`
          : group.run.sceneTitle,
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
    return `<h2>${escape(engineLabel(config))} relative to ${escape(engineLabel(baseline))}</h2><div class="tiles">${row}</div>`;
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
        label: `${r.sceneTitle} · ${engineLabel(r.config)} #${r.rep + 1}`,
      }));
    const bandLegend = configs.map((c) => ({
      label: `${engineLabel(c)} running`,
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
  const sceneValidity = [];
  for (const group of groups.values()) {
    const { run, telemetry } = group;
    const notes = [];
    const gap = gapOf(group);
    if (gap) {
      notes.push(gap);
    }
    const condition = conditionRows(configs, baseline, telemetry, notes);
    // Render settings each engine actually used (apples to apples).
    const renderOf = (c) =>
      group.runs.find((r) => r.config === c && r.metrics.render)?.metrics.render;
    const describeRender = (r) =>
      r
        ? `${r.width}×${r.height} · ${r.msaaSamples}× MSAA · ${r.hdr ? "HDR" : "LDR"}${r.fxaa ? " · FXAA" : ""}${r.fog ? " · fog" : ""}${r.outlines ? " · outlines" : ""}`
        : "–";
    const baseRender = renderOf(baseline);
    for (const c of configs) {
      const r = renderOf(c);
      if (c === baseline || !r || !baseRender) {
        continue;
      }
      // HDR is chosen per scene to match 2.0's color pipeline (catalog
      // render settings), so it is shown, not compared.
      const diff = ["width", "height", "msaaSamples", "fxaa", "fog", "outlines"].filter(
        (k) => r[k] !== baseRender[k],
      );
      if (diff.length) {
        notes.push(
          `render settings differ, ${engineLabel(baseline)} vs ${engineLabel(c)}: ${diff.map((k) => `${k} ${baseRender[k]} vs ${r[k]}`).join(", ")}`,
        );
      }
    }
    const renderRow = configs.some(renderOf)
      ? `<tr><th>rendered at</th>${configs.map((c) => `<td class="cond">${escape(describeRender(renderOf(c)))}</td>`).join("")}</tr>`
      : "";
    // Validity: every run's verdict, and comparable conditions.
    // Runs recorded before validity existed: from their status alone.
    const verdicts = group.runs
      .map(
        (r) =>
          r.validity ??
          (r.metrics.status === "ok"
            ? { verdict: "valid", reasons: [] }
            : r.metrics.status === "unsupported"
              ? { verdict: "not run", reasons: [] }
              : { verdict: "invalid", reasons: [`${r.metrics.status}: ${r.metrics.message ?? ""}`] }),
      )
      .filter((v) => v.verdict !== "not run");
    const warnings = [
      ...new Set(verdicts.flatMap((v) => (v.verdict === "valid" ? [] : v.reasons))),
    ];
    const invalid = verdicts.some((v) => v.verdict === "invalid");
    const differs = (n) =>
      n.startsWith("conditions differ") || n.startsWith("render settings differ");
    const comparable = !notes.some(differs);
    // A scene some configuration could not draw is not a comparison.
    const sceneVerdict =
      !verdicts.length || group.runs.some((r) => r.metrics.status === "unsupported")
      ? "not run"
      : invalid
        ? "invalid"
        : warnings.length || !comparable
          ? "warning"
          : "valid";
    sceneValidity.push({
      title: `${run.sceneTitle} · ${run.scenario}`,
      verdict: sceneVerdict,
      reasons: [...warnings, ...notes.filter(differs)],
    });
    // Diagnosis along the camera path: frame time when uncapped (the
    // frame's real cost), else CPU per frame (frame time is vsync-bound).
    const color = (c) => configColor(configs, c);
    const pathMetric = run.vsync === false ? "frame" : "cpu";
    const profiles = pathProfiles(group.runs, configs, PATH_METRICS[pathMetric][0]);
    const path = group.runs.find((r) => r.metrics.path?.length)?.metrics.path;
    const diagnosis = profiles.size
      ? `${pathOverlay({ profiles, configs, baseline, candidate, color, metric: pathMetric })}
<div class="diag">${segmentTable({ profiles, configs, baseline, color, metric: pathMetric })}${pathMap({ path, profiles, configs, color, metric: pathMetric, title: "Faster along the camera path" })}</div>`
      : "";
    const explore = `/#/explorer?scene=${encodeURIComponent(run.scene)}&amp;left=${encodeURIComponent(baseline)}&amp;right=${encodeURIComponent(candidate)}`;
    const strip = filmstrip({
      explore,
      // Older runs' entries have no scenario (and mixed scenarios).
      entries: (results.filmstrips ?? []).filter(
        (e) => e.scene === run.scene && (e.scenario ?? run.scenario) === run.scenario,
      ),
      assets: results.assets,
      configs,
      baseline,
    });
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
          label: `${engineLabel(r.config)} #${r.rep + 1}`,
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
        title: "Frame time while loading",
        subtitle: "From the start of the load until the view settled; spikes are hitches.",
        xLabel: "s since load start",
        unit: "ms",
        series: frameSeries("load", 1),
      }),
    ].join("");
    // The first scene opens, so its diagnostics are in view.
    sections.push(`<details class="scene"${sections.length === 0 ? " open" : ""}><summary>${validityBadge(sceneVerdict)} ${escape(run.sceneTitle)} <span class="tag">${run.group}</span> <span class="tag">${escape(run.scenario)}</span>${notes.length ? ` <span class="flag">${notes.length} note${notes.length > 1 ? "s" : ""}</span>` : ""}</summary>
  ${notes.length || warnings.length ? `<p class="note">${[...warnings, ...notes].map(escape).join("<br>")}</p>` : ""}
  <p class="explore-link"><a target="_top" href="${explore}">Open this scene in the explorer</a> (live, both engines side by side; needs the dev server). Click a point on a path chart to open it there.</p>
  <div data-explore="${explore}">${diagnosis}</div>
  ${strip}
  ${charts}
  ${percentileCurve({ runs: group.runs, configs, color })}
  ${waterfall({ runs: group.runs, configs, color })}
  <table class="metrics"><tr><th></th>${configs.map((c) => `<th>${escape(engineLabel(c))}</th>`).join("")}</tr>${rows}${renderRow}${condition}</table>
</details>`);
  }

  const env = results.environment;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Benchmark Report</title>
<style>
${CHART_CSS}
${DIAGNOSE_CSS}
${SCORECARD_CSS}
.badge { display: inline-block; font-size: 11px; font-weight: 600; border-radius: 4px; padding: 0 6px; border: 1px solid currentColor; }
.badge.valid { color: var(--good-text); } .badge.warning { color: var(--ink-2); } .badge.invalid { color: var(--critical); } .badge.not-run { color: var(--muted); }
.validity { background: var(--surface); border: 1px solid var(--grid); border-radius: 8px; padding: 10px 14px; margin: 10px 0; }
.validity ul { margin: 6px 0 0; padding-left: 18px; color: var(--ink-2); }
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
<h1>${escape(engineLabel(candidate))} vs ${escape(engineLabel(baseline))}</h1>
<p class="meta">${escape(new Date(results.date).toLocaleString())} · commit ${escape(results.commit.slice(0, 12))}${results.dirty ? " (uncommitted changes)" : ""}${results.note ? ` · ${escape(results.note)}` : ""}${results.tags?.length ? ` · ${results.tags.map(escape).join(", ")}` : ""}<br>
${escape(env.adapter?.description ?? "unknown GPU")} · ${escape(env.cpu)} · ${escape(env.os ?? env.platform)} · ${escape(env.browser)} · ${groups.size} scenes × ${configs.length} configurations × ${Math.max(...results.runs.map((r) => r.rep + 1))} repetitions</p>
${validitySummary(sceneValidity)}
${scorecardHtml(scorecard(results, { baseline, candidate }))}
${budgetsHtml(checkBudgets(results, results.budgets ?? options.budgets))}
<p class="lede">Ratios are ${escape(engineLabel(candidate))} over ${escape(engineLabel(baseline))} (lower is better for every metric), the geometric mean across scenes on the tiles. A scene counts as better or worse only when the 95% bootstrap intervals separate.</p>
<div class="tiles">${tiles.join("")}</div>
<h2>By scene</h2>
${forests.join("")}
${otherTiles.join("")}
${conditions}
<h2>Scenes in detail</h2>
<p class="lede">Per scene: validity; cost along the camera path, by path segment and on a map of the path (where each engine gains or loses); the filmstrip with image parity; frame timelines and percentiles; the request waterfall; every metric with its interval; and the hardware conditions per engine.</p>
${sections.join("\n")}
<h2>Setup</h2>
${environmentSection(results)}
${lineageSection(results)}
</div><script>${CHART_SCRIPT}
// Path charts: a click opens the explorer at that point of the path.
document.addEventListener("chart-click", (e) => {
  const host = e.target.closest("[data-explore]");
  if (host && e.detail.x >= 0 && e.detail.x <= 100) {
    window.top.location.href = host.dataset.explore + "&t=" + (e.detail.x / 100).toFixed(3);
  }
});
</script></body></html>
`;
}

/** Conditions summarized per scene and configuration (workspace panels). */
const CONDITION_METRICS = [
  ["gpuTemperatureStartC", "GPU temperature at start", "°C", 1],
  ["gpuThermalFraction", "GPU thermal slowdown share", "", 1],
  ["gpuClockMeanMHz", "GPU clock (follows load)", "MHz", 1],
  ["cpuPerformanceMean", "CPU speed", "% of nominal", 1],
  ["backgroundCpuUtility", "CPU utility before the run", "%", 1],
];

/**
 * A compact summary of a run for the experiment log and the workspace:
 * run metadata, the hardware class, and per scene × scenario ×
 * configuration each metric's and condition's median and interval, and
 * how many of its runs were valid (no per-frame series or timeline).
 */
export function summarizeRun(results) {
  const env = results.environment ?? {};
  const cells = {};
  for (const run of results.runs) {
    if (run.metrics.status !== "ok") {
      continue;
    }
    const key = `${run.scene}|${run.scenario}|${run.config}`;
    (cells[key] ??= {
      scene: run.scene,
      scenario: run.scenario,
      title: run.sceneTitle,
      config: run.config,
      values: {},
      verdicts: [],
    });
    cells[key].verdicts.push(run.validity?.verdict ?? "valid");
    for (const [metric] of METRICS) {
      const v = run.metrics[metric];
      if (Number.isFinite(v)) {
        (cells[key].values[metric] ??= []).push(v);
      }
    }
    for (const [metric] of CONDITION_METRICS) {
      const v = run.telemetry?.[metric];
      if (Number.isFinite(v)) {
        (cells[key].values[metric] ??= []).push(v);
      }
    }
  }
  // Image difference from the baseline (filmstrips, first repetition).
  for (const strip of results.filmstrips ?? []) {
    if (strip.moment !== "end") {
      continue;
    }
    for (const [config, flip] of Object.entries(strip.flip ?? {})) {
      const cell = cells[`${strip.scene}|${strip.scenario ?? "cold-orbit"}|${config}`];
      if (cell) {
        cell.values.flipEnd = [flip.mean];
      }
    }
  }
  const scenes = Object.values(cells).map((c) => ({
    scene: c.scene,
    scenario: c.scenario,
    title: c.title,
    config: c.config,
    warnings: c.verdicts.filter((v) => v !== "valid").length,
    metrics: Object.fromEntries(
      Object.entries(c.values).map(([k, v]) => [k, { ...summarize(v), values: v }]),
    ),
  }));
  const verdicts = results.runs.map((r) => r.validity?.verdict).filter(Boolean);
  return {
    date: results.date,
    commit: results.commit,
    subject: results.subject,
    baseline: results.baseline,
    candidate: results.candidate,
    ...(results.sweep ? { sweep: results.sweep } : {}),
    render: env.render ?? null,
    validity: {
      valid: verdicts.filter((v) => v === "valid").length,
      warning: verdicts.filter((v) => v === "warning").length,
      invalid: verdicts.filter((v) => v === "invalid").length,
    },
    scorecard: scorecard(results),
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

export { CONDITION_METRICS, METRICS };
