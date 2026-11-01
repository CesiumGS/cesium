// A self-contained HTML report of one suite run (plan §16.5): per scene and
// scenario, each metric's median with its 95% interval per configuration,
// and each configuration against 1.x, highlighted only when the intervals
// separate. Gaps (scenes an engine can't draw yet) are listed, not hidden.
import { ratio, summarize } from "./stats.mjs";

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

export function renderReport(results) {
  const configs = [...new Set(results.runs.map((r) => r.config))];
  const baseline = configs.includes("1.x") ? "1.x" : configs[0];
  const groups = new Map();
  for (const run of results.runs) {
    const key = `${run.scene}|${run.scenario}`;
    if (!groups.has(key)) {
      groups.set(key, { run, byConfig: new Map() });
    }
    const list = groups.get(key).byConfig.get(run.config) ?? [];
    list.push(run.metrics);
    groups.get(key).byConfig.set(run.config, list);
  }

  const sections = [];
  for (const { run, byConfig } of groups.values()) {
    const notes = [];
    for (const [config, list] of byConfig) {
      const bad = list.filter((m) => m.status !== "ok");
      if (bad.length) {
        notes.push(
          `${config}: ${bad.length}/${list.length} ${bad[0].status}${bad[0].message ? ` (${bad[0].message})` : ""}`,
        );
      }
    }
    const rows = METRICS.map(([key, label, unit, scale]) => {
      const values = new Map(
        configs.map((c) => [
          c,
          (byConfig.get(c) ?? [])
            .filter((m) => m.status === "ok")
            .map((m) => m[key]),
        ]),
      );
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
            const better = r.value < 1;
            const cls = r.separated ? (better ? "better" : "worse") : "same";
            vs = `<span class="ratio ${cls}">×${r.value.toFixed(2)}</span>`;
          }
        }
        return `<td>${cell}${vs}</td>`;
      });
      return `<tr><th>${label}${unit ? ` (${unit})` : ""}</th>${cells.join("")}</tr>`;
    }).join("");
    sections.push(`<section>
  <h2>${escape(run.sceneTitle)} <span class="tag">${run.group}</span> <span class="tag">${escape(run.scenario)}</span></h2>
  ${notes.length ? `<p class="note">${notes.map(escape).join("<br>")}</p>` : ""}
  <table><tr><th></th>${configs.map((c) => `<th>${escape(c)}</th>`).join("")}</tr>${rows}</table>
</section>`);
  }

  const env = results.environment;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Benchmark Report</title>
<style>
:root { color-scheme: light dark; --bg: #ffffff; --fg: #1d2330; --muted: #5d6677; --line: #e3e7ee; --better: #1a7f37; --worse: #c4332b; }
@media (prefers-color-scheme: dark) { :root { --bg: #0b0e14; --fg: #d7dce6; --muted: #8a93a6; --line: #222a3a; --better: #4cc38a; --worse: #ff7b72; } }
body { margin: 0; padding: 16px; background: var(--bg); color: var(--fg); font: 13px/1.45 system-ui, sans-serif; }
h1 { font-size: 18px; margin: 0 0 4px; } h2 { font-size: 15px; margin: 24px 0 6px; }
p { color: var(--muted); max-width: 900px; } .note { color: var(--worse); }
.tag { font-size: 11px; color: var(--muted); border: 1px solid var(--line); border-radius: 4px; padding: 0 5px; font-weight: normal; }
table { border-collapse: collapse; font-variant-numeric: tabular-nums; }
th, td { padding: 4px 10px; border-bottom: 1px solid var(--line); text-align: right; white-space: nowrap; }
th:first-child { text-align: left; font-weight: normal; color: var(--muted); }
.ci { display: block; font-size: 11px; color: var(--muted); }
.ratio { display: block; font-size: 11px; } .better { color: var(--better); } .worse { color: var(--worse); } .same { color: var(--muted); }
</style></head><body>
<h1>Benchmark report</h1>
<p>${escape(results.date)} · commit ${escape(results.commit.slice(0, 12))}${results.dirty ? " (uncommitted changes)" : ""} · ${escape(results.catalog)} catalog<br>
${escape(env.adapter?.description ?? "unknown GPU")} · ${escape(env.cpu)} (${env.cores} threads) · ${env.memoryGiB} GiB · ${escape(env.platform)} · ${escape(env.browser)}</p>
<p>Medians with 95% bootstrap intervals over repetitions (each a fresh browser context; configurations alternate). Ratios are against ${escape(baseline)}, lower is better for every metric; colored only when the intervals separate.</p>
${sections.join("\n")}
</body></html>
`;
}
