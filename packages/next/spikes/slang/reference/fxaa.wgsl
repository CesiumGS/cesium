// FXAA 3.11, quality version (Timothy Lottes, NVIDIA 2011), over the
// present pass's tonemapped image (View.fxaa): edges found from luma
// contrast in display encoding, then searched along to their ends and
// blended across by the pixel's position on the edge, plus a little
// sub-pixel smoothing. Smooths what 4× MSAA leaves: edges within shading
// (normal maps, specular), and translucency's moments (single-sampled).

struct FxaaParams {
  origin: vec2f, // the view's rectangle in the target, pixels
  rcp: vec2f,    // 1 / its size
  // The image holds sRGB-encoded color; a -srgb target encodes again on
  // write: decode first (1), or write as is (0).
  decode: u32,
  _pad0: u32,
  _pad1: u32,
  _pad2: u32,
};

@group(0) @binding(0) var image: texture_2d<f32>;
@group(0) @binding(1) var imageSampler: sampler;
@group(0) @binding(2) var<uniform> params: FxaaParams;

@vertex
fn vs(@builtin(vertex_index) i: u32) -> @builtin(position) vec4f {
  let uv = vec2f(f32((i << 1u) & 2u), f32(i & 2u));
  return vec4f(uv * 2.0 - 1.0, 0.0, 1.0);
}

// Lottes' defaults for the quality version.
const SUBPIX = 0.75;
const EDGE_THRESHOLD = 0.166;
const EDGE_THRESHOLD_MIN = 0.0833;
// The search's steps along the edge, pixels (quality preset 29's).
const STEPS = array<f32, 10>(1.0, 1.5, 2.0, 2.0, 2.0, 2.0, 2.0, 2.0, 4.0, 8.0);

fn rgbAt(p: vec2f) -> vec3f {
  return textureSampleLevel(image, imageSampler, p, 0.0).rgb;
}

fn lumaOf(c: vec3f) -> f32 {
  return dot(c, vec3f(0.299, 0.587, 0.114));
}

fn lumaAt(p: vec2f) -> f32 {
  return lumaOf(rgbAt(p));
}

fn srgbToLinear(c: vec3f) -> vec3f {
  return select(pow((c + 0.055) / 1.055, vec3f(2.4)), c / 12.92, c <= vec3f(0.04045));
}

