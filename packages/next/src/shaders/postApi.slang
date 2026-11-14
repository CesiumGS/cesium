// What a post stage written in Slang may use (CESIUM2_WEBGPU_PLAN.md §13.22): the
// stage's side of postStage.slang's glue, for `import postApi;`. A stage is a file in
// src/shaders/stages/ that defines
//
//   float4 postStage(PostInput input) { ... }
//
// and `npm run shaders` compiles it, with a bridge it needs not write, to a WGSL unit that
// `createPostStage` takes as its `shader` (scene/postStage.ts `slangPostShader`).
//
// The stage declares its own group 1, in the layout the engine gives a pass (the same
// numbers `uniforms`, `textures` and `reads` get in scene/postStage.ts):
//
//   [[vk::binding(0, 1)]] ConstantBuffer<Uniforms> uniforms;   // fields as `uniforms`, in order
//   [[vk::binding(1, 1)]] SamplerState stageSampler;           // once it reads a texture
//   [[vk::binding(2, 1)]] Texture2D<float4> pyramid;           // its reads, in order, from 2
//   [[vk::binding(3, 1)]] StructuredBuffer<T> records;         // engine stages: `storage`
//
// The textures and the uniform fields are named as the stage names them; the engine checks
// each name, number and offset when the stage is made, and says which is wrong.
//
// A loop must be bounded by a constant, and small: Tint guards every loop it can't unroll
// (`[ForceUnroll]` for the few that matter).
module postApi;

/** What a stage knows of its pixel: postStage.slang's `PostInput`, by value. */
public struct PostInput {
  public float2 uv;          // 0 to 1, from the top left
  public int2 pixel;         // from the top left
  public float2 size;        // the image, pixels
  public float preExposure;  // the scene's light × this is what `scene` holds
  public float pixelAngle;   // radians per pixel at the view's center
  public uint mip;           // the level of what the pass writes: 0 unless it writes a level of a texture
};

/** The image at `uv`, filtered. */
__target_intrinsic(wgsl, "postColor($0)")
public float4 postColor(float2 uv);

/** The image at a pixel. */
__target_intrinsic(wgsl, "postColorAt($0)")
public float4 postColorAt(int2 pixel);

/** Reverse-Z depth at a pixel, its first sample: 0 where nothing was drawn. Needs `reads: ["depth"]`. */
__target_intrinsic(wgsl, "postDepthAt($0)")
public float postDepthAt(int2 pixel);

/** The feature ID at a pixel. Needs `reads: ["ids"]`. */
__target_intrinsic(wgsl, "postIdAt($0)")
public uint postIdAt(int2 pixel);

/** A color with what isn't finite as 0, as a stage's result gets. */
__target_intrinsic(wgsl, "postFinite($0)")
public float4 postFinite(float4 color);
