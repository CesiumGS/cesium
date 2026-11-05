// The eye's local adaptation (View.ts `Exposure` "eye", scene/eye.ts): the
// eye adapts to the region it looks at, a few degrees across, not to the
// view as a whole. Adapting each pixel to a plain blur of the image's
// luminance haloes its edges (a bright street beside dark buildings glows
// where it meets them), so it adapts to its neighbors of about its own
// brightness: a bilateral grid (Chen, Paris and Durand 2007; local tone
// mapping as in Durand and Dorsey 2002). Each cell of 16 × 16 pixels sorts
// its pixels' log luminance into BINS levels around the view's adaptation
// and sums their log luminance, photopic (the cones') and scotopic (the
// rods'), and their count; the grid blurred over about 2 cells (a degree
// or two at ordinary fields of view) and a level; the present pass reads
// it at each pixel and its level (present `eyeSees`).

struct AdaptParams {
  float exposure;  // the image's pre-exposure
  float cones;     // the view's adaptation, log10 cd/m² (the grid's middle)
  float pad0;
  float pad1;
};

[[vk::binding(0, 0)]] Texture2D<float4> image;
[[vk::binding(1, 0)]] ConstantBuffer<AdaptParams> params;
[[vk::binding(2, 0)]] [[vk::image_format("rgba16f")]] WTexture3D<float4> grid;
[[vk::binding(3, 0)]] Texture3D<float4> gridIn;
[[vk::binding(4, 0)]] [[vk::image_format("rgba16f")]] WTexture3D<float4> blurred;

static const uint CELL = 16u;
static const uint BINS = 16u;
// The levels' span, log2 cd/m² either side of the view's adaptation;
// present `ADAPT_RANGE` the same.
static const float RANGE = 12.0;

uint level(float logY) {
  float center = params.cones / 0.30103;
  float t = (logY - (center - RANGE)) / (2.0 * RANGE);
  return uint(clamp(t * float(BINS), 0.0, float(BINS) - 1.0));
}

// A cell's levels: one workgroup a cell, one thread each of an 8 × 8 grid
// of its pixels. Each thread sorts its pixel into a level; then a thread a
// level sums that level's pixels, in the pixels' order. (Not a per-thread
// array of the levels indexed by each pixel's: whether a GPU compiler
// keeps that in registers is up to it, and Metal didn't for Slang's loops:
// 2.5× the time.) Dispatched a workgroup per cell (Engine "adaptation").
groupshared float3 samples[64];
groupshared uint levels[64];

[shader("compute")]
[numthreads(8, 8, 1)]
void reduce(uint3 cell : SV_GroupID, uint3 pixel : SV_GroupThreadID, uint lane : SV_GroupIndex) {
  uint3 size;
  grid.GetDimensions(size.x, size.y, size.z);
  if (cell.x >= size.x || cell.y >= size.y) {
    return; // the whole workgroup: `cell` is the same for all of it
  }
  uint2 imageSize;
  image.GetDimensions(imageSize.x, imageSize.y);
  uint2 p = min(cell.xy * CELL + pixel.xy * 2u + 1u, imageSize - 1u);
  float3 light = max(image.Load(int3(int2(p), 0)).rgb, float3(0.0)) / params.exposure;
  float x = dot(light, float3(0.4124, 0.3576, 0.1805));
  float y = dot(light, float3(0.2126, 0.7152, 0.0722));
  float z = dot(light, float3(0.0193, 0.1192, 0.9505));
  float v = max(y * (1.33 * (1.0 + (y + z) / max(x, 1e-12)) - 1.68), 0.0);
  float2 logs = log2(max(float2(y, v), float2(1e-7)));
  samples[lane] = float3(logs, 1.0) / 64.0;
  levels[lane] = level(logs.x);
  GroupMemoryBarrierWithGroupSync();
  if (lane >= BINS) {
    return;
  }
  float3 sum = float3(0.0);
  for (uint k = 0u; k < 64u; k++) {
    if (levels[k] == lane) {
      sum += samples[k];
    }
  }
  grid.Store(uint3(cell.xy, lane), float4(sum, 1.0));
}

// The grid blurred: a Gaussian over 7 × 7 cells (σ 2) and 3 levels. It is
// separable, so a workgroup (8 × 8 cells of a level) gathers its cells and
// 3 more each side once, the 3 levels weighted together, into shared
// memory, then blurs across and down: 9 texture reads a cell, not 147.
// Cells beyond the grid count as zeros (as skipping them).
static const int RADIUS = 3;
static const int TILE = 8 + 2 * RADIUS;
// exp(-d² / 8) for d = 0…3: a cell's weight is wx · wy (· the level's).
static const float WEIGHTS[4] = { 1.0, 0.8824969, 0.6065307, 0.3246525 };

groupshared float3 gathered[TILE][TILE];
groupshared float3 across[TILE][8];

[shader("compute")]
[numthreads(8, 8, 1)]
void blur(uint3 id : SV_DispatchThreadID, uint3 local : SV_GroupThreadID, uint lane : SV_GroupIndex) {
  uint3 size;
  blurred.GetDimensions(size.x, size.y, size.z);
  int2 origin = int2(id.xy - local.xy) - RADIUS;
  int z = int(id.z);
  for (uint t = lane; t < uint(TILE * TILE); t += 64u) {
    int2 at = int2(int(t) % TILE, int(t) / TILE);
    int2 p = origin + at;
    float3 sum = float3(0.0);
    if (all(p >= int2(0)) && all(p < int2(size.xy))) {
      sum = gridIn.Load(int4(p, z, 0)).xyz;
      if (z > 0) {
        sum += gridIn.Load(int4(p, z - 1, 0)).xyz * 0.5;
      }
      if (z + 1 < int(size.z)) {
        sum += gridIn.Load(int4(p, z + 1, 0)).xyz * 0.5;
      }
    }
    gathered[at.y][at.x] = sum;
  }
  GroupMemoryBarrierWithGroupSync();
  for (uint t = lane; t < uint(TILE * 8); t += 64u) {
    uint x = t % 8u;
    uint y = t / 8u;
    float3 sum = gathered[y][x + RADIUS] * WEIGHTS[0];
    for (int d = 1; d <= RADIUS; d++) {
      sum += (gathered[y][x + RADIUS - d] + gathered[y][x + RADIUS + d]) * WEIGHTS[d];
    }
    across[y][x] = sum;
  }
  GroupMemoryBarrierWithGroupSync();
  if (any(id >= size)) {
    return;
  }
  float3 sum = across[local.y + RADIUS][local.x] * WEIGHTS[0];
  for (int d = 1; d <= RADIUS; d++) {
    sum += (across[local.y + RADIUS - d][local.x] + across[local.y + RADIUS + d][local.x]) * WEIGHTS[d];
  }
  blurred.Store(id, float4(sum, 1.0));
}
