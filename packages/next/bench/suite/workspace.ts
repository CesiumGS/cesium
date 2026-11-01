import { CONDITION_METRICS, METRICS } from "./report.mjs";
import { escape, lineChart } from "./charts.mjs";
import { ratio } from "./stats.mjs";
import { toast } from "./toast.ts";
import publicCatalog from "./catalog/public.json";
import type { Budget } from "./schema.ts";

const BUDGETS = (publicCatalog as { budgets?: Budget[] }).budgets ?? [];
/** Budgets that apply to a panel's metric, configuration and scene. */
const budgetsFor = (metric: string, config: string, scene: string) =>
  BUDGETS.filter(
    (b) =>
      b.metric === metric &&
      b.config === config &&
      (scene === "*" ||
        ((!b.scenes || b.scenes.includes(scene.split("|")[0]!)) &&
          (!b.scenario ||
            b.scenario === (scene.split("|")[1] ?? "cold-orbit")))),
  );

/**
 * Dyno's workspace (plan §16.9), after W&B's: a runs sidebar (show or
 * hide each run, search, filter by hardware and validity, pin a run as
 * the reference) and collapsible sections of small panels. The headline
 * section shows the candidate over the baseline per metric with its
 * interval and a line at ×1; the other sections show one line per
 * configuration with its interval, a control band (mean ± 3σ of the
 * earlier runs) with run rules, annotations where a configuration or the
 * hardware changes, and the pinned run as a reference. Any panel can
 * split by scene; clicking a point opens that run. The view lives in the
 * URL (shareable) and can be saved by name.
 */

/* eslint-disable @typescript-eslint/no-explicit-any -- results are JSON */
type Json = any;

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
  browser?: string;
  configs: string[];
  repetitions: number;
  baseline?: string;
  candidate?: string;
  validity?: { valid: number; warning: number; invalid: number };
  scenes: Cell[];
}

/** A scene and scenario as one key ("cold-orbit" is the default). */
export const cellKey = (c: Cell) =>
  c.scenario && c.scenario !== "cold-orbit"
    ? `${c.scene}|${c.scenario}`
    : c.scene;
export const cellTitle = (c: Cell) =>
  c.scenario && c.scenario !== "cold-orbit"
    ? `${c.title} · ${c.scenario}`
    : c.title;

const SECTIONS: Array<[string, string, string[]]> = [
  [
    "headline",
    "Headline",
    ["cpuP50", "settleMs", "frameP95", "bytes", "heapBytes"],
  ],
  ["loading", "Loading", ["firstContentMs", "settleMs", "resettleMs"]],
  [
    "rendering",
    "Rendering",
    [
      "cpuP50",
      "gpuP50",
      "frameP50",
      "frameP95",
      "frameP999",
      "frameStdDev",
      "over100",
      "longFrames",
    ],
  ],
  ["network", "Network and memory", ["requests", "bytes", "heapBytes"]],
  ["conditions", "Conditions", CONDITION_METRICS.map((m) => m[0])],
];
const INFO = new Map(
  [...METRICS, ...CONDITION_METRICS].map((m) => [m[0], m] as const),
);

interface State {
  scene: string;
  split: boolean;
  base: string;
  cand: string;
  pin: string;
  search: string;
  hardware: string;
  hideInvalid: boolean;
  showSweeps: boolean;
}

const geomean = (values: number[]) =>
  values.length
    ? Math.exp(values.reduce((a, v) => a + Math.log(v), 0) / values.length)
    : undefined;
const mean = (v: number[]) => v.reduce((a, b) => a + b, 0) / v.length;

interface Store {
  get(key: string, fallback: Json): Json;
  set(key: string, value: Json): void;
}

/**
 * Mounts the workspace in `root`; `open(name)` opens a run's report.
 */
