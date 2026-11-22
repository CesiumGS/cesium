// Glare's image (glare.ts `pyramidPasses`): the image less what the veil takes, plus the veil.
import postApi;
import glareCommon;

[[vk::binding(0, 1)]] ConstantBuffer<GlareUniforms> uniforms;
[[vk::binding(1, 1)]] SamplerState stageSampler;
[[vk::binding(2, 1)]] Texture2D<float4> veil;

float4 postStage(PostInput input) {
  float4 c = glareImage(postColorAt(input.pixel));
  float3 spread = veil.SampleLevel(stageSampler, input.uv, 0.0).rgb;
  float3 lit = c.rgb * (1.0 - uniforms.imageShare) + spread;
  return float4(min(lit, float3(GLARE_IMAGE_CLAMP)), c.a);
}
