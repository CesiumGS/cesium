// CRS references and recorded PROJ operations for engineering frames.
//
// A frame resolves its PROJ operation once, when it is created, and keeps the
// operation's PROJ string for both directions (plan 4a R2). PROJ's own
// `proj_create_crs_to_crs` picks the best operation for the grids installed and
// may pick one whose grid is absent, then return the input unchanged; this
// module walks the operation list itself and takes only an operation whose
// grids are all available.
import type { PJ, ProjApi } from "./projApi.ts";

/**
 * A reference to a coordinate reference system, with the shapes of the 3D Tiles
 * 2.0 draft's `EXT_geospatial_crs` (`_wkid` and `_wkt2`; plan 4a R3).
 */
export type CrsRef =
  | {
      readonly format: "wkid";
      /** The registry, such as "EPSG" or "IAU_2015". */
      readonly authority: string;
      readonly wkid: number;
      /** The vertical CRS's code in the same registry (a compound CRS). */
      readonly vcsWkid?: number;
      /** Coordinate epoch, decimal year, for a dynamic datum. */
      readonly epoch?: number;
    }
  | { readonly format: "wkt2"; readonly wkt2: string };

/**
 * The string PROJ accepts for a reference: "EPSG:2227", "EPSG:6420+6360", or
 * WKT2. The epoch is not part of it (proj_create rejects "CRS@epoch"); an
 * operation applies it as the coordinate time (see resolveOperation).
 */
export function crsDefinition(ref: CrsRef): string {
  if (ref.format === "wkt2") {
    return ref.wkt2;
  }
  const code = `${ref.authority}:${ref.wkid}`;
  return ref.vcsWkid === undefined ? code : `${code}+${ref.vcsWkid}`;
}

/**
 * The PROJ code of the Moon's geographic CRS (plan 4a R4): IAU_2015:30100,
 * "Moon (2015) - Sphere / Ocentric", longitude and latitude on the IAU sphere
 * of radius 1,737,400 m. It is a geographic 2D CRS: proj.db 9.7.1 has no Moon
 * geographic 3D CRS (checked with `geodetic_crs.type`). An operation to it
 * passes heights through unchanged, as height above that sphere, which is the
 * USGS lunar data standard's convention.
 */
export const MOON_GEOGRAPHIC_CRS = "IAU_2015:30100";

/** Units of a CRS's axes, read from PROJ (never assumed; plan 4a R5). */
export interface CrsUnits {
  /** Whether the horizontal CRS is projected (linear axes), not geographic. */
  readonly projected: boolean;
  /** The first axis's unit (a projected CRS's easting). */
  readonly horizontalUnitName: string;
  /** Metres per horizontal unit (radians per unit for a geographic CRS). */
  readonly metersPerUnit: number;
  /** The height axis's unit, for a compound or 3D CRS. */
  readonly verticalUnitName?: string;
  readonly metersPerVerticalUnit?: number;
}

/**
 * One PROJ operation between two CRSs, fixed at creation.
 *
 * Coordinates are normalized for visualization: easting before northing and
 * longitude before latitude (degrees), then height. Inputs and outputs use each
 * CRS's own units, so `forward` takes the source's (E, N, height) in its
 * units, such as US survey feet, and returns (lon, lat, height) in degrees and
 * metres; `inverse` takes that back to the source's units.
 */
export interface RecordedOperation {
  /** The PROJ pipeline string, identical for both directions. */
  readonly pipeline: string;
  /** PROJ's stated accuracy in metres; undefined when PROJ reports none. */
  readonly accuracy: number | undefined;
  /** Grid files the operation reads (all available when it was resolved). */
  readonly grids: readonly string[];
  /** A ballpark transformation: datum differences ignored (accuracy unknown). */
  readonly ballpark: boolean;
  forward(xyz: ArrayLike<number>, out?: Float64Array): Float64Array;
  inverse(xyz: ArrayLike<number>, out?: Float64Array): Float64Array;
}

export interface ResolveOptions {
  /** A PROJ pipeline to use as is, skipping the candidate search. */
  readonly pipeline?: string;
  /** Accept a ballpark operation when no accurate one has its grids. */
  readonly allowBallpark?: boolean;
}

// proj_create does not throw for a definition it cannot build (a missing grid,
// an unknown code): it logs, and returns an empty object that proj_trans then
// passes coordinates through. An object that exists has a name or a PROJ string.
function exists(proj: ProjApi, object: PJ): boolean {
  try {
    return (
      (proj.proj_get_name(object) ?? null) !== null ||
      (proj.proj_as_proj_string(object, proj.PJ_PROJ_5) ?? null) !== null
    );
  } catch {
    return false;
  }
}

