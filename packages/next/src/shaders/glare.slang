// Glare's light list and spike sprites (CESIUM2_WEBGPU_PLAN.md §13.22, §13.32). The
// kernel `glareSources` runs on one thread once per view each tick: it writes the sun's
// record, with what share of its disc is seen, then walks the bright stars. The veil
// reads the sun's record (render/post/glare.ts); the sprites draw the rest.
//
// `glareSources` is bound by constants: 32 taps, unrolled, and at most 2,048 stars, with
// a `break` at the source or pixel budget.
import common;

// Pinned against render/post/glare.ts by test/glareSources.test.ts.
static const uint GLARE_SOURCES = 256u;
static const uint GLARE_BRIGHT_STARS = 2048u;
static const uint GLARE_DISC_TAPS = 32u;
static const float GLARE_SPRITE_MAX_RADIUS = 512.0;
static const float GLARE_SPRITE_CLAMP = 200.0;
// A kernel's smallest sprite, its cells (`radii`).
static const float GLARE_SPRITE_MIN_CELLS = 2.0;
static const uint GLARE_RADII = 32u;

// A Vogel spiral in the unit disc (glare.ts `discTaps`).
static const float2 DISC_TAPS[32] = {
  float2(0.125000, 0.000000),
  float2(-0.159645, 0.146248),
  float2(0.024436, -0.278438),
  float2(0.201222, 0.262459),
  float2(-0.369268, -0.065318),
  float2(0.349802, -0.222516),
  float2(-0.117002, 0.435242),
  float2(-0.223136, -0.429634),
  float2(0.484115, 0.176798),
  float2(-0.503641, 0.207896),
  float2(0.242788, -0.518824),
  float2(0.179414, 0.572001),
  float2(-0.540757, -0.313380),
  float2(0.634370, -0.139464),
  float2(-0.387146, 0.550675),
  float2(-0.089440, -0.690200),
  float2(0.549072, 0.462758),
  float2(-0.738878, 0.030555),
  float2(0.538955, -0.536332),
  float2(-0.036058, 0.779792),
  float2(-0.512818, -0.614527),
  float2(0.812360, 0.109302),
  float2(-0.688311, 0.478909),
  float2(0.188086, -0.836061),
  float2(0.435033, 0.759191),
  float2(-0.850448, -0.271316),
  float2(0.826102, -0.381680),
  float2(-0.357888, 0.855156),
  float2(-0.319407, -0.888034),
  float2(0.849909, 0.446688),
  float2(-0.944035, 0.248845),
  float2(0.536596, -0.834530)
};

// The sky's values for this view, and what this view's sprites may spend. Written per
// tick (glare.ts `writeGlareFrame`).
struct GlareFrame {
  float3 position;      // the sky's camera, km
  float exposure;
  float3 sun;
  float sunCos;
  float3 forward;
  float tanX;
  float3 right;
  float tanY;
  float3 up;
  float bottomRadius;   // km
  float2 size;          // the view, pixels
  float sunFixed;       // the sun's lux when the view sets it; below 0, from the table
  float sunOn;          // the sun is in the view's list
  float3 shape;
  float moonSize;
  float3 moon;
  float starCount;
  float3 geodeticUp;    // the camera's, for the table
  float heightShare;    // of the camera in the air, for the table
  float4 rows[3];       // Earth-fixed to ICRF, by rows
  float spritePixels;   // the pixel budget
  float spriteCap;      // records, the sun's among them
  float brightness;     // a kernel value of 1's radiance, per unit of pre-exposed lux
  float pixelsPerCell;
  float4 radii[8];      // by log2 of display brightness: cells (glareKernel.ts)
  float kernelScale;    // what a kernel's stored value is multiplied by
  float uvPerPixel;
  float kernelLevel;
  float topRadius;      // the air's, km
};

// A source. In record 0, the header: pixel.x the count of records in use, the sun's among
// them; pixel.y the sun's z along the view; radius the sine of its angular radius;
// visibility the pixels spent.
public struct GlareSource {
  float2 pixel;
  float radius;       // a sprite's, pixels; 0 for none
  float visibility;
  float3 light;       // lux, through the air
  float kind;         // 0: none, 1: the sun, 2: a star
};

[[vk::binding(0, 0)]] ConstantBuffer<GlareFrame> frame;
[[vk::binding(1, 0)]] DepthTexture2DMS depth;
[[vk::binding(2, 0)]] Texture2D<float4> sunLightTable;
[[vk::binding(3, 0)]] SamplerState tableSampler;
// Per star: direction (ICRF) and illuminance (lux), then color. Brightest first.
[[vk::binding(4, 0)]] StructuredBuffer<float4> glareStars;
[[vk::binding(5, 0)]] RWStructuredBuffer<GlareSource> sources;

