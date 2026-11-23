// The sweep view's model (views/SweepView.tsx, CS-395), apart from the page
// so tests read it without a browser: a sweep run's dimensions (its axes,
// and its engines when it swept several), where each goes (the x axis,
// lines, panels, or held at one value), and per metric the panels' lines
// with each point's value, whether it settled, and whether its image is
// within the noise floor of its reference.
//
// docs/superpowers/plans/2026-11-13-dyno-dev-harness.md, section 4, "The
// sweep view".
import { EXAMPLES } from "../../../examples/index.ts";
import { cellKey, type Cell, type Summary } from "../data.ts";
import { compareEngines, engineLabel, isRelease } from "../engines.mjs";
import {
  differenceWords,
  floorFor,
  noFloorWords,
  verdict,
  WHOLE,
  type Difference,
  type ReferenceRecord,
} from "../reference.mjs";
import {
  findSetting,
  readSweep,
  type SettingValue,
  type SweepReference,
} from "../settings.mjs";

/** The engine as a dimension, when a sweep ran several. */
export const ENGINE = "engine";
/** Every scene, as one choice (the geometric mean). */
export const ALL = "*";
/** A cell's scenario when it names none (the catalog's default). */
export const DEFAULT_SCENARIO = "cold-orbit";
export const scenarioOf = (c: { scenario?: string }) =>
  c.scenario ?? DEFAULT_SCENARIO;

export interface Dimension {
  id: string;
  /** What the setting is, in words ("error exponent"). */
  label: string;
  values: SettingValue[];
  /** Each value as shown ("0.5", "on", "2.0 · main"). */
  names: string[];
}

export interface SweepPoint {
  /** The point's coordinates, the engine's too when it is a dimension. */
  coords: Record<string, SettingValue>;
  config: string;
  /** A reference point (it sets the noise floor). */
  reference: boolean;
}

export interface SweepModel {
  dims: Dimension[];
  reference?: SweepReference & { label: string; name: string };
  /** The grid's points, then a reference outside the grid's. */
  points: SweepPoint[];
  /** An engine outside the sweep, drawn as a dashed line (release sweeps). */
  baseline?: string;
  /** The scenes the run measured, by cell key. */
  scenes: string[];
  /** Whether its scenes record settling (example scenes): hollow points. */
  settles: boolean;
}

/** A setting's name in words: the registry's, an example's, or its id. */
export function dimensionLabel(id: string): string {
  if (id === ENGINE) {
    return "engine";
  }
  const setting = findSetting(id);
  if (setting && !id.startsWith("param.")) {
    return setting.label;
  }
  const name = id.slice("param.".length);
  for (const example of EXAMPLES) {
    const p = example.params?.find((x) => x.name === name);
    if (p) {
      return p.label;
    }
  }
  return setting?.label ?? id;
}

const valueName = (id: string, v: SettingValue) =>
  id === ENGINE
    ? engineLabel(String(v))
    : typeof v === "boolean"
      ? v
        ? "on"
        : "off"
      : String(v);

function dimension(id: string, values: SettingValue[]): Dimension {
  return {
    id,
    label: dimensionLabel(id),
    values,
    names: values.map((v) => valueName(id, v)),
  };
}

/**
 * A run's sweep as dimensions and points: a settings sweep (either form
 * of the record, settings.mjs), or several CesiumJS releases. Undefined
 * for a run that swept nothing.
 */
