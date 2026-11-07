// Engineering frames: a design CRS (an engineer's projected, ground or site
// coordinates) placed on a body through a recorded PROJ operation (plan 4a).
//
// The chain from design to body-fixed is
//
//   design (site grid, design units)
//     -> site transform (R6)            -> projected CRS coordinates, CRS units
//     -> PROJ operation (R2, R4)        -> geographic: degrees, height
//     -> body.ellipsoid                 -> body-fixed metres
//
// PROJ ends at the body's geographic CRS (EPSG:4979 for the Earth,
// MOON_GEOGRAPHIC_CRS for the Moon); the engine's own `Ellipsoid` does geodetic
// to body-fixed (R4).
import { EARTH, MOON, type Body } from "../scene/Body.ts";
import { cartographic, type Cartographic } from "../math/ellipsoid.ts";
import * as m4 from "../math/mat4.ts";
import * as v3 from "../math/vec3.ts";
import type { Mat4 } from "../math/mat4.ts";
import {
  MOON_GEOGRAPHIC_CRS,
  crsUnits,
  crsDefinition,
  shownCrs,
  listOperations,
  compoundParts,
  resolveOperation,
  verticalGridDatums,
  type AreaOfInterest,
  type CrsRef,
  type CrsUnits,
  type OperationCandidate,
  type RecordedOperation,
} from "./crs.ts";
import type { GridCatalog } from "./gridCatalog.ts";
import { parsePipeline, pipelineGrids, type Pipeline } from "./pipeline.ts";
import { loadedGrids, loadGrids, type GridSource } from "./proj.ts";
import type { ProjApi } from "./projApi.ts";
import { Alignment, type AlignmentDefinition } from "./alignment.ts";

/**
 * A site (ground) coordinate system on the projected CRS, R6:
 *
 *   [E, N] = [E0, N0] + scale * R(rotation) * [e, n]        U = U0 + u
 *
 * where (e, n, u) are site-grid coordinates in design units and (E, N, U) the
 * projected CRS's coordinates in its units. Height is not scaled. The inverse
 * is exact.
 */
export interface SiteTransform {
  /** The site origin (E0, N0, U0) in the CRS's units. */
  readonly origin: readonly [number, number, number];
  /** Radians, counterclockwise from the CRS's grid east. */
  readonly rotation: number;
  /** The site scale factor (a ground-to-grid factor, or a Helmert scale). */
  readonly scale: number;
}

export interface EngineeringFrameDefinition {
  readonly name: string;
  readonly body: Body;
  readonly crs: CrsRef;
  readonly site?: SiteTransform;
  /** Alignments in this frame's design (site-grid) coordinates, by unique name. */
  readonly alignments?: readonly AlignmentDefinition[];
  /**
   * A PROJ pipeline to use as is (R2) instead of PROJ's candidate search: a
   * string, or a structured `Pipeline`.
   */
  readonly pipeline?: string | Pipeline;
  /** Accept a ballpark operation; its accuracy is then undefined. */
  readonly allowBallpark?: boolean;
  /**
   * Where the design coordinates are, in degrees. PROJ then offers the
   * operations whose area of use contains it (see `ResolveOptions`).
   */
  readonly areaOfInterest?: AreaOfInterest;
  /**
   * A global geoid to read design heights against when the CRS's own
   * vertical datum can't be used (the plan's call 9). It applies only when
   * `crs` is a `wkid` reference with a `vcsWkid` (EPSG), PROJ's candidates
   * for it fail for want of grids, and the horizontal CRS alone resolves with
   * none missing. The frame then resolves `{ ...crs, vcsWkid: 5773 }`
   * (EGM96) or `3855` (EGM2008) and records it in `fallback`; `load` fetches
   * the model's grid. Design heights keep the CRS's vertical unit and
   * direction. Not with `pipeline`.
   */
  readonly geoidFallback?: GeoidModel;
  /**
   * The fallback's standard uncertainty in metres, as the app knows it (the
   * gap between the replaced datum and the model). Without it the fallback's
   * accuracy is undefined, never small. Positive; only with `geoidFallback`.
   */
  readonly fallbackSigma?: number;
}

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
  /** `fallbackSigma`, metres; absent when the app gave none (accuracy undefined). */
  readonly sigma?: number;
  /** The grids PROJ's best candidate for the CRS lacked: why it fell back. */
  readonly missingGrids: readonly string[];
}

