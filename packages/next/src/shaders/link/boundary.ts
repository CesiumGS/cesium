/**
 * A boundary between units (plan §3.4, step 5): the functions one side
 * calls by name and the other must define, with their types, and the
 * names the providing side exports for the other to use. The structs that
 * cross the surface boundary are described from Slang's reflection
 * (shaders/generated/boundary.ts); its functions are declared here, Slang's
 * reflection having no functions' signatures, and test/linker.test.ts
 * checks the generated WGSL against them.
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
 * The surface shaders' (surface.slang): the stages the engine calls (a
 * custom shader's generated glue, or CustomShader.ts `DEFAULT_STAGES`),
 * and what that code may use of the engine (surface.slang's
 * `__extern_cpp` declarations, which keep their names in its WGSL).
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

/**
 * Between surface.slang and its vertex entry points (surfaceVertex.wgsl,
 * hand-written for `@invariant`): the vertex functions they call.
 */
export const SURFACE_VERTEX_BOUNDARY: Boundary = {
  name: "surface vertex",
  requires: [
    ...["surfaceVertex", "surfacePointVertex", "surfaceDepthVertex"].map(
      (name) => ({ name, params: ["u32", "u32"], result: "SurfaceVertex" }),
    ),
    // A patch draw's: its chunk (dice.slang) in place of the item.
    ...["surfacePatchVertex", "surfacePatchDepthVertex"].map((name) => ({
      name,
      params: ["u32", "vec4<u32>"],
      result: "SurfaceVertex",
    })),
  ],
  provides: ["vs", "vsPoints", "vsDepth", "vsPatch", "vsPatchDepth"],
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

/**
 * A post stage's (postStage.slang): the function the glue calls, what it
 * gets, and what it may read of the image.
 */
export const POST_STAGE_BOUNDARY: Boundary = {
  name: "post stage",
  requires: [{ name: "postStage", params: ["PostInput"], result: "vec4<f32>" }],
  provides: [
    "PostInput",
    "postColor",
    "postColorAt",
    "postDepthAt",
    "postFinite",
    "postIdAt",
    "postInputAt",
  ],
};

/** A post stage's compute pass: run once per pixel of what it writes. */
export const POST_COMPUTE_BOUNDARY: Boundary = {
  name: "post stage compute",
  requires: [{ name: "postCompute", params: ["PostInput"] }],
  provides: POST_STAGE_BOUNDARY.provides,
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
