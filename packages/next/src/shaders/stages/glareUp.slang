// A level of the veil's join (glare.ts `pyramidPasses`): this level of the pyramid, weighted,
// plus the sum above it, up a level with a bicubic filter.
import postApi;
import glareCommon;

[[vk::binding(0, 1)]] ConstantBuffer<GlareUniforms> uniforms;
[[vk::binding(1, 1)]] SamplerState stageSampler;
[[vk::binding(2, 1)]] Texture2D<float4> pyramid;
[[vk::binding(3, 1)]] Texture2D<float4> veil;

float4 postStage(PostInput input) {
  float3 level = pyramid.SampleLevel(stageSampler, input.uv, 0.0).rgb;
  return float4(glareWeight(uniforms, input.mip) * level + glareBicubic(veil, stageSampler, input.uv), 1.0);
}
