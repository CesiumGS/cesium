// Engineering frames: a design CRS (an engineer's projected, ground or site
// coordinates) placed on a body through a coordinate service's operation
// (plan 4a; plan 5a's call 36).
//
// The chain from design to body-fixed is
//
//   design (site grid, design units)
//     -> site transform (R6)            -> projected CRS coordinates, CRS units
//     -> the coordinate operation       -> geographic: degrees, metres
//     -> body.ellipsoid                 -> body-fixed metres
//
// The operation comes from a `CoordinateService` (the frames module's
// interface): PROJ's (`projCoordinateService`, R2 and R4: it ends at the
// body's geographic CRS, EPSG:4979 for the Earth and MOON_GEOGRAPHIC_CRS for
// the Moon), or a host application's own. The engine's own `Ellipsoid` does
// geodetic to body-fixed (R4).
import type { Body } from "../scene/Body.ts";
import { cartographic, type Cartographic } from "../math/ellipsoid.ts";
import * as m4 from "../math/mat4.ts";
import * as v3 from "../math/vec3.ts";
import type { Mat4 } from "../math/mat4.ts";
import type {
  AreaOfInterest,
  CoordinateOperation,
  CoordinateService,
  CrsRef,
  CrsUnits,
  ResolvedCoordinates,
} from "../frames/coordinates.ts";
import type { RecordedOperation } from "./crs.ts";
import type { Pipeline } from "./pipeline.ts";
import type { GridSource } from "./proj.ts";
import type { ProjApi } from "./projApi.ts";
import {
  isProjService,
  projCoordinateService,
  projResolution,
  resolveProjCoordinates,
  type EngineeringFrameFallback,
  type FallbackSigmaSource,
  type GeoidModel,
  type ProjCoordinateRequest,
} from "./projCoordinates.ts";
import { Alignment, type AlignmentDefinition } from "./alignment.ts";

export type {
  EngineeringFrameFallback,
  FallbackSigmaSource,
  GeoidModel,
} from "./projCoordinates.ts";

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
   * An operation to use as is instead of the service's own choice: the
   * request's `pinned`. For PROJ, a pipeline (R2) instead of PROJ's
   * candidate search: a string, or a structured `Pipeline`. A host's
   * coordinate service reads it in its own terms.
   */
  readonly pipeline?: string | Pipeline;
  /** PROJ's only: accept a ballpark operation; its accuracy is then undefined. */
  readonly allowBallpark?: boolean;
  /**
   * Where the design coordinates are, in degrees. PROJ then offers the
   * operations whose area of use contains it (see `ResolveOptions`); a
   * host's coordinate service gets it as the request's `areaOfInterest`.
   */
  readonly areaOfInterest?: AreaOfInterest;
  /**
   * PROJ's only. A global geoid to read design heights against when the
   * CRS's own vertical datum can't be used (the plan's call 9). It applies
   * only when `crs` is a `wkid` reference with a `vcsWkid` (EPSG), PROJ's
   * candidates for it fail for want of grids, and the horizontal CRS alone
   * resolves with none missing. The frame then resolves
   * `{ ...crs, vcsWkid: 5773 }` (EGM96) or `3855` (EGM2008) and records it
   * in `fallback`; `load` fetches the model's grid. Design heights keep the
   * CRS's vertical unit and direction. Not with `pipeline`.
   */
  readonly geoidFallback?: GeoidModel;
  /**
   * PROJ's only. The fallback's standard uncertainty in metres, as the app
   * knows it (the gap between the replaced datum and the model). Without it
   * the fallback's accuracy is undefined, never small. Positive; only with
   * `geoidFallback`.
   */
  readonly fallbackSigma?: number;
  /**
   * PROJ's only. Who states `fallbackSigma`: `"app"` (the default) or
   * `"declaration"`, a tileset's `BENTLEY_engineering_frame`
   * (`declaredDefinition` sets it), so the accuracy says whose claim the
   * figure is.
   */
  readonly fallbackSigmaSource?: FallbackSigmaSource;
}

