// Shared structs. Keep in sync with src/render/layout.ts.

struct View {
  viewProj: mat4x4f,      // rotation-only view × reverse-Z projection
  viewRotation: mat4x4f,
  cameraHi: vec3f,
  near: f32,
  cameraLo: vec3f,
  aspect: f32,
  planes: array<vec4f, 5>, // camera-relative, inward normals; far is infinite
  sunDirection: vec4f,     // unit vector toward the sun, Earth-fixed axes
  viewport: vec4f,         // width, height, 1/width, 1/height
  iblFrame: array<vec4f, 3>, // environment axes (east, up, -north) at the camera
  sunIntensity: f32,
  diffuseIbl: f32,
  specularIbl: f32,
  specularMaxLod: f32,
  viewBit: u32,            // this view's bit in DrawRecord.viewMask
  _viewPad0: u32,
  _viewPad1: u32,
  _viewPad2: u32,
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
  _recordPad: u32,
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
  _pad0: u32,
  _pad1: u32,
  _pad2: u32,
};

const NO_STREAM: u32 = 0xffffffffu;
