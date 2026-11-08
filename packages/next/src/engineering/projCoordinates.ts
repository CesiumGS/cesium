// PROJ as a coordinate service (spec section 7.9; plan 5a, Task 16): the
// engineering frame's resolution path (plan 4a R2 and R4, 4b's grids,
// geoid fallbacks and better candidates) behind the frames module's
// `CoordinateService` interface. The one implementation the engine ships.
//
// The grid trust chain is this module's, unchanged: grids come only from a
// `GridSource` (the pinned PROJ-data catalog, verified downloads, Node
// staging; proj.ts), and `resolveOperation` lets an operation read only
// verified, staged, plain-named grids (crs.ts `checkUsedGrids`), after
// strict WKT2 and declared-pipeline screening upstream. A host's own
// coordinate service is outside that chain by design.
import { EARTH, MOON, type Body } from "../scene/Body.ts";
import type {
  AreaOfInterest,
  CoordinateRequest,
  CoordinateService,
  CrsRef,
  CrsUnits,
  ResolvedCoordinates,
} from "../frames/coordinates.ts";
import {
  MOON_GEOGRAPHIC_CRS,
  compoundParts,
  crsDefinition,
  crsUnits,
  listOperations,
  resolveOperation,
  shownCrs,
  verticalGridDatums,
  type OperationCandidate,
  type RecordedOperation,
} from "./crs.ts";
import { projGridFactors } from "./factors.ts";
import type { GridCatalog } from "./gridCatalog.ts";
import { parsePipeline, pipelineGrids, type Pipeline } from "./pipeline.ts";
import { loadedGrids, loadGrids, type GridSource } from "./proj.ts";
import type { ProjApi } from "./projApi.ts";

/** Who states a frame's `fallbackSigma`. */
export type FallbackSigmaSource = "app" | "declaration";

/** A global geoid model a frame can fall back to (`geoidFallback`). */
export type GeoidModel = "EGM96" | "EGM2008";

/** The EPSG vertical CRS of each model's heights. */
const GEOID_MODEL_CRS: Readonly<Record<GeoidModel, number>> = {
  EGM96: 5773,
  EGM2008: 3855,
};

/** A geoid fallback a frame took (`EngineeringFrameDefinition.geoidFallback`). */
export interface EngineeringFrameFallback {
  readonly model: GeoidModel;
  /** The EPSG code of the vertical CRS the model replaced (`crs.vcsWkid`). */
  readonly replacedVertical: number;
  /** `fallbackSigma`, metres; absent when none was given (accuracy undefined). */
  readonly sigma?: number;
  /** Who states `sigma` (`fallbackSigmaSource`); present with it. */
  readonly sigmaSource?: FallbackSigmaSource;
  /** The grids PROJ's best candidate for the CRS lacked: why it fell back. */
  readonly missingGrids: readonly string[];
}

/**
 * A `CoordinateRequest` as PROJ's service reads it: `pinned` is a PROJ
 * pipeline (a string or a structured `Pipeline`, R2), and the rest are
 * the engineering frame definition's PROJ options of the same names
 * (`EngineeringFrameDefinition`), which an engineering frame passes on.
 */
export interface ProjCoordinateRequest extends CoordinateRequest {
  readonly pinned?: string | Pipeline;
  /** Accept a ballpark operation; its accuracy is then undefined. */
  readonly allowBallpark?: boolean;
  /** `EngineeringFrameDefinition.geoidFallback`. */
  readonly geoidFallback?: GeoidModel;
  /** `EngineeringFrameDefinition.fallbackSigma`. */
  readonly fallbackSigma?: number;
  /** `EngineeringFrameDefinition.fallbackSigmaSource`. */
  readonly fallbackSigmaSource?: FallbackSigmaSource;
}

/**
 * PROJ's answer. `operation` is the recorded operation, with heights in
 * metres as `CoordinateOperation` has them: where PROJ leaves a height in
 * the CRS's own unit (a CRS with no vertical axis, or the Moon's target,
 * which passes heights through) or a geoid fallback's model takes another
 * unit or direction, its `forward` and `inverse` convert the height and
 * every other field is PROJ's record. `fallback` is the geoid fallback
 * taken, if any; `credits` are the grid credits (`GridCatalog.credit`) of
 * the grids it reads, with a `GridSource`, else empty.
 */
