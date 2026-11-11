import type { Mat4 } from "../math/mat4.ts";
import type { Vec3 } from "../math/vec3.ts";
import { SOLAR_ILLUMINANCE, type Body } from "../scene/Body.ts";
import { splitHigh, splitVec3 } from "../math/transforms.ts";
import {
  AnchorEyeLayout,
  DrawItemLayout,
  DrawRecordLayout,
  InstanceLayout,
  MaterialLayout,
  TransformLayout,
  ViewLayout,
} from "./generated/layouts.ts";
import { CLIP_BOXES } from "../scene/contentLimits.ts";
export {
  CLIP_BLOCK_ROWS,
  CLIP_BOX_FLOATS,
  CLIP_BOXES,
  MAX_IMAGERY_LEVELS_UP,
  MAX_IMAGERY_SLICES,
  MAX_TERRAIN_CLIP_BLOCKS,
  MAX_TERRAIN_CLIPS,
  MaterialFlags,
  packImagery,
} from "../scene/contentLimits.ts";

/**
 * Byte layouts shared between TypeScript and the shaders. The structs are
 * defined once, in shaders/common.slang; their offsets come from its
 * reflection (render/generated/layouts.ts, `npm run shaders`), so the
 * writers below address fields by name, never by hand-kept numbers.
 */

/** A layout's word offsets (its byte offsets / 4), `size` in words too. */
function words<L extends Record<string, number>>(
  layout: L,
): { readonly [K in keyof L]: number } {
  return Object.fromEntries(
    Object.entries(layout).map(([k, v]) => [k, v / 4]),
  ) as { readonly [K in keyof L]: number };
}
const V = words(ViewLayout);
const R = words(DrawRecordLayout);
const T = words(TransformLayout);
const I = words(InstanceLayout);
const M = words(MaterialLayout);
const A = words(AnchorEyeLayout);

/** `struct View`, padded to a 256-aligned stride per view. */
export const VIEW_SIZE = ViewLayout.size;
/** Word offset of `View.viewBit` (u32): this view's bit in record view masks. */
export const VIEW_BIT_WORD = V.viewBit;
/** Word offset of `View.time`; its y is 1 in a height capture's view. */
export const VIEW_TIME_WORD = V.time;
/** Bytes between views' blocks in a staging buffer: `VIEW_SIZE` rounded up to 256. */
export const VIEW_STRIDE = Math.ceil(VIEW_SIZE / 256) * 256;
/** Word offset of `View.anchors`: `MAX_ANCHORS` `AnchorEye`s. */
export const VIEW_ANCHORS_WORD = V.anchors;
/** Words of one `AnchorEye`. */
export const ANCHOR_EYE_WORDS = A.size;

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
  out.set(block.viewProj, o + V.viewProj);
  out.set(block.viewRotation, o + V.viewRotation);
  splitVec3(block.cameraPosition, out, o + V.cameraHi, out, o + V.cameraLo);
  out[o + V.near] = block.near;
  out[o + V.aspect] = block.aspect;
  out.set(block.planes, o + V.planes);
  out[o + V.sunDirection] = block.sunDirection[0]!;
  out[o + V.sunDirection + 1] = block.sunDirection[1]!;
  out[o + V.sunDirection + 2] = block.sunDirection[2]!;
  out[o + V.sunDirection + 3] = block.moonAir;
  out[o + V.viewport] = block.width;
  out[o + V.viewport + 1] = block.height;
  out[o + V.viewport + 2] = 1 / block.width;
  out[o + V.viewport + 3] = 1 / block.height;
  block.iblFrame.forEach((axis, i) => {
    out[o + V.iblFrame + i * 4] = axis[0]!;
    out[o + V.iblFrame + i * 4 + 1] = axis[1]!;
    out[o + V.iblFrame + i * 4 + 2] = axis[2]!;
    out[o + V.iblFrame + i * 4 + 3] = 0;
  });
  out[o + V.iblFrame + 3] = block.cityLights ? 1 : 0;
  out[o + V.iblFrame + 7] = block.aerial?.screen ?? 0;
  const sun = block.lighting.sunIlluminance;
  const atmosphere = block.body.atmosphere;
  // From the atmosphere: the table's light, scaled by 1; a body without
  // one gets the sun's whole light.
  out[o + V.sunIlluminance] =
    sun === "atmosphere" ? (atmosphere ? 1 : SOLAR_ILLUMINANCE) : sun;
  out[o + V.diffuseIbl] = block.lighting.diffuseIbl;
  out[o + V.specularIbl] = block.lighting.specularIbl;
  out[o + V.specularMaxLod] = block.specularMaxLod;
  out[o + V.exposure] = block.exposure;
  out[o + V.aerialStart] = block.aerial?.start ?? 0;
  out[o + V.aerialEnd] = block.aerial?.end ?? 0;
  out[o + V.sunLight] = (atmosphere?.bottomRadius ?? 0) / 1000;
  out[o + V.sunLight + 1] = (atmosphere?.topRadius ?? 0) / 1000;
  out[o + V.sunLight + 2] = sun === "atmosphere" && atmosphere ? 1 : 0;
  out[o + V.sunLight + 3] = block.aerial ? 1 : 0;
  const radii = block.body.ellipsoid.radii;
  out[o + V.bodyRadii] = radii[0]!;
  out[o + V.bodyRadii + 1] = radii[1]!;
  out[o + V.bodyRadii + 2] = radii[2]!;
  out[o + V.bodyRadii + 3] = block.aerial?.march ?? 0;
  const moon = block.moon;
  out[o + V.moonLight] = moon?.direction[0] ?? 0;
  out[o + V.moonLight + 1] = moon?.direction[1] ?? 0;
  out[o + V.moonLight + 2] = moon?.direction[2] ?? 0;
  out[o + V.moonLight + 3] = moon?.share ?? 0;
  out[o + V.time] = block.time;
  out[o + V.time + 1] = 0;
  out[o + V.time + 2] = 0;
  out[o + V.time + 3] = 0;
  // The anchor table (`View.anchors`) is the caller's to write after:
  // scene/anchorEyes.ts `writeAnchorEyes`, through `writeAnchorEye`.
}

