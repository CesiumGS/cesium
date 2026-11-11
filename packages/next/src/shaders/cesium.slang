// The `cesium` Slang module, version 2: custom shader stages' contract,
// the one source of `VertexInput`, `VertexOutput`, `FragmentInput` and
// `MaterialOutput`. The build reads its reflection into the boundary's
// description (src/shaders/generated/boundary.ts), from which WGSL shaders'
// contract and Slang shaders' bridge are generated (scene/contract.ts); a
// field added here must be one the engine passes (surfaceBoundary.slang),
// and `MaterialOutput` must be the engine's (test/contract.test.ts). A
// shader imports it and defines either or both:
//
//   import cesium;
//   public void vertexMain(VertexInput vsInput, inout VertexOutput vsOutput) { … }
//   public void fragmentMain(FragmentInput fsInput, inout MaterialOutput material) { … }
module cesium;

// Controls for uniforms. A shader declares a uniform with one and uses it
// by name; the host shows it as a control (`CustomShader.controls`) and
// sets it without recompiling:
//
//   [Slider(0.5, 0.0, 1.0)] [Label("Glow")] uniform float glow;
//   [Color(0.2, 0.6, 1.0)] uniform float3 tint;      // linear RGB
//   [Toggle(true)] uniform bool outlines;
//   [Slider(4, 1, 8)] uniform int steps;
//
// Values are the defaults. Supported types: float, int, uint, bool and
// float2-4. Each declaration on a line of its own.
[__AttributeUsage(_AttributeTargets.Var)]
public struct SliderAttribute { float defaultValue; float minValue; float maxValue; };
[__AttributeUsage(_AttributeTargets.Var)]
public struct ColorAttribute { float r; float g; float b; };
[__AttributeUsage(_AttributeTargets.Var)]
public struct ToggleAttribute { bool on; };
[__AttributeUsage(_AttributeTargets.Var)]
public struct LabelAttribute { string text; };

// The shader's named attributes, metadata and per-instance values
// (`CustomShaderOptions` `attributes`, `metadata`, `instance`), generated
// per shader (slangStages.ts
// `cesiumModule`); `none` alone when it declares none.
// @named

// A vertex in model coordinates, before the draw's transform. A draw with a
// placement (a scene item at a placement other than 0, `SceneItem.placement`)
// moves each vertex in model space first, at whatever its parameter is now:
//  - positionMC is the PLACED position: the point as the item draws it, a
//    blend of the design position and the second position, or past either
//    end. At placement 0, or without a placement, it is the mesh's own.
//  - designPositionMC is the position as the mesh stores it (the design
//    position), whatever the placement. It equals positionMC when there is
//    no placement.
//  - normalMC is the normal after the placement: the mesh's own normal
//    turned by the placement's Jacobian (its cofactor matrix, normalized),
//    so it is the normal of the surface as drawn, however steeply the warp
//    bends it. A term from a second position (an attribute) has no
//    derivative in space and leaves the normal as stored. Without a
//    placement it is the mesh's own, as stored.
// The fragment stage's `FragmentInput.positionMC` is the DESIGN position,
// not the placed one (a Pref, as RenderMan's reference position is): a
// procedural texture built on it stays on the surface as a warp moves it.
// Where the placed position is wanted in a fragment, `positionEC` is where
// the surface is drawn.
public struct VertexInput {
  public float3 positionMC;
  public float3 designPositionMC;
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
  public float3 positionMC;  // model coordinates of the design position (the mesh's own, before any placement or vertexMain), interpolated
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
