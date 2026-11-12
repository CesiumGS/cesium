// Fitting warps on the GPU (plan 13.26, "can warping animate at 60 fps";
// src/scene/warpFitGpu.ts is the host side). A warp that is a closed form
// of the position (a height lift, a bump, a scale about a point, a
// transverse Mercator projection) is sampled where scene/warpFit.ts samples
// a map on the CPU, a thread to a point, and fitted with the same least
// squares: a cell is a workgroup, its 125 Chebyshev-Lobatto samples
// (5 x 5 x 5) are reduced to the 20 cubic monomials per axis by the same
// solve operator, and the coefficients are written in place into a world's
// placements buffer, rows `[x, y, z, 0]` at `body + 3 + cell * 20 + k`
// (scene/placementTable.ts), the lattice's constant (its displacement at
// the tile's center) as hi and lo in the two rows before them. Nothing is
// read back: the vertex stage and the cull kernel read the rows the next
// frame.
//
// The warp is evaluated in double-float (warpFitDf64.slang): a position is
// the draw's origin (hi and lo) plus a float32 offset, the ellipsoid's foot
// by Newton's method on the multiplier, a projection by Karney's series in
// algebraic form (no trigonometry but one float32 atan2 and its df64
// correction), and a sample is its displacement less the displacement at
// the tile's center, rounded to float32 only then, so what the fit holds is
// small and good to micrometers. Draws are translation-only (the model
// origin's ECEF position is `tHi + tLo`): the same condition as terrain's
// exact height term.
//
// `checkCells` reads the lattice back as the vertex stage will (the same
// rows) and measures its residual at the 9 x 9 x 9 check points of the CPU
// fit, atomically maximizing a tile's slot in `errors` (a float32's bits,
// order preserving for non-negative numbers). `evalDirect` evaluates the
// warp at points with no fit, to price drawing a closed-form warp straight
// in the vertex stage.
import exactSum;
import warpFitDf64;

struct FitParams {
  uint kind;
  uint cellCount;   // cells in `cellList` (or points, for evalDirect)
  uint pad0;
  uint pad1;
  // df64 slots, two to a row (hi, lo): see `slot` and each form.
  float4 w[16];
};

// A tile to fit: its lattice's body in the placements buffer.
struct TileJob {
  float4 center;   // the lattice's center in model space (xyz) and scale (w)
  float4 tHi;      // the model origin's position, hi
  float4 tLo;      // and lo
  uint4 meta;      // body row (the lattice's head), cells per axis, error slot, 0
};

[[vk::binding(0, 0)]] ConstantBuffer<FitParams> params;
[[vk::binding(1, 0)]] StructuredBuffer<float2> solve;     // 20 x 125 df64 (hi, lo), row k = term k
[[vk::binding(2, 0)]] StructuredBuffer<TileJob> jobs;
[[vk::binding(3, 0)]] StructuredBuffer<uint2> cellList;   // (job, cell)
[[vk::binding(4, 0)]] RWStructuredBuffer<float4> lattices;   // the lattices' rows: a world's placements buffer
[[vk::binding(5, 0)]] RWStructuredBuffer<Atomic<uint>> errors;
[[vk::binding(6, 0)]] StructuredBuffer<float4> points;
[[vk::binding(7, 0)]] RWStructuredBuffer<float4> evaluated;

static const uint FORM_LIFT = 0u;
static const uint FORM_BUMP = 1u;
static const uint FORM_SCALE_ABOUT = 2u;
static const uint FORM_TM = 3u;

// Groups of a dispatch per row: a 2D dispatch indexes a flat list.
static const uint GROUP_ROW = 65535u;
static const uint FIT_POINTS = 125u;
static const uint CHECK_POINTS = 729u;
static const uint TERMS = 20u;

// Each monomial's exponents of v's x, y and z, 2 bits each (scene/placement.ts).
static const uint POWERS[20] = {
  0u, 1u, 4u, 16u,
  2u, 5u, 17u, 8u, 20u, 32u,
  3u, 6u, 18u, 9u, 21u, 33u, 12u, 24u, 36u, 48u
};

