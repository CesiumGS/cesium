// The eye's local adaptation (View.ts `Exposure` "eye", scene/eye.ts): the
// eye adapts to the region it looks at, a few degrees across, not to the
// view as a whole. Adapting each pixel to a plain blur of the image's
// luminance haloes its edges (a bright street beside dark buildings glows
// where it meets them), so it adapts to its neighbors of about its own
// brightness: a bilateral grid (Chen, Paris and Durand 2007; local tone
// mapping as in Durand and Dorsey 2002). Each cell of 16 × 16 pixels sorts
// its pixels' log luminance into BINS levels around the view's adaptation
// and sums their log luminance, photopic (the cones') and scotopic (the
// rods'), and their count; the grid blurred over about 2 cells (a degree
// or two at ordinary fields of view) and a level; the present pass reads
// it at each pixel and its level (present.wgsl `eyeSees`).

struct AdaptParams {
  exposure: f32, // the image's pre-exposure
  cones: f32, // the view's adaptation, log10 cd/m² (the grid's middle)
  _pad0: f32,
  _pad1: f32,
};

@group(0) @binding(0) var image: texture_2d<f32>;
@group(0) @binding(1) var<uniform> params: AdaptParams;
@group(0) @binding(2) var grid: texture_storage_3d<rgba16float, write>;
@group(0) @binding(3) var gridIn: texture_3d<f32>;
@group(0) @binding(4) var blurred: texture_storage_3d<rgba16float, write>;

const CELL = 16u;
const BINS = 16u;
// The levels' span, log2 cd/m² either side of the view's adaptation;
// present.wgsl `ADAPT_RANGE` the same.
const RANGE = 12.0;

fn level(logY: f32) -> u32 {
  let center = params.cones / 0.30103;
  let t = (logY - (center - RANGE)) / (2.0 * RANGE);
  return u32(clamp(t * f32(BINS), 0.0, f32(BINS) - 1.0));
}

// A cell's levels: an 8 × 8 grid of its pixels.
@compute @workgroup_size(8, 8)
fn reduce(@builtin(global_invocation_id) id: vec3u) {
  let size = textureDimensions(grid);
  if (id.x >= size.x || id.y >= size.y) {
    return;
  }
  let imageSize = textureDimensions(image);
  var sums: array<vec3f, BINS>;
  for (var j = 0u; j < 8u; j++) {
    for (var i = 0u; i < 8u; i++) {
      let p = min(id.xy * CELL + vec2u(i, j) * 2u + 1u, imageSize - 1u);
      let light = max(textureLoad(image, p, 0).rgb, vec3f(0.0)) / params.exposure;
      let x = dot(light, vec3f(0.4124, 0.3576, 0.1805));
      let y = dot(light, vec3f(0.2126, 0.7152, 0.0722));
      let z = dot(light, vec3f(0.0193, 0.1192, 0.9505));
      let v = max(y * (1.33 * (1.0 + (y + z) / max(x, 1e-12)) - 1.68), 0.0);
      let logs = log2(max(vec2f(y, v), vec2f(1e-7)));
      let b = level(logs.x);
      sums[b] += vec3f(logs, 1.0) / 64.0;
    }
  }
  for (var b = 0u; b < BINS; b++) {
    textureStore(grid, vec3u(id.xy, b), vec4f(sums[b], 1.0));
  }
}

// The grid blurred: a Gaussian over 7 × 7 cells (σ 2) and 3 levels.
@compute @workgroup_size(8, 8, 1)
fn blur(@builtin(global_invocation_id) id: vec3u) {
  let size = textureDimensions(blurred);
  if (any(id >= size)) {
    return;
  }
  var sum = vec3f(0.0);
  for (var dz = -1; dz <= 1; dz++) {
    let z = i32(id.z) + dz;
    if (z < 0 || z >= i32(size.z)) {
      continue;
    }
    let wz = select(0.5, 1.0, dz == 0);
    for (var dy = -3; dy <= 3; dy++) {
      for (var dx = -3; dx <= 3; dx++) {
        let p = vec2i(id.xy) + vec2i(dx, dy);
        if (any(p < vec2i(0)) || any(p >= vec2i(size.xy))) {
          continue;
        }
        let w = wz * exp(-f32(dx * dx + dy * dy) / 8.0);
        sum += textureLoad(gridIn, vec3u(vec2u(p), u32(z)), 0).xyz * w;
      }
    }
  }
  textureStore(blurred, id, vec4f(sum, 1.0));
}
