// The top level of the veil's join (glare.ts `pyramidPasses`): the pyramid's last level,
// weighted. The weight is that of the level this pass writes (`input.mip`).
import postApi;
import glareCommon;

[[vk::binding(0, 1)]] ConstantBuffer<GlareUniforms> uniforms;
[[vk::binding(1, 1)]] SamplerState stageSampler;
[[vk::binding(2, 1)]] Texture2D<float4> pyramid;

float4 postStage(PostInput input) {
  float3 level = pyramid.SampleLevel(stageSampler, input.uv, 0.0).rgb;
  return float4(glareWeight(uniforms, input.mip) * level, 1.0);
}
