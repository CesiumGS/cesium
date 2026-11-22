// The veil itself (glare.ts `pyramidPasses`): level 0 of the pyramid and the join's sum,
// as a share of the light, plus the sun's veil in closed form. Written to the veil's level 0.
import postApi;
import glareSource;
import glareCommon;

[[vk::binding(0, 1)]] ConstantBuffer<GlareUniforms> uniforms;
[[vk::binding(1, 1)]] SamplerState stageSampler;
[[vk::binding(2, 1)]] Texture2D<float4> pyramid;
[[vk::binding(3, 1)]] Texture2D<float4> veil;
[[vk::binding(4, 1)]] StructuredBuffer<GlareSource> glareRecords;

float4 postStage(PostInput input) {
  float3 level = pyramid.SampleLevel(stageSampler, input.uv, 0.0).rgb;
  float3 sum = glareWeight(uniforms, 0u) * level + glareBicubic(veil, stageSampler, input.uv);
  float3 light = uniforms.share * sum +
      glareSunVeil(input.uv, input.preExposure, uniforms, glareRecords[1], glareRecords[0]);
  return float4(min(light, float3(GLARE_IMAGE_CLAMP)), 1.0);
}
