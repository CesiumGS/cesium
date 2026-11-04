import type { Mat4 } from "../math/mat4.ts";
import type { Vec3 } from "../math/vec3.ts";
import { SOLAR_ILLUMINANCE, type Body } from "../scene/Body.ts";
import { splitVec3 } from "../math/transforms.ts";

/**
 * Byte layouts shared between TypeScript and WGSL. Keep in sync with
 * `shaders/common.wgsl`.
 */

/** `struct View` — 416 bytes, padded to a 256-aligned stride per view. */
export const VIEW_SIZE = 416;
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
  /** Pre-exposure: scene light × this is what is written and tonemapped. */
  exposure: number;
  /** The body seen: its ellipsoid, and its atmosphere's radii. */
  body: Body;
  /**
   * Aerial perspective: the volume's distances, km, and how much is
   * marched per vertex instead (0 to 1); undefined: none.
   */
  aerial:
    | {
        start: number;
        end: number;
        march: number;
        /** How much comes from the screen grid from high up (0 to 1). */
        screen: number;
      }
    | undefined;
  /**
   * The Moon's light: toward it from the camera (unit, Earth-fixed) and its
   * illuminance as a share of the sun's above the atmosphere (the air's
   * transmittance toward it still to apply); undefined: none.
   */
  moon: { direction: Vec3; share: number } | undefined;
  /** The Moon's share for the air's light (0 by day; `MoonView.airShare`). */
  moonAir: number;
  /** The globe's night lights show (`View.cityLights`). */
  cityLights: boolean;
  /** Seconds since the engine started (custom shaders' `fsInput.time`). */
  time: number;
}

/**
 * A high sun through a clear sky, lux (about 100 klx; 132.5 klx outside
 * the atmosphere), for scenes that set the sun's illuminance themselves.
 * By default the atmosphere supplies it (`ViewLighting.sunIlluminance`).
 */
export const DAYLIGHT_SUN_ILLUMINANCE = 100_000;

/**
 * CesiumJS 1.x's `SunLight` intensity, for scenes lit without units (with
 * `UNITLESS_SKY` and `UNITLESS_EXPOSURE`).
 */
export const UNITLESS_SUN_ILLUMINANCE = 2;

export interface ViewLighting {
  /**
   * The sun's illuminance on a surface facing it. "atmosphere" (the
   * default): the sunlight through the atmosphere where each pixel is, in
   * lux, its color included (white noon, orange sunset, none after the sun
   * sets). A number: a white sun of that illuminance everywhere, lux
   * (`DAYLIGHT_SUN_ILLUMINANCE`) or unitless (2 matches CesiumJS 1.x's
   * `SunLight` with the unitless sky and an exposure scale of 1).
   */
  sunIlluminance: number | "atmosphere";
  /**
   * The environment's light (the sky's radiance around the view, for
   * diffuse and specular image-based lighting). "atmosphere" (the
   * default): the body's sky at the camera's altitude and sun angle, rebuilt
   * as they change (black for a body without one). "procedural":
   * `Engine.environment.setSky`'s gradient, shared by such views.
   */
  environment: "atmosphere" | "procedural";
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
  out[o + 63] = block.moonAir;
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
  out[o + 71] = block.cityLights ? 1 : 0;
  out[o + 75] = block.aerial?.screen ?? 0;
  const sun = block.lighting.sunIlluminance;
  const atmosphere = block.body.atmosphere;
  // From the atmosphere: the table's light, scaled by 1; a body without
  // one gets the sun's whole light.
  out[o + 80] =
    sun === "atmosphere" ? (atmosphere ? 1 : SOLAR_ILLUMINANCE) : sun;
  out[o + 81] = block.lighting.diffuseIbl;
  out[o + 82] = block.lighting.specularIbl;
  out[o + 83] = block.specularMaxLod;
  out[o + 85] = block.exposure;
  out[o + 86] = block.aerial?.start ?? 0;
  out[o + 87] = block.aerial?.end ?? 0;
  out[o + 88] = (atmosphere?.bottomRadius ?? 0) / 1000;
  out[o + 89] = (atmosphere?.topRadius ?? 0) / 1000;
  out[o + 90] = sun === "atmosphere" && atmosphere ? 1 : 0;
  out[o + 91] = block.aerial ? 1 : 0;
  const radii = block.body.ellipsoid.radii;
  out[o + 92] = radii[0]!;
  out[o + 93] = radii[1]!;
  out[o + 94] = radii[2]!;
  out[o + 95] = block.aerial?.march ?? 0;
  const moon = block.moon;
  out[o + 96] = moon?.direction[0] ?? 0;
  out[o + 97] = moon?.direction[1] ?? 0;
  out[o + 98] = moon?.direction[2] ?? 0;
  out[o + 99] = moon?.share ?? 0;
  out[o + 100] = block.time;
  out[o + 101] = 0;
  out[o + 102] = 0;
  out[o + 103] = 0;
}

