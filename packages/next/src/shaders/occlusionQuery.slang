// Tile boxes against the depth pyramid (hzb.slang; plan Task 12, fix 7).
// One thread a query, 32 queries a group, one result bit a query: set when the
// box is certainly hidden. A box is a centre and three half-axes in camera
// space (x right, y up, z forward), relative to the eye, made on the CPU in
// float64 and rounded here (selection's own camera, in the tileset's
// coordinates). The test is conservative at every step: any corner at or
// behind the near plane, or a rectangle off the screen, leaves the box
// visible, and so does anything that doesn't add up.
//
// Reverse-Z with an infinite far plane: a point at distance z along the view
// has depth near / z, larger being nearer. The box's nearest depth is its
// nearest corner's; the pyramid's texels hold the farthest depth of the pixels
// they cover. The box is hidden if even that farthest depth is nearer than the
// box's nearest, by a relative margin (`bias`) for the depth's own rounding:
// a tile's own surface lies inside its box and often on its near face.
//
// The screen rectangle's pixels map to the level where they span at most
// 2 x 2 texels (`min(p >> (level + 1), size - 1)`, hzb.slang), and the
// level's texels are the 4 read.

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
static const uint MAX_LEVELS = 16u;

groupshared Atomic<uint> word;

float3 vec(uint at) {
  return float3(queries[at], queries[at + 1u], queries[at + 2u]);
}

// Whether query `q` is certainly hidden.
bool isHidden(uint q) {
  uint at = q * QUERY_FLOATS;
  float3 centre = vec(at);
  float3 a = vec(at + 3u);
  float3 b = vec(at + 6u);
  float3 c = vec(at + 9u);
  float frameWidth = float(params.width);
  float frameHeight = float(params.height);
  float nearestZ = 3.4e38;
  float2 low = float2(3.4e38, 3.4e38);
  float2 high = float2(-3.4e38, -3.4e38);
  for (uint k = 0u; k < 8u; k++) {
    float3 p = centre +
               ((k & 1u) == 0u ? -a : a) +
               ((k & 2u) == 0u ? -b : b) +
               ((k & 4u) == 0u ? -c : c);
    if (!(p.z > params.near)) {
      return false;
    }
    float inverse = 1.0 / p.z;
    float2 screen = float2(
      (p.x * inverse / params.tanX * 0.5 + 0.5) * frameWidth,
      (0.5 - p.y * inverse / params.tanY * 0.5) * frameHeight);
    low = min(low, screen);
    high = max(high, screen);
    nearestZ = min(nearestZ, p.z);
  }
  // Off the screen: the frustum's planes deal with it.
  if (!(high.x >= 0.0) || !(high.y >= 0.0) || !(low.x < frameWidth) ||
      !(low.y < frameHeight)) {
    return false;
  }
  // The pixels the rectangle touches, clamped to the frame.
  uint2 first = uint2(clamp(floor(low), float2(0.0, 0.0), float2(frameWidth - 1.0, frameHeight - 1.0)));
  uint2 last = uint2(clamp(floor(high), float2(0.0, 0.0), float2(frameWidth - 1.0, frameHeight - 1.0)));
  uint width0 = max(params.width >> 1u, 1u);
  uint height0 = max(params.height >> 1u, 1u);
  uint2 span = uint2(min(last.x >> 1u, width0 - 1u), min(last.y >> 1u, height0 - 1u)) -
               uint2(min(first.x >> 1u, width0 - 1u), min(first.y >> 1u, height0 - 1u));
  uint extent = max(span.x, span.y) + 1u;
  uint level = 0u;
  for (uint l = 0u; l < MAX_LEVELS; l++) {
    if ((1u << level) >= extent || level + 1u >= params.levels) {
      break;
    }
    level++;
  }
  uint2 size = uint2(max(width0 >> level, 1u), max(height0 >> level, 1u));
  uint2 from = min(first >> (level + 1u), size - 1u);
  uint2 to = min(last >> (level + 1u), size - 1u);
  if (to.x - from.x > 1u || to.y - from.y > 1u) {
    return false;
  }
  float farthest = 3.4e38;
  for (uint j = 0u; j < 2u; j++) {
    uint y = from.y + j;
    if (y > to.y) {
      break;
    }
    for (uint i = 0u; i < 2u; i++) {
      uint x = from.x + i;
      if (x > to.x) {
        break;
      }
      farthest = min(farthest, pyramid.Load(int3(x, y, level)));
    }
  }
  float nearest = params.near / nearestZ;
  return farthest > nearest * (1.0 + params.bias);
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
