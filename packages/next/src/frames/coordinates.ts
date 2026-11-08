// The coordinate service (spec section 7.9; plan 5a, Task 16 and the plan's
// call 36): forward and inverse between a design CRS and a body's geodetic
// coordinates, its grid factors, the operation it recorded and that
// operation's accuracy. `EngineeringFrame` (the proj entry) is built on it.
// PROJ is the one implementation shipped (`projCoordinateService`); a host
// application can supply its own.
//
// This module holds only data types and interfaces, so the frames layer
// names them without importing PROJ. The CRS data types moved here from the
// engineering module, which re-exports them.
import type { Body } from "../scene/Body.ts";

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
      /** The vertical CRS's code (a compound CRS), in `vcsAuthority`. */
      readonly vcsWkid?: number;
      /**
       * The vertical CRS's registry when it isn't `authority` (an EPSG
       * horizontal CRS with an ESRI vertical code, as Esri writes them);
       * `authority` when absent.
       */
      readonly vcsAuthority?: string;
      /** Coordinate epoch, decimal year, for a dynamic datum. */
      readonly epoch?: number;
    }
  | { readonly format: "wkt2"; readonly wkt2: string };

/** Units of a CRS's axes, as the coordinate service reads them (never assumed; plan 4a R5). */
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
   * is "up" or "down": "down" for a depth CRS (such as a LAT or MLLW depth,
   * where +10 lies 10 units below 0).
   */
  readonly verticalDirection?: "up" | "down";
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

/** A projection's scales and convergence at a point (plan 4a R7). */
export interface GridFactors {
  /**
   * The projection's point scale k: its scale along the parallel against the
   * CRS's own ellipsoid (equal to the meridional scale for a conformal
   * projection, to ~1e-11).
   */
  readonly pointScale: number;
  /** The scale h along the meridian, against the CRS's own ellipsoid. */
  readonly meridionalScale: number;
  /** The areal scale s = h k sin θ′ (Tissot). */
  readonly arealScale: number;
  /** Tissot's maximum angular distortion ω, radians: 2 asin((a′ − b′)/(a′ + b′)), 0 for a conformal projection. */
  readonly angularDistortion: number;
  /** The angle θ′ between the projected meridian and parallel, radians (π/2 for a conformal projection). */
  readonly meridianParallelAngle: number;
  /** R / (R + h): R the geometric-mean radius sqrt(M N), h the ellipsoidal height. */
  readonly elevationFactor: number;
  /** k x elevationFactor: grid distance = ground distance x combinedFactor. */
  readonly combinedFactor: number;
  /** Radians, from true north to grid north, positive east (the meridian convergence). */
  readonly convergence: number;
}

/**
 * One coordinate operation between a design CRS and its body's geodetic
 * coordinates, fixed when it was resolved.
 *
 * `forward` takes the CRS's own coordinates in its own units (easting,
 * northing, height, such as US survey feet) and returns longitude and
 * latitude in degrees and the height above the body's ellipsoid in metres;
 * `inverse` takes that back. Both write into `out` when given, and return
 * it. An operation answers only finite numbers or throws; the engineering
 * frame refuses any non-finite answer with a `RangeError` all the same.
 * PROJ's `RecordedOperation` is one, its `description` being its pipeline.
 */
export interface CoordinateOperation {
  forward(xyz: ArrayLike<number>, out?: Float64Array): Float64Array;
  inverse(xyz: ArrayLike<number>, out?: Float64Array): Float64Array;
  /**
   * The operation's stated accuracy in metres, 1σ; undefined when it states
   * none (never 0 for "unknown").
   */
  readonly accuracy: number | undefined;
  /** What the operation is, for a person: PROJ's pipeline, or the host's own words. */
  readonly description: string;
}

/** What an engineering frame asks a coordinate service for. */
export interface CoordinateRequest {
  /** The design CRS. */
  readonly crs: CrsRef;
  /** The body the CRS is on; its geodetic coordinates are the target. */
  readonly body: Body;
  /** Where the design coordinates are, in degrees, to choose an operation. */
  readonly areaOfInterest?: AreaOfInterest;
  /**
   * An operation to use as is, in the service's own terms (PROJ's: a
   * pipeline string or a structured `Pipeline`); absent for the service's
   * own choice.
   */
  readonly pinned?: unknown;
}

/** A coordinate service's answer: the operation, its units, factors and credits. */
export interface ResolvedCoordinates {
  readonly operation: CoordinateOperation;
  /** The design CRS's units: projected for an engineering frame. */
  readonly units: CrsUnits;
  /**
   * The projection's grid factors at a point's projected coordinates (the
   * CRS's own easting, northing and height, in its units). Throws where
   * the projection has none (a singular point).
   */
  gridFactors(projected: ArrayLike<number>): GridFactors;
  /** Credits for the data the operation reads (grids), each once; empty for none. */
  readonly credits: readonly string[];
}

/**
 * Forward and inverse between a design CRS and a body's geodetic
 * coordinates (`resolve`). PROJ's is `projCoordinateService` (the proj
 * entry), which keeps the engine's grid trust chain: a pinned PROJ-data
 * catalog, verified downloads, and only verified, staged, plain-named
 * grids in an operation.
 *
 * A host application's own service is outside that chain by design: the
 * engine checks only that its answers are well formed and finite, not where
 * its operation or its data came from, nor whether its stated accuracy is
 * right. Such content's design coordinates are the host's claim.
 *
 * `resolve` should honour `signal` (reject with an `AbortError` once it is
 * aborted); an engineering frame stops waiting at the abort either way, and
 * drops a late answer.
 */
export interface CoordinateService {
  resolve(
    request: CoordinateRequest,
    options?: { readonly signal?: AbortSignal },
  ): Promise<ResolvedCoordinates>;
}