/** `struct DrawRecord` — 144 bytes (132 used, padded to WGSL's 16-byte alignment). */
export const RECORD_SIZE = 144;
export const RECORD_WORDS = RECORD_SIZE / 4;
/** Word offsets of `DrawRecord` fields written after creation. */
export const TRANSFORM_WORD = 8;
export const FLAGS_WORD = 9;
/**
 * Word offset of `DrawRecord.imagerySlice`: a globe tile's slice of its
 * world's imagery array (`packImagery`); 0 = none.
 */
export const IMAGERY_SLICE_WORD = 21;
/**
 * Word offset of `DrawRecord.lightsSlice`: a globe tile's slice of its
 * world's night-lights array (`packImagery`); 0 = none.
 */
export const LIGHTS_SLICE_WORD = 31;
/** Word offset of `DrawRecord.viewMask`. */
export const VIEW_MASK_WORD = 23;
/**
 * Word offsets of a mixed-LOD placeholder's clip block, view mask and box
 * count: in those views the record draws only inside its clip boxes.
 */
export const CLIP_BLOCK_WORD = 24;
export const PLACEHOLDER_MASK_WORD = 25;
export const CLIP_COUNT_WORD = 26;
/** Word offsets of a record's range in the instance table (count 0: none). */
export const INSTANCE_FIRST_WORD = 27;
export const INSTANCE_COUNT_WORD = 28;
/** Word offset of a record's instance streams' stride (words). */
export const INSTANCE_STRIDE_WORD = 30;
/** Clip boxes per block; each box is 5 vec4s (center hi, lo, 3 rows). */
export const CLIP_BOXES = 8;
export const CLIP_BOX_FLOATS = 20;

/**
 * `struct Transform` — 80 bytes: a placement composed in float64 on the CPU
 * (origin as hi/lo, rotation-scale in float32, its largest axis scale and
 * the hidden flag of it and its ancestors).
 */
export const TRANSFORM_SIZE = 80;
export const TRANSFORM_WORDS = TRANSFORM_SIZE / 4;
/**
 * `struct Instance` — 64 bytes: an affine relative to its record's
 * transform, the record, a local feature ID, flags and a tint.
 */
export const INSTANCE_SIZE = 64;
export const INSTANCE_WORDS = INSTANCE_SIZE / 4;
/** `Instance.record` of a free instance slot. */
export const NO_RECORD = 0xffffffff;
/** `Instance.feature` of an instance without its own feature ID. */
export const NO_FEATURE = 0xffffffff;
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
/**
 * `struct DrawItem` — written per view by the cull kernels for every draw
 * item (a record without instances, or one instance): its camera-relative
 * matrix, record, feature, instance index and tint.
 */
export const DRAW_ITEM_SIZE = 80;
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
  /** Ray casts may hit it (a tileset with `enableCollision`). */
  collision: 4,
  /**
   * Drawn behind all other content (the bare ellipsoid, a stand-in for
   * ground): its depth is scaled by `UNDERLAY_DEPTH`.
   */
  underlay: 8,
  /**
   * A billboard: its mesh's model xy (after the custom vertex stage) are
   * pixel offsets on screen from the instance's position, times
   * `billboardSize` and the instance's scale (`DrawOptions.billboard`).
   */
  billboard: 16,
  /**
   * Not ground: left out of height captures (Engine `addHeightCapture`),
   * so what clamps there (tracks) doesn't land on itself.
   */
  notGround: 32,
  /**
   * A point set (`World.addPointMesh`): six vertices per point, its
   * anchor (four floats at the position stream) expanded on screen as a
   * billboard; the point is the instance index and local feature.
   */
  points: 64,
} as const;

