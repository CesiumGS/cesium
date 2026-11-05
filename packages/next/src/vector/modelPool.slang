// A model pool (vector/ModelPool.ts): a styled model layer's slots, given
// each frame to the nearest points its filter passes. Five dispatches in
// the world's frame compute pass, after the source has placed its points:
// `resetPool` clears the counters; `binPoints` evaluates the style per
// point and counts passing points by distance (eight bins an octave);
// `cutPool` finds the farthest bin whose points all fit the slots;
// `claimSlots` gives each point nearer than that a slot and writes the
// model's instance rows there (every part, oriented by the style's
// heading, scaled by its scale); `hideRest` hides the slots left over. The
// points that get models are the nearest ones, whatever order threads run
// in.
//
// The style is WGSL composed at run time (vector/VectorStyle.ts), appended
// to this module's WGSL with its uniforms (binding 6). That is the runtime
// boundary (CESIUM2_WEBGPU_PLAN.md §3.4), declared here, not found by
// rewriting output: the style defines `styleShow`, `styleHeading`
// (degrees) and `styleScale`, by point and its distance from the nearest
// camera, called by their names (`__target_intrinsic`); and it reads points
// through `pointF32`, `pointU32` and `styleTime`, exported under their
// names (`__extern_cpp`), as pointCull.slang's styles do.

import common;

struct PoolParams {
  uint count;      // points shown (the source's count)
  uint slots;
  uint parts;      // the model's primitives
  uint threads;    // threads per row of a point dispatch (groups.x × 64)
  uint anchors;    // arena word of point 0's anchor
  uint streams;    // arena word of point 0's properties
  uint stride;
  uint cameras;    // views of the world (up to 4)
  float time;
  uint pad0;
  uint pad1;
  uint pad2;
  float4 camera[4]; // in the source's frame, m
};

// A part's matrices, column-major in memory as WGSL lays them out: read
// from a buffer, Slang's matrix is the same matrix (its storage is
// column-major for WGSL), unlike a `float4x4(...)` literal, whose
// arguments are rows.
struct Part {
  float4x4 local;
  float4x4 inverse;
  uint first;      // its slot 0's row in the instance table
  uint pad0;
  uint pad1;
  uint pad2;
};

[[vk::binding(0, 0)]] ConstantBuffer<PoolParams> pool;
[[vk::binding(1, 0)]] StructuredBuffer<float> vertices;
[[vk::binding(2, 0)]] StructuredBuffer<Part> parts;
[[vk::binding(3, 0)]] RWStructuredBuffer<Instance> instanceRows;
// 128 bins, then the cut bin and the slots claimed.
[[vk::binding(4, 0)]] RWStructuredBuffer<Atomic<uint>> counters;
[[vk::binding(5, 0)]] RWStructuredBuffer<uint> bins;

static const uint BINS = 128u;
static const uint CUT = 128u;
static const uint CLAIMED = 129u;
static const uint NO_BIN = 0xffffffffu;
static const float EARTH_RADIUS = 6371000.0;

// --- the boundary: what the style reads, by name ------------------------------

export __extern_cpp float styleTime() {
  return pool.time;
}
export __extern_cpp float pointF32(uint i, uint word) {
  return vertices[pool.streams + i * pool.stride + word];
}
export __extern_cpp uint pointU32(uint i, uint word) {
  return asuint(vertices[pool.streams + i * pool.stride + word]);
}

// --- the boundary: what the style defines, called by name ---------------------

__target_intrinsic(wgsl, "styleShow($0, $1)")
bool styleShow(uint i, float distance);
__target_intrinsic(wgsl, "styleHeading($0, $1)")
float styleHeading(uint i, float distance);
__target_intrinsic(wgsl, "styleScale($0, $1)")
float styleScale(uint i, float distance);

float4 anchorOf(uint i) {
  uint a = pool.anchors + i * 4u;
  return float4(vertices[a], vertices[a + 1u], vertices[a + 2u], vertices[a + 3u]);
}