/** Options for `EngineeringFrame.load`. */
export interface EngineeringFrameLoadOptions {
  /** PROJ, from `loadProj`. */
  readonly proj: ProjApi;
  /**
   * Where grids come from. Without it `load` loads nothing and is `create`
   * (and `gridCredits` is empty).
   */
  readonly grids?: GridSource;
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
  definition: EngineeringFrameDefinition,
  proj: ProjApi,
  target: CrsRef,
  catalog: GridCatalog,
): readonly string[] {
  const loaded = loadedGrids(proj);
  const { pipeline } = definition;
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
    definition.crs,
    target,
    listOptions(definition),
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

/** `listOperations`' options for a definition: its area of interest. */
function listOptions(definition: EngineeringFrameDefinition): {
  areaOfInterest?: AreaOfInterest;
} {
  return definition.areaOfInterest === undefined
    ? {}
    : { areaOfInterest: definition.areaOfInterest };
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
  definition: EngineeringFrameDefinition,
  proj: ProjApi,
  target: CrsRef,
):
  | { readonly crs: CrsRef; readonly missingGrids: readonly string[] }
  | { readonly reason: string }
  | undefined {
  const { crs, geoidFallback } = definition;
  if (geoidFallback === undefined) {
    return undefined;
  }
  if (
    crs.format !== "wkid" ||
    crs.vcsWkid === undefined ||
    crs.authority.toUpperCase() !== "EPSG"
  ) {
    return { reason: "the CRS isn't an EPSG code with a vcsWkid" };
  }
  const options = listOptions(definition);
  const allowBallpark = definition.allowBallpark ?? false;
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
  definition: EngineeringFrameDefinition,
  target: CrsRef,
): string | undefined {
  const parts = compoundParts(proj, definition.crs);
  if (parts === undefined) {
    return undefined;
  }
  const options = listOptions(definition);
  const compound = listOperations(proj, definition.crs, target, options);
  if (
    compound.length === 0 ||
    !compound.every((c) => c.ballpark) ||
    listOperations(proj, parts.horizontal.ref, target, options).every(
      (c) => c.ballpark,
    )
  ) {
    return undefined;
  }
  const from = shownCrs(definition.crs);
  const ballpark =
    "PROJ offers only a ballpark operation, with undefined accuracy (pass allowBallpark: true to accept it)";
  const { name } = parts.vertical;
  const area = definition.areaOfInterest;
  if (area !== undefined) {
    const anywhere = listOperations(proj, definition.crs, target).find(
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

const RADIANS_PER_DEGREE = Math.PI / 180;

/**
 * A design CRS on a body. Design coordinates are (e, n, u) in the CRS's own
 * units (`units`, from PROJ, never assumed; R5): the projected CRS's easting
 * and northing in `units.metersPerUnit`, and its height. When `definition.site`
 * is set they are site-grid coordinates instead (see `SiteTransform`).
 *
 * Heights. A design height is in the CRS's vertical unit (its horizontal unit
 * when the CRS has no vertical axis) and the geodetic height is in metres above
 * the body's ellipsoid. For the Earth with a vertical axis PROJ converts the
 * unit on the way to EPSG:4979 (100 ftUS on EPSG:6420+6360 is 30.48 m above the
 * geoid, plus the geoid separation). Otherwise, including the Moon, whose
 * operation to MOON_GEOGRAPHIC_CRS passes heights through unchanged, the frame
 * converts the unit itself; a Moon height is above the IAU 1,737,400 m sphere.
 */
export class EngineeringFrame {
  readonly definition: EngineeringFrameDefinition;
  readonly units: CrsUnits;
  readonly operation: RecordedOperation;
  readonly body: Body;
  /** The PROJ the frame's operation was resolved with. */
  readonly proj: ProjApi;
  /** The frame's alignments, built from `definition.alignments`. */
  readonly alignments: readonly Alignment[];
  /** Metres per design height unit: the vertical unit, else the horizontal. */
  readonly metersPerHeightUnit: number;
  /**
   * Credits for the grids the operation reads (`GridCatalog.credit`: agency,
   * license and PROJ-data version), each once, in the operation's grid
   * order, when the frame was made by `load` with a `GridSource`; otherwise
   * empty.
   */
  readonly gridCredits: readonly string[];
  /**
   * The geoid fallback the frame took (`definition.geoidFallback`), when it
   * took one: `operation` is then the fallback CRS's, and design heights are
   * that model's heights, in `units`' vertical unit and direction.
   */
  readonly fallback?: EngineeringFrameFallback;
  // Metres per design height unit the operation leaves unconverted; 1 where
  // PROJ already returns metres.
  private readonly heightScale: number;
  // The operation's input height per design height unit: 1, except for a
  // fallback whose CRS's vertical unit or direction differs from the
  // model's (metres, up).
  private readonly operationHeight: number;

  private constructor(
    definition: EngineeringFrameDefinition,
    units: CrsUnits,
    operation: RecordedOperation,
    heightScale: number,
    proj: ProjApi,
    gridCredits: readonly string[],
    fallback: EngineeringFrameFallback | undefined,
    operationHeight: number,
  ) {
    this.proj = proj;
    if (fallback !== undefined) {
      this.fallback = fallback;
    }
    this.operationHeight = operationHeight;
    this.gridCredits = gridCredits;
    this.definition = definition;
    this.alignments = (definition.alignments ?? []).map(
      (a) => new Alignment(a),
    );
    const names = new Set<string>();
    for (const { name } of this.alignments) {
      if (names.has(name)) {
        throw new Error(
          `EngineeringFrame "${definition.name}": two alignments are named "${name}"`,
        );
      }
      names.add(name);
    }
    this.units = units;
    this.operation = operation;
    this.body = definition.body;
    this.heightScale = heightScale;
    this.metersPerHeightUnit =
      units.metersPerVerticalUnit ?? units.metersPerUnit;
  }

  /**
   * Resolves the PROJ operation once (R2), with the grids loaded now. Throws
   * for a body with no known geographic CRS, and as `resolveOperation` does
   * when no operation has its grids. The candidates it skips for missing
   * grids that are better than the one taken are in
   * `operation.betterCandidates` (crs.ts `betterThan`): not a ballpark;
   * reading the same vertical grids as the one taken (the same geoid
   * model), unless the one taken is a ballpark; and with a strictly smaller
   * stated accuracy, or any when the one taken states none. A pinned
   * pipeline has none, and keeps the stated accuracy of the PROJ candidate
   * it matches (`operation.matchedCandidate`).
   *
   * With `geoidFallback`, a CRS that fails for missing grids resolves the
   * fallback CRS instead (see `EngineeringFrameDefinition.geoidFallback`;
   * the model's grid must be loaded). A compound CRS whose vertical part
   * only a ballpark relates to the ellipsoid (MLLW depth) throws
   * "<vertical CRS name>: no PROJ-data grid relates it to the ellipsoid"
   * (call 11) unless `allowBallpark` is set.
   */
  static create(
    definition: EngineeringFrameDefinition,
    proj: ProjApi,
  ): EngineeringFrame {
    return EngineeringFrame.resolve(
      definition,
      proj,
      EngineeringFrame.checked(definition, proj),
      undefined,
    );
  }

  /**
   * `create`, after fetching the grids the best operation needs. With
   * `grids`, it lists PROJ's candidates (within `definition.areaOfInterest`)
   * and loads, from `grids`, the missing grids of the first non-ballpark one
   * whose missing grids the catalog has (a pinned pipeline: the grids it
   * names that the catalog has), then calls `create`. A grid the catalog
   * lacks is never fetched: `create` then takes the next candidate and
   * records the skipped one in `operation.betterCandidates` if it is better
   * by `create`'s rule (not a ballpark; the same vertical grids, unless the
   * one taken is a ballpark; a strictly smaller stated accuracy). Which
   * grids `load` fetches doesn't follow that rule: it fetches the first
   * candidate's. When a
   * `geoidFallback` will apply, it also fetches what the fallback CRS's
   * best operation needs (the model's grid, `us_nga_egm96_15.tif` or
   * `us_nga_egm08_25.tif`). Rejects as `create` throws, before fetching
   * anything for a definition `create` refuses, and as `loadGrids` rejects.
   */
  static async load(
    definition: EngineeringFrameDefinition,
    options: EngineeringFrameLoadOptions,
  ): Promise<EngineeringFrame> {
    const { proj, grids } = options;
    const checked = EngineeringFrame.checked(definition, proj);
    if (grids !== undefined) {
      const names = gridsToLoad(
        definition,
        proj,
        checked.target,
        grids.catalog,
      );
      if (names.length > 0) {
        await loadGrids(proj, grids, names);
      }
      // A fallback that will apply: fetch what its CRS's best operation
      // needs (the model's grid).
      const fallback = unlessThrows(() =>
        fallbackCrs(definition, proj, checked.target),
      );
      if (fallback !== undefined && "crs" in fallback) {
        const more = gridsToLoad(
          { ...definition, crs: fallback.crs },
          proj,
          checked.target,
          grids.catalog,
        );
        if (more.length > 0) {
          await loadGrids(proj, grids, more);
        }
      }
    }
    return EngineeringFrame.resolve(definition, proj, checked, grids?.catalog);
  }

  /** The definition's checks, before PROJ resolves anything. */
  private static checked(
    definition: EngineeringFrameDefinition,
    proj: ProjApi,
  ): { readonly target: CrsRef; readonly units: CrsUnits } {
    const target = geographicTarget(definition.body);
    const { site, geoidFallback, fallbackSigma } = definition;
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
    if (geoidFallback !== undefined && definition.pipeline !== undefined) {
      throw new Error(
        "EngineeringFrame: geoidFallback doesn't apply to a pinned pipeline; pin the fallback CRS's pipeline instead",
      );
    }
    if (site !== undefined) {
      if (!(site.scale > 0 && Number.isFinite(site.scale))) {
        throw new RangeError(
          `EngineeringFrame: site scale must be positive, got ${site.scale}`,
        );
      }
      if (!Number.isFinite(site.rotation)) {
        throw new RangeError(
          `EngineeringFrame: site rotation must be finite, got ${site.rotation}`,
        );
      }
      if (site.origin.length !== 3 || !site.origin.every(Number.isFinite)) {
        throw new RangeError(
          `EngineeringFrame: site origin must be three finite numbers, got [${site.origin.join(", ")}]`,
        );
      }
    }
    const units = crsUnits(proj, definition.crs);
    if (!units.projected) {
      throw new Error(
        `EngineeringFrame: an engineering frame needs a projected CRS; ${shownCrs(definition.crs)} is geographic or not projected`,
      );
    }
    return { target, units };
  }

  private static resolve(
    definition: EngineeringFrameDefinition,
    proj: ProjApi,
    { target: targetRef, units }: { target: CrsRef; units: CrsUnits },
    catalog: GridCatalog | undefined,
  ): EngineeringFrame {
    const target = crsDefinition(targetRef);
    const options = {
      ...(definition.pipeline !== undefined && {
        pipeline: definition.pipeline,
      }),
      ...(definition.allowBallpark !== undefined && {
        allowBallpark: definition.allowBallpark,
      }),
      ...(definition.areaOfInterest !== undefined && {
        areaOfInterest: definition.areaOfInterest,
      }),
    };
    let operation: RecordedOperation;
    let fallback: EngineeringFrameFallback | undefined;
    let operationHeight = 1;
    try {
      operation = resolveOperation(proj, definition.crs, target, options);
    } catch (error) {
      // The diagnoses list PROJ's candidates again; should that fail, the
      // resolution's own error stands.
      const decided = unlessThrows(() =>
        fallbackCrs(definition, proj, targetRef),
      );
      if (decided === undefined || !("crs" in decided)) {
        // Only PROJ's own search, refused for its ballpark: a pinned
        // pipeline's error, or one with allowBallpark, stands as it is.
        const message =
          definition.pipeline === undefined && definition.allowBallpark !== true
            ? unlessThrows(() => noVerticalGrid(proj, definition, targetRef))
            : undefined;
        const why =
          decided === undefined
            ? ""
            : ` (geoidFallback "${definition.geoidFallback}" doesn't apply: ${decided.reason})`;
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
      const model = definition.geoidFallback!;
      try {
        operation = resolveOperation(proj, replacement, target, options);
      } catch (fallbackError) {
        throw new Error(
          `EngineeringFrame "${definition.name}": the ${model} fallback for ${shownCrs(definition.crs)} (${(error as Error).message}) can't be resolved either: ${(fallbackError as Error).message}`,
          { cause: fallbackError },
        );
      }
      fallback = {
        model,
        replacedVertical: (definition.crs as { vcsWkid: number }).vcsWkid,
        missingGrids: decided.missingGrids,
        ...(definition.fallbackSigma !== undefined && {
          sigma: definition.fallbackSigma,
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
    // vertical unit, or else the horizontal one, and the frame converts it.
    const projConverts =
      target === "EPSG:4979" && units.metersPerVerticalUnit !== undefined;
    const heightScale = projConverts
      ? 1
      : (units.metersPerVerticalUnit ?? units.metersPerUnit);
    let gridCredits: string[] = [];
    if (catalog !== undefined) {
      const loaded = loadedGrids(proj);
      const credited = operation.grids.filter(
        (name) => loaded.has(name) && inCatalog(catalog, name),
      );
      gridCredits = [...new Set(credited.map((name) => catalog.credit(name)))];
    }
    return new EngineeringFrame(
      definition,
      units,
      operation,
      heightScale,
      proj,
      gridCredits,
      fallback,
      operationHeight,
    );
  }

  /**
   * Projected-CRS coordinates (E, N, U) in CRS units of design coordinates:
   * the site transform, or a copy when the frame has none.
   */
  projected(
    design: ArrayLike<number>,
    out = new Float64Array(3),
  ): Float64Array {
    const e = design[0]!;
    const n = design[1]!;
    const u = design[2] ?? 0;
    const site = this.definition.site;
    if (site === undefined) {
      out[0] = e;
      out[1] = n;
      out[2] = u;
      return out;
    }
    const c = Math.cos(site.rotation);
    const s = Math.sin(site.rotation);
    out[0] = site.origin[0] + site.scale * (c * e - s * n);
    out[1] = site.origin[1] + site.scale * (s * e + c * n);
    out[2] = site.origin[2] + u;
    return out;
  }

  /** The exact inverse of `projected`: design coordinates of CRS coordinates. */
  fromProjected(
    projected: ArrayLike<number>,
    out = new Float64Array(3),
  ): Float64Array {
    const site = this.definition.site;
    const x = projected[0]!;
    const y = projected[1]!;
    const z = projected[2] ?? 0;
    if (site === undefined) {
      out[0] = x;
      out[1] = y;
      out[2] = z;
      return out;
    }
    const c = Math.cos(site.rotation);
    const s = Math.sin(site.rotation);
    const dx = (x - site.origin[0]) / site.scale;
    const dy = (y - site.origin[1]) / site.scale;
    out[0] = c * dx + s * dy;
    out[1] = -s * dx + c * dy;
    out[2] = z - site.origin[2];
    return out;
  }

  /** Geodetic position of a design point: radians and metres (R4). */
  toGeodetic(design: ArrayLike<number>): Cartographic {
    const projected = this.projected(design);
    if (this.operationHeight !== 1) {
      projected[2] = projected[2]! * this.operationHeight;
    }
    const geographic = this.operation.forward(projected);
    return cartographic(
      geographic[0]! * RADIANS_PER_DEGREE,
      geographic[1]! * RADIANS_PER_DEGREE,
      geographic[2]! * this.heightScale,
    );
  }

  /** Design units to body-fixed metres. */
  toBodyFixed(
    design: ArrayLike<number>,
    out = new Float64Array(3),
  ): Float64Array {
    this.body.ellipsoid.cartographicToCartesian(this.toGeodetic(design), out);
    return out;
  }

  /** Body-fixed metres to design units: the exact reverse of `toBodyFixed`. */
  fromBodyFixed(
    position: ArrayLike<number>,
    out = new Float64Array(3),
  ): Float64Array {
    const geodetic = this.body.ellipsoid.cartesianToCartographic(
      v3.copy(v3.vec3(), position),
      cartographic(),
    );
    if (geodetic === undefined) {
      throw new RangeError(
        "EngineeringFrame: a position at the body's centre has no design coordinates",
      );
    }
    const projected = this.operation.inverse([
      geodetic.longitude / RADIANS_PER_DEGREE,
      geodetic.latitude / RADIANS_PER_DEGREE,
      geodetic.height / this.heightScale,
    ]);
    if (this.operationHeight !== 1) {
      projected[2] = projected[2]! / this.operationHeight;
    }
    return this.fromProjected(projected, out);
  }
}

/** What a snap landed on: a vertex, an edge, a curve or a face. */
export type SnapKind = "point" | "segment" | "arc" | "surface";

/**
 * How a design point was obtained, when not typed in: picked on the screen
 * or snapped to geometry, within `tolerance` metres (its `pick` accuracy
 * term). `kind` is what a snap landed on.
 */
export interface DesignPointObtained {
  readonly how: "pick" | "snap";
  /** Metres; finite and not negative (an exact snap's is 0). */
  readonly tolerance: number;
  readonly kind?: SnapKind;
}

/** A position in design coordinates, with the frame that gives them meaning. */
export interface DesignPoint {
  readonly engineeringFrame: EngineeringFrame;
  readonly design: Float64Array;
  /** How the point was obtained; absent for a point given as numbers. */
  readonly obtained?: DesignPointObtained;
}

/**
 * A design point in `frame`. `obtained` says how it was picked or snapped;
 * throws for a tolerance that is negative or not finite, or a `kind` on a
 * pick.
 */
export function designPoint(
  frame: EngineeringFrame,
  design: ArrayLike<number>,
  obtained?: DesignPointObtained,
): DesignPoint {
  if (obtained !== undefined) {
    const { how, tolerance, kind } = obtained;
    if (how !== "pick" && how !== "snap") {
      throw new Error(
        `designPoint: obtained.how must be "pick" or "snap", got ${String(how)}`,
      );
    }
    if (!(Number.isFinite(tolerance) && tolerance >= 0)) {
      throw new Error(
        `designPoint: obtained.tolerance must be a finite number of metres, not negative, got ${tolerance}`,
      );
    }
    if (kind !== undefined && how !== "snap") {
      throw new Error(
        `designPoint: obtained.kind ("${kind}") is what a snap landed on; a pick has none`,
      );
    }
  }
  return {
    engineeringFrame: frame,
    design: new Float64Array([design[0]!, design[1]!, design[2] ?? 0]),
    ...(obtained !== undefined && {
      obtained: {
        how: obtained.how,
        tolerance: obtained.tolerance,
        ...(obtained.kind !== undefined && { kind: obtained.kind }),
      },
    }),
  };
}

/**
 * Rigid placement of design coordinates at one anchor, as an iModel's
 * `ecefLocation` does, matching `EXT_georeference`'s east-north-up semantics:
 * design (e, n, u) maps to body-fixed metres by one rotation, a uniform scale
 * and a translation. It is exact at the anchor and sags away from it (the
 * body curves away from the tangent plane: about 7.8 m at 10 km, spec 7.2).
 *
 *  - The origin is the anchor's exact body-fixed position, `frame.toBodyFixed`.
 *  - Up is the ellipsoid's surface normal there.
 *  - Grid north is the direction from `toBodyFixed(anchor)` to
 *    `toBodyFixed(anchor + one design unit along +N)` (along the frame's own
 *    design axes, so a site transform's rotation is included), projected onto
 *    the tangent plane and normalized. It comes from the operation itself, not
 *    from a convergence formula. East is north x up.
 *  - Scale is `units.metersPerUnit` horizontally and the frame's
 *    `metersPerHeightUnit` along up (the vertical unit, else the horizontal
 *    one), not the point scale factor, and not the site scale either. For a
 *    depth CRS (`units.verticalDirection` "down") it is -`metersPerHeightUnit`:
 *    the matrix's third column points down, and design depth +10 lies 10
 *    units below the anchor along the surface normal.
 */
export class RigidPlacement {
  readonly frame: EngineeringFrame;
  readonly anchor: Float64Array;
  /** Design units to body-fixed metres, column-major. */
  readonly matrix: Mat4;
  private readonly origin: Float64Array;
  private readonly east: Float64Array;
  private readonly north: Float64Array;
  private readonly up: Float64Array;
  private readonly scale: number;
  // Metres along up per design height unit: negative for a depth CRS.
  private readonly heightUnit: number;

  private constructor(frame: EngineeringFrame, anchorDesign: Float64Array) {
    this.frame = frame;
    this.anchor = anchorDesign;
    this.scale = frame.units.metersPerUnit;
    this.heightUnit =
      frame.units.verticalDirection === "down"
        ? -frame.metersPerHeightUnit
        : frame.metersPerHeightUnit;
    const origin = frame.toBodyFixed(anchorDesign);
    const up = v3.vec3();
    if (frame.body.ellipsoid.geodeticSurfaceNormal(origin, up) === undefined) {
      throw new RangeError(
        "RigidPlacement: the anchor is at the body's centre",
      );
    }
    const stepped = frame.toBodyFixed([
      anchorDesign[0]!,
      anchorDesign[1]! + 1,
      anchorDesign[2]!,
    ]);
    const north = v3.sub(v3.vec3(), stepped, origin);
    // Remove the vertical part, leaving the tangent-plane direction.
    v3.scaleAndAdd(north, north, up, -v3.dot(north, up));
    v3.normalize(north, north);
    const east = v3.cross(v3.vec3(), north, up);
    this.origin = origin;
    this.east = east;
    this.north = north;
    this.up = up;

    const k = this.scale;
    const kz = this.heightUnit;
    const t = v3.vec3();
    for (let i = 0; i < 3; i++) {
      t[i] =
        origin[i]! -
        (k * (east[i]! * anchorDesign[0]! + north[i]! * anchorDesign[1]!) +
          kz * up[i]! * anchorDesign[2]!);
    }
    this.matrix = m4.fromBasis(
      m4.mat4(),
      v3.scale(v3.vec3(), east, k),
      v3.scale(v3.vec3(), north, k),
      v3.scale(v3.vec3(), up, kz),
      t,
    );
  }

  static at(
    frame: EngineeringFrame,
    anchorDesign: ArrayLike<number>,
  ): RigidPlacement {
    return new RigidPlacement(
      frame,
      new Float64Array([
        anchorDesign[0]!,
        anchorDesign[1]!,
        anchorDesign[2] ?? 0,
      ]),
    );
  }

  // Both directions work from the anchor, so no large coordinate is
  // differenced against another.
  toBodyFixed(
    design: ArrayLike<number>,
    out = new Float64Array(3),
  ): Float64Array {
    const dx = (design[0]! - this.anchor[0]!) * this.scale;
    const dy = (design[1]! - this.anchor[1]!) * this.scale;
    const dz = ((design[2] ?? 0) - this.anchor[2]!) * this.heightUnit;
    for (let i = 0; i < 3; i++) {
      out[i] =
        this.origin[i]! +
        this.east[i]! * dx +
        this.north[i]! * dy +
        this.up[i]! * dz;
    }
    return out;
  }

  fromBodyFixed(
    position: ArrayLike<number>,
    out = new Float64Array(3),
  ): Float64Array {
    const px = position[0]! - this.origin[0]!;
    const py = position[1]! - this.origin[1]!;
    const pz = position[2]! - this.origin[2]!;
    const d = [
      px * this.east[0]! + py * this.east[1]! + pz * this.east[2]!,
      px * this.north[0]! + py * this.north[1]! + pz * this.north[2]!,
      px * this.up[0]! + py * this.up[1]! + pz * this.up[2]!,
    ];
    for (let i = 0; i < 3; i++) {
      out[i] = this.anchor[i]! + d[i]! / (i < 2 ? this.scale : this.heightUnit);
    }
    return out;
  }
}
