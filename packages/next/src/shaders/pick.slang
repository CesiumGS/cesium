// Reads the feature ID and depth under a pixel. Integer targets cannot be
// MSAA-resolved, so this loads sample 0 of the multisampled ID target
// directly. The ID is stored as (lo16, hi16) because r32uint does not
// support multisampling.

struct PickParams {
  uint2 pixel;
  uint2 pad;
};

[[vk::binding(0, 0)]] Texture2DMS<uint4> ids;
[[vk::binding(1, 0)]] ConstantBuffer<PickParams> params;
[[vk::binding(2, 0)]] RWStructuredBuffer<uint> result;
[[vk::binding(3, 0)]] DepthTexture2DMS depth;

[shader("compute")]
[numthreads(1, 1, 1)]
void main() {
  uint2 id = ids.Load(int2(params.pixel), 0).rg;
  result[0] = id.x | (id.y << 16u);
  // Reverse-Z depth (0: nothing drawn), for picked positions.
  result[1] = asuint(depth.Load(int2(params.pixel), 0));
}
