// The image-based lighting reference (plan §4.2): for each pixel of a
// camera's view of analytic spheres, the light reflected toward the camera
// from an environment cube, integrated by Monte Carlo with the glTF
// specification's BRDF (Appendix B: Lambertian diffuse and GGX specular
// with Smith height-correlated visibility, Schlick Fresnel, mixed by
// metallic) and no approximation: no spherical harmonics, no prefiltering,
// no split sum. Directions are sampled from the cosine lobe and the GGX
// distribution of visible normals (Heitz 2018), combined with the balance
// heuristic. No occlusion between spheres, as 2.0's IBL has none.

struct Params {
  uint width;
  uint height;
  uint samples;
  uint seed;
  // Camera basis (world), and tan of the half field of view.
  float3 direction;
  float tanX;
  float3 up;
  float tanY;
  float3 right;
  uint sphereCount;
  // World → environment frame (rows), as 2.0's iblFrame.
  float3 env0;
  float pad0;
  float3 env1;
  float pad1;
  float3 env2;
  float pad2;
};

struct Sphere {
  // Center relative to the camera, and radius.
  float3 center;
  float radius;
  float3 baseColor;
  float metallic;
  float roughness;
  float pad0;
  float pad1;
  float pad2;
};

[[vk::binding(0, 0)]] ConstantBuffer<Params> params;
[[vk::binding(1, 0)]] StructuredBuffer<Sphere> spheres;
[[vk::binding(2, 0)]] TextureCube<float4> environment;
[[vk::binding(3, 0)]] SamplerState environmentSampler;
// rgb: summed radiance; a: 1 where a sphere was hit.
[[vk::binding(4, 0)]] RWStructuredBuffer<float4> accum;

static const float PI = 3.14159265358979;

uint pcg(uint v) {
  uint state = v * 747796405u + 2891336453u;
  uint word = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
  return (word >> 22u) ^ word;
}

struct Rng {
  uint state;

  [mutating]
  float next() {
    state = pcg(state);
    return float(state >> 8u) * (1.0 / 16777216.0);
  }
};

float3 radiance(float3 d) {
  float3 e = float3(dot(d, params.env0), dot(d, params.env1), dot(d, params.env2));
  return environment.SampleLevel(environmentSampler, e, 0.0).rgb;
}

// An orthonormal frame around n (Duff et al. 2017), as vectors rather
// than a matrix: WGSL's matrix literals are columns, Slang's rows.
struct Frame {
  float3 t;
  float3 b;
  float3 n;

  float3 toWorld(float3 l) {
    return t * l.x + b * l.y + n * l.z;
  }
  float3 toLocal(float3 w) {
    return float3(dot(t, w), dot(b, w), dot(n, w));
  }
};

Frame basis(float3 n) {
  float s = n.z >= 0.0 ? 1.0 : -1.0;
  float a = -1.0 / (s + n.z);
  float b = n.x * n.y * a;
  Frame f;
  f.t = float3(1.0 + s * n.x * n.x * a, s * b, -s * n.x);
  f.b = float3(b, s + n.y * n.y * a, -n.y);
  f.n = n;
  return f;
}

float ggx(float alpha, float nDotH) {
  float a2 = alpha * alpha;
  float f = (nDotH * a2 - nDotH) * nDotH + 1.0;
  return a2 / (PI * f * f);
}

float smithG1(float alpha, float nDotX) {
  float a2 = alpha * alpha;
  return 2.0 * nDotX / (nDotX + sqrt(a2 + (1.0 - a2) * nDotX * nDotX));
}

float smithVisibility(float alpha, float nDotL, float nDotV) {
  float a2 = alpha * alpha;
  float ggxV = nDotL * sqrt(nDotV * nDotV * (1.0 - a2) + a2);
  float ggxL = nDotV * sqrt(nDotL * nDotL * (1.0 - a2) + a2);
  return 0.5 / max(ggxV + ggxL, 1e-12);
}

// A visible normal in the local frame (z = n), Heitz 2018.
float3 sampleVisibleNormal(float3 v, float alpha, float u1, float u2) {
  float3 vh = normalize(float3(alpha * v.x, alpha * v.y, v.z));
  float lensq = vh.x * vh.x + vh.y * vh.y;
  float3 t1 = lensq > 0.0 ? float3(-vh.y, vh.x, 0.0) / sqrt(lensq) : float3(1.0, 0.0, 0.0);
  float3 t2 = cross(vh, t1);
  float r = sqrt(u1);
  float phi = 2.0 * PI * u2;
  float p1 = r * cos(phi);
  float p2 = r * sin(phi);
  float s = 0.5 * (1.0 + vh.z);
  p2 = (1.0 - s) * sqrt(1.0 - p1 * p1) + s * p2;
  float3 nh = p1 * t1 + p2 * t2 + sqrt(max(0.0, 1.0 - p1 * p1 - p2 * p2)) * vh;
  return normalize(float3(alpha * nh.x, alpha * nh.y, max(0.0, nh.z)));
}