export function sweepModelOf(s: Summary): SweepModel | undefined {
  const scenes = [...new Set(s.scenes.map(cellKey))];
  const settles = s.scenes.some((c) => !!c.metrics.settled);
  const sweep = readSweep(s.sweep);
  if (sweep?.axes.length) {
    const engines = sweep.engines.length ? sweep.engines : [undefined];
    const several = engines.length > 1;
    const dims = sweep.axes.map((a) => dimension(a.id, a.values));
    if (several) {
      dims.push(dimension(ENGINE, engines as string[]));
    }
    const points: SweepPoint[] = [];
    for (const p of sweep.points) {
      engines.forEach((engine, i) => {
        const config = p.configs[i];
        if (config === undefined) {
          return;
        }
        points.push({
          coords: several ? { ...p.coords, [ENGINE]: engine! } : p.coords,
          config,
          reference: !!p.reference,
        });
      });
    }
    const ref = sweep.reference;
    return {
      dims,
      points,
      scenes,
      settles,
      ...(ref
        ? {
            reference: {
              ...ref,
              label: dimensionLabel(ref.id),
              name: valueName(ref.id, ref.value),
            },
          }
        : {}),
    };
  }
  const releases = s.configs.filter(isRelease).sort(compareEngines);
  if (releases.length >= 2) {
    const dim = {
      ...dimension(ENGINE, releases),
      label: "CesiumJS release",
    };
    return {
      dims: [dim],
      points: releases.map((config) => ({
        coords: { [ENGINE]: config },
        config,
        reference: false,
      })),
      scenes,
      settles,
      ...(s.candidate ? { baseline: s.candidate } : {}),
    };
  }
  return undefined;
}

export interface Layout {
  x: string;
  lines?: string;
  panels?: string;
  /** The value each other dimension is held at. */
  held: Record<string, SettingValue>;
}

/**
 * Where each dimension goes by default: the reference axis along x (the
 * difference is measured along it), else the one with the most values;
 * then lines and panels by the next ones; the rest held at their first
 * value.
 */
export function defaultLayout(model: SweepModel): Layout {
  const order = [...model.dims].sort(
    (a, b) => b.values.length - a.values.length,
  );
  const ref =
    model.reference && !model.reference.outside
      ? order.find((d) => d.id === model.reference!.id)
      : undefined;
  const rest = order.filter((d) => d !== ref);
  const [x, lines, panels, ...held] = ref ? [ref, ...rest] : rest;
  return {
    x: x!.id,
    ...(lines ? { lines: lines.id } : {}),
    ...(panels ? { panels: panels.id } : {}),
    held: Object.fromEntries(held.map((d) => [d.id, d.values[0]!])),
  };
}

/** A layout with one dimension moved to a role, the others kept apart. */
export function moveDimension(
  model: SweepModel,
  layout: Layout,
  role: "x" | "lines" | "panels",
  id: string | undefined,
): Layout {
  const roles: Record<"x" | "lines" | "panels", string | undefined> = {
    x: layout.x,
    lines: layout.lines,
    panels: layout.panels,
  };
  const before = roles[role];
  if (id && id === before) {
    return layout;
  }
  // The dimension that held this role swaps into the one `id` left.
  for (const r of ["x", "lines", "panels"] as const) {
    if (r !== role && id && roles[r] === id) {
      roles[r] = before;
    }
  }
  roles[role] = id;
  if (!roles.x) {
    return layout;
  }
  const placed = new Set([roles.x, roles.lines, roles.panels]);
  const held = Object.fromEntries(
    model.dims
      .filter((d) => !placed.has(d.id))
      .map((d) => [d.id, layout.held[d.id] ?? d.values[0]!]),
  );
  return {
    x: roles.x,
    ...(roles.lines ? { lines: roles.lines } : {}),
    ...(roles.panels ? { panels: roles.panels } : {}),
    held,
  };
}

/** One point as a chart and its table twin show it. */
export interface PointValue {
  config: string;
  coords: Record<string, SettingValue>;
  reference: boolean;
  value?: number;
  /** False when any of its repetitions in the scenes shown didn't settle. */
  settled: boolean;
}

export interface Line {
  name: string;
  /** A line of reference points (dashed). */
  reference: boolean;
  /** The reference outside the grid beside the line before it (its color). */
  companion?: boolean;
  /** Per x value, the point there, if the sweep ran it. */
  points: Array<PointValue | undefined>;
}

export interface Panel {
  /** The panel's value of the panels dimension; one panel without one. */
  name?: string;
  reference: boolean;
  lines: Line[];
}

const dimOf = (model: SweepModel, id: string) =>
  model.dims.find((d) => d.id === id)!;

