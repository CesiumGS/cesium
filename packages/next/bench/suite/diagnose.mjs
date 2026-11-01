// Diagnosis views for benchmark reports (plan §16.9, Diagnose), borrowed
// from race telemetry and web performance tools:
//
// - a path overlay: each configuration's per-frame cost against progress
//   along the camera path, the median over repetitions, with a delta
//   trace of the candidate against the baseline (race telemetry's lap
//   overlay);
// - path segments: the path split in thirds, each configuration's cost per
//   segment and its gap to the lowest (a timing screen's sectors);
// - a path map: the camera path seen from above, each stretch drawn in
//   the color of the configuration that was clearly faster there (a
//   track dominance map);
// - frame-time percentile curves (frame analysis tools);
// - a filmstrip of the settled views with image parity (WebPageTest, FLIP);
// - a request waterfall and bytes over time (WebPageTest).
//
// Runs are aligned by camera progress, not wall time, so engines are
// compared at the same place on the same path.
import { ratio, summarize } from "./stats.mjs";
import { compact, escape, lineChart } from "./charts.mjs";

/** Bins along the camera path (overlays and path maps). */
const BINS = 50;
const SEGMENTS = ["0–33%", "33–67%", "67–100%"];
/** A configuration is "faster" in a bin when it is this much faster. */
const FASTER_BY = 0.05;

/** Columns of the motion series: seconds, frame ms, CPU ms, GPU ms. */
export const PATH_METRICS = {
  frame: [1, "Frame time", "ms"],
  cpu: [2, "CPU per frame", "ms"],
  gpu: [3, "GPU per frame", "ms"],
};

const median = (values) => summarize(values)?.median;
const mean = (values) =>
  values.length ? values.reduce((a, b) => a + b, 0) / values.length : undefined;

/** One repetition's motion series binned by path progress: a mean per bin. */
function binRun(run, column) {
  const series = run.metrics.series?.motion ?? [];
  if (!series.length) {
    return undefined;
  }
  const duration =
    run.motionSeconds ?? Math.max(...series.map((p) => p[0])) ?? 1;
  const sums = new Float64Array(BINS);
  const counts = new Uint32Array(BINS);
  for (const p of series) {
    const v = p[column];
    if (v === null || v === undefined) {
      continue;
    }
    const b = Math.min(BINS - 1, Math.floor((p[0] / duration) * BINS));
    sums[b] += v;
    counts[b]++;
  }
  if (!counts.some((c) => c > 0)) {
    return undefined;
  }
  return Array.from(sums, (s, b) => (counts[b] ? s / counts[b] : null));
}

/**
 * Per configuration: each repetition's binned profile along the path and
 * the median profile (the median over repetitions per bin), for one
 * motion metric.
 */
export function pathProfiles(runs, configs, column) {
  const out = new Map();
  for (const config of configs) {
    const reps = runs
      .filter((r) => r.config === config && r.metrics.status === "ok")
      .map((r) => binRun(r, column))
      .filter(Boolean);
    if (!reps.length) {
      continue;
    }
    const profile = [...Array(BINS).keys()].map((b) => {
      const values = reps.map((r) => r[b]).filter((v) => v !== null);
      return values.length ? median(values) : null;
    });
    out.set(config, { reps, profile });
  }
  return out;
}

const pct = (b) => ((b + 0.5) / BINS) * 100;

/** The middle segment, shaded on path charts. */
const middleBand = () => [
  {
    x0: 100 / 3,
    x1: 200 / 3,
    color: "var(--muted)",
    label: "middle third of the path",
  },
];

/**
 * The path overlay (median per configuration, repetitions faint) and the
 * delta trace (candidate minus baseline), as two charts on one x.
 */
