// Image-based lighting, built on the GPU with compute shaders:
//   sky        — render the environment radiance into a cube map (the
//                procedural sky; the atmosphere renders its own, Sky.ts)
//   downsample — its mips, all six faces of a level per dispatch
//   prefilter  — GGX-prefiltered specular mips (roughness = mip / (levels - 1))
//   shFace     — per-face SH9 projection by workgroup reduction
//   shFinal    — sum the faces into irradiance coefficients (E/π form)
//   irradianceCube — diffuse irradiance (E/π) per normal, what shading reads
//   brdf       — split-sum BRDF lookup table (scale, bias)
//
// Directions are in the environment frame: x = east, y = up, z = -north
// (y-up, the same convention as CesiumJS 1.x's IBL reference frame).

static const float PI = 3.14159265358979;

struct SkyParams {
  float4 zenith;       // rgb radiance
  float4 horizon;
  float4 ground;
  float4 belowHorizon; // just below the horizon, blending to the ground
  uint size;           // face size of the target level
  uint level;          // mip level being written (prefilter)
  uint levels;         // total mip levels
  uint sampleCount;
};

[[vk::binding(0, 0)]] ConstantBuffer<SkyParams> params;

// Direction for texel (x, y) of cube face `face` (WebGPU/D3D layer order:
// +X, -X, +Y, -Y, +Z, -Z), sampled at texel centers.
float3 cubeDirection(uint face, uint x, uint y, uint size) {
  float u = (float(x) + 0.5) / float(size) * 2.0 - 1.0;
  float v = (float(y) + 0.5) / float(size) * 2.0 - 1.0;
  switch (face) {
  case 0u: return normalize(float3(1.0, -v, -u));
  case 1u: return normalize(float3(-1.0, -v, u));
  case 2u: return normalize(float3(u, 1.0, v));
  case 3u: return normalize(float3(u, -1.0, -v));
  case 4u: return normalize(float3(u, -v, 1.0));
  default: return normalize(float3(-u, -v, -1.0));
  }
}

// A cube texel's solid angle: (2/size)² / |p|³, p on the unit cube.
float texelSolidAngle(uint x, uint y, uint size) {
  float u = (float(x) + 0.5) / float(size) * 2.0 - 1.0;
  float v = (float(y) + 0.5) / float(size) * 2.0 - 1.0;
  return 4.0 / (float(size * size) * pow(1.0 + u * u + v * v, 1.5));
}

float3 skyRadiance(float3 d) {
  if (d.y >= 0.0) {
    float t = pow(1.0 - d.y, 3.0);
    return lerp(params.zenith.rgb, params.horizon.rgb, t);
  }
  float t = pow(1.0 + d.y, 6.0);
  return lerp(params.ground.rgb, params.belowHorizon.rgb, t);
}

// --- sky --------------------------------------------------------------------

[[vk::binding(0, 1)]] [[vk::image_format("rgba16f")]] WTexture2DArray<float4> skyTarget;

[shader("compute")]
[numthreads(8, 8, 1)]
void sky(uint3 id : SV_DispatchThreadID) {
  if (id.x >= params.size || id.y >= params.size) {
    return;
  }
  float3 d = cubeDirection(id.z, id.x, id.y, params.size);
  skyTarget.Store(id, float4(skyRadiance(d), 1.0));
}

// --- prefilter (GGX importance sampling, Karis 2013) -------------------------

[[vk::binding(1, 1)]] TextureCube<float4> source;
[[vk::binding(2, 1)]] SamplerState linearSampler;
[[vk::binding(3, 1)]] [[vk::image_format("rgba16f")]] WTexture2DArray<float4> prefilterTarget;

float2 hammersley(uint i, uint n) {
  uint bits = i;
  bits = (bits << 16u) | (bits >> 16u);
  bits = ((bits & 0x55555555u) << 1u) | ((bits & 0xAAAAAAAAu) >> 1u);
  bits = ((bits & 0x33333333u) << 2u) | ((bits & 0xCCCCCCCCu) >> 2u);
  bits = ((bits & 0x0F0F0F0Fu) << 4u) | ((bits & 0xF0F0F0F0u) >> 4u);
  bits = ((bits & 0x00FF00FFu) << 8u) | ((bits & 0xFF00FF00u) >> 8u);
  return float2(float(i) / float(n), float(bits) * 2.3283064365386963e-10);
}