const sameValue = (a: SettingValue | undefined, b: SettingValue | undefined) =>
  a === b;

/** The cells of a configuration in the scenes shown. */
export function cellsOf(s: Summary, config: string, scene: string): Cell[] {
  return s.scenes.filter(
    (c) => c.config === config && (scene === ALL || cellKey(c) === scene),
  );
}

/** Image metrics average (they can be 0); the others take the geometric mean. */
export const isImageMetric = (metric: string) =>
  /^(pixelDiff|flipRef)/.test(metric);

/**
 * A configuration's value of a metric in the scenes shown: the scene's
 * median, or over every scene the geometric mean of the medians (the
 * mean, for image metrics); and whether every repetition settled.
 */
export function pointValue(
  s: Summary,
  config: string,
  metric: string,
  scene: string,
): { value?: number; settled: boolean } {
  const cells = cellsOf(s, config, scene);
  const settled = !cells.some((c) => c.metrics.settled?.values.includes(0));
  const medians = cells
    .map((c) => c.metrics[metric]?.median)
    .filter((v): v is number => Number.isFinite(v));
  if (!medians.length) {
    return { settled };
  }
  if (scene !== ALL || medians.length === 1) {
    return { value: medians[0], settled };
  }
  if (isImageMetric(metric)) {
    return {
      value: medians.reduce((a, v) => a + v, 0) / medians.length,
      settled,
    };
  }
  const positive = medians.filter((v) => v > 0);
  return {
    value: positive.length
      ? Math.exp(
          positive.reduce((a, v) => a + Math.log(v), 0) / positive.length,
        )
      : 0,
    settled,
  };
}

/**
 * The panels for one metric: per value of the panels dimension a panel,
 * per value of the lines dimension a line, per x value its point, with
 * every held dimension at its value. A reference outside the grid adds a
 * dashed reference line beside each line.
 */
export function arrange(
  s: Summary,
  model: SweepModel,
  layout: Layout,
  metric: string,
  scene: string,
): Panel[] {
  const x = dimOf(model, layout.x);
  const lines = layout.lines ? dimOf(model, layout.lines) : undefined;
  const panels = layout.panels ? dimOf(model, layout.panels) : undefined;
  const ref = model.reference;
  const outside = ref?.outside;
  const held = (p: SweepPoint) =>
    Object.entries(layout.held).every(([id, v]) => sameValue(p.coords[id], v));
  const at = (
    p: SweepPoint,
    panel: SettingValue | undefined,
    line: SettingValue | undefined,
  ) =>
    held(p) &&
    (!panels || sameValue(p.coords[panels.id], panel)) &&
    (!lines || sameValue(p.coords[lines.id], line));
  const grid = model.points.filter((p) => !(outside && p.reference));
  const extra = model.points.filter((p) => outside && p.reference);
  const valueAt = (p: SweepPoint | undefined): PointValue | undefined =>
    p && {
      config: p.config,
      coords: p.coords,
      reference: p.reference,
      ...pointValue(s, p.config, metric, scene),
    };
  const lineOf = (
    pool: SweepPoint[],
    panel: SettingValue | undefined,
    line: SettingValue | undefined,
  ) =>
    x.values.map((v) =>
      valueAt(
        pool.find((p) => at(p, panel, line) && sameValue(p.coords[x.id], v)),
      ),
    );
  return (panels?.values ?? [undefined]).map((panel, pi) => ({
    ...(panels ? { name: panels.names[pi] } : {}),
    reference:
      !!ref &&
      !outside &&
      !!panels &&
      ref.id === panels.id &&
      ref.value === panel,
    lines: (lines?.values ?? [undefined]).flatMap((line, li) => {
      const name = lines ? lines.names[li]! : "";
      const main: Line = {
        name,
        reference:
          !!ref &&
          !outside &&
          !!lines &&
          ref.id === lines.id &&
          ref.value === line,
        points: lineOf(grid, panel, line),
      };
      if (!extra.length) {
        return [main];
      }
      return [
        main,
        {
          name: name
            ? `${name}, ${ref!.label} ${ref!.name}`
            : `${ref!.label} ${ref!.name}`,
          reference: true,
          companion: true,
          points: lineOf(extra, panel, line),
        },
      ];
    }),
  }));
}

