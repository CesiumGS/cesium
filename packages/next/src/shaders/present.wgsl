// Resolves a view's HDR image into its rectangle of the output target:
// exposure, Khronos PBR Neutral tonemapping, then output encoding: the exact
// sRGB curve, or gamma 2.2 to match CesiumJS 1.x (`czm_inverseGamma`).

struct PresentParams {
  origin: vec2f,     // viewport origin in target pixels
  exposure: f32,
  encoding: u32, // 0 none (-srgb target), 1 sRGB, 2 gamma 2.2
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
  let scene = textureLoad(hdr, coord, 0).rgb / max(sceneCoverage, 1e-4);
  var color =
    pbrNeutral(max(scene * params.exposure, vec3f(0.0))) * sceneCoverage +
    shown.rgb;
  color = clamp(color, vec3f(0.0), vec3f(1.0));
  if (params.encoding == 1u) {
    color = linearToSrgb(color);
  } else if (params.encoding == 2u) {
    color = pow(color, vec3f(1.0 / 2.2));
  }
  return vec4f(color, 1.0);
}
