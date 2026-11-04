// Real-time tracks (tracks/Tracks.ts): each frame, each track's position
// and heading at the clock, interpolated between its two latest feed
// samples, written as its instance rows in the world's instance table, one
// per representation part (a model's primitives, the billboard). Runs once
// per frame before culling (World.addFrameCompute). common.wgsl precedes.

struct TrackParams {
  time: f32,       // the clock (Tracks `clock`), seconds
  delay: f32,      // shown this long behind the clock (a feed interval)
  count: u32,      // tracks shown; the rest are hidden
  capacity: u32,
  parts: u32,
  scale: f32,      // the model's scale
  lift: f32,       // the billboard above the track, m
  clamped: u32,    // 1: on the ground of `heights` (z: above it)
  halfExtent: f32, // the height capture's square, each way, m
  top: f32,        // its depth range along up, m
  bottom: f32,
  _pad: u32,
};

// Two samples: where the track was (0) and is (1), their times and
// headings (radians clockwise from north, as a compass course).
struct Track {
  p0: vec3f,
  t0: f32,
  p1: vec3f,
  t1: f32,
  h0: f32,
  h1: f32,
  sampled: f32,    // 1 once it has a sample (Tracks.update)
  _pad: f32,
};

// A representation part: its rows from `first` (a row per track), and the
// part's frame in the collection's (`local`, `inverse`), as
// gltfModel.ts setModelInstance's conjugation; billboards: identity, `kind` 1.
struct Part {
  local: mat4x4f,
  inverse: mat4x4f,
  first: u32,
  kind: u32,       // 0 a model part, 1 the billboard
  _pad0: u32,
  _pad1: u32,
};

@group(0) @binding(0) var<uniform> params: TrackParams;
@group(0) @binding(1) var<storage, read> tracks: array<Track>;
@group(0) @binding(2) var<storage, read> parts: array<Part>;
@group(0) @binding(3) var<storage, read_write> instanceRows: array<Instance>;
// The ground seen from above (Engine addHeightCapture), last frame's.
@group(0) @binding(4) var heights: texture_depth_2d;

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

const EARTH_RADIUS = 6371000.0;
const PI = 3.141592653589793;

@compute @workgroup_size(64)
fn updateTracks(@builtin(global_invocation_id) gid: vec3u) {
  let i = gid.x;
  let part = parts[gid.y];
  if (i >= params.capacity || gid.y >= params.parts) {
    return;
  }
  let row = part.first + i;
  var inst = instanceRows[row];
  if (i >= params.count) {
    inst.flags = inst.flags | 1u; // hidden
    instanceRows[row] = inst;
    return;
  }
  let s = tracks[i];
  let t = params.time - params.delay;
  let a = clamp((t - s.t0) / max(s.t1 - s.t0, 1e-6), 0.0, 1.0);
  var p = mix(s.p0, s.p1, a);
  if (params.clamped != 0u) {
    // z is the height above the ground; off the capture, above the frame.
    p.z += groundHeight(p.x, p.y, 0.0);
  }
  // The shorter way round.
  let turn = s.h1 - s.h0 - 2.0 * PI * round((s.h1 - s.h0) / (2.0 * PI));
  let heading = s.h0 + turn * a;
  // The local frame at the track (a sphere's up; the collection's frame is
  // east, north, up at its origin).
  let up = normalize(vec3f(p.x, p.y, p.z + EARTH_RADIUS));
  let east = normalize(cross(vec3f(0.0, 1.0, 0.0), up));
  let north = cross(up, east);
  var m: mat4x4f;
  if (part.kind == 1u) {
    m = mat4x4f(
      vec4f(1.0, 0.0, 0.0, 0.0),
      vec4f(0.0, 1.0, 0.0, 0.0),
      vec4f(0.0, 0.0, 1.0, 0.0),
      vec4f(p + up * params.lift, 1.0),
    );
  } else {
    // The model's forward (+x, 1.x's axes) along the heading, +y to its left.
    let c = cos(heading);
    let sn = sin(heading);
    let x = (north * c + east * sn) * params.scale;
    let y = (north * sn - east * c) * params.scale;
    let placement = mat4x4f(
      vec4f(x, 0.0),
      vec4f(y, 0.0),
      vec4f(up * params.scale, 0.0),
      vec4f(p, 1.0),
    );
    m = part.inverse * placement * part.local;
  }
  // As layout.ts writeInstance: three rows of the affine part.
  inst.row0 = vec4f(m[0].x, m[1].x, m[2].x, m[3].x);
  inst.row1 = vec4f(m[0].y, m[1].y, m[2].y, m[3].y);
  inst.row2 = vec4f(m[0].z, m[1].z, m[2].z, m[3].z);
  inst.flags = inst.flags & ~1u;
  instanceRows[row] = inst;
}
