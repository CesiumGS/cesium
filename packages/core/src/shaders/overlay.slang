// Screen overlays drawn after tonemapping (e.g. a linked view's footprint).
// Positions are camera-relative float32, computed on the CPU in float64.

import common;

struct OverlayParams {
  float4 color;
};

[[vk::binding(0, 0)]] ConstantBuffer<View> view;
[[vk::binding(0, 1)]] ConstantBuffer<OverlayParams> overlay;

[shader("vertex")]
float4 vs(float3 position : POSITION) : SV_Position {
  float4 clip = mul(view.viewProj, float4(position, 1.0));
  // Keep lines on top of everything in the view.
  clip.z = clip.w;
  return clip;
}

[shader("fragment")]
float4 fs() : SV_Target {
  return overlay.color;
}
