// B-rep patches on the GPU (CESIUM2_WEBGPU_PLAN.md §13.33, "Step 5
// redirected", part 1): a patch draw's spans and their evaluation.
//
// A span is a face's rect over one Bézier patch or one angular piece of an
// analytic surface (src/brep/gpuPatches.ts writes the records, SPAN_WORDS
// words each, in the draw's slab; `PatchSpan` and the word offsets below are
// its layout, test/patchLayout.test.ts checks they agree). The dice kernel
// (dice.slang) counts cells from a span's density; the vertex stage
// (surface.slang `patchVertex`) evaluates the surface at each cell's corners
// with the functions here: the analytic formulas as src/brep/form.ts
// documents them, and rational Béziers by de Casteljau in homogeneous
// coordinates, of degree 1 to 7 (a cubic path with a fixed net, a wider one
// above 3). Normals are the exact ∂u × ∂v (the face's reversal applies
// in the caller). The float64 CPU twin is `evaluateSpan` there.
module patch;

public static const uint SPAN_WORDS = 48u;

// Word offsets within a span's record.
public static const uint SPAN_KIND = 0u;
public static const uint SPAN_DEGREES = 1u;
public static const uint SPAN_FACE = 2u;
public static const uint SPAN_CONTROLS = 3u;
public static const uint SPAN_ORIGIN = 4u;
public static const uint SPAN_AXIS_X = 7u;
public static const uint SPAN_AXIS_Y = 10u;
public static const uint SPAN_PARAMS = 13u;
public static const uint SPAN_DOMAIN = 15u;
public static const uint SPAN_RECT = 19u;
public static const uint SPAN_CORNER = 23u;
public static const uint SPAN_SPHERE = 25u;
public static const uint SPAN_FACE_SPHERE = 29u;
public static const uint SPAN_DENSITY = 33u;
public static const uint SPAN_SPEED = 36u;
public static const uint SPAN_TRIM = 41u;

// SurfaceKind (src/brep/form.ts).
static const uint KIND_PLANE = 0u;
static const uint KIND_CYLINDER = 1u;
static const uint KIND_CONE = 2u;
static const uint KIND_SPHERE = 3u;
static const uint KIND_TORUS = 4u;

// `SPAN_KIND`'s word: the kind in bits 0 to 7, then flags.
public static const uint SPAN_REVERSED_BIT = 256u;
public static const uint SPAN_NEEDS_TRIM_BIT = 512u;

// `SPAN_TRIM`'s word: the trim data's offset in words from the table's start,
// or one of these (src/brep/gpuPatches.ts NO_TRIM, TRIM_PENDING).
public static const uint NO_TRIM = 4294967295u;
public static const uint TRIM_PENDING = 4294967294u;

// The most cells a span's side holds, and a chunk's side in cells
// (src/brep/gpuPatches.ts MAX_CELLS; dice.slang writes chunks of this).
// A chunk is drawn indexed: (CHUNK_CELLS + 1)² vertices shared by its cells'
// triangles, over the static index buffer in render/drawArguments.ts.
public static const uint MAX_CELLS = 64u;
public static const uint CHUNK_CELLS = 4u;

public struct PatchSpan {
  public uint kind;
  public bool reversed;
  public uint degreeU;
  public uint degreeV;
  public uint face;
  public uint controls;       // words from the span table's start
  public float3 origin;       // an analytic span's frame, relative to the draw's origin
  public float3 axisX;
  public float3 axisY;
  public float2 params;       // radii and angle
  public float4 domain;       // a Bézier patch's (u0, u1, v0, v1)
  public float4 rect;         // what the span draws
  public float2 corner;       // the face rect's lowest u and v
  public float4 sphere;       // the span's bounding sphere
  public float4 faceSphere;
  public float3 density;      // the face's D_u, D_uv, D_v
  public float2 speed;        // the face's speeds in u and v
  public uint trim;
};

public struct PatchPoint {
  public float3 position;
  public float3 normal;       // unit ∂u × ∂v
};

// A span's record from words (`word(i)` is the record's i-th f32 / u32
// word): written here once for both users' buffers, which differ (the
// vertex stage's arena, the dice kernel's).
public struct SpanWords {
  public uint u[SPAN_WORDS];
};

float3 f3(SpanWords w, uint at) {
  return float3(asfloat(w.u[at]), asfloat(w.u[at + 1u]), asfloat(w.u[at + 2u]));
}
float4 f4(SpanWords w, uint at) {
  return float4(asfloat(w.u[at]), asfloat(w.u[at + 1u]), asfloat(w.u[at + 2u]), asfloat(w.u[at + 3u]));
}

