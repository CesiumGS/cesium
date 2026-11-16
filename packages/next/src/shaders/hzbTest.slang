// A box against a view's depth pyramid (hzb.slang): the test the tile queries
// (occlusionQuery.slang) and the draws' occlusion cull (cull.slang) share. A
// box is a center and three half-axes in the pyramid's camera space (x right,
// y up, z forward), relative to its eye. The test is conservative at every
// step: any corner at or behind the near plane, or a rectangle off the screen,
// leaves the box visible, and so does anything that doesn't add up (a NaN
// fails every comparison that would hide).
//
// Reverse-Z with an infinite far plane: a point at distance z along the view
// has depth near / z, larger being nearer. The box's nearest depth is its
// nearest corner's; the pyramid's texels hold the farthest depth of the pixels
// they cover. The box is hidden if even that farthest depth is nearer than the
// box's nearest, by a relative margin (`bias`) for the depth's own rounding: a
// surface often lies on its box's near face.
//
// The screen rectangle's pixels map to the level where they span at most
// `window` x `window` texels (`min(p >> (level + 1), size - 1)`, hzb.slang),
// and those texels are read: 2 (4 reads) for the tile queries; a wider window
// reads a finer level, whose texels reach less far past the rectangle (the
// draws' cull reads up to 8 x 8). render/view/occlusionMath.ts `boxHidden` is
// the same test on the CPU.
module hzbTest;

// The camera a pyramid was built for, and the frame it was built from.
public struct PyramidCamera {
  public uint width;    // the frame's, pixels
  public uint height;
  public uint levels;   // the pyramid's
  public float tanX;    // tangent of half the field of view, across and up
  public float tanY;
  public float near;
  public float bias;
};

static const uint MAX_LEVELS = 16u;
// The widest window, texels across (a power of 2).
public static const uint MAX_WINDOW = 8u;

// Whether the box is certainly hidden by `pyramid`, reading at most
// `window` x `window` texels (2, 4 or 8).
public bool boxHidden(Texture2D<float> pyramid, PyramidCamera camera, float3 center, float3 a, float3 b, float3 c, uint window) {
  float frameWidth = float(camera.width);
  float frameHeight = float(camera.height);
  float nearestZ = 3.4e38;
  float2 low = float2(3.4e38, 3.4e38);
  float2 high = float2(-3.4e38, -3.4e38);
  for (uint k = 0u; k < 8u; k++) {
    float3 p = center +
               ((k & 1u) == 0u ? -a : a) +
               ((k & 2u) == 0u ? -b : b) +
               ((k & 4u) == 0u ? -c : c);
    if (!(p.z > camera.near)) {
      return false;
    }
    float inverse = 1.0 / p.z;
    float2 screen = float2(
      (p.x * inverse / camera.tanX * 0.5 + 0.5) * frameWidth,
      (0.5 - p.y * inverse / camera.tanY * 0.5) * frameHeight);
    low = min(low, screen);
    high = max(high, screen);
    nearestZ = min(nearestZ, p.z);
  }
  // Off the screen: the frustum's planes deal with it.
  if (!(high.x >= 0.0) || !(high.y >= 0.0) || !(low.x < frameWidth) ||
      !(low.y < frameHeight)) {
    return false;
  }
  // The pixels the rectangle touches, clamped to the frame.
  uint2 first = uint2(clamp(floor(low), float2(0.0, 0.0), float2(frameWidth - 1.0, frameHeight - 1.0)));
  uint2 last = uint2(clamp(floor(high), float2(0.0, 0.0), float2(frameWidth - 1.0, frameHeight - 1.0)));
  uint width0 = max(camera.width >> 1u, 1u);
  uint height0 = max(camera.height >> 1u, 1u);
  uint2 span = uint2(min(last.x >> 1u, width0 - 1u), min(last.y >> 1u, height0 - 1u)) -
               uint2(min(first.x >> 1u, width0 - 1u), min(first.y >> 1u, height0 - 1u));
  uint extent = max(span.x, span.y) + 1u;
  uint wide = clamp(window, 2u, MAX_WINDOW);
  uint level = 0u;
  for (uint l = 0u; l < MAX_LEVELS; l++) {
    // The rectangle's texels at `level` are at most ((extent - 1) >> level) + 2:
    // for a window of 2, the level whose texel is at least the rectangle.
    if (((extent - 1u) >> level) + 2u <= wide || level + 1u >= camera.levels) {
      break;
    }
    level++;
  }
  uint2 size = uint2(max(width0 >> level, 1u), max(height0 >> level, 1u));
  uint2 from = min(first >> (level + 1u), size - 1u);
  uint2 to = min(last >> (level + 1u), size - 1u);
  if (to.x - from.x > wide - 1u || to.y - from.y > wide - 1u) {
    return false;
  }
  float farthest = 3.4e38;
  for (uint j = 0u; j < MAX_WINDOW; j++) {
    uint y = from.y + j;
    if (y > to.y) {
      break;
    }
    for (uint i = 0u; i < MAX_WINDOW; i++) {
      uint x = from.x + i;
      if (x > to.x) {
        break;
      }
      farthest = min(farthest, pyramid.Load(int3(x, y, level)));
    }
  }
  float nearest = camera.near / nearestZ;
  return farthest > nearest * (1.0 + camera.bias);
}
