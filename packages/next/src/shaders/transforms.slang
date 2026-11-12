// The built-in generic transforms and the exaggeration lift in Slang, f32,
// each `[Differentiable]` (plan 2026-11-12, task 3; src/transforms/*.ts and
// src/georeference/verticalExaggeration.ts are their float64 mirrors, and
// test/transformsParity.test.ts checks this file's generated WGSL against
// them). The Jacobian is `fwd_diff`: one forward pass per column, never
// written by hand, so a change to a function cannot leave its derivative
// behind. Each `*Parity` entry stands for the vertex stage's call: a thread
// to a point, the value and the Jacobian's three columns out (4 float4 per
// point; the columns are d value / d p.x, p.y, p.z), the family's parameters
// in a uniform struct whose fields are the TS descriptor's parameters, in
// its order (the exaggeration struct adds the ellipsoid's radii, which the TS
// descriptor bakes into its source instead).
//
// The centre constants (df64, for a draw's origin) come with the compiler in
// task 4; here the arithmetic is plain float32, so a point's units should
// keep the ellipsoid's radii small enough for it (the parity harness uses a
// body of radius 1e3).

[[vk::binding(0, 0)]] StructuredBuffer<float4> points;     // xyz; w unused
[[vk::binding(1, 0)]] RWStructuredBuffer<float4> results;  // value, then the Jacobian's columns

#define PARITY_ENTRY(NAME, FN, PARAMS)                                          \
    [shader("compute")]                                                          \
    [numthreads(64, 1, 1)]                                                       \
    void NAME(uint3 id : SV_DispatchThreadID)                                    \
    {                                                                            \
        uint count;                                                              \
        uint stride;                                                             \
        points.GetDimensions(count, stride);                                     \
        if (id.x >= count)                                                       \
        {                                                                        \
            return;                                                              \
        }                                                                        \
        float3 p = points[id.x].xyz;                                             \
        results[4u * id.x] = float4(FN(p, PARAMS), 0.0);                         \
        results[4u * id.x + 1u] =                                                \
            float4(fwd_diff(FN)(diffPair(p, float3(1.0, 0.0, 0.0)), PARAMS).d, 0.0); \
        results[4u * id.x + 2u] =                                                \
            float4(fwd_diff(FN)(diffPair(p, float3(0.0, 1.0, 0.0)), PARAMS).d, 0.0); \
        results[4u * id.x + 3u] =                                                \
            float4(fwd_diff(FN)(diffPair(p, float3(0.0, 0.0, 1.0)), PARAMS).d, 0.0); \
    }

// Scale about a point: q = c + S (p - c).
struct ScaleAboutParams { float cx; float cy; float cz; float sx; float sy; float sz; };
[[vk::binding(2, 0)]] ConstantBuffer<ScaleAboutParams> scaleAboutP;

[Differentiable]
float3 scaleAboutF(float3 p, ScaleAboutParams q)
{
    float3 c = float3(q.cx, q.cy, q.cz);
    return c + float3(q.sx, q.sy, q.sz) * (p - c);
}
PARITY_ENTRY(scaleAboutParity, scaleAboutF, scaleAboutP)

// A Gaussian bump along the unit direction u.
struct BumpParams
{
    float cx; float cy; float cz;
    float ux; float uy; float uz;
    float amplitude; float sigma;
};
[[vk::binding(3, 0)]] ConstantBuffer<BumpParams> bumpP;

[Differentiable]
float3 bumpF(float3 p, BumpParams q)
{
    float3 d = p - float3(q.cx, q.cy, q.cz);
    float g = q.amplitude * exp(-dot(d, d) / (2.0 * q.sigma * q.sigma));
    return p + g * normalize(float3(q.ux, q.uy, q.uz));
}
PARITY_ENTRY(bumpParity, bumpF, bumpP)

// Bend about the line through o along +x, towards +z, by the curvature.
struct BendParams { float ox; float oz; float curvature; };
[[vk::binding(4, 0)]] ConstantBuffer<BendParams> bendP;

[Differentiable]
float3 bendF(float3 p, BendParams q)
{
    if (abs(q.curvature) < 1e-12)
    {
        return p;
    }
    float dx = p.x - q.ox;
    float dz = p.z - q.oz;
    float radius = 1.0 / q.curvature;
    float theta = q.curvature * dx;
    float rr = radius - dz;
    return float3(q.ox + rr * sin(theta), p.y, q.oz + radius - rr * cos(theta));
}
PARITY_ENTRY(bendParity, bendF, bendP)