public PatchSpan unpackSpan(SpanWords w) {
  PatchSpan s;
  uint k = w.u[SPAN_KIND];
  s.kind = k & 255u;
  s.reversed = (k & SPAN_REVERSED_BIT) != 0u;
  uint d = w.u[SPAN_DEGREES];
  s.degreeU = d & 255u;
  s.degreeV = (d >> 8u) & 255u;
  s.face = w.u[SPAN_FACE];
  s.controls = w.u[SPAN_CONTROLS];
  s.origin = f3(w, SPAN_ORIGIN);
  s.axisX = f3(w, SPAN_AXIS_X);
  s.axisY = f3(w, SPAN_AXIS_Y);
  s.params = float2(asfloat(w.u[SPAN_PARAMS]), asfloat(w.u[SPAN_PARAMS + 1u]));
  s.domain = f4(w, SPAN_DOMAIN);
  s.rect = f4(w, SPAN_RECT);
  s.corner = float2(asfloat(w.u[SPAN_CORNER]), asfloat(w.u[SPAN_CORNER + 1u]));
  s.sphere = f4(w, SPAN_SPHERE);
  s.faceSphere = f4(w, SPAN_FACE_SPHERE);
  s.density = f3(w, SPAN_DENSITY);
  s.speed = float2(asfloat(w.u[SPAN_SPEED]), asfloat(w.u[SPAN_SPEED + 1u]));
  s.trim = w.u[SPAN_TRIM];
  return s;
}

float3 load3(StructuredBuffer<float> words, uint at) {
  return float3(words[at], words[at + 1u], words[at + 2u]);
}
float4 load4(StructuredBuffer<float> words, uint at) {
  return float4(words[at], words[at + 1u], words[at + 2u], words[at + 3u]);
}

// The span the vertex stage needs, read from the arena at `base`: not the
// bounds and densities the dice used (they stay zero), and the frame only
// for an analytic span, the patch's domain only for a Bézier one. A vertex
// is read often, so each word not used is a read saved.
public PatchSpan loadSpan(StructuredBuffer<float> words, uint base) {
  PatchSpan s;
  uint k = asuint(words[base + SPAN_KIND]);
  s.kind = k & 255u;
  s.reversed = (k & SPAN_REVERSED_BIT) != 0u;
  uint d = asuint(words[base + SPAN_DEGREES]);
  s.degreeU = d & 255u;
  s.degreeV = (d >> 8u) & 255u;
  s.face = asuint(words[base + SPAN_FACE]);
  s.controls = asuint(words[base + SPAN_CONTROLS]);
  s.rect = load4(words, base + SPAN_RECT);
  s.corner = float2(words[base + SPAN_CORNER], words[base + SPAN_CORNER + 1u]);
  s.trim = asuint(words[base + SPAN_TRIM]);
  s.origin = float3(0.0);
  s.axisX = float3(0.0);
  s.axisY = float3(0.0);
  s.params = float2(0.0);
  s.domain = float4(0.0);
  s.sphere = float4(0.0);
  s.faceSphere = float4(0.0);
  s.density = float3(0.0);
  s.speed = float2(0.0);
  if (s.kind == 5u) {
    s.domain = load4(words, base + SPAN_DOMAIN);
  } else {
    s.origin = load3(words, base + SPAN_ORIGIN);
    s.axisX = load3(words, base + SPAN_AXIS_X);
    s.axisY = load3(words, base + SPAN_AXIS_Y);
    s.params = float2(words[base + SPAN_PARAMS], words[base + SPAN_PARAMS + 1u]);
  }
  return s;
}

// The analytic surfaces (form.ts, with x, y and z = x × y): a local point
// (a, b, c) along x, y, z, and the unit ∂u × ∂v there in the same axes.
// The cross product's scalar factor (the radius, cos v) keeps its sign.
float sign1(float x) {
  return x < 0.0 ? -1.0 : 1.0;
}

public PatchPoint evaluateAnalytic(PatchSpan s, float u, float v) {
  float cu = cos(u);
  float su = sin(u);
  float3 local;
  float3 n;
  float p0 = s.params.x;
  float p1 = s.params.y;
  switch (s.kind) {
  case KIND_PLANE:
    local = float3(u, v, 0.0);
    n = float3(0.0, 0.0, 1.0);
    break;
  case KIND_CYLINDER:
    local = float3(p0 * cu, p0 * su, v);
    n = float3(cu, su, 0.0) * sign1(p0);
    break;
  case KIND_CONE: {
    float t = tan(p1);
    float radius = p0 + v * t;
    local = float3(radius * cu, radius * su, v);
    n = float3(cu, su, -t) * sign1(radius);
    break;
  }
  case KIND_SPHERE: {
    float cv = cos(v);
    float sv = sin(v);
    local = float3(p0 * cv * cu, p0 * cv * su, p0 * sv);
    n = float3(cv * cu, cv * su, sv) * (sign1(p0) * sign1(cv));
    break;
  }
  default: {
    float cv = cos(v);
    float sv = sin(v);
    float radius = p0 + p1 * cv;
    local = float3(radius * cu, radius * su, p1 * sv);
    n = float3(cv * cu, cv * su, sv) * (sign1(p1) * sign1(radius));
    break;
  }
  }
  float3 z = cross(s.axisX, s.axisY);
  PatchPoint point;
  point.position = s.origin + local.x * s.axisX + local.y * s.axisY + local.z * z;
  point.normal = normalize(n.x * s.axisX + n.y * s.axisY + n.z * z);
  return point;
}

