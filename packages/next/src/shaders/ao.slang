// Ambient occlusion: ground-truth ambient occlusion (GTAO; Jimenez et al.
// 2016, in the form of Intel's XeGTAO) from the view's depth and normal
// prepass, at half resolution (one pixel of each 2 × 2). Per pixel, two
// slices through the view direction at angles set by interleaved gradient
// noise; along each, the highest horizon on either side within a world
// radius (6 steps a side, in full-resolution pixels), and the
// cosine-weighted visible arc between them, integrated exactly. Then, per
// full-resolution pixel, a depth-aware 3 × 3 of the half-resolution result
// (upsampling and blurring the noise at once), written to a buffer the
// opaque pass reads (4 pixels a word, 8 bits each), where it occludes the
// environment's light. Full resolution with a 5 × 5 blur took 13 ms at 2.6
// megapixels.
//
// Positions are camera-relative, rebuilt from reverse-Z depth: a pixel's
// distance along the view is near / depth.

struct AoParams {
  float4 right;    // camera right (xyz); w: tan of the half field of view, x
  float4 up;       // camera up (xyz); w: the same, y
  float4 forward;  // camera forward (xyz); w: near plane, m
  float4 size;     // width, height (pixels); radius, m; largest radius, pixels
};

[[vk::binding(0, 0)]] ConstantBuffer<AoParams> params;
[[vk::binding(1, 0)]] DepthTexture2D depthTexture;
[[vk::binding(2, 0)]] Texture2D<float4> normalTexture;
[[vk::binding(3, 0)]] [[vk::image_format("r32f")]] WTexture2D<float> rawAo;

// The blur's own (each entry point's layout holds what it uses).
[[vk::binding(4, 0)]] Texture2D<float> rawInput;
[[vk::binding(5, 0)]] RWStructuredBuffer<uint> aoWords;

static const float PI = 3.14159265358979;
static const uint SLICES = 2u;
static const uint STEPS = 6u;

float distanceAt(float depth, float near) {
  return near / max(depth, 1e-30);
}

float3 positionAt(float2 pixel, float depth) {
  float2 ndc = float2(pixel.x / params.size.x * 2.0 - 1.0, 1.0 - pixel.y / params.size.y * 2.0);
  float3 ray = params.forward.xyz + params.right.xyz * (ndc.x * params.right.w) +
               params.up.xyz * (ndc.y * params.up.w);
  return ray * distanceAt(depth, params.forward.w);
}

// Jimenez's interleaved gradient noise.
float noise(float2 pixel) {
  return frac(52.9829189 * frac(dot(pixel, float2(0.06711056, 0.00583715))));
}

float fastAcos(float x) {
  float a = abs(x);
  float r = (-0.156583 * a + PI * 0.5) * sqrt(max(1.0 - a, 0.0));
  return x >= 0.0 ? r : PI - r;
}

float depthAt(uint2 p) {
  return depthTexture.Load(int3(int2(p), 0));
}