// The Chebyshev-Lobatto nodes as df64: cos(pi / 4) is irrational, and a
// float32 node is 1e-8 of the tile off, which a 10x lift turns into millimeters.
static const float2 LOBATTO[5] = {
  float2(-1.0, 0.0),
  float2(-0.70710677, -1.2101617e-8),
  float2(0.0, 0.0),
  float2(0.70710677, 1.2101617e-8),
  float2(1.0, 0.0)
};

struct Df3 {
  float2 x;
  float2 y;
  float2 z;
};

// A form's df64 number (slot i of 32).
float2 slot(uint i) {
  float4 row = params.w[i >> 1u];
  return (i & 1u) == 0u ? row.xy : row.zw;
}

// A point's foot on the ellipsoid (slots 0 to 2 hold 1 / radii^2): its
// height above it, h, and its unit normal n, in df64. Newton's method on
// the multiplier L of p = foot + L * (os * foot), as frames/heightWarps.ts.
struct Foot {
  float2 h;
  float2 nx;
  float2 ny;
  float2 nz;
};

Foot ellipsoidFoot(float2 px, float2 py, float2 pz) {
  float2 osx = slot(0u);
  float2 osy = slot(1u);
  float2 osz = slot(2u);
  float2 ax = dfMul(dfSqr(px), osx);
  float2 ay = dfMul(dfSqr(py), osy);
  float2 az = dfMul(dfSqr(pz), osz);
  float rho = sqrt(ax.x + ay.x + az.x);
  float2 lambda = dfOf((rho - 1.0) / ((osx.x + osy.x + osz.x) * (1.0 / 3.0)));
  float2 one = dfOf(1.0);
  float2 mx = one;
  float2 my = one;
  float2 mz = one;
  for (uint i = 0u; i < 5u; i++) {
    mx = dfDiv(one, dfAddF(dfMul(lambda, osx), 1.0));
    my = dfDiv(one, dfAddF(dfMul(lambda, osy), 1.0));
    mz = dfDiv(one, dfAddF(dfMul(lambda, osz), 1.0));
    if (i == 4u) {
      break;
    }
    float2 tx = dfMul(ax, dfSqr(mx));
    float2 ty = dfMul(ay, dfSqr(my));
    float2 tz = dfMul(az, dfSqr(mz));
    float2 f = dfAddF(dfAdd(dfAdd(tx, ty), tz), -1.0);
    float2 den = dfAdd(
      dfAdd(dfMul(dfMul(tx, mx), osx), dfMul(dfMul(ty, my), osy)),
      dfMul(dfMul(tz, mz), osz));
    lambda = dfAdd(lambda, dfDiv(f, dfMulF(den, 2.0)));
  }
  float2 gx = dfMul(dfMul(px, mx), osx);
  float2 gy = dfMul(dfMul(py, my), osy);
  float2 gz = dfMul(dfMul(pz, mz), osz);
  float2 g = dfSqrt(dfAdd(dfAdd(dfSqr(gx), dfSqr(gy)), dfSqr(gz)));
  float2 inverse = dfDiv(one, g);
  Foot foot;
  foot.h = dfMul(lambda, g);
  foot.nx = dfMul(gx, inverse);
  foot.ny = dfMul(gy, inverse);
  foot.nz = dfMul(gz, inverse);
  return foot;
}

