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
};

struct DrawRecord {
  originHi: vec3f,
  radius: f32,
  originLo: vec3f,
  flags: u32,              // 1 hidden, 2 unlit override
  model: mat4x4f,          // local frame relative to the origin
  color: vec4f,            // linear RGBA tint
  center: vec3f,           // bounding sphere center offset (Earth-fixed axes)
  materialIndex: u32,
  indexCount: u32,
  firstIndex: u32,
  featureId: u32,
  batch: u32,
  positionOffset: u32,     // word offsets of attribute streams; 0xffffffff = absent
  normalOffset: u32,
  uvOffset: u32,
  colorOffset: u32,
  tangentOffset: u32,
  textureSet: u32,
  imagerySlice: u32,
  _pad: u32,
};

struct DrawInstance {
  relModel: mat4x4f,       // model translated by (origin - camera), float32-safe
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