struct Material {
  float3 diffuse;
  float3 f0;
  float alpha;
};

// BRDF × cos θ (local frame, z = n).
float3 brdfCos(Material m, float3 v, float3 l) {
  if (l.z <= 0.0 || v.z <= 0.0) {
    return float3(0.0);
  }
  float3 h = normalize(v + l);
  float vDotH = max(dot(v, h), 0.0);
  float x = 1.0 - vDotH;
  float3 fresnel = m.f0 + (1.0 - m.f0) * (x * x * x * x * x);
  float3 specular = fresnel * ggx(m.alpha, h.z) * smithVisibility(m.alpha, l.z, v.z);
  float3 diffuse = (1.0 - fresnel) * m.diffuse / PI;
  return (diffuse + specular) * l.z;
}

// The two strategies' densities for a direction l (solid angle).
float pdfCosine(float3 l) {
  return max(l.z, 0.0) / PI;
}

float pdfVisibleNormal(Material m, float3 v, float3 l) {
  if (l.z <= 0.0) {
    return 0.0;
  }
  float3 h = normalize(v + l);
  float vDotH = dot(v, h);
  if (vDotH <= 0.0) {
    return 0.0;
  }
  // D_v(h) / (4 v·h), D_v(h) = G1(v) max(0, v·h) D(h) / v.z.
  return smithG1(m.alpha, v.z) * ggx(m.alpha, h.z) / (4.0 * v.z);
}

[shader("compute")]
[numthreads(8, 8, 1)]
void main(uint3 id : SV_DispatchThreadID) {
  if (id.x >= params.width || id.y >= params.height) {
    return;
  }
  uint index = id.y * params.width + id.x;
  // The pixel's ray, as 2.0's camera projects (pixel centers, y down).
  float2 ndc = float2(
      (float(id.x) + 0.5) / float(params.width) * 2.0 - 1.0,
      1.0 - (float(id.y) + 0.5) / float(params.height) * 2.0);
  float3 ray = normalize(params.direction + ndc.x * params.tanX * params.right +
                         ndc.y * params.tanY * params.up);
  float nearest = 1e30;
  int hit = -1;
  for (uint i = 0u; i < params.sphereCount; i++) {
    Sphere s = spheres[i];
    float b = dot(ray, s.center);
    float c = dot(s.center, s.center) - s.radius * s.radius;
    float disc = b * b - c;
    if (disc >= 0.0) {
      float t = b - sqrt(disc);
      if (t > 0.0 && t < nearest) {
        nearest = t;
        hit = int(i);
      }
    }
  }
  if (hit < 0) {
    return;
  }
  Sphere s = spheres[hit];
  float3 n = normalize(ray * nearest - s.center);
  Frame frame = basis(n);
  float3 v = frame.toLocal(-ray);
  Material m;
  m.diffuse = s.baseColor * (1.0 - s.metallic);
  m.f0 = lerp(float3(0.04), s.baseColor, s.metallic);
  m.alpha = max(s.roughness * s.roughness, 1e-3);

  Rng rng;
  rng.state = pcg(index * 7919u + params.seed * 104729u + 1u);
  float3 sum = float3(0.0);
  for (uint k = 0u; k < params.samples; k++) {
    // Cosine sample.
    float u1 = rng.next();
    float phi = 2.0 * PI * rng.next();
    float r = sqrt(u1);
    float3 lc = float3(r * cos(phi), r * sin(phi), sqrt(max(0.0, 1.0 - u1)));
    float pc = pdfCosine(lc) + pdfVisibleNormal(m, v, lc);
    if (pc > 0.0) {
      sum += brdfCos(m, v, lc) * radiance(frame.toWorld(lc)) / pc;
    }
    // Visible-normal sample.
    float g1 = rng.next();
    float g2 = rng.next();
    float3 h = sampleVisibleNormal(v, m.alpha, g1, g2);
    float3 lg = reflect(-v, h);
    float pg = pdfCosine(lg) + pdfVisibleNormal(m, v, lg);
    if (lg.z > 0.0 && pg > 0.0) {
      sum += brdfCos(m, v, lg) * radiance(frame.toWorld(lg)) / pg;
    }
  }
  accum[index] += float4(sum, 1.0);
}
