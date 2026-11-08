// The design globe's measurement model (plan 4b Task 17): what the measure
// panel shows for two snapped points and `measure`'s result, as display
// strings, following the frames explorer's DESIGN.md, "Copy and numbers":
// units always and named ("ftUS", not "ft"), thousands separators, one
// unit per magnitude, the true (ground) distance beside the design one and
// never instead of it, and "±" on every accuracy, a 1σ.
//
// Design lengths are given to 0.001 design units and true lengths to the
// millimetre, the generator's answers' own precision for a checked
// distance; the combined factor in ppm to 3 significant figures (the
// panel's details, as the explorer's inspector) and tolerances and accuracy
// to 2. Heights are written in the horizontal unit's symbol: `Measurement`
// carries no height unit, and the corridor's (NAVD88 ftUS) is the same.
import type { SnapResult } from "../../src/engineering/snap.ts";
import type {
  AccuracyStatement,
  AccuracyTerm,
} from "../../src/measure/accuracy.ts";
import type { Measurement } from "../../src/measure/measure.ts";

/** One end of a measurement. */
export interface EndView {
  /** "450+00.000": absent without design coordinates or an alignment. */
  readonly station?: string;
  /** "35.000 ftUS right", "17.250 ftUS left", "0.000 ftUS". */
  readonly offset?: string;
  /** The design point's own height, in its unit: "910.000 ftUS". */
  readonly elevation?: string;
  /** What the snap landed on: "point", "segment", "arc" or "surface". */
  readonly snapKind?: string;
  /** "exact", or the snap's tolerance: "±12 mm". */
  readonly tolerance: string;
}

/** The measure panel's strings. */
export interface MeasureView {
  /** 3D, in design units: "10,002.000 ftUS" (what CAD reports). */
  readonly designDistance: string;
  /** E and N alone, in design units: "10,000.000 ftUS". */
  readonly horizontalDistance: string;
  /** b − a in E, N and height. */
  readonly delta: readonly [string, string, string];
  /** The design unit as PROJ names it: "US survey foot". */
  readonly unitName: string;
  /** The straight line between the true positions: "3,048.848 m". */
  readonly trueDistance: string;
  /** The line's mean combined factor less 1: "−71.4 ppm". */
  readonly combinedFactorPpm: string;
  /** Grid convergence: "−0°52′39.1″", or "a to b" where the ends differ. */
  readonly convergence: string;
  readonly a: EndView;
  readonly b: EndView;
  /** The 1σ: "±2.9 m (1σ)", or "not stated". */
  readonly accuracy: string;
  /** Both ends exact snaps. */
  readonly exact: boolean;
}

/** Shown in place of a design value when the ends have no design coordinates. */
export const NO_DESIGN = "no design coordinates";
const DASH = "—";
const MINUS = "−";

const SYMBOLS: Readonly<Record<string, string>> = {
  "US survey foot": "ftUS",
  foot: "ft",
  metre: "m",
  meter: "m",
};

/** A design unit's symbol from PROJ's name for it ("US survey foot" → "ftUS"). */
export function unitSymbol(unitName: string): string {
  return SYMBOLS[unitName] ?? unitName;
}

const fixedFormats = new Map<number, Intl.NumberFormat>();
const significantFormats = new Map<number, Intl.NumberFormat>();

/** `x` with `decimals` places, thousands separators and a true minus sign. */
export function fixed(x: number, decimals: number): string {
  let f = fixedFormats.get(decimals);
  if (f === undefined) {
    f = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    fixedFormats.set(decimals, f);
  }
  const text = f.format(Math.abs(x));
  // A value that rounds to zero carries no sign.
  return x < 0 && /[1-9]/.test(text) ? MINUS + text : text;
}

