// The slice of PROJ's C API this package uses, as proj.js v0.9.2 exposes it
// (the same names and shapes in its native and WebAssembly builds; typed by
// hand from the release's swig/proj_capi.d.ts). Add a function here only when
// something calls it. Handles are opaque: PROJ objects live in the module.

declare const handle: unique symbol;

/**
 * Whether PROJ built `object`. proj_create does not throw for a definition
 * it cannot build (a missing grid, an unknown code): it logs, and returns an
 * empty object that proj_trans then passes coordinates through. An object
 * that exists has a name or a PROJ string. Here, not in crs.ts, so proj.ts
 * (which crs.ts imports) uses it too.
 */
export function exists(proj: ProjApi, object: PJ): boolean {
  try {
    return (
      (proj.proj_get_name(object) ?? null) !== null ||
      (proj.proj_as_proj_string(object, proj.PJ_PROJ_5) ?? null) !== null
    );
  } catch {
    return false;
  }
}

/** A PROJ object (a CRS, a coordinate operation, a coordinate system). */
export interface PJ {
  readonly [handle]: "PJ";
}
/** proj_create_operation_factory_context's result. */
export interface PjOperationFactoryContext {
  readonly [handle]: "PJ_OPERATION_FACTORY_CONTEXT";
}
/** The list proj_create_operations returns (the C API's PJ_OBJ_LIST). */
export interface PjObjList {
  readonly [handle]: "PJ_OBJ_LIST";
  /** proj_list_get_count. */
  length(): number;
  /** proj_list_get. */
  get(index: number): PJ;
}
export type PjDirection = number & { readonly [handle]: "PJ_DIRECTION" };
export type PjType = number & { readonly [handle]: "PJ_TYPE" };
export type PjProjStringType = number & {
  readonly [handle]: "PJ_PROJ_STRING_TYPE";
};
export type PjWktType = number & { readonly [handle]: "PJ_WKT_TYPE" };
export type PjLogLevel = number & { readonly [handle]: "PJ_LOG_LEVEL" };
export type PjComparisonCriterion = number & {
  readonly [handle]: "PJ_COMPARISON_CRITERION";
};
export type PjGridAvailabilityUse = number & {
  readonly [handle]: "PROJ_GRID_AVAILABILITY_USE";
};

/** A PJ_COORD: read it through its accessors (it is not a plain object). */
export interface PjCoord {
  /** x, y, z, t (or lam, phi, z, t, in radians, for geographic coordinates). */
  readonly v: readonly number[];
}

/** proj_factors' result (P5_FACTORS). */
export interface PjFactors {
  readonly meridional_scale: number;
  readonly parallel_scale: number;
  readonly areal_scale: number;
  readonly angular_distortion: number;
  readonly meridian_parallel_angle: number;
  /** Radians. */
  readonly meridian_convergence: number;
  /**
   * The partial derivatives of the projected x and y with respect to
   * longitude and latitude (radians), for coordinates divided by the
   * projection's semi-major axis (so Web Mercator's dx_dlam is 1).
   */
  readonly dx_dlam: number;
  readonly dx_dphi: number;
  readonly dy_dlam: number;
  readonly dy_dphi: number;
}

/** proj_coordoperation_get_method_info's result. */
export interface PjMethodInfo {
  readonly method_name: string;
  /** "EPSG" for EPSG's methods. */
  readonly method_auth_name: string;
  /** The method's code in its authority, as a string ("1024"). */
  readonly method_code: string;
}

/** proj_ellipsoid_get_parameters' result. */
export interface PjEllipsoidParameters {
  readonly semi_major_metre: number;
  readonly semi_minor_metre: number;
  readonly is_semi_minor_computed: boolean;
  readonly inv_flattening: number;
}

export interface PjAxisInfo {
  readonly name: string;
  readonly abbrev: string;
  readonly direction: string;
  /** Metres (or radians) per axis unit. */
  readonly unit_conv_factor: number;
  readonly unit_name: string;
  readonly unit_auth_name: string;
  readonly unit_code: string;
}