export function mountWorkspace(
  root: HTMLElement,
  summaries: Summary[],
  store: Store,
  open: (name: string) => void,
  bindCharts: () => void,
): void {
  const params = new URLSearchParams(location.search);
  // Sweep variants ("2.0[param=value]") belong to the Sweeps view.
  const allConfigs = [...new Set(summaries.flatMap((s) => s.configs))].filter(
    (c) => !c.includes("["),
  );
  const most = (pick: (s: Summary) => string | undefined, fallback: string) => {
    const counts = new Map<string, number>();
    for (const s of summaries) {
      const v = pick(s);
      if (v) {
        counts.set(v, (counts.get(v) ?? 0) + 1);
      }
    }
    return [...counts].sort((a, b) => b[1] - a[1])[0]?.[0] ?? fallback;
  };
  const state: State = {
    scene: params.get("ws") ?? "*",
    split: params.get("split") === "1",
    base: params.get("base") ?? most((s) => s.baseline, allConfigs[0] ?? "1.x"),
    cand: params.get("cand") ?? most((s) => s.candidate, "2.0"),
    pin: params.get("pin") ?? "",
    search: "",
    hardware: store.get("dyno.hardware", "*"),
    hideInvalid: store.get("dyno.hideInvalid", false),
    showSweeps: store.get("dyno.showSweeps", false),
  };
  const hidden = new Set<string>(store.get("dyno.hidden", []));
  const collapsed = new Set<string>(store.get("dyno.collapsed", []));

  root.innerHTML = `<div class="workspace">
  <aside class="runs">
    <input type="search" data-id="search" placeholder="Search notes, tags, commits" aria-label="Search runs">
    <label>Hardware <select data-id="hardware"></select></label>
    <label class="check"><input type="checkbox" data-id="hideInvalid"> Hide runs with invalid results</label>
    <label class="check"><input type="checkbox" data-id="showSweeps"> Include sweep runs</label>
    <div class="run-actions"><button data-id="showAll">Show all</button><button data-id="hideAll">Hide all</button></div>
    <ol data-id="list"></ol>
  </aside>
  <section class="panels">
    <div class="controls">
      <label>Scene <select data-id="scene"></select></label>
      <label class="check"><input type="checkbox" data-id="split"> Split by scene</label>
      <label>Baseline <select data-id="base"></select></label>
      <label>Candidate <select data-id="cand"></select></label>
      <span class="views"><select data-id="views" aria-label="Saved views"></select>
      <input data-id="viewName" placeholder="View name" aria-label="View name"><button data-id="save">Save view</button><button data-id="copy">Copy link</button></span>
    </div>
    <div data-id="sections"></div>
  </section>
  <dialog class="expanded" aria-label="Expanded panel">
    <form method="dialog"><button class="close" aria-label="Close">Close</button></form>
    <div class="expanded-body"></div>
  </dialog>
</div>`;
  const $ = <T extends Element>(id: string) =>
    root.querySelector<T>(`[data-id="${id}"]`)!;

  // ---------------------------------------------------------------- controls
  const sceneSelect = $<HTMLSelectElement>("scene");
  const scenes = new Map<string, string>();
  for (const s of summaries) {
    for (const c of s.scenes) {
      scenes.set(cellKey(c), cellTitle(c));
    }
  }
  sceneSelect.add(new Option("All scenes (geometric mean)", "*"));
  for (const [key, title] of scenes) {
    sceneSelect.add(new Option(title, key));
  }
  sceneSelect.value = scenes.has(state.scene) ? state.scene : "*";
  for (const id of ["base", "cand"] as const) {
    const el = $<HTMLSelectElement>(id);
    for (const c of allConfigs) {
      el.add(new Option(c, c));
    }
    el.value = state[id];
    el.addEventListener("change", () => {
      state[id] = el.value;
      update();
    });
  }
  sceneSelect.addEventListener("change", () => {
    state.scene = sceneSelect.value;
    update();
  });
  const split = $<HTMLInputElement>("split");
  split.checked = state.split;
  split.addEventListener("change", () => {
    state.split = split.checked;
    update();
  });
  const hw = $<HTMLSelectElement>("hardware");
  hw.add(new Option("All", "*"));
  for (const h of new Set(summaries.map((s) => s.hardware))) {
    hw.add(new Option(h, h));
  }
  hw.value = state.hardware;
  hw.addEventListener("change", () => {
    state.hardware = hw.value;
    store.set("dyno.hardware", hw.value);
    update();
  });
  const hideInvalid = $<HTMLInputElement>("hideInvalid");
  hideInvalid.checked = state.hideInvalid;
  hideInvalid.addEventListener("change", () => {
    state.hideInvalid = hideInvalid.checked;
    store.set("dyno.hideInvalid", hideInvalid.checked);
    update();
  });
  const showSweeps = $<HTMLInputElement>("showSweeps");
  showSweeps.checked = state.showSweeps;
  showSweeps.addEventListener("change", () => {
    state.showSweeps = showSweeps.checked;
    store.set("dyno.showSweeps", showSweeps.checked);
    update();
  });
  $<HTMLInputElement>("search").addEventListener("input", (e) => {
    state.search = (e.target as HTMLInputElement).value.toLowerCase();
    drawList();
  });
  $("showAll").addEventListener("click", () => {
    hidden.clear();
    store.set("dyno.hidden", []);
    update();
  });
  $("hideAll").addEventListener("click", () => {
    for (const s of listed()) {
      hidden.add(s.name);
    }
    store.set("dyno.hidden", [...hidden]);
    update();
  });

  // Saved views: everything but the run list's search.
  const views = $<HTMLSelectElement>("views");
  const savedViews = (): Record<string, Partial<State>> =>
    store.get("dyno.views", {});
  const fillViews = () => {
    views.replaceChildren(new Option("Saved views…", ""));
    for (const name of Object.keys(savedViews())) {
      views.add(new Option(name, name));
    }
  };
  fillViews();
  views.addEventListener("change", () => {
    const view = savedViews()[views.value];
    if (view) {
      Object.assign(state, view);
      sceneSelect.value = state.scene;
      split.checked = state.split;
      $<HTMLSelectElement>("base").value = state.base;
      $<HTMLSelectElement>("cand").value = state.cand;
      update();
    }
  });
  $("save").addEventListener("click", () => {
    const name = $<HTMLInputElement>("viewName").value.trim();
    if (!name) {
      return;
    }
    const all = savedViews();
    const view: Partial<State> = { ...state };
    delete view.search;
    all[name] = view;
    store.set("dyno.views", all);
    fillViews();
    views.value = name;
    toast(`View "${name}" saved`);
  });
  $("copy").addEventListener("click", () => {
    void navigator.clipboard
      ?.writeText(location.href)
      .then(() => toast("Link to this view copied"));
  });

  // ---------------------------------------------------------------- runs
  const verdictOf = (s: Summary) =>
    !s.validity
      ? ""
      : s.validity.invalid
        ? "invalid"
        : s.validity.warning
          ? "warning"
          : "valid";
  const listed = () =>
    [...summaries]
      .reverse()
      .filter(
        (s) =>
          (state.hardware === "*" || s.hardware === state.hardware) &&
          (!state.hideInvalid || verdictOf(s) !== "invalid") &&
          (state.showSweeps || !(s as { sweep?: unknown }).sweep),
      );
  const visible = () =>
    summaries.filter(
      (s) =>
        !hidden.has(s.name) &&
        (state.hardware === "*" || s.hardware === state.hardware) &&
        (!state.hideInvalid || verdictOf(s) !== "invalid") &&
        (state.showSweeps || !(s as { sweep?: unknown }).sweep),
    );
  const when = (s: Summary) =>
    new Date(s.date).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  const short = (s: Summary) => `${s.commit.slice(0, 7)}${s.dirty ? "*" : ""}`;

  function drawList(): void {
    const list = $<HTMLOListElement>("list");
    list.replaceChildren();
    for (const s of listed()) {
      const text =
        `${s.note ?? ""} ${s.subject ?? ""} ${s.tags.join(" ")} ${s.commit} ${s.branch ?? ""}`.toLowerCase();
      if (state.search && !text.includes(state.search)) {
        continue;
      }
      const li = document.createElement("li");
      li.className = hidden.has(s.name) ? "off" : "";
      const verdict = verdictOf(s);
      const badge = verdict
        ? `<span class="badge ${verdict}" title="${s.validity!.valid} valid, ${s.validity!.warning} with warnings, ${s.validity!.invalid} invalid runs">${verdict === "valid" ? "✓" : verdict === "warning" ? "!" : "✕"}</span>`
        : "";
      li.innerHTML = `<label class="eye"><input type="checkbox" ${hidden.has(s.name) ? "" : "checked"} aria-label="Show this run"></label>
<div class="run-text"><div><b>${escape(when(s))}</b> <code>${escape(short(s))}</code> ${badge}</div>
<div class="muted">${escape(s.note || s.subject || "")}</div>
${s.tags.length ? `<div class="muted">${s.tags.map(escape).join(", ")}</div>` : ""}</div>
<button class="pin ${state.pin === s.name ? "on" : ""}" title="Pin as the reference run" aria-label="Pin as the reference run">★</button>`;
      li.querySelector("input")!.addEventListener("change", (e) => {
        if ((e.target as HTMLInputElement).checked) {
          hidden.delete(s.name);
        } else {
          hidden.add(s.name);
        }
        store.set("dyno.hidden", [...hidden]);
        update();
      });
      li.querySelector(".pin")!.addEventListener("click", () => {
        state.pin = state.pin === s.name ? "" : s.name;
        update();
      });
      li.querySelector(".run-text")!.addEventListener("click", () =>
        open(s.name),
      );
      list.append(li);
    }
  }

  // ---------------------------------------------------------------- panels
  /** A metric's value (and interval) for one run, configuration, scene. */
  function point(
    s: Summary,
    config: string,
    key: string,
    scene: string,
  ): [number, number, number] | undefined {
    const cells = s.scenes.filter(
      (c) => c.config === config && (scene === "*" || cellKey(c) === scene),
    );
    const m = cells
      .map((c) => c.metrics[key])
      .filter((v) => v && Number.isFinite(v.median));
    if (!m.length) {
      return undefined;
    }
    if (scene !== "*") {
      return [m[0]!.median, m[0]!.low, m[0]!.high];
    }
    // All scenes: the geometric mean over scenes with positive values.
    const pos = m.filter((v) => v!.median > 0 && v!.low > 0);
    if (!pos.length) {
      return [mean(m.map((v) => v!.median)), NaN, NaN];
    }
    return [
      geomean(pos.map((v) => v!.median))!,
      geomean(pos.map((v) => v!.low))!,
      geomean(pos.map((v) => v!.high))!,
    ];
  }

  /** Candidate over baseline for one run: per scene ratios, then geomean. */
  function ratioPoint(
    s: Summary,
    key: string,
    scene: string,
  ): [number, number, number] | undefined {
    const values: Array<[number, number, number]> = [];
    for (const c of s.scenes) {
      if (c.config !== state.cand || (scene !== "*" && cellKey(c) !== scene)) {
        continue;
      }
      const b = s.scenes.find(
        (x) => x.config === state.base && cellKey(x) === cellKey(c),
      );
      const r =
        b && ratio(b.metrics[key]?.values ?? [], c.metrics[key]?.values ?? []);
      if (r?.value && r.low > 0) {
        values.push([r.value, r.low, r.high]);
      }
    }
    if (!values.length) {
      return undefined;
    }
    return [
      geomean(values.map((v) => v[0]))!,
      geomean(values.map((v) => v[1]))!,
      geomean(values.map((v) => v[2]))!,
    ];
  }

  /** Annotations: where a configuration first appears, or hardware changes. */
  function annotations(runs: Summary[]) {
    const marks: Array<{ x: number; label: string; short: string }> = [];
    const seen = new Set<string>();
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
      const render = (r: Summary) =>
        JSON.stringify((r as { render?: unknown }).render ?? null);
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
   * last), once there are five; flags points outside it and runs of seven
   * on one side of the mean (Western Electric rules 1 and 4).
   */
  function control(points: Array<[number, number | null]>) {
    const ys = points.filter((p) => p[1] !== null) as Array<[number, number]>;
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
      reasons.push(`${flags.length} outside the control band`);
    }
    let run = 0;
    let side = 0;
    for (const [x, y] of ys) {
      const s = Math.sign(y - m);
      run = s === side ? run + 1 : 1;
      side = s;
      if (run === 7) {
        flags.push(x);
        reasons.push("7 runs in a row on one side of the mean");
      }
    }
    return { y0: m - 3 * sd, y1: m + 3 * sd, flags, reasons };
  }

  const colorOf = (config: string) =>
    `var(--series-${Math.min(4, allConfigs.indexOf(config) + 1)})`;

  function panel(
    key: string,
    runs: Summary[],
    scene: string,
    headline: boolean,
    title?: string,
    size = { width: 520, height: 170 },
  ): string {
    const info = INFO.get(key);
    if (!info) {
      return "";
    }
    const [, name, unit, scale] = info;
    const xNames = runs.map(
      (s) =>
        `${when(s)} · ${short(s)}${s.note || s.subject ? ` · ${s.note || s.subject}` : ""}`,
    );
    const marks = annotations(runs);
    const pinned = runs.findIndex((s) => s.name === state.pin);
    if (headline) {
      const pts = runs.map((s) => ratioPoint(s, key, scene));
      const color = colorOf(state.cand);
      const series = [
        {
          label: `${state.cand} / ${state.base}`,
          color,
          points: pts.map((p, i) => [i, p ? p[0] : null]),
          band: pts.flatMap((p, i) => (p ? [[i, p[1], p[2]]] : [])),
        },
      ];
      if (!pts.some(Boolean)) {
        return "";
      }
      return lineChart({
        title: title ?? `${name}: ${state.cand} / ${state.base}`,
        xLabel: "run",
        unit: "×",
        xNames,
        series,
        refs: [
          { y: 1, label: "×1" },
          ...budgetsFor(key, state.cand, scene)
            .filter((b) => b.maxRatio !== undefined)
            .map((b) => ({
              y: b.maxRatio!,
              label: `budget ×${b.maxRatio!.toFixed(2)}`,
              color: "var(--critical)",
              dash: "2 3",
            })),
        ],
        marks,
        yMin: Infinity,
        ...size,
      });
    }
    const configs = allConfigs.filter((c) =>
      runs.some((s) => s.scenes.some((x) => x.config === c && x.metrics[key])),
    );
    const series = configs.map((config) => {
      const pts = runs.map((s) => point(s, config, key, scene));
      return {
        label: config,
        color: colorOf(config),
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
      return "";
    }
    const focus = series.find((s) => s.label === state.cand) ?? series[0]!;
    const band = control(focus.points);
    const notes: string[] = [];
    if (band) {
      focus.flags = band.flags;
      notes.push(...new Set(band.reasons));
    }
    const budgetRefs = budgetsFor(key, state.cand, scene)
      .filter((b) => b.max !== undefined)
      .map((b) => ({
        y: b.max! / scale,
        label: `budget ${b.max! / scale}${unit ? ` ${unit}` : ""}`,
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
    return lineChart({
      title: title ?? name,
      subtitle: `${unit ? `${unit} · ` : ""}${band ? `control band: ${focus.label}` : "control band after 6 runs"}${pinned >= 0 ? " · dashed: pinned run" : ""}${notes.length ? ` · ▲ ${notes.join("; ")}` : ""}`,
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
  }

  function drawPanels(): void {
    const runs = visible();
    const out = $<HTMLElement>("sections");
    if (!runs.length) {
      out.innerHTML = `<div class="empty">No runs shown: tick runs in the list.</div>`;
      return;
    }
    const sceneKeys =
      state.split && state.scene === "*" ? [...scenes.keys()] : [state.scene];
    let html = "";
    for (const [id, title, keys] of SECTIONS) {
      let body = "";
      for (const key of keys) {
        for (const scene of sceneKeys) {
          const chart = panel(
            key,
            runs,
            scene,
            id === "headline",
            sceneKeys.length > 1
              ? `${INFO.get(key)?.[1] ?? key}: ${scenes.get(scene)}`
              : undefined,
          );
          body += chart
            ? `<div class="panel" data-key="${escape(key)}" data-scene="${escape(scene)}" data-headline="${id === "headline"}">${chart}<button class="expand" aria-label="Expand this panel" title="Expand">⤢</button></div>`
            : "";
        }
      }
      const about =
        id === "headline"
          ? `<p class="section-note">${escape(state.cand)} over ${escape(state.base)} per run (geometric mean across scenes) with its interval; below ×1 is better. Red dotted lines are budgets.</p>`
          : id === "conditions"
            ? `<p class="section-note">The machine's state during each configuration's runs: these should match between engines.</p>`
            : "";
      html += `<details class="section" data-section="${id}" ${collapsed.has(id) ? "" : "open"}><summary>${escape(title)}</summary>${about}<div class="grid">${body || `<div class="empty">No data.</div>`}</div></details>`;
    }
    out.innerHTML = html;
    for (const b of out.querySelectorAll<HTMLButtonElement>(".panel .expand")) {
      b.addEventListener("click", (e) => {
        e.stopPropagation();
        const host = b.closest<HTMLElement>(".panel")!;
        const dialog =
          root.querySelector<HTMLDialogElement>("dialog.expanded")!;
        dialog.querySelector(".expanded-body")!.innerHTML = panel(
          host.dataset.key!,
          visible(),
          host.dataset.scene!,
          host.dataset.headline === "true",
          undefined,
          { width: 1200, height: 420 },
        );
        dialog.showModal();
        bindCharts();
      });
    }
    for (const d of out.querySelectorAll<HTMLDetailsElement>(
      "details.section",
    )) {
      d.addEventListener("toggle", () => {
        if (d.open) {
          collapsed.delete(d.dataset.section!);
        } else {
          collapsed.add(d.dataset.section!);
        }
        store.set("dyno.collapsed", [...collapsed]);
      });
    }
    bindCharts();
  }
  // Clicking a point opens that run.
  root.addEventListener("chart-click", (e) => {
    const run = visible()[(e as CustomEvent).detail.x];
    if (run) {
      open(run.name);
    }
  });

  function update(): void {
    const url = new URL(location.href);
    const set = (k: string, v: string, fallback: string) =>
      v === fallback ? url.searchParams.delete(k) : url.searchParams.set(k, v);
    set("ws", state.scene, "*");
    set("split", state.split ? "1" : "", "");
    url.searchParams.set("base", state.base);
    url.searchParams.set("cand", state.cand);
    set("pin", state.pin, "");
    history.replaceState(null, "", url);
    drawList();
    drawPanels();
  }
  update();
}