float3 importanceSampleGgx(float2 xi, float3 n, float alpha) {
  float phi = 2.0 * PI * xi.x;
  float cosTheta = sqrt((1.0 - xi.y) / (1.0 + (alpha * alpha - 1.0) * xi.y));
  float sinTheta = sqrt(1.0 - cosTheta * cosTheta);
  float3 h = float3(sinTheta * cos(phi), sinTheta * sin(phi), cosTheta);
  float3 up = abs(n.z) < 0.999 ? float3(0.0, 0.0, 1.0) : float3(1.0, 0.0, 0.0);
  float3 tx = normalize(cross(up, n));
  float3 ty = cross(n, tx);
  return normalize(tx * h.x + ty * h.y + n * h.z);
}

[shader("compute")]
[numthreads(8, 8, 1)]
void prefilter(uint3 id : SV_DispatchThreadID) {
  if (id.x >= params.size || id.y >= params.size) {
    return;
  }
  float3 n = cubeDirection(id.z, id.x, id.y, params.size);
  float roughness = float(params.level) / float(max(params.levels - 1u, 1u));
  float3 color = float3(0.0);
  if (params.level == 0u) {
    color = source.SampleLevel(linearSampler, n, 0.0).rgb;
  } else {
    float alpha = roughness * roughness;
    float weight = 0.0;
    uint sourceSize, sourceHeight;
    source.GetDimensions(sourceSize, sourceHeight);
    for (uint i = 0u; i < params.sampleCount; i++) {
      float3 h = importanceSampleGgx(hammersley(i, params.sampleCount), n, alpha);
      float3 l = normalize(2.0 * dot(n, h) * h - n);
      float nDotL = dot(n, l);
      if (nDotL > 0.0) {
        // Sample a blurrier source level where the sample density is low
        // (filtered importance sampling) to avoid fireflies.
        float nDotH = max(dot(n, h), 0.0);
        float a2 = alpha * alpha;
        float d = a2 / (PI * pow(nDotH * nDotH * (a2 - 1.0) + 1.0, 2.0));
        float pdf = d * 0.25 + 1e-4;
        float texelAngle = 4.0 * PI / (6.0 * float(sourceSize) * float(sourceSize));
        float sampleAngle = 1.0 / (float(params.sampleCount) * pdf);
        float lod = max(0.5 * log2(sampleAngle / texelAngle) + 1.0, 0.0);
        color += source.SampleLevel(linearSampler, l, lod).rgb * nDotL;
        weight += nDotL;
      }
    }
    color /= max(weight, 1e-4);
  }
  prefilterTarget.Store(id, float4(color, 1.0));
}

// --- SH9 projection ---------------------------------------------------------

[[vk::binding(4, 1)]] Texture2DArray<float4> shSource;
[[vk::binding(5, 1)]] RWStructuredBuffer<float4> shPartial; // 6 faces × 9
[[vk::binding(6, 1)]] RWStructuredBuffer<float4> shOut;     // 9, E/π form

groupshared float3 partialSums[64][9];

float shBasis(float3 d, uint k) {
  switch (k) {
  case 0u: return 0.282095;
  case 1u: return 0.488603 * d.y;
  case 2u: return 0.488603 * d.z;
  case 3u: return 0.488603 * d.x;
  case 4u: return 1.092548 * d.x * d.y;
  case 5u: return 1.092548 * d.y * d.z;
  case 6u: return 0.315392 * (3.0 * d.z * d.z - 1.0);
  case 7u: return 1.092548 * d.x * d.z;
  default: return 0.546274 * (d.x * d.x - d.y * d.y);
  }
}

