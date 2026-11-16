// Tile boxes against the depth pyramid (hzb.slang; plan Task 12, fix 7).
// One thread a query, 32 queries a group, one result bit a query: set when the
// box is certainly hidden. A box is a center and three half-axes in camera
// space (x right, y up, z forward), relative to the eye, made on the CPU in
// float64 and rounded here (selection's own camera, in the tileset's
// coordinates). The test is conservative at every step: any corner at or
// behind the near plane, or a rectangle off the screen, leaves the box
// visible, and so does anything that doesn't add up.
//
// The test itself is hzbTest.slang's, shared with the draws' occlusion cull.

import hzbTest;

struct QueryParams {
  uint count;
  uint width;    // the frame's, pixels
  uint height;
  uint levels;   // the pyramid's
  float tanX;    // tangent of half the field of view, across and up
  float tanY;
  float near;
  float bias;
};

[[vk::binding(0, 0)]] ConstantBuffer<QueryParams> params;
[[vk::binding(1, 0)]] Texture2D<float> pyramid;
[[vk::binding(2, 0)]] StructuredBuffer<float> queries;
[[vk::binding(3, 0)]] RWStructuredBuffer<uint> hidden;

static const uint MAX_QUERIES = 8192u;
static const uint QUERY_FLOATS = 12u;

groupshared Atomic<uint> word;

float3 vec(uint at) {
  return float3(queries[at], queries[at + 1u], queries[at + 2u]);
}

// Whether query `q` is certainly hidden.
bool isHidden(uint q) {
  uint at = q * QUERY_FLOATS;
  PyramidCamera camera;
  camera.width = params.width;
  camera.height = params.height;
  camera.levels = params.levels;
  camera.tanX = params.tanX;
  camera.tanY = params.tanY;
  camera.near = params.near;
  camera.bias = params.bias;
  return boxHidden(pyramid, camera, vec(at), vec(at + 3u), vec(at + 6u), vec(at + 9u), 2u);
}

[shader("compute")]
[numthreads(32, 1, 1)]
void main(uint3 id : SV_DispatchThreadID, uint local : SV_GroupIndex, uint3 group : SV_GroupID) {
  if (local == 0u) {
    word.store(0u);
  }
  GroupMemoryBarrierWithGroupSync();
  if (id.x < min(params.count, MAX_QUERIES) && isHidden(id.x)) {
    word.or(1u << local);
  }
  GroupMemoryBarrierWithGroupSync();
  if (local == 0u) {
    hidden[min(group.x, MAX_QUERIES / 32u - 1u)] = word.load();
  }
}
