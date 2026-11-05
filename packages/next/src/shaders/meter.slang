// Exposure meter for automatic exposure and the eye (plan §4.2): the
// average log2 luminance of a view's HDR image, in the scene's units (the
// image is pre-exposed; `exposure` is divided out), photopic (the cones')
// and scotopic (the rods': Larson, Rushmeier and Piatko 1997's estimate
// from XYZ), over the brighter part of it: a histogram of a 64 × 64 grid
// over the image, averaged between its 65th and 98th percentiles (as
// Unreal's eye adaptation does). The plain mean let what is dark weigh in:
// the night half of the Earth from orbit opened the exposure 10 stops and
// burned out the day half; the brightest 2% (the sun's glare, the Moon,
// lamps) is left out too. Center-weighted, as the eye adapts mostly to
// where it looks and cameras meter: the middle of the view counts up to
// four times its edges. Pixels with no scene light (alpha 0: the
// background, and unlit content, which isn't exposed) are left out.

struct MeterParams {
  float exposure;
  uint width;
  uint height;
  uint pad;
};

[[vk::binding(0, 0)]] Texture2D<float4> image;
[[vk::binding(1, 0)]] ConstantBuffer<MeterParams> params;
// x, y: photopic sum of log2 luminance and weight (in the band); z, w: the
// same, scotopic. One element.
[[vk::binding(2, 0)]] RWStructuredBuffer<float4> result;

static const uint GRID = 64u;
// log2 luminance from −24 to +24 (cd/m²), a third of a stop per bin.
static const uint BINS = 144u;
static const float LOW = -24.0;
static const float BIN_STOPS = 48.0 / 144.0;
static const float2 BAND = float2(0.65, 0.98);

groupshared Atomic<uint> photopic[BINS];
groupshared Atomic<uint> scotopic[BINS];

uint binOf(float luminance) {
  float stops = log2(max(luminance, 1e-7));
  return uint(clamp((stops - LOW) / BIN_STOPS, 0.0, float(BINS - 1u)));
}

// The walk through the bins is parallel: a thread a bin, each finding the
// pixels below its bin by a prefix sum (integers: exact) and its share of
// the band, then a tree sum of the shares. One thread walking the 144 bins
// took 2.4× the meter's time in the straight port.
static const uint THREADS = 256u;
groupshared uint2 below[THREADS];   // photopic, scotopic counts, scanned
groupshared float4 shares[THREADS];

// A bin's share of the band (the brighter part of the image, BAND): its
// log2 luminance at its center times its count within the band, and that
// count, given the counts below it and the total.
float2 share(uint b, float count, float under, float total) {
  float start = total * BAND.x;
  float end = total * BAND.y;
  float inBand = max(min(under + count, end) - max(under, start), 0.0);
  return float2((LOW + (float(b) + 0.5) * BIN_STOPS) * inBand, inBand);
}

[shader("compute")]
[numthreads(16, 16, 1)]
void main(uint index : SV_GroupIndex, uint3 local : SV_GroupThreadID) {
  for (uint b = index; b < BINS; b += 256u) {
    photopic[b].store(0u);
    scotopic[b].store(0u);
  }
  GroupMemoryBarrierWithGroupSync();
  for (uint gy = local.y; gy < GRID; gy += 16u) {
    for (uint gx = local.x; gx < GRID; gx += 16u) {
      float2 unit = (float2(float(gx), float(gy)) + 0.5) / float(GRID);
      uint2 pixel = uint2(min(uint(unit.x * float(params.width)), params.width - 1u),
                          min(uint(unit.y * float(params.height)), params.height - 1u));
      float4 color = image.Load(int3(int2(pixel), 0));
      if (color.a > 0.0) {
        float3 light = max(color.rgb, float3(0.0)) / params.exposure;
        float x = dot(light, float3(0.4124, 0.3576, 0.1805));
        float y = dot(light, float3(0.2126, 0.7152, 0.0722));
        float z = dot(light, float3(0.0193, 0.1192, 0.9505));
        float v = max(y * (1.33 * (1.0 + (y + z) / max(x, 1e-12)) - 1.68), 0.0);
        float2 d = unit * 2.0 - 1.0;
        uint weight = 1u + uint(3.0 * exp(-dot(d, d) / (2.0 * 0.35 * 0.35)) + 0.5);
        photopic[binOf(y)].add(weight);
        scotopic[binOf(v)].add(weight);
      }
    }
  }
  GroupMemoryBarrierWithGroupSync();
  uint2 counts = index < BINS ? uint2(photopic[index].load(), scotopic[index].load()) : uint2(0u);
  below[index] = counts;
  GroupMemoryBarrierWithGroupSync();
  // Inclusive prefix sum (Hillis–Steele).
  for (uint offset = 1u; offset < THREADS; offset *= 2u) {
    uint2 add = index >= offset ? below[index - offset] : uint2(0u);
    GroupMemoryBarrierWithGroupSync();
    below[index] += add;
    GroupMemoryBarrierWithGroupSync();
  }
  float2 total = float2(below[THREADS - 1u]);
  float2 under = float2(below[index] - counts);
  shares[index] = index < BINS
                      ? float4(share(index, float(counts.x), under.x, total.x),
                               share(index, float(counts.y), under.y, total.y))
                      : float4(0.0);
  GroupMemoryBarrierWithGroupSync();
  for (uint stride = THREADS / 2u; stride > 0u; stride /= 2u) {
    if (index < stride) {
      shares[index] += shares[index + stride];
    }
    GroupMemoryBarrierWithGroupSync();
  }
  if (index == 0u) {
    result[0] = shares[0];
  }
}