fn antialiased(center: vec2f) -> vec3f {
  let rcp = params.rcp;
  var posM = center;
  let rgbM = rgbAt(posM);
  let lumaM = lumaOf(rgbM);
  var lumaS = lumaAt(posM + vec2f(0.0, rcp.y));
  let lumaE = lumaAt(posM + vec2f(rcp.x, 0.0));
  var lumaN = lumaAt(posM - vec2f(0.0, rcp.y));
  let lumaW = lumaAt(posM - vec2f(rcp.x, 0.0));
  let rangeMax = max(max(max(lumaS, lumaE), max(lumaN, lumaW)), lumaM);
  let rangeMin = min(min(min(lumaS, lumaE), min(lumaN, lumaW)), lumaM);
  let range = rangeMax - rangeMin;
  if (range < max(EDGE_THRESHOLD_MIN, rangeMax * EDGE_THRESHOLD)) {
    return rgbM;
  }
  let lumaNW = lumaAt(posM + vec2f(-rcp.x, -rcp.y));
  let lumaSE = lumaAt(posM + vec2f(rcp.x, rcp.y));
  let lumaNE = lumaAt(posM + vec2f(rcp.x, -rcp.y));
  let lumaSW = lumaAt(posM + vec2f(-rcp.x, rcp.y));

  // Horizontal or vertical: second differences across each.
  let lumaNS = lumaN + lumaS;
  let lumaWE = lumaW + lumaE;
  let edgeHorz1 = -2.0 * lumaM + lumaNS;
  let edgeVert1 = -2.0 * lumaM + lumaWE;
  let lumaNESE = lumaNE + lumaSE;
  let lumaNWNE = lumaNW + lumaNE;
  let edgeHorz2 = -2.0 * lumaE + lumaNESE;
  let edgeVert2 = -2.0 * lumaN + lumaNWNE;
  let lumaNWSW = lumaNW + lumaSW;
  let lumaSWSE = lumaSW + lumaSE;
  let edgeHorz3 = -2.0 * lumaW + lumaNWSW;
  let edgeVert3 = -2.0 * lumaS + lumaSWSE;
  let edgeHorz = abs(edgeHorz3) + abs(edgeHorz1) * 2.0 + abs(edgeHorz2);
  let edgeVert = abs(edgeVert3) + abs(edgeVert1) * 2.0 + abs(edgeVert2);
  let horzSpan = edgeHorz >= edgeVert;
  let subpixA = (lumaNS + lumaWE) * 2.0 + lumaNWSW + lumaNESE;
  var lengthSign = rcp.x;
  if (!horzSpan) {
    lumaN = lumaW;
    lumaS = lumaE;
  } else {
    lengthSign = rcp.y;
  }
  let subpixB = subpixA / 12.0 - lumaM;

  // Which side of the edge the pixel is on.
  let gradientN = lumaN - lumaM;
  let gradientS = lumaS - lumaM;
  var lumaNN = lumaN + lumaM;
  let lumaSS = lumaS + lumaM;
  let pairN = abs(gradientN) >= abs(gradientS);
  let gradient = max(abs(gradientN), abs(gradientS));
  if (pairN) {
    lengthSign = -lengthSign;
  }
  let subpixC = clamp(abs(subpixB) / range, 0.0, 1.0);

  // Search along the edge both ways for its ends.
  var posB = posM;
  var offNP = vec2f(0.0, rcp.y);
  if (horzSpan) {
    offNP = vec2f(rcp.x, 0.0);
    posB.y += lengthSign * 0.5;
  } else {
    posB.x += lengthSign * 0.5;
  }
  var posN = posB - offNP * STEPS[0];
  var posP = posB + offNP * STEPS[0];
  let subpixD = -2.0 * subpixC + 3.0;
  let subpixE = subpixC * subpixC;
  if (!pairN) {
    lumaNN = lumaSS;
  }
  let gradientScaled = gradient * 0.25;
  let lumaMM = lumaM - lumaNN * 0.5;
  let subpixF = subpixD * subpixE;
  let lumaMLTZero = lumaMM < 0.0;
  var lumaEndN = lumaAt(posN) - lumaNN * 0.5;
  var lumaEndP = lumaAt(posP) - lumaNN * 0.5;
  var doneN = abs(lumaEndN) >= gradientScaled;
  var doneP = abs(lumaEndP) >= gradientScaled;
  for (var i = 1u; i < 10u && !(doneN && doneP); i++) {
    if (!doneN) {
      posN -= offNP * STEPS[i];
      lumaEndN = lumaAt(posN) - lumaNN * 0.5;
      doneN = abs(lumaEndN) >= gradientScaled;
    }
    if (!doneP) {
      posP += offNP * STEPS[i];
      lumaEndP = lumaAt(posP) - lumaNN * 0.5;
      doneP = abs(lumaEndP) >= gradientScaled;
    }
  }

  // Blend across the edge by where along it the pixel is.
  var dstN = posM.x - posN.x;
  var dstP = posP.x - posM.x;
  if (!horzSpan) {
    dstN = posM.y - posN.y;
    dstP = posP.y - posM.y;
  }
  let goodSpanN = (lumaEndN < 0.0) != lumaMLTZero;
  let goodSpanP = (lumaEndP < 0.0) != lumaMLTZero;
  let spanLength = dstP + dstN;
  let directionN = dstN < dstP;
  let dst = min(dstN, dstP);
  let goodSpan = select(goodSpanP, goodSpanN, directionN);
  let pixelOffset = -dst / spanLength + 0.5;
  let subpixH = subpixF * subpixF * SUBPIX;
  let offset = max(select(0.0, pixelOffset, goodSpan), subpixH);
  if (horzSpan) {
    posM.y += offset * lengthSign;
  } else {
    posM.x += offset * lengthSign;
  }
  return rgbAt(posM);
}

@fragment
fn fs(@builtin(position) frag: vec4f) -> @location(0) vec4f {
  var color = antialiased((frag.xy - params.origin) * params.rcp);
  if (params.decode == 1u) {
    color = srgbToLinear(color);
  }
  return vec4f(color, 1.0);
}
