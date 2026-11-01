import { METRICS, renderReport, summarizeRun } from "./report.mjs";
import { CHART_CSS, CHART_SCRIPT, escape, forestPlot } from "./charts.mjs";
import { ratio } from "./stats.mjs";
import {
  cellKey,
  cellTitle,
  mountWorkspace,
  type Summary as WorkspaceSummary,
} from "./workspace.ts";

/**
 * Dyno, the benchmark app (plan §16.5, §16.9), in the spirit of ML
 * experiment trackers: every run is an experiment with parameters
 * (commit, configurations, hardware, tags, a note) and metrics. The
 * Workspace follows metrics run to run and commit to commit
 * (workspace.ts), Runs is the experiment log, Compare puts two runs side
 * by side per scene (the commit-to-commit regression view), Report opens
 * one run, and the Explorer shows scenes live. Reads the results
 * directory through the dev server; compact summaries keep it fast.
 */

/* eslint-disable @typescript-eslint/no-explicit-any -- results are JSON */
type Json = any;

interface Summary {
  name: string;
  date: string;
  commit: string;
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
  scenes: Array<{
    scene: string;
    scenario?: string;
    title: string;
    config: string;
    metrics: Record<
      string,
      { median: number; low: number; high: number; values: number[] }
    >;
  }>;
}

const METRIC_LIST = METRICS;
const HEADLINE = ["settleMs", "cpuP50", "frameP95", "bytes", "heapBytes"];
const style = document.createElement("style");
style.textContent = CHART_CSS;
document.head.append(style);

const main = document.querySelector<HTMLElement>("#main")!;
const where = document.querySelector<HTMLElement>("#where")!;
const store = {
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

const index = (await (await fetch("/bench-results/index.json")).json()) as {
  directory: string;
  runs: string[];
  summaries: string[];
};
const fullCache = new Map<string, Json>();
async function full(name: string): Promise<Json> {
  if (!fullCache.has(name)) {
    fullCache.set(name, await (await fetch(`/bench-results/${name}`)).json());
  }
  return fullCache.get(name);
}
const summaries: Summary[] = (
  await Promise.all(
    index.runs.map(async (name) => {
      const summaryName = name.replace(/\.json$/, ".summary.json");
      try {
        const s = index.summaries.includes(summaryName)
          ? await (await fetch(`/bench-results/${summaryName}`)).json()
          : summarizeRun(await full(name));
        return { ...s, name };
      } catch {
        return undefined;
      }
    }),
  )
)
  .filter((s): s is Summary => !!s)
  .sort((a, b) => a.date.localeCompare(b.date));

where.textContent = `${summaries.length} runs in ${index.directory} (BENCH_RESULTS) · run the suite with node packages/next/bench/suite/cli.mjs run --note "what changed" --tag a,b`;

const short = (s: Summary) => `${s.commit.slice(0, 7)}${s.dirty ? "*" : ""}`;
const when = (s: Summary) =>
  new Date(s.date).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
const metricInfo = (key: string) => METRIC_LIST.find((m) => m[0] === key)!;
const geomean = (values: number[]) =>
  values.length
    ? Math.exp(values.reduce((a, v) => a + Math.log(v), 0) / values.length)
    : undefined;

function bindCharts(): void {
  document.querySelectorAll(".tip").forEach((t) => t.remove());
  new Function(CHART_SCRIPT)();
}

/** A row of toggle chips; the selection persists per `key`. */
function chips(
  key: string,
  options: Array<[string, string]>,
  fallback: string[],
  onChange: () => void,
): { el: HTMLElement; selected: () => string[] } {
  const state: { selected: string[] } = { selected: store.get(key, fallback) };
  const el = document.createElement("div");
  el.className = "chips";
  for (const [value, label] of options) {
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.textContent = label;
    chip.tabIndex = 0;
    const sync = () =>
      chip.setAttribute("aria-pressed", String(state.selected.includes(value)));
    sync();
    const toggle = () => {
      state.selected = state.selected.includes(value)
        ? state.selected.filter((v) => v !== value)
        : [...state.selected, value];
      store.set(key, state.selected);
      sync();
      onChange();
    };
    chip.addEventListener("click", toggle);
    chip.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggle();
      }
    });
    el.append(chip);
  }
  return { el, selected: () => state.selected };
}

function select(
  options: Array<[string, string]>,
  value: string,
  onChange: (v: string) => void,
): HTMLSelectElement {
  const el = document.createElement("select");
  for (const [v, label] of options) {
    el.add(new Option(label, v));
  }
  el.value = value;
  el.addEventListener("change", () => onChange(el.value));
  return el;
}

function label(text: string, control: HTMLElement): HTMLElement {
  const l = document.createElement("label");
  l.append(`${text} `, control);
  return l;
}

// ------------------------------------------------------------ workspace