// One de Casteljau pass over the first n + 1 of 4 points at t: the value,
// and the derivative with respect to t (taken from the last two points).
void casteljau(float4 p[4], uint n, float t, out float4 value, out float4 derivative) {
  float s = 1.0 - t;
  derivative = float4(0.0);
  for (uint level = 1u; level <= 3u; level++) {
    if (level > n) {
      break;
    }
    if (level == n) {
      derivative = float(n) * (p[1] - p[0]);
    }
    for (uint i = 0u; i + level <= n; i++) {
      p[i] = s * p[i] + t * p[i + 1u];
    }
  }
  value = p[0];
}

// A rational Bézier patch at its local (s, t) in [0, 1]²: the homogeneous
// net's value and derivatives by de Casteljau (along s in each row of
// control points, then along t), then the quotient rule. `net` holds
// (x w, y w, z w, w) per control point with s fastest; `normal` is the
// unnormalized ∂s × ∂t, which has the direction of ∂u × ∂v.
void bezierPatch(PatchSpan sp, float4 net[16], float s, float t, out float3 position, out float3 ds, out float3 dt) {
  uint du = sp.degreeU;
  uint dv = sp.degreeV;
  float4 rowValue[4];
  float4 rowDerivative[4];
  for (uint j = 0u; j <= 3u; j++) {
    rowValue[j] = float4(0.0);
    rowDerivative[j] = float4(0.0);
    if (j > dv) {
      continue;
    }
    float4 p[4];
    for (uint i = 0u; i <= 3u; i++) {
      p[i] = i <= du ? net[j * (du + 1u) + i] : float4(0.0);
    }
    casteljau(p, du, s, rowValue[j], rowDerivative[j]);
  }
  float4 h;
  float4 ht;
  float4 hs;
  float4 unused;
  casteljau(rowValue, dv, t, h, ht);
  casteljau(rowDerivative, dv, t, hs, unused);
  float w = h.w;
  position = h.xyz / w;
  ds = (hs.xyz - hs.w * position) / w;
  dt = (ht.xyz - ht.w * position) / w;
}

// The same for a degree up to 7 in each direction (the form's most): the
// first n + 1 of 8 points. A separate, wider copy so the cubic path above
// keeps its smaller arrays.
void casteljauWide(float4 p[8], uint n, float t, out float4 value, out float4 derivative) {
  float s = 1.0 - t;
  derivative = float4(0.0);
  for (uint level = 1u; level <= 7u; level++) {
    if (level > n) {
      break;
    }
    if (level == n) {
      derivative = float(n) * (p[1] - p[0]);
    }
    for (uint i = 0u; i + level <= n; i++) {
      p[i] = s * p[i] + t * p[i + 1u];
    }
  }
  value = p[0];
}

// `bezierPatch` for a net of any degree up to 7 × 7, read from the arena at
// word `at` (4 per control point, s fastest) a row at a time: no 64-point
// copy is held, only a row's 8 points and the rows' values and derivatives.
void bezierPatchWide(StructuredBuffer<float> words, uint at, uint du, uint dv, float s, float t, out float3 position, out float3 ds, out float3 dt) {
  float4 rowValue[8];
  float4 rowDerivative[8];
  for (uint j = 0u; j <= 7u; j++) {
    rowValue[j] = float4(0.0);
    rowDerivative[j] = float4(0.0);
    if (j > dv) {
      continue;
    }
    float4 p[8];
    uint row = at + j * (du + 1u) * 4u;
    for (uint i = 0u; i <= 7u; i++) {
      if (i <= du) {
        p[i] = load4(words, row + i * 4u);
      } else {
        p[i] = float4(0.0);
      }
    }
    casteljauWide(p, du, s, rowValue[j], rowDerivative[j]);
  }
  float4 h;
  float4 ht;
  float4 hs;
  float4 unused;
  casteljauWide(rowValue, dv, t, h, ht);
  casteljauWide(rowDerivative, dv, t, hs, unused);
  float w = h.w;
  position = h.xyz / w;
  ds = (hs.xyz - hs.w * position) / w;
  dt = (ht.xyz - ht.w * position) / w;
}

