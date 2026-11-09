// The glue around a post stage (scene/postStage.ts): a fullscreen triangle whose
// fragment calls `postStage`, which the stage's own code defines, and which reads
// the image through what's exported here. A compilation unit, linked with the
// stage across shaders/link POST_STAGE_BOUNDARY. Everything the stage sees is
// `__extern_cpp`, so these names stay as written in the WGSL.
//
// What the stage's slot means for `postColor`:
//   scene    linear light, pre-exposed (`PostInput.preExposure`), before the
//            response. Unlit, display-referred color isn't in it.
//   exposed  after the response (a camera's exposure or the eye's model), before
//            tone mapping. White is 1.
//   display  tone mapped and encoded, unlit color included, 0 to 1.
//
// `postParams` is the size of what the pass writes, so a pass's `uv` runs 0 to 1
// whatever its target's size. A stage's own bindings are group 1 (scene/postStage.ts).

struct PostParams {
  float2 size;       // the image, pixels
  float preExposure; // the scene's light × this is what `scene` holds
  float pixelAngle;  // radians per pixel at the view's center
};

[[vk::binding(0, 0)]] Texture2D<float4> postImage;
[[vk::binding(1, 0)]] SamplerState postSampler;
[[vk::binding(2, 0)]] ConstantBuffer<PostParams> postParams;
// Declared by `reads`: the pipeline's layout holds them only then.
[[vk::binding(3, 0)]] DepthTexture2DMS postDepth;
[[vk::binding(4, 0)]] Texture2DMS<uint4> postIds;

/** What a stage knows of its pixel. */
export __extern_cpp struct PostInput {
  __extern_cpp float2 uv;           // 0 to 1, from the top left
  __extern_cpp int2 pixel;          // from the top left
  __extern_cpp float2 size;         // the image, pixels
  __extern_cpp float preExposure;
  __extern_cpp float pixelAngle;
};

/** What a stage knows of a pixel of what it writes. */
export __extern_cpp PostInput postInputAt(int2 pixel) {
  PostInput input;
  input.pixel = pixel;
  input.size = postParams.size;
  input.uv = (float2(pixel) + 0.5) / postParams.size;
  input.preExposure = postParams.preExposure;
  input.pixelAngle = postParams.pixelAngle;
  return input;
}

// Defined by the stage.
__target_intrinsic(wgsl, "postStage($0)")
float4 postStage(PostInput input);

/** The image at `uv`, filtered. */
export __extern_cpp float4 postColor(float2 uv) {
  return postImage.SampleLevel(postSampler, uv, 0.0);
}

/** The image at a pixel. */
export __extern_cpp float4 postColorAt(int2 pixel) {
  return postImage.Load(int3(pixel, 0));
}

/** Reverse-Z depth at a pixel, its first sample: 0 where nothing was drawn. */
export __extern_cpp float postDepthAt(int2 pixel) {
  return postDepth.Load(pixel, 0);
}

/** The feature ID at a pixel, its first sample (as a pick reads it). */
export __extern_cpp uint postIdAt(int2 pixel) {
  uint2 id = postIds.Load(pixel, 0).rg;
  return id.x | (id.y << 16u);
}

[shader("vertex")]
float4 postStageVertex(uint i : SV_VertexID) : SV_Position {
  float2 uv = float2(float((i << 1u) & 2u), float(i & 2u));
  return float4(uv * 2.0 - 1.0, 0.0, 1.0);
}

// fp16's largest value: what a stage writes stays finite in the next one's image.
static const float FP16_MAX = 65504.0;

// A stage's NaN or infinity stays in its pixel: a blur further down the chain would
// spread it, and fp16 keeps it. Tested on the bits, which a compiler can't assume away.
float finite(float value) {
  return (asuint(value) & 0x7f800000u) == 0x7f800000u ? 0.0 : clamp(value, -FP16_MAX, FP16_MAX);
}

/** A color with what isn't finite as 0, as a fragment stage's result gets. */
export __extern_cpp float4 postFinite(float4 color) {
  return float4(finite(color.r), finite(color.g), finite(color.b), finite(color.a));
}

[shader("fragment")]
float4 postStageFragment(float4 frag : SV_Position) : SV_Target {
  return postFinite(postStage(postInputAt(int2(frag.xy))));
}