// Transverse Mercator (Karney 2011, Krueger's series to order 6, the
// algebraic form): the point's (easting, northing, height) less the point.
// Slots: 3 e, 4 to 9 alpha1 to alpha6, 10 k0 A, 11 and 12 cos and sin of the
// central meridian, 13 false easting, 14 false northing. Good within about
// 10 degrees of the central meridian (the asinh series' reach).
Df3 transverseMercator(float2 px, float2 py, float2 pz) {
  Foot f = ellipsoidFoot(px, py, pz);
  float2 one = dfOf(1.0);
  float2 cosPhi = dfSqrt(dfAdd(dfSqr(f.nx), dfSqr(f.ny)));
  float2 inverse = dfDiv(one, cosPhi);
  float2 sinLambda = dfMul(f.ny, inverse);
  float2 cosLambda = dfMul(f.nx, inverse);
  float2 tau = dfMul(f.nz, inverse);
  float2 e = slot(3u);
  float2 sigma = dfSinhSmall(dfMul(e, dfAtanhSmall(dfMul(e, f.nz))));
  float2 tauPrime = dfSub(
    dfMul(tau, dfSqrt(dfAddF(dfSqr(sigma), 1.0))),
    dfMul(sigma, dfSqrt(dfAddF(dfSqr(tau), 1.0))));
  float2 cos0 = slot(11u);
  float2 sin0 = slot(12u);
  float2 sinL = dfSub(dfMul(sinLambda, cos0), dfMul(cosLambda, sin0));
  float2 cosL = dfAdd(dfMul(cosLambda, cos0), dfMul(sinLambda, sin0));
  float2 q = dfSqrt(dfAdd(dfSqr(tauPrime), dfSqr(cosL)));
  float2 invQ = dfDiv(one, q);
  // xi' = atan2(tau', cos L), eta' = asinh(sin L / q): sine, cosine, sinh, cosh.
  float2 s = dfMul(tauPrime, invQ);
  float2 c = dfMul(cosL, invQ);
  float2 sh = dfMul(sinL, invQ);
  float2 ch = dfMul(dfSqrt(dfAddF(dfSqr(tauPrime), 1.0)), invQ);
  float2 sumXi = dfAtan2(s, c);
  float2 sumEta = dfAsinhSmall(sh);
  float2 s1 = dfMulF(dfMul(s, c), 2.0);
  float2 c1 = dfSub(dfSqr(c), dfSqr(s));
  float2 sh1 = dfMulF(dfMul(sh, ch), 2.0);
  float2 ch1 = dfAdd(dfSqr(ch), dfSqr(sh));
  float2 sj = s1;
  float2 cj = c1;
  float2 shj = sh1;
  float2 chj = ch1;
  for (uint j = 1u; j <= 6u; j++) {
    float2 a = slot(3u + j);
    sumXi = dfAdd(sumXi, dfMul(a, dfMul(sj, chj)));
    sumEta = dfAdd(sumEta, dfMul(a, dfMul(cj, shj)));
    float2 sn = dfAdd(dfMul(sj, c1), dfMul(cj, s1));
    float2 cn = dfSub(dfMul(cj, c1), dfMul(sj, s1));
    float2 shn = dfAdd(dfMul(shj, ch1), dfMul(chj, sh1));
    float2 chn = dfAdd(dfMul(chj, ch1), dfMul(shj, sh1));
    sj = sn;
    cj = cn;
    shj = shn;
    chj = chn;
  }
  float2 kA = slot(10u);
  Df3 d;
  d.x = dfSub(dfAdd(slot(13u), dfMul(kA, sumEta)), px);
  d.y = dfSub(dfAdd(slot(14u), dfMul(kA, sumXi)), py);
  d.z = dfSub(f.h, pz);
  return d;
}

// The form's displacement at the point (df64 position in the form's frame).
Df3 evalForm(float2 px, float2 py, float2 pz) {
  Df3 d;
  uint kind = params.kind;
  if (kind == FORM_SCALE_ABOUT) {
    // Slots 0 to 2 the center, 3 to 5 the factors less 1.
    d.x = dfMul(slot(3u), dfSub(px, slot(0u)));
    d.y = dfMul(slot(4u), dfSub(py, slot(1u)));
    d.z = dfMul(slot(5u), dfSub(pz, slot(2u)));
    return d;
  }
  if (kind == FORM_TM) {
    return transverseMercator(px, py, pz);
  }
  Foot f = ellipsoidFoot(px, py, pz);
  float2 lift;
  if (kind == FORM_LIFT) {
    // Slots 3 the factor less 1, 4 the base height, 5 a constant lift: the
    // height h goes to base + k (h - base) + lift.
    lift = dfAdd(dfMul(slot(3u), dfSub(f.h, slot(4u))), slot(5u));
  } else {
    // Slots 3 to 5 the center, 6 the amplitude, 7 1 / (2 sigma^2): a
    // Gaussian bump of height along the normal, about a point.
    float2 dx = dfSub(px, slot(3u));
    float2 dy = dfSub(py, slot(4u));
    float2 dz = dfSub(pz, slot(5u));
    float r2 = dx.x * dx.x + dy.x * dy.x + dz.x * dz.x;
    lift = dfOf(slot(6u).x * exp(-r2 * slot(7u).x));
  }
  d.x = dfMul(f.nx, lift);
  d.y = dfMul(f.ny, lift);
  d.z = dfMul(f.nz, lift);
  return d;
}

