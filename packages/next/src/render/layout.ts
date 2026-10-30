import type { Mat4 } from "../math/mat4.ts";
import type { Vec3 } from "../math/vec3.ts";
import { splitVec3 } from "../math/transforms.ts";

/**
 * Byte layouts shared between TypeScript and WGSL. Keep in sync with
 * `shaders/common.wgsl`.
 */

/** `struct View` — 352 bytes, padded to a 256-aligned stride per view. */
export const VIEW_SIZE = 352;
/** Word offset of `View.viewBit` (u32): this view's bit in record view masks. */
export const VIEW_BIT_WORD = 84;
export const VIEW_STRIDE = 512;

export interface ViewBlock {
  viewProj: Mat4;
  viewRotation: Mat4;
  cameraPosition: Vec3;
  near: number;
  aspect: number;
  /** 5 planes × (nx, ny, nz, d), camera-relative world space. */
  planes: Float32Array;
  sunDirection: Vec3;
  width: number;
  height: number;
  /** Environment frame axes (east, up, −north) at the camera, Earth-fixed. */
  iblFrame: readonly [Vec3, Vec3, Vec3];
  lighting: ViewLighting;
  /** Highest mip of the prefiltered specular cube. */
  specularMaxLod: number;
}

export interface ViewLighting {
  /** Directional sun illuminance (CesiumJS 1.x SunLight default: 2). */
  sunIntensity: number;
  /** Scale of diffuse (SH) image-based lighting. */
  diffuseIbl: number;
  /** Scale of specular (prefiltered cube) image-based lighting. */
  specularIbl: number;
}

export function writeViewBlock(
  out: Float32Array,
  offsetFloats: number,
  block: ViewBlock,
): void {
  const o = offsetFloats;
  out.set(block.viewProj, o);
  out.set(block.viewRotation, o + 16);
  splitVec3(block.cameraPosition, out, o + 32, out, o + 36);
  out[o + 35] = block.near;
  out[o + 39] = block.aspect;
  out.set(block.planes, o + 40);
  out[o + 60] = block.sunDirection[0]!;
  out[o + 61] = block.sunDirection[1]!;
  out[o + 62] = block.sunDirection[2]!;
  out[o + 63] = 0;
  out[o + 64] = block.width;
  out[o + 65] = block.height;
  out[o + 66] = 1 / block.width;
  out[o + 67] = 1 / block.height;
  block.iblFrame.forEach((axis, i) => {
    out[o + 68 + i * 4] = axis[0]!;
    out[o + 69 + i * 4] = axis[1]!;
    out[o + 70 + i * 4] = axis[2]!;
    out[o + 71 + i * 4] = 0;
  });
  out[o + 80] = block.lighting.sunIntensity;
  out[o + 81] = block.lighting.diffuseIbl;
  out[o + 82] = block.lighting.specularIbl;
  out[o + 83] = block.specularMaxLod;
}

/** `struct DrawRecord` — 192 bytes. */
export const RECORD_SIZE = 192;
/** Word offset of `DrawRecord.viewMask`. */
export const VIEW_MASK_WORD = 44;
/**
 * Word offsets of a mixed-LOD placeholder's clip block, view mask and box
 * count: in those views the record draws only inside its clip boxes.
 */
export const CLIP_BLOCK_WORD = 45;
export const PLACEHOLDER_MASK_WORD = 46;
export const CLIP_COUNT_WORD = 47;
/** Clip boxes per block; each box is 5 vec4s (center hi, lo, 3 rows). */
export const CLIP_BOXES = 8;
export const CLIP_BOX_FLOATS = 20;
/**
 * Word offset of `DrawRecord.imagerySlice`: a globe tile's slice of its
 * world's imagery array (`packImagery`); 0 = none.
 */
export const IMAGERY_SLICE_WORD = 42;
/** Slices an imagery array can address (`packImagery`). */
export const MAX_IMAGERY_SLICES = 4095;
/** Levels above a tile its imagery may come from (`packImagery`). */
export const MAX_IMAGERY_LEVELS_UP = 8;

/**
 * Packs a tile's imagery reference: bits 0-11 the slice + 1, bits 12-15 how
 * many levels up the tile owning the slice is, bits 16-23 and 24-31 this
 * tile's x and y (rows from the south) within it, in this tile's units.
 * An ancestor's slice draws a tile until its own is composited.
 */
export function packImagery(slice: number, levelsUp = 0, x = 0, y = 0): number {
  return ((slice + 1) | (levelsUp << 12) | (x << 16) | (y << 24)) >>> 0;
}

