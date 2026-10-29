import type { Mat4 } from "../math/mat4.ts";
import type { Vec3 } from "../math/vec3.ts";
import { splitVec3 } from "../math/transforms.ts";

/**
 * Byte layouts shared between TypeScript and WGSL. Keep in sync with
 * `shaders/common.wgsl`.
 */

/** `struct View` — 272 bytes, padded to a 256-aligned stride per view. */
export const VIEW_SIZE = 272;
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
}

/** `struct DrawRecord` — 176 bytes. */
export const RECORD_SIZE = 176;
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
  featureId: number;
  flags: number;
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
  u32[o + 42] = 0; // imagery slice (M3)
  u32[o + 43] = 0;
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