/**
 * A pick's block from a view's (render/view/pickDomain.ts), in place: the
 * planes of the pick window's frustum (the cull's), and in the shading-only
 * `iblFrame`, which a pick doesn't shade, the window's centre in NDC (xy)
 * and half size (zw) in [0], and in [1] the masks of the terrain regions
 * the pick stops at (xy: low and high 16 bits) and goes through (zw), as
 * floats (shaders/surface.slang, "the pick variant").
 */
export function writePickBlock(
  out: Float32Array,
  planes: ArrayLike<number>,
  window: readonly [number, number, number, number],
  stops: number,
  through: number,
): void {
  out.set(planes, V.planes);
  out.set(window, V.iblFrame);
  out[V.iblFrame + 4] = stops & 0xffff;
  out[V.iblFrame + 5] = stops >>> 16;
  out[V.iblFrame + 6] = through & 0xffff;
  out[V.iblFrame + 7] = through >>> 16;
}

/**
 * Bytes of a view block whose anchor table holds its first `slots` slots:
 * what is uploaded and copied (`View.anchors` is last, and a world's draws
 * name only the slots it uses).
 */
export function viewBlockBytes(slots: number): number {
  return ViewLayout.anchors + slots * AnchorEyeLayout.size;
}

/**
 * Writes anchor slot `slot` of the view block at `offsetFloats`: the eye in
 * the anchor's coordinates (float64, split as `splitVec3`), the rotation
 * from the anchor's axes to the shading axes by row (9 values, row-major,
 * from `axesOffset`; undefined: the identity), and whether its draws are
 * hidden in the view.
 */
export function writeAnchorEye(
  out: Float32Array,
  offsetFloats: number,
  slot: number,
  eye: Vec3,
  axes: ArrayLike<number> | undefined,
  hidden: boolean,
  axesOffset = 0,
): void {
  const o = offsetFloats + V.anchors + slot * A.size;
  splitVec3(eye, out, o + A.eyeHi, out, o + A.eyeLo);
  out[o + A.eyeHi + 3] = hidden ? 1 : 0;
  out[o + A.eyeLo + 3] = 0;
  for (let row = 0; row < 3; row++) {
    const r = o + A.axes + row * 4;
    for (let k = 0; k < 3; k++) {
      out[r + k] = axes ? axes[axesOffset + row * 3 + k]! : row === k ? 1 : 0;
    }
    out[r + 3] = 0;
  }
}

