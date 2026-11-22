// Bands of color by height on a streamed tileset: parity/customShader.ts's
// tileset case, compiled at build time (heightBands.wgsl) and at runtime;
// both must draw what its WGSL draws.
import cesium;

float3 hue(float h) {
  float3 k = float3(0.0, 2.0 / 3.0, 1.0 / 3.0);
  return saturate(abs(frac(h + k) * 6.0 - 3.0) - 1.0);
}

public void fragmentMain(FragmentInput fsInput, inout MaterialOutput material) {
  float height = length(fsInput.positionWC) - 6369000.0;
  material.baseColor = lerp(material.baseColor, hue(frac(height / 8.0)), 0.7);
}
