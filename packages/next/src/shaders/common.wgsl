// Shared structs, for the kernels still written in WGSL. Their source is
// shaders/common.slang (the TypeScript offsets come from its reflection);
// test/layouts.test.ts fails if these lay any struct out differently.
// This file goes when the last WGSL kernel is ported (plan §3.4).

struct View {
  viewProj: mat4x4f,      // rotation-only view × reverse-Z projection
  viewRotation: mat4x4f,
  cameraHi: vec3f,
  near: f32,
  cameraLo: vec3f,
  aspect: f32,
  planes: array<vec4f, 5>, // camera-relative, inward normals; far is infinite
  // Toward the sun (unit, Earth-fixed axes, xyz), and the Moon's
  // illuminance share for the air's light (w; 0 by day, `moonLight`).
  sunDirection: vec4f,
  viewport: vec4f,         // width, height, 1/width, 1/height
  // Environment axes (east, up, -north) at the camera; [0].w: 1 when the
  // globe's night lights show (View.cityLights); [1].w: how much aerial
  // perspective comes from the screen grid from high up.
  iblFrame: array<vec4f, 3>,
  sunIlluminance: f32,     // lux by default
  diffuseIbl: f32,
  specularIbl: f32,
  specularMaxLod: f32,
  viewBit: u32,            // this view's bit in DrawRecord.viewMask
  exposure: f32,           // pre-exposure: scene light × exposure is written
  aerialStart: f32,        // aerial-perspective volume's distances, km
  aerialEnd: f32,
  // The atmosphere's bottom and top radii (km), 1 when the sun's light
  // comes from it per pixel (sunIlluminance then scales it, 1), and 1 when
  // aerial perspective applies.
  sunLight: vec4f,
  // The body's ellipsoid, meters (xyz), and how much aerial perspective is
  // marched per vertex rather than read from the volume (w).
  bodyRadii: vec4f,
  // Toward the Moon from the camera (unit, xyz), and its illuminance as a
  // share of the sun's above the atmosphere (w; 0: none).
  moonLight: vec4f,
  // Seconds since the engine started (x), for custom shaders' animation;
  // y: 1 in a height capture's view (cull.slang `drawable`).
  time: vec4f,
};

struct DrawRecord {
  center: vec3f,           // bounding sphere in the transform's local frame
  radius: f32,             // (per instance, for instanced records)
  color: vec4f,            // linear RGBA tint
  transform: u32,          // index in `transforms`
  flags: u32,              // 1 hidden, 2 unlit override, 4 collision, 8 underlay
  materialIndex: u32,
  indexCount: u32,
  firstIndex: u32,
  featureId: u32,          // first global feature ID; 0 = not pickable
  batch: u32,
  positionOffset: u32,     // word offsets of attribute streams; 0xffffffff = absent
  normalOffset: u32,
  uvOffset: u32,
  colorOffset: u32,
  tangentOffset: u32,
  textureSet: u32,
  imagerySlice: u32,
  featureIdOffset: u32,    // per-vertex local feature IDs (u32 words)
  viewMask: u32,           // views that draw this record (per-view LOD selection)
  clipBlock: u32,          // mixed-LOD placeholder: block of clip boxes
  placeholderMask: u32,    // views in which the record draws only inside them
  clipCount: u32,          // boxes in the block
  instanceFirst: u32,      // range in `instanceTable`; count 0 = not instanced
  instanceCount: u32,
  instanceStreams: u32,    // per-instance streams in the arena (word offset)
  instanceStride: u32,     // their words per instance
  lightsSlice: u32,        // a globe tile's slice of the night lights (as imagerySlice)
  attributes: u32,         // the mesh's named-attribute directory (MeshStreams.attributes)
  instanceDirectory: u32,  // named fields of the instance streams (DrawRecordData)
  billboardSize: f32,      // billboards (flag 16): pixels per mesh unit
  billboardDepthTest: f32, // billboards: drawn in front within this distance, m
};

// A placement composed in float64 on the CPU (World transform table).
struct Transform {
  originHi: vec3f,
  scale: f32,              // largest axis scale of `linear` (bounding radii)
  originLo: vec3f,
  flags: u32,              // 1 hidden (itself or an ancestor)
  linear: mat3x3f,         // rotation-scale, Earth-fixed axes
};