/** `struct DrawRecord` — 160 bytes (156 used, padded to WGSL's 16-byte alignment). */
export const RECORD_SIZE = DrawRecordLayout.size;
export const RECORD_WORDS = R.size;
/** Word offsets of `DrawRecord` fields written after creation. */
/** A draw record's bounding radius (f32) and batch index (u32). */
export const RADIUS_WORD = R.radius;
/** Word offset of a draw record's bounding sphere's center (3 × f32). */
export const CENTER_WORD = R.center;
/** Word offset of `DrawRecord.color`: the draw's tint, linear RGBA (f32). */
export const COLOR_WORD = R.color;
export const BATCH_WORD = R.batch;
/** Word offset of `DrawRecord.featureId`: its first global feature ID. */
export const FEATURE_ID_WORD = R.featureId;
/** Word offset of `DrawRecord.materialIndex`. */
export const MATERIAL_INDEX_WORD = R.materialIndex;
export const TRANSFORM_WORD = R.transform;
export const FLAGS_WORD = R.flags;
/**
 * Word offset of `DrawRecord.imagerySlice`: a globe tile's slice of its
 * world's imagery array (`packImagery`); 0 = none.
 */
export const IMAGERY_SLICE_WORD = R.imagerySlice;
/**
 * Word offset of `DrawRecord.lightsSlice`: a globe tile's slice of its
 * world's night-lights array (`packImagery`); 0 = none.
 */
export const LIGHTS_SLICE_WORD = R.lightsSlice;
/** Word offset of `DrawRecord.viewMask`. */
export const VIEW_MASK_WORD = R.viewMask;
/**
 * Word offset of `DrawRecord.casterMask`: the views whose shadow cascades,
 * and nothing else of theirs, draw the record (`World.setCasterMask`).
 */
export const CASTER_MASK_WORD = R.casterMask;
/**
 * Word offsets of a mixed-LOD placeholder's clip block (`packClip`: the
 * block and its box count) and view mask: in those views the record draws
 * only inside its clip boxes.
 */
export const CLIP_BLOCK_WORD = R.clipBlock;
export const PLACEHOLDER_MASK_WORD = R.placeholderMask;
/**
 * Word offset of a globe tile's terrain clip mask: a bit per terrain clip
 * region of its world (`World.addTerrainClipRegion`'s slot) that its
 * rectangle touches; inside those it draws nothing. 0: none.
 */
export const TERRAIN_CLIP_WORD = R.terrainClip;
/**
 * Bits of `DrawRecord.clipBlock` holding the block; the box count above
 * (surface.slang `CLIP_BLOCK_BITS`).
 */
export const CLIP_BLOCK_BITS = 28;
/**
 * A placeholder's `DrawRecord.clipBlock`: its block (below 2^28) and box
 * count (1 to `CLIP_BOXES`). Throws for any other, which the shader would
 * misread.
 */
export function packClip(block: number, count: number): number {
  if (
    !Number.isInteger(block) ||
    block < 0 ||
    block >= 2 ** CLIP_BLOCK_BITS ||
    !Number.isInteger(count) ||
    count < 1 ||
    count > CLIP_BOXES
  ) {
    throw new RangeError(
      `packClip: block ${block} and count ${count} don't fit (block below 2^${CLIP_BLOCK_BITS}, 1 to ${CLIP_BOXES} boxes).`,
    );
  }
  return (block | (count << CLIP_BLOCK_BITS)) >>> 0;
}
/**
 * Word offset of a record's placement: its block's row in the world's
 * placements buffer (scene/placementTable.ts), `NO_PLACEMENT` for none.
 */
export const PLACEMENT_WORD = R.placement;
/** A record's `placement` without one: the transform alone (placement.slang the same). */
export const NO_PLACEMENT = 0xffffffff;
/** Word offsets of a record's range in the instance table (count 0: none). */
export const INSTANCE_FIRST_WORD = R.instanceFirst;
export const INSTANCE_COUNT_WORD = R.instanceCount;
/** Word offset of a record's instance streams' stride (words). */
export const INSTANCE_STRIDE_WORD = R.instanceStride;
/**
 * Anchor slots per view (`World.addAnchor`). Slot 0 is "no anchor" (the
 * transform table's root), so a world holds 31 anchors.
 */
