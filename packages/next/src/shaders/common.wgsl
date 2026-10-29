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
};

struct DrawRecord {
  originHi: vec3f,
  radius: f32,
  originLo: vec3f,
  flags: u32,
  model: mat4x4f,          // local frame relative to the origin
  color: vec4f,            // linear RGBA
  indexCount: u32,
  firstIndex: u32,
  baseVertex: i32,
  featureId: u32,
};

struct DrawInstance {
  relModel: mat4x4f,       // model translated by (origin - camera), float32-safe
};