export interface ProjResolvedCoordinates extends ResolvedCoordinates {
  readonly operation: RecordedOperation;
  /** The PROJ the operation was resolved with. */
  readonly proj: ProjApi;
  readonly fallback?: EngineeringFrameFallback;
}

/** The answers and the services this module made: never a host's. */
const projAnswers = new WeakSet<object>();
const projServices = new WeakSet<object>();

/** @internal `coordinates` as PROJ's answer when PROJ's service gave it, else undefined. */
export function projResolution(
  coordinates: ResolvedCoordinates,
): ProjResolvedCoordinates | undefined {
  return projAnswers.has(coordinates)
    ? (coordinates as ProjResolvedCoordinates)
    : undefined;
}

/** @internal Whether `service` is one `projCoordinateService` made. */
export function isProjService(service: CoordinateService): boolean {
  return projServices.has(service);
}

/** What the resolution path reads of a request (a definition's PROJ options). */
interface Wanted {
  readonly crs: CrsRef;
  readonly body: Body;
  readonly pipeline?: string | Pipeline;
  readonly allowBallpark?: boolean;
  readonly areaOfInterest?: AreaOfInterest;
  readonly geoidFallback?: GeoidModel;
  readonly fallbackSigma?: number;
  readonly fallbackSigmaSource?: FallbackSigmaSource;
}

function wantedOf(request: CoordinateRequest): Wanted {
  const r = request as ProjCoordinateRequest;
  const { pinned } = r;
  if (
    pinned !== undefined &&
    typeof pinned !== "string" &&
    (typeof pinned !== "object" ||
      pinned === null ||
      !Array.isArray((pinned as Partial<Pipeline>).steps))
  ) {
    throw new TypeError(
      "projCoordinateService: pinned must be a PROJ pipeline, a string or a Pipeline",
    );
  }
  return {
    crs: r.crs,
    body: r.body,
    ...(pinned !== undefined && { pipeline: pinned }),
    ...(r.allowBallpark !== undefined && { allowBallpark: r.allowBallpark }),
    ...(r.areaOfInterest !== undefined && { areaOfInterest: r.areaOfInterest }),
    ...(r.geoidFallback !== undefined && { geoidFallback: r.geoidFallback }),
    ...(r.fallbackSigma !== undefined && { fallbackSigma: r.fallbackSigma }),
    ...(r.fallbackSigmaSource !== undefined && {
      fallbackSigmaSource: r.fallbackSigmaSource,
    }),
  };
}

/** The geographic CRS where PROJ stops for a body (R4). */
function geographicTarget(body: Body): CrsRef {
  if (body === EARTH || body.naifId === EARTH.naifId) {
    return { format: "wkid", authority: "EPSG", wkid: 4979 };
  }
  if (body === MOON || body.naifId === MOON.naifId) {
    const [authority, code] = MOON_GEOGRAPHIC_CRS.split(":") as [
      string,
      string,
    ];
    return { format: "wkid", authority, wkid: Number(code) };
  }
  throw new Error(
    `EngineeringFrame: no geographic CRS is known for the body "${body.name}"`,
  );
}

/** Whether `catalog` has `name` as a current (not removed) grid. */
function inCatalog(catalog: GridCatalog, name: string): boolean {
  const entry = catalog.get(name);
  return entry !== undefined && !entry.removed;
}

/**
 * Whether `load` fetches `name`: a current catalog entry that isn't a
 * deformation model. A model's `.json` names component grids inside it,
 * which neither the pipeline nor PROJ's list of grids names, and PROJ can't
 * build the model without them; so `load` leaves it to `create`'s fallback.
 */
function fetchable(catalog: GridCatalog, name: string): boolean {
  return (
    inCatalog(catalog, name) && catalog.get(name)!.type !== "DEFORMATION_MODEL"
  );
}

