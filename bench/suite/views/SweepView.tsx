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
  metricGroups,
  moveDimension,
  noiseSummary,
  type Layout,
  type Line,
  type Panel,
  pointValue,
  pointVerdict,
  pointWords,
  scenarioOf,
  verdictNote,
  referencePoint,
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
          : v === 0
            ? "0"
            : abs >= 0.01
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
            groupNote(group.id, model, record, results, unsettled, scene),
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {group.id === "image" ? (
            <NoiseAnswer s={s} model={model} record={record} scene={scene} />
          ) : null}
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

/**
 * The image answer first: per region, how many points are within noise
 * of their reference, and which are not, in words.
 */
function NoiseAnswer({
  s,
  model,
  record,
  scene,
}: {
  s: Summary;
  model: SweepModel;
  record: ReferenceRecord | undefined;
  scene: string;
}) {
  const answer = noiseSummary(record, s, model, scene);
  if (!answer) {
    return null;
  }
  const several = model.scenes.length > 1 && scene === ALL;
  const titleOf = (sceneId: string) =>
    s.scenes.find((c) => c.scene === sceneId)?.title ?? sceneId;
  const where = (config: string, sceneId: string) => {
    const p = model.points.find((x) => x.config === config);
    return `${p ? sentence(coordsWords(model, p.coords)) : config}${several ? ` in ${titleOf(sceneId)}` : ""}`;
  };
  const pairs = (list: number[]) => {
    const lo = Math.min(...list);
    const hi = Math.max(...list);
    return `${lo === hi ? lo : `${lo} to ${hi}`} pair${hi === 1 ? "" : "s"} each`;
  };
  const items = answer.regions
    .filter((r) => r.compared)
    .map((r) => {
      const all =
        r.compared === 1
          ? "the one compared point is"
          : r.compared === 2
            ? "both compared points are"
            : `all ${r.compared} compared points are`;
      const floors = answer.pooled
        ? "the pooled floor"
        : `its own reference's floor, ${pairs(r.pairs)}`;
      return (
        <li key={r.region}>
          <Typography variant="body-md" render={<span />}>
            <b>{r.region === WHOLE ? "Whole image" : `Crop “${r.region}”`}:</b>{" "}
            {r.within === r.compared
              ? `${all} within noise (each judged by ${floors}).`
              : `${r.within} of ${r.compared} within noise${r.within ? ` (${floors})` : ""}; not within it: ${r.beyond
                  .map((b) => `${where(b.config, b.scene)} (${b.words})`)
                  .join("; ")}.`}
          </Typography>
        </li>
      );
    });
  return (
    <>
      {answer.noFloor.length ? (
        <Typography
          variant="body-md"
          render={<p />}
          className="sweep-answer-note"
        >
          No noise floor in{" "}
          {answer.noFloor
            .map((x) => `${titleOf(x.scene)} (${x.why})`)
            .join("; ")}
          , so no difference there can be called within noise. Run with{" "}
          <code>--reference-reps 3</code> for one.
        </Typography>
      ) : null}
      {answer.pooled && items.length ? (
        <Typography
          variant="body-sm"
          color="textSecondary"
          render={<p />}
          className="sweep-answer-note"
        >
          This run was recorded before each point had its own reference's floor:
          its verdicts use one floor per scene, pooled over every reference
          point and engine, so they may call too much within noise.
        </Typography>
      ) : null}
      {items.length ? <ul className="sweep-answer">{items}</ul> : null}
    </>
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
  const floored = record?.references
    ? record.references.some((r) => r.regions)
    : !!record?.floors.some((f) => f.regions);
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
            ? floored
              ? record.references
                ? "; each point is judged by its own reference point's noise floor."
                : "; its noise floor is pooled over every reference point."
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
  scene: string,
): string | undefined {
  if (id === "image") {
    if (!record) {
      return results === undefined
        ? undefined
        : "Image differences need a sweep run with --reference.";
    }
    const reps = model.reference?.reps ?? 1;
    const base = `Each point's settled view against its reference's, same engine. A pixel changes when its linear luminance moves by more than ${record.threshold}.`;
    if (reps < 2) {
      return `${base} Run with --reference-reps 3 for a noise floor.`;
    }
    const floor = record.references
      ? `The shaded band around each line is each point's noise floor: the largest difference between two of its own reference point's ${reps} captures, same engine.`
      : "The shaded band is the noise floor, pooled over every reference point (this run was recorded before per-reference floors).";
    return model.scenes.length > 1 && scene === ALL
      ? `${base} Over every scene there is no band, since each scene has its own floors; the tables count the scenes each point is within noise in.`
      : `${base} ${floor}`;
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
  // Each point's verdict, by the one rule (its own reference's floor).
  const verdicts = useMemo(() => {
    const out = new Map<string, ReturnType<typeof pointVerdict>>();
    for (const p of model.points) {
      out.set(p.config, pointVerdict(record, s, p.config, metric, scene));
    }
    return out;
  }, [record, s, model, metric, scene]);
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
    const floors = [...verdicts.values()]
      .map((v) => v?.floor)
      .filter((v): v is number => Number.isFinite(v))
      .map((v) => v / scale);
    const top = Math.max(...values, ...floors) * 1.08 || 1;
    // A record from before per-reference floors: one floor per scene.
    const pooled = [...verdicts.values()].some((v) => v?.pooled);
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
          // Each point's own noise floor, from 0 (one scene only); a
          // pooled floor is one band for the panel, below.
          band: pooled
            ? []
            : line.points.flatMap((p, xi) => {
                const f = p && verdicts.get(p.config)?.floor;
                return f !== undefined && f !== null && Number.isFinite(f)
                  ? [[xi, 0, f / scale] as [number, number, number]]
                  : [];
              }),
        })),
        hbands:
          pooled && floors.length
            ? [
                {
                  y0: 0,
                  y1: Math.max(...floors),
                  label: `Noise floor, pooled: up to ${formatValue(metric, Math.max(...floors) * scale)}`,
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
  }, [panels, verdicts, scale, unit, metric, model, layout, name, x, narrow]);
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
        verdicts={verdicts}
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
  verdicts,
}: {
  model: SweepModel;
  layout: Layout;
  metric: string;
  panels: Panel[];
  verdicts: Map<string, ReturnType<typeof pointVerdict>>;
}) {
  const x = model.dims.find((d) => d.id === layout.x)!;
  const panelDim = model.dims.find((d) => d.id === layout.panels);
  const lineDim = model.dims.find((d) => d.id === layout.lines);
  // The chart's verdicts: this metric's own field and region.
  const notes = (p: NonNullable<Line["points"][number]>) => {
    const out: string[] = [];
    const note = verdictNote(verdicts.get(p.config));
    if (note) {
      out.push(note);
    } else if (p.reference) {
      out.push("reference");
    }
    if (!p.settled) {
      out.push("not settled");
    }
    return out.map((n) => ` · ${n}`).join("");
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
                  {sentence(`${x.label} ${n}`)}
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
        scenarioOf(f) === scenario &&
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
  const scenario = scenarioOf(cell);
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
        <div className="sweep-grid-panels">
          {panels.map((panel, pi) => (
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
                          {sentence(`${x.label} ${n}`)}
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
          ))}
        </div>
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
                    pointWords(
                      record,
                      scene,
                      scenario,
                      b.config,
                      name,
                    ).startsWith("within noise")
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
