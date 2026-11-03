// Exposure meter for automatic exposure and the eye (plan §4.2): the
// average log2 luminance of a view's HDR image, in the scene's units (the
// image is pre-exposed; `exposure` is divided out), over the brighter half
// of it: a histogram of a 64 × 64 grid over the image, averaged between its
// 50th and 95th percentiles (as Unreal's eye adaptation does). The plain
// mean let what is dark weigh in: the night half of the Earth from orbit
// opened the exposure 10 stops and burned out the day half. The brightest
// 5% (the sun's glare, the Moon, lamps) is left out too. Pixels the scene
// didn't cover (alpha 0: the background) are left out.

struct MeterParams {
  exposure: f32,
  width: u32,
  height: u32,
  _pad: u32,
};

@group(0) @binding(0) var image: texture_2d<f32>;
@group(0) @binding(1) var<uniform> params: MeterParams;
// x: sum of log2 luminance, y: pixels counted (in the band).
@group(0) @binding(2) var<storage, read_write> result: vec2f;

const GRID = 64u;
// log2 luminance from −24 to +24 (cd/m²), a third of a stop per bin.
const BINS = 144u;
const LOW = -24.0;
const BIN_STOPS = 48.0 / 144.0;
const BAND = vec2f(0.65, 0.98);

var<workgroup> histogram: array<atomic<u32>, BINS>;

@compute @workgroup_size(16, 16)
fn main(@builtin(local_invocation_index) index: u32, @builtin(local_invocation_id) local: vec3u) {
  for (var b = index; b < BINS; b += 256u) {
    atomicStore(&histogram[b], 0u);
  }
  workgroupBarrier();
  for (var gy = local.y; gy < GRID; gy += 16u) {
    for (var gx = local.x; gx < GRID; gx += 16u) {
      let pixel = vec2u(
        min(u32((f32(gx) + 0.5) / f32(GRID) * f32(params.width)), params.width - 1u),
        min(u32((f32(gy) + 0.5) / f32(GRID) * f32(params.height)), params.height - 1u),
      );
      let color = textureLoad(image, pixel, 0);
      if (color.a > 0.0) {
        let luminance = dot(color.rgb, vec3f(0.2126, 0.7152, 0.0722)) / params.exposure;
        let stops = log2(max(luminance, 1e-7));
        let bin = u32(clamp((stops - LOW) / BIN_STOPS, 0.0, f32(BINS - 1u)));
        atomicAdd(&histogram[bin], 1u);
      }
    }
  }
  workgroupBarrier();
  if (index == 0u) {
    var total = 0u;
    for (var b = 0u; b < BINS; b++) {
      total += atomicLoad(&histogram[b]);
    }
    // Each bin's share of the band, at its center.
    let start = f32(total) * BAND.x;
    let end = f32(total) * BAND.y;
    var below = 0.0;
    var sum = vec2f(0.0);
    for (var b = 0u; b < BINS; b++) {
      let count = f32(atomicLoad(&histogram[b]));
      let inBand = max(min(below + count, end) - max(below, start), 0.0);
      sum += vec2f((LOW + (f32(b) + 0.5) * BIN_STOPS) * inBand, inBand);
      below += count;
    }
    result = sum;
  }
}
