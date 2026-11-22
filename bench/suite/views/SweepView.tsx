import "./analysis.css";
import {
  Badge,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { lineChart } from "../charts.mjs";
import { cellKey, cellTitle, full, type Json, type Summary } from "../data.ts";
import { engineLabel } from "../engines.mjs";
import {
  percent,
  REFERENCE_MOMENT,
  WHOLE,
  type ReferenceRecord,
} from "../reference.mjs";
import { metricRow } from "../report.mjs";
import { Chart, Choice, Section, Toolbar, useChartTokens } from "./common.tsx";
import { ImageCompare } from "./Images.tsx";
import {
  ALL,
  arrange,
  colorIndexes,
  coordsWords,
  defaultLayout,
  floorOf,
  isImageMetric,
  metricGroups,
  moveDimension,
  type Layout,
  type Line,
  type Panel,
  pointValue,
  pointWords,
  referencePoint,
  regionOf,
  sweepModelOf,
  type SweepModel,
  type SweepPoint,
} from "./sweepModel.ts";

/**
 * The sweep view (CS-395; DESIGN.md, "The sweep view"): one sweep run,
 * every axis placed by the reader (along x, as lines, as panels of small
 * multiples, or held at a value), each metric as a row of panels on one
 * scale with its table twin, points that didn't settle drawn hollow, the
 * noise floor as a band on image-difference charts, and the image grid,
 * where a click opens any two points' images in the compare modes. It
 * shows in a sweep run's report and in Analysis (until CS-405's Studies).
 */

/** Metric names for headings (sentence case; units in the axis). */
const NAMES: Record<string, string> = {
  pixelDiffShare: "Pixels changed from the reference",
  pixelDiffMean: "Mean luminance change from the reference",
  flipRef: "Image difference from the reference (FLIP)",
  flipRefP95: "Image difference from the reference (FLIP, 95th percentile)",
  flipEnd: "Image difference from the baseline engine (FLIP)",
  motionFlip: "Quality in motion (FLIP)",
  cpuP50: "CPU time per tick",
  gpuP50: "GPU time per tick",
  frameP50: "Tick time, median",
  frameP95: "Tick time, 95th percentile",
  settleMs: "Time to settle",
  settled: "Settled (share of repetitions)",
};

const sentence = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** A metric's heading, unit and scale (report.mjs's rows). */
function metricOf(metric: string) {
  const row = metricRow(metric) ?? [metric, metric, "", 1];
  const base = metric.split(".")[0]!;
  const crop = metric.includes(".") ? metric.split(".").slice(1).join(".") : "";
  const name =
    NAMES[metric] ??
    (crop && NAMES[base]
      ? `${NAMES[base]}, crop “${crop}”`
      : sentence(String(row[1])));
  return { name, unit: String(row[2]), scale: Number(row[3]) || 1 };
}

/** A value with its unit, no more precise than it reads. */
function formatValue(metric: string, value: number | undefined): string {
  if (value === undefined) {
    return "–";
  }
  if (metric.startsWith("pixelDiffShare")) {
    return percent(value);
  }
  const { unit, scale } = metricOf(metric);
  const v = value / scale;
  const abs = Math.abs(v);
  const text =
    abs >= 1000
      ? Math.round(v).toLocaleString("en-US")
      : abs >= 100
        ? v.toFixed(0)
        : abs >= 10
          ? v.toFixed(1)
          : abs >= 0.01 || v === 0
            ? v.toFixed(2)
            : v.toPrecision(2);
  return unit ? `${text} ${unit}` : text;
}

/** Four validated series colors; past four, dashes tell lines apart. */
const color = (i: number) => `var(--series-${(i % 4) + 1})`;
const dashOf = (line: Line, k: number) =>
  line.reference ? "6 4" : k >= 4 ? "2 3" : undefined;

/** Whether the window is phone-narrow (charts draw smaller, text stays legible). */
function useNarrow() {
  const query = "(max-width: 600px)";
  const [narrow, setNarrow] = useState(
    () => typeof matchMedia === "function" && matchMedia(query).matches,
  );
  useEffect(() => {
    const list = matchMedia(query);
    const on = () => setNarrow(list.matches);
    list.addEventListener("change", on);
    return () => list.removeEventListener("change", on);
  }, []);
  return narrow;
}

