// Section caps (render/world/capPass.ts): in the opaque pass, after the content,
// a triangle over the view draws the cap of a clip's cut wherever a pixel's ray
// enters what the clip keeps through a solid. Which solid is the parity pass's
// (surface.slang `capParityOf`): `parityLow` and `parityHigh` hold, a bit a face,
// whether the solids' surfaces beyond the face are odd in number, which is when
// the ray is inside one where it meets the face. The faces and the cap's look are
// rows of the view's clip table (scene/world/capFaces.ts), after its sets'.
//
// A cap is unlit and display-referred, as the point splats are (splat.slang), at
// the face's own depth, so what is nearer hides it and it hides what is behind.

import common;

[[vk::binding(0, 0)]] ConstantBuffer<View> view;
[[vk::binding(17, 0)]] StructuredBuffer<float4> clipTable;
[[vk::binding(0, 1)]] Texture2D<float4> parityLow;
[[vk::binding(1, 1)]] Texture2D<float4> parityHigh;

static const uint MAX_CLIP_SETS = 8u;
static const uint MAX_CLIP_SHAPES = 16u;
static const uint MAX_CLIP_POLYGON_VERTICES = 128u;
static const uint CLIP_TABLE_ROWS = 4096u;
static const uint CAP_MAX_FACES = 8u;
static const uint CLIP_PLANE = 0u;
static const uint CLIP_BOX = 1u;
static const uint CLIP_SET_INTERSECTION = 1u;
static const uint CLIP_SET_KEEP_OUTSIDE = 2u;
static const uint CLIP_SET_CURVED = 8u;
// Effects (scene/world/clips.ts): a ghost, stipple or shade set removes nothing from the opaque
// pass, so it makes no cap and its region is kept here.
static const uint CLIP_SET_EFFECT_MASK = 16u | 32u | 64u;

// The table's rows and a shape's test: surface.slang's, which the fragment stages
// of the clipped pipelines run (`insideClipShape`), here for a point on the ray.
float4 clipRow(uint row) {
  return clipTable[min(row, CLIP_TABLE_ROWS - 1u)];
}

float2 clipVertex(uint first, uint i) {
  float4 v = clipRow(first + (i >> 1u));
  return (i & 1u) == 0u ? v.xy : v.zw;
}

bool insideClipShape(uint at, float3 p) {
  uint4 head = asuint(clipRow(at));
  float4 a = clipRow(at + 1u);
  float ua = dot(a.xyz, p) + a.w;
  if (head.x == CLIP_PLANE) {
    return ua <= 0.0;
  }
  float4 b = clipRow(at + 2u);
  float4 c = clipRow(at + 3u);
  float ub = dot(b.xyz, p) + b.w;
  float uc = dot(c.xyz, p) + c.w;
  if (head.x == CLIP_BOX) {
    return max(abs(ua), max(abs(ub), abs(uc))) <= 1.0;
  }
  float2 zRange = clipRow(at + 4u).xy;
  if (uc < zRange.x || uc > zRange.y) {
    return false;
  }
  uint count = min(head.z, MAX_CLIP_POLYGON_VERTICES);
  bool inside = false;
  for (uint i = 0u; i < MAX_CLIP_POLYGON_VERTICES; i++) {
    if (i >= count) {
      break;
    }
    float2 s = clipVertex(at + 5u, i);
    float2 e = clipVertex(at + 5u, i + 1u == count ? 0u : i + 1u);
    if ((s.y > ub) != (e.y > ub)) {
      float crossing = s.x + (ub - s.y) * (e.x - s.x) / (e.y - s.y);
      if (ua < crossing) {
        inside = !inside;
      }
    }
  }
  return inside;
}

// Whether clip set `s` keeps `p` (camera-relative). A curved set keeps all: the
// view has no caps while one is in it (`packCapFaces`).
bool setKeeps(uint s, float3 p) {
  uint4 entry = asuint(clipRow(1u + s));
  if ((entry.z & (CLIP_SET_CURVED | CLIP_SET_EFFECT_MASK)) != 0u) {
    return true;
  }
  bool every = (entry.z & CLIP_SET_INTERSECTION) != 0u;
  bool region = every;
  uint at = entry.x;
  uint shapes = min(entry.y, MAX_CLIP_SHAPES);
  for (uint k = 0u; k < MAX_CLIP_SHAPES; k++) {
    if (k >= shapes) {
      break;
    }
    bool inside = insideClipShape(at, p);
    if (every ? !inside : inside) {
      region = !every;
      break;
    }
    at += max(asuint(clipRow(at)).y, 1u);
  }
  return (entry.z & CLIP_SET_KEEP_OUTSIDE) != 0u ? !region : region;
}