export interface PjGridUsed {
  readonly short_name: string;
  readonly full_name: string;
  readonly package_name: string;
  readonly url: string;
  readonly direct_download: boolean;
  readonly open_license: boolean;
  /** Whether the grid is installed (found in the module's data). */
  readonly available: boolean;
}

/**
 * proj_grid_info's result (the C API's PJ_GRID_INFO), as far as it is read.
 * PROJ looks the grid up when asked, unlike a candidate's `available`, which
 * it caches per context the first time it looks (so a grid loaded later
 * still reads as unavailable there).
 */
export interface PjGridInfo {
  /** The grid's name; "" when PROJ finds no such grid. */
  readonly gridname: string;
  /** The path PROJ opened; "" when it finds none. */
  readonly filename: string;
  /** Such as "gtiff"; "missing" when PROJ finds none. */
  readonly format: string;
}

/** proj_info's result (the C API's PJ_INFO), as far as it is read. */
export interface PjInfo {
  /** Such as "Rel. 9.7.1, December 1st, 2025". */
  readonly release: string;
  /** Such as "9.7.1". */
  readonly version: string;
}

export interface ProjApi {
  /** The PROJ library's release (read by the fixture guard, test/data/proj.test.ts). */
  proj_info(): PjInfo;
  /**
   * Sets PROJ's log level and returns the one it replaces (PJ_LOG_TELL only
   * reads it). Both of proj.js v0.9.2's builds have it (checked in the native
   * binding and in proj_capi.wasm's exports), so the browser can quiet PROJ
   * too.
   */
  proj_log_level(level: PjLogLevel): PjLogLevel;
  /** Where PROJ finds a grid file now (see PjGridInfo). */
  proj_grid_info(name: string): PjGridInfo;
  proj_create(definition: string): PJ;
  /**
   * PROJ's WKT parser (proj_create_from_wkt): the object and the parser's
   * warnings. With STRICT it refuses WKT that isn't well formed; it throws
   * a parse error ("Parsing error : ...", or "missing [" for text that
   * isn't WKT at all). Both of proj.js v0.9.2's builds have it (checked in
   * the native binding and in the WebAssembly build, 2026-11-07).
   */
  proj_create_from_wkt(
    wkt: string,
    options?: Record<string, string | boolean | number>,
  ): [PJ, readonly string[]];
  proj_create_crs_to_crs(source: string, target: string): PJ;
  proj_normalize_for_visualization(object: PJ): PJ;

  proj_create_operation_factory_context(
    authority: string,
  ): PjOperationFactoryContext;
  /**
   * Restricts the candidates to operations whose area of use contains this
   * box (degrees; west may exceed east across 180°).
   */
  proj_operation_factory_context_set_area_of_interest(
    context: PjOperationFactoryContext,
    west: number,
    south: number,
    east: number,
    north: number,
  ): void;
  /**
   * How grid availability affects the candidates: PROJ's default sorts those
   * whose grids it finds first. Both of proj.js v0.9.2's builds have it
   * (checked in the native binding and in proj_capi.wasm, 2026-11-07).
   */
  proj_operation_factory_context_set_grid_availability_use(
    context: PjOperationFactoryContext,
    use: PjGridAvailabilityUse,
  ): void;
  proj_create_operations(
    source: PJ,
    target: PJ,
    context: PjOperationFactoryContext,
  ): PjObjList;
  proj_coordoperation_is_instantiable(operation: PJ): boolean;
  proj_coordoperation_get_grid_used_count(operation: PJ): number;
  proj_coordoperation_get_grid_used(operation: PJ, index: number): PjGridUsed;
  /** Metres; negative when PROJ reports none. */
  proj_coordoperation_get_accuracy(operation: PJ): number;
  /**
   * [west, south, east, north] in degrees (-1000 for an unknown bound) and
   * the area's name; null when the object has no area of use.
   */
  proj_get_area_of_use(
    object: PJ,
  ): readonly [number, number, number, number, string] | null;
  /** Null when the object has no PROJ string (or could not be created). */
  proj_as_proj_string(
    object: PJ,
    type: PjProjStringType,
    options?: Record<string, string | boolean | number>,
  ): string | null;