/**
 * Depth scale of `RecordFlags.underlay` draws (2^-64, exact in floats).
 * Reverse-Z depth is near / distance, so underlay draws stay behind content
 * nearer than 2^64 near-plane distances and keep their order among
 * themselves; picks read depths at or below it as underlay. At 2^-27 with
 * a 0.1 m near plane, content beyond 13,400 km read as underlay: picks on
 * the globe from farther out landed at the camera (r38). Underlay depths
 * stay normal floats (above 2^-126) for near planes down to 1 mm and
 * distances up to 10^9 m.
 */
export const UNDERLAY_DEPTH = 2 ** -64;

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
  /**
   * The mesh's directory of named attributes (`MeshData.attributes`): u32
   * words `count`, then per attribute its name's `attributeHash`, stream
   * offset and components.
   */
  attributes: number;
}

/**
 * A named attribute's key in mesh directories (FNV-1a of its name), which
 * custom shaders' generated readers compare against.
 */
/** Property textures a texture set binds, from this binding (group 2). */
export const PROPERTY_TEXTURES = 2;
export const PROPERTY_TEXTURE_BINDING = 20;
/** A directory entry's components word: the property is in a texture. */
export const TEXTURE_PROPERTY = 0x80000000;
/**
 * A directory entry's components word: the property is a column of the
 * mesh's feature table, a row per local feature ID.
 */
export const TABLE_PROPERTY = 0x40000000;
/** Words of a texture property's block in the arena (`World.addMesh`). */
export const TEXTURE_PROPERTY_WORDS = 14;
/** `PropertyComponentType` codes in texture property blocks. */
export const COMPONENT_TYPE_CODES = {
  UINT8: 0,
  INT8: 1,
  UINT16: 2,
  INT16: 3,
  UINT32: 4,
  INT32: 5,
  FLOAT32: 6,
} as const;

/** A metadata property's name in mesh directories (beside glTF semantics). */
export function metadataKey(id: string): string {
  return `metadata.${id}`;
}

export function attributeHash(name: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < name.length; i++) {
    hash = Math.imul(hash ^ name.charCodeAt(i), 0x01000193);
  }
  return hash >>> 0;
}

export interface DrawRecordData {
  /** Index in the world's transform table. */
  transform: number;
  /** Bounding sphere in the transform's local frame (per instance, if any). */
  center: ArrayLike<number>;
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
  /** Range in the instance table (count 0: not instanced). */
  instanceFirst?: number;
  instanceCount?: number;
  /** Per-instance streams in the arena: word offset and words per instance. */
  instanceStreams?: number;
  instanceStride?: number;
  /**
   * The streams' named fields (`InstanceOptions.streams.layout`): u32
   * words `count`, then per field its name's `attributeHash`, word offset
   * within an instance and components.
   */
  instanceDirectory?: number;
  /** Billboards (`RecordFlags.billboard`): pixels per mesh unit. */
  billboardSize?: number;
  /**
   * Billboards: within this distance (m) drawn in front of everything
   * (1.x `disableDepthTestDistance`); 0: depth-tested.
   */
  billboardDepthTest?: number;
}

export function writeDrawRecord(
  f32: Float32Array,
  u32: Uint32Array,
  index: number,
  r: DrawRecordData,
): void {
  const o = index * RECORD_WORDS;
  f32[o] = r.center[0]!;
  f32[o + 1] = r.center[1]!;
  f32[o + 2] = r.center[2]!;
  f32[o + 3] = r.radius;
  f32[o + 4] = r.color[0];
  f32[o + 5] = r.color[1];
  f32[o + 6] = r.color[2];
  f32[o + 7] = r.color[3];
  u32[o + 8] = r.transform;
  u32[o + 9] = r.flags;
  u32[o + 10] = r.materialIndex;
  u32[o + 11] = r.indexCount;
  u32[o + 12] = r.firstIndex;
  u32[o + 13] = r.featureId;
  u32[o + 14] = r.batch;
  u32[o + 15] = r.streams.position;
  u32[o + 16] = r.streams.normal;
  u32[o + 17] = r.streams.uv;
  u32[o + 18] = r.streams.color;
  u32[o + 19] = r.streams.tangent;
  u32[o + 20] = r.textureSet;
  u32[o + 21] = 0; // imagery slice (packImagery)
  u32[o + 22] = r.streams.featureId;
  u32[o + 23] = r.viewMask ?? ALL_VIEWS;
  u32[o + 24] = 0;
  u32[o + 25] = 0;
  u32[o + 26] = 0;
  u32[o + 27] = r.instanceFirst ?? 0;
  u32[o + 28] = r.instanceCount ?? 0;
  u32[o + 29] = r.instanceStreams ?? NO_STREAM;
  u32[o + 30] = r.instanceStride ?? 0;
  u32[o + 31] = 0; // night lights slice (packImagery)
  u32[o + 32] = r.streams.attributes;
  u32[o + 33] = r.instanceDirectory ?? NO_STREAM;
  f32[o + 34] = r.billboardSize ?? 0;
  f32[o + 35] = r.billboardDepthTest ?? 0;
}