/**
 * Options for `EngineeringFrame.load`: a coordinate service, or PROJ (with
 * `grids`, which build a `projCoordinateService`). One of the two, not
 * both.
 */
export interface EngineeringFrameLoadOptions {
  /** The coordinate service to resolve the frame's operation with. */
  readonly coordinates?: CoordinateService;
  /** PROJ, from `loadProj`: `projCoordinateService({ proj, grids })`. */
  readonly proj?: ProjApi;
  /**
   * With `proj`: where grids come from. Without it `load` loads nothing
   * and is `create` (and `gridCredits` is empty).
   */
  readonly grids?: GridSource;
  /**
   * Stops the load: it rejects with an `AbortError` naming the frame, the
   * service is handed the signal, and a late answer is dropped.
   */
  readonly signal?: AbortSignal;
}

/** The definition's PROJ-only options, which a host's service can't honour. */
const PROJ_ONLY = [
  "allowBallpark",
  "geoidFallback",
  "fallbackSigma",
  "fallbackSigmaSource",
] as const;

/** The definition's site checks, before any service is asked. */
function checkSite(site: SiteTransform | undefined): void {
  if (site === undefined) {
    return;
  }
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

/** The request an engineering frame makes of its coordinate service. */
function requestOf(
  definition: EngineeringFrameDefinition,
): ProjCoordinateRequest {
  return {
    crs: definition.crs,
    body: definition.body,
    ...(definition.areaOfInterest !== undefined && {
      areaOfInterest: definition.areaOfInterest,
    }),
    ...(definition.pipeline !== undefined && { pinned: definition.pipeline }),
    ...(definition.allowBallpark !== undefined && {
      allowBallpark: definition.allowBallpark,
    }),
    ...(definition.geoidFallback !== undefined && {
      geoidFallback: definition.geoidFallback,
    }),
    ...(definition.fallbackSigma !== undefined && {
      fallbackSigma: definition.fallbackSigma,
    }),
    ...(definition.fallbackSigmaSource !== undefined && {
      fallbackSigmaSource: definition.fallbackSigmaSource,
    }),
  };
}

const finite3 = (v: ArrayLike<number>) =>
  Number.isFinite(v[0]) && Number.isFinite(v[1]) && Number.isFinite(v[2]);

const positive = (value: unknown) =>
  typeof value === "number" && value > 0 && Number.isFinite(value);

/**
 * A service's answer, checked: well formed, its numbers finite, and (for a
 * host's service) its operation finite at the definition's own point (the
 * site origin, else the middle of the area of interest), both ways. PROJ's
 * operations refuse non-finite results themselves. Throws what is wrong.
 */
function checkAnswer(
  answer: ResolvedCoordinates,
  definition: EngineeringFrameDefinition,
  fromProj: boolean,
): void {
  if (typeof answer !== "object" || answer === null) {
    throw new TypeError(`the answer isn't an object (${String(answer)})`);
  }
  const { operation, units, credits } = answer;
  if (
    typeof operation !== "object" ||
    operation === null ||
    typeof operation.forward !== "function" ||
    typeof operation.inverse !== "function"
  ) {
    throw new TypeError("the answer's operation has no forward and inverse");
  }
  if (typeof operation.description !== "string") {
    throw new TypeError("the operation's description isn't a string");
  }
  const { accuracy } = operation;
  if (accuracy !== undefined && !(Number.isFinite(accuracy) && accuracy >= 0)) {
    throw new RangeError(
      `the operation's accuracy must be finite metres, not negative, or undefined; got ${accuracy}`,
    );
  }
  if (typeof units !== "object" || units === null) {
    throw new TypeError("the answer has no units");
  }
  if (!units.projected) {
    throw new Error(
      "an engineering frame needs a projected CRS; the coordinate service resolved it as geographic or not projected",
    );
  }
  if (!positive(units.metersPerUnit)) {
    throw new RangeError(
      `units.metersPerUnit must be a positive finite number, got ${units.metersPerUnit}`,
    );
  }
  if (
    units.metersPerVerticalUnit !== undefined &&
    !positive(units.metersPerVerticalUnit)
  ) {
    throw new RangeError(
      `units.metersPerVerticalUnit must be a positive finite number, got ${units.metersPerVerticalUnit}`,
    );
  }
  if (
    units.verticalDirection !== undefined &&
    units.verticalDirection !== "up" &&
    units.verticalDirection !== "down"
  ) {
    throw new RangeError(
      `units.verticalDirection must be "up" or "down", got ${JSON.stringify(units.verticalDirection)}`,
    );
  }
  if (typeof answer.gridFactors !== "function") {
    throw new TypeError("the answer has no gridFactors");
  }
  if (!Array.isArray(credits) || !credits.every((c) => typeof c === "string")) {
    throw new TypeError("the answer's credits aren't a list of strings");
  }
  if (fromProj) {
    return;
  }
  const { site, areaOfInterest: area } = definition;
  if (site !== undefined) {
    const there = operation.forward(site.origin);
    if (!finite3(there)) {
      throw new RangeError(
        `the operation's forward is not finite at the site origin (${site.origin.join(", ")}): (${Array.from(there).join(", ")})`,
      );
    }
    const back = operation.inverse(there);
    if (!finite3(back)) {
      throw new RangeError(
        `the operation's inverse is not finite at the site origin's geodetic position: (${Array.from(back).join(", ")})`,
      );
    }
  } else if (area !== undefined) {
    // The box's middle, across 180° when west exceeds east.
    const east = area.east < area.west ? area.east + 360 : area.east;
    let lon = (area.west + east) / 2;
    lon -= 360 * Math.round(lon / 360);
    const middle = [lon, (area.south + area.north) / 2, 0];
    const design = operation.inverse(middle);
    if (!finite3(design)) {
      throw new RangeError(
        `the operation's inverse is not finite at the area of interest's middle (${middle.join(", ")}): (${Array.from(design).join(", ")})`,
      );
    }
    const there = operation.forward(design);
    if (!finite3(there)) {
      throw new RangeError(
        `the operation's forward is not finite at (${Array.from(design).join(", ")}): (${Array.from(there).join(", ")})`,
      );
    }
  }
}

/**
 * `error` as `load`'s rejection: it names the frame, and keeps the cause;
 * `serviceFailed` when a host's service threw or rejected; an AbortError
 * once `signal` aborted.
 */
function named(
  error: unknown,
  name: string,
  serviceFailed: boolean,
  signal: AbortSignal | undefined,
): Error {
  if (signal?.aborted) {
    return new DOMException(
      `EngineeringFrame "${name}": the load was aborted`,
      "AbortError",
    );
  }
  const message = error instanceof Error ? error.message : String(error);
  const prefix = `EngineeringFrame "${name}": `;
  if (message.startsWith(prefix)) {
    return error instanceof Error ? error : new Error(message);
  }
  const shown = message.replace(/^EngineeringFrame: /, "");
  return new Error(
    `${prefix}${serviceFailed ? `the coordinate service failed: ${shown}` : shown}`,
    { cause: error },
  );
}

/**
 * `promise`, or a rejection as soon as `signal` aborts (the promise's own
 * answer is then dropped).
 */
function untilAborted<T>(
  promise: Promise<T>,
  signal: AbortSignal | undefined,
): Promise<T> {
  if (signal === undefined) {
    return promise;
  }
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(signal.reason);
    signal.addEventListener("abort", onAbort, { once: true });
    promise.then(
      (value) => {
        signal.removeEventListener("abort", onAbort);
        resolve(value);
      },
      (error: unknown) => {
        signal.removeEventListener("abort", onAbort);
        reject(error);
      },
    );
  });
}

