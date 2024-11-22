/* tslint:disable */
/* eslint-disable */
/**
 * @param {Float32Array} positions
 * @param {Float32Array} scales
 * @param {Float32Array} rots
 * @param {Uint8Array} colors
 * @param {number} count
 * @returns {TextureData}
 */
export function generate_texture_from_attrs(positions: Float32Array, scales: Float32Array, rots: Float32Array, colors: Uint8Array, count: number): TextureData;
/**
 * @param {GSplatData} data
 */
export function radix_sort_simd(data: GSplatData): void;
/**
 * @param {Float32Array} positions
 * @param {Float32Array} scales
 * @param {Float32Array} rotations
 * @param {Uint8Array} colors
 * @param {Float32Array} model_view
 * @param {number} count
 * @returns {Array<any>}
 */
export function radix_sort_gaussians_attrs(positions: Float32Array, scales: Float32Array, rotations: Float32Array, colors: Uint8Array, model_view: Float32Array, count: number): Array<any>;
/**
 * @param {Float32Array} positions
 * @param {Float32Array} model_view
 * @param {number} texture_width
 * @param {number} count
 * @returns {Uint32Array}
 */
export function radix_sort_gaussians_indexes(positions: Float32Array, model_view: Float32Array, texture_width: number, count: number): Uint32Array;
/**
 * @param {Float32Array} positions
 * @param {Float32Array} scales
 * @param {Float32Array} rotations
 * @param {Uint8Array} colors
 * @param {number} count
 * @returns {object}
 */
export function generate_splat_texture_from_attrs(positions: Float32Array, scales: Float32Array, rotations: Float32Array, colors: Uint8Array, count: number): object;
export class GSplatData {
  free(): void;
  /**
   * @param {Float32Array} positions
   * @param {Float32Array} scales
   * @param {Float32Array} rotations
   * @param {Uint8Array} colors
   * @param {Float32Array} model_view
   * @param {number} count
   */
  constructor(positions: Float32Array, scales: Float32Array, rotations: Float32Array, colors: Uint8Array, model_view: Float32Array, count: number);
  /**
   * @param {Float32Array} positions
   * @param {Float32Array} scales
   * @param {Float32Array} rotations
   * @param {Uint8Array} colors
   * @param {Float32Array} model_view
   * @param {number} count
   * @returns {GSplatData}
   */
  static fromFloat32Arrays(positions: Float32Array, scales: Float32Array, rotations: Float32Array, colors: Uint8Array, model_view: Float32Array, count: number): GSplatData;
  /**
   * @returns {Float32Array}
   */
  getPositions(): Float32Array;
  /**
   * @returns {Float32Array}
   */
  getScales(): Float32Array;
  /**
   * @returns {Float32Array}
   */
  getRotations(): Float32Array;
  /**
   * @returns {Uint8Array}
   */
  getColors(): Uint8Array;
}
export class GaussianSorter {
  free(): void;
  /**
   * @param {number} max_count
   */
  constructor(max_count: number);
  /**
   * @param {Uint8Array} memory_buffer
   * @param {number} positions_offset
   * @param {number} scales_offset
   * @param {number} rotations_offset
   * @param {number} colors_offset
   * @param {Float32Array} model_view
   * @param {number} count
   */
  sortGaussians(memory_buffer: Uint8Array, positions_offset: number, scales_offset: number, rotations_offset: number, colors_offset: number, model_view: Float32Array, count: number): void;
}
export class TextureData {
  free(): void;
  /**
   * @param {Uint32Array} data
   * @param {number} width
   * @param {number} height
   * @returns {TextureData}
   */
  static new(data: Uint32Array, width: number, height: number): TextureData;
  readonly data: Uint32Array;
  readonly height: number;
  readonly width: number;
}

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly __wbg_texturedata_free: (a: number, b: number) => void;
  readonly texturedata_data: (a: number) => Array;
  readonly texturedata_width: (a: number) => number;
  readonly texturedata_height: (a: number) => number;
  readonly texturedata_new: (a: number, b: number, c: number, d: number) => number;
  readonly generate_texture_from_attrs: (a: number, b: number, c: number, d: number, e: number) => Array;
  readonly __wbg_gsplatdata_free: (a: number, b: number) => void;
  readonly gsplatdata_new: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number, k: number) => number;
  readonly gsplatdata_fromFloat32Arrays: (a: number, b: number, c: number, d: number, e: number, f: number) => Array;
  readonly gsplatdata_getPositions: (a: number) => number;
  readonly gsplatdata_getScales: (a: number) => number;
  readonly gsplatdata_getRotations: (a: number) => number;
  readonly gsplatdata_getColors: (a: number) => number;
  readonly radix_sort_simd: (a: number) => Array;
  readonly radix_sort_gaussians_attrs: (a: number, b: number, c: number, d: number, e: number, f: number) => Array;
  readonly radix_sort_gaussians_indexes: (a: number, b: number, c: number, d: number) => Array;
  readonly __wbg_gaussiansorter_free: (a: number, b: number) => void;
  readonly gaussiansorter_new: (a: number) => number;
  readonly gaussiansorter_sortGaussians: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number) => Array;
  readonly generate_splat_texture_from_attrs: (a: number, b: number, c: number, d: number, e: number) => Array;
  readonly __wbindgen_export_0: WebAssembly.Table;
  readonly __wbindgen_free: (a: number, b: number, c: number) => void;
  readonly __wbindgen_malloc: (a: number, b: number) => number;
  readonly __externref_table_dealloc: (a: number) => void;
  readonly __wbindgen_exn_store: (a: number) => void;
  readonly __externref_table_alloc: () => number;
  readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;
/**
* Instantiates the given `module`, which can either be bytes or
* a precompiled `WebAssembly.Module`.
*
* @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
*
* @returns {InitOutput}
*/
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
*
* @returns {Promise<InitOutput>}
*/
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