/**
 * The grids `load` fetches for a frame: a pinned pipeline's (required and
 * optional) that are `fetchable`; otherwise the missing grids of the first
 * non-ballpark candidate, in `listOperations`' order, that has a PROJ string
 * and whose missing grids are every one `fetchable`. A candidate needing a
 * grid that isn't gets nothing fetched (part of its grids wouldn't make it
 * usable); `create` then skips it and records it as a better candidate.
 *
 * This mirrors the candidate rule of `resolveOperation`'s walk (crs.ts): the
 * first non-ballpark, instantiable candidate with a PROJ string and all its
 * grids. Keep the two together. It doesn't mirror the better rule
 * (`betterThan`): it fetches the first candidate's grids, whatever its geoid.
 */
function gridsToLoad(
  wanted: Wanted,
  proj: ProjApi,
  target: CrsRef,
  catalog: GridCatalog,
): readonly string[] {
  const loaded = loadedGrids(proj);
  const { pipeline } = wanted;
  if (pipeline !== undefined) {
    const named = pipelineGrids(
      typeof pipeline === "string" ? parsePipeline(pipeline) : pipeline,
    ).map((grid) => grid.name);
    return [...new Set(named)].filter(
      (name) => !loaded.has(name) && fetchable(catalog, name),
    );
  }
  const candidates = listOperations(
    proj,
    wanted.crs,
    target,
    listOptions(wanted),
  );
  for (const candidate of candidates) {
    if (candidate.ballpark || candidate.pipeline === "") {
      continue;
    }
    if (candidate.missingGrids.length === 0) {
      if (candidate.instantiable) {
        return [];
      }
      continue;
    }
    if (candidate.missingGrids.every((name) => fetchable(catalog, name))) {
      return candidate.missingGrids;
    }
  }
  return [];
}

/**
 * Whether `resolveOperation`'s walk (crs.ts) can take a candidate now: not a
 * ballpark (unless `allowBallpark`), with a PROJ string, every grid loaded,
 * and instantiable. Keep with that walk and `gridsToLoad`.
 */
function usable(
  candidate: OperationCandidate,
  allowBallpark: boolean,
): boolean {
  return (
    (allowBallpark || !candidate.ballpark) &&
    candidate.pipeline !== "" &&
    candidate.missingGrids.length === 0 &&
    candidate.instantiable
  );
}

/** `listOperations`' options for a request: its area of interest. */
function listOptions(wanted: Wanted): {
  areaOfInterest?: AreaOfInterest;
} {
  return wanted.areaOfInterest === undefined
    ? {}
    : { areaOfInterest: wanted.areaOfInterest };
}

/**
 * Whether a definition's `geoidFallback` applies (call 9), and so the CRS it
 * makes the frame resolve instead, with the grids the CRS's best candidate
 * lacks: `crs` is an EPSG `wkid` reference with a `vcsWkid`; none of PROJ's
 * candidates for it is usable now and a non-ballpark one lacks grids (its
 * resolution fails for missing grids); and the horizontal CRS alone has a
 * usable non-ballpark candidate (it resolves with none missing). Otherwise
 * why it doesn't apply; undefined without a `geoidFallback`.
 */
function fallbackCrs(
  wanted: Wanted,
  proj: ProjApi,
  target: CrsRef,
):
  | { readonly crs: CrsRef; readonly missingGrids: readonly string[] }
  | { readonly reason: string }
  | undefined {
  const { crs, geoidFallback } = wanted;
  if (geoidFallback === undefined) {
    return undefined;
  }
  if (
    crs.format !== "wkid" ||
    crs.vcsWkid === undefined ||
    crs.authority.toUpperCase() !== "EPSG" ||
    (crs.vcsAuthority ?? "EPSG").toUpperCase() !== "EPSG"
  ) {
    return { reason: "the CRS isn't an EPSG code with a vcsWkid" };
  }
  const options = listOptions(wanted);
  const allowBallpark = wanted.allowBallpark ?? false;
  const candidates = listOperations(proj, crs, target, options);
  const lacking = candidates.find(
    (c) => !c.ballpark && c.pipeline !== "" && c.missingGrids.length > 0,
  );
  if (
    candidates.some((c) => usable(c, allowBallpark)) ||
    lacking === undefined
  ) {
    return { reason: "the CRS doesn't fail for missing grids" };
  }
  const horizontal = compoundParts(proj, crs)!.horizontal;
  if (
    !listOperations(proj, horizontal.ref, target, options).some((c) =>
      usable(c, false),
    )
  ) {
    return {
      reason: `the horizontal CRS ${shownCrs(horizontal.ref)} doesn't resolve alone`,
    };
  }
  return {
    crs: { ...crs, vcsWkid: GEOID_MODEL_CRS[geoidFallback] },
    missingGrids: lacking.missingGrids,
  };
}

