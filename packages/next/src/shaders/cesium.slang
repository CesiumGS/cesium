// The `cesium` Slang module, version 2: custom shader stages' contract
// (opaque.wgsl's `VertexInput`, `VertexOutput`, `FragmentInput` and
// `MaterialOutput`, field for field and in the same order; slangStages.ts
// maps them by position). A shader imports it and defines either or both:
//
//   import cesium;
//   public void vertexMain(VertexInput vsInput, inout VertexOutput vsOutput) { … }
//   public void fragmentMain(FragmentInput fsInput, inout MaterialOutput material) { … }
module cesium;

// The shader's named attributes, metadata and per-instance values
// (`CustomShaderOptions` `attributes`, `metadata`, `instance`), generated
// per shader (slangStages.ts
// `cesiumModule`); `none` alone when it declares none.
// @named

// A vertex as the mesh stores it, before its transform.
public struct VertexInput {
  public float3 positionMC;
  public float3 normalMC;
  public float2 texCoord0;   // (0, 0) without TEXCOORD_0
  public float4 color0;      // white without COLOR_0
  public uint featureId0;    // local feature ID; 0xffffffff: none
  public uint vertexIndex;
  public uint instanceIndex; // index among the draw's instances
  public float time;         // seconds since the engine started
  public Attributes attributes;
  public Metadata metadata;
  public InstanceValues instance;  // per-instance values (exact)
};

// What `vertexMain` may change: the vertex in model coordinates.
public struct VertexOutput {
  public float3 positionMC;
  public float3 normalMC;
};

// A surface point as the fragment stage sees it.
public struct FragmentInput {
  public float3 positionMC;  // model coordinates, interpolated
  public float3 positionEC;  // relative to the camera, Earth-fixed axes (m)
  public float3 positionWC;  // Earth-fixed (float32: about a meter)
  public float3 normal;      // geometric normal, toward the viewer
  public float2 texCoord0;
  public float4 color0;      // vertex color times the draw's tint
  public uint featureId;     // global feature ID (picking's); 0: none
  public float2 screen;      // framebuffer pixel
  public float time;
  public Attributes attributes;  // interpolated
  public Metadata metadata;      // interpolated
  public uint instanceIndex;     // index among the draw's instances
  public InstanceValues instance;      // per-instance values (exact)
};

// The material, filled with the glTF material's values first. Linear
// color; `normal` is the shading normal (Earth-fixed axes).
public struct MaterialOutput {
  public float3 baseColor;
  public float alpha;
  public float metallic;
  public float roughness;
  public float3 normal;
  public float occlusion;
  public float3 emissive;
  public bool unlit;
};
