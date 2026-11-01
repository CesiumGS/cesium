import { ArrowLeftIcon } from "@radix-ui/react-icons";
import { Button, Flex, Link as RadixLink, Table } from "@radix-ui/themes";
import { getRouteApi, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ALERT_METRICS, detectAlerts } from "../changepoints.mjs";
import { lineChart } from "../charts.mjs";
import {
  catalog,
  type Cell,
  cellKey,
  cellTitle,
  full,
  type Json,
  metricInfo,
  type Summary,
} from "../data.ts";
import type { Dataset } from "../schema.ts";
import { Chart, Empty, Lede, useRuns } from "./common.tsx";
import "./scenes.css";

/**
 * Dyno's scene pages (plan §16.9, Communicate), after Strava segments:
 * each catalog scene (and scenario) with its content and licenses, its
 * history per configuration, each configuration's best result and when
 * it got there, the filmstrip over time, and the changes that moved it.
 */

const BEST = ["cpuP50", "settleMs", "frameP95", "bytes", "heapBytes"];

interface Entry {
  title: string;
  scene: string;
  cells: Array<{ s: Summary; c: Cell }>;
}

const fmt = (v: number, scale: number) => {
  const x = v / scale;
  return x >= 100 ? x.toFixed(0) : x >= 10 ? x.toFixed(1) : x.toFixed(2);
};
const day = (s: Summary) => new Date(s.date).toLocaleDateString();

export function Scenes() {
  const { summaries } = useRuns();
  const selected = getRouteApi("/scenes").useSearch().scene;

  // Every scene and scenario that has run, plus catalog scenes that haven't.
  const keys = useMemo(() => {
    const map = new Map<string, Entry>();
    for (const s of summaries) {
      for (const c of s.scenes) {
        const key = cellKey(c);
        if (!map.has(key)) {
          map.set(key, { title: cellTitle(c), scene: c.scene, cells: [] });
        }
        map.get(key)!.cells.push({ s, c });
      }
    }
    for (const scene of catalog.scenes) {
      if (!map.has(scene.id)) {
        map.set(scene.id, { title: scene.title, scene: scene.id, cells: [] });
      }
    }
    return map;
  }, [summaries]);

  const entry = selected ? keys.get(selected) : undefined;
  return entry && selected ? (
    <ScenePage key={selected} sceneKey={selected} entry={entry} />
  ) : (
    <SceneList keys={keys} runs={summaries.length} />
  );
}

function SceneList({ keys, runs }: { keys: Map<string, Entry>; runs: number }) {
  return (
    <>
      <Lede>
        Every scene and scenario, with the latest result per configuration
        (median CPU per frame and time to settle). Open one for its history,
        best results, filmstrip over time and the changes that moved it.
      </Lede>
      {!runs && (
        <Empty title="No runs yet.">
          Run the suite to fill these in:{" "}
          <code>node packages/next/bench/suite/cli.mjs run</code>
        </Empty>
      )}
      <div className="scene-grid">
        {[...keys].map(([key, entry]) => (
          <SceneCard key={key} sceneKey={key} entry={entry} />
        ))}
      </div>
    </>
  );
}

function SceneCard({ sceneKey, entry }: { sceneKey: string; entry: Entry }) {
  const scene = catalog.scenes.find((s) => s.id === entry.scene);
  const latest = new Map<string, Cell>();
  for (const x of entry.cells) {
    latest.set(x.c.config, x.c);
  }
  const runs = new Set(entry.cells.map((x) => x.s.name)).size;
  return (
    <Link to="/scenes" search={{ scene: sceneKey }} className="scene-card">
      <span className="title">{entry.title}</span>
      <span className="muted">
        {scene ? `group ${scene.group} · ` : ""}
        {runs} runs
      </span>
      {latest.size ? (
        <Table.Root size="1" variant="ghost" className="scene-card-table">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeaderCell />
              <Table.ColumnHeaderCell>CPU / frame</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>settled</Table.ColumnHeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {[...latest].map(([config, c]) => {
              const cpu = c.metrics.cpuP50;
              const settle = c.metrics.settleMs;
              return (
                <Table.Row key={config}>
                  <Table.RowHeaderCell>{config}</Table.RowHeaderCell>
                  <Table.Cell>
                    {cpu ? `${fmt(cpu.median, 1)} ms` : "–"}
                  </Table.Cell>
                  <Table.Cell>
                    {settle ? `${fmt(settle.median, 1000)} s` : "–"}
                  </Table.Cell>
                </Table.Row>
              );
            })}
          </Table.Body>
        </Table.Root>
      ) : (
        <span className="muted">Not run yet.</span>
      )}
    </Link>
  );
}

