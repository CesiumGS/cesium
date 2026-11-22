// ParameterBlocks: one bind group each, numbered in order (the engine has
// four: view, world, texture set, custom).
struct ViewParams { float4 tint; };
struct SetParams { Texture2D color; SamplerState smp; };
ParameterBlock<ViewParams> viewParams;
ParameterBlock<SetParams> textureSet;

[shader("vertex")]
float4 vs(uint vid : SV_VertexID) : SV_Position { return float4(float(vid & 1u), float(vid >> 1u), 0, 1); }

[shader("fragment")]
float4 fs(float4 p : SV_Position) : SV_Target {
  return viewParams.tint * textureSet.color.Sample(textureSet.smp, p.xy * 0.001);
}
