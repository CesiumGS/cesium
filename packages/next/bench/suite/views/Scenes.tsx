import {
  Badge,
  Button,
  Card,
  CardActionArea,
  CardContent,
  CardHeader,
  CircularProgress,
  Link as MuiLink,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import { svgArrowLeft } from "@stratakit/icons/arrow-left";
import { svgChartLine } from "@stratakit/icons/chart-line";
import { svgGlobe } from "@stratakit/icons/globe";
import { Icon } from "@stratakit/mui";
import { getRouteApi, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ALERT_METRICS, detectAlerts } from "../changepoints.mjs";
import { lineChart } from "../charts.mjs";
import { waterfall } from "../diagnose.mjs";
import {
  catalog,
  type Cell,
  cellKey,
  cellTitle,
  full,
  type Json,
  metricInfo,
  type Summary,
  when,
} from "../data.ts";
import type { Dataset, Scene } from "../schema.ts";
import { engineLabel, engineOf } from "../engines.mjs";
import {
  Chart,
  Empty,
  formatChange,
  Page,
  Section,
  useRuns,
} from "./common.tsx";
import "./scenes.css";

/**
 * Dyno's scenes (DESIGN.md: Scenes), after Strava segments: the catalog
 * as cards with each scene's best results per engine, and a page per
 * scene (and scenario) with its best results per configuration, history,
 * the changes that moved it, the filmstrip over time, and its content
 * and licenses.
 */

const sceneRoute = getRouteApi("/_runs/scenes/$scene");

/** Metrics a scene's page shows (lower is better for each). */
const BEST = [
  "cpuP50",
  "settleMs",
  "frameP95",
  "bytes",
  "heapBytes",
  "bufferBytes",
];

/** What a metric's change measures, when "faster" doesn't fit. */
const NOUN: Record<string, string> = {
  over100: "hitches",
  requests: "requests",
  bytes: "data",
  heapBytes: "memory",
  bufferBytes: "memory",
};

/** Catalog groups (plan §16.4), in the order the catalog lists them. */
const GROUPS: Array<[Scene["group"], string, string?]> = [
  ["A", "Classic Cesium content", "What 1.x users load today."],
  ["B", "Large public datasets"],
  ["C", "2.0's architecture", "Content aimed at what 2.0 does differently."],
];

interface Entry {
  title: string;
  scene: string;
  cells: Array<{ s: Summary; c: Cell }>;
}

/** Every scene and scenario that has run, plus catalog scenes that haven't. */
function useEntries(): Map<string, Entry> {
  const { summaries } = useRuns();
  return useMemo(() => {
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
}

// ------------------------------------------------------------ formatting

/** Configurations in palette order: 1.x first, then 2.0. */
const byEngine = (configs: string[]) =>
  [...configs].sort(
    (a, b) =>
      Number(engineOf(a) === "2.0") - Number(engineOf(b) === "2.0") ||
      a.localeCompare(b),
  );

/**
 * Series colors that keep the validated engine colors: each engine's
 * main configuration ("1.x", "2.0", or its first) gets the engine's color
 * (1.x blue, 2.0 orange); other configurations take the next slots.
 */
function seriesColors(configs: string[]): Map<string, string> {
  const colors = new Map<string, string>();
  for (const [engine, slot] of [
    ["1.x", 1],
    ["2.0", 2],
  ] as const) {
    const main =
      configs.find((c) => c === engine) ??
      configs.find((c) => engineOf(c) === engine);
    if (main) {
      colors.set(main, `var(--series-${slot})`);
    }
  }
  let next = 3;
  for (const c of configs) {
    if (!colors.has(c)) {
      colors.set(c, `var(--series-${Math.min(4, next++)})`);
    }
  }
  return colors;
}

/** A value in its unit, with no more precision than the noise. */
function formatValue(v: number, unit: string, scale: number): string {
  const x = v / scale;
  const digits = x < 1 ? 2 : x < 10 ? 1 : 0;
  return `${x.toFixed(digits)}${unit ? ` ${unit}` : ""}`;
}
const day = (s: Summary) =>
  new Date(s.date).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
const sentence = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const short = (commit: string) => commit.slice(0, 7);

// ------------------------------------------------------------ catalog

export function Scenes() {
  const { summaries } = useRuns();
  const entries = useEntries();
  const scenes = new Map(catalog.scenes.map((s) => [s.id, s]));
  const grouped = GROUPS.map(([group, title, description]) => ({
    group,
    title,
    description,
    entries: [...entries].filter(
      ([, e]) => (scenes.get(e.scene)?.group ?? "A") === group,
    ),
  })).filter((g) => g.entries.length);
  return (
    <Page
      className="scenes-page"
      title="Scenes"
      description="Every scene in the catalog, with its best results in each engine."
      help={
        <>
          <p>
            A scene is catalog content with a camera path. Each card shows the
            best median CPU time per frame and time to settle each engine has
            reached on it, over all runs and configurations.
          </p>
          <p>
            Open a scene for its history, best results per configuration,
            filmstrip over time and the changes that moved it.
          </p>
        </>
      }
    >
      {!summaries.length && (
        <div className="scenes-empty">
          <Empty title="No runs yet.">
            Run the suite to fill these in:{" "}
            <code>node packages/next/bench/suite/cli.mjs run</code>
          </Empty>
        </div>
      )}
      {grouped.map((g) => (
        <Section key={g.group} title={g.title} description={g.description}>
          <div className="scenes-grid">
            {g.entries.map(([key, entry]) => (
              <SceneCard key={key} sceneKey={key} entry={entry} />
            ))}
          </div>
        </Section>
      ))}
    </Page>
  );
}

/** Each engine's best (lowest) median of a metric over all runs. */
function bestByEngine(entry: Entry, metric: string) {
  const best = new Map<
    "1.x" | "2.0",
    { v: number; s: Summary; config: string }
  >();
  for (const { s, c } of entry.cells) {
    const m = c.metrics[metric];
    const engine = engineOf(c.config);
    const top = best.get(engine);
    if (m && Number.isFinite(m.median) && (!top || m.median < top.v)) {
      best.set(engine, { v: m.median, s, config: c.config });
    }
  }
  return best;
}

function SceneCard({ sceneKey, entry }: { sceneKey: string; entry: Entry }) {
  const runs = [...new Set(entry.cells.map((x) => x.s))];
  const last = runs.at(-1);
  const cpu = bestByEngine(entry, "cpuP50");
  const settle = bestByEngine(entry, "settleMs");
  const engines = (["1.x", "2.0"] as const).filter(
    (e) => cpu.has(e) || settle.has(e),
  );
  const ratio =
    cpu.get("1.x") && cpu.get("2.0")
      ? cpu.get("2.0")!.v / cpu.get("1.x")!.v
      : undefined;
  const change = formatChange(ratio);
  const cell = (
    best: ReturnType<typeof bestByEngine>,
    engine: "1.x" | "2.0",
    unit: string,
    scale: number,
  ) => {
    const top = best.get(engine);
    return top ? (
      <Tooltip
        title={`${engineLabel(top.config)} · ${when(top.s)} · ${short(top.s.commit)}`}
      >
        <span>{formatValue(top.v, unit, scale)}</span>
      </Tooltip>
    ) : (
      "–"
    );
  };
  return (
    <Card className="scenes-card">
      <CardHeader
        title={
          <CardActionArea
            render={<Link to="/scenes/$scene" params={{ scene: sceneKey }} />}
            nativeButton={false}
          >
            {entry.title}
          </CardActionArea>
        }
        subheader={
          last
            ? `${runs.length} ${runs.length === 1 ? "run" : "runs"} · last ${day(last)}`
            : "Not run yet"
        }
        slotProps={{
          title: { variant: "subtitle-md", render: <h3 /> },
          subheader: { variant: "body-sm", color: "textSecondary" },
        }}
      />
      {engines.length > 0 && (
        <CardContent className="scenes-card-content">
          <Table size="small" className="scenes-card-table">
            <TableHead>
              <TableRow>
                <TableCell>Engine</TableCell>
                <TableCell align="right">CPU / frame</TableCell>
                <TableCell align="right">Settled</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {engines.map((engine) => (
                <TableRow key={engine} hover={false}>
                  <TableCell>
                    <span
                      className={`engine-key engine-${engine === "1.x" ? "1x" : "2"}`}
                    />
                    {engine}
                  </TableCell>
                  <TableCell align="right" className="num">
                    {cell(cpu, engine, "ms", 1)}
                  </TableCell>
                  <TableCell align="right" className="num">
                    {cell(settle, engine, "s", 1000)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {ratio !== undefined && (
            <Tooltip title={`2.0 / 1.x CPU per frame: ${ratio.toFixed(2)}`}>
              <Typography
                variant="body-sm"
                render={<p />}
                className="scenes-card-verdict"
              >
                2.0 is <span className={change.tone}>{change.text}</span> per
                frame
              </Typography>
            </Tooltip>
          )}
        </CardContent>
      )}
    </Card>
  );
}

// ------------------------------------------------------------ a scene's page

/** One run's settled frames for the filmstrip, per configuration. */
interface FilmRun {
  run: Summary;
  frames: Array<{ config: string; src: string; flip?: number }>;
}

export function ScenePage() {
  const { scene: key } = sceneRoute.useParams();
  const entries = useEntries();
  const entry = entries.get(key);
  if (!entry) {
    return (
      <Page
        className="scene-detail"
        title="Scene not found"
        back={<BackToScenes />}
      >
        <Empty title={`No scene “${key}”.`}>
          It is not in the catalog and no run measured it.{" "}
          <MuiLink render={<Link to="/scenes" />}>See all scenes</MuiLink>.
        </Empty>
      </Page>
    );
  }
  return <SceneDetail key={key} sceneKey={key} entry={entry} />;
}

function BackToScenes() {
  return (
    <MuiLink render={<Link to="/scenes" />} className="back-link">
      <Icon href={svgArrowLeft} />
      Scenes
    </MuiLink>
  );
}

function SceneDetail({
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
    () => byEngine([...new Set(entry.cells.map((x) => x.c.config))]),
    [entry],
  );
  const runs = useMemo(
    () => [...new Set(entry.cells.map((x) => x.s))],
    [entry],
  );
  const colors = useMemo(() => seriesColors(configs), [configs]);

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
        `${when(s)} · ${short(s.commit)}${s.note || s.subject ? ` · ${s.note || s.subject}` : ""}`,
    );
    return BEST.map((metric) => {
      const [, name, unit, scale] = metricInfo(metric);
      const metricOf = (s: Summary, config: string) =>
        s.scenes.find((x) => cellKey(x) === key && x.config === config)
          ?.metrics[metric];
      return {
        metric,
        html: lineChart({
          title: sentence(name),
          xLabel: "run",
          unit,
          xNames,
          series: configs.map((config) => ({
            label: engineLabel(config),
            color: colors.get(config)!,
            points: runs.map((s, j) => {
              const m = metricOf(s, config);
              return [j, m ? m.median / scale : null];
            }),
            band: runs.flatMap((s, j) => {
              const m = metricOf(s, config);
              return m && Number.isFinite(m.low)
                ? [[j, m.low / scale, m.high / scale]]
                : [];
            }),
          })),
          width: 520,
          height: 160,
        }),
      };
    });
  }, [key, runs, configs, colors]);

  // The changes that moved this scene.
  const moved = useMemo(
    () =>
      detectAlerts(
        summaries.filter((s) => runs.includes(s)),
        ALERT_METRICS,
      ).filter((a) => a.scene === key),
    [summaries, runs, key],
  );

  // The newest runs' full results (12 at most), for the filmstrip over
  // time and the latest request waterfall.
  const scenario = key.includes("|") ? key.split("|")[1]! : "cold-orbit";
  const [loaded, setLoaded] =
    useState<Array<{ run: Summary; results: Json }>>();
  useEffect(() => {
    let cancelled = false;
    void Promise.all(
      [...runs]
        .reverse()
        .slice(0, 12)
        .map(async (run) => {
          try {
            return { run, results: await full(run.name) };
          } catch {
            return undefined;
          }
        }),
    ).then((list) => {
      if (!cancelled) {
        setLoaded(list.filter((x) => !!x));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [runs]);

  // Filmstrip over time: each run's settled view after the orbit, per
  // configuration (runs that captured one), newest first.
  const film = useMemo(
    () =>
      loaded?.flatMap(({ run, results }): FilmRun[] => {
        const strip = (results.filmstrips ?? []).find(
          (f: Json) =>
            f.scene === entry.scene &&
            (f.scenario ?? "cold-orbit") === scenario &&
            f.moment === "end",
        );
        if (!strip || !results.assets) {
          return [];
        }
        return [
          {
            run,
            frames: byEngine(Object.keys(strip.images)).map((config) => ({
              config,
              src: results.assets + strip.images[config],
              flip: strip.flip?.[config]?.mean as number | undefined,
            })),
          },
        ];
      }),
    [loaded, entry, scenario],
  );

  // Requests: the newest run that recorded a waterfall for this scene.
  const requests = useMemo(() => {
    for (const { run, results } of loaded ?? []) {
      const sceneRuns = (results.runs ?? []).filter(
        (r: Json) =>
          r.scene === entry.scene &&
          (r.scenario ?? "cold-orbit") === scenario &&
          r.waterfall?.length,
      );
      if (sceneRuns.length) {
        const ids = byEngine([
          ...new Set<string>(sceneRuns.map((r: Json) => r.config)),
        ]);
        return {
          run,
          html: waterfall({
            runs: sceneRuns,
            configs: ids,
            color: (c) => colors.get(c) ?? "var(--series-4)",
          }),
        };
      }
    }
    return undefined;
  }, [loaded, entry, scenario, colors]);

  const runCommand = `node packages/next/bench/suite/cli.mjs run --scenes ${entry.scene}`;
  const facts = scene
    ? [
        `Group ${scene.group}`,
        scene.globe === "none"
          ? "no globe"
          : typeof scene.globe === "object"
            ? "terrain"
            : "ellipsoid",
        scene.camera.kind === "orbit"
          ? "orbit camera"
          : scene.camera.kind === "flight"
            ? "1.x flyTo flight"
            : "recorded camera path",
      ].join(" · ")
    : undefined;

  return (
    <Page
      className="scene-detail"
      back={<BackToScenes />}
      title={entry.title}
      description={scene?.description ?? facts}
      actions={
        <>
          <Button
            variant="outlined"
            render={<Link to="/trends" search={{ scene: key }} />}
            nativeButton={false}
            startIcon={<Icon href={svgChartLine} />}
          >
            Open in trends
          </Button>
          <Button
            color="primary"
            render={<Link to="/explorer" search={{ scene: entry.scene }} />}
            nativeButton={false}
            startIcon={<Icon href={svgGlobe} />}
          >
            Open in the explorer
          </Button>
        </>
      }
      help={
        <>
          <p>
            {facts}. {runs.length} {runs.length === 1 ? "run has" : "runs have"}{" "}
            measured it.
          </p>
          {scene?.render && (
            <p>
              Render settings over the catalog's:{" "}
              <code>{JSON.stringify(scene.render)}</code>
            </p>
          )}
          <p>
            Best results are each configuration's lowest median over all runs.
            Change points need about six runs on the same hardware.
          </p>
        </>
      }
    >
      {!runs.length ? (
        <div className="section">
          <Empty title="Not run yet.">
            Run the suite with this scene: <code>{runCommand}</code>
          </Empty>
        </div>
      ) : (
        <>
          <Section
            title="Best results"
            description="Each configuration's lowest median over all runs, and when it got there."
          >
            <div className="table-scroll">
              <Table size="small" className="best">
                <TableHead>
                  <TableRow>
                    <TableCell>Metric</TableCell>
                    {configs.map((c) => (
                      <TableCell key={c} align="right">
                        <span
                          className="series-key"
                          style={{ background: colors.get(c) }}
                        />
                        {engineLabel(c)}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {best.map(({ metric, name, unit, scale, tops }) => (
                    <TableRow key={metric}>
                      <TableCell render={<th scope="row" />}>
                        {sentence(name)}
                      </TableCell>
                      {tops.map((top, i) => (
                        <TableCell
                          key={configs[i]}
                          align="right"
                          className="num"
                        >
                          {top ? (
                            <>
                              {formatValue(top.v, unit, scale)}
                              <Tooltip title={top.s.date}>
                                <span className="best-when">
                                  {day(top.s)} · {short(top.s.commit)}
                                </span>
                              </Tooltip>
                            </>
                          ) : (
                            "–"
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Section>

          <Section
            title="History"
            description="Median per run, with its interval."
          >
            <div className="scene-detail-charts">
              {charts.map((c) => (
                <Chart key={c.metric} html={c.html} />
              ))}
            </div>
          </Section>

          <Section title="Changes that moved it">
            {moved.length ? (
              <ul className="moved">
                {moved.map((a) => {
                  const [, name] = metricInfo(a.metric) ?? [a.metric, a.metric];
                  const change = formatChange(a.change, {
                    noun: NOUN[a.metric],
                  });
                  return (
                    <li key={a.id}>
                      <Badge
                        variant="inline"
                        color={a.kind === "regression" ? "error" : "success"}
                        badgeContent={
                          a.kind === "regression" ? "Regression" : "Improvement"
                        }
                      />
                      <span>
                        {sentence(name)}{" "}
                        <Tooltip
                          title={`after / before: ${a.change.toFixed(2)}`}
                        >
                          <span className={change.tone}>{change.text}</span>
                        </Tooltip>{" "}
                        in {engineLabel(a.config)}, between{" "}
                        <code>{short(a.range.from.commit)}</code> and{" "}
                        <code>{short(a.range.to.commit)}</code>
                        {a.range.to.subject ? ` (${a.range.to.subject})` : ""}
                      </span>
                      <MuiLink
                        render={
                          <Link
                            to="/compare"
                            search={{ a: a.range.from.run, b: a.range.to.run }}
                          />
                        }
                      >
                        Compare runs
                      </MuiLink>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <Typography
                variant="body-md"
                color="textSecondary"
                render={<p />}
                className="quiet"
              >
                No change points yet. They need about six runs of this scene on
                the same hardware.
              </Typography>
            )}
          </Section>

          <Section
            title="Requests"
            description={
              requests
                ? `Every content request of the newest run that recorded them (${when(requests.run)}), per engine: when it started, waited and finished.`
                : "Every content request of a run, per engine."
            }
            actions={
              requests ? (
                <Button
                  variant="outlined"
                  size="small"
                  nativeButton={false}
                  render={
                    <Link to="/runs/$run" params={{ run: requests.run.name }} />
                  }
                >
                  Open that run
                </Button>
              ) : undefined
            }
          >
            {loaded === undefined ? (
              <div className="loading" role="status">
                <CircularProgress size={16} />
                <Typography variant="body-md" color="textSecondary">
                  Loading requests…
                </Typography>
              </div>
            ) : requests ? (
              <Chart html={requests.html} />
            ) : (
              <Typography
                variant="body-sm"
                color="textSecondary"
                render={<p />}
                className="quiet"
              >
                No recent run recorded requests for this scene. Each run records
                them for its first repetition.
              </Typography>
            )}
          </Section>

          <Section
            title="Filmstrip over time"
            description="The settled view after the camera path, per run, newest first."
          >
            {film === undefined ? (
              <div className="loading" role="status">
                <CircularProgress size={16} />
                <Typography variant="body-md" color="textSecondary">
                  Loading frames…
                </Typography>
              </div>
            ) : film.length ? (
              <div className="filmstrip">
                {film.map(({ run, frames }) => (
                  <div className="filmstrip-run" key={run.name}>
                    <Tooltip title={run.date}>
                      <MuiLink
                        render={
                          <Link to="/runs/$run" params={{ run: run.name }} />
                        }
                        className="filmstrip-run-link"
                      >
                        {when(run)} · {short(run.commit)}
                        {run.note ? ` · ${run.note}` : ""}
                      </MuiLink>
                    </Tooltip>
                    <div className="filmstrip-frames">
                      {frames.map((f) => (
                        <figure key={f.config}>
                          <img
                            loading="lazy"
                            src={f.src}
                            alt={`${engineLabel(f.config)}, ${when(run)}`}
                          />
                          <figcaption>
                            <span>{engineLabel(f.config)}</span>
                            {f.flip !== undefined && (
                              <Tooltip title="FLIP difference from the baseline's frame (0 identical, 1 completely different)">
                                <span className="num">
                                  FLIP {f.flip.toFixed(3)}
                                </span>
                              </Tooltip>
                            )}
                          </figcaption>
                        </figure>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Typography
                variant="body-md"
                color="textSecondary"
                render={<p />}
                className="quiet"
              >
                No captured frames yet. Runs capture them since r33.
              </Typography>
            )}
          </Section>
        </>
      )}

      {datasets.length > 0 && (
        <Section title="Content and licenses">
          <div className="table-scroll">
            <Table size="small" className="content-table">
              <TableHead>
                <TableRow>
                  <TableCell>Dataset</TableCell>
                  <TableCell>Kind</TableCell>
                  <TableCell>License</TableCell>
                  <TableCell>Use</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {datasets.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell render={<th scope="row" />}>{d.title}</TableCell>
                    <TableCell>{KIND[d.kind]}</TableCell>
                    <TableCell>
                      {d.license.source ? (
                        <MuiLink
                          href={d.license.source}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {d.license.name}
                        </MuiLink>
                      ) : (
                        d.license.name
                      )}
                    </TableCell>
                    <TableCell>
                      <Tooltip title={d.license.notes ?? ""}>
                        <Badge
                          variant="inline"
                          size="small"
                          type="muted"
                          color={
                            d.license.status === "stream-only"
                              ? "secondary"
                              : "success"
                          }
                          badgeContent={LICENSE[d.license.status]}
                        />
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Section>
      )}
    </Page>
  );
}

const KIND: Record<Dataset["kind"], string> = {
  "3dtiles": "3D Tiles",
  terrain: "Terrain",
  imagery: "Imagery",
  gltf: "glTF",
};
const LICENSE: Record<Dataset["license"]["status"], string> = {
  redistributable: "Redistributable",
  "stream-only": "Stream only",
  "commercial-ok": "Commercial use",
};
