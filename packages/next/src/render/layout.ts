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

/** `struct DrawRecord` — 128 bytes. */
export const RECORD_SIZE = 128;
export const RECORD_FLOATS = RECORD_SIZE / 4;
/** `struct DrawInstance` — written by the prep kernel. */
export const INSTANCE_SIZE = 64;
/** `drawIndexedIndirect` args: indexCount, instanceCount, firstIndex, baseVertex, firstInstance. */
export const INDIRECT_SIZE = 20;

export const RecordFlags = {
  hidden: 1,
  /** Output the base color without lighting (KHR_materials_unlit). */
  unlit: 2,
} as const;

export interface DrawRecordData {
  /** Float64 Earth-fixed origin of the draw's local frame. */
  origin: Vec3;
  /** Local transform (rotation/scale/small translation), relative to `origin`. */
  model: Mat4;
  /** Bounding sphere radius around `origin`. */
  radius: number;
  /** Linear RGBA. */
  color: readonly [number, number, number, number];
  indexCount: number;
  firstIndex: number;
  baseVertex: number;
  featureId: number;
  flags: number;
}

export function writeDrawRecord(
  f32: Float32Array,
  u32: Uint32Array,
  i32: Int32Array,
  index: number,
  r: DrawRecordData,
): void {
  const o = index * RECORD_FLOATS;
  splitVec3(r.origin, f32, o, f32, o + 4);
  f32[o + 3] = r.radius;
  u32[o + 7] = r.flags;
  f32.set(r.model, o + 8);
  f32[o + 24] = r.color[0];
  f32[o + 25] = r.color[1];
  f32[o + 26] = r.color[2];
  f32[o + 27] = r.color[3];
  u32[o + 28] = r.indexCount;
  u32[o + 29] = r.firstIndex;
  i32[o + 30] = r.baseVertex;
  u32[o + 31] = r.featureId;
}

/** Interleaved vertex layout pulled from storage: position (3), normal (3). */
export const VERTEX_FLOATS = 6;