// The nine sums unrolled (constant indices): a small array indexed in a
// loop stayed out of registers on Metal (plan §3.4, the adapt kernel).
[shader("compute")]
[numthreads(64, 1, 1)]
void shFace(uint lid : SV_GroupIndex, uint3 wg : SV_GroupID) {
  uint face = wg.x;
  uint size, height, layers;
  shSource.GetDimensions(size, height, layers);
  float3 sum[9];
  [ForceUnroll]
  for (uint k = 0u; k < 9u; k++) {
    sum[k] = float3(0.0);
  }
  for (uint t = lid; t < size * size; t += 64u) {
    uint x = t % size;
    uint y = t / size;
    float3 d = cubeDirection(face, x, y, size);
    float solidAngle = texelSolidAngle(x, y, size);
    float3 radiance = shSource.Load(int4(int(x), int(y), int(face), 0)).rgb;
    [ForceUnroll]
    for (uint k = 0u; k < 9u; k++) {
      sum[k] += radiance * shBasis(d, k) * solidAngle;
    }
  }
  [ForceUnroll]
  for (uint k = 0u; k < 9u; k++) {
    partialSums[lid][k] = sum[k];
  }
  GroupMemoryBarrierWithGroupSync();
  for (uint stride = 32u; stride > 0u; stride >>= 1u) {
    if (lid < stride) {
      [ForceUnroll]
      for (uint k = 0u; k < 9u; k++) {
        partialSums[lid][k] += partialSums[lid + stride][k];
      }
    }
    GroupMemoryBarrierWithGroupSync();
  }
  if (lid == 0u) {
    [ForceUnroll]
    for (uint k = 0u; k < 9u; k++) {
      shPartial[face * 9u + k] = float4(partialSums[0][k], 0.0);
    }
  }
}

// Ramamoorthi & Hanrahan 2001: irradiance E(n) from radiance SH, rewritten
// for evaluation as
//   c0 + c1·y + c2·z + c3·x + c4·xy + c5·yz + c6·(3z²−1) + c7·xz + c8·(x²−y²)
// and divided by π, so shading multiplies it by the diffuse albedo directly
// (the same form as CesiumJS 1.x's czm_sphericalHarmonics).
[shader("compute")]
[numthreads(1, 1, 1)]
void shFinal() {
  float3 L[9];
  [ForceUnroll]
  for (uint k = 0u; k < 9u; k++) {
    L[k] = float3(0.0);
    [ForceUnroll]
    for (uint f = 0u; f < 6u; f++) {
      L[k] += shPartial[f * 9u + k].xyz;
    }
  }
  float c1 = 0.429043;
  float c2 = 0.511664;
  float c3 = 0.743125;
  float c4 = 0.886227;
  float s = 1.0 / PI;
  shOut[0] = float4(c4 * L[0] * s, 0.0);
  shOut[1] = float4(2.0 * c2 * L[1] * s, 0.0);
  shOut[2] = float4(2.0 * c2 * L[2] * s, 0.0);
  shOut[3] = float4(2.0 * c2 * L[3] * s, 0.0);
  shOut[4] = float4(2.0 * c1 * L[4] * s, 0.0);
  shOut[5] = float4(2.0 * c1 * L[5] * s, 0.0);
  shOut[6] = float4(c3 / 3.0 * L[6] * s, 0.0);
  shOut[7] = float4(2.0 * c1 * L[7] * s, 0.0);
  shOut[8] = float4(c1 * L[8] * s, 0.0);
}

// --- irradiance cube (diffuse light, exact up to texel resolution) ---------------

// E(n)/π for each texel's normal n: the cosine-weighted integral of the
// radiance over the sphere, from a 16 × 16 level of the radiance cube, by
// brute force (1,536 source texels per output texel). Unlike the SH it
// keeps a sharp horizon: no light leaks from a bright ground into a dark
// sky's half, or the reverse (SH9 is 4-6% high on the ground under a clear
// sky, 27% at 10 km, and rings into negative colors from orbit).
//
// Every thread of a workgroup reads every source texel: they are staged
// in workgroup memory a chunk at a time (each texel's radiance, direction
// and solid angle, loaded and computed once a workgroup, not once a
// thread), summed in the same order as one at a time.

[[vk::binding(8, 1)]] Texture2DArray<float4> irradianceSource;
[[vk::binding(9, 1)]] [[vk::image_format("rgba16f")]] WTexture2DArray<float4> irradianceTarget;

static const uint IRRADIANCE_CHUNK = 256u; // a 16 × 16 face
groupshared float3 chunkRadiance[IRRADIANCE_CHUNK];
groupshared float4 chunkDirection[IRRADIANCE_CHUNK]; // xyz, solid angle