export const MAX_ANCHORS = 32;

/**
 * `struct Transform` — 80 bytes: a placement composed in float64 on the CPU
 * (origin as hi/lo, rotation-scale in float32, its largest axis scale and
 * the hidden flag of it and its ancestors).
 */
export const TRANSFORM_SIZE = TransformLayout.size;
export const TRANSFORM_WORDS = T.size;
/**
 * `struct Instance` — 64 bytes: an affine relative to its record's
 * transform, the record, a local feature ID, flags and a tint.
 */
export const INSTANCE_SIZE = InstanceLayout.size;
export const INSTANCE_WORDS = I.size;
/** `Instance.record` of a free instance slot. */
export const NO_RECORD = 0xffffffff;
/** `Instance.feature` of an instance without its own feature ID. */
export const NO_FEATURE = 0xffffffff;

/** Default view mask: drawn in every view. */
export const ALL_VIEWS = 0xffffffff;
/**
 * `struct DrawItem` — written per view by the cull kernels for every draw
 * item (a record without instances, or one instance): its camera-relative
 * matrix, record, feature, instance index and tint.
 */
export const DRAW_ITEM_SIZE = DrawItemLayout.size;
/** `drawIndexedIndirect` args: indexCount, instanceCount, firstIndex, baseVertex, firstInstance. */
export const INDIRECT_SIZE = 20;
/** A patch draw's chunk: cells along a side (shaders/patch.slang `CHUNK_CELLS`), drawn as (n + 1)² shared vertices. */
export const PATCH_CHUNK_CELLS = 4;
/**
 * A pick's window: its target is this many pixels on a side, around the
 * pixel picked (shaders/surface.slang `PICK_SIZE`; render/view/pickDomain.ts).
 */
export const PICK_SIZE = 3;
/** The pick's targets: draw and feature and primitive, then the domain's values; its depth. */
export const PICK_FORMATS = ["rgba32uint", "rgba32float"] as const;
export const PICK_DEPTH_FORMAT = "depth32float";
/** A pick's result: words of `shaders/pickDomain.slang`'s buffer, 4 bytes each. */
export const PICK_RESULT_WORDS = 20;
/** `struct Material` — 64 bytes. */
export const MATERIAL_SIZE = MaterialLayout.size;
export const MATERIAL_WORDS = M.size;
/** Word offset of a material's flags (`MaterialFlags`). */
export const MATERIAL_FLAGS_WORD = M.flags;
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
  /**
   * A b-rep patch draw (`World.addPatchMesh`): its position stream is the
   * table of span records (src/brep/gpuPatches.ts), `indexCount` their
   * count, and the vertex stage evaluates the surface in chunks of cells
   * the view's dice kernel listed (dice.slang). Its feature is the face.
   */
  patches: 128,
  /**
   * How a patch draw shows the tessellation (`World.setPatchDisplay`), in the
   * opaque pass's fragment stage: the dice grid's cell edges and triangle
   * diagonals (`patchWire`), iso lines in (u, v), as many divisions of the
   * face's parameter rect as bits 16 to 23 say (`patchIso`), the triangles'
   * own normals (`patchFlat`); with `patchLinesOnly` only those lines are
   * drawn, in every pass.
   */
  patchWire: 256,
  patchIso: 512,
  patchFlat: 1024,
  patchLinesOnly: 2048,
} as const;

/** Where `RecordFlags.patchIso`'s division count sits in a record's flags. */
export const PATCH_ISO_SHIFT = 16;

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
/**
 * Entries a mesh's named-attribute directory holds at most (its
 * attributes, metadata properties and feature table columns), and fields
 * an instance directory holds at most: the constant bounding surface.slang
 * `readNamed`'s, `readFragmentProperty`'s and `readInstance`'s loops (the
 * same there). `World.addMesh`, `addDraw` and `addPointMesh` refuse more.
 */
