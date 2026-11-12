// Closed-form warps evaluated per vertex with no fit (the GPU-warp study's
// strategy B; src/scene/warpDirect.ts bakes the draw data and is the float64
// twin). A draw carries, baked once in float64, the cubic polynomials of the
// ellipsoid height h and unit normal n over its tile; the animated
// parameters are a uniform. Two parts, as a fitted lattice has:
//
// - `directConstants`, one thread per draw per frame, writes the warp's
//   displacement at the draw's center, as hi and lo float32 parts (df64; the
//   cull kernel adds it to the draw's camera-relative translation:
//   placement.slang `placementOffset` reads exactly such rows);
// - `directResidual` is the part a vertex stage would call: the displacement
//   less the one at the center, computed from small differences only (the
//   polynomials less their constant terms, the unit normal's difference by
//   its algebraic form), so a 27 km lift is good to micrometers in float32
//   where its sum would be good to 1.6 mm. No buffer but the draw's rows,
//   about 100 flops, no refit when a parameter changes.
//
// `latticeEval` reads a one-cell lattice's rows as placement.slang does, the
// baseline a fitted warp costs per vertex. The kernels stand for the vertex
// stage: a thread to a vertex, a model-space position in, the residual out.
import warpFitDf64;

struct DirectParams {
  uint kind;      // 0 height lift, 1 bump, 2 scale about a point
  uint count;     // vertices
  uint drawCount; // draws, for directConstants
  uint pad1;
  float4 a;       // lift: factor - 1, base height, offset; bump: amplitude (w)
  float4 aLo;     // the lo parts of a
  float4 b;       // bump: 1 / (2 sigma^2)
  float4 cHi;     // the point (bump, scale about), hi
  float4 cLo;     // and lo
  float4 s1;      // scale about: factors - 1
  float4 s1Lo;
};

[[vk::binding(0, 0)]] ConstantBuffer<DirectParams> params;
[[vk::binding(1, 0)]] StructuredBuffer<float4> draws;     // 29 rows a draw (scene/warpDirect.ts)
[[vk::binding(2, 0)]] StructuredBuffer<float4> lattices;  // 23 rows a draw: head, hi, lo, 20 coefficients
[[vk::binding(3, 0)]] StructuredBuffer<float4> vertices;  // model position xyz, the draw (uint bits) in w
[[vk::binding(4, 0)]] RWStructuredBuffer<float4> output;
[[vk::binding(5, 0)]] RWStructuredBuffer<float4> constants;  // per draw: hi, lo

static const uint DRAW_ROWS = 29u;
static const uint LATTICE_ROWS = 23u;

// Each monomial's exponents of u's x, y and z, 2 bits each (scene/placement.ts).
static const uint POWERS[20] = {
  0u, 1u, 4u, 16u,
  2u, 5u, 17u, 8u, 20u, 32u,
  3u, 6u, 18u, 9u, 21u, 33u, 12u, 24u, 36u, 48u
};

// The displacement at the draw's center, in df64 (x, y, z), written hi and lo.
[shader("compute")]
[numthreads(64, 1, 1)]
void directConstants(uint3 id : SV_DispatchThreadID) {
  if (id.x >= params.drawCount) {
    return;
  }
  uint at = id.x * DRAW_ROWS;
  float4 head = draws[at];
  // The center relative to the point: (origin - point) + center, in df64.
  float2 wx = dfAddF(dfSub(float2(draws[at + 1u].x, draws[at + 2u].x), float2(params.cHi.x, params.cLo.x)), head.x);
  float2 wy = dfAddF(dfSub(float2(draws[at + 1u].y, draws[at + 2u].y), float2(params.cHi.y, params.cLo.y)), head.y);
  float2 wz = dfAddF(dfSub(float2(draws[at + 1u].z, draws[at + 2u].z), float2(params.cHi.z, params.cLo.z)), head.z);
  if (params.kind == 2u) {
    float2 dx = dfMul(float2(params.s1.x, params.s1Lo.x), wx);
    float2 dy = dfMul(float2(params.s1.y, params.s1Lo.y), wy);
    float2 dz = dfMul(float2(params.s1.z, params.s1Lo.z), wz);
    constants[2u * id.x] = float4(dx.x, dy.x, dz.x, 0.0);
    constants[2u * id.x + 1u] = float4(dx.y, dy.y, dz.y, 0.0);
    return;
  }
  float4 low = draws[at + 8u];
  float2 h = float2(draws[at + 3u].x, low.x);
  float2 nx = float2(draws[at + 9u].x, low.y);
  float2 ny = float2(draws[at + 9u].y, low.z);
  float2 nz = float2(draws[at + 9u].z, low.w);
  float2 norm = dfSqrt(dfAdd(dfAdd(dfSqr(nx), dfSqr(ny)), dfSqr(nz)));
  float2 lift;
  if (params.kind == 0u) {
    lift = dfAdd(
      dfMul(float2(params.a.x, params.aLo.x), dfSub(h, float2(params.a.y, params.aLo.y))),
      float2(params.a.z, params.aLo.z));
  } else {
    float r2 = wx.x * wx.x + wy.x * wy.x + wz.x * wz.x;
    lift = dfMulF(float2(params.a.w, params.aLo.w), exp(-r2 * params.b.x));
  }
  float2 scale = dfDiv(lift, norm);
  float2 dx = dfMul(scale, nx);
  float2 dy = dfMul(scale, ny);
  float2 dz = dfMul(scale, nz);
  constants[2u * id.x] = float4(dx.x, dy.x, dz.x, 0.0);
  constants[2u * id.x + 1u] = float4(dx.y, dy.y, dz.y, 0.0);
}