function significant(x: number, digits: number): string {
  let f = significantFormats.get(digits);
  if (f === undefined) {
    f = new Intl.NumberFormat("en-US", {
      minimumSignificantDigits: digits,
      maximumSignificantDigits: digits,
    });
    significantFormats.set(digits, f);
  }
  return (x < 0 ? MINUS : "") + f.format(Math.abs(x));
}

const LENGTH_UNITS: readonly (readonly [number, string])[] = [
  [1e3, "km"],
  [1, "m"],
  [1e-3, "mm"],
  [1e-6, "µm"],
  [1e-9, "nm"],
];

/**
 * A length in metres to 2 significant figures in the unit that reads best,
 * as the explorer's: km, m, mm, µm, nm (below a nanometre, nm still).
 */
export function meters(x: number): string {
  const a = Math.abs(x);
  if (a === 0) {
    return "0 m";
  }
  for (const [i, [scale, unit]] of LENGTH_UNITS.entries()) {
    const up = LENGTH_UNITS[i - 1];
    // 0.9996 m to 2 figures is 1.0 m, not 1,000 mm.
    if (
      up !== undefined &&
      Number((a / scale).toPrecision(2)) >= up[0] / scale
    ) {
      return `${significant(x / up[0], 2)} ${up[1]}`;
    }
    if (a >= scale || i === LENGTH_UNITS.length - 1) {
      return `${significant(x / scale, 2)} ${unit}`;
    }
  }
  return `${significant(x, 2)} m`;
}

/** A design length: "10,000.000 ftUS". */
const designLength = (x: number, symbol: string) => `${fixed(x, 3)} ${symbol}`;

/** A station as engineers write it, to 0.001: "450+00.000". */
export function stationText(station: number): string {
  const sign = station < 0 ? MINUS : "";
  const thousandths = Math.round(Math.abs(station) * 1000);
  const hundreds = Math.floor(thousandths / 100_000);
  const rest = (thousandths - hundreds * 100_000) / 1000;
  return `${sign}${hundreds}+${rest.toFixed(3).padStart(6, "0")}`;
}

/** An offset with its side: "35.000 ftUS right", or "0.000 ftUS". */
export function offsetText(offset: number, symbol: string): string {
  const text = designLength(Math.abs(offset), symbol);
  if (fixed(offset, 3) === fixed(0, 3)) {
    return text;
  }
  return `${text} ${offset > 0 ? "right" : "left"}`;
}

/** An angle in radians as degrees, minutes and seconds to 0.1″. */
export function dms(radians: number): string {
  const tenths = Math.round((Math.abs(radians) * 180 * 36_000) / Math.PI);
  const degrees = Math.floor(tenths / 36_000);
  const minutes = Math.floor((tenths - degrees * 36_000) / 600);
  const seconds = (tenths - degrees * 36_000 - minutes * 600) / 10;
  const sign = radians < 0 && tenths > 0 ? MINUS : "";
  return `${sign}${degrees}°${String(minutes).padStart(2, "0")}′${seconds
    .toFixed(1)
    .padStart(4, "0")}″`;
}

function end(
  snap: SnapResult,
  at: { readonly station: number; readonly offset: number } | undefined,
  symbol: string | undefined,
): EndView {
  const design = snap.design?.design;
  return {
    ...(at !== undefined &&
      symbol !== undefined && {
        station: stationText(at.station),
        offset: offsetText(at.offset, symbol),
      }),
    ...(design !== undefined &&
      symbol !== undefined &&
      design.length > 2 && { elevation: designLength(design[2]!, symbol) }),
    snapKind: snap.kind,
    tolerance:
      snap.exact && snap.tolerance === 0
        ? "exact"
        : `±${meters(snap.tolerance)}`,
  };
}