function workspace(): void {
  main.replaceChildren();
  if (summaries.length === 0) {
    main.innerHTML = `<div class="empty">No runs yet.</div>`;
    return;
  }
  const root = document.createElement("div");
  main.append(root);
  mountWorkspace(
    root,
    summaries as unknown as WorkspaceSummary[],
    store,
    (name) => {
      store.set("bench.report", name);
      show("report");
    },
    bindCharts,
  );
}

// ------------------------------------------------------------ run log

function log(): void {
  main.replaceChildren();
  const rows = [...summaries].reverse().map((s) => {
    const headline = (key: string) => {
      const configs = s.configs;
      const base = s.baseline ?? (configs.includes("1.x") ? "1.x" : configs[0]);
      const cand = s.candidate ?? configs.find((c) => c !== base);
      if (!cand) {
        return "–";
      }
      const ratios: number[] = [];
      for (const cell of s.scenes.filter((c) => c.config === cand)) {
        const b = s.scenes.find(
          (c) => cellKey(c) === cellKey(cell) && c.config === base,
        );
        const r =
          b &&
          ratio(b.metrics[key]?.values ?? [], cell.metrics[key]?.values ?? []);
        if (r?.value) {
          ratios.push(r.value);
        }
      }
      const g = geomean(ratios);
      if (g === undefined) {
        return "–";
      }
      const cls = g < 0.95 ? "better" : g > 1.05 ? "worse" : "muted";
      return `<span class="${cls}">${g < 0.95 ? "▼ " : g > 1.05 ? "▲ " : ""}×${g.toFixed(2)}</span>`;
    };
    const scenes = new Set(s.scenes.map((c) => cellKey(c))).size;
    return `<tr>
<td>${escape(when(s))}</td>
<td><code>${escape(short(s))}</code><div class="muted">${escape(s.branch ?? "")}</div></td>
<td>${escape(s.note ?? "")}${s.tags.length ? `<div class="muted">${s.tags.map(escape).join(", ")}</div>` : ""}</td>
<td>${escape(s.hardware)}<div class="muted">${escape(s.browser ?? "")}</div></td>
<td class="num">${scenes} × ${escape(s.configs.join(", "))} × ${s.repetitions}</td>
<td class="num">${headline("cpuP50")}</td>
<td class="num">${headline("settleMs")}</td>
<td class="num">${headline("frameP95")}</td>
<td><button class="link" data-open="${escape(s.name)}">Report</button></td>
</tr>`;
  });
  main.innerHTML = `<p class="lede">Every run, newest first. Ratios are the run's candidate configuration over 1.x (geometric mean across scenes; ▼ better, ▲ worse). Notes and tags come from <code>--note</code> and <code>--tag</code>.</p>
<table class="log"><tr><th>When</th><th>Commit</th><th>Note</th><th>Hardware</th><th class="num">Scenes × configs × reps</th><th class="num">CPU / frame</th><th class="num">Settle</th><th class="num">Frame p95</th><th></th></tr>${rows.join("")}</table>`;
  main.querySelectorAll<HTMLButtonElement>("[data-open]").forEach((b) =>
    b.addEventListener("click", () => {
      store.set("bench.report", b.dataset.open);
      show("report");
    }),
  );
}

// ------------------------------------------------------------ compare

function compare(): void {
  main.replaceChildren();
  if (summaries.length < 2) {
    main.innerHTML = `<div class="empty">Compare needs two runs.</div>`;
    return;
  }
  const names = [...summaries]
    .reverse()
    .map(
      (s) =>
        [s.name, `${when(s)} · ${short(s)}${s.note ? ` · ${s.note}` : ""}`] as [
          string,
          string,
        ],
    );
  let a = store.get("bench.compareA", names[1]![0]);
  let b = store.get("bench.compareB", names[0]![0]);
  let config = store.get("bench.compareConfig", "2.0");
  const controls = document.createElement("div");
  controls.className = "controls";
  const out = document.createElement("div");
  const metricChips = chips(
    "bench.metrics",
    METRIC_LIST.map(([k, l]) => [k, l]),
    HEADLINE,
    () => draw(),
  );
  const configs = [...new Set(summaries.flatMap((s) => s.configs))];
  controls.append(
    label(
      "Baseline run",
      select(names, a, (v) => {
        a = v;
        store.set("bench.compareA", v);
        draw();
      }),
    ),
    label(
      "Candidate run",
      select(names, b, (v) => {
        b = v;
        store.set("bench.compareB", v);
        draw();
      }),
    ),
    label(
      "Configuration",
      select(
        configs.map((c) => [c, c]),
        config,
        (v) => {
          config = v;
          store.set("bench.compareConfig", v);
          draw();
        },
      ),
    ),
    metricChips.el,
  );
  main.append(controls, out);
  function draw(): void {
    const sa = summaries.find((s) => s.name === a);
    const sb = summaries.find((s) => s.name === b);
    if (!sa || !sb) {
      out.innerHTML = "";
      return;
    }
    let html = `<p class="lede">${escape(config)} in the candidate run relative to the baseline run, per scene: the commit-to-commit view. Hardware: ${escape(sa.hardware)}${sa.hardware !== sb.hardware ? ` vs ${escape(sb.hardware)} (different machines: compare with care)` : ""}.</p>`;
    const current = config;
    for (const key of metricChips.selected()) {
      const [, name] = metricInfo(key);
      const sceneIds = [...new Set(sb.scenes.map((c) => cellKey(c)))];
      const rows = sceneIds.map((id) => {
        const ca = sa.scenes.find(
          (c) => cellKey(c) === id && c.config === current,
        );
        const cb = sb.scenes.find(
          (c) => cellKey(c) === id && c.config === current,
        );
        const r =
          ca && cb
            ? ratio(
                ca.metrics[key]?.values ?? [],
                cb.metrics[key]?.values ?? [],
              )
            : undefined;
        return {
          label: cb ? cellTitle(cb) : ca ? cellTitle(ca) : id,
          ratio: r?.value !== undefined ? r : undefined,
          note: !ca
            ? "not in the baseline run"
            : !cb
              ? "not in this run"
              : "no data",
        };
      });
      html += forestPlot({
        title: `${name}: candidate relative to baseline (${config})`,
        rows,
        baseline: "baseline run",
        candidate: "candidate run",
      });
    }
    out.innerHTML = html;
  }
  draw();
}

