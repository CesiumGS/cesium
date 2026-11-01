// Inline SVG charts for benchmark reports (plan §16.5), following the
// data-viz method: one y-axis per chart, thin marks, hairline grid, a
// legend for two or more series, text in ink tokens (never series
// colors), a table twin for every chart, and a crosshair readout on hover
// (CHART_SCRIPT). Engine identity uses categorical slots; better and worse
// use status colors with an icon and a label, never color alone.

export const escape = (s) =>
  String(s).replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
  );

/** Color tokens (light and dark), from the validated reference palette. */
export const CHART_CSS = `
.viz { --surface: #fcfcfb; --page: #f9f9f7; --ink: #0b0b0b; --ink-2: #52514e; --muted: #898781;
  --grid: #e1e0d9; --axis: #c3c2b7; --ring: #fcfcfb;
  --series-1: #2a78d6; --series-2: #eb6834; --series-3: #1baf7a; --series-4: #eda100;
  --good: #0ca30c; --good-text: #006300; --critical: #d03b3b; --neutral: #898781; }
@media (prefers-color-scheme: dark) { :root:where(:not([data-theme="light"])) .viz:not(.light) {
  --surface: #1a1a19; --page: #0d0d0d; --ink: #f0efec; --ink-2: #c3c2b7; --muted: #898781;
  --grid: #2c2c2a; --axis: #383835; --ring: #1a1a19;
  --series-1: #3987e5; --series-2: #d95926; --series-3: #199e70; --series-4: #c98500;
  --good: #0ca30c; --good-text: #0ca30c; --critical: #d03b3b; } }
.viz.dark, .dark .viz { --surface: #1a1a19; --page: #0d0d0d; --ink: #f0efec; --ink-2: #c3c2b7; --muted: #898781;
  --grid: #2c2c2a; --axis: #383835; --ring: #1a1a19;
  --series-1: #3987e5; --series-2: #d95926; --series-3: #199e70; --series-4: #c98500;
  --good: #0ca30c; --good-text: #0ca30c; --critical: #d03b3b; }
.viz figure.chart { margin: 0 0 16px; background: var(--surface); border: 1px solid var(--grid); border-radius: 8px; padding: 12px 14px; }
.viz figure.chart > figcaption { font-weight: 600; color: var(--ink); margin-bottom: 2px; }
.viz .sub { color: var(--ink-2); font-size: 12px; margin-bottom: 6px; }
.viz svg:not([class]) { display: block; width: 100%; height: auto; overflow: visible; }
.viz svg text { fill: var(--muted); font: 11px system-ui, sans-serif; font-variant-numeric: tabular-nums; }
.viz svg .label { fill: var(--ink-2); font-size: 12px; }
.viz .legend { display: flex; gap: 14px; flex-wrap: wrap; font-size: 12px; color: var(--ink-2); margin: 4px 0; }
.viz .key { display: inline-block; width: 14px; height: 2px; vertical-align: middle; margin-right: 6px; border-radius: 1px; }
.viz .swatch { display: inline-block; width: 12px; height: 10px; vertical-align: middle; margin-right: 6px; border-radius: 2px; opacity: 0.35; }
.viz details.twin > summary { font-size: 12px; color: var(--muted); cursor: pointer; margin-top: 6px; }
.viz table.twin { border-collapse: collapse; font-size: 12px; margin-top: 6px; font-variant-numeric: tabular-nums; }
.viz table.twin th, .viz table.twin td { padding: 2px 8px; border-bottom: 1px solid var(--grid); text-align: right; color: var(--ink-2); }
.viz table.twin th:first-child, .viz table.twin td:first-child { text-align: left; }
.viz .tiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin: 8px 0 16px; }
.viz .tile { background: var(--surface); border: 1px solid var(--grid); border-radius: 8px; padding: 12px 14px; }
.viz .tile .t-label { color: var(--ink-2); font-size: 12px; }
.viz .tile .t-value { color: var(--ink); font-size: 28px; font-weight: 600; margin: 2px 0; }
.viz .tile .t-delta { font-size: 12px; color: var(--ink-2); }
.viz .icon { font-size: 10px; margin-right: 4px; }
.viz .tip { position: fixed; pointer-events: none; background: var(--surface); border: 1px solid var(--grid); border-radius: 6px;
  padding: 6px 8px; font-size: 12px; color: var(--ink-2); box-shadow: 0 4px 16px rgba(0,0,0,.15); z-index: 10; display: none; max-width: 320px; }
.viz .tip b { color: var(--ink); font-weight: 600; }
.viz .tip .row { display: flex; align-items: center; gap: 6px; white-space: nowrap; }
`;