/**
 * The measure panel's strings for snaps `a` and `b` and `measure`'s result
 * between their design points (or their true positions, without design
 * coordinates: then the design values read "no design coordinates" and
 * "—", and the ends have no station, offset or elevation).
 *
 * The design distances and deltas are in the design CRS's unit (its
 * symbol, from `unitSymbol`), the true distance in metres, the combined
 * factor as the line's mean less 1 in ppm, the convergence at each end, and
 * the accuracy as the measurement's 1σ. Stations and offsets come from the
 * measurement's `alignment`; the elevation is the design point's height (in
 * the horizontal unit's symbol: the corridor's heights are NAVD88 in the
 * same US survey feet).
 */
export function measurementModel(
  a: SnapResult,
  b: SnapResult,
  measurement: Measurement,
): MeasureView {
  const design = measurement.design;
  const symbol = design === undefined ? undefined : unitSymbol(design.unitName);
  const alignment = design === undefined ? undefined : measurement.alignment;
  const accuracy = measurement.accuracy.meters;
  const convergence =
    design === undefined
      ? DASH
      : dms(design.convergence.a) === dms(design.convergence.b)
        ? dms(design.convergence.a)
        : `${dms(design.convergence.a)} to ${dms(design.convergence.b)}`;
  return {
    designDistance:
      design === undefined ? NO_DESIGN : designLength(design.distance, symbol!),
    horizontalDistance:
      design === undefined
        ? DASH
        : designLength(design.horizontalDistance, symbol!),
    delta:
      design === undefined
        ? [DASH, DASH, DASH]
        : [
            designLength(design.delta[0]!, symbol!),
            designLength(design.delta[1]!, symbol!),
            designLength(design.delta[2]!, symbol!),
          ],
    unitName: design?.unitName ?? "",
    trueDistance: `${fixed(measurement.distance, 3)} m`,
    combinedFactorPpm:
      design === undefined
        ? DASH
        : `${significant((design.combinedFactor.mean - 1) * 1e6, 3)} ppm`,
    convergence,
    a: end(a, alignment?.a, symbol),
    b: end(b, alignment?.b, symbol),
    accuracy:
      accuracy === undefined ? "not stated" : `±${meters(accuracy)} (1σ)`,
    exact: a.exact && b.exact,
  };
}

/** A row of the accuracy's parts. */
export interface AccuracyRow {
  readonly label: string;
  readonly value: string;
}

const SOURCE_LABEL: Readonly<Record<AccuracyTerm["source"], string>> = {
  projection: "Projection",
  earthOrientation: "Earth orientation",
  pick: "Pick or snap",
  geoidFallback: "Geoid fallback",
  trajectory: "Trajectory",
  coordinateScale: "Coordinate scale",
  relativity: "Relativity",
  lightTime: "Light time",
  ephemeris: "Ephemeris",
};

/** A term's end ("a", "b") and its note without the "End a: " prefix. */
function termEnd(term: AccuracyTerm): { end?: "a" | "b"; note: string } {
  const m = /^End ([ab]):\s*/.exec(term.note);
  return m
    ? { end: m[1] as "a" | "b", note: term.note.slice(m[0].length) }
    : { note: term.note };
}

/** "PROJ's stated accuracy for the design CRS's operation (grid.tif)". */
function projectionWhat(note: string): string {
  const grids = /PROJ operation \(([^)]*)\)/.exec(note)?.[1];
  return `PROJ's stated accuracy for the design CRS's operation${grids !== undefined && grids !== "no grids" ? ` (${grids})` : ""}`;
}

/** A term's row: its source, its end, its size and what it is. */
function termRow(term: AccuracyTerm, where?: string): AccuracyRow {
  const { end, note } = termEnd(term);
  const size =
    term.meters === undefined ? "not stated" : `±${meters(term.meters)}`;
  const what = term.source === "projection" ? projectionWhat(note) : note;
  return {
    label: `${SOURCE_LABEL[term.source]}${where ?? (end ? ` at ${end.toUpperCase()}` : "")}`,
    value: `${size}: ${what}`,
  };
}