// ------------------------------------------------------------ report

async function report(): Promise<void> {
  main.replaceChildren();
  if (summaries.length === 0) {
    main.innerHTML = `<div class="empty">No runs yet.</div>`;
    return;
  }
  const names = [...summaries]
    .reverse()
    .map(
      (s) =>
        [s.name, `${when(s)} · ${short(s)}${s.note ? ` · ${s.note}` : ""}`] as [
          string,
          string,
        ],
    );
  let name = store.get("bench.report", names[0]![0]);
  if (!names.some((n) => n[0] === name)) {
    name = names[0]![0];
  }
  const frame = document.createElement("iframe");
  frame.title = "Report";
  const render = async () => {
    frame.srcdoc = renderReport(await full(name));
  };
  const controls = document.createElement("div");
  controls.className = "controls";
  controls.append(
    label(
      "Run",
      select(names, name, (v) => {
        name = v;
        store.set("bench.report", v);
        void render();
      }),
    ),
  );
  main.append(controls, frame);
  await render();
}

// ------------------------------------------------------------ explorer

/**
 * The explorer (explore.ts), loaded on first use: it brings both engines.
 * Its state (scene, engines, place on the camera path) lives in this
 * page's URL, so a view can be shared or linked from a report.
 */
let stopExplorer: (() => void) | undefined;
const EXPLORE_KEYS = ["scene", "left", "right", "t", "cesium"];
function exploreUrl(params: Record<string, string>): URL {
  const url = new URL(location.href);
  for (const key of EXPLORE_KEYS) {
    url.searchParams.delete(key);
  }
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return url;
}
async function explore(): Promise<void> {
  main.replaceChildren();
  const root = document.createElement("div");
  main.append(root);
  const { mountExplorer } = await import("./explore.ts");
  stopExplorer = mountExplorer(
    root,
    new URLSearchParams(location.search),
    (params) => history.replaceState(null, "", exploreUrl(params)),
    // Another 1.x build: a page holds one, so load the page again.
    (params) => location.assign(exploreUrl(params)),
  );
}

// ------------------------------------------------------------ tabs

const views: Record<string, () => void | Promise<void>> = {
  workspace,
  log,
  compare,
  report,
  explore,
};
const WORKSPACE_KEYS = ["ws", "split", "base", "cand", "pin"];
function show(requested: string): void {
  // Older links: Trends became the workspace.
  const tab = requested === "trends" ? "workspace" : requested;
  for (const b of document.querySelectorAll<HTMLButtonElement>("nav button")) {
    b.setAttribute("aria-selected", String(b.dataset.tab === tab));
  }
  stopExplorer?.();
  stopExplorer = undefined;
  const url = new URL(location.href);
  url.searchParams.set("tab", tab);
  if (tab !== "explore") {
    for (const key of EXPLORE_KEYS) {
      url.searchParams.delete(key);
    }
  }
  if (tab !== "workspace") {
    for (const key of WORKSPACE_KEYS) {
      url.searchParams.delete(key);
    }
  }
  history.replaceState(null, "", url);
  void views[tab]!();
}
for (const b of document.querySelectorAll<HTMLButtonElement>("nav button")) {
  b.addEventListener("click", () => show(b.dataset.tab!));
}
show(new URLSearchParams(location.search).get("tab") ?? "workspace");
