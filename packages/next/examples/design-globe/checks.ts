// The design globe's checks (plan 4b Task 17): every value the page shows,
// compared with the generator's exact answer (answers.json), and the survey
// mark's zone 3 coordinates, as PROJ gives them, compared with NGS's
// datasheet. The check panel (Task 20) draws these rows.
import type { PlacementMode } from "../../src/engineering/placement.ts";
import type { Answers } from "./answers.ts";
import { stationText, unitSymbol } from "./measureModel.ts";

/**
 * How a shown value was obtained, which sets its tolerance: an exact snap
 * (1e-6 design units), a mesh vertex (1e-4 m, in design units) or a pick
 * (its stated tolerance).
 */
export type CheckBasis = "exact" | "vertex" | "pick";

/** One comparison. */
export interface CheckRow {
  readonly id: string;
  readonly label: string;
  /** "ftUS" (design units) or "m". */
  readonly unit: string;
  /** What the page shows; absent when it doesn't show it. */
  readonly shown?: number;
  readonly expected: number;
  /** In `unit`: |shown − expected| within it passes. */
  readonly tolerance: number;
  readonly status: "pass" | "fail" | "not-shown";
  readonly basis: CheckBasis;
  /**
   * What `expected` is: the generator's exact answer, or a published
   * reference (NGS's datasheet).
   */
  readonly kind: "exact answer" | "published reference";
}

/** What the page shows, by answer. */
export interface ShownValues {
  /** By index into `answers.points`. */
  readonly points: Map<
    number,
    {
      readonly design?: Float64Array;
      readonly station?: number;
      readonly offset?: number;
      readonly basis: CheckBasis;
      /** Metres; a pick's stated tolerance. */
      readonly tolerance?: number;
    }
  >;
  /** By `answers.pairs[].id`. */
  readonly pairs: Map<
    string,
    {
      /** Design units. */
      readonly designDistance?: number;
      readonly horizontalDistance?: number;
      /** Metres. */
      readonly trueDistance?: number;
      readonly basis: CheckBasis;
      /** Metres; a pick's stated tolerance (for the distance, both ends'). */
      readonly tolerance?: number;
    }
  >;
  /**
   * The station 170,000 marker's separation as shown, in metres, and the
   * placement it is shown in: the rigid one's is `answers.marker.separation`,
   * the reprojected one's 0.
   */
  marker?: {
    readonly separation?: number;
    readonly mode: PlacementMode;
    readonly basis: CheckBasis;
    readonly tolerance?: number;
  };
  /** PROJ's zone 3 easting and northing for the survey mark, design units. */
  mark?: { readonly easting?: number; readonly northing?: number };
}

/** An exact snap's tolerance, design units (Global Constraints). */
export const EXACT_TOLERANCE = 1e-6;
/** A vertex's tolerance, metres (spec §10's round trip). */
export const VERTEX_TOLERANCE_M = 1e-4;
/**
 * The datasheet's stated precision for its zone 3 coordinates in US survey
 * feet, ftUS: they are published to 0.01 sFT (half of it, 0.005), and are
 * converted from the metric ones, which are rounded to the millimetre first
 * (half a millimetre, 0.00164 ftUS). HS5109's northing shows it: 632,517.990
 * m is 2,075,186.1058 sFT, published as .11, where the unrounded northing
 * (PROJ's, 632,517.98969 m) is 2,075,186.1049.
 */
export const MARK_SPC_TOLERANCE = 0.005 + (0.0005 * 3937) / 1200;

/** A tolerance in metres for a basis (a pick's must be stated). */
function metres(
  basis: CheckBasis,
  stated: number | undefined,
  mpu: number,
  id: string,
): number {
  switch (basis) {
    case "exact":
      return EXACT_TOLERANCE * mpu;
    case "vertex":
      return VERTEX_TOLERANCE_M;
    case "pick":
      if (!(stated !== undefined && Number.isFinite(stated) && stated >= 0)) {
        throw new Error(
          `checkRows: ${id} is a pick with no stated tolerance (metres)`,
        );
      }
      return stated;
  }
}

/** The tolerance in design units (exact: 1e-6 itself, not via metres). */
function design(
  basis: CheckBasis,
  stated: number | undefined,
  mpu: number,
  id: string,
): number {
  return basis === "exact"
    ? EXACT_TOLERANCE
    : metres(basis, stated, mpu, id) / mpu;
}

function compare(
  fields: Omit<CheckRow, "status" | "shown">,
  shown: number | undefined,
): CheckRow {
  return {
    ...fields,
    ...(shown !== undefined && { shown }),
    status:
      shown === undefined
        ? "not-shown"
        : Math.abs(shown - fields.expected) <= fields.tolerance
          ? "pass"
          : "fail",
  };
}

