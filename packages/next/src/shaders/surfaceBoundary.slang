// The surface shaders' boundary with run-time code (plan §3.4, step 5):
// the structs that cross it and the stages the engine calls by name. A
// module of its own so the build reads it whole: its reflection
// (boundary.slang) becomes src/shaders/generated/boundary.ts, from which
// CustomShader.ts generates the WGSL contract's glue and slangStages.ts
// the Slang stages' bridge. Everything here is `__extern_cpp`: Slang keeps
// these names in its WGSL, so the run-time units refer to them as written.
// shaders/link SURFACE_BOUNDARY declares the functions on both sides.
module surfaceBoundary;

// A custom shader (scene/CustomShader.ts) supplies `vertexMain` and
// `fragmentMain` against its contract (`VertexInput`, `VertexOutput`,
// `FragmentInput`), which CustomShader.ts generates with the shader's own
// types (its attributes, metadata and instance values), and with the two
// stage functions the engine calls by name here: `cesiumVertexStage` and
// `cesiumFragmentStage`. They take what the engine knows of a vertex and
// a fragment (the structs below, fixed), build the contract from it, and
// call the shader's stages. The engine's own (CustomShader.ts
// `DEFAULT_STAGES`) change nothing. They run in every pass that draws the
// content (opaque, depth, shadow, ambient-occlusion prepass,
// translucent), so a vertex modifier moves geometry the same way in all
// of them. Named as 1.x `CustomShader`'s.

// A vertex as the mesh stores it, before its transform, and where its
// named values are read from (the draw's attribute directory, the row of
// its feature table).
public export __extern_cpp struct CesiumVertex {
  public __extern_cpp float3 positionMC;        // placed (`VertexInput`'s doc)
  public __extern_cpp float3 designPositionMC;  // as the mesh stores it
  public __extern_cpp float3 normalMC;
  public __extern_cpp float2 texCoord0;   // (0, 0) without TEXCOORD_0
  public __extern_cpp float4 color0;      // white without COLOR_0
  public __extern_cpp uint featureId0;    // local feature ID; 0xffffffff: none
  public __extern_cpp uint vertexIndex;
  public __extern_cpp uint instanceIndex; // index among the draw's instances; 0 when not instanced
  public __extern_cpp float time;         // seconds since the engine started
  public __extern_cpp uint draw;
  public __extern_cpp uint directory;     // DrawRecord.attributes
  public __extern_cpp uint tableFeature;
};

// What the vertex stage gives back: the vertex in model coordinates and
// the named values, packed (`SurfaceVertex.named0`…).
public export __extern_cpp struct CesiumVertexResult {
  public __extern_cpp float3 positionMC;
  public __extern_cpp float3 normalMC;
  public __extern_cpp float4 named0;
  public __extern_cpp float4 named1;
  public __extern_cpp float4 named2;
  public __extern_cpp float4 named3;
};

// A surface point as the engine knows it.
public export __extern_cpp struct CesiumFragment {
  public __extern_cpp float3 positionMC;  // model coordinates, interpolated
  public __extern_cpp float3 positionEC;  // relative to the camera, Earth-fixed axes (m)
  public __extern_cpp float3 positionWC;  // Earth-fixed (float32: about a meter at the Earth's scale)
  public __extern_cpp float3 normal;      // geometric normal, Earth-fixed axes, toward the viewer
  public __extern_cpp float2 texCoord0;
  public __extern_cpp float4 color0;      // the vertex color times the draw's and instance's tint
  public __extern_cpp uint featureId;     // global feature ID (the one picking returns); 0: none
  public __extern_cpp float2 screen;      // framebuffer pixel
  public __extern_cpp float time;
  public __extern_cpp uint instanceIndex; // index among the draw's instances
  public __extern_cpp uint draw;
  public __extern_cpp uint directory;     // DrawRecord.attributes
  public __extern_cpp uint localFeature;  // the feature local to the draw; 0xffffffff: none
  public __extern_cpp float4 named0;      // the named values, interpolated (packed)
  public __extern_cpp float4 named1;
  public __extern_cpp float4 named2;
  public __extern_cpp float4 named3;
};

// The material `fragmentMain` may change, filled with the glTF material's
// values first. Linear color; `normal` is the shading normal (Earth-fixed
// axes, normal map applied).
public export __extern_cpp struct MaterialOutput {
  public __extern_cpp float3 baseColor;
  public __extern_cpp float alpha;
  public __extern_cpp float metallic;
  public __extern_cpp float roughness;
  public __extern_cpp float3 normal;
  public __extern_cpp float occlusion;
  public __extern_cpp float3 emissive;
  public __extern_cpp bool unlit;
};

// Defined by the run-time unit (a custom shader's glue, or the engine's
// own stages), called by name.
__target_intrinsic(wgsl, "cesiumVertexStage($0)")
public CesiumVertexResult cesiumVertexStage(CesiumVertex v);
__target_intrinsic(wgsl, "cesiumFragmentStage($0, &($1))")
public void cesiumFragmentStage(CesiumFragment f, inout MaterialOutput material);

// A vertex as the vertex entry points (surfaceVertex.wgsl) put it out, in
// their `VsOut`'s order; `SurfaceVaryings` the same as the fragment
// entry points read it: Slang gives its fields locations in their order
// (their semantics distinct: a trailing digit is an index, and NAMED0…3
// as one semantic's indices were placed out of order), which the vertex
// entries' `VsOut` declares (test/linker.test.ts checks they agree).
public export __extern_cpp struct SurfaceVertex {
  public __extern_cpp float4 position;
  public __extern_cpp float3 normal;
  public __extern_cpp float2 uv;
  public __extern_cpp float4 color;
  // The draw (x), its global feature ID (y, 0 = none) and the instance
  // among the draw's (z, custom shaders' `instance` values), in one
  // location: a fragment stage's inputs are at most 16 with its built-ins
  // (front_facing, sample_mask and sample_index each count: `fsListSamples`).
  public __extern_cpp uint3 ids;
  public __extern_cpp float3 relPosition; // camera-relative world position
  public __extern_cpp float4 tangent;     // xyz world tangent, w handedness; w = 0: none
  // Aerial perspective marched per vertex (`aerialMarch`), pre-exposed
  // in-scatter and transmittance; unused where the view reads the volume.
  public __extern_cpp float3 airInscatter;
  public __extern_cpp float3 airTransmittance;
  public __extern_cpp float3 positionMC;  // the mesh's own (model) coordinates
  // A custom shader's named attributes and metadata, packed into four
  // slots (CustomShader.ts `namedCode`). The engine's own stages leave
  // them zero and read none: slots a fragment stage doesn't read cost
  // nothing (the stages are linked; plan §3.4, step 5).
  public __extern_cpp float4 named0;
  public __extern_cpp float4 named1;
  public __extern_cpp float4 named2;
  public __extern_cpp float4 named3;
};
