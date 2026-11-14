// The depth pyramid a view's tile queries test against (occlusionQuery.slang;
// plan Task 12, fix 7). Each texel holds the farthest depth of the block of
// pixels it covers: reverse-Z, so the farthest is the minimum, and the sky
// (depth 0) is the farthest of all, so a block with any sky in it hides
// nothing. Level 0 is half the frame, rounded down, and folds every sample of
// the multisampled depth; each further level folds 2 x 2 of the one before. An
// odd edge row or column is folded into the last texel, so a texel always
// covers every pixel its parent's block does (`min(p >> (level + 1), size - 1)`
// maps a pixel to its texel at a level, which occlusionQuery.slang relies on).
//
// Level 0 comes from the opaque pass's multisampled depth (`level0`), or from
// the single-sampled depth of the ambient-occlusion prepass (`level0Pixels`),
// which the view's occlusion cull builds it from when it has one
// (render/view/occlusionCull.ts). A single sample is the pixel's centre, and
// the image's samples lie within it: so that no sample sees farther than its
// texel says (a surface's edge passing between a centre and a sample), a
// level-0 texel there takes the farthest over its block and the pixels all
// round it, one deep.
//
// Loops are bounded by constants: a block is at most 3 x 3 texels (5 x 5
// pixels with the ring round it), and a multisampled depth has at most
// MAX_SAMPLES samples.

[[vk::binding(0, 0)]] DepthTexture2DMS depth;
[[vk::binding(0, 0)]] DepthTexture2D pixels;
[[vk::binding(1, 0)]] [[vk::image_format("r32f")]] WTexture2D<float> target0;

[[vk::binding(0, 0)]] Texture2D<float> source;
[[vk::binding(1, 0)]] [[vk::image_format("r32f")]] WTexture2D<float> target;

static const uint MAX_SAMPLES = 8u;

// The input texels of output texel `i` along an axis: [first, last], clamped.
uint2 blockOf(uint i, uint inputSize, uint outputSize) {
  uint first = i * 2u;
  uint last = first + 1u;
  if (i + 1u == outputSize && (inputSize & 1u) == 1u) {
    last = first + 2u;
  }
  return uint2(min(first, inputSize - 1u), min(last, inputSize - 1u));
}

// The farthest of a pixel's 4 samples: the engine's multisampling, unrolled.
float farthestOf4(int2 p) {
  return min(min(depth.Load(p, 0), depth.Load(p, 1)), min(depth.Load(p, 2), depth.Load(p, 3)));
}

[shader("compute")]
[numthreads(8, 8, 1)]
void level0(uint3 id : SV_DispatchThreadID) {
  uint width;
  uint height;
  uint samples;
  depth.GetDimensions(width, height, samples);
  uint outWidth;
  uint outHeight;
  target0.GetDimensions(outWidth, outHeight);
  if (id.x >= outWidth || id.y >= outHeight) {
    return;
  }
  uint2 bx = blockOf(id.x, width, outWidth);
  uint2 by = blockOf(id.y, height, outHeight);
  // The common case: 2 x 2 pixels of 4 samples, no loops.
  if (samples == 4u && bx.y == bx.x + 1u && by.y == by.x + 1u) {
    int2 p = int2(bx.x, by.x);
    float farthest = min(min(farthestOf4(p), farthestOf4(p + int2(1, 0))),
                         min(farthestOf4(p + int2(0, 1)), farthestOf4(p + int2(1, 1))));
    target0.Store(id.xy, farthest);
    return;
  }
  uint count = min(samples, MAX_SAMPLES);
  float farthest = 3.4e38;
  for (uint j = 0u; j < 3u; j++) {
    uint y = by.x + j;
    if (y > by.y) {
      break;
    }
    for (uint i = 0u; i < 3u; i++) {
      uint x = bx.x + i;
      if (x > bx.y) {
        break;
      }
      for (uint s = 0u; s < MAX_SAMPLES; s++) {
        if (s >= count) {
          break;
        }
        farthest = min(farthest, depth.Load(int2(x, y), s));
      }
    }
  }
  target0.Store(id.xy, farthest);
}

[shader("compute")]
[numthreads(8, 8, 1)]
void level0Pixels(uint3 id : SV_DispatchThreadID) {
  uint width;
  uint height;
  pixels.GetDimensions(width, height);
  uint outWidth;
  uint outHeight;
  target0.GetDimensions(outWidth, outHeight);
  if (id.x >= outWidth || id.y >= outHeight) {
    return;
  }
  uint2 bx = blockOf(id.x, width, outWidth);
  uint2 by = blockOf(id.y, height, outHeight);
  // The block and the ring of pixels round it, clamped to the frame.
  uint2 from = uint2(bx.x > 0u ? bx.x - 1u : 0u, by.x > 0u ? by.x - 1u : 0u);
  uint2 to = uint2(min(bx.y + 1u, width - 1u), min(by.y + 1u, height - 1u));
  float farthest = 3.4e38;
  for (uint j = 0u; j < 5u; j++) {
    uint y = from.y + j;
    if (y > to.y) {
      break;
    }
    for (uint i = 0u; i < 5u; i++) {
      uint x = from.x + i;
      if (x > to.x) {
        break;
      }
      farthest = min(farthest, pixels.Load(int3(x, y, 0)));
    }
  }
  target0.Store(id.xy, farthest);
}

[shader("compute")]
[numthreads(8, 8, 1)]
void reduce(uint3 id : SV_DispatchThreadID) {
  uint width;
  uint height;
  uint levels;
  source.GetDimensions(0u, width, height, levels);
  uint outWidth;
  uint outHeight;
  target.GetDimensions(outWidth, outHeight);
  if (id.x >= outWidth || id.y >= outHeight) {
    return;
  }
  uint2 bx = blockOf(id.x, width, outWidth);
  uint2 by = blockOf(id.y, height, outHeight);
  float farthest = 3.4e38;
  for (uint j = 0u; j < 3u; j++) {
    uint y = by.x + j;
    if (y > by.y) {
      break;
    }
    for (uint i = 0u; i < 3u; i++) {
      uint x = bx.x + i;
      if (x > bx.y) {
        break;
      }
      farthest = min(farthest, source.Load(int3(x, y, 0)));
    }
  }
  target.Store(id.xy, farthest);
}
