// CRS references and recorded PROJ operations for engineering frames.
//
// A frame resolves its PROJ operation once, when it is created, and keeps the
// operation's PROJ string for both directions (plan 4a R2). PROJ's own
// `proj_create_crs_to_crs` picks the best operation for the grids installed and
// may pick one whose grid is absent, then return the input unchanged; this
// module walks the operation list itself and takes only an operation whose
// grids are all available.
//
// The list is in PROJ's order with grid availability ignored
// (PROJ_GRID_AVAILABILITY_IGNORED): by PROJ's own ranking of the operations
// (exportable, not approximate, not ballpark, grids its database knows, area
// of use and accuracy), not by which grids PROJ found when it first looked. So a
// grid loaded late counts as soon as it is loaded, and the better operations
// a frame skips for missing grids come before the one it takes.
//
// A grid is available when `loadGrids` loaded it (and PROJ then found it
// where it was put; proj.ts): PROJ's own answer for a candidate's grid isn't
// enough. PROJ caches that answer per context the first time it looks, so a
// grid loaded afterwards still reads as unavailable, and the candidate as not
// instantiable; and PROJ may find a grid of its own outside the loaded set.
import type { PJ, PjObjList, ProjApi } from "./projApi.ts";
import {
  formatPipeline,
  parsePipeline,
  pipelineGrids,
  type Pipeline,
} from "./pipeline.ts";
import { loadedGrids } from "./proj.ts";

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
  /**
   * The height axis's direction, for a compound or 3D CRS whose third axis
   * PROJ gives as "up" or "down": "down" for a depth CRS (such as a LAT or
   * MLLW depth, where +10 lies 10 units below 0).
   */
  readonly verticalDirection?: "up" | "down";
}

/**
 * One PROJ operation between two CRSs, fixed at creation.
 *
 * Coordinates are normalized for visualization: easting before northing and
 * longitude before latitude (degrees), then height. Inputs and outputs use each
 * CRS's own units, so `forward` takes the source's (E, N, height) in its
 * units, such as US survey feet, and returns (lon, lat, height) in degrees and
 * metres; `inverse` takes that back to the source's units. `inverse` is the
 * exact inverse of `forward` (refined against it, to 1e-6 m), at about three
 * times the PROJ calls of one raw inverse.
 */
export interface RecordedOperation {
  /** The PROJ pipeline string, identical for both directions. */
  readonly pipeline: string;
  /** PROJ's stated accuracy in metres; undefined when PROJ reports none. */
  readonly accuracy: number | undefined;
  /** Grid files the operation reads (all required ones loaded when it was resolved; a pinned pipeline may also list optional ones that are not). */
  readonly grids: readonly string[];
  /**
   * The grids in `grids` that are written optional (`@name`): PROJ goes on
   * without them, so one missing from a pinned pipeline is not an error.
   */
  readonly optionalGrids: readonly string[];
  /** A ballpark transformation: datum differences ignored (accuracy unknown). */
  readonly ballpark: boolean;
  /**
   * The candidates before this one, in PROJ's order (grid availability
   * ignored), that were skipped only because grids they need aren't loaded
   * (each has a PROJ string). A ballpark is never listed; a pinned pipeline
   * has none.
   */
  readonly betterCandidates: readonly BetterCandidate[];
  forward(xyz: ArrayLike<number>, out?: Float64Array): Float64Array;
  inverse(xyz: ArrayLike<number>, out?: Float64Array): Float64Array;
}

/** A candidate operation skipped for missing grids (`betterCandidates`). */
export interface BetterCandidate {
  /** PROJ's name for it. */
  readonly name: string;
  /** PROJ's stated accuracy in metres; absent when it states none. */
  readonly accuracy?: number;
  /** The grids it needs that `loadGrids` hasn't loaded. */
  readonly missingGrids: readonly string[];
}

/**
 * Where the coordinates are, in degrees of longitude and latitude: west may
 * exceed east for a box across 180°.
 */
