// The slice of PROJ's C API this package uses, as proj.js v0.9.2 exposes it
// (the same names and shapes in its native and WebAssembly builds; typed by
// hand from the release's swig/proj_capi.d.ts). Add a function here only when
// something calls it. Handles are opaque: PROJ objects live in the module.

declare const handle: unique symbol;

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

export interface ProjApi {
  proj_create(definition: string): PJ;
  proj_create_crs_to_crs(source: string, target: string): PJ;
  proj_normalize_for_visualization(object: PJ): PJ;

  proj_create_operation_factory_context(
    authority: string,
  ): PjOperationFactoryContext;
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
  proj_get_type(object: PJ): PjType;
  /** Null for an object PROJ could not create (proj_create does not throw). */
  proj_get_name(object: PJ): string | null;
  proj_as_wkt(
    object: PJ,
    type: PjWktType,
    options?: Record<string, string | boolean | number>,
  ): string;

  readonly PJ_FWD: PjDirection;
  readonly PJ_INV: PjDirection;
  readonly PJ_PROJ_5: PjProjStringType;
  readonly PJ_TYPE_COMPOUND_CRS: PjType;
  readonly PJ_WKT2_2019: PjWktType;
}