/** At most `max` names, then "and N more". */
function someOf(names: readonly string[], max = 3): string {
  return names.length <= max
    ? names.join(", ")
    : `${names.slice(0, max).join(", ")} and ${names.length - max} more`;
}

/**
 * Call 11's message, for a compound CRS that only ballparks relate to the
 * ellipsoid although its horizontal CRS alone has an operation that isn't
 * one: the vertical part is to blame. `proj.db` then tells two cases apart
 * (`verticalGridDatums`):
 *
 *  - grids for the vertical datum exist, defined on another geographic CRS
 *    (NAVD88 with WGS 84 / UTM: GEOID18 is on NAD83(2011)): the message names
 *    that CRS and the fix;
 *  - none found (NOAA's MLLW depth, EPSG:5866, has no transformation): "<the
 *    vertical CRS>: no PROJ-data grid relates it to the ellipsoid", saying
 *    what proj.db was searched for.
 *
 * Before either: with an `areaOfInterest`, when PROJ has an accurate
 * operation for the compound CRS without it, the area is to blame (British
 * National Grid + ODN with a box reaching south of OSGM15's 49.93° N), and
 * the message says so, with that operation's area of use (plan 4b Task 9).
 *
 * The search is by name, which is conclusive only for an EPSG vertical CRS;
 * for any other (ESRI:105703, NAVD88_height_(ftUS), finds nothing although
 * GEOID18 relates NAVD88 to NAD83(2011)) the generic message stands. So it
 * does when nothing applies.
 */
function noVerticalGrid(
  proj: ProjApi,
  wanted: Wanted,
  target: CrsRef,
): string | undefined {
  const parts = compoundParts(proj, wanted.crs);
  if (parts === undefined) {
    return undefined;
  }
  const options = listOptions(wanted);
  const compound = listOperations(proj, wanted.crs, target, options);
  if (
    compound.length === 0 ||
    !compound.every((c) => c.ballpark) ||
    listOperations(proj, parts.horizontal.ref, target, options).every(
      (c) => c.ballpark,
    )
  ) {
    return undefined;
  }
  const from = shownCrs(wanted.crs);
  const ballpark =
    "PROJ offers only a ballpark operation, with undefined accuracy (pass allowBallpark: true to accept it)";
  const { name } = parts.vertical;
  const area = wanted.areaOfInterest;
  if (area !== undefined) {
    const anywhere = listOperations(proj, wanted.crs, target).find(
      (c) => !c.ballpark,
    );
    if (anywhere !== undefined) {
      const degrees = (value: number) => `${value.toFixed(4)}°`;
      const box = (b: AreaOfInterest) =>
        `W ${degrees(b.west)}, S ${degrees(b.south)}, E ${degrees(b.east)}, N ${degrees(b.north)}`;
      const accuracy =
        anywhere.accuracy === undefined ? "" : ` (${anywhere.accuracy} m)`;
      const applies =
        anywhere.areaOfUse === undefined
          ? ""
          : `, applies to ${box(anywhere.areaOfUse)}`;
      return `${name}: no accurate operation from ${from} covers the area of interest (${box(area)}); PROJ's best without the area, ${anywhere.name}${accuracy}${applies}. ${ballpark}`;
    }
  }
  const here = parts.horizontal.geodeticName ?? parts.horizontal.name;
  const { datums, geoidModels, authority } = verticalGridDatums(
    proj,
    parts.vertical.ref,
  );
  if (authority?.toUpperCase() !== "EPSG") {
    return undefined;
  }
  if (datums.some((datum) => datum.name === here)) {
    // Grids on this very datum, and still only ballparks: not this case.
    return undefined;
  }
  if (datums.length > 0) {
    const best = datums[0]!;
    const vertical = parts.vertical.ref;
    const compoundCode =
      best.geographic2d !== undefined && vertical.format === "wkid"
        ? `, or the compound ${best.geographic2d}+${vertical.wkid}`
        : "";
    const accuracy = best.accuracy === undefined ? "" : `, ${best.accuracy} m`;
    return `${name}: its grids are defined on ${someOf(datums.map((d) => d.name))}, not on ${here} (from ${from}); use a horizontal CRS on ${best.name}${compoundCode} (best: ${best.transformation}${accuracy}). ${ballpark}`;
  }
  // What follows is only what the search found: say so.
  if (geoidModels.length > 0) {
    return `${name}: proj.db names geoid models for it (${someOf(geoidModels)}) but lists no grid transformation by its name, so which horizontal datum they need isn't known here (from ${from}); ${ballpark}`;
  }
  return `${name}: no PROJ-data grid relates it to the ellipsoid, as far as proj.db shows: it lists no grid transformation by its name (or by a vertical CRS's on its datum) and no geoid model for it (from ${from}); ${ballpark}`;
}