/** Default view mask: drawn in every view. */
export const ALL_VIEWS = 0xffffffff;
export const RECORD_WORDS = RECORD_SIZE / 4;
/** `struct DrawInstance` — written by the prep kernel. */
export const INSTANCE_SIZE = 64;
/** `drawIndexedIndirect` args: indexCount, instanceCount, firstIndex, baseVertex, firstInstance. */
export const INDIRECT_SIZE = 20;
/** `struct Material` — 64 bytes. */
export const MATERIAL_SIZE = 64;
export const MATERIAL_WORDS = MATERIAL_SIZE / 4;
/** Stream offset meaning "attribute absent". */
export const NO_STREAM = 0xffffffff;

export const RecordFlags = {
  hidden: 1,
  /** Output the base color without lighting, overriding the material. */
  unlit: 2,
} as const;

export const MaterialFlags = {
  unlit: 1,
  doubleSided: 2,
  alphaMask: 4,
  alphaBlend: 8,
  baseColorTexture: 16,
  metallicRoughnessTexture: 32,
  normalTexture: 64,
  occlusionTexture: 128,
  emissiveTexture: 256,
  /**
   * Color textures are stored unorm and decoded with pow(c, 2.2) in the shader,
   * as CesiumJS 1.x does (`czm_srgbToLinear`), instead of by an -srgb format.
   */
  gamma22Textures: 512,
} as const;

/** Offsets (in 32-bit words) of each vertex attribute stream in the arena. */
export interface MeshStreams {
  position: number;
  normal: number;
  uv: number;
  color: number;
  tangent: number;
  /** Per-vertex local feature IDs (u32 words). */
  featureId: number;
}

export interface DrawRecordData {
  /** Float64 Earth-fixed origin of the draw's local frame. */
  origin: Vec3;
  /** Local transform (rotation/scale/small translation), relative to `origin`. */
  model: Mat4;
  /** Bounding sphere: center offset from `origin` (Earth-fixed axes) and radius. */
  center: Vec3;
  radius: number;
  /** Linear RGBA tint, multiplied with the material's base color. */
  color: readonly [number, number, number, number];
  indexCount: number;
  firstIndex: number;
  streams: MeshStreams;
  materialIndex: number;
  textureSet: number;
  batch: number;
  /** First global feature ID of the draw (0: not pickable). */
  featureId: number;
  flags: number;
  /** Views that draw this record, one bit per view (`ALL_VIEWS` default). */
  viewMask?: number;
}

export function writeDrawRecord(
  f32: Float32Array,
  u32: Uint32Array,
  index: number,
  r: DrawRecordData,
): void {
  const o = index * RECORD_WORDS;
  splitVec3(r.origin, f32, o, f32, o + 4);
  f32[o + 3] = r.radius;
  u32[o + 7] = r.flags;
  f32.set(r.model, o + 8);
  f32[o + 24] = r.color[0];
  f32[o + 25] = r.color[1];
  f32[o + 26] = r.color[2];
  f32[o + 27] = r.color[3];
  f32[o + 28] = r.center[0]!;
  f32[o + 29] = r.center[1]!;
  f32[o + 30] = r.center[2]!;
  u32[o + 31] = r.materialIndex;
  u32[o + 32] = r.indexCount;
  u32[o + 33] = r.firstIndex;
  u32[o + 34] = r.featureId;
  u32[o + 35] = r.batch;
  u32[o + 36] = r.streams.position;
  u32[o + 37] = r.streams.normal;
  u32[o + 38] = r.streams.uv;
  u32[o + 39] = r.streams.color;
  u32[o + 40] = r.streams.tangent;
  u32[o + 41] = r.textureSet;
  u32[o + 42] = 0; // imagery slice (packImagery)
  u32[o + 43] = r.streams.featureId;
  u32[o + 44] = r.viewMask ?? ALL_VIEWS;
  u32[o + 45] = 0;
  u32[o + 46] = 0;
  u32[o + 47] = 0;
}

export interface MaterialData {
  /** Linear RGBA. */
  baseColor: readonly [number, number, number, number];
  emissive: readonly [number, number, number];
  metallic: number;
  roughness: number;
  alphaCutoff: number;
  normalScale: number;
  occlusionStrength: number;
  flags: number;
}

export function writeMaterial(
  f32: Float32Array,
  u32: Uint32Array,
  index: number,
  m: MaterialData,
): void {
  const o = index * MATERIAL_WORDS;
  f32.set(m.baseColor, o);
  f32.set(m.emissive, o + 4);
  f32[o + 7] = m.metallic;
  f32[o + 8] = m.roughness;
  f32[o + 9] = m.alphaCutoff;
  f32[o + 10] = m.normalScale;
  f32[o + 11] = m.occlusionStrength;
  u32[o + 12] = m.flags;
}