export function SweepView({
  summary: s,
  scene: sceneProp,
  onScene,
}: {
  summary: Summary;
  /** The scene shown (a cell key, or ALL); the view keeps its own without. */
  scene?: string;
  onScene?: (scene: string) => void;
}) {
  const model = useMemo(() => sweepModelOf(s), [s]);
  const [results, setResults] = useState<Json>();
  useEffect(() => {
    let canceled = false;
    setResults(undefined);
    full(s.name).then(
      (r) => !canceled && setResults(r),
      () => !canceled && setResults(null),
    );
    return () => {
      canceled = true;
    };
  }, [s.name]);
  if (!model) {
    return null;
  }
  return (
    <SweepBody
      key={s.name}
      s={s}
      model={model}
      results={results}
      sceneProp={sceneProp}
      onScene={onScene}
    />
  );
}

function SweepBody({
  s,
  model,
  results,
  sceneProp,
  onScene,
}: {
  s: Summary;
  model: SweepModel;
  /** The full results (undefined while loading, null if unreadable). */
  results: Json;
  sceneProp?: string;
  onScene?: (scene: string) => void;
}) {
  const [layout, setLayout] = useState<Layout>(() => defaultLayout(model));
  const groups = useMemo(() => metricGroups(s, model), [s, model]);
  const record = results?.reference as ReferenceRecord | undefined;
  const [groupId, setGroupId] = useState<string>();
  const group =
    groups.find((g) => g.id === groupId) ??
    groups.find((g) => g.id === (record ? "image" : "tiles")) ??
    groups[0];
  const [ownScene, setOwnScene] = useState(
    model.scenes.length === 1 ? model.scenes[0]! : ALL,
  );
  const scene =
    sceneProp !== undefined &&
    (sceneProp === ALL || model.scenes.includes(sceneProp))
      ? sceneProp
      : ownScene;
  const setScene = (k: string) => (onScene ? onScene(k) : setOwnScene(k));
  const [compare, setCompare] = useState<CompareState>();
  // Points that didn't settle in the scenes shown (drawn hollow).
  const unsettled = useMemo(
    () =>
      model.points.filter(
        (p) => !pointValue(s, p.config, "settled", scene).settled,
      ).length,
    [s, model, scene],
  );

  const dims = model.dims;
  const options = dims.map((d) => [d.id, sentence(d.label)] as const);
  const none = [["", "None"] as const];
  const sceneTitle = (k: string) =>
    cellTitle(s.scenes.find((c) => cellKey(c) === k)!);

  return (
    <div className="sweep">
      <SweepSentence s={s} model={model} record={record} results={results} />
      <Toolbar>
        {model.scenes.length > 1 ? (
          <Choice
            label="Scene"
            minWidth={240}
            value={scene}
            options={[
              [
                ALL,
                `All ${model.scenes.length} scenes (geometric mean)`,
              ] as const,
              ...model.scenes.map((k) => [k, sceneTitle(k)] as const),
            ]}
            onChange={setScene}
          />
        ) : null}
        <Choice
          label="Along x"
          value={layout.x}
          options={options}
          onChange={(id) => setLayout(moveDimension(model, layout, "x", id))}
        />
        {dims.length > 1 ? (
          <Choice
            label="Lines by"
            value={layout.lines ?? ""}
            options={[...none, ...options.filter(([id]) => id !== layout.x)]}
            onChange={(id) =>
              setLayout(moveDimension(model, layout, "lines", id || undefined))
            }
          />
        ) : null}
        {dims.length > 1 ? (
          <Choice
            label="Panels by"
            value={layout.panels ?? ""}
            options={[...none, ...options.filter(([id]) => id !== layout.x)]}
            onChange={(id) =>
              setLayout(moveDimension(model, layout, "panels", id || undefined))
            }
          />
        ) : null}
        {Object.entries(layout.held).map(([id, value]) => {
          const d = dims.find((x) => x.id === id)!;
          return (
            <Choice
              key={id}
              label={`${sentence(d.label)} at`}
              minWidth={120}
              value={String(d.values.indexOf(value))}
              options={d.names.map((n, i) => [String(i), n] as const)}
              onChange={(i) =>
                setLayout({
                  ...layout,
                  held: { ...layout.held, [id]: d.values[Number(i)]! },
                })
              }
            />
          );
        })}
        {groups.length > 1 ? (
          <Choice
            label="Metrics"
            minWidth={180}
            value={group?.id}
            options={groups.map((g) => [g.id, g.label] as const)}
            onChange={setGroupId}
          />
        ) : null}
      </Toolbar>
      {group ? (
        <Section
          title={group.label}
          description={[
            `Along x: ${dims.find((d) => d.id === layout.x)!.label}.`,
            groupNote(group.id, model, record, results, unsettled),
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <div
            className={layout.panels ? "sweep-metrics" : "sweep-metrics-grid"}
          >
            {group.keys.map((metric) => (
              <MetricRow
                key={metric}
                s={s}
                model={model}
                layout={layout}
                metric={metric}
                scene={scene}
                record={record}
              />
            ))}
          </div>
          {group.zero.length ? (
            <Typography
              variant="body-sm"
              color="textSecondary"
              render={<p />}
              className="sweep-zero"
            >
              Zero at every point:{" "}
              {group.zero.map((k) => metricOf(k).name.toLowerCase()).join("; ")}
              .
            </Typography>
          ) : null}
        </Section>
      ) : (
        <Typography variant="body-md" color="textSecondary" render={<p />}>
          This sweep's points measured nothing to chart.
        </Typography>
      )}
      <ImageGrid
        s={s}
        model={model}
        layout={layout}
        scene={scene}
        results={results}
        record={record}
        onOpen={setCompare}
      />
      {compare ? (
        <CompareDialog
          state={compare}
          onChange={setCompare}
          onClose={() => setCompare(undefined)}
          model={model}
          results={results}
          record={record}
        />
      ) : null}
    </div>
  );
}

/** What the sweep varied and what it compares against, in one sentence. */
function SweepSentence({
  s,
  model,
  record,
  results,
}: {
  s: Summary;
  model: SweepModel;
  record: ReferenceRecord | undefined;
  results: Json;
}) {
  const ref = model.reference;
  const listOf = (items: string[]) =>
    items.length < 2
      ? (items[0] ?? "")
      : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
  const axes = model.dims
    .map((d) => `${d.label} at ${listOf(d.names)}`)
    .join(" × ");
  const grid = model.points.filter((p) => !(ref?.outside && p.reference));
  const reps = ref?.reps ?? 1;
  const floors = record?.floors.filter((f) => f.regions) ?? [];
  return (
    <Typography variant="body-md" render={<p />} className="sweep-sentence">
      {sentence(axes)}: {grid.length} point{grid.length === 1 ? "" : "s"} on{" "}
      {model.scenes.length} scene{model.scenes.length === 1 ? "" : "s"},{" "}
      {s.repetitions} repetition{s.repetitions === 1 ? "" : "s"}.{" "}
      {ref ? (
        <>
          The reference is {ref.label} {ref.name}
          {ref.outside ? ", run beside every point" : ""}, captured{" "}
          {reps === 1 ? "once" : `${reps} times`} a point
          {record
            ? floors.length
              ? "; the shaded band is the noise floor."
              : "; one capture gives no noise floor, so differences can't be called within noise."
            : results === undefined
              ? "."
              : "; this run has no reference images (it was recorded before them)."}
        </>
      ) : model.baseline ? (
        <>The dashed line is {engineLabel(model.baseline)}.</>
      ) : (
        "It has no reference, so nothing is compared against one."
      )}
    </Typography>
  );
}

function groupNote(
  id: string,
  model: SweepModel,
  record: ReferenceRecord | undefined,
  results: Json,
  unsettled: number,
): string | undefined {
  if (id === "image") {
    if (!record) {
      return results === undefined
        ? undefined
        : "Image differences need a sweep run with --reference.";
    }
    const reps = model.reference?.reps ?? 1;
    return reps > 1
      ? `Each point's settled view against its reference's, same engine. A pixel changes when its linear luminance moves by more than ${record.threshold}. The band is the noise floor: the largest difference between two of the ${reps} captures of one reference point.`
      : `Each point's settled view against its reference's, same engine. A pixel changes when its linear luminance moves by more than ${record.threshold}. Run with --reference-reps 3 for a noise floor.`;
  }
  return unsettled
    ? `${unsettled} point${unsettled === 1 ? "" : "s"} didn't settle within the scene's cap, drawn hollow.`
    : model.settles
      ? "Every point settled."
      : undefined;
}

/** One metric: a panel per value of "panels by", one scale, a table twin. */
function MetricRow({
  s,
  model,
  layout,
  metric,
  scene,
  record,
}: {
  s: Summary;
  model: SweepModel;
  layout: Layout;
  metric: string;
  scene: string;
  record: ReferenceRecord | undefined;
}) {
  const { name, unit, scale } = metricOf(metric);
  const narrow = useNarrow();
  const panels = useMemo(
    () => arrange(s, model, layout, metric, scene),
    [s, model, layout, metric, scene],
  );
  const floor = floorOf(record, metric, scene, s);
  const x = model.dims.find((d) => d.id === layout.x)!;
  const lineLabel = (line: Line) => line.name || x.label;
  const charts = useMemo(() => {
    const values = panels
      .flatMap((p) => p.lines.flatMap((l) => l.points))
      .map((p) => p?.value)
      .filter((v): v is number => Number.isFinite(v))
      .map((v) => v / scale);
    if (!values.length) {
      return [];
    }
    const top =
      Math.max(...values, floor !== undefined ? floor / scale : 0) * 1.08 || 1;
    const refX =
      model.reference && !model.reference.outside && model.reference.id === x.id
        ? x.values.indexOf(model.reference.value)
        : -1;
    const many = panels.length > 1;
    const panelDim = model.dims.find((d) => d.id === layout.panels);
    return panels.map((panel) => {
      const colors = colorIndexes(panel.lines);
      return lineChart({
        title: panel.name
          ? `${sentence(panelDim!.label)} ${panel.name}${panel.reference ? " (reference)" : ""}`
          : name,
        caption: !!panel.name,
        xLabel: x.label,
        unit: metric.startsWith("pixelDiffShare") ? "%" : unit,
        xNames: x.names,
        series: panel.lines.map((line, i) => ({
          label: lineLabel(line),
          color: color(colors[i]!),
          dash: dashOf(line, colors[i]!),
          points: line.points.map(
            (p, xi) =>
              [xi, p?.value === undefined ? null : p.value / scale] as [
                number,
                number | null,
              ],
          ),
          hollow: line.points
            .map((p, xi) => (p && !p.settled ? xi : -1))
            .filter((xi) => xi >= 0),
        })),
        hbands:
          floor !== undefined
            ? [
                {
                  y0: 0,
                  y1: floor / scale,
                  label: `Noise floor: up to ${formatValue(metric, floor)}`,
                  color: "var(--muted)",
                },
              ]
            : [],
        marks: refX >= 0 ? [{ x: refX, label: "reference" }] : [],
        yMax: top,
        // The drawing's own size matches its box (text stays 11 px).
        width: narrow ? 320 : many ? 360 : 520,
        height: narrow ? 170 : many ? 180 : 200,
        twin: false,
        legend: false,
      });
    });
  }, [panels, floor, scale, unit, metric, model, layout, name, x, narrow]);
  if (!charts.length) {
    return null;
  }
  const lines = panels[0]!.lines;
  const colors = colorIndexes(lines);
  const shownUnit = metric.startsWith("pixelDiffShare") ? "%" : unit;
  const lineDim = model.dims.find((d) => d.id === layout.lines);
  return (
    <div className="sweep-metric">
      <Typography variant="subtitle-sm" render={<h3 />}>
        {name}
        {shownUnit ? `, ${shownUnit}` : ""}
      </Typography>
      {lines.length > 1 ? (
        <div className="sweep-legend">
          <Typography variant="caption-lg" color="textSecondary">
            {sentence(lineDim?.label ?? "")}:
          </Typography>
          {lines.map((line, i) => (
            <span key={line.name} className="sweep-legend-item">
              <svg width="22" height="10" aria-hidden="true">
                <line
                  x1="1"
                  x2="21"
                  y1="5"
                  y2="5"
                  stroke={color(colors[i]!)}
                  strokeWidth="2.5"
                  strokeDasharray={dashOf(line, colors[i]!)}
                />
              </svg>
              {line.name}
            </span>
          ))}
        </div>
      ) : null}
      <div
        className={`sweep-panels ${charts.length > 1 ? "sweep-panels-many" : ""}`}
      >
        {charts.map((html, i) => (
          <Chart key={i} html={html} className="sweep-panel" />
        ))}
      </div>
      <TableTwin
        model={model}
        layout={layout}
        metric={metric}
        panels={panels}
        record={record}
        scene={scene}
        floor={floor}
        s={s}
      />
    </div>
  );
}

/** Every point of a metric's panels as a table (the charts' twin). */
function TableTwin({
  model,
  layout,
  metric,
  panels,
  record,
  scene,
  floor,
  s,
}: {
  model: SweepModel;
  layout: Layout;
  metric: string;
  panels: Panel[];
  record: ReferenceRecord | undefined;
  scene: string;
  floor: number | undefined;
  s: Summary;
}) {
  const x = model.dims.find((d) => d.id === layout.x)!;
  const panelDim = model.dims.find((d) => d.id === layout.panels);
  const lineDim = model.dims.find((d) => d.id === layout.lines);
  const image = isImageMetric(metric) && metric !== "flipEnd";
  const region = regionOf(metric);
  const cell =
    scene !== ALL ? s.scenes.find((c) => cellKey(c) === scene) : undefined;
  const notes = (p: NonNullable<Line["points"][number]>) => {
    const out: string[] = [];
    if (p.reference) {
      out.push("reference");
    } else if (image && cell && record) {
      const words = pointWords(
        record,
        cell.scene,
        cell.scenario ?? "cold-orbit",
        p.config,
        region,
      );
      if (words === "within noise") {
        out.push(words);
      }
    } else if (image && floor !== undefined && p.value !== undefined) {
      if (p.value <= floor) {
        out.push("within noise");
      }
    }
    if (!p.settled) {
      out.push("not settled");
    }
    return out.length ? ` (${out.join(", ")})` : "";
  };
  return (
    <details className="sweep-twin">
      <summary>Table</summary>
      <div
        className="sweep-twin-scroll"
        tabIndex={0}
        role="region"
        aria-label={`${metricOf(metric).name}: table`}
      >
        <table>
          <thead>
            <tr>
              {panelDim ? (
                <th scope="col">{sentence(panelDim.label)}</th>
              ) : null}
              {lineDim ? <th scope="col">{sentence(lineDim.label)}</th> : null}
              {x.names.map((n) => (
                <th key={n} scope="col">
                  {x.label} {n}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {panels.flatMap((panel, pi) =>
              panel.lines.map((line, li) => (
                <tr key={`${pi}|${li}`}>
                  {panelDim ? <th scope="row">{panel.name}</th> : null}
                  {lineDim ? <th scope="row">{line.name}</th> : null}
                  {line.points.map((p, xi) => (
                    <td key={xi}>
                      {p
                        ? `${formatValue(metric, p.value)}${notes(p)}`
                        : "not run"}
                    </td>
                  ))}
                </tr>
              )),
            )}
          </tbody>
        </table>
        {floor !== undefined ? (
          <p>Noise floor: up to {formatValue(metric, floor)}.</p>
        ) : null}
      </div>
    </details>
  );
}

// ------------------------------------------------------------ image grid

interface CompareState {
  scene: string;
  scenario: string;
  /** The left image's configuration (the reference by default). */
  a?: string;
  b: string;
}

/** A point's settled image in a run: the reference record's, else the filmstrip's. */
function imageOf(
  results: Json,
  record: ReferenceRecord | undefined,
  scene: string,
  scenario: string,
  config: string,
): string | undefined {
  const file =
    referencePoint(record, scene, scenario, config)?.image ??
    (results?.filmstrips as Json[] | undefined)?.find(
      (f) =>
        f.scene === scene &&
        (f.scenario ?? "cold-orbit") === scenario &&
        f.moment === REFERENCE_MOMENT,
    )?.images?.[config];
  return file && results?.assets ? `${results.assets}${file}` : undefined;
}

function ImageGrid({
  s,
  model,
  layout,
  scene,
  results,
  record,
  onOpen,
}: {
  s: Summary;
  model: SweepModel;
  layout: Layout;
  scene: string;
  results: Json;
  record: ReferenceRecord | undefined;
  onOpen: (state: CompareState) => void;
}) {
  const [own, setOwn] = useState(model.scenes[0]!);
  const key = scene === ALL ? own : scene;
  const cell = s.scenes.find((c) => cellKey(c) === key);
  const panels = useMemo(
    () => arrange(s, model, layout, "settled", key),
    [s, model, layout, key],
  );
  if (!cell) {
    return null;
  }
  const scenario = cell.scenario ?? "cold-orbit";
  const x = model.dims.find((d) => d.id === layout.x)!;
  const panelDim = model.dims.find((d) => d.id === layout.panels);
  const lineDim = model.dims.find((d) => d.id === layout.lines);
  const any = panels.some((p) =>
    p.lines.some((l) =>
      l.points.some(
        (pt) => pt && imageOf(results, record, cell.scene, scenario, pt.config),
      ),
    ),
  );
  const pick =
    scene === ALL && model.scenes.length > 1 ? (
      <Choice
        label="Images of"
        minWidth={220}
        value={key}
        options={model.scenes.map(
          (k) =>
            [k, cellTitle(s.scenes.find((c) => cellKey(c) === k)!)] as const,
        )}
        onChange={setOwn}
      />
    ) : null;
  return (
    <Section
      title="Images"
      description={
        any
          ? `Each point's settled view${scene === ALL ? "" : ` of ${cellTitle(cell)}`}, laid out as the charts are. Open one to compare it with ${model.reference ? "its reference, or with " : ""}any other point.`
          : undefined
      }
      actions={pick}
    >
      {results === undefined ? (
        <Typography variant="body-md" color="textSecondary" render={<p />}>
          Loading the run's images…
        </Typography>
      ) : !any ? (
        <Typography variant="body-md" color="textSecondary" render={<p />}>
          This run kept no images of its points (it ran with --no-capture, or
          its results file couldn't be read).
        </Typography>
      ) : (
        panels.map((panel, pi) => (
          <div key={pi} className="sweep-grid-panel">
            {panel.name ? (
              <Typography
                variant="body-md"
                render={<h4 />}
                className="sweep-grid-title"
              >
                {sentence(panelDim!.label)} {panel.name}
                {panel.reference ? " (reference)" : ""}
              </Typography>
            ) : null}
            <div
              className="sweep-grid-scroll"
              tabIndex={0}
              role="region"
              aria-label={`Images${panel.name ? `, ${panelDim!.label} ${panel.name}` : ""}`}
            >
              <table className="sweep-grid">
                <thead>
                  <tr>
                    {lineDim ? (
                      <th scope="col">{sentence(lineDim.label)}</th>
                    ) : null}
                    {x.names.map((n) => (
                      <th key={n} scope="col">
                        {x.label} {n}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {panel.lines.map((line, li) => (
                    <tr key={li}>
                      {lineDim ? <th scope="row">{line.name}</th> : null}
                      {line.points.map((p, xi) => {
                        const src =
                          p &&
                          imageOf(
                            results,
                            record,
                            cell.scene,
                            scenario,
                            p.config,
                          );
                        if (!p || !src) {
                          return (
                            <td key={xi} className="sweep-grid-empty">
                              {p ? "no image" : "not run"}
                            </td>
                          );
                        }
                        const words = record
                          ? pointWords(record, cell.scene, scenario, p.config)
                          : undefined;
                        const against = referencePoint(
                          record,
                          cell.scene,
                          scenario,
                          p.config,
                        )?.against;
                        const where = coordsWords(model, p.coords);
                        return (
                          <td key={xi}>
                            <button
                              type="button"
                              className="sweep-thumb"
                              onClick={() =>
                                onOpen({
                                  scene: cell.scene,
                                  scenario,
                                  ...(against ? { a: against } : {}),
                                  b: p.config,
                                })
                              }
                              aria-label={`Compare ${where}${words ? ` (${words})` : ""}`}
                            >
                              <img src={src} alt="" loading="lazy" />
                              <span className="sweep-thumb-words">
                                {words ? (
                                  <span
                                    className={
                                      words === "within noise" ||
                                      words === "reference"
                                        ? ""
                                        : "sweep-thumb-changed"
                                    }
                                  >
                                    {sentence(words)}
                                  </span>
                                ) : null}
                                {!p.settled ? (
                                  <Badge
                                    variant="inline"
                                    size="small"
                                    color="warning"
                                    badgeContent="Not settled"
                                  />
                                ) : null}
                              </span>
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </Section>
  );
}

/** Two of a sweep's images in the Images view's compare modes. */
function CompareDialog({
  state,
  onChange,
  onClose,
  model,
  results,
  record,
}: {
  state: CompareState;
  onChange: (state: CompareState) => void;
  onClose: () => void;
  model: SweepModel;
  results: Json;
  record: ReferenceRecord | undefined;
}) {
  const tokens = useChartTokens();
  const { scene, scenario } = state;
  const withImages = model.points.filter((p) =>
    imageOf(results, record, scene, scenario, p.config),
  );
  const label = (p: SweepPoint) =>
    sentence(
      `${coordsWords(model, p.coords)}${p.reference ? " (reference)" : ""}`,
    );
  const pointOf = (config: string | undefined) =>
    model.points.find((p) => p.config === config);
  const a = pointOf(state.a) ?? withImages.find((p) => p.config !== state.b);
  const b = pointOf(state.b)!;
  const image = (p: SweepPoint) => {
    const words = record
      ? pointWords(record, scene, scenario, p.config)
      : undefined;
    return {
      src: imageOf(results, record, scene, scenario, p.config)!,
      label: label(p),
      ...(words && words !== "reference" && words !== "not compared"
        ? { detail: words }
        : {}),
    };
  };
  const entry = referencePoint(record, scene, scenario, b.config);
  const heatmap =
    entry?.heatmap && entry.against === a?.config && results?.assets
      ? `${results.assets}${entry.heatmap}`
      : undefined;
  const options = withImages.map((p) => [p.config, label(p)] as const);
  const regions = entry?.regions ?? {};
  return (
    <Dialog
      open
      onClose={onClose}
      fullWidth
      maxWidth="lg"
      aria-labelledby="sweep-compare-title"
    >
      <DialogTitle id="sweep-compare-title">Compare two points</DialogTitle>
      <DialogContent className={`sweep-compare ${tokens}`}>
        <div className="sweep-compare-pickers">
          <Choice
            label="Left"
            minWidth={260}
            value={a?.config}
            options={options}
            onChange={(v) => onChange({ ...state, a: v })}
          />
          <Choice
            label="Right"
            minWidth={260}
            value={b.config}
            options={options}
            onChange={(v) => onChange({ ...state, b: v })}
          />
        </div>
        {entry?.regions && entry.against === a?.config ? (
          <Typography variant="body-sm" color="textSecondary" render={<p />}>
            Against its reference:{" "}
            {Object.entries(regions)
              .map(
                ([name, d]) =>
                  `${name === WHOLE ? "whole image" : `crop “${name}”`} ${percent(d.share)} of pixels changed, FLIP ${d.flip?.toFixed(3) ?? "–"}${
                    pointWords(record, scene, scenario, b.config, name) ===
                    "within noise"
                      ? " (within noise)"
                      : ""
                  }`,
              )
              .join("; ")}
            .
          </Typography>
        ) : null}
        <ImageCompare
          a={a ? image(a) : undefined}
          b={image(b)}
          {...(heatmap ? { heatmap } : {})}
          initial="swipe"
        />
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" onClick={onClose}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
