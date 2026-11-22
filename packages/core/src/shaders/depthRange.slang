// The nearest and farthest surface a view shows, along its axis (the
// shadow cascades fit their splits to it: Lauritzen, Salvi and Lefohn
// 2011, sample distribution shadow maps, the splits' part). Reverse-Z,
// infinite far: a sample's distance along the view is near / depth; depth
// 0 is the sky (left out). One sample a pixel (the first), the dispatch's
// threads striding over the image; the result as order-preserving bits of
// positive floats.

struct RangeParams {
  float near;
  uint width;
  uint height;
  uint pad;
};

[[vk::binding(0, 0)]] DepthTexture2DMS depth;
[[vk::binding(1, 0)]] ConstantBuffer<RangeParams> params;
[[vk::binding(2, 0)]] RWStructuredBuffer<Atomic<uint>> result;

groupshared Atomic<uint> nearest;
groupshared Atomic<uint> farthest;

[shader("compute")]
[numthreads(16, 16, 1)]
void main(uint3 id : SV_DispatchThreadID, uint local : SV_GroupIndex) {
  if (local == 0u) {
    nearest.store(0x7f7fffffu);
    farthest.store(0u);
  }
  GroupMemoryBarrierWithGroupSync();
  uint2 stride = WorkgroupCount().xy * 16u;
  float lo = 3.4e38;
  float hi = 0.0;
  for (uint y = id.y; y < params.height; y += stride.y) {
    for (uint x = id.x; x < params.width; x += stride.x) {
      float d = depth.Load(int2(x, y), 0);
      if (d > 0.0) {
        float distance = params.near / d;
        lo = min(lo, distance);
        hi = max(hi, distance);
      }
    }
  }
  if (hi > 0.0) {
    nearest.min(asuint(lo));
    farthest.max(asuint(hi));
  }
  GroupMemoryBarrierWithGroupSync();
  if (local == 0u) {
    result[0].min(nearest.load());
    result[1].max(farthest.load());
  }
}
