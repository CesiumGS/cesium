// Clustered forward shading (Olsson, Billeter and Assarsson 2012): each
// froxel of the view (scene/lights.ts `CLUSTERS`) lists the lights whose
// reach (a sphere) meets its box in view space, the CLUSTER_LIGHTS
// brightest there (candela over the squared distance to the box) when more
// do; the opaque pass shades a pixel's froxel's lights.

@group(0) @binding(0) var<storage, read> lightTable: LightTable;
@group(0) @binding(1) var<storage, read_write> clusters: array<u32>;

// A workgroup per tile of the screen, a thread per slice in depth: the
// tile's column culls the view's lights into `tileLights` together, then
// each slice sorts its own from those.
const SLICES: u32 = 32u; // scene/lights.ts CLUSTERS[2]
const TILE_LIGHTS: u32 = 1024u; // scene/lights.ts MAX_VIEW_LIGHTS
var<workgroup> tileLights: array<u32, TILE_LIGHTS>;
var<workgroup> tileCount: atomic<u32>;

@compute @workgroup_size(SLICES)
fn assign(
  @builtin(workgroup_id) tile: vec3u,
  @builtin(local_invocation_index) k: u32,
) {
  let h = lightTable.header;
  let dims = vec3u(h.grid.xyz);
  let i = tile.x;
  let j = tile.y; // from the top
  // The tile's side planes, by their slopes: x/z in [sx.x, sx.y], y/z in
  // [sy.x, sy.y]; their outward normals, unit.
  let sx = (vec2f(f32(i), f32(i + 1u)) / f32(dims.x) * 2.0 - 1.0) * h.depth.z;
  let sy = (1.0 - vec2f(f32(j + 1u), f32(j)) / f32(dims.y) * 2.0) * h.depth.w;
  let left = vec3f(-1.0, 0.0, sx.x) * inverseSqrt(1.0 + sx.x * sx.x);
  let right = vec3f(1.0, 0.0, -sx.y) * inverseSqrt(1.0 + sx.y * sx.y);
  let bottom = vec3f(0.0, -1.0, sy.x) * inverseSqrt(1.0 + sy.x * sy.x);
  let top = vec3f(0.0, 1.0, -sy.y) * inverseSqrt(1.0 + sy.y * sy.y);
  if (k == 0u) {
    atomicStore(&tileCount, 0u);
  }
  workgroupBarrier();
  let total = u32(h.grid.w);
  for (var l = k; l < total; l += SLICES) {
    let light = lightTable.lights[l];
    let c = light.position.xyz;
    let v = vec3f(dot(c, h.right.xyz), dot(c, h.up.xyz), dot(c, h.forward.xyz));
    let r = light.position.w;
    if (dot(left, v) <= r && dot(right, v) <= r && dot(bottom, v) <= r && dot(top, v) <= r) {
      let at = atomicAdd(&tileCount, 1u);
      if (at < TILE_LIGHTS) {
        tileLights[at] = l;
      }
    }
  }
  workgroupBarrier();
  let listed = min(atomicLoad(&tileCount), TILE_LIGHTS);

  let z0 = h.depth.x * exp(f32(k) / h.depth.y);
  let z1 = h.depth.x * exp(f32(k + 1u) / h.depth.y);
  let lo = vec3f(min(sx.x * z0, sx.x * z1), min(sy.x * z0, sy.x * z1), z0);
  let hi = vec3f(max(sx.y * z0, sx.y * z1), max(sy.y * z0, sy.y * z1), z1);
  let base = ((k * dims.y + j) * dims.x + i) * (1u + CLUSTER_LIGHTS);
  // Kept brightest first (insertion: the dimmest drops off the end).
  var kept: array<u32, CLUSTER_LIGHTS>;
  var score: array<f32, CLUSTER_LIGHTS>;
  var count = 0u;
  for (var t = 0u; t < listed; t++) {
    let l = tileLights[t];
    let light = lightTable.lights[l];
    let c = light.position.xyz;
    let v = vec3f(dot(c, h.right.xyz), dot(c, h.up.xyz), dot(c, h.forward.xyz));
    let d = v - clamp(v, lo, hi);
    let d2 = dot(d, d);
    if (d2 > light.position.w * light.position.w) {
      continue;
    }
    let s = max(light.color.r, max(light.color.g, light.color.b)) / max(d2, 1.0);
    if (count == CLUSTER_LIGHTS && s <= score[CLUSTER_LIGHTS - 1u]) {
      continue;
    }
    var at = min(count, CLUSTER_LIGHTS - 1u);
    while (at > 0u && score[at - 1u] < s) {
      kept[at] = kept[at - 1u];
      score[at] = score[at - 1u];
      at--;
    }
    kept[at] = l;
    score[at] = s;
    count = min(count + 1u, CLUSTER_LIGHTS);
  }
  for (var t = 0u; t < count; t++) {
    clusters[base + 1u + t] = kept[t];
  }
  clusters[base] = count;
}
