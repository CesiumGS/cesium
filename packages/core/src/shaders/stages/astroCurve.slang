// The astrophoto curve (render/post/astroCurve.ts): a look over the whole image, `exposed`
// light in, `exposed` light out. A black point, then an asinh stretch of luminance, then
// saturation about the curved gray. `strength` 0 is the identity, to 10^-3.
import postApi;

// One uniform, `strength`; astroCurve.ts holds the same constants (test/astroCurve.test.ts).
struct Uniforms {
  float strength;
};
[[vk::binding(0, 1)]] ConstantBuffer<Uniforms> uniforms;

static const float STRETCH = 8.0;
static const float BLACK_POINT = 0.004;

float4 postStage(PostInput input) {
  float4 c = postColorAt(input.pixel);
  float s = uniforms.strength;
  float y = dot(c.rgb, float3(0.2126, 0.7152, 0.0722));
  float q = max(STRETCH * s, 0.001);
  float curved = asinh(q * max(y - BLACK_POINT * s, 0.0)) / asinh(q);
  // One ratio for all three, so hue holds, then saturation about the curved gray.
  float ratio = curved / max(y, 1e-6);
  float3 colored = lerp(float3(curved), c.rgb * ratio, 1.0 + 0.4 * s);
  return float4(max(colored, float3(0.0)), c.a);
}