// Twist about the axis through o along a, by rate radians per metre along it.
struct TwistParams
{
    float ox; float oy; float oz;
    float ax; float ay; float az;
    float rate;
};
[[vk::binding(5, 0)]] ConstantBuffer<TwistParams> twistP;

[Differentiable]
float3 twistF(float3 p, TwistParams q)
{
    float3 o = float3(q.ox, q.oy, q.oz);
    float3 a = normalize(float3(q.ax, q.ay, q.az));
    float3 d = p - o;
    float t = dot(d, a);
    float3 m = d - t * a;
    float theta = q.rate * t;
    return o + t * a + m * cos(theta) + cross(a, m) * sin(theta);
}
PARITY_ENTRY(twistParity, twistF, twistP)

// Taper (Barr): the cross-section about the axis scales by 1 + rate t.
[[vk::binding(6, 0)]] ConstantBuffer<TwistParams> taperP;

[Differentiable]
float3 taperF(float3 p, TwistParams q)
{
    float3 o = float3(q.ox, q.oy, q.oz);
    float3 a = normalize(float3(q.ax, q.ay, q.az));
    float3 d = p - o;
    float t = dot(d, a);
    return o + t * a + (1.0 + q.rate * t) * (d - t * a);
}
PARITY_ENTRY(taperParity, taperF, taperP)

// Free-form deformation, degree 2 x 2 x 2: 27 control-point displacements in
// `latticeD` (float4 each; i slowest, k fastest, as the TS names d_i_j_k_xyz).
struct LatticeParams
{
    float ox; float oy; float oz;
    float e1x; float e1y; float e1z;
    float e2x; float e2y; float e2z;
    float e3x; float e3y; float e3z;
};
[[vk::binding(7, 0)]] ConstantBuffer<LatticeParams> latticeP;
[[vk::binding(8, 0)]] StructuredBuffer<float4> latticeD;

[Differentiable]
float bernstein2(float x, int i)
{
    float y = 1.0 - x;
    return i == 0 ? y * y : (i == 1 ? 2.0 * x * y : x * x);
}

[Differentiable]
float3 latticeF(float3 p, LatticeParams q)
{
    float3 e1 = float3(q.e1x, q.e1y, q.e1z);
    float3 e2 = float3(q.e2x, q.e2y, q.e2z);
    float3 e3 = float3(q.e3x, q.e3y, q.e3z);
    float3 d = p - float3(q.ox, q.oy, q.oz);
    float3 c23 = cross(e2, e3);
    float det = dot(e1, c23);
    float s = dot(c23, d) / det;
    float t = dot(cross(e3, e1), d) / det;
    float u = dot(cross(e1, e2), d) / det;
    float3 result = p;
    [ForceUnroll]
    for (int i = 0; i < 3; i++)
    {
        [ForceUnroll]
        for (int j = 0; j < 3; j++)
        {
            [ForceUnroll]
            for (int k = 0; k < 3; k++)
            {
                float w = bernstein2(s, i) * bernstein2(t, j) * bernstein2(u, k);
                result += w * latticeD[(i * 3 + j) * 3 + k].xyz;
            }
        }
    }
    return result;
}
PARITY_ENTRY(latticeParity, latticeF, latticeP)

// Brown-Conrady lens distortion of camera space; depth is kept.
struct RadialParams { float k1; float k2; float k3; float p1; float p2; };
[[vk::binding(9, 0)]] ConstantBuffer<RadialParams> radialP;

[Differentiable]
float3 radialDistortionF(float3 p, RadialParams q)
{
    float u = p.x / p.z;
    float v = p.y / p.z;
    float r2 = u * u + v * v;
    float radial = 1.0 + r2 * (q.k1 + r2 * (q.k2 + r2 * q.k3));
    float du = 2.0 * q.p1 * u * v + q.p2 * (r2 + 2.0 * u * u);
    float dv = q.p1 * (r2 + 2.0 * v * v) + 2.0 * q.p2 * u * v;
    return float3((u * radial + du) * p.z, (v * radial + dv) * p.z, p.z);
}
PARITY_ENTRY(radialDistortionParity, radialDistortionF, radialP)

// A 1D velocity model v(z) = v0 + g z: two-way time to depth.
struct VelocityParams { float v0; float g; };
[[vk::binding(10, 0)]] ConstantBuffer<VelocityParams> velocityP;

