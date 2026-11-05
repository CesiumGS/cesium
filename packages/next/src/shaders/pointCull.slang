// Point sets (World.addPointMesh) in a view's cull pass (World.encodeCull):
// each point draw's points in or near the view, listed for its quads
// (opaque `vsPoints`: six vertices a listed point), and, for draws whose
// symbols may be tiny (a vector style's layer, vector/PointCuller.ts), the
// points smaller than `tiny` pixels rasterized here instead: their depth by
// atomic max per pixel (`cullPoints`), then their color and feature where
// their depth won (`splatPoints`), resolved into the opaque pass by
// splat.slang. Ten million points a few pixels each cost a few compute
// threads each, not six vertices.
//
// The style is WGSL composed at run time (vector/VectorStyle.ts, or
// RenderContext's defaults), appended to this module's WGSL. That is the
// runtime boundary (CESIUM2_WEBGPU_PLAN.md §3.4), declared here, not found
// by rewriting output: the style defines `styleShow`, `styleSize`
// (pixels), `styleColor` (sRGB with alpha), `styleShapeAt` (a signed
// distance in the symbol's −1…1 box, y down) and `styleOffset` (pixels, y
// down), by point and its distance from the camera, called by their names
// (`__target_intrinsic`); and it reads points through `pointF32`,
// `pointU32` and `styleTime`, exported under their names (`__extern_cpp`).

import common;
import cullTables;

struct PointCull {
  uint anchors;    // arena word of point 0's anchor (four floats a point)
  uint list;       // arena word of the draw's list (a point index each)
  uint capacity;
  uint record;     // the draw's record: its transform places the points
  uint counter;    // the draw's slot in `pointCounts`
  uint batch;      // the draw's batch: its indirect arguments
  uint splat;      // 1: symbols up to `tiny` pixels are splatted
  float margin;    // pixels past the edges a point's symbol may reach
  float tiny;
  uint streams;    // arena word of point 0's properties (styles read them)
  uint stride;
  uint pad;
};

[[vk::binding(0, 2)]] ConstantBuffer<PointCull> pointCull;
// The world's vertex arena, as words (lists hold integers).
[[vk::binding(1, 2)]] RWStructuredBuffer<uint> arena;
[[vk::binding(2, 2)]] RWStructuredBuffer<Atomic<uint>> pointCounts;
// A view's splats, a word per pixel: reverse-Z depth bits (0: none), then
// color (sRGB, packed) and global feature ID.
[[vk::binding(3, 2)]] RWStructuredBuffer<Atomic<uint>> splatDepth;
[[vk::binding(4, 2)]] RWStructuredBuffer<uint> splatColor;
[[vk::binding(5, 2)]] RWStructuredBuffer<uint> splatFeature;

// --- the boundary: what the style reads, by name ------------------------------

export __extern_cpp float pointF32(uint i, uint word) {
  return asfloat(arena[pointCull.streams + i * pointCull.stride + word]);
}
export __extern_cpp uint pointU32(uint i, uint word) {
  return arena[pointCull.streams + i * pointCull.stride + word];
}
export __extern_cpp float styleTime() {
  return view.time.x;
}

// --- the boundary: what the style defines, called by name ---------------------

__target_intrinsic(wgsl, "styleShow($0, $1)")
bool styleShow(uint i, float distance);
__target_intrinsic(wgsl, "styleSize($0, $1)")
float styleSize(uint i, float distance);
__target_intrinsic(wgsl, "styleColor($0, $1)")
float4 styleColor(uint i, float distance);
__target_intrinsic(wgsl, "styleShapeAt($0, $1, $2)")
float styleShapeAt(uint i, float distance, float2 p);
__target_intrinsic(wgsl, "styleOffset($0, $1)")
float2 styleOffset(uint i, float distance);

/** Point `i` camera-relative (w 1), or w 0 where it isn't drawn or in view. */
float4 placePoint(uint i) {
  if (i >= pointCull.capacity) {
    return float4(0.0);
  }
  uint a = pointCull.anchors + i * 4u;
  float x = asfloat(arena[a]);
  // Not drawn (PointSource's HIDDEN, or never placed).
  if (!(abs(x) < 1e37)) {
    return float4(0.0);
  }
  DrawRecord r = records[pointCull.record];
  Transform t = transforms[r.transform];
  float3 c = mul(relativeMatrix(t),
                 float4(x, asfloat(arena[a + 1u]), asfloat(arena[a + 2u]), 1.0))
                 .xyz;
  // `margin` pixels at the point's distance, as meters (a 90° field of
  // view's, wider than any view's: points are kept, never lost).
  float slack = length(c) * pointCull.margin * 2.0 * view.viewport.w;
  for (uint p = 0u; p < 5u; p++) {
    float4 plane = view.planes[p];
    if (dot(plane.xyz, c) + plane.w < -slack) {
      return float4(0.0);
    }
  }
  return float4(c, 1.0);
}

/**
 * A splatted point's symbol's pixel center (x right, y down; its anchor's,
 * moved by the style's offset) and its anchor's reverse-Z depth.
 */
float4 onScreen(uint i, float distance, float3 rel) {
  float4 clip = mul(view.viewProj, float4(rel, 1.0));
  if (clip.w <= 0.0) {
    return float4(0.0);
  }
  float3 ndc = clip.xyz / clip.w;
  if (ndc.z <= 0.0 || ndc.z > 1.0) {
    return float4(0.0);
  }
  float2 offset = styleOffset(i, distance);
  return float4(
      (ndc.x * 0.5 + 0.5) * view.viewport.x + offset.x,
      (0.5 - ndc.y * 0.5) * view.viewport.y + offset.y,
      ndc.z,
      1.0);
}