/** One run's settled frames for the filmstrip, per configuration. */
interface FilmRun {
  run: Summary;
  frames: Array<{ config: string; src: string; flip?: number }>;
}

function ScenePage({
  sceneKey: key,
  entry,
}: {
  sceneKey: string;
  entry: Entry;
}) {
  const { summaries } = useRuns();
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
  const configs = useMemo(
    () => [...new Set(entry.cells.map((x) => x.c.config))],
    [entry],
  );
  const runs = useMemo(
    () => [...new Set(entry.cells.map((x) => x.s))],
    [entry],
  );

  // Best results per configuration (lowest median), with when.
  const best = BEST.map((metric) => {
    const [, name, unit, scale] = metricInfo(metric);
    const tops = configs.map((config) => {
      let top: { v: number; s: Summary } | undefined;
      for (const x of entry.cells) {
        const m = x.c.metrics[metric];
        if (x.c.config === config && m && (!top || m.median < top.v)) {
          top = { v: m.median, s: x.s };
        }
      }
      return top;
    });
    return { metric, name, unit, scale, tops };
  });

  // History per metric, one line per configuration.
  const charts = useMemo(() => {
    const xNames = runs.map(
      (s) =>
        `${day(s)} · ${s.commit.slice(0, 7)}${s.note || s.subject ? ` · ${s.note || s.subject}` : ""}`,
    );
    const colorOf = (c: string) =>
      `var(--series-${Math.min(4, configs.indexOf(c) + 1)})`;
    return BEST.map((metric) => {
      const [, name, unit, scale] = metricInfo(metric);
      const metricOf = (s: Summary, config: string) =>
        s.scenes.find((x) => cellKey(x) === key && x.config === config)
          ?.metrics[metric];
      return {
        metric,
        html: lineChart({
          title: name,
          xLabel: "run",
          unit,
          xNames,
          series: configs.map((config) => ({
            label: config,
            color: colorOf(config),
            points: runs.map((s, i) => {
              const m = metricOf(s, config);
              return [i, m ? m.median / scale : null];
            }),
            band: runs.flatMap((s, i) => {
              const m = metricOf(s, config);
              return m && Number.isFinite(m.low)
                ? [[i, m.low / scale, m.high / scale]]
                : [];
            }),
          })),
          width: 520,
          height: 160,
        }),
      };
    });
  }, [key, runs, configs]);

  // The changes that moved this scene.
  const moved = useMemo(
    () =>
      detectAlerts(
        summaries.filter((s) => runs.includes(s)),
        ALERT_METRICS,
      ).filter((a) => a.scene === key),
    [summaries, runs, key],
  );

  // Filmstrip over time: each run's settled view after the orbit, per
  // configuration (runs that captured one), newest first.
  const [film, setFilm] = useState<FilmRun[]>();
  useEffect(() => {
    let cancelled = false;
    const scenario = key.includes("|") ? key.split("|")[1] : "cold-orbit";
    void Promise.all(
      [...runs]
        .reverse()
        .slice(0, 12)
        .map(async (s): Promise<FilmRun | undefined> => {
          let results: Json;
          try {
            results = await full(s.name);
          } catch {
            return undefined;
          }
          const strip = (results.filmstrips ?? []).find(
            (f: Json) =>
              f.scene === entry.scene &&
              (f.scenario ?? "cold-orbit") === scenario &&
              f.moment === "end",
          );
          if (!strip || !results.assets) {
            return undefined;
          }
          return {
            run: s,
            frames: Object.entries(strip.images as Record<string, string>).map(
              ([config, file]) => ({
                config,
                src: results.assets + file,
                flip: strip.flip?.[config]?.mean as number | undefined,
              }),
            ),
          };
        }),
    ).then((list) => {
      if (!cancelled) {
        setFilm(list.filter((x): x is FilmRun => !!x));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [key, entry, runs]);

  return (
    <div className="scene-page">
      <Button asChild variant="ghost" size="2" mt="2">
        <Link to="/scenes" search={{}}>
          <ArrowLeftIcon /> All scenes
        </Link>
      </Button>
      <h2>{entry.title}</h2>
      {scene && (
        <Lede>
          Group {scene.group} · globe:{" "}
          {typeof scene.globe === "object" ? "terrain" : scene.globe} · camera:{" "}
          {scene.camera.kind}
          {scene.render && (
            <>
              {" "}
              · render overrides <code>{JSON.stringify(scene.render)}</code>
            </>
          )}
        </Lede>
      )}
      <Flex gap="2" wrap="wrap" className="row-actions">
        <Button asChild variant="soft">
          <Link to="/explorer" search={{ scene: entry.scene }}>
            Open in the explorer
          </Link>
        </Button>
        <Button asChild variant="soft">
          <Link to="/workspace" search={{ scene: key }}>
            Open in the workspace
          </Link>
        </Button>
      </Flex>

      {datasets.length > 0 && (
        <>
          <h3>Content</h3>
          <Table.Root size="1" variant="ghost">
            <Table.Body>
              {datasets.map((d) => (
                <Table.Row key={d.id}>
                  <Table.RowHeaderCell>{d.title}</Table.RowHeaderCell>
                  <Table.Cell>
                    {d.kind} · {d.license.name} ({d.license.status})
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </>
      )}

      <h3>Best results</h3>
      {configs.length ? (
        <Table.Root size="1" variant="surface" className="best">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeaderCell />
              {configs.map((c) => (
                <Table.ColumnHeaderCell key={c}>{c}</Table.ColumnHeaderCell>
              ))}
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {best.map(({ metric, name, unit, scale, tops }) => (
              <Table.Row key={metric}>
                <Table.RowHeaderCell>{name}</Table.RowHeaderCell>
                {tops.map((top, i) => (
                  <Table.Cell key={configs[i]}>
                    {top ? (
                      <>
                        {fmt(top.v, scale)}
                        {unit ? ` ${unit}` : ""}
                        <span className="muted">
                          {" "}
                          · {day(top.s)} <code>{top.s.commit.slice(0, 7)}</code>
                        </span>
                      </>
                    ) : (
                      "–"
                    )}
                  </Table.Cell>
                ))}
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      ) : (
        <p className="muted">Not run yet.</p>
      )}

      <h3>History</h3>
      {runs.length ? (
        <div className="grid">
          {charts.map((c) => (
            <Chart key={c.metric} html={c.html} />
          ))}
        </div>
      ) : (
        <Empty title="No history yet.">
          Run the suite with this scene:{" "}
          <code>
            node packages/next/bench/suite/cli.mjs run --scenes {entry.scene}
          </code>
        </Empty>
      )}

      <h3>Changes that moved it</h3>
      {moved.length ? (
        <ul>
          {moved.map((a) => (
            <li key={a.id}>
              {a.kind === "regression" ? "▲" : "▼"}{" "}
              {metricInfo(a.metric)?.[1] ?? a.metric} {a.change > 1 ? "+" : ""}
              {((a.change - 1) * 100).toFixed(1)}% · {a.config} · between{" "}
              <code>{a.range.from.commit.slice(0, 7)}</code> and{" "}
              <code>{a.range.to.commit.slice(0, 7)}</code>{" "}
              {a.range.to.subject ?? ""}
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">
          No change points (they need six runs on the same hardware).
        </p>
      )}

      <h3>Filmstrip over time</h3>
      <div className="film">
        {film === undefined ? (
          <p className="muted">Loading…</p>
        ) : film.length ? (
          film.map(({ run, frames }) => (
            <div className="film-run" key={run.name}>
              <RadixLink asChild size="2">
                <Link to="/report" search={{ run: run.name }}>
                  {new Date(run.date).toLocaleString()} ·{" "}
                  <code>{run.commit.slice(0, 7)}</code>
                </Link>
              </RadixLink>
              <div className="film-frames">
                {frames.map((f) => (
                  <figure key={f.config}>
                    <img
                      loading="lazy"
                      src={f.src}
                      alt={`${f.config}, ${run.date}`}
                    />
                    <figcaption>
                      {f.config}
                      {f.flip !== undefined
                        ? ` · FLIP ${f.flip.toFixed(3)}`
                        : ""}
                    </figcaption>
                  </figure>
                ))}
              </div>
            </div>
          ))
        ) : (
          <p className="muted">
            No captured frames yet (runs since r33 capture them).
          </p>
        )}
      </div>
    </div>
  );
}
