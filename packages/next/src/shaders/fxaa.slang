// FXAA 3.11, quality version (Timothy Lottes, NVIDIA 2011), over the
// present pass's tonemapped image (View.fxaa): edges found from luma
// contrast in display encoding, then searched along to their ends and
// blended across by the pixel's position on the edge, plus a little
// sub-pixel smoothing. Smooths what 4× MSAA leaves: edges within shading
// (normal maps, specular), and translucency's moments (single-sampled).

struct FxaaParams {
  float2 origin; // the view's rectangle in the target, pixels
  float2 rcp;    // 1 / its size
  // The image holds sRGB-encoded color; a -srgb target encodes again on
  // write: decode first (1), or write as is (0).
  uint decode;
  uint pad0;
  uint pad1;
  uint pad2;
};

[[vk::binding(0, 0)]] Texture2D<float4> image;
[[vk::binding(1, 0)]] SamplerState imageSampler;
[[vk::binding(2, 0)]] ConstantBuffer<FxaaParams> params;

[shader("vertex")]
float4 vs(uint i : SV_VertexID) : SV_Position {
  float2 uv = float2(float((i << 1u) & 2u), float(i & 2u));
  return float4(uv * 2.0 - 1.0, 0.0, 1.0);
}

// Lottes' defaults for the quality version.
static const float SUBPIX = 0.75;
static const float EDGE_THRESHOLD = 0.166;
static const float EDGE_THRESHOLD_MIN = 0.0833;
// The search's steps along the edge, pixels (quality preset 29's).
static const float STEPS[10] = { 1.0, 1.5, 2.0, 2.0, 2.0, 2.0, 2.0, 2.0, 4.0, 8.0 };

float3 rgbAt(float2 p) {
  return image.SampleLevel(imageSampler, p, 0.0).rgb;
}

float lumaOf(float3 c) {
  return dot(c, float3(0.299, 0.587, 0.114));
}

float lumaAt(float2 p) {
  return lumaOf(rgbAt(p));
}

float3 srgbToLinear(float3 c) {
  return select(c <= float3(0.04045), c / 12.92, pow((c + 0.055) / 1.055, float3(2.4)));
}

