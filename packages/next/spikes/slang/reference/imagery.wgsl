// Globe imagery compositing (GlobeImagery): writes one terrain tile's slice
// of the imagery array from source imagery tiles, then its mips.
//
// Destination texel (x, y): y = 0 is the tile's north edge. The source
// coordinates come from the CPU in float64, so deep levels stay exact in
// float32: s is linear in x (longitude maps linearly in both Web Mercator
// and geographic tiling), t is a per-row table (latitude does not).

struct Params {
  // s = col.x + col.y * (x + 0.5); col.z = slice size; col.w unused
  col: vec4f,
  // fill color (sRGB-encoded) for `fill`
  color: vec4f,
  // t per destination row, 4 per vec4 (256 rows)
  rows: array<vec4f, 64>,
};

@group(0) @binding(0) var source: texture_2d<f32>;
@group(0) @binding(1) var sourceSampler: sampler;
@group(0) @binding(2) var destination: texture_storage_2d<rgba8unorm, write>;
@group(0) @binding(3) var<uniform> params: Params;

@compute @workgroup_size(8, 8)
fn fill(@builtin(global_invocation_id) id: vec3u) {
  let size = u32(params.col.z);
  if (id.x >= size || id.y >= size) {
    return;
  }
  textureStore(destination, id.xy, params.color);
}

@compute @workgroup_size(8, 8)
fn composite(@builtin(global_invocation_id) id: vec3u) {
  let size = u32(params.col.z);
  if (id.x >= size || id.y >= size) {
    return;
  }
  let s = params.col.x + params.col.y * (f32(id.x) + 0.5);
  let t = params.rows[id.y / 4u][id.y % 4u];
  // Only the texels this source tile covers.
  if (s < 0.0 || s > 1.0 || t < 0.0 || t > 1.0) {
    return;
  }
  textureStore(destination, id.xy, textureSampleLevel(source, sourceSampler, vec2f(s, t), 0.0));
}

// One mip level from the previous: a 2×2 box filter.
@compute @workgroup_size(8, 8)
fn downsample(@builtin(global_invocation_id) id: vec3u) {
  let size = u32(params.col.z);
  if (id.x >= size || id.y >= size) {
    return;
  }
  let p = vec2i(id.xy) * 2;
  let c = textureLoad(source, p, 0) + textureLoad(source, p + vec2i(1, 0), 0) +
    textureLoad(source, p + vec2i(0, 1), 0) + textureLoad(source, p + vec2i(1, 1), 0);
  textureStore(destination, id.xy, c * 0.25);
}