/** Clean tick values over [min, max] (about `count` of them). */
export function ticks(min, max, count = 4) {
  if (!(max > min)) {
    return [min];
  }
  const raw = (max - min) / count;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const step =
    [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= raw) ??
    raw;
  const out = [];
  for (let v = Math.ceil(min / step) * step; v <= max + step * 1e-9; v += step) {
    out.push(Number(v.toPrecision(12)));
  }
  return out;
}

export function compact(v) {
  const a = Math.abs(v);
  return a >= 1e6
    ? `${(v / 1e6).toFixed(a >= 1e7 ? 0 : 1)}M`
    : a >= 1e3
      ? `${(v / 1e3).toFixed(a >= 1e4 ? 0 : 1)}K`
      : a >= 10 || a === 0
        ? v.toFixed(0)
        : v.toFixed(a >= 1 ? 1 : 2);
}

/** A stat tile: label, value, and an optional delta line with an icon. */
export function statTile({ label, value, delta, status }) {
  const icon =
    status === "better"
      ? `<span class="icon" style="color:var(--good)">▼</span>`
      : status === "worse"
        ? `<span class="icon" style="color:var(--critical)">▲</span>`
        : "";
  return `<div class="tile"><div class="t-label">${escape(label)}</div><div class="t-value">${escape(value)}</div>${delta ? `<div class="t-delta">${icon}${escape(delta)}</div>` : ""}</div>`;
}

let chartIds = 0;

/**
 * Ratio by row on a log axis, centered on 1 (the baseline): a dot and its
 * 95% interval per row; green ▼ better or red ▲ worse only when the
 * interval excludes 1, else neutral. Rows without data show their reason.
 */