[Differentiable]
float3 velocityModelF(float3 p, VelocityParams q)
{
    float x = 0.5 * q.g * p.z;
    bool small = abs(x) < 1e-3;
    float safe = small ? 1.0 : x;
    float f = small ? 1.0 + x * (0.5 + x * (1.0 / 6.0 + x / 24.0)) : (exp(x) - 1.0) / safe;
    return float3(p.x, p.y, 0.5 * q.v0 * p.z * f);
}
PARITY_ENTRY(velocityModelParity, velocityModelF, velocityP)

// Corridor unroll over up to 8 elements: `corridorE` holds two float4 per
// element, (start station, x, y, curvature) and (cos, sin of the heading, 0,
// 0); `end` is the end station, point and heading's cosine and sine.
struct CorridorParams
{
    uint count;
    float se; float xe; float ye; float ce; float ne;
};
[[vk::binding(11, 0)]] ConstantBuffer<CorridorParams> corridorP;
[[vk::binding(12, 0)]] StructuredBuffer<float4> corridorE;

[Differentiable]
float3 corridorUnrollF(float3 p, CorridorParams q)
{
    float st = p.x;
    float4 first = corridorE[0];
    float4 firstDir = corridorE[1];
    float2 pos;
    float2 tangent;
    if (st < first.x)
    {
        pos = first.yz + (st - first.x) * firstDir.xy;
        tangent = firstDir.xy;
    }
    else if (st >= q.se)
    {
        pos = float2(q.xe, q.ye) + (st - q.se) * float2(q.ce, q.ne);
        tangent = float2(q.ce, q.ne);
    }
    else
    {
        uint pick = 0u;
        [ForceUnroll]
        for (uint i = 1u; i < 8u; i++)
        {
            if (i < q.count && st >= corridorE[2u * i].x)
            {
                pick = i;
            }
        }
        float4 e = corridorE[2u * pick];
        float4 dir = corridorE[2u * pick + 1u];
        float u = st - e.x;
        if (e.w == 0.0)
        {
            pos = e.yz + u * dir.xy;
            tangent = dir.xy;
        }
        else
        {
            float ca = cos(e.w * u);
            float sa = sin(e.w * u);
            pos = float2(
                e.y + (dir.y * (ca - 1.0) + dir.x * sa) / e.w,
                e.z - (dir.x * (ca - 1.0) - dir.y * sa) / e.w);
            tangent = float2(dir.x * ca - dir.y * sa, dir.y * ca + dir.x * sa);
        }
    }
    return float3(pos.x - p.y * tangent.y, pos.y + p.y * tangent.x, p.z);
}
PARITY_ENTRY(corridorUnrollParity, corridorUnrollF, corridorP)

// The exaggeration lift along an ellipsoid's normals (the radii are fields,
// where the TS descriptor bakes them): the foot by 5 Newton steps, then
// p + (factor - 1) g(h) n with the blended profile g.
struct ExaggerationParams
{
    float factor; float ceiling; float baseHeight; float band;
    float rx; float ry; float rz;
};
[[vk::binding(13, 0)]] ConstantBuffer<ExaggerationParams> exaggerationP;

[Differentiable]
float3 exaggerationF(float3 p, ExaggerationParams q)
{
    float3 os = float3(1.0 / (q.rx * q.rx), 1.0 / (q.ry * q.ry), 1.0 / (q.rz * q.rz));
    float3 p2 = p * p * os;
    float lam = (sqrt(p2.x + p2.y + p2.z) - 1.0) / ((os.x + os.y + os.z) / 3.0);
    [ForceUnroll]
    for (int i = 0; i < 5; i++)
    {
        float3 a = 1.0 / (1.0 + lam * os);
        float f = dot(p2, a * a) - 1.0;
        float den = dot(p2 * a * a * a, os);
        lam = lam + f / (2.0 * den);
    }
    float3 g = p * os / (1.0 + lam * os);
    float gl = length(g);
    float3 n = g / gl;
    float h = lam * gl;
    float a0 = q.ceiling - q.band;
    float u = min(max(h - a0, 0.0), q.band);
    float lift = min(h, a0) - q.baseHeight + u - u * u / (2.0 * q.band);
    return p + (q.factor - 1.0) * lift * n;
}
PARITY_ENTRY(exaggerationParity, exaggerationF, exaggerationP)