// Where a direction falls on the view, pixels, and whether in front of it.
float2 toPixel(float3 d, float z) {
  float2 ndc = float2(dot(d, frame.right) / (z * frame.tanX), dot(d, frame.up) / (z * frame.tanY));
  return float2((ndc.x * 0.5 + 0.5) * frame.size.x, (0.5 - ndc.y * 0.5) * frame.size.y);
}

// The ray misses the body: the scaled sphere `marchedSky` marches.
bool missesBody(float3 direction) {
  float3 d = normalize(frame.shape * direction);
  float r = length(frame.position);
  float mu = dot(frame.position, d) / r;
  float below = r * r * (mu * mu - 1.0) + frame.bottomRadius * frame.bottomRadius;
  return !(mu < 0.0 && below >= 0.0);
}

// Nothing was drawn in front of it; a direction off screen counts as seen. Then the ray
// misses the body, and it isn't in the Moon's disc.
bool tapVisible(float3 direction) {
  float z = dot(direction, frame.forward);
  if (z > 1e-4) {
    float2 pixel = toPixel(direction, z);
    if (pixel.x >= 0.0 && pixel.y >= 0.0 && pixel.x < frame.size.x && pixel.y < frame.size.y) {
      if (depth.Load(int2(pixel), 0) != 0.0) {
        return false;
      }
    }
  }
  if (!missesBody(direction)) {
    return false;
  }
  if (frame.moonSize > 0.0
      && dot(direction, frame.moon) > sqrt(max(0.0, 1.0 - frame.moonSize * frame.moonSize))) {
    return false;
  }
  return true;
}

// The table's light, linear sRGB lux, at zenith cosine `mu`, `heightShare` up the air.
float3 tableAt(float mu, float heightShare) {
  float2 uv = sunLightTableUv(mu, heightShare);
  return max(sunLightTable.SampleLevel(tableSampler, uv, 0.0).rgb * 1e5, float3(0.0));
}

// Light from `direction` at the camera, through the air, as a table's value. The table
// stops at the top of the air, so from above it a ray that dips in crosses it twice: by
// the table, from its lowest point out, then the same again.
float3 throughAir(float3 direction) {
  if (frame.heightShare < 1.0) {
    return tableAt(dot(frame.geodeticUp, direction), frame.heightShare);
  }
  float3 outside = tableAt(1.0, 1.0);
  float3 d = normalize(frame.shape * direction);
  float r = length(frame.position);
  float mu = dot(frame.position, d) / r;
  float lowest = r * sqrt(max(0.0, 1.0 - mu * mu));
  if (mu >= 0.0 || lowest >= frame.topRadius) {
    return outside;
  }
  float share = (lowest - frame.bottomRadius) / (frame.topRadius - frame.bottomRadius);
  float3 half = tableAt(0.0, share);
  return half * half / max(outside, float3(1e-6));
}

// A sprite's radius, pixels, for pre-exposed light `brightest`; 0 for none.
float spriteRadius(float brightest) {
  float display = brightest * frame.brightness;
  if (!(display >= 1.0)) {
    return 0.0;
  }
  uint step = min(uint(log2(display)), GLARE_RADII - 1u);
  float cells = frame.radii[step / 4u][step % 4u];
  if (cells < GLARE_SPRITE_MIN_CELLS) {
    return 0.0;
  }
  return min(cells * frame.pixelsPerCell, GLARE_SPRITE_MAX_RADIUS);
}

