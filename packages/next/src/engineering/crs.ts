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
// grid loaded late counts as soon as it is loaded, and the operations a frame
// skips for missing grids come before the one it takes. Of those, the better
// ones (`betterCandidates`) are those with a smaller stated accuracy: being
// earlier in PROJ's order is not enough (`betterThan`).
//
// A better candidate must also read the same vertical grids as the operation
// taken (the geoid model, or none), and so differ only in its horizontal
// steps. PROJ's stated accuracy is mostly the horizontal path to WGS 84's
// ensemble; it doesn't compare geoid models. A candidate that swaps the
// height system's geoid for another (GEOID99 or GEOID03 for NAVD88, where
// the frame took GEOID18, NGS's current model) gives different heights, not
// better ones, so it is never listed as better, whatever PROJ states for it.
// The grids are compared by name (`pipelineVerticalGrids`), not by year.
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
  pipelineVerticalGrids,
  type Pipeline,
} from "./pipeline.ts";
import { loadedGrids } from "./proj.ts";
import { projTokenProblem } from "./wkt2.ts";

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
 * `crsDefinition`, shortened to 80 characters for a message: a WKT2 can be
 * 65,536 characters of untrusted text (a tileset's).
 */
export function shownCrs(ref: CrsRef): string {
  // One line: WKT is often pretty-printed.
  const definition = crsDefinition(ref).replace(/\s+/g, " ");
  return definition.length > 80 ? `${definition.slice(0, 77)}...` : definition;
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
  /**
   * The grids in `optionalGrids` that weren't loaded when the operation was
   * resolved: PROJ skips their steps, so the operation runs without them.
   */
  readonly missingOptionalGrids: readonly string[];
  /** A ballpark transformation: datum differences ignored (accuracy unknown). */
  readonly ballpark: boolean;
  /**
   * The candidates before this one, in PROJ's order (grid availability
   * ignored), that were skipped only because grids they need aren't loaded
   * (each has a PROJ string) and that are better (`betterThan`): they read
   * the same vertical grids as this operation, and PROJ states a strictly
   * smaller accuracy for them, or this operation states none. A ballpark is
   * never listed; a pinned pipeline has none.
   */
  readonly betterCandidates: readonly BetterCandidate[];
  forward(xyz: ArrayLike<number>, out?: Float64Array): Float64Array;
  inverse(xyz: ArrayLike<number>, out?: Float64Array): Float64Array;
}

/** An operation as `betterThan` compares it. */
export interface ComparedOperation {
  /** PROJ's stated accuracy in metres; absent or undefined when it states none. */
  readonly accuracy?: number | undefined;
  /** The grids its height step reads (`pipelineVerticalGrids`); empty for none. */
  readonly verticalGrids: readonly string[];
  /** A ballpark transformation. */
  readonly ballpark?: boolean;
}

/** Whether two lists name the same grids, in any order. */
function sameGrids(a: readonly string[], b: readonly string[]): boolean {
  const left = new Set(a);
  const right = new Set(b);
  return left.size === right.size && [...left].every((name) => right.has(name));
}

/**
 * Which of the candidates skipped for missing grids are better than the
 * operation taken (`chosen`), in order: those that aren't a ballpark, read
 * the same vertical grids as `chosen` (the same geoid model, or none: they
 * differ only in horizontal steps), and that PROJ states a strictly smaller
 * accuracy for, or any figure when `chosen` states none. An equal, larger or
 * unstated figure is not better, though PROJ lists it first; nor is a
 * smaller figure for another geoid model, which PROJ's figures don't
 * compare (see the header).
 */
export function betterThan<C extends ComparedOperation>(
  chosen: ComparedOperation,
  skipped: readonly C[],
): C[] {
  const stated = chosen.accuracy;
  return skipped.filter(
    (c) =>
      c.ballpark !== true &&
      sameGrids(c.verticalGrids, chosen.verticalGrids) &&
      (stated === undefined ||
        (c.accuracy !== undefined && c.accuracy < stated)),
  );
}

/** A pipeline string's vertical grids; undefined when it can't be read. */
function verticalGridsOf(string: string): readonly string[] | undefined {
  try {
    return pipelineVerticalGrids(parsePipeline(string));
  } catch {
    return undefined;
  }
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

/**
 * The PJ of a CRS reference, through `proj_create`. A `wkt2` reference must
 * first hold no PROJ-string token (`projTokenProblem`), so a PROJ string in a
 * `wkt2` field is refused rather than read as one; WKT1 still parses (the
 * frames explorer's "Try your own" takes it, and hand-written WKT with
 * grammar slips that PROJ's lax path tolerates). Untrusted WKT2 (a tileset's)
 * also goes through `strictWkt2` first. Throws, naming `what`, for one PROJ
 * can't create.
 */
export function crsObject(
  proj: ProjApi,
  ref: CrsRef | string,
  what: string,
): PJ {
  if (typeof ref === "string") {
    return create(proj, ref, what);
  }
  if (ref.format === "wkid") {
    return create(proj, crsDefinition(ref), what);
  }
  const problem = projTokenProblem(ref.wkt2);
  if (problem !== undefined) {
    throw new Error(`PROJ: ${what} "${shownCrs(ref)}" ${problem}`);
  }
  return create(proj, ref.wkt2, what);
}

/**
 * A WKT2 reference parsed by PROJ's strict WKT parser
 * (`proj_create_from_wkt`, STRICT=YES), never `proj_create`, which would also
 * take a PROJ string, AUTH:CODE or PROJJSON: for WKT from untrusted data,
 * checked before anything else uses it (`georeferenceTileset`). It must also
 * hold no PROJ-string token. Throws, naming `what` and PROJ's parse error.
 * The PJ needs no proj_destroy: proj.js frees it when its wrapper is
 * garbage-collected (see `creates` in proj.ts).
 */
export function strictWkt2(
  proj: ProjApi,
  ref: { readonly format: "wkt2"; readonly wkt2: string },
  what: string,
): PJ {
  const problem = projTokenProblem(ref.wkt2);
  if (problem !== undefined) {
    throw new Error(`PROJ: ${what} "${shownCrs(ref)}" ${problem}`);
  }
  let object: PJ;
  try {
    [object] = proj.proj_create_from_wkt(ref.wkt2, { STRICT: true });
  } catch (error) {
    const message = (error as Error).message ?? String(error);
    throw new Error(
      `PROJ could not parse ${what} "${shownCrs(ref)}" as strict WKT2: ${message.replace(/\s+/g, " ").slice(0, 200)}`,
      { cause: error },
    );
  }
  if (!exists(proj, object)) {
    throw new Error(`PROJ could not create ${what} "${shownCrs(ref)}"`);
  }
  return object;
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
  const loaded = loadedGrids(proj);
  return {
    pipeline,
    accuracy,
    grids,
    optionalGrids,
    missingOptionalGrids: optionalGrids.filter((name) => !loaded.has(name)),
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
  source: CrsRef | string,
  target: CrsRef | string,
  areaOfInterest?: AreaOfInterest,
): { candidates: PjObjList | null; listError?: unknown } {
  const area =
    areaOfInterest === undefined ? undefined : checkedArea(areaOfInterest);
  const from = crsObject(proj, source, "the source CRS");
  const to = crsObject(proj, target, "the target CRS");
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
 *    for missing grids, read the same vertical grids as it, and state a
 *    smaller accuracy than it (any, if it states none), are its
 *    `betterCandidates` (`betterThan`).
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

  const shownTarget = target.length > 80 ? `${target.slice(0, 77)}...` : target;
  const where = `from ${shownCrs(source)} to ${shownTarget}`;
  const loaded = loadedGrids(proj);
  // The walk, quietly; the chosen candidate is recorded after it, so an
  // error creating it is logged.
  const walk = quietly(proj, () => {
    const { candidates, listError } = candidateList(
      proj,
      source,
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
    // Skipped for missing grids, in order: the chosen one's better
    // candidates are those of them `betterThan` keeps.
    const skipped: (BetterCandidate & ComparedOperation)[] = [];
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
        // Its vertical grids come from that string (one that can't be read
        // can't be shown to keep the geoid, so it is never better).
        const string = ballpark
          ? null
          : proj.proj_as_proj_string(
              proj.proj_normalize_for_visualization(candidate),
              proj.PJ_PROJ_5,
            );
        const verticalGrids =
          string === null ? undefined : verticalGridsOf(string);
        if (verticalGrids !== undefined) {
          const accuracy = proj.proj_coordoperation_get_accuracy(candidate);
          skipped.push({
            name: proj.proj_get_name(candidate) ?? `candidate ${i}`,
            ...(accuracy >= 0 && { accuracy }),
            missingGrids: grids.missing,
            verticalGrids,
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
      const stated = proj.proj_coordoperation_get_accuracy(candidate);
      const accuracy = ballpark || stated < 0 ? undefined : stated;
      return {
        chosen: {
          string,
          accuracy,
          grids: grids.needed,
          ballpark,
          skipped,
        },
      } as const;
    }
    return { missing, skippedBallpark, noString, notCreated } as const;
  });

  if (walk.chosen) {
    const { string, accuracy, grids, ballpark, skipped } = walk.chosen;
    let optionalGrids: string[];
    let better: BetterCandidate[];
    try {
      const parsed = parsePipeline(string);
      optionalGrids = pipelineGrids(parsed)
        .filter((grid) => grid.optional)
        .map((grid) => grid.name);
      better = betterThan(
        { accuracy, verticalGrids: pipelineVerticalGrids(parsed) },
        skipped,
      ).map((c) => ({
        name: c.name,
        ...(c.accuracy !== undefined && { accuracy: c.accuracy }),
        missingGrids: c.missingGrids,
      }));
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
      source,
      target,
      options.areaOfInterest,
    );
    if (listError !== undefined) {
      // The binding's answer for a pair PROJ cannot relate; anything else is
      // a failure, not an empty list.
      if (listError instanceof Error && listError.message === EMPTY_LIST) {
        return [];
      }
      throw new Error(
        `PROJ could not list the operations from ${shownCrs(source)} to ${shownCrs(target)}`,
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
  const crs = unbound(proj, crsObject(proj, ref, "the CRS"));
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
  /** The horizontal part's geodetic CRS's name, such as "WGS 84". */
  readonly geodeticName?: string;
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
  const crs = unbound(proj, crsObject(proj, ref, "the CRS"));
  if (proj.proj_get_type(crs) !== proj.PJ_TYPE_COMPOUND_CRS) {
    return undefined;
  }
  const part = (index: number, codeRef: CrsRef | undefined): CrsPart => {
    const sub = proj.proj_crs_get_sub_crs(crs, index);
    const geodeticName =
      index === 0
        ? proj.proj_get_name(proj.proj_crs_get_geodetic_crs(unbound(proj, sub)))
        : null;
    return {
      name:
        proj.proj_get_name(unbound(proj, sub)) ??
        (index === 0 ? "The horizontal CRS" : "The vertical CRS"),
      ...(geodeticName !== null && { geodeticName }),
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

/** A geographic CRS that a vertical datum's grids are defined on. */
export interface VerticalGridDatum {
  /** The geographic CRS's name, such as "NAD83(2011)". */
  readonly name: string;
  /** Its geographic 2D CRS, "EPSG:6318", when the database has one by that name. */
  readonly geographic2d?: string;
  /** Its most accurate grid transformation's name, and that accuracy (m). */
  readonly transformation: string;
  readonly accuracy?: number;
}

/**
 * What `proj.db` has relating a vertical CRS's datum to an ellipsoid by a
 * grid: the geographic CRSs its grid transformations start from (most
 * accurate first), and the geoid models the database names for it. Both
 * empty for a datum such as MLLW, which has no transformation at all. The
 * search is by name under the vertical CRS's own authority (`authority`, its
 * identifier's; null when it has none): an empty result says only that none
 * was found that way, which is conclusive for EPSG's names alone.
 *
 * The transformations are found by name (the vertical CRS's own, and those
 * of the vertical CRSs a conversion relates it to on the same datum, such as
 * NAVD88 height for NAVD88 height (ftUS)), then kept only if they read a
 * grid and run between a geographic CRS and a vertical CRS on the same
 * datum.
 */
export function verticalGridDatums(
  proj: ProjApi,
  vertical: CrsRef,
): {
  readonly datums: readonly VerticalGridDatum[];
  readonly geoidModels: readonly string[];
  /** The vertical CRS's identifier's authority, searched under; null when it has none. */
  readonly authority: string | null;
} {
  const crs = unbound(proj, crsObject(proj, vertical, "the CRS"));
  return quietly(proj, () => {
    const identified = proj.proj_get_id_auth_name(crs, 0);
    const authority = identified ?? "EPSG";
    const code = proj.proj_get_id_code(crs, 0);
    const datum = proj.proj_crs_get_datum_forced(crs);
    const onDatum = (other: PJ) =>
      proj.proj_get_type(other) === proj.PJ_TYPE_VERTICAL_CRS &&
      proj.proj_is_equivalent_to(
        proj.proj_crs_get_datum_forced(other),
        datum,
        proj.PJ_COMP_EQUIVALENT,
      );
    const search = (name: string): PJ[] => {
      let list: PjObjList | null = null;
      try {
        list = proj.proj_create_from_name(
          authority,
          name,
          [proj.PJ_TYPE_TRANSFORMATION],
          true,
          0,
        );
      } catch {
        // proj.js throws for a search that matches nothing.
      }
      const out: PJ[] = [];
      for (let i = 0; i < (list?.length() ?? 0); i++) {
        out.push(list!.get(i));
      }
      return out;
    };
    const geographic = (object: PJ) => {
      const type = proj.proj_get_type(object);
      return (
        type === proj.PJ_TYPE_GEOGRAPHIC_3D_CRS ||
        type === proj.PJ_TYPE_GEOGRAPHIC_2D_CRS
      );
    };
    const ownName = proj.proj_get_name(crs);
    const names = new Set<string>(ownName === null ? [] : [ownName]);
    for (const operation of ownName === null ? [] : search(ownName)) {
      for (const end of [
        proj.proj_get_source_crs(operation),
        proj.proj_get_target_crs(operation),
      ]) {
        const name = proj.proj_get_name(end);
        if (name !== null && onDatum(end)) {
          names.add(name);
        }
      }
    }
    const best = new Map<string, VerticalGridDatum>();
    const seen = new Set<string>();
    for (const name of names) {
      for (const operation of search(name)) {
        const id = proj.proj_get_id_code(operation, 0) ?? "";
        if (
          seen.has(id) ||
          proj.proj_coordoperation_get_grid_used_count(operation) === 0
        ) {
          continue;
        }
        seen.add(id);
        const source = proj.proj_get_source_crs(operation);
        const target = proj.proj_get_target_crs(operation);
        const [from, to] = geographic(source)
          ? [source, target]
          : [target, source];
        if (!geographic(from) || !onDatum(to)) {
          continue;
        }
        const fromName = proj.proj_get_name(from) ?? "a geographic CRS";
        const raw = proj.proj_coordoperation_get_accuracy(operation);
        const accuracy = raw >= 0 ? raw : undefined;
        const previous = best.get(fromName);
        if (
          previous !== undefined &&
          (accuracy === undefined ||
            (previous.accuracy !== undefined && previous.accuracy <= accuracy))
        ) {
          continue;
        }
        best.set(fromName, {
          name: fromName,
          transformation: proj.proj_get_name(operation) ?? `operation ${id}`,
          ...(accuracy !== undefined && { accuracy }),
        });
      }
    }
    const datums = [...best.values()]
      .sort(
        (a, b) =>
          (a.accuracy ?? Infinity) - (b.accuracy ?? Infinity) ||
          a.name.localeCompare(b.name),
      )
      .map((entry) => {
        const found = search2d(proj, authority, entry.name);
        return found === undefined ? entry : { ...entry, geographic2d: found };
      });
    let geoidModels: readonly string[] = [];
    if (code !== null) {
      try {
        geoidModels = [
          ...proj.proj_get_geoid_models_from_database(authority, code),
        ];
      } catch {
        // None.
      }
    }
    return { datums, geoidModels, authority: identified };
  });
}

/** The geographic 2D CRS named exactly `name`, as "AUTH:code". */
function search2d(
  proj: ProjApi,
  authority: string,
  name: string,
): string | undefined {
  try {
    const list = proj.proj_create_from_name(
      authority,
      name,
      [proj.PJ_TYPE_GEOGRAPHIC_2D_CRS],
      false,
      1,
    );
    if (list === null || list.length() === 0) {
      return undefined;
    }
    const crs = list.get(0);
    const auth = proj.proj_get_id_auth_name(crs, 0);
    const code = proj.proj_get_id_code(crs, 0);
    return auth !== null && code !== null ? `${auth}:${code}` : undefined;
  } catch {
    return undefined;
  }
}
