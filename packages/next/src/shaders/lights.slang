// Clustered forward shading (Olsson, Billeter and Assarsson 2012): each
// froxel of the view (scene/lights.ts `CLUSTERS`) lists the lights whose
// reach (a sphere) meets its box in view space, the CLUSTER_LIGHTS
// brightest there (candela over the squared distance to the box) when more
// do; the opaque pass shades a pixel's froxel's lights.
//
// The view's light table (common `LightTable`, scene/lights.ts): its
// header, MAX_VIEW_LIGHTS lights, then the froxels' lists. A struct ending
// in a runtime-sized array, so it is read here as bytes at the same
// offsets: the lights read, the lists written.

import common;

[[vk::binding(0, 0)]] RWByteAddressBuffer lightTable;

static const uint HEADER_BYTES = 80u;          // sizeof(LightHeader)
static const uint LIGHT_BYTES = 64u;           // sizeof(Light)
static const uint CLUSTERS_BYTES = HEADER_BYTES + MAX_VIEW_LIGHTS * LIGHT_BYTES;

Light lightAt(uint l) {
  return lightTable.Load<Light>(HEADER_BYTES + l * LIGHT_BYTES);
}

// A workgroup per tile of the screen, a thread per slice in depth: the
// tile's column culls the view's lights into `tileLights` together, then
// each slice sorts its own from those.
static const uint SLICES = 32u;            // scene/lights.ts CLUSTERS[2]
static const uint TILE_LIGHTS = MAX_VIEW_LIGHTS;
groupshared uint tileLights[TILE_LIGHTS];
groupshared Atomic<uint> tileCount;

[shader("compute")]
[numthreads(SLICES, 1, 1)]
void assign(uint3 tile : SV_GroupID, uint k : SV_GroupIndex) {
  LightHeader h = lightTable.Load<LightHeader>(0);
  uint3 dims = uint3(h.grid.xyz);
  uint i = tile.x;
  uint j = tile.y; // from the top
  // The tile's side planes, by their slopes: x/z in [sx.x, sx.y], y/z in
  // [sy.x, sy.y]; their outward normals, unit.
  float2 sx = (float2(float(i), float(i + 1u)) / float(dims.x) * 2.0 - 1.0) * h.depth.z;
  float2 sy = (1.0 - float2(float(j + 1u), float(j)) / float(dims.y) * 2.0) * h.depth.w;
  float3 left = float3(-1.0, 0.0, sx.x) * rsqrt(1.0 + sx.x * sx.x);
  float3 right = float3(1.0, 0.0, -sx.y) * rsqrt(1.0 + sx.y * sx.y);
  float3 bottom = float3(0.0, -1.0, sy.x) * rsqrt(1.0 + sy.x * sy.x);
  float3 top = float3(0.0, 1.0, -sy.y) * rsqrt(1.0 + sy.y * sy.y);
  if (k == 0u) {
    tileCount.store(0u);
  }
  GroupMemoryBarrierWithGroupSync();
  uint total = uint(h.grid.w);
  total = min(total, MAX_VIEW_LIGHTS);
  for (uint l = k; l < MAX_VIEW_LIGHTS; l += SLICES) {
    if (l >= total) {
      break;
    }
    Light light = lightAt(l);
    float3 c = light.position.xyz;
    float3 v = float3(dot(c, h.right.xyz), dot(c, h.up.xyz), dot(c, h.forward.xyz));
    float r = light.position.w;
    if (dot(left, v) <= r && dot(right, v) <= r && dot(bottom, v) <= r &&
        dot(top, v) <= r) {
      uint at = tileCount.add(1u);
      if (at < TILE_LIGHTS) {
        tileLights[at] = l;
      }
    }
  }
  GroupMemoryBarrierWithGroupSync();
  uint listed = min(tileCount.load(), TILE_LIGHTS);

  float z0 = h.depth.x * exp(float(k) / h.depth.y);
  float z1 = h.depth.x * exp(float(k + 1u) / h.depth.y);
  float3 lo = float3(min(sx.x * z0, sx.x * z1), min(sy.x * z0, sy.x * z1), z0);
  float3 hi = float3(max(sx.y * z0, sx.y * z1), max(sy.y * z0, sy.y * z1), z1);
  uint base = ((k * dims.y + j) * dims.x + i) * (1u + CLUSTER_LIGHTS);
  // Kept brightest first (insertion: the dimmest drops off the end).
  uint kept[CLUSTER_LIGHTS];
  float score[CLUSTER_LIGHTS];
  uint count = 0u;
  for (uint t = 0u; t < TILE_LIGHTS; t++) {
    if (t >= listed) {
      break;
    }
    uint l = min(tileLights[t], MAX_VIEW_LIGHTS - 1u);
    Light light = lightAt(l);
    float3 c = light.position.xyz;
    float3 v = float3(dot(c, h.right.xyz), dot(c, h.up.xyz), dot(c, h.forward.xyz));
    float3 d = v - clamp(v, lo, hi);
    float d2 = dot(d, d);
    if (d2 > light.position.w * light.position.w) {
      continue;
    }
    float s = max(light.color.r, max(light.color.g, light.color.b)) / max(d2, 1.0);
    if (count == CLUSTER_LIGHTS && s <= score[CLUSTER_LIGHTS - 1u]) {
      continue;
    }
    uint at = min(count, CLUSTER_LIGHTS - 1u);
    while (at > 0u && score[at - 1u] < s) {
      kept[at] = kept[at - 1u];
      score[at] = score[at - 1u];
      at--;
    }
    kept[at] = l;
    score[at] = s;
    count = min(count + 1u, CLUSTER_LIGHTS);
  }
  for (uint t = 0u; t < CLUSTER_LIGHTS; t++) {
    if (t >= count) {
      break;
    }
    lightTable.Store(CLUSTERS_BYTES + (base + 1u + t) * 4u, kept[t]);
  }
  lightTable.Store(CLUSTERS_BYTES + base * 4u, count);
}
