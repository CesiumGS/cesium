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
// in. common.wgsl precedes; the style's WGSL follows (`styleShow`,
// `styleHeading`, `styleScale`).

struct PoolParams {
  count: u32,     // points shown (the source's count)
  slots: u32,
  parts: u32,     // the model's primitives
  threads: u32,   // threads per row of a point dispatch (groups.x × 64)
  anchors: u32,   // arena word of point 0's anchor
  streams: u32,   // arena word of point 0's properties
  stride: u32,
  cameras: u32,   // views of the world (up to 4)
  time: f32,
  _pad0: u32,
  _pad1: u32,
  _pad2: u32,
  camera: array<vec4f, 4>, // in the source's frame, m
};

struct Part {
  local: mat4x4f,
  inverse: mat4x4f,
  first: u32,     // its slot 0's row in the instance table
  _pad0: u32,
  _pad1: u32,
  _pad2: u32,
};

@group(0) @binding(0) var<uniform> pool: PoolParams;
@group(0) @binding(1) var<storage, read> vertices: array<f32>;
@group(0) @binding(2) var<storage, read> parts: array<Part>;
@group(0) @binding(3) var<storage, read_write> instanceRows: array<Instance>;
// 128 bins, then the cut bin and the slots claimed.
@group(0) @binding(4) var<storage, read_write> counters: array<atomic<u32>, 132>;
@group(0) @binding(5) var<storage, read_write> bins: array<u32>;

const BINS = 128u;
const CUT = 128u;
const CLAIMED = 129u;
const NO_BIN = 0xffffffffu;
const EARTH_RADIUS = 6371000.0;

fn styleTime() -> f32 {
  return pool.time;
}
fn pointF32(i: u32, word: u32) -> f32 {
  return vertices[pool.streams + i * pool.stride + word];
}
fn pointU32(i: u32, word: u32) -> u32 {
  return bitcast<u32>(vertices[pool.streams + i * pool.stride + word]);
}
fn anchorOf(i: u32) -> vec4f {
  let a = pool.anchors + i * 4u;
  return vec4f(vertices[a], vertices[a + 1u], vertices[a + 2u], vertices[a + 3u]);
}
// Meters to the nearest view's camera.
fn nearest(p: vec3f) -> f32 {
  var d = 3.4e38;
  for (var k = 0u; k < min(pool.cameras, 4u); k++) {
    d = min(d, distance(p, pool.camera[k].xyz));
  }
  return d;
}

@compute @workgroup_size(64)
fn resetPool(@builtin(global_invocation_id) gid: vec3u) {
  if (gid.x < 132u) {
    atomicStore(&counters[gid.x], 0u);
  }
}

@compute @workgroup_size(64)
fn binPoints(@builtin(global_invocation_id) gid: vec3u) {
  let i = gid.x + gid.y * pool.threads;
  if (i >= pool.count) {
    return;
  }
  bins[i] = NO_BIN;
  let a = anchorOf(i);
  if (!(abs(a.x) < 1e37)) {
    return;
  }
  let d = nearest(a.xyz);
  if (!styleShow(i, d)) {
    return;
  }
  let b = min(u32(max(log2(max(d, 1.0)) * 8.0, 0.0)), BINS - 1u);
  bins[i] = b;
  atomicAdd(&counters[b], 1u);
}

@compute @workgroup_size(1)
fn cutPool() {
  var sum = 0u;
  var cut = BINS;
  for (var b = 0u; b < BINS; b++) {
    let n = atomicLoad(&counters[b]);
    if (sum + n > pool.slots) {
      cut = b;
      break;
    }
    sum += n;
  }
  atomicStore(&counters[CUT], cut);
}

@compute @workgroup_size(64)
fn claimSlots(@builtin(global_invocation_id) gid: vec3u) {
  let i = gid.x + gid.y * pool.threads;
  if (i >= pool.count) {
    return;
  }
  let b = bins[i];
  if (b == NO_BIN || b >= atomicLoad(&counters[CUT])) {
    return;
  }
  let slot = atomicAdd(&counters[CLAIMED], 1u);
  if (slot >= pool.slots) {
    return;
  }
  let a = anchorOf(i);
  let d = nearest(a.xyz);
  let h = radians(styleHeading(i, d));
  let scale = styleScale(i, d);
  // The local frame at the point (a sphere's up; the source's frame is
  // east, north, up at its origin); the model's forward (+x, 1.x's axes)
  // along the heading, +y to its left.
  let up = normalize(vec3f(a.x, a.y, a.z + EARTH_RADIUS));
  let east = normalize(cross(vec3f(0.0, 1.0, 0.0), up));
  let north = cross(up, east);
  let c = cos(h);
  let s = sin(h);
  let placement = mat4x4f(
    vec4f((north * c + east * s) * scale, 0.0),
    vec4f((north * s - east * c) * scale, 0.0),
    vec4f(up * scale, 0.0),
    vec4f(a.xyz, 1.0),
  );
  for (var k = 0u; k < pool.parts; k++) {
    let part = parts[k];
    let m = part.inverse * placement * part.local;
    let row = part.first + slot;
    var inst = instanceRows[row];
    // As layout.ts writeInstance: three rows of the affine part.
    inst.row0 = vec4f(m[0].x, m[1].x, m[2].x, m[3].x);
    inst.row1 = vec4f(m[0].y, m[1].y, m[2].y, m[3].y);
    inst.row2 = vec4f(m[0].z, m[1].z, m[2].z, m[3].z);
    inst.flags = inst.flags & ~1u;
    instanceRows[row] = inst;
  }
}

@compute @workgroup_size(64)
fn hideRest(@builtin(global_invocation_id) gid: vec3u) {
  let j = gid.x;
  if (j >= pool.slots * pool.parts) {
    return;
  }
  let slot = j % pool.slots;
  if (slot < min(atomicLoad(&counters[CLAIMED]), pool.slots)) {
    return;
  }
  let row = parts[j / pool.slots].first + slot;
  var inst = instanceRows[row];
  inst.flags = inst.flags | 1u;
  instanceRows[row] = inst;
}