const RADIANS_PER_DEGREE = Math.PI / 180;

/**
 * A design CRS on a body. Design coordinates are (e, n, u) in the CRS's own
 * units (`units`, from the coordinate service, never assumed; R5): the
 * projected CRS's easting and northing in `units.metersPerUnit`, and its
 * height. When `definition.site` is set they are site-grid coordinates
 * instead (see `SiteTransform`).
 *
 * Heights. A design height is in the CRS's vertical unit (its horizontal unit
 * when the CRS has no vertical axis) and the geodetic height is in metres above
 * the body's ellipsoid: the coordinate operation takes one to the other. For
 * the Earth with a vertical axis PROJ converts the unit on the way to
 * EPSG:4979 (100 ftUS on EPSG:6420+6360 is 30.48 m above the geoid, plus the
 * geoid separation). Otherwise, including the Moon, whose operation to
 * MOON_GEOGRAPHIC_CRS passes heights through unchanged, PROJ's service
 * converts the unit itself; a Moon height is above the IAU 1,737,400 m
 * sphere.
 *
 * `O` is the operation's type: PROJ's `RecordedOperation` (the default:
 * PROJ is the service the engine ships) for a frame `create` or `load` with
 * `proj` made, and `CoordinateOperation` for one `load` made with
 * `coordinates`, whose operation may be a host's. Code that takes any
 * frame names `EngineeringFrame<CoordinateOperation>`.
 */