export const MAX_DIRECTORY_ENTRIES = 256;
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
  /**
   * A globe tile's first skirt vertex, mesh-local (`MeshData.skirtStart`;
   * `NO_SKIRT`: none). Its skirts are hidden where its terrain is
   * translucent (surface.slang `terrainAlpha`).
   */
  skirtStart?: number;
}

/** `DrawRecord.skirtStart` of a mesh without skirts. */
export const NO_SKIRT = 0xffffffff;

export function writeDrawRecord(
  f32: Float32Array,
  u32: Uint32Array,
  index: number,
  r: DrawRecordData,
): void {
  const o = index * RECORD_WORDS;
  f32[o + R.center] = r.center[0]!;
  f32[o + R.center + 1] = r.center[1]!;
  f32[o + R.center + 2] = r.center[2]!;
  f32[o + R.radius] = r.radius;
  f32[o + R.color] = r.color[0];
  f32[o + R.color + 1] = r.color[1];
  f32[o + R.color + 2] = r.color[2];
  f32[o + R.color + 3] = r.color[3];
  u32[o + R.transform] = r.transform;
  u32[o + R.flags] = r.flags;
  u32[o + R.materialIndex] = r.materialIndex;
  u32[o + R.indexCount] = r.indexCount;
  u32[o + R.firstIndex] = r.firstIndex;
  u32[o + R.featureId] = r.featureId;
  u32[o + R.batch] = r.batch;
  u32[o + R.positionOffset] = r.streams.position;
  u32[o + R.normalOffset] = r.streams.normal;
  u32[o + R.uvOffset] = r.streams.uv;
  u32[o + R.colorOffset] = r.streams.color;
  u32[o + R.tangentOffset] = r.streams.tangent;
  u32[o + R.textureSet] = r.textureSet;
  u32[o + R.imagerySlice] = 0; // packImagery
  u32[o + R.featureIdOffset] = r.streams.featureId;
  u32[o + R.viewMask] = r.viewMask ?? ALL_VIEWS;
  u32[o + R.clipBlock] = 0;
  u32[o + R.placeholderMask] = 0;
  u32[o + R.terrainClip] = 0;
  u32[o + R.instanceFirst] = r.instanceFirst ?? 0;
  u32[o + R.instanceCount] = r.instanceCount ?? 0;
  u32[o + R.instanceStreams] = r.instanceStreams ?? NO_STREAM;
  u32[o + R.instanceStride] = r.instanceStride ?? 0;
  u32[o + R.lightsSlice] = 0; // night lights (packImagery)
  u32[o + R.attributes] = r.streams.attributes;
  u32[o + R.instanceDirectory] = r.instanceDirectory ?? NO_STREAM;
  f32[o + R.billboardSize] = r.billboardSize ?? 0;
  f32[o + R.billboardDepthTest] = r.billboardDepthTest ?? 0;
  u32[o + R.placement] = NO_PLACEMENT; // World.setPlacement
  u32[o + R.skirtStart] = r.skirtStart ?? NO_SKIRT;
  u32[o + R.casterMask] = 0;
}

/** Bits of `Transform.flags` that hold its anchor slot (8 to 15). */
export const TRANSFORM_ANCHOR_SHIFT = 8;

/**
 * Writes a transform entry from its float64 matrix relative to its anchor
 * (column-major): the translation split hi/lo, the 3×3 in float32 and its
 * largest axis scale, which scales bounding radii, and its flags: hidden,
 * and its anchor's slot (0: none) in bits 8 to 15.
 */
