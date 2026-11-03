// The nearest and farthest surface a view shows, along its axis (the
// shadow cascades fit their splits to it: Lauritzen, Salvi and Lefohn
// 2011, sample distribution shadow maps, the splits' part). Reverse-Z,
// infinite far: a sample's distance along the view is near / depth; depth
// 0 is the sky (left out). One sample a pixel (the first), a 64 × 64 grid
// of threads striding over the image; the result as order-preserving bits
// of positive floats.

struct RangeParams {
  near: f32,
  width: u32,
  height: u32,
  _pad: u32,
};

@group(0) @binding(0) var depth: texture_depth_multisampled_2d;
@group(0) @binding(1) var<uniform> params: RangeParams;
@group(0) @binding(2) var<storage, read_write> result: array<atomic<u32>, 2>;

var<workgroup> nearest: atomic<u32>;
var<workgroup> farthest: atomic<u32>;

@compute @workgroup_size(16, 16)
fn main(
  @builtin(global_invocation_id) id: vec3u,
  @builtin(local_invocation_index) local: u32,
  @builtin(num_workgroups) groups: vec3u,
) {
  if (local == 0u) {
    atomicStore(&nearest, 0x7f7fffffu);
    atomicStore(&farthest, 0u);
  }
  workgroupBarrier();
  let stride = groups.xy * 16u;
  var lo = 3.4e38;
  var hi = 0.0;
  for (var y = id.y; y < params.height; y += stride.y) {
    for (var x = id.x; x < params.width; x += stride.x) {
      let d = textureLoad(depth, vec2u(x, y), 0);
      if (d > 0.0) {
        let distance = params.near / d;
        lo = min(lo, distance);
        hi = max(hi, distance);
      }
    }
  }
  if (hi > 0.0) {
    atomicMin(&nearest, bitcast<u32>(lo));
    atomicMax(&farthest, bitcast<u32>(hi));
  }
  workgroupBarrier();
  if (local == 0u) {
    atomicMin(&result[0], atomicLoad(&nearest));
    atomicMax(&result[1], atomicLoad(&farthest));
  }
}