export function pathOverlay({ profiles, configs, baseline, candidate, color, metric }) {
  const [, label, unit] = PATH_METRICS[metric];
  const series = [];
  for (const config of configs) {
    const l = profiles.get(config);
    if (!l) {
      continue;
    }
    for (const [i, rep] of l.reps.entries()) {
      series.push({
        label: `${config} #${i + 1}`,
        group: config,
        color: color(config),
        opacity: 0.22,
        width: 1,
        markers: false,
        points: rep.map((v, b) => [pct(b), v]),
      });
    }
    series.push({
      label: `${config} median`,
      group: config,
      color: color(config),
      markers: false,
      points: l.profile.map((v, b) => [pct(b), v]),
    });
  }
  if (!series.length) {
    return "";
  }
  let out = lineChart({
    title: `${label} along the camera path`,
    subtitle: `Median of the repetitions (thin lines) per 2% of the path. The shaded band is the middle third of the path.`,
    xLabel: "% of path",
    unit,
    series,
    bands: middleBand(),
    height: 180,
  });
  const a = profiles.get(baseline)?.profile;
  const b = profiles.get(candidate)?.profile;
  if (a && b && baseline !== candidate) {
    out += lineChart({
      title: `Delta: ${candidate} minus ${baseline}`,
      subtitle: `Below zero, ${candidate} is faster at that point of the path; above, slower.`,
      xLabel: "% of path",
      unit,
      series: [
        {
          label: `${candidate} − ${baseline}`,
          color: "var(--ink-2)",
          markers: false,
          points: a.map((v, i) =>
            [pct(i), v === null || b[i] === null ? null : b[i] - v],
          ),
        },
      ],
      bands: middleBand(),
      zero: true,
      height: 130,
    });
  }
  return out;
}

/**
 * Path segments: per configuration, the mean per-frame cost in each third
 * of the camera path and over the whole path, its gap to the lowest, and
 * whether it is clearly faster or slower than the baseline (bootstrap
 * intervals over repetitions).
 */
export function segmentTable({ profiles, configs, baseline, color, metric }) {
  const [, label, unit] = PATH_METRICS[metric];
  const present = configs.filter((c) => profiles.has(c));
  if (present.length < 1) {
    return "";
  }
  const segmentOf = (profile, s) => {
    const from = Math.round((s * BINS) / 3);
    const to = Math.round(((s + 1) * BINS) / 3);
    return mean(profile.slice(from, to).filter((v) => v !== null));
  };
  // Per configuration: per segment (and the whole path), each repetition's value.
  const values = new Map(
    present.map((c) => [
      c,
      [0, 1, 2, "all"].map((s) =>
        profiles
          .get(c)
          .reps.map((rep) =>
            s === "all" ? mean(rep.filter((v) => v !== null)) : segmentOf(rep, s),
          )
          .filter((v) => v !== undefined),
      ),
    ]),
  );
  const columns = [...SEGMENTS, "whole path"];
  const best = [...columns.keys()].map((s) =>
    Math.min(...present.map((c) => median(values.get(c)[s]) ?? Infinity)),
  );
  const rows = present
    .map((c) => {
      const cells = [...columns.keys()].map((s) => {
        const v = median(values.get(c)[s]);
        if (v === undefined) {
          return "<td>–</td>";
        }
        const lowest = present.length > 1 && v === best[s];
        const gap = lowest || present.length < 2 ? "" : `+${(v - best[s]).toFixed(2)}`;
        let vs = "";
        if (c !== baseline && values.has(baseline)) {
          const r = ratio(values.get(baseline)[s], values.get(c)[s]);
          if (r?.separated) {
            vs = r.value < 1
              ? `<span class="ratio better">▼ faster than ${escape(baseline)}</span>`
              : `<span class="ratio worse">▲ slower than ${escape(baseline)}</span>`;
          }
        }
        return `<td class="${lowest ? "lowest" : ""}">${v.toFixed(2)}${lowest ? `<span class="gap">lowest</span>` : gap ? `<span class="gap">${gap}</span>` : ""}${vs}</td>`;
      });
      return `<tr><th><span class="key" style="background:${color(c)}"></span>${escape(c)}</th>${cells.join("")}</tr>`;
    })
    .join("");
  return `<figure class="chart board"><figcaption>${escape(label)} by path segment (${unit})</figcaption>
<div class="sub">Mean per frame in each third of the camera path, median of the repetitions. Gaps are to the lowest; a verdict against ${escape(baseline)} appears only when the intervals separate.</div>
<table class="segments"><tr><th></th>${columns.map((s) => `<th>${s}</th>`).join("")}</tr>${rows}</table></figure>`;
}

/**
 * The path map: the camera path from above (longitude scaled by the
 * cosine of latitude), each bin in the color of the configuration that
 * was at least 5% faster there, gray where neither.
 */