/** Terms that move both ends of a line on one grid together. */
const COMMON: ReadonlySet<AccuracyTerm["source"]> = new Set([
  "projection",
  "earthOrientation",
  "geoidFallback",
]);

/**
 * A measurement's accuracy with its parts. When both ends are design points
 * on one grid (the same operation, the same stated figure), the statement's
 * total is each end's absolute accuracy, not the distance's: the grid's
 * error is common to both ends and Earth orientation turns both together,
 * so neither enters the distance between them. The rows then say so: the
 * distance's own figure from what is the ends' alone (the snaps and picks),
 * each end's position on the globe, and the parts, a common one once.
 * Otherwise (ends in different frames, or not design points) the total is
 * the parts combined as independent, as the statement gives it. A term of
 * unknown size reads "not stated", and makes the total so.
 */
export function accuracyRows(statement: AccuracyStatement): AccuracyRow[] {
  const terms = statement.terms;
  const projection = terms.filter((t) => t.source === "projection");
  const grids = (t: AccuracyTerm) =>
    /PROJ operation \(([^)]*)\)/.exec(t.note)?.[1];
  const oneGrid =
    projection.length === 2 &&
    projection[0]!.meters !== undefined &&
    projection[0]!.meters === projection[1]!.meters &&
    grids(projection[0]!) === grids(projection[1]!) &&
    termEnd(projection[0]!).end !== termEnd(projection[1]!).end &&
    terms.every((t) => COMMON.has(t.source) || t.source === "pick");
  const notes = statement.warnings.map((w) => ({ label: "Note", value: w }));
  if (!oneGrid) {
    const total =
      statement.meters === undefined
        ? "not stated (a part's size isn't known)"
        : `±${meters(statement.meters)} (1σ)`;
    return [
      {
        label: "Accuracy",
        value: `${total}, of the true distance: the parts below, combined as independent`,
      },
      ...terms.map((t) => termRow(t)),
      ...notes,
    ];
  }
  const own = terms.filter((t) => t.source === "pick");
  const ownKnown = own.every((t) => t.meters !== undefined);
  const ownTotal = Math.hypot(...own.map((t) => t.meters ?? 0));
  const shared =
    "The grid's error is common to both ends and Earth orientation turns both together, so neither enters the distance. PROJ states no figure for how much the grid varies between them.";
  const distance =
    own.length === 0
      ? `Far finer than either end's position: the ends are design points as given, with no snap. ${shared}`
      : ownKnown
        ? `±${meters(ownTotal)} (1σ): the ends' snaps and picks, combined as independent. ${shared}`
        : `Not stated: a snap's size isn't known. ${shared}`;
  const endA = terms.filter(
    (t) => COMMON.has(t.source) && termEnd(t).end === "a",
  );
  const absolute = endA.every((t) => t.meters !== undefined)
    ? `±${meters(Math.hypot(...endA.map((t) => t.meters!)))} (1σ)`
    : "not stated (a part's size isn't known)";
  const rows: AccuracyRow[] = [
    { label: "The distance", value: distance },
    {
      label: "Each end's position",
      value: `${absolute} on the globe: the common parts below. It is where each end is, not the distance between them.`,
    },
  ];
  // A common term once ("both ends"), where both ends state the same.
  const said = new Set<string>();
  for (const t of terms) {
    if (!COMMON.has(t.source)) {
      rows.push(termRow(t));
      continue;
    }
    const twin = terms.find(
      (u) =>
        u !== t && u.source === t.source && termEnd(u).end !== termEnd(t).end,
    );
    if (twin === undefined) {
      rows.push(termRow(t));
    } else if (!said.has(t.source)) {
      said.add(t.source);
      // Both ends' sizes, the larger said (they differ in the last digits).
      const most =
        t.meters === undefined || twin.meters === undefined
          ? undefined
          : Math.max(t.meters, twin.meters);
      rows.push(termRow({ ...t, meters: most }, ", each end"));
    }
  }
  return [...rows, ...notes];
}
