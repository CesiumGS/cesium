// textureSample under non-uniform control flow: Slang emits it as written;
// WGSL's uniformity analysis must reject it (as it would hand-written).
[[vk::binding(0, 0)]] Texture2D tex;
[[vk::binding(1, 0)]] SamplerState smp;

[shader("vertex")]
float4 vs(uint vid : SV_VertexID) : SV_Position { return float4(float(vid & 1u), float(vid >> 1u), 0, 1); }

[shader("fragment")]
float4 fs(float4 p : SV_Position) : SV_Target {
  float4 c = float4(0);
  if (p.x > 0.5) { c = tex.Sample(smp, p.xy); }
  return c;
}