export function forestPlot({ title, subtitle, rows, baseline, candidate }) {
  const id = `c${++chartIds}`;
  const width = 960;
  const rowH = 26;
  const left = 300;
  const right = 90;
  const top = 18;
  const height = top + rows.length * rowH + 24;
  const values = rows.flatMap((r) =>
    r.ratio ? [r.ratio.low, r.ratio.high, r.ratio.value] : [],
  );
  const lo = Math.min(0.5, ...values.map((v) => v * 0.9));
  const hi = Math.max(2, ...values.map((v) => v * 1.1));
  const x = (v) =>
    left +
    ((Math.log(v) - Math.log(lo)) / (Math.log(hi) - Math.log(lo))) *
      (width - left - right);
  const tickValues = [0.125, 0.25, 0.5, 1, 2, 4, 8].filter(
    (v) => v >= lo && v <= hi,
  );
  let svg = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${escape(title)}">`;
  for (const t of tickValues) {
    const tx = x(t);
    svg += `<line x1="${tx}" x2="${tx}" y1="${top - 6}" y2="${height - 22}" stroke="${t === 1 ? "var(--axis)" : "var(--grid)"}" stroke-width="1"/>`;
    svg += `<text x="${tx}" y="${height - 8}" text-anchor="middle">×${t}</text>`;
  }
  svg += `<text x="${x(1)}" y="${top - 8}" text-anchor="middle">${escape(baseline)}</text>`;
  rows.forEach((r, i) => {
    const cy = top + i * rowH + rowH / 2;
    // Long scene names would run off the left edge: shortened, in full on hover.
    const label = r.label.length > 40 ? `${r.label.slice(0, 39)}…` : r.label;
    svg += `<text class="label" x="${left - 10}" y="${cy + 4}" text-anchor="end"><title>${escape(r.label)}</title>${escape(label)}</text>`;
    if (!r.ratio) {
      svg += `<text x="${left}" y="${cy + 4}">${escape(r.note ?? "no data")}</text>`;
      return;
    }
    const { value, low, high, separated } = r.ratio;
    const verdict = separated ? (value < 1 ? "better" : "worse") : "same";
    const color =
      verdict === "better"
        ? "var(--good)"
        : verdict === "worse"
          ? "var(--critical)"
          : "var(--neutral)";
    svg += `<g><title>${escape(`${r.label}: ${candidate} ×${value.toFixed(2)} of ${baseline} (95% ${low.toFixed(2)}–${high.toFixed(2)}), ${verdict === "same" ? "no clear difference" : verdict}`)}</title>`;
    svg += `<rect x="0" y="${cy - rowH / 2}" width="${width}" height="${rowH}" fill="transparent"/>`;
    svg += `<line x1="${x(low)}" x2="${x(high)}" y1="${cy}" y2="${cy}" stroke="${color}" stroke-width="2" stroke-linecap="round"/>`;
    svg += `<circle cx="${x(value)}" cy="${cy}" r="4.5" fill="${color}" stroke="var(--ring)" stroke-width="2"/>`;
    const icon = verdict === "better" ? "▼" : verdict === "worse" ? "▲" : "";
    svg += `<text x="${width - right + 10}" y="${cy + 4}" class="label">×${value.toFixed(2)}</text>`;
    if (icon) {
      svg += `<text x="${width - 14}" y="${cy + 4}" style="fill:${color}">${icon}</text>`;
    }
    svg += `</g>`;
  });
  svg += `</svg>`;
  const table = `<details class="twin"><summary>Table</summary><table class="twin"><tr><th>${escape("scene")}</th><th>ratio</th><th>95% interval</th><th>verdict</th></tr>${rows
    .map(
      (r) =>
        `<tr><td>${escape(r.label)}</td><td>${r.ratio ? `×${r.ratio.value.toFixed(2)}` : "–"}</td><td>${r.ratio ? `${r.ratio.low.toFixed(2)}–${r.ratio.high.toFixed(2)}` : escape(r.note ?? "")}</td><td>${r.ratio ? (r.ratio.separated ? (r.ratio.value < 1 ? "better" : "worse") : "no clear difference") : ""}</td></tr>`,
    )
    .join("")}</table></details>`;
  return `<figure class="chart" id="${id}"><figcaption>${escape(title)}</figcaption>${subtitle ? `<div class="sub">${escape(subtitle)}</div>` : ""}${svg}${table}</figure>`;
}

/**
 * A line chart: series of [x, y] points (one y-axis), optional shaded
 * bands along x (e.g. which engine ran when) and a crosshair readout.
 * `series`: { label, color, points, group?, band?, markers?, dash? } —
 * lines sharing a group share a legend entry (e.g. three repetitions of
 * one engine); `band` is [x, low, high] per point, drawn as a faint area
 * (an interval). `refs`: horizontal reference lines { y, label, color? };
 * `hbands`: horizontal ranges { y0, y1, label, color } (control bands);
 * `marks`: vertical markers { x, label } (annotations). `width` sets the
 * drawing's own width (small panels use less, so text stays legible).
 * Clicking the plot dispatches a `chart-click` event with the nearest x.
 */