/** "Sta. 450+00.000, 35 ftUS right". */
function where(station: number, offset: number, symbol: string): string {
  const side =
    offset === 0
      ? "on the centreline"
      : `${Math.abs(offset)} ${symbol} ${offset > 0 ? "right" : "left"}`;
  return `Sta. ${stationText(station)}, ${side}`;
}

/**
 * The check rows for what the page shows: for each shown point, its
 * easting, northing, height, station and offset; for every pair, its 3D
 * and horizontal design distances and its true distance; the station
 * 170,000 marker's separation; and the survey mark's zone 3 easting and
 * northing against the datasheet ("published reference"). A value the
 * page doesn't show is "not-shown"; points it doesn't show have no rows.
 *
 * Tolerances by basis: exact, 1e-6 design units; vertex, 1e-4 m; pick, the
 * stated tolerance (metres). Throws for a shown point or pair that isn't an
 * answer, and for a pick with no stated tolerance.
 */
export function checkRows(answers: Answers, shown: ShownValues): CheckRow[] {
  const mpu = answers.frame.metersPerUnit;
  const symbol = unitSymbol(answers.frame.unitName);
  const rows: CheckRow[] = [];
  const kind = "exact answer";

  for (const [index, value] of shown.points) {
    const point = answers.points[index];
    if (point === undefined) {
      throw new Error(
        `checkRows: shown point ${index} isn't one of answers.points (0 to ${answers.points.length - 1})`,
      );
    }
    const id = `point.${index}`;
    const tolerance = design(value.basis, value.tolerance, mpu, id);
    const label = where(point.station, point.offset, symbol);
    const fields = [
      ["easting", "easting", point.design[0], value.design?.[0]],
      ["northing", "northing", point.design[1], value.design?.[1]],
      ["height", "NAVD88 height", point.design[2], value.design?.[2]],
      ["station", "station", point.station, value.station],
      ["offset", "offset", point.offset, value.offset],
    ] as const;
    for (const [name, what, expected, got] of fields) {
      rows.push(
        compare(
          {
            id: `${id}.${name}`,
            label: `${label}: ${what}`,
            unit: symbol,
            expected,
            tolerance,
            basis: value.basis,
            kind,
          },
          got,
        ),
      );
    }
  }

  for (const id of shown.pairs.keys()) {
    if (!answers.pairs.some((p) => p.id === id)) {
      throw new Error(
        `checkRows: shown pair "${id}" isn't one of answers.pairs`,
      );
    }
  }
  for (const pair of answers.pairs) {
    const value = shown.pairs.get(pair.id);
    const basis = value?.basis ?? "exact";
    const id = `pair.${pair.id}`;
    const inDesign = design(basis, value?.tolerance, mpu, id);
    const inMetres = metres(basis, value?.tolerance, mpu, id);
    const common = { basis, kind } as const;
    rows.push(
      compare(
        {
          ...common,
          id: `${id}.design`,
          label: `${pair.label}: design distance (3D)`,
          unit: symbol,
          expected: pair.designDistance,
          tolerance: inDesign,
        },
        value?.designDistance,
      ),
      compare(
        {
          ...common,
          id: `${id}.horizontal`,
          label: `${pair.label}: horizontal design distance`,
          unit: symbol,
          expected: pair.horizontalDistance,
          tolerance: inDesign,
        },
        value?.horizontalDistance,
      ),
      compare(
        {
          ...common,
          id: `${id}.true`,
          label: `${pair.label}: true distance`,
          unit: "m",
          expected: pair.trueDistance,
          tolerance: inMetres,
        },
        value?.trueDistance,
      ),
    );
  }

  const marker = shown.marker;
  const markerBasis = marker?.basis ?? "exact";
  const mode = marker?.mode ?? "rigid";
  rows.push(
    compare(
      {
        id: "marker.separation",
        label: `Sta. ${stationText(answers.marker.station)} marker: drawn to true, ${mode}`,
        unit: "m",
        expected: mode === "rigid" ? answers.marker.separation : 0,
        tolerance: metres(markerBasis, marker?.tolerance, mpu, "marker"),
        basis: markerBasis,
        kind,
      },
      marker?.separation,
    ),
  );

  const mark = answers.mark;
  const published = { basis: "exact", kind: "published reference" } as const;
  rows.push(
    compare(
      {
        ...published,
        id: "mark.easting",
        label: `${mark.pid} ${mark.name}: zone 3 easting against NGS's datasheet`,
        unit: symbol,
        expected: mark.publishedSpc.easting,
        tolerance: MARK_SPC_TOLERANCE,
      },
      shown.mark?.easting,
    ),
    compare(
      {
        ...published,
        id: "mark.northing",
        label: `${mark.pid} ${mark.name}: zone 3 northing against NGS's datasheet`,
        unit: symbol,
        expected: mark.publishedSpc.northing,
        tolerance: MARK_SPC_TOLERANCE,
      },
      shown.mark?.northing,
    ),
  );
  return rows;
}
