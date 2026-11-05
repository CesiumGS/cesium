// Reads the feature ID and depth under a pixel. Integer targets cannot be MSAA-resolved,
// so this loads sample 0 of the multisampled ID target directly. The ID is
// stored as (lo16, hi16) because r32uint does not support multisampling.

struct PickParams {
  pixel: vec2u,
  _pad: vec2u,
};

@group(0) @binding(0) var ids: texture_multisampled_2d<u32>;
@group(0) @binding(1) var<uniform> params: PickParams;
@group(0) @binding(2) var<storage, read_write> result: array<u32>;
@group(0) @binding(3) var depth: texture_depth_multisampled_2d;

@compute @workgroup_size(1)
fn main() {
  let id = textureLoad(ids, vec2i(params.pixel), 0).rg;
  result[0] = id.x | (id.y << 16u);
  // Reverse-Z depth (0: nothing drawn), for picked positions.
  result[1] = bitcast<u32>(textureLoad(depth, vec2i(params.pixel), 0));
}
