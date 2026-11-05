// Globe imagery compositing (GlobeImagery): writes one terrain tile's slice
// of the imagery array from source imagery tiles, then its mips.
//
// Destination texel (x, y): y = 0 is the tile's north edge. The source
// coordinates come from the CPU in float64, so deep levels stay exact in
// float32: s is linear in x (longitude maps linearly in both Web Mercator
// and geographic tiling), t is a per-row table (latitude does not).

struct Params {
  // s = col.x + col.y * (x + 0.5); col.z = slice size; col.w unused
  float4 col;
  // fill color (sRGB-encoded) for `fill`
  float4 color;
  // t per destination row, 4 per float4 (256 rows)
  float4 rows[64];
};

[[vk::binding(0, 0)]] Texture2D<float4> source;
[[vk::binding(1, 0)]] SamplerState sourceSampler;
[[vk::binding(2, 0)]] [[vk::image_format("rgba8")]] WTexture2D<float4> destination;
[[vk::binding(3, 0)]] ConstantBuffer<Params> params;

[shader("compute")]
[numthreads(8, 8, 1)]
void fill(uint3 id : SV_DispatchThreadID) {
  uint size = uint(params.col.z);
  if (id.x >= size || id.y >= size) {
    return;
  }
  destination.Store(id.xy, params.color);
}

[shader("compute")]
[numthreads(8, 8, 1)]
void composite(uint3 id : SV_DispatchThreadID) {
  uint size = uint(params.col.z);
  if (id.x >= size || id.y >= size) {
    return;
  }
  float s = params.col.x + params.col.y * (float(id.x) + 0.5);
  float t = params.rows[id.y / 4u][id.y % 4u];
  // Only the texels this source tile covers.
  if (s < 0.0 || s > 1.0 || t < 0.0 || t > 1.0) {
    return;
  }
  destination.Store(id.xy, source.SampleLevel(sourceSampler, float2(s, t), 0.0));
}

// One mip level from the previous: a 2×2 box filter.
[shader("compute")]
[numthreads(8, 8, 1)]
void downsample(uint3 id : SV_DispatchThreadID) {
  uint size = uint(params.col.z);
  if (id.x >= size || id.y >= size) {
    return;
  }
  int2 p = int2(id.xy) * 2;
  float4 c = source.Load(int3(p, 0)) + source.Load(int3(p + int2(1, 0), 0)) +
             source.Load(int3(p + int2(0, 1), 0)) + source.Load(int3(p + int2(1, 1), 0));
  destination.Store(id.xy, c * 0.25);
}
