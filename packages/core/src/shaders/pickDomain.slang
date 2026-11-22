// The pick variant's readback (render/view/pickDomain.ts): what the pick
// pass (surface.slang `pickFs`) wrote in the pixel at the middle of its
// window. The pass's targets are single-sampled, so these are plain loads.
// The hit triangle's stored positions follow from raycast.slang
// `pickTriangle`, the kernel that reads triangles.

// The middle pixel of the pick's window (surface.slang `PICK_SIZE`, 3).
static const int2 MIDDLE = int2(1, 1);

// Words of the result (render/layout.ts `PICK_RESULT_WORDS`): the draw, its
// feature, the triangle (NONE: a patch draw's face) and the instance; the
// pass's second target (4 floats); the depth (reverse-Z, 0: nothing);
// whether the triangle's positions follow (`pickTriangle`), then the three
// positions (corner 0, 1, 2).
static const uint FETCHED_WORD = 9u;

[[vk::binding(0, 0)]] Texture2D<uint4> ids;
[[vk::binding(1, 0)]] Texture2D<float4> domain;
[[vk::binding(2, 0)]] DepthTexture2D depth;
[[vk::binding(3, 0)]] RWStructuredBuffer<uint> result;

[shader("compute")]
[numthreads(1, 1, 1)]
void gather() {
  uint4 id = ids.Load(int3(MIDDLE, 0));
  float4 values = domain.Load(int3(MIDDLE, 0));
  result[0] = id.x;
  result[1] = id.y;
  result[2] = id.z;
  result[3] = id.w;
  result[4] = asuint(values.x);
  result[5] = asuint(values.y);
  result[6] = asuint(values.z);
  result[7] = asuint(values.w);
  result[8] = asuint(depth.Load(int3(MIDDLE, 0)));
  result[FETCHED_WORD] = 0u;
}
