// Double-float arithmetic for the warp-fitting kernels (plan 13.26, the GPU
// fit): a value is a float2 (hi, lo), hi + lo, |lo| <= ulp(hi) / 2, about 48
// bits of significand, so a position on the Earth (6.4e6 m) is held to
// 1e-7 m and a projection's easting and northing to a micrometer. WebGPU has
// no float64; the engine's warps are float64 on the CPU, and a fit samples
// them where float32's half a meter at the Earth's radius is a visible error.
//
// Built on exactSum's twoSum and twoProd (Veltkamp's split, no fma, which
// WGSL may or may not fuse), so it needs the compiler to keep the order of
// float operations as exactSum does: where it reassociates, each error term
// folds to 0 and a df64 value is a float32 one, no better, never worse.
// Series coefficients are float64 constants rounded to hi and lo; generated
// by an exact rational conversion, not typed.
module warpFitDf64;

import exactSum;

// The sum of a and b, |a| >= |b| or a == 0 (Dekker).
public float2 dfQuick(float a, float b) {
  float s = a + b;
  return float2(s, b - (s - a));
}

public float2 dfAdd(float2 a, float2 b) {
  float2 s = twoSum(a.x, b.x);
  float2 t = twoSum(a.y, b.y);
  float2 u = dfQuick(s.x, s.y + t.x);
  return dfQuick(u.x, u.y + t.y);
}

public float2 dfSub(float2 a, float2 b) {
  return dfAdd(a, -b);
}

public float2 dfAddF(float2 a, float b) {
  float2 s = twoSum(a.x, b);
  return dfQuick(s.x, s.y + a.y);
}

public float2 dfMulF(float2 a, float b) {
  float2 p = twoProd(a.x, b);
  return dfQuick(p.x, p.y + a.y * b);
}

public float2 dfMul(float2 a, float2 b) {
  float2 p = twoProd(a.x, b.x);
  return dfQuick(p.x, p.y + (a.x * b.y + a.y * b.x));
}

public float2 dfSqr(float2 a) {
  return dfMul(a, a);
}

// a / b to about 1e-14: three quotients, each correcting the last remainder.
public float2 dfDiv(float2 a, float2 b) {
  float q1 = a.x / b.x;
  float2 r = dfSub(a, dfMulF(b, q1));
  float q2 = r.x / b.x;
  r = dfSub(r, dfMulF(b, q2));
  float q3 = r.x / b.x;
  return dfAddF(dfQuick(q1, q2), q3);
}

public float2 dfSqrt(float2 a) {
  if (a.x <= 0.0) {
    return float2(0.0);
  }
  float y = sqrt(a.x);
  float2 d = dfSub(a, float2(twoProd(y, y)));
  return dfQuick(y, d.x / (2.0 * y));
}

// A float32 as a df64.
public float2 dfOf(float a) {
  return float2(a, 0.0);
}