/** The noise floor field a reference metric is held against. */
export function floorField(metric: string): keyof Difference | undefined {
  const base = metric.split(".")[0];
  return (
    {
      pixelDiffShare: "share",
      pixelDiffMean: "mean",
      flipRef: "flip",
      flipRefP95: "flipP95",
    } as const
  )[base as "pixelDiffShare"];
}

/** A reference metric's region: the crop after the dot, or the whole image. */
export const regionOf = (metric: string) => metric.split(".")[1] ?? WHOLE;

/** The scenes and scenarios shown: one scene's, or every scene's. */
export function shownScenes(
  s: Summary,
  scene: string,
): Array<{ scene: string; scenario: string }> {
  const seen = new Map<string, { scene: string; scenario: string }>();
  for (const c of s.scenes) {
    if (scene === ALL || cellKey(c) === scene) {
      seen.set(`${c.scene}|${scenarioOf(c)}`, {
        scene: c.scene,
        scenario: scenarioOf(c),
      });
    }
  }
  return [...seen.values()];
}

/** A point's image entry in the reference record, for one scene. */
export function referencePoint(
  record: ReferenceRecord | undefined,
  scene: string,
  scenario: string,
  config: string,
) {
  return record?.points.find(
    (p) => p.scene === scene && p.scenario === scenario && p.config === config,
  );
}

/**
 * A point's verdict on one metric in the scenes shown, by the one rule
 * (reference.mjs, `verdict`): each scene's difference in the metric's
 * region and field against the point's own reference's floor. `judged`
 * counts the scenes with a floor, `within` those within it; `floor` (one
 * scene only, for the chart's band) is that floor's value, and `noFloor`
 * why one scene has none.
 */
export interface PointVerdict {
  reference: boolean;
  scenes: number;
  judged: number;
  within: number;
  pairs: number[];
  pooled: boolean;
  floor?: number;
  noFloor?: string;
}

export function pointVerdict(
  record: ReferenceRecord | undefined,
  s: Summary,
  config: string,
  metric: string,
  scene: string,
): PointVerdict | undefined {
  const field = floorField(metric);
  if (!record || !field) {
    return undefined;
  }
  const region = regionOf(metric);
  const out: PointVerdict = {
    reference: false,
    scenes: 0,
    judged: 0,
    within: 0,
    pairs: [],
    pooled: false,
  };
  const shown = shownScenes(s, scene);
  for (const at of shown) {
    const p = referencePoint(record, at.scene, at.scenario, config);
    if (!p) {
      continue;
    }
    out.scenes++;
    if (p.reference) {
      // A reference point's band is its own floor.
      out.reference = true;
      const own = floorFor(record, p)?.regions?.[region]?.[field];
      if (shown.length === 1 && Number.isFinite(own)) {
        out.floor = own;
      }
      continue;
    }
    const v = verdict(record, p, region, field);
    out.pooled ||= !!v.pooled;
    if (v.within === undefined) {
      if (shown.length === 1) {
        out.noFloor = p.mismatch ?? noFloorWords(v);
      }
      continue;
    }
    out.judged++;
    out.pairs.push(v.pairs);
    if (v.within) {
      out.within++;
    }
    if (shown.length === 1) {
      out.floor = v.floor;
    }
  }
  return out.scenes ? out : undefined;
}

/** "3 pairs", "2 to 3 pairs" (", pooled" for a pooled floor). */
function pairsText(pairs: number[], pooled: boolean) {
  const lo = Math.min(...pairs);
  const hi = Math.max(...pairs);
  return `${lo === hi ? lo : `${lo} to ${hi}`} pair${hi === 1 ? "" : "s"}${pooled ? ", pooled" : ""}`;
}

