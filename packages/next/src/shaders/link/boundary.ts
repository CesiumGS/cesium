/**
 * A boundary between units (plan §3.4, step 5): the functions one side
 * calls by name and the other must define, with their types, and the
 * names the providing side exports for the other to use. Declared beside
 * the WGSL while the surfaces are WGSL; generated from Slang's reflection
 * once they are Slang (as `layouts.ts` is).
 */
export interface FunctionSignature {
  name: string;
  /** Parameter types as WGSL writes them (spaces don't matter). */
  params: readonly string[];
  /** The result type; undefined for none. */
  result?: string;
}

export interface Boundary {
  /** For diagnostics: "surface", "point style". */
  readonly name: string;
  /** What the other side must define, exactly once, with these types. */
  readonly requires: readonly FunctionSignature[];
  /** Names the providing side defines for the other side to use. */
  readonly provides: readonly string[];
}

/**
 * The surface shaders' (opaque.wgsl, translucent.wgsl): the stages the
 * engine calls (a custom shader's generated glue, or CustomShader.ts
 * `DEFAULT_STAGES`), and what that code may use of the engine.
 */
export const SURFACE_BOUNDARY: Boundary = {
  name: "surface",
  requires: [
    {
      name: "cesiumVertexStage",
      params: ["CesiumVertex"],
      result: "CesiumVertexResult",
    },
    {
      name: "cesiumFragmentStage",
      params: ["CesiumFragment", "ptr<function, MaterialOutput>"],
    },
  ],
  provides: [
    "CesiumVertex",
    "CesiumVertexResult",
    "CesiumFragment",
    "MaterialOutput",
    "readNamed",
    "readInstance",
    "readFragmentProperty",
    "cesiumAnchorPosition",
    "cesiumCameraPosition",
    "cesiumViewProjection",
    "cesiumPixelSize",
  ],
};

/** The point cull's (pointCull.slang): a vector style's symbols' kernel. */
export const POINT_STYLE_BOUNDARY: Boundary = {
  name: "point style",
  requires: [
    { name: "styleShow", params: ["u32", "f32"], result: "bool" },
    { name: "styleSize", params: ["u32", "f32"], result: "f32" },
    { name: "styleColor", params: ["u32", "f32"], result: "vec4f" },
    { name: "styleShapeAt", params: ["u32", "f32", "vec2f"], result: "f32" },
    { name: "styleOffset", params: ["u32", "f32"], result: "vec2f" },
  ],
  provides: ["pointF32", "pointU32", "styleTime"],
};

/** The model pool's (modelPool.slang): a styled model layer's choices. */
export const POOL_STYLE_BOUNDARY: Boundary = {
  name: "model pool style",
  requires: [
    { name: "styleShow", params: ["u32", "f32"], result: "bool" },
    { name: "styleHeading", params: ["u32", "f32"], result: "f32" },
    { name: "styleScale", params: ["u32", "f32"], result: "f32" },
  ],
  provides: ["pointF32", "pointU32", "styleTime"],
};