  proj_trans(operation: PJ, direction: PjDirection, coord: PjCoord): PjCoord;
  proj_coord(x: number, y: number, z: number, t: number): PjCoord;
  proj_factors(operation: PJ, lp: PjCoord): PjFactors;

  proj_crs_get_coordinate_system(crs: PJ): PJ;
  proj_cs_get_axis_count(cs: PJ): number;
  proj_cs_get_axis_info(cs: PJ, index: number): PjAxisInfo;
  proj_crs_get_sub_crs(crs: PJ, index: number): PJ;
  /** A bound CRS's base (source) CRS, the one that has the coordinate system. */
  proj_get_source_crs(object: PJ): PJ;
  proj_crs_get_geodetic_crs(crs: PJ): PJ;
  /** A projected (derived) CRS's conversion. */
  proj_crs_get_coordoperation(crs: PJ): PJ;
  /** The method of a coordinate operation, such as a projected CRS's conversion. */
  proj_coordoperation_get_method_info(operation: PJ): PjMethodInfo;
  proj_get_ellipsoid(object: PJ): PJ;
  proj_ellipsoid_get_parameters(ellipsoid: PJ): PjEllipsoidParameters;
  proj_get_type(object: PJ): PjType;
  /** Null for an object PROJ could not create (proj_create does not throw). */
  proj_get_name(object: PJ): string | null;
  /** An object's identifier (its authority, its code); null when it has none. */
  proj_get_id_auth_name(object: PJ, index: number): string | null;
  proj_get_id_code(object: PJ, index: number): string | null;

  // Database queries, for diagnosing a vertical CRS that only a ballpark
  // relates to the ellipsoid (plan 4b Task 7). Both of proj.js v0.9.2's
  // builds have them (checked in the native binding and in the WebAssembly
  // build's exports, 2026-11-07).
  /**
   * The database's objects of `types` whose name matches `name` (with
   * `approximate`, PROJ's loose match: the normalized name contains it);
   * `limit` 0 for all. An empty list (or null) when none matches.
   */
  proj_create_from_name(
    authority: string,
    name: string,
    types: readonly PjType[],
    approximate: boolean,
    limit: number,
  ): PjObjList | null;
  /** The names of the geoid models the database has for a vertical CRS. */
  proj_get_geoid_models_from_database(
    authority: string,
    code: string,
  ): readonly string[];
  /** An operation's target CRS (`proj_get_source_crs` is its source). */
  proj_get_target_crs(operation: PJ): PJ;
  /** A CRS's datum, or its datum ensemble as a datum. */
  proj_crs_get_datum_forced(crs: PJ): PJ;
  proj_is_equivalent_to(
    a: PJ,
    b: PJ,
    criterion: PjComparisonCriterion,
  ): boolean;

  proj_as_wkt(
    object: PJ,
    type: PjWktType,
    options?: Record<string, string | boolean | number>,
  ): string;

  readonly PJ_FWD: PjDirection;
  readonly PJ_INV: PjDirection;
  readonly PJ_PROJ_5: PjProjStringType;
  readonly PJ_TYPE_PROJECTED_CRS: PjType;
  readonly PJ_TYPE_COMPOUND_CRS: PjType;
  readonly PJ_TYPE_BOUND_CRS: PjType;
  readonly PJ_TYPE_GEOGRAPHIC_2D_CRS: PjType;
  readonly PJ_TYPE_GEOGRAPHIC_3D_CRS: PjType;
  readonly PJ_TYPE_VERTICAL_CRS: PjType;
  readonly PJ_TYPE_TRANSFORMATION: PjType;
  /** Equivalent, ignoring names and identifiers. */
  readonly PJ_COMP_EQUIVALENT: PjComparisonCriterion;
  readonly PJ_WKT2_2019: PjWktType;
  /** No log output (PROJ otherwise prints each grid it can't find to stderr). */
  readonly PJ_LOG_NONE: PjLogLevel;
  /**
   * Grid availability plays no part: PROJ sorts the candidates on their own
   * merits (and still lists those whose grids it doesn't find).
   */
  readonly PROJ_GRID_AVAILABILITY_IGNORED: PjGridAvailabilityUse;
}