/** `f()`, or undefined if it throws. */
function unlessThrows<T>(f: () => T): T | undefined {
  try {
    return f();
  } catch {
    return undefined;
  }
}

/** A request's checks, before PROJ resolves (or fetches) anything. */
interface Checked {
  readonly target: CrsRef;
  readonly units: CrsUnits;
}

/** The request's checks, before PROJ resolves (or fetches) anything. */
function checked(proj: ProjApi, wanted: Wanted): Checked {
  const target = geographicTarget(wanted.body);
  const { geoidFallback, fallbackSigma, fallbackSigmaSource } = wanted;
  if (
    geoidFallback !== undefined &&
    !Object.hasOwn(GEOID_MODEL_CRS, geoidFallback)
  ) {
    throw new RangeError(
      `EngineeringFrame: geoidFallback must be "EGM96" or "EGM2008", got ${JSON.stringify(geoidFallback)}`,
    );
  }
  if (fallbackSigma !== undefined) {
    if (!(fallbackSigma > 0 && Number.isFinite(fallbackSigma))) {
      throw new RangeError(
        `EngineeringFrame: fallbackSigma must be a positive number of metres, got ${fallbackSigma}`,
      );
    }
    if (geoidFallback === undefined) {
      throw new RangeError(
        "EngineeringFrame: fallbackSigma is given without a geoidFallback",
      );
    }
  }
  if (
    fallbackSigmaSource !== undefined &&
    fallbackSigmaSource !== "app" &&
    fallbackSigmaSource !== "declaration"
  ) {
    throw new RangeError(
      `EngineeringFrame: fallbackSigmaSource must be "app" or "declaration", got ${JSON.stringify(fallbackSigmaSource)}`,
    );
  }
  if (geoidFallback !== undefined && wanted.pipeline !== undefined) {
    throw new Error(
      "EngineeringFrame: geoidFallback doesn't apply to a pinned pipeline; pin the fallback CRS's pipeline instead",
    );
  }
  const units = crsUnits(proj, wanted.crs);
  if (!units.projected) {
    throw new Error(
      `EngineeringFrame: an engineering frame needs a projected CRS; ${shownCrs(wanted.crs)} is geographic or not projected`,
    );
  }
  return { target, units };
}

/**
 * Resolves the PROJ operation once (R2), with the grids loaded now: the
 * engineering frame's `create`. See `EngineeringFrame.create` for the
 * rules (better candidates, a pinned pipeline's matched candidate, the
 * geoid fallback, call 11's message).
 */