// One instance of an instanced record.
struct Instance {
  row0: vec4f,             // affine relative to the record's transform,
  row1: vec4f,             // as three rows of a 3×4 matrix
  row2: vec4f,
  record: u32,             // 0xffffffff: free slot
  feature: u32,            // local feature ID; 0xffffffff = the record's
  flags: u32,              // 1 hidden
  tint: u32,               // RGBA8 linear multiplier
};

// Written per view by the cull kernels for every draw item (a record without
// instances, or one instance).
struct DrawItem {
  relModel: mat4x4f,       // to camera-relative world space, float32-safe
  record: u32,
  feature: u32,            // the instance's global feature ID; 0 = the record's
  instance: u32,           // index within the record's instance range
  tint: u32,               // RGBA8 linear multiplier
};

struct Material {
  baseColor: vec4f,        // linear
  emissive: vec3f,
  metallic: f32,
  roughness: f32,
  alphaCutoff: f32,
  normalScale: f32,
  occlusionStrength: f32,
  flags: u32,              // MaterialFlags in layout.ts
  // Texture references by slot, two 16-bit ones a word (layout.ts
  // `MaterialData.textures`): read through `materialTextureRef`.
  textures01: u32,
  textures23: u32,
  textures4: u32,
};

const NO_TEXTURE: u32 = 0xffffu;

// A material's texture reference for `slot` (0 base color, 1 metallic-
// roughness, 2 normal, 3 occlusion, 4 emissive), NO_TEXTURE for none.
fn materialTextureRef(m: Material, slot: u32) -> u32 {
  let word = select(select(m.textures4, m.textures23, slot < 4u), m.textures01, slot < 2u);
  return (word >> ((slot & 1u) * 16u)) & 0xffffu;
}

fn materialHasTexture(m: Material, slot: u32) -> bool {
  return materialTextureRef(m, slot) != NO_TEXTURE;
}

const NO_STREAM: u32 = 0xffffffffu;

// --- lights beyond the sun (scene/lights.ts) -----------------------------------

// A view's point and spot lights, culled to it and camera-relative, and its
// froxel grid: tiles across and down, slices in depth from `near` (log).
struct LightHeader {
  grid: vec4f, // tiles across, down, slices; the lights' count
  depth: vec4f, // near (m), slices per unit of ln(z / near), tan(half fov) x, y
  forward: vec4f, // the camera's axes; .w of forward: the grid's far end (m)
  right: vec4f,
  up: vec4f,
};

struct Light {
  position: vec4f, // camera-relative; .w its reach (m)
  color: vec4f, // linear RGB × candela; .w 1 for a spot
  direction: vec4f, // where a spot points; .w its cone's scale
  cone: vec4f, // .x its cone's offset: (cos θ · scale + offset)²
};

// The view's lights, then their froxels' lists, in one buffer: one storage
// binding for the fragment stage instead of two (the base tier's 8,
// CESIUM2_WEBGPU_PLAN.md §13.15). Sizes as scene/lights.ts LIGHTS_SIZE.
struct LightTable {
  header: LightHeader,
  lights: array<Light, 1024>, // MAX_VIEW_LIGHTS
  clusters: array<u32>,
};

// A froxel's lights: its count, then up to CLUSTER_LIGHTS indices (its
// brightest; scene/lights.ts the same).
const CLUSTER_LIGHTS: u32 = 16u;

// a − b for float64 positions split into float32 pairs (math/transforms.ts
// `splitVec3`: highs are whole meters), exact to float32 near each other.
// The highs subtract as integers: Dawn compiles with relaxed math on Apple
// GPUs, which may reassociate `(aHi - bHi) + (aLo - bLo)` into a sum of
// the large values, and on an M-series Mac that erred as much as plain
// float32 (0.45 m at Philadelphia, r50; plan §3.3 "Precision"). Integer
// arithmetic can't be reassociated with float arithmetic.
fn hiLoDifference(aHi: vec3f, aLo: vec3f, bHi: vec3f, bLo: vec3f) -> vec3f {
  return vec3f(vec3i(aHi) - vec3i(bHi)) + (aLo - bLo);
}

// A float64 position split into a float32 pair, as one float32 value: about
// half a meter of error at the Earth's radius. Only for what doesn't need
// more (a direction from the Earth's center, an altitude); offsets between
// positions go through `hiLoDifference`. test/precision.test.ts keeps
// hi/lo values out of any other arithmetic.
fn hiLoSum(hi: vec3f, lo: vec3f) -> vec3f {
  return hi + lo;
}
