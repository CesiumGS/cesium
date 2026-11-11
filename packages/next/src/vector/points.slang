// Live points (vector/PointSource.ts): a feed's samples applied on the GPU
// (`applySamples`, one dispatch per update), and each frame every point's
// position and heading at the clock, interpolated between its last two
// samples and clamped to the ground, written as its anchor in the world's
// vertex arena (the point mesh's position stream, four floats: x, y, z in
// the source's frame and the heading) and its heading into its property
// stream for styles (`${heading}`). Points beyond `count` and points never
// sampled get `HIDDEN` as x, which the vertex stage drops.
//
// Under a warp (plan 13.26, increment 4) each point's position goes through
// the route here, in the pass that writes it: `placeAnchor` over the
// source's carrier draw's lattice (vector/PointSource.ts), so the cull, the
// quads and a model pool that reads the anchors all see the drawn place. A
// source whose carrier isn't fitted yet shows nothing (`held`).

import placement;

struct PointParams {
  float time;        // the clock, seconds
  float delay;       // shown this long behind the clock (0: the latest sample)
  uint count;        // points shown; the rest are hidden
  uint capacity;
  uint anchors;      // arena word of point 0's anchor
  uint streams;      // arena word of point 0's properties
  uint stride;       // property words per point
  uint headingWord;  // the heading's word within a point's properties
  uint clamped;      // 1: on the ground of `heights` (z: above it)
  float halfExtent;  // the height capture's square, each way, m
  float top;         // its depth range along up, m
  float bottom;
  uint threads;      // threads per row of the dispatch (groups.x × 64)
  uint placement;    // the carrier's block in the placements buffer (NO_PLACEMENT: none)
  uint held;         // 1: the warp isn't fitted yet; every point is hidden
  uint pad2;
};

// Two samples: where the point is shown from (0) and goes to (1), their
// times and headings (degrees clockwise from north, a compass course).
struct State {
  float3 p0;
  float t0;
  float3 p1;
  float t1;
  float h0;
  float h1;
  float sampled;     // 1 once it has a sample
  float pad;
};

struct Update {
  uint first;        // the first point the samples are for
  uint n;
  float now;         // the clock when they arrived
  float delay;
  uint threads;
  uint pad0;
  uint pad1;
  uint pad2;
};

[[vk::binding(0, 0)]] ConstantBuffer<PointParams> params;
[[vk::binding(1, 0)]] RWStructuredBuffer<State> state;
[[vk::binding(2, 0)]] RWStructuredBuffer<float> vertices;
// The ground seen from above (Engine addHeightCapture), last frame's.
[[vk::binding(3, 0)]] DepthTexture2D heights;

[[vk::binding(0, 1)]] ConstantBuffer<Update> update;
// x, y, z (m in the source's frame) and heading (degrees) per sample.
[[vk::binding(1, 1)]] StructuredBuffer<float4> samples;

// An anchor's x for a point not drawn (opaque.wgsl and modelPool.slang test
// x > 1e37).
static const float HIDDEN = 3.0e38;

// The ground's height (m along up) under (x, y), bilinear between four
// texels (the highest where some have no ground); `none` where none have.
float groundHeight(float x, float y, float none) {
  uint width, height;
  heights.GetDimensions(width, height);
  int2 size = int2(int(width), int(height));
  float2 uv = float2(x, -y) / params.halfExtent * 0.5 + 0.5;
  if (any(uv < float2(0.0)) || any(uv > float2(1.0))) {
    return none;
  }
  float2 texel = uv * float2(size) - 0.5;
  float2 base = floor(texel);
  float2 f = texel - base;
  int2 i = int2(base);
  int2 top = size - 1;
  float d00 = heights.Load(int3(clamp(i, int2(0), top), 0));
  float d10 = heights.Load(int3(clamp(i + int2(1, 0), int2(0), top), 0));
  float d01 = heights.Load(int3(clamp(i + int2(0, 1), int2(0), top), 0));
  float d11 = heights.Load(int3(clamp(i + int2(1, 1), int2(0), top), 0));
  float highest = max(max(d00, d10), max(d01, d11));
  if (highest <= 0.0) {
    return none;
  }
  float d = lerp(lerp(d00, d10, f.x), lerp(d01, d11, f.x), f.y);
  if (min(min(d00, d10), min(d01, d11)) <= 0.0) {
    d = highest;
  }
  return params.bottom + d * (params.top - params.bottom);
}

// Where a point is shown at time `t`, and its heading.
float4 shown(State s, float t) {
  float a = clamp((t - s.t0) / max(s.t1 - s.t0, 1e-6), 0.0, 1.0);
  // The shorter way round.
  float turn = s.h1 - s.h0 - 360.0 * round((s.h1 - s.h0) / 360.0);
  return float4(lerp(s.p0, s.p1, a), s.h0 + turn * a);
}

// New samples: each point moves from where it is shown now to its new
// sample over the next `delay`, so it never jumps.
[shader("compute")]
[numthreads(64, 1, 1)]
void applySamples(uint3 gid : SV_DispatchThreadID) {
  uint k = gid.x + gid.y * update.threads;
  if (k >= update.n) {
    return;
  }
  uint i = update.first + k;
  float4 next = samples[k];
  State s = state[i];
  float4 start = next;
  if (s.sampled > 0.5) {
    start = shown(s, update.now - update.delay);
  }
  s.p0 = start.xyz;
  s.h0 = start.w;
  s.t0 = update.now - update.delay;
  s.p1 = next.xyz;
  s.h1 = next.w;
  s.t1 = update.now;
  s.sampled = 1.0;
  state[i] = s;
}

[shader("compute")]
[numthreads(64, 1, 1)]
void placePoints(uint3 gid : SV_DispatchThreadID) {
  uint i = gid.x + gid.y * params.threads;
  if (i >= params.capacity) {
    return;
  }
  uint a = params.anchors + i * 4u;
  State s = state[i];
  if (i >= params.count || s.sampled < 0.5 || params.held != 0u) {
    vertices[a] = HIDDEN;
    return;
  }
  float4 p = shown(s, params.time - params.delay);
  if (params.clamped != 0u) {
    // z is the height above the ground; off the capture, above the frame.
    p.z += groundHeight(p.x, p.y, 0.0);
  }
  p.xyz = placeAnchor(params.placement, p.xyz);
  vertices[a] = p.x;
  vertices[a + 1u] = p.y;
  vertices[a + 2u] = p.z;
  vertices[a + 3u] = p.w;
  if (params.stride > 0u) {
    vertices[params.streams + i * params.stride + params.headingWord] = p.w;
  }
}