/**
 * Writes a transform entry from its float64 world matrix (column-major):
 * the translation split hi/lo, the 3×3 in float32 and its largest axis
 * scale, which scales bounding radii.
 */
export function writeTransform(
  f32: Float32Array,
  u32: Uint32Array,
  index: number,
  m: ArrayLike<number>,
  hidden: boolean,
): void {
  const o = index * TRANSFORM_WORDS;
  for (let i = 0; i < 3; i++) {
    const value = m[12 + i]!;
    const h = Math.fround(value);
    f32[o + i] = h;
    f32[o + 4 + i] = Math.fround(value - h);
  }
  f32[o + 3] = Math.max(
    Math.hypot(m[0]!, m[1]!, m[2]!),
    Math.hypot(m[4]!, m[5]!, m[6]!),
    Math.hypot(m[8]!, m[9]!, m[10]!),
  );
  u32[o + 7] = hidden ? 1 : 0;
  for (let c = 0; c < 3; c++) {
    f32[o + 8 + c * 4] = m[c * 4]!;
    f32[o + 9 + c * 4] = m[c * 4 + 1]!;
    f32[o + 10 + c * 4] = m[c * 4 + 2]!;
    f32[o + 11 + c * 4] = 0;
  }
}

/**
 * Writes an instance entry: `m` (column-major 4×4, affine) relative to the
 * record's transform, stored as three rows.
 */
/**
 * `Instance.flags` bits: 1 hidden; 2 drawn only within, 4 only beyond, a
 * distance from the camera held as a half float in bits 16–31 (per view,
 * in the cull pass): a representation switching with distance (a track's
 * model up close, its symbol from afar).
 */
export const InstanceFlags = { hidden: 1, within: 2, beyond: 4 } as const;

/** Instance flags for a distance rule (`InstanceFlags`), hidden clear. */
export function instanceDistanceFlags(
  within: number | undefined,
  beyond: number | undefined,
): number {
  const distance = within ?? beyond;
  if (distance === undefined) {
    return 0;
  }
  const kind =
    within !== undefined ? InstanceFlags.within : InstanceFlags.beyond;
  return (kind | (toHalf(Math.min(distance, 65504)) << 16)) >>> 0;
}

/** A float as IEEE half bits (rounded toward zero; finite, non-negative). */
function toHalf(value: number): number {
  const f32 = new Float32Array([value]);
  const bits = new Uint32Array(f32.buffer)[0]!;
  const exponent = ((bits >>> 23) & 0xff) - 127 + 15;
  if (exponent <= 0) {
    return 0;
  }
  if (exponent >= 31) {
    return 0x7bff;
  }
  return (exponent << 10) | ((bits >>> 13) & 0x3ff);
}

export function writeInstance(
  f32: Float32Array,
  u32: Uint32Array,
  index: number,
  m: ArrayLike<number>,
  mOffset: number,
  record: number,
  feature: number,
  flags: number,
  tint: number,
): void {
  const o = index * INSTANCE_WORDS;
  for (let r = 0; r < 3; r++) {
    f32[o + r * 4] = m[mOffset + r]!;
    f32[o + r * 4 + 1] = m[mOffset + 4 + r]!;
    f32[o + r * 4 + 2] = m[mOffset + 8 + r]!;
    f32[o + r * 4 + 3] = m[mOffset + 12 + r]!;
  }
  u32[o + 12] = record >>> 0;
  u32[o + 13] = feature >>> 0;
  u32[o + 14] = flags >>> 0;
  u32[o + 15] = tint >>> 0;
}

/** Packs a linear RGBA tint (0-1) as RGBA8 (`unpack4x8unorm` in WGSL). */
export function packTint(rgba: ArrayLike<number>, offset = 0): number {
  let packed = 0;
  for (let i = 3; i >= 0; i--) {
    const v = Math.round(Math.min(1, Math.max(0, rgba[offset + i]!)) * 255);
    packed = (packed << 8) | v;
  }
  return packed >>> 0;
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