[shader("vertex")]
float4 vs(uint v : SV_VertexID) : SV_Position {
  float2 uv = float2(float((v << 1u) & 2u), float(v & 2u));
  return float4(uv * 2.0 - 1.0, 0.0, 1.0);
}

// As the opaque pass's outputs, with the cap's depth.
struct CapOut {
  float4 color : SV_Target0;
  uint2 featureId : SV_Target1;
  float4 display : SV_Target2;
  float depth : SV_Depth;
};

// The hatch's coverage of a line `width` wide (a share of its spacing) at `h`
// spacings along, with the pixel `pixel` of them wide: a line smoothed over a
// pixel, its average when the lines are finer than the pixels can show.
float hatchCover(float h, float width, float pixel) {
  if (pixel > 0.5) {
    return width;
  }
  float distance = 0.5 - abs(frac(h) - 0.5);
  float half = 0.5 * width;
  float edge = max(pixel, 1e-4);
  return 1.0 - smoothstep(half - 0.5 * edge, half + 0.5 * edge, distance);
}

[shader("fragment")]
CapOut fs(float4 frag : SV_Position) {
  int2 px = int2(frag.xy);
  float4 low = parityLow.Load(int3(px, 0));
  float4 high = parityHigh.Load(int3(px, 0));
  uint4 head = asuint(clipRow(0u));
  uint count = min(head.w, CAP_MAX_FACES);
  uint sets = min(head.x, MAX_CLIP_SETS);
  // The pixel's ray, as `drawnPosition` rebuilds a point: the point at view depth t
  // is t times this (its view-axis part is 1).
  float2 ndc = frag.xy * view.viewport.zw * float2(2.0, -2.0) + float2(-1.0, 1.0);
  float3 right = view.viewProj[0].xyz;
  float3 up = view.viewProj[1].xyz;
  float3 ray = right * (ndc.x / dot(right, right)) + up * (ndc.y / dot(up, up)) +
               view.viewProj[3].xyz;
  float best = 1e30;
  uint face = 0u;
  for (uint k = 0u; k < CAP_MAX_FACES; k++) {
    if (k >= count) {
      break;
    }
    float bit = k < 4u ? low[k] : high[k - 4u];
    float4 plane = clipRow(head.z + 3u * k);
    float along = dot(plane.xyz, ray);
    if (bit < 0.5 || along <= 1e-6) {
      continue;
    }
    // The camera is on the plane's negative side: the ray crosses it at t > 0.
    float t = -plane.w / along;
    if (t <= 0.0 || t >= best) {
      continue;
    }
    float3 p = ray * t;
    uint own = asuint(clipRow(head.z + 3u * k + 1u).w);
    // The face is where its set keeps just past it and not just before it, and
    // every other set keeps the point.
    float eps = 0.001 + 2e-5 * t;
    if (!setKeeps(own, p + plane.xyz * eps) || setKeeps(own, p - plane.xyz * eps)) {
      continue;
    }
    bool others = true;
    for (uint s = 0u; s < MAX_CLIP_SETS; s++) {
      if (s >= sets) {
        break;
      }
      if (s != own && !setKeeps(s, p)) {
        others = false;
      }
    }
    if (others) {
      best = t;
      face = k;
    }
  }
  if (best >= 1e30) {
    discard;
  }
  float4 look = clipRow(head.z - 2u);
  float4 hatch = clipRow(head.z - 1u);
  float4 plane = clipRow(head.z + 3u * face);
  float4 origin = clipRow(head.z + 3u * face + 1u);
  float4 along = clipRow(head.z + 3u * face + 2u);
  float3 p = ray * best;
  float3 u = along.xyz;
  float3 v = cross(plane.xyz, u);
  float2 on = float2(dot(p - origin.xyz, u), dot(p - origin.xyz, v));
  // A pixel in metres on the plane: the view's at this depth, stretched where the
  // plane is oblique to the ray.
  float stretch = max(abs(dot(plane.xyz, ray)) / length(ray), 0.2);
  float pixel = 2.0 * best * view.viewport.w / length(up) / stretch;
  float spacing = max(hatch.x, 1e-3);
  float angle = hatch.z;
  float h = (on.x * cos(angle) + on.y * sin(angle)) / spacing;
  float cover = hatch.y > 0.0 ? hatchCover(h, hatch.y, pixel / spacing) * hatch.w : 0.0;
  float3 rgb = look.rgb * lerp(1.0, 0.55, cover);
  CapOut o;
  o.color = float4(0.0);
  o.featureId = uint2(0u, 0u);
  o.display = float4(rgb * look.a, look.a);
  o.depth = view.near / best;
  return o;
}
