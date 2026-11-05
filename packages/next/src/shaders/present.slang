// Resolves a view's HDR image into its rectangle of the output target:
// tonemapping (Khronos PBR Neutral, AgX or ACES: View.ts `ToneMapping`),
// then output encoding: the exact sRGB curve, or gamma 2.2 to match
// CesiumJS 1.x (`czm_inverseGamma`). The image is already exposed (shading
// pre-exposes, plan §4.2).

struct PresentParams {
  float2 origin;     // viewport origin in target pixels
  uint toneMapping;  // 0 PBR Neutral, 1 AgX, 2 ACES
  uint encoding;     // 0 none (-srgb target), 1 sRGB, 2 gamma 2.2
  // The image's pre-exposure (the scene's light × it); 1 when the eye
  // sees it (`eyeSees`), 0 for a camera.
  float exposure;
  uint eye;
  // The eye's adaptation over the view, log10 cd/m²: the cones'
  // (photopic) and the rods' (scotopic); its brightening, stops.
  float cones;
  float rods;
  float compensation;
  float pad0;
  float pad1;
  float pad2;
};

[[vk::binding(0, 0)]] Texture2D<float4> hdr;
[[vk::binding(1, 0)]] ConstantBuffer<PresentParams> params;
// Display-referred color (unlit), premultiplied by its coverage (alpha).
[[vk::binding(2, 0)]] Texture2D<float4> display;
// The eye's local adaptation (adapt.slang): a bilateral grid of log2
// luminance, photopic and scotopic, and its weight, by place and level.
[[vk::binding(3, 0)]] Texture3D<float4> adaptation;
[[vk::binding(4, 0)]] SamplerState adaptationSampler;

[shader("vertex")]
float4 vs(uint i : SV_VertexID) : SV_Position {
  float2 uv = float2(float((i << 1u) & 2u), float(i & 2u));
  return float4(uv * 2.0 - 1.0, 0.0, 1.0);
}

float3 pbrNeutral(float3 input) {
  float startCompression = 0.8 - 0.04;
  float desaturation = 0.15;
  float x = min(input.r, min(input.g, input.b));
  float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
  float3 color = input - offset;
  float peak = max(color.r, max(color.g, color.b));
  if (peak < startCompression) {
    return color;
  }
  float d = 1.0 - startCompression;
  float newPeak = 1.0 - d * d / (peak + d - startCompression);
  color *= newPeak / peak;
  float g = 1.0 - 1.0 / (desaturation * (peak - newPeak) + 1.0);
  return lerp(color, float3(newPeak), g);
}

// AgX (Troy Sobotka), in the form Filament and three.js ship: into a wider
// (Rec. 2020) gamut, inset, a log2 encoding over 16.5 stops, a sigmoid
// (Benjamin Wrensch's polynomial fit of the default contrast), outset, back
// to linear sRGB. The matrices' literals are column-major, as GLSL's
// and WGSL's constructors take them (and the references print them):
// Slang's constructor reads them as rows, the transpose, so each is
// applied as `mul(c, m)`. Middle gray (0.18) comes out at about 0.21.
float3 agx(float3 input) {
  float3x3 srgbToRec2020 = float3x3(
    0.6274, 0.0691, 0.0164,
    0.3293, 0.9195, 0.0880,
    0.0433, 0.0113, 0.8956);
  float3x3 rec2020ToSrgb = float3x3(
    1.6605, -0.1246, -0.0182,
    -0.5876, 1.1329, -0.1006,
    -0.0728, -0.0083, 1.1187);
  float3x3 inset = float3x3(
    0.856627153315983, 0.137318972929847, 0.11189821299995,
    0.0951212405381588, 0.761241990602591, 0.0767994186031903,
    0.0482516061458583, 0.101439036467562, 0.811302368396859);
  float3x3 outset = float3x3(
    1.1271005818144368, -0.1413297634984383, -0.14132976349843826,
    -0.11060664309660323, 1.157823702216272, -0.11060664309660294,
    -0.016493938717834573, -0.016493938717834257, 1.2519364065950405);
  float minEv = -12.47393;
  float maxEv = 4.026069;
  float3 c = mul(mul(input, srgbToRec2020), inset);
  c = clamp((log2(max(c, float3(1e-10))) - minEv) / (maxEv - minEv), float3(0.0), float3(1.0));
  float3 x2 = c * c;
  float3 x4 = x2 * x2;
  c = 15.5 * x4 * x2 - 40.14 * x4 * c + 31.96 * x4 - 6.868 * x2 * c + 0.4298 * x2 + 0.1191 * c - 0.00232;
  c = mul(c, outset);
  c = pow(max(c, float3(0.0)), float3(2.2));
  return clamp(mul(c, rec2020ToSrgb), float3(0.0), float3(1.0));
}

// ACES filmic as CesiumJS 1.x applies it (`czm_acesTonemapping`,
// Narkowicz's fit of the reference rendering and output transforms).
float3 aces(float3 c) {
  return clamp((c * (c + 0.065) - 0.0001) / (c * (0.985 * c + 0.433) + 0.238), float3(0.0), float3(1.0));
}

float3 toneMap(float3 c) {
  switch (params.toneMapping) {
  case 1u:
    return agx(c);
  case 2u:
    return aces(c);
  default:
    return pbrNeutral(c);
  }
}

// --- the eye (scene/eye.ts, the same model per pixel) --------------------------

