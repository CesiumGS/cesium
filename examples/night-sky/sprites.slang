// A lens's diffraction spikes, drawn as sprites: the night-sky example's own stage
// (sprites.ts). The engine's light list (glare.slang `glareSources`) says which sources get
// one and how far it reaches; this draws each as a quad of the pupil's kernel, added into the
// image. Not part of the engine: a stage in the example, through the public interface.
//
// Pinned by test/veilWeights.test.ts (the clamp keeps the sum of all of them inside fp16).
import glareSource;

static const float SPRITE_CLAMP = 200.0;

// This view's values for the sprites, written each tick (sprites.ts `writeFrame`).
struct SpriteFrame {
  float2 size;          // the view, pixels
  float exposure;       // the scene's light × this is what the image holds
  float brightness;     // a kernel value of 1's radiance, per unit of pre-exposed lux
  float kernelScale;    // what a kernel's stored value is multiplied by
  float uvPerPixel;
  float kernelLevel;
  float unused;
};

[[vk::binding(0, 0)]] ConstantBuffer<SpriteFrame> frame;
// The engine's list: the header (pixel.x the count in use), then a record per source.
[[vk::binding(1, 0)]] StructuredBuffer<GlareSource> spriteSources;
// A pupil's kernel, its stored values times `frame.kernelScale`.
[[vk::binding(2, 0)]] Texture2D<float4> glareKernel;
[[vk::binding(3, 0)]] SamplerState kernelSampler;

// By field: a varying `nointerpolation` struct passed whole is copied with its
// interpolation where WGSL forbids it.
struct SpriteVarying {
  float4 position : SV_Position;
  float2 corner : CORNER;
  nointerpolation float3 light : LIGHT;
  nointerpolation float reach : REACH;
};

// One source as a strip of 4 vertices; a degenerate triangle for a slot past the list's
// count, or a source with no sprite.
[shader("vertex")]
SpriteVarying spriteVertex(uint corner : SV_VertexID, uint slot : SV_InstanceID) {
  SpriteVarying out;
  out.position = float4(2.0, 2.0, 0.0, 1.0);
  out.corner = float2(0.0);
  out.light = float3(0.0);
  out.reach = 0.0;
  if (float(slot) >= spriteSources[0].pixel.x) {
    return out;
  }
  GlareSource source = spriteSources[slot + 1u];
  if (source.radius <= 0.0 || source.visibility <= 0.0) {
    return out;
  }
  float2 c = float2(float(corner & 1u), float(corner >> 1u)) * 2.0 - 1.0;
  float2 pixel = source.pixel + c * source.radius;
  out.position = float4(
      pixel.x / frame.size.x * 2.0 - 1.0,
      1.0 - pixel.y / frame.size.y * 2.0,
      0.0,
      1.0);
  out.corner = c;
  out.light = source.light * source.visibility * frame.exposure * frame.brightness * frame.kernelScale;
  out.reach = source.radius * frame.uvPerPixel;
  return out;
}

// Each sprite's fragment is one sample, clamped so that all of them together stay
// inside fp16.
[shader("fragment")]
float4 spriteFragment(SpriteVarying in) : SV_Target0 {
  float2 uv = 0.5 + in.corner * in.reach;
  float3 kernel = glareKernel.SampleLevel(kernelSampler, uv, frame.kernelLevel).rgb;
  float fade = saturate((1.0 - length(in.corner)) * 10.0);
  return float4(min(in.light * kernel * fade, float3(SPRITE_CLAMP)), 0.0);
}
