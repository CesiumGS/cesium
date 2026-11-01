import publicCatalog from "./catalog/public.json";
import { type Alert, ALERT_METRICS, detectAlerts } from "./changepoints.mjs";
import { METRICS } from "./report.mjs";
import { escape, lineChart } from "./charts.mjs";
import { cellKey, cellTitle, type Cell, type Summary } from "./workspace.ts";
import type { Dataset, Scene } from "./schema.ts";

/**
 * Dyno's scene pages (plan §16.9, Communicate), after Strava segments:
 * each catalog scene (and scenario) with its content and licenses, its
 * history per configuration, each configuration's best result and when
 * it got there, the filmstrip over time, and the changes that moved it.
 */

/* eslint-disable @typescript-eslint/no-explicit-any -- results are JSON */
type Json = any;

const catalog = publicCatalog as unknown as {
  datasets: Dataset[];
  scenes: Scene[];
};
const INFO = new Map(METRICS.map((m) => [m[0], m] as const));
const BEST = ["cpuP50", "settleMs", "frameP95", "bytes", "heapBytes"];

interface Actions {
  openReport: (run: string) => void;
  openExplorer: (scene: string) => void;
  openWorkspace: (scene: string) => void;
  full: (run: string) => Promise<Json>;
  bindCharts: () => void;
}

const fmt = (v: number, scale: number) => {
  const x = v / scale;
  return x >= 100 ? x.toFixed(0) : x >= 10 ? x.toFixed(1) : x.toFixed(2);
};

