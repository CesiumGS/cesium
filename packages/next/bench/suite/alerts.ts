import {
  type Alert,
  ALERT_METRICS,
  ALERT_STATES,
  detectAlerts,
} from "./changepoints.mjs";
import { CONDITION_METRICS, METRICS } from "./report.mjs";
import { escape, lineChart } from "./charts.mjs";
import { cellKey, type Summary } from "./workspace.ts";
import { toast } from "./toast.ts";
import publicCatalog from "./catalog/public.json";
import type { Dataset, Scene } from "./schema.ts";

const catalog = publicCatalog as unknown as {
  datasets: Dataset[];
  scenes: Scene[];
};

/** A scene and scenario's attributes, for "what differs". */
function attributes(key: string): string[] {
  const [id, scenario = "cold-orbit"] = key.split("|");
  const scene = catalog.scenes.find((s) => s.id === id);
  if (!scene) {
    return [`scenario: ${scenario}`];
  }
  const kinds = scene.layers.map(
    (l) => catalog.datasets.find((d) => d.id === l.dataset)?.kind ?? "?",
  );
  return [
    `scenario: ${scenario}`,
    `group ${scene.group}`,
    `globe: ${typeof scene.globe === "object" ? "terrain" : scene.globe}`,
    scene.imagery ? "with imagery" : "no imagery",
    ...new Set(kinds.map((k) => `content: ${k}`)),
    scene.layers.length > 1 ? "several layers" : "one layer",
  ];
}

/**
 * What the affected scenes share (Honeycomb BubbleUp): attributes much
 * more common among them than among every scene measured.
 */
function whatDiffers(affected: string[], all: string[]): string[] {
  if (affected.length < 2 || all.length <= affected.length) {
    return [];
  }
  const share = (keys: string[], attr: string) =>
    keys.filter((k) => attributes(k).includes(attr)).length / keys.length;
  const attrs = new Set(affected.flatMap(attributes));
  return [...attrs]
    .map((a) => ({ a, inside: share(affected, a), outside: share(all, a) }))
    .filter((x) => x.inside - x.outside >= 0.3)
    .sort((x, y) => y.inside - y.outside - (x.inside - x.outside))
    .slice(0, 4)
    .map(
      (x) =>
        `${x.a}: ${Math.round(x.inside * 100)}% of affected scenes vs ${Math.round(x.outside * 100)}% of all`,
    );
}

/**
 * Dyno's alerts (plan §16.9, Detect), after Perfherder's sheriffing: every
 * significant change point across runs (changepoints.mjs) as an alert with
 * its commit range, the series around it, and a triage state (new,
 * acknowledged, expected, invalid, fixed) with an owner and a note, saved
 * beside the results. New regressions come first.
 */

interface Triage {
  status: string;
  owner?: string;
  note?: string;
  updated?: string;
}

const INFO = new Map(
  [...METRICS, ...CONDITION_METRICS].map((m) => [m[0], m] as const),
);