function create(proj: ProjApi, definition: string, what: string): PJ {
  const object = proj.proj_create(definition);
  if (!exists(proj, object)) {
    const shown =
      definition.length > 80 ? `${definition.slice(0, 77)}...` : definition;
    throw new Error(`PROJ could not create ${what} "${shown}"`);
  }
  return object;
}

const MAX_NAMED = 8;
function named(names: readonly string[]): string {
  const shown = names.slice(0, MAX_NAMED).join(", ");
  return names.length > MAX_NAMED
    ? `${shown} and ${names.length - MAX_NAMED} more`
    : shown;
}

/** The grid files a PROJ string names (`+grids=a.tif,@b.tif`; "@" marks optional). */
function gridsOf(pipeline: string): string[] {
  const grids: string[] = [];
  for (const match of pipeline.matchAll(/\+grids=([^\s+]+)/g)) {
    for (const name of match[1]!.split(",")) {
      grids.push(name.replace(/^@/, ""));
    }
  }
  return grids;
}

function fixed(proj: ProjApi, pipeline: string): PJ {
  return create(proj, pipeline, "the operation");
}

function transformer(
  proj: ProjApi,
  operation: PJ,
  direction: typeof proj.PJ_FWD,
  epoch: number,
): RecordedOperation["forward"] {
  return (xyz, out = new Float64Array(3)) => {
    // The source's coordinate epoch, or infinity: PROJ's "no epoch".
    const result = proj.proj_trans(
      operation,
      direction,
      proj.proj_coord(xyz[0]!, xyz[1]!, xyz[2] ?? 0, epoch),
    ).v;
    for (let i = 0; i < 3; i++) {
      const value = result[i]!;
      if (!Number.isFinite(value)) {
        throw new RangeError(
          `PROJ cannot transform (${xyz[0]}, ${xyz[1]}, ${xyz[2] ?? 0}): outside the operation's domain`,
        );
      }
      out[i] = value;
    }
    return out;
  };
}

function record(
  proj: ProjApi,
  pipeline: string,
  accuracy: number | undefined,
  grids: readonly string[],
  ballpark: boolean,
  epoch: number,
): RecordedOperation {
  const operation = fixed(proj, pipeline);
  return {
    pipeline,
    accuracy,
    grids,
    ballpark,
    forward: transformer(proj, operation, proj.PJ_FWD, epoch),
    inverse: transformer(proj, operation, proj.PJ_INV, epoch),
  };
}

/**
 * Resolves the operation from `source` to `target` (a PROJ code such as
 * "EPSG:4979", or WKT2) once, as plan 4a R2 requires.
 *
 *  - With `options.pipeline` the string is used as is; its accuracy is unknown
 *    (undefined) and it is not marked ballpark. It throws if a grid it names is
 *    missing.
 *  - Otherwise PROJ's candidate list for the pair is walked in PROJ's order
 *    (by accuracy and area of use) and the first instantiable operation whose
 *    grids all report available is taken, in its normalized-for-visualization
 *    form. A ballpark operation (PROJ names it "Ballpark ...") is taken only
 *    with `allowBallpark`, and then `accuracy` is undefined.
 *  - If none qualifies it throws, naming the grids the better candidates need.
 */