/**
 * A verdict as a table note: "reference", "within noise (3 pairs)",
 * "within noise in 1 of 2 scenes", "no floor: reference captured once",
 * or nothing for a point beyond noise in one scene.
 */
export function verdictNote(v: PointVerdict | undefined): string | undefined {
  if (!v) {
    return undefined;
  }
  if (v.reference) {
    return "reference";
  }
  if (!v.judged) {
    return `no floor${v.noFloor ? `: ${v.noFloor}` : ""}`;
  }
  if (v.scenes > 1) {
    return `within noise in ${v.within} of ${v.judged} scenes`;
  }
  return v.within
    ? `within noise (${pairsText(v.pairs, v.pooled)})`
    : undefined;
}

/**
 * A point's image difference in words for one scene and region, by its
 * own reference's floor: "within noise (3 pairs)", "4.1% of pixels",
 * "reference", "not compared".
 */
export function pointWords(
  record: ReferenceRecord | undefined,
  scene: string,
  scenario: string,
  config: string,
  region = WHOLE,
): string {
  const p = referencePoint(record, scene, scenario, config);
  if (!p) {
    return "not compared";
  }
  return differenceWords(p.regions?.[region], verdict(record, p, region), {
    reference: !!p.reference,
    ...(p.mismatch ? { mismatch: p.mismatch } : {}),
  });
}

/** A point's coordinates in words, the dimensions given ("x 4, α 0.5"). */
export function coordsWords(
  model: SweepModel,
  coords: Record<string, SettingValue>,
): string {
  return model.dims
    .filter((d) => coords[d.id] !== undefined)
    .map((d) => `${d.label} ${valueName(d.id, coords[d.id]!)}`)
    .join(", ");
}

/** The metrics a sweep's cells carry, in the groups the view offers. */
export const METRIC_GROUPS: Array<{
  id: string;
  label: string;
  metrics: (keys: string[]) => string[];
}> = [
  {
    id: "image",
    label: "Image",
    metrics: (keys) =>
      [
        ...["pixelDiffShare", "flipRef", "flipRefP95", "pixelDiffMean"].filter(
          (k) => keys.includes(k),
        ),
        // Each crop's pixels changed, then its FLIP.
        ...[
          ...new Set(
            keys
              .filter((k) => /^(pixelDiffShare|flipRef)\./.test(k))
              .map((k) => k.slice(k.indexOf(".") + 1)),
          ),
        ]
          .sort()
          .flatMap((crop) =>
            [`pixelDiffShare.${crop}`, `flipRef.${crop}`].filter((k) =>
              keys.includes(k),
            ),
          ),
        // Against the run's baseline configuration: in a sweep that is one
        // of its own points, so only without reference images.
        ...(keys.includes("pixelDiffShare") ? [] : ["flipEnd"]),
        "motionFlip",
      ].filter((k) => keys.includes(k)),
  },
  {
    id: "tiles",
    label: "Tiles and triangles",
    metrics: (keys) => [
      ...["triangles", "draws", "trianglesTerrainOnly"].filter((k) =>
        keys.includes(k),
      ),
      ...keys.filter((k) => /^(tiles|tilesKnown)\./.test(k)).sort(),
      ...[
        "stretchedErrorMax",
        "stretchedErrorP99",
        "stretchedErrorOver",
      ].filter((k) => keys.includes(k)),
    ],
  },
  {
    id: "requests",
    label: "Requests and bytes",
    metrics: (keys) => [
      ...["requests", "bytes", "requestRateEnd"].filter((k) =>
        keys.includes(k),
      ),
      ...keys.filter((k) => /^(requests|bytes)\./.test(k)).sort(),
    ],
  },
  {
    id: "time",
    label: "Frame and GPU time",
    metrics: (keys) => [
      ...["cpuP50", "gpuP50", "frameP50", "frameP95"].filter((k) =>
        keys.includes(k),
      ),
      ...keys.filter((k) => /^gpuPass\./.test(k)).sort(),
    ],
  },
  {
    id: "loading",
    label: "Loading and memory",
    metrics: (keys) =>
      [
        "settleMs",
        "firstContentMs",
        "bytesLoad",
        "heapBytes",
        "bufferBytes",
      ].filter((k) => keys.includes(k)),
  },
];