function resolveProj(
  proj: ProjApi,
  wanted: Wanted,
  { target: targetRef, units }: Checked,
  catalog: GridCatalog | undefined,
): ProjResolvedCoordinates {
  const target = crsDefinition(targetRef);
  const options = {
    ...(wanted.pipeline !== undefined && {
      pipeline: wanted.pipeline,
    }),
    ...(wanted.allowBallpark !== undefined && {
      allowBallpark: wanted.allowBallpark,
    }),
    ...(wanted.areaOfInterest !== undefined && {
      areaOfInterest: wanted.areaOfInterest,
    }),
  };
  let operation: RecordedOperation;
  let fallback: EngineeringFrameFallback | undefined;
  let operationHeight = 1;
  try {
    operation = resolveOperation(proj, wanted.crs, target, options);
  } catch (error) {
    // The diagnoses list PROJ's candidates again; should that fail, the
    // resolution's own error stands.
    const decided = unlessThrows(() => fallbackCrs(wanted, proj, targetRef));
    if (decided === undefined || !("crs" in decided)) {
      // Only PROJ's own search, refused for its ballpark: a pinned
      // pipeline's error, or one with allowBallpark, stands as it is.
      const message =
        wanted.pipeline === undefined && wanted.allowBallpark !== true
          ? unlessThrows(() => noVerticalGrid(proj, wanted, targetRef))
          : undefined;
      const why =
        decided === undefined
          ? ""
          : ` (geoidFallback "${wanted.geoidFallback}" doesn't apply: ${decided.reason})`;
      if (message !== undefined) {
        throw new Error(`${message}${why}`, { cause: error });
      }
      if (why !== "" && error instanceof Error) {
        // The same error, its class kept, with the reason appended.
        error.message += why;
      }
      throw error;
    }
    const replacement = decided.crs;
    const model = wanted.geoidFallback!;
    try {
      operation = resolveOperation(proj, replacement, target, options);
    } catch (fallbackError) {
      throw new Error(
        `the ${model} fallback for ${shownCrs(wanted.crs)} (${(error as Error).message}) can't be resolved either: ${(fallbackError as Error).message}`,
        { cause: fallbackError },
      );
    }
    fallback = {
      model,
      replacedVertical: (wanted.crs as { vcsWkid: number }).vcsWkid,
      missingGrids: decided.missingGrids,
      ...(wanted.fallbackSigma !== undefined && {
        sigma: wanted.fallbackSigma,
        sigmaSource: wanted.fallbackSigmaSource ?? "app",
      }),
    };
    // Design heights keep the CRS's vertical unit and direction; the
    // operation takes the model's.
    const model3d = crsUnits(proj, replacement);
    const signed = (u: CrsUnits) =>
      (u.metersPerVerticalUnit ?? 1) *
      (u.verticalDirection === "down" ? -1 : 1);
    operationHeight = signed(units) / signed(model3d);
  }
  // PROJ converts a vertical axis's unit on the way to EPSG:4979. Where it
  // does not (the Moon's target passes heights through; a CRS with no
  // vertical axis has nothing to convert), the design height is in the
  // vertical unit, or else the horizontal one, and the operation converts
  // it here.
  const projConverts =
    target === "EPSG:4979" && units.metersPerVerticalUnit !== undefined;
  const heightScale = projConverts
    ? 1
    : (units.metersPerVerticalUnit ?? units.metersPerUnit);
  let credits: string[] = [];
  if (catalog !== undefined) {
    const loaded = loadedGrids(proj);
    const credited = operation.grids.filter(
      (name) => loaded.has(name) && inCatalog(catalog, name),
    );
    credits = [...new Set(credited.map((name) => catalog.credit(name)))];
  }
  const inMetres = withHeights(operation, heightScale, operationHeight);
  const answer: ProjResolvedCoordinates = {
    operation: inMetres,
    units,
    gridFactors: projGridFactors(
      proj,
      wanted.crs,
      units.metersPerUnit,
      (projected) => inMetres.forward(projected)[2]!,
    ),
    credits,
    proj,
    ...(fallback !== undefined && { fallback }),
  };
  projAnswers.add(answer);
  return answer;
}

