// Point sets (World.addPointMesh) in a view's cull pass (World.encodeCull):
// each point draw's points in or near the view, listed for its quads
// (opaque.wgsl `vsPoints`: six vertices a listed point), and, for draws
// whose symbols may be tiny (a vector style's layer, vector/PointCuller.ts),
// the points smaller than `tiny` pixels rasterized here instead: their
// depth by `atomicMax` per pixel (`cullPoints`), then their color and
// feature where their depth won (`splatPoints`), resolved into the opaque
// pass by splat.wgsl. Ten million points a few pixels each cost a few
// compute threads each, not six vertices.
//
// common.wgsl and cull.wgsl (group 0 the view, group 1 the world's cull
// tables, `relativeMatrix`) precede; the style follows: `styleShow`,
// `styleSize` (pixels), `styleColor` (sRGB with alpha), `styleShapeAt`
// (a signed distance in the symbol's −1…1 box, y down) and `styleOffset`
// (pixels, y down), by point and its distance from the camera.

struct PointCull {
  anchors: u32,    // arena word of point 0's anchor (four floats a point)
  list: u32,       // arena word of the draw's list (a point index each)
  capacity: u32,
  record: u32,     // the draw's record: its transform places the points
  counter: u32,    // the draw's slot in `pointCounts`
  batch: u32,      // the draw's batch: its indirect arguments
  splat: u32,      // 1: symbols up to `tiny` pixels are splatted
  margin: f32,     // pixels past the edges a point's symbol may reach
  tiny: f32,
  streams: u32,    // arena word of point 0's properties (styles read them)
  stride: u32,
  _pad: u32,
};

@group(2) @binding(0) var<uniform> pointCull: PointCull;
// The world's vertex arena, as words (lists hold integers).
@group(2) @binding(1) var<storage, read_write> arena: array<u32>;
@group(2) @binding(2) var<storage, read_write> pointCounts: array<atomic<u32>>;
// A view's splats, a word per pixel: reverse-Z depth bits (0: none), then
// color (sRGB, packed) and global feature ID.
@group(2) @binding(3) var<storage, read_write> splatDepth: array<atomic<u32>>;
@group(2) @binding(4) var<storage, read_write> splatColor: array<u32>;
@group(2) @binding(5) var<storage, read_write> splatFeature: array<u32>;

fn pointF32(i: u32, word: u32) -> f32 {
  return bitcast<f32>(arena[pointCull.streams + i * pointCull.stride + word]);
}
fn pointU32(i: u32, word: u32) -> u32 {
  return arena[pointCull.streams + i * pointCull.stride + word];
}
fn styleTime() -> f32 {
  return view.time.x;
}

/** Point `i` camera-relative (w 1), or w 0 where it isn't drawn or in view. */
fn placePoint(i: u32) -> vec4f {
  if (i >= pointCull.capacity) {
    return vec4f(0.0);
  }
  let a = pointCull.anchors + i * 4u;
  let x = bitcast<f32>(arena[a]);
  // Not drawn (PointSource's HIDDEN, or never placed).
  if (!(abs(x) < 1e37)) {
    return vec4f(0.0);
  }
  let r = records[pointCull.record];
  let t = transforms[r.transform];
  let c = (relativeMatrix(t) * vec4f(x, bitcast<f32>(arena[a + 1u]), bitcast<f32>(arena[a + 2u]), 1.0)).xyz;
  // `margin` pixels at the point's distance, as meters (a 90° field of
  // view's, wider than any view's: points are kept, never lost).
  let slack = length(c) * pointCull.margin * 2.0 * view.viewport.w;
  for (var p = 0u; p < 5u; p++) {
    let plane = view.planes[p];
    if (dot(plane.xyz, c) + plane.w < -slack) {
      return vec4f(0.0);
    }
  }
  return vec4f(c, 1.0);
}

/**
 * A splatted point's symbol's pixel center (x right, y down; its anchor's,
 * moved by the style's offset) and its anchor's reverse-Z depth.
 */
fn onScreen(i: u32, distance: f32, rel: vec3f) -> vec4f {
  let clip = view.viewProj * vec4f(rel, 1.0);
  if (clip.w <= 0.0) {
    return vec4f(0.0);
  }
  let ndc = clip.xyz / clip.w;
  if (ndc.z <= 0.0 || ndc.z > 1.0) {
    return vec4f(0.0);
  }
  let offset = styleOffset(i, distance);
  return vec4f(
    (ndc.x * 0.5 + 0.5) * view.viewport.x + offset.x,
    (0.5 - ndc.y * 0.5) * view.viewport.y + offset.y,
    ndc.z,
    1.0,
  );
}

/** Whether a tiny symbol is drawn (shown, small enough, opaque enough). */
fn splatted(i: u32, distance: f32) -> bool {
  return pointCull.splat != 0u &&
    styleSize(i, distance) <= pointCull.tiny &&
    styleColor(i, distance).a >= 0.5;
}

// The footprint: the pixels the symbol's shape covers at all (antialiased:
// a pixel's coverage from its center's signed distance in pixels), and
// always the one under its center (a symbol never vanishes).
const MAX_FOOTPRINT = 9;