// (u, v) as the local (s, t) of the span's patch domain.
float2 patchParameters(PatchSpan sp, float u, float v) {
  float2 width = float2(sp.domain.y - sp.domain.x, sp.domain.w - sp.domain.z);
  return float2(
      width.x > 0.0 ? clamp((u - sp.domain.x) / width.x, 0.0, 1.0) : 0.0,
      width.y > 0.0 ? clamp((v - sp.domain.z) / width.y, 0.0, 1.0) : 0.0);
}

// `evaluateBezier` for a net of degree above 3, read from the arena at `at`.
PatchPoint evaluateBezierWide(PatchSpan sp, StructuredBuffer<float> words, uint at, float u, float v) {
  float2 st = patchParameters(sp, u, v);
  float3 ds;
  float3 dt;
  PatchPoint point;
  bezierPatchWide(words, at, sp.degreeU, sp.degreeV, st.x, st.y, point.position, ds, dt);
  float3 n = cross(ds, dt);
  float scale = max(dot(ds, ds), dot(dt, dt));
  if (dot(n, n) <= 1e-12 * scale * scale) {
    float2 middle = float2(
        0.5 * (sp.rect.x + sp.rect.y), 0.5 * (sp.rect.z + sp.rect.w));
    float2 inside = float2(u, v) + (middle - float2(u, v)) * 1e-3;
    float2 st2 = patchParameters(sp, inside.x, inside.y);
    float3 p2;
    bezierPatchWide(words, at, sp.degreeU, sp.degreeV, st2.x, st2.y, p2, ds, dt);
    n = cross(ds, dt);
  }
  float length2 = dot(n, n);
  point.normal = length2 > 0.0 ? n * rsqrt(length2) : float3(0.0, 0.0, 1.0);
  return point;
}

// A Bézier span's surface at (u, v) of its patch's domain, given its net
// (the caller read it). At a pole (a degenerate row, where ∂s or ∂t
// vanishes) the normal is taken a little inside the span.
public PatchPoint evaluateBezier(PatchSpan sp, float4 net[16], float u, float v) {
  float2 width = float2(sp.domain.y - sp.domain.x, sp.domain.w - sp.domain.z);
  float s = width.x > 0.0 ? clamp((u - sp.domain.x) / width.x, 0.0, 1.0) : 0.0;
  float t = width.y > 0.0 ? clamp((v - sp.domain.z) / width.y, 0.0, 1.0) : 0.0;
  float3 ds;
  float3 dt;
  PatchPoint point;
  bezierPatch(sp, net, s, t, point.position, ds, dt);
  float3 n = cross(ds, dt);
  float scale = max(dot(ds, ds), dot(dt, dt));
  if (dot(n, n) <= 1e-12 * scale * scale) {
    float2 middle = float2(
        0.5 * (sp.rect.x + sp.rect.y), 0.5 * (sp.rect.z + sp.rect.w));
    float2 at = float2(u, v) + (middle - float2(u, v)) * 1e-3;
    float s2 = width.x > 0.0 ? clamp((at.x - sp.domain.x) / width.x, 0.0, 1.0) : 0.0;
    float t2 = width.y > 0.0 ? clamp((at.y - sp.domain.z) / width.y, 0.0, 1.0) : 0.0;
    float3 p2;
    bezierPatch(sp, net, s2, t2, p2, ds, dt);
    n = cross(ds, dt);
  }
  float length2 = dot(n, n);
  point.normal = length2 > 0.0 ? n * rsqrt(length2) : float3(0.0, 0.0, 1.0);
  return point;
}

// A Bézier span's surface at (u, v), its control net read from the arena at
// `base` plus the record's offset. A degree of at most 3 in both directions
// (the cubic path) copies the net to a fixed array and evaluates it there;
// anything above, up to 7 (the form's most), takes the wide path, which
// reads the points a row at a time.
public PatchPoint evaluateBezierSpan(PatchSpan sp, StructuredBuffer<float> words, uint base, float u, float v) {
  if (sp.degreeU > 3u || sp.degreeV > 3u) {
    return evaluateBezierWide(sp, words, base + sp.controls, u, v);
  }
  float4 net[16];
  uint count = (sp.degreeU + 1u) * (sp.degreeV + 1u);
  for (uint n = 0u; n < 16u; n++) {
    if (n < count) {
      uint at = base + sp.controls + n * 4u;
      net[n] = float4(words[at], words[at + 1u], words[at + 2u], words[at + 3u]);
    } else {
      net[n] = float4(0.0);
    }
  }
  return evaluateBezier(sp, net, u, v);
}
