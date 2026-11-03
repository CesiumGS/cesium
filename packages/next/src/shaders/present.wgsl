// Resolves a view's HDR image into its rectangle of the output target:
// tonemapping (Khronos PBR Neutral, AgX or ACES: View.ts `ToneMapping`),
// then output encoding: the exact sRGB curve, or gamma 2.2 to match
// CesiumJS 1.x (`czm_inverseGamma`). The image is already exposed (shading
// pre-exposes, plan §4.2).

struct PresentParams {
  origin: vec2f,     // viewport origin in target pixels
  toneMapping: u32,  // 0 PBR Neutral, 1 AgX, 2 ACES
  encoding: u32, // 0 none (-srgb target), 1 sRGB, 2 gamma 2.2
  exposure: f32,     // the image's pre-exposure (the scene's light × it)
  eye: u32,          // 1: the eye's night vision (`nightVision`)
  _pad: vec2u,
};

@group(0) @binding(0) var hdr: texture_2d<f32>;
@group(0) @binding(1) var<uniform> params: PresentParams;
// Display-referred color (unlit), premultiplied by its coverage (alpha).
@group(0) @binding(2) var display: texture_2d<f32>;

@vertex
fn vs(@builtin(vertex_index) i: u32) -> @builtin(position) vec4f {
  let uv = vec2f(f32((i << 1u) & 2u), f32(i & 2u));
  return vec4f(uv * 2.0 - 1.0, 0.0, 1.0);
}

fn pbrNeutral(input: vec3f) -> vec3f {
  let startCompression = 0.8 - 0.04;
  let desaturation = 0.15;
  let x = min(input.r, min(input.g, input.b));
  let offset = select(0.04, x - 6.25 * x * x, x < 0.08);
  var color = input - offset;
  let peak = max(color.r, max(color.g, color.b));
  if (peak < startCompression) {
    return color;
  }
  let d = 1.0 - startCompression;
  let newPeak = 1.0 - d * d / (peak + d - startCompression);
  color *= newPeak / peak;
  let g = 1.0 - 1.0 / (desaturation * (peak - newPeak) + 1.0);
  return mix(color, vec3f(newPeak), g);
}

// AgX (Troy Sobotka), in the form Filament and three.js ship: into a wider
// (Rec. 2020) gamut, inset, a log2 encoding over 16.5 stops, a sigmoid
// (Benjamin Wrensch's polynomial fit of the default contrast), outset, back
// to linear sRGB. Matrices are column-major, as GLSL's and WGSL's
// constructors take them. Middle gray (0.18) comes out at about 0.21.
fn agx(input: vec3f) -> vec3f {
  let srgbToRec2020 = mat3x3f(
    0.6274, 0.0691, 0.0164,
    0.3293, 0.9195, 0.0880,
    0.0433, 0.0113, 0.8956,
  );
  let rec2020ToSrgb = mat3x3f(
    1.6605, -0.1246, -0.0182,
    -0.5876, 1.1329, -0.1006,
    -0.0728, -0.0083, 1.1187,
  );
  let inset = mat3x3f(
    0.856627153315983, 0.137318972929847, 0.11189821299995,
    0.0951212405381588, 0.761241990602591, 0.0767994186031903,
    0.0482516061458583, 0.101439036467562, 0.811302368396859,
  );
  let outset = mat3x3f(
    1.1271005818144368, -0.1413297634984383, -0.14132976349843826,
    -0.11060664309660323, 1.157823702216272, -0.11060664309660294,
    -0.016493938717834573, -0.016493938717834257, 1.2519364065950405,
  );
  let minEv = -12.47393;
  let maxEv = 4.026069;
  var c = inset * (srgbToRec2020 * input);
  c = clamp((log2(max(c, vec3f(1e-10))) - minEv) / (maxEv - minEv), vec3f(0.0), vec3f(1.0));
  let x2 = c * c;
  let x4 = x2 * x2;
  c = 15.5 * x4 * x2 - 40.14 * x4 * c + 31.96 * x4 - 6.868 * x2 * c + 0.4298 * x2 + 0.1191 * c - 0.00232;
  c = outset * c;
  c = pow(max(c, vec3f(0.0)), vec3f(2.2));
  return clamp(rec2020ToSrgb * c, vec3f(0.0), vec3f(1.0));
}

// ACES filmic as CesiumJS 1.x applies it (`czm_acesTonemapping`,
// Narkowicz's fit of the reference rendering and output transforms).
fn aces(c: vec3f) -> vec3f {
  return clamp((c * (c + 0.065) - 0.0001) / (c * (0.985 * c + 0.433) + 0.238), vec3f(0.0), vec3f(1.0));
}

fn toneMap(c: vec3f) -> vec3f {
  switch (params.toneMapping) {
    case 1u: {
      return agx(c);
    }
    case 2u: {
      return aces(c);
    }
    default: {
      return pbrNeutral(c);
    }
  }
}

// The eye in dim light (View.ts `Exposure` "eye"): the rods take over from
// the cones, colors fade and shift toward blue (the Purkinje shift). The
// rods' luminance (scotopic, from XYZ: Larson, Rushmeier and Piatko 1997),
// normalized so white keeps its luminance, tinted a gray blue (Thompson,
// Shirley and Ferwerda 2002), weighs in below about 3 cd/m² and wholly
// below 0.01 (the mesopic range, smooth in log luminance). `light` is the
// scene's, cd/m² (linear sRGB).
fn nightVision(light: vec3f) -> vec3f {
  let x = dot(light, vec3f(0.4124, 0.3576, 0.1805));
  let y = dot(light, vec3f(0.2126, 0.7152, 0.0722));
  let z = dot(light, vec3f(0.0193, 0.1192, 0.9505));
  let scotopic = max(y * (1.33 * (1.0 + (y + z) / max(x, 1e-12)) - 1.68), 0.0) / 2.573;
  let rods = scotopic * vec3f(1.041, 0.962, 1.259);
  let cones = smoothstep(-2.0, 0.5, log2(max(y, 1e-12)) * 0.30103); // log10
  return mix(rods, light, cones);
}

fn linearToSrgb(c: vec3f) -> vec3f {
  let low = c * 12.92;
  let high = 1.055 * pow(c, vec3f(1.0 / 2.4)) - 0.055;
  return select(high, low, c <= vec3f(0.0031308));
}

@fragment
fn fs(@builtin(position) frag: vec4f) -> @location(0) vec4f {
  let coord = vec2i(frag.xy - params.origin);
  // Scene-referred light is exposed and tonemapped; display-referred color
  // (unlit) is added as is. A pixel partly covered by unlit samples (MSAA
  // edges) tonemaps its scene part at full strength, then weights it.
  let shown = textureLoad(display, coord, 0);
  let sceneCoverage = 1.0 - shown.a;
  var scene = textureLoad(hdr, coord, 0).rgb / max(sceneCoverage, 1e-4);
  if (params.eye == 1u) {
    scene = nightVision(max(scene, vec3f(0.0)) / params.exposure) * params.exposure;
  }
  var color =
    toneMap(max(scene, vec3f(0.0))) * sceneCoverage +
    shown.rgb;
  color = clamp(color, vec3f(0.0), vec3f(1.0));
  if (params.encoding == 1u) {
    color = linearToSrgb(color);
  } else if (params.encoding == 2u) {
    color = pow(color, vec3f(1.0 / 2.2));
  }
  return vec4f(color, 1.0);
}
