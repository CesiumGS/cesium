// The veil's input (render/post/glare.ts `pyramidPasses`): the image, 4 taps, finite and in
// range, with the sun's disc left out so the closed-form veil carries it. Written to the
// pyramid's level 0.
import postApi;
import glareSource;
import glareCommon;

[[vk::binding(0, 1)]] ConstantBuffer<GlareUniforms> uniforms;
[[vk::binding(2, 1)]] StructuredBuffer<GlareSource> glareRecords;

float4 postStage(PostInput input) {
  if (glareInSun(input.uv, uniforms, glareRecords[1], glareRecords[0])) {
    return float4(0.0, 0.0, 0.0, 1.0);
  }
  float2 o = 0.25 / input.size;
  float4 c = 0.25 * (
    glareImage(postColor(input.uv + float2(-o.x, -o.y))) +
    glareImage(postColor(input.uv + float2(o.x, -o.y))) +
    glareImage(postColor(input.uv + float2(-o.x, o.y))) +
    glareImage(postColor(input.uv + float2(o.x, o.y))));
  return float4(c.rgb, 1.0);
}
