// A down pass of the veil's pyramid: level `mip - 1` to `mip`, 4 taps (glare.ts `pyramidPasses`).
import postApi;
import glareCommon;

[[vk::binding(1, 1)]] SamplerState stageSampler;
[[vk::binding(2, 1)]] Texture2D<float4> pyramid;

float4 postStage(PostInput input) {
  uint w;
  uint h;
  pyramid.GetDimensions(w, h);
  float2 o = DOWN_REACH / float2(float(w), float(h));
  return 0.25 * (
    pyramid.SampleLevel(stageSampler, input.uv + float2(-o.x, -o.y), 0.0) +
    pyramid.SampleLevel(stageSampler, input.uv + float2(o.x, -o.y), 0.0) +
    pyramid.SampleLevel(stageSampler, input.uv + float2(-o.x, o.y), 0.0) +
    pyramid.SampleLevel(stageSampler, input.uv + float2(o.x, o.y), 0.0));
}