// Ferwerda et al. 1996's thresholds, cd/m² (cones) and scotopic cd/m² (rods).
float coneThreshold(float la) {
  float l = log10(max(la, 1e-12));
  float t = pow(0.249 * l + 0.65, 2.7) - 0.72;
  if (l <= -2.6) {
    t = -0.72;
  } else if (l >= 1.9) {
    t = l - 1.255;
  }
  return pow(10.0, t);
}

float rodThreshold(float la) {
  float l = log10(max(la, 1e-12));
  float t = pow(0.405 * l + 1.6, 2.18) - 2.86;
  if (l <= -3.94) {
    t = -2.86;
  } else if (l >= -1.44) {
    t = l - 0.395;
  }
  return pow(10.0, t);
}

float rodWeight(float la) {
  float k = clamp(1.0 - (la - 0.01) / (10.0 - 0.01), 0.0, 1.0);
  return k * k;
}

// Tumblin and Rushmeier's brightness against daylight's.
float brightness(float la) {
  float gamma = la > 100.0 ? 2.655 : 1.855 + 0.4 * log10(max(la + 2.3e-5, 1e-12));
  float display = 1.855 + 0.4 * log10(max(50.0 + 2.3e-5, 1e-12));
  return pow(10.0, (gamma - 2.655) / display);
}

// How far toward the region it looks at (log, half way) the eye adapts,
// and no further than this (log10) from the view's.
static const float EYE_LOCAL = 0.5;
static const float EYE_LOCAL_REACH = 2.0;
// The adaptation grid's levels' span (adapt.slang `RANGE`), log2 either
// side of the view's adaptation.
static const float ADAPT_RANGE = 12.0;

// The eye's adaptation around a pixel of log2 luminance `logY`, among its
// neighbors of about its brightness (adapt.slang), log10: photopic and
// scotopic; the view's where it has few.
float2 localAdaptation(float2 uv, float logY, float2 global) {
  float center = global.x / 0.30103;
  float w = (logY - (center - ADAPT_RANGE)) / (2.0 * ADAPT_RANGE);
  float3 g = adaptation.SampleLevel(adaptationSampler, float3(uv, clamp(w, 0.0, 1.0)), 0.0).xyz;
  float prior = 0.05;
  return (g.xy + global / 0.30103 * prior) / (g.z + prior) * 0.30103;
}

// What the eye sees (View.ts `Exposure` "eye"): its cones, in color, and
// its rods, the image's scotopic luminance (from XYZ: Larson, Rushmeier
// and Piatko 1997) in a gray blue (Thompson, Shirley and Ferwerda 2002),
// each at its gain for the eye's adaptation there: partly the view's,
// partly its region's (`localAdaptation`): a dark street keeps detail
// beside a bright one, a lamp its color in the dark. `image` pre-exposed;
// returns display light (white 1).
float3 eyeSees(float3 image, float2 uv) {
  float3 light = image / params.exposure;
  float x = dot(light, float3(0.4124, 0.3576, 0.1805));
  float y = dot(light, float3(0.2126, 0.7152, 0.0722));
  float z = dot(light, float3(0.0193, 0.1192, 0.9505));
  float scotopic = max(y * (1.33 * (1.0 + (y + z) / max(x, 1e-12)) - 1.68), 0.0);
  float2 global = float2(params.cones, params.rods);
  float2 local = localAdaptation(uv, log2(max(y, 1e-7)), global);
  float2 adapted = clamp(lerp(global, local, EYE_LOCAL), global - EYE_LOCAL_REACH, global + EYE_LOCAL_REACH);
  float cones = pow(10.0, adapted.x);
  float rods = pow(10.0, adapted.y);
  // Daylight's adaptation level shows where a metered camera puts it.
  float calibration = 0.104 / (coneThreshold(50.0) * pow(10.0, 1.255) / 100.0);
  float scale = calibration * brightness(cones) * exp2(params.compensation) / 100.0;
  float coneGain = scale * coneThreshold(50.0) / coneThreshold(cones);
  float rodGain = scale * rodWeight(cones) * rodThreshold(50.0) / rodThreshold(rods);
  return light * coneGain + scotopic * rodGain * float3(1.041, 0.962, 1.259);
}

float3 linearToSrgb(float3 c) {
  float3 low = c * 12.92;
  float3 high = 1.055 * pow(c, float3(1.0 / 2.4)) - 0.055;
  return select(c <= float3(0.0031308), low, high);
}

[shader("fragment")]
float4 fs(float4 frag : SV_Position) : SV_Target {
  int2 coord = int2(frag.xy - params.origin);
  // Scene-referred light is exposed and tonemapped; display-referred color
  // (unlit) is added as is. A pixel partly covered by unlit samples (MSAA
  // edges) tonemaps its scene part at full strength, then weights it.
  float4 shown = display.Load(int3(coord, 0));
  float sceneCoverage = 1.0 - shown.a;
  float3 scene = hdr.Load(int3(coord, 0)).rgb / max(sceneCoverage, 1e-4);
  if (params.eye == 1u) {
    uint2 size;
    hdr.GetDimensions(size.x, size.y);
    float2 uv = (float2(coord) + 0.5) / float2(size);
    scene = eyeSees(max(scene, float3(0.0)), uv);
  }
  float3 color = toneMap(max(scene, float3(0.0))) * sceneCoverage + shown.rgb;
  color = clamp(color, float3(0.0), float3(1.0));
  if (params.encoding == 1u) {
    color = linearToSrgb(color);
  } else if (params.encoding == 2u) {
    color = pow(color, float3(1.0 / 2.2));
  }
  return float4(color, 1.0);
}