export interface AreaOfInterest {
  readonly west: number;
  readonly south: number;
  readonly east: number;
  readonly north: number;
}

export interface ResolveOptions {
  /**
   * A PROJ pipeline to use as is, skipping the candidate search: a string, or
   * a structured `Pipeline` (written by `formatPipeline`).
   */
  readonly pipeline?: string | Pipeline;
  /** Accept a ballpark operation when no accurate one has its grids. */
  readonly allowBallpark?: boolean;
  /**
   * Where the coordinates are. PROJ then lists the operations whose area of
   * use contains this box. Without it PROJ keeps only operations whose area
   * contains the whole source CRS's area, which drops every transformation
   * that covers only part of a large datum (ED50 to WGS 84 at a North Sea
   * point leaves only a ballpark).
   */
  readonly areaOfInterest?: AreaOfInterest;
}

/** Options for `listOperations`. */
export interface ListOperationsOptions {
  /** Where the coordinates are, as for `resolveOperation`. */
  readonly areaOfInterest?: AreaOfInterest;
}

function checkedArea(area: AreaOfInterest): AreaOfInterest {
  const { west, south, east, north } = area;
  const finite = [west, south, east, north].every(Number.isFinite);
  if (
    !finite ||
    south < -90 ||
    north > 90 ||
    south > north ||
    Math.abs(west) > 180 ||
    Math.abs(east) > 180
  ) {
    throw new RangeError(
      `areaOfInterest must be finite degrees with -90 <= south <= north <= 90 and |west|, |east| <= 180; got west ${west}, south ${south}, east ${east}, north ${north}`,
    );
  }
  return area;
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
function listed(names: readonly string[]): string {
  const shown = names.slice(0, MAX_NAMED).join(", ");
  return names.length > MAX_NAMED
    ? `${shown} and ${names.length - MAX_NAMED} more`
    : shown;
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
  optionalGrids: readonly string[],
  ballpark: boolean,
  betterCandidates: readonly BetterCandidate[],
  epoch: number,
): RecordedOperation {
  const operation = fixed(proj, pipeline);
  const forward = transformer(proj, operation, proj.PJ_FWD, epoch);
  return {
    pipeline,
    accuracy,
    grids,
    optionalGrids,
    ballpark,
    betterCandidates,
    forward,
    inverse: refinedInverse(
      forward,
      transformer(proj, operation, proj.PJ_INV, epoch),
      pipeline,
    ),
  };
}

const MAX_REFINEMENTS = 3;
// Stop when a correction is below this fraction of the coordinate's magnitude.
const RELATIVE_STEP = 1e-12;
// A forward residual above this (metres) after refining is an error.
const MAX_RESIDUAL_METERS = 1e-6;
const METERS_PER_DEGREE = 111_319.49079327357;

/**
 * Makes `inverse` the exact inverse of `forward`.
 *
 * PROJ pushes the height around a 2D CRS's geocentric Helmert: the forward runs
 * the geocentric step at the input height on the source ellipsoid, the inverse
 * at the same height on WGS84, though the true height moved by dh. Raw, the
 * round trip is off by millimetres. So x0 = inverse(y), then
 * x(k+1) = x(k) + (x0 - inverse(forward(x(k)))), until the correction is
 * negligible (relative to the coordinate's magnitude) or MAX_REFINEMENTS steps.
 * The forward result is never altered. If forward(x) still differs from y by
 * more than 1e-6 m (longitude differences wrapped across 180 degrees), it
 * throws, naming the pipeline and the residual: never silently wrong.
 *
 * Cost: an inverse makes about 3 times as many PROJ calls as the raw one (one
 * inverse, then a forward and an inverse per step, one step when the operation
 * is already exact) and one more forward for the residual check. For an exact
 * operation the first correction is about 1e-15, so results are unchanged.
 */
function refinedInverse(
  forward: RecordedOperation["forward"],
  rawInverse: RecordedOperation["inverse"],
  pipeline: string,
): RecordedOperation["inverse"] {
  return (xyz, out = new Float64Array(3)) => {
    const target = Float64Array.from([xyz[0]!, xyz[1]!, xyz[2] ?? 0]);
    const x0 = rawInverse(target);
    const x = Float64Array.from(x0);
    for (let step = 0; step < MAX_REFINEMENTS; step++) {
      const back = rawInverse(forward(x));
      let negligible = true;
      for (let i = 0; i < 3; i++) {
        const correction = x0[i]! - back[i]!;
        x[i] = x[i]! + correction;
        if (
          Math.abs(correction) >
          RELATIVE_STEP * Math.max(Math.abs(x[i]!), 1)
        ) {
          negligible = false;
        }
      }
      if (negligible) {
        break;
      }
    }
    // forward's output is (longitude, latitude) in degrees and height in metres.
    const check = forward(x);
    let dLon = check[0]! - target[0]!;
    dLon -= 360 * Math.round(dLon / 360);
    const residual = Math.hypot(
      dLon * Math.cos((target[1]! * Math.PI) / 180) * METERS_PER_DEGREE,
      (check[1]! - target[1]!) * METERS_PER_DEGREE,
      check[2]! - target[2]!,
    );
    if (!(residual <= MAX_RESIDUAL_METERS)) {
      throw new Error(
        `The inverse of operation "${pipeline}" does not reproduce its forward: residual ${residual} m after ${MAX_REFINEMENTS} refinements (limit ${MAX_RESIDUAL_METERS} m)`,
      );
    }
    out.set(x);
    return out;
  };
}

/**
 * Runs `list` with PROJ's log level at PJ_LOG_NONE, and puts the previous
 * level back after: listing candidates makes PROJ print every grid it can't
 * find.
 */
function quietly<T>(proj: ProjApi, list: () => T): T {
  const previous = proj.proj_log_level(proj.PJ_LOG_NONE);
  try {
    return list();
  } finally {
    proj.proj_log_level(previous);
  }
}

/** A candidate's grids, judged against what `loadGrids` loaded. */
interface CandidateGrids {
  /** Every grid file it reads. */
  readonly needed: string[];
  /** The grids in `needed` that `loadGrids` hasn't loaded. */
  readonly missing: string[];
  /**
   * Whether PROJ can instantiate it: PROJ's answer, or yes when PROJ said no
   * only for want of grids loaded since it looked (its answer is cached).
   */
  readonly instantiable: boolean;
  /**
   * `instantiable` overrides PROJ's no: the candidate counts only once its
   * PROJ string is created (`creatable`).
   */
  readonly rejudged: boolean;
}

/** Whether PROJ creates an operation from `string` now. */
function creatable(proj: ProjApi, string: string): boolean {
  try {
    return exists(proj, proj.proj_create(string));
  } catch {
    return false;
  }
}

function candidateGrids(
  proj: ProjApi,
  candidate: PJ,
  loaded: ReadonlySet<string>,
): CandidateGrids {
  const needed: string[] = [];
  const missing: string[] = [];
  // PROJ called a grid unavailable that has been loaded since.
  let loadedSince = false;
  for (
    let g = 0;
    g < proj.proj_coordoperation_get_grid_used_count(candidate);
    g++
  ) {
    const grid = proj.proj_coordoperation_get_grid_used(candidate, g);
    needed.push(grid.short_name);
    if (!loaded.has(grid.short_name)) {
      missing.push(grid.short_name);
    } else if (!grid.available) {
      loadedSince = true;
    }
  }
  const projSays = proj.proj_coordoperation_is_instantiable(candidate);
  const rejudged = !projSays && loadedSince && missing.length === 0;
  return { needed, missing, instantiable: projSays || rejudged, rejudged };
}

/**
 * PROJ's candidate operations from one CRS definition to another: the list
 * `resolveOperation` walks and `listOperations` reports, from the same
 * factory context. For a pair PROJ cannot relate (a Moon CRS and the
 * Earth's) the binding throws "Error getting list"; that comes back as a
 * null list with the error. The CRSs themselves must exist (else it throws).
 * With an area of interest the list holds the operations whose area of use
 * contains it. Grid availability is ignored (see the header): it changes the
 * order only, not which operations PROJ lists (checked 2026-11-07 on 43
 * source CRSs, with no grids and with the store's grids loaded).
 */
function candidateList(
  proj: ProjApi,
  source: string,
  target: string,
  areaOfInterest?: AreaOfInterest,
): { candidates: PjObjList | null; listError?: unknown } {
  const area =
    areaOfInterest === undefined ? undefined : checkedArea(areaOfInterest);
  const from = create(proj, source, "the source CRS");
  const to = create(proj, target, "the target CRS");
  try {
    const context = proj.proj_create_operation_factory_context("");
    proj.proj_operation_factory_context_set_grid_availability_use(
      context,
      proj.PROJ_GRID_AVAILABILITY_IGNORED,
    );
    if (area !== undefined) {
      proj.proj_operation_factory_context_set_area_of_interest(
        context,
        area.west,
        area.south,
        area.east,
        area.north,
      );
    }
    return {
      candidates: proj.proj_create_operations(from, to, context),
    };
  } catch (error) {
    return { candidates: null, listError: error };
  }
}

/** PROJ names a ballpark transformation (datum differences ignored) "Ballpark ...". */
function isBallpark(proj: ProjApi, candidate: PJ): boolean {
  return /ballpark/i.test(proj.proj_get_name(candidate) ?? "");
}

/**
 * Resolves the operation from `source` to `target` (a PROJ code such as
 * "EPSG:4979", or WKT2) once, as plan 4a R2 requires.
 *
 *  - With `options.pipeline` the string is used as is; its accuracy is unknown
 *    (undefined) and it is not marked ballpark. It throws if a grid it names is
 *    missing.
 *  - Otherwise PROJ's candidate list for the pair (within
 *    `options.areaOfInterest`, when given) is walked in PROJ's order with
 *    grid availability ignored (by accuracy and area of use, not by which
 *    grids PROJ found when it first looked) and the first instantiable
 *    operation whose grids `loadGrids` has all loaded is taken, in its
 *    normalized-for-visualization form. A ballpark operation (PROJ names it
 *    "Ballpark ...") is taken only with `allowBallpark`, and then `accuracy`
 *    is undefined. The non-ballpark candidates before it that were skipped
 *    for missing grids are its `betterCandidates`.
 *  - If none qualifies it throws, naming the grids the better candidates need.
 */
export function resolveOperation(
  proj: ProjApi,
  source: CrsRef,
  target: string,
  options: ResolveOptions = {},
): RecordedOperation {
  const { pipeline, allowBallpark = false, areaOfInterest } = options;
  // A time-dependent operation (a dynamic datum's Helmert with rates) is
  // evaluated at the source's coordinate epoch (decimal year); with none,
  // at PROJ's "no epoch" (infinity), where the rates do not apply.
  const epoch =
    source.format === "wkid" && source.epoch !== undefined
      ? source.epoch
      : Infinity;
  if (pipeline !== undefined) {
    // A string is validated by parsePipeline (same key and value rules as
    // formatPipeline) and then passed to PROJ exactly as given, not
    // canonicalized: recorded pinned strings must stay byte-identical.
    const text =
      typeof pipeline === "string" ? pipeline : formatPipeline(pipeline);
    const named = pipelineGrids(
      typeof pipeline === "string" ? parsePipeline(pipeline) : pipeline,
    );
    const grids = [...new Set(named.map((grid) => grid.name))];
    const optionalGrids = grids.filter((name) =>
      named.every((grid) => grid.name !== name || grid.optional),
    );
    const loaded = loadedGrids(proj);
    const lacking = grids.filter(
      (name) => !optionalGrids.includes(name) && !loaded.has(name),
    );
    if (lacking.length > 0) {
      throw new Error(
        `The pinned PROJ pipeline needs ${listed(lacking)}, which ${lacking.length === 1 ? "is" : "are"} not loaded`,
      );
    }
    try {
      return record(
        proj,
        text,
        undefined,
        grids,
        optionalGrids,
        false,
        [],
        epoch,
      );
    } catch (error) {
      const needs = grids.length > 0 ? `; it needs ${listed(grids)}` : "";
      throw new Error(
        `The pinned PROJ pipeline cannot be created${needs} (${(error as Error).message})`,
        { cause: error },
      );
    }
  }

  const where = `from ${crsDefinition(source)} to ${target}`;
  const loaded = loadedGrids(proj);
  // The walk, quietly; the chosen candidate is recorded after it, so an
  // error creating it is logged.
  const walk = quietly(proj, () => {
    const { candidates, listError } = candidateList(
      proj,
      crsDefinition(source),
      target,
      areaOfInterest,
    );
    if (!candidates || candidates.length() === 0) {
      throw new Error(
        `PROJ offers no usable operation ${where}`,
        listError === undefined ? undefined : { cause: listError },
      );
    }
    const missing = new Set<string>();
    // Skipped for missing grids, in order: the chosen one's better candidates.
    const better: BetterCandidate[] = [];
    let skippedBallpark = false;
    // Candidates PROJ cannot express as a PROJ string, named in the final error.
    const noString: string[] = [];
    // Candidates counted instantiable against PROJ's cached no that PROJ
    // still can't create.
    const notCreated: string[] = [];
    const count = candidates.length();
    for (let i = 0; i < count; i++) {
      const candidate = candidates.get(i);
      const grids = candidateGrids(proj, candidate, loaded);
      for (const grid of grids.missing) {
        missing.add(grid);
      }
      const ballpark = isBallpark(proj, candidate);
      if (grids.missing.length > 0) {
        // Better only if it could be taken once its grids are loaded: not a
        // ballpark, and with a PROJ string (which needs no grids). The rule
        // `EngineeringFrame.load`'s gridsToLoad mirrors; keep them together.
        if (
          !ballpark &&
          proj.proj_as_proj_string(
            proj.proj_normalize_for_visualization(candidate),
            proj.PJ_PROJ_5,
          ) !== null
        ) {
          const accuracy = proj.proj_coordoperation_get_accuracy(candidate);
          better.push({
            name: proj.proj_get_name(candidate) ?? `candidate ${i}`,
            ...(accuracy >= 0 && { accuracy }),
            missingGrids: grids.missing,
          });
        }
        continue;
      }
      if (!grids.instantiable) {
        continue;
      }
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
      if (grids.rejudged && !creatable(proj, string)) {
        notCreated.push(proj.proj_get_name(candidate) ?? `candidate ${i}`);
        continue;
      }
      const accuracy = proj.proj_coordoperation_get_accuracy(candidate);
      return {
        chosen: {
          string,
          accuracy: ballpark || accuracy < 0 ? undefined : accuracy,
          grids: grids.needed,
          ballpark,
          better,
        },
      } as const;
    }
    return { missing, skippedBallpark, noString, notCreated } as const;
  });

  if (walk.chosen) {
    const { string, accuracy, grids, ballpark, better } = walk.chosen;
    let optionalGrids: string[];
    try {
      optionalGrids = pipelineGrids(parsePipeline(string))
        .filter((grid) => grid.optional)
        .map((grid) => grid.name);
    } catch (error) {
      throw new Error(
        `PROJ's operation ${where} could not be read (${(error as Error).message})`,
        { cause: error },
      );
    }
    return record(
      proj,
      string,
      accuracy,
      grids,
      optionalGrids,
      ballpark,
      better,
      epoch,
    );
  }
  const { missing, skippedBallpark, noString, notCreated } = walk;
  if (missing.size > 0) {
    const hint = skippedBallpark
      ? "; pass allowBallpark: true to accept a ballpark transformation"
      : "";
    throw new Error(
      `No PROJ operation ${where} has all its grids; missing: ${listed([...missing])}${hint}`,
    );
  }
  const lacking =
    (noString.length > 0
      ? `; ${listed(noString)} could not be expressed as a PROJ string`
      : "") +
    (notCreated.length > 0
      ? `; PROJ could not create ${listed(notCreated)}`
      : "");
  throw new Error(
    skippedBallpark
      ? `PROJ offers only a ballpark operation ${where}; pass allowBallpark: true to accept it${lacking}`
      : `PROJ offers no usable operation ${where}${lacking}`,
  );
}

/** One of PROJ's candidate operations between two CRSs, as plain data. */
export interface OperationCandidate {
  /** PROJ's name for it, such as "NAD83(2011) to WGS 84 (1)" (with its steps). */
  readonly name: string;
  /**
   * Its PROJ string, normalized for visualization as `resolveOperation`
   * records it; "" when PROJ cannot express it as one.
   */
  readonly pipeline: string;
  /** PROJ's stated accuracy in metres; absent when it states none (ballparks state none). */
  readonly accuracy?: number;
  /** Where it applies, degrees (west may exceed east across 180°); absent when PROJ has none. */
  readonly areaOfUse?: {
    readonly west: number;
    readonly south: number;
    readonly east: number;
    readonly north: number;
  };
  /** Every grid file it reads. */
  readonly gridsNeeded: readonly string[];
  /** The grids in `gridsNeeded` that `loadGrids` hasn't loaded. */
  readonly missingGrids: readonly string[];
  /**
   * Whether PROJ can instantiate it: PROJ's own check, made when it first
   * looked, or yes when that said no only for want of grids loaded since.
   */
  readonly instantiable: boolean;
  /** A ballpark transformation: datum differences ignored, accuracy unknown. */
  readonly ballpark: boolean;
}

/**
 * Every candidate operation PROJ offers from `source` to `target`, in PROJ's
 * order with grid availability ignored (by accuracy and area of use): the
 * list `resolveOperation` walks, from the same factory context.
 * `resolveOperation` records the first candidate that is instantiable, has no
 * missing grids and a PROJ string, and is not a ballpark (unless
 * `allowBallpark`).
 *
 * With `options.areaOfInterest` the list holds the operations whose area of
 * use contains that box, as `resolveOperation` walks it with the same option.
 *
 * Plain data, safe to post to a worker. An empty list when PROJ relates no
 * operation between the two (a Moon CRS and the Earth's); throws when PROJ
 * cannot create either CRS, and a RangeError for an invalid area.
 */
export function listOperations(
  proj: ProjApi,
  source: CrsRef,
  target: CrsRef,
  options: ListOperationsOptions = {},
): readonly OperationCandidate[] {
  const loaded = loadedGrids(proj);
  return quietly(proj, () => {
    const { candidates, listError } = candidateList(
      proj,
      crsDefinition(source),
      crsDefinition(target),
      options.areaOfInterest,
    );
    if (listError !== undefined) {
      // The binding's answer for a pair PROJ cannot relate; anything else is
      // a failure, not an empty list.
      if (listError instanceof Error && listError.message === EMPTY_LIST) {
        return [];
      }
      throw new Error(
        `PROJ could not list the operations from ${crsDefinition(source)} to ${crsDefinition(target)}`,
        { cause: listError },
      );
    }
    if (!candidates) {
      return [];
    }
    const out: OperationCandidate[] = [];
    const count = candidates.length();
    for (let i = 0; i < count; i++) {
      const candidate = candidates.get(i);
      const grids = candidateGrids(proj, candidate, loaded);
      const ballpark = isBallpark(proj, candidate);
      const accuracy = proj.proj_coordoperation_get_accuracy(candidate);
      const area = areaOfUse(proj, candidate);
      const pipeline =
        proj.proj_as_proj_string(
          proj.proj_normalize_for_visualization(candidate),
          proj.PJ_PROJ_5,
        ) ?? "";
      out.push({
        name: proj.proj_get_name(candidate) ?? `candidate ${i}`,
        pipeline,
        ...(!ballpark && accuracy >= 0 && { accuracy }),
        ...(area && { areaOfUse: area }),
        gridsNeeded: grids.needed,
        missingGrids: grids.missing,
        instantiable: grids.rejudged
          ? pipeline !== "" && creatable(proj, pipeline)
          : grids.instantiable,
        ballpark,
      });
    }
    return out;
  });
}

/** proj.js's message when proj_create_operations finds no operation (a null list). */
const EMPTY_LIST = "Error getting list";
/** proj.js's message when an object has no area of use (PROJ returns false). */
const NO_AREA = "proj_get_area_of_use failed";

// PROJ reports an unknown bound as -1000. An object with no area at all makes
// the binding throw NO_AREA (or return null); any other error is rethrown.
function areaOfUse(
  proj: ProjApi,
  candidate: PJ,
): OperationCandidate["areaOfUse"] | undefined {
  let area;
  try {
    area = proj.proj_get_area_of_use(candidate);
  } catch (error) {
    if (error instanceof Error && error.message === NO_AREA) {
      return undefined;
    }
    throw new Error("PROJ could not read an operation's area of use", {
      cause: error,
    });
  }
  if (!area) {
    return undefined;
  }
  const [west, south, east, north] = area;
  const known = [west, south, east, north].every(
    (v) => Number.isFinite(v) && v > -1000,
  );
  return known ? { west, south, east, north } : undefined;
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
  // PROJ gives axis directions in lower case ("up", "down", "east", ...).
  const direction = vertical?.direction?.toLowerCase();
  return {
    projected: proj.proj_get_type(horizontalCrs) === proj.PJ_TYPE_PROJECTED_CRS,
    horizontalUnitName: horizontal.unit_name,
    metersPerUnit: horizontal.unit_conv_factor,
    ...(vertical && {
      verticalUnitName: vertical.unit_name,
      metersPerVerticalUnit: vertical.unit_conv_factor,
    }),
    ...((direction === "up" || direction === "down") && {
      verticalDirection: direction,
    }),
  };
}

/** One part of a compound CRS: its name, and a reference to it alone. */
export interface CrsPart {
  readonly name: string;
  readonly ref: CrsRef;
}

/**
 * A compound CRS's horizontal and vertical parts, each with its name and a
 * reference to it alone: for a `wkid` reference with a `vcsWkid`, the two
 * codes (the horizontal keeping the epoch); otherwise each sub-CRS's WKT2,
 * a bound sub-CRS keeping its transformation. Undefined for a CRS that isn't
 * compound.
 */
export function compoundParts(
  proj: ProjApi,
  ref: CrsRef,
): { readonly horizontal: CrsPart; readonly vertical: CrsPart } | undefined {
  const crs = unbound(proj, create(proj, crsDefinition(ref), "the CRS"));
  if (proj.proj_get_type(crs) !== proj.PJ_TYPE_COMPOUND_CRS) {
    return undefined;
  }
  const part = (index: number, codeRef: CrsRef | undefined): CrsPart => {
    const sub = proj.proj_crs_get_sub_crs(crs, index);
    return {
      name:
        proj.proj_get_name(unbound(proj, sub)) ??
        (index === 0 ? "The horizontal CRS" : "The vertical CRS"),
      ref: codeRef ?? {
        format: "wkt2",
        wkt2: proj.proj_as_wkt(sub, proj.PJ_WKT2_2019),
      },
    };
  };
  const codes = ref.format === "wkid" && ref.vcsWkid !== undefined;
  return {
    horizontal: part(
      0,
      codes
        ? {
            format: "wkid",
            authority: ref.authority,
            wkid: ref.wkid,
            ...(ref.epoch !== undefined && { epoch: ref.epoch }),
          }
        : undefined,
    ),
    vertical: part(
      1,
      codes
        ? { format: "wkid", authority: ref.authority, wkid: ref.vcsWkid! }
        : undefined,
    ),
  };
}