float3 directResidual(DirectParams p, uint draw, float3 m) {
  uint at = draw * DRAW_ROWS;
  float4 head = draws[at];
  if (p.kind == 2u) {
    return p.s1.xyz * (m - head.xyz);
  }
  float3 u = (m - head.xyz) * head.w;
  float4 px = float4(1.0, u.x, u.x * u.x, u.x * u.x * u.x);
  float4 py = float4(1.0, u.y, u.y * u.y, u.y * u.y * u.y);
  float4 pz = float4(1.0, u.z, u.z * u.z, u.z * u.z * u.z);
  // The polynomials less their constant terms: the height's and normal's changes over the tile.
  float dh = 0.0;
  float3 dn = float3(0.0);
  for (uint k = 19u; k > 0u; k--) {
    uint e = POWERS[k];
    float mono = px[e & 3u] * py[(e >> 2u) & 3u] * pz[(e >> 4u) & 3u];
    dh += draws[at + 3u + (k >> 2u)][k & 3u] * mono;
    dn += draws[at + 9u + k].xyz * mono;
  }
  float4 low = draws[at + 8u];
  float3 n0 = draws[at + 9u].xyz + low.yzw;
  // The unit normal at the vertex and its difference from the center's, both
  // without a difference of nearly equal terms: with a = |n0|, b = |n0 + dn|,
  // b^2 - a^2 = s is formed from small terms, n/b - n0/a = dn/b - n0 s / (a b (a + b)).
  float a2 = dot(n0, n0);
  float a = sqrt(a2);
  float s = 2.0 * dot(n0, dn) + dot(dn, dn);
  float b = sqrt(a2 + s);
  float3 unit = (n0 + dn) / b;
  float3 change = dn / b - n0 * (s / (a * b * (a + b)));
  float lift;
  float dlift;
  if (p.kind == 0u) {
    float h0 = draws[at + 3u].x + low.x;
    lift = p.a.x * (h0 - p.a.y) + p.a.z;
    dlift = p.a.x * dh;
  } else {
    float3 w0 = (draws[at + 1u].xyz - p.cHi.xyz) + (draws[at + 2u].xyz - p.cLo.xyz) + head.xyz;
    float3 w = w0 + (m - head.xyz);
    float gc = exp(-dot(w0, w0) * p.b.x);
    lift = p.a.w * gc;
    dlift = p.a.w * (exp(-dot(w, w) * p.b.x) - gc);
  }
  return dlift * unit + lift * change;
}

[shader("compute")]
[numthreads(64, 1, 1)]
void directEval(uint3 id : SV_DispatchThreadID) {
  if (id.x >= params.count) {
    return;
  }
  float4 v = vertices[id.x];
  float3 d = directResidual(params, asuint(v.w), v.xyz);
  output[id.x] = float4(d, 0.0);
}

// A one-cell lattice's displacement at the vertex, less its constant: the
// cost of a fitted warp per vertex.
[shader("compute")]
[numthreads(64, 1, 1)]
void latticeEval(uint3 id : SV_DispatchThreadID) {
  if (id.x >= params.count) {
    return;
  }
  float4 v = vertices[id.x];
  uint at = asuint(v.w) * LATTICE_ROWS;
  float4 head = lattices[at];
  float3 u = (v.xyz - head.xyz) * head.w;
  float4 px = float4(1.0, u.x, u.x * u.x, u.x * u.x * u.x);
  float4 py = float4(1.0, u.y, u.y * u.y, u.y * u.y * u.y);
  float4 pz = float4(1.0, u.z, u.z * u.z, u.z * u.z * u.z);
  float3 d = float3(0.0);
  for (uint k = 0u; k < 20u; k++) {
    uint e = POWERS[k];
    d += lattices[at + 3u + k].xyz * (px[e & 3u] * py[(e >> 2u) & 3u] * pz[(e >> 4u) & 3u]);
  }
  output[id.x] = float4(d, 0.0);
}
