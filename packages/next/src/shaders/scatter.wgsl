// Scatter upload: `src` holds `count` entry indices followed by their data,
// `words` u32s per entry; one thread per word copies it to its entry in
// `dst` (records, transforms or instances). Changes spread across a table
// upload as packed pairs instead of the whole span between them.

struct ScatterParams {
  count: u32,
  words: u32,
  _pad0: u32,
  _pad1: u32,
};

@group(0) @binding(0) var<uniform> params: ScatterParams;
@group(0) @binding(1) var<storage, read> src: array<u32>;
@group(0) @binding(2) var<storage, read_write> dst: array<u32>;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let k = gid.x;
  if (k >= params.count * params.words) {
    return;
  }
  let entry = k / params.words;
  let word = k - entry * params.words;
  dst[src[entry] * params.words + word] = src[params.count + k];
}