// 1/(2k+1)!, with the alternating sign: sin x = x * sum SIN_C[k] x^2k.
static const float2 SIN_C[13] = {
  float2(1.00000000e+0, 0.0),
  float2(-1.66666672e-1, 4.96705388e-9),
  float2(8.33333377e-3, -4.34617203e-10),
  float2(-1.98412701e-4, 2.72559687e-12),
  float2(2.75573188e-6, 3.79357122e-14),
  float2(-2.50521079e-8, -4.41762304e-16),
  float2(1.60590444e-10, -5.35252651e-18),
  float2(-7.64716361e-13, -1.22007105e-20),
  float2(2.81145736e-15, -1.04620847e-22),
  float2(-8.22063508e-18, -1.68147810e-25),
  float2(1.95729415e-20, -4.61294551e-28),
  float2(-3.86817030e-23, 1.27334043e-30),
  float2(6.44695034e-26, -5.60946914e-34)
};
// 1/(2k)!, with the alternating sign: cos x = sum COS_C[k] x^2k.
static const float2 COS_C[14] = {
  float2(1.00000000e+0, 0.0),
  float2(-5.00000000e-1, 0.0),
  float2(4.16666679e-2, -1.24176347e-9),
  float2(-1.38888892e-3, 3.36310944e-11),
  float2(2.48015876e-5, -3.40699609e-13),
  float2(-2.75573200e-7, 7.57511221e-15),
  float2(2.08767559e-9, 1.10828398e-16),
  float2(-1.14707454e-11, -2.37220769e-19),
  float2(4.77947726e-14, 7.62544404e-22),
  float2(-1.56192068e-16, -1.54044715e-24),
  float2(4.11031759e-19, 3.23751173e-27),
  float2(-8.89679096e-22, -4.32883720e-29),
  float2(1.61173759e-24, -2.01866484e-32),
  float2(-2.47959628e-27, 2.15748815e-35)
};
// 1/(2k+1)!: sinh y = y * sum SINH_C[k] y^2k.
static const float2 SINH_C[6] = {
  float2(1.00000000e+0, 0.0),
  float2(1.66666672e-1, -4.96705388e-9),
  float2(8.33333377e-3, -4.34617203e-10),
  float2(1.98412701e-4, -2.72559687e-12),
  float2(2.75573188e-6, 3.79357122e-14),
  float2(2.50521079e-8, 4.41762304e-16)
};
// 1/(2k+1): atanh u = u * sum ATANH_C[k] u^2k.
static const float2 ATANH_C[9] = {
  float2(1.00000000e+0, 0.0),
  float2(3.33333343e-1, -9.93410776e-9),
  float2(2.00000003e-1, -2.98023228e-9),
  float2(1.42857149e-1, -6.38621200e-9),
  float2(1.11111112e-1, -8.27842295e-10),
  float2(9.09090936e-2, -2.70930212e-9),
  float2(7.69230798e-2, -2.86560797e-9),
  float2(6.66666701e-2, -3.47693763e-9),
  float2(5.88235296e-2, -2.19134724e-10)
};
// (-1)^k (2k)! / (4^k k!^2 (2k+1)): asinh s = s * sum ASINH_C[k] s^2k.
static const float2 ASINH_C[14] = {
  float2(1.00000000e+0, 0.0),
  float2(-1.66666672e-1, 4.96705388e-9),
  float2(7.50000030e-2, -2.98023228e-9),
  float2(-4.46428582e-2, 1.06436870e-9),
  float2(3.03819440e-2, 4.13921147e-10),
  float2(-2.23721582e-2, -8.46656911e-10),
  float2(1.73527636e-2, 8.59682381e-10),
  float2(-1.39648439e-2, 1.86264518e-10),
  float2(1.15518011e-2, -2.19134724e-10),
  float2(-9.76160914e-3, -3.92135824e-10),
  float2(8.39033537e-3, 4.43486942e-10),
  float2(-7.31252600e-3, 1.21476856e-10),
  float2(6.44721044e-3, -1.30385161e-10),
  float2(-5.74003765e-3, -1.72467145e-11)
};

// sin x and cos x for a float32 |x| <= 1.6, to about 1e-15 (Taylor).
public void dfSinCos(float x, out float2 sine, out float2 cosine) {
  float2 u = dfOf(x);
  float2 u2 = dfSqr(u);
  float2 s = SIN_C[12];
  for (int k = 11; k >= 0; k--) {
    s = dfAdd(dfMul(s, u2), SIN_C[k]);
  }
  float2 c = COS_C[13];
  for (int k = 12; k >= 0; k--) {
    c = dfAdd(dfMul(c, u2), COS_C[k]);
  }
  sine = dfMul(s, u);
  cosine = c;
}

// The angle whose sine and cosine are s and c (a unit pair, c > 0): a
// float32 atan2, then the remaining angle from sin(theta - theta0) =
// s cos(theta0) - c sin(theta0), good to about 1e-14.
public float2 dfAtan2(float2 s, float2 c) {
  float t0 = atan2(s.x, c.x);
  float2 s0;
  float2 c0;
  dfSinCos(t0, s0, c0);
  float2 d = dfSub(dfMul(s, c0), dfMul(c, s0));
  float d3 = d.x * d.x * d.x * (1.0 / 6.0);
  return dfAddF(dfAdd(dfOf(t0), d), d3);
}

// asinh s for |s| <= 0.2 or so (the series' radius is 1; past 0.25 it loses digits).
public float2 dfAsinhSmall(float2 s) {
  float2 s2 = dfSqr(s);
  float2 r = ASINH_C[13];
  for (int k = 12; k >= 0; k--) {
    r = dfAdd(dfMul(r, s2), ASINH_C[k]);
  }
  return dfMul(r, s);
}

// atanh u for |u| <= 0.1.
public float2 dfAtanhSmall(float2 u) {
  float2 u2 = dfSqr(u);
  float2 r = ATANH_C[8];
  for (int k = 7; k >= 0; k--) {
    r = dfAdd(dfMul(r, u2), ATANH_C[k]);
  }
  return dfMul(r, u);
}

// sinh y for |y| <= 0.05.
public float2 dfSinhSmall(float2 y) {
  float2 y2 = dfSqr(y);
  float2 r = SINH_C[5];
  for (int k = 4; k >= 0; k--) {
    r = dfAdd(dfMul(r, y2), SINH_C[k]);
  }
  return dfMul(r, y);
}
