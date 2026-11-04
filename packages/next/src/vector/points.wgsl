// Live points (vector/PointSource.ts): a feed's samples applied on the GPU
// (`applySamples`, one dispatch per update), and each frame every point's
// position and heading at the clock, interpolated between its last two
// samples and clamped to the ground, written as its anchor in the world's
// vertex arena (the point mesh's position stream, four floats: x, y, z in
// the source's frame and the heading) and its heading into its property
// stream for styles (`${heading}`). Points beyond `count` and points never
// sampled get `HIDDEN` as x, which the vertex stage drops.

struct PointParams {
  time: f32,       // the clock, seconds
  delay: f32,      // shown this long behind the clock (0: the latest sample)
  count: u32,      // points shown; the rest are hidden
  capacity: u32,
  anchors: u32,    // arena word of point 0's anchor
  streams: u32,    // arena word of point 0's properties
  stride: u32,     // property words per point
  headingWord: u32, // the heading's word within a point's properties
  clamped: u32,    // 1: on the ground of `heights` (z: above it)
  halfExtent: f32, // the height capture's square, each way, m
  top: f32,        // its depth range along up, m
  bottom: f32,
  threads: u32,    // threads per row of the dispatch (groups.x × 64)
  _pad0: u32,
  _pad1: u32,
  _pad2: u32,
};

// Two samples: where the point is shown from (0) and goes to (1), their
// times and headings (degrees clockwise from north, a compass course).
struct State {
  p0: vec3f,
  t0: f32,
  p1: vec3f,
  t1: f32,
  h0: f32,
  h1: f32,
  sampled: f32,    // 1 once it has a sample
  _pad: f32,
};

struct Update {
  first: u32,      // the first point the samples are for
  n: u32,
  now: f32,        // the clock when they arrived
  delay: f32,
  threads: u32,
  _pad0: u32,
  _pad1: u32,
  _pad2: u32,
};

@group(0) @binding(0) var<uniform> params: PointParams;
@group(0) @binding(1) var<storage, read_write> state: array<State>;
@group(0) @binding(2) var<storage, read_write> vertices: array<f32>;
// The ground seen from above (Engine addHeightCapture), last frame's.
@group(0) @binding(3) var heights: texture_depth_2d;

@group(1) @binding(0) var<uniform> update: Update;
// x, y, z (m in the source's frame) and heading (degrees) per sample.
@group(1) @binding(1) var<storage, read> samples: array<vec4f>;

// An anchor's x for a point not drawn (opaque.wgsl and modelPool.wgsl test
// x > 1e37).
const HIDDEN = 3.0e38;

// The ground's height (m along up) under (x, y), bilinear between four
// texels (the highest where some have no ground); `none` where none have.
fn groundHeight(x: f32, y: f32, none: f32) -> f32 {
  let size = vec2i(textureDimensions(heights));
  let uv = vec2f(x, -y) / params.halfExtent * 0.5 + 0.5;
  if (any(uv < vec2f(0.0)) || any(uv > vec2f(1.0))) {
    return none;
  }
  let texel = uv * vec2f(size) - 0.5;
  let base = floor(texel);
  let f = texel - base;
  let i = vec2i(base);
  let top = size - 1;
  let d00 = textureLoad(heights, clamp(i, vec2i(0), top), 0);
  let d10 = textureLoad(heights, clamp(i + vec2i(1, 0), vec2i(0), top), 0);
  let d01 = textureLoad(heights, clamp(i + vec2i(0, 1), vec2i(0), top), 0);
  let d11 = textureLoad(heights, clamp(i + vec2i(1, 1), vec2i(0), top), 0);
  let highest = max(max(d00, d10), max(d01, d11));
  if (highest <= 0.0) {
    return none;
  }
  var d = mix(mix(d00, d10, f.x), mix(d01, d11, f.x), f.y);
  if (min(min(d00, d10), min(d01, d11)) <= 0.0) {
    d = highest;
  }
  return params.bottom + d * (params.top - params.bottom);
}

// Where a point is shown at time `t`, and its heading.
fn shown(s: State, t: f32) -> vec4f {
  let a = clamp((t - s.t0) / max(s.t1 - s.t0, 1e-6), 0.0, 1.0);
  // The shorter way round.
  let turn = s.h1 - s.h0 - 360.0 * round((s.h1 - s.h0) / 360.0);
  return vec4f(mix(s.p0, s.p1, a), s.h0 + turn * a);
}

// New samples: each point moves from where it is shown now to its new
// sample over the next `delay`, so it never jumps.
@compute @workgroup_size(64)
fn applySamples(
  @builtin(global_invocation_id) gid: vec3u,
) {
  let k = gid.x + gid.y * update.threads;
  if (k >= update.n) {
    return;
  }
  let i = update.first + k;
  let next = samples[k];
  var s = state[i];
  var start = next;
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

@compute @workgroup_size(64)
fn placePoints(@builtin(global_invocation_id) gid: vec3u) {
  let i = gid.x + gid.y * params.threads;
  if (i >= params.capacity) {
    return;
  }
  let a = params.anchors + i * 4u;
  let s = state[i];
  if (i >= params.count || s.sampled < 0.5) {
    vertices[a] = HIDDEN;
    return;
  }
  var p = shown(s, params.time - params.delay);
  if (params.clamped != 0u) {
    // z is the height above the ground; off the capture, above the frame.
    p.z += groundHeight(p.x, p.y, 0.0);
  }
  vertices[a] = p.x;
  vertices[a + 1u] = p.y;
  vertices[a + 2u] = p.z;
  vertices[a + 3u] = p.w;
  if (params.stride > 0u) {
    vertices[params.streams + i * params.stride + params.headingWord] = p.w;
  }
}
