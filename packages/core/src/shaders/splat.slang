// Point splats into the opaque pass (World.drawSplats): the tiny symbols
// pointCull.slang rasterized in the view's cull pass, drawn as a triangle
// over the view, after its other opaque draws: each pixel a splat covers
// takes its color (display-referred, as unlit symbols' is), its feature
// (picking) and its depth, depth-tested against what is drawn (a hill
// still hides the points behind it).

import common;

[[vk::binding(0, 0)]] ConstantBuffer<View> view;
[[vk::binding(0, 1)]] StructuredBuffer<uint> splatDepth;
[[vk::binding(1, 1)]] StructuredBuffer<uint> splatColor;
[[vk::binding(2, 1)]] StructuredBuffer<uint> splatFeature;

[shader("vertex")]
float4 vs(uint v : SV_VertexID) : SV_Position {
  float2 uv = float2(float((v << 1u) & 2u), float(v & 2u));
  return float4(uv * 2.0 - 1.0, 0.0, 1.0);
}

// As the opaque pass's outputs, with the splat's depth.
struct SplatOut {
  float4 color : SV_Target0;
  uint2 featureId : SV_Target1;
  float4 display : SV_Target2;
  float depth : SV_Depth;
};

[shader("fragment")]
SplatOut fs(float4 frag : SV_Position) {
  uint2 px = uint2(frag.xy);
  uint at = px.y * uint(view.viewport.x) + px.x;
  uint bits = splatDepth[at];
  if (bits == 0u) {
    discard;
  }
  float4 srgb = unpackUnorm4x8ToFloat(splatColor[at]);
  uint feature = splatFeature[at];
  SplatOut out;
  // Unlit: no scene light (the scene target isn't written). Over what is
  // drawn by its coverage of the pixel, premultiplied (antialiased edges).
  out.color = float4(0.0);
  out.display = float4(pow(srgb.rgb, float3(2.2)) * srgb.a, srgb.a);
  out.featureId = uint2(feature & 0xffffu, feature >> 16u);
  out.depth = asfloat(bits);
  return out;
}