/**
 * `operation` with its heights in metres: the input height times
 * `operationHeight` (a fallback model's unit and direction per design
 * height unit) on the way in, and the output height times `heightScale`
 * (metres per height PROJ passes through) on the way out; `inverse` the
 * reverse. `operation` itself when both are 1.
 */
function withHeights(
  operation: RecordedOperation,
  heightScale: number,
  operationHeight: number,
): RecordedOperation {
  if (heightScale === 1 && operationHeight === 1) {
    return operation;
  }
  return {
    ...operation,
    forward: (xyz, out = new Float64Array(3)) => {
      const input =
        operationHeight === 1
          ? xyz
          : [xyz[0]!, xyz[1]!, (xyz[2] ?? 0) * operationHeight];
      operation.forward(input, out);
      out[2] = out[2]! * heightScale;
      return out;
    },
    inverse: (xyz, out = new Float64Array(3)) => {
      operation.inverse([xyz[0]!, xyz[1]!, (xyz[2] ?? 0) / heightScale], out);
      if (operationHeight !== 1) {
        out[2] = out[2]! / operationHeight;
      }
      return out;
    },
  };
}

/** @internal `create`'s resolution, synchronous: the grids loaded now, no catalog. */
export function resolveProjCoordinates(
  proj: ProjApi,
  request: CoordinateRequest,
): ProjResolvedCoordinates {
  const wanted = wantedOf(request);
  return resolveProj(proj, wanted, checked(proj, wanted), undefined);
}

function abortError(): DOMException {
  return new DOMException(
    "projCoordinateService: the resolution was aborted",
    "AbortError",
  );
}

/**
 * PROJ as a `CoordinateService`: an engineering frame's resolution (R2,
 * R4), after fetching the grids the best operation needs from `grids`.
 *
 * `resolve` checks the request before fetching anything (a body with no
 * known geographic CRS, a CRS that isn't projected, a malformed geoid
 * fallback), as `EngineeringFrame.create` throws. With `grids` it lists
 * PROJ's candidates (within the area of interest) and loads the missing
 * grids of the first non-ballpark one whose missing grids the catalog has
 * (a pinned pipeline: the grids it names that the catalog has), and, when
 * a `geoidFallback` will apply, what the fallback CRS's best operation
 * needs (the model's grid). A grid the catalog lacks is never fetched; the
 * resolution then takes the next candidate and records the skipped one in
 * `operation.betterCandidates` if it is better. Without `grids` nothing is
 * fetched and `credits` is empty.
 *
 * The request is a `ProjCoordinateRequest`: `pinned` is a PROJ pipeline,
 * and the definition's PROJ options ride along. The answer is a
 * `ProjResolvedCoordinates`.
 *
 * An aborted `signal` rejects with an `AbortError`, checked before and
 * after fetching; a grid fetch already under way finishes (`loadGrids` has
 * no signal), and a grid it loaded stays loaded, as any grid does.
 */
export function projCoordinateService(options: {
  readonly proj: ProjApi;
  readonly grids?: GridSource;
}): CoordinateService {
  const { proj, grids } = options;
  const service: CoordinateService = {
    async resolve(request, { signal } = {}) {
      if (signal?.aborted) {
        throw abortError();
      }
      const wanted = wantedOf(request);
      const checks = checked(proj, wanted);
      if (grids !== undefined) {
        const names = gridsToLoad(wanted, proj, checks.target, grids.catalog);
        if (names.length > 0) {
          await loadGrids(proj, grids, names);
        }
        // A fallback that will apply: fetch what its CRS's best operation
        // needs (the model's grid).
        const fallback = unlessThrows(() =>
          fallbackCrs(wanted, proj, checks.target),
        );
        if (fallback !== undefined && "crs" in fallback) {
          const more = gridsToLoad(
            { ...wanted, crs: fallback.crs },
            proj,
            checks.target,
            grids.catalog,
          );
          if (more.length > 0) {
            await loadGrids(proj, grids, more);
          }
        }
      }
      if (signal?.aborted) {
        throw abortError();
      }
      return resolveProj(proj, wanted, checks, grids?.catalog);
    },
  };
  projServices.add(service);
  return service;
}
