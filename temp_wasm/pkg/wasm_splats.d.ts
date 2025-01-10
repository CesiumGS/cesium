/* tslint:disable */
/* eslint-disable */
export function generate_texture_from_attrs(positions: Float32Array, scales: Float32Array, rots: Float32Array, colors: Uint8Array, count: number): TextureData;
export function radix_sort_simd(data: GSplatData): void;
export function radix_sort_gaussians_attrs(positions: Float32Array, scales: Float32Array, rotations: Float32Array, colors: Uint8Array, model_view: Float32Array, count: number): Array<any>;
export function radix_sort_gaussians_indexes(positions: Float32Array, model_view: Float32Array, texture_width: number, count: number): Uint32Array;
export function generate_splat_texture_from_attrs(positions: Float32Array, scales: Float32Array, rotations: Float32Array, colors: Uint8Array, count: number): object;
export class GSplatData {
  free(): void;
  constructor(positions: Float32Array, scales: Float32Array, rotations: Float32Array, colors: Uint8Array, model_view: Float32Array, count: number);
  static fromFloat32Arrays(positions: Float32Array, scales: Float32Array, rotations: Float32Array, colors: Uint8Array, model_view: Float32Array, count: number): GSplatData;
  getPositions(): Float32Array;
  getScales(): Float32Array;
  getRotations(): Float32Array;
  getColors(): Uint8Array;
}
export class TextureData {
  private constructor();
  free(): void;
  static new(data: Uint32Array, width: number, height: number): TextureData;
  readonly data: Uint32Array;
  readonly width: number;
  readonly height: number;
}

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly __wbg_texturedata_free: (a: number, b: number) => void;
  readonly texturedata_data: (a: number) => [number, number];
  readonly texturedata_width: (a: number) => number;
  readonly texturedata_height: (a: number) => number;
  readonly texturedata_new: (a: number, b: number, c: number, d: number) => number;
  readonly generate_texture_from_attrs: (a: any, b: any, c: any, d: any, e: number) => [number, number, number];
  readonly __wbg_gsplatdata_free: (a: number, b: number) => void;
  readonly gsplatdata_new: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number, k: number) => number;
  readonly gsplatdata_fromFloat32Arrays: (a: any, b: any, c: any, d: any, e: any, f: number) => [number, number, number];
  readonly gsplatdata_getPositions: (a: number) => any;
  readonly gsplatdata_getScales: (a: number) => any;
  readonly gsplatdata_getRotations: (a: number) => any;
  readonly gsplatdata_getColors: (a: number) => any;
  readonly radix_sort_simd: (a: number) => [number, number];
  readonly radix_sort_gaussians_attrs: (a: any, b: any, c: any, d: any, e: any, f: number) => [number, number, number];
  readonly radix_sort_gaussians_indexes: (a: any, b: any, c: number, d: number) => [number, number, number];
  readonly generate_splat_texture_from_attrs: (a: any, b: any, c: any, d: any, e: number) => [number, number, number];
  readonly __wbindgen_exn_store: (a: number) => void;
  readonly __externref_table_alloc: () => number;
  readonly __wbindgen_export_2: WebAssembly.Table;
  readonly __wbindgen_free: (a: number, b: number, c: number) => void;
  readonly __wbindgen_malloc: (a: number, b: number) => number;
  readonly __externref_table_dealloc: (a: number) => void;
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