/** A pixel's coverage by a splatted symbol (`p` in its −1…1 box). */
fn splatCoverage(i: u32, distance: f32, p: vec2f, half: f32, center: bool) -> f32 {
  let c = clamp(0.5 - styleShapeAt(i, distance, p) * half, 0.0, 1.0);
  return select(c, max(c, 0.5), center);
}

var<workgroup> pointsKept: atomic<u32>;
var<workgroup> pointsBase: u32;

@compute @workgroup_size(64)
fn cullPoints(
  @builtin(global_invocation_id) gid: vec3u,
  @builtin(local_invocation_index) lane: u32,
  @builtin(num_workgroups) groups: vec3u,
) {
  if (lane == 0u) {
    atomicStore(&pointsKept, 0u);
  }
  workgroupBarrier();
  let i = gid.x + gid.y * groups.x * 64u;
  var quad = false;
  let placed = placePoint(i);
  if (placed.w > 0.0) {
    let distance = length(placed.xyz);
    if (styleShow(i, distance)) {
      if (splatted(i, distance)) {
        // Its depth on each pixel it covers (the nearest wins).
        let s = onScreen(i, distance, placed.xyz);
        if (s.w > 0.0) {
          let size = max(styleSize(i, distance), 1.0);
          let half = size * 0.5;
          let bits = bitcast<u32>(s.z);
          let w = i32(view.viewport.x);
          let h = i32(view.viewport.y);
          let x0 = i32(floor(s.x - half - 0.5));
          let y0 = i32(floor(s.y - half - 0.5));
          let center = vec2i(floor(s.xy));
          for (var dy = 0; dy < MAX_FOOTPRINT; dy++) {
            for (var dx = 0; dx < MAX_FOOTPRINT; dx++) {
              let px = vec2i(x0 + dx, y0 + dy);
              if (f32(dx) > size + 2.0 || f32(dy) > size + 2.0 || any(px < vec2i(0)) || px.x >= w || px.y >= h) {
                continue;
              }
              let p = (vec2f(px) + 0.5 - s.xy) / half;
              if (splatCoverage(i, distance, p, half, all(px == center)) > 0.0) {
                atomicMax(&splatDepth[u32(px.y * w + px.x)], bits);
              }
            }
          }
        }
      } else {
        quad = true;
      }
    }
  }
  // Its place in the list: counted per workgroup, then one global add per
  // workgroup (ten million adds to one counter serialized: seconds).
  var local = 0u;
  if (quad) {
    local = atomicAdd(&pointsKept, 1u);
  }
  workgroupBarrier();
  if (lane == 0u) {
    pointsBase = atomicAdd(&pointCounts[pointCull.counter], atomicLoad(&pointsKept));
  }
  workgroupBarrier();
  if (quad) {
    arena[pointCull.list + pointsBase + local] = i;
  }
}

/** The splats' color and feature, where their depth won (after `cullPoints`). */
@compute @workgroup_size(64)
fn splatPoints(
  @builtin(global_invocation_id) gid: vec3u,
  @builtin(num_workgroups) groups: vec3u,
) {
  let i = gid.x + gid.y * groups.x * 64u;
  let placed = placePoint(i);
  if (placed.w == 0.0) {
    return;
  }
  let distance = length(placed.xyz);
  if (!styleShow(i, distance) || !splatted(i, distance)) {
    return;
  }
  let s = onScreen(i, distance, placed.xyz);
  if (s.w == 0.0) {
    return;
  }
  let size = max(styleSize(i, distance), 1.0);
  let half = size * 0.5;
  let bits = bitcast<u32>(s.z);
  let color = styleColor(i, distance);
  let feature = records[pointCull.record].featureId + i;
  let w = i32(view.viewport.x);
  let h = i32(view.viewport.y);
  let x0 = i32(floor(s.x - half - 0.5));
  let y0 = i32(floor(s.y - half - 0.5));
  let center = vec2i(floor(s.xy));
  for (var dy = 0; dy < MAX_FOOTPRINT; dy++) {
    for (var dx = 0; dx < MAX_FOOTPRINT; dx++) {
      let px = vec2i(x0 + dx, y0 + dy);
      if (f32(dx) > size + 2.0 || f32(dy) > size + 2.0 || any(px < vec2i(0)) || px.x >= w || px.y >= h) {
        continue;
      }
      let p = (vec2f(px) + 0.5 - s.xy) / half;
      let at = u32(px.y * w + px.x);
      let coverage = splatCoverage(i, distance, p, half, all(px == center));
      if (coverage > 0.0 && atomicLoad(&splatDepth[at]) == bits) {
        // Its coverage of the pixel as alpha: the resolve blends by it.
        splatColor[at] = pack4x8unorm(vec4f(color.rgb, coverage));
        splatFeature[at] = feature;
      }
    }
  }
}

/** The draw's indirect arguments: six vertices per listed point. */
@compute @workgroup_size(1)
fn writePointArgs() {
  let a = pointCull.batch * 5u;
  // `writeDrawArgs` counted the record's item: 1 where it passed this
  // view's cull (and its view mask), else 0.
  let shown = atomicLoad(&args[a + 1u]) > 0u;
  atomicStore(&args[a], select(0u, atomicLoad(&pointCounts[pointCull.counter]) * 6u, shown));
  atomicStore(&args[a + 1u], select(0u, 1u, shown));
  atomicStore(&args[a + 2u], 0u);
  atomicStore(&args[a + 3u], 0u);
}