export function writeTransform(
  f32: Float32Array,
  u32: Uint32Array,
  index: number,
  m: ArrayLike<number>,
  hidden: boolean,
  anchorSlot = 0,
): void {
  const o = index * TRANSFORM_WORDS;
  for (let i = 0; i < 3; i++) {
    const value = m[12 + i]!;
    const h = splitHigh(value);
    f32[o + T.originHi + i] = h;
    f32[o + T.originLo + i] = Math.fround(value - h);
  }
  f32[o + T.scale] = Math.max(
    Math.hypot(m[0]!, m[1]!, m[2]!),
    Math.hypot(m[4]!, m[5]!, m[6]!),
    Math.hypot(m[8]!, m[9]!, m[10]!),
  );
  u32[o + T.flags] =
    ((hidden ? 1 : 0) | ((anchorSlot & 0xff) << TRANSFORM_ANCHOR_SHIFT)) >>> 0;
  // The 3×3 by column, each padded to 16 bytes.
  for (let c = 0; c < 3; c++) {
    f32[o + T.linear + c * 4] = m[c * 4]!;
    f32[o + T.linear + c * 4 + 1] = m[c * 4 + 1]!;
    f32[o + T.linear + c * 4 + 2] = m[c * 4 + 2]!;
    f32[o + T.linear + c * 4 + 3] = 0;
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
    const row = o + INSTANCE_ROWS[r]!;
    f32[row] = m[mOffset + r]!;
    f32[row + 1] = m[mOffset + 4 + r]!;
    f32[row + 2] = m[mOffset + 8 + r]!;
    f32[row + 3] = m[mOffset + 12 + r]!;
  }
  u32[o + I.record] = record >>> 0;
  u32[o + I.feature] = feature >>> 0;
  u32[o + I.flags] = flags >>> 0;
  u32[o + I.tint] = tint >>> 0;
}
const INSTANCE_ROWS = [I.row0, I.row1, I.row2];

/** An instance's matrix (`writeInstance`'s), as a column-major affine 4×4 into `out`. */
export function readInstanceMatrix(
  f32: Float32Array,
  index: number,
  out: Float64Array,
): Float64Array {
  const o = index * INSTANCE_WORDS;
  for (let r = 0; r < 3; r++) {
    const row = o + INSTANCE_ROWS[r]!;
    out[r] = f32[row]!;
    out[4 + r] = f32[row + 1]!;
    out[8 + r] = f32[row + 2]!;
    out[12 + r] = f32[row + 3]!;
  }
  out[3] = out[7] = out[11] = 0;
  out[15] = 1;
  return out;
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

/**
 * A material's texture slots (opaque.wgsl `materialTexture`'s `slot`), the
 * order of a texture set's bindings.
 */
export const MaterialTextureSlot = {
  baseColor: 0,
  metallicRoughness: 1,
  normal: 2,
  occlusion: 3,
  emissive: 4,
} as const;
export const MATERIAL_TEXTURE_SLOTS = 5;
/** A texture reference for an empty slot. */
export const NO_TEXTURE = 0xffff;

export interface MaterialData {
  /**
   * The material's texture references by slot (`MaterialTextureSlot`),
   * `NO_TEXTURE` where it has none; packed two per word in the record's
   * last three words. The bindless seam (CESIUM2_WEBGPU_PLAN.md §7.1,
   * §13.15): today a reference is the slot in the batch's texture set
   * (`World.textureRefs`), with resource tables it becomes the texture's
   * index in the table; the record's layout and every shader that reads
   * material textures (through `materialTexture`) stay as they are.
   */
  textures?: readonly number[];
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
  f32.set(m.baseColor, o + M.baseColor);
  f32.set(m.emissive, o + M.emissive);
  f32[o + M.metallic] = m.metallic;
  f32[o + M.roughness] = m.roughness;
  f32[o + M.alphaCutoff] = m.alphaCutoff;
  f32[o + M.normalScale] = m.normalScale;
  f32[o + M.occlusionStrength] = m.occlusionStrength;
  u32[o + M.flags] = m.flags;
  const ref = (slot: number) => (m.textures?.[slot] ?? NO_TEXTURE) & 0xffff;
  u32[o + M.textures01] = (ref(0) | (ref(1) << 16)) >>> 0;
  u32[o + M.textures23] = (ref(2) | (ref(3) << 16)) >>> 0;
  u32[o + M.textures4] = (ref(4) | (NO_TEXTURE << 16)) >>> 0;
}

/**
 * Bytes one draw costs a world's tables, counted in `Tile.bytes` and so
 * against a tileset's byte budget: a draw record, a draw item, five words of
 * indirect arguments and two transforms (the content root's and the node's),
 * on the GPU and in their CPU copies, about 800 bytes.
 */
export const DRAW_OVERHEAD_BYTES =
  2 * (RECORD_SIZE + DRAW_ITEM_SIZE + 20 + 2 * TRANSFORM_SIZE);
