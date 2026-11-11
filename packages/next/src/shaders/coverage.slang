// The coverage kernel (CESIUM2_WEBGPU_PLAN.md §13.33, "Step 5 redirected",
// part 2): whether a point is inside a closed outline made of monotone
// quadratic pieces, by the winding number of a ray along +x, after Slug
// (Lengyel, "GPU-Centered Font Rendering Directly from Glyph Outlines",
// JCGT 2017). A b-rep face's trim (src/brep/gpuTrims.ts writes the data and
// has the float64 twin, `trimCovers`) is the first user; the vector design's
// fills are the next, over the same words.
//
// The data is horizontal bands of the outline's y extent, each listing the
// pieces that overlap it, the longest reach in x first. A piece is stored
// with y rising (y0 ≤ y1 ≤ y2) and a sign (+1 where the outline ran up), so
// it crosses the ray at y exactly when y0 ≤ y < y2 (half-open: a ray through
// a vertex counts one of the two pieces that meet there, and through a local
// extremum none or both with opposite signs), at the one t in [0, 1] where
// the quadratic y(t) = y: the roots in the stable pair (q / a and c / q), the
// one inside the interval. About 40 flops, one sqrt and two divisions a
// piece, a handful of pieces a band.
//
// The words (u32 unless f32), offsets from the data's first:
//   0 bands B   1 f32 B / extent in y   2 pieces   3 -
//   4 + 3 b: band b's list offset, count, constant winding (i32, for an empty band)
//   then the lists (each entry a piece's offset), then the pieces, 8 words:
//   f32 x0 y0 x1 y1 x2 y2, the largest of x0 x1 x2, the sign.
module coverage;

public static const uint COVERAGE_HEADER = 4u;
public static const uint COVERAGE_BAND_WORDS = 3u;
public static const uint COVERAGE_PIECE_WORDS = 8u;

// What a ray finds: the winding number to +x, and the distance in x to the
// nearest crossing on either side (not beyond `reach`: then it's 3e38).
public struct Crossings {
  public int winding;
  public float nearest;
};

// `words` is the buffer the data lives in (a slab's arena), `base` its first
// word, `p` the point in the outline's own coordinates and `reach` how far
// either side of p the nearest crossing is wanted.
public Crossings crossings(StructuredBuffer<float> words, uint base, float2 p, float reach) {
  Crossings result;
  result.winding = 0;
  result.nearest = 3.0e38;
  uint bands = asuint(words[base]);
  float scale = words[base + 1u];
  int band = clamp(int(floor(p.y * scale)), 0, int(bands) - 1);
  uint record = base + COVERAGE_HEADER + uint(band) * COVERAGE_BAND_WORDS;
  uint list = base + asuint(words[record]);
  uint count = asuint(words[record + 1u]);
  if (count == 0u) {
    result.winding = asint(words[record + 2u]);
    return result;
  }
  for (uint i = 0u; i < count; i++) {
    uint s = base + asuint(words[list + i]);
    if (words[s + 6u] < p.x - reach) {
      break;
    }
    float y0 = words[s + 1u] - p.y;
    float y2 = words[s + 5u] - p.y;
    if (y0 > 0.0 || y2 <= 0.0) {
      continue;
    }
    float y1 = words[s + 3u] - p.y;
    float a = y0 - 2.0 * y1 + y2;
    float b = y0 - y1;
    float d = sqrt(max(b * b - a * y0, 0.0));
    float q = b + (b < 0.0 ? -d : d);
    float t1 = abs(a) > 1.0e-30 ? q / a : 1.0e30;
    float t2 = q != 0.0 ? y0 / q : 0.0;
    float e1 = abs(t1 - clamp(t1, 0.0, 1.0));
    float e2 = abs(t2 - clamp(t2, 0.0, 1.0));
    float t = clamp(e1 <= e2 ? t1 : t2, 0.0, 1.0);
    float r = 1.0 - t;
    float x = r * r * (words[s] - p.x) + 2.0 * r * t * (words[s + 2u] - p.x) + t * t * (words[s + 4u] - p.x);
    result.nearest = min(result.nearest, abs(x));
    if (x > 0.0) {
      result.winding += words[s + 7u] > 0.0 ? 1 : -1;
    }
  }
  return result;
}

// Whether a fragment at p is kept: inside by the winding rule, or within
// `reach` (half a pixel: the caller's fwidth) of the outline. Along x, the
// nearest crossing of the ray answers; along y, the winding at p ± (0,
// reach.y) does (the pieces are monotone in y, so a near-horizontal piece
// is seen from above or below, not along the ray). That keeps an outside
// point whose nearest boundary is within reach / sqrt(2) in any direction,
// and none beyond reach · sqrt(2): a plus-shaped dilation.
public bool covers(StructuredBuffer<float> words, uint base, float2 p, float2 reach) {
  Crossings here = crossings(words, base, p, reach.x);
  if (here.winding != 0 || here.nearest <= reach.x) {
    return true;
  }
  if (crossings(words, base, p + float2(0.0, reach.y), 0.0).winding != 0) {
    return true;
  }
  return crossings(words, base, p - float2(0.0, reach.y), 0.0).winding != 0;
}
