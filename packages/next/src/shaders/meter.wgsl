// Exposure meter for automatic exposure (plan §4.2): the average log2
// luminance of a view's HDR image, in the scene's units (the image is
// pre-exposed; `exposure` is divided out). One workgroup samples a 64 × 64
// grid over the image; pixels the scene didn't cover (alpha 0: the
// background) are left out.

struct MeterParams {
  exposure: f32,
  width: u32,
  height: u32,
  _pad: u32,
};

@group(0) @binding(0) var image: texture_2d<f32>;
@group(0) @binding(1) var<uniform> params: MeterParams;
// x: sum of log2 luminance, y: pixels counted.
@group(0) @binding(2) var<storage, read_write> result: vec2f;

const GRID = 64u;
var<workgroup> sums: array<vec2f, 256>;

@compute @workgroup_size(16, 16)
fn main(@builtin(local_invocation_index) index: u32, @builtin(local_invocation_id) local: vec3u) {
  var sum = vec2f(0.0);
  for (var gy = local.y; gy < GRID; gy += 16u) {
    for (var gx = local.x; gx < GRID; gx += 16u) {
      let pixel = vec2u(
        min(u32((f32(gx) + 0.5) / f32(GRID) * f32(params.width)), params.width - 1u),
        min(u32((f32(gy) + 0.5) / f32(GRID) * f32(params.height)), params.height - 1u),
      );
      let color = textureLoad(image, pixel, 0);
      if (color.a > 0.0) {
        let luminance = dot(color.rgb, vec3f(0.2126, 0.7152, 0.0722)) / params.exposure;
        sum += vec2f(log2(max(luminance, 1e-4)), 1.0);
      }
    }
  }
  sums[index] = sum;
  workgroupBarrier();
  for (var stride = 128u; stride > 0u; stride >>= 1u) {
    if (index < stride) {
      sums[index] += sums[index + stride];
    }
    workgroupBarrier();
  }
  if (index == 0u) {
    result = sums[0];
  }
}
