// Generated from the reflection of src/shaders/boundary.slang and
// src/shaders/cesium.slang by scripts/slangBuild.mjs (slangc 2026.21).
// Do not edit: change surfaceBoundary.slang or cesium.slang and regenerate.

/** A field of a boundary struct: its WGSL type, or a struct's name. */
export interface BoundaryField {
  readonly name: string;
  readonly type: string;
  /** `type` names a struct (the contract's named values'). */
  readonly struct?: true;
}

/** What the engine passes the stages and takes back (surfaceBoundary.slang). */
export const ENGINE_STRUCTS = {
  CesiumVertex: [
    { name: "positionMC", type: "vec3f" },
    { name: "designPositionMC", type: "vec3f" },
    { name: "normalMC", type: "vec3f" },
    { name: "texCoord0", type: "vec2f" },
    { name: "color0", type: "vec4f" },
    { name: "featureId0", type: "u32" },
    { name: "vertexIndex", type: "u32" },
    { name: "instanceIndex", type: "u32" },
    { name: "time", type: "f32" },
    { name: "draw", type: "u32" },
    { name: "directory", type: "u32" },
    { name: "tableFeature", type: "u32" },
  ],
  CesiumVertexResult: [
    { name: "positionMC", type: "vec3f" },
    { name: "normalMC", type: "vec3f" },
    { name: "named0", type: "vec4f" },
    { name: "named1", type: "vec4f" },
    { name: "named2", type: "vec4f" },
    { name: "named3", type: "vec4f" },
  ],
  CesiumFragment: [
    { name: "positionMC", type: "vec3f" },
    { name: "positionEC", type: "vec3f" },
    { name: "positionWC", type: "vec3f" },
    { name: "normal", type: "vec3f" },
    { name: "texCoord0", type: "vec2f" },
    { name: "color0", type: "vec4f" },
    { name: "featureId", type: "u32" },
    { name: "screen", type: "vec2f" },
    { name: "time", type: "f32" },
    { name: "instanceIndex", type: "u32" },
    { name: "draw", type: "u32" },
    { name: "directory", type: "u32" },
    { name: "localFeature", type: "u32" },
    { name: "named0", type: "vec4f" },
    { name: "named1", type: "vec4f" },
    { name: "named2", type: "vec4f" },
    { name: "named3", type: "vec4f" },
  ],
  MaterialOutput: [
    { name: "baseColor", type: "vec3f" },
    { name: "alpha", type: "f32" },
    { name: "metallic", type: "f32" },
    { name: "roughness", type: "f32" },
    { name: "normal", type: "vec3f" },
    { name: "occlusion", type: "f32" },
    { name: "emissive", type: "vec3f" },
    { name: "unlit", type: "bool" },
  ],
  SurfaceVertex: [
    { name: "position", type: "vec4f" },
    { name: "normal", type: "vec3f" },
    { name: "uv", type: "vec2f" },
    { name: "color", type: "vec4f" },
    { name: "ids", type: "vec3u" },
    { name: "relPosition", type: "vec3f" },
    { name: "tangent", type: "vec4f" },
    { name: "airInscatter", type: "vec3f" },
    { name: "airTransmittance", type: "vec4f" },
    { name: "positionMC", type: "vec3f" },
    { name: "named0", type: "vec4f" },
    { name: "named1", type: "vec4f" },
    { name: "named2", type: "vec4f" },
    { name: "named3", type: "vec4f" },
  ],
} as const satisfies Record<string, readonly BoundaryField[]>;

/** What custom shader stages take and change (cesium.slang). */
export const CONTRACT_STRUCTS = {
  VertexInput: [
    { name: "positionMC", type: "vec3f" },
    { name: "designPositionMC", type: "vec3f" },
    { name: "normalMC", type: "vec3f" },
    { name: "texCoord0", type: "vec2f" },
    { name: "color0", type: "vec4f" },
    { name: "featureId0", type: "u32" },
    { name: "vertexIndex", type: "u32" },
    { name: "instanceIndex", type: "u32" },
    { name: "time", type: "f32" },
    { name: "attributes", type: "Attributes", struct: true },
    { name: "metadata", type: "Metadata", struct: true },
    { name: "instance", type: "InstanceValues", struct: true },
  ],
  VertexOutput: [
    { name: "positionMC", type: "vec3f" },
    { name: "normalMC", type: "vec3f" },
  ],
  FragmentInput: [
    { name: "positionMC", type: "vec3f" },
    { name: "positionEC", type: "vec3f" },
    { name: "positionWC", type: "vec3f" },
    { name: "normal", type: "vec3f" },
    { name: "texCoord0", type: "vec2f" },
    { name: "color0", type: "vec4f" },
    { name: "featureId", type: "u32" },
    { name: "screen", type: "vec2f" },
    { name: "time", type: "f32" },
    { name: "attributes", type: "Attributes", struct: true },
    { name: "metadata", type: "Metadata", struct: true },
    { name: "instanceIndex", type: "u32" },
    { name: "instance", type: "InstanceValues", struct: true },
  ],
  MaterialOutput: [
    { name: "baseColor", type: "vec3f" },
    { name: "alpha", type: "f32" },
    { name: "metallic", type: "f32" },
    { name: "roughness", type: "f32" },
    { name: "normal", type: "vec3f" },
    { name: "occlusion", type: "f32" },
    { name: "emissive", type: "vec3f" },
    { name: "unlit", type: "bool" },
  ],
} as const satisfies Record<string, readonly BoundaryField[]>;
