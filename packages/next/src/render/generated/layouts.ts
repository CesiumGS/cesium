// Generated from src/shaders/layouts.slang's reflection by
// scripts/slangBuild.mjs (slangc 2026.21). Do not edit: change
// src/shaders/common.slang and regenerate. render/layout.ts reads these.

/** `View` as `view` holds it: byte offsets. */
export const ViewLayout = {
  size: 416,
  align: 16,
  viewProj: 0,
  viewRotation: 64,
  cameraHi: 128,
  near: 140,
  cameraLo: 144,
  aspect: 156,
  planes: 160,
  sunDirection: 240,
  viewport: 256,
  iblFrame: 272,
  sunIlluminance: 320,
  diffuseIbl: 324,
  specularIbl: 328,
  specularMaxLod: 332,
  viewBit: 336,
  exposure: 340,
  aerialStart: 344,
  aerialEnd: 348,
  sunLight: 352,
  bodyRadii: 368,
  moonLight: 384,
  time: 400,
} as const;

/** `DrawRecord` as `records` holds it: byte offsets. */
export const DrawRecordLayout = {
  size: 144,
  align: 16,
  center: 0,
  radius: 12,
  color: 16,
  transform: 32,
  flags: 36,
  materialIndex: 40,
  indexCount: 44,
  firstIndex: 48,
  featureId: 52,
  batch: 56,
  positionOffset: 60,
  normalOffset: 64,
  uvOffset: 68,
  colorOffset: 72,
  tangentOffset: 76,
  textureSet: 80,
  imagerySlice: 84,
  featureIdOffset: 88,
  viewMask: 92,
  clipBlock: 96,
  placeholderMask: 100,
  clipCount: 104,
  instanceFirst: 108,
  instanceCount: 112,
  instanceStreams: 116,
  instanceStride: 120,
  lightsSlice: 124,
  attributes: 128,
  instanceDirectory: 132,
  billboardSize: 136,
  billboardDepthTest: 140,
} as const;

/** `Transform` as `transforms` holds it: byte offsets. */
export const TransformLayout = {
  size: 80,
  align: 16,
  originHi: 0,
  scale: 12,
  originLo: 16,
  flags: 28,
  linear: 32,
} as const;

/** `Instance` as `instances` holds it: byte offsets. */
export const InstanceLayout = {
  size: 64,
  align: 16,
  row0: 0,
  row1: 16,
  row2: 32,
  record: 48,
  feature: 52,
  flags: 56,
  tint: 60,
} as const;

/** `DrawItem` as `items` holds it: byte offsets. */
export const DrawItemLayout = {
  size: 80,
  align: 16,
  relModel: 0,
  record: 64,
  feature: 68,
  instance: 72,
  tint: 76,
} as const;

/** `Material` as `materials` holds it: byte offsets. */
export const MaterialLayout = {
  size: 64,
  align: 16,
  baseColor: 0,
  emissive: 16,
  metallic: 28,
  roughness: 32,
  alphaCutoff: 36,
  normalScale: 40,
  occlusionStrength: 44,
  flags: 48,
  textures01: 52,
  textures23: 56,
  textures4: 60,
} as const;

/** `LightHeader` as `lightHeaders` holds it: byte offsets. */
export const LightHeaderLayout = {
  size: 80,
  align: 16,
  grid: 0,
  depth: 16,
  forward: 32,
  right: 48,
  up: 64,
} as const;

/** `Light` as `lights` holds it: byte offsets. */
export const LightLayout = {
  size: 64,
  align: 16,
  position: 0,
  color: 16,
  direction: 32,
  cone: 48,
} as const;