// A half-resolution pixel's slices. The samples go out to `size.w`
// pixels along random directions, so there's no neighborhood to share
// through workgroup memory: each thread reads its own.
[shader("compute")]
[numthreads(8, 8, 1)]
void gtao(uint3 id : SV_DispatchThreadID) {
  uint2 size = uint2(params.size.xy);
  uint2 full = id.xy * 2u;
  if (full.x >= size.x || full.y >= size.y) {
    return;
  }
  float depth = depthAt(full);
  // Nothing drawn (the sky): unoccluded.
  if (depth <= 0.0) {
    rawAo.Store(id.xy, 1.0);
    return;
  }
  float2 pixel = float2(full) + 0.5;
  float3 center = positionAt(pixel, depth);
  float3 normal = normalize(normalTexture.Load(int3(int2(full), 0)).xyz);
  float3 viewVec = normalize(-center);
  float radius = params.size.z;
  // The radius on screen: the focal length in pixels over the distance.
  float focal = params.size.y * 0.5 / params.up.w;
  float screenRadius = min(radius * focal / distanceAt(depth, params.forward.w), params.size.w);
  if (screenRadius < 1.0) {
    rawAo.Store(id.xy, 1.0);
    return;
  }
  float falloffRange = 0.615 * radius;
  float falloffFrom = radius * (1.0 - 0.615);
  float falloffMul = -1.0 / falloffRange;
  float falloffAdd = falloffFrom / falloffRange + 1.0;
  float jitterAngle = noise(pixel);
  float jitterStep = noise(pixel + float2(37.0, 17.0));
  float visibility = 0.0;
  for (uint s = 0u; s < SLICES; s++) {
    float phi = (float(s) + jitterAngle) / float(SLICES) * PI;
    float2 omega = float2(cos(phi), sin(phi));
    // The slice's direction in the scene (screen y is down).
    float3 direction = params.right.xyz * omega.x + params.up.xyz * omega.y;
    float2 screenDirection = float2(omega.x, -omega.y);
    float3 ortho = direction - viewVec * dot(direction, viewVec);
    float3 axis = normalize(cross(ortho, viewVec));
    float3 projected = normal - axis * dot(normal, axis);
    float projectedLength = length(projected);
    if (projectedLength < 1e-4) {
      visibility += 1.0;
      continue;
    }
    float signN = sign(dot(ortho, projected));
    float cosN = clamp(dot(projected, viewVec) / projectedLength, -1.0, 1.0);
    float n = signN * fastAcos(cosN);
    float low0 = cos(n + PI * 0.5);
    float low1 = cos(n - PI * 0.5);
    float horizon0 = low0;
    float horizon1 = low1;
    for (uint k = 0u; k < STEPS; k++) {
      // Quadratic steps: denser near the pixel.
      float t = (float(k) + jitterStep) / float(STEPS);
      float2 offset = screenDirection * max(t * t * screenRadius, 1.0);
      float2 p0 = pixel + offset;
      float2 p1 = pixel - offset;
      if (all(p0 >= float2(0.0)) && all(p0 < params.size.xy)) {
        float d0 = depthAt(uint2(p0));
        if (d0 > 0.0) {
          float3 delta = positionAt(floor(p0) + 0.5, d0) - center;
          float distance = length(delta);
          float weight = clamp(distance * falloffMul + falloffAdd, 0.0, 1.0);
          horizon0 = max(horizon0, lerp(low0, dot(delta / distance, viewVec), weight));
        }
      }
      if (all(p1 >= float2(0.0)) && all(p1 < params.size.xy)) {
        float d1 = depthAt(uint2(p1));
        if (d1 > 0.0) {
          float3 delta = positionAt(floor(p1) + 0.5, d1) - center;
          float distance = length(delta);
          float weight = clamp(distance * falloffMul + falloffAdd, 0.0, 1.0);
          horizon1 = max(horizon1, lerp(low1, dot(delta / distance, viewVec), weight));
        }
      }
    }
    float h0 = -fastAcos(horizon1);
    float h1 = fastAcos(horizon0);
    h0 = n + clamp(h0 - n, -PI * 0.5, PI * 0.5);
    h1 = n + clamp(h1 - n, -PI * 0.5, PI * 0.5);
    float sinN = sin(n);
    float arc0 = (cosN + 2.0 * h0 * sinN - cos(2.0 * h0 - n)) * 0.25;
    float arc1 = (cosN + 2.0 * h1 * sinN - cos(2.0 * h1 - n)) * 0.25;
    visibility += projectedLength * (arc0 + arc1);
  }
  rawAo.Store(id.xy, clamp(visibility / float(SLICES), 0.0, 1.0));
}

// The upsample and blur: the 3 × 3 half-resolution pixels around each
// pixel, each weighted by how close its distance is to the pixel's (no
// occlusion bleeding across depth edges). Four pixels of a row per thread,
// packed into one word. A workgroup's 32 × 8 pixels read 18 × 6
// half-resolution ones: each is read once, into workgroup memory (its
// raw occlusion, and the distance at its full-resolution pixel, -1 where
// nothing is drawn), not up to 18 times.
static const int TILE_X = 18; // 16 half-resolution columns and one each side
static const int TILE_Y = 6;  // 4 rows and one each side
groupshared float tileDistance[TILE_Y][TILE_X];
groupshared float tileAo[TILE_Y][TILE_X];

[shader("compute")]
[numthreads(8, 8, 1)]
void denoise(uint3 id : SV_DispatchThreadID, uint3 group : SV_GroupID, uint lane : SV_GroupIndex) {
  int2 size = int2(params.size.xy);
  int2 half = (size + 1) / 2;
  int2 origin = int2(group.xy) * int2(16, 4) - 1;
  for (uint t = lane; t < uint(TILE_X * TILE_Y); t += 64u) {
    int2 at = int2(int(t) % TILE_X, int(t) / TILE_X);
    int2 q = clamp(origin + at, int2(0), half - 1);
    float d = depthTexture.Load(int3(min(q * 2, size - 1), 0));
    tileDistance[at.y][at.x] = d > 0.0 ? params.forward.w / max(d, 1e-30) : -1.0;
    tileAo[at.y][at.x] = rawInput.Load(int3(q, 0));
  }
  GroupMemoryBarrierWithGroupSync();
  int words = (size.x + 3) / 4;
  if (int(id.x) >= words || int(id.y) >= size.y) {
    return;
  }
  uint packed = 0u;
  for (int i = 0; i < 4; i++) {
    int2 p = int2(int(id.x) * 4 + i, int(id.y));
    float ao = 1.0;
    if (p.x < size.x) {
      float depth = depthTexture.Load(int3(p, 0));
      if (depth > 0.0) {
        float distance = params.forward.w / depth;
        float sum = 0.0;
        float total = 0.0;
        int2 center = p / 2 - origin;
        for (int dy = -1; dy <= 1; dy++) {
          for (int dx = -1; dx <= 1; dx++) {
            int2 at = center + int2(dx, dy);
            float other = tileDistance[at.y][at.x];
            float w = other >= 0.0 ? 1.0 / (1.0 + 50.0 * abs(other - distance) / distance) : 0.0;
            sum += tileAo[at.y][at.x] * w;
            total += w;
          }
        }
        ao = sum / max(total, 1e-6);
      }
    }
    packed |= uint(round(clamp(ao, 0.0, 1.0) * 255.0)) << (8u * uint(i));
  }
  aoWords[uint(id.y) * uint(words) + id.x] = packed;
}
