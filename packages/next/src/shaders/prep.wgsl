// Per-view draw preparation: camera-relative transforms, culling and
// indirect-args writing for every draw record. Runs once per view, right
// before that view's render pass replays the shared render bundle.

struct PrepParams {
  count: u32,
  writeFirstInstance: u32, // 0 when `indirect-first-instance` is unavailable
  _pad0: u32,
  _pad1: u32,
};

@group(0) @binding(0) var<uniform> view: View;
@group(1) @binding(0) var<storage, read> records: array<DrawRecord>;
@group(1) @binding(1) var<storage, read_write> instances: array<DrawInstance>;
@group(1) @binding(2) var<storage, read_write> args: array<u32>;
@group(1) @binding(3) var<uniform> params: PrepParams;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let i = gid.x;
  if (i >= params.count) {
    return;
  }
  let r = records[i];

  // The only place large world coordinates meet the camera. The hi and lo
  // differences each cancel exactly before they are combined, so the result
  // keeps float32 precision relative to the (small) camera distance.
  let rel = (r.originHi - view.cameraHi) + (r.originLo - view.cameraLo);

  var visible = (r.flags & 1u) == 0u && r.indexCount > 0u;
  for (var p = 0u; p < 5u; p++) {
    let plane = view.planes[p];
    if (dot(plane.xyz, rel) + plane.w < -r.radius) {
      visible = false;
    }
  }

  var m = r.model;
  m[3] = vec4f(m[3].xyz + rel, 1.0);
  instances[i].relModel = m;

  let a = i * 5u;
  args[a] = r.indexCount;
  args[a + 1u] = select(0u, 1u, visible);
  args[a + 2u] = r.firstIndex;
  args[a + 3u] = bitcast<u32>(r.baseVertex);
  args[a + 4u] = select(0u, i, params.writeFirstInstance == 1u);
}