// The form at model-space `m` (a df64 triple's parts) of the job's draw.
Df3 evalAtModel(TileJob job, float2 mx, float2 my, float2 mz) {
  return evalForm(
    dfAdd(float2(job.tHi.x, job.tLo.x), mx),
    dfAdd(float2(job.tHi.y, job.tLo.y), my),
    dfAdd(float2(job.tHi.z, job.tLo.z), mz));
}

// The form at the tile's local point `v` of cell `cell`, v in [-1, 1]^3 as
// df64 per axis. The position is exact: u is a df64 and the product with the
// tile's radius is a df64 product, so the samples are where the CPU fit
// puts them to 1e-14, not to a float32's 6e-8 of the tile.
Df3 evalAtCell(TileJob job, uint cells, uint cell, float2 vx, float2 vy, float2 vz) {
  float n = float(cells);
  float3 index = float3(float(cell % cells), float((cell / cells) % cells), float(cell / (cells * cells)));
  float3 whole = (2.0 * index + float3(1.0)) / n - float3(1.0);
  float s = job.center.w;
  float2 ox = dfMulF(dfAddF(dfMulF(vx, 1.0 / n), whole.x), s);
  float2 oy = dfMulF(dfAddF(dfMulF(vy, 1.0 / n), whole.y), s);
  float2 oz = dfMulF(dfAddF(dfMulF(vz, 1.0 / n), whole.z), s);
  return evalAtModel(
    job,
    dfAddF(ox, job.center.x),
    dfAddF(oy, job.center.y),
    dfAddF(oz, job.center.z));
}

Df3 evalAtCenter(TileJob job) {
  return evalAtModel(job, dfOf(job.center.x), dfOf(job.center.y), dfOf(job.center.z));
}

groupshared Df3 samples[128];
groupshared Df3 residual[128];
groupshared float coefficient[64];
groupshared Atomic<uint> worst;

// A cell of a tile: its 125 samples, less the tile's center value, to its
// 20 coefficients per axis. The samples' differences from the center's are
// tens of kilometers (a 10x exaggeration over a tile whose cube reaches its
// radius up), so the solve is df64 too: a float32 dot with a float32 operator
// is good to 1e-7 of them, 20 mm; this is good to micrometers.
[shader("compute")]
[numthreads(128, 1, 1)]
void fitCells(uint3 group : SV_GroupID, uint t : SV_GroupIndex) {
  uint at = group.y * GROUP_ROW + group.x;
  if (at >= params.cellCount) {
    return;
  }
  uint2 entry = cellList[at];
  TileJob job = jobs[entry.x];
  uint cells = job.meta.y;
  if (t < FIT_POINTS) {
    samples[t] = evalAtCell(
      job, cells, entry.y, LOBATTO[t % 5u], LOBATTO[(t / 5u) % 5u], LOBATTO[t / 25u]);
  } else if (t == FIT_POINTS) {
    samples[t] = evalAtCenter(job);
  }
  GroupMemoryBarrierWithGroupSync();
  Df3 center = samples[FIT_POINTS];
  if (t < FIT_POINTS) {
    Df3 d = samples[t];
    Df3 r;
    r.x = dfSub(d.x, center.x);
    r.y = dfSub(d.y, center.y);
    r.z = dfSub(d.z, center.z);
    residual[t] = r;
  }
  GroupMemoryBarrierWithGroupSync();
  uint body = job.meta.x;
  if (t < 3u * TERMS) {
    uint term = t / 3u;
    uint axis = t % 3u;
    float2 sum = float2(0.0);
    for (uint s = 0u; s < FIT_POINTS; s++) {
      Df3 r = residual[s];
      float2 value = axis == 0u ? r.x : (axis == 1u ? r.y : r.z);
      sum = dfAdd(sum, dfMul(solve[term * FIT_POINTS + s], value));
    }
    coefficient[t] = sum.x;
  }
  GroupMemoryBarrierWithGroupSync();
  if (t < TERMS) {
    lattices[body + 3u + entry.y * TERMS + t] =
      float4(coefficient[3u * t], coefficient[3u * t + 1u], coefficient[3u * t + 2u], 0.0);
  }
  if (t == FIT_POINTS && entry.y == 0u) {
    lattices[body + 1u] = float4(center.x.x, center.y.x, center.z.x, 0.0);
    lattices[body + 2u] = float4(center.x.y, center.y.y, center.z.y, 0.0);
  }
}