/** Whether a tiny symbol is drawn (shown, small enough, opaque enough). */
bool splatted(uint i, float distance) {
  return pointCull.splat != 0u && styleSize(i, distance) <= pointCull.tiny &&
         styleColor(i, distance).a >= 0.5;
}

// The footprint: the pixels the symbol's shape covers at all (antialiased:
// a pixel's coverage from its center's signed distance in pixels), and
// always the one under its center (a symbol never vanishes).
static const int MAX_FOOTPRINT = 9;

/** A pixel's coverage by a splatted symbol (`p` in its −1…1 box). */
float splatCoverage(uint i, float distance, float2 p, float half, bool center) {
  float c = clamp(0.5 - styleShapeAt(i, distance, p) * half, 0.0, 1.0);
  return center ? max(c, 0.5) : c;
}

groupshared Atomic<uint> pointsKept;
groupshared uint pointsBase;

[shader("compute")]
[numthreads(64, 1, 1)]
void cullPoints(uint3 gid : SV_DispatchThreadID, uint lane : SV_GroupIndex) {
  if (lane == 0u) {
    pointsKept.store(0u);
  }
  GroupMemoryBarrierWithGroupSync();
  uint i = gid.x + gid.y * WorkgroupCount().x * 64u;
  bool quad = false;
  float4 placed = placePoint(i);
  if (placed.w > 0.0) {
    float distance = length(placed.xyz);
    if (styleShow(i, distance)) {
      if (splatted(i, distance)) {
        // Its depth on each pixel it covers (the nearest wins).
        float4 s = onScreen(i, distance, placed.xyz);
        if (s.w > 0.0) {
          float size = max(styleSize(i, distance), 1.0);
          float half = size * 0.5;
          uint bits = asuint(s.z);
          int w = int(view.viewport.x);
          int h = int(view.viewport.y);
          int x0 = int(floor(s.x - half - 0.5));
          int y0 = int(floor(s.y - half - 0.5));
          int2 center = int2(floor(s.xy));
          for (int dy = 0; dy < MAX_FOOTPRINT; dy++) {
            for (int dx = 0; dx < MAX_FOOTPRINT; dx++) {
              int2 px = int2(x0 + dx, y0 + dy);
              if (float(dx) > size + 2.0 || float(dy) > size + 2.0 ||
                  any(px < int2(0)) || px.x >= w || px.y >= h) {
                continue;
              }
              float2 p = (float2(px) + 0.5 - s.xy) / half;
              if (splatCoverage(i, distance, p, half, all(px == center)) > 0.0) {
                splatDepth[uint(px.y * w + px.x)].max(bits);
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
  uint local = 0u;
  if (quad) {
    local = pointsKept.add(1u);
  }
  GroupMemoryBarrierWithGroupSync();
  if (lane == 0u) {
    pointsBase = pointCounts[pointCull.counter].add(pointsKept.load());
  }
  GroupMemoryBarrierWithGroupSync();
  if (quad) {
    arena[pointCull.list + pointsBase + local] = i;
  }
}

/** The splats' color and feature, where their depth won (after `cullPoints`). */
[shader("compute")]
[numthreads(64, 1, 1)]
void splatPoints(uint3 gid : SV_DispatchThreadID) {
  uint i = gid.x + gid.y * WorkgroupCount().x * 64u;
  float4 placed = placePoint(i);
  if (placed.w == 0.0) {
    return;
  }
  float distance = length(placed.xyz);
  if (!styleShow(i, distance) || !splatted(i, distance)) {
    return;
  }
  float4 s = onScreen(i, distance, placed.xyz);
  if (s.w == 0.0) {
    return;
  }
  float size = max(styleSize(i, distance), 1.0);
  float half = size * 0.5;
  uint bits = asuint(s.z);
  float4 color = styleColor(i, distance);
  uint feature = records[pointCull.record].featureId + i;
  int w = int(view.viewport.x);
  int h = int(view.viewport.y);
  int x0 = int(floor(s.x - half - 0.5));
  int y0 = int(floor(s.y - half - 0.5));
  int2 center = int2(floor(s.xy));
  for (int dy = 0; dy < MAX_FOOTPRINT; dy++) {
    for (int dx = 0; dx < MAX_FOOTPRINT; dx++) {
      int2 px = int2(x0 + dx, y0 + dy);
      if (float(dx) > size + 2.0 || float(dy) > size + 2.0 ||
          any(px < int2(0)) || px.x >= w || px.y >= h) {
        continue;
      }
      float2 p = (float2(px) + 0.5 - s.xy) / half;
      uint at = uint(px.y * w + px.x);
      float coverage = splatCoverage(i, distance, p, half, all(px == center));
      if (coverage > 0.0 && splatDepth[at].load() == bits) {
        // Its coverage of the pixel as alpha: the resolve blends by it.
        splatColor[at] = packUnorm4x8(float4(color.rgb, coverage));
        splatFeature[at] = feature;
      }
    }
  }
}

/** The draw's indirect arguments: six vertices per listed point. */
[shader("compute")]
[numthreads(1, 1, 1)]
void writePointArgs() {
  uint a = pointCull.batch * 5u;
  // `writeDrawArgs` counted the record's item: 1 where it passed this
  // view's cull (and its view mask), else 0.
  bool shown = args[a + 1u].load() > 0u;
  args[a].store(shown ? pointCounts[pointCull.counter].load() * 6u : 0u);
  args[a + 1u].store(shown ? 1u : 0u);
  args[a + 2u].store(0u);
  args[a + 3u].store(0u);
}
