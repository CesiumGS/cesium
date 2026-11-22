// Glare's image with no pyramid (glare.ts `closedFormPass`): the image, and the sun's veil
// in closed form.
import postApi;
import glareSource;
import glareCommon;

[[vk::binding(0, 1)]] ConstantBuffer<GlareUniforms> uniforms;
[[vk::binding(2, 1)]] StructuredBuffer<GlareSource> glareRecords;

float4 postStage(PostInput input) {
  float4 c = glareImage(postColorAt(input.pixel));
  float3 lit = c.rgb + glareSunVeil(input.uv, input.preExposure, uniforms, glareRecords[1], glareRecords[0]);
  return float4(min(lit, float3(GLARE_IMAGE_CLAMP)), c.a);
}
