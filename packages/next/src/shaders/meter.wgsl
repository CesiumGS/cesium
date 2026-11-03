// Exposure meter for automatic exposure and the eye (plan §4.2): the
// average log2 luminance of a view's HDR image, in the scene's units (the
// image is pre-exposed; `exposure` is divided out), photopic (the cones')
// and scotopic (the rods': Larson, Rushmeier and Piatko 1997's estimate
// from XYZ), over the brighter part of it: a histogram of a 64 × 64 grid
// over the image, averaged between its 65th and 98th percentiles (as
// Unreal's eye adaptation does). The plain mean let what is dark weigh in:
// the night half of the Earth from orbit opened the exposure 10 stops and
// burned out the day half; the brightest 2% (the sun's glare, the Moon,
// lamps) is left out too. Center-weighted, as the eye adapts mostly to
// where it looks and cameras meter: the middle of the view counts up to
// four times its edges. Pixels the scene didn't cover (alpha 0: the
// background) are left out.

struct MeterParams {
  exposure: f32,
  width: u32,
  height: u32,
  _pad: u32,
};

@group(0) @binding(0) var image: texture_2d<f32>;
@group(0) @binding(1) var<uniform> params: MeterParams;
// x, y: photopic sum of log2 luminance and weight (in the band); z, w: the
// same, scotopic.
@group(0) @binding(2) var<storage, read_write> result: vec4f;

const GRID = 64u;
// log2 luminance from −24 to +24 (cd/m²), a third of a stop per bin.
const BINS = 144u;
const LOW = -24.0;
const BIN_STOPS = 48.0 / 144.0;
const BAND = vec2f(0.65, 0.98);

var<workgroup> photopic: array<atomic<u32>, BINS>;
var<workgroup> scotopic: array<atomic<u32>, BINS>;

fn binOf(luminance: f32) -> u32 {
  let stops = log2(max(luminance, 1e-7));
  return u32(clamp((stops - LOW) / BIN_STOPS, 0.0, f32(BINS - 1u)));
}

fn binCount(b: u32, rods: bool) -> u32 {
  if (rods) {
    return atomicLoad(&scotopic[b]);
  }
  return atomicLoad(&photopic[b]);
}

// The band's sum of log2 luminance and its weight (thread 0's walk), each
// bin's share of the band at its center.
fn bandSum(rods: bool) -> vec2f {
  var total = 0u;
  for (var b = 0u; b < BINS; b++) {
    total += binCount(b, rods);
  }
  let start = f32(total) * BAND.x;
  let end = f32(total) * BAND.y;
  var below = 0.0;
  var sum = vec2f(0.0);
  for (var b = 0u; b < BINS; b++) {
    let count = f32(binCount(b, rods));
    let inBand = max(min(below + count, end) - max(below, start), 0.0);
    sum += vec2f((LOW + (f32(b) + 0.5) * BIN_STOPS) * inBand, inBand);
    below += count;
  }
  return sum;
}

@compute @workgroup_size(16, 16)
fn main(@builtin(local_invocation_index) index: u32, @builtin(local_invocation_id) local: vec3u) {
  for (var b = index; b < BINS; b += 256u) {
    atomicStore(&photopic[b], 0u);
    atomicStore(&scotopic[b], 0u);
  }
  workgroupBarrier();
  for (var gy = local.y; gy < GRID; gy += 16u) {
    for (var gx = local.x; gx < GRID; gx += 16u) {
      let unit = (vec2f(f32(gx), f32(gy)) + 0.5) / f32(GRID);
      let pixel = vec2u(
        min(u32(unit.x * f32(params.width)), params.width - 1u),
        min(u32(unit.y * f32(params.height)), params.height - 1u),
      );
      let color = textureLoad(image, pixel, 0);
      if (color.a > 0.0) {
        let light = max(color.rgb, vec3f(0.0)) / params.exposure;
        let x = dot(light, vec3f(0.4124, 0.3576, 0.1805));
        let y = dot(light, vec3f(0.2126, 0.7152, 0.0722));
        let z = dot(light, vec3f(0.0193, 0.1192, 0.9505));
        let v = max(y * (1.33 * (1.0 + (y + z) / max(x, 1e-12)) - 1.68), 0.0);
        let d = unit * 2.0 - 1.0;
        let weight = 1u + u32(3.0 * exp(-dot(d, d) / (2.0 * 0.35 * 0.35)) + 0.5);
        atomicAdd(&photopic[binOf(y)], weight);
        atomicAdd(&scotopic[binOf(v)], weight);
      }
    }
  }
  workgroupBarrier();
  if (index == 0u) {
    result = vec4f(bandSum(false), bandSum(true));
  }
}