[shader("compute")]
[numthreads(1, 1, 1)]
void glareSources() {
  float pixels = 0.0;
  GlareSource sun;
  sun.pixel = float2(-1e6);
  sun.radius = 0.0;
  sun.visibility = 0.0;
  sun.light = float3(0.0);
  sun.kind = 0.0;
  float sinRadius = 0.0;
  float sunZ = 0.0;
  bool fixedLight = frame.sunFixed >= 0.0;
  if (frame.sunOn > 0.0) {
    sinRadius = sqrt(max(0.0, 1.0 - frame.sunCos * frame.sunCos));
    sunZ = dot(frame.sun, frame.forward);
    if (sunZ > 1e-4) {
      sun.pixel = toPixel(frame.sun, sunZ);
    }
    float3 x = normalize(cross(frame.sun, abs(frame.sun.z) < 0.9 ? float3(0.0, 0.0, 1.0) : float3(1.0, 0.0, 0.0)));
    float3 y = cross(frame.sun, x);
    float seen = 0.0;
    [ForceUnroll]
    for (uint i = 0u; i < GLARE_DISC_TAPS; i++) {
      float2 tap = DISC_TAPS[i] * sinRadius;
      if (tapVisible(normalize(frame.sun + x * tap.x + y * tap.y))) {
        seen += 1.0;
      }
    }
    sun.visibility = seen / float(GLARE_DISC_TAPS);
    // Out-of-gamut light at a low sun reads below 0 in sRGB; a veil can't take that.
    sun.light = fixedLight ? float3(frame.sunFixed) : throughAir(frame.sun);
    sun.kind = 1.0;
    if (sun.visibility > 0.0) {
      sun.radius = spriteRadius(max(sun.light.r, max(sun.light.g, sun.light.b)) * frame.exposure);
      pixels = 4.0 * sun.radius * sun.radius;
    }
  }
  sources[1] = sun;

  uint count = 1u;
  // The color of a star through the air, against the same light outside it.
  float3 outside = fixedLight ? float3(1.0) : max(tableAt(1.0, 1.0), float3(1e-6));
  uint stars = min(uint(frame.starCount), GLARE_BRIGHT_STARS);
  for (uint i = 0u; i < stars; i++) {
    if (count >= uint(frame.spriteCap) || pixels >= frame.spritePixels) {
      break;
    }
    float4 a = glareStars[i * 2u];
    float3 color = glareStars[i * 2u + 1u].rgb;
    float3 d = frame.rows[0].xyz * a.x + frame.rows[1].xyz * a.y + frame.rows[2].xyz * a.z;
    float z = dot(d, frame.forward);
    if (z < 0.01) {
      continue;
    }
    float3 light = a.w * color;
    if (!fixedLight) {
      light *= throughAir(d) / outside;
    }
    float radius = spriteRadius(max(light.r, max(light.g, light.b)) * frame.exposure);
    if (radius <= 0.0) {
      continue;
    }
    float2 pixel = toPixel(d, z);
    if (pixel.x < -radius || pixel.y < -radius
        || pixel.x > frame.size.x + radius || pixel.y > frame.size.y + radius) {
      continue;
    }
    if (!tapVisible(d)) {
      continue;
    }
    pixels += 4.0 * radius * radius;
    GlareSource star;
    star.pixel = pixel;
    star.radius = radius;
    star.visibility = 1.0;
    star.light = light;
    star.kind = 2.0;
    sources[count + 1u] = star;
    count++;
  }

  GlareSource header;
  header.pixel = float2(float(count), sunZ);
  header.radius = sinRadius;
  header.visibility = pixels;
  header.light = float3(0.0);
  header.kind = 0.0;
  sources[0] = header;
}

// --- the sprites ------------------------------------------------------------------

[[vk::binding(6, 0)]] StructuredBuffer<GlareSource> spriteSources;
// A pupil's kernel, its stored values times `frame.kernelScale` (glareKernel.ts).
[[vk::binding(7, 0)]] Texture2D<float4> glareKernel;
[[vk::binding(8, 0)]] SamplerState kernelSampler;

// By field: a varying `nointerpolation` struct passed whole is copied with its
// interpolation where WGSL forbids it.
struct SpriteVarying {
  float4 position : SV_Position;
  float2 corner : CORNER;
  nointerpolation float3 light : LIGHT;
  nointerpolation float reach : REACH;
};

// One source as a strip of 4 vertices; a degenerate triangle for a slot past the list's
// count, or a source with no sprite.
[shader("vertex")]
SpriteVarying spriteVertex(uint corner : SV_VertexID, uint slot : SV_InstanceID) {
  SpriteVarying out;
  out.position = float4(2.0, 2.0, 0.0, 1.0);
  out.corner = float2(0.0);
  out.light = float3(0.0);
  out.reach = 0.0;
  if (float(slot) >= spriteSources[0].pixel.x) {
    return out;
  }
  GlareSource source = spriteSources[slot + 1u];
  if (source.radius <= 0.0 || source.visibility <= 0.0) {
    return out;
  }
  float2 c = float2(float(corner & 1u), float(corner >> 1u)) * 2.0 - 1.0;
  float2 pixel = source.pixel + c * source.radius;
  out.position = float4(
      pixel.x / frame.size.x * 2.0 - 1.0,
      1.0 - pixel.y / frame.size.y * 2.0,
      0.0,
      1.0);
  out.corner = c;
  out.light = source.light * source.visibility * frame.exposure * frame.brightness * frame.kernelScale;
  out.reach = source.radius * frame.uvPerPixel;
  return out;
}

// Each sprite's fragment is one sample, clamped so that all of them together stay
// inside fp16 (test/veilWeights.test.ts).
[shader("fragment")]
float4 spriteFragment(SpriteVarying in) : SV_Target0 {
  float2 uv = 0.5 + in.corner * in.reach;
  float3 kernel = glareKernel.SampleLevel(kernelSampler, uv, frame.kernelLevel).rgb;
  float fade = saturate((1.0 - length(in.corner)) * 10.0);
  return float4(min(in.light * kernel * fade, float3(GLARE_SPRITE_CLAMP)), 0.0);
}