export function pathMap({ path, profiles, configs, color, metric, title }) {
  if (!path?.length) {
    return "";
  }
  const lat0 = (mean(path.map((p) => p[2])) * Math.PI) / 180;
  const xy = path.map((p) => [p[1] * Math.cos(lat0), -p[2]]);
  const xs = xy.map((p) => p[0]);
  const ys = xy.map((p) => p[1]);
  const spanX = Math.max(...xs) - Math.min(...xs);
  const spanY = Math.max(...ys) - Math.min(...ys);
  const span = Math.max(spanX, spanY);
  if (!(span > 1e-7)) {
    return "";
  }
  const size = 260;
  const pad = 22;
  const scale = (size - 2 * pad) / span;
  const ox = pad + (size - 2 * pad - spanX * scale) / 2;
  const oy = pad + (size - 2 * pad - spanY * scale) / 2;
  const sx = (x) => ox + (x - Math.min(...xs)) * scale;
  const sy = (y) => oy + (y - Math.min(...ys)) * scale;
  const present = configs.filter((c) => profiles.has(c));
  const leader = (b) => {
    const vals = present
      .map((c) => [c, profiles.get(c).profile[b]])
      .filter(([, v]) => v !== null && v !== undefined)
      .sort((p, q) => p[1] - q[1]);
    if (vals.length < 2) {
      return undefined;
    }
    return vals[1][1] - vals[0][1] > FASTER_BY * vals[1][1] ? vals[0][0] : undefined;
  };
  let svg = `<svg viewBox="0 0 ${size} ${size}" role="img" aria-label="${escape(title)}" style="max-width:${size}px">`;
  const d = xy.map((p, i) => `${i ? "L" : "M"}${sx(p[0]).toFixed(1)},${sy(p[1]).toFixed(1)}`).join("");
  svg += `<path d="${d}" fill="none" stroke="var(--grid)" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>`;
  const share = new Map();
  for (let i = 0; i + 1 < path.length; i++) {
    const progress = (path[i][0] + path[i + 1][0]) / 2;
    const b = Math.min(BINS - 1, Math.floor(progress * BINS));
    const who = leader(b);
    share.set(who ?? "", (share.get(who ?? "") ?? 0) + 1);
    const stroke = who ? color(who) : "var(--neutral)";
    svg += `<line x1="${sx(xy[i][0]).toFixed(1)}" y1="${sy(xy[i][1]).toFixed(1)}" x2="${sx(xy[i + 1][0]).toFixed(1)}" y2="${sy(xy[i + 1][1]).toFixed(1)}" stroke="${stroke}" stroke-width="5" stroke-linecap="round"><title>${escape(`${Math.round(progress * 100)}% of path: ${who ? `${who} faster` : "no clear difference"}`)}</title></line>`;
  }
  // The start and the segment boundaries.
  for (const [s, at] of [["start", 0], ["33%", 1 / 3], ["67%", 2 / 3]]) {
    const i = Math.min(path.length - 1, Math.round(at * (path.length - 1)));
    const [x, y] = [sx(xy[i][0]), sy(xy[i][1])];
    svg += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5" fill="var(--surface)" stroke="var(--ink-2)" stroke-width="2"/>`;
    svg += `<text x="${(x + 9).toFixed(1)}" y="${(y - 7).toFixed(1)}" class="label">${s}</text>`;
  }
  svg += `</svg>`;
  const total = path.length - 1;
  const legend = [...present, ""].map((c) => {
    const n = share.get(c) ?? 0;
    return `<span><span class="key" style="background:${c ? color(c) : "var(--neutral)"}"></span>${c ? `${escape(c)} faster` : "no clear difference"} · ${Math.round((n / total) * 100)}%</span>`;
  });
  const [, label] = PATH_METRICS[metric];
  return `<figure class="chart pathmap"><figcaption>${escape(title)}</figcaption><div class="sub">The camera path from above, north up. Each stretch takes the color of the configuration at least ${FASTER_BY * 100}% faster there (${escape(label)}).</div><div class="legend">${legend.join("")}</div>${svg}</figure>`;
}

const PERCENTILES = [50, 75, 90, 95, 99, 99.5, 99.9];

/** Frame-time percentile curves: every motion frame of all repetitions. */
export function percentileCurve({ runs, configs, color }) {
  const series = [];
  for (const config of configs) {
    const intervals = runs
      .filter((r) => r.config === config && r.metrics.status === "ok")
      .flatMap((r) => r.metrics.intervals ?? [])
      .sort((a, b) => a - b);
    if (!intervals.length) {
      continue;
    }
    series.push({
      label: config,
      color: color(config),
      points: PERCENTILES.map((p, i) => [
        i,
        intervals[Math.min(intervals.length - 1, Math.floor((p / 100) * intervals.length))],
      ]),
    });
  }
  if (!series.length) {
    return "";
  }
  return lineChart({
    title: "Frame-time percentiles while orbiting",
    subtitle: "Every frame of every repetition. A flat curve is smooth; a late rise is stutter.",
    xLabel: "percentile",
    unit: "ms",
    xNames: PERCENTILES.map((p) => `p${p}`),
    series,
    height: 150,
  });
}

