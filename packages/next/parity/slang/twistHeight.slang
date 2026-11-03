// The twist and color-by-height stages of parity/customShader.ts, in Slang:
// compiled at build time (twistHeight.wgsl, scripts/slangShader.mjs) and at
// runtime (CustomShader.fromSlang); both must draw what the WGSL draws.
import cesium;

float3 twist(float3 v, float a) {
  float c = cos(a);
  float s = sin(a);
  return float3(c * v.x - s * v.y, s * v.x + c * v.y, v.z);
}

public void vertexMain(VertexInput vsInput, inout VertexOutput vsOutput) {
  float a = vsInput.positionMC.z * 1.5;
  vsOutput.positionMC = twist(vsInput.positionMC, a);
  vsOutput.normalMC = twist(vsInput.normalMC, a);
}

public void fragmentMain(FragmentInput fsInput, inout MaterialOutput material) {
  float t = clamp(fsInput.positionMC.z + 0.5, 0.0, 1.0);
  material.baseColor = lerp(float3(0.1, 0.2, 0.9), float3(0.95, 0.3, 0.1), t);
}