// The worst residual of the lattice in the buffer, as the vertex stage will
// evaluate it, against the form at the 729 check points of each cell.
[shader("compute")]
[numthreads(128, 1, 1)]
void checkCells(uint3 group : SV_GroupID, uint t : SV_GroupIndex) {
  uint at = group.y * GROUP_ROW + group.x;
  if (at >= params.cellCount) {
    return;
  }
  uint2 entry = cellList[at];
  TileJob job = jobs[entry.x];
  uint cells = job.meta.y;
  uint body = job.meta.x;
  if (t == 0u) {
    worst.store(0u);
  }
  GroupMemoryBarrierWithGroupSync();
  float3 hi = lattices[body + 1u].xyz;
  float3 lo = lattices[body + 2u].xyz;
  uint first = body + 3u + entry.y * TERMS;
  float mine = 0.0;
  for (uint s = t; s < CHECK_POINTS; s += 128u) {
    float3 v = float3(float(s % 9u), float((s / 9u) % 9u), float(s / 81u)) * 0.25 - float3(1.0);
    Df3 d = evalAtCell(job, cells, entry.y, dfOf(v.x), dfOf(v.y), dfOf(v.z));
    float3 r = float3(
      dfSub(d.x, float2(hi.x, lo.x)).x,
      dfSub(d.y, float2(hi.y, lo.y)).x,
      dfSub(d.z, float2(hi.z, lo.z)).x);
    float4 px = float4(1.0, v.x, v.x * v.x, v.x * v.x * v.x);
    float4 py = float4(1.0, v.y, v.y * v.y, v.y * v.y * v.y);
    float4 pz = float4(1.0, v.z, v.z * v.z, v.z * v.z * v.z);
    for (uint k = 0u; k < TERMS; k++) {
      uint e = POWERS[k];
      r -= lattices[first + k].xyz * (px[e & 3u] * py[(e >> 2u) & 3u] * pz[(e >> 4u) & 3u]);
    }
    mine = max(mine, length(r));
  }
  worst.max(asuint(mine));
  GroupMemoryBarrierWithGroupSync();
  if (t == 0u) {
    errors[job.meta.z].max(worst.load());
  }
}

// The form at points of the first job's draw (model space), no fit: what
// drawing a closed-form warp straight in the vertex stage costs, per vertex.
[shader("compute")]
[numthreads(64, 1, 1)]
void evalDirect(uint3 id : SV_DispatchThreadID) {
  if (id.x >= params.cellCount) {
    return;
  }
  TileJob job = jobs[0];
  float3 m = points[id.x].xyz;
  Df3 d = evalAtModel(job, dfOf(m.x), dfOf(m.y), dfOf(m.z));
  evaluated[id.x] = float4(d.x.x, d.y.x, d.z.x, 0.0);
}