[shader("compute")]
[numthreads(8, 8, 1)]
void irradianceCube(uint3 id : SV_DispatchThreadID, uint lane : SV_GroupIndex) {
  uint size, height, layers;
  irradianceTarget.GetDimensions(size, height, layers);
  // No early return: every thread helps stage the chunks.
  bool inside = id.x < size && id.y < size;
  float3 n = cubeDirection(id.z, min(id.x, size - 1u), min(id.y, size - 1u), size);
  uint sourceSize, sourceHeight, sourceLayers;
  irradianceSource.GetDimensions(sourceSize, sourceHeight, sourceLayers);
  uint texels = sourceSize * sourceSize;
  float3 sum = float3(0.0);
  for (uint face = 0u; face < 6u; face++) {
    for (uint base = 0u; base < texels; base += IRRADIANCE_CHUNK) {
      uint count = min(IRRADIANCE_CHUNK, texels - base);
      for (uint t = lane; t < count; t += 64u) {
        uint x = (base + t) % sourceSize;
        uint y = (base + t) / sourceSize;
        chunkRadiance[t] = irradianceSource.Load(int4(int(x), int(y), int(face), 0)).rgb;
        chunkDirection[t] = float4(cubeDirection(face, x, y, sourceSize),
                                   texelSolidAngle(x, y, sourceSize));
      }
      GroupMemoryBarrierWithGroupSync();
      for (uint t = 0u; t < count; t++) {
        float4 d = chunkDirection[t];
        float cosine = dot(n, d.xyz);
        if (cosine > 0.0) {
          sum += chunkRadiance[t] * cosine * d.w;
        }
      }
      GroupMemoryBarrierWithGroupSync();
    }
  }
  if (inside) {
    irradianceTarget.Store(id, float4(sum / PI, 1.0));
  }
}

// --- BRDF LUT (split sum: scale and bias of F0) -------------------------------

[[vk::binding(7, 1)]] [[vk::image_format("rgba16f")]] WTexture2D<float4> brdfTarget;

// --- the sky cube's mips ----------------------------------------------------------

[[vk::binding(10, 1)]] Texture2DArray<float4> mipSource;
[[vk::binding(11, 1)]] [[vk::image_format("rgba16f")]] WTexture2DArray<float4> mipTarget;

// A level from the one above: the mean of each 2 × 2, every face at once.
// A render pass per face and level (42 for the 128² cube) cost 2.2 ms of
// GPU time, nearly all of it the passes' own overhead.
[shader("compute")]
[numthreads(8, 8, 1)]
void downsample(uint3 id : SV_DispatchThreadID) {
  uint size, height, layers;
  mipTarget.GetDimensions(size, height, layers);
  if (id.x >= size || id.y >= size) {
    return;
  }
  int2 s = int2(id.xy) * 2;
  int z = int(id.z);
  float4 sum = mipSource.Load(int4(s, z, 0)) + mipSource.Load(int4(s + int2(1, 0), z, 0)) +
               mipSource.Load(int4(s + int2(0, 1), z, 0)) + mipSource.Load(int4(s + int2(1, 1), z, 0));
  mipTarget.Store(id, sum * 0.25);
}

[shader("compute")]
[numthreads(8, 8, 1)]
void brdf(uint3 id : SV_DispatchThreadID) {
  uint width, height;
  brdfTarget.GetDimensions(width, height);
  if (id.x >= width || id.y >= height) {
    return;
  }
  float nDotV = max((float(id.x) + 0.5) / float(width), 1e-4);
  float roughness = (float(id.y) + 0.5) / float(height);
  float alpha = roughness * roughness;
  float3 v = float3(sqrt(1.0 - nDotV * nDotV), 0.0, nDotV);
  float3 n = float3(0.0, 0.0, 1.0);
  float a = 0.0;
  float b = 0.0;
  uint count = 512u;
  for (uint i = 0u; i < count; i++) {
    float3 h = importanceSampleGgx(hammersley(i, count), n, alpha);
    float3 l = normalize(2.0 * dot(v, h) * h - v);
    float nDotL = max(l.z, 0.0);
    float nDotH = max(h.z, 0.0);
    float vDotH = max(dot(v, h), 0.0);
    if (nDotL > 0.0) {
      // Height-correlated Smith visibility, as in the direct lighting.
      float a2 = alpha * alpha;
      float ggxV = nDotL * sqrt(nDotV * nDotV * (1.0 - a2) + a2);
      float ggxL = nDotV * sqrt(nDotL * nDotL * (1.0 - a2) + a2);
      float vis = 0.5 / max(ggxV + ggxL, 1e-6);
      float g = vis * 4.0 * nDotL * vDotH / max(nDotH, 1e-6);
      float fc = pow(1.0 - vDotH, 5.0);
      a += (1.0 - fc) * g;
      b += fc * g;
    }
  }
  brdfTarget.Store(id.xy, float4(a / float(count), b / float(count), 0.0, 1.0));
}