export class EngineeringFrame<
  O extends CoordinateOperation = RecordedOperation,
> {
  readonly definition: EngineeringFrameDefinition;
  readonly units: CrsUnits;
  /**
   * The coordinate service's operation: the CRS's units to degrees and
   * metres. PROJ's is its `RecordedOperation`, heights in metres
   * (`ProjResolvedCoordinates`).
   */
  readonly operation: O;
  /** What the coordinate service resolved: the operation, units, factors and credits. */
  readonly coordinates: ResolvedCoordinates;
  readonly body: Body;
  /** The PROJ the frame's operation was resolved with; undefined on a host's service. */
  readonly proj?: ProjApi;
  /** The frame's alignments, built from `definition.alignments`. */
  readonly alignments: readonly Alignment[];
  /** Metres per design height unit: the vertical unit, else the horizontal. */
  readonly metersPerHeightUnit: number;
  /**
   * Credits for the data the operation reads (the service's `credits`): for
   * PROJ, the grids' (`GridCatalog.credit`: agency, license and PROJ-data
   * version), each once, in the operation's grid order, when the frame was
   * made by `load` with a `GridSource`; otherwise empty.
   */
  readonly gridCredits: readonly string[];
  /**
   * The geoid fallback the frame took (`definition.geoidFallback`), when it
   * took one: `operation` is then the fallback CRS's, and design heights are
   * that model's heights, in `units`' vertical unit and direction.
   */
  readonly fallback?: EngineeringFrameFallback;

  private constructor(
    definition: EngineeringFrameDefinition,
    coordinates: ResolvedCoordinates,
  ) {
    const proj = projResolution(coordinates);
    if (proj !== undefined) {
      this.proj = proj.proj;
      if (proj.fallback !== undefined) {
        this.fallback = proj.fallback;
      }
    }
    this.coordinates = coordinates;
    this.gridCredits = coordinates.credits;
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
    const { units } = coordinates;
    this.units = units;
    this.operation = coordinates.operation as O;
    this.body = definition.body;
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
  ): EngineeringFrame<RecordedOperation> {
    checkSite(definition.site);
    const coordinates = resolveProjCoordinates(proj, requestOf(definition));
    checkAnswer(coordinates, definition, true);
    return new EngineeringFrame<RecordedOperation>(definition, coordinates);
  }

  /**
   * The frame on a coordinate service: `options.coordinates`, or PROJ's
   * built from `options.proj` and `options.grids`
   * (`projCoordinateService`). One of the two is required, not both.
   *
   * The service is asked once for the definition's CRS, body, area of
   * interest and pinned operation (`pipeline`); PROJ's also gets the
   * definition's PROJ options (`ProjCoordinateRequest`). A host's service
   * can't honour those, so `load` refuses them with it.
   *
   * With PROJ this is `create`, after fetching the grids the best operation
   * needs. With `grids`, it lists PROJ's candidates (within
   * `definition.areaOfInterest`) and loads, from `grids`, the missing grids
   * of the first non-ballpark one whose missing grids the catalog has (a
   * pinned pipeline: the grids it names that the catalog has), then
   * resolves as `create` does. A grid the catalog lacks is never fetched:
   * the resolution then takes the next candidate and records the skipped
   * one in `operation.betterCandidates` if it is better by `create`'s rule
   * (not a ballpark; the same vertical grids, unless the one taken is a
   * ballpark; a strictly smaller stated accuracy). Which grids `load`
   * fetches doesn't follow that rule: it fetches the first candidate's.
   * When a `geoidFallback` will apply, it also fetches what the fallback
   * CRS's best operation needs (the model's grid, `us_nga_egm96_15.tif` or
   * `us_nga_egm08_25.tif`). Nothing is fetched for a definition `create`
   * refuses.
   *
   * Never throws: it rejects, with a message that names the frame
   * (`EngineeringFrame "<name>": ...`, the failure's own error as its
   * `cause`), when the definition is refused, when the service throws or
   * rejects ("the coordinate service failed", for a host's), and when its
   * answer is malformed or not finite (its units, its accuracy, or its
   * operation at the site origin or the area of interest's middle, both
   * ways). An aborted `signal` rejects with an `AbortError` naming the
   * frame, at once, however long the service takes; its late answer is
   * dropped. A failed load leaves nothing behind for the next one: each
   * load asks its service again (Review Focus 5).
   */
  static load(
    definition: EngineeringFrameDefinition,
    options: EngineeringFrameLoadOptions & { readonly proj: ProjApi },
  ): Promise<EngineeringFrame<RecordedOperation>>;
  static load(
    definition: EngineeringFrameDefinition,
    options: EngineeringFrameLoadOptions,
  ): Promise<EngineeringFrame<CoordinateOperation>>;
  static async load(
    definition: EngineeringFrameDefinition,
    options: EngineeringFrameLoadOptions,
  ): Promise<EngineeringFrame<CoordinateOperation>> {
    const { coordinates, proj, grids, signal } = options;
    // Whether a host's service was being asked when the load failed: its
    // failure is then "the coordinate service failed".
    let asking = false;
    let host = false;
    try {
      if (signal?.aborted) {
        throw signal.reason;
      }
      if (
        coordinates !== undefined &&
        (proj !== undefined || grids !== undefined)
      ) {
        throw new Error(
          "load takes a coordinate service or PROJ (proj, grids), not both",
        );
      }
      if (coordinates === undefined && proj === undefined) {
        throw new Error("load needs a coordinate service or PROJ (proj)");
      }
      checkSite(definition.site);
      const service =
        coordinates ??
        projCoordinateService({
          proj: proj!,
          ...(grids !== undefined && { grids }),
        });
      host = !isProjService(service);
      if (host) {
        const given = PROJ_ONLY.filter((key) => definition[key] !== undefined);
        if (given.length > 0) {
          throw new Error(
            `${given.join(", ")} ${given.length === 1 ? "is" : "are"} PROJ's (projCoordinateService); a host's coordinate service doesn't take ${given.length === 1 ? "it" : "them"}`,
          );
        }
      }
      const request = requestOf(definition);
      asking = true;
      const answer = await untilAborted(
        // A service that throws synchronously rejects the same way.
        Promise.resolve().then(() =>
          service.resolve(request, signal !== undefined ? { signal } : {}),
        ),
        signal,
      );
      asking = false;
      if (signal?.aborted) {
        throw signal.reason;
      }
      const fromProj = projResolution(answer) !== undefined;
      try {
        checkAnswer(answer, definition, fromProj);
      } catch (error) {
        throw new Error(
          `${host ? "the coordinate service's answer is refused" : "PROJ's answer is refused"}: ${(error as Error).message}`,
          { cause: error },
        );
      }
      return new EngineeringFrame<CoordinateOperation>(definition, answer);
    } catch (error) {
      throw named(error, definition.name, host && asking, signal);
    }
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

  /**
   * Geodetic position of a design point: radians and metres (R4). Throws a
   * RangeError naming the frame when the operation answers a non-finite
   * number (PROJ's refuses first, outside its domain).
   */
  toGeodetic(design: ArrayLike<number>): Cartographic {
    const projected = this.projected(design);
    const geographic = this.operation.forward(projected);
    if (!finite3(geographic)) {
      throw new RangeError(
        `EngineeringFrame "${this.definition.name}": the coordinate operation's forward is not finite at (${Array.from(projected).join(", ")})`,
      );
    }
    return cartographic(
      geographic[0]! * RADIANS_PER_DEGREE,
      geographic[1]! * RADIANS_PER_DEGREE,
      geographic[2]!,
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

  /**
   * Body-fixed metres to design units: the exact reverse of `toBodyFixed`.
   * Throws a RangeError naming the frame when the operation answers a
   * non-finite number.
   */
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
      geodetic.height,
    ]);
    if (!finite3(projected)) {
      throw new RangeError(
        `EngineeringFrame "${this.definition.name}": the coordinate operation's inverse is not finite at (${geodetic.longitude / RADIANS_PER_DEGREE}°, ${geodetic.latitude / RADIANS_PER_DEGREE}°, ${geodetic.height} m)`,
      );
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

/**
 * A position in design coordinates, with the frame that gives them meaning.
 * `O` is the frame's operation type (`EngineeringFrame`).
 */
export interface DesignPoint<
  O extends CoordinateOperation = RecordedOperation,
> {
  readonly engineeringFrame: EngineeringFrame<O>;
  readonly design: Float64Array;
  /** How the point was obtained; absent for a point given as numbers. */
  readonly obtained?: DesignPointObtained;
}

/**
 * A design point in `frame`. `obtained` says how it was picked or snapped;
 * throws for a tolerance that is negative or not finite, or a `kind` on a
 * pick.
 */
export function designPoint<O extends CoordinateOperation>(
  frame: EngineeringFrame<O>,
  design: ArrayLike<number>,
  obtained?: DesignPointObtained,
): DesignPoint<O> {
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
 *  - Up is the ellipsoid's geodetic normal there: the normal at the
 *    anchor's foot on the surface. (The ellipsoid's gradient at an anchor
 *    off the surface leans by about h e² sin φ cos φ / a: 1.3 × 10⁻⁷ rad, or
 *    0.6 mm of drop 20 km out, for an anchor 259 m up at 37.8°.)
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
export class RigidPlacement<O extends CoordinateOperation = RecordedOperation> {
  readonly frame: EngineeringFrame<O>;
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

  private constructor(frame: EngineeringFrame<O>, anchorDesign: Float64Array) {
    this.frame = frame;
    this.anchor = anchorDesign;
    this.scale = frame.units.metersPerUnit;
    this.heightUnit =
      frame.units.verticalDirection === "down"
        ? -frame.metersPerHeightUnit
        : frame.metersPerHeightUnit;
    const origin = frame.toBodyFixed(anchorDesign);
    const up = v3.vec3();
    const ellipsoid = frame.body.ellipsoid;
    const foot = ellipsoid.scaleToGeodeticSurface(origin, v3.vec3());
    if (
      foot === undefined ||
      ellipsoid.geodeticSurfaceNormal(foot, up) === undefined
    ) {
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

  static at<O extends CoordinateOperation>(
    frame: EngineeringFrame<O>,
    anchorDesign: ArrayLike<number>,
  ): RigidPlacement<O> {
    return new RigidPlacement<O>(
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