export async function mountAlerts(
  root: HTMLElement,
  summaries: Summary[],
  actions: {
    openReport: (run: string) => void;
    openWorkspace: (scene: string, config: string) => void;
    compareRuns: (a: string, b: string, config: string) => void;
    bindCharts: () => void;
  },
): Promise<void> {
  root.innerHTML = `<p class="lede">Computing change points…</p>`;
  let triage: Record<string, Triage> = {};
  try {
    const res = await fetch("/bench-results/triage.json");
    if (res.ok) {
      triage = await res.json();
    }
  } catch {
    // Nothing triaged yet.
  }
  // Let the message paint before the computation.
  await new Promise((r) => setTimeout(r, 0));
  const alerts = detectAlerts(summaries, ALERT_METRICS);
  const statusOf = (a: Alert) => triage[a.id]?.status ?? "new";
  const shown = new Set(["new", "acknowledged"]);
  let kind = "regression";

  root.innerHTML = `<div class="alerts">
  <p class="lede">Found with E-Divisive means and a permutation test (p &lt; 0.05) per scene, configuration and hardware, grouped per change. <code>cli.mjs alerts --fail-on-new</code> fails a nightly job on untriaged regressions.</p>
  <div class="controls">
    <div class="segmented" role="radiogroup" aria-label="Kind" data-id="kind">
      <button role="radio" data-kind="regression">Regressions</button>
      <button role="radio" data-kind="improvement">Improvements</button>
      <button role="radio" data-kind="all">All</button>
    </div>
    <span class="chips" data-id="states"></span>
    <span class="muted" data-id="count"></span>
  </div>
  <div data-id="list"></div>
</div>`;
  const $ = <T extends Element>(id: string) =>
    root.querySelector<T>(`[data-id="${id}"]`)!;
  for (const state of ALERT_STATES) {
    const chip = document.createElement("button");
    chip.className = "chip";
    chip.textContent = state;
    chip.setAttribute("aria-pressed", String(shown.has(state)));
    chip.addEventListener("click", () => {
      if (shown.has(state)) {
        shown.delete(state);
      } else {
        shown.add(state);
      }
      chip.setAttribute("aria-pressed", String(shown.has(state)));
      draw();
    });
    $("states").append(chip);
  }
  const setKind = (next: string) => {
    kind = next;
    draw();
  };
  for (const b of root.querySelectorAll<HTMLButtonElement>("[data-kind]")) {
    b.addEventListener("click", () => setKind(b.dataset.kind!));
  }

  async function save(): Promise<boolean> {
    const res = await fetch("/bench-results/triage.json", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(triage),
    });
    return res.ok;
  }

  /** The series around an alert, with its change point marked. */
  function chart(a: Alert): string {
    const runs = summaries.filter((s) => s.hardware === a.hardware);
    const points: Array<[number, number | null]> = [];
    const names: string[] = [];
    let mark = -1;
    for (const s of runs) {
      const cell = s.scenes.find(
        (c) => cellKey(c) === a.scene && c.config === a.config,
      );
      const m = cell?.metrics[a.metric];
      if (!m) {
        continue;
      }
      if (s.name === a.range.to.run) {
        mark = names.length;
      }
      points.push([names.length, m.median]);
      names.push(
        `${new Date(s.date).toLocaleDateString()} · ${s.commit.slice(0, 7)}${s.note ? ` · ${s.note}` : ""}`,
      );
    }
    const [, , unit, scale] = INFO.get(a.metric) ?? [a.metric, a.metric, "", 1];
    return lineChart({
      title: "Series",
      xLabel: "run",
      unit,
      xNames: names,
      series: [
        {
          label: a.config,
          color: "var(--ink-2)",
          points: points.map(([x, y]) => [x, y === null ? null : y / scale]),
        },
      ],
      refs: [
        { y: a.before.median / scale, label: "before", dash: "4 3" },
        { y: a.after.median / scale, label: "after", dash: "4 3" },
      ],
      marks:
        mark >= 0 ? [{ x: mark, label: "change point", short: "change" }] : [],
      yMin: Infinity,
      width: 900,
      height: 170,
    });
  }

  /**
   * Alerts grouped like Perfherder's alert summaries: one change (metric,
   * direction, configuration, hardware, commit range) across the scenes it
   * shows in; triage applies to the whole group.
   */
  interface Group {
    key: string;
    alerts: Alert[];
    lead: Alert;
  }
  function groups(list: Alert[]): Group[] {
    const map = new Map<string, Alert[]>();
    for (const a of list) {
      const key = `${a.metric}|${a.kind}|${a.config}|${a.hardware}|${a.range.from.commit}|${a.range.to.commit}`;
      map.set(key, [...(map.get(key) ?? []), a]);
    }
    return [...map].map(([key, alerts]) => ({
      key,
      alerts: alerts.sort(
        (x, y) => Math.abs(y.change - 1) - Math.abs(x.change - 1),
      ),
      lead: alerts[0]!,
    }));
  }
  const groupStatus = (g: Group) =>
    ALERT_STATES[
      Math.min(...g.alerts.map((a) => ALERT_STATES.indexOf(statusOf(a))))
    ]!;

  function draw(): void {
    for (const b of root.querySelectorAll<HTMLButtonElement>("[data-kind]")) {
      b.setAttribute("aria-checked", String(b.dataset.kind === kind));
    }
    const list = groups(alerts.filter((a) => kind === "all" || a.kind === kind))
      .filter((g) => shown.has(groupStatus(g)))
      .sort(
        (a, b) =>
          ALERT_STATES.indexOf(groupStatus(a)) -
            ALERT_STATES.indexOf(groupStatus(b)) ||
          b.lead.range.to.date.localeCompare(a.lead.range.to.date),
      );
    $("count").textContent =
      `${list.length} changes (${list.reduce((n, g) => n + g.alerts.length, 0)} of ${alerts.length} alerts)`;
    const out = $<HTMLElement>("list");
    if (!alerts.length) {
      out.innerHTML = `<div class="empty">No change points yet. Alerts need at least six runs of a scene on the same hardware.</div>`;
      return;
    }
    if (!list.length) {
      out.innerHTML = `<div class="empty">Nothing in this view.</div>`;
      return;
    }
    out.replaceChildren();
    for (const g of list) {
      const a = g.lead;
      const t = triage[a.id] ?? { status: groupStatus(g) };
      const [, name] = INFO.get(a.metric) ?? [a.metric, a.metric];
      const pctOf = (x: Alert) =>
        `${x.change > 1 ? "+" : ""}${((x.change - 1) * 100).toFixed(1)}%`;
      const changes = g.alerts.map((x) => x.change);
      const lo = Math.min(...changes);
      const hi = Math.max(...changes);
      const span =
        g.alerts.length > 1
          ? `${pctOf({ ...a, change: lo })} to ${pctOf({ ...a, change: hi })}`
          : pctOf(a);
      const card = document.createElement("article");
      card.className = `alert ${a.kind}`;
      card.innerHTML = `<header>
  <span class="kind">${a.kind === "regression" ? "▲ Regression" : "▼ Improvement"}</span>
  <b>${escape(name)} ${span}</b> <span>${escape(a.config)} · ${g.alerts.length === 1 ? escape(a.title) : `${g.alerts.length} scenes`}</span>
  <span class="muted">${escape(a.hardware)} · <span class="status-tag">${escape(groupStatus(g))}</span></span>
</header>
<div class="range">Between <code>${escape(a.range.from.commit.slice(0, 7))}</code> ${escape(a.range.from.subject ?? "")} <span class="muted">(${escape(new Date(a.range.from.date).toLocaleString())})</span>
and <code>${escape(a.range.to.commit.slice(0, 7))}</code> ${escape(a.range.to.subject ?? "")} <span class="muted">(${escape(new Date(a.range.to.date).toLocaleString())})</span></div>
${(() => {
  const all = [
    ...new Set(
      summaries
        .filter((s) => s.hardware === a.hardware)
        .flatMap((s) =>
          s.scenes.filter((c) => c.config === a.config).map(cellKey),
        ),
    ),
  ];
  const differs = whatDiffers(
    g.alerts.map((x) => x.scene),
    all,
  );
  return differs.length
    ? `<div class="differs"><b>What the affected scenes share:</b> ${differs.map(escape).join(" · ")}</div>`
    : "";
})()}
${g.alerts.length > 1 ? `<details class="scenes"><summary>Scenes (largest change first)</summary><table class="twin">${g.alerts.map((x) => `<tr><td>${escape(x.title)}</td><td>${pctOf(x)}</td><td class="muted">p ${x.p.toFixed(3)} · ${x.before.runs} runs before, ${x.after.runs} after</td></tr>`).join("")}</table></details>` : `<div class="muted">p ${a.p.toFixed(3)} · ${a.before.runs} runs before, ${a.after.runs} after</div>`}
<div class="body"><div class="chart">${chart(a)}${g.alerts.length > 1 ? `<div class="muted">Series of ${escape(a.title)}, the largest change.</div>` : ""}</div>
<form class="triage">
  <label>Status <select name="status">${ALERT_STATES.map((s) => `<option ${s === t.status ? "selected" : ""}>${s}</option>`).join("")}</select></label>
  <label>Owner <input name="owner" value="${escape(t.owner ?? "")}" autocomplete="off"></label>
  <label>Note <textarea name="note" rows="2">${escape(t.note ?? "")}</textarea></label>
  <div class="row"><button type="submit">Save</button><span class="saved muted" aria-live="polite"></span></div>
  <div class="row links">
    <button type="button" data-act="report">Report after the change</button>
    <button type="button" data-act="compare">Compare the two runs</button>
    <button type="button" data-act="workspace">Open in the workspace</button>
  </div>
</form></div>`;
      const form = card.querySelector("form")!;
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const data = new FormData(form);
        const entry = {
          status: String(data.get("status")),
          owner: String(data.get("owner") ?? "").trim(),
          note: String(data.get("note") ?? "").trim(),
          updated: new Date().toISOString(),
        };
        for (const x of g.alerts) {
          triage[x.id] = entry;
        }
        const ok = await save();
        card.querySelector(".saved")!.textContent = ok ? "Saved" : "Not saved";
        toast(
          ok
            ? `Alert ${entry.status}${g.alerts.length > 1 ? ` (${g.alerts.length} scenes)` : ""}`
            : "Could not save: is the dev server running?",
          ok ? "good" : "bad",
        );
      });
      card
        .querySelector('[data-act="report"]')!
        .addEventListener("click", () => actions.openReport(a.range.to.run));
      card
        .querySelector('[data-act="compare"]')!
        .addEventListener("click", () =>
          actions.compareRuns(a.range.from.run, a.range.to.run, a.config),
        );
      card
        .querySelector('[data-act="workspace"]')!
        .addEventListener("click", () =>
          actions.openWorkspace(g.alerts.length > 1 ? "*" : a.scene, a.config),
        );
      out.append(card);
    }
    actions.bindCharts();
  }
  draw();
}