/**
 * The groups with at least one metric in this run's sweep cells: `keys`
 * to chart, and `zero`, those that are 0 at every point (named, not
 * charted). Image metrics are charted even at 0: that is their answer.
 */
export function metricGroups(s: Summary, model: SweepModel) {
  const configs = new Set(model.points.map((p) => p.config));
  const cells = s.scenes.filter((c) => configs.has(c.config));
  const keys = [...new Set(cells.flatMap((c) => Object.keys(c.metrics)))];
  const zero = (k: string) =>
    !isImageMetric(k) && cells.every((c) => !c.metrics[k]?.median);
  return METRIC_GROUPS.map((g) => {
    const all = g.metrics(keys);
    return {
      ...g,
      keys: all.filter((k) => !zero(k)),
      zero: all.filter(zero),
    };
  }).filter((g) => g.keys.length);
}

/** Each line's color index: a companion reference shares its line's. */
export function colorIndexes(lines: Line[]): number[] {
  let k = -1;
  return lines.map((l) => (l.companion ? Math.max(0, k) : ++k));
}

/**
 * The image answer for the scenes shown, by the one rule: per region, how
 * many compared points are within their own reference's floor, on how
 * many pairs, and which are not (with their words); the scenes with no
 * floor at all, and why; whether the floors are pooled (a record from
 * before per-reference floors). Undefined without reference images.
 */
export interface NoiseAnswer {
  pooled: boolean;
  noFloor: Array<{ scene: string; scenario: string; why: string }>;
  regions: Array<{
    region: string;
    compared: number;
    within: number;
    pairs: number[];
    beyond: Array<{ config: string; scene: string; words: string }>;
  }>;
}

export function noiseSummary(
  record: ReferenceRecord | undefined,
  s: Summary,
  model: SweepModel,
  scene: string,
): NoiseAnswer | undefined {
  if (!record) {
    return undefined;
  }
  const shown = shownScenes(s, scene);
  const at = new Set(shown.map((x) => `${x.scene}|${x.scenario}`));
  const configs = new Set(model.points.map((p) => p.config));
  const points = record.points.filter(
    (p) =>
      !p.reference &&
      configs.has(p.config) &&
      at.has(`${p.scene}|${p.scenario}`),
  );
  const floors = record.floors.filter((f) =>
    at.has(`${f.scene}|${f.scenario}`),
  );
  const names = [...new Set(floors.flatMap((f) => f.regionNames ?? [WHOLE]))];
  // Scenes where no reference point has a floor, and why.
  const noFloor = shown.flatMap((x) => {
    const own = record.references?.filter(
      (r) => r.scene === x.scene && r.scenario === x.scenario,
    );
    if (own) {
      if (own.some((r) => r.regions)) {
        return [];
      }
      const r = own[0];
      return [
        {
          ...x,
          why: r
            ? noFloorWords({ captures: r.captures, expected: r.expected })
            : "no reference point was captured",
        },
      ];
    }
    const f = floors.find(
      (y) => y.scene === x.scene && y.scenario === x.scenario,
    );
    return f?.regions
      ? []
      : [{ ...x, why: noFloorWords({ expected: f?.reps ?? 1, captures: 1 }) }];
  });
  return {
    pooled: !record.references,
    noFloor,
    regions: names.map((region) => {
      const compared = points.filter((p) => p.regions?.[region] || p.mismatch);
      const verdicts = compared.map((p) => ({
        p,
        v: verdict(record, p, region),
      }));
      const within = verdicts.filter((x) => x.v.within === true);
      return {
        region,
        compared: compared.length,
        within: within.length,
        pairs: within.map((x) => x.v.pairs),
        beyond: verdicts
          .filter((x) => x.v.within !== true)
          .map(({ p }) => ({
            config: p.config,
            scene: p.scene,
            words: pointWords(record, p.scene, p.scenario, p.config, region),
          })),
      };
    }),
  };
}
