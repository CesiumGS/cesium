// What the veil's stages share (render/post/glare.ts `veilStage`): its uniforms, the sun's
// veil in closed form and the pyramid's bicubic join. Each stage declares its own group 1
// (shaders/postApi.slang) and passes what it reads here.
module glareCommon;
import postApi;
import glareSource;

/** The image's largest value in glare's chain, pre-exposed (glare.ts `GLARE_IMAGE_CLAMP`). */
public static const float GLARE_IMAGE_CLAMP = 10000.0;
/** How far past the sun's disc the veil's input is masked, the view's pixels. */
static const float MASK_MARGIN = 1.5;
/** A down pass's tap, source texels from its center (glare.ts `DOWN_REACH`). */
public static const float DOWN_REACH = 1.2083;
/** The weights a veil holds: its pyramid's levels at most (veilWeights.ts `VEIL_LEVELS`). */
static const int LEVELS = 9;

/** The veil stage's uniforms, in the order glare.ts declares them (the engine checks the offsets). */
public struct GlareUniforms {
  public float2 viewSize;
  public float pixelAngle;
  public float share;
  public float imageShare;
  public float4 w0;       // the weights of levels 0 to 3
  public float4 w1;       // 4 to 7
  public float w2;        // 8
  public float basePixels;  // a level's sigma is this × 2^i pixels
};

/** The weight of level `i`, 0 to 8. */
[ForceInline]
public float glareWeight(GlareUniforms u, uint i) {
  return i < 4u ? u.w0[i] : (i < 8u ? u.w1[i - 4u] : u.w2);
}

/** The image, finite and in range: below 0 is light out of sRGB's gamut, which a veil can't spread. */
[ForceInline]
public float4 glareImage(float4 c) {
  float4 finite = postFinite(c);
  return float4(clamp(finite.rgb, float3(0.0), float3(GLARE_IMAGE_CLAMP)), finite.a);
}

// The pixel at `uv` is within the sun's disc, and the margin: by the sine of its angle from
// the sun, in the view's axes. One exit: an inlined early return makes a `loop` in the WGSL.
[ForceInline]
public bool glareInSun(float2 uv, GlareUniforms u, GlareSource sun, GlareSource head) {
  bool inside = false;
  if (sun.kind >= 0.5 && head.pixel.y > 0.0) {
    float2 t = (uv - float2(0.5)) * u.viewSize * u.pixelAngle;
    float2 s = (sun.pixel - u.viewSize * 0.5) * u.pixelAngle;
    float2 d = t - s;
    float across = t.x * s.y - t.y * s.x;
    float sine = sqrt(dot(d, d) + across * across) / sqrt((1.0 + dot(t, t)) * (1.0 + dot(s, s)));
    inside = sine < head.radius + MASK_MARGIN * u.pixelAngle;
  }
  return inside;
}

// The sum of the levels' Gaussians at squared distance `r2` pixels: 9 terms, unrolled.
[ForceInline]
float glareSpread(GlareUniforms u, float r2) {
  float sum = 0.0;
  [ForceUnroll]
  for (uint i = 0u; i < 9u; i++) {
    float reach = u.basePixels * float(1u << i);
    float variance = reach * reach;
    sum += glareWeight(u, i) * exp(-r2 / (2.0 * variance)) / (2.0 * 3.14159265358979 * variance);
  }
  return sum;
}

// The sun's veil at `uv`, pre-exposed: `sunVeil`, as veilWeights.ts has it. One exit, as above.
[ForceInline]
public float3 glareSunVeil(float2 uv, float preExposure, GlareUniforms u, GlareSource sun, GlareSource head) {
  float3 veil = float3(0.0);
  if (sun.visibility > 0.0) {
    float2 pixel = uv * u.viewSize;
    float2 offset = pixel - sun.pixel;
    float2 t = (pixel - u.viewSize * 0.5) * u.pixelAngle;
    float z = 1.0 / sqrt(1.0 + dot(t, t));
    float solid = u.pixelAngle * u.pixelAngle * z * z * z;
    if (solid > 0.0) {
      float fade = smoothstep(0.05, 0.15, head.pixel.y);
      veil = sun.light * sun.visibility * u.share * glareSpread(u, dot(offset, offset)) / solid * fade * preExposure;
    }
  }
  return veil;
}

// A cubic B-spline over a texture of one level, in 4 bilinear taps (Sigg and Hadwiger 2005).
[ForceInline]
public float3 glareBicubic(Texture2D<float4> tex, SamplerState s, float2 uv) {
  uint w;
  uint h;
  tex.GetDimensions(w, h);
  float2 size = float2(float(w), float(h));
  float2 p = uv * size - float2(0.5);
  float2 i = floor(p);
  float2 f = p - i;
  float2 f2 = f * f;
  float2 f3 = f2 * f;
  float2 w0 = (float2(1.0) - 3.0 * f + 3.0 * f2 - f3) / 6.0;
  float2 w1 = (float2(4.0) - 6.0 * f2 + 3.0 * f3) / 6.0;
  float2 w3 = f3 / 6.0;
  float2 g0 = w0 + w1;
  float2 g1 = float2(1.0) - g0;
  float2 h0 = (i + float2(-0.5) + w1 / g0) / size;
  float2 h1 = (i + float2(1.5) + w3 / g1) / size;
  float3 a = tex.SampleLevel(s, h0, 0.0).rgb;
  float3 b = tex.SampleLevel(s, float2(h1.x, h0.y), 0.0).rgb;
  float3 c = tex.SampleLevel(s, float2(h0.x, h1.y), 0.0).rgb;
  float3 d = tex.SampleLevel(s, h1, 0.0).rgb;
  return g0.y * (g0.x * a + g1.x * b) + g1.y * (g0.x * c + g1.x * d);
}