export function lineChart({
  title,
  subtitle,
  xLabel,
  unit,
  series,
  bands = [],
  bandLegend = [],
  height = 160,
  yMin = 0,
  xNames,
  zero = false,
  refs = [],
  hbands = [],
  marks = [],
  width = 960,
}) {
  const id = `c${++chartIds}`;
  const left = 52;
  const right = 12;
  const top = 8;
  const bottom = 24;
  const all = series.flatMap((s) => s.points.filter((p) => p[1] !== null));
  if (all.length === 0) {
    return "";
  }
  const x0 = Math.min(...all.map((p) => p[0]), ...bands.map((b) => b.x0));
  const x1 = Math.max(...all.map((p) => p[0]), ...bands.map((b) => b.x1));
  const extra = [
    ...series.flatMap((s) =>
      (s.band ?? []).flatMap((b) => [b[1], b[2]]).filter(Number.isFinite),
    ),
    ...refs.map((r) => r.y),
    ...hbands.flatMap((b) => [b.y0, b.y1]),
  ];
  const ys = [...all.map((p) => p[1]), ...extra];
  const yMax = Math.max(...ys) * 1.08 || 1;
  const y0 = Math.min(yMin, ...ys);
  const sx = (v) => left + ((v - x0) / (x1 - x0 || 1)) * (width - left - right);
  const sy = (v) =>
    top + (1 - (v - y0) / (yMax - y0 || 1)) * (height - top - bottom);
  let svg = `<svg viewBox="0 0 ${width} ${height}" data-chart="${id}" role="img" aria-label="${escape(title)}">`;
  for (const b of bands) {
    svg += `<rect x="${sx(b.x0)}" y="${top}" width="${Math.max(1, sx(b.x1) - sx(b.x0))}" height="${height - top - bottom}" fill="${b.color}" opacity="0.12"/>`;
  }
  for (const b of hbands) {
    svg += `<rect x="${left}" y="${sy(b.y1)}" width="${width - left - right}" height="${Math.max(1, sy(b.y0) - sy(b.y1))}" fill="${b.color ?? "var(--muted)"}" opacity="0.1"><title>${escape(b.label ?? "")}</title></rect>`;
    for (const y of [b.y0, b.y1]) {
      svg += `<line x1="${left}" x2="${width - right}" y1="${sy(y)}" y2="${sy(y)}" stroke="${b.color ?? "var(--muted)"}" stroke-width="1" stroke-dasharray="4 3" opacity="0.6"/>`;
    }
  }
  for (const t of ticks(y0, yMax)) {
    svg += `<line x1="${left}" x2="${width - right}" y1="${sy(t)}" y2="${sy(t)}" stroke="var(--grid)" stroke-width="1"/>`;
    svg += `<text x="${left - 6}" y="${sy(t) + 4}" text-anchor="end">${compact(t)}</text>`;
  }
  // Categorical x (runs): every name if few, else a spread; else numeric.
  const xTicks = xNames
    ? ticks(x0, x1, Math.min(8, xNames.length)).filter((t) => Number.isInteger(t))
    : ticks(x0, x1, 8);
  for (const t of xTicks) {
    const text = xNames ? (xNames[t] ?? "").split(" · ")[0] : compact(t);
    svg += `<text x="${sx(t)}" y="${height - 6}" text-anchor="middle">${escape(text)}</text>`;
  }
  svg += `<line x1="${left}" x2="${width - right}" y1="${sy(y0)}" y2="${sy(y0)}" stroke="var(--axis)" stroke-width="1"/>`;
  if (zero && y0 < 0) {
    svg += `<line x1="${left}" x2="${width - right}" y1="${sy(0)}" y2="${sy(0)}" stroke="var(--ink-2)" stroke-width="1"/>`;
  }
  for (const r of refs) {
    svg += `<line x1="${left}" x2="${width - right}" y1="${sy(r.y)}" y2="${sy(r.y)}" stroke="${r.color ?? "var(--ink-2)"}" stroke-width="1" stroke-dasharray="${r.dash ?? ""}"/>`;
    if (r.label) {
      svg += `<text x="${width - right - 4}" y="${sy(r.y) - 4}" text-anchor="end">${escape(r.label)}</text>`;
    }
  }
  for (const m of marks) {
    svg += `<line x1="${sx(m.x)}" x2="${sx(m.x)}" y1="${top}" y2="${height - bottom}" stroke="var(--ink-2)" stroke-width="1" stroke-dasharray="2 3"><title>${escape(m.label)}</title></line>`;
    const short = String(m.short ?? m.label);
    const text = short.length > 18 ? `${short.slice(0, 17)}…` : short;
    const flip = sx(m.x) > width - right - text.length * 6.5;
    svg += `<text x="${sx(m.x) + (flip ? -3 : 3)}" y="${top + 10}" class="label" text-anchor="${flip ? "end" : "start"}">${escape(text)}</text>`;
  }
  // Intervals: a faint area per series, under the lines.
  for (const s of series) {
    const band = (s.band ?? []).filter(
      (b) => Number.isFinite(b[1]) && Number.isFinite(b[2]),
    );
    if (band.length > 1) {
      const upper = band.map((b) => `${sx(b[0]).toFixed(1)},${sy(b[2]).toFixed(1)}`);
      const lower = band
        .slice()
        .reverse()
        .map((b) => `${sx(b[0]).toFixed(1)},${sy(b[1]).toFixed(1)}`);
      svg += `<path d="M${upper.join("L")}L${lower.join("L")}Z" fill="${s.color}" opacity="0.15"/>`;
    } else if (band.length === 1) {
      const b = band[0];
      svg += `<line x1="${sx(b[0])}" x2="${sx(b[0])}" y1="${sy(b[1])}" y2="${sy(b[2])}" stroke="${s.color}" stroke-width="6" opacity="0.2" stroke-linecap="round"/>`;
    }
  }
  for (const s of series) {
    let d = "";
    let pen = false;
    for (const [px, py] of s.points) {
      if (py === null || py === undefined) {
        pen = false;
        continue;
      }
      d += `${pen ? "L" : "M"}${sx(px).toFixed(1)},${sy(py).toFixed(1)}`;
      pen = true;
    }
    svg += `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="${s.width ?? 2}" stroke-linejoin="round" stroke-linecap="round" opacity="${s.opacity ?? 1}"${s.dash ? ` stroke-dasharray="${s.dash}"` : ""}/>`;
    // Sparse series (one point per run): markers with a surface ring.
    if (s.markers !== false && s.points.length <= 60) {
      for (const [px, py] of s.points) {
        if (py !== null && py !== undefined) {
          const flagged = s.flags?.includes(px);
          svg += `<circle cx="${sx(px).toFixed(1)}" cy="${sy(py).toFixed(1)}" r="${flagged ? 6 : 4}" fill="${flagged ? "var(--surface)" : s.color}" stroke="${flagged ? s.color : "var(--ring)"}" stroke-width="${flagged ? 3 : 2}"/>`;
        }
      }
    }
  }
  svg += `<line class="cross" x1="0" x2="0" y1="${top}" y2="${height - bottom}" stroke="var(--axis)" stroke-width="1" visibility="hidden"/>`;
  svg += `</svg>`;
  // Legend: one entry per group (lines) and per band kind.
  const groups = new Map();
  for (const s of series) {
    groups.set(s.group ?? s.label, s.color);
  }
  const legend =
    groups.size > 1 || bandLegend.length
      ? `<div class="legend">${[...groups]
          .map(
            ([label, color]) =>
              `<span><span class="key" style="background:${color}"></span>${escape(label)}</span>`,
          )
          .join("")}${bandLegend
          .map(
            (b) =>
              `<span><span class="swatch" style="background:${b.color}"></span>${escape(b.label)}</span>`,
          )
          .join("")}</div>`
      : "";
  // Hover data: scales and the series (labels as data, set as text).
  const data = {
    x0,
    x1,
    left,
    right,
    width,
    xLabel,
    unit,
    xNames,
    series: series.map((s) => ({
      label: s.label,
      color: s.color,
      points: s.points,
    })),
    bands: bands.map((b) => [b.x0, b.x1, b.label]),
  };
  const table = `<details class="twin"><summary>Table</summary><table class="twin"><tr><th>series</th><th>points</th><th>min</th><th>median</th><th>max</th></tr>${series
    .map((s) => {
      const ys = s.points
        .map((p) => p[1])
        .filter((v) => v !== null && v !== undefined)
        .sort((a, b) => a - b);
      return `<tr><td>${escape(s.label)}</td><td>${ys.length}</td><td>${ys.length ? compact(ys[0]) : "–"}</td><td>${ys.length ? compact(ys[ys.length >> 1]) : "–"}</td><td>${ys.length ? compact(ys[ys.length - 1]) : "–"}</td></tr>`;
    })
    .join("")}</table></details>`;
  return `<figure class="chart" id="${id}"><figcaption>${escape(title)}</figcaption>${subtitle ? `<div class="sub">${escape(subtitle)}</div>` : ""}${legend}${svg}<script type="application/json" data-for="${id}">${JSON.stringify(data).replace(/</g, "\\u003c")}</script>${table}</figure>`;
}