export function mountScenes(
  root: HTMLElement,
  summaries: Summary[],
  actions: Actions,
  selected?: string,
): void {
  // Every scene and scenario that has run, plus catalog scenes that haven't.
  const keys = new Map<
    string,
    { title: string; scene: string; cells: Array<{ s: Summary; c: Cell }> }
  >();
  for (const s of summaries) {
    for (const c of s.scenes) {
      const key = cellKey(c);
      if (!keys.has(key)) {
        keys.set(key, { title: cellTitle(c), scene: c.scene, cells: [] });
      }
      keys.get(key)!.cells.push({ s, c });
    }
  }
  for (const scene of catalog.scenes) {
    if (!keys.has(scene.id)) {
      keys.set(scene.id, { title: scene.title, scene: scene.id, cells: [] });
    }
  }

  if (!selected || !keys.has(selected)) {
    list();
  } else {
    void page(selected);
  }

  function list(): void {
    const cards = [...keys].map(([key, entry]) => {
      const scene = catalog.scenes.find((s) => s.id === entry.scene);
      const latest = new Map<string, { s: Summary; c: Cell }>();
      for (const x of entry.cells) {
        latest.set(x.c.config, x);
      }
      const rows = [...latest]
        .map(([config, { c }]) => {
          const m = c.metrics.cpuP50;
          const settle = c.metrics.settleMs;
          return `<tr><td>${escape(config)}</td><td>${m ? `${fmt(m.median, 1)} ms` : "–"}</td><td>${settle ? `${fmt(settle.median, 1000)} s` : "–"}</td></tr>`;
        })
        .join("");
      return `<button class="scene-card" data-key="${escape(key)}">
  <span class="title">${escape(entry.title)}</span>
  <span class="muted">${scene ? `group ${escape(scene.group)} · ` : ""}${new Set(entry.cells.map((x) => x.s.name)).size} runs</span>
  ${rows ? `<table class="twin"><tr><th></th><th>CPU / frame</th><th>settled</th></tr>${rows}</table>` : `<span class="muted">Not run yet.</span>`}
</button>`;
    });
    root.innerHTML = `<p class="lede">Every scene and scenario, with the latest result per configuration (median CPU per frame and time to settle). Open one for its history, best results, filmstrip over time and the changes that moved it.</p><div class="scene-grid">${cards.join("")}</div>`;
    for (const b of root.querySelectorAll<HTMLButtonElement>(".scene-card")) {
      b.addEventListener("click", () => {
        const url = new URL(location.href);
        url.searchParams.set("sp", b.dataset.key!);
        history.replaceState(null, "", url);
        void page(b.dataset.key!);
      });
    }
  }

  async function page(key: string): Promise<void> {
    const entry = keys.get(key)!;
    const scene = catalog.scenes.find((s) => s.id === entry.scene);
    const datasets = scene
      ? [
          ...(typeof scene.globe === "object" ? [scene.globe.terrain] : []),
          ...(scene.imagery ? [scene.imagery] : []),
          ...scene.layers.map((l) => l.dataset),
        ]
          .map((id) => catalog.datasets.find((d) => d.id === id))
          .filter((d): d is Dataset => !!d)
      : [];
    const configs = [...new Set(entry.cells.map((x) => x.c.config))];
    const runs = [...new Set(entry.cells.map((x) => x.s))];
    const colorOf = (c: string) =>
      `var(--series-${Math.min(4, configs.indexOf(c) + 1)})`;

    // Best results per configuration (lowest median), with when.
    const best = BEST.map((metric) => {
      const [, name, unit, scale] = INFO.get(metric)!;
      const cells = configs.map((config) => {
        let top: { v: number; s: Summary } | undefined;
        for (const x of entry.cells) {
          const m = x.c.metrics[metric];
          if (x.c.config === config && m && (!top || m.median < top.v)) {
            top = { v: m.median, s: x.s };
          }
        }
        return top
          ? `<td>${fmt(top.v, scale)}${unit ? ` ${unit}` : ""}<span class="muted"> · ${escape(new Date(top.s.date).toLocaleDateString())} <code>${escape(top.s.commit.slice(0, 7))}</code></span></td>`
          : "<td>–</td>";
      });
      return `<tr><th>${escape(name)}</th>${cells.join("")}</tr>`;
    }).join("");

    // History per metric, one line per configuration.
    const xNames = runs.map(
      (s) =>
        `${new Date(s.date).toLocaleDateString()} · ${s.commit.slice(0, 7)}${s.note || s.subject ? ` · ${s.note || s.subject}` : ""}`,
    );
    const historyCharts = BEST.map((metric) => {
      const [, name, unit, scale] = INFO.get(metric)!;
      return lineChart({
        title: name,
        xLabel: "run",
        unit,
        xNames,
        series: configs.map((config) => ({
          label: config,
          color: colorOf(config),
          points: runs.map((s, i) => {
            const c = s.scenes.find(
              (x) => cellKey(x) === key && x.config === config,
            );
            const m = c?.metrics[metric];
            return [i, m ? m.median / scale : null];
          }),
          band: runs.flatMap((s, i) => {
            const m = s.scenes.find(
              (x) => cellKey(x) === key && x.config === config,
            )?.metrics[metric];
            return m && Number.isFinite(m.low)
              ? [[i, m.low / scale, m.high / scale]]
              : [];
          }),
        })),
        width: 520,
        height: 160,
      });
    }).join("");

    // The changes that moved this scene.
    const moved = detectAlerts(
      summaries.filter((s) => runs.includes(s)),
      ALERT_METRICS,
    ).filter((a: Alert) => a.scene === key);

    root.innerHTML = `<div class="scene-page">
  <p><button data-act="back">← All scenes</button></p>
  <h2>${escape(entry.title)}</h2>
  ${scene ? `<p class="lede">Group ${escape(scene.group)} · globe: ${escape(typeof scene.globe === "object" ? "terrain" : scene.globe)} · camera: ${escape(scene.camera.kind)}${scene.render ? ` · render overrides <code>${escape(JSON.stringify(scene.render))}</code>` : ""}</p>` : ""}
  <div class="row-actions"><button data-act="explore">Open in the explorer</button><button data-act="workspace">Open in the workspace</button></div>
  ${datasets.length ? `<h3>Content</h3><table class="kv">${datasets.map((d) => `<tr><th>${escape(d.title)}</th><td>${escape(d.kind)} · ${escape(d.license.name)} (${escape(d.license.status)})</td></tr>`).join("")}</table>` : ""}
  <h3>Best results</h3>
  ${configs.length ? `<table class="metrics best"><tr><th></th>${configs.map((c) => `<th>${escape(c)}</th>`).join("")}</tr>${best}</table>` : `<p class="muted">Not run yet.</p>`}
  <h3>History</h3>
  <div class="grid">${historyCharts}</div>
  <h3>Changes that moved it</h3>
  ${moved.length ? `<ul>${moved.map((a: Alert) => `<li>${a.kind === "regression" ? "▲" : "▼"} ${escape(INFO.get(a.metric)?.[1] ?? a.metric)} ${a.change > 1 ? "+" : ""}${((a.change - 1) * 100).toFixed(1)}% · ${escape(a.config)} · between <code>${escape(a.range.from.commit.slice(0, 7))}</code> and <code>${escape(a.range.to.commit.slice(0, 7))}</code> ${escape(a.range.to.subject ?? "")}</li>`).join("")}</ul>` : `<p class="muted">No change points (they need six runs on the same hardware).</p>`}
  <h3>Filmstrip over time</h3>
  <div data-id="film" class="film"><p class="muted">Loading…</p></div>
</div>`;
    root.querySelector('[data-act="back"]')!.addEventListener("click", () => {
      const url = new URL(location.href);
      url.searchParams.delete("sp");
      history.replaceState(null, "", url);
      list();
    });
    root
      .querySelector('[data-act="explore"]')!
      .addEventListener("click", () => actions.openExplorer(entry.scene));
    root
      .querySelector('[data-act="workspace"]')!
      .addEventListener("click", () => actions.openWorkspace(key));
    actions.bindCharts();

    // Filmstrip over time: each run's settled view after the orbit, per
    // configuration (runs that captured one), newest first.
    const film = root.querySelector<HTMLElement>('[data-id="film"]')!;
    const frames: string[] = [];
    for (const s of [...runs].reverse().slice(0, 12)) {
      let results: Json;
      try {
        results = await actions.full(s.name);
      } catch {
        continue;
      }
      const scenario = key.includes("|") ? key.split("|")[1] : "cold-orbit";
      const strip = (results.filmstrips ?? []).find(
        (f: Json) =>
          f.scene === entry.scene &&
          (f.scenario ?? "cold-orbit") === scenario &&
          f.moment === "end",
      );
      if (!strip || !results.assets) {
        continue;
      }
      const cells = Object.entries(strip.images as Record<string, string>)
        .map(
          ([config, file]) =>
            `<figure><img loading="lazy" src="${escape(results.assets + file)}" alt="${escape(`${config}, ${s.date}`)}"><figcaption>${escape(config)}${strip.flip?.[config] ? ` · FLIP ${strip.flip[config].mean.toFixed(3)}` : ""}</figcaption></figure>`,
        )
        .join("");
      frames.push(
        `<div class="film-run"><button class="link" data-run="${escape(s.name)}">${escape(new Date(s.date).toLocaleString())} · <code>${escape(s.commit.slice(0, 7))}</code></button><div class="film-frames">${cells}</div></div>`,
      );
    }
    film.innerHTML = frames.length
      ? frames.join("")
      : `<p class="muted">No captured frames yet (runs since r33 capture them).</p>`;
    for (const b of film.querySelectorAll<HTMLButtonElement>("[data-run]")) {
      b.addEventListener("click", () => actions.openReport(b.dataset.run!));
    }
  }
}