/**
 * The filmstrip: each configuration's settled views side by side, with
 * the image parity (FLIP, lower is closer) against the baseline and the
 * heatmap on demand.
 */
export function filmstrip({ entries, assets, configs, baseline, explore }) {
  if (!entries?.length || !assets) {
    return "";
  }
  const moments = { start: "settled after loading", end: "settled after the orbit" };
  const rows = entries
    .map((e) => {
      const cells = configs
        .filter((c) => e.images[c])
        .map((c) => {
          const f = e.flip[c];
          const caption = c === baseline
            ? `${escape(c)} · reference`
            : f
              ? `${escape(c)} · FLIP ${f.mean.toFixed(3)} mean, ${f.p95.toFixed(3)} p95`
              : escape(c);
          return `<div class="frame"><a href="${escape(assets + e.images[c])}" target="_blank" rel="noopener"><img loading="lazy" src="${escape(assets + e.images[c])}" alt="${escape(`${c}, ${moments[e.moment] ?? e.moment}`)}"></a><div class="cap">${caption}</div>${f ? `<details><summary>Difference heatmap</summary><img loading="lazy" src="${escape(assets + f.heatmap)}" alt="${escape(`FLIP heatmap, ${c} against ${baseline}`)}"></details>` : ""}</div>`;
        });
      const at = e.moment === "end" ? 1 : 0;
      return `<div class="moment"><div class="m-label">${escape(moments[e.moment] ?? e.moment)}${explore ? ` · <a target="_top" href="${explore}&amp;t=${at}">open here in the explorer</a>` : ""}</div><div class="frames">${cells.join("")}</div></div>`;
    })
    .join("");
  return `<figure class="chart filmstrip"><figcaption>Filmstrip</figcaption><div class="sub">The first repetition's views once settled. FLIP measures how differently the two images look to a viewer (0 identical, 1 completely different); faster must not mean drawing less.</div>${rows}</figure>`;
}

/**
 * The request waterfall per configuration (first repetition): one row per
 * content request in start order, waiting (to the first byte) faint and
 * receiving solid; then the bytes received over time.
 */