/**
 * The crosshair readout for every line chart under `root` (a document, a
 * shadow root or an element): the pointer snaps to the nearest x; the
 * tooltip lists each series' value there (value strong, label secondary,
 * a line key) and the band under it. Labels are inserted as text, never
 * HTML. A click dispatches `chart-click` with the nearest x. Self-contained
 * (it is also inlined into standalone reports as CHART_SCRIPT).
 */
export function bindChartsIn(root) {
  for (const old of root.querySelectorAll(".tip")) {
    old.remove();
  }
  const tip = document.createElement("div");
  tip.className = "tip";
  const host =
    (root.classList && root.classList.contains("viz") ? root : root.querySelector(".viz")) || root;
  host.append(tip);
  for (const svg of root.querySelectorAll("svg[data-chart]")) {
    const data = JSON.parse(
      root.querySelector(`script[data-for="${svg.dataset.chart}"]`).textContent,
    );
    const cross = svg.querySelector(".cross");
    const nearest = (points, x) => {
      let best;
      let bestD = Infinity;
      for (const p of points) {
        if (p[1] === null) {
          continue;
        }
        const d = Math.abs(p[0] - x);
        if (d < bestD) {
          bestD = d;
          best = p;
        }
      }
      return best;
    };
    const toX = (e) => {
      const r = svg.getBoundingClientRect();
      const px = ((e.clientX - r.left) / r.width) * data.width;
      if (px < data.left || px > data.width - data.right) {
        return undefined;
      }
      return {
        px,
        x: data.x0 + ((px - data.left) / (data.width - data.left - data.right)) * (data.x1 - data.x0),
      };
    };
    svg.addEventListener("pointermove", (e) => {
      const at0 = toX(e);
      if (!at0) {
        tip.style.display = "none";
        cross.setAttribute("visibility", "hidden");
        return;
      }
      const { px, x } = at0;
      cross.setAttribute("x1", px);
      cross.setAttribute("x2", px);
      cross.setAttribute("visibility", "visible");
      tip.replaceChildren();
      const head = document.createElement("div");
      head.textContent = data.xNames
        ? data.xNames[Math.round(x)] || ""
        : `${data.xLabel || "x"} ${x.toFixed(1)}`;
      tip.append(head);
      const band = data.bands.find((b) => x >= b[0] && x <= b[1]);
      if (band) {
        const d = document.createElement("div");
        d.textContent = band[2];
        tip.append(d);
      }
      const at = data.xNames ? Math.round(x) : x;
      for (const s of data.series.slice(0, 12)) {
        const p = nearest(s.points, at);
        if (!p) {
          continue;
        }
        const row = document.createElement("div");
        row.className = "row";
        const key = document.createElement("span");
        key.className = "key";
        key.style.background = s.color;
        const v = document.createElement("b");
        v.textContent = Math.round(p[1] * 100) / 100 + (data.unit ? ` ${data.unit}` : "");
        const l = document.createElement("span");
        l.textContent = s.label;
        row.append(key, v, l);
        tip.append(row);
      }
      tip.style.display = "block";
      tip.style.left = `${Math.min(e.clientX + 14, innerWidth - 330)}px`;
      tip.style.top = `${e.clientY + 14}px`;
    });
    svg.addEventListener("pointerleave", () => {
      tip.style.display = "none";
      cross.setAttribute("visibility", "hidden");
    });
    svg.addEventListener("click", (e) => {
      const at = toX(e);
      if (at) {
        svg.closest("figure").dispatchEvent(
          new CustomEvent("chart-click", {
            bubbles: true,
            detail: { x: data.xNames ? Math.round(at.x) : at.x },
          }),
        );
      }
    });
  }
}

/** The same, as a script for standalone report pages. */
export const CHART_SCRIPT = `(${bindChartsIn.toString()})(document);`;