// Meters to the nearest view's camera.
float nearest(float3 p) {
  float d = 3.4e38;
  for (uint k = 0u; k < min(pool.cameras, 4u); k++) {
    d = min(d, distance(p, pool.camera[k].xyz));
  }
  return d;
}

[shader("compute")]
[numthreads(64, 1, 1)]
void resetPool(uint3 gid : SV_DispatchThreadID) {
  if (gid.x < 132u) {
    counters[gid.x].store(0u);
  }
}

[shader("compute")]
[numthreads(64, 1, 1)]
void binPoints(uint3 gid : SV_DispatchThreadID) {
  uint i = gid.x + gid.y * pool.threads;
  if (i >= pool.count) {
    return;
  }
  bins[i] = NO_BIN;
  float4 a = anchorOf(i);
  if (!(abs(a.x) < 1e37)) {
    return;
  }
  float d = nearest(a.xyz);
  if (!styleShow(i, d)) {
    return;
  }
  uint b = min(uint(max(log2(max(d, 1.0)) * 8.0, 0.0)), BINS - 1u);
  bins[i] = b;
  counters[b].add(1u);
}

[shader("compute")]
[numthreads(1, 1, 1)]
void cutPool() {
  uint sum = 0u;
  uint cut = BINS;
  for (uint b = 0u; b < BINS; b++) {
    uint n = counters[b].load();
    if (sum + n > pool.slots) {
      cut = b;
      break;
    }
    sum += n;
  }
  counters[CUT].store(cut);
}

[shader("compute")]
[numthreads(64, 1, 1)]
void claimSlots(uint3 gid : SV_DispatchThreadID) {
  uint i = gid.x + gid.y * pool.threads;
  if (i >= pool.count) {
    return;
  }
  uint b = bins[i];
  if (b == NO_BIN || b >= counters[CUT].load()) {
    return;
  }
  uint slot = counters[CLAIMED].add(1u);
  if (slot >= pool.slots) {
    return;
  }
  float4 a = anchorOf(i);
  float d = nearest(a.xyz);
  float h = radians(styleHeading(i, d));
  float scale = styleScale(i, d);
  // The local frame at the point (a sphere's up; the source's frame is
  // east, north, up at its origin); the model's forward (+x, 1.x's axes)
  // along the heading, +y to its left.
  float3 up = normalize(float3(a.x, a.y, a.z + EARTH_RADIUS));
  float3 east = normalize(cross(float3(0.0, 1.0, 0.0), up));
  float3 north = cross(up, east);
  float c = cos(h);
  float s = sin(h);
  // Its columns: forward, left, up (scaled) and the point.
  float4x4 placement = transpose(float4x4(
      float4((north * c + east * s) * scale, 0.0),
      float4((north * s - east * c) * scale, 0.0),
      float4(up * scale, 0.0),
      float4(a.xyz, 1.0)));
  for (uint k = 0u; k < pool.parts; k++) {
    Part part = parts[k];
    float4x4 m = mul(mul(part.inverse, placement), part.local);
    uint row = part.first + slot;
    // Only the fields it changes (see `hideRest`).
    // As layout.ts writeInstance: three rows of the affine part.
    instanceRows[row].row0 = m[0];
    instanceRows[row].row1 = m[1];
    instanceRows[row].row2 = m[2];
    instanceRows[row].flags &= ~1u;
  }
}

[shader("compute")]
[numthreads(64, 1, 1)]
void hideRest(uint3 gid : SV_DispatchThreadID) {
  uint j = gid.x;
  if (j >= pool.slots * pool.parts) {
    return;
  }
  uint slot = j % pool.slots;
  if (slot < min(counters[CLAIMED].load(), pool.slots)) {
    return;
  }
  uint row = parts[j / pool.slots].first + slot;
  // The one field: Slang copies a struct field by field (a load and a
  // store each, seven for an `Instance`), slower than the WGSL's copy.
  instanceRows[row].flags |= 1u;
}