export function waterfall({ runs, configs, color }) {
  const firsts = configs
    .map((c) =>
      runs.find((r) => r.config === c && r.waterfall?.length && r.metrics.status === "ok"),
    )
    .filter(Boolean);
  if (!firsts.length) {
    return "";
  }
  const width = 960;
  const left = 52;
  const right = 12;
  const end = Math.max(
    ...firsts.flatMap((r) => r.waterfall.map((w) => w[0] + (w[2] ?? w[1] ?? 0))),
  );
  const sx = (ms) => left + (ms / (end || 1)) * (width - left - right);
  const parts = firsts.map((r) => {
    const n = r.waterfall.length;
    const h = Math.min(220, Math.max(60, n * 1.5));
    const row = h / n;
    let svg = `<svg viewBox="0 0 ${width} ${h + 22}" role="img" aria-label="${escape(`Request waterfall, ${r.config}`)}">`;
    for (const t of [0, ...ticksMs(end)]) {
      svg += `<line x1="${sx(t)}" x2="${sx(t)}" y1="0" y2="${h}" stroke="var(--grid)" stroke-width="1"/>`;
      svg += `<text x="${sx(t)}" y="${h + 16}" text-anchor="middle">${compact(t / 1000)} s</text>`;
    }
    r.waterfall.forEach(([start, ttfb, done, bytes, kind, host], i) => {
      const y = (i * row).toFixed(2);
      const hh = Math.max(0.6, row * 0.8).toFixed(2);
      const first = ttfb ?? done ?? 0;
      const last = done ?? first;
      const tip = `<title>${escape(`${kind} · ${host} · starts ${(start / 1000).toFixed(2)} s · first byte after ${first} ms · done after ${last} ms · ${compact(bytes)} B`)}</title>`;
      svg += `<g>${tip}<rect x="${sx(start).toFixed(1)}" y="${y}" width="${Math.max(0.8, sx(start + first) - sx(start)).toFixed(1)}" height="${hh}" fill="${color(r.config)}" opacity="0.35"/>`;
      svg += `<rect x="${sx(start + first).toFixed(1)}" y="${y}" width="${Math.max(0.8, sx(start + last) - sx(start + first)).toFixed(1)}" height="${hh}" fill="${color(r.config)}"/></g>`;
    });
    if (r.metrics.settleMs !== undefined) {
      svg += `<line x1="${sx(r.metrics.settleMs)}" x2="${sx(r.metrics.settleMs)}" y1="0" y2="${h}" stroke="var(--ink-2)" stroke-width="1" stroke-dasharray="3 3"/>`;
      svg += `<text x="${sx(r.metrics.settleMs) + 4}" y="10" class="label">settled</text>`;
    }
    svg += `</svg>`;
    const kinds = new Map();
    for (const w of r.waterfall) {
      const k = kinds.get(w[4]) ?? [0, 0];
      kinds.set(w[4], [k[0] + 1, k[1] + w[3]]);
    }
    const summary = [...kinds]
      .sort((a, b) => b[1][1] - a[1][1])
      .map(([k, [count, bytes]]) => `${escape(k)} ${count} (${(bytes / 1e6).toFixed(1)} MB)`)
      .join(" · ");
    return `<div class="wf"><div class="m-label"><span class="key" style="background:${color(r.config)}"></span>${escape(r.config)}: ${n} requests · ${summary}</div>${svg}</div>`;
  });
  const cumulative = lineChart({
    title: "Bytes received over time",
    subtitle: "Content bytes, cumulative, first repetition.",
    xLabel: "s",
    unit: "MB",
    series: firsts.map((r) => {
      let total = 0;
      const points = [[0, 0]];
      for (const w of [...r.waterfall].sort((a, b) => a[0] + (a[2] ?? 0) - (b[0] + (b[2] ?? 0)))) {
        total += w[3];
        points.push([(w[0] + (w[2] ?? w[1] ?? 0)) / 1000, total / 1e6]);
      }
      return { label: r.config, color: color(r.config), points: thin(points, 400) };
    }),
    height: 150,
  });
  return `<figure class="chart waterfall"><figcaption>Request waterfall</figcaption><div class="sub">Every content request of the first repetition, in start order: faint while waiting for the first byte, solid while receiving. The dashed line is when the view settled.</div>${parts.join("")}</figure>${cumulative}`;
}

function ticksMs(end) {
  const step = [250, 500, 1000, 2000, 5000, 10000, 20000, 30000].find((s) => end / s <= 10) ?? 60000;
  const out = [];
  for (let t = step; t <= end; t += step) {
    out.push(t);
  }
  return out;
}

function thin(points, max) {
  if (points.length <= max) {
    return points;
  }
  const step = points.length / max;
  const out = [];
  for (let i = 0; i < max; i++) {
    out.push(points[Math.floor(i * step)]);
  }
  out.push(points[points.length - 1]);
  return out;
}

/** Styles for the diagnosis views (added to the report's). */
export const DIAGNOSE_CSS = `
.viz .diag { display: grid; grid-template-columns: minmax(0, 1fr) 300px; gap: 12px; align-items: start; }
@media (max-width: 860px) { .viz .diag { grid-template-columns: minmax(0, 1fr); } }
.viz table.segments { border-collapse: collapse; font-variant-numeric: tabular-nums; width: 100%; }
.viz table.segments th, .viz table.segments td { padding: 5px 10px; border-bottom: 1px solid var(--grid); text-align: right; white-space: nowrap; color: var(--ink); }
.viz table.segments th:first-child { text-align: left; font-weight: 600; }
.viz table.segments tr:first-child th { color: var(--ink-2); font-weight: 600; font-size: 12px; }
.viz table.segments td.lowest { font-weight: 700; }
.viz table.segments .gap { display: block; font-size: 11px; color: var(--muted); font-weight: normal; }
.viz table.segments .ratio { font-weight: normal; }
.viz .filmstrip .moment { margin: 8px 0 12px; }
.viz .m-label { font-size: 12px; color: var(--ink-2); margin: 4px 0; }
.viz .frames { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 10px; }
.viz .frame img { width: 100%; display: block; border-radius: 4px; border: 1px solid var(--grid); }
.viz .frame .cap { font-size: 12px; color: var(--ink-2); margin-top: 3px; font-variant-numeric: tabular-nums; }
.viz .frame details { margin: 2px 0; } .viz .frame summary { font-size: 11px; color: var(--muted); }
.viz .wf { margin: 6px 0 10px; }
`;