export function resolveOperation(
  proj: ProjApi,
  source: CrsRef,
  target: string,
  options: ResolveOptions = {},
): RecordedOperation {
  const { pipeline, allowBallpark = false } = options;
  // A time-dependent operation (a dynamic datum's Helmert with rates) is
  // evaluated at the source's coordinate epoch (decimal year); with none,
  // at PROJ's "no epoch" (infinity), where the rates do not apply.
  const epoch =
    source.format === "wkid" && source.epoch !== undefined
      ? source.epoch
      : Infinity;
  if (pipeline !== undefined) {
    const grids = gridsOf(pipeline);
    try {
      return record(proj, pipeline, undefined, grids, false, epoch);
    } catch (error) {
      const needs = grids.length > 0 ? `; it needs ${named(grids)}` : "";
      throw new Error(
        `The pinned PROJ pipeline cannot be created${needs} (${(error as Error).message})`,
        { cause: error },
      );
    }
  }

  const from = create(proj, crsDefinition(source), "the source CRS");
  const to = create(proj, target, "the target CRS");
  const where = `from ${crsDefinition(source)} to ${target}`;
  // For a pair PROJ cannot relate (a Moon CRS and the Earth's) the binding
  // throws "Error getting list"; an empty or null list is the same answer.
  let candidates;
  let listError: unknown;
  try {
    candidates = proj.proj_create_operations(
      from,
      to,
      proj.proj_create_operation_factory_context(""),
    );
  } catch (error) {
    candidates = null;
    listError = error;
  }
  if (!candidates || candidates.length() === 0) {
    throw new Error(
      `PROJ offers no usable operation ${where}`,
      listError === undefined ? undefined : { cause: listError },
    );
  }

  const missing = new Set<string>();
  let skippedBallpark = false;
  // Candidates PROJ cannot express as a PROJ string, named in the final error.
  const noString: string[] = [];
  const count = candidates.length();
  for (let i = 0; i < count; i++) {
    const candidate = candidates.get(i);
    const grids: string[] = [];
    let available = true;
    for (
      let g = 0;
      g < proj.proj_coordoperation_get_grid_used_count(candidate);
      g++
    ) {
      const grid = proj.proj_coordoperation_get_grid_used(candidate, g);
      grids.push(grid.short_name);
      if (!grid.available) {
        available = false;
        missing.add(grid.short_name);
      }
    }
    if (!available || !proj.proj_coordoperation_is_instantiable(candidate)) {
      continue;
    }
    const ballpark = /ballpark/i.test(proj.proj_get_name(candidate) ?? "");
    if (ballpark && !allowBallpark) {
      skippedBallpark = true;
      continue;
    }
    const string = proj.proj_as_proj_string(
      proj.proj_normalize_for_visualization(candidate),
      proj.PJ_PROJ_5,
    );
    if (string === null) {
      noString.push(proj.proj_get_name(candidate) ?? `candidate ${i}`);
      continue;
    }
    const accuracy = proj.proj_coordoperation_get_accuracy(candidate);
    return record(
      proj,
      string,
      ballpark || accuracy < 0 ? undefined : accuracy,
      grids,
      ballpark,
      epoch,
    );
  }

  if (missing.size > 0) {
    const hint = skippedBallpark
      ? "; pass allowBallpark: true to accept a ballpark transformation"
      : "";
    throw new Error(
      `No PROJ operation ${where} has all its grids; missing: ${named([...missing])}${hint}`,
    );
  }
  const lacking =
    noString.length > 0
      ? `; ${named(noString)} could not be expressed as a PROJ string`
      : "";
  throw new Error(
    skippedBallpark
      ? `PROJ offers only a ballpark operation ${where}; pass allowBallpark: true to accept it${lacking}`
      : `PROJ offers no usable operation ${where}${lacking}`,
  );
}

/**
 * The CRS a bound CRS (WKT2 BOUNDCRS, what GDAL and iModel export for a datum
 * with TOWGS84) wraps: the one that has the type, coordinate system and
 * projection. Any other CRS is returned as is. Operations are resolved from
 * the bound CRS itself, which keeps its TOWGS84 transformation.
 */
export function unbound(proj: ProjApi, crs: PJ): PJ {
  return proj.proj_get_type(crs) === proj.PJ_TYPE_BOUND_CRS
    ? proj.proj_get_source_crs(crs)
    : crs;
}

/** The horizontal (and, when there is one, vertical) units of a CRS, from PROJ. */
export function crsUnits(proj: ProjApi, ref: CrsRef): CrsUnits {
  const crs = unbound(proj, create(proj, crsDefinition(ref), "the CRS"));
  const axis = (part: PJ, index: number) =>
    proj.proj_cs_get_axis_info(
      proj.proj_crs_get_coordinate_system(part),
      index,
    );
  const compound = proj.proj_get_type(crs) === proj.PJ_TYPE_COMPOUND_CRS;
  const horizontalCrs = compound
    ? unbound(proj, proj.proj_crs_get_sub_crs(crs, 0))
    : crs;
  const horizontal = axis(horizontalCrs, 0);
  let vertical;
  if (compound) {
    vertical = axis(unbound(proj, proj.proj_crs_get_sub_crs(crs, 1)), 0);
  } else if (
    proj.proj_cs_get_axis_count(proj.proj_crs_get_coordinate_system(crs)) >= 3
  ) {
    vertical = axis(crs, 2);
  }
  return {
    projected: proj.proj_get_type(horizontalCrs) === proj.PJ_TYPE_PROJECTED_CRS,
    horizontalUnitName: horizontal.unit_name,
    metersPerUnit: horizontal.unit_conv_factor,
    ...(vertical && {
      verticalUnitName: vertical.unit_name,
      metersPerVerticalUnit: vertical.unit_conv_factor,
    }),
  };
}