float3 antialiased(float2 center) {
  float2 rcp = params.rcp;
  float2 posM = center;
  float3 rgbM = rgbAt(posM);
  float lumaM = lumaOf(rgbM);
  float lumaS = lumaAt(posM + float2(0.0, rcp.y));
  float lumaE = lumaAt(posM + float2(rcp.x, 0.0));
  float lumaN = lumaAt(posM - float2(0.0, rcp.y));
  float lumaW = lumaAt(posM - float2(rcp.x, 0.0));
  float rangeMax = max(max(max(lumaS, lumaE), max(lumaN, lumaW)), lumaM);
  float rangeMin = min(min(min(lumaS, lumaE), min(lumaN, lumaW)), lumaM);
  float range = rangeMax - rangeMin;
  if (range < max(EDGE_THRESHOLD_MIN, rangeMax * EDGE_THRESHOLD)) {
    return rgbM;
  }
  float lumaNW = lumaAt(posM + float2(-rcp.x, -rcp.y));
  float lumaSE = lumaAt(posM + float2(rcp.x, rcp.y));
  float lumaNE = lumaAt(posM + float2(rcp.x, -rcp.y));
  float lumaSW = lumaAt(posM + float2(-rcp.x, rcp.y));

  // Horizontal or vertical: second differences across each.
  float lumaNS = lumaN + lumaS;
  float lumaWE = lumaW + lumaE;
  float edgeHorz1 = -2.0 * lumaM + lumaNS;
  float edgeVert1 = -2.0 * lumaM + lumaWE;
  float lumaNESE = lumaNE + lumaSE;
  float lumaNWNE = lumaNW + lumaNE;
  float edgeHorz2 = -2.0 * lumaE + lumaNESE;
  float edgeVert2 = -2.0 * lumaN + lumaNWNE;
  float lumaNWSW = lumaNW + lumaSW;
  float lumaSWSE = lumaSW + lumaSE;
  float edgeHorz3 = -2.0 * lumaW + lumaNWSW;
  float edgeVert3 = -2.0 * lumaS + lumaSWSE;
  float edgeHorz = abs(edgeHorz3) + abs(edgeHorz1) * 2.0 + abs(edgeHorz2);
  float edgeVert = abs(edgeVert3) + abs(edgeVert1) * 2.0 + abs(edgeVert2);
  bool horzSpan = edgeHorz >= edgeVert;
  float subpixA = (lumaNS + lumaWE) * 2.0 + lumaNWSW + lumaNESE;
  float lengthSign = rcp.x;
  if (!horzSpan) {
    lumaN = lumaW;
    lumaS = lumaE;
  } else {
    lengthSign = rcp.y;
  }
  float subpixB = subpixA / 12.0 - lumaM;

  // Which side of the edge the pixel is on.
  float gradientN = lumaN - lumaM;
  float gradientS = lumaS - lumaM;
  float lumaNN = lumaN + lumaM;
  float lumaSS = lumaS + lumaM;
  bool pairN = abs(gradientN) >= abs(gradientS);
  float gradient = max(abs(gradientN), abs(gradientS));
  if (pairN) {
    lengthSign = -lengthSign;
  }
  float subpixC = clamp(abs(subpixB) / range, 0.0, 1.0);

  // Search along the edge both ways for its ends.
  float2 posB = posM;
  float2 offNP = float2(0.0, rcp.y);
  if (horzSpan) {
    offNP = float2(rcp.x, 0.0);
    posB.y += lengthSign * 0.5;
  } else {
    posB.x += lengthSign * 0.5;
  }
  float2 posN = posB - offNP * STEPS[0];
  float2 posP = posB + offNP * STEPS[0];
  float subpixD = -2.0 * subpixC + 3.0;
  float subpixE = subpixC * subpixC;
  if (!pairN) {
    lumaNN = lumaSS;
  }
  float gradientScaled = gradient * 0.25;
  float lumaMM = lumaM - lumaNN * 0.5;
  float subpixF = subpixD * subpixE;
  bool lumaMLTZero = lumaMM < 0.0;
  float lumaEndN = lumaAt(posN) - lumaNN * 0.5;
  float lumaEndP = lumaAt(posP) - lumaNN * 0.5;
  bool doneN = abs(lumaEndN) >= gradientScaled;
  bool doneP = abs(lumaEndP) >= gradientScaled;
  for (uint i = 1u; i < 10u && !(doneN && doneP); i++) {
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
  float dstN = posM.x - posN.x;
  float dstP = posP.x - posM.x;
  if (!horzSpan) {
    dstN = posM.y - posN.y;
    dstP = posP.y - posM.y;
  }
  bool goodSpanN = (lumaEndN < 0.0) != lumaMLTZero;
  bool goodSpanP = (lumaEndP < 0.0) != lumaMLTZero;
  float spanLength = dstP + dstN;
  bool directionN = dstN < dstP;
  float dst = min(dstN, dstP);
  bool goodSpan = directionN ? goodSpanN : goodSpanP;
  float pixelOffset = -dst / spanLength + 0.5;
  float subpixH = subpixF * subpixF * SUBPIX;
  float offset = max(goodSpan ? pixelOffset : 0.0, subpixH);
  if (horzSpan) {
    posM.y += offset * lengthSign;
  } else {
    posM.x += offset * lengthSign;
  }
  return rgbAt(posM);
}

[shader("fragment")]
float4 fs(float4 frag : SV_Position) : SV_Target {
  float3 color = antialiased((frag.xy - params.origin) * params.rcp);
  if (params.decode == 1u) {
    color = srgbToLinear(color);
  }
  return float4(color, 1.0);
}
